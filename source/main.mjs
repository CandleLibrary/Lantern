import http from "http";
import dispatcher from "./dispatcher.mjs";
import {AddDispatch} from "./dispatcher.mjs";

export default function lier(config = {}){

	//Using port 80 by default
	config.port = config.port || 80;

	const server = http.createServer(async (request, response) =>{
		
		const meta = {authorized:false};

		try{
				if(!(await dispatcher(request, response, meta))){
					dispatcher.default(404, request, response, meta)
				}
			}catch(e){
				console.log(e);
				dispatcher.default(404, request, response, meta)
			}
	})

	server.listen(config.port, err =>{
		if(err)console.error(err);
	})

	return lier;
}

lier.addDispatch = AddDispatch.bind(lier);

/** Defualt responses **/

async function LoadData(){
	let $404 = (await import("./data/404.data.mjs")).default;

	lier.addDispatch({
		name: 404,
		mime: "text/html",
		respond: $404,
		keys: {ext:0xFFFFFFFF, dir:"*"}
	})
}

LoadData();


