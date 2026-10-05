function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
function authorized(request,env){const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||new URL(request.url).searchParams.get("token");return !!env.HUB_INGEST_TOKEN&&token===env.HUB_INGEST_TOKEN}
async function hashText(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
export async function onRequestPost({request,env}){
 if(!env.PYOREX_DB)return json({status:"setup_required",message:"PYOREX_DB is not bound"},503);
 if(!authorized(request,env))return json({status:"unauthorized"},401);
 const now=new Date().toISOString(),run=await env.PYOREX_DB.prepare("INSERT INTO hub_scan_runs(started_at) VALUES(?) RETURNING id").bind(now).first();
 const {results:sources}=await env.PYOREX_DB.prepare(`SELECT s.id,s.name,s.url,s.feed_url,s.source_kind,s.priority,s.language,s.last_checked_at,s.last_error,c.name company,p.name project
 FROM hub_sources s LEFT JOIN hub_companies c ON c.id=s.company_id LEFT JOIN hub_projects p ON p.id=s.project_id
 WHERE s.enabled=1 AND (s.next_check_at IS NULL OR s.next_check_at<=?) ORDER BY s.priority DESC,s.last_checked_at ASC LIMIT 100`).bind(now).all();
 let ok=0,errors=0,candidates=0,unchanged=0;
 for(const s of sources){try{
  const target=s.feed_url||s.url,r=await fetch(target,{headers:{"user-agent":"PyOrex-HUB/1.0 (+https://pyorex.com/hub)","accept":"text/html,application/rss+xml,application/atom+xml,application/xml;q=0.9,*/*;q=0.8"}});
  if(!r.ok)throw new Error("HTTP "+r.status);
  const body=await r.text(),hash=await hashText(body.slice(0,250000)),previous=(s.last_error||"").startsWith("content-sha256:")?s.last_error.slice(15):null;
  if(previous&&previous!==hash){const fp=await hashText(s.id+"|"+hash);const ins=await env.PYOREX_DB.prepare(`INSERT OR IGNORE INTO hub_candidates(fingerprint,source_id,detected_at,source_url,content_hash,project_hint,company_hint) VALUES(?,?,?,?,?,?,?)`).bind(fp,s.id,now,target,hash,s.project||null,s.company||null).run();if((ins.meta?.changes||0)>0)candidates++}else if(previous===hash)unchanged++;
  await env.PYOREX_DB.prepare(`UPDATE hub_sources SET last_checked_at=?,last_success_at=?,last_error=?,consecutive_errors=0,next_check_at=datetime(?,'+7 days') WHERE id=?`).bind(now,now,"content-sha256:"+hash,now,s.id).run();ok++;
 }catch(e){errors++;await env.PYOREX_DB.prepare(`UPDATE hub_sources SET last_checked_at=?,last_error=?,consecutive_errors=consecutive_errors+1,next_check_at=datetime(?,'+1 day') WHERE id=?`).bind(now,String(e.message||e).slice(0,500),now,s.id).run()}}
 await env.PYOREX_DB.prepare("UPDATE hub_scan_runs SET finished_at=?,sources_checked=?,candidates_seen=?,errors=? WHERE id=?").bind(new Date().toISOString(),sources.length,candidates,errors,run.id).run();
 return json({status:"success",run_id:run.id,sources_checked:sources.length,successful:ok,changed:candidates,unchanged,errors,pending_candidates:candidates});
}
