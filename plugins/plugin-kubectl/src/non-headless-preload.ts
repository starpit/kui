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

import podMode from './lib/view/modes/pods'
import yamlMode from './lib/view/modes/yaml'
import summaryMode from './lib/view/modes/Summary'
import crdSummaryMode from './lib/view/modes/crd-summary'
import configmapSummaryMode from './lib/view/modes/configmap-summary'
import namespaceSummaryMode from './lib/view/modes/namespace-summary'
import logsMode from './lib/view/modes/logs-mode'
import ExecIntoPad from './lib/view/modes/ExecIntoPod'
import lastAppliedMode from './lib/view/modes/last-applied'
import showOwnerButton from './lib/view/modes/ShowOwnerButton'
import showNodeButton from './lib/view/modes/ShowNodeOfPodButton'
import deleteResourceButton from './lib/view/modes/DeleteButton'
import involvedObjectMode from './lib/view/modes/involved-object'
import showCRDResources from './lib/view/modes/show-crd-managed-resources'
import EditButton from './lib/view/modes/EditButton'
import { eventsMode, eventsBadge } from './lib/view/modes/Events'

import tabCompletionProvider from './lib/tab-completion'

import { notebookVFS } from '@kui-shell/plugin-core-support'

export default async (registrar: PreloadRegistrar) => {
  // register modes
  await registrar.registerModes(
    podMode,
    yamlMode,
    summaryMode,
    crdSummaryMode,
    configmapSummaryMode,
    namespaceSummaryMode,
    eventsMode,
    logsMode,
    ExecIntoPad,
    lastAppliedMode,
    EditButton,
    showCRDResources,
    showOwnerButton,
    showNodeButton,
    deleteResourceButton,
    involvedObjectMode
  )

  // register badges
  await registrar.registerBadges(eventsBadge)

  // mount notebooks
  notebookVFS.mkdir({ argvNoOptions: ['mkdir', '/kui/kubernetes'] })
  notebookVFS.cp(
    undefined,
    ['plugin://plugin-kubectl/notebooks/create-jobs.json', 'plugin://plugin-kubectl/notebooks/crud-operations.json'],
    '/kui/kubernetes/'
  )

  // register tab completion provider
  try {
    tabCompletionProvider()
  } catch (err) {
    // don't utterly fail if we can't install the tab completion
    // https://github.com/IBM/kui/issues/2793
    const debug = Debug('plugins/kubeui/preload')
    debug('error installing kubeui tab-completion extensions', err)
  }
}
