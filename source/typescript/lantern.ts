import URL from "@candlefw/url";
import { getPackageJsonObject } from "@candlefw/wax";

import http2 from "http2";
import { LanternConstructorOptions } from "./constructor_options";
import mock_certificate from "./data/mock_certificate.js";
import dispatcher from "./dispatcher.js";
import $404_dispatch from "./dispatchers/404_dispatch.js";
import candlefw_dispatch from "./dispatchers/candlefw_dispatch.js";
import poller_dispatch from "./dispatchers/poller_dispatch.js";
import ext_map from "./extension_map.js";
import { getUnusedPort } from "./getUnusedPort.js";
import log, { LanternLoggingOutput, setLogger } from "./log.js";
import LanternToolsBase, { HTTPS2ToolSet, HTTPSToolSet } from "./tools.js";
import { Dispatcher, DispatchKey, LanternServer, RequestData, ToolSet } from "./types.js";






export {
    poller_dispatch,
    candlefw_dispatch,
    $404_dispatch
};
export { Dispatcher, DispatchKey };

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

const lantern: LanternConstructor = Object.assign((temp_lantern_ref = async function (
    config_options: LanternConstructorOptions,
    logger?: LanternLoggingOutput
): Promise<LanternServer<http2.Http2Server> | LanternServer<http2.Http2Server>> {


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
                server_name: "Local HTTP Server"
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
        responseFunction = async (toolset: ToolSet, request_data: RequestData, DispatchMap, DispatchDefaultMap) => {
            try {
                if (!(await dispatcher(toolset, request_data, DispatchMap, ext_map)))
                    dispatcher.default(404, toolset, request_data, DispatchDefaultMap, ext_map);
            } catch (e) {
                log.error(e);
                dispatcher.default(404, toolset, request_data, DispatchDefaultMap, ext_map);
            }
        };

    return tool_set.createServer(options, responseFunction);
}), {
    mock_certificate,
    getUnusedPort
});


export default lantern;


