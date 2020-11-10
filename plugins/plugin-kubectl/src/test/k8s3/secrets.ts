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

import { Common, CLI, ReplExpect, Selectors } from '@kui-shell/test'
import { waitForRed, waitForGreen, createNS, allocateNS, deleteNS } from '@kui-shell/plugin-kubectl/tests/lib/k8s/utils'

const kubectl = 'kubectl'
const name = 'foo-secret'

describe('kubectl secrets', function(this: Common.ISuite) {
  before(Common.before(this))
  after(Common.after(this))

  const ns: string = createNS()
  const inNamespace = `-n ${ns}`

  allocateNS(this, ns)

  it('should create a generic secret', async () => {
    try {
      const selector = await CLI.command(`${kubectl} create secret generic ${name} ${inNamespace}`, this.app).then(
        ReplExpect.okWithCustom<string>({ selector: Selectors.BY_NAME(name) })
      )

      // wait for the badge to become green
      await waitForGreen(this.app, selector)
    } catch (err) {
      await Common.oops(this, true)(err)
    }
  })

  it('should delete a generic secret', async () => {
    try {
      const selector = await CLI.command(`${kubectl} delete secret ${name} ${inNamespace}`, this.app).then(
        ReplExpect.okWithCustom<string>({ selector: Selectors.BY_NAME(name) })
      )

      // wait for the badge to become green
      await waitForRed(this.app, selector)
    } catch (err) {
      await Common.oops(this, true)(err)
    }
  })

  deleteNS(this, ns)
})
