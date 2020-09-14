import path from "path";
import fs from "fs";
import ExtToMIME from "./ext_to_mime.js";
import URL from "@candlefw/url";
import { ToolSet, Dispatcher, RequestData, LanternServer } from "./types";
import http2 from "http2";
import http from "http";
import https from "https";
import { LanternConstructorOptions } from "./constructor_options.js";
import log, { setLogger, LanternLoggingOutput } from "./log.js";
import { createLanternServer } from "./createLanternServer.js";
import { ResponseFunction } from "./ResponseFunction.js";

const fsp = fs.promises;

const CWD = process.cwd();

/**
 * Contains helper functions and data pertaining
 * to a single request/response sequence. 
 */
export default abstract class LanternToolsBase implements ToolSet {
    static async createServer(config_options: LanternConstructorOptions, response_function: ResponseFunction<any>):
        Promise<LanternServer<any>> {
        return null;
    }

    static retrieveInstanceFromCache<T>(distribution_object: Dispatcher, data: RequestData, log: any, cstr: typeof LanternToolsBase): T {
        const cache = HTTPSToolSet.cache;

        let tool: T = null;

        //@ts-ignore
        if (cache) {
            //@ts-ignore
            tool = cache;
            //@ts-ignore
            HTTPSToolSet.cache = tool.next;
            //@ts-ignore
            tool.init(distribution_object, data, log);
        } else {
            tool = new (<any>cstr)(distribution_object, data, log);
        }

        if (tool == null)
            console.log({ cache });

        return tool;
    };

    static createToolbox(
        distribution_object: Dispatcher,
        data: RequestData,
        log: any
    ): LanternToolsBase {
        return null;
    }

    /** Hello World */
    type: "http2";

    protected do: Dispatcher;

    protected _ext: string;

    protected _log: any;

    protected _url: URL;

    protected pending_headers: [string, string][];

    protected next: LanternToolsBase;

    protected status_header_name: string;

    protected static cache: LanternToolsBase;
    constructor(
        distribution_object: Dispatcher,
        data: RequestData,
        log: any,
    ) {
        const url = data.url;

        this.do = null;
        this.next = null;
        this._url = null;
        this._log = null;
        this._ext = "";
        this.pending_headers = [];

        this.status_header_name = "status";
    }

    init(distribution_object: Dispatcher, data: RequestData, log: any) {
        const url = data.url;
        this.do = distribution_object;
        this._url = data.url;
        this._log = log;
        this._ext = (url) ? url.ext : "";
    }

    destroy() {
        //@ts-ignore
        this.next = this.constructor.cache;
        //@ts-ignore
        this.constructor.cache = this;

        this.pending_headers.length = 0;
        this.do = null;
        this._url = null;
        this._log = null;
        this._ext = "";
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


    setMIME(MIME?: string) {
        if (MIME === undefined)
            MIME = this.do.MIME ? this.do.MIME : "text/plain";

        this.pending_headers.push(["content-type", MIME.toString()]);
    }

    async respond() {

        let DISPATCH_SUCCESSFUL = false;

        try {
            if (typeof this.do.respond == "string") {
                return await this.sendUTF8String(this.do.respond);
            } else
                DISPATCH_SUCCESSFUL = await this.do.respond(this);
        } catch (e) {
            this._log.sub_error(`${this.do.name}: Response with dispatcher [${this.do.name}] failed: \n${e.stack}`);
        }

        return DISPATCH_SUCCESSFUL;
    }

    setMIMEBasedOnExt(ext = "") {
        let MIME = "text/plain";

        if (!this._ext)
            this._ext = ext;

        if (this._ext) {
            let mime = ExtToMIME[this._ext];
            if (mime) MIME = mime;
        }

        this.pending_headers.push(["content-type", MIME]);
    }

    error(error: any) {
        this._log.sub_error(this.do.name + ":", error);
        return false;
    }

    /**
     * Set the status code of the response
     * @param code 
     */
    setStatusCode(code = this.do.response_code || 200) {
        this.pending_headers.push([this.status_header_name, code + ""]);
    }

    setCookie(cookie_name: any, cookie_value: any) {
        this.pending_headers.push(["set-cookie", `${cookie_name}=${cookie_value}`]);
    }
    setHeader(key, value) {
        this.pending_headers.push([key + "", value]);
    }

    async getUTF8FromFile(file_path: string): Promise<string> {
        try {
            return await fsp.readFile(path.resolve(CWD, file_path), "utf8");
        } catch (e) {
            this._log.error(e);
            return "";
        }
    };

    abstract getHeader(header_name: string): string;

    abstract async sendUTF8FromFile(file_path: string): Promise<boolean>;

    abstract async sendUTF8String(str?: string): Promise<boolean>;

    abstract async sendRawStreamFromFile(file_path: string): Promise<boolean>;

    abstract redirect(new_url: string): boolean;

    abstract get method():
        "POST" | "PUT" | "GET" | "SET" | "DELETE" |
        "HEAD" | "OPTIONS" | "TRACE" | "PATCH" | "CONNECT";

    abstract async readData(): Promise<string>;

    abstract getCookie(name: string): string;

    abstract sendHeaders();
}


export interface HTTPS2RequestData extends RequestData {
    stream: http2.ServerHttp2Stream,
    headers: http2.IncomingHttpHeaders;
}

/**
 * Contains helper functions and data pertaining
 * to a single request/response sequence. 
 */
export class HTTPS2ToolSet extends LanternToolsBase {

    static createToolbox(distribution_object: Dispatcher, data: HTTPS2RequestData, log: any): HTTPS2ToolSet {
        return LanternToolsBase.retrieveInstanceFromCache<HTTPS2ToolSet>(distribution_object, data, log, HTTPS2ToolSet);
    };

    static async createServer(config_options: LanternConstructorOptions, response_function: ResponseFunction<http2.Http2Server>):
        Promise<LanternServer<http2.Http2Server>> {

        let IS_OPEN = false;

        const

            { host, port, server_name } = config_options,

            { key, cert } = (config_options?.secure || {}),

            options = Object.assign({}, config_options?.secure ? {
                key: key instanceof URL ? await key.fetchText() : key,
                cert: cert instanceof URL ? await cert.fetchText() : cert,
            } : {}),

            server = http2.createSecureServer(options),

            { lantern, DispatchDefaultMap, DispatchMap }
                = createLanternServer(server, () => IS_OPEN, async () => { server.close(); return true; });

        server.on("error", e => { console.log(e), log.error(e); IS_OPEN = false; });

        server.on("close", e => { console.log(e), log.error(e); IS_OPEN = false; });

        server.on("stream", (stream, headers) => {

            const url = new URL(headers[":scheme"] + "://" + headers[":authority"] + headers[":path"]);

            const request_data: HTTPS2RequestData = {
                url,
                stream,
                headers
            };

            response_function(HTTPS2ToolSet, request_data, DispatchMap, DispatchDefaultMap);
        });

        server.once("listening", _ => IS_OPEN = true);

        server.listen(port, host, () => { });

        log.verbose(`${server_name}: Using HTTPS/TLS secure protocol.`);

        return lantern;
    }


    protected data: any;
    protected meta: any;
    protected str: http2.ServerHttp2Stream;
    protected hdr: http2.IncomingHttpHeaders;

    constructor(distribution_object: Dispatcher, data: HTTPS2RequestData, log: any) {
        super(distribution_object, data, log);
        this.init(distribution_object, data, log);
    }

    init(distribution_object: Dispatcher, data: HTTPS2RequestData, log: any) {
        super.init(distribution_object, data, log);
        this.str = data.stream;
        this.hdr = data.headers;
        this.status_header_name = ":status";
    }

    destroy() {
        this.str = null;
        this.hdr = null;
        super.destroy();
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

    getCookie(cookie_name: string): string {
        return "";
    }

    sendHeaders() {
        const headers = this.pending_headers.reduce((r, v) => (r[v[0] + ""] = v[1], r), {});
        if (!this.str.closed)
            this.str.respond(headers);
    }

    getHeader(header_name: string) {
        return <string>this.hdr[header_name];
    }

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
}

export interface HTTPSRequestData extends RequestData {
    res: http.ServerResponse;
    req: http.IncomingMessage;
}


/**
 * Contains helper functions and data pertaining
 * to a single request/response sequence. 
 */
export class HTTPSToolSet extends LanternToolsBase {

    static createToolbox(distribution_object: Dispatcher, data: HTTPSRequestData, log: any): HTTPSToolSet {
        return LanternToolsBase.retrieveInstanceFromCache<HTTPSToolSet>(distribution_object, data, log, HTTPSToolSet);
    };

    static async createServer(config_options: LanternConstructorOptions, response_function: ResponseFunction<http2.Http2Server>):
        Promise<LanternServer<http2.Http2Server>> {

        let IS_OPEN = false;

        let DispatchMap = null, DispatchDefaultMap = null;

        const

            { host, port, server_name } = config_options,

            { key = null, cert = null } = (config_options?.secure || {}),

            options = Object.assign({}, config_options.secure ? {
                key: key instanceof URL ? await key.fetchText() : key,
                cert: cert instanceof URL ? await cert.fetchText() : cert,
            } : {}),

            server = (config_options?.secure ? https : http).createServer(options, (req, res) => {

                const
                    url = new URL(req.url),
                    request_data: HTTPSRequestData = {
                        url,
                        req,
                        res
                    };

                response_function(HTTPSToolSet, request_data, DispatchMap, DispatchDefaultMap);
            }),

            { lantern, DispatchDefaultMap: ddm, DispatchMap: dm }
                = createLanternServer(server, () => IS_OPEN, async () => { server.close(); return true; });

        DispatchMap = dm; DispatchDefaultMap = ddm;

        server.on("error", e => { console.log(e), log.error(e); IS_OPEN = false; });

        server.on("close", e => { console.log(e), log.error(e); IS_OPEN = false; });

        server.listen(port, host, () => { });

        server.once("listening", _ => IS_OPEN = true);

        log.verbose(`${server_name} started`);

        log.verbose(`HTTP server listening on interface ${host}:${port}`);

        if (config_options.secure)
            log.verbose(`${server_name}: Using HTTPS/TLS secure protocol.`);

        return lantern;
    }


    protected data: any;
    protected meta: any;
    protected res: http.ServerResponse;
    protected req: http.ClientRequest;

    constructor(distribution_object: Dispatcher, data: HTTPSRequestData, log: any) {
        super(distribution_object, data, log);
        this.init(distribution_object, data, log);
    }

    init(distribution_object: Dispatcher, data: HTTPSRequestData, log: any) {
        super.init(distribution_object, data, log);
        this.res = data.res;
        this.req = <http.ClientRequest><any>data.req;
    }

    destroy() {
        this.res = null;
        this.req = null;
        super.destroy();
    }

    async readData() {

        if (this.data)
            return this.data;

        return new Promise(res => {

            const req = this.req;

            let body = "";

            //@ts-ignore
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

    getCookie(cookie_name: string): string {
        return "";
    }

    sendHeaders() {
        for (const [key, val] of this.pending_headers)
            this.res.setHeader(key, val);
    }

    getHeader(header_name: string) {
        return <string>this.req.getHeader(header_name);
    }

    async sendUTF8FromFile(file_path: string): Promise<boolean> {

        const loc = path.isAbsolute(file_path) ? file_path : path.join(CWD, file_path);

        try {
            const str = await fsp.readFile(loc, "utf8");
            this.sendHeaders();
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
            this.sendHeaders();
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

        stream.on("open", _ => {
            this.sendHeaders();
        });

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

    redirect(new_url: string) {

        if (new_url + "" == this._url + "") {
            log.sub_error(`No difference between redirected URL ${new_url} and original request URL.`);
            return false;
        }

        this.res.writeHead(301, { Location: new_url + "" });

        this.res.end();

        return true;
    }

    get method(): HTTP_METHOD {
        return <HTTP_METHOD>this.getHeader("method");
    }
}

type HTTP_METHOD = "POST" | "PUT" | "GET" | "SET" | "DELETE" |
    "HEAD" | "OPTIONS" | "TRACE" | "PATCH" | "CONNECT";