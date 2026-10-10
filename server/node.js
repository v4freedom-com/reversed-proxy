import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

// Headers that describe a single connection and must not be copied across it.
const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']);
// fetch() already decoded the upstream body, so these no longer describe it.
const DECODED_RESPONSE = new Set(['content-encoding', 'content-length']);

export const HEALTH_PATH = '/__health';

/** Wrap a `(Request) => Promise<Response>` handler in a Node http server. */
export function createNodeServer(handler) {
	return createServer(async (req, res) => {
		if (req.url === HEALTH_PATH) {
			res.writeHead(200, { 'content-type': 'text/plain' }).end('ok');
			return;
		}

		try {
			const response = await handler(toRequest(req));
			res.statusCode = response.status;
			for (const [name, value] of response.headers) {
				const lower = name.toLowerCase();
				if (HOP_BY_HOP.has(lower) || DECODED_RESPONSE.has(lower) || lower === 'set-cookie') continue;
				res.setHeader(name, value);
			}
			const cookies = response.headers.getSetCookie();
			if (cookies.length) res.setHeader('set-cookie', cookies);

			if (response.body) {
				await pipeline(Readable.fromWeb(response.body), res);
			} else {
				res.end();
			}
		} catch (error) {
			console.error('proxy error:', error?.message ?? error);
			if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
			res.end('Bad Gateway');
		}
	});
}

function toRequest(req) {
	const headers = new Headers();
	for (const [name, value] of Object.entries(req.headers)) {
		const lower = name.toLowerCase();
		// `host` is dropped so fetch() sends the upstream host, not ours.
		if (lower === 'host' || HOP_BY_HOP.has(lower) || value === undefined) continue;
		for (const v of Array.isArray(value) ? value : [value]) headers.append(name, v);
	}

	const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
	return new Request(`http://${req.headers.host ?? 'localhost'}${req.url}`, {
		method: req.method,
		headers,
		body: hasBody ? Readable.toWeb(req) : undefined,
		duplex: 'half',
	});
}
