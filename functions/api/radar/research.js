const QUERIES=[
  'mineral exploration porphyry epithermal',
  'mineral exploration structural controls mineralization',
  'lithogeochemistry mineral exploration',
  'mineral prospectivity geochemistry geophysics',
  'mineral exploration Andes Peru'
];
const TERMS=['mineral','exploration','porphyry','epithermal','ore deposit','mineralization','mineralisation','geochemistry','lithogeochemistry','prospectivity','geophysics','remote sensing','structural'];

export async function onRequestGet({request}) {
  const u=new URL(request.url);
  const days=Math.max(1,Math.min(Number(u.searchParams.get('days')||30),180));
  const since=new Date(Date.now()-days*86400000).toISOString().slice(0,10);
  const batches=await Promise.all(QUERIES.map(async q=>{
    const api=new URL('https://api.crossref.org/works');
    api.searchParams.set('query.bibliographic',q);
    api.searchParams.set('filter',`from-pub-date:${since},type:journal-article`);
    api.searchParams.set('rows','12');
    api.searchParams.set('sort','published');
    api.searchParams.set('order','desc');
    api.searchParams.set('select','DOI,title,published,container-title,URL,subject,publisher');
    const r=await fetch(api,{headers:{'User-Agent':'PyOrex Exploration Intelligence (https://pyorex.com)'}});
    return r.ok?(await r.json()).message.items:[];
  }));
  const seen=new Set(); const candidates=[];
  for(const x of batches.flat()){
    const doi=(x.DOI||'').toLowerCase(); if(!doi||seen.has(doi))continue; seen.add(doi);
    const title=(x.title||[])[0]||''; const hay=(title+' '+(x.subject||[]).join(' ')).toLowerCase();
    const hits=TERMS.filter(k=>hay.includes(k)); if(!hits.length)continue;
    const parts=x.published?.['date-parts']?.[0]||[]; const date=parts.length?`${parts[0]}-${String(parts[1]||1).padStart(2,'0')}-${String(parts[2]||1).padStart(2,'0')}`:null;
    candidates.push({id:doi,title,doi,published_at:date,journal:(x['container-title']||[])[0]||'',publisher:x.publisher||'',url:x.URL||`https://doi.org/${doi}`,keyword_hits:hits,score:hits.length});
  }
  candidates.sort((a,b)=>b.score-a.score||String(b.published_at).localeCompare(String(a.published_at)));
  return json({status:'success',source:'Crossref',generated_at:new Date().toISOString(),note:'Research discovery candidates. PyOrex review required before publication.',candidates:candidates.slice(0,50)},200,{'Cache-Control':'public, max-age=1800, s-maxage=21600'});
}
function json(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8',...headers}})}
