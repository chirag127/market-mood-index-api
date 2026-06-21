import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll, vi } from "vitest";

const mockUpstream = () => {
  const daily = Array.from({ length: 35 }, (_, i) => ({
    date: `2026-05-${String(i + 1).padStart(2, "0")}`,
    indicator: 40 + i,
  }));
  return {
    data: { indicator: 55.85, daily },
  };
};

beforeAll(() => {
  vi.stubGlobal("fetch", async (input: RequestInfo) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("api.tickertape.in")) {
      return new Response(JSON.stringify(mockUpstream()), {
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("not found", { status: 404 });
  });
});

describe("oriz-mmi api", () => {
  it("GET / returns info", async () => {
    const r = await SELF.fetch("https://mmi.api.oriz.in/");
    expect(r.status).toBe(200);
    const j: any = await r.json();
    expect(j.name).toBe("oriz-mmi-tickertape-mmi-api");
    expect(j.endpoints).toContain("/current");
  });

  it("GET /current returns value + zone", async () => {
    const r = await SELF.fetch("https://mmi.api.oriz.in/current");
    expect(r.status).toBe(200);
    const j: any = await r.json();
    expect(typeof j.value).toBe("number");
    expect(j.zone).toBe("greed");
  });

  it("GET /history?days=10 returns items", async () => {
    const r = await SELF.fetch("https://mmi.api.oriz.in/history?days=10");
    expect(r.status).toBe(200);
    const j: any = await r.json();
    expect(j.days).toBe(10);
    expect(Array.isArray(j.items)).toBe(true);
    expect(j.items.length).toBeLessThanOrEqual(10);
  });

  it("GET /zones returns the 4 bands", async () => {
    const r = await SELF.fetch("https://mmi.api.oriz.in/zones");
    expect(r.status).toBe(200);
    const j: any = await r.json();
    expect(j.zones).toHaveLength(4);
    expect(j.zones.map((z: any) => z.id)).toEqual([
      "extreme-fear",
      "fear",
      "greed",
      "extreme-greed",
    ]);
  });
});
