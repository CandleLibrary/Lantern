import path from "path";
import fs from "fs";
import { Dispatcher } from "../types";
import ext_map from "../extension_map.js";
import { getPackageJsonObject } from "@candlefw/wax";
import URL from "@candlefw/url";


let READY = false;
let CFW_DIR = "";

async function Set() {

    if (READY) return;

    await URL.server();

    const { FOUND, package_dir } = await getPackageJsonObject(URL.getEXEURL(import.meta).path);

    CFW_DIR = path.join(package_dir, "node_modules/@candlefw/");

    console.log(CFW_DIR);

    READY = true;
}

const fsp = fs.promises;

const CFW_NODE_DIR = path.resolve(import.meta.url.replace(process.platform == "win32" ? /file\:\/\/\// : /file\:\/\//g, ""), "../../../../node_modules/@candlefw");

export default <Dispatcher>{
    name: "CFW Builtins DEV",
    description: `Serves CandleFW libraries from the virtual directory [cfw]
    
    Available libraries:
        Library :   src name
        ______________________
        WICK    :   /cfw/wick
                    /cfw/wicklite
        GLOW    :   /cfw/glow
        URL     :   /cfw/url
        HTML    :   /cfw/html
        CSS     :   /cfw/css
        JS      :   /cfw/js
                    /cfw/ecma`,
    respond: async (tools) => {
        await Set();

        const url = tools.url,
            ext = url.ext,
            dir = url.path,
            dir_sections = dir.split("/");

        if (dir_sections[1] == "@candlefw")
            dir_sections.splice(1, 1);

        const pkg = dir_sections[1],
            source_name = {
                "wick": "wick",
                "url": "url",
                "glow": "glow",
                "html": "html",
                "css": "css",
                "cfw": "cfw",
                "hydrocarbon": "hydrocarbon",
                "conflagrate": "conflagrate",
                "wind": "wind",
                "spark": "spark",
                "js": "javascript",
            }[pkg],
            file_path = dir_sections.slice(2).join("/").replace("build/library/", ""),
            return_path = ([
                "wick",
                "url",
                "glow",
                "html",
                "css",
                "cfw",
                "hydrocarbon",
                "conflagrate",
                "wind",
                "spark",
                "js",
            ].includes(pkg)
                ? path.join(CFW_DIR, pkg, "build/library", file_path || (source_name + ".js"))
                : "");

        if (return_path !== "") {
            const str = await tools.getUTF8FromFile(return_path);
            tools.setMIMEBasedOnExt(ext || "js");
            return tools.sendUTF8String(str.replace(/\@candlefw/g, "/@candlefw"));
        }

        return false;
    },
    keys: [{ ext: ext_map.all, dir: "/*" }, { ext: ext_map.all, dir: "/cfw" }]
};