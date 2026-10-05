function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json; charset=utf-8","Cache-Control":"public, max-age=300"}})}
export async function onRequestGet({env}){
 if(!env.PYOREX_DB)return json({status:"setup_required",message:"PYOREX_DB is not bound"},503);
 const {results}=await env.PYOREX_DB.prepare(`SELECT s.id,s.name,s.url,s.source_kind,s.priority,s.check_frequency,s.language,s.enabled,s.last_checked_at,s.last_success_at,s.consecutive_errors,s.next_check_at,c.name company,p.name project
 FROM hub_sources s LEFT JOIN hub_companies c ON c.id=s.company_id LEFT JOIN hub_projects p ON p.id=s.project_id ORDER BY s.enabled DESC,s.priority DESC,s.name`).all();
 return json({status:"success",count:results.length,items:results});
}
