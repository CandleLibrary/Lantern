import path from "path";
import fs from "fs";
import { Dispatcher } from "../types/types";
const fsp = fs.promises;

import wick, {
    WickLibrary
} from "@candlelib/wick";

import ext_map from "../extension/extension_map.js";


/**
 * Render provides the mechanism to turn wick components 
 * into source files for client use. The output can either
 * be a single HTML "slug" that contains markup, CSS, and JS
 * data, or it can be split into discrete files separating out
 * the data types into their own products. 
 * 
 * Input can a be single wick component that serves as the root of the file,
 * or it can be URL to wick component source file. A template can be defined 
 * that describes the form of the compiled wick pages. 
 */

export async function renderPage(
    source: string,
    wick: WickLibrary
): Promise<string> {

    let
        presets = wick.setPresets(),
        component = await wick(source, presets);

    if (!component) throw new Error("source is not a wick component!");

    return (await wick.utils.RenderPage(component)).page;

};

export default <Dispatcher>{
    name: "WICK_COMPILER",
    description:
        `Builds self-contained HTML pag from a Wick component entry-point`,
    MIME: "text/html",
    respond: async function (tools) {

        //load wick data 
        if ("" == tools.ext) {

            if (tools.url.path.slice(-1) !== "/") {
                //redirect to path with end delimiter added. Prevents errors with relative links.
                const new_path = tools.url;

                new_path.path += "/";

                return tools.redirect(new_path.path);
            }

            let url = "";

            const cwd = tools.cwd;

            try {
                if (await fsp.stat(path.join(cwd, tools.dir, "index.wick")))
                    url = path.join(cwd, tools.dir, "index.wick");
            } catch (e) { }


            try {
                if (await fsp.stat(path.join(cwd, tools.dir, "index.html")))
                    url = path.join(cwd, tools.dir, "index.html");
            } catch (e) { }

            if (!url) return false;

            tools.setHeader("Access-Control-Allow-Origin", "*");

            const html = await renderPage(url, wick);

            tools.setMIMEBasedOnExt("html");

            return tools.sendUTF8String(html);
        }

        return false;
    },

    keys: [
        { ext: ext_map.all, dir: "/*" },
    ]
};
