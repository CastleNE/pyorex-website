export async function onRequestGet({request,env}) {
  if(!env.PYOREX_DB) return json({status:'setup_required',message:'D1 binding PYOREX_DB is not configured yet.',items:[]},503);
  const u=new URL(request.url);
  const status=u.searchParams.get('status');
  const category=u.searchParams.get('category');
  const limit=Math.min(Math.max(Number(u.searchParams.get('limit')||50),1),100);
  let sql='SELECT id,title,canonical_url,source_name,published_at,category,country,region,company,project,commodities,deposit_models,stage,opportunity_type,score,score_reasons,status,summary,why_it_matters,created_at FROM radar_items';
  const where=[]; const args=[];
  if(status){where.push('status = ?');args.push(status)}
  if(category){where.push('category = ?');args.push(category)}
  if(where.length) sql+=' WHERE '+where.join(' AND ');
  sql+=' ORDER BY CASE status WHEN \'new\' THEN 0 WHEN \'reviewed\' THEN 1 WHEN \'approved\' THEN 2 ELSE 3 END, score DESC, published_at DESC LIMIT ?';
  args.push(limit);
  const {results}=await env.PYOREX_DB.prepare(sql).bind(...args).all();
  return json({status:'success',count:results.length,items:results});
}
function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json; charset=utf-8','Cache-Control':'no-store'}})}
