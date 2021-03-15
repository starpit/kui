/*
 * Copyright 2017 The Kubernetes Authors
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

/**
 * User has requested that we "cancel" whatever is currently happening.
 *
 * If there is nothing happening, then terminate the current prompt
 * and start a new one
 *
 */

import { eventBus } from '../core/events'
import { Tab } from './tab'
import { Block } from './models/block'
import { ExecType } from '../models/command'

import { split } from '../repl/split'
import { CommandCompleteEvent } from '../repl/events'

export default function doCancel(tab: Tab, block: Block, valueTypedSoFar: string) {
  block.isCancelled = true

  const execUUID = block.getAttribute('data-uuid')
  const endEvent: CommandCompleteEvent = {
    tab,
    execType: ExecType.TopLevel,
    completeTime: Date.now(),
    cancelled: true,
    execUUID,
    historyIdx: -1,
    command: valueTypedSoFar,
    argvNoOptions: undefined,
    execOptions: undefined,
    parsedOptions: undefined,
    pipeStages: split(valueTypedSoFar, undefined, undefined, '|').map(_ => split(_)),
    pipeStagesNoOptions: undefined,
    echo: true,
    evaluatorOptions: undefined,
    response: undefined,
    responseType: 'Incomplete'
  }
  eventBus.emitCommandComplete(endEvent)
}
