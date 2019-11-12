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

import { Tab } from '../../webapp/tab'
import { MetadataBearing } from '../entity'
import { CustomSpec, isCustomSpec, showCustom } from '../../webapp/views/sidecar'
import { SidecarMode, addModeButtons } from '../../webapp/bottom-stripe'
import { isTable, isMultiTable, Table, MultiTable } from '../../webapp/models/table'
import { formatTable } from '../../webapp/views/table'

import { MultiModalResponse, Button, isButton } from './types'
import {
  Content,
  hasContent,
  ScalarResource,
  ScalarContent,
  isScalarContent,
  isCommandStringContent,
  isStringWithOptionalContentType,
  isFunctionContent
} from './content-types'

type Viewable = CustomSpec | HTMLElement | Table | MultiTable

/**
 * Turn a Resource into a Viewable
 *
 */
export async function format<T extends MetadataBearing>(
  tab: Tab,
  mmr: T,
  resource: ScalarResource | Content<T>
): Promise<Viewable> {
  if (!hasContent(resource)) {
    // then we have a plain resource. the rest of this function
    // assumes a Content structure, so wrap it up as such
    return format(tab, mmr, { content: resource })
  } else if (isFunctionContent(resource)) {
    // then resource.content is a function that will provide the information
    return format(tab, mmr, await resource.content(tab, mmr))
  } else if (isCommandStringContent(resource)) {
    const content = await tab.REPL.qexec<ScalarResource | ScalarContent>(resource.content)
    return format(tab, mmr, content)
  } else if (isCustomSpec(resource.content)) {
    return resource.content
  } else if (isTable(resource.content) || isMultiTable(resource.content)) {
    return resource.content
  } else {
    // otherwise, we have string or HTMLElement content
    return Object.assign(
      { resource: mmr, toolbarText: mmr.toolbarText, kind: mmr.kind, metadata: mmr.metadata, type: 'custom' },
      resource
    )
  }
}

function wrapTable(tab: Tab, table: Table | MultiTable): HTMLElement {
  const dom1 = document.createElement('div')
  const dom2 = document.createElement('div')
  dom1.classList.add('scrollable', 'scrollable-auto')
  dom2.classList.add('result-as-table', 'repl-result')
  dom1.appendChild(dom2)
  formatTable(tab, table, dom2)
  return dom1
}

export function formatButton<T extends MetadataBearing>(
  tab: Tab,
  resource: T,
  { mode, label, command, confirm, kind }: Button
): SidecarMode {
  const cmd = typeof command === 'string' ? command : command(tab, resource)

  return {
    mode,
    label,
    flush: 'right',
    actAsButton: true,
    direct: confirm ? `confirm "${cmd}"` : cmd,
    execOptions: {
      exec: kind === 'view' ? 'qexec' : 'pexec'
    }
  }
}

function formatButtons(tab: Tab, mmr: MultiModalResponse, buttons: Button[]): SidecarMode[] {
  return buttons.map(button => formatButton(tab, mmr, button))
}

async function renderContent<T extends MetadataBearing>(
  tab: Tab,
  bearer: T,
  content: string | object
): Promise<ScalarContent> {
  if (isStringWithOptionalContentType(content)) {
    return content
  } else if (isTable(content) || isMultiTable(content)) {
    return {
      content: wrapTable(tab, content)
    }
  } else if (isFunctionContent(content)) {
    const actualContent: ScalarResource | ScalarContent = await content.content(tab, bearer)
    if (!isScalarContent(actualContent)) {
      if (isTable(actualContent) || isMultiTable(actualContent)) {
        return {
          content: wrapTable(tab, actualContent)
        }
      } else {
        return {
          content: actualContent
        }
      }
    } else {
      return actualContent
    }
  } else {
    return {
      content: content as ScalarContent
    }
  }
}

/**
 * Render a MultiModalResponse to the sidecar
 *
 */
export async function show(tab: Tab, mmr: MultiModalResponse) {
  const modes: SidecarMode[] = await Promise.all(
    mmr.modes.map(async _ => ({
      mode: _.mode,
      label: _.label || _.mode,
      direct: (tab: Tab) => {
        if (isCustomSpec(_)) {
          return _
        } else {
          return format(tab, mmr, _)
        }
      },
      defaultMode: _.defaultMode,
      toolbarText: mmr.toolbarText,
      leaveBottomStripeAlone: true
    }))
  )

  if (!modes.find(_ => _.defaultMode) && modes.length > 0) {
    modes[0].defaultMode = true
  }

  const buttons = mmr.buttons ? formatButtons(tab, mmr, mmr.buttons) : ([] as SidecarMode[])
  const modesWithButtons = modes.concat(buttons)

  addModeButtons(tab, modesWithButtons, mmr, { preserveBackButton: true })

  const defaultMode = modesWithButtons.find(_ => _.defaultMode) || modesWithButtons[0]

  if (isButton(defaultMode)) {
    console.error('default mode is a button', defaultMode, mmr)
    throw new Error('Internal Error')
  }

  const content = hasContent(defaultMode)
    ? defaultMode
    : typeof defaultMode.direct === 'function'
    ? await defaultMode.direct(tab, mmr)
    : defaultMode.direct

  if (content) {
    if (isCustomSpec(content)) {
      return showCustom(tab, Object.assign({ modes: modesWithButtons, toolbarText: mmr.toolbarText }, content), {
        leaveBottomStripeAlone: true
      })
    } else {
      const customBase = {
        type: 'custom',
        resource: mmr,
        modes: modesWithButtons,
        toolbarText: mmr.toolbarText,
        prettyName: mmr.prettyName,
        nameHash: mmr.nameHash
      }

      const custom = Object.assign(customBase, await renderContent(tab, mmr, content))

      return showCustom(tab, custom, { leaveBottomStripeAlone: true })
    }
  } else {
    console.error('empty content')
  }
}