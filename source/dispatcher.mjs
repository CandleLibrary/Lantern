import path from "path";
import log from "./log.mjs";
import ext_map from "./extension_map.mjs";
import default_dispatch from "./dispatchers/default_dispatch.mjs"
import LanternTools from "./tools.mjs";
import URL from "@candlefw/url";



/** Error Messages ***/
const e0x101 = "Dispatch object must include a function member named 'respond'. Error missing dispatch_object.respond.";
const e0x102 = "Dispatch object must contain a set of dispatch keys. Error missing dispatch_object.keys.";
const e0x103 = "Dispatch object must have name. Error missing dispatch_object.name.";
const e0x104 = "Dispatch object name must be a string. Error dispatch_object.name is not a string value.";

async function respond(d_objs, req, res, url, meta, response_code = 200) {

    for (let i = 0; i < d_objs.length; i++) {
        let do_ = d_objs[i];

        switch (do_.response_type) {

            case 0:
                const tools = new LanternTools(do_, req, res, meta, url);
                const result = await tools.respond();
                tools.destroy();
                if (result)
                    return result;
                break;
            case 1:
                res.writeHead(response_code, { 'content-type': do_.MIME });
                res.end(do_.respond, "utf8", (err) => {
                    if (err)
                        log.error(err)
                });
                return true;
        }
    }

    return false
}

/** Root dispatch function **/
export default async function dispatcher(req, res, meta, DispatchMap, ext_map) {

    // Authenticated
    const url = new URL(req.url);

    const _path = path.parse(url.pathname);

    const dir =  (url.dir == "/") ? "/" : url.dir ;

    const name = url.filename;

    const ext = url.ext;

    let ext_flag = 1; // The "No Extension" value
    
    if (ext)
        ext_flag = ext_map[ext] || 0x8000000; // The "Any Extension" value;

    let extended_key = `${ext_flag.toString(16)}${dir}`;
    
    let base_key = `${ext_flag.toString(16)}`;

    const keys = dir.split("/");

    let dispatch_object = null;

    for (let i = 0; i < keys.length; i++) {
        let key = `${ext_flag.toString(16)}${keys.slice(0,keys.length-i).join("/")}${i > 0 ? "/*" : "/"}`
        if ((dispatch_object = DispatchMap.get(key)))
            break
    }

    dispatch_object = dispatch_object || DispatchMap.get(base_key) || default_dispatch;

    log.verbose(`Received request for "${req.url}", responding with dispatcher${dispatch_object.length > 1 ? "s": ""} [${dispatch_object.map(d=>d.name).join(", ")}]`)

    return await respond(dispatch_object, req, res, url, meta)
}



/** Root dispatch function **/
dispatcher.default = async function(code, req, res, meta, DispatchDefaultMap, ext_map) {
    /** Extra Flags **/
    const url = new URL(req.url);

    const _path = path.parse(url.pathname);
    const dir =  (url.dir == "/") ? "/" : url.dir ;
    const name = url.filename;
    const ext = url.ext;

    let ext_flag = 1; // The "No Extension" value
    if (ext)
        ext_flag = ext_map[ext] || 0x8000000; // The "Any Extension" value; 

    let extended_key = `${ext_flag.toString(16)}${code}${dir}`;
    let base_key = `${ext_flag.toString(16)}${code}`;

    let dispatch_object = DispatchDefaultMap.get(extended_key) || DispatchDefaultMap.get(base_key) || default_dispatch;

    log.verbose(`Responding to request for "${req.url}" with code ${code}, using dispatcher [${dispatch_object.name}]`)

    return await respond([dispatch_object], req, res, url, meta);
}

export function AddDispatch(DispatchMap, DefaultDispatchMap, ...dispatch_objects) {

    for (let i = 0, l = dispatch_objects.length; i < l; i++) {
        AddCustom(dispatch_objects[i], DispatchMap, DefaultDispatchMap);
    }

    return this;
}

function AddCustom(dispatch_object, DispatchMap, DefaultDispatchMap) {
    let Keys = dispatch_object.keys;
    let Name = dispatch_object.name;
    let Respond = dispatch_object.respond;

    dispatch_object.response_type = 0;

    if (typeof(Respond) !== "function") {
        if (typeof(Respond) == "string") {
            if (typeof(dispatch_object.MIME) !== "string") {
                return log.error("Cannot use String based response type without a mime type definitions")
            }
            dispatch_object.response_type = 1;
        } else
            return log.error(`[${Name}] ${e0x101}`)
    }

    if (typeof(Keys) == "undefined")
        return log.error(`[${Name}] ${e0x102}`)

    if (typeof(Name) == "undefined")
        return log.error(`[${Name}] ${e0x103}`)

    if (typeof(Name) !== "string") {
        if (typeof(Name) == "number") {
            return AddDefaultDispatch(dispatch_object, DefaultDispatchMap);
        }
        return log.error(`[${Name}] ${e0x104}`);
    }

    const ext = Keys.ext;

    if (typeof(ext) !== "number")
        return log.error("dispatch_object.key.ext must be a numerical value")


    const dir_array = Keys.dir.split("/");

    const dir = (dir_array[dir_array.length - 1] == "*" || dir_array[dir_array.length - 1] == "") ?
        Keys.dir :
        dir_array.concat([""]).join("/");

    if (dir[dir.length - 1] == "*" && dir.length > 1) {
        SetDispatchMap(dir.slice(0, -1), dispatch_object, ext, DispatchMap)
    }

    SetDispatchMap(dir, dispatch_object, ext, DispatchMap);

    log(`Added Dispatch [${dispatch_object.name}]: \n   ${dispatch_object.description ? dispatch_object.description : "No Description"}`)

    return this;
}

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

function AddDefaultDispatch(dispatch_object, DispatchDefaultMap) {
    let Keys = dispatch_object.keys;
    let Name = dispatch_object.name;

    const ext = Keys.ext;
    const dir = Keys.dir;

    if (typeof(ext) !== "number")
        return log.error("dispatch_object.key.ext must be a numerical value")

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
