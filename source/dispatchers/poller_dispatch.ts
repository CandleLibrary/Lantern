const pollerCache = new Map();
import log from "../log.js";
import path from "path";
import watch from "node-watch";
import { Dispatcher } from "../types";


function watchPath(ID) {
    if (ID && !pollerCache.has(ID)) {

        pollerCache.set(ID, false);

        const e = (n, e) => {
            pollerCache.set(ID, true);
        };

        if (ID) {
            for (const p of ID.split(";")) {
                try {
                    log(`Preparing watch of directory ${path.resolve(process.cwd(), p)}`);
                    watch(path.resolve(process.cwd(), p), { recursive: true }, e);
                } catch (e) {
                    return false;
                }
            }
        } else {
            log(`Preparing watch for dir ${"./"}`);
            watch("./", { recursive: true, persistent: false }, e);
        }
    }

    return true;
}

export default <Dispatcher>{
    name: "Auto-Load-Poller Loader",
    description:
        `Sends a poller js file that automatically polls the server to see 
if files in specified directories have been changed, and then reloads 
the page if changes have occured. 

To use, add to the HTML head tag: 
    
    <script type="module" src="/lantern-poll/?{dirs}"></script>

where {dirs} is a list of domain directories separated by semicolon
[;].`,
    keys: { ext: 0xFFFFFFFF, dir: "/lantern-poll/" },
    SILENT: 0,
    MIME: " application/ecmascript",
    respond: async (tools) => {
        const url = tools.url;
        const ID = url.query;

        if (ID) {
            if (!watchPath(ID)) {
                tools.setMIME();
                return tools.sendUTF8FromFile(`(e=>{throw("Lantern Poller Error: Could not find dir for [${path}]")})()`);
            }
        }

        if (tools.filename == "poll") {

            const data = await tools.getJSONasObject();
            const ID = data.id;
            const result = pollerCache.get(ID);

            watchPath(ID);

            pollerCache.set(ID, false);

            tools.setMIMEBasedOnExt("json");

            return tools.sendUTF8FromFile(`{"UPDATED":${result}}`);
        } else {

            const rate = 100;

            tools.setMIME();

            return tools.sendUTF8FromFile(`
                import URL from "/cfw/url";
                    const url = new URL("/lantern-poll/poll");
                    const base_url = new URL();
                    setInterval(async function() {
                        if((await url.submitJSON({id:"${ID}"})).UPDATED){
                            location.href = base_url + "";
                        }
                    }, ${rate});
                `);
        }
    }
};