import { Dispatcher } from "./types";


export interface LanternServer<server_type> {
    addExtension: (key_name: string, mime_type: string) => void;
    addDispatch: (...v: Array<Dispatcher>) => void;
    server: server_type;
    ext: any;
    close: () => void;

    isOPEN: () => boolean;
}
