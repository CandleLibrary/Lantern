
import { Dispatcher } from "../types/types";
import ext_map, { addKey } from "../extension/extension_map.js";
import URL from "@candlelib/uri";
import path from "path";
import fs from "fs";

addKey("ico", ext_map);

const favicon_path = path.join((new URL(import.meta.url)).path, "../../../../brand/candle.ico");

export default <Dispatcher>{
    name: "CandleLib Default favicon",
    description: `CandleLib Default favicon`,
    MIME: "image/vnd.microsoft.icon",
    respond: fs.readFileSync(favicon_path),
    keys: [{ ext: ext_map.ico, dir: "/*" }]
};