const SERVICE = "https://geocatmin.ingemmet.gob.pe/arcgis/rest/services/SERV_OCURRENCIA_MINERAL/MapServer";

function clean(v){ return v == null ? null : String(v).trim(); }
function metals(v=""){
  const s=String(v).toUpperCase();
  const rules=[["Au",/\bAU\b|ORO/],["Ag",/\bAG\b|PLATA/],["Cu",/\bCU\b|COBRE/],["Zn",/\bZN\b|ZINC/],["Pb",/\bPB\b|PLOMO/]];
  return rules.filter(([,r])=>r.test(s)).map(([m])=>m);
}
function feature(f,layer){
  const a=f.attributes||{}, g=f.geometry||{};
  if(layer===0) return {
    source:"INGEMMET", source_layer:"metallic", source_id:clean(a.GLOBALID)||String(a.OBJECTID),
    name:clean(a.NOMBRE), commodities:metals(a.ELEMENTO), raw_element:clean(a.ELEMENTO),
    status:clean(a.ESTADO), deposit_model:clean(a.TIPO_DEPOS), metallogenic_belt:clean(a.FRANJA),
    age:clean(a.EDAD), formation:clean(a.FORMACION), latitude:Number(a.LATITUD??g.y), longitude:Number(a.LONGITUD??g.x),
    validated:true, source_link:clean(a.LINK)
  };
  return {
    source:"INGEMMET", source_layer:"reference", source_id:clean(a.GLOBALID)||String(a.OBJECTID),
    name:clean(a.NOMBRE_DE_), commodities:metals(a.ELEMENTO), raw_element:clean(a.ELEMENTO),
    minerals:clean(a.MINERALES_), department:clean(a.NOMBRE_DEP), province:clean(a.PROVINCIA),
    district:clean(a.DISTRITO), sheet:clean(a.HOJA_CATAS), latitude:Number(a.LATITUD_DE??g.y),
    longitude:Number(a.LONGITUD_D??g.x), validated:String(a.VALIDADO||"").toLowerCase()==="si"
  };
}
export async function onRequestGet({request}){
  const u=new URL(request.url), layer=u.searchParams.get("layer")==="reference"?2:0;
  const commodity=(u.searchParams.get("commodity")||"").trim();
  const limit=Math.min(Math.max(Number(u.searchParams.get("limit")||300),1),1000);
  const offset=Math.max(Number(u.searchParams.get("offset")||0),0);
  const fields=layer===0?"OBJECTID,TIPO,NOMBRE,ELEMENTO,ESTADO,LATITUD,LONGITUD,FRANJA,TIPO_DEPOS,EDAD,FORMACION,GLOBALID,LINK":"OBJECTID,CODIGO_INT,CLASE_DE_R,NOMBRE_DE_,ELEMENTO,MINERALES_,NOMBRE_DEP,PROVINCIA,DISTRITO,HOJA_CATAS,LATITUD_DE,LONGITUD_D,GLOBALID,VALIDADO";
  const q=new URL(SERVICE+"/"+layer+"/query");
  q.search=new URLSearchParams({where:"1=1",outFields:fields,returnGeometry:"true",outSR:"4326",f:"json"}).toString();
  const r=await fetch(q,{headers:{"User-Agent":"PyOrex-HUB/1.0"}});
  if(!r.ok) return Response.json({error:"INGEMMET upstream unavailable"},{status:502});
  const j=await r.json();
  if(j.error) return Response.json({error:"INGEMMET query failed",details:j.error.message},{status:502});
  let items=(j.features||[]).map(x=>feature(x,layer)).filter(x=>Number.isFinite(x.latitude)&&Number.isFinite(x.longitude));
  if(commodity) items=items.filter(x=>x.commodities.includes(commodity));
  items=items.slice(offset,offset+limit);
  return Response.json({source:"INGEMMET GEOCATMIN",layer:layer===0?"metallic":"reference",warning:layer===2?"Reference occurrences are not validated by INGEMMET; PyOrex preserves that distinction.":null,count:items.length,items},{headers:{"Cache-Control":"public, max-age=21600"}});
}