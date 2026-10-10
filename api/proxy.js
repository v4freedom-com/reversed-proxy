import { createProxy } from '../src/proxy.js';

// Vercel Edge Function. vercel.json rewrites every path here.
export const config = { runtime: 'edge' };

export default function handler(request) {
	return createProxy({ targetHost: process.env.TARGET_HOST, proxyKey: process.env.PROXY_KEY })(request);
}
