import path from "path";
import fs from "fs";
import log from "./log.mjs";
import ExtToMIME from "./ext_to_mime.mjs"

const fsp = fs.promises;

const PWD = process.cwd();

export default class LanternTools {
    constructor(distribution_object, req, res, meta, url) {
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
        tool.meta = meta;
        tool.next = null;
        tool.url = url;
        tool.ext = (url) ? url.ext : "";
        tool.data = null;

        return tool;
    }

    destroy() {
        this.next = LanternTools.cache;
        LanternTools.cache = this;
        this.do = null;
        this.res = null;
        this.req = null;
        this.meta = null;
        this.url = null;
    }

    async readData() {

        if(this.data)
            return this.data;

        return new Promise(res => {

            const req = this.req;

            let body = "";

            req.setEncoding('utf8');

            req.on("data", d => {
                body += d;
            })

            req.on("end",()=>{
                this.data = body;
                res();   
            });
        })
    }

    async getJSONasObject() {
        const data = await this.readData();

        try {
            if (this.data)
                return JSON.parse(this.data)
        } catch (e) {
            log.error(e);
            return {};
        }
    }

    getCookie() {

    }

    setMIME(MIME) {
        if (MIME === undefined)
            MIME = this.do.MIME ? this.do.MIME : "text/plain";
        this.res.setHeader("content-type", MIME.toString());
    }

    setMIMEBasedOnExt(ext = "") {
        let MIME = "text/plain";

        if (!this.ext)
            this.ext = ext;

        if (this.ext) {
            let mime = ExtToMIME[this.ext];
            if (mime) MIME = mime;
        }

        this.res.setHeader("content-type", MIME);
    }

    setStatusCode(code = 200) {
        this.res.statusCode = (code);
    }

    setCookie(cookie_name, cookie_value) {
        this.res.setHeader("set-cookie", `${cookie_name}=${cookie_value}`);
    }

    getHeader(header_name) {
        return this.req.headers[header_name];
    }

    async redirect(url) {
        this.res.statusCode = 301;
        this.res.setHeader("location", url);
        this.res.end();
        return true;
    }

    async getUTF8(file_path) {
        try {
            return await fsp.readFile(path.join(PWD, file_path), "utf8");
        } catch (e) {
            log.error(e);
            return "";
        }
    }

    async sendRaw(file_path) {
        const loc = path.join(PWD, file_path);

        log.verbose(`Responding with raw data stream from file ${file_path} by dispatcher [${this.do.name}]`)

        //open file stream


        const stream = fs.createReadStream(loc);


        stream.on("data", buffer => {
            this.res.write(buffer);
        })

        return await (new Promise(resolve => {
            stream.on("end", () => {
                this.res.end();
                resolve(true);
            })
            stream.on("error", e => {
                resolve(false);
            })
        })).catch(e => {
            console.log("thrown:1", e)
        })
    }

    async sendUTF8(file_path) {
        try {
            log.verbose(`Responding with utf8 encoded data from file ${file_path} by dispatcher [${this.do.name}]`)
            this.res.end(await fsp.readFile(path.join(PWD, file_path), "utf8"), "utf8");
        } catch (e) {
            return false;
        }

        return true;
    }

    async sendString(string) {
        this.res.end(string, "utf8");
        return true;
    }

    get filename() {
        return this.url.filename;
    }

    get file() {
        return this.url.file;
    }

    get pathname() {
        return this.url.pathname;
    }

    get dir() {
        return this.url.dir;
    }

    redirect(new_url){
        this.res.writeHead(301, {Location: new_url + ""})
        this.res.end();
        return true;
    }

    async respond(){

        let DISPATCH_SUCCESSFUL = false;

        try{
            DISPATCH_SUCCESSFUL  = await this.do.respond(this);
        }catch(e){
            log.error(`Response with dispatcher [${this.do.name}] failed: \n${e.stack}`);
        }

        return DISPATCH_SUCCESSFUL;
    }

    error(error){
        console.log(error);
        return false;
    }
}

LanternTools.cache = new LanternTools()