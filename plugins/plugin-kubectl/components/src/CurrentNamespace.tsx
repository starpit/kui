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

import { Icons, ViewLevel, Select, TextWithIconWidget } from '@kui-shell/plugin-client-common'

import { eventBus, i18n, eventChannelUnsafe, getTab, Tab, TabState, pexecInCurrentTab } from '@kui-shell/core'

import {
  kubectl,
  KubeContext,
  getTabState,
  getCurrentDefaultNamespace,
  onKubectlConfigChangeEvents,
  offKubectlConfigChangeEvents
} from '@kui-shell/plugin-kubectl'

import { ready } from './CurrentContext'
import { isInternalNamespace } from '@kui-shell/plugin-kubectl/heuristics'

interface Props {
  className?: string
}

interface State {
  currentNamespace: string
  allNamespaces: string[]
  viewLevel: ViewLevel
}

const strings = i18n('plugin-kubectl')

export default class CurrentNamespace extends React.PureComponent<Props, State> {
  private readonly handler = this.reportCurrentNamespace.bind(this)
  private readonly handlerNotCallingKubectl = this.getCurrentNamespaceFromTab.bind(this)

  public constructor(props: Props) {
    super(props)

    this.state = {
      currentNamespace: strings('Loading...'),
      allNamespaces: [],
      viewLevel: 'info'
    }
  }

  /** @return a short string that we can fit into a context UI widget */
  private renderNamespace(context: KubeContext): string {
    return context.metadata.namespace
  }

  /** Avoid recomputation for a flurry of events */
  private last: number
  private debounce(): boolean {
    const now = Date.now()
    const last = this.last
    this.last = now

    return last && now - last < 250
  }

  private async reportCurrentNamespace(idx?: Tab | number | string) {
    const tab = getTab(typeof idx === 'string' ? undefined : idx)
    if (!tab || !tab.REPL) {
      if (tab && !tab.REPL) {
        eventChannelUnsafe.once(`/tab/new/${tab.uuid}`, () => this.reportCurrentNamespace())
      }
      return
    } else if (this.debounce()) {
      return
    }

    try {
      const [currentNamespace, allNamespaces] = await Promise.all([
        getCurrentDefaultNamespace(tab),
        tab.REPL.qexec<string>(`${kubectl} get ns -o name`).then(_ =>
          _.split(/\n/).map(_ => _.replace(/^namespace\//, ''))
        )
      ])

      if (currentNamespace) {
        this.setState({
          currentNamespace,
          allNamespaces,
          viewLevel: 'normal' // only show normally if we succeed; see https://github.com/IBM/kui/issues/3537
        })
      }
    } catch (err) {
      console.error(err)
      this.last = undefined

      this.setState({
        currentNamespace: '',
        allNamespaces: [],
        viewLevel: 'hidden' // only show normally if we succeed; see https://github.com/IBM/kui/issues/3537
      })
    }
  }

  private getCurrentNamespaceFromTab(args: { idx: number; tab: TabState }) {
    const { tab } = args
    if (tab) {
      const currentNamespace = getTabState(tab, 'namespace')
      if (currentNamespace) {
        this.setState({
          currentNamespace,
          viewLevel: 'normal'
        })
      }
    }
  }

  /**
   * Once we have mounted, we immediately check the current branch,
   * and schedule an update based on standard REPL events.
   *
   */
  public componentDidMount() {
    if (!ready) {
      eventBus.once('/tab/new', this.handler)
    } else {
      this.handler()
    }
    eventBus.on('/tab/switch/request/done', this.handlerNotCallingKubectl)

    eventBus.onAnyCommandComplete(this.handler)
    onKubectlConfigChangeEvents(this.handler)
  }

  /** Bye! */
  public componentWillUnmount() {
    eventBus.off('/tab/new', this.handler)
    eventBus.off('/tab/switch/request/done', this.handlerNotCallingKubectl)

    eventBus.offAnyCommandComplete(this.handler)
    offKubectlConfigChangeEvents(this.handler)
  }

  private listNamespace() {
    return (
      <a href="#" onClick={() => pexecInCurrentTab(`${kubectl} get namespace`)}>
        {strings('Show Full Details')}
      </a>
    )
  }

  private popoverHeader() {
    return (
      <React.Fragment>
        <div>{strings('Kubernetes Namespace')}</div>
        <div className="do-not-overflow">
          <strong>{this.state.currentNamespace}</strong>
        </div>
        <div className="sub-text even-smaller-text">{this.listNamespace()}</div>
      </React.Fragment>
    )
  }

  private switchNamespaceDescription() {
    const key =
      this.state.allNamespaces.length === 0
        ? 'Please wait, while we find your namespaces'
        : 'To change, select from the following list of all known namespaces.'

    return <span className="sub-text bottom-pad">{strings(key)}</span>
  }

  /** @return the options model for the given namespace named `ns` */
  private optionFor(ns: string) {
    const isSelected = ns === this.state.currentNamespace

    return {
      label: ns,
      isSelected,
      description: isSelected ? strings('This is your current namespace') : undefined,
      command: `${kubectl} config set-context --current --namespace=${ns}`
    }
  }

  private switchNamespace() {
    if (this.state.allNamespaces.length === 0) {
      return
    }

    const internalNs = this.state.allNamespaces.filter(_ => isInternalNamespace(_)).map(_ => this.optionFor(_))
    const regularNs = this.state.allNamespaces.filter(_ => !isInternalNamespace(_)).map(_ => this.optionFor(_))

    const options = internalNs.length > 0 ? undefined : regularNs
    const groups =
      internalNs.length === 0
        ? undefined
        : [
            { label: '', options: regularNs },
            { divider: true as const },
            { label: strings('System Namespaces'), options: internalNs }
          ]

    return (
      <React.Suspense fallback={<div />}>
        <Select
          variant="typeahead"
          maxHeight="11rem"
          className="small-top-pad"
          selected={this.state.currentNamespace}
          options={options}
          groups={groups}
          isOpen
          isClosable={false}
        />
      </React.Suspense>
    )
  }

  private popoverBody() {
    return (
      <div className="top-pad bottom-pad">
        {this.switchNamespaceDescription()}
        {this.switchNamespace()}
      </div>
    )
  }

  private popover() {
    return {
      className: 'kui--popover-select',
      bodyContent: this.popoverBody(),
      headerContent: this.popoverHeader()
    }
  }

  public render() {
    return (
      <TextWithIconWidget
        className={this.props.className}
        text={this.state.currentNamespace}
        viewLevel={this.state.viewLevel}
        id="kui--plugin-kubeui--current-namespace"
        title={strings('Kubernetes namespace')}
        popover={this.popover()}
      >
        <Icons icon="At" />
      </TextWithIconWidget>
    )
  }
}
