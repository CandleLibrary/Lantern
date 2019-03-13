import http from "http";
import path from "path";
import fs from "fs";
import dispatcher from "./dispatcher.mjs";
import { AddDispatch } from "./dispatcher.mjs";
import ext_map from "./extension_map.mjs";
import log from "./log.mjs";

const script_dir = path.join(new URL(
    import.meta.url).pathname, "../..");
const fsp = fs.promises;

export default function lier(config = {}) {

    //Using port 8080 by default
    config.port = config.port || 8080;

    log.verbose(`Lier set to listen on port ${config.port}`);

    const server = http.createServer(async (request, response) => {

        const meta = { authorized: false };

        try {
            if (!(await dispatcher(request, response, meta))) {
                dispatcher.default(404, request, response, meta)
            }
        } catch (e) {
            log.log(e);
            dispatcher.default(404, request, response, meta)
        }
    })

    server.listen(config.port, err => {
        if (err) log.error(err);
    })

    return lier;
}

lier.addDispatch = AddDispatch.bind(lier);
lier.ext = ext_map;

/** Defualt responses **/

async function LoadData() {
    let $404 = (await import("./data/404.data.mjs")).default;
    let $radiate = await fsp.readFile(path.join(script_dir, "./node_modules/@candlefw/radiate/build/radiate.js"), "utf8");



    lier.addDispatch({
        name: 404,
        MIME: "text/html",
        respond: $404,
        keys: { ext: 0xFFFFFFFF, dir: "*" }
    }, {
        name: "CFW Builtins",
        respond: (tools) => {
            switch (tools.fn) {
                case "radiate":
                	tools.setMIME("js");
                    return tools.sendString($radiate);
            }

            return false;
        },
        keys: { ext: 0x1, dir: "/cfw" }
    })
}

LoadData();
