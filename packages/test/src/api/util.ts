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
import * as assert from 'assert'
import { Application } from 'spectron'
import { v4 as uuid } from 'uuid'

// until we can use esModuleInterop...
// import { safeLoad } from 'js-yaml'
const { safeLoad } = require('js-yaml')

import * as Selectors from './selectors'
import * as CLI from './cli'
import * as Common from './common'
import * as ReplExpect from './repl-expect'
import * as SidecarExpect from './sidecar-expect'

export interface AppAndCount {
  app: Application
  count: number
}

/**
 * subset means that it is ok for struct1 to be a subset of struct2
 * so: every key in struct1 must be in struct2, but not vice versa
 *
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sameStruct = (struct1: Record<string, any>, struct2: Record<string, any>, subset = false): boolean => {
  if (struct1 === struct2) {
    return true
  } else if (typeof struct1 !== typeof struct2) {
    return false
  }

  for (const key in struct1) {
    if (!(key in struct2)) {
      console.log(`!(${key} in struct2)`)
      return false
    } else if (typeof struct1[key] === 'function') {
      // then we have a validator function
      if (!struct1[key](struct2[key])) {
        return false
      }
    } else if (typeof struct1[key] !== typeof struct2[key]) {
      console.log(`typeof struct1[${key}] !== typeof struct2[${key}] ${typeof struct1[key]} ${typeof struct2[key]}`)
      console.log(struct1)
      console.log(struct2)
      return false
    } else if (typeof struct1[key] === 'object') {
      if (!sameStruct(struct1[key], struct2[key], subset)) {
        return false
      }
    } else if (struct1[key] !== struct2[key]) {
      console.log(`struct1[${key}] !== struct2[${key}] ${struct1[key]} ${struct2[key]}`)
      return false
    }
  }
  // if struct1 if expected to be a subset of struct2, then we're done
  if (subset) return true

  for (const key in struct2) {
    if (!(key in struct1)) {
      console.log(`!(${key} in struct1)`)
      return false
    } else if (typeof struct1[key] === 'function') {
      // then we have a validator function
      if (!struct1[key](struct2[key])) {
        return false
      }
    } else if (typeof struct1[key] !== typeof struct2[key]) {
      console.log(`typeof struct1[${key}] !== typeof struct2[${key}] ${typeof struct1[key]} ${typeof struct2[key]}`)
      console.log(struct1)
      console.log(struct2)
      return false
    } else if (typeof struct2[key] === 'object') {
      if (!sameStruct(struct1[key], struct2[key], subset)) {
        return false
      }
    } else if (struct1[key] !== struct2[key]) {
      console.log(`struct1[${key}] !== struct2[${key}] ${struct1[key]} ${struct2[key]}`)
      return false
    }
  }
  return true
}

export const expectSubset = (struct1: object, failFast = true) => (str: string) => {
  try {
    const ok = sameStruct(struct1, JSON.parse(str), true)
    if (failFast) {
      assert.ok(ok)
    }
    return true
  } catch (err) {
    console.error('Error comparing subset for actual value=' + str)
    throw err
  }
}

/** is the given struct2 the same as the given struct2 (given as a string) */
export const expectStruct = (struct1: object, noParse = false, failFast = true) => (str: string) => {
  try {
    const ok = sameStruct(struct1, noParse ? str : JSON.parse(str))
    if (failFast) {
      assert.ok(ok)
    }
    return ok
  } catch (err) {
    console.error('Error comparing structs for actual value=' + str)
    throw err
  }
}

export const expectYAML = (struct1: object, subset = false, failFast = true) => (str: string) => {
  try {
    const struct2 = safeLoad(str)
    const ok = sameStruct(struct1, struct2, subset)
    if (failFast) {
      assert.ok(ok)
    }
    return ok
  } catch (err) {
    if (failFast) {
      return false
    } else {
      console.error('Error comparing subset for actual value=' + str)
      throw err
    }
  }
}

export const expectYAMLSubset = (struct1: object, failFast = true) => expectYAML(struct1, true, failFast)

/** is the given actual array the same as the given expected array? */
export const expectArray = (expected: Array<string>, failFast = true, subset = false) => (
  actual: string | Array<string>
) => {
  if (!Array.isArray(actual)) {
    // webdriver.io's getText will return a singleton if there is only one match
    actual = [actual]
  }

  const matchFn = function(u: string, i: number) {
    return u === expected[i]
  }

  const ok = !subset ? actual.length === expected.length && actual.every(matchFn) : actual.some(matchFn)

  if (!ok) {
    console.error(`array mismatch; expected=${expected} actual=${actual}`)
  }

  if (failFast) {
    assert.ok(ok)
  } else {
    return ok
  }
}

/** get the monaco editor text */
export const getValueFromMonaco = async (
  res: AppAndCount,
  container = `${Selectors.PROMPT_BLOCK_N(res.count)} .bx--tab-content:not([hidden])`
) => {
  const selector = `${container} .monaco-editor-wrapper`
  try {
    await res.app.client.$(selector).then(_ => _.waitForExist({ timeout: CLI.waitTimeout }))
  } catch (err) {
    console.error('cannot find editor', err)
    await res.app.client
      .$(Selectors.SIDECAR(res.count))
      .then(_ => _.getHTML())
      .then(html => {
        console.log('here is the content of the sidecar:')
        console.log(html)
      })
    throw err
  }

  return res.app.client.execute(selector => {
    try {
      return ((document.querySelector(selector) as any) as { getValueForTests: () => string }).getValueForTests()
    } catch (err) {
      console.error('error in getValueFromMonaco1', err)
      // intentionally returning undefined
    }
  }, selector)
}

export const waitForXtermInput = (app: Application, N: number) => {
  const selector = `${Selectors.PROMPT_BLOCK_N(N)} .xterm-helper-textarea`
  return app.client.$(selector).then(_ => _.waitForExist())
}

export const expectText = (app: Application, expectedText: string, exact = true) => async (selector: string) => {
  let idx = 0
  await app.client.waitUntil(
    async () => {
      const actualText = await app.client.$(selector).then(_ => _.getText())
      if (++idx > 5) {
        console.error(
          `still waiting for text; actualText=${actualText} expectedText=${expectedText} selector=${selector}`
        )
      }
      if (exact) {
        return actualText === expectedText
      } else {
        if (actualText.indexOf(expectedText) < 0) {
          console.error(`Expected string not found: expected=${expectedText} actual=${actualText}`)
        }
        return actualText.indexOf(expectedText) >= 0
      }
    },
    { timeout: CLI.waitTimeout }
  )
  return app
}

/**
 *
 * - Type the command
 * - Expect a command not found
 * - Expect the given list of available related commands
 * - Optionally click on a given "click" index of the available list
 * - If so, then either: expect the subsequent command output to have the given terminal breadcrumb in its usage message
 *                   or: expect the sidecar icon to be "sidecar"
 *
 */
export function expectSuggestionsFor(
  this: Common.ISuite,
  cmd: string,
  expectedAvailable: string[],
  {
    click = undefined,
    expectedBreadcrumb = undefined,
    sidecar: expectedIcon = undefined,
    expectedString = undefined
  }: { click?: number; expectedBreadcrumb?: string; sidecar?: string; expectedString?: string } = {}
) {
  return CLI.command(cmd, this.app)
    .then(ReplExpect.errorWithPassthrough(404))
    .then(N => {
      const base = `${Selectors.OUTPUT_N(N)} .user-error-available-commands .log-line`
      const availableItems = `${base} .clickable`

      return this.app.client
        .$(availableItems)
        .then(_ => _.getText())
        .then(expectArray(expectedAvailable, false, true))
        .then(async () => {
          if (click !== undefined) {
            // then click on the given index; note that nth-child is 1-indexed, hence the + 1 part
            const clickOn = `${base}:nth-child(${click + 1}) .clickable`

            await this.app.client.$(clickOn).then(_ => _.click())

            if (expectedBreadcrumb) {
              //
              // then expect the next command to have the given terminal breadcrumb
              //
              const breadcrumb = `${Selectors.OUTPUT_N(N + 1)} .bx--breadcrumb-item:last-child .bx--no-link`
              return this.app.client
                .$(breadcrumb)
                .then(_ => _.getText())
                .then(actualBreadcrumb => assert.strictEqual(actualBreadcrumb, expectedBreadcrumb))
            } else if (expectedIcon) {
              //
              // then wait for the sidecar to be open and showing the expected sidecar icon text
              //
              const icon = `${Selectors.SIDECAR(N)} .sidecar-header-icon-wrapper .sidecar-header-icon`
              return SidecarExpect.open({ app: this.app, count: N })
                .then(() => this.app.client.$(icon))
                .then(_ => _.getText())
                .then(actualIcon => actualIcon.toLowerCase())
                .then(actualIcon => assert.strictEqual(actualIcon, expectedIcon))
            } else if (expectedString) {
              //
              // then wait for the given command output
              //
              return this.app.client.waitUntil(async () => {
                const text = await this.app.client.$(Selectors.OUTPUT_N(N + 1)).then(_ => _.getText())
                return text === expectedString
              })
            }
          }
        })
    })
    .catch(Common.oops(this))
}

/** @return the current number of tabs */
export async function tabCount(app: Application): Promise<number> {
  const topTabs = await app.client.$$(Selectors.TOP_TAB)
  return topTabs.length
}

/** Close all except the first tab */
export function closeAllExceptFirstTab(this: Common.ISuite) {
  it('should close all but first tab', async () => {
    let nInitialTabs = await tabCount(this.app)
    while (nInitialTabs > 1) {
      const N = nInitialTabs--
      await this.app.client.$(Selectors.TOP_TAB_CLOSE_N(N)).then(_ => _.click())
      await this.app.client
        .$(Selectors.TAB_N(N))
        .then(_ => _.waitForExist({ timeout: 5000, reverse: true }))
        .then(() => this.app.client.$(Selectors.TAB_SELECTED_N(N - 1)))
        .then(_ => _.waitForDisplayed())
    }
  })
}

export function uniqueFileForSnapshot() {
  return `/tmp/${uuid()}.kui`
}

/** Click the close button on a block, and expect it to be gone */
export async function removeBlock(res: AppAndCount) {
  const N = res.count
  await res.app.client.$(Selectors.PROMPT_N(N)).then(_ => _.moveTo())

  const removeButton = await res.app.client.$(Selectors.BLOCK_REMOVE_BUTTON(N))
  await removeButton.waitForDisplayed()
  await removeButton.click()
}

/** Switch sidecar tab */
export function switchToTab(mode: string) {
  return async (res: AppAndCount) => {
    const tab = await res.app.client.$(Selectors.SIDECAR_MODE_BUTTON(res.count, mode))
    await tab.waitForDisplayed()
    await tab.click()
    await res.app.client.$(Selectors.SIDECAR_MODE_BUTTON_SELECTED(res.count, mode)).then(_ => _.waitForDisplayed())
    return res
  }
}
