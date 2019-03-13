#!/bin/sh

":" //# comment; exec /usr/bin/env node --experimental-modules "$0" "$@"

import lier from "./source/main.mjs"
import path from 'path';

lier.addDispatch({
    name: "General",
    MIME: "text/html",
    respond: async function(tools) {
        
        if (!tools.ext) {
            //look for index html;
         	tools.setMIME();
            return tools.sendUTF8(path.join(tools.dir, tools.fn || "", "index.html"))
        }

        tools.setMIMEBasedOnExt();
        return tools.sendUTF8(path.join(tools.dir, tools.filename));
    },
    keys: { ext: lier.ext.all, dir: "*" }
})


lier({ port: process.env.PORT });
