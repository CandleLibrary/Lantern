
const default_dispatch = {
	name:"Defualt Dispatch",
	default_dir : "./",
	respond : async function(req, res, name, ext, dispatch){
		return false
	},
	key : {ext_mask:0xFFFFFFFF, dir:"."}
}

export default default_dispatch;