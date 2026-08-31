import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { pickDestination, withForwardedQuery } from "./redirect";

describe("pickDestination", () => {
  test("uses custom_route when it is present", () => {
    assert.equal(
      pickDestination({
        default_route: "https://example.com/default",
        custom_route: "https://example.com/custom",
      }),
      "https://example.com/custom",
    );
  });

  test("uses default_route when custom_route is null or blank", () => {
    assert.equal(
      pickDestination({
        default_route: "https://example.com/default",
        custom_route: null,
      }),
      "https://example.com/default",
    );
    assert.equal(
      pickDestination({
        default_route: "https://example.com/default",
        custom_route: "   ",
      }),
      "https://example.com/default",
    );
  });
});

describe("withForwardedQuery", () => {
  test("appends inbound UTM params onto an absolute destination", () => {
    const result = withForwardedQuery(
      "https://example.com/path?existing=1",
      "?utm_source=foce&utm_medium=button",
    );
    const url = new URL(result);
    assert.equal(url.searchParams.get("existing"), "1");
    assert.equal(url.searchParams.get("utm_source"), "foce");
    assert.equal(url.searchParams.get("utm_medium"), "button");
  });

  test("appends inbound UTM params onto a relative destination", () => {
    const result = withForwardedQuery(
      "/_preview/landed?user=2vvtr&rule=default",
      "?utm_source=foce&utm_campaign=week35_2026",
    );
    assert.match(result, /^\/_preview\/landed\?/);
    const params = new URLSearchParams(result.slice(result.indexOf("?") + 1));
    assert.equal(params.get("user"), "2vvtr");
    assert.equal(params.get("rule"), "default");
    assert.equal(params.get("utm_source"), "foce");
    assert.equal(params.get("utm_campaign"), "week35_2026");
  });

  test("lets inbound values win on duplicate keys", () => {
    const result = withForwardedQuery(
      "https://example.com/?utm_source=stored",
      "?utm_source=qr",
    );
    assert.equal(new URL(result).searchParams.get("utm_source"), "qr");
  });
});
