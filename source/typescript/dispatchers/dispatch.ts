import URL from "@candlelib/uri";
import LanternToolsBase from "../tool_set/tools.js";
import { RequestData } from "../types/request_data";
import { Dispatcher } from "../types/types.js";
import { Logger, LogQueue } from "../utils/log.js";
import default_dispatch from "./default_dispatch.js";


/** Error Messages ***/
const e0x101 = "Dispatch object must include a function member named 'respond'. Error missing dispatch_object.respond.";
const e0x102 = "Dispatch object must contain a set of dispatch keys. Error missing dispatch_object.keys.";
const e0x103 = "Dispatch object must have name. Error missing dispatch_object.name.";
const e0x104 = "Dispatch object name must be a string. Error dispatch_object.name is not a string value.";

async function respond(d_objs: Array<Dispatcher>, tool_set: LanternToolsBase, request_data: RequestData, log: Logger) {

    let SUCCESS = false, SILENT = false;

    for (let i = 0; i < d_objs.length && !SUCCESS; i++) {
        SILENT = false;

        let do_ = d_objs[i];

        SILENT = typeof (do_.SILENT) == "number"
            ? do_.SILENT++ > 100
                ? (log.debug(`Dispatch [${do_.name}] kept silent for 100 requests`), do_.SILENT = 0, false)
                : true
            : false;

        //@ts-ignore
        const tool_box: LanternToolsBase = tool_set.createToolbox(do_, request_data, log);


        switch (do_.response_type) {

            case 0:
                SUCCESS = await tool_box.respond();
                tool_box.destroy();
                break;

            case 1:
                tool_box.setStatusCode();
                tool_box.setMIME(do_.MIME);

                if (await tool_box.sendUTF8String()) {
                    SUCCESS = true;
                };

                tool_box.destroy();
                break;

            case 2:
                tool_box.setStatusCode();
                tool_box.setMIME(do_.MIME);

                if (await tool_box.sendRawStream()) {
                    SUCCESS = true;
                };

                tool_box.destroy();
                break;
        }
    }

    SILENT = SILENT && SUCCESS;

    return {
        SUCCESS,
        SILENT
    };
}

export function getDispatches(request_data: RequestData, DispatchMap, ext_map):
    Dispatcher[] {
    // Authenticated   
    const
        url: URL = request_data.url,
        dir = (url.dir == "/") ? "/" : url.dir,
        ext = url.ext,
        keys = dir.split("/");

    let
        ext_flag = 1, // The "No Extension" value
        dispatch_objects = null;

    if (ext)
        ext_flag = ext_map[ext] || 0x8000000; // The "Any Extension" value;


    let dispatch_set: Set<Dispatcher> = new Set;

    for (let i = 0; i < keys.length; i++) {
        let key = `${ext_flag.toString(16)}${keys.slice(0, keys.length - i).join("/")}${i > 0 ? "/*" : "/"}`.replace(/\/\//g, "/");

        for (const dispatch of DispatchMap.get(key) ?? [])
            dispatch_set.add(dispatch);
    }

    if (dispatch_set.size > 0)
        return [...dispatch_set.values()];
    return;
}

/** Root dispatch function **/
export default async function dispatcher<T>(tool_set, request_data: RequestData, log_queue: LogQueue, DispatchMap, ext_map) {

    const
        url = request_data.url,
        ext_flag = 1, // The "No Extension" value
        base_key = `${ext_flag.toString(16)}`,
        dispatch_objects = getDispatches(request_data, DispatchMap, ext_map) ?? DispatchMap.get(base_key) ?? [default_dispatch],
        //Used to keep all relevant messages in one block of text when logging.
        local_log = log_queue.createLocalLog(`Log of request for ${url}:`);



    local_log.debug(`Responding with dispatchers [${dispatch_objects
        .map((dsp, i) => `${i + 1}: ${dsp.name}`)
        .join(", ")
        }]`);

    const { SILENT, SUCCESS } = await respond(dispatch_objects, tool_set, request_data, local_log);

    local_log.delete(SILENT);

    return SUCCESS;
}



/** Root dispatch function **/
dispatcher.default = async function (code, tool_set, request_data: RequestData, log_queue: LogQueue, DispatchMap, ext_map) {
    /** Extra Flags **/
    const
        url = request_data.url,
        dir = (url.dir == "/") ? "/" : url.dir,
        ext = url.ext;

    let ext_flag = 1; // The "No Extension" value

    if (ext)
        ext_flag = ext_map[ext] || 0x8000000; // The "Any Extension" value; 


    let extended_key = `${ext_flag.toString(16)}${code}${dir}`;
    let base_key = `${ext_flag.toString(16)}${code}`;

    const local_log = log_queue.createLocalLog(`Log of request for ${url}:`);

    let dispatch_object = DispatchMap.get(extended_key) || DispatchMap.get(base_key) || default_dispatch;

    local_log.debug(`Responding to request for "${url}" with code ${code}, using debug debug [${dispatch_object.name}]`);

    const result = await respond([dispatch_object], tool_set, request_data, local_log);

    local_log.delete();

    return result;
};

function SetDispatchMap(dir, dispatch_object, ext, DispatchMap) {

    for (let i = 1; i !== 0x10000000; i = (i << 1)) {
        if ((ext & i)) {
            let dispatch_key;
            if (dir == "*") {
                dispatch_key = `${i.toString(16)}`;
            } else {
                dispatch_key = `${i.toString(16)}${dir}`;
            }

            let d = DispatchMap.get(dispatch_key);

            if (d) {
                d.push(dispatch_object);
            } else
                DispatchMap.set(dispatch_key, [dispatch_object]);
        }
    }
}

export function AddDispatch(log_queue: LogQueue, DispatchMap, DefaultDispatchMap, ...dispatch_objects) {

    for (const dispatch_object of dispatch_objects)
        AddCustomDispatch(log_queue, dispatch_object, DispatchMap, DefaultDispatchMap);

    return this;
}

function AddCustomDispatch(log_queue: LogQueue, dispatch_object, DispatchMap, DefaultDispatchMap) {

    const log = log_queue.createLocalLog("DISPATCH_MAP");

    let
        Keys = dispatch_object.keys,
        Name = dispatch_object.name,
        Respond = dispatch_object.respond;

    dispatch_object.response_type = 0;

    const t_o_r = typeof (Respond);

    if (t_o_r !== "function") {

        if (t_o_r == "string") {
            dispatch_object.response_type = 1;
        } else if (t_o_r == "object")
            dispatch_object.response_type = 2;
        else
            return log.sub_error(`[${Name}] ${e0x101}`).delete();
    }

    if (typeof (Keys) == "undefined")
        return log.sub_error(`[${Name}] ${e0x102}`).delete();

    if (typeof (Name) == "undefined")
        return log.sub_error(`[${Name}] ${e0x103}`).delete();

    if (typeof (Name) !== "string") {
        if (typeof (Name) == "number") {
            log.delete();
            return AddDefaultDispatch(log_queue, dispatch_object, DefaultDispatchMap);
        }
        return log.sub_error(`[${Name}] ${e0x104}`).delete();
    }

    const keys = Array.isArray(Keys) ? Keys : [Keys];

    for (const Key of keys) {


        const ext = Key.ext;

        if (typeof (ext) !== "number")
            return log.sub_error("dispatch_object.key.ext must be a numerical value").delete();


        const dir_array = Key.dir.split("/");

        const dir = (dir_array[dir_array.length - 1] == "*" || dir_array[dir_array.length - 1] == "") ?
            Key.dir :
            dir_array.concat([""]).join("/");

        if (dir[dir.length - 1] == "*" && dir.length > 1) {
            SetDispatchMap(dir.slice(0, -1), dispatch_object, ext, DispatchMap);
        }

        SetDispatchMap(dir, dispatch_object, ext, DispatchMap);
    }

    const width = process.stdout.columns - 1;

    log.debug(`Added Dispatch [${dispatch_object.name}]: \n${("=").repeat(width - 20)}\n  ${dispatch_object.description ? dispatch_object.description : "No Description"}\n${("=").repeat(width - 20)}\n`);

    if (typeof (dispatch_object.MIME) !== "string")
        dispatch_object.MIME = "text/plain";

    log.delete();



    return this;
}

function AddDefaultDispatch(log_queue: LogQueue, dispatch_object, DispatchDefaultMap) {

    const log = log_queue.createLocalLog("DISPATCH_MAP");

    let Keys = dispatch_object.keys;
    let Name = dispatch_object.name;

    const ext = Keys.ext;
    const dir = Keys.dir;

    if (typeof (ext) !== "number")
        return log.sub_error("dispatch_object.key.ext must be a numerical value").delete();

    for (let i = 1; i !== 0x10000000; i = (i << 1)) {

        if ((ext & i)) {
            let dispatch_key;
            if (dir == "*") {
                dispatch_key = `${i.toString(16)}${Name}`;
            } else {
                dispatch_key = `${i.toString(16)}${Name}${dir}`;
            }

            DispatchDefaultMap.set(dispatch_key, dispatch_object);
        }
    }

    log.delete();
}