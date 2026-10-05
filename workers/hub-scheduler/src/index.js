export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(run(env)); },
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/health") return new Response(JSON.stringify({status:"ok",scheduler:"pyorex-hub-scheduler"}),{headers:{"content-type":"application/json"}});
    return new Response("PyOrex HUB scheduler", { status: 200 });
  }
};
async function run(env) {
  if (!env.HUB_INGEST_TOKEN) throw new Error("HUB_INGEST_TOKEN missing");
  const endpoint = env.COLLECT_URL || "https://pyorex.com/api/hub/collect";
  const response = await fetch(endpoint,{method:"POST",headers:{"authorization":`Bearer ${env.HUB_INGEST_TOKEN}`,"user-agent":"PyOrex-HUB-Scheduler/1.0"}});
  const body = await response.text();
  if (!response.ok) throw new Error(`Collector ${response.status}: ${body.slice(0,500)}`);
  return body;
}
