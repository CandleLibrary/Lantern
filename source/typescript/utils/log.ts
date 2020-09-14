
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

export class Logger {

    str_poly;

    identifier: string;
    messages: Array<string>;

    next: Logger;

    logger: Console;

    private delete_fn: (arg: Logger) => void;

    constructor(logger, delete_fn: (arg: Logger) => void) {
        this.logger = logger;
        this.identifier = "";
        this.messages = [];
        this.delete_fn = delete_fn;
    }
    delete() {
        if (this.messages.length > 0)
            this.logger.log("\n", this.identifier, this.messages
                .map((str, i) => i > 0 ? "\t" + str : str)
                .join("\n"));

        this.messages.length = 0;

        this.identifier = "";

        this.delete_fn(this);
    }
    message(...v) {
        this.messages.push(...(v.map(v => v + "")));
        return this;
    }
    sub_message(...v) {
        this.messages.push(...(v.map(v => v + "")));
        return this;
    }
    sub_error(...v) {
        this.messages.push(...(v.map(v => v + "")));
        return this;
    }
}

export class LogQueue {

    queue: Logger;

    logger: Console;
    constructor(log: Console) {
        this.logger = log;
        this.createLocalLog("").delete();
    }


    delete(log: Logger) {
        log.next = this.queue;
        this.queue = log;
    }

    /**
     * Returns a logger that can be used to keep messages isolated from other loggers. 
     * @param identifier - Identifier of the logger 
     */
    createLocalLog(identifier: string) {

        let logger = this.queue;

        if (logger)
            this.queue = logger.next;
        else
            logger = new Logger(this.logger, this.delete.bind(this));

        logger.identifier = identifier;

        return logger;
    }
}