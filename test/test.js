import lantern from "../source/main.js";

describe("Lantern test", function () {
	it("Opens a listening port to handle http requests", async function () {
		const server = lantern({ port: 5005 });
		server.close();
	});
});