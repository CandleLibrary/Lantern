import runner from "./source/main.mjs"
import path from 'path';

const lantern = runner({ port: process.env.PORT }, true);

lantern.addDispatch({
    name: "General",
    MIME: "text/html",
    respond: async function(tools) {
        
        if (!tools.ext) {
            //look for index html;
            tools.setMIME();
            return tools.sendUTF8(path.join(tools.dir, tools.fn || "", "index.html"))
        }

        tools.setMIMEBasedOnExt();

        return tools.sendRAW(path.join(tools.dir, tools.filename));
    },
    keys: { ext: lantern.ext.all, dir: "*" }
})