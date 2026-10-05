export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run(env));
  },
  async fetch(request, env) {
    if (new URL(request.url).pathname !== "/run") return new Response("PyOrex HUB scheduler", { status: 200 });
    if (!env.MANUAL_RUN_TOKEN || request.headers.get("authorization") !== `Bearer ${env.MANUAL_RUN_TOKEN}`) return new Response("Unauthorized", { status: 401 });
    return run(env);
  }
};

async function run(env) {
  if (!env.HUB_INGEST_TOKEN) return new Response("HUB_INGEST_TOKEN missing", { status: 500 });
  const endpoint = env.COLLECT_URL || "https://pyorex.com/api/hub/collect";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "authorization": `Bearer ${env.HUB_INGEST_TOKEN}`, "user-agent": "PyOrex-HUB-Scheduler/1.0" }
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Collector ${response.status}: ${body.slice(0,500)}`);
  return new Response(body, { status: 200, headers: { "content-type": "application/json; charset=utf-8" } });
}
