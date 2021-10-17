import { AddDispatch } from "../dispatchers/dispatch.js";
import ext_map, { addKey } from "../extension/extension_map.js";
import MimeTypes from '../extension/ext_to_mime.js';
import { LanternConstructorOptions } from "../types/constructor_options";
import { LanternServer } from "../types/lantern_server";
import { LogQueue } from "./log.js";
export function createLanternServer<K>(options: LanternConstructorOptions, socker_server: K, is_open_fn: () => boolean, close_server_fn: () => Promise<boolean>): {
    log_queue: LogQueue,
    lantern: LanternServer<K>;
    DispatchMap: Map<any, any>;
    DispatchDefaultMap: Map<any, any>;
} {
    let DISPATCH_INSTALL_LOCK = false;
    /* Routes HTTP request depending on active dispatch modules. */
    const
        log_queue = new LogQueue(options.log),
        DispatchMap = new Map(),
        DispatchDefaultMap = new Map(),
        lantern = <LanternServer<K>>{
            isOPEN: is_open_fn,
            ext: ext_map,
            server: socker_server,
            addExtension: (ext_name: string, mime_type?: string) => {
                addKey(ext_name, ext_map, log_queue);

                if (typeof mime_type == "string") {
                    MimeTypes[ext_name] = mime_type;
                }
            },
            addDispatch: (...v) => {

                if (DISPATCH_INSTALL_LOCK) return;

                DISPATCH_INSTALL_LOCK = true;

                for (const dispatcher of v) {

                    Object.defineProperty(
                        dispatcher,
                        "cwd",
                        {
                            configurable: false,
                            writable: false,
                            enumerable: true,
                            value: options.cwd,
                        }
                    );

                    if (typeof dispatcher.init == "function")
                        dispatcher.init(lantern, dispatcher);
                }


                AddDispatch(log_queue, DispatchMap, DispatchDefaultMap, ...v);

                DISPATCH_INSTALL_LOCK = false;
            },
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
