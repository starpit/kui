/* eslint-disable @typescript-eslint/camelcase */
export const TOP_TAB = '.kui--tab'
export const TOP_TAB_N = (N: number) => `${TOP_TAB}:nth-child(${N})`
export const TOP_TAB_CLOSE_N = (N: number) => `${TOP_TAB}:nth-child(${N}) .kui--tab-close`
export const TOP_TAB_WITH_TITLE = (title: string) => `${TOP_TAB} a[data-custom-label-text="${title}"]`
export const TAB_CONTENT = '.kui--tab-content'
export const CURRENT_TAB = `${TAB_CONTENT}.visible`
export const CURRENT_TAB_TITLE = `${TOP_TAB}.kui--tab--active .kui--tab--label`
export const CURRENT_TAB_CLOSE = `${TOP_TAB}.kui--tab--active .kui--tab-close`
export const TAB_TITLE_N = (N: number) => `${TOP_TAB_N(N)} .kui--tab--label`
export const TAB_N = (N: number) => `${TAB_CONTENT}:nth-child(${N})`
export const TAB_SELECTED_N = (N: number) => `${TAB_N(N)}.visible`

// blocks
const current = (sel: string) => `${sel}.repl-active`
const _PROMPT_BLOCK = '.repl-block'
export const PROMPT_BLOCK = `${CURRENT_TAB} .repl ${_PROMPT_BLOCK}`
export const PROCESSING_PROMPT_BLOCK = current(PROMPT_BLOCK)
export const CURRENT_PROMPT_BLOCK = current(PROMPT_BLOCK)
export const _PROMPT_BLOCK_N = (N: number) => `${_PROMPT_BLOCK}[data-input-count="${N}"]`
export const PROMPT_BLOCK_N = (N: number) => `${PROMPT_BLOCK}[data-input-count="${N}"]`
export const PROMPT_CONTEXT_N = (N: number) => `${PROMPT_BLOCK_N(N)} .repl-context`
export const PROCESSING_N = (N: number) => `${PROMPT_BLOCK_N(N)}.processing`
const _PROMPT = '.repl-input-element'
export const CURRENT_PROMPT = `${CURRENT_PROMPT_BLOCK} ${_PROMPT}`
export const N_ATTR = 'data-input-count'

export const TERMINAL_WITH_SIDECAR_VISIBLE = `${CURRENT_TAB} .repl.sidecar-visible`

export const WELCOME_BLOCK = `${PROMPT_BLOCK} .kui--repl-message.kui--session-init-done`
export const BOTTOM_PROMPT_BLOCK = `${CURRENT_TAB} .kui--input-stripe .repl-block`
export const BOTTOM_PROMPT = `${BOTTOM_PROMPT_BLOCK} input`
export const STATUS_STRIPE_BLOCK = '.kui--status-stripe .kui--input-stripe .repl-block'
export const STATUS_STRIPE_PROMPT = `${STATUS_STRIPE_BLOCK} input`
export const OOPS = `${CURRENT_TAB} .repl .repl-block .oops`
export const _SIDECAR = '.kui--sidecar'
export const SIDECAR_BASE = (N: number) => `${PROMPT_BLOCK_N(N)} ${_SIDECAR}`
export const SIDECAR = (N: number) => `${SIDECAR_BASE(N)}.visible:not(.minimized)`
export const SIDECAR_FULLSCREEN = (N: number) => `${SIDECAR(N)}.maximized`
export const SIDECAR_WITH_FAILURE = (N: number) => `${SIDECAR_BASE(N)}.visible.activation-success-false`
export const SIDECAR_ACTIVATION_TITLE = (N: number) => `${SIDECAR(N)} .kui--sidecar-entity-name-hash .bx--link`
export const SIDECAR_TITLE = (N: number) => `${SIDECAR(N)} .kui--sidecar-entity-name .bx--link`
export const SIDECAR_HERO_TITLE = (N: number) => `${SIDECAR(N)} .sidecar-header .sidecar-header-name`
export const SIDECAR_LEFTNAV_TITLE = (N: number) =>
  `${SIDECAR(N)} .sidecar-header-name-content .bx--side-nav__submenu-title`
export const SIDECAR_HEADER_NAVIGATION = (N: number) => `${SIDECAR(N)} .kui--sidecar--titlebar-navigation`
export const SIDECAR_BREADCRUMBS = (N: number) =>
  `${SIDECAR_HEADER_NAVIGATION(N)} .bx--breadcrumb .bx--breadcrumb-item .bx--link`
export const SIDECAR_PACKAGE_NAME_TITLE = (N: number) => `${SIDECAR(N)} .kui--sidecar-entity-namespace .bx--link`
export const SIDECAR_POPUP_TITLE = SIDECAR_TITLE
export const SIDECAR_POPUP_HERO_TITLE = SIDECAR_HERO_TITLE
export const SIDECAR_KIND = (N: number) => `${SIDECAR(N)} .kui--sidecar-kind .bx--link`
export const SIDECAR_CONTENT = (N: number) => `${SIDECAR(N)} .sidecar-content`
export const SIDECAR_WEB_ACTION_URL = (N: number) => `${SIDECAR(N)} .sidecar-header .entity-web-export-url.has-url`
export const SIDECAR_PACKAGE_PARAMETERS = (N: number) => `${SIDECAR_CONTENT(N)} .package-content .package-source`
export const SIDECAR_BADGES = (N: number) => `${SIDECAR(N)} .sidecar-header .badges`

// top tab stripe buttons
const TOP_TAB_BUTTONS = `#kui--custom-top-tab-stripe-button-container`
export const TERMINAL_AND_SIDECAR_BUTTON = `${TOP_TAB_BUTTONS} [data-mode="show terminal and sidecar"]`
export const ONLY_TERMINAL_BUTTON = `${TOP_TAB_BUTTONS} [data-mode="show only terminal"]`
export const TERMINAL_AND_WATCHER_BUTTON = `${TOP_TAB_BUTTONS} [data-mode="show terminal and watcher"]`
export const TERMINAL_SIDECAR_WATCHER_BUTTON = `${TOP_TAB_BUTTONS} [data-mode="show terminal sidecar and watcher"]`

// sidecar toolbar
export const SIDECAR_TOOLBAR = (N: number) =>
  `${SIDECAR(N)} .bx--tab-content:not([hidden]) .sidecar-bottom-stripe-toolbar`
export const SIDECAR_TOOLBAR_TEXT = (N: number, type: string) =>
  `${SIDECAR_TOOLBAR(N)} .sidecar-toolbar-text[data-type="${type}"] .sidecar-toolbar-text-content`
export const SIDECAR_TOOLBAR_BUTTON = (N: number, mode: string) =>
  `${SIDECAR_TOOLBAR(
    N
  )} .sidecar-bottom-stripe-mode-bits .sidecar-bottom-stripe-button[data-mode="${mode}"] [role="tab"]`

// sidecar alert
export const SIDECAR_ALERT = (N: number, type: string) =>
  `${SIDECAR(N)} .bx--tab-content:not([hidden]) .kui--toolbar-alert[data-type="${type}"]`

// terminal alert
export const TERMINAL_ALERT = (type: string) => `.kui--terminal-alert[data-type="${type}"]`

// sidecar tab content, for visible tab
export const SIDECAR_TAB_CONTENT = (N: number) => `${SIDECAR(N)} .bx--tab-content:not([hidden]) .custom-content`
export const SIDECAR_CUSTOM_CONTENT = (N: number) => `${SIDECAR_TAB_CONTENT(N)} .code-highlighting`

// top nav sidecar
export const SIDECAR_MODE_BUTTONS = (N: number) =>
  `${SIDECAR(N)} .sidecar-bottom-stripe-mode-bits .sidecar-bottom-stripe-button` // all mode buttons in the bottom stripe
export const _SIDECAR_MODE_BUTTON = (N: number, mode: string) => `${SIDECAR_MODE_BUTTONS(N)}[data-mode="${mode}"]` // specific mode button in the bottom stripe
export const SIDECAR_MODE_BUTTON = (N: number, mode: string) => `${_SIDECAR_MODE_BUTTON(N, mode)} > button` // clickable part of mode button
export const SIDECAR_MODE_BUTTON_SELECTED = (N: number, mode: string) =>
  `${_SIDECAR_MODE_BUTTON(N, mode)}.bx--tabs--scrollable__nav-item--selected`

// left nav sidecar
export const SIDECAR_NAV_COMMAND_LINKS = (N: number, link: string) =>
  `${SIDECAR(N)} .bx--side-nav__item .bx--side-nav__link.kui--nav-command-link[data-link="${link}"]`
export const SIDECAR_NAV_HREF_LINKS = (N: number, link: string) =>
  `${SIDECAR(N)} .bx--side-nav__item .bx--side-nav__link.kui--nav-href-link[data-link="${link}"]`
export const SIDECAR_MODE_BUTTONS_V2 = (N: number) => `${SIDECAR(N)} .bx--side-nav__menu .bx--side-nav__link` // all mode buttons in the left nav
export const SIDECAR_MODE_BUTTON_V2 = (N: number, mode: string) => `${SIDECAR_MODE_BUTTONS_V2(N)}[data-mode="${mode}"]` // specific mode button in the left nav
export const SIDECAR_MODE_BUTTON_SELECTED_V2 = (N: number, mode: string) =>
  `${SIDECAR_MODE_BUTTON_V2(N, mode)}.bx--side-nav__link--current`

export const SIDECAR_BACK_BUTTON = (N: number) =>
  `${SIDECAR_HEADER_NAVIGATION(N)} .kui--sidecar--titlebar-navigation--back`
export const SIDECAR_BACK_BUTTON_DISABLED = (N: number) =>
  `${SIDECAR_HEADER_NAVIGATION(N)} .disabled .kui--sidecar--titlebar-navigation--back`
export const SIDECAR_FORWARD_BUTTON = (N: number) =>
  `${SIDECAR_HEADER_NAVIGATION(N)} .kui--sidecar--titlebar-navigation--forward`
export const SIDECAR_FORWARD_BUTTON_DISABLED = (N: number) =>
  `${SIDECAR_HEADER_NAVIGATION(N)} .disabled .kui--sidecar--titlebar-navigation--forward`

export const SIDECAR_MAXIMIZE_BUTTON = (N: number) => `${SIDECAR(N)} .toggle-sidecar-maximization-button a` // maximize button in the bottom stripe
export const SIDECAR_CLOSE_BUTTON = (N: number) => `${SIDECAR(N)} .sidecar-bottom-stripe-close a` // close button in the bottom stripe
export const SIDECAR_RESUME_FROM_CLOSE_BUTTON = (N: number) => `${SIDECAR_BASE(N)} .sidecar-bottom-stripe-close a` // resume button in minimized mode
export const SIDECAR_FULLY_CLOSE_BUTTON = (N: number) => `${SIDECAR(N)} .sidecar-bottom-stripe-quit a` // fully close button in the bottom stripe
export const SIDECAR_FULLY_CLOSED = (N: number) => `${SIDECAR(N)} .kui--sidecar:not([data-visible])`

export const INVERTED_COLORS = '.kui--inverted-color-context'

/**
 * Tree
 *
 */
export const TREE = (N: number) => `${SIDECAR_TAB_CONTENT(N)} .kui--treeview`
export const TREE_VIEWS_AND_BODY = (N: number) => `${TREE(N)} .kui--treeview-nav-and-body`
export const TREE_VIEWS = (N: number) => `${TREE_VIEWS_AND_BODY(N)} ul[role="tree"]`
export const _TREE_LIST = (id: string) => `li[id="${id}"]`
export const TREE_LIST = (N: number, id: string) => `${TREE_VIEWS(N)} ${_TREE_LIST(id)}`
export const TREE_LIST_EXPANDED = (N: number, id: string) => `${TREE_VIEWS(N)} ${_TREE_LIST(id)}[aria-expanded="true"]`
export const TREE_LIST_AS_BUTTON = (N: number, id: string) => `${TREE_LIST(N, id)} button.pf-c-tree-view__node`
export const TREE_LIST_AS_BUTTON_SELECTED = (N: number, id: string) => `${TREE_LIST_AS_BUTTON(N, id)}.pf-m-current`
export const TREE_LIST_IN_A_LIST = (N: number, id: string, parentId: string) =>
  `${TREE_LIST_EXPANDED(N, parentId)} ul[role="group"] ${_TREE_LIST}`

/**
 * Terminal splits
 *
 */
export const NEW_SPLIT_BUTTON = '#kui--split-terminal-button'
export const SPLITS = `${CURRENT_TAB} .kui--scrollback`
export const SPLIT_ID = 'data-scrollback-id'
export const SPLIT_N = (N: number, inverseColors = false) =>
  `${SPLITS}:nth-child(${N})` + (inverseColors ? INVERTED_COLORS : '')
export const SPLIT_N_FOCUS = (N: number) => `${SPLITS}:nth-child(${N}) ${current(_PROMPT_BLOCK)} ${_PROMPT}`
export const SPLIT_N_OUTPUT = (N: number) => `${SPLITS}:nth-child(${N}) .repl-output`
export const CURRENT_PROMPT_BLOCK_FOR_SPLIT = (splitIndex: number) => `${SPLIT_N(splitIndex)} ${current(_PROMPT_BLOCK)}`
export const CURRENT_PROMPT_FOR_SPLIT = (splitIndex: number) =>
  `${CURRENT_PROMPT_BLOCK_FOR_SPLIT(splitIndex)} ${_PROMPT}`
export const PROMPT_BLOCK_FOR_SPLIT = (splitIndex: number) => `${SPLIT_N(splitIndex)} ${_PROMPT_BLOCK}`
export const PROMPT_BLOCK_N_FOR_SPLIT = (N: number, splitIndex: number) =>
  `${SPLIT_N(splitIndex)} ${_PROMPT_BLOCK_N(N)}`
export const PROMPT_N_FOR_SPLIT = (N: number, splitIndex: number) =>
  `${PROMPT_BLOCK_N_FOR_SPLIT(N, splitIndex)} ${_PROMPT}`
export const PROMPT_BLOCK_LAST_FOR_SPLIT = (splitIndex = 1) => `${PROMPT_BLOCK_FOR_SPLIT(splitIndex)}:nth-last-child(2)`
export const OUTPUT_LAST_FOR_SPLIT = (splitIndex: number) => `${PROMPT_BLOCK_LAST_FOR_SPLIT(splitIndex)} .repl-result`

/**
 * Terminal card
 *
 */
export const TERMINAL_CARD = `.kui--card`
export const TERMINAL_CARD_TITLE = `${TERMINAL_CARD} .kui--card-title`
export const TERMINAL_CARD_BODY = `${TERMINAL_CARD} .kui--card-body`

export const PROMPT_N = (N: number, splitIndex = 1) => `${PROMPT_BLOCK_N_FOR_SPLIT(N, splitIndex)} ${_PROMPT}`
export const OUTPUT_N = (N: number, splitIndex = 1) => `${PROMPT_BLOCK_N_FOR_SPLIT(N, splitIndex)} .repl-result`
export const OUTPUT_N_STREAMING = (N: number, splitIndex = 1) =>
  `${PROMPT_BLOCK_N_FOR_SPLIT(N, splitIndex)} [data-stream]`
export const OUTPUT_N_PTY = (N: number) => OUTPUT_N(N)
export const PROMPT_BLOCK_LAST = `${PROMPT_BLOCK}:nth-last-child(2)`
export const EXPERIMENTAL_PROMPT_BLOCK_TAG = `${PROMPT_BLOCK_LAST} .kui--repl-block-experimental-tag`
export const PROMPT_BLOCK_FINAL = `${PROMPT_BLOCK}:nth-last-child(1)`
export const OVERFLOW_MENU = '.kui--repl-block-right-element.kui--toolbar-button-with-icon'
export const PROMPT_BLOCK_MENU = (N: number) => `${PROMPT_BLOCK_N(N)} ${OVERFLOW_MENU}`
export const BLOCK_REMOVE_BUTTON = (N: number) => `${PROMPT_BLOCK_N(N)} .kui--block-action [icon="WindowClose"]`
export const BLOCK_UP_BUTTON = (N: number) => `${PROMPT_BLOCK_N(N)} .kui--block-action [icon="MoveUp"]`
export const BLOCK_DOWN_BUTTON = (N: number) => `${PROMPT_BLOCK_N(N)} .kui--block-action [icon="MoveDown"]`
export const COMMAND_COPY_BUTTON = (N: number) => `${PROMPT_BLOCK_N(N)} .kui--block-action [icon="Copy"]`
export const COMMAND_COPY_DONE_BUTTON = (N: number) => `${PROMPT_BLOCK_N(N)} .kui--block-action [icon="Checkmark"]`
export const COMMAND_RERUN_BUTTON = (N: number) => `${PROMPT_BLOCK_N(N)} .kui--block-action [icon="Retry"]`
export const PROMPT_LAST = `${PROMPT_BLOCK_LAST} .repl-input-element`
export const PROMPT_FINAL = `${PROMPT_BLOCK_FINAL} .repl-input-element`
export const OUTPUT_LAST = `${PROMPT_BLOCK_LAST} .repl-result`
export const OUTPUT_LAST_STREAMING = `${PROMPT_BLOCK_LAST} [data-stream]`
export const OUTPUT_LAST_PTY = OUTPUT_LAST
export const LIST_RESULTS_N = (N: number, splitIndex = 1) =>
  `${PROMPT_BLOCK_N_FOR_SPLIT(N, splitIndex)} .repl-result tbody tr`

// this needs the > bits to avoid selecting tables inside of inline sidecar responses
export const LIST_RESULTS_BY_NAME_N = (N: number, splitIndex = 1) =>
  `${PROMPT_BLOCK_N_FOR_SPLIT(
    N,
    splitIndex
  )} .repl-result > .kui--data-table-wrapper > .kui--screenshotable > ${TERMINAL_CARD} [data-name]`

export const LIST_RESULT_BY_N_FOR_NAME = (N: number, name: string, splitIndex = 1) =>
  `${LIST_RESULTS_N(N, splitIndex)}[data-name="${name}"]`
export const TABLE_HEADER_CELL = (cellKey: string) => `thead tr th button[data-key="${cellKey}"]`
export const TABLE_CELL = (rowKey: string, cellKey: string) => `tbody [data-name="${rowKey}"] [data-key="${cellKey}"]`
export const TABLE_SHOW_AS_GRID = (N: number) => `${OUTPUT_N(N)} .kui--toolbar-button-as-grid`
export const TABLE_SHOW_AS_SEQUENCE = (N: number) => `${OUTPUT_N(N)} .kui--toolbar-button-as-sequence`
export const TABLE_SHOW_AS_LIST = (N: number) => `${OUTPUT_N(N)} .kui--toolbar-button-as-list`
export const TABLE_PAGINATION_FORWARD = (N: number) =>
  `${OUTPUT_N(N)} .kui--data-table-toolbar-pagination button.bx--pagination__button--forward`
export const TABLE_PAGINATION_BACKWARD = (N: number) =>
  `${OUTPUT_N(N)} .kui--data-table-toolbar-pagination button.bx--pagination__button--backward`
export const TABLE_FOOTER = (N: number) => `${OUTPUT_N(N)} .kui--data-table-footer-messages`
export const TABLE_FOOTER_MESSAGE = (N: number, M: number) =>
  `${TABLE_FOOTER(N)} .kui--data-table-footer-message:nth-child(${M})`
export const TABLE_FOOTER_MESSAGE_LINK = (N: number, M: number) => `${TABLE_FOOTER_MESSAGE(N, M)} a`

const _TABLE_AS_GRID = '.kui--data-table-as-grid'
export const TABLE_AS_GRID = (N: number) => `${OUTPUT_N(N)} ${_TABLE_AS_GRID}`
export const TABLE_AS_GRID_CELL = (N: number, name: string) =>
  `${TABLE_AS_GRID(N)} [data-tag="badge"][data-entity-name="${name}"]`
export const TABLE_AS_GRID_CELL_RED = (N: number, name: string) => `${TABLE_AS_GRID_CELL(N, name)} .red-background`
export const TABLE_AS_GRID_CELL_GREEN = (N: number, name: string) => `${TABLE_AS_GRID_CELL(N, name)} .green-background`
export const TABLE_AS_LIST = (N: number) => `${OUTPUT_N(N)} .bx--data-table:not(.kui--data-table-as-grid)`

export const TABLE_AS_SEQUENCE = (N: number) => `${OUTPUT_N(N)} .kui--data-table-as-sequence`
export const TABLE_AS_SEQUENCE_BAR = (N: number) => `${TABLE_AS_SEQUENCE(N)} .kui--bar`
export const TABLE_AS_SEQUENCE_BAR_WIDTH = (N: number, width: string) =>
  `${TABLE_AS_SEQUENCE(N)} .kui--bar[data-width="${width}]`

const _TABLE_TITLE = `.kui--data-table-title`
export const TABLE_TITLE = (N: number) => `${OUTPUT_N(N)} ${_TABLE_TITLE}`

export const TABLE_TITLE_SECONDARY = (N: number) => `${OUTPUT_N(N)} .kui--secondary-breadcrumb:first-child`
export const TABLE_TITLE_NROWS = (N: number) => `${OUTPUT_N(N)} .kui--nrows-breadcrumb`
export const BY_NAME = (name: string) => `tbody [data-name="${name}"]`
export const LIST_RESULT_FIRST = 'tbody tr:first-child .clickable'
export const LIST_RESULT_BY_N_AND_NAME = (N: number, name: string, splitIndex = 1) =>
  `${LIST_RESULT_BY_N_FOR_NAME(N, name, splitIndex)} .entity-name`
export const OK_N = (N: number, splitIndex = 1) => `${PROMPT_BLOCK_N_FOR_SPLIT(N, splitIndex)} .repl-output .ok`
export const xtermRows = (N: number) => `${PROMPT_BLOCK_N(N)} .xterm-container .xterm-rows`

export const WATCHER_N = (N: number) => `.kui--card.kui--card-${N}`

export const WATCHER_N_GRID_CELL = (N: number, name: string) =>
  `${WATCHER_N(N)} .kui--sub-card ${_TABLE_AS_GRID} [data-tag="badge"][data-entity-name="${name}"]`
export const WATCHER_N_GRID_CELL_ONLINE = (N: number, name: string) =>
  `${WATCHER_N_GRID_CELL(N, name)} .green-background`
export const WATCHER_N_GRID_CELL_OFFLINE = (N: number, name: string) =>
  `${WATCHER_N_GRID_CELL(N, name)} .red-background`
export const WATCHER_N_GRID_CELL_PENDING = (N: number, name: string) =>
  `${WATCHER_N_GRID_CELL(N, name)} .yello-background`

export const WATCHER_N_TITLE = (N: number) => `${WATCHER_N(N)} ${_TABLE_TITLE}`
export const WATCHER_N_DROPDOWN = (N: number) => `${WATCHER_N(N)} .pf-c-dropdown button.pf-c-dropdown__toggle`
export const WATCHER_N_DROPDOWN_ITEM = (N: number, label: string) =>
  `${WATCHER_N(N)} .pf-c-dropdown button.pf-c-dropdown__menu-item[data-mode="${label}"]`
export const WATCHER_N_CLOSE = (N: number) => WATCHER_N_DROPDOWN_ITEM(N, 'Stop watching')
export const WATCHER_N_SHOW_AS_TABLE = (N: number) => WATCHER_N_DROPDOWN_ITEM(N, 'Show as table')

export const CURRENT_GRID_FOR_SPLIT = (N: number) => `${CURRENT_PROMPT_BLOCK_FOR_SPLIT(N)} ${_PROMPT} ${_TABLE_AS_GRID}`
export const CURRENT_GRID_BY_NAME_FOR_SPLIT = (N: number, name: string) =>
  `${CURRENT_PROMPT_BLOCK_FOR_SPLIT(N)} ${_TABLE_AS_GRID} [data-tag="badge"][data-entity-name="${name}"]`
export const CURRENT_GRID_ONLINE_FOR_SPLIT = (N: number, name: string) =>
  `${CURRENT_GRID_BY_NAME_FOR_SPLIT(N, name)} .green-background`
export const CURRENT_GRID_OFFLINE_FOR_SPLIT = (N: number, name: string) =>
  `${CURRENT_GRID_BY_NAME_FOR_SPLIT(N, name)} .red-background`

export const SPLIT_N_MENU = (N: number) => `${SPLIT_N(N)} ${OVERFLOW_MENU}`
export const WATCHER_CLOSE_BUTTON = (N: number) => `${SPLIT_N(N)} .kui--pinned-close-button`
export const BLOCK_CLOSE_BUTTON = `${OVERFLOW_MENU} button[data-mode="Close watcher"]`
export const BLOCK_UNPIN_BUTTON = `${OVERFLOW_MENU} button[data-mode="Show as table in terminal"]`

/** xterm */
export const ALT_BUFFER_N = (N: number) => `${CURRENT_TAB} .kui--scrollback:nth-child(${N}).xterm-alt-buffer-mode`
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const NOSPLIT_ALT_BUFFER_N = (N: number) => `${CURRENT_TAB}.xterm-alt-buffer-mode`

/** Status Stripe widgets */
const STATUS_STRIPE = '#kui--status-stripe'
export const STATUS_STRIPE_TYPE = (type: 'default' | 'blue') => `${STATUS_STRIPE}[data-type="${type}"]`
export const STATUS_STRIPE_MESSAGE = `${STATUS_STRIPE} .kui--status-stripe-message-element`
export const STATUS_STRIPE_WIDGET = (which: string) => `${STATUS_STRIPE} .${which}`
export const STATUS_STRIPE_WIDGET_WITH_ATTR = (which: string, key: string, value: string) =>
  `${STATUS_STRIPE_WIDGET(which)}[data-${key}="${value}"]`
export const STATUS_STRIPE_WIDGET_LABEL = (which: string) => `${STATUS_STRIPE_WIDGET(which)} .kui--status-stripe-text`
export const STATUS_STRIPE_WIDGET_ICON_WITH_ATTR = (which: string, key: string, value: string) =>
  `${STATUS_STRIPE_WIDGET_WITH_ATTR(which, key, value)} .kui--status-stripe-icon`
export const STATUS_STRIPE_WIDGET_LABEL_WITH_ATTR = (which: string, key: string, value: string) =>
  `${STATUS_STRIPE_WIDGET_WITH_ATTR(which, key, value)} .kui--status-stripe-text`

/** Selectors of radio button (new RadioTable-based) */
export const RADIO_BUTTON = '.kui--radio-table-body .kui--radio-table-row'
export const RADIO_BUTTON_BY_NAME = (name: string) => `${RADIO_BUTTON}[data-name="${name}"]`
export const RADIO_BUTTON_IS_SELECTED = '[data-is-selected]'
export const RADIO_BUTTON_SELECTED = `${RADIO_BUTTON}${RADIO_BUTTON_IS_SELECTED}`

/** SourceRef */
export const SOURCE_REF_N = (N: number, splitIndex = 1) => `${PROMPT_BLOCK_N_FOR_SPLIT(N, splitIndex)} .kui--accordion`
export const SOURCE_REF_TOGGLE_N = (N: number, expanded = false, splitIndex = 1) =>
  `${SOURCE_REF_N(N, splitIndex)} .kui--accordion-item button[aria-expanded=${expanded.toString()}]`

export const COMMENTARY_EDITOR_BUTTON_CANCEL =
  '.kui--commentary-editor-toolbar .kui--commentary-button.kui--commentary-cancel-button'
export const COMMENTARY_EDITOR_BUTTON_DONE =
  '.kui--commentary-editor-toolbar .kui--commentary-button.kui--commentary-done-button'
export const COMMENTARY_EDITOR_BUTTON_REVERT =
  '.kui--commentary-editor-toolbar .kui--commentary-button.kui--commentary-revert-button'
export const COMMENTARY_EDITOR = '.kui--commentary .kui--source-ref-editor'

export const SIDECAR_LAST = `${OUTPUT_LAST} .kui--sidecar.visible:not(.minimized)`
export const SIDECAR_TOOLBAR_LAST = `${SIDECAR_LAST} .bx--tab-content:not([hidden]) .sidecar-bottom-stripe-toolbar`
export const SIDECAR_TOOLBAR_TEXT_LAST = (type: string) =>
  `${SIDECAR_TOOLBAR_LAST} .sidecar-toolbar-text[data-type="${type}"] .sidecar-toolbar-text-content`
export const SIDECAR_TOOLBAR_BUTTON_LAST = (mode: string) =>
  `${SIDECAR_TOOLBAR_LAST} .sidecar-bottom-stripe-mode-bits .sidecar-bottom-stripe-button[data-mode="${mode}"] [role="tab"]`
