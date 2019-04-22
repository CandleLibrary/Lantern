import path from "path";
import log from "./log.mjs";
import ext_map from "./extension_map.mjs";
import default_dispatch from "./default_dispatch.mjs"
import LanternTools from "./tools.mjs";
import url from "url";

/* Routes HTTP request depending on active dispatch modules. */
const DispatchMap = new Map();
const DispatchDefaultMap = new Map();

/** Error Messages ***/
const e0x101 = "Dispatch object must include a function member named 'respond'. Error missing dispatch_object.respond.";
const e0x102 = "Dispatch object must contain a set of dispatch keys. Error missing dispatch_object.keys.";
const e0x103 = "Dispatch object must have name. Error missing dispatch_object.name.";
const e0x104 = "Dispatch object name must be a string. Error dispatch_object.name is not a string value.";

async function respond(d_objs, req, res, dir, name, ext, meta, response_code = 200) {

    for (let i = 0; i < d_objs.length; i++) {
        let do_ = d_objs[i];

        switch (do_.response_type) {

            case 0:
                const tools = new LanternTools(do_, req, res, meta, name, dir, ext);
                const result = await do_.respond(tools);
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
export default async function dispatcher(req, res, meta) {

    // Authenticated
    const url_path = url.parse(req.url).pathname;
    const _path = path.parse(url_path);
    const dir = (req.url == "/") ? "/" : _path.dir;
    const name = _path.name;
    const ext = _path.ext.slice(1);
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

    log.verbose(`Received request for "${req.url}", responding with dispatcher${dispatch_object.length > 1 ? "s": ""} ${dispatch_object.map(d=>d.name).join(", ")}`)

    return await respond(dispatch_object, req, res, dir, name, ext, meta)
}



/** Root dispatch function **/
dispatcher.default = async function(code, req, res, meta) {
    /** Extra Flags **/
    const _path = path.parse(req.url);
    const dir = (req.url == "/") ? "/" : _path.dir;
    const name = _path.name;
    const ext = _path.ext.slice(1);
    let ext_flag = 1; // The "No Extension" value
    if (ext)
        ext_flag = ext_map[ext] || 0x8000000; // The "Any Extension" value; 

    let extended_key = `${ext_flag.toString(16)}${code}${dir}`;
    let base_key = `${ext_flag.toString(16)}${code}`;

    let dispatch_object = DispatchDefaultMap.get(extended_key) || DispatchDefaultMap.get(base_key) || default_dispatch;

    log.verbose(`Responding to request for "${req.url}" with code ${code}, using dispatcher ${dispatch_object.name}`)

    return await respond([dispatch_object], req, res, dir, name, ext, meta, dispatch_object.name);
}

export function AddDispatch(...dispatch_objects) {

    for (let i = 0, l = dispatch_objects.length; i < l; i++) {
        AddCustom(dispatch_objects[i]);
    }

    return this;
}

function AddCustom(dispatch_object) {
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
            return log.error(e0x101)
    }

    if (typeof(Keys) == "undefined")
        return log.error(e0x102)

    if (typeof(Name) == "undefined")
        return log.error(e0x103)

    if (typeof(Name) !== "string") {
        if (typeof(Name) == "number") {
            return AddDefaultDispatch(dispatch_object);
        }
        return log.error(e0x104);
    }

    const ext = Keys.ext;

    if (typeof(ext) !== "number")
        return log.error("dispatch_object.key.ext must be a numerical value")


    const dir_array = Keys.dir.split("/");

    const dir = (dir_array[dir_array.length - 1] == "*" || dir_array[dir_array.length - 1] == "") ?
        Keys.dir :
        dir_array.concat([""]).join("/");

    if (dir[dir.length - 1] == "*" && dir.length > 1) {
        SetDispatchMap(dir.slice(0, -1), dispatch_object, ext)
    }

    SetDispatchMap(dir, dispatch_object, ext);

    return this;
}

function SetDispatchMap(dir, dispatch_object, ext) {
    console.log(dir)
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


function AddDefaultDispatch(dispatch_object) {
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
