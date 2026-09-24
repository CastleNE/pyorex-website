export async function onRequestGet({request}) {
  const base=new URL(request.url);
  const targets=['/api/radar/sec','/api/radar/research'];
  const results=await Promise.all(targets.map(async p=>{try{const r=await fetch(new URL(p,base.origin));return r.ok?await r.json():{candidates:[]}}catch{return {candidates:[]}}}));
  const candidates=results.flatMap((x,i)=>(x.candidates||[]).map(c=>({...c,channel:i===0?'corporate':'research'})));
  candidates.sort((a,b)=>(b.score||0)-(a.score||0));
  return new Response(JSON.stringify({status:'success',generated_at:new Date().toISOString(),candidate_count:candidates.length,candidates}),{headers:{'content-type':'application/json; charset=utf-8','Cache-Control':'public, max-age=900, s-maxage=3600'}});
}
