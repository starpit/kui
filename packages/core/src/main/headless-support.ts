/*
 * Copyright 2018 The Kubernetes Authors
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
const debug = Debug('core/main/headless-support')
debug('loading')

import { Streamable } from '../models/streamable'

/**
 * This supports commads streaming their output to the console
 *
 * @see repl.ts for use of createOutputStream
 * @see cli.ts for the webapp implementation
 *
 */
export const streamTo = async () => {
  const [{ clearLine, cursorTo }, { print }] = await Promise.all([
    import('readline'),
    import('./headless-pretty-print')
  ])

  return (response: Streamable, killLine?: boolean) => {
    debug('streaming response', killLine)

    if (killLine) {
      clearLine(process.stdout, 0)
      cursorTo(process.stdout, 0, null)
    }

    print(response)

    if (!killLine) {
      if (typeof response !== 'string' || !/\n$/.test(response)) {
        process.stdout.write('\n')
      }
    }

    return Promise.resolve()
  }
}
