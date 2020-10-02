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

import React from 'react'
import prettyMillis from 'pretty-ms'
import { REPL, Row, Tab, Table, flatten, i18n } from '@kui-shell/core'

import Bar from './Bar'
import DefaultColoring from './Coloring'
import renderCell, { onClickForCell } from './TableCell'

import '../../../../web/scss/components/Table/SequenceDiagram.scss'

const strings = i18n('plugin-client-common')

interface DenseInterval {
  startMillis: number
  endMillis: number
  rows: Row[]
}

interface Props {
  response: Table
  tab: Tab
  repl: REPL
}

interface State {
  maxIntervalTimeSpan: number
  intervals: DenseInterval[]
}

function prettyPrintDuration(duration: number): string {
  try {
    return prettyMillis(duration)
  } catch (err) {
    console.error('error formatting duration', duration, err)
    return ''
  }
}

export default class SequenceDiagram extends React.PureComponent<Props, State> {
  /**
   * Threshold in millis below which two rows will be considered to be
   * part of the same dense region of time.
   *
   */
  private static readonly denseThreshold = 60 * 1000

  public constructor(props: Props) {
    super(props)
    this.state = SequenceDiagram.computeGapModel(props.response, SequenceDiagram.denseThreshold)
  }

  public static getDerivedStateFromProps(props: Props) {
    return SequenceDiagram.computeGapModel(props.response, SequenceDiagram.denseThreshold)
  }

  private getFraction(numerator: number, interval?: DenseInterval) {
    // return `${((numerator / (interval.endMillis - interval.startMillis)) * 100).toFixed(10).toString()}%`
    const fraction = Math.min(
      1,
      numerator / (interval ? interval.endMillis - interval.startMillis : this.state.maxIntervalTimeSpan)
    )
    return `${(fraction * 100).toFixed(10).toString()}%`
  }

  private static computeGapModel(response: Table, denseThreshold: number) {
    const idx1 = response.startColumnIdx
    const idx2 = response.completeColumnIdx

    // need to slice so as not to permute the original table model
    const intervals = response.body
      .slice(0)
      .sort((a, b) => {
        const aStartCell = a.attributes[idx1]
        const bStartCell = b.attributes[idx1]
        if (!aStartCell || !bStartCell || !aStartCell.value || !bStartCell.value) {
          return 0
        } else {
          const startDelta = new Date(aStartCell.value).getTime() - new Date(bStartCell.value).getTime()
          if (startDelta === 0) {
            const aEndCell = a.attributes[idx2]
            const bEndCell = b.attributes[idx2]
            if (!aEndCell || !bEndCell || !aEndCell.value || !bEndCell.value) {
              return 0
            } else {
              const endDelta = new Date(aEndCell.value).getTime() - new Date(bEndCell.value).getTime()
              return endDelta
            }
          } else {
            return startDelta
          }
        }
      })
      .reduce((intervals, row) => {
        const startMillis = new Date(row.attributes[idx1].value).getTime()
        const endMillis =
          !row.attributes[idx2].value || row.attributes[idx2].value === '<none>'
            ? startMillis
            : new Date(row.attributes[idx2].value).getTime()
        if (isNaN(endMillis)) {
        }

        if (intervals.length === 0) {
          return [{ startMillis, endMillis, rows: [row] }]
        } else {
          const currentInterval = intervals[intervals.length - 1]
          const gap = endMillis - currentInterval.startMillis

          if (gap < denseThreshold) {
            // add to current interval
            currentInterval.endMillis = endMillis
            currentInterval.rows.push(row)
          } else {
            // the time span between the current interval and this row
            // is too long: create new interval
            intervals.push({ startMillis, endMillis, rows: [row] })
          }

          return intervals
        }
      }, [] as DenseInterval[])

    return {
      maxIntervalTimeSpan: Math.min(
        denseThreshold,
        intervals.reduce((max, interval) => Math.max(max, interval.endMillis - interval.startMillis), 0)
      ),
      intervals
    }
  }

  private header() {
    return (
      <thead>
        <tr>
          <th className="kui--header-cell">Name</th>
          <th className="kui--header-cell">Interval</th>
          <th className="kui--header-cell hide-with-sidecar">Delta</th>
          {this.props.response.statusColumnIdx >= 0 && <th className="kui--header-cell">Status</th>}
        </tr>
      </thead>
    )
  }

  private nSpanCols() {
    return this.props.response.statusColumnIdx >= 0 ? 4 : 3
  }

  private overheads(interval: DenseInterval): { coldStartFraction: number; gapFraction: number } {
    const idx1 = this.props.response.startColumnIdx
    const idx2 = this.props.response.completeColumnIdx
    const idx3 = this.props.response.coldStartColumnIdx

    const { coldStarts, gaps, denominator } = interval.rows.reduce(
      (sums, row) => {
        const startMillisAttr = row.attributes[idx1]
        const endMillisAttr = row.attributes[idx2]
        const coldAttr = idx3 ? row.attributes[idx3] : undefined
        let thisStartMillis: number
        const { previousEndMillis } = sums

        if (endMillisAttr) {
          thisStartMillis = new Date(startMillisAttr.value).getTime()
          const thisEndMillis = new Date(endMillisAttr.value).getTime()

          sums.denominator += thisEndMillis - thisStartMillis
          sums.previousEndMillis = thisEndMillis
        }

        if (coldAttr) {
          sums.coldStarts += parseInt(coldAttr.value, 10)
        }

        if (previousEndMillis > 0) {
          const gap = thisStartMillis - previousEndMillis
          if (gap > 0) {
            sums.gaps += gap
          }
        }

        return sums
      },
      { coldStarts: 0, gaps: 0, denominator: 0, previousEndMillis: 0 }
    )

    return { coldStartFraction: coldStarts / denominator, gapFraction: gaps / denominator }
  }

  private gapRow(startMillis: number, intervalIdx: number) {
    const interval = this.state.intervals[intervalIdx]
    const endMillis = interval.endMillis
    const overheads = this.overheads(interval)

    const gap = [
      <tr key={`gaprowB-${intervalIdx}`} className="kui--interval-start">
        <td />
        <td className="kui--gap-cell">
          <span className="flex-layout">
            {startMillis && !isNaN(startMillis) ? new Date(startMillis).toLocaleString() : ''}
            {endMillis && (
              <span className="flex-fill flex-align-end left-pad">
                {`${prettyPrintDuration(endMillis - startMillis)}`}
                {overheads.coldStartFraction > 0 || overheads.gapFraction > 0 ? ' (' : ''}
                {overheads.coldStartFraction > 0
                  ? `${Math.round(100 * overheads.coldStartFraction).toFixed(0)}% cold start overhead`
                  : ''}
                {overheads.gapFraction > 0
                  ? `, ${Math.round(100 * overheads.gapFraction).toFixed(0)}% scheduling gaps`
                  : ''}
                {overheads.coldStartFraction > 0 || overheads.gapFraction > 0 ? ')' : ''}
              </span>
            )}
          </span>
        </td>
      </tr>
    ]

    return this.blankRow(intervalIdx).concat(gap)
  }

  private blankRow(intervalIdx: number) {
    return intervalIdx === 0
      ? []
      : [
          <tr key={`gaprowA-${intervalIdx}`} className="kui--interval-blank">
            <td colSpan={this.nSpanCols()} />
          </tr>
        ]
  }

  private rows() {
    const idx1 = this.props.response.startColumnIdx
    const idx2 = this.props.response.completeColumnIdx
    const coloring = new DefaultColoring(this.props.response)

    return flatten(
      this.state.intervals.map((interval, intervalIdx) =>
        flatten(
          interval.rows.map((row, rowIdx) => {
            const startDate = new Date(row.attributes[idx1].value)
            const startMillis = startDate.getTime()
            const endMillis = !row.attributes[idx2].value ? startMillis : new Date(row.attributes[idx2].value).getTime()

            const durationCol =
              this.props.response.durationColumnIdx >= 0 && row.attributes[this.props.response.durationColumnIdx]
                ? parseInt(row.attributes[this.props.response.durationColumnIdx].value, 10)
                : undefined
            const duration = durationCol || (!endMillis ? 0 : endMillis - startMillis)

            const left = this.getFraction(startMillis - interval.startMillis, interval)
            const width = this.getFraction(duration)
            const coldStart =
              this.props.response.coldStartColumnIdx >= 0 && row.attributes[this.props.response.coldStartColumnIdx]
                ? parseInt(row.attributes[this.props.response.coldStartColumnIdx].value, 10)
                : undefined
            const widthB = coldStart ? this.getFraction(coldStart) : undefined
            const title = strings('Duration', prettyPrintDuration(duration))
            const titleB = coldStart ? strings('Cold Start', prettyPrintDuration(coldStart), title) : undefined
            const className = coloring.durationCss(duration, false)

            const gap =
              intervalIdx === 0 && rowIdx === 0
                ? 0
                : rowIdx === 0
                ? startMillis - this.state.intervals[intervalIdx - 1].endMillis
                : startMillis - new Date(interval.rows[0].attributes[idx1].value).getTime()

            const gapText =
              (intervalIdx === 0 && rowIdx === 0) || gap === 0
                ? '' // very first row
                : (gap >= 0 ? '+' : '') + prettyPrintDuration(gap)

            const interGroupGapRow = rowIdx === 0 ? this.gapRow(startMillis, intervalIdx) : []

            // drilldown to underlying resource, e.g. Pod for Kubernetes Jobs
            const onClick = onClickForCell(row, this.props.tab, this.props.repl, row.attributes[0])

            return interGroupGapRow.concat([
              <tr
                key={`${intervalIdx}-${rowIdx}`}
                className={
                  rowIdx === interval.rows.length - 1 ? 'kui--sequence-diagram-last-row-in-interval' : undefined
                }
              >
                <td>
                  <span
                    className={'kui--table-cell-is-name cell-inner ' + (row.onclick ? 'clickable' : '')}
                    onClick={onClick}
                  >
                    {row.name}
                  </span>
                </td>
                <td className="kui--sequence-diagram-bar-cell">
                  <Bar
                    left={left}
                    width={width}
                    widthOverlay={widthB}
                    className={className}
                    onClick={onClick}
                    title={title}
                    titleOverlay={titleB}
                  />
                </td>
                <td className="sub-text hide-with-sidecar">{gapText}</td>
                {this.props.response.statusColumnIdx >= 0
                  ? renderCell(
                      this.props.response,
                      row,
                      false,
                      this.props.tab,
                      this.props.repl
                    )(
                      {
                        id: '',
                        value: row.attributes[this.props.response.statusColumnIdx].value,
                        info: { header: 'Status' },
                        isEditable: false,
                        isEditing: false,
                        isValid: true
                      },
                      this.props.response.statusColumnIdx + 1
                    )
                  : undefined}
              </tr>
            ])
          })
        )
      )
    )
  }

  public render() {
    if (!this.state) {
      return <React.Fragment />
    }

    return (
      <div className="kui--data-table-container bx--data-table-container">
        <table className="bx--data-table bx--data-table--compact kui--sequence-diagram">
          {this.header()}
          <tbody>{this.rows()}</tbody>
        </table>
      </div>
    )
  }
}
