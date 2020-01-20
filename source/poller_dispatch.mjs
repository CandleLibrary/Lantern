const pollerCache = new Map();
import fs from "fs";
import log from "./log.mjs";

console.log(pollerCache)

export default {
    name: "Auto-Load-Poller Loader",
    description: "Sends a poller js files that automatically polls the" +
        "server to see if a file, or files, have been changed," +
        "and then reloads the page`",
    keys: { ext: 0xFFFFFFFF, dir: "/lantern-poll/" },
    MIME: " application/ecmascript",
    respond: async (tools) => {
        const url = tools.dir.replace("/lantern-poll", "./")

        if (!pollerCache.has(url)) {

            log(`Preparing watch for dir ${url}`);

            pollerCache.set(url, false);

            fs.watch(url, { recursive: true, persistent: false }, e => pollerCache.set(url, true))
        }

        if (tools.filename == "poll") {

            const data = await tools.getJSONasObject();
            const index = data.id;
            const result = pollerCache.get(index);
            pollerCache.set(index, false)

            tools.setMIMEBasedOnExt("json");

            return tools.sendString(`{"UPDATED":${result}}`);
        } else {

            const rate = 1500;

            tools.setMIME();

            return tools.sendString(`
                import URL from "/cfw/url";
                    const url = new URL("/lantern-poll/poll");
                    setInterval(async function() {
                        console.log()
                        if((await url.submitJSON({id:"${url}"})).UPDATED){
                            location.reload(true);
                        }
                    }, ${rate});
                `)
        }
    }
}