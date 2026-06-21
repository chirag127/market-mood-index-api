import { Hono } from "hono";
import { cors } from "hono/cors";

type Env = { CACHE: KVNamespace };

const UPSTREAM = "https://api.tickertape.in/mmi/now";
const UA = "Mozilla/5.0 (compatible; OrizMMI/0.1; +https://mmi.api.oriz.in)";

const ZONES = [
  { id: "extreme-fear", label: "Extreme Fear", min: 0, max: 30 },
  { id: "fear", label: "Fear", min: 30, max: 50 },
  { id: "greed", label: "Greed", min: 50, max: 70 },
  { id: "extreme-greed", label: "Extreme Greed", min: 70, max: 100 },
];

const zoneOf = (n: number) => {
  if (n < 30) return "extreme-fear";
  if (n < 50) return "fear";
  if (n < 70) return "greed";
  return "extreme-greed";
};

async function fetchUpstream(): Promise<any> {
  const r = await fetch(UPSTREAM, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  return r.json();
}

async function cached<T>(kv: KVNamespace, key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = await kv.get(key, "json");
  if (hit) return hit as T;
  const fresh = await fn();
  await kv.put(key, JSON.stringify(fresh), { expirationTtl: ttl });
  return fresh;
}

const app = new Hono<{ Bindings: Env }>();
app.use("*", cors({ origin: "*" }));

app.get("/", (c) =>
  c.json({
    name: "oriz-mmi-tickertape-mmi-api",
    description: "Mirror of Tickertape Market Mood Index",
    endpoints: ["/current", "/history?days=N", "/zones"],
    source: "https://www.tickertape.in/market-mood-index",
  }),
);

app.get("/current", async (c) => {
  const data = await cached(c.env.CACHE, "current", 3600, async () => {
    const j = await fetchUpstream();
    const value = j?.data?.indicator ?? j?.data?.currentValue ?? null;
    return { value, zone: value != null ? zoneOf(value) : null, fetchedAt: new Date().toISOString() };
  });
  return c.json(data);
});

app.get("/history", async (c) => {
  const days = Math.min(Math.max(parseInt(c.req.query("days") ?? "30", 10) || 30, 1), 365);
  const data = await cached(c.env.CACHE, `history:${days}`, 86400, async () => {
    const j = await fetchUpstream();
    const daily: any[] = j?.data?.daily ?? [];
    const items = daily.slice(-days).map((d) => ({
      date: d?.date ?? d?.day ?? null,
      value: d?.indicator ?? d?.value ?? null,
      zone: typeof (d?.indicator ?? d?.value) === "number" ? zoneOf(d.indicator ?? d.value) : null,
    }));
    return { days, count: items.length, items, fetchedAt: new Date().toISOString() };
  });
  return c.json(data);
});

app.get("/zones", (c) => c.json({ zones: ZONES }));

export default app;
