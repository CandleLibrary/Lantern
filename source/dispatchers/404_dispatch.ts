import data from "../data/404.data.js";
import { Dispatcher } from "../types";
export default <Dispatcher>{
    name: "404",
    response_code: 404,
    MIME: "text/html",
    respond: data,
    keys:
    {
        ext: 0xFFFFFFFF,
        dir: "*"
    }
};