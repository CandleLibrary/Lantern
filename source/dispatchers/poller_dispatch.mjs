const pollerCache = new Map();
import fs from "fs";
import log from "../log.mjs";

export default {
    name: "Auto-Load-Poller Loader",
    description: "Sends a poller js file that automatically polls the" +
        "server to see if a files in specified directories have been changed," +
        "and then reloads the page if changes have occured.",
    keys: { ext: 0xFFFFFFFF, dir: "/lantern-poll/" },
    MIME: " application/ecmascript",
    respond: async (tools) => {
        const url = tools.url;
        const ID = url.query;

        if (ID && !pollerCache.has(ID)) {
            
            pollerCache.set(ID, false);

            const e = e => pollerCache.set(ID, true);

            if(url.query){
                for(const path of url.query.split(";")){
                    try{
                        log(`Preparing watch for dir ${path}`);
                        fs.watch(path, { recursive: true, persistent: false }, e);
                    }catch(e){
                        tools.setMIME();
                        return tools.sendString(`(e=>{throw("Lantern Poller Error: Could not find dir for [${path}]")})()`)
                    }
                }
            }else{
                log(`Preparing watch for dir ${"./"}`);
                fs.watch("./", { recursive: true, persistent: false }, e);
            }

        }

        if (tools.filename == "poll") {

            const data = await tools.getJSONasObject();
            const ID = data.id;
            const result = pollerCache.get(ID);
            
            pollerCache.set(ID, false)

            tools.setMIMEBasedOnExt("json");

            return tools.sendString(`{"UPDATED":${result}}`);
        } else {

            const rate = 1500;

            tools.setMIME();

            return tools.sendString(`
                import URL from "/cfw/url";
                    const url = new URL("/lantern-poll/poll");
                    setInterval(async function() {
                        if((await url.submitJSON({id:"${ID}"})).UPDATED){
                            location.reload(true);
                        }
                    }, ${rate});
                `)
        }
    }
}