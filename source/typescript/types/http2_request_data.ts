import { RequestData } from "./request_data";
import http2 from "http2";


export interface HTTPS2RequestData extends RequestData {
    stream: http2.ServerHttp2Stream;
    headers: http2.IncomingHttpHeaders;
}
