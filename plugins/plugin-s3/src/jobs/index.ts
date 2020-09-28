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

export interface Job {
  status: {
    succeeded: boolean
  }
}

interface JobProvider<JobName extends number | string = string> {
  /** @return the details of the given Job */
  // get(jobName: JobName): Job | Promise<Job>

  /** @return the logs of the give Task of the given Job */
  logs(jobName: JobName, taskIdx: number): string | Promise<string>

  /** Block until the given job completes */
  wait(jobName: JobName, nTasks: number): Promise<void>

  /** Schedule a Job execution */
  run(image: string, nTasks: number, env?: Record<string, string | boolean | number>): JobName | Promise<JobName>
}

export default JobProvider
