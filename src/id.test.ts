import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isLegalUserId } from "./id";

describe("isLegalUserId", () => {
  test("accepts current five-character ids from the spec", () => {
    assert.equal(isLegalUserId("2vvtr"), true);
    assert.equal(isLegalUserId("2xdkp"), true);
    assert.equal(isLegalUserId("83838"), true);
    assert.equal(isLegalUserId("4r5t6"), true);
  });

  test("does not use length as a screening criterion", () => {
    assert.equal(isLegalUserId("a"), true);
    assert.equal(isLegalUserId("abcdefgh"), true);
  });

  test("rejects capitals without folding case", () => {
    assert.equal(isLegalUserId("A9dko"), false);
    assert.equal(isLegalUserId("2Vvtr"), false);
  });

  test("rejects I, i, L, l, O, o, 1, and 0 without folding case", () => {
    assert.equal(isLegalUserId("abI"), false);
    assert.equal(isLegalUserId("abi"), false);
    assert.equal(isLegalUserId("abL"), false);
    assert.equal(isLegalUserId("abl"), false);
    assert.equal(isLegalUserId("abO"), false);
    assert.equal(isLegalUserId("abo"), false);
    assert.equal(isLegalUserId("ab1"), false);
    assert.equal(isLegalUserId("ab0"), false);
  });

  test("rejects punctuation and empty values", () => {
    assert.equal(isLegalUserId("9dko"), false);
    assert.equal(isLegalUserId("ab-cd"), false);
    assert.equal(isLegalUserId(""), false);
  });
});
