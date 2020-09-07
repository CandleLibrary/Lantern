
export type LanternLoggingOutput = {
    log: (..._) => any,
    error: (..._) => any,
};

let logger: LanternLoggingOutput = console;
export function setLogger(l: LanternLoggingOutput = console) {
    logger = l;
}

const log = (...m) => { logger.log("\n", ...m, "\n"); };
log.error = (...m) => { logger.error(...m, "\n"); };
log.verbose = (...m) => { logger.log(...m, "\n"); };
log.message = log;
log.subject = log;
log.sub_message = (...m) => { logger.log(`\t`, ...(m.flatMap(m => (m + "").split("\n").join("\n\t")))); };
log.sub_error = (...m) => { logger.error(`\t`, ...(m.flatMap(m => (m + "").split("\n").join("\n\t")))); };


const local_log_queue = [];

class Logger {

    str_poly;

    identifier: string;
    messages: Array<string>;

    constructor() {
        this.identifier = "";
        this.messages = [];
    }
    delete() {
        logger.log("\n", this.identifier, this.messages
            .map((str, i) => i > 0 ? "\t" + str : str)
            .join("\n"));

        this.messages.length = 0;

        this.identifier = "";

        local_log_queue.push(this);
    }
    message(...v) {
        this.messages.push(...(v.map(v => v + "")));
    }
    sub_message(...v) {
        this.messages.push(...(v.map(v => v + "")));
    }
    error(...v) {
        this.messages.push(...(v.map(v => v + "")));
    }
    sub_error(...v) {
        this.messages.push(...(v.map(v => v + "")));
    }
}

/**
 * Returns a logger that can be used to keep messages isolated from other loggers. 
 * @param identifier - Identifier of the logger 
 */
export function createLocalLog(identifier: string) {

    let logger = null;

    if (local_log_queue.length == 0)
        local_log_queue.push(new Logger());

    logger = local_log_queue.pop();

    logger.identifier = identifier;
    logger.messages = [];

    return logger;
}

export default log;