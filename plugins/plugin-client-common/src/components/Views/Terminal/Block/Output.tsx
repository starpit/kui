/*
 * Copyright 2020 The Kubernetes Authors
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

import {
  i18n,
  isAbortableResponse,
  isCodedError,
  isCommentaryResponse,
  isTabLayoutModificationResponse,
  isHTML,
  isRadioTable,
  isReactResponse,
  isMarkdownResponse,
  isMixedResponse,
  isMultiModalResponse,
  isNavResponse,
  isXtermResponse,
  isTable,
  eventChannelUnsafe,
  Tab as KuiTab,
  Stream,
  Streamable
} from '@kui-shell/core'

import { BlockViewTraits, BlockOperationTraits } from './'

import {
  BlockModel,
  ProcessingBlock,
  FinishedBlock,
  hasUUID,
  hasCommand,
  isBeingRerun,
  isFinished,
  isProcessing,
  isOk,
  isCancelled,
  isEmpty,
  isOutputOnly,
  isOops,
  isWithCompleteEvent
} from './BlockModel'

import Actions from './Actions'
import Scalar from '../../../Content/Scalar/' // !! DO NOT MAKE LAZY. See https://github.com/IBM/kui/issues/6758
import KuiContext from '../../../Client/context'
import { Maximizable } from '../../Sidecar/width'
const Ansi = React.lazy(() => import('../../../Content/Scalar/Ansi'))

const strings = i18n('plugin-client-common')

type Props = {
  /** tab UUID */
  uuid: string

  /** for key handlers, which may go away soon */
  tab: KuiTab

  /** Block ordinal */
  idx: number

  /** Block ordinal to be displayed to user */
  displayedIdx?: number

  /** Are we in the middle of a re-run? */
  isBeingRerun: boolean

  model: ProcessingBlock | FinishedBlock
  onRender: () => void
  willUpdateCommand?: (idx: number, command: string) => void
} & Maximizable &
  BlockViewTraits &
  BlockOperationTraits

interface State {
  alreadyListen: boolean
  assertHasContent?: boolean
  isResultRendered: boolean

  nStreamingOutputs: number
  streamingOutput: Streamable[]
  streamingConsumer: Stream
}

export default class Output extends React.PureComponent<Props, State> {
  private readonly _willRemove = () => this.props.willRemove(undefined, this.props.idx)
  private readonly _willUpdateCommand = (command: string) => this.props.willUpdateCommand(this.props.idx, command)

  public constructor(props: Props) {
    super(props)

    const streamingConsumer = this.streamingConsumer.bind(this)

    this.state = {
      alreadyListen: false,
      isResultRendered: false,
      nStreamingOutputs: 0,
      streamingOutput: [],
      streamingConsumer
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async streamingConsumer(part: Streamable) {
    if (hasUUID(this.props.model)) {
      // part === null: the controller wants to clear any prior output
      this.setState(curState => {
        if (part === null) {
          return {
            // remove all output
            nStreamingOutputs: 0,
            streamingOutput: []
          }
        } else {
          curState.streamingOutput.push(part)
          return {
            nStreamingOutputs: curState.nStreamingOutputs + 1,
            streamingOutput: curState.streamingOutput
          }
        }
      })
      this.props.onRender()
      eventChannelUnsafe.emit(`/command/stdout/done/${this.props.uuid}/${this.props.model.execUUID}`)
    }
  }

  public static getDerivedStateFromProps(props: Props, state: State) {
    if ((isProcessing(props.model) || isBeingRerun(props.model)) && !state.alreadyListen) {
      const tabUUID = props.uuid
      eventChannelUnsafe.on(`/command/stdout/${tabUUID}/${props.model.execUUID}`, state.streamingConsumer)
      return {
        alreadyListen: true,
        isResultRendered: false,
        streamingOutput: []
      }
    } else if (isFinished(props.model) && !state.isResultRendered) {
      const tabUUID = props.uuid

      if (!isEmpty(props.model)) {
        eventChannelUnsafe.off(`/command/stdout/${tabUUID}/${props.model.execUUID}`, state.streamingConsumer)
      }

      return {
        alreadyListen: false,
        isResultRendered: true
      }
    } else {
      return state
    }
  }

  private onRender(assertHasContent: boolean): void {
    if (this.props.onRender) {
      this.props.onRender()
    }
    this.setState({ assertHasContent })
  }

  private readonly _onRender = this.onRender.bind(this)

  private hasStreamingOutput() {
    return this.state.nStreamingOutputs > 0
  }

  private outputWillOverflow() {
    // RadioTable currently uses the Dropdown component that will overflow
    return isWithCompleteEvent(this.props.model) && isRadioTable(this.props.model.response)
  }

  private stream() {
    if (this.hasStreamingOutput()) {
      if (this.state.streamingOutput.every(_ => typeof _ === 'string')) {
        const combined = this.state.streamingOutput.join('')
        return (
          <div className="repl-result-like result-vertical" data-stream>
            <Ansi>{combined}</Ansi>
          </div>
        )
      }

      return (
        <div className="repl-result-like result-vertical" data-stream>
          {this.state.streamingOutput.map((part, idx) => (
            <React.Suspense fallback={<div />} key={idx}>
              <Scalar
                tab={this.props.tab}
                execUUID={hasUUID(this.props.model) && this.props.model.execUUID}
                response={part}
                isPartOfMiniSplit={this.props.isPartOfMiniSplit}
                isWidthConstrained={this.props.isWidthConstrained}
                willChangeSize={this.props.willChangeSize}
                willUpdateCommand={this._willUpdateCommand}
                onRender={this._onRender}
              />
            </React.Suspense>
          ))}
        </div>
      )
    }
  }

  private result() {
    if (isProcessing(this.props.model)) {
      return <div className="repl-result" />
    } else if (isEmpty(this.props.model)) {
      // no result to display for these cases
      return <React.Fragment />
    } else {
      const statusCode = isOops(this.props.model)
        ? isCodedError(this.props.model.response)
          ? this.props.model.response.code || this.props.model.response.statusCode
          : 500
        : isFinished(this.props.model)
        ? 0
        : undefined

      return (
        <div
          className={
            'repl-result' +
            (isOops(this.props.model) ? ' oops' : '') +
            (isWithCompleteEvent(this.props.model) && isMixedResponse(this.props.model.response)
              ? ' flex-column'
              : '') +
            (this.outputWillOverflow() ? ' overflow-visible' : '')
          }
          data-status-code={statusCode}
        >
          {isCancelled(this.props.model) ? (
            <React.Fragment />
          ) : (
            <React.Suspense fallback={<div />}>
              <Scalar
                tab={this.props.tab}
                execUUID={hasUUID(this.props.model) && this.props.model.execUUID}
                response={this.props.model.response}
                completeEvent={this.props.model.completeEvent}
                isPartOfMiniSplit={this.props.isPartOfMiniSplit}
                isWidthConstrained={this.props.isWidthConstrained}
                willChangeSize={this.props.willChangeSize}
                willFocusBlock={this.props.willFocusBlock}
                willRemove={this._willRemove}
                willUpdateCommand={this._willUpdateCommand}
              />
            </React.Suspense>
          )}
        </div>
      )
    }
  }

  private cursor() {
    /* if (isProcessing(this.props.model)) {
      return (
        <div className="repl-result-spinner">
          <div className="repl-result-spinner-inner"></div>
        </div>
      )
    } */
  }

  private isShowingSomethingInTerminal(block: BlockModel): block is FinishedBlock {
    if (isProcessing(this.props.model)) {
      return this.hasStreamingOutput()
    } else if (isFinished(block) && !isCancelled(block) && !isEmpty(block)) {
      const { response } = block
      return (
        isOops(block) ||
        isAbortableResponse(response) ||
        isMultiModalResponse(response) ||
        isNavResponse(response) ||
        isCommentaryResponse(response) ||
        isTabLayoutModificationResponse(response) ||
        isReactResponse(response) ||
        isHTML(response) ||
        isMarkdownResponse(response) ||
        (typeof response === 'string' && response.length > 0) ||
        typeof response === 'number' ||
        isTable(response) ||
        isMixedResponse(response) ||
        (isXtermResponse(response) && response.rows && response.rows.length !== 0) ||
        this.hasStreamingOutput()
      )
    } else {
      return false
    }
  }

  private ok(hasContent: boolean) {
    if (isOk(this.props.model)) {
      if (hasContent) {
        return <div className="ok" />
      } else {
        return <div className="ok">{strings('ok')}</div>
      }
    }
  }

  private ctx(/* insideBrackets: React.ReactNode = this.props.displayedIdx || this.props.idx + 1 */) {
    return (
      <KuiContext.Consumer>
        {config =>
          !config.noPromptContext && (
            <span
              className="repl-context"
              onClick={this.props.willFocusBlock}
              data-input-count={this.props.idx}
              data-custom-prompt={!!config.prompt || undefined}
            />
          )
        }
      </KuiContext.Consumer>
    )
  }

  /** For output-only blocks, render the Block Actions */
  private actions() {
    if (isOutputOnly(this.props.model)) {
      return <Actions {...this.props} command={hasCommand(this.props.model) && this.props.model.command} />
    }
  }

  public render() {
    const hasContent =
      this.state.assertHasContent !== undefined
        ? this.state.assertHasContent
        : this.isShowingSomethingInTerminal(this.props.model)

    return (
      <div className={'repl-output ' + (hasContent ? ' repl-result-has-content' : '')}>
        {!this.props.isPartOfMiniSplit && hasContent && this.ctx()}
        <div className="result-vertical">
          {this.stream()}
          {this.result()}
          {this.cursor()}
          {this.ok(hasContent)}
        </div>

        {this.actions()}
      </div>
    )
  }
}
