import URL from "@candlelib/uri";
import { getPackageJsonObject } from "@candlelib/paraffin";

import http2 from "http2";

import mock_certificate from "./data/mock_certificate.js";
import $404_dispatch from "./dispatchers/404_dispatch.js";
import candle_library_dispatch from "./dispatchers/candle_library_dispatch.js";
import dispatcher from "./dispatchers/dispatch.js";
import poller_dispatch from "./dispatchers/poller_dispatch.js";
import compiled_wick_dispatch from "./dispatchers/compiled_wick_dispatch.js";
import filesystem_dispatch from "./dispatchers/filesystem_dispatch.js";
import ext_map from "./extension/extension_map.js";

import { HTTPS2ToolSet } from "./tool_set/http2_tool_set.js";
import { HTTPSToolSet } from "./tool_set/http_tool_set.js";
import LanternToolsBase from "./tool_set/tools.js";

import { LanternConstructorOptions } from "./types/constructor_options";
import { LanternServer } from "./types/lantern_server";
import { RequestData } from "./types/request_data";
import { Dispatcher, DispatchKey, ToolSet } from "./types/types.js";

import { getUnusedPort } from "./utils/get_unused_port.js";
import { LanternLoggingOutput, setLogger, LogQueue } from "./utils/log.js";


export {
    poller_dispatch,
    candle_library_dispatch,
    $404_dispatch,
    compiled_wick_dispatch,
    filesystem_dispatch
};
export { Dispatcher, DispatchKey, LanternServer, ext_map };

/**
 * Lantern Server Constructor
 */
export interface LanternConstructor {
    /**
     * Starts the server
     */
    (config_options: LanternConstructorOptions, logger?: LanternLoggingOutput):
        Promise<LanternServer<http2.Http2Server> | LanternServer<http2.Http2SecureServer>>;

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

    /**
     * A logger function that outputs nothing
     */
    null_logger: (...str: string[]) => void;
};

const lantern: LanternConstructor = Object.assign(async function (
    config_options: LanternConstructorOptions,
    logger?: LanternLoggingOutput
): Promise<LanternServer<http2.Http2Server> | LanternServer<http2.Http2SecureServer>> {


    await URL.server();

    const { package: _pkg, FOUND } = await getPackageJsonObject();

    setLogger(logger);

    const
        options: LanternConstructorOptions = Object.assign(
            <LanternConstructorOptions>{
                port: await getUnusedPort(),
                type: "http",
                host: "localhost",
                secure: null,
                server_name: "Local HTTP Server",
                log: console.log
            },
            (FOUND && _pkg["@lantern"]) || {},
            config_options
        ),

        {
            type = "http"
        } = options,

        tool_set: typeof LanternToolsBase = {
            http: HTTPSToolSet,
            http2: HTTPS2ToolSet,
            https: HTTPSToolSet,
            http2s: HTTPS2ToolSet
        }[type],

        responseFunction = async (tool_set: ToolSet, request_data: RequestData, log_queue: LogQueue, DispatchMap, DispatchDefaultMap) => {
            try {
                if (!(await dispatcher(tool_set, request_data, log_queue, DispatchMap, ext_map)))
                    dispatcher.default(404, tool_set, request_data, log_queue, DispatchDefaultMap, ext_map);
            } catch (e) {

                if (e.code == "EACCES") {
                    console.log(`
                        Port ${options.port} could not be connected to.
                    `);
                }

                log_queue.createLocalLog("Error").sub_error(e).delete();

                dispatcher.default(404, tool_set, request_data, log_queue, DispatchDefaultMap, ext_map);
            }
        };

    return tool_set.createServer(options, responseFunction);
}, {
    mock_certificate,
    getUnusedPort,
    null_logger: _ => _
});


export default lantern;


