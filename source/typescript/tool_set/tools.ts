import path from "path";
import fs from "fs";
import ExtToMIME from "../extension/ext_to_mime.js";
import URL from "@candlelib/uri";
import { ToolSet, Dispatcher } from "../types/types";
import { RequestData } from "../types/request_data";
import { LanternServer } from "../types/lantern_server";
import { LanternConstructorOptions } from "../types/constructor_options.js";
import { ResponseFunction } from "../types/response_function.js";

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
        const cache = cstr.cache;

        let tool: T = null;

        //@ts-ignore
        if (cache) {
            //@ts-ignore
            tool = cache;
            //@ts-ignore
            cstr.cache = tool.next;
            //@ts-ignore
            tool.init(distribution_object, data, log);
        } else {
            tool = new (<any>cstr)(distribution_object, data, log);
        }

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
            this.error(e);
            return {};
        }
    }

    log(...v) {
        this._log.sub_message(`[${this.do.name || "null"}]`, ...v);
    }

    error(error_message: any, e: Error = null) {
        if (e)
            this._log.sub_error(this.do.name + ":", error_message, e.stack);
        else
            this._log.sub_error(this.do.name + ":", error_message);
        return false;
    }
    /**
     * The root directory from which Lantern can access and 
     * serve files. 
     */
    get cwd() {
        return this.do.cwd;
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
                DISPATCH_SUCCESSFUL = await (<any>this.do.respond)(this);
        } catch (e) {
            this.error(`Response with dispatcher [${this.do.name}] failed`, e);
        }

        return DISPATCH_SUCCESSFUL;
    }

    setMIMEBasedOnExt(ext = this._ext) {
        let MIME = "text/plain";

        if (!this._ext)
            this._ext = ext;

        if (this._ext) {
            let mime = ExtToMIME[this._ext];
            if (mime) MIME = mime;
        }

        this.pending_headers.push(["content-type", MIME]);
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
            this.error("Could not load file:" + file_path, e);
            return "";
        }
    };

    abstract getHeader(header_name: string): string;

    abstract sendUTF8FromFile(file_path: string): Promise<boolean>;

    abstract sendUTF8String(str?: string): Promise<boolean>;

    abstract sendRawStreamFromFile(file_path: string): Promise<boolean>;

    abstract sendRawStream(buffer?: ArrayBuffer | Buffer): Promise<boolean>;

    abstract redirect(new_url: string): boolean;

    abstract get method():
        "POST" | "PUT" | "GET" | "SET" | "DELETE" |
        "HEAD" | "OPTIONS" | "TRACE" | "PATCH" | "CONNECT";

    abstract readData(): Promise<string>;

    abstract getCookie(name: string): string;

    abstract sendHeaders();
}



