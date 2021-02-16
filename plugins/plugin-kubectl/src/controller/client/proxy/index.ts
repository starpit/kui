/*
 * Copyright 2020 IBM Corporation
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

import Debug from 'debug'
import { ChildProcess } from 'child_process'
import { expandHomeDir, onQuit, offQuit } from '@kui-shell/core'

import { onKubectlConfigChangeEvents, offKubectlConfigChangeEvents } from '../../..'

const debug = Debug('plugin-kubectl/client/proxy')

/** Maximum number of times we try start the kubectl proxy */
const maxRetries = 1000

// Kubectl Proxy State
type State = {
  /** kubectl proxy port */
  port: number

  /** kubectl proxy process */
  process: ChildProcess

  /** handler that will be invoked when the process exits */
  onQuitHandler: () => void
}

/** State of current kubectl proxy */
let currentProxyState: Promise<State>

/** State for other configs */
const currentProxyStateForKubeconfig: Record<string, Promise<State>> = {}

/**
 * Unregister onQuit handlers
 *
 */
function unregisterOnQuit(onQuitHandler: State['onQuitHandler']) {
  try {
    if (typeof onQuitHandler === 'function') {
      offQuit(onQuitHandler)
      offKubectlConfigChangeEvents(onQuitHandler)
    }
  } catch (err) {
    console.error('Error unregistering kubectl proxy onQuit', err)
  }
}

/**
 * Stop kubectl proxy for the given kubectl proxy state
 *
 */
function stopProxy(this: State) {
  try {
    // kill the proxy process
    if (this.process) {
      debug('killing kubectl proxy', this.port)
      this.process.kill()
    }

    // unregister onQuit handler
    unregisterOnQuit(this.onQuitHandler)
  } catch (err) {
    console.error('Error stopping kubectl proxy', err)
  }
}

/**
 * Register onQuit handlers, to make sure that we kill any extant
 * kubectl proxy processes.
 *
 */
function registerOnQuit(state: Omit<State, 'onQuitHandler'>): State {
  try {
    const onQuitHandler = stopProxy.bind(state)
    onQuit(onQuitHandler)
    return Object.assign(state, { onQuitHandler })
  } catch (err) {
    console.error('Error registering kubectl proxy onQuit', err)
  }
}

/**
 * Launch kubectl proxy for the current context.
 *
 * @return the State of the kubectl proxy
 *
 */
async function startProxy(kubeconfig?: string): Promise<State> {
  const { spawn } = await import('child_process')
  return new Promise<State>((resolve, reject) => {
    const iter = (port = 8001, retryCount = 0) => {
      try {
        debug('attempting to spawn kubectl proxy on port', port)
        const process = spawn(
          'kubectl',
          ['proxy', '--keepalive=120s', '--port', port.toString()].concat(
            kubeconfig ? ['--kubeconfig', expandHomeDir(kubeconfig)] : []
          )
        )
        let myState: State

        // to make sure we don't smash the global variable on exit
        let iGotRetried = false

        process.on('error', err => {
          console.error('Error spawning kubectl proxy', err)
          reject(err)
        })

        process.stdout.on('data', data => {
          const msg = data.toString()
          debug('stdout', msg)
          if (/Starting to serve/.test(msg)) {
            // success!
            debug('succeessfully spawned kubectl proxy on port', port)
            myState = registerOnQuit({ process, port })
            resolve(myState)
          }
        })

        let stderr = ''
        process.stderr.on('data', data => {
          const msg = data.toString()
          if (/address already in use/.test(msg) && retryCount < maxRetries) {
            iGotRetried = true // so we don't smash the global on exit
            iter(port + 1, retryCount + 1)
          } else {
            debug('stderr', msg)
            stderr += msg
          }
        })

        process.on('exit', (code, signal) => {
          debug('kubectl proxy has exited with code', code || signal)
          const gotIt = kubeconfig ? currentProxyStateForKubeconfig[kubeconfig] : currentProxyState
          if (!gotIt && retryCount >= maxRetries) {
            // then we are still trying to initialize, and haven't
            // exceeded our port retry loop count
            console.error(`kubectl proxy exited unexpectedly with exitCode=${code || signal}`)
            reject(new Error(stderr))
          } else if (gotIt) {
            // then we thought we had a stable kubectl proxy process, but it went and died on its own
            debug('marking proxy as terminated')
            if (myState) {
              myState.process = undefined
            }
            if (!iGotRetried) {
              if (kubeconfig) {
                currentProxyStateForKubeconfig[kubeconfig] = undefined
              } else {
                currentProxyState = undefined
              }
            }
          }
        })
      } catch (err) {
        console.error('Error establishing kubectl proxy', err)
        reject(err)
        // proxyForContext = undefined
      }
    }

    iter()
  })
}

/** Wrapper around `startProxy` that deals with the currentProxyState variable */
function initProxyState() {
  if (!currentProxyState) {
    const myProxyState = startProxy()
    currentProxyState = myProxyState

    myProxyState.then(state =>
      onKubectlConfigChangeEvents(type => {
        if (type === 'SetNamespaceOrContext') {
          state.onQuitHandler()
        }
      })
    )
  }

  return currentProxyState
}

/** Is the current kubectl proxy viable? */
function isProxyActive(kubeconfig?: string) {
  if (!kubeconfig) {
    return currentProxyState !== undefined
  } else {
    return currentProxyStateForKubeconfig[kubeconfig] !== undefined
  }
}

interface KubectlProxyInfo {
  baseUrl: string
}

function startProxyFor(kubeconfig: string) {
  if (!isProxyActive(kubeconfig)) {
    currentProxyStateForKubeconfig[kubeconfig] = startProxy(kubeconfig)
    console.error('!!!!STARTPROXY', kubeconfig, currentProxyStateForKubeconfig[kubeconfig])
  }
}

/** @return information about the current kubectl proxy */
export default async function getProxyState(kubeconfig?: string): Promise<KubectlProxyInfo> {
  if (!isProxyActive(kubeconfig)) {
    debug('attempting to start proxy', kubeconfig)
    if (kubeconfig) {
      startProxyFor(kubeconfig)
    } else {
      initProxyState()
    }
  }

  return {
    baseUrl: !isProxyActive(kubeconfig)
      ? undefined
      : `http://localhost:${(await (kubeconfig ? currentProxyStateForKubeconfig[kubeconfig] : currentProxyState)).port}`
  }
}
