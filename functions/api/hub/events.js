function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json; charset=utf-8","Cache-Control":"public, max-age=300"}})}
export async function onRequestGet({request,env}){
 if(!env.PYOREX_DB)return json({status:"setup_required",message:"PYOREX_DB is not bound",items:[]},503);
 const u=new URL(request.url),q=(u.searchParams.get("q")||"").trim(),year=Number(u.searchParams.get("year")||0),quarter=Number(u.searchParams.get("quarter")||0),type=(u.searchParams.get("type")||"").trim(),limit=Math.min(Math.max(Number(u.searchParams.get("limit")||100),1),500);
 let sql=`SELECT e.event_date,e.year,e.quarter,e.event_type,e.title,e.summary,e.why_it_matters,e.commodities,e.source_name,e.source_url,p.name project,p.slug project_slug,c.name company,c.company_type
 FROM hub_events e LEFT JOIN hub_projects p ON p.id=e.project_id LEFT JOIN hub_companies c ON c.id=e.company_id WHERE 1=1`,args=[];
 if(q){sql+=" AND (LOWER(e.title) LIKE ? OR LOWER(p.name) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(e.summary) LIKE ?)";const z="%"+q.toLowerCase()+"%";args.push(z,z,z,z)}
 if(year){sql+=" AND e.year=?";args.push(year)}
 if(quarter>=1&&quarter<=4){sql+=" AND e.quarter=?";args.push(quarter)}
 if(type){sql+=" AND e.event_type=?";args.push(type)}
 sql+=" ORDER BY e.event_date DESC,e.id DESC LIMIT ?";args.push(limit);
 const {results}=await env.PYOREX_DB.prepare(sql).bind(...args).all();
 return json({status:"success",count:results.length,items:results});
}
