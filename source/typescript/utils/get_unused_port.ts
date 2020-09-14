import http from "http";

export async function getUnusedPort(max_attempts: number = 10, cb?): Promise<number> {

    if (!cb)
        return new Promise(_ => {
            getUnusedPort(max_attempts, _);
        });

    const net = (await import("net")).default;

    if (max_attempts == 0)
        cb(-1);

    const
        min = 49152, max = 65535,
        port = min + Math.round(Math.random() * (max - min)),
        server = http.createServer();


    server.on("error", async (_) => {
        console.error(_);
        cb(-1);
        server.close();
        getUnusedPort(max_attempts - 1, cb);
    });

    server.on("listening", _ => {
        server.close(() => {

            cb(port);
        });
    });

    server.listen(port, "127.0.0.1");
}
