function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json; charset=utf-8","Cache-Control":"public, max-age=300"}})}
export async function onRequestGet({env}){
 if(!env.PYOREX_DB)return json({status:"setup_required",message:"PYOREX_DB is not bound"},503);
 const [projects,companies,events,sources,last]=await Promise.all([
  env.PYOREX_DB.prepare("SELECT COUNT(*) n FROM hub_projects").first(),
  env.PYOREX_DB.prepare("SELECT COUNT(*) n FROM hub_companies").first(),
  env.PYOREX_DB.prepare("SELECT COUNT(*) n FROM hub_events").first(),
  env.PYOREX_DB.prepare("SELECT COUNT(*) n FROM hub_sources WHERE enabled=1").first(),
  env.PYOREX_DB.prepare("SELECT finished_at,sources_checked,new_events,errors FROM hub_scan_runs ORDER BY id DESC LIMIT 1").first()
 ]);
 return json({status:"success",projects:projects?.n||0,companies:companies?.n||0,events:events?.n||0,enabled_sources:sources?.n||0,last_scan:last||null});
}
