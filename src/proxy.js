// Platform-agnostic core. Only uses web-standard Request/Response/fetch, so the
// same code runs on Cloudflare Workers, Vercel Edge, Netlify Edge, Deno and Node.

export const DEFAULT_TARGET_HOST = 'api.v4f.info';
export const PROXY_KEY_HEADER = 'x-proxy-key';

/**
 * @param {{ targetHost?: string, proxyKey?: string }} [options]
 *   targetHost: upstream hostname (https is always used).
 *   proxyKey: when set, requests must carry it in the `x-proxy-key` header.
 */
export function createProxy({ targetHost, proxyKey } = {}) {
	const host = targetHost || DEFAULT_TARGET_HOST;

	return async function proxy(request) {
		if (proxyKey && request.headers.get(PROXY_KEY_HEADER) !== proxyKey) {
			return new Response('Forbidden', { status: 403 });
		}

		const url = new URL(request.url);
		url.protocol = 'https:';
		url.hostname = host;
		url.port = '';

		const headers = new Headers(request.headers);
		headers.delete(PROXY_KEY_HEADER);

		return fetch(
			new Request(url.toString(), {
				method: request.method,
				headers,
				body: request.body,
				duplex: 'half',
			}),
		);
	};
}
