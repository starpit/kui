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

import * as React from 'react'

import Carbon from './impl/Carbon'
import PatternFly4 from './impl/PatternFly'
import KuiContext from '../../Client/context'

import Props from './model'

export default function CardSpi(props: Props): React.ReactElement {
  return (
    <KuiContext.Consumer>
      {config => (config.components === 'patternfly' ? <PatternFly4 {...props} /> : <Carbon {...props} />)}
    </KuiContext.Consumer>
  )
}
