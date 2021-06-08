#!/usr/bin/env node
/**
 * Copyright (C) 2021 Anthony Weathersby - Lantern Development Server
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * Contact: acweathersby.codes@gmail.com
 */

import URL from "@candlelib/url";
import { getPackageJsonObject, getProcessArgs } from "@candlelib/paraffin";
import $404_dispatch from "./build/library/dispatchers/404_dispatch.js";
import candle_library_dispatch from "./build/library/dispatchers/candle_library_dispatch.js";
import cfw_favicon_dispatch from "./build/library/dispatchers/cfw_favicon_dispatch.js";
import compiled_wick_dispatch from "./build/library/dispatchers/compiled_wick_dispatch.js";
import filesystem_dispatch from "./build/library/dispatchers/filesystem_dispatch.js";
import poller_dispatch from "./build/library/dispatchers/poller_dispatch.js";
import lantern from "./build/library/lantern.js";


console.log(new URL(import.meta.url).path);
const
    { package: pkg } = await getPackageJsonObject(new URL(import.meta.url).path),
    HELP_MESSAGE = `

CANDLELIB::Lantern ${pkg.version}

A development server for CandleLibrary projects. 

[Options]

    Show help message: --help | -h | ?  
    
        Display this help message and exit. 
        Overrides other options.

    Port: --port -p < Short | random>

        Specify a port number for the server. Must be in the range 0 - 65836
        Alternatively, \`random\` can be specified to allow Lantern to choose 
        an available, random port number.

        If a port number or \`random\` is not specified, the Lantern will use
        the port number assigned to LANTERN_PORT environment variable. If if
        LANTERN_PORT has no value, then the default port 8080 or a random port
        number will be chosen.


`;


const args = getProcessArgs({
    port: true,
    p: "port",
    "help": false,
    "h": "help",
    "?": "help"
});

// Setup port number
async function getPortNumber() {

    const
        env_port = parseInt(process.env.LANTERN_PORT),
        arg_port = args?.port?.val,
        USE_RANDOM = arg_port == "random";

    if (USE_RANDOM)
        return await lantern.getUnusedPort();

    const candidates = [parseInt(arg_port), env_port, 8080];

    for (const candidate of candidates)
        if (typeof candidate == "number" && candidate > 0 && candidate < 65536)
            return candidate;
}

if (args.help) {
    console.log(HELP_MESSAGE);
    process.exit(0);
}

const server = await lantern({ port: await getPortNumber() });

server.addDispatch(
    cfw_favicon_dispatch,
    compiled_wick_dispatch,
    candle_library_dispatch,
    filesystem_dispatch,
    poller_dispatch,
    $404_dispatch
);
