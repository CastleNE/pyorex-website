const KEYWORDS = [
  'drill','drilling','discovery','exploration','acquisition','acquire','option','farm-in',
  'farm in','concession','staking','mineral resource','technical report','copper','gold',
  'silver','zinc','porphyry','epithermal','skarn','vms','ioccg','iocg'
];

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || 40), 100);
  const forms = '6-K,8-K,20-F,40-F';
  const feed = new URL('https://www.sec.gov/cgi-bin/browse-edgar');
  feed.searchParams.set('action','getcurrent');
  feed.searchParams.set('type',forms);
  feed.searchParams.set('company','');
  feed.searchParams.set('dateb','');
  feed.searchParams.set('owner','include');
  feed.searchParams.set('start','0');
  feed.searchParams.set('count',String(limit));
  feed.searchParams.set('output','atom');

  const res = await fetch(feed, {
    headers: {
      'User-Agent': 'PyOrex Exploration Intelligence contact@pyorex.com',
      'Accept': 'application/atom+xml, application/xml;q=0.9'
    }
  });
  if (!res.ok) return json({status:'error',message:'SEC feed unavailable'},502);
  const xml = await res.text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
    const e=m[1];
    const pick=(tag)=>(e.match(new RegExp('<'+tag+'[^>]*>([\\s\\S]*?)<\\/'+tag+'>'))||[])[1]||'';
    const title=decode(pick('title').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
    const summary=decode(pick('summary').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
    const href=(e.match(/<link[^>]+href="([^"]+)"/)||[])[1]||'';
    const updated=pick('updated');
    const hay=(title+' '+summary).toLowerCase();
    const hits=KEYWORDS.filter(k=>hay.includes(k));
    return {title,summary,url:href,updated,keyword_hits:hits,score:hits.length};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);

  return json({
    status:'success',
    source:'SEC EDGAR Latest Filings',
    generated_at:new Date().toISOString(),
    note:'Candidate discovery feed only. Items require primary-source geological review before PyOrex publication.',
    candidates:entries
  },200,{'Cache-Control':'public, max-age=900, s-maxage=3600'});
}

function decode(s){return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"')}
function json(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8',...headers}})}
