import { createProxy } from './proxy.js';

// Cloudflare Workers entry. TARGET_HOST is a plain var (wrangler.jsonc),
// PROXY_KEY is an optional secret (`wrangler secret put PROXY_KEY`).
export default {
	fetch(request, env) {
		return createProxy({ targetHost: env.TARGET_HOST, proxyKey: env.PROXY_KEY })(request);
	},
};
