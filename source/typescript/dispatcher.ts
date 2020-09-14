import URL from "@candlefw/url";

import http2 from "http2";
import log, { createLocalLog } from "./log.js";
import default_dispatch from "./dispatchers/default_dispatch.js";
import LanternTools from "./tools.js";
import { Dispatcher, ToolSet, RequestData } from "./types.js";
import LanternToolsBase from "./tools.js";

/** Error Messages ***/
const e0x101 = "Dispatch object must include a function member named 'respond'. Error missing dispatch_object.respond.";
const e0x102 = "Dispatch object must contain a set of dispatch keys. Error missing dispatch_object.keys.";
const e0x103 = "Dispatch object must have name. Error missing dispatch_object.name.";
const e0x104 = "Dispatch object name must be a string. Error dispatch_object.name is not a string value.";

async function respond(d_objs: Array<Dispatcher>, tool_set: LanternToolsBase, request_data: RequestData, log) {

    for (let i = 0; i < d_objs.length; i++) {
        let do_ = d_objs[i];

        //@ts-ignore
        const tool_box = tool_set.createToolbox(do_, request_data, log);

        switch (do_.response_type) {

            case 0:
                const SUCCESS = await tool_box.respond();
                tool_box.destroy();
                if (SUCCESS) return SUCCESS;
                break;

            case 1:
                tool_box.setStatusCode();
                tool_box.setMIME(do_.MIME);
                await tool_box.sendUTF8String();
                return true;
        }
    }

    return false;
}

function createURLFromConnection(stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders): URL {
    return new URL(headers[":scheme"] + "://" + headers[":authority"] + headers[":path"]);
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
export default async function dispatcher<T>(tool_set, request_data: RequestData, DispatchMap, ext_map) {

    const
        url = request_data.url,
        ext_flag = 1, // The "No Extension" value
        base_key = `${ext_flag.toString(16)}`,
        dispatch_objects = getDispatches(request_data, DispatchMap, ext_map) ?? DispatchMap.get(base_key) ?? [default_dispatch],
        //Used to keep all relevant messages in one block of text when logging.
        local_log = createLocalLog(`Log of request for ${url}:`);

    local_log.message(`Responding with dispatchers [${
        dispatch_objects
            .filter(dsp => typeof (dsp.SILENT) == "number" ? dsp.SILENT++ > 100 ? (dsp.SILENT = 0, true) : false : true)
            .map((dsp, i) => `${i + 1}: ${dsp.name}`)
            .join(", ")
        }]`);

    const result = await respond(dispatch_objects, tool_set, request_data, local_log);

    local_log.delete();

    return result;
}



/** Root dispatch function **/
dispatcher.default = async function (code, tool_set, request_data, DispatchDefaultMap, ext_map) {
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

    const local_log = createLocalLog(`Log of request for ${url}:`);

    let dispatch_object = DispatchDefaultMap.get(extended_key) || DispatchDefaultMap.get(base_key) || default_dispatch;

    local_log.message(`Responding to request for "${url}" with code ${code}, using default dispatcher [${dispatch_object.name}]`);

    return await respond([dispatch_object], tool_set, request_data, local_log);
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

export function AddDispatch(DispatchMap, DefaultDispatchMap, ...dispatch_objects) {

    for (const dispatch_object of dispatch_objects)
        AddCustomDispatch(dispatch_object, DispatchMap, DefaultDispatchMap);

    return this;
}

function AddCustomDispatch(dispatch_object, DispatchMap, DefaultDispatchMap) {

    let
        Keys = dispatch_object.keys,
        Name = dispatch_object.name,
        Respond = dispatch_object.respond;

    dispatch_object.response_type = 0;

    const t_o_r = typeof (Respond);

    if (t_o_r !== "function") {

        if (t_o_r == "string") {
            dispatch_object.response_type = 1;
        } else
            return log.error(`[${Name}] ${e0x101}`);
    }

    if (typeof (Keys) == "undefined")
        return log.error(`[${Name}] ${e0x102}`);

    if (typeof (Name) == "undefined")
        return log.error(`[${Name}] ${e0x103}`);

    if (typeof (Name) !== "string") {
        if (typeof (Name) == "number") {
            return AddDefaultDispatch(dispatch_object, DefaultDispatchMap);
        }
        return log.error(`[${Name}] ${e0x104}`);
    }

    const keys = Array.isArray(Keys) ? Keys : [Keys];

    for (const Key of keys) {


        const ext = Key.ext;

        if (typeof (ext) !== "number")
            return log.error("dispatch_object.key.ext must be a numerical value");


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

    log.message(`Added Dispatch [${dispatch_object.name}]: \n${("=").repeat(width)}  ${dispatch_object.description ? dispatch_object.description : "No Description"}\n${("=").repeat(width)}`);

    if (typeof (dispatch_object.MIME) !== "string") {
        //      log.sub_message(`Using text/plain MIME type.`);
        dispatch_object.MIME = "text/plain";
    }

    return this;
}

function AddDefaultDispatch(dispatch_object, DispatchDefaultMap) {

    let Keys = dispatch_object.keys;
    let Name = dispatch_object.name;

    const ext = Keys.ext;
    const dir = Keys.dir;

    if (typeof (ext) !== "number")
        return log.error("dispatch_object.key.ext must be a numerical value");

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
}