function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
function auth(request,env){return !!env.HUB_INGEST_TOKEN&&request.headers.get("authorization")===`Bearer ${env.HUB_INGEST_TOKEN}`}
export async function onRequestGet({request,env}){
 if(!env.PYOREX_DB)return json({status:"setup_required"},503);if(!auth(request,env))return json({status:"unauthorized"},401);
 const u=new URL(request.url),priority=u.searchParams.get("priority")||"all",limit=Math.min(100,Math.max(1,Number(u.searchParams.get("limit")||50)||50));
 const conditions=["q.status='pending'"];
 if(priority==="high")conditions.push("q.materiality_score>=75");
 else if(priority==="review")conditions.push("q.materiality_score>=50 AND q.materiality_score<75");
 else if(priority==="low")conditions.push("q.materiality_score<50");
 else if(priority==="unclassified")conditions.push("q.materiality_score IS NULL");
 else if(priority!=="all")return json({status:"bad_request",message:"Invalid priority filter"},400);
 const sql=`SELECT q.id,q.detected_at,q.source_url,q.status,q.project_hint,q.company_hint,q.materiality_score,q.classification,q.rationale,q.reviewed_by,s.name source_name,s.source_kind,s.language,s.priority source_priority
 FROM hub_candidates q JOIN hub_sources s ON s.id=q.source_id WHERE ${conditions.join(" AND ")}
 ORDER BY COALESCE(q.materiality_score,-1) DESC,s.priority DESC,q.detected_at DESC LIMIT ?`;
 const {results}=await env.PYOREX_DB.prepare(sql).bind(limit).all();
 return json({status:"success",count:results.length,priority,items:results});
}
export async function onRequestPost({request,env}){
 if(!env.PYOREX_DB)return json({status:"setup_required"},503);if(!auth(request,env))return json({status:"unauthorized"},401);
 let b;try{b=await request.json()}catch{return json({status:"bad_request"},400)}
 const id=Number(b.id),decision=String(b.decision||"");if(!id||!["rejected","error"].includes(decision))return json({status:"bad_request"},400);
 const score=b.materiality_score==null?null:Math.max(0,Math.min(100,Number(b.materiality_score)));
 await env.PYOREX_DB.prepare("UPDATE hub_candidates SET status=?,processed_at=CURRENT_TIMESTAMP,error=?,materiality_score=?,classification=?,rationale=?,reviewed_by=? WHERE id=? AND status='pending'").bind(decision,b.reason||null,score,b.classification||null,b.rationale||null,b.reviewed_by||"pyorex-intelligence",id).run();
 return json({status:"success",id,decision});
}
