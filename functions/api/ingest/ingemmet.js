const SERVICE="https://geocatmin.ingemmet.gob.pe/arcgis/rest/services/SERV_OCURRENCIA_MINERAL/MapServer/0/query";
function clean(v){return v==null?null:String(v).trim()}
function metals(v=""){const s=String(v).toUpperCase(),r=[["Au",/\bAU\b|ORO/],["Ag",/\bAG\b|PLATA/],["Cu",/\bCU\b|COBRE/],["Zn",/\bZN\b|ZINC/],["Pb",/\bPB\b|PLOMO/]];return r.filter(([,x])=>x.test(s)).map(([m])=>m)}
export async function onRequestPost({request,env}){
 if(!env.PYOREX_DB)return Response.json({error:"PYOREX_DB not configured"},{status:503});
 if(env.PYOREX_INGEST_SECRET&&request.headers.get("authorization")!=="Bearer "+env.PYOREX_INGEST_SECRET)return Response.json({error:"unauthorized"},{status:401});
 let offset=0,total=0,pages=0; const batchSize=500;
 while(pages<20){
  const q=new URL(SERVICE);q.search=new URLSearchParams({where:"1=1",outFields:"OBJECTID,NOMBRE,ELEMENTO,ESTADO,LATITUD,LONGITUD,FRANJA,TIPO_DEPOS,EDAD,FORMACION,GLOBALID,LINK",returnGeometry:"true",outSR:"4326",f:"json",resultOffset:String(offset),resultRecordCount:String(batchSize)}).toString();
  const r=await fetch(q);if(!r.ok)return Response.json({status:"upstream_unavailable",stored:total,http:r.status},{status:502});
  const j=await r.json();if(j.error)return Response.json({status:"upstream_error",stored:total,details:j.error},{status:502});
  const fs=j.features||[];if(!fs.length)break;
  const stmts=fs.map(f=>{const a=f.attributes||{},g=f.geometry||{},id=clean(a.GLOBALID)||String(a.OBJECTID),lat=Number(a.LATITUD??g.y),lon=Number(a.LONGITUD??g.x),cs=metals(a.ELEMENTO),payload={status:clean(a.ESTADO),raw_element:clean(a.ELEMENTO),deposit_model:clean(a.TIPO_DEPOS),metallogenic_belt:clean(a.FRANJA),age:clean(a.EDAD),formation:clean(a.FORMACION)};return env.PYOREX_DB.prepare("INSERT INTO source_records(source,source_layer,source_id,name,latitude,longitude,commodities,payload,validation_status,source_url,fetched_at) VALUES('INGEMMET','metallic',?,?,?,?,?,?,?,'validated',?,CURRENT_TIMESTAMP) ON CONFLICT(source,source_id) DO UPDATE SET name=excluded.name,latitude=excluded.latitude,longitude=excluded.longitude,commodities=excluded.commodities,payload=excluded.payload,validation_status=excluded.validation_status,source_url=excluded.source_url,fetched_at=CURRENT_TIMESTAMP").bind(id,clean(a.NOMBRE),lat,lon,JSON.stringify(cs),JSON.stringify(payload),clean(a.LINK))});
  for(let i=0;i<stmts.length;i+=80)await env.PYOREX_DB.batch(stmts.slice(i,i+80)); total+=fs.length;pages++;offset+=fs.length;if(!j.exceededTransferLimit&&fs.length<batchSize)break;
 }
 return Response.json({status:"success",source:"INGEMMET",stored:total,pages});
}
