import path from "path";
import fs from "fs";

const fsp = fs.promises;
const CFW_NODE_DIR = path.resolve( import.meta.url.replace(process.platform == "win32" ? /file\:\/\/\// : /file\:\/\//g, ""), "../../../node_modules/@candlefw")

export default {
    name: "CFW Builtins DEV",
    description: `Serves CandleFW libraries from the virtual directory [cfw]
    
    Available libraries:
        Library :   src name
        ______________________
        FLAME   :   /cfw/flame
        RADIATE :   /cfw/radiate
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
            case "flame":
                tools.setMIMEBasedOnExt("js");
                return tools.sendString(await fsp.readFile(path.resolve(CFW_NODE_DIR, "flame/build/flame.js"), "utf8"));
            case "radiate":
                tools.setMIMEBasedOnExt("js");
                return tools.sendString(await fsp.readFile(path.resolve(CFW_NODE_DIR, "radiate/build/radiate.js"), "utf8"));
            case "wick":
                tools.setMIMEBasedOnExt("js");
                return tools.sendString(await fsp.readFile(path.resolve(CFW_NODE_DIR, "wick/build/wick.js"), "utf8"));
            case "wick.lite":
            case "wicklite":
                tools.setMIMEBasedOnExt("js");
                return tools.sendString(await fsp.readFile(path.resolve(CFW_NODE_DIR, "wick/build/wick.lite.js"), "utf8"));
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
            case "ecma":
                tools.setMIMEBasedOnExt("js");
                return tools.sendString(await fsp.readFile(path.join(CFW_NODE_DIR, "js/build/ecma.js"), "utf8"));
            case "url":
                tools.setMIMEBasedOnExt("js");
                return tools.sendString(await fsp.readFile(path.join(CFW_NODE_DIR, "url/build/url.js"), "utf8"));
        }

        return false;
    },
    keys: { ext: 0x1, dir: "/cfw" }
}