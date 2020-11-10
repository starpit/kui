/*
 * Copyright 2017 IBM Corporation
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

import * as assert from 'assert'

import { Common, CLI, ReplExpect, SidecarExpect, Selectors, Util } from '@kui-shell/test'

import * as openwhisk from '@kui-shell/plugin-openwhisk/tests/lib/openwhisk/openwhisk'

import { dirname } from 'path'

const { rp } = openwhisk
const ROOT = dirname(require.resolve('@kui-shell/plugin-openwhisk/tests/package.json'))

const actionName = 'foo'
const actionName2 = 'foo2'
const actionName3 = 'foo3'
const actionName4 = 'foo4'
const actionName5 = 'foo5'
const actionName6 = 'foo6'
const actionName7 = 'foo7'
const packageName = 'ppp'

describe('Webbify actions', function(this: Common.ISuite) {
  before(openwhisk.before(this))
  after(Common.after(this))

  it('should create an action', () =>
    CLI.command(`let ${actionName} = x=>x`, this.app)
      .then(ReplExpect.justOK)
      .then(SidecarExpect.open)
      .then(SidecarExpect.showing(actionName)))

  it('should create another action', () =>
    CLI.command(`let ${actionName2} = x=>x`, this.app)
      .then(ReplExpect.justOK)
      .then(SidecarExpect.open)
      .then(SidecarExpect.showing(actionName2)))

  xit('should webbify with implicit action', async () => {
    try {
      const res = await CLI.command('wsk action webbify', this.app)

      await ReplExpect.okWithCustom<string>({ selector: '.entity-web-export-url' })(res)
        .then(selector => this.app.client.$(selector))
        .then(_ => _.getText())
        .then(href => rp({ url: `${href}?message=test`, rejectUnauthorized: false })) // provide an input to the remote request
        .then(Util.expectSubset({ message: 'test' })) // and expect it right back, since the action is an echo action

      await SidecarExpect.open(res).then(SidecarExpect.showing(actionName2))
    } catch (err) {
      await Common.oops(this, true)(err)
    }
  })

  it('should webbify with explicit action', () =>
    CLI.command(`wsk action webbify ${actionName}`, this.app)
      .then(ReplExpect.justOK)
      .then(SidecarExpect.open)
      .then(SidecarExpect.showing(actionName))
      .then(SidecarExpect.badge('web')))

  it('should create a packaged action', () =>
    CLI.command(`let ${packageName}/${actionName3} = x=>x`, this.app)
      .then(ReplExpect.justOK)
      .then(SidecarExpect.open)
      .then(SidecarExpect.showing(actionName3, packageName)))

  it('should create another packaged action', () =>
    CLI.command(`let ${packageName}/${actionName4} = x=>x`, this.app)
      .then(ReplExpect.justOK)
      .then(SidecarExpect.open)
      .then(SidecarExpect.showing(actionName4, packageName)))

  xit('should webbify a packaged action with implicit action', () =>
    CLI.command('wsk action webbify', this.app)
      .then(ReplExpect.justOK)
      .then(SidecarExpect.open)
      .then(SidecarExpect.showing(actionName4, packageName))
      .then(SidecarExpect.badge('web')))

  xit('should webbify a packaged action with explicit action', () =>
    CLI.command(`wsk action webbify ${packageName}/${actionName3}`, this.app)
      .then(ReplExpect.justOK)
      .then(SidecarExpect.open)
      .then(SidecarExpect.showing(actionName3, packageName))
      .then(SidecarExpect.badge('web')))

  it('should create an action for http', () =>
    CLI.command(`let ${actionName5} = x=>({body: x.message})`, this.app)
      .then(ReplExpect.justOK)
      .then(SidecarExpect.open)
      .then(SidecarExpect.showing(actionName5)))

  it('should create another action for http', () =>
    CLI.command(`let ${actionName6} = x=>({body: x.message})`, this.app)
      .then(ReplExpect.justOK)
      .then(SidecarExpect.open)
      .then(SidecarExpect.showing(actionName6)))

  xit('should webbify as http with implicit action', async () => {
    try {
      const res = await CLI.command('wsk action webbify as http', this.app)

      await ReplExpect.okWithCustom<string>({ selector: '.entity-web-export-url' })(res)
        .then(selector => this.app.client.$(selector))
        .then(_ => _.getText())
        .then(href => rp({ url: `${href}?message=test5`, rejectUnauthorized: false })) // provide an input to the remote request
        .then(response => assert.strictEqual(response, 'test5')) // and expect it right back

      await SidecarExpect.open(res).then(SidecarExpect.showing(actionName6))
    } catch (err) {
      await Common.oops(this, true)(err)
    }
  })

  //
  // not quite webbify, but closely related; web action via action create --web
  //
  xit('should create a web action via action create --web', async () => {
    try {
      const res = await CLI.command(`wsk action create ${actionName7} ${ROOT}/data/openwhisk/foo.js --web`, this.app)

      // make sure the REPL output has the proper href:
      await ReplExpect.okWithCustom<string>({ selector: '.entity-web-export-url' })(res)
        .then(selector => this.app.client.$(selector))
        .then(_ => _.getText())
        .then(href =>
          rp({
            uri: href,
            qs: { name: 'openwhisk' },
            json: true,
            rejectUnauthorized: false
          })
        )
        .then(Util.expectStruct({ name: 'Step1 openwhisk' }, true))

      // make sure the sidecar is open and showing the web accessible badge
      await SidecarExpect.open(res)
        .then(SidecarExpect.showing(actionName7))
        .then(SidecarExpect.badge('web'))
      // finally, make sure the "web accessible" badge also has the proper href:

      const href = await this.app.client
        .$(`${Selectors.SIDECAR(res.count)} .badges .entity-web-export-url`)
        .then(_ => _.getAttribute('href'))
      await rp({
        uri: href,
        qs: { name: 'openwhisk' },
        json: true,
        rejectUnauthorized: false
      }).then(Util.expectStruct({ name: 'Step1 openwhisk' }, true))
    } catch (err) {
      await Common.oops(this, true)(err)
    }
  })
})
