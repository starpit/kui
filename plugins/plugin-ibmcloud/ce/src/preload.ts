/*
 * Copyright 2018-19 IBM Corporation
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
import { PreloadRegistrar } from '@kui-shell/core'

import vfs from './vfs'
import logsMode from './view/modes/Logs'

export default async (registrar: PreloadRegistrar) => {
  // register vfs
  vfs()

  // register modes
  await registrar.registerModes(logsMode)

  // register badges
  // await registrar.registerBadges(eventsBadge)

  // register tab completion provider
  try {
    // tabCompletionProvider()
  } catch (err) {
    // don't utterly fail if we can't install the tab completion
    const debug = Debug('plugins/ibmcloud/preload')
    debug('error installing kubeui tab-completion extensions', err)
  }
}
