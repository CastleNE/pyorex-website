function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
const slug=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
async function sha256(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
export async function onRequestPost({request,env}){
 if(!env.PYOREX_DB)return json({status:"setup_required"},503);
 if(!env.HUB_INGEST_TOKEN)return json({status:"setup_required",message:"HUB_INGEST_TOKEN missing"},503);
 if(request.headers.get("authorization")!==`Bearer ${env.HUB_INGEST_TOKEN}`)return json({status:"unauthorized"},401);
 let body;try{body=await request.json()}catch{return json({status:"bad_request"},400)}
 const {candidate_id=null,project,company,event_date,event_type,title,title_es="",summary="",summary_es="",why_it_matters="",why_it_matters_es="",commodities=[],source_name,source_url,source_type="primary",relevance="material",verified=true,ingestion_method="automated"}=body||{};
 if(!event_date||!event_type||!title||!source_name||!source_url||(!project&&!company))return json({status:"bad_request",message:"missing required fields"},400);
 if(ingestion_method==="automated"&&(!title_es||!summary_es||!why_it_matters_es))return json({status:"bad_request",message:"automated events require title_es, summary_es and why_it_matters_es"},400);
 const pslug=project?slug(project):null;
 const p=pslug?await env.PYOREX_DB.prepare("SELECT id,company_id FROM hub_projects WHERE slug=?").bind(pslug).first():null;
 let cid=p?.company_id||null;if(!cid&&company){const c=await env.PYOREX_DB.prepare("SELECT id FROM hub_companies WHERE name=?").bind(company).first();cid=c?.id||null}
 if(project&&!p)return json({status:"unknown_project",project},422);if(company&&!cid)return json({status:"unknown_company",company},422);
 const d=new Date(event_date+"T00:00:00Z");if(Number.isNaN(d.getTime()))return json({status:"bad_date"},400);
 const fp=await sha256([pslug||"",company||"",event_date,event_type,title,source_url].join("|"));
 const verifiedAt=verified?new Date().toISOString():null;
 let rr;
 try{rr=await env.PYOREX_DB.prepare(`INSERT OR IGNORE INTO hub_events(fingerprint,project_id,company_id,event_date,year,quarter,event_type,title,title_es,summary,summary_es,why_it_matters,why_it_matters_es,commodities,source_name,source_url,source_type,relevance,verified_at,ingestion_method) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(fp,p?.id||null,cid,event_date,d.getUTCFullYear(),Math.floor(d.getUTCMonth()/3)+1,event_type,title,title_es,summary,summary_es,why_it_matters,why_it_matters_es,JSON.stringify(commodities),source_name,source_url,source_type,relevance,verifiedAt,ingestion_method).run()}
 catch(e){return json({status:"migration_required",message:"Apply migrations/0005_hub_automation_i18n.sql before bilingual ingestion.",detail:String(e.message||e)},503)}
 if(p?.id)await env.PYOREX_DB.prepare("UPDATE hub_projects SET last_material_update_at=MAX(COALESCE(last_material_update_at,''),?),last_checked_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(event_date,p.id).run();
 if(candidate_id){const ev=await env.PYOREX_DB.prepare("SELECT id FROM hub_events WHERE fingerprint=?").bind(fp).first();await env.PYOREX_DB.prepare("UPDATE hub_candidates SET status='accepted',processed_at=CURRENT_TIMESTAMP,event_id=?,error=NULL WHERE id=? AND status='pending'").bind(ev?.id||null,Number(candidate_id)).run()}
 return json({status:"success",inserted:(rr.meta?.changes||0)>0,fingerprint:fp,candidate_id:candidate_id||null,bilingual:!!title_es,verified:!!verifiedAt},(rr.meta?.changes||0)>0?201:200);
}