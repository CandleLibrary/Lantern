import URL from "@candlelib/uri";
import { LanternServer } from './lantern_server';


export interface ToolSet {
    /**Test */

    /**
     * Returns and object of the request data parsed as
     * a JSON object.
     */
    getJSONasObject(): Promise<any>;
    getCookie(cookie_name: string): string;

    /**
     * Set the response MIME header to the MIME string value. The default mime type is
     * `text/plain`
     *
     * @param MIME {string} A MIME string
     *
     * Reference:
     * https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
     */
    setMIME(MIME?: string);

    /**
     * Set the response MIME header to a type that is appropriate based on
     * the file extension of request path, or the value of the string passed to
     * the function. Defaults to `text/plain`
     *
     * @param ext {string} A MIME string
     *
     * Reference:
     * https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
     */
    setMIMEBasedOnExt(ext?: string);
    /**
     * Set the status code of the response
     * @param code
     */
    setStatusCode(code: number);
    setCookie(cookie_name: string, cookie_value: string);
    getHeader(header_name: string): string;

    setHeader(header_name: string, header_value: string);

    /**
     * Retrieve the contents a file at `file_path`, using UTF-8 encoding,
     * and return a string of the contents. Returns an empty string if
     * there is an error retrieving the file.
     *
     * @param file_path
     */
    getUTF8FromFile(file_path: string): Promise<string>;

    /**
     * Respond to the request with a UTF-8 encoded string of the contents of the
     * file at file_path and resolve `true`, or resolve `false` 
     * if there was an error reading the file.
     */
    sendUTF8FromFile(file_path: string): Promise<boolean>;

    /**
     * Respond to the request with a UTF-8 encoded string and resolve `true`.
     *
     * @param file_path
     */
    sendUTF8String(string: string): Promise<boolean>;

    /**
     * Respond to the request with a byte stream of the contents of the file at 
     * file_path and resolve `true`, or resolve `false` if there was 
     * an error reading the file.
     */
    sendRawStreamFromFile(file_path: string): Promise<boolean>;
    /**
     * Name of the file component of the filepath without extension
     */
    readonly filename: string;

    /**
     * Name of the file component of the filepath with extension
     */
    readonly file: string;

    /**
     * Filepath component of the requested url
     */
    readonly pathname: string;

    /**
     * Name of the extension component of the filepath if present
     */
    readonly ext: string;

    /**
     * Filepath component of without any file, if present
     */
    readonly dir: string;
    /**
     * The full request URL.
     */
    readonly url: URL;

    /**
     * The root directory from which Lantern can access and 
     * serve files. 
     */
    readonly cwd: string;

    redirect(new_url: string | URL): boolean;
    error(error): void;

    log(...message: string[]): void;
}

export interface DispatchKey {
    ext: number;
    dir: string;
}
/**
 * Object containing rules and properties with which
 * the web uses to determine the correct response to
 * a request.
 */
export interface Dispatcher {
    /**
     * Identifier string of the dispatcher.
     *
     */
    name: string;
    /**
     * String to explain the purpose of the dispatcher.
     *
     * @optional
     */
    description?: string;
    /**
     * Determines the directory and file scope the
     * dispatcher applies to.
     */
    keys: DispatchKey | Array<DispatchKey>;
    /**
     * Set to true to prevent message generation from
     * this dispatcher.
     * 
     * @optional
     */
    SILENT?: boolean | number;

    /**
     * Default MIME header value that should be applied to
     * responses from this dispatcher.
     *
     * Can be overridden through tools.setMIME and
     * tools.setMIMEBasedOnExt
     */
    MIME: string;

    /**
     * Default response code. 
     * 
     * can be overridden by tools.setStatusCode
     * 
     * @optional
     */
    response_code?: number;

    /**
     * @internal  
     */
    response_type?: 0 | 1;

    /**
     * 
     * If {function}: called when the dispatcher is selected to handle
     * a request.
     *
     * If this function @returns `false` then the next dispatcher
     * capable of handling the request is selected to respond
     * to that request.
     * 
     * If {string}: Automatically respond with the string and 
     * response code `200` (if Dispatcher.response_code is not set) and
     * MIME type `text/plain` (if Dispatcher.MIME is not set)
     */
    respond: ((tools: ToolSet) => Promise<boolean>) | string | ArrayBuffer;

    /**
     * Function that is called when the server loads the dispatcher. Allows the 
     * dispatcher to hook into server methods and extend the server functionality.
     * 
     * e.g. Use this function to register new extension types through `server.addExtension(extension_name)`
     */
    init?: (lantern: LanternServer<any>, dispatcher: this) => void;

    cwd?: string;
}


