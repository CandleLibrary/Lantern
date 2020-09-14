import path from "path";
import fs from "fs";
import { Dispatcher } from "../types/types";
import ext_map from "../extension/extension_map.js";
import { getPackageJsonObject } from "@candlefw/wax";
import URL from "@candlefw/url";

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
        CFW_DIR = path.join(candidate_dir.join("/"), "node_modules/@candlefw/");
        try {
            const data = await fsp.readdir(CFW_DIR);
            found = true;
        } catch (e) { }
        candidate_dir.pop();
    }

    READY = true;
}

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

        if (dir_sections[1] == "cfw")
            dir_sections.splice(0, 1);

        if (dir_sections[1] == "@candlefw")
            dir_sections.splice(1, 1);

        const pkg = dir_sections[1],
            source_name = {
                "wickrt": "wick",
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
            return tools.sendUTF8String(str.replace(/\"\@candlefw\/([^\/\"]+)/g, "\"/cfw\/$1/"));
        }

        return false;
    },
    keys: [{ ext: ext_map.all, dir: "/*" }, { ext: ext_map.all, dir: "/cfw" }]
};