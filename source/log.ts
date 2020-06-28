const log = (...m) => { console.log("\n", ...m, "\n"); };
log.error = (...m) => { console.error(...m, "\n"); };
log.verbose = (...m) => { console.log(...m, "\n"); };
log.message = log;
log.subject = log;
log.sub_message = (...m) => { console.log(`\t`, ...(m.flatMap(m => (m + "").split("\n").join("\n\t")))); };
log.sub_error = (...m) => { console.error(`\t`, ...(m.flatMap(m => (m + "").split("\n").join("\n\t")))); };

export default log;