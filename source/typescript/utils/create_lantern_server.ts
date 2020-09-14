import { AddDispatch } from "../dispatchers/dispatch.js";
import ext_map, { addKey } from "../extension/extension_map.js";
import { LanternConstructorOptions } from "../types/constructor_options";
import { LanternServer } from "../types/lantern_server";
import { LogQueue } from "./log.js";
export function createLanternServer<K>(options: LanternConstructorOptions, socker_server: K, is_open_fn: () => boolean, close_server_fn: () => Promise<boolean>): {
    log_queue: LogQueue,
    lantern: LanternServer<K>;
    DispatchMap: Map<any, any>;
    DispatchDefaultMap: Map<any, any>;
} {

    /* Routes HTTP request depending on active dispatch modules. */
    const
        log_queue = new LogQueue(console),
        DispatchMap = new Map(),
        DispatchDefaultMap = new Map(),
        lantern = <LanternServer<K>>{
            isOPEN: is_open_fn,
            ext: ext_map,
            server: socker_server,
            addExtension: (key_name, mime_type) => addKey(key_name, ext_map, log_queue),
            addDispatch: (...v) => AddDispatch(log_queue, DispatchMap, DispatchDefaultMap, ...v),
            close: close_server_fn
        };

    lantern.addDispatch.bind(lantern);

    return {
        log_queue,
        lantern,
        DispatchMap,
        DispatchDefaultMap
    };
}
