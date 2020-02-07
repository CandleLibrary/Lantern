import http from "http";
import path from "path";
import dispatcher from "./dispatcher.mjs";
import { AddDispatch } from "./dispatcher.mjs";
import ext_map from "./extension_map.mjs";
import { addKey } from "./extension_map.mjs";
import log from "./log.mjs";
import resolve from "resolve";

export default function lantern(config = {}, CLI_RUN = false) {
    /* Routes HTTP request depending on active dispatch modules. */
    const 
        DispatchMap = new Map(),
        DispatchDefaultMap = new Map();

    //Using port 8080 by default
    config.port = config.port || 8080;

    log.verbose(`${config.server_name || "Lantern"} set to listen on port ${config.port}`);

    const server = http.createServer(async (request, response) => {

        const meta = { authorized: false };

        try {
            if (!(await dispatcher(request, response, meta, DispatchMap, ext_map))) {
                dispatcher.default(404, request, response, meta, DispatchDefaultMap, ext_map)
            }
        } catch (e) {
            log.error(e);
            dispatcher.default(404, request, response, meta, DispatchDefaultMap, ext_map)
        }
    })

    server.listen(config.port, err => {
        if (err) log.error(err);
    })

    const lantern = {}

    lantern.server = server;

    const ad = AddDispatch.bind(lantern);

    lantern.addExtension = (key_name) => addKey(key_name, ext_map)
    lantern.addDispatch = (...v) => ad(DispatchMap, DispatchDefaultMap, ...v)

    lantern.ext = ext_map
    lantern.close = server.close.bind(server);

    return lantern;
}