import URL from "@candlelib/uri";
import fs from "fs";
import http2 from "http2";
import path from "path";

import { LanternConstructorOptions } from "../types/constructor_options.js";
import { HTTPS2RequestData } from "../types/http2_request_data";
import { LanternServer } from "../types/lantern_server";
import { ResponseFunction } from "../types/response_function.js";
import { Dispatcher } from "../types/types";

import { createLanternServer } from "../utils/create_lantern_server.js";
import LanternToolsBase from "./tools.js";

const
    fsp = fs.promises,
    CWD = process.cwd();
/**
 * Contains helper functions and data pertaining
 * to a single request/response sequence.
 */

export class HTTPS2ToolSet extends LanternToolsBase {


    static createToolbox(distribution_object: Dispatcher, data: HTTPS2RequestData, log: any): HTTPS2ToolSet {
        return LanternToolsBase.retrieveInstanceFromCache<HTTPS2ToolSet>(distribution_object, data, log, HTTPS2ToolSet);
    };


    static async createServer(config_options: LanternConstructorOptions, response_function: ResponseFunction<http2.Http2Server>): Promise<LanternServer<http2.Http2Server>> {

        let IS_OPEN = false;

        const

            { host, port, server_name } = config_options,

            { key, cert } = (config_options?.secure || {}),

            options = Object.assign({}, config_options?.secure ? {
                key: key instanceof URL ? await key.fetchText() : key,
                cert: cert instanceof URL ? await cert.fetchText() : cert,
            } : {}),

            server = http2.createSecureServer(options),

            { lantern, DispatchDefaultMap, DispatchMap, log_queue } = createLanternServer(config_options, server, () => IS_OPEN, async () => { server.close(); return true; });

        server.on("error", e => { console.log(e), log_queue.createLocalLog("Error").message(e).delete(); IS_OPEN = false; });

        server.on("close", e => { console.log(e), log_queue.createLocalLog("General").message(e).delete(); IS_OPEN = false; });

        server.on("stream", (stream, headers) => {

            const url = new URL(headers[":scheme"] + "://" + headers[":authority"] + headers[":path"]);

            const request_data: HTTPS2RequestData = {
                url,
                stream,
                headers
            };

            response_function(HTTPS2ToolSet, request_data, log_queue, DispatchMap, DispatchDefaultMap);
        });

        server.once("listening", _ => IS_OPEN = true);

        server.listen(port, host, () => { });



        log_queue.createLocalLog("General").message(`${server_name}: Using HTTPS/TLS secure protocol.`).delete();

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
        this.data = null;
        super.destroy();
    }


    async readData() {

        if (this.data)
            return this.data;

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
            this.log(`Responding with utf8 encoded data from file ${loc}`);
            return true;
        }
        catch (e) {
            this._log.sub_error(e.stack);
            return false;
        }
    };


    async sendUTF8String(str: string = <string>this.do.respond): Promise<boolean> {
        try {
            this.sendHeaders();
            this.str.write(str, "utf8");
            this.str.end();
            this.log(`Responding with utf8 string`);
            return true;
        }
        catch (e) {
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
                this.log(`Responding with raw data stream from file ${loc} by dispatcher [${this.do.name}]`);
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
