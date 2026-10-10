import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProxy } from '../../src/proxy.js';
import { createNodeServer } from '../../server/node.js';

async function withServer(proxyOptions, fn) {
	const server = createNodeServer(createProxy(proxyOptions));
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	try {
		await fn(`http://127.0.0.1:${server.address().port}`);
	} finally {
		server.closeAllConnections();
		await new Promise((resolve) => server.close(resolve));
	}
}

test('forwards request to upstream and relays the response', async (t) => {
	const realFetch = globalThis.fetch;
	let seen;
	t.mock.method(globalThis, 'fetch', async (request) => {
		seen = { url: request.url, method: request.method, headers: request.headers, body: await request.text() };
		return new Response('{"ok":true}', {
			status: 202,
			headers: { 'content-type': 'application/json', 'content-encoding': 'gzip', 'x-up': '1' },
		});
	});

	await withServer({ targetHost: 'upstream.test' }, async (base) => {
		const res = await realFetch(`${base}/v1/ping?a=1`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-test': 'hello' },
			body: '{"ping":"pong"}',
		});
		assert.equal(res.status, 202);
		assert.equal(res.headers.get('x-up'), '1');
		assert.equal(await res.text(), '{"ok":true}');
	});

	assert.equal(seen.url, 'https://upstream.test/v1/ping?a=1');
	assert.equal(seen.method, 'POST');
	assert.equal(seen.headers.get('x-test'), 'hello');
	assert.equal(seen.body, '{"ping":"pong"}');
});

test('health endpoint and proxy key enforcement', async (t) => {
	const realFetch = globalThis.fetch;
	t.mock.method(globalThis, 'fetch', async () => new Response('up'));

	await withServer({ proxyKey: 'k' }, async (base) => {
		assert.equal((await realFetch(`${base}/__health`)).status, 200);
		assert.equal((await realFetch(`${base}/x`)).status, 403);
		assert.equal((await realFetch(`${base}/x`, { headers: { 'x-proxy-key': 'k' } })).status, 200);
	});
});

test('returns 502 when upstream fails', async (t) => {
	const realFetch = globalThis.fetch;
	t.mock.method(globalThis, 'fetch', async () => {
		throw new Error('boom');
	});

	await withServer({}, async (base) => {
		assert.equal((await realFetch(`${base}/x`)).status, 502);
	});
});
