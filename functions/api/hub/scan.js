function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
export async function onRequestPost({request,env}){
 if(!env.PYOREX_DB)return json({status:"setup_required",message:"PYOREX_DB missing"},503);
 if(!env.HUB_SCAN_TOKEN)return json({status:"setup_required",message:"HUB_SCAN_TOKEN missing"},503);
 if(request.headers.get("authorization")!==`Bearer ${env.HUB_SCAN_TOKEN}`)return json({status:"unauthorized"},401);
 const run=await env.PYOREX_DB.prepare("INSERT INTO hub_scan_runs(started_at) VALUES(CURRENT_TIMESTAMP) RETURNING id").first();
 const {results:sources}=await env.PYOREX_DB.prepare("SELECT s.id,s.name,s.url,s.source_kind,c.name company,p.name project FROM hub_sources s LEFT JOIN hub_companies c ON c.id=s.company_id LEFT JOIN hub_projects p ON p.id=s.project_id WHERE s.enabled=1 ORDER BY s.id").all();
 let ok=0,errors=0;const checks=[];
 for(const s of sources){try{const r=await fetch(s.url,{headers:{"user-agent":"PyOrex-HUB-Monitor/1.0 (+https://pyorex.com/hub)"},redirect:"follow"});const good=r.ok;good?ok++:errors++;await env.PYOREX_DB.prepare("UPDATE hub_sources SET last_checked_at=CURRENT_TIMESTAMP,last_success_at=CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE last_success_at END,last_error=? WHERE id=?").bind(good?1:0,good?null:`HTTP ${r.status}`,s.id).run();checks.push({id:s.id,company:s.company,project:s.project,status:r.status,ok:good})}catch(e){errors++;await env.PYOREX_DB.prepare("UPDATE hub_sources SET last_checked_at=CURRENT_TIMESTAMP,last_error=? WHERE id=?").bind(String(e).slice(0,300),s.id).run();checks.push({id:s.id,company:s.company,project:s.project,status:0,ok:false})}}
 await env.PYOREX_DB.prepare("UPDATE hub_scan_runs SET finished_at=CURRENT_TIMESTAMP,sources_checked=?,errors=? WHERE id=?").bind(sources.length,errors,run.id).run();
 return json({status:"success",run_id:run.id,sources_checked:sources.length,reachable:ok,errors,checks});
}