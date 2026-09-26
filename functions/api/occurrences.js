function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json; charset=utf-8","Cache-Control":"public, max-age=900"}})}
export async function onRequestGet({request,env}){
 if(!env.PYOREX_DB)return json({status:"setup_required",message:"PYOREX_DB is not bound",items:[]},503);
 const u=new URL(request.url), commodity=(u.searchParams.get("commodity")||"").trim(), limit=Math.min(Math.max(Number(u.searchParams.get("limit")||1000),1),3000);
 const b=(u.searchParams.get("bbox")||"").split(",").map(Number); let sql="SELECT source_id,name,latitude,longitude,commodities,payload,validation_status,source_url FROM source_records WHERE source='INGEMMET' AND source_layer='metallic'",args=[];
 if(b.length===4&&b.every(Number.isFinite)){sql+=" AND longitude BETWEEN ? AND ? AND latitude BETWEEN ? AND ?";args.push(b[0],b[2],b[1],b[3])}
 if(commodity){sql+=" AND commodities LIKE ?";args.push('%"'+commodity+'"%')}
 sql+=" ORDER BY name LIMIT ?";args.push(limit);
 const {results}=await env.PYOREX_DB.prepare(sql).bind(...args).all();
 const items=results.map(r=>{let p={};try{p=JSON.parse(r.payload||"{}")}catch{}return {...p,source:"INGEMMET",source_layer:"metallic",source_id:r.source_id,name:r.name,latitude:r.latitude,longitude:r.longitude,commodities:JSON.parse(r.commodities||"[]"),validated:r.validation_status==="validated",source_link:r.source_url}});
 return json({status:"success",mode:"pyorex_store",source:"INGEMMET GEOCATMIN",count:items.length,items});
}
