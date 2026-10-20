import { screenHeadline } from "../../../src/lib/hub-materiality.js";
import { extractFeedEntries, discoverFeedUrl, extractNewsLinks } from "../../../src/lib/hub-source-links.js";
function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json; charset=utf-8","Cache-Control":"no-store"}})}
function authorized(request,env){const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");return !!env.HUB_INGEST_TOKEN&&token===env.HUB_INGEST_TOKEN}
async function hashText(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
export async function onRequestPost({request,env}){
 if(!env.PYOREX_DB)return json({status:"setup_required",message:"PYOREX_DB is not bound"},503);
 if(!authorized(request,env))return json({status:"unauthorized"},401);
 const now=new Date().toISOString(),run=await env.PYOREX_DB.prepare("INSERT INTO hub_scan_runs(started_at) VALUES(?) RETURNING id").bind(now).first();
 const {results:sources}=await env.PYOREX_DB.prepare(`SELECT s.id,s.name,s.url,s.feed_url,s.source_kind,s.priority,s.language,s.last_checked_at,s.last_error,c.name company,p.name project
 FROM hub_sources s LEFT JOIN hub_companies c ON c.id=s.company_id LEFT JOIN hub_projects p ON p.id=s.project_id
 WHERE s.enabled=1 AND (s.next_check_at IS NULL OR s.next_check_at<=?) ORDER BY s.priority DESC,s.last_checked_at ASC LIMIT 100`).bind(now).all();
 let ok=0,errors=0,candidates=0,unchanged=0;
 for(const s of sources){try{
  const target=s.feed_url||s.url,r=await fetch(target,{headers:{"user-agent":"PyOrex-HUB/1.0 (+https://pyorex.com/hub)","accept":"text/html,application/rss+xml,application/atom+xml,application/xml;q=0.9,*/*;q=0.8"}});
  if(!r.ok)throw new Error("HTTP "+r.status);
  let body=(await r.text()).slice(0,500000);
  let feedItems=extractFeedEntries(body,target,20);
  let discoveredFeed="";
  if(!feedItems.length && !s.feed_url){
    const alternate=discoverFeedUrl(body,target);
    if(alternate){
      try{
        const feedResponse=await fetch(alternate,{headers:{"user-agent":"PyOrex-HUB/1.0 (+https://pyorex.com/hub)","accept":"application/rss+xml,application/atom+xml,application/xml;q=0.9"}});
        if(feedResponse.ok){
          const xml=(await feedResponse.text()).slice(0,500000);
          const found=extractFeedEntries(xml,alternate,20);
          if(found.length){feedItems=found;discoveredFeed=alternate;body=xml}
        }
      }catch(_){ /* Homepage remains a valid fallback when feed discovery fails. */ }
    }
  }
  if(!feedItems.length)feedItems=extractNewsLinks(body,target,12);
  const hash=await hashText(body.slice(0,250000));
  const previous=(s.last_error||"").startsWith("content-sha256:")?s.last_error.slice(15):null;
  if(discoveredFeed){
    await env.PYOREX_DB.prepare("UPDATE hub_sources SET feed_url=? WHERE id=?").bind(discoveredFeed,s.id).run();
  }
  if(feedItems.length){
    // Every extracted headline remains unverified until a separate editorial validation step.
    for(const item of feedItems.slice(0,20)){
      const assessment=screenHeadline(item.title);
      const fp=await hashText(item.kind+"|"+s.id+"|"+item.url);
      const rationale=("Headline: "+item.title+" | "+assessment.rationale+(item.date?" | Published: "+item.date:"")).slice(0,1400);
      const ins=await env.PYOREX_DB.prepare(`INSERT OR IGNORE INTO hub_candidates(fingerprint,source_id,detected_at,source_url,content_hash,project_hint,company_hint,classification,materiality_score,rationale,reviewed_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(fp,s.id,now,item.url,await hashText(item.title+"|"+item.date),s.project||null,s.company||null,assessment.classification,assessment.materiality_score,rationale,item.kind+"+"+assessment.method).run();
      if((ins.meta?.changes||0)>0)candidates++;
    }
  }else if(previous&&previous!==hash){
    // HTML changes are queued for review, never misrepresented as individual articles.
    const fp=await hashText("source-change|"+s.id+"|"+hash);const ins=await env.PYOREX_DB.prepare(`INSERT OR IGNORE INTO hub_candidates(fingerprint,source_id,detected_at,source_url,content_hash,project_hint,company_hint,classification,rationale) VALUES(?,?,?,?,?,?,?,?,?)`).bind(fp,s.id,now,target,hash,s.project||null,s.company||null,"source_change","Website content changed; article not yet identified").run();if((ins.meta?.changes||0)>0)candidates++;
  }else if(previous===hash)unchanged++;
  await env.PYOREX_DB.prepare(`UPDATE hub_sources SET last_checked_at=?,last_success_at=?,last_error=?,consecutive_errors=0,next_check_at=datetime(?,'+7 days') WHERE id=?`).bind(now,now,"content-sha256:"+hash,now,s.id).run();ok++;
 }catch(e){errors++;await env.PYOREX_DB.prepare(`UPDATE hub_sources SET last_checked_at=?,last_error=?,consecutive_errors=consecutive_errors+1,next_check_at=datetime(?,'+1 day') WHERE id=?`).bind(now,String(e.message||e).slice(0,500),now,s.id).run()}}
 // Screen unclassified feed candidates created before materiality scoring was enabled.
 // Never mark title-only screening as a verified publication.
 const {results:unscreened}=await env.PYOREX_DB.prepare("SELECT id,rationale FROM hub_candidates WHERE status='pending' AND classification='feed_article' AND reviewed_by IS NULL ORDER BY detected_at DESC LIMIT 100").all();
 let rescored=0;
 for(const item of unscreened){
  const title=String(item.rationale||"").split(" | ")[0],assessment=screenHeadline(title);
  const upd=await env.PYOREX_DB.prepare("UPDATE hub_candidates SET classification=?,materiality_score=?,rationale=?,reviewed_by=? WHERE id=? AND status='pending' AND reviewed_by IS NULL").bind(assessment.classification,assessment.materiality_score,("Headline: "+title+" | "+assessment.rationale).slice(0,1400),assessment.method,item.id).run();
  rescored+=upd.meta?.changes||0;
 }
 await env.PYOREX_DB.prepare("UPDATE hub_scan_runs SET finished_at=?,sources_checked=?,candidates_seen=?,errors=? WHERE id=?").bind(new Date().toISOString(),sources.length,candidates,errors,run.id).run();
 return json({status:"success",run_id:run.id,sources_checked:sources.length,successful:ok,changed:candidates,unchanged,errors,new_candidates:candidates,previous_candidates_screened:rescored,published_events:0});
}
