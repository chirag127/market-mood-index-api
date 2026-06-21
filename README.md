# Oriz MMI — Tickertape Market Mood Index Mirror

![Oriz MMI](logo.png)

A Cloudflare Workers API that mirrors [Tickertape's Market Mood Index](https://www.tickertape.in/market-mood-index) (MMI) — a 0-100 sentiment gauge for the Indian equity market.

- **Live:** <https://mmi.api.oriz.in>
- **Source:** Tickertape's public MMI endpoint, cached in Cloudflare KV.
- **Stack:** Hono on Cloudflare Workers + KV.

## Endpoints

| Method | Path | Cache | Description |
| --- | --- | --- | --- |
| GET | `/` | — | Service info + endpoint list |
| GET | `/current` | 1h | Current MMI value + zone |
| GET | `/history?days=N` | 24h | Last `N` days (1-365, default 30) |
| GET | `/zones` | static | Reference for the 4 zone bands |

CORS is open (`*`). All responses are JSON.

### Example

```bash
$ curl https://mmi.api.oriz.in/current
{ "value": 55.85, "zone": "greed", "fetchedAt": "2026-06-21T12:00:00.000Z" }
```

### Zone reference

| Zone | Range |
| --- | --- |
| Extreme Fear | `< 30` |
| Fear | `30 - 50` |
| Greed | `50 - 70` |
| Extreme Greed | `> 70` |

## Develop

```bash
pnpm install
pnpm dev        # wrangler dev
pnpm test       # vitest (Workers pool)
pnpm typecheck
```

## Deploy

CI deploys on push to `main` via `.github/workflows/deploy.yml`. Required repo secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. After the first deploy, create the KV namespace (`wrangler kv namespace create CACHE`) and paste the id into `wrangler.toml`.

## License

MIT — see [LICENSE](./LICENSE). Historical data lives in [`data/`](./data) (preserved from the prior scraper).
