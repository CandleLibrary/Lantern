/**[API]:testing
 *
 * Dispatchers should be selected based on the extension
 * and path information from the request, ordered
 * ASCENDING based on the order in which the dispatchers
 * where submitted to AddDispatch
 */
import { AddDispatch, getDispatches } from "@candlelib/lantern/build/library/dispatchers/dispatch.js";
import { LogQueue } from "@candlelib/lantern/build/library/utils/log.js";
import ext_map from "@candlelib/lantern/build/library/extension/extension_map.js";
import URL from "@candlelib/uri";

await URL.server();

const logger = new LogQueue(console.log);

const
    DispatchMap = new Map(),
    DispatchDefaultMap = new Map();

AddDispatch(logger, DispatchMap, DispatchDefaultMap,
    {
        name: "Images",
        respond: _ => _,
        keys: { ext: ext_map.png | ext_map.gif, dir: "/img/*" }
    },
    {
        name: "Images Root",
        respond: _ => _,
        keys: { ext: ext_map.gif, dir: "/img" }
    },
    {
        name: "AllImages",
        respond: _ => _,
        keys: { ext: ext_map.png | ext_map.gif, dir: "/*" }
    },
    {
        name: "LastResort",
        respond: _ => _,
        keys: { ext: ext_map.all, dir: "/*" }
    }
);

let urlA = new URL("http://localhost/img/test.png");

function getDispatchName(url) {
    return (getDispatches({ url }, DispatchMap, ext_map) ?? []).map(d => d.name);
}

assert("/img/test.png", getDispatchName(urlA) == ['Images', 'AllImages', 'LastResort']);

urlA = new URL("http://localhost/img/png/test.png");

assert("/img/png/test.png", getDispatchName(urlA) == ['Images', 'AllImages', 'LastResort']);