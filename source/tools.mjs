import path from "path";
import fs from "fs";
import log from "./log.mjs";

const fsp = fs.promises;

const PWD = process.env.PWD;

export default class LierTools {
    constructor(distribution_object, req, res, meta, fn, dir, ext) {
        let tool;

        if (LierTools.cache) {
            tool = LierTools.cache;
            LierTools.cache = tool.next;
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
        this.next = LierTools.cache;
        LierTools.cache = this;

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

    setStatusCode(code = 200) {
        this.res.statusCode = (code);
    }

    async sendUTF8(file_path) {
        try {
            let data = await fsp.readFile(path.join(PWD, file_path), "utf8");
            this.res.end(data, "utf8");
        } catch (e) {
            log.error(e);
            return false;
        }

        return true;
    }

    get filename(){
    	return ([this.fn, ".", this.ext]).join("");
    }
}

LierTools.cache = new LierTools()
