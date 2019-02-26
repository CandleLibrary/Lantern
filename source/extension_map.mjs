const common_extension = 
[
"any",
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
"php"]
	
const ext_map = common_extension.reduce((a, e, i) =>(a[e] = 1<<(i), a), {});

export default ext_map;