import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src';
import { createProxy } from '../src/proxy.js';

describe('reversed-proxy', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('forwards method, path, query, headers and body to the default target', async () => {
		const upstream = vi.fn(async () => new Response('ok', { status: 201 }));
		vi.stubGlobal('fetch', upstream);

		const request = new Request('https://proxy.example.com:8443/v1/ping?a=1', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-Test': 'hello' },
			body: JSON.stringify({ ping: 'pong' }),
		});

		const response = await worker.fetch(request, {});

		expect(response.status).toBe(201);
		const forwarded = upstream.mock.calls[0][0];
		expect(forwarded.url).toBe('https://api.v4f.info/v1/ping?a=1');
		expect(forwarded.method).toBe('POST');
		expect(forwarded.headers.get('X-Test')).toBe('hello');
		expect(forwarded.headers.get('Content-Type')).toBe('application/json');
		expect(await forwarded.text()).toBe('{"ping":"pong"}');
	});

	it('uses TARGET_HOST from env', async () => {
		const upstream = vi.fn(async () => new Response('ok'));
		vi.stubGlobal('fetch', upstream);

		await worker.fetch(new Request('https://proxy.example.com/x'), { TARGET_HOST: 'other.example.org' });

		expect(upstream.mock.calls[0][0].url).toBe('https://other.example.org/x');
	});

	it('rejects requests without the proxy key when one is configured', async () => {
		const upstream = vi.fn(async () => new Response('ok'));
		vi.stubGlobal('fetch', upstream);
		const proxy = createProxy({ proxyKey: 's3cret' });

		const denied = await proxy(new Request('https://proxy.example.com/x'));
		expect(denied.status).toBe(403);
		expect(upstream).not.toHaveBeenCalled();

		const allowed = await proxy(new Request('https://proxy.example.com/x', { headers: { 'x-proxy-key': 's3cret' } }));
		expect(allowed.status).toBe(200);
		// the key must not leak to the upstream
		expect(upstream.mock.calls[0][0].headers.get('x-proxy-key')).toBeNull();
	});
});
