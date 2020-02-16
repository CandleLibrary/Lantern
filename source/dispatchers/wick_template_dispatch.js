import wick from "@candlefw/wick";
import html from "@candlefw/html";
import URL from "@candlefw/url";
import path from 'path';
import fs from 'fs';
import ext from "../extension_map.mjs";
const fsp = fs.promises;

//Makes wick compatible with NodeJS.
global.window = {};
html.polyfill();
URL.polyfill();

export default {
    name: "Wick Template",
    description: `Builds an HTML file from wick template files [whtml]. 
    
    Starting at the location of the requested location, 
    the builder looks for all whtml files. Each file is indexed by its file name. 
    It also looks for an index.whtml file  that contains the topmost template containing 
    the <html> tag. It proceds up the directory tree, collecting more whtml files,
    until it either locates the index.whtml file or it arives at the PWD.
    
    Should it locate an index.whtml file, all further file searching is stopped, 
    save for any other whtml files in the same directory  as the index.whtml file. 
    
    The templater will then compile a template from all the files collected. 
    Starting within the index.whtml file, (( bindings )) that have a value mathing the name of whtml file 
    will be replaced with the contents of the whtml file. This is done recursively in each template. 
    Any whtml files whose names are not matched to a whtml file are dropped. 

    Once all bindings have been satisfied, or there are no more binding that match collected whtml files, 
    the template is reduced to a string that is then sent to the clint.
    
    If an index.whtml file cannot be found, then the dispatcher returns false and yields to 
    any other dipatchers in the queue.
`,
    MIME: "text/html",
    respond: async function(tools) {

        if (tools.ext) // Only works on directory requests.
            return;

        //Make sure to force url that ends in /
        if (tools.url.path.slice(-1) !== "/") {
            // Redirect to path with end delemiter added. 
            // Prevents client side errors with relative links.
            tools.url.path += "/"
            return tools.redirect(tools.url);
        }

        //root folder to stop search in
        const bottom = path.join(process.cwd(), "/");

        //folder start search in
        let top = path.join(bottom, tools.url.path);

        const whtmlMap = new Map();

        let INDEX_FOUND = false, AT_TOP = true, ENTRY_FOUND = false;

        try {

            //Searching for index.whtml
            do {
                const dir = await fsp.readdir(top, { withFileTypes: true });

                for(const file of dir){
                    if(file.isFile() && path.extname(file.name) == ".whtml"){

                        const name = path.basename(file.name, ".whtml");
                        
                        if(!whtmlMap.has(name))
                            whtmlMap.set(name, path.join(top, file.name).replace(bottom.slice(0,-1), "")); //Wick only deals with dirs relative to the PWD
                        
                        if(name.toLowerCase() == "index")
                            INDEX_FOUND = true;
                        
                        if(AT_TOP && name.toLowerCase() == path.basename(top).toLowerCase()){ // Use Windows case insensitive approach
                            whtmlMap.set("_data_", path.join(top, file.name).replace(bottom.slice(0,-1), ""))
                            ENTRY_FOUND = true;
                        }
                    }
                }

                if(AT_TOP && !ENTRY_FOUND) // will not build template without a file whose name matches the directory name.
                    return false;

                AT_TOP = false;
            } while (top !== bottom && (top = path.join(top, "/../")))
            
            if(!INDEX_FOUND) //Cannot build template without an index file.
                return false;

        }catch(e){
            //directory does not exist.. exit
            return false;
        }

        
        const gorgon_knot = {}; 

        //If here, we are ready to process the index... run 'er through wick!
        //Load templates and prepare to render.
        for(const [name, url] of whtmlMap.entries()){
            const comp = await wick(url).pending;
            if(comp.READY){
                let i = 0;
                gorgon_knot[name] = {toString:r=> (i++ > 1) ? (console.log("Dependency cycle detected in " + url), "") : (r = comp.ast.toString(gorgon_knot), i--, r)};
            }
        }

        let result = gorgon_knot.index.toString();

        //append the <!DOCTYPE html> tag to the string.
        result = `<!DOCTYPE html>\n` + result;

        return tools.sendString(result)
    },
    keys: { ext: ext.all, dir: "*" }
}