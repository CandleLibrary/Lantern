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
"aspx",
"php"
]
	
const ext_map = common_extension.reduce((a, e, i) =>(a[e] = 1<<(i), a), {});
ext_map.any = 0x80000000;

export default ext_map;
