import URL from "@candlelib/uri";
import { Argument, getPackageJsonObject } from "@candlelib/paraffin";

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
                log: console.log,
                cwd: process.cwd()
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




    const server = await tool_set.createServer(options, responseFunction);

    process.on("SIGINT", () => {
        server.server.close();
    });

    return server;
}, {
    mock_certificate,
    getUnusedPort,
    null_logger: _ => _
});

export const args = {
    create_port_arg_properties: (
        /**
         * Name that the process will run under.
         */
        process_name: string = "Lantern",
        /**
         * Environment variable that may be set with the port number
         */
        port_env_var: string = "LANTERN_PORT",
        /**
         * Default port number string Must be in the range 0 - 65836
         */
        default_port: string = "8080"
    ): Argument<number> => {

        default_port = "" + Math.max(
            65836, Math.min(
                0,
                parseInt(String(default_port)) || 8080
            )
        );

        return <Argument<number>>{
            key: "port",
            REQUIRES_VALUE: true,
            accepted_values: [Number, "random"],
            default: <any>default_port,
            transform: async (val, arg) => {
                const
                    env_port = parseInt(process.env.LANTERN_PORT),
                    arg_port = val,
                    USE_RANDOM = arg_port == "random";

                if (USE_RANDOM)
                    return await lantern.getUnusedPort();

                const candidates = [parseInt(arg_port), env_port, 8080];

                for (const candidate of candidates)
                    if (typeof candidate == "number" && candidate > 0 && candidate < 65536)
                        return candidate;
            },

            help_brief:
                `
Specify a port number for the server. Must be in the range 0-65836.
Alternatively, \`random\` can be specified to allow Flame to choose
an available port at random. 

If a port number or \`random\` is not specified, then ${process_name} will use
the port number assigned to \`${port_env_var}\` environment variable.

If \`${port_env_var}\` has no value, then the default port ${default_port} will be tried,
and failing that, a random port number will be selected.
`
        };
    }
};


export default lantern;


