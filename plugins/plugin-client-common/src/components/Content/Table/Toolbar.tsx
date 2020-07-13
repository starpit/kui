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

import Markdown from '../Markdown'
import Icons from '../../spi/Icons'
import Breadcrumb, { Props as BreadcrumbProps } from '../../spi/Breadcrumb'

import 'carbon-components/scss/components/pagination/_pagination.scss'

import '../../../../web/css/static/ToolbarButton.scss'
import '../../../../web/scss/components/Table/Events.scss'
import '../../../../web/scss/components/Table/Toolbar.scss'

export type Props = Partial<GridProps> &
  Partial<PaginationProps> &
  Partial<BreadcrumbProps> &
  Partial<StreamProps> & {
    framed?: boolean
    className?: string
  }

interface GridProps {
  gridableColumn: number
  asGrid?: boolean
  setAsGrid: (asGrid: boolean) => void
}

interface PaginationProps {
  paginate: boolean
  page: number
  totalItems: number
  pageSize: number
  setPage: (page: number) => void
}

interface StreamProps {
  stream: string[]
}

export default class Toolbar extends React.PureComponent<Props> {
  private hasGridButtons() {
    return this.props.gridableColumn !== undefined && this.props.gridableColumn >= 0
  }

  private hasButtons() {
    return this.hasGridButtons()
  }

  private gridController() {
    if (this.hasGridButtons()) {
      return (
        <React.Fragment>
          <a
            role="presentation"
            href="#"
            className="kui--table-navigatable kui--toolbar-button-with-icon kui--toolbar-button-as-list"
            data-enabled={!this.props.asGrid}
            onClick={() => this.props.setAsGrid(false)}
          >
            <Icons icon="List" />
          </a>
          <a
            role="presentation"
            href="#"
            className="kui--table-navigatable kui--toolbar-button-with-icon kui--toolbar-button-as-grid"
            data-enabled={this.props.asGrid}
            onClick={() => this.props.setAsGrid(true)}
          >
            <Icons icon="Grid" />
          </a>
        </React.Fragment>
      )
    }
  }

  private previousPage() {
    this.props.setPage(this.props.page - 1)
  }

  private nextPage() {
    this.props.setPage(this.props.page + 1)
  }

  private paginationController() {
    if (this.props.paginate) {
      const start = (this.props.page - 1) * this.props.pageSize + 1
      const end = this.props.page * this.props.pageSize
      const isFirstPage = this.props.page === 1
      const nPages = Math.ceil(this.props.totalItems / this.props.pageSize)
      const isLastPage = this.props.page === nPages

      const maxLength = end.toString().length
      const rangeText = `${start.toString().padStart(maxLength)} \u2014 ${end} of ${this.props.totalItems}`

      return (
        <div className="kui--data-table-toolbar-pagination bx--pagination">
          <span className="kui--data-table-toolbar-pagination-info">{rangeText}</span>
          <button
            type="button"
            onMouseDown={evt => evt.preventDefault()}
            disabled={isFirstPage}
            className={
              'bx--pagination__button bx--pagination__button--backward' +
              (isFirstPage ? ' bx--pagination__button--no-index' : '')
            }
            aria-label="Previous page"
            onClick={() => this.previousPage()}
          >
            <Icons icon="PreviousPage" />
          </button>
          <button
            type="button"
            onMouseDown={evt => evt.preventDefault()}
            disabled={isLastPage}
            className={
              'bx--pagination__button bx--pagination__button--forward' +
              (isLastPage ? ' bx--pagination__button--no-index' : '')
            }
            aria-label="Next page"
            onClick={() => this.nextPage()}
          >
            <Icons icon="NextPage" />
          </button>
        </div>
      )
    }
  }

  private breadcrumbs() {
    if (this.props.breadcrumbs) {
      return <Breadcrumb breadcrumbs={this.props.breadcrumbs} repl={this.props.repl} />
    }
  }

  private buttons() {
    if (this.hasButtons()) {
      return <div className="kui--data-table-toolbar-buttons">{this.gridController()}</div>
    }
  }

  /** so that buttons are flush-left and pagination is flush-right */
  private filler() {
    return <div className="kui--data-table-toolbar-filler" />
  }

  private messageStream() {
    if (this.props.stream) {
      return this.props.stream.map((_, idx) => (
        <div key={idx} className="kui--data-table-footer-messages kui--inverted-color-context">
          <div className="kui--data-table-footer-message">
            <Markdown source={_} noExternalLinks />
          </div>
        </div>
      ))
    }
  }

  public render() {
    const className = 'kui--data-table-toolbar' + (this.props.className ? ` ${this.props.className}` : '')

    return (
      <div className={className} data-frame={this.props.framed || undefined}>
        {this.breadcrumbs()}
        {this.buttons()}
        {this.props.children}
        {this.filler()}
        {this.messageStream()}
        {this.paginationController()}
      </div>
    )
  }
}
