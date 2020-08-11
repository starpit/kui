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

import { join } from 'path'
import { DirEntry, FStat, VFS, mount } from '@kui-shell/plugin-bash-like/fs'
import { REPL, flatten } from '@kui-shell/core'

// TODO remove this once the PR is ready
/* eslint-disable @typescript-eslint/no-unused-vars */

export class CodeEngineVFS implements VFS {
  public readonly mountPath = '/ce'
  public readonly isLocal = false

  protected readonly prefix = new RegExp(`^${this.mountPath}\\/?`)

  private readonly kinds: DirEntry[] = [
    'application',
    'app',
    'configmap',
    'cm',
    'job',
    'jobdef',
    'jd',
    'project',
    'proj',
    'proj',
    'secret'
  ].map(name => ({
    name,
    nameForDisplay: name,
    path: join(this.mountPath, name),
    stats: { size: 0, mtimeMs: 0, uid: 0, gid: 0, mode: 0 },
    dirent: {
      isFile: false,
      isDirectory: true,
      isSymbolicLink: false,
      isSpecial: false,
      isExecutable: false,
      permissions: '',
      username: ''
    }
  }))

  public async ls({ REPL }: { REPL: REPL }, filepaths: string[]) {
    return flatten(await Promise.all(filepaths.map(filepath => this.dirstat(REPL, filepath.replace(this.prefix, '')))))
  }

  private async dirstat(repl: REPL, filepath: string): Promise<DirEntry[]> {
    if (filepath.length === 0) {
      return this.listResourceKinds()
    } else {
      const { kind, name } = this.split(filepath)
      const entries = await this.listInstancesOfKind(repl, kind)
      if (!name) {
        return entries
      } else {
        const pattern = new RegExp(`^${name.replace(/\*/, '.*')}$`)
        return entries.filter(_ => pattern.test(_.name))
      }
    }
  }

  /** Turn /kind/name into { kind, name } */
  private split(filepath: string): { kind: string; name?: string } {
    const [kind, name] = filepath.match(/^\/?(.*)\/?(.*)?$/)
    return { kind, name }
  }

  private async listResourceKinds(): Promise<DirEntry[]> {
    return this.kinds
  }

  private async listInstancesOfKind(repl: REPL, kind: string): Promise<DirEntry[]> {
    return []
  }

  /** Insert filepath into directory */
  public async cp(
    _,
    srcFilepath: string,
    dstFilepath: string,
    srcIsLocal: boolean,
    dstIsLocal: boolean
  ): Promise<string> {
    throw new Error('Unsupported operation')
  }

  /** Remove filepath */
  public async rm(_, filepath: string, recursive = false) {
    throw new Error('Unsupported operation')
  }

  /** Fetch contents */
  public fstat(_, filepath: string): Promise<FStat> {
    throw new Error('Unsupported operation')
  }

  /** Create a directory/bucket */
  public async mkdir(_, filepath: string): Promise<void> {
    throw new Error('Unsupported operation')
  }

  /** Remove a directory/bucket */
  public async rmdir(_, filepath: string): Promise<void> {
    throw new Error('Unsupported operation')
  }
}
export default async () => {
  mount(new CodeEngineVFS())
}
