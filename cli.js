#!/usr/bin/env node

import lantern from "./build/library/lantern.js";
import poller_dispatch from "./build/library/dispatchers/poller_dispatch.js";
import candlefw_dispatch from "./build/library/dispatchers/candlefw_dispatch.js";
import $404_dispatch from "./build/library/dispatchers/404_dispatch.js";
import path from 'path';

lantern({ port: process.env.PORT || 8080 }).then(
    server => {
        server.addDispatch(
            {
                name: "General",
                MIME: "text/html",
                respond: async function (tools) {

                    if (!tools.ext) {

                        if (tools.url.path.slice(-1) !== "/") {
                            //redirect to path with end delimiter added. Prevents errors with relative links.
                            tools.url.path += "/";
                            return tools.redirect(tools.url);
                        }

                        //look for index html;
                        tools.setMIME();

                        return tools.sendUTF8(path.join(tools.dir, tools.file || "", "index.html"));
                    }

                    tools.setMIMEBasedOnExt();

                    return tools.sendRaw(path.join(tools.dir, tools.file));
                },
                keys: { ext: server.ext.all, dir: "*" }
            },
            poller_dispatch,
            candlefw_dispatch,
            $404_dispatch
        );


    });