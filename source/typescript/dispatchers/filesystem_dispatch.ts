import path from "path";
import { Dispatcher } from "../types/types";
import ext_map from "../extension/extension_map.js";

export default <Dispatcher>{
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

            return tools.sendUTF8FromFile(path.join(tools.dir, tools.file || "", "index.html"));
        }

        tools.setMIMEBasedOnExt();

        console.log(tools.dir, tools.file);

        return tools.sendRawStreamFromFile("./" + tools.file);
    },
    keys: { ext: ext_map.all, dir: "/*" }
};