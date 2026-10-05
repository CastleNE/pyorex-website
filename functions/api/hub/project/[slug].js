function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json; charset=utf-8","Cache-Control":"public, max-age=300"}})}
export async function onRequestGet({request,env,params}){
 if(!env.PYOREX_DB)return json({status:"setup_required",message:"PYOREX_DB is not bound",items:[]},503);
 const slug=String(params.slug||"").trim(); if(!slug)return json({status:"error",message:"Project slug required",items:[]},400);
 const project=await env.PYOREX_DB.prepare(`SELECT p.id,p.slug,p.name,p.country,p.region,p.commodities,p.stage,p.last_material_update_at,c.name company,c.slug company_slug,c.company_type FROM hub_projects p LEFT JOIN hub_companies c ON c.id=p.company_id WHERE p.slug=? LIMIT 1`).bind(slug).first();
 if(!project)return json({status:"not_found",message:"Project not found",items:[]},404);
 const {results}=await env.PYOREX_DB.prepare(`SELECT event_date,year,quarter,event_type,title,title_es,summary,summary_es,why_it_matters,why_it_matters_es,commodities,source_name,source_url,source_type,relevance FROM hub_events WHERE project_id=? ORDER BY event_date DESC,id DESC`).bind(project.id).all();
 return json({status:"success",project,count:results.length,items:results});
}