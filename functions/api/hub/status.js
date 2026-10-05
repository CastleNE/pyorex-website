function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json; charset=utf-8","Cache-Control":"public, max-age=120"}})}
export async function onRequestGet({env}){
 if(!env.PYOREX_DB)return json({status:"setup_required"},503);
 const [src,pending,runs]=await Promise.all([
  env.PYOREX_DB.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN enabled=1 THEN 1 ELSE 0 END) enabled,SUM(CASE WHEN last_success_at IS NOT NULL THEN 1 ELSE 0 END) checked,SUM(CASE WHEN consecutive_errors>0 THEN 1 ELSE 0 END) failing,MAX(last_success_at) last_success FROM hub_sources`).first(),
  env.PYOREX_DB.prepare("SELECT COUNT(*) n FROM hub_candidates WHERE status='pending'").first(),
  env.PYOREX_DB.prepare("SELECT finished_at,sources_checked,candidates_seen,new_events,duplicates,errors FROM hub_scan_runs ORDER BY id DESC LIMIT 1").first()
 ]);
 return json({status:"success",sources:src,pending_candidates:pending?.n||0,last_scan:runs||null});
}
