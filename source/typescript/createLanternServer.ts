import { LanternServer } from "./types";
import ext_map, { addKey } from "./extension_map.js";
import { AddDispatch } from "./dispatcher.js";
export function createLanternServer<K>(socker_server: K, is_open_fn: () => boolean, close_server_fn: () => Promise<boolean>): {
    lantern: LanternServer<K>;
    DispatchMap: Map<any, any>;
    DispatchDefaultMap: Map<any, any>;
} {

    /* Routes HTTP request depending on active dispatch modules. */
    const
        DispatchMap = new Map(),
        DispatchDefaultMap = new Map();

    const lantern = <LanternServer<K>>{
        isOPEN: is_open_fn,
        ext: ext_map,
        server: socker_server,
        addExtension: (key_name, mime_type) => addKey(key_name, ext_map),
        addDispatch: (...v) => AddDispatch(DispatchMap, DispatchDefaultMap, ...v),
        close: close_server_fn
    };

    lantern.addDispatch.bind(lantern);

    return {
        lantern,
        DispatchMap,
        DispatchDefaultMap
    };
}
