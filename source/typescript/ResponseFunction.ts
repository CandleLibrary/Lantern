import { ToolSet, RequestData } from "./types";

export interface ResponseFunction<K> {
    (tool_set: ToolSet<K>, data: RequestData, d: Map<any, any>, dd: Map<any, any>): Promise<void>;
}
