const TTL = 8 * 60 * 60;
const LB_PER_MT = 2204.62262185;

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/metals-cache-v1', context.request.url), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const key = context.env.METALS_DEV_API_KEY;
  if (!key) return json({ status: 'error', message: 'Market data is not configured.' }, 503);

  try {
    const url = new URL('https://api.metals.dev/v1/latest');
    url.searchParams.set('api_key', key);
    url.searchParams.set('currency', 'USD');
    const upstream = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!upstream.ok) throw new Error('Upstream market service unavailable');
    const data = await upstream.json();
    if (data.status !== 'success' || !data.metals) throw new Error('Invalid market response');

    const m = data.metals;
    const payload = {
      status: 'success',
      timestamp: data.timestamp,
      source: 'Metals.Dev',
      metals: {
        Au: { price: m.gold, unit: 'USD/oz' },
        Ag: { price: m.silver, unit: 'USD/oz' },
        Cu: { price: m.copper / LB_PER_MT, unit: 'USD/lb' },
        Zn: { price: m.zinc / LB_PER_MT, unit: 'USD/lb' },
        Pb: { price: m.lead / LB_PER_MT, unit: 'USD/lb' }
      }
    };
    const response = json(payload, 200, { 'Cache-Control': 'public, max-age=300, s-maxage=28800' });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    return json({ status: 'error', message: 'Market data temporarily unavailable.' }, 502);
  }
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers }
  });
}
