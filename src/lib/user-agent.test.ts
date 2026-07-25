import { describe, expect, it } from "vitest";

import { describeUserAgent } from "./user-agent";

describe("describeUserAgent", () => {
  const cases: Array<[string, string]> = [
    [
      "Chrome no Linux",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ],
    [
      "Chrome no Windows",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ],
    [
      "Firefox no Windows",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    ],
    [
      "Edge no Windows",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    ],
    [
      "Safari no macOS",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    ],
    [
      "Safari no iPhone",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    ],
    [
      "Chrome no Android",
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    ],
  ];

  it("Chrome/Linux", () => {
    expect(describeUserAgent(cases[0][1])).toBe("Chrome em Linux");
  });
  it("Chrome/Windows", () => {
    expect(describeUserAgent(cases[1][1])).toBe("Chrome em Windows");
  });
  it("Firefox/Windows", () => {
    expect(describeUserAgent(cases[2][1])).toBe("Firefox em Windows");
  });
  it("Edge (não é confundido com Chrome)", () => {
    expect(describeUserAgent(cases[3][1])).toBe("Edge em Windows");
  });
  it("Safari/macOS (não é confundido com Chrome)", () => {
    expect(describeUserAgent(cases[4][1])).toBe("Safari em macOS");
  });
  it("iPhone é detectado antes de macOS", () => {
    expect(describeUserAgent(cases[5][1])).toBe("Safari em iPhone");
  });
  it("Chrome/Android (Android antes de Linux)", () => {
    expect(describeUserAgent(cases[6][1])).toBe("Chrome em Android");
  });

  it("UA vazio ou irreconhecível cai no genérico", () => {
    expect(describeUserAgent("")).toBe("Dispositivo desconhecido");
    expect(describeUserAgent("curl/8.0.1")).toBe("Dispositivo desconhecido");
  });
});
