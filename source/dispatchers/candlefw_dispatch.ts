import path from "path";
import fs from "fs";
import { Dispatcher } from "../types";

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
        switch (tools.filename) {
            case "wick":
                tools.setMIMEBasedOnExt("js");
                return tools.sendUTF8String(await fsp.readFile(path.resolve(CFW_NODE_DIR, "wick/build/wick.js"), "utf8"));
            case "wick.rt":
            case "wick.lite":
            case "wickrt":
            case "wicklite":
                tools.setMIMEBasedOnExt("js");
                return tools.sendUTF8String(await fsp.readFile(path.resolve(CFW_NODE_DIR, "wick/build/wick.rt.js"), "utf8"));
            case "glow":
                tools.setMIMEBasedOnExt("js");
                return tools.sendUTF8String(await fsp.readFile(path.resolve(CFW_NODE_DIR, "glow/build/glow.js"), "utf8"));
            case "html":
                tools.setMIMEBasedOnExt("js");
                return tools.sendUTF8String(await fsp.readFile(path.resolve(CFW_NODE_DIR, "html/build/html.js"), "utf8"));
            case "css":
                tools.setMIMEBasedOnExt("js");
                return tools.sendUTF8String(await fsp.readFile(path.join(CFW_NODE_DIR, "css/build/css.js"), "utf8"));
            case "js":
            case "ecma":
                tools.setMIMEBasedOnExt("js");
                return tools.sendUTF8String(await fsp.readFile(path.join(CFW_NODE_DIR, "js/build/ecma.js"), "utf8"));
            case "url":
                tools.setMIMEBasedOnExt("js");
                return tools.sendUTF8String(await fsp.readFile(path.join(CFW_NODE_DIR, "url/build/url.js"), "utf8"));
        }

        return false;
    },
    keys: { ext: 0x1, dir: "/cfw" }
};