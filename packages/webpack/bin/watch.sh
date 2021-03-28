#!/usr/bin/env bash

#
# Copyright 2019 The Kubernetes Authors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

set -e
set -o pipefail

SCRIPTDIR=$(cd $(dirname "$0") && pwd)
export CLIENT_HOME=$(cd "$SCRIPTDIR"/../../ && pwd)

if [ -d "$SCRIPTDIR"/../@kui-shell ]; then
    # normally, this is in node_modules/.bin
    MODULE_HOME=$(cd "$SCRIPTDIR"/../@kui-shell && pwd)
else
    # except e.g. on windows where symlinks don't work; then this is
    # in node_modules/@kui-shell/webpack/bin
    MODULE_HOME=$(cd "$SCRIPTDIR"/../.. && pwd)
fi
BUILDER_HOME="$MODULE_HOME"/builder

CONFIG="$MODULE_HOME"/webpack/webpack.config.js
HEADLESS_CONFIG="$MODULE_HOME"/webpack/headless-webpack.config.js

THEME="${MODULE_HOME}"/client

pushd "$CLIENT_HOME"
  rm -rf dist/webpack
popd

if [ -n "$OPEN" ]; then
    OPEN="--open"
else
    # we use this to tell the dev server to touch a lock file when it is
    # done; below, we will poll until that is the case
    export LOCKFILE=/tmp/kui-build-lock.${PORT_OFFSET-0}
    rm -f $LOCKFILE
fi

npx --no-install webpack serve --progress --config "$CONFIG" $OPEN &

if [ -n "$KUI_HEADLESS_WEBPACK" ]; then
    npx --no-install webpack watch --progress --config "$HEADLESS_CONFIG" $OPEN &
fi

if [ -n "$LOCKFILE" ]; then
    # don't exit until the dev server is ready
    until [ -f $LOCKFILE ]; do sleep 1; done
    rm -f $LOCKFILE
fi

if [ "$WATCH_ARGS" = "open" ]; then
    npm run open
fi
