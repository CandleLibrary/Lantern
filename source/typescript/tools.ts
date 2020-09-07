import path from "path";
import fs from "fs";
import ExtToMIME from "./ext_to_mime.js";
import URL from "@candlefw/url";
import { Tools, Dispatcher } from "./types";
import http2 from "http2";

const fsp = fs.promises;

const CWD = process.cwd();

/**
 * Contains helper functions and data pertaining
 * to a single request/response sequence. 
 */
export default class LanternTools implements Tools {

    private str: http2.ServerHttp2Stream;
    private hdr: http2.IncomingHttpHeaders;
    private next: LanternTools;
    private do: any;

    private _url: URL;
    private _ext: string;
    private data: any;
    private meta: any;

    private _log: any;

    private static cache: LanternTools;

    private headers: any[];


    constructor(
        distribution_object: Dispatcher,
        stream: http2.ServerHttp2Stream,
        headers: http2.IncomingHttpHeaders,
        url: URL,
        log: any,
    ) {
        let tool: LanternTools;

        if (LanternTools.cache) {
            tool = LanternTools.cache;
            LanternTools.cache = tool.next;
        } else {
            tool = this;
            tool.headers = [];
        }

        tool.do = distribution_object;
        tool.hdr = headers;
        tool.str = stream;
        tool.next = null;
        tool._url = url;
        tool._log = log;
        tool._ext = (url) ? url.ext : "";
        tool.data = null;

        return tool;
    }

    destroy() {
        this.next = LanternTools.cache;
        LanternTools.cache = this;
        this.do = null;
        this.str = null;
        this.hdr = null;
        this._url = null;
        this.headers.length = 0;
    }

    async readData() {

        if (this.data) return this.data;

        return new Promise(res => {

            const str = this.str;

            let body = "";

            str.setEncoding(`utf8`);

            str.on("data", d => {
                body += d;
            });

            str.on("end", d => {
                this.data = body;

                res(this.data);

            });
        });
    }



    async respond() {

        let DISPATCH_SUCCESSFUL = false;

        try {
            DISPATCH_SUCCESSFUL = await this.do.respond(this);
        } catch (e) {
            this._log.sub_error(`${this.do.name}: Response with dispatcher [${this.do.name}] failed: \n${e.stack}`);
        }

        return DISPATCH_SUCCESSFUL;
    }

    /**
     * Returns and object of the request data parsed as 
     * a JSON object.
     */
    async getJSONasObject() {

        try {
            const data = await this.readData();

            if (data)
                return JSON.parse(data);
            else
                return null;
        } catch (e) {
            this._log.error(e);
            return {};
        }
    }

    getCookie() {

    }

    setMIME(MIME?: string) {
        if (MIME === undefined)
            MIME = this.do.MIME ? this.do.MIME : "text/plain";

        this.headers.push(["content-type", MIME.toString()]);
    }

    setMIMEBasedOnExt(ext = "") {
        let MIME = "text/plain";

        if (!this._ext)
            this._ext = ext;

        if (this._ext) {
            let mime = ExtToMIME[this._ext];
            if (mime) MIME = mime;
        }

        this.headers.push(["content-type", MIME]);
    }

    /**
     * Set the status code of the response
     * @param code 
     */
    setStatusCode(code = this.do.response_code || 200) {
        this.headers.push([":status", code]);
    }

    setCookie(cookie_name: any, cookie_value: any) {
        this.headers.push(["set-cookie", `${cookie_name}=${cookie_value}`]);
    }

    sendHeaders() {
        const headers = this.headers.reduce((r, v) => (r[v[0] + ""] = v[1], r), {});
        if (!this.str.closed)
            this.str.respond(headers);
    }

    setHeader(key, value) {
        this.headers.push([key + "", value]);
    }

    getHeader(header_name: string) {
        return <string>this.hdr[header_name];
    }

    async getUTF8FromFile(file_path: string): Promise<string> {
        try {
            return await fsp.readFile(path.resolve(CWD, file_path), "utf8");
        } catch (e) {
            this._log.error(e);
            return "";
        }
    };

    async sendUTF8FromFile(file_path: string): Promise<boolean> {

        const loc = path.isAbsolute(file_path) ? file_path : path.join(CWD, file_path);

        try {
            const str = await fsp.readFile(loc, "utf8");
            this.sendHeaders();
            this.str.write(str, "utf8");
            this.str.end();
            this._log.sub_message(`${this.do.name}: Responding with utf8 encoded data from file ${loc}`);
            return true;
        } catch (e) {
            this._log.sub_error(e.stack);
            return false;
        }
    };

    async sendUTF8String(str: string = <string>this.do.respond): Promise<boolean> {
        try {
            this.sendHeaders();
            this.str.write(str, "utf8");
            this.str.end();
            this._log.sub_message(`${this.do.name}: Responding with utf8 string`);
            return true;
        } catch (e) {
            this._log.sub_error(e);
            return false;
        }
    };

    async sendRawStreamFromFile(file_path: string): Promise<boolean> {
        const loc = path.isAbsolute(file_path) ? file_path : path.join(CWD, file_path);

        //open file stream
        const stream = fs.createReadStream(loc);

        return await <Promise<boolean>>(new Promise(resolve => {

            stream.on("open", (fd) => {
                this.sendHeaders();
            });

            stream.on("data", buffer => {
                this.str.write(buffer);
            });

            stream.on("end", () => {
                this.str.end();
                stream.close();
                resolve(true);
                this._log.sub_message(`${this.do.name}: Responding with raw data stream from file ${loc} by dispatcher [${this.do.name}]`);
            });
            stream.on("error", e => {
                this._log.sub_error(this.do.name + ":", e);
                stream.close();
                resolve(false);
            });
        })).catch(e => {
            this._log.sub_error(this.do.name + ":", e);
            stream.close();
            return false;
        });
    };

    redirect(new_url: string) {

        if (new_url + "" == this._url + "") {
            this._log.sub_error(`${this.do.name}: No difference between redirected URL ${new_url} and original request URL.`);
            return false;
        }

        this.setStatusCode(301);

        this.setHeader("Location", new_url + "");

        this.sendHeaders();

        this.str.end();

        return true;
    }

    log(...v) {
        this._log.sub_message(...v);
    }

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

    get method():
        "POST" | "PUT" | "GET" | "SET" | "DELETE" |
        "HEAD" | "OPTIONS" | "TRACE" | "PATCH" | "CONNECT" {
        switch (this.hdr[":method"]) {
            case "HEAD": return "HEAD";
            case "PUT": return "PUT";
            case "GET": return "GET";
            case "SET": return "SET";
            case "DELETE": return "DELETE";
            case "CONNECT": return "CONNECT";
            case "OPTIONS": return "OPTIONS";
            case "TRACE": return "TRACE";
            case "PATCH": return "PATCH";
            case "POST": return "POST";
            default: return "GET";
        }
    }

    error(error: any) {
        this._log.sub_error(this.do.name + ":", error);
        return false;
    }
}

//@ts-ignore
LanternTools.cache = new LanternTools();