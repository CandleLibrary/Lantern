#!/usr/bin/env node

import runner from "./source/main.mjs"
import poller_dispatch from "./source/dispatchers/poller_dispatch.mjs";
import candlefw_dispatch from "./source/dispatchers/candlefw_dispatch.js";
import $404_dispatch from "./source/dispatchers/404_dispatch.js";
import path from 'path';


const lantern = runner({ port: process.env.PORT }, true);

lantern.addDispatch(
{
    name: "General",
    MIME: "text/html",
    respond: async function(tools) {

        if (!tools.ext) {

            if(tools.url.path.slice(-1) !== "/"){
                console.log("!!!!!!")

                //redirect to path with end delemiter added. Prevents errors with relative links.
                tools.url.path += "/"
                return tools.redirect(tools.url);
            }

            //look for index html;
            tools.setMIME();

            return tools.sendUTF8(path.join(tools.dir, tools.file || "", "index.html"))
        }

        tools.setMIMEBasedOnExt();

        return tools.sendRaw(path.join(tools.dir, tools.file));
    },
    keys: { ext: lantern.ext.all, dir: "*" }
}, 
poller_dispatch,
candlefw_dispatch,
$404_dispatch
)

