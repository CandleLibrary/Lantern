/**[API]:testing
 *
 * Should be able to get a random available
 * port for the server.
 */

import lantern from "@candlelib/lantern";
import spark from "@candlelib/spark";


const port1 = await lantern.getUnusedPort();
const port2 = await lantern.getUnusedPort();
const port_min = 49152, port_max = 65535;

const serverA = await lantern({ log: lantern.null_logger, port: port1, type: "http2", secure: lantern.mock_certificate }, { error: _ => _, log: _ => _ });

const serverB = await lantern({ log: lantern.null_logger, port: port2, type: "http" }, { error: _ => _, log: _ => _ });

assert_group(sequence, () => {
    await spark.sleep(10);
    assert("Make sure we got two unique ports", port1 !== port2);

    assert(port1 >= port_min);
    assert(port1 <= port_max);

    assert(port2 >= port_min);
    assert(port2 <= port_max);

    assert(serverA.isOPEN() == true);

    assert(serverB.isOPEN() == true);

    assert(await serverA.close() == true);

    assert(await serverB.close() == true);
});