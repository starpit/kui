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

// temporary with disabled popup test
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Common, Selectors, SidecarExpect, ReplExpect } from '@kui-shell/test'
import { waitForGreen, waitForRed, createNS, defaultModeForGet } from '@kui-shell/plugin-kubectl/tests/lib/k8s/utils'

import * as assert from 'assert'

const ns1: string = createNS()
const ns2: string = createNS()

const kubectl = 'kubectl'

/** wait for a deletion to complete */
const waitForDelete = function(this: Common.ISuite, { name }: { name: string }) {
  it(`should wait for deletion of resource named ${name}`, async () => {
    try {
      await waitForRed(this.app, Selectors.BY_NAME(name))
    } catch (err) {
      return Common.oops(this)(err)
    }
  })
}

/** verify that the monaco editor component contains the given substring */
const verifyTextExists = async function(this: Common.ISuite, expectedSubstring: string) {
  await this.app.client.waitUntil(async () => {
    const actualText = await this.app.client.getText(`${Selectors.SIDECAR} .monaco-editor .view-lines`)
    return actualText.indexOf(expectedSubstring) >= 0
  })
}

/** wait for the creation to finish, then navigate a bit */
interface CreateSpec {
  name: string
  kind: string
  ns?: string
  status: string
}

const waitForCreate = function(this: Common.ISuite, spec: CreateSpec) {
  const { name, kind, ns } = spec

  it(`should wait for creation of resource named ${name} in namespace ${ns}`, async () => {
    const textExists = verifyTextExists.bind(this)

    const waitForDescribeContent = async () => {
      await SidecarExpect.form({ Name: name, Status: spec.status }, 'kubectl-summary')(this.app)
    }

    const waitForRawContent = async () => {
      await textExists(`apiVersion: v1`)
      await textExists(`kind: ${kind}`)
    }

    try {
      // first wait for the table entry to turn green
      await waitForGreen(this.app, Selectors.BY_NAME(name))

      // then click on the table row and switch back and forth between
      // raw and summary modes, each time ensuring that the editor
      // shows the expected content await this.app.client.click(`${Selectors.BY_NAME(name)} .clickable`)
      await this.app.client.click(`${Selectors.BY_NAME(name)} .clickable`)
      await SidecarExpect.open(this.app).then(SidecarExpect.mode(defaultModeForGet))
      await waitForDescribeContent()

      await this.app.client.waitForVisible(Selectors.SIDECAR_MODE_BUTTON('raw'))
      await this.app.client.click(Selectors.SIDECAR_MODE_BUTTON('raw'))
      await waitForRawContent()

      await this.app.client.waitForVisible(Selectors.SIDECAR_MODE_BUTTON('summary'))
      await this.app.client.click(Selectors.SIDECAR_MODE_BUTTON('summary'))
      await waitForDescribeContent()

      await this.app.client.waitForVisible(Selectors.SIDECAR_MODE_BUTTON('raw'))
      await this.app.client.click(Selectors.SIDECAR_MODE_BUTTON('raw'))
    } catch (err) {
      return Common.oops(this, true)(err)
    }
  })
}

/** resource names */
const pod = 'nginx'

Common.localDescribe(`popup should error out for non-existant command`, function(this: Common.ISuite) {
  before(Common.before(this, { popup: ['yoyo'] }))
  after(Common.after(this))

  it(`should error out for non-existant command`, () => {
    return ReplExpect.error(127)({ app: this.app, count: 0 }).catch(Common.oops(this, true))
  })
})

Common.localDescribe(`popup create pod creating namespace ${ns1}`, function(this: Common.ISuite) {
  before(Common.before(this, { popup: [kubectl, 'create', 'ns', ns1] }))
  after(Common.after(this))

  waitForCreate.bind(this)({ name: ns1, kind: 'Namespace', status: 'Active' })
})

Common.localDescribe(`popup create pod creating pod in ${ns1}`, function(this: Common.ISuite) {
  before(
    Common.before(this, {
      popup: [
        kubectl,
        'create',
        '-f',
        'https://raw.githubusercontent.com/kubernetes/examples/master/staging/pod',
        '-n',
        ns1
      ]
    })
  )
  after(Common.after(this))

  waitForCreate.bind(this)({ name: pod, kind: 'Pod', ns: ns1, status: 'Running' })
})

Common.localDescribe(`popup watch pods in ${ns1}`, function(this: Common.ISuite) {
  before(Common.before(this, { popup: [kubectl, 'get', 'pods', '-w', '-n', ns1] }))
  after(Common.after(this))

  it(`should watch resource named ${pod} in namespace ${ns1}`, async () => {
    try {
      await this.app.client.waitForExist(Selectors.WATCHER_N(1))
      await this.app.client.waitForExist(Selectors.WATCHER_N_GRID_CELL_ONLINE(1, pod))
    } catch (err) {
      Common.oops(this, true)(err)
    }
  })
})

Common.localDescribe(`popup create pod creating namespace ${ns2}`, function(this: Common.ISuite) {
  before(Common.before(this, { popup: [kubectl, 'create', 'ns', ns2] }))
  after(Common.after(this))

  waitForCreate.bind(this)({ name: ns2, kind: 'Namespace', status: 'Active' })
})

Common.localDescribe(`popup create pod creating pod in ${ns2}`, function(this: Common.ISuite) {
  before(
    Common.before(this, {
      popup: [
        kubectl,
        'create',
        '-f',
        'https://raw.githubusercontent.com/kubernetes/examples/master/staging/pod',
        '-n',
        ns2
      ]
    })
  )
  after(Common.after(this))

  waitForCreate.bind(this)({ name: pod, kind: 'Pod', ns: ns2, status: 'Running' })
})

Common.localDescribe(`popup create pod deleting pod in ${ns1}`, function(this: Common.ISuite) {
  before(Common.before(this, { popup: [kubectl, 'delete', 'pod', pod, '-n', ns1] }))
  after(Common.after(this))

  waitForDelete.bind(this)({ name: pod })
})

Common.localDescribe(`popup create pod deleting pod in ${ns2}`, function(this: Common.ISuite) {
  before(Common.before(this, { popup: [kubectl, 'delete', 'pod', pod, '-n', ns2] }))
  after(Common.after(this))

  waitForDelete.bind(this)({ name: pod })
})

Common.localDescribe(`popup create pod deleting namespace ${ns1}`, function(this: Common.ISuite) {
  before(Common.before(this, { popup: [kubectl, 'delete', 'ns', ns1] }))
  after(Common.after(this))

  waitForDelete.bind(this)({ name: ns1 })
})

Common.localDescribe(`popup create pod deleting namespace ${ns2}`, function(this: Common.ISuite) {
  before(Common.before(this, { popup: [kubectl, 'delete', 'ns', ns2] }))
  after(Common.after(this))

  waitForDelete.bind(this)({ name: ns2 })
})
