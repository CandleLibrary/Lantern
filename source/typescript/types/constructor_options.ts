import URL from "@candlefw/url";
export interface LanternConstructorOptions {
    /**
     * The type of protocol to use with the server.
     */
    type?: "http" | "https" | "http2" | "https2";
    /**
     * Network port
     */
    port?: number;
    /**
     * Host name or IP address to assign the server to
     */
    host?: string;
    /**
     * Human friendly name for the server
     */
    server_name?: string;

    /**
     * A key and cert string pair for HTTPS2 secure
     * transport. Either can be a string value
     * or path to a file with the appropriate information
     */
    secure?: {
        key: string | URL;
        cert: string | URL;
    };

    /**
     * Any function that can log string data
     */
    log?(...str: string[]): void;
}
