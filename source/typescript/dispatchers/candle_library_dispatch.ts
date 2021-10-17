import path from "path";
import fs from "fs";
import { Dispatcher } from "../types/types";
import ext_map from "../extension/extension_map.js";
import { getPackageJsonObject } from "@candlelib/paraffin";
import URL from "@candlelib/uri";

const fsp = fs.promises;
let READY = false;
let CFW_DIR = "";

async function Set() {

    if (READY) return;

    await URL.server();

    const { FOUND, package_dir } = await getPackageJsonObject(URL.getEXEURL(import.meta).path);

    const candidate_dir = package_dir.split("/");

    //figure out if the directory exists
    let found = false;

    while (!found && candidate_dir.length > 1) {
        CFW_DIR = path.join(candidate_dir.join("/"), "node_modules/@candlelib/");
        try {
            const data = await fsp.readdir(CFW_DIR);
            found = true;
        } catch (e) { }
        candidate_dir.pop();
    }

    READY = true;
}

export default <Dispatcher>{
    init(lantern, dispatch) {

        lantern.addExtension("map", "application/json");
        lantern.addExtension("ts", "application/javascript");
        lantern.addExtension("js", "application/javascript");
        lantern.addExtension("wasm", "application/wasm");

        const ext = ext_map.none | ext_map.js | ext_map.ts | ext_map.map | ext_map.wasm;

        dispatch.keys = [{ ext, dir: "/*" }, { ext, dir: "/@cl" }];
    },

    name: "CandleLib Development Built-ins",

    description: `Serves Candle libraries from the virtual directories [@cl] or [@candlelib]
    
Available libraries: (@cl can be freely replaced with @candlelib)

    Library             :   src name
    ____________________________________________

    WICK                :   /@cl/wick
                            /@cl/wickrt
                            
    WICK-Radiate        :   /@cl/wick-radiate

    GLOW                :   /@cl/glow

    URI                 :   /@cl/uri

    HTML                :   /@cl/html

    CSS                 :   /@cl/css

    TS                  :   /@cl/ts

    JS                  :   /@cl/js

    FLAME               :   /@cl/flame

    LOG                 :   /@cl/log

    HYDROCARBON-RUNTIME :   /@cl/hc
                        :   /@cl/hydrocarbon 

    HYDROCARBON-FULL    :   /@cl/hc-full
                        :   /@cl/hydrocarbon-full
`,
    respond: async (tools) => {
        await Set();


        const url = tools.url,
            ext = url.ext,
            dir = url.path,
            dir_sections = dir.split("/");

        if (dir_sections[1] == "@cl")
            dir_sections.splice(0, 1);

        if (dir_sections[1] == "@candlelib")
            dir_sections.splice(1, 1);

        const pkg = dir_sections[1],
            source_name = {
                "wick-rt": "wick/entry/wick-runtime",
                "wick": "wick/entry/wick-runtime",
                "wick-full": "wick/entry/wick-runtime",
                "wick-radiate": "wick/entry/wick-radiate",
                "flame": "flame/entry/client",
                "log": "log/logger",
                "uri": "uri/uri",
                "glow": "glow/glow",
                "html": "html/html",
                "css": "css/css",
                "hc-full": "hydrocarbon/entry/hydrocarbon",
                "hydrocarbon-full": "hydrocarbon/entry/hydrocarbon",
                "hc": "hydrocarbon/entry/runtime",
                "hydrocarbon": "hydrocarbon/entry/runtime",
                "conflagrate": "conflagrate/conflagrate",
                "wind": "wind/wind",
                "spark": "spark/spark",
                "js": "js/javascript",
            }[pkg],
            file_path = dir_sections.slice(2).join("/").replace("build/library/", ""),
            return_path = ([
                "wick",
                "uri",
                "glow",
                "html",
                "css",
                "candle",
                "hydrocarbon",
                "conflagrate",
                "wind",
                "spark",
                "js",
                "flame",
                "log",
            ].includes(pkg)
                ? path.join(CFW_DIR, pkg, "build/library", file_path || (source_name + ".js"))
                : "");

        if ((!file_path || file_path == "/") && source_name) {
            return tools.redirect(`/@cl/${source_name}.js`);
        }

        if (return_path !== "") {

            if (ext == "wasm") {
                tools.setMIMEBasedOnExt();

                console.log({ ext: tools._ext, mime: tools.pending_headers });

                return tools.sendRawStreamFromFile(return_path);
            } else if (ext == "map") {

                return tools.sendUTF8FromFile(return_path);

            } else if (ext == "ts") {

                const
                    file_name = url.filename;
                //Can only be from a source map, so deliver from host folder based on the source 
                //root directory
                //Replace build/library with source/typescript


                return tools.sendUTF8FromFile(return_path.replace("build/library", "source/typescript"));
            } else {

                tools.log(file_path, return_path);

                const str = await tools.getUTF8FromFile(return_path);

                tools.setMIMEBasedOnExt(ext || "js");

                return tools.sendUTF8String(
                    str
                        .replace(/(["'])\@candlelib\/([^\/\"\']+)\/?/g, "$1/@cl\/$2/")
                        .replace(/^\s*import(.+)from\s*("|')([^"']+)("|')\;/g, (m, import_clause, _, path_str, __) => {
                            // Convert all relative filepaths to absolute paths 
                            // This helps ensure consistent model import behavior
                            // and prevents duplicate requests that only differ
                            // in the relative path base location
                            let dest = new URL(path_str);

                            if (dest.host)

                                console.log(path_str, dest);

                            if (dest.IS_RELATIVE) {
                                dest = URL.resolveRelative(dest, tools.url);
                            }

                            return `\nimport ${import_clause} from \"${dest.path}\"`;
                        })
                );
            }
        } else if (ext == "wasm") {
            console.log({ tools, dir, return_path });
        }

        return false;
    }

};