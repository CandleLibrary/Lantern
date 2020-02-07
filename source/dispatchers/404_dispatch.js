import data from "../data/404.data.mjs";

export default {
    name: 404,
    MIME: "text/html",
    respond: data,
    keys:
    {
        ext: 0xFFFFFFFF,
        dir: "*"
    }
}