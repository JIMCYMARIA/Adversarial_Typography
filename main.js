import { API_BASE, apiUrl, MAX_UPLOAD_BYTES } from './api.js';
const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  if (location.pathname.replace(/\/$/, '') === '/experiments') {
    import('./src/experiments/main.jsx').then(({ mountExperiments }) => mountExperiments(document.querySelector('.app-layout'))).catch(error => {
      console.error('Could not load research experiments:', error);
      document.querySelector('.app-layout').innerHTML = `<p class="scan-status error">Research experiment UI could not load: ${String(error.message||error)}</p>`;
    });
    return;
  }
  const zone=$('dropZone'), input=$('fileInput'), scan=$('scanBtn'); let selected=null, latest=null;
  zone.addEventListener('click', e => { if(!e.target.closest('#resetBtn')) input.click(); });
  input.addEventListener('change', () => input.files?.[0] && choose(input.files[0]));
  for(const name of ['dragenter','dragover','dragleave','drop']) zone.addEventListener(name,e=>{e.preventDefault();e.stopPropagation();});
  zone.addEventListener('dragover',()=>zone.classList.add('drag-active'));
  zone.addEventListener('dragleave',()=>zone.classList.remove('drag-active'));
  zone.addEventListener('drop',e=>{zone.classList.remove('drag-active');if(e.dataTransfer.files[0])choose(e.dataTransfer.files[0]);});
  $('resetBtn').addEventListener('click',e=>{e.stopPropagation();selected=null;input.value='';scan.disabled=true;$('fileSelectedView').style.display='none';$('dropZoneDefault').style.display='flex';$('scanStatus').textContent='';$('results').hidden=true;});
  scan.addEventListener('click', runScan);
  function choose(file){
    if(!file.name.toLowerCase().endsWith('.pdf')) return status('Only PDF files are supported.','error');
    if(file.size>MAX_UPLOAD_BYTES) return status(`PDF exceeds the ${Math.floor(MAX_UPLOAD_BYTES/1024/1024)} MB upload limit for this deployment.`,'error');
    selected=file;$('fileName').textContent=file.name;$('fileSize').textContent=formatBytes(file.size);
    $('dropZoneDefault').style.display='none';$('fileSelectedView').style.display='flex';scan.disabled=false;status('Ready to scan · '+formatBytes(file.size),'');
  }
  async function runScan(){
    if(!selected)return;scan.disabled=true;status('PARSING PDF · EXTRACTING OBJECTS · ANALYZING VISIBILITY · CALCULATING RISK','working');
    const body=new FormData();body.append('file',selected);
    try{const response=await fetch(apiUrl('/api/analyze'),{method:'POST',body});const data=await response.json();if(!response.ok)throw Error(data.detail||'Analysis failed');latest=data;render(data);status(`${data.status} · ${data.objects_analyzed} actual text spans analyzed`,'done');}
    catch(err){status(`${err.message}. Confirm the FastAPI backend is reachable${API_BASE ? ` at ${API_BASE}` : ''}.`,'error');}
    finally{scan.disabled=false;}
  }
  function render(a){
    const out=$('results');out.hidden=false;
    const riskClass=a.risk_level.toLowerCase();
    out.innerHTML=`<p class="analysis-kind">${esc(a.analysis_type||'REAL DOCUMENT ANALYSIS')}</p><div class="metrics"><div><small>PAGES</small><strong>${a.page_count}</strong></div><div><small>OBJECTS ANALYZED</small><strong>${a.objects_analyzed}</strong></div><div><small>SUSPICIOUS OBJECTS</small><strong>${a.suspicious_objects}</strong></div><div class="risk ${riskClass}"><small>RISK SCORE</small><strong>${a.risk_score}<i>/100 · ${a.risk_level}</i></strong></div></div>
      <section class="pdf-viewer"><div class="viewer-head"><div><h2>DOCUMENT VIEW · PYMuPDF PAGE RENDER</h2><small id="viewerPage">PAGE 1 / ${a.page_count}</small></div><div><button id="prevPage" ${a.page_count<2?'disabled':''}>←</button><button id="nextPage" ${a.page_count<2?'disabled':''}>→</button><button id="toggleFindings">HIDE FINDINGS</button></div></div><div class="page-stage" id="pageStage"><img id="pageImage" alt="Rendered PDF page"><div class="overlay-layer" id="overlayLayer"></div></div><p class="note">Highlights use the actual PyMuPDF bounding boxes transformed against the rendered page dimensions.</p></section>
      <div class="result-actions"><button id="sanitizeBtn">GENERATE SANITIZED TEXT</button><button id="jsonBtn">DOWNLOAD FINDINGS JSON</button><button id="reportBtn">DOWNLOAD AUDIT REPORT</button></div>
      <div class="analysis-grid"><section><h2>OBSERVED TEXT</h2><p class="note">Text and coordinates are extracted from the uploaded PDF by PyMuPDF.</p><div class="span-list">${a.spans.map(s=>`<article class="span"><span class="page-tag">PAGE ${s.page}</span><p>${esc(s.text)}</p><small>${esc(s.font||'Unknown')} · ${s.font_size.toFixed(2)} pt · ${s.color?`RGB ${s.color.join(', ')}`:'color unavailable'} · x ${s.x.toFixed(1)}, y ${s.y.toFixed(1)} · ${s.width.toFixed(1)} × ${s.height.toFixed(1)} pt</small></article>`).join('')}</div></section>
      <section><h2>FINDINGS <span class="count">${a.findings.length}</span></h2>${a.findings.length?a.findings.map((f,i)=>`<button class="finding ${f.severity.toLowerCase()}" data-index="${i}"><small>PAGE ${f.page} · ${f.severity} · +${f.risk_contribution}</small><strong>${esc(f.text)}</strong><span>${f.attack_types.map(typeLabel).join(' · ')}</span><small>${f.evidence.map(esc).join(' ')}</small></button>`).join(''):'<p class="empty">NO SUSPICIOUS INDICATORS DETECTED</p>'}</section></div><div class="evidence" id="evidence"><h2>DOCUMENT TYPOGRAPHY BASELINE</h2><p>Median ${a.baseline.median_font_size.toFixed(2)} pt · Minimum ${a.baseline.minimum_font_size.toFixed(2)} pt · Maximum ${a.baseline.maximum_font_size.toFixed(2)} pt</p><p>Common fonts: ${a.baseline.common_fonts.map(x=>`${esc(x[0])} (${x[1]})`).join(', ')}</p><p>Background estimation: ${a.background_estimation.status}. ${esc(a.background_estimation.reason)}</p><p>${a.opacity_note||''}</p></div><div id="sanitized"></div>`;
    let currentPage=1, overlaysVisible=true, pageW=0, pageH=0;
    const showPage=async()=>{try{const fd=new FormData();fd.append('file',selected);const r=await fetch(apiUrl(`/api/render-page?page_number=${currentPage}`),{method:'POST',body:fd});if(!r.ok)throw Error('Page rendering failed');pageW=Number(r.headers.get('X-Page-Width'));pageH=Number(r.headers.get('X-Page-Height'));const image=$('pageImage');image.src=URL.createObjectURL(await r.blob());await image.decode();$('viewerPage').textContent=`PAGE ${currentPage} / ${a.page_count}`;const layer=$('overlayLayer');layer.innerHTML='';layer.style.left=`${image.offsetLeft}px`;layer.style.top=`${image.offsetTop}px`;layer.style.transform='none';layer.style.width=`${image.offsetWidth}px`;layer.style.height=`${image.offsetHeight}px`;a.findings.filter(f=>f.page===currentPage).forEach(f=>{const el=document.createElement('button');el.className=`pdf-overlay ${f.severity.toLowerCase()}`;el.title=`${f.severity}: ${f.text}`;el.setAttribute('aria-label',`Finding on page ${currentPage}: ${f.text}`);const b=f.rendered_bbox;el.style.left=`${100*b[0]/pageW}%`;el.style.top=`${100*b[1]/pageH}%`;el.style.width=`${100*(b[2]-b[0])/pageW}%`;el.style.height=`${Math.max(.45,100*(b[3]-b[1])/pageH)}%`;el.addEventListener('click',()=>selectFinding(a.findings.indexOf(f)));layer.append(el);});layer.hidden=!overlaysVisible;}catch(e){$('viewerPage').textContent=`PAGE RENDER ERROR · ${e.message}`;}};
    const selectFinding=index=>{const f=a.findings[index];if(!f)return;document.querySelectorAll('.finding').forEach(x=>x.classList.toggle('selected',Number(x.dataset.index)===index));$('evidence').innerHTML=`<h2>FORENSIC FINDING · ${f.severity} RISK</h2><p>${f.attack_types.map(typeLabel).join(' · ')} · Page ${f.page}</p><p>${esc(f.text)}</p><p>Font: ${esc(f.features.font||'Unavailable')} · Size: ${f.features.font_size} pt · Median: ${a.baseline.median_font_size.toFixed(2)} pt</p><p>Color: ${f.features.color?.join(', ')||'Unavailable'} · Opacity: ${f.features.opacity??'Unavailable'}</p><p>Bounding box: x ${f.bbox.x.toFixed(2)}, y ${f.bbox.y.toFixed(2)}, width ${f.bbox.width.toFixed(2)}, height ${f.bbox.height.toFixed(2)} pt</p><p>Rules: ${f.rules_triggered.join(' · ')}</p><p>Evidence: ${f.evidence.join(' ')}</p><p>Risk contributions: ${Object.entries(f.risk_breakdown).map(([k,v])=>`${typeLabel(k)} +${v}`).join(' · ')}</p>`;if(f.page!==currentPage){currentPage=f.page;showPage();}};
    out.querySelectorAll('.finding').forEach(b=>b.addEventListener('click',()=>selectFinding(Number(b.dataset.index))));
    $('prevPage').onclick=()=>{if(currentPage>1){currentPage--;showPage();}};$('nextPage').onclick=()=>{if(currentPage<a.page_count){currentPage++;showPage();}};$('toggleFindings').onclick=e=>{overlaysVisible=!overlaysVisible;$('overlayLayer').hidden=!overlaysVisible;e.currentTarget.textContent=overlaysVisible?'HIDE FINDINGS':'SHOW FINDINGS';};showPage();
    $('jsonBtn').onclick=()=>download(JSON.stringify(a,null,2),`${safe(a.filename)}-findings.json`,'application/json');
    $('reportBtn').onclick=async()=>{try{const r=await fetch(apiUrl('/api/audit-report'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({analysis:a})});if(!r.ok)throw Error();download(await r.text(),`${safe(a.filename)}-audit.html`,'text/html');}catch{status('Could not generate audit report.','error');}};
    $('sanitizeBtn').onclick=async()=>{try{const r=await fetch(apiUrl('/api/sanitize'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({analysis:a})});const s=await r.json();$('sanitized').innerHTML=`<h2>SANITIZED SEMANTIC REPRESENTATION</h2><p class="warning">${s.label} · The original PDF has not been rewritten.</p><h3>OBSERVED TEXT</h3><pre>${esc(s.observed_text.map(x=>`[Page ${x.page}] ${x.text}`).join('\n'))}</pre><h3>RETAINED TEXT</h3><pre>${esc(s.sanitized_text)||'(no retained text)'}</pre><h3>QUARANTINED TEXT · SPANS THAT TRIGGERED RULES</h3><pre class="quarantine">${esc(s.quarantined_text.map(x=>`[Page ${x.page}] ${x.text}`).join('\n'))||'None'}</pre><button id="textBtn">DOWNLOAD SANITIZED TEXT</button>`;$('textBtn').onclick=()=>download(s.sanitized_text,`${safe(a.filename)}-sanitized.txt`,'text/plain');}catch{status('Sanitization request failed.','error');}};
  }
  function status(text,cls){$('scanStatus').textContent=text;$('scanStatus').className=`scan-status ${cls}`;}
});
function formatBytes(bytes){if(!bytes)return'0 B';const k=1024,units=['B','KB','MB'];const i=Math.min(2,Math.floor(Math.log(bytes)/Math.log(k)));return`${(bytes/k**i).toFixed(1)} ${units[i]}`;}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function typeLabel(t){return({'MICRO_TYPOGRAPHY':'T1 · MICRO TYPOGRAPHY','COLOR_CAMOUFLAGE':'T2 · COLOR CAMOUFLAGE','LOW_CONTRAST':'T3 · LOW CONTRAST','TRANSPARENT_TEXT':'T4 · TRANSPARENT TEXT','SPATIAL_OFF_CANVAS':'T5 · SPATIAL / OFF-CANVAS','SEMANTIC_PROMPT_INJECTION':'T6 · SEMANTIC PROMPT INJECTION','MULTI_VECTOR':'T7 · MULTI-VECTOR'}[t]||t);}
function download(content,name,type){const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([content],{type}));link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
function safe(name){return String(name).replace(/\.pdf$/i,'').replace(/[^a-z0-9_-]+/gi,'_');}
