import { Dispatcher } from "../types";

const default_dispatch = <Dispatcher>{
    response_type: 0,
    name: "Default",
    respond: async (tools) => { return false; }
};

export default default_dispatch;
