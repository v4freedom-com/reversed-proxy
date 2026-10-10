import { createProxy } from '../src/proxy.js';
import { createNodeServer } from './node.js';

const port = Number(process.env.PORT) || 8080;

const proxy = createProxy({ targetHost: process.env.TARGET_HOST, proxyKey: process.env.PROXY_KEY });

createNodeServer(proxy).listen(port, '0.0.0.0', () => {
	console.log(`reversed-proxy listening on :${port}`);
});
