/*
 * Copyright 2020 The Kubernetes Authors
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

import { Arguments, CodedError, RawResponse, Registrar } from '@kui-shell/core'
import { dirname } from 'path'

export async function _fwrite(_fullpath: string, data: string | Buffer) {
  const { mkdir, writeFile } = await import('fs')
  const fullpath = _fullpath.replace(/"/g, '') // trim double quotes

  return new Promise<boolean>((resolve, reject) => {
    const write = (path: string, data: string | Buffer) =>
      writeFile(path, data, err => {
        if (err) {
          if (err.code === 'ENOENT') {
            const error: CodedError = new Error(err.message)
            error.stack = err.stack
            error.code = 404
            reject(error)
          } else {
            reject(err)
          }
        } else {
          resolve(true)
        }
      })

    const dir = dirname(fullpath)
    if (dir !== '.') {
      mkdir(dir, { recursive: true }, () => {
        return write(fullpath, data)
      })
    } else {
      write(fullpath, data)
    }
  })
}

/**
 * Kui command for fs.write
 *
 */
const fwrite = async ({ argvNoOptions, execOptions }: Arguments) => {
  const fullpath = argvNoOptions[1]
  const data = execOptions.data as string | Buffer

  return _fwrite(fullpath, data)
}

async function fwriteTemp(args: Arguments): Promise<RawResponse<string>> {
  const { mkTemp } = await import('./mkTemp')
  const data = args.execOptions.data as string | Buffer

  const { content: tmp } = await mkTemp()
  await _fwrite(tmp, data)

  return { mode: 'raw', content: tmp }
}

/**
 * Register command handlers
 *
 */
export default (registrar: Registrar) => {
  registrar.listen('/fwrite', fwrite, {
    hidden: true,
    requiresLocal: true
  })

  registrar.listen('/fwriteTemp', fwriteTemp, {
    hidden: true,
    requiresLocal: true
  })
}
