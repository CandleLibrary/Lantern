/**[API]:testing
 *
 * With the cfw_libraries dispatcher enabled
 * should be able to load CandleLibrary files within
 * a browser.
 */

import url from "@candlelib/uri";
assert_group(skip, "URL Global Should Match Window Location", () => {
    assert(url !== undefined, browser);
    assert(url.GLOBAL + "" == window.location, browser);
});

import wind from "@candlelib/wind";
assert_group(skip, "Wind should parse window.location string and tokenize [https]", sequence, () => {
    const lex = wind(window.location + "");
    assert(lex.tx == "https", browser);
    assert(lex.ty == lex.types.id, browser);
});

import wick from "@candlelib/wick";
assert_group(skip, "Wick Component", () => {
    const comp_data = await wick("<div>hello world</div>");
    const comp = new comp_data.class();
    comp.appendToDOM(document.body);
    assert(document.body.children[1].innerHTML == "hello world", browser);
});

import glow from "@candlelib/glow";
assert_group(skip, "Glow Animation", () => {
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



