import path from "path";
import fs from "fs";
import log from "./log.js";
import ExtToMIME from "./ext_to_mime.js";
import URL from "@candlefw/url";
import { Tools, Dispatcher } from "./types";
import http from "http";

const fsp = fs.promises;

const CWD = process.cwd();

/**
 * Contains helper functions and data pertaining
 * to a single request/response sequence. 
 */
export default class LanternTools implements Tools {

    private res: http.ServerResponse;
    private req: http.ClientRequest;
    private next: LanternTools;
    private do: any;

    private _url: URL;
    private _ext: string;
    private data: any;
    private meta: any;

    private static cache: LanternTools;


    constructor(
        distribution_object: Dispatcher,
        req: http.ClientRequest,
        res: http.ServerResponse,
        meta: any,
        url: URL
    ) {
        let tool: LanternTools;

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
        tool._url = url;
        tool._ext = (url) ? url.ext : "";
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
        this._url = null;
    }

    async readData() {

        if (this.data)
            return this.data;

        return new Promise(res => {

            const req = this.req;

            let body = "";

            req.setEncoding('utf8');

            req.on("data", d => {
                body += d;
            });

            req.on("end", () => {
                this.data = body;
                res();
            });
        });
    }



    async respond() {

        let DISPATCH_SUCCESSFUL = false;

        try {
            DISPATCH_SUCCESSFUL = await this.do.respond(this);
        } catch (e) {
            log.sub_error(`Response with dispatcher [${this.do.name}] failed: \n${e.stack}`);
        }

        return DISPATCH_SUCCESSFUL;
    }

    /**
     * Returns and object of the request data parsed as 
     * a JSON object.
     */
    async getJSONasObject() {

        try {
            if (this.data)
                return JSON.parse(await this.readData());
        } catch (e) {
            log.error(e);
            return {};
        }
    }

    getCookie() {

    }

    setMIME(MIME?: string) {
        if (MIME === undefined)
            MIME = this.do.MIME ? this.do.MIME : "text/plain";
        this.res.setHeader("content-type", MIME.toString());
    }

    setMIMEBasedOnExt(ext = "") {
        let MIME = "text/plain";

        if (!this._ext)
            this._ext = ext;

        if (this._ext) {
            let mime = ExtToMIME[this._ext];
            if (mime) MIME = mime;
        }

        this.res.setHeader("content-type", MIME);
    }

    /**
     * Set the status code of the response
     * @param code 
     */
    setStatusCode(code = this.do.response_code || 200) {
        this.res.statusCode = (code);
    }

    setCookie(cookie_name: any, cookie_value: any) {
        this.res.setHeader("set-cookie", `${cookie_name}=${cookie_value}`);
    }

    getHeader(header_name: string) {
        return <string>this.req.getHeader(header_name);
    }

    async getUTF8FromFile(file_path: string): Promise<string> {
        try {
            return await fsp.readFile(path.join(CWD, file_path), "utf8");
        } catch (e) {
            log.error(e);
            return "";
        }
    };

    async sendUTF8FromFile(file_path: string): Promise<boolean> {

        const loc = path.isAbsolute(file_path) ? file_path : path.join(CWD, file_path);

        try {
            const str = await fsp.readFile(loc, "utf8");
            this.res.write(str, "utf8");
            this.res.end();
            log.sub_message(`Responding with utf8 encoded data from file ${loc}`);
            return true;
        } catch (e) {
            log.sub_error(e.stack);
            return false;
        }
    };

    async sendUTF8String(str: string = <string>this.do.respond): Promise<boolean> {
        try {
            this.res.write(str, "utf8");
            this.res.end();
            log.sub_message(`Responding with utf8 string`);
        } catch (e) {
            log.sub_error(e);
            return false;
        }

        return true;
    };

    async sendRawStreamFromFile(file_path: string): Promise<boolean> {
        const loc = path.isAbsolute(file_path) ? file_path : path.join(CWD, file_path);

        log.sub_message(`Responding with raw data stream from file ${loc} by dispatcher [${this.do.name}]`);

        //open file stream

        const stream = fs.createReadStream(loc);

        stream.on("data", buffer => {
            this.res.write(buffer);
        });

        return await <Promise<boolean>>(new Promise(resolve => {
            stream.on("end", () => {
                this.res.end();
                stream.close();
                resolve(true);
            });
            stream.on("error", e => {
                log.error((e));
                stream.close();
                resolve(false);
            });
        })).catch(e => {
            log.sub_error(e);
            stream.close();
            return false;
        });
    };
    get filename(): string {
        return this._url.filename;
    }

    get file(): string {
        return this._url.file;
    }

    get pathname(): string {
        return this._url.pathname;
    }

    get dir(): string {
        return this._url.dir;
    }

    get url(): URL {
        return new URL(this._url);
    }

    get ext(): string {
        return this._ext;
    }

    redirect(new_url: string) {

        if (new_url + "" == this._url + "") {
            log.sub_error(`No difference between redirected URL ${new_url} and original request URL.`);
            return false;
        }

        this.res.writeHead(301, { Location: new_url + "" });

        this.res.end();

        return true;
    }

    error(error: any) {
        log.sub_error(error);
        return false;
    }
}

//@ts-ignore
LanternTools.cache = new LanternTools();