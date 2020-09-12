/**[API]:testing
 *
 * With the cfw_libraries dispatcher enabled
 * should be able to load candlefw files within
 * a browser.
 */

import url from "@candlefw/url";
assert_group("URL Global Should Match Window Location", () => {
    assert(url !== undefined, browser);
    assert(url.GLOBAL + "" == window.location, browser);
});

import wind from "@candlefw/wind";
assert_group("Wind should parse window.location string and tokenize [https]", sequence, () => {
    const lex = wind(window.location + "");
    assert(lex.tx == "https", browser);
    assert(lex.ty == lex.types.id, browser);
});

import wick from "@candlefw/wick";
assert_group("Wick Component", () => {
    const comp_data = await wick("<div>hello world</div>");
    const comp = new comp_data.class();
    comp.appendToDOM(document.body);
    assert(document.body.children[1].innerHTML == "hello world", browser);
});

import glow from "@candlefw/glow";
assert_group("Glow Animation", () => {
    const seq = glow.createSequence({
        obj: document.body,
        color: [{
            v: "rgb(0,0,0)",
            duration: 100,
        }, {
            v: "rgb(255,255,255)",
            duration: 200
        }]
    });

    await seq.asyncPlay();

    assert(document.body.style.color == "rgb(255, 255, 255)", browser);
});



