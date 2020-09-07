import URL from "@candlefw/url";

import http2 from "http2";

import dispatcher from "./dispatcher.js";
import { AddDispatch } from "./dispatcher.js";
import ext_map from "./extension_map.js";
import { addKey } from "./extension_map.js";
import log, { setLogger, LanternLoggingOutput } from "./log.js";

import poller_dispatch from "./dispatchers/poller_dispatch.js";
import candlefw_dispatch from "./dispatchers/candlefw_dispatch.js";
import $404_dispatch from "./dispatchers/404_dispatch.js";
import { LanternServer, Dispatcher, DispatchKey } from "./types.js";


export {
    poller_dispatch,
    candlefw_dispatch,
    $404_dispatch
};

export default async function lantern(
    config_options: {
        port?: number,
        host?: string,
        server_name?: string,
        secure?: {
            key: string | URL,
            cert: string | URL;
        };
    } = {},
    logger?: LanternLoggingOutput

): Promise<LanternServer<http2.Http2Server> | LanternServer<http2.Http2Server>> {

    setLogger(logger);

    const {
        port = 8080,
        host = "localhost",
        server_name = "Lantern",
        secure = null/* {
            key: "",
            cert: "",
        } */
    } = config_options;

    await URL.server();

    /* Routes HTTP request depending on active dispatch modules. */
    const
        DispatchMap = new Map(),
        DispatchDefaultMap = new Map();

    log.verbose(`${server_name}: Configured to listen on interface ${host}:${port} `);

    let lantern: LanternServer<http2.Http2Server> | LanternServer<http2.Http2SecureServer>;

    const responseFunction = async (stream, headers) => {

        try {
            if (!(await dispatcher(stream, headers, DispatchMap, ext_map)))
                dispatcher.default(404, stream, headers, DispatchDefaultMap, ext_map);
        } catch (e) {
            log.error(e);
            dispatcher.default(404, stream, headers, DispatchDefaultMap, ext_map);
        }
    };

    if (secure) {

        const { key, cert } = secure,

            options = {
                key: key instanceof URL ? await key.fetchText() : key,
                cert: cert instanceof URL ? await cert.fetchText() : cert,
            };

        const server = http2.createSecureServer(options);

        server.on("error", e => { log.error(e); });

        server.on("stream", responseFunction);

        server.listen(port, host, () => { });

        lantern = <LanternServer<http2.Http2SecureServer>>{
            ext: ext_map,
            server,
            addExtension: (key_name, mime_type) => addKey(key_name, ext_map),
            addDispatch: (...v) => AddDispatch(DispatchMap, DispatchDefaultMap, ...v),
            close: server.close.bind(server)
        };

        log.verbose(`${server_name}: Using HTTPS/TLS secure protocol.`);

    } else {

        const server = http2.createServer();

        server.on("error", e => { log.error(e); });

        server.on("stream", responseFunction);

        server.listen(port, host, () => { });

        lantern = <LanternServer<http2.Http2Server>>{
            ext: ext_map,
            server,
            addExtension: (key_name, mime_type) => addKey(key_name, ext_map),
            addDispatch: (...v) => AddDispatch(DispatchMap, DispatchDefaultMap, ...v),
            close: server.close.bind(server)
        };

        log.verbose(`${server_name}: Using unsecured HTTP transport`);
    }

    lantern.addDispatch.bind(lantern);

    return lantern;
};

export { Dispatcher, DispatchKey };
