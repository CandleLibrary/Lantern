import URL from "@candlelib/uri";

import fs from "fs";
import http from "http";
import http2 from "http2";
import https from "https";
import path from "path";

import { LanternConstructorOptions } from "../types/constructor_options.js";
import { HTTP_METHOD } from "../types/http_method";
import { HTTPSRequestData } from "../types/http_request_data";
import { LanternServer } from "../types/lantern_server";
import { ResponseFunction } from "../types/response_function.js";
import { Dispatcher } from "../types/types";
import { createLanternServer } from "../utils/create_lantern_server.js";
import LanternToolsBase from "./tools.js";
/**
 * Contains helper functions and data pertaining
 * to a single request/response sequence.
 */

const
    fsp = fs.promises,
    CWD = process.cwd();

export class HTTPSToolSet extends LanternToolsBase {


    static createToolbox(distribution_object: Dispatcher, data: HTTPSRequestData, log: any): HTTPSToolSet {
        return LanternToolsBase.retrieveInstanceFromCache<HTTPSToolSet>(distribution_object, data, log, HTTPSToolSet);
    };


    static async createServer(config_options: LanternConstructorOptions, response_function: ResponseFunction<http2.Http2Server>):
        Promise<LanternServer<http2.Http2Server>> {

        let IS_OPEN = false;
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

                response_function(HTTPSToolSet, request_data, log_queue, DispatchMap, DispatchDefaultMap);
            }),

            { lantern, DispatchDefaultMap, DispatchMap, log_queue } = createLanternServer(config_options, server, () => IS_OPEN, async () => { server.close(); return true; });

        server.on("error", e => { console.log(e), log_queue.createLocalLog("Error").message(e).delete(); IS_OPEN = false; });

        server.on("close", e => { console.log(e), log_queue.createLocalLog("General").message(e).delete(); IS_OPEN = false; });

        server.listen(port, host, () => { });

        server.once("listening", _ => IS_OPEN = true);

        const log = log_queue.createLocalLog("General");

        log.message(`${server_name} started`);

        log.sub_message(`HTTP server listening on interface ${host}:${port}. Visit http://${host}:${port} to view site`);

        if (config_options.secure)
            log.sub_message(`${server_name}: Using HTTPS/TLS secure protocol.`);

        log.delete();

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
        this.data = null;
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
                res(this.data);
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
            this.log(`Responding with utf8 encoded data from file ${loc}`);
            return true;
        }
        catch (e) {
            this._log.sub_error(e.stack);
            return false;
        }
    };


    async sendUTF8String(str: string = <string>this.do.respond): Promise<boolean> {

        if (str === null || str === undefined) return false;

        try {
            this.sendHeaders();
            this.res.write(str, "utf8");
            this.res.end();
            this.log(`Responding with utf8 string`);
        }
        catch (e) {
            this._log.sub_error(e);
            return false;
        }

        return true;
    };

    async sendRawStream(buffer: (Buffer | ArrayBuffer) = <Buffer | ArrayBuffer><any>this.do.respond): Promise<boolean> {

        if (buffer == null || buffer.byteLength == 0) return false;

        this.log(`Responding with ${buffer.byteLength} bytes of binary data `);

        this.sendHeaders();

        this.res.write(buffer);

        this.res.end();

        return true;
    };


    async sendRawStreamFromFile(file_path: string): Promise<boolean> {
        const loc = path.isAbsolute(file_path) ? file_path : path.join(CWD, file_path);

        this.log(`Responding with raw data stream from file ${loc} by dispatcher [${this.do.name}]`);

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
                this._log.sub_error((e));
                stream.close();
                resolve(false);
            });
        })).catch(e => {
            this._log.sub_error(e);
            stream.close();
            return false;
        });
    };

    redirect(new_url: string) {

        if (new_url + "" == this._url + "") {
            this.error(`No difference between redirected URL ${new_url} and original request URL.`);
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
