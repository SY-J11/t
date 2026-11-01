/* 수급 동향 페이지 - 실데이터를 임의 생성하지 않음 */
const $ = id => document.getElementById(id);
const state = {days:10, asset:'kospi', period:{kospi:'day',kosdaq:'day',futures:'day'}, data:null, charts:{}};
const fmt = v => v==null || !Number.isFinite(Number(v)) ? '자료 없음' : Number(v).toLocaleString('ko-KR',{maximumFractionDigits:0});
const signed = v => v==null || !Number.isFinite(Number(v)) ? '자료 없음' : `${Number(v)>0?'+':''}${fmt(v)}`;
const cls = v => Number(v)>0?'positive':Number(v)<0?'negative':'';
function money(v){return v==null?'자료 없음':`${signed(v)}억`;}
function futures(v){if(!v)return '자료 없음';return `${signed(v.amount)}억 (${signed(v.contracts)}계약)`;}
function showEmpty(id, text='실제 데이터 연결 후 표시됩니다.'){const el=$(id);if(el)el.textContent=text;}
function emptyRows(id, cols, text='자료 없음'){const el=$(id);if(el)el.innerHTML=`<tr><td colspan="${cols}" class="empty-cell">${text}</td></tr>`;}
function renderFlowTable(market){
 const rows=state.data?.[market]?.flows||[];
 const count=Number(document.querySelector(`[data-table="${market}"]`)?.value||10);
 const body=$(`${market}Flows`);
 if(!rows.length){emptyRows(`${market}Flows`,4);return;}
 body.innerHTML=rows.slice(-count).reverse().map(r=>`<tr><td>${r.date||'—'}</td>${['individual','foreign','institution'].map(k=>`<td class="${cls(r[k])}">${market==='futures'?futures(r[k]):money(r[k])}</td>`).join('')}</tr>`).join('');
}
function renderMarket(market){
 const d=state.data?.[market]||{};
 const flows=d.flows||[];
 const info=d.index||[];
 const prog=d.program||[];
 if(!flows.length)emptyRows(`${market}Flows`,4);
 else renderFlowTable(market);
 if(!info.length)emptyRows(`${market}Index`,7);
 else $(`${market}Index`).innerHTML=info.slice(-60).reverse().map(r=>`<tr><td>${r.date||'—'}</td><td>${fmt(r.value)}</td><td class="${cls(r.change)}">${signed(r.change)}</td><td class="${cls(r.changePct)}">${r.changePct==null?'자료 없음':`${signed(r.changePct)}%`}</td><td>${fmt(r.up)}</td><td>${fmt(r.flat)}</td><td>${fmt(r.down)}</td></tr>`).join('');
 if(!prog.length)emptyRows(`${market}Program`,4);
 else $(`${market}Program`).innerHTML=prog.slice(-60).reverse().map(r=>`<tr><td>${r.date||'—'}</td><td class="${cls(r.arbitrage)}">${money(r.arbitrage)}</td><td class="${cls(r.nonArbitrage)}">${money(r.nonArbitrage)}</td><td class="${cls(r.total)}">${money(r.total)}</td></tr>`).join('');
 if(market==='futures'){
  const f=d.index||[];
  if(!f.length)emptyRows('futuresInfo',8);
  else $('futuresInfo').innerHTML=f.slice(-60).reverse().map(r=>`<tr><td>${r.date||'—'}</td><td>${fmt(r.value)}</td><td class="${cls(r.change)}">${signed(r.change)}</td><td class="${cls(r.changePct)}">${r.changePct==null?'자료 없음':`${signed(r.changePct)}%`}</td><td>${fmt(r.volume)}</td><td>${fmt(r.tradingValue)}</td><td>${fmt(r.openInterest)}</td><td>${fmt(r.basis)}</td></tr>`).join('');
 }
 drawMarketChart(market);
}
function chartOptions(){return {responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{boxWidth:8,font:{size:9}}}},scales:{x:{ticks:{font:{size:8},maxTicksLimit:8},grid:{display:false}},y:{ticks:{font:{size:8}},grid:{color:'rgba(130,145,165,.13)'}}}}}
function drawLine(canvasId, labels, datasets){
 const el=$(canvasId);if(!el||!window.Chart)return;
 if(state.charts[canvasId])state.charts[canvasId].destroy();
 state.charts[canvasId]=new Chart(el,{type:'line',data:{labels,datasets},options:chartOptions()});
}
function drawMarketChart(market){
 const d=state.data?.[market]||{}, rows=d.index||[];
 if(!rows.length){showEmpty(`${market}Empty`);return;}
 const period=state.period[market];
 let filtered=rows.slice();
 if(period==='week')filtered=groupRows(rows,5);
 if(period==='month')filtered=groupRows(rows,21);
 if(period==='year')filtered=groupRows(rows,252);
 showEmpty(`${market}Empty`,'');
 drawLine(`${market}Chart`,filtered.map(x=>x.date),[{label:market.toUpperCase(),data:filtered.map(x=>x.value),borderColor:'#3979d8',backgroundColor:'rgba(57,121,216,.08)',fill:true,tension:.25,pointRadius:0,borderWidth:2}]);
}
function groupRows(rows,n){const out=[];for(let i=0;i<rows.length;i+=n){const a=rows.slice(i,i+n);if(a.length)out.push(a[a.length-1]);}return out;}
function renderCompare(){
 const markets=['kospi','kosdaq','futures'], labels={kospi:'코스피',kosdaq:'코스닥',futures:'선물'};
 const blocks=[];
 const source=state.data||{};
 const dates=[...new Set(markets.flatMap(m=>(source[m]?.flows||[]).map(x=>x.date)))].sort().slice(-state.days).reverse();
 if(!dates.length){$('compareBlocks').innerHTML='<div class="empty-cell wide">실제 투자자별 데이터 연결 후 표시됩니다.</div>';return;}
 for(const date of dates){
  let body=markets.map(m=>{const r=(source[m]?.flows||[]).find(x=>x.date===date);return `<tr><td>${labels[m]}</td>${['individual','foreign','institution'].map(k=>`<td>${!r?'—':m==='futures'?futures(r[k]):money(r[k])}</td>`).join('')}</tr>`}).join('');
  blocks.push(`<article class="compare-card"><h3>${date}</h3><table><thead><tr><th>시장</th><th>개인</th><th>외국인</th><th>기관</th></tr></thead><tbody>${body}</tbody></table></article>`);
 }
 $('compareBlocks').innerHTML=blocks.join('');
}
function streak(rows,key){
 if(!rows.length)return '자료 없음';
 const sorted=[...rows].sort((a,b)=>a.date.localeCompare(b.date)).reverse();
 const first=sorted[0]?.[key];if(first==null||Number(first)===0)return '자료 없음';
 const sign=Math.sign(Number(first));let n=0;
 for(const r of sorted){if(r[key]==null||Math.sign(Number(r[key]))!==sign)break;n++;}
 return `${n}거래일 ${sign>0?'순매수':'순매도'}`;
}
function renderCumulative(){
 const rows=(state.data?.[state.asset]?.flows||[]).slice(-state.days);
 if(!rows.length){showEmpty('cumulativeEmpty');['individual','foreign','institution'].forEach(k=>$(`streak-${k}`).textContent='자료 없음');return;}
 const keys=['individual','foreign','institution'], names=['개인','외국인','기관'], colors=['#7d8796','#df5967','#3979d8'];
 const totals={};keys.forEach(k=>totals[k]=0);
 const series=keys.map((k,i)=>({label:names[i],data:rows.map(r=>{totals[k]+=Number(r[k]?.amount??r[k]??0)||0;return totals[k];}),borderColor:colors[i],tension:.25,pointRadius:0,borderWidth:2}));
 showEmpty('cumulativeEmpty','');
 drawLine('cumulativeChart',rows.map(r=>r.date),series);
 keys.forEach(k=>$(`streak-${k}`).textContent=streak(state.data[state.asset]?.flows||[],k));
}
function renderAll(){
 ['kospi','kosdaq','futures'].forEach(renderMarket);
 renderCompare();renderCumulative();
}
document.querySelectorAll('[data-chart-tabs] button').forEach(b=>b.addEventListener('click',()=>{
 const market=b.closest('[data-chart-tabs]').dataset.chartTabs;
 b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
 state.period[market]=b.dataset.period;drawMarketChart(market);
}));
document.querySelectorAll('[data-range="compare"] button').forEach(b=>b.addEventListener('click',()=>{
 b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));state.days=Number(b.dataset.days);renderCompare();
}));
document.querySelectorAll('[data-range="cumulative"] button').forEach(b=>b.addEventListener('click',()=>{
 b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));state.days=Number(b.dataset.days);renderCumulative();
}));
document.querySelectorAll('[data-asset="cumulative"] button').forEach(b=>b.addEventListener('click',()=>{
 b.parentElement.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));state.asset=b.dataset.assetName;renderCumulative();
}));
document.querySelectorAll('.table-range').forEach(s=>s.addEventListener('change',()=>renderFlowTable(s.dataset.table)));
$('themeBtn').addEventListener('click',()=>document.body.classList.toggle('dark'));
$('reloadBtn').addEventListener('click',()=>{if(state.data)renderAll();});
/*
 * 데이터 주입 규격:
 * 같은 폴더에 flow-data.json을 두면 자동으로 읽습니다.
 * 아래 구조의 값은 반드시 KRX/증권사 등 실제 원천 데이터로 채워야 합니다.
 * 현물 흐름: 억원, 선물 흐름: {amount: 억원, contracts: 계약}
 * 예시 데이터/가짜 수치는 포함하지 않습니다.
 */
async function loadData(){
 try{
  const res=await fetch('./flow-data.json?ts='+Date.now(),{cache:'no-store'});
  if(!res.ok)throw new Error('flow-data.json 없음');
  const data=await res.json();
  if(!data||typeof data!=='object')throw new Error('데이터 형식 오류');
  state.data=data;renderAll();
  $('connectionState').textContent='데이터 파일 연결됨';
  document.querySelector('.live-dot').style.background='#4ac18a';
  document.querySelector('.data-setup .data-badge').textContent='파일 연결됨';
  document.querySelector('.data-setup .data-badge').classList.remove('warn');
 }catch(e){
  $('connectionState').textContent='데이터 연결 대기';
  showEmpty('kospiEmpty','수급 데이터 파일(flow-data.json)이 아직 없습니다.');
  showEmpty('kosdaqEmpty','수급 데이터 파일(flow-data.json)이 아직 없습니다.');
  showEmpty('futuresEmpty','수급 데이터 파일(flow-data.json)이 아직 없습니다.');
 }
}
loadData();
