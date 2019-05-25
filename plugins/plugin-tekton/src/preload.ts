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

import { IKubeResource } from '@kui-shell/plugin-k8s/lib/model/resource'
import registerSidecarMode from '@kui-shell/plugin-k8s/lib/view/modes/registrar'

import flowMode from './model/flowMode'

const flowModeSpec = {
  mode: flowMode,
  when: (resource: IKubeResource) => {
    return tektonAPI.test(resource.apiVersion) &&
      (resource.kind === 'Pipeline' || resource.kind === 'Task')
  }
}

const tektonAPI = /tekton.dev/

export default async () => {
  registerSidecarMode(flowModeSpec)
}
