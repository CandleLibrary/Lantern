import path from "path";
import fs from "fs";
import log from "./log.mjs";
import ExtToMIME from "./ext_to_mime.mjs"

const fsp = fs.promises;

const PWD = process.env.PWD;

export default class LanternTools {
    constructor(distribution_object, req, res, meta, fn, dir, ext) {
        let tool;

        if (LanternTools.cache) {
            tool = LanternTools.cache;
            LanternTools.cache = tool.next;
        } else {
            tool = this;
        }

        tool.do = distribution_object;
        tool.req = req;
        tool.res = res;
        this.meta = meta;
        tool.next = null;
        tool.fn = fn;
        tool.ext = ext;
        tool.dir = dir;

        return tool;
    }

    destroy() {
        this.next = LanternTools.cache;
        LanternTools.cache = this;

        this.do = null;
        this.res = null;
        this.req = null;
        this.meta = null;
        this.fn = null;
        this.ext = null;
        this.dir = null;
    }

    setMIME(MIME = "text/plain") {
        MIME = this.do.MIME ? this.do.MIME : MIME;
        this.res.setHeader("content-type", MIME);
    }

    setMIMEBasedOnExt(){
    	let MIME = "text/plain"; 

    	if(this.ext) {
    		let mime = ExtToMIME[this.ext];
    		if(mime) MIME = mime;
    	}

    	this.res.setHeader("content-type", MIME);
    }

    setStatusCode(code = 200) {
        this.res.statusCode = (code);
    }

    async getUTF8(file_path){
        try {
            return await fsp.readFile(path.join(PWD, file_path), "utf8");
        } catch (e) {
            log.error(e);
            return "";
        }
    }

    async sendUTF8(file_path) {
        try {
            let data = await fsp.readFile(path.join(PWD, file_path), "utf8");
            log.verbose(`Responding with utf8 encoded data from file ${file_path} by dispatcher ${this.do.name}`)
            this.res.end(data, "utf8");
        } catch (e) {
            log.error(e);
            return false;
        }

        return true;
    }

    async sendString(string){
    	this.res.end(string, "utf8");
    	return true;
    }

    get filename(){
    	return ([this.fn, ".", this.ext]).join("");
    }
}

LanternTools.cache = new LanternTools()
