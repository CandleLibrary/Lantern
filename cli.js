#!/usr/bin/env node

import lantern from "./build/library/lantern.js";
import poller_dispatch from "./build/library/dispatchers/poller_dispatch.js";
import candle_library_dispatch from "./build/library/dispatchers/candle_library_dispatch.js";
import compiled_wick_dispatch from "./build/library/dispatchers/compiled_wick_dispatch.js";
import $404_dispatch from "./build/library/dispatchers/404_dispatch.js";
import filesystem_dispatch from "./build/library/dispatchers/filesystem_dispatch.js";
import cfw_favicon_dispatch from "./build/library/dispatchers/cfw_favicon_dispatch.js";

const server = await lantern({ port: process.env.PORT || 8080 });

server.addDispatch(
    cfw_favicon_dispatch,
    compiled_wick_dispatch,
    candle_library_dispatch,
    filesystem_dispatch,
    poller_dispatch,
    $404_dispatch
);
