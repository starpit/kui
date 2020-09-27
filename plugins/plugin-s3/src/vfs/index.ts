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

import { basename, join } from 'path'
import * as micromatch from 'micromatch'
import { Client, CopyConditions } from 'minio'
import { Arguments, CodedError, REPL, flatten, inBrowser, i18n } from '@kui-shell/core'
import { DirEntry, FStat, GlobStats, VFS, mount } from '@kui-shell/plugin-bash-like/fs'

import { username, uid, gid } from './username'
import findAvailableProviders, { Provider } from '../providers'

const strings = i18n('plugin-s3')

const baseMountPath = '/s3'

export abstract class S3VFS {
  public readonly mountPath: string
  public readonly isLocal = false
  public readonly isVirtual = false
  protected readonly s3Prefix: RegExp

  public constructor(mountName: string) {
    this.mountPath = join(baseMountPath, mountName)
    this.s3Prefix = new RegExp(`^${this.mountPath}\\/?`)
  }
}

class S3VFSResponder extends S3VFS implements VFS {
  private readonly client: Client

  public constructor(private readonly options: Provider) {
    super(options.mountName)
    this.client = new Client(options)
  }

  public async ls({ parsedOptions }: Parameters<VFS['ls']>[0], filepaths: string[]) {
    return flatten(
      await Promise.all(filepaths.map(filepath => this.dirstat(filepath.replace(this.s3Prefix, ''), parsedOptions.d)))
    )
  }

  /** Degenerate case for `ls /s3`: list all buckets */
  private async listBuckets(): Promise<DirEntry[]> {
    const buckets = await this.client.listBuckets()

    return buckets.map(({ name /* , creationDate */ }) => ({
      name,
      path: join(this.mountPath, name),
      stats: {
        size: 0,
        mtimeMs: 0,
        mode: 0,
        uid,
        gid
      },
      nameForDisplay: name,
      dirent: {
        isFile: false,
        isDirectory: true,
        isSymbolicLink: false,
        isSpecial: false,
        isExecutable: false,
        permissions: '',
        username
      }
    }))
  }

  private async listBucketsMatching(pattern: string): Promise<DirEntry[]> {
    const allBuckets = await this.listBuckets()
    return allBuckets.filter(_ => micromatch.isMatch(_.name, pattern))
  }

  /** Enumerate matching objects */
  private async listObjects(filepath: string, dashD = false): Promise<DirEntry[]> {
    const [, bucketName, bucketNameSlash, prefix, wildcardSuffix] = filepath.match(/([^/*]+)(\/?)([^*]*)(.*)/)

    const pattern =
      prefix.length === 0 && (wildcardSuffix.length === 0 || wildcardSuffix === '*')
        ? '*' // e.g. ls /s3/myBucket
        : wildcardSuffix // e.g. ls /s3/myBucket/he*lo

    if (!bucketNameSlash && dashD) {
      // ls -d /s3/myBuck*
      return this.listBucketsMatching(filepath)
    } else if (!bucketNameSlash) {
      // ls /s3/myBuck*
      const buckets = await this.listBucketsMatching(filepath)
      return flatten(
        await Promise.all(buckets.map(bucketEntry => this.listObjectsMatching(bucketEntry.name, prefix, pattern, true)))
      )
    } else {
      // ls /s3/myBucket/myObj*
      return this.listObjectsMatching(bucketName, prefix, pattern)
    }
  }

  /** Enumerate objects with a suffix wildcard, e.g. C* */
  private async listObjectsMatching(
    bucketName: string,
    prefix: string,
    pattern: string,
    displayFullPath = false
  ): Promise<DirEntry[]> {
    try {
      const objectStream = await this.client.listObjects(bucketName, prefix)

      return new Promise((resolve, reject) => {
        const objects: DirEntry[] = []

        objectStream.on('end', () => resolve(objects))
        objectStream.on('close', () => resolve(objects))

        objectStream.on('error', err => {
          console.error('Error in S3Vfs.listObjects', err)
          const error: CodedError = new Error(err.message || 'Error listing s3 objects')
          error.code = err['httpstatuscode'] || err['code'] // missing types in @types/minio
          reject(error)
        })

        objectStream.on('data', ({ name, size, lastModified }) => {
          if (!pattern || micromatch.isMatch(name, pattern)) {
            const path = join(this.mountPath, bucketName, name)

            objects.push({
              name,
              path,
              stats: {
                size,
                mtimeMs: lastModified.getTime(),
                mode: 0,
                uid,
                gid
              },
              nameForDisplay: displayFullPath ? path : name,
              dirent: {
                isFile: true,
                isDirectory: false,
                isSymbolicLink: false,
                isSpecial: false,
                isExecutable: false,
                permissions: '',
                username
              }
            })
          }
        })
      })
    } catch (err) {
      throw new Error(err.message)
    }
  }

  /** Enumerate the objects specified by the given filepath */
  private async dirstat(filepath: string, dashD: boolean): Promise<DirEntry[]> {
    try {
      if (filepath.length === 0) {
        return this.listBuckets()
      } else {
        return this.listObjects(filepath, dashD)
      }
    } catch (err) {
      console.error('Error in S3VFS.ls', err)
      return []
    }
  }

  private split(filepath: string): { bucketName: string; fileName: string } {
    const [, bucketName, fileName] = filepath.replace(this.s3Prefix, '').match(/([^/]+)\/?(.*)\*?/)
    return { bucketName, fileName }
  }

  /**
   * Upload one or more object. We consult the `vfs ls` API to
   * enumerate the source files. If parsedOptions.P is provided, we
   * set the uploaded objects to public.
   *
   */
  private async fPutObject(
    { REPL, parsedOptions }: Pick<Arguments, 'REPL' | 'parsedOptions'>,
    srcFilepaths: string[],
    dstFilepath: string
  ) {
    const sources = REPL.rexec<GlobStats[]>(`vfs ls ${srcFilepaths.map(_ => REPL.encodeComponent(_)).join(' ')}`)
    const { bucketName, fileName } = this.split(dstFilepath)

    // make public?
    const metadata = parsedOptions.P
      ? {
          'x-amz-acl': 'public-read'
        }
      : {}

    const etagsP = Promise.all(
      (await sources).content.map(_ => {
        return this.client.fPutObject(bucketName, fileName || basename(_.path), _.path, metadata)
      })
    )

    const etags = await etagsP

    if (parsedOptions.P) {
      const endPoint = /^http/.test(this.options.endPoint) ? this.options.endPoint : `https://${this.options.endPoint}`
      const srcs = (await sources).content
      if (etags.length === 1) {
        return strings('Published object as', `${endPoint}/${bucketName}/${basename(srcs[0].path)}`)
      } else if (srcs.find(_ => /index.html$/.test(_.path))) {
        return strings('Published object as', `${endPoint}/${bucketName}/index.html`)
      } else {
        return strings('Published N objects to', etags.length, `${endPoint}/${bucketName}`)
      }
    } else if (etags.length === 1) {
      return strings('Created object with etag', etags[0])
    } else {
      return strings('Created objects with etags', etags.join(', '))
    }
  }

  private async fGetObject(
    { REPL }: Pick<Arguments, 'REPL' | 'parsedOptions'>,
    srcFilepaths: string[],
    dstFilepath: string
  ) {
    const sources = REPL.rexec<GlobStats[]>(`vfs ls ${srcFilepaths.map(_ => REPL.encodeComponent(_)).join(' ')}`)

    // NOTE: intentionally not lstat; we want what is referenced by
    // the symlink
    const { stat } = await import('fs')

    const dstIsDirectory = await new Promise<boolean>((resolve, reject) => {
      stat(dstFilepath, (err, stats) => {
        if (err) {
          if (err.code === 'ENOENT') {
            // copying to new file
            resolve(false)
          } else {
            // some other error
            reject(err)
          }
        } else {
          resolve(stats.isDirectory())
        }
      })
    })

    if (!dstIsDirectory && srcFilepaths.length > 1) {
      throw new Error('Destination is not a directory')
    }

    const fetched = await Promise.all(
      (await sources).content
        .map(_ => _.path)
        .map(async srcFilepath => {
          const { bucketName, fileName } = this.split(srcFilepath)
          const dst = dstIsDirectory ? join(dstFilepath, fileName) : dstFilepath

          await this.client.fGetObject(bucketName, fileName, dst)
          return basename(srcFilepath)
        })
    )

    const N = fetched.length
    return `Fetched ${fetched.slice(0, N - 2).join(', ')}${N <= 2 ? '' : ', '}${fetched
      .slice(N - 2)
      .join(N === 2 ? ' and ' : ', and ')} to ${dstFilepath}`
  }

  private async fCopyObject(
    { REPL }: Pick<Arguments, 'REPL' | 'parsedOptions'>,
    srcFilepaths: string[],
    dstFilepath: string
  ) {
    const sources = REPL.rexec<GlobStats[]>(`vfs ls ${srcFilepaths.map(_ => REPL.encodeComponent(_)).join(' ')}`)

    const etags = await Promise.all(
      (await sources).content
        .map(_ => _.path)
        .map(async srcFilepath => {
          const { bucketName: srcBucket, fileName: srcFile } = this.split(srcFilepath)
          const { bucketName: dstBucket, fileName: dstFile } = this.split(dstFilepath)

          const { etag } = await this.client.copyObject(
            dstBucket,
            dstFile || srcFile,
            `/${srcBucket}/${srcFile}`,
            new CopyConditions()
          )
          return etag
        })
    )

    const N = etags.length
    return N === 0
      ? 'Source files not found'
      : `Copied to ${N === 1 ? 'object' : 'objects'} with ${N === 1 ? 'etag' : 'etags'} ${etags.join(', ')}`
  }

  /** Insert filepath into directory */
  public async cp(
    args: Pick<Arguments, 'command' | 'REPL' | 'parsedOptions' | 'execOptions'>,
    srcFilepaths: string[],
    dstFilepath: string,
    srcIsSelf: boolean[],
    dstIsSelf: boolean
  ): Promise<string> {
    try {
      const selfSrc = srcFilepaths.filter((_, idx) => srcIsSelf[idx])
      const otherSrc = srcFilepaths.filter((_, idx) => !srcIsSelf[idx])

      if (dstIsSelf) {
        // copying into or between s3 buckets
        const responses = await Promise.all(
          (otherSrc.length === 0 ? [] : [this.fPutObject(args, otherSrc, dstFilepath)]).concat(
            selfSrc.length === 0 ? [] : [this.fCopyObject(args, selfSrc, dstFilepath)]
          )
        )
        return responses.join('; ')
      } else {
        // copying out of an s3 bucket
        return this.fGetObject(args, srcFilepaths, dstFilepath)
      }
    } catch (err) {
      const error: CodedError = new Error(err.message)
      error.code = err['httpstatuscode'] || err['code'] // missing types in @types/minio
      throw error
    }
  }

  /** @return recursive list of objects in `bucketName` */
  private async objectsIn(bucketName: string) {
    try {
      const stream = await this.client.listObjects(bucketName, undefined, true)

      return new Promise<string[]>((resolve, reject) => {
        const objects: string[] = []
        stream.on('error', reject)
        stream.on('end', () => resolve(objects))
        stream.on('data', ({ name }) => objects.push(name))
      })
    } catch (err) {
      const error: CodedError = new Error(err.message)
      error.code = err['httpstatuscode'] || err['code'] // missing types in @types/minio
      throw error
    }
  }

  /** rm -rf */
  private async rimraf(bucketName: string): Promise<string> {
    const buckets = await this.listBucketsMatching(bucketName)
    await Promise.all(
      buckets.map(async ({ name: bucketName }) => {
        await this.client.removeObjects(bucketName, await this.objectsIn(bucketName))
        await this.client.removeBucket(bucketName)
      })
    )

    return strings(buckets.length === 1 ? 'Removed bucket X and its contents' : 'Removed N buckets and their contents')
  }

  /** Remove filepath */
  public async rm(_, filepath: string, recursive = false): ReturnType<VFS['rm']> {
    try {
      const { bucketName, fileName } = this.split(filepath)
      if (!fileName) {
        if (!recursive) {
          throw new Error(`rm: ${bucketName} is a bucket`)
        } else {
          return this.rimraf(bucketName)
        }
      } else {
        const objects = await this.listObjects(filepath.replace(this.s3Prefix, ''))
        await this.client.removeObjects(
          bucketName,
          objects.map(_ => _.name)
        )
        return true
      }
    } catch (err) {
      throw new Error(err.message)
    }
  }

  /** Fetch contents */
  public fstat(_, filepath: string): Promise<FStat> {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        const { bucketName, fileName } = this.split(filepath)

        const stream = await this.client.getObject(bucketName, fileName)
        let data = ''
        stream.on('error', reject)
        stream.on('data', chunk => (data += chunk))

        stream.on('end', () => {
          resolve({
            viewer: 'open',
            filepath,
            fullpath: filepath,
            isDirectory: false,
            data
          })
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  /** Create a directory/bucket */
  public async mkdir(_, filepath: string): Promise<void> {
    const { bucketName } = this.split(filepath)

    try {
      await this.client.makeBucket(bucketName, '') // '': use default region
    } catch (err) {
      // for some reason, the core repl does not like minio's error
      if (/Invalid bucket name/.test(err.message)) {
        if (bucketName.length <= 2) {
          throw new Error(err.message + `. Bucket names must have at least 3 characters.`)
        } else if (bucketName.length > 63) {
          throw new Error(err.message + `. Bucket names must have no more than 63 characters.`)
        } else if (/_/.test(bucketName)) {
          throw new Error(err.message + `. Bucket names must not contain underscore.`)
        } else if (/-$/.test(bucketName)) {
          throw new Error(err.message + `. Bucket names must not end with a dash.`)
        } else if (/\./.test(bucketName)) {
          throw new Error(err.message + `. Bucket names must not contain dots.`)
        }
      }
      throw new Error(err.message)
    }
  }

  /** Remove a directory/bucket */
  public async rmdir(_, filepath: string): Promise<void> {
    const { bucketName } = this.split(filepath)

    try {
      await this.client.removeBucket(bucketName)
    } catch (err) {
      throw new Error(err.message)
    }
  }

  private async pollForCompletion({ REPL }: Pick<Arguments, 'REPL'>, jobname: string, nTasks: number) {
    while (true) {
      const json = await REPL.qexec<string>(`ibmcloud ce job get --name ${jobname} -o json`).catch(err => {
        console.error(err)
        return undefined
      })
      if (json && json.status && json.status.succeeded === nTasks) {
        return jobname
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  private async getLogsForTask({ REPL }: Pick<Arguments, 'REPL'>, jobname: string, taskIdx: number): Promise<string[]> {
    const logs = await REPL.qexec<string>(`ibmcloud ce kubectl logs ${jobname}-${taskIdx}-0`)
    const logLines = logs.split(/\n/).filter(_ => /^GREP /.test(_))

    return logLines.map(_ => _.replace(/^GREP /, ''))
  }

  private async getLogs(
    args: Pick<Arguments, 'REPL' | 'parsedOptions'>,
    jobname: string,
    nTasks: number
  ): Promise<string[]> {
    return flatten(
      await Promise.all(
        Array(nTasks)
          .fill(0)
          .map((_, idx) => this.getLogsForTask(args, jobname, idx + 1))
      )
    )
  }

  public async grep(
    opts: Parameters<VFS['grep']>[0],
    pattern: string,
    filepaths: string[]
  ): Promise<number | string[]> {
    const nTasks = opts.parsedOptions.P || 20

    const perFileResults = await Promise.all(
      filepaths.map(async filepath => {
        const { bucketName, fileName } = this.split(filepath)
        const jobname = await opts.REPL.qexec<string>(
          `ibmcloud ce job run --jobdef vfs -e OPERATION=grep -e S3_ACCESS_KEY=76bdbf951dbb4cec85781039bee2a377 -e S3_SECRET_KEY=87d0390b0836048a3ed664917f14bd6dd1b476496342c867 -e SRC_BUCKET=${bucketName} -e SRC_OBJECT=${fileName} -e NSHARDS=${nTasks} -e PATTERN=${pattern} -ai 1-${nTasks}`
        )

        await this.pollForCompletion(opts, jobname, nTasks)

        return this.getLogs(opts, jobname, nTasks)
      })
    )

    if (opts.parsedOptions.c) {
      return perFileResults.map(_ => _.length).reduce((sum, count) => sum + count, 0)
    } else if (opts.parsedOptions.l) {
      return perFileResults.reduce((matchingFiles, matches, idx) => {
        if (matches.length > 0) {
          matchingFiles.push(filepaths[idx])
        }
        return matchingFiles
      }, [])
    } else {
      return flatten(perFileResults)
    }
  }
}

class S3VFSForwarder extends S3VFS implements VFS {
  /** Directory listing */
  public async ls(opts: Pick<Arguments, 'tab' | 'REPL' | 'parsedOptions'>, filepaths: string[]): Promise<DirEntry[]> {
    return (
      await opts.REPL.rexec<DirEntry[]>(`vfs-s3 ls ${filepaths.map(_ => opts.REPL.encodeComponent(_)).join(' ')}`)
    ).content
  }

  /** Insert filepath into directory */
  public cp(
    opts: Pick<Arguments, 'command' | 'REPL' | 'parsedOptions' | 'execOptions'>,
    srcFilepaths: string[],
    dstFilepath: string,
    srcIsSelf: boolean[],
    dstIsSelf: boolean
  ): Promise<string> {
    return opts.REPL.qexec<string>(
      `vfs-s3 cp ${srcFilepaths.map(_ => opts.REPL.encodeComponent(_)).join(' ')} ${opts.REPL.encodeComponent(
        dstFilepath
      )} ${srcIsSelf.join(',')} ${dstIsSelf.toString()}`
    )
  }

  /** Remove filepath */
  public rm(
    opts: Pick<Arguments, 'command' | 'REPL' | 'parsedOptions' | 'execOptions'>,
    filepath: string,
    recursive?: boolean
  ): ReturnType<VFS['rm']> {
    return opts.REPL.qexec(`vfs-s3 rm ${opts.REPL.encodeComponent(filepath)} ${!!recursive}`)
  }

  /** Fetch contents */
  public async fstat(
    opts: Pick<Arguments, 'REPL' | 'parsedOptions'>,
    filepath: string,
    withData?: boolean,
    enoentOk?: boolean
  ): Promise<FStat> {
    return (
      await opts.REPL.rexec<FStat>(`vfs-s3 fstat ${opts.REPL.encodeComponent(filepath)} ${!!withData} ${!!enoentOk}`)
    ).content
  }

  /** Create a directory/bucket */
  public async mkdir(
    opts: Pick<Arguments, 'command' | 'REPL' | 'parsedOptions' | 'execOptions'>,
    filepath: string
  ): Promise<void> {
    await opts.REPL.qexec(`vfs-s3 mkdir ${opts.REPL.encodeComponent(filepath)}`)
  }

  /** remove a directory/bucket */
  public async rmdir(
    opts: Pick<Arguments, 'command' | 'REPL' | 'parsedOptions' | 'execOptions'>,
    filepath: string
  ): Promise<void> {
    await opts.REPL.qexec(`vfs-s3 mkdir ${opts.REPL.encodeComponent(filepath)}`)
  }

  public async grep(opts: Arguments, pattern: string, filepaths: string[]): Promise<string[]> {
    return opts.REPL.qexec(
      `vfs-s3 grep ${opts.REPL.encodeComponent(pattern)} ${filepaths.map(_ => opts.REPL.encodeComponent(_)).join(' ')}`
    )
  }
}

export let responder: VFS

export default async () => {
  mount(async (repl: REPL) => {
    try {
      const providers = await findAvailableProviders(repl)

      if (inBrowser()) {
        return providers.map(provider => new S3VFSForwarder(provider.mountName))
      } else {
        const responders = providers.map(provider => new S3VFSResponder(provider))
        responder = responders[0] // FIXME
        return responders
      }
    } catch (err) {
      console.error('Error initializing s3 vfs', err)
    }
  })
}
