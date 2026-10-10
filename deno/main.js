import { createProxy } from '../src/proxy.js';

// Deno Deploy entrypoint.
Deno.serve(createProxy({ targetHost: Deno.env.get('TARGET_HOST'), proxyKey: Deno.env.get('PROXY_KEY') }));
