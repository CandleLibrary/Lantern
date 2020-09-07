/**[API]:testing
 *
 * Dispatchers should be selected based on the extension
 * and path information from the request, ordered
 * ASCENDING based on the order in which the dispatchers
 * where submitted to AddDispatch
 */
import { AddDispatch, getDispatches } from "@candlefw/lantern/build/library/dispatcher.js";
import ext_map from "@candlefw/lantern/build/library/extension_map.js";

const
    DispatchMap = new Map(),
    DispatchDefaultMap = new Map();

AddDispatch(DispatchMap, DispatchDefaultMap,
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

const
    hdr_poly = {
        ":scheme": "http",
        ":authority": "localhost",
        ":path": "/img/test.png"
    };

function getDispatchName(hdr_poly) {
    return (getDispatches({}, hdr_poly, DispatchMap, ext_map) ?? []).map(d => d.name);
}

"/img/test.png";
assert(getDispatchName(hdr_poly) == ['Images', 'AllImages', 'LastResort']);

hdr_poly[":path"] = "/img/png/test.png";

"/img/png/test.png";
assert(getDispatchName(hdr_poly) == ['Images', 'AllImages', 'LastResort']);