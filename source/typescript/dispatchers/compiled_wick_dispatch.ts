import path from "path";
import fs from "fs";
import { Dispatcher } from "../types/types";
const fsp = fs.promises;

import wick, {
    Component,
    Presets,
    componentDataToClassString,
    componentDataToCSS,
    componentDataToHTML,
    WickLibrary
} from "@candlefw/wick";

import URL from "@candlefw/url";
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
function isWickComponent(obj) {
    console.error("Replace with logic to test the object argument");
    return true;
}

export enum SourceType {
    SPLIT,
    COMBINED
}

export interface RenderOptions {
    source_url: URL,
    source_type: SourceType;
    js_page_template?: string;
    html_page_template?: string;
    css_page_template?: string;
    USE_RADIATE_RUNTIME?: boolean;
    USE_FLAME_RUNTIME?: boolean;

    sources?: {
        wick?: string;
        glow?: string;
    };
}

const FILE = {
    header: "",
    body_html: "",
    templates: "",
    scripts: "",
};

const
    addHeader = (file, header_data) => Object.assign({}, file, { header: file.header + "\n" + header_data }),
    addScript = (file, script_data) => Object.assign({}, file, { scripts: file.scripts + "\n" + script_data }),
    createModuleComponentScript = (file, components, fn, presets = {}, after = "") => {
        const str = components.map(fn).join("\n\t") + "\n" + after;
        return addScript(file, `
<script async type="module" id="wick-components">
    import "/@cl/wick/";
    const w = cfw.wick; 
    window.addEventListener("load", async () => {

    w.rt.setPresets(${JSON.stringify(presets)});

    ${str}})
</script>`);
    },
    createComponentStyle = (file, components, fn) => {
        const str = components.map(fn).join("\n");
        return addHeader(file, `<style id="wick-css">${str}\n</style>`);
    };
export const renderPage = async (
    source: String | Component,
    wick: WickLibrary,
    options: RenderOptions
): Promise<{ html?: string, js?: string, css?: string; }> => {

    const wick_file = options?.sources?.wick ?? "/@cl/wick/";

    await wick.server();

    const {
        USE_RADIATE_RUNTIME = false,
        USE_FLAME_RUNTIME = false,
        source_url
    } = options;

    let component: Component = null, presets = await wick.setPresets({
        options: {
            url: {
                wickrt: "/@cl/wick/build/library/runtime.js",
                glow: "/@cl/glow/"
            }
        }
    });

    if (typeof (source) == "string") {
        component = await wick(source, presets);
    } else if (isWickComponent(source))
        component = <Component>source;

    if (!component) throw new Error("source is not a wick component!");


    let file = Object.assign({}, FILE);

    const components = getComponentGroup(component, presets);

    if (!USE_FLAME_RUNTIME) {

        if (USE_RADIATE_RUNTIME) {
            file = addHeader(file, `<script src="/flame/router/radiate"></script>`);
            file = addScript(file, `<script>{const w = wick.default; cfw.radiate("${component.name}");}</script>`);
        }

        const html = (await wick.utils.RenderPage(component)).page;

        return { html };

    } else {

        file = addHeader(file, `<script type="module" src="${wick_file}"></script>`);
        file = addHeader(file, `<script type="module" src="/@cl/css/"></script>`);
        file = addHeader(file, `<script type="module" async src="/@cl/glow/"></script>`);

        const unflamed_url = new URL(source_url);

        unflamed_url.setData({ flaming: false });

        file = createModuleComponentScript(file, components, comp => {

            const comp_class_string = wick.utils.componentToClassString(comp, presets, false, false);

            return (`await w( "${comp.location.toString().replace(process.cwd(), "")}");`);
        }, presets, ``);
    }


    return {
        html: `<!DOCTYPE html>
<html>
    <head>
        ${file.header.trim().split("\n").join("\n\t\t")}
    </head>
    <body>
        ${file.body_html.trim().split("\n").join("\n\t\t")}
        ${file.templates.trim().split("\n").join("\n\t\t")}
        ${file.scripts.trim().split("\n").join("\n\t\t")}
    </body>
</html>`
    };
};

function getComponentGroup(
    comp: Component,
    presets: Presets,
    comp_name_set: Set<string> = new Set,
    out_array: Array<Component> = [comp]
): Array<Component> {


    if (comp && (comp.hooks.length > 0 || comp.local_component_names.size > 0)) {

        for (const name of comp.local_component_names.values()) {

            if (comp_name_set.has(name)) continue;

            comp_name_set.add(name);

            const comp = presets.components.get(name);

            out_array.push(comp);

            getComponentGroup(comp, presets, comp_name_set, out_array);
        }
    }

    return out_array;
};

export default <Dispatcher>{
    name: "WICK_COMPILER",
    description:
        `Builds self-contained HTML modules from Wick components`,
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

            const { html } = await renderPage(url, wick, {
                source_type: SourceType.COMBINED,
                USE_FLAME_RUNTIME: false,
                source_url: tools.url
            });

            tools.setMIMEBasedOnExt("html");

            return tools.sendUTF8String(html);

        } else {
            //If the indexed resource at root of directory is a jsx or whtml file, then load as a wick component. 
        }

        return false;
    },

    keys: [
        { ext: ext_map.all, dir: "/*" },
    ]
};
