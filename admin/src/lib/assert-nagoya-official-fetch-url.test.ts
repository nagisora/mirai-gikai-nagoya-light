import { describe, expect, it } from "vitest";
import { assertNagoyaOfficialFetchUrl } from "./assert-nagoya-official-fetch-url";

describe("assertNagoyaOfficialFetchUrl", () => {
  it("許可されたホストの HTTPS URL は通る", () => {
    expect(() =>
      assertNagoyaOfficialFetchUrl(
        "https://www.city.nagoya.jp/shikai/kouhou/1031662/index.html"
      )
    ).not.toThrow();
  });

  it("別ホストは拒否する", () => {
    expect(() =>
      assertNagoyaOfficialFetchUrl("https://example.com/foo.pdf")
    ).toThrow(/許可されていない URL/);
  });

  it("http は拒否する", () => {
    expect(() =>
      assertNagoyaOfficialFetchUrl(
        "http://www.city.nagoya.jp/shikai/kouhou/1031662/index.html"
      )
    ).toThrow(/HTTPS のみ許可/);
  });

  it("サブドメイン偽装を hostname 比較で拒否する", () => {
    expect(() =>
      assertNagoyaOfficialFetchUrl(
        "https://www.city.nagoya.jp.evil.example/foo.pdf"
      )
    ).toThrow(/許可されていない URL/);
  });
});
