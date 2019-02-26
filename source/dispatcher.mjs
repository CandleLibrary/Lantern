import path from "path";
import ext_map from "./extension_map.mjs";
import default_dispatch from "./default_dispatch.mjs"

console.log(ext_map);
/* Routes HTTP request depending on active dispatch modules. */
const DispatchMap = new Map();
const DispatchRejectMap = new Map();

/** Error Messages ***/
const e0x101 = "Dispatch object must include a function member named 'respond'. Error missing dispatch_object.respond.";
const e0x102 = "Dispatch object must contain a set of dispatch keys. Error missing dispatch_object.keys.";
const e0x103 = "Dispatch object must have name. Error missing dispatch_object.name.";
const e0x104 = "Dispatch object name must be a string. Error dispatch_object.name is not a string value.";

/** Root dispatch function **/
export default async function dispatcher(req, res, meta){
	
	// Authenticated
	const _path = path.parse(req.url);
	const dir = (_path.dir == "/") ? "" : _path.dir ;
	const name = _path.name;
	const ext = _path.ext;
	let ext_flag = 0; // The "No Extension" value
	if(ext)
		ext_flag = ext_map[ext] || 0x80000000; // The "Any Extension" value;

	let extended_key = `${ext_flag.toString(16)}${dir}`;
	let base_key = `${ext_flag.toString(16)}`;

	let dispatch_object = DispatchMap.get(extended_key) || DispatchMap.get(base_key) || default_dispatch;
	console.log("b", dispatch_object)
	return await respond(dispatch_object, req, res, dir, name, ext, meta)
}

async function respond(do_, req, res, dir, name, ext, meta, response_code = 200){
	console.log("AASS",do_)
	switch(do_.response_type){

		case 0:
			return await do_.respond(req, res, dir, name, ext, meta);
		case 1:
		console.log("AAA")
			res.writeHead(response_code, {'content-type':do_.mime}); 
			res.end(do_.respond, "utf8",(err)=>{
				if(err)
					console.log(err)
			});
			return true;
	}
}

/** Root dispatch function **/
dispatcher.default = async function(code, req, res, meta){
	/** Extra Flags **/
	const _path = path.parse(req.url);
	const dir = (_path.dir == "/") ? "" : _path.dir ;
	const name = _path.name;
	const ext = _path.ext;
	let ext_flag = 1; // The "No Extension" value
	if(ext)
		ext_flag = ext_map[ext] || 0x80000000; // The "Any Extension" value;	

	let extended_key = `${ext_flag.toString(16)}${code}${dir}`;
	let base_key = `${ext_flag.toString(16)}${code}`;

	let dispatch_object = DispatchRejectMap.get(extended_key) || DispatchRejectMap.get(base_key) || default_dispatch;

	return await respond(dispatch_object, req, res, dir, name, ext, meta, dispatch_object.name);
}

export function AddDispatch(...dispatch_objects){
	
	for(let i = 0, l = dispatch_objects.length; i < l; i++){
		AddCustom(dispatch_objects[i]);
	}

	return this;
}

function AddCustom(dispatch_object){
	let Keys = dispatch_object.keys;
	let Name = dispatch_object.name;
	let Respond = dispatch_object.respond;

	dispatch_object.response_type = 0;

	if(typeof(Respond) !== "function"){
		if(typeof(Respond) == "string"){
			if(typeof(dispatch_object.mime) !== "string"){
				return console.error("Cannot use String based response type without a mime type definitions")
			}
			dispatch_object.response_type = 1;
		}else
			return console.error(e0x101)
	}

	if(typeof(Keys) == "undefined")
		return console.error(e0x102)

	if(typeof(Name) == "undefined")
		return console.error(e0x103)

	if(typeof(Name) !== "string"){
		if(typeof(Name) == "number"){
			return AddDefaultDispatch(dispatch_object);
		}
		return console.error(e0x104);
	}

	const ext = Keys.ext;
	const dir = Keys.dir;

	if(typeof(ext) !== "number")
		return console.error("dispatch_object.key.ext must be a numerical value")

	for(let i = 1; i !== 0x10000000; i = (i << 1)){
		
		if((ext & i)){
			let dispatch_key;
			if(dir == "*"){
				dispatch_key = `${i.toString(16)}`;
			}else{
				dispatch_key = `${i.toString(16)}${dir}`;
			}

			DispatchMap.set(dispatch_key, dispatch_object);
		}
	}

	return this;
}


function AddDefaultDispatch(dispatch_object){
	let Keys = dispatch_object.keys;
	let Name = dispatch_object.name;

	const ext = Keys.ext;
	const dir = Keys.dir;

	if(typeof(ext) !== "number")
		return console.error("dispatch_object.key.ext must be a numerical value")

	for(let i = 1; i !== 0x10000000; i = (i << 1)){
		
		if((ext & i)){
			let dispatch_key;
			if(dir == "*"){
				dispatch_key = `${i.toString(16)}${Name}`;
			}else{
				dispatch_key = `${i.toString(16)}${Name}${dir}`;
			}

			DispatchRejectMap.set(dispatch_key, dispatch_object);
		}
	}
}
