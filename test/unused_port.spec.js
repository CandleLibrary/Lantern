/**[API]:testing
 *
 * Should be able to get a random available
 * port for the server.
 */

import lantern from "@candlefw/lantern";
import spark from "@candlefw/spark";


const port1 = await lantern.getUnusedPort();
const port2 = await lantern.getUnusedPort();
const port_min = 49152, port_max = 65535;

const serverA = await lantern({ port: port1 }, { error: _ => _, log: _ => _ });

const serverB = await lantern({ port: port2 }, { error: _ => _, log: _ => _ });

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