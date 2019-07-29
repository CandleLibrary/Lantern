import lier from "./source/main.mjs";
import fs from "fs";
import path from "path";

lier.addDispatch({
    name: "Home Page",
    MIME: "text/html",
    respond: async function(tools) {
        if (tools.fn) return false;
        tools.setMIME();
        return tools.sendUTF8("./test/src/index.html")
    },
    keys: { ext: 0x1, dir: "/" }
})

lier({ port: 8080 });
