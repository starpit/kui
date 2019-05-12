/*
 * Copyright 2019 IBM Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as Debug from 'debug'
const debug = Debug('plugins/bash-like/cmds/tab-completion')

import eventBus from '@kui-shell/core/core/events'
import { CommandRegistrar } from '@kui-shell/core/models/command'

import { Channel } from '../../pty/channel'
import { getOrCreateChannel } from '../../pty/client'

interface ITabCompletionRequest {
  words: string
  wordIdx: number
  cb: (opts: { count: number, options: string[] }) => void
}

interface ICompletion {
  count: number
  options: string // CSV-encoded array
}

interface ICompletions {
  git: ICompletion
  kubectl: ICompletion
}

/** remove duplicates from an array of strings */
const uniq = (arr: string[]): string[] => [...new Set(arr)]

/**
 * On preload, register the tab completion provider
 *
 */
export const preload = (commandTree: CommandRegistrar) => {
  const channelPromise = getOrCreateChannel('', { cols: 80, rows: 40, noEcho: true, shell: '/bin/bash' })

  const copyout = new Promise<{ git: string, kubectl: string }>(async (resolve, reject) => {
    try {
      const tmp = await import('tmp')
      const tmpFile = (): Promise<string> => new Promise((resolve, reject) => {
        tmp.file((err: Error, file) => {
          if (err) {
            reject(err)
          } else {
            resolve(file)
          }
        })
      })

      const [ gitDest, kubectlDest ] = await Promise.all([ tmpFile(), tmpFile() ])
      let gitSrc = require.resolve('@kui-shell/plugin-bash-like/samples/completion/git.bash')
      let kubectlSrc = require.resolve('@kui-shell/plugin-bash-like/samples/completion/kubectl.bash')
      const { copyFile } = await import('../../pty/copy-out') // why the dynamic import? being browser friendly here

      await Promise.all([
        copyFile(gitSrc, gitDest),
        copyFile(kubectlSrc, kubectlDest)
      ])

      resolve({ git: gitDest, kubectl: kubectlDest })
    } catch (err) {
      reject(err)
    }
  })

  setTimeout(async () => {
    const channel = await channelPromise

    let first = true
    const handler = async (data: string) => {
      const msg = JSON.parse(data)
      if (first) {
        first = false

        const { git, kubectl } = await copyout

        const data = `export PS1=""; source ${git}; source ${kubectl}\n`
        channel.send(JSON.stringify({ type: 'data', data }))
        channel.removeEventListener('messsage', handler)
      }
    }
    channel.on('message', handler)
  }, 0)

  let registrationComplete = false
  eventBus.on('/tab/completion/request', async (req: ITabCompletionRequest) => {
    const channel = await channelPromise

    if (!registrationComplete) {
      // registrationComplete = true
      const onMessage = (data: string) => {
        channel.removeEventListener('message', onMessage)
        try {
          const msg: { type: string, data: string } = JSON.parse(data)
          if (msg.type === 'data') {
            try {
              const { kubectl, git }: ICompletions = JSON.parse(msg.data)
              debug('git completions', git)
              debug('kubectl completions', kubectl)

              const isKube = /^k(ubectl)/.test(req.words)
              const isGit = /^git/.test(req.words)
              const completions = isKube ? kubectl : isGit ? git : { count: 0, options: '' }

              req.cb({
                count: completions.count,
                options: uniq(completions.options.split(',').filter(x => x))
              })
            } catch (err) {
              debug('Unexpected options', msg.data)
              console.error('Unexpected options', err)
              req.cb({ count: 0, options: [] })
            }
          } else {
            console.error('Unexpected response from pty', msg)
          }
        } catch (err) {
          debug('raw data from pty', data)
          console.error('Parse error in response from pty', err)
        }
      }

      channel.on('message', onMessage)
    }

    debug('dispatching tab to pty', req)

    const data = `COMP_WORDS=(${req.words}); COMP_CWORD=${req.wordIdx}; __start_kubectl; OIFS=$IFS; IFS=","; RES1=` + '"{\\"count\\": ${#COMPREPLY[*]}, \\"options\\": \\"${COMPREPLY[*]}\\"}"; IFS=$OIFS; COMPREPLY=(); __git_wrap__git_main; IFS=","; RES2="{\\"count\\": ${#COMPREPLY[*]}, \\"options\\": \\"${COMPREPLY[*]}\\"}"; IFS=$OIFS; echo "{\\"kubectl\\": $RES1, \\"git\\": $RES2}"\n'

    channel.send(JSON.stringify({
      type: 'data',
      data
    }))
  })
}
