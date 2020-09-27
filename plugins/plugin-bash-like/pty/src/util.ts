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

/**
 * After termination, it is nice not to show a row that contains only
 * the xterm.js cursor block
 *
 */
export function cleanupTerminalAfterTermination(element: Element) {
  const cursor = element.querySelector('.xterm-rows .xterm-cursor')
  const cursorRow = cursor && (cursor.parentNode as Element)
  if (cursorRow) {
    if (cursorRow.children.length === 1) {
      // cursorRow.classList.add('hide')
      cursorRow.remove()
    }
  }
}
