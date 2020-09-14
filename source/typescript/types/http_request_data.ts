import { RequestData } from "./request_data";
import http from "http";

export interface HTTPSRequestData extends RequestData {
    res: http.ServerResponse;
    req: http.IncomingMessage;
}
