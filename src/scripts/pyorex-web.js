import * as XLSX from 'xlsx';

const state={rows:[],columns:[],numeric:[],mode:'GEOCHEMISTRY',fileName:'',sheetName:'',processed:[]};

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const finite=v=>Number.isFinite(v);

function parseCell(v, rule='half'){
  if(v===null||v===undefined||String(v).trim()==='') return {value:null,flag:'missing'};
  if(typeof v==='number') return {value:finite(v)?v:null,flag:null};
  const s=String(v).trim();
  if(/^(nd|bdl|na|n\/a|-)$/i.test(s)) return {value:null,flag:'nd'};
  const m=s.match(/^([<>])\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)$/i);
  if(m){
    const dl=Number(m[2]);
    if(!finite(dl)) return {value:null,flag:'text'};
    if(m[1]==='<'){
      if(rule==='null') return {value:null,flag:'lt',dl};
      if(rule==='dl') return {value:dl,flag:'lt',dl};
      return {value:dl/2,flag:'lt',dl};
    }
    return {value:dl,flag:'gt',dl};
  }
  const n=Number(s.replace(/,/g,''));
  return finite(n)?{value:n,flag:null}:{value:null,flag:'text'};
}

function mean(a){return a.length?a.reduce((x,y)=>x+y,0)/a.length:null}
function median(a){if(!a.length)return null;const b=[...a].sort((x,y)=>x-y),n=b.length,m=Math.floor(n/2);return n%2?b[m]:(b[m-1]+b[m])/2}
function quantile(a,q){if(!a.length)return null;const b=[...a].sort((x,y)=>x-y),p=(b.length-1)*q,i=Math.floor(p),f=p-i;return b[i+1]!==undefined?b[i]+f*(b[i+1]-b[i]):b[i]}
function sd(a){if(a.length<2)return null;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1))}
function fmt(v){if(v===null||!finite(v))return '—';const av=Math.abs(v);if(av!==0&&(av>=100000||av<0.001))return v.toExponential(3);return Number(v.toPrecision(5)).toLocaleString(undefined,{maximumFractionDigits:5})}

async function readWorkbook(file){
  const buf=await file.arrayBuffer();
  const wb=XLSX.read(buf,{type:'array',cellDates:true});
  const sn=wb.SheetNames[0];
  const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{defval:null,raw:true});
  return {rows,sheetName:sn};
}

function detectColumns(rows){
  const cols=[...new Set(rows.flatMap(r=>Object.keys(r)))];
  const numeric=[];
  for(const c of cols){
    const vals=rows.slice(0,1000).map(r=>r[c]).filter(v=>v!==null&&v!==undefined&&String(v).trim()!=='');
    if(!vals.length)continue;
    const ok=vals.filter(v=>parseCell(v,'half').value!==null).length/vals.length;
    if(ok>=0.7)numeric.push(c);
  }
  return {cols,numeric};
}

function processRows(){
  const rule=$('nd-rule')?.value||'half';
  state.processed=state.rows.map(r=>{
    const o={...r};
    for(const c of state.numeric)o[c]=parseCell(r[c],rule).value;
    return o;
  });
}

function renderOverview(){
  $('file-name').textContent=state.fileName;
  $('sheet-name').textContent=state.sheetName||'—';
  $('row-count').textContent=state.rows.length.toLocaleString();
  $('col-count').textContent=state.columns.length;
  $('num-count').textContent=state.numeric.length;
  $('mode-value').textContent=state.mode;
  $('field-tags').innerHTML=state.columns.slice(0,30).map(c=>'<span>'+esc(c)+'</span>').join('')+(state.columns.length>30?'<span>+'+(state.columns.length-30)+' more</span>':'');
  const head=state.columns.slice(0,10);
  $('data-head').innerHTML='<tr>'+head.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr>';
  $('data-body').innerHTML=state.rows.slice(0,8).map(r=>'<tr>'+head.map(c=>'<td>'+esc(r[c]??'')+'</td>').join('')+'</tr>').join('');
}

function statsFor(c){
  const raw=state.rows.map(r=>r[c]);
  const parsed=raw.map(v=>parseCell(v,$('nd-rule')?.value||'half'));
  const vals=parsed.map(x=>x.value).filter(finite);
  return {
    variable:c,n:vals.length,missing:raw.length-vals.length,
    lt:parsed.filter(x=>x.flag==='lt').length,
    min:vals.length?Math.min(...vals):null,max:vals.length?Math.max(...vals):null,
    mean:mean(vals),median:median(vals),sd:sd(vals),p90:quantile(vals,.9),p95:quantile(vals,.95)
  };
}

function renderStats(){
  processRows();
  const stats=state.numeric.map(statsFor);
  $('stats-body').innerHTML=stats.map(s=>`<tr><td>${esc(s.variable)}</td><td>${s.n}</td><td>${s.missing}</td><td>${s.lt}</td><td>${fmt(s.min)}</td><td>${fmt(s.max)}</td><td>${fmt(s.mean)}</td><td>${fmt(s.median)}</td><td>${fmt(s.sd)}</td><td>${fmt(s.p90)}</td><td>${fmt(s.p95)}</td></tr>`).join('');
  fillSelects();
}

function fillSelects(){
  const opts=state.numeric.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');
  for(const id of ['x-var','y-var','hist-var']){const el=$(id);if(el){const old=el.value;el.innerHTML=opts;if(state.numeric.includes(old))el.value=old}}
  if($('y-var')&&state.numeric.length>1&&!$('y-var').value)$('y-var').selectedIndex=1;
}

function svgScatter(xc,yc){
  const pairs=state.processed.map(r=>[r[xc],r[yc]]).filter(([x,y])=>finite(x)&&finite(y)).slice(0,5000);
  if(!pairs.length)return '<div class="empty">No numeric pairs available.</div>';
  const xs=pairs.map(p=>p[0]),ys=pairs.map(p=>p[1]);
  let xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
  if(xmin===xmax){xmin-=1;xmax+=1} if(ymin===ymax){ymin-=1;ymax+=1}
  const W=760,H=430,p=55,sx=x=>p+(x-xmin)/(xmax-xmin)*(W-2*p),sy=y=>H-p-(y-ymin)/(ymax-ymin)*(H-2*p);
  const pts=pairs.map(([x,y])=>`<circle cx="${sx(x).toFixed(2)}" cy="${sy(y).toFixed(2)}" r="2.4"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="plot"><line x1="${p}" y1="${H-p}" x2="${W-p}" y2="${H-p}"/><line x1="${p}" y1="${p}" x2="${p}" y2="${H-p}"/><g class="pts">${pts}</g><text x="${W/2}" y="${H-12}" text-anchor="middle">${esc(xc)}</text><text x="16" y="${H/2}" transform="rotate(-90 16 ${H/2})" text-anchor="middle">${esc(yc)}</text><text x="${p}" y="${H-p+20}">${fmt(xmin)}</text><text x="${W-p}" y="${H-p+20}" text-anchor="end">${fmt(xmax)}</text><text x="${p-8}" y="${p+4}" text-anchor="end">${fmt(ymax)}</text><text x="${p-8}" y="${H-p+4}" text-anchor="end">${fmt(ymin)}</text></svg>`;
}

function svgHist(c){
  const a=state.processed.map(r=>r[c]).filter(finite);
  if(!a.length)return '<div class="empty">No numeric values available.</div>';
  let min=Math.min(...a),max=Math.max(...a);if(min===max){min-=.5;max+=.5}
  const bins=Math.max(6,Math.min(24,Math.ceil(Math.sqrt(a.length))));
  const counts=Array(bins).fill(0),step=(max-min)/bins;
  for(const v of a)counts[Math.min(bins-1,Math.floor((v-min)/step))]++;
  const W=760,H=430,p=55,mx=Math.max(...counts,1),bw=(W-2*p)/bins;
  const bars=counts.map((n,i)=>{const h=n/mx*(H-2*p);return `<rect x="${p+i*bw+1}" y="${H-p-h}" width="${Math.max(1,bw-2)}" height="${h}"/>`}).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="plot"><line x1="${p}" y1="${H-p}" x2="${W-p}" y2="${H-p}"/><line x1="${p}" y1="${p}" x2="${p}" y2="${H-p}"/><g class="bars">${bars}</g><text x="${W/2}" y="${H-12}" text-anchor="middle">${esc(c)}</text><text x="${p}" y="${H-p+20}">${fmt(min)}</text><text x="${W-p}" y="${H-p+20}" text-anchor="end">${fmt(max)}</text><text x="${p-8}" y="${p+4}" text-anchor="end">${mx}</text></svg>`;
}

function renderCharts(){
  processRows();
  const x=$('x-var')?.value,y=$('y-var')?.value,h=$('hist-var')?.value;
  if(x&&y)$('scatter-plot').innerHTML=svgScatter(x,y);
  if(h)$('hist-plot').innerHTML=svgHist(h);
}

function spectralWideCandidates(){
  return state.columns.map(c=>({c,w:Number(String(c).replace(/[^0-9.]/g,''))})).filter(x=>finite(x.w)&&x.w>=350&&x.w<=2600).sort((a,b)=>a.w-b.w);
}
function spectralLongCols(){
  const wl=state.columns.find(c=>/wave|wavelength|nm/i.test(c));
  const rf=state.columns.find(c=>/reflect|refl|intensity|absorb/i.test(c));
  return {wl,rf};
}
function smooth(arr,k=5){return arr.map((_,i)=>{let s=0,n=0;for(let j=Math.max(0,i-Math.floor(k/2));j<=Math.min(arr.length-1,i+Math.floor(k/2));j++){if(finite(arr[j])){s+=arr[j];n++}}return n?s/n:null})}
function absorptions(w,r){
  const sm=smooth(r,5),cand=[];
  for(let i=2;i<sm.length-2;i++){
    if(!finite(sm[i-1])||!finite(sm[i])||!finite(sm[i+1]))continue;
    if(sm[i]<sm[i-1]&&sm[i]<=sm[i+1]){
      const shoulder=(sm[i-2]+sm[i+2])/2,depth=shoulder-sm[i];
      if(depth>0)cand.push({w:w[i],r:sm[i],depth});
    }
  }
  cand.sort((a,b)=>b.depth-a.depth);
  const chosen=[];
  for(const c of cand){if(chosen.every(x=>Math.abs(x.w-c.w)>25))chosen.push(c);if(chosen.length===5)break}
  return chosen.sort((a,b)=>a.w-b.w);
}
function spectralPlot(){
  let w=[],r=[];
  const wide=spectralWideCandidates();
  if(wide.length>=20){
    const idx=Math.max(0,Math.min(state.rows.length-1,Number($('spectrum-row')?.value||0)));
    const row=state.rows[idx]||{};
    w=wide.map(x=>x.w);r=wide.map(x=>parseCell(row[x.c],'null').value);
  }else{
    const {wl,rf}=spectralLongCols();
    if(wl&&rf){
      for(const row of state.rows){const a=parseCell(row[wl],'null').value,b=parseCell(row[rf],'null').value;if(finite(a)&&finite(b)){w.push(a);r.push(b)}}
      const z=w.map((x,i)=>[x,r[i]]).sort((a,b)=>a[0]-b[0]);w=z.map(x=>x[0]);r=z.map(x=>x[1]);
    }
  }
  if(w.length<5){$('spectral-plot').innerHTML='<div class="empty">PyOrex could not detect a wavelength/reflectance structure in this file.</div>';$('absorption-list').innerHTML='';return}
  const rv=r.filter(finite);let ymin=Math.min(...rv),ymax=Math.max(...rv);if(ymin===ymax){ymin-=1;ymax+=1}
  const xmin=Math.min(...w),xmax=Math.max(...w),W=760,H=430,p=55,sx=x=>p+(x-xmin)/(xmax-xmin)*(W-2*p),sy=y=>H-p-(y-ymin)/(ymax-ymin)*(H-2*p);
  let d='';w.forEach((x,i)=>{if(!finite(r[i]))return;d+=(d?' L ':'M ')+sx(x).toFixed(2)+' '+sy(r[i]).toFixed(2)});
  const ab=absorptions(w,r);
  $('spectral-plot').innerHTML=`<svg viewBox="0 0 ${W} ${H}" class="plot"><line x1="${p}" y1="${H-p}" x2="${W-p}" y2="${H-p}"/><line x1="${p}" y1="${p}" x2="${p}" y2="${H-p}"/><path class="spectrum" d="${d}" fill="none"/>${ab.map(a=>`<circle class="abspt" cx="${sx(a.w)}" cy="${sy(a.r)}" r="4"/>`).join('')}<text x="${W/2}" y="${H-12}" text-anchor="middle">Wavelength (nm)</text></svg>`;
  $('absorption-list').innerHTML=ab.length?ab.map(a=>`<span><b>${Math.round(a.w)} nm</b><small>candidate minimum</small></span>`).join(''):'<span>No robust local minima detected.</span>';
}

function showProcessor(){
  $('processor').hidden=false;
  renderOverview();renderStats();renderCharts();
  $('spectral-tab-btn').hidden=state.mode!=='SPECTROMETRY';
  if(state.mode==='SPECTROMETRY')spectralPlot();
  $('processor').scrollIntoView({behavior:'smooth',block:'start'});
}
async function load(file,mode){
  try{
    $('load-status').textContent='Reading '+file.name+'…';
    const {rows,sheetName}=await readWorkbook(file);
    if(!rows.length)throw new Error('No tabular rows found');
    const d=detectColumns(rows);
    Object.assign(state,{rows,columns:d.cols,numeric:d.numeric,mode,fileName:file.name,sheetName});
    $('load-status').textContent='Loaded · '+rows.length.toLocaleString()+' rows';
    showProcessor();
  }catch(e){$('load-status').textContent='Could not read file: '+e.message}
}
function tab(name){
  document.querySelectorAll('.tooltab').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));
  document.querySelectorAll('.toolpanel').forEach(x=>x.hidden=x.id!=='panel-'+name);
  if(name==='charts')renderCharts();if(name==='stats')renderStats();if(name==='spectral')spectralPlot();
}

document.addEventListener('DOMContentLoaded',()=>{
  $('geochem')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)load(f,'GEOCHEMISTRY')});
  $('spectra')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)load(f,'SPECTROMETRY')});
  $('nd-rule')?.addEventListener('change',()=>{renderStats();renderCharts()});
  $('x-var')?.addEventListener('change',renderCharts);$('y-var')?.addEventListener('change',renderCharts);$('hist-var')?.addEventListener('change',renderCharts);
  $('spectrum-row')?.addEventListener('change',spectralPlot);
  document.querySelectorAll('.tooltab').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
  $('export-csv')?.addEventListener('click',()=>{
    processRows();const ws=XLSX.utils.json_to_sheet(state.processed);const csv=XLSX.utils.sheet_to_csv(ws);const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=state.fileName.replace(/\.[^.]+$/,'')+'_pyorex_processed.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  });
});
