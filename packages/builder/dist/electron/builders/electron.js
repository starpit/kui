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

/**
 * This goal of this code is to invoke electron-packager with an
 * `afterCopy` script: `copyNodePty`. That afterCopy handler copies in
 * a prebuilt `pty.node` binary for the target platform.
 *
 * Why do we maintain our own prebuilt node-pty?
 * 1) node-pty-prebuilt is no longer maintained
 *
 * 2) the presumed replacement, node-pty-prebuilt-multiarch, is not
 * being kept up-to-date; for example, as of this writing, it does not
 * have a prebuilt binary for electron 6 darwin; it is also running a
 * back-level compared to the main `node-pty` release series
 *
 * 3) triggering a rebuild of node-pty-prebuilt-multiarch is a bit
 * strange; we have found that a simple `npm rebuild` at the top level
 * is not sufficient; instead, we have to copy our npmrc into the
 * node-pty-prebuilt-multiarch directory, and run in `npm install`
 * from that directory
 *
 * 4) the prebuilt binaries are small enough not to worry about: 8-12k
 * each
 *
 * 5) we can ride off the main node-pty release series, pinning at our
 * discretion
 *
 */

const { join } = require('path')
const { arch: osArch } = require('os')
const { createGunzip } = require('zlib')
const { createReadStream, createWriteStream, readdir } = require('fs')
const packager = require('electron-packager')

process.argv.shift()
process.argv.shift()

const nodePty = 'node-pty-prebuilt-multiarch'

async function copyNodePty(buildPath, electronVersion, targetPlatform, targetArch, callback) {
  if (process.platform === targetPlatform && targetArch === osArch()) {
    // if the current platform matches the target platform, there is
    // nothing to do
    callback()
  } else {
    const target = `${targetPlatform}-${targetArch}`
    const sourceDir = join(process.env.BUILDER_HOME, 'dist/electron/vendor', nodePty, 'build', target, 'electron')

    readdir(sourceDir, async (err, files) => {
      if (err) {
        callback(err)
      } else {
        try {
          await Promise.all(
            files.map(
              sourceFileGz =>
                new Promise((resolve, reject) => {
                  const source = join(sourceDir, sourceFileGz)
                  const target = join(
                    buildPath,
                    'node_modules',
                    nodePty,
                    'build/Release',
                    sourceFileGz.replace(/\.gz$/, '')
                  )
                  console.log(`node-pty source: ${source}`)
                  console.log(`node-pty target: ${target}`)

                  createReadStream(source)
                    .pipe(createGunzip())
                    .pipe(createWriteStream(target))
                    .on('error', reject)
                    .on('finish', resolve)
                })
            )
          )
          callback()
        } catch (err) {
          callback(err)
        }
      }
    })
  }
}

// required positional arguments to our main:
const dir = process.argv[0]
const name = process.argv[1]
const platform = process.argv[2]
const arch = process.argv[3]
const icon = process.argv[4]

const args = {
  dir,
  name,
  platform,
  arch,
  icon,

  // required environmental parameters:
  appVersion: process.env.VERSION,
  buildVersion: process.env.VERSION,
  electronVersion: process.env.ELECTRON_VERSION,
  out: process.env.BUILDDIR,

  // optional environmental parameters
  prune: !process.env.NO_PRUNE,
  ignore: process.env.IGNORE,

  // default settings
  asar: !process.env.NO_ASAR && platform !== 'win32', // node-pty loading native modules versus asar :(
  overwrite: true,

  // and finally, this is the reason we are here:
  afterCopy: [copyNodePty]
}

//
// invoke electron-packager, catching any errors it might throw
//
packager(args)
  .then(() => {
    console.log('success')
    process.exit(0)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
