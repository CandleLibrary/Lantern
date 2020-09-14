import { ToolSet } from "./types";
import { RequestData } from "./request_data";
import { LogQueue } from "../utils/log";

export interface ResponseFunction<K> {
    (tool_set: any, data: RequestData, log_queue: LogQueue, d: Map<any, any>, dd: Map<any, any>): Promise<void>;
}
