import lier from "./source/main.mjs";
import fs from "fs";

lier.addDispatch(
	{
		name:"Test Dispatch",
		respond : async function(req, res, dir, name, ext){
			return false;
		},
		keys : {ext:0xFFFFFFFF, dir:"*"}
	},
	{
		name: 404,
		mime: "text/html",
		respond: fs.readFileSync("./test/src/404.html", "utf8"),
		keys: {ext:0xFFFFFFFF, dir:"*"}
	}
)

lier({port:8080});