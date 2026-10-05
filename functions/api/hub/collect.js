function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
function authorized(request,env){const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||new URL(request.url).searchParams.get("token");return !!env.HUB_INGEST_TOKEN&&token===env.HUB_INGEST_TOKEN}
export async function onRequestPost({request,env}){
 if(!env.PYOREX_DB)return json({status:"setup_required",message:"PYOREX_DB is not bound"},503);
 if(!authorized(request,env))return json({status:"unauthorized"},401);
 const now=new Date().toISOString();
 const run=await env.PYOREX_DB.prepare("INSERT INTO hub_scan_runs(started_at) VALUES(?) RETURNING id").bind(now).first();
 const {results:sources}=await env.PYOREX_DB.prepare(`SELECT s.id,s.name,s.url,s.feed_url,s.source_kind,s.priority,s.language,s.last_checked_at,c.name company,p.name project
 FROM hub_sources s LEFT JOIN hub_companies c ON c.id=s.company_id LEFT JOIN hub_projects p ON p.id=s.project_id
 WHERE s.enabled=1 AND (s.next_check_at IS NULL OR s.next_check_at<=?) ORDER BY s.priority DESC,s.last_checked_at ASC LIMIT 100`).bind(now).all();
 let ok=0,errors=0;
 for(const s of sources){
  try{
   const target=s.feed_url||s.url;
   const r=await fetch(target,{headers:{"user-agent":"PyOrex-HUB/1.0 (+https://pyorex.com/hub)","accept":"text/html,application/rss+xml,application/atom+xml,application/xml;q=0.9,*/*;q=0.8"}});
   if(!r.ok)throw new Error("HTTP "+r.status);
   const body=await r.text();
   const signature=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(body.slice(0,250000)));
   const hash=[...new Uint8Array(signature)].map(b=>b.toString(16).padStart(2,"0")).join("");
   await env.PYOREX_DB.prepare(`UPDATE hub_sources SET last_checked_at=?,last_success_at=?,last_error=NULL,consecutive_errors=0,next_check_at=datetime(?,'+7 days'),last_item_url=COALESCE(last_item_url,?),last_item_published_at=COALESCE(last_item_published_at,?) WHERE id=?`).bind(now,now,now,target,now,s.id).run();
   ok++;
   // This endpoint deliberately only monitors source freshness. Event extraction/classification
   // is a separate ingestion step so source text is never auto-published without validation.
   await env.PYOREX_DB.prepare("UPDATE hub_sources SET last_error=? WHERE id=?").bind("content-sha256:"+hash,s.id).run();
  }catch(e){
   errors++;await env.PYOREX_DB.prepare(`UPDATE hub_sources SET last_checked_at=?,last_error=?,consecutive_errors=consecutive_errors+1,next_check_at=datetime(?,'+1 day') WHERE id=?`).bind(now,String(e.message||e).slice(0,500),now,s.id).run();
  }
 }
 await env.PYOREX_DB.prepare("UPDATE hub_scan_runs SET finished_at=?,sources_checked=?,errors=? WHERE id=?").bind(new Date().toISOString(),sources.length,errors,run.id).run();
 return json({status:"success",run_id:run.id,sources_due:sources.length,sources_checked:sources.length,successful:ok,errors,note:"Source monitoring active. Automatic event extraction/publishing is intentionally not enabled until the intelligence validation step is connected."});
}
