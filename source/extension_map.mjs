const common_extension = 
[
"none",
"html",
"xhtml",
"xml",
"svg",
"css",
"sass",
"json",
"js",
"png",
"jpg",
"tif",
"gif",
"php"
]
	
const ext_map = common_extension.reduce((a, e, i) =>(a[e] = 1<<(i), a), {});
ext_map.any = 0x80000000;
ext_map.all = 0xFFFFFFFF

let key_offset = common_extension.length;

export function addKey(key, ext_map){
	if(!ext_map[key] && key_offset < 31){
		ext_map[key] = 1<<key_offset++;
		console.log(`Added new extension ${key} with value ${ext_map[key]}`)
	}


	return ext_map[key] || 0xFFFFFFFF;
}

export default ext_map;
