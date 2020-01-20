import runner from "./source/main.mjs"
import poller_dispatch from "./source/poller_dispatch.mjs"
import path from 'path';


const lantern = runner({ port: process.env.PORT }, true);

lantern.addDispatch({
    name: "General",
    MIME: "text/html",
    respond: async function(tools) {

        if (!tools.ext) {
            //look for index html;
            tools.setMIME();
            return tools.sendUTF8(path.join(tools.dir, tools.file || "", "index.html"))
        }

        tools.setMIMEBasedOnExt();

        return tools.sendRaw(path.join(tools.dir, tools.file));
    },
    keys: { ext: lantern.ext.all, dir: "*" }
}, poller_dispatch)

