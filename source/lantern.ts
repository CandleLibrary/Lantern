import http from "http";
import https from "https";
import dispatcher from "./dispatcher.js";
import { AddDispatch } from "./dispatcher.js";
import ext_map from "./extension_map.js";
import { addKey } from "./extension_map.js";
import log from "./log.js";

import poller_dispatch from "./dispatchers/poller_dispatch.js";
import candlefw_dispatch from "./dispatchers/candlefw_dispatch.js";
import $404_dispatch from "./dispatchers/404_dispatch.js";
import { LanternServer, Dispatcher, DispatchKey } from "./types.js";
import URL from "@candlefw/url";

export {
    poller_dispatch,
    candlefw_dispatch,
    $404_dispatch
};

export default async function lantern(
    config: {
        port?: number;
        server_name?: string,
        secure?: {
            key: string | URL,
            cert: string | URL;
        };
    } = {},
    CLI_RUN = false,

): Promise<LanternServer<http.Server> | LanternServer<http.Server>> {

    await URL.polyfill();

    /* Routes HTTP request depending on active dispatch modules. */
    const
        DispatchMap = new Map(),
        DispatchDefaultMap = new Map();

    //Using port 8080 by default
    config.port = config.port || 8080;

    log.verbose(`${config.server_name || "Lantern"} set to listen on port ${config.port}`);

    let lantern: LanternServer<http.Server> | LanternServer<http.Server>;

    const responseFunction = async (request, response) => {

        const meta = { authorized: false };

        try {
            if (!(await dispatcher(request, response, meta, DispatchMap, ext_map))) {
                dispatcher.default(404, request, response, meta, DispatchDefaultMap, ext_map);
            }
        } catch (e) {
            log.error(e);
            dispatcher.default(404, request, response, meta, DispatchDefaultMap, ext_map);
        }
    };

    if (config.secure) {

        const { key, cert } = config.secure,

            options = {
                key: key instanceof URL ? await key.fetchText() : key,
                cert: cert instanceof URL ? await cert.fetchText() : cert,
            };

        const server = https.createServer(options, responseFunction);

        server.listen(config.port, () => { });

        lantern = <LanternServer<https.Server>>{
            ext: ext_map,
            server,
            addExtension: (key_name, mime_type) => addKey(key_name, ext_map),
            addDispatch: (...v) => AddDispatch(DispatchMap, DispatchDefaultMap, ...v),
            close: server.close.bind(server)
        };

    } else {

        const server = http.createServer(responseFunction);

        server.listen(config.port, () => { });

        lantern = <LanternServer<http.Server>>{
            ext: ext_map,
            server,
            addExtension: (key_name, mime_type) => addKey(key_name, ext_map),
            addDispatch: (...v) => AddDispatch(DispatchMap, DispatchDefaultMap, ...v),
            close: server.close.bind(server)
        };
    }

    lantern.addDispatch.bind(lantern);

    return lantern;
};

export { Dispatcher, DispatchKey };
