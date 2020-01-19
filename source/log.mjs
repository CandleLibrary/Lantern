const log = (...m) => { console.log(...m, "\n") };
log.error = (...m) => { console.error(...m, "\n") };
log.verbose = (...m) => { console.log(...m, "\n") };
log.message = log;

export default log;