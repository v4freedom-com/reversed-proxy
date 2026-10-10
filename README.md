# reversed-proxy

Forwards every request (method, path, query, headers, body) to `https://$TARGET_HOST`
(default `api.v4f.info`) and streams the response back. One core
(`src/proxy.js`), thin adapters per platform.

## Configuration

| Name | Kind | Default | Purpose |
|---|---|---|---|
| `TARGET_HOST` | plain variable | `api.v4f.info` | Upstream hostname |
| `PROXY_KEY` | **secret**, optional | unset (open) | If set, clients must send `x-proxy-key: <value>`; the header is stripped before forwarding |

Real values are never committed. Set them in each platform's dashboard/CLI.
`.dev.vars.example` is the only env file tracked.

## Platforms

| Platform | Entry | Deploys from GitHub via | Needed in GitHub |
|---|---|---|---|
| Cloudflare Workers | `src/index.js`, `wrangler.jsonc` | `.github/workflows/ci.yml` | secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; variable `DEPLOY_CLOUDFLARE=true` |
| Vercel | `api/proxy.js`, `vercel.json` | Vercel Git integration | nothing |
| Netlify | `netlify/edge-functions/proxy.js`, `netlify.toml` | Netlify Git integration | nothing |
| Deno Deploy | `deno/main.js` | Deno Deploy GitHub app (entrypoint `deno/main.js`) | nothing |
| Render | `Dockerfile`, `render.yaml` | Render Blueprint | nothing |

The Docker-based target (Render) runs `server/main.js` (plain Node 22, no runtime dependencies) and expose `/__health`.

## Development

```bash
npm ci
npm test           # vitest (workerd) + node:test for the Node adapter
npm run dev        # wrangler dev
npm start          # Node server on :8080
```
