import { Logger as LoggerClass, LogLevel } from "@candlelib/log";
export type LanternLoggingOutput = {
    log: (..._) => any,
    error: (..._) => any,
};

export function setLogger(l: LanternLoggingOutput) { }

const CoreLogger = LoggerClass.createLogger("lantern");

const log = CoreLogger.log.bind(CoreLogger);
log.error = (...m) => { CoreLogger.error(...m, "\n"); };
log.verbose = (...m) => { CoreLogger.debug(...m, "\n"); };

log.message = log;

log.subject = log;

log.sub_message = (...m) => { CoreLogger.debug(...(m.flatMap(m => (m + "").split("\n").join("\n  ")))); };

log.sub_error = (...m) => { CoreLogger.error(...(m.flatMap(m => (m + "").split("\n").join("\n  ")))); };

export class Logger {

    str_poly;

    identifier: string;

    messages: Array<{ level: "log" | "dbg", str: string; }>;

    dispatcher_name: string;

    next: Logger;


    log: (...str: string[]) => void;

    private delete_fn: (arg: Logger) => void;

    constructor(logger, delete_fn: (arg: Logger) => void) {
        this.log = logger;
        this.identifier = "";
        this.messages = [];
        this.delete_fn = delete_fn;
    }
    delete(SILENT = false) {

        if (!SILENT)
            if (this.messages.length > 0) {

                for (const { level, str } of this.messages) {
                    CoreLogger[level == "dbg" ? "debug" : "log"](`${this.identifier}:`, str);
                }
            }

        this.messages.length = 0;

        this.identifier = "";

        this.delete_fn(this);
    }
    message(...v) {
        this.messages.push(...(v.map(v => (<any>{ level: "log", str: v + "" }))));
        return this;
    }

    debug(...v) {

        if ((CoreLogger.ACTIVE & LogLevel.DEBUG) == 0)
            return this;
        this.messages.push(...(v.map(v => (<any>{ level: "dbg", str: v + "" }))));
        return this;
    }
    sub_message(...v) {
        this.messages.push(...(v.map(v => (<any>{ level: "dbg", str: v + "" }))));
        return this;
    }
    sub_error(...v) {
        this.messages.push(...(v.map(v => (<any>{ level: "log", str: v + "" }))));
        return this;
    }
}

export class LogQueue {

    queue: Logger;

    log: (...str: string[]) => void;
    constructor(_: (...str: string[]) => void) {
        this.log = log;
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
            logger = new Logger(this.log, this.delete.bind(this));

        logger.identifier = identifier;

        return logger;
    }
}