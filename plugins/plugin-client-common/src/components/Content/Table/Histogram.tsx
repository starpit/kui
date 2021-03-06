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
import { VictoryAxis, VictoryBar, VictoryChart, VictoryLabel, VictoryVoronoiContainer } from 'victory'
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
  private readonly horizontal = true
  private readonly barHeight = 10
  private readonly axisLabelFontSize = 9
  private readonly minAxisLabelChars = 4
  private readonly maxAxisLabelChars = 13

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

  /** heuristic to allow "just enough" space for axis labels */
  private leftPad() {
    const longestAxisLabel = this.state.rows.reduce(
      (maxLength, row) => Math.max(maxLength, (row.rowKey || row.name).length),
      0
    )

    const leftPad = Math.min(
      this.maxAxisLabelChars * this.axisLabelFontSize,
      Math.max(this.minAxisLabelChars * this.axisLabelFontSize, longestAxisLabel * this.axisLabelFontSize)
    )

    return leftPad
  }

  private rows() {
    return (
      <VictoryChart
        animate
        domainPadding={10}
        height={this.state.rows.length * this.barHeight * 1.2}
        horizontal={this.horizontal}
        padding={{
          left: this.leftPad(),
          right: 0,
          top: 0,
          bottom: 0
        }}
        containerComponent={<VictoryVoronoiContainer labels={_ => `${_.datum.x}: ${_.datum.y}`} />}
      >
        {this.axis()}
        {this.bars()}
      </VictoryChart>
    )
  }

  private axis() {
    return (
      <VictoryAxis
        style={{
          axis: { stroke: 'var(--color-base04)' },
          tickLabels: {
            fontFamily: 'var(--font-sans-serif)',
            fontSize: this.axisLabelFontSize,
            fill: 'var(--color-text-02)'
          }
        }}
      />
    )
  }

  private bars() {
    return (
      <VictoryBar
        barWidth={this.barHeight}
        style={{
          data: { fill: 'var(--color-base05)', stroke: 'var(--color-base04)', strokeWidth: 0.5 },
          labels: { fontFamily: 'var(--font-sans-serif)', fontSize: 6, fill: 'var(--color-base01)' }
        }}
        data={this.state.rows.map(row => {
          return {
            x: row.rowKey || row.name,
            y: parseInt(row.attributes.find(_ => _.key === 'Count').value, 10)
          }
        })}
        labels={_ => Math.round(_.datum.y)}
        labelComponent={<VictoryLabel dx={({ data, index }) => -(10 + (Math.log10(data[index].y) - 1) * 4)} />}
      />
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
