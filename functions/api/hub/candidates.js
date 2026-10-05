function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
function auth(request,env){return !!env.HUB_INGEST_TOKEN&&request.headers.get("authorization")===`Bearer ${env.HUB_INGEST_TOKEN}`}
export async function onRequestGet({request,env}){
 if(!env.PYOREX_DB)return json({status:"setup_required"},503);if(!auth(request,env))return json({status:"unauthorized"},401);
 const {results}=await env.PYOREX_DB.prepare(`SELECT q.id,q.detected_at,q.source_url,q.status,q.project_hint,q.company_hint,s.name source_name,s.source_kind,s.language,s.priority FROM hub_candidates q JOIN hub_sources s ON s.id=q.source_id WHERE q.status='pending' ORDER BY s.priority DESC,q.detected_at ASC LIMIT 50`).all();
 return json({status:"success",count:results.length,items:results});
}
export async function onRequestPost({request,env}){
 if(!env.PYOREX_DB)return json({status:"setup_required"},503);if(!auth(request,env))return json({status:"unauthorized"},401);
 let b;try{b=await request.json()}catch{return json({status:"bad_request"},400)}
 const id=Number(b.id),decision=String(b.decision||"");if(!id||!["rejected","error"].includes(decision))return json({status:"bad_request"},400);
 await env.PYOREX_DB.prepare("UPDATE hub_candidates SET status=?,processed_at=CURRENT_TIMESTAMP,error=? WHERE id=? AND status='pending'").bind(decision,b.reason||null,id).run();
 return json({status:"success",id,decision});
}
