/*
 * Copyright 2021 The Kubernetes Authors
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

import React from 'react'
import { VictoryChart, VictoryBar, VictoryVoronoiContainer } from 'victory'
import { REPL, Row, Tab, Table } from '@kui-shell/core'

interface Props {
  response: Table
  tab: Tab
  repl: REPL

  /** whether the table is currently "live", and responding to updates from the controller */
  isWatching: boolean
}

interface State {
  rows: Row[]
}

export default class Histogram extends React.PureComponent<Props, State> {
  public constructor(props: Props) {
    super(props)
    this.state = Histogram.getDerivedStateFromProps(props)
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(error, errorInfo)
  }

  public static getDerivedStateFromProps(props: Props, state?: State) {
    return Object.assign({}, state, { rows: props.response.body })
  }

  private rows() {
    const asHorizontal = true

    return (
      <VictoryChart
        domainPadding={20}
        horizontal={asHorizontal}
        padding={{
          left: 120,
          right: 100,
          bottom: 25
        }}
        containerComponent={<VictoryVoronoiContainer labels={_ => `${_.datum.x}: ${_.datum.y}`} />}
      >
        <VictoryBar
          animate
          data={this.state.rows.map(row => {
            const count = row.attributes.find(_ => _.key === 'Count').value
            return {
              x: row.rowKey || row.name,
              y: parseInt(count)
            }
          })}
          labels={_ => _.datum.y}
        />
      </VictoryChart>
    )
  }

  public render() {
    if (!this.state) {
      return <React.Fragment />
    }

    return (
      <div className="kui--data-table-container kui--data-table-container">
        <div className="kui--table-like-wrapper pf-c-table pf-m-compact kui--histogram">{this.rows()}</div>
      </div>
    )
  }
}
