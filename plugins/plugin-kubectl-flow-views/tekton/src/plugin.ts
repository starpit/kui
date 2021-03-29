/*
 * Copyright 2019 The Kubernetes Authors
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

import { isHeadless, inProxy, Registrar } from '@kui-shell/core'

import getStep from './controller/get/step'
import getTask from './controller/get/task'
import preview from './controller/preview'

export default async (registrar: Registrar) => {
  if (!isHeadless() || inProxy()) {
    return Promise.all([getStep(registrar), getTask(registrar), preview(registrar)])
  }
}
