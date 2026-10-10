import { createProxy } from '../../src/proxy.js';

// Netlify Edge Function (Deno runtime), mounted on every path.
export default (request) =>
	createProxy({ targetHost: Netlify.env.get('TARGET_HOST'), proxyKey: Netlify.env.get('PROXY_KEY') })(request);

export const config = { path: '/*' };
