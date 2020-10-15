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

import { ok } from 'assert'
import { v4 as uuid } from 'uuid'
import { Common, CLI, Keys, ReplExpect, Selectors, SidecarExpect } from '@kui-shell/test'
import {
  createNS,
  allocateNS,
  deleteNS,
  deletePodByName,
  waitForGreen,
  getTerminalText,
  waitForTerminalText,
  defaultModeForGet
} from '@kui-shell/plugin-kubectl/tests/lib/k8s/utils'

const command = 'kubectl'
const podName = 'nginx'
const containerName = 'nginx'

// we will echo this text to this file
const ECHO_TEXT = `hello ${uuid()}`
const ECHO_FILE_1 = '/tmp/kui-terminal-tab-test-1'
const ECHO_FILE_2 = '/tmp/kui-terminal-tab-test-2'

describe(`${command} Terminal tab ${process.env.MOCHA_RUN_TARGET || ''}`, function(this: Common.ISuite) {
  before(Common.before(this))
  after(Common.after(this))

  const ns: string = createNS()
  allocateNS(this, ns)

  let res: ReplExpect.AppAndCount

  const getPodAndOpenSidecar = () => {
    it(`should get pods via ${command} then click`, async () => {
      try {
        const tableRes = await CLI.command(`${command} get pods ${podName} -n ${ns}`, this.app)

        const selector = await ReplExpect.okWithCustom({ selector: Selectors.BY_NAME(podName) })(tableRes)

        // wait for the badge to become green
        await waitForGreen(this.app, selector)

        // now click on the table row
        await this.app.client.click(`${selector} .clickable`)
        res = ReplExpect.blockAfter(tableRes)
        await SidecarExpect.open(res)
          .then(SidecarExpect.mode(defaultModeForGet))
          .then(SidecarExpect.showing(podName))
      } catch (err) {
        return Common.oops(this, true)(err)
      }
    })
  }

  const switchTo = async (res: ReplExpect.AppAndCount, mode: string) => {
    await this.app.client.waitForVisible(Selectors.SIDECAR_MODE_BUTTON(res.count, mode))
    await this.app.client.click(Selectors.SIDECAR_MODE_BUTTON(res.count, mode))
    await this.app.client.waitForVisible(Selectors.SIDECAR_MODE_BUTTON_SELECTED(res.count, mode))
  }

  /** sleep for the given number of seconds */
  const sleep = (nSecs: number) => new Promise(resolve => setTimeout(resolve, nSecs * 1000))

  /** switch to terminal tab, echo into file, and confirm echoed text */
  const echoInTerminalTabAndConfirm = (ECHO_FILE: string) => {
    it('should show terminal tab', async () => {
      try {
        await switchTo(res, 'terminal')
        await SidecarExpect.toolbarText({
          type: 'info',
          text: `Connected to container ${containerName}`,
          exact: false
        })(res)

        await sleep(5)

        this.app.client.keys(`echo ${ECHO_TEXT} > ${ECHO_FILE}${Keys.ENTER}`)
        this.app.client.keys(`cat ${ECHO_FILE}${Keys.ENTER}`)
        waitForTerminalText.bind(this)(new RegExp('^' + ECHO_TEXT + '$', 'm'))
      } catch (err) {
        return Common.oops(this, true)(err)
      }
    })

    it(`should confirm echoed text via ${command} exec`, async () => {
      try {
        await CLI.command(`${command} exec ${podName} -c ${containerName} -n ${ns} -- cat ${ECHO_FILE}`, this.app)
          .then(ReplExpect.okWithString(ECHO_TEXT))
          .catch(Common.oops(this, true))
      } catch (err) {
        await Common.oops(this, true)(err)
      }
    })
  }

  const doRetry = (toolbar: { type: string; text: string; exact: boolean }) => {
    it('should click retry button', async () => {
      try {
        await this.app.client.waitForVisible(Selectors.SIDECAR_MODE_BUTTON(res.count, 'retry-streaming'))
        await this.app.client.click(Selectors.SIDECAR_MODE_BUTTON(res.count, 'retry-streaming'))
        await SidecarExpect.toolbarText(toolbar)(res)
      } catch (err) {
        return Common.oops(this, true)(err)
      }
    })
  }

  /** switch to terminal tab, exit with 1, see error in toolbar and click retry button */
  const exitTerminalTabAndRetry = () => {
    it('should show terminal tab and exit with error', async () => {
      try {
        await this.app.client.waitForVisible(Selectors.SIDECAR_MODE_BUTTON(res.count, 'terminal'))
        await this.app.client.click(Selectors.SIDECAR_MODE_BUTTON(res.count, 'terminal'))
        await this.app.client.waitForVisible(Selectors.SIDECAR_MODE_BUTTON_SELECTED(res.count, 'terminal'))

        await SidecarExpect.toolbarText({
          type: 'info',
          text: `Connected to container ${containerName}`,
          exact: false
        })(res)

        await new Promise(resolve => setTimeout(resolve, 5000))

        this.app.client.keys(`exit 1${Keys.ENTER}`)

        await SidecarExpect.toolbarText({ type: 'error', text: 'has closed', exact: false })(res)
      } catch (err) {
        return Common.oops(this, true)(err)
      }
    })

    doRetry({
      type: 'info',
      text: `Connected to container ${containerName}`,
      exact: false
    })
  }

  // needed to force the dom renderer for webpack/browser-based tests; see ExecIntoPod
  Common.setDebugMode.bind(this)()

  it(`should create sample pod from URL via ${command}`, () => {
    return CLI.command(
      `${command} create -f https://raw.githubusercontent.com/kubernetes/examples/master/staging/pod -n ${ns}`,
      this.app
    )
      .then(ReplExpect.okWithCustom({ selector: Selectors.BY_NAME('nginx') }))
      .then((selector: string) => waitForGreen(this.app, selector))
      .catch(Common.oops(this, true))
  })

  getPodAndOpenSidecar()
  echoInTerminalTabAndConfirm(ECHO_FILE_1)
  getPodAndOpenSidecar()
  exitTerminalTabAndRetry()
  echoInTerminalTabAndConfirm(ECHO_FILE_2)

  const getText = getTerminalText.bind(this)
  const waitForText = waitForTerminalText.bind(this)

  // FIXME: MENGING: switching terminal tab didn’t xoff the process.
  // It turns out that terminal tab is listening mode/focus event with primaryTabID.
  // I think it should listen to block execUUID instead.
  // we could change the events in ExecIntoPod and TopNavSidecarv2.
  xit('should re-focus and xoff the terminal when we switch to a different sidecar tab', async () => {
    try {
      console.error('1')
      await switchTo(res, 'raw')

      await sleep(3)
      console.error('2')
      await switchTo(res, 'terminal')
      await sleep(3)

      console.error('3')
      const elts = await this.app.client.elements(`${Selectors.SIDECAR_TAB_CONTENT(res.count)} .xterm-rows`)
      console.error('3b', elts && elts.value.length)
      await this.app.client.click(`${Selectors.SIDECAR_TAB_CONTENT(res.count)}`)
      await this.app.client.keys(`while true; do echo hi; sleep 1; done${Keys.ENTER}`)

      console.error('4')
      await waitForText(res, /^hi$/m)

      const textBeforeSwitch = await getText(res)
      const nLinesBefore = textBeforeSwitch.split(/\n/).length
      console.error('5', nLinesBefore)

      await switchTo(res, 'raw')
      await sleep(10)
      await switchTo(res, 'terminal')

      const textAfterSwitch = await getText(res)
      const nLinesAfter = textAfterSwitch.split(/\n/).length
      console.error('6', nLinesAfter)

      // we slept for 10 seconds, and our while loop emits "hi" every
      // second. we shouldn't have anywhere near 10 new newlines now:
      ok(nLinesAfter - nLinesBefore < 5)
    } catch (err) {
      await Common.oops(this, true)(err)
    }
  })

  it('should properly exit the terminal', async () => {
    try {
      await this.app.client.keys(Keys.ctrlC)
      await this.app.client.keys(`exit${Keys.ENTER}`)
      await SidecarExpect.toolbarText({ type: 'error', text: 'has closed', exact: false })(res)
    } catch (err) {
      await Common.oops(this, true)(err)
    }
  })

  deletePodByName(this, podName, ns)

  doRetry({ type: 'error', text: 'has closed', exact: false })

  deleteNS(this, ns)
})
