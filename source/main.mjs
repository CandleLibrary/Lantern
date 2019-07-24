import http from "http";
import path from "path";
import fs from "fs";
import dispatcher from "./dispatcher.mjs";
import { AddDispatch } from "./dispatcher.mjs";
import ext_map from "./extension_map.mjs";
import { addKey } from "./extension_map.mjs";
import log from "./log.mjs";
import resolve from "resolve";

const DEV_MODE = true;
const script_dir = path.join(path.resolve("."), "./node_modules");

/*path.join(new URL(
    import.meta.url).pathname, "../..");*/
const fsp = fs.promises;

export default function lantern(config = {}, CLI_RUN = false) {

    //Using port 8080 by default
    config.port = config.port || 8080;
    log.verbose(`${config.server_name || "Lantern"} set to listen on port ${config.port}`);

    const server = http.createServer(async (request, response) => {

        const meta = { authorized: false };

        try {
            if (!(await dispatcher(request, response, meta))) {
                dispatcher.default(404, request, response, meta)
            }
        } catch (e) {
            log.error(e);
            dispatcher.default(404, request, response, meta)
        }
    })

    server.listen(config.port, err => {
        if (err) log.error(err);
    })

    loadData(CLI_RUN)

    return lantern;
}

lantern.addExtensionKey = addKey.bind(lantern);
lantern.addDispatch = AddDispatch.bind(lantern);
lantern.ext = ext_map;

async function LoadData() {

    let CFW_NODE_DIR = CLI_RUN 
        ? path.resolve(import.meta.url.replace(process.platform == "win32" ? /file\:\/\/\// : /file\:\/\//g, ""), "../../node_modules/@candlefw")
        : path.resolve(import.meta.url.replace(process.platform == "win32" ? /file\:\/\/\// : /file\:\/\//g, ""), "../../../")

    /** Defualt responses **/
    let $404, $radiate, $wick;

    if (DEV_MODE) {
        /** DEV MODE FORCES ACTIVE RELOADING OF ALL DEFAULT RESOURCES **/
        lantern.addDispatch({
            name: 404,
            MIME: "text/html",
            respond: (await import("./data/404.data.mjs")).default,
            keys: { ext: 0xFFFFFFFF, dir: "*" }
        }, {
            name: "CFW Builtins",
            respond: async (tools) => {
                switch (tools.fn) {
                    case "flame":
                        tools.setMIMEBasedOnExt("js");
                        return tools.sendString(await fsp.readFile(path.resolve(CFW_NODE_DIR, "flame/build/flame.js"), "utf8"));
                    case "radiate":
                        tools.setMIMEBasedOnExt("js");
                        return tools.sendString(await fsp.readFile(path.resolve(CFW_NODE_DIR, "radiate/build/radiate.js"), "utf8"));
                    case "wick":
                        tools.setMIMEBasedOnExt("js");
                        return tools.sendString(await fsp.readFile(path.resolve(CFW_NODE_DIR, "wick/build/wick.js"), "utf8"));
                    case "flame":
                        tools.setMIMEBasedOnExt("js");
                        return tools.sendString(await fsp.readFile(path.resolve(CFW_NODE_DIR, "flame/build/flame.js"), "utf8"));
                    case "glow":
                        tools.setMIMEBasedOnExt("js");
                        return tools.sendString(await fsp.readFile(path.resolve(CFW_NODE_DIR, "glow/build/glow.js"), "utf8"));
                    case "html":
                        tools.setMIMEBasedOnExt("js");
                        return tools.sendString(await fsp.readFile(path.resolve(CFW_NODE_DIR, "html/build/html.js"), "utf8"));
                    case "css":
                        tools.setMIMEBasedOnExt("js");
                        return tools.sendString(await fsp.readFile(path.join(CFW_NODE_DIR, "css/build/css.js"), "utf8"));
                    case "js":
                        tools.setMIMEBasedOnExt("js");
                        return tools.sendString(await fsp.readFile(path.join(CFW_NODE_DIR, "js/build/ecma.js"), "utf8"));
                    case "ecma":
                        tools.setMIMEBasedOnExt("js");
                        return tools.sendString(await fsp.readFile(path.join(CFW_NODE_DIR, "js/build/ecma.js"), "utf8"));
                    case "url":
                        tools.setMIMEBasedOnExt("js");
                        //return tools.sendString(await fsp.readFile(CFW_NODE_DIR , "url", "utf8"));

                }

                return false;
            },
            keys: { ext: 0x1, dir: "/cfw" }

        })
    } else {

        try {
            $404 = (await import("./data/404.data.mjs")).default;
            $radiate = await fsp.readFile(path.join(script_dir, "./node_modules/@candlefw/radiate/build/radiate.js"), "utf8");
            $wick = await fsp.readFile(path.join(script_dir, "./node_modules/@candlefw/wick/build/wick.js"), "utf8");
        } catch (e) { console.error(e) }


        lantern.addDispatch({
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
                    case "wick":
                        tools.setMIME("js");
                        return tools.sendString($wick);
                }

                return false;
            },
            keys: { ext: 0x1, dir: "/cfw" }
        })
    }
}
