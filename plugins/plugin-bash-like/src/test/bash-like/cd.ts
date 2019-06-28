/*
 * Copyright 2017-19 IBM Corporation
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

import expandHomeDir from '@kui-shell/core/util/home'
import {
  ISuite,
  before as commonBefore,
  after as commonAfter,
  oops,
  localDescribe
} from '@kui-shell/core/tests/lib/common'

import * as ui from '@kui-shell/core/tests/lib/ui'

import { existsSync } from 'fs'
import { dirname, join, normalize } from 'path'

const { cli } = ui
const ROOT = dirname(require.resolve('@kui-shell/core/tests/package.json'))
const rootRelative = (dir: string) => join(ROOT, dir)

localDescribe('Change local shell directory', function(this: ISuite) {
  before(commonBefore(this))
  after(commonAfter(this))

  const previous = () => {
    it(`should execute 'cd -' to change to previous dir`, () =>
      cli
        .do(`cd -`, this.app)
        .then(cli.expectOKWithString(normalize(process.env.TEST_ROOT)))
        .catch(oops(this)))
  }

  let offset = 0
  while (existsSync(`/tmp/foo bar${offset}`)) {
    offset++
  }

  const bar = `bar${offset}`
  it('should mkdir with spaces', () =>
    cli
      .do(`mkdir /tmp/"foo ${bar}"`, this.app)
      .then(cli.expectOK)
      .catch(oops(this)))

  it(`should execute 'cd /tmp/"foo ${bar}"'`, () =>
    cli
      .do(`cd /tmp/"foo ${bar}"`, this.app)
      .then(cli.expectOKWithString('foo bar'))
      .catch(oops(this)))

  previous()

  it(`should execute 'cd "/tmp/foo ${bar}"'`, () =>
    cli
      .do(`cd "/tmp/foo ${bar}"`, this.app)
      .then(cli.expectOKWithString('foo bar'))
      .catch(oops(this)))

  previous()

  it(`should execute 'cd /tmp/foo ${bar}'`, () =>
    cli
      .do(`cd /tmp/foo\\ ${bar}`, this.app)
      .then(cli.expectOKWithString('foo bar'))
      .catch(oops(this)))

  // ls with space and trailing slash; see https://github.com/IBM/kui/issues/1389
  it(`should execute 'ls /tmp/foo ${bar}/'`, () =>
    cli
      .do(`ls /tmp/foo\\ ${bar}/`, this.app)
      .then(cli.expectOKWithAny)
      .catch(oops(this)))
  it(`should execute 'ls /tmp/"foo ${bar}"/'`, () =>
    cli
      .do(`ls /tmp/"foo ${bar}"/`, this.app)
      .then(cli.expectOKWithAny)
      .catch(oops(this)))

  previous()

  it(`should execute 'cd data'`, () =>
    cli
      .do(`cd ${ROOT}/data`, this.app)
      .then(cli.expectOKWithString(rootRelative('data')))
      .catch(oops(this)))

  previous()

  it(`should execute 'cd -' again to change to previous-previous dir`, () =>
    cli
      .do(`cd -`, this.app)
      .then(cli.expectOKWithString(rootRelative('data')))
      .catch(oops(this)))

  previous()

  // now we should be able to change back to data
  it(`should execute 'cd data'`, () =>
    cli
      .do(`cd ${ROOT}/data`, this.app)
      .then(cli.expectOKWithString(rootRelative('data')))
      .catch(oops(this)))

  it(`should handle cd error`, () =>
    cli
      .do(`cd notexist`, this.app)
      .then(cli.expectError(500, 'cd: no such file or directory: notexist'))
      .catch(oops(this)))

  it(`should handle cd error`, () =>
    cli
      .do(`cd ../notexist`, this.app)
      .then(cli.expectError(500, 'cd: no such file or directory: ../notexist'))
      .catch(oops(this)))

  it(`should handle cd error`, () =>
    cli
      .do(`cd -/..`, this.app)
      .then(cli.expectError(499, 'Unsupported optional parameter /'))
      .catch(oops(this)))

  it(`should execute cd without arguments`, () =>
    cli
      .do('cd', this.app)
      .then(cli.expectOKWithString(expandHomeDir('~')))
      .catch(oops(this)))

  it(`should execute cd ${ROOT}`, () =>
    cli
      .do(`cd ${ROOT}`, this.app)
      .then(cli.expectOKWithString(ROOT))
      .catch(oops(this)))
})
