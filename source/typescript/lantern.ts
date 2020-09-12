import URL from "@candlefw/url";

import http2 from "http2";
import http from "http";

import dispatcher from "./dispatcher.js";
import { AddDispatch } from "./dispatcher.js";
import ext_map from "./extension_map.js";
import { addKey } from "./extension_map.js";
import log, { setLogger, LanternLoggingOutput } from "./log.js";

import poller_dispatch from "./dispatchers/poller_dispatch.js";
import candlefw_dispatch from "./dispatchers/candlefw_dispatch.js";
import $404_dispatch from "./dispatchers/404_dispatch.js";
import { LanternServer, Dispatcher, DispatchKey } from "./types.js";

import mock_certificate from "./data/mock_certificate.js";


export {
    poller_dispatch,
    candlefw_dispatch,
    $404_dispatch
};

interface LanternConstructorOptions {
    /**
     * Network port
     */
    port?: number,
    /**
     * Host name or IP address to assign the server to
     */
    host?: string,
    /**
     * Human friendly name for the server
     */
    server_name?: string,

    /**
     * A key and cert string pair for HTTPS2 secure 
     * transport. Either can be a string value
     * or path to a file with the appropriate information
     */
    secure?: {
        key: string | URL,
        cert: string | URL;
    };
}
/**
 * Lantern Server Constructor
 */
export interface LanternConstructor {
    /**
     * Starts the server
     */
    (config_options: LanternConstructorOptions, logger?: LanternLoggingOutput):
        Promise<LanternServer<http2.Http2Server> | LanternServer<http2.Http2Server>>;

    /**
     * A self-signed TSL RSA certificate and key pair for
     * use in local testing / development servers.
     */
    mock_certificate: typeof mock_certificate;

    /**
     * Retrieve an available network port or return `-1`.
     * 
     * Ports are within the range 49152 and 65535.
     */
    getUnusedPort: (max_attempts?: number, cb?) => Promise<number>;
};
let temp_lantern_ref = null;

async function getUnusedPort(max_attempts: number = 10, cb?): Promise<number> {

    if (!cb)
        return new Promise(_ => {
            getUnusedPort(max_attempts, _);
        });

    const net = (await import("net")).default;

    if (max_attempts == 0) cb(-1);

    const
        min = 49152, max = 65535,
        port = min + Math.round(Math.random() * (max - min)),
        server = http.createServer();


    server.on("error", async _ => {
        cb(-1);
        server.close();
        getUnusedPort(max_attempts - 1, cb);
    });

    server.on("listening", _ => {
        server.close(() => {
            cb(port);
        });
    });

    server.listen(port, "127.0.0.1");
}

const lantern: LanternConstructor = Object.assign((temp_lantern_ref = async function (
    config_options: {
        port?: number;
        host?: string,
        server_name?: string,
        secure?: {
            key: string | URL,
            cert: string | URL;
        };
    },
    logger?: LanternLoggingOutput

): Promise<LanternServer<http2.Http2Server> | LanternServer<http2.Http2Server>> {

    setLogger(logger);

    const {
        port = await temp_lantern_ref.getUnusedPort(),
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

    let lantern: LanternServer<http2.Http2Server> | LanternServer<http2.Http2SecureServer>, IS_OPEN = false;

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

        server.once("listening", _ => IS_OPEN = true);

        server.listen(port, host, () => { });

        lantern = <LanternServer<http2.Http2SecureServer>>{
            isOPEN: () => IS_OPEN,
            ext: ext_map,
            server,
            addExtension: (key_name, mime_type) => addKey(key_name, ext_map),
            addDispatch: (...v) => AddDispatch(DispatchMap, DispatchDefaultMap, ...v),
            close: async () => { server.close(); IS_OPEN = false; return true; }
        };

        log.verbose(`${server_name}: Using HTTPS/TLS secure protocol.`);

    } else {

        const server = http2.createServer();

        server.on("error", e => { log.error(e); });

        server.on("stream", responseFunction);

        server.once("listening", _ => IS_OPEN = true);

        server.listen(port, host, () => { });

        lantern = <LanternServer<http2.Http2Server>>{
            isOPEN: () => IS_OPEN,
            ext: ext_map,
            server,
            addExtension: (key_name, mime_type) => addKey(key_name, ext_map),
            addDispatch: (...v) => AddDispatch(DispatchMap, DispatchDefaultMap, ...v),
            close: async () => { server.close(); IS_OPEN = false; return true; }
        };

        log.verbose(`${server_name}: Using unsecured HTTP transport`);
    }

    lantern.addDispatch.bind(lantern);

    return lantern;
}), {
    mock_certificate,

    getUnusedPort
});


export default lantern;

export { Dispatcher, DispatchKey };
