/* =========================================================
   Billy 2.0 — bill manager
   Data is saved on this device (localStorage key "billy.v1",
   same as v1 so your old bills carry over).
   ========================================================= */
(function(){
"use strict";

/* ---------- helpers ---------- */
const VERSION='2.0';
const STORE='billy.v1';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>ymd(new Date());
const parse=s=>{const[y,m,d]=String(s).split('-').map(Number);return new Date(y,(m||1)-1,d||1);};
const dayNum=s=>{const d=parse(s);return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5;};
const diffDays=(a,b)=>Math.round(dayNum(b)-dayNum(a));
const dim=(y,m)=>new Date(y,m+1,0).getDate();
const addDays=(s,n)=>{const d=parse(s);return ymd(new Date(d.getFullYear(),d.getMonth(),d.getDate()+n));};
function addMonths(s,n,anchor){const d=parse(s);let y=d.getFullYear(),m=d.getMonth()+n;y+=Math.floor(m/12);m=((m%12)+12)%12;return ymd(new Date(y,m,Math.min(anchor||d.getDate(),dim(y,m))));}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=window.navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const wide=()=>innerWidth>=700;
function lum(hex){const h=String(hex).replace('#','');if(h.length<6)return 0;const c=[0,2,4].map(i=>{const v=parseInt(h.substr(i,2),16)/255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*c[0]+.7152*c[1]+.0722*c[2];}
function haptic(){try{if(navigator.vibrate){navigator.vibrate(10);return;}const l=$('#hap');if(l)l.click();}catch(e){}}

const ICON={
  check:'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  trash:'<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>',
  chev:'<svg class="chev" viewBox="0 0 8 14"><path d="M1 1l6 6-6 6"/></svg>',
  left:'<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  right:'<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  eye:'<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff:'<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/></svg>'
};

const EMOJIS=['🧾','🏠','⚡','💡','💧','🔥','🌐','📱','📺','🎵','🎮','🍿','🚗','⛽','🛡️','💳','🏦','🎓','🏥','💊','🦷','🐶','🗑️','🏋️','☁️','📦','👶','✈️','🍔','🛒','💰','⭐'];
const COLORS=['#a855f7','#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#ec4899','#ffffff','#64748b'];
const CATS=[['housing','🏠 Housing'],['utilities','⚡ Utilities'],['subs','📺 Subscriptions'],['phone','📱 Phone & Net'],['insurance','🛡️ Insurance'],['loans','💳 Loans & Cards'],['transport','🚗 Transport'],['health','🏥 Health'],['other','🧾 Other']];
const CAT_NAME=Object.fromEntries(CATS);
const SMART=[[/rent|mortgage|apartment|lease|hoa/,'🏠','housing'],[/electric|power|edison|pg&e|pge|energy/,'⚡','utilities'],[/water|sewer/,'💧','utilities'],[/gas bill|socal gas|natural gas/,'🔥','utilities'],[/trash|garbage|waste/,'🗑️','utilities'],[/internet|wifi|wi-fi|spectrum|xfinity|comcast|fiber/,'🌐','phone'],[/phone|verizon|t-mobile|tmobile|at&t|cricket|metro|mint/,'📱','phone'],[/netflix|hulu|disney|hbo|max|youtube|prime video|paramount|peacock|crunchyroll|tv/,'📺','subs'],[/spotify|apple music|music|tidal|pandora/,'🎵','subs'],[/xbox|playstation|psn|ps plus|nintendo|game pass|steam|discord|roblox/,'🎮','subs'],[/icloud|google one|dropbox|onedrive|cloud/,'☁️','subs'],[/amazon|prime/,'📦','subs'],[/insurance|geico|progressive|allstate|state farm/,'🛡️','insurance'],[/car|auto|vehicle|toyota|honda|tesla/,'🚗','transport'],[/fuel|chevron|shell/,'⛽','transport'],[/credit|card|visa|mastercard|amex|discover|capital one/,'💳','loans'],[/loan|bank|student/,'🏦','loans'],[/school|tuition|college|class/,'🎓','other'],[/doctor|hospital|medical|health|dental|dentist/,'🏥','health'],[/gym|fitness|planet|24 hour/,'🏋️','health'],[/dog|cat|vet|pet/,'🐶','other']];
const DEFAULTS={bg:'#000000',accent:'#a855f7',currency:'$',soonDays:3,notify:false,remindDays:1,remindTime:'09:00',privacy:false,defaultCycle:'monthly'};
const PRESETS=[['Goza Purple','#000000','#a855f7'],['Blood Moon','#0a0204','#ef4444'],['Deep Ocean','#020617','#38bdf8'],['Toxic','#030803','#84cc16'],['Sunset','#140a12','#f97316'],['Paper','#ffffff','#7c3aed']];
const REM_OPTS=[[0,'Same day'],[1,'1 day before'],[2,'2 days before'],[3,'3 days before'],[5,'5 days before'],[7,'1 week before']];
const TITLES={bills:'Bills',calendar:'Calendar',insights:'Insights',settings:'Settings'};

let state={settings:{...DEFAULTS},bills:[],meta:{notified:{}}};
let ui={tab:'bills',filter:'all',cal:null,calSel:null,calDir:0,showPaid:false,animate:true,query:''};

/* ---------- storage ---------- */
function normBill(b){
  b=b||{};
  const due=/^\d{4}-\d{2}-\d{2}$/.test(b.due)?b.due:today();
  return{id:b.id||uid(),name:String(b.name||'Bill').slice(0,60),emoji:b.emoji||'🧾',amount:+b.amount||0,due,anchor:+b.anchor||parse(due).getDate(),
    cycle:['once','monthly','yearly','custom'].includes(b.cycle)?b.cycle:'monthly',every:Math.min(24,Math.max(2,+b.every||2)),
    category:CAT_NAME[b.category]?b.category:'other',color:/^#[0-9a-f]{6}$/i.test(b.color)?b.color:'#a855f7',autopay:!!b.autopay,note:String(b.note||''),
    remind:{on:b.remind?!!b.remind.on:true,days:b.remind&&b.remind.days!=null?+b.remind.days:1,time:(b.remind&&b.remind.time)||'09:00'},
    paid:!!b.paid,payments:Array.isArray(b.payments)?b.payments:[],created:b.created||today()};
}
function load(){try{const raw=localStorage.getItem(STORE);if(!raw)return;const d=JSON.parse(raw);state.settings={...DEFAULTS,...(d.settings||{})};state.bills=(d.bills||[]).map(normBill);state.meta=d.meta||{notified:{}};}catch(e){}}
function save(){try{localStorage.setItem(STORE,JSON.stringify(state));}catch(e){}}

/* ---------- bill logic ---------- */
const step=b=>b.cycle==='monthly'?1:b.cycle==='yearly'?12:b.cycle==='custom'?b.every:0;
const nextDue=b=>addMonths(b.due,step(b),b.anchor);
const prevDue=b=>step(b)?addMonths(b.due,-step(b),b.anchor):b.created;
const perMonth=b=>step(b)?b.amount/step(b):0;
const active=()=>state.bills.filter(b=>!b.paid).sort((a,b)=>a.due<b.due?-1:a.due>b.due?1:a.name.localeCompare(b.name));
const paidOnce=()=>state.bills.filter(b=>b.paid);
const getBill=id=>state.bills.find(b=>b.id===id);
const cycleLabel=b=>b.cycle==='once'?'One-time':b.cycle==='monthly'?'Monthly':b.cycle==='yearly'?'Yearly':`Every ${b.every} mo`;
const moneyTxt=n=>state.settings.currency+(+n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const money=n=>`<span class="money">${esc(moneyTxt(n))}</span>`;
const countMoney=n=>`<span class="money" data-count="${+n||0}" data-m="1">${esc(moneyTxt(n))}</span>`;
function fmtDate(s,long){const d=parse(s);const o={month:'short',day:'numeric'};if(d.getFullYear()!==new Date().getFullYear())o.year='numeric';if(long){o.weekday='long';o.month='long';}return d.toLocaleDateString(undefined,o);}
function status(b){
  if(b.paid)return{cls:'paid',txt:'Paid'};
  const d=diffDays(today(),b.due);
  if(d<0)return{cls:'over',txt:`${-d}d overdue`};
  if(d===0)return{cls:'today',txt:'Due today'};
  if(d===1)return{cls:'soon',txt:'Tomorrow'};
  if(d<=state.settings.soonDays)return{cls:'soon',txt:`In ${d} days`};
  return{cls:'',txt:`In ${d} days`};
}
function progress(b){const p=prevDue(b);const tot=Math.max(1,diffDays(p,b.due));return Math.max(3,Math.min(100,diffDays(p,today())/tot*100));}
function processAuto(){
  const t=today();let n=0;
  state.bills.forEach(b=>{if(!b.autopay||b.paid)return;let g=0;
    while(b.due<t&&g++<300){b.payments.push({date:b.due,amount:b.amount,due:b.due,auto:true});n++;if(step(b))b.due=nextDue(b);else{b.paid=true;break;}}});
  if(n)save();return n;
}
function markPaid(b){const snap=JSON.stringify(b);b.payments.push({date:today(),amount:b.amount,due:b.due});if(step(b))b.due=nextDue(b);else b.paid=true;save();return snap;}
function restore(snap){const o=JSON.parse(snap);const i=state.bills.findIndex(x=>x.id===o.id);if(i>-1)state.bills[i]=o;save();}

/* ---------- theme ---------- */
function applyTheme(smooth){
  const s=state.settings,r=document.documentElement,light=lum(s.bg)>.45;
  if(smooth&&!reduceMotion){r.classList.add('theming');clearTimeout(applyTheme.t);applyTheme.t=setTimeout(()=>r.classList.remove('theming'),500);}
  r.style.setProperty('--bg',s.bg);r.style.setProperty('--fg',light?'#0b0b10':'#ffffff');
  r.style.setProperty('--accent',s.accent);r.style.setProperty('--on-accent',lum(s.accent)>.5?'#0b0b10':'#ffffff');
  r.style.colorScheme=light?'light':'dark';
  document.body.classList.toggle('light',light);
  document.body.classList.toggle('privacy',!!s.privacy);
  const m=document.querySelector('meta[name=theme-color]');if(m)m.content=s.bg;
  $('#privBtn').innerHTML=s.privacy?ICON.eyeOff:ICON.eye;
}

/* ---------- animation helpers ---------- */
let k=0;const si=()=>`--i:${k++};`;
function flip(mutate){
  const first=new Map($$('[data-key]').map(e=>[e.dataset.key,e.getBoundingClientRect().top]));
  mutate();
  if(reduceMotion)return;
  $$('[data-key]').forEach(e=>{
    const f=first.get(e.dataset.key);
    if(f==null){e.animate([{opacity:0,transform:'scale(.94)'},{opacity:1,transform:'none'}],{duration:450,easing:'cubic-bezier(.32,.72,0,1)'});return;}
    const d=f-e.getBoundingClientRect().top;
    if(Math.abs(d)>1)e.animate([{transform:`translateY(${d}px)`},{transform:'none'}],{duration:560,easing:'cubic-bezier(.32,.72,0,1)'});
  });
}
function afterRender(){
  const anim=ui.animate&&!reduceMotion;
  $$('[data-count]').forEach(el=>{
    const to=+el.dataset.count,m=el.dataset.m==='1',fmt=v=>m?moneyTxt(v):String(Math.round(v));
    if(!anim||to===0){el.textContent=fmt(to);return;}
    const t0=performance.now(),D=900;
    const tick=now=>{const p=Math.min(1,(now-t0)/D),e=1-Math.pow(1-p,4);el.textContent=fmt(to*e);if(p<1)requestAnimationFrame(tick);};
    el.textContent=fmt(0);requestAnimationFrame(tick);
  });
  const fill=()=>{$$('[data-w]').forEach(el=>el.style.width=el.dataset.w+'%');$$('[data-off]').forEach(el=>el.style.strokeDashoffset=el.dataset.off);};
  if(anim)requestAnimationFrame(()=>requestAnimationFrame(fill));
  else{$$('[data-w],[data-off]').forEach(el=>el.style.transition='none');fill();requestAnimationFrame(()=>$$('[data-w],[data-off]').forEach(el=>el.style.transition=''));}
  ui.animate=false;
}

/* ---------- render ---------- */
function render(){
  k=0;
  $$('.tab').forEach(t=>t.classList.toggle('on',t.dataset.id===ui.tab));
  $('#navTitle').textContent=TITLES[ui.tab];
  const html=ui.tab==='bills'?viewBills():ui.tab==='calendar'?viewCalendar():ui.tab==='insights'?viewInsights():viewSettings();
  $('#view').innerHTML=`<section class="page${ui.animate?' enter':''}">${html}</section>`;
  if(ui.tab==='bills'&&ui.query)applySearch();
  afterRender();
}
function largeTitle(t,sub){return `<div class="lt st" style="${si()}"><p class="lt-sub">${sub}</p><h1 id="lt">${t}</h1></div>`;}
const longToday=()=>new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});

function row(b){
  const st=status(b);
  const actions=b.paid?`<button class="ra ra-del ra-only" data-act="delete" data-id="${b.id}">${ICON.trash}<span>Delete</span></button>`
    :`<button class="ra ra-pay" data-act="pay" data-id="${b.id}">${ICON.check}<span>Paid</span></button><button class="ra ra-del" data-act="delete" data-id="${b.id}">${ICON.trash}<span>Delete</span></button>`;
  return `<div class="swipe st" data-key="r-${b.id}" data-name="${esc(b.name.toLowerCase())}" style="--c:${b.color};${si()}">
    <div class="row-actions">${actions}</div>
    <div class="bill ${b.paid?'done':''}" data-act="open" data-id="${b.id}">
      <div class="emo">${esc(b.emoji)}</div>
      <div class="grow"><div class="nm">${esc(b.name)}</div>
        <div class="sub">${fmtDate(b.due)} · ${cycleLabel(b)}${b.autopay?' · 🔁':''}${b.remind.on&&!b.paid?' · ⏰':''}</div>
        ${b.paid?'':`<div class="prog"><i data-w="${progress(b).toFixed(1)}"></i></div>`}</div>
      <div class="right"><div class="amt">${money(b.amount)}</div><div class="pill ${st.cls}">${st.txt}</div></div>
      ${b.paid?'':`<button class="pay" data-act="pay" data-id="${b.id}" aria-label="Mark ${esc(b.name)} paid">${ICON.check}</button>`}
    </div></div>`;
}

function viewBills(){
  const all=active(),t=today(),mo=t.slice(0,7);
  let h=largeTitle('Bills',longToday());
  if(!state.bills.length)return h+`<div class="empty st" style="${si()}"><div class="big">🧾</div><h2>No bills yet</h2><p>Add your bills and Billy keeps the next one due right at the top.</p>
    <div class="btns"><button class="btn primary" data-act="new">Add your first bill</button><button class="btn ghost" data-act="sample">✨ Try sample bills</button><button class="btn ghost" data-act="importFile">Import a backup</button></div></div>`;
  const over=all.filter(b=>b.due<t);
  const monthBills=all.filter(b=>b.due.slice(0,7)<=mo);
  const dueMonth=monthBills.reduce((s,b)=>s+b.amount,0);
  const next30=all.filter(b=>diffDays(t,b.due)<=30).reduce((s,b)=>s+b.amount,0);
  const paidMonth=state.bills.reduce((s,b)=>s+b.payments.filter(p=>p.date.slice(0,7)===mo).reduce((a,p)=>a+(+p.amount||0),0),0);
  const pct=paidMonth+dueMonth>0?paidMonth/(paidMonth+dueMonth)*100:0;
  const week=all.filter(b=>diffDays(t,b.due)<=7);
  const rem=all.filter(b=>b.remind.on&&diffDays(t,b.due)<=b.remind.days);
  h+=`<div class="wallet st" style="${si()}">
    <div class="w-top"><span class="w-k">Left to pay this month</span><span class="w-badge">${monthBills.length} bill${monthBills.length===1?'':'s'}</span></div>
    <div class="w-amt">${countMoney(dueMonth)}</div>
    <div class="w-bar"><i data-w="${pct.toFixed(1)}"></i></div>
    <div class="w-legend"><span>${Math.round(pct)}% paid</span><span>${new Date().toLocaleDateString(undefined,{month:'long'})}</span></div>
    <div class="w-row"><div><span>Paid</span><b>${countMoney(paidMonth)}</b></div><div><span>Next 30 days</span><b>${countMoney(next30)}</b></div><div class="${over.length?'bad':''}"><span>Overdue</span><b data-count="${over.length}">${over.length}</b></div></div>
  </div>`;
  if(rem.length)h+=`<div class="banner st" style="${si()}" data-act="open" data-id="${rem[0].id}"><span class="bi">⏰</span><div><b>${rem.length} reminder${rem.length>1?'s':''}</b> · ${rem.slice(0,3).map(b=>esc(b.emoji+' '+b.name)+' '+status(b).txt.toLowerCase()).join(', ')}${rem.length>3?'…':''}</div></div>`;
  if(week.length>1)h+=`<div class="sh st" style="${si()}"><h3>This week</h3></div><div class="stories st" style="${si()}">${week.map(b=>`<button class="story ${b.due<t?'late':''}" style="--c:${b.color}" data-act="open" data-id="${b.id}"><div class="ring"><span>${esc(b.emoji)}</span></div><small>${esc(b.name)}</small><em>${status(b).txt}</em></button>`).join('')}</div>`;
  const hero=ui.filter==='all'&&all[0];
  if(hero){
    const d=diffDays(t,hero.due),R=33,C=2*Math.PI*R,pr=progress(hero);
    h+=`<div class="sh st" style="${si()}"><h3>Up next</h3></div>
    <div class="hero st" data-key="h-${hero.id}" style="--c:${hero.color};${si()}" data-act="open" data-id="${hero.id}">
      <div class="hero-glow"></div>
      <div class="hero-top"><span>${d<0?'⚠️ Overdue':d===0?'🔥 Due today':'Next bill'}</span><span>${cycleLabel(hero)}</span></div>
      <div class="hero-main"><div class="hero-emo">${esc(hero.emoji)}</div>
        <div class="grow"><h2>${esc(hero.name)}</h2><p>${money(hero.amount)}</p><p style="font-size:13px">${fmtDate(hero.due,true)}</p></div>
        <div class="hero-ring"><svg viewBox="0 0 78 78"><circle class="trk" cx="39" cy="39" r="${R}"/><circle class="prg" cx="39" cy="39" r="${R}" stroke-dasharray="${C.toFixed(2)}" style="stroke-dashoffset:${C.toFixed(2)}" data-off="${(C*(1-pr/100)).toFixed(2)}"/></svg>
          <div><b data-count="${Math.abs(d)}">${Math.abs(d)}</b><span>${d<0?'days late':d===0?'today':d===1?'day left':'days left'}</span></div></div></div>
      <button class="hero-pay" data-act="pay" data-id="${hero.id}">${ICON.check}<span>Mark as paid</span></button>
    </div>`;
  }
  const counts={all:all.length,overdue:over.length,week:week.length,month:monthBills.length,autopay:all.filter(b=>b.autopay).length};
  const F={all:()=>true,overdue:b=>b.due<t,week:b=>diffDays(t,b.due)<=7,month:b=>b.due.slice(0,7)<=mo,autopay:b=>b.autopay}[ui.filter]||(()=>true);
  let list=all.filter(F);if(hero)list=list.slice(1);
  h+=`<div class="sh st" style="${si()}"><h3>${ui.filter==='all'?'Coming up':'Bills'}</h3></div>`;
  if(state.bills.length>5)h+=`<label class="search st" style="${si()}">${ICON.search}<input id="search" type="search" placeholder="Search bills" value="${esc(ui.query)}" autocomplete="off"></label>`;
  h+=`<div class="chips st" style="${si()}">${[['all','All'],['overdue','Overdue'],['week','This week'],['month','This month'],['autopay','Autopay']].map(([key,l])=>`<button class="chip ${ui.filter===key?'on':''}" data-act="filter" data-id="${key}">${l}<span class="n">${counts[key]}</span></button>`).join('')}</div>
    <div class="list" id="list">${list.length?list.map(row).join(''):`<div class="empty-row st" style="${si()}">${ui.filter==='all'?'That\u2019s your only bill. Tap + to add more.':'Nothing here 🎉'}</div>`}</div>`;
  if(list.length)h+=`<div class="swipe-hint">Swipe a bill left for quick actions</div>`;
  const po=paidOnce();
  if(po.length)h+=`<div class="sh"><h3>Paid one-time</h3><button data-act="togglePaid">${ui.showPaid?'Hide':`Show ${po.length}`}</button></div>${ui.showPaid?`<div class="list">${po.map(row).join('')}</div>`:''}`;
  return h;
}
function applySearch(){const q=ui.query.trim().toLowerCase();$$('#list .swipe').forEach(r=>r.classList.toggle('hidden',!!q&&!r.dataset.name.includes(q)));}

function occurrences(from,to){
  const out={};
  active().forEach(b=>{let d=b.due,g=0;while(d<=to&&g++<500){if(d>=from)(out[d]=out[d]||[]).push(b);if(!step(b))break;d=addMonths(d,step(b),b.anchor);}});
  return out;
}
function paidOn(from,to){const out={};state.bills.forEach(b=>b.payments.forEach(p=>{if(p.date>=from&&p.date<=to)(out[p.date]=out[p.date]||[]).push({b,p});}));return out;}
function viewCalendar(){
  const t=today();if(!ui.cal)ui.cal=t.slice(0,7);if(!ui.calSel)ui.calSel=t;
  const[y,m]=ui.cal.split('-').map(Number),first=new Date(y,m-1,1),days=dim(y,m-1);
  const from=`${ui.cal}-01`,to=`${ui.cal}-${pad(days)}`,occ=occurrences(from,to),paid=paidOn(from,to);
  const flat=Object.values(occ).flat(),total=flat.reduce((s,b)=>s+b.amount,0);
  let cells=['S','M','T','W','T','F','S'].map(d=>`<div class="wd">${d}</div>`).join('');
  for(let i=0;i<first.getDay();i++)cells+='<div class="day blank"></div>';
  for(let d=1;d<=days;d++){const key=`${ui.cal}-${pad(d)}`,l=occ[key]||[];
    cells+=`<button class="day ${key===t?'today':''} ${key===ui.calSel?'sel':''} ${key<t?'past':''}" data-act="calDay" data-id="${key}"><span class="dn">${d}</span><span class="es">${l.slice(0,3).map(b=>esc(b.emoji)).join('')}</span>${l.length>3?`<span class="more">+${l.length-3}</span>`:''}${paid[key]?'<span class="dot"></span>':''}</button>`;}
  const sel=occ[ui.calSel]||[],sp=paid[ui.calSel]||[];
  const slide=ui.calDir>0?'slide-l':ui.calDir<0?'slide-r':'';ui.calDir=0;
  const items=sel.map(b=>`<div class="swipe st" style="--c:${b.color};${si()}"><div class="bill" data-act="open" data-id="${b.id}"><div class="emo">${esc(b.emoji)}</div><div class="grow"><div class="nm">${esc(b.name)}</div><div class="sub">${b.due===ui.calSel?status(b).txt:'Upcoming repeat'} · ${cycleLabel(b)}</div></div><div class="right"><div class="amt">${money(b.amount)}</div></div></div></div>`).join('')
    +sp.map(({b,p})=>`<div class="swipe st" style="--c:${b.color};${si()}"><div class="bill done" data-act="open" data-id="${b.id}"><div class="emo">${esc(b.emoji)}</div><div class="grow"><div class="nm">${esc(b.name)}</div><div class="sub">${p.auto?'Autopaid':'Paid'}</div></div><div class="right"><div class="amt">${money(p.amount)}</div><div class="pill paid">Paid</div></div></div></div>`).join('');
  return largeTitle('Calendar',`${flat.length} bill${flat.length===1?'':'s'} this month`)+
  `<div class="cal-top st" style="${si()}"><div><h2>${first.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</h2><p>${money(total)} due</p></div>
    <div class="cal-nav">${ui.cal!==t.slice(0,7)?`<button class="btn sm ghost" data-act="calToday">Today</button>`:''}<button class="rbtn" data-act="calNav" data-id="-1" aria-label="Previous month">${ICON.left}</button><button class="rbtn" data-act="calNav" data-id="1" aria-label="Next month">${ICON.right}</button></div></div>
  <div class="calcard st" id="calcard" style="${si()}"><div class="calgrid ${slide}">${cells}</div>
    <div class="cal-legend"><span><i style="background:var(--accent)"></i>Today</span><span><i style="background:var(--green)"></i>Paid</span></div></div>
  <div class="sh st" style="${si()}"><h3>${fmtDate(ui.calSel,true)}</h3></div>
  <div class="list">${items||`<div class="empty-row st" style="${si()}">Nothing due this day ✨</div>`}</div>`;
}

function viewInsights(){
  const all=active(),t=today(),mo=t.slice(0,7);
  const monthly=all.reduce((s,b)=>s+perMonth(b),0);
  const pays=state.bills.flatMap(b=>b.payments.map(p=>({...p,b}))).sort((a,b)=>a.date<b.date?1:-1);
  const paidMonth=pays.filter(p=>p.date.slice(0,7)===mo).reduce((s,p)=>s+(+p.amount||0),0);
  const ontime=pays.length?Math.round(pays.filter(p=>p.date<=p.due).length/pays.length*100):100;
  const cats={};all.forEach(b=>{cats[b.category]=(cats[b.category]||0)+(perMonth(b)||b.amount);});
  const catArr=Object.entries(cats).sort((a,b)=>b[1]-a[1]),max=catArr.length?catArr[0][1]:1;
  const biggest=[...all].sort((a,b)=>b.amount-a.amount)[0];
  const R=38,C=2*Math.PI*R;
  return largeTitle('Insights','Your money at a glance')+
  `<div class="wallet st" style="${si()}"><div class="w-top"><span class="w-k">Monthly bill load</span><span class="w-badge">${all.filter(step).length} recurring</span></div>
    <div class="w-amt">${countMoney(monthly)}</div><div class="w-k">≈ ${countMoney(monthly*12)} a year · ${countMoney(monthly*12/365)} a day</div></div>
  <div class="tiles">
    <div class="tile st" style="${si()}"><div class="k">Paid this month</div><div class="v">${countMoney(paidMonth)}</div></div>
    <div class="tile st" style="${si()}"><div class="k">Autopay</div><div class="v">${all.filter(b=>b.autopay).length} of ${all.length}</div></div>
    <div class="tile st" style="${si()}"><div class="k">Biggest bill</div><div class="v">${biggest?esc(biggest.emoji)+' '+money(biggest.amount):'—'}</div></div>
    <div class="tile st" style="${si()}"><div class="k">Payments logged</div><div class="v" data-count="${pays.length}">${pays.length}</div></div>
  </div>
  <div class="sh st" style="${si()}"><h3>On-time score</h3></div>
  <div class="score st" style="${si()}"><div class="num"><svg viewBox="0 0 92 92"><circle class="trk" cx="46" cy="46" r="${R}"/><circle class="prg" cx="46" cy="46" r="${R}" stroke-dasharray="${C.toFixed(2)}" style="stroke-dashoffset:${C.toFixed(2)}" data-off="${(C*(1-ontime/100)).toFixed(2)}"/></svg><b><span data-count="${ontime}">${ontime}</span>%</b></div>
    <div><h4>${ontime>=95?'Bill boss 👑':ontime>=75?'Pretty solid 💪':'Room to grow 📈'}</h4><p>Bills paid on or before the due date count as on time.</p></div></div>
  <div class="sh st" style="${si()}"><h3>By category</h3><span class="muted" style="font-size:13px">per month</span></div>
  <div class="bars st" style="${si()}">${catArr.length?catArr.map(([key,v])=>`<div class="bar"><div class="top2"><span>${esc(CAT_NAME[key])}</span><span>${money(v)}</span></div><div class="track"><i data-w="${Math.max(4,v/max*100).toFixed(1)}"></i></div></div>`).join(''):'<div class="muted">Add bills to see your breakdown.</div>'}</div>
  <div class="sh st" style="${si()}"><h3>History</h3></div>
  <div class="group st" style="${si()}">${pays.slice(0,25).map(p=>`<div class="cell"><span style="font-size:22px">${esc(p.b.emoji)}</span><div class="cell-main"><div class="t">${esc(p.b.name)}</div><div class="d">${fmtDate(p.date)}${p.auto?' · Autopay':''}${p.date>p.due?' · late':''}</div></div><div class="cell-end">${money(p.amount)}</div></div>`).join('')||'<div class="cell"><div class="cell-main"><div class="d">No payments yet. Tap ✓ on a bill when you pay it.</div></div></div>'}</div>`;
}

const seg=(opts,val,act,attr='')=>{const i=Math.max(0,opts.findIndex(o=>String(o[0])===String(val)));return `<div class="seg" style="--n:${opts.length};--i:${i}" ${attr}><span class="thumb"></span>${opts.map(([key,l],j)=>`<button type="button" class="${j===i?'on':''}" data-act="${act}" data-id="${key}" data-ix="${j}">${l}</button>`).join('')}</div>`;};
const sel=(id,opts,v,cls='')=>`<select data-set="${id}" class="${cls}">${opts.map(([key,l])=>`<option value="${key}" ${String(key)===String(v)?'selected':''}>${l}</option>`).join('')}</select>`;
const cell=(ico,col,t,d,end,act)=>`<div class="cell ${act?'tap':''}" ${act?`data-act="${act}"`:''}><span class="ico" style="--ic:${col}">${ico}</span><div class="cell-main"><div class="t">${t}</div>${d?`<div class="d">${d}</div>`:''}</div><div class="cell-end">${end==null?ICON.chev:end}</div></div>`;
const sw=(key,on)=>`<label class="switch"><input type="checkbox" data-set="${key}" ${on?'checked':''}><span></span></label>`;

function viewSettings(){
  const s=state.settings,light=lum(s.bg)>.45,notifOK='Notification' in window;
  return largeTitle('Settings',`Billy ${VERSION}`)+
  (isIOS&&!standalone?`<div class="install st" style="${si()}"><img src="icons/icon-180.png" alt=""><div><b>Install Billy</b><span>Tap the Share button in Safari, then <b style="display:inline;font-size:13px">Add to Home Screen</b> to get the full-screen app.</span></div></div>`:'')+
  `<div class="glabel st" style="${si()}">Appearance</div>
  <div class="group icons st" style="${si()}">
    <div class="cell"><span class="ico" style="--ic:#5e5ce6">${light?'☀️':'🌙'}</span><div class="cell-main"><div class="t">Theme</div></div>${seg([['dark','Dark'],['light','Light']],light?'light':'dark','theme','style="--n:2;width:150px"')}</div>
    <div class="cell"><span class="ico" style="--ic:#3a3a3c">🎨</span><div class="cell-main"><div class="t">Background</div><div class="d" id="bgHex">${s.bg.toUpperCase()}</div></div><label class="well" style="background:${s.bg}"><input type="color" value="${s.bg}" data-set="bg" aria-label="Background color"></label></div>
    <div class="cell"><span class="ico" style="--ic:${s.accent}">✨</span><div class="cell-main"><div class="t">Highlight</div><div class="d" id="acHex">${s.accent.toUpperCase()}</div></div><label class="well" style="background:${s.accent}"><input type="color" value="${s.accent}" data-set="accent" aria-label="Highlight color"></label></div>
    <div class="presets">${PRESETS.map(([n,b,a])=>`<button class="preset ${s.bg===b&&s.accent===a?'on':''}" style="background:${b};color:${lum(b)>.45?'#000':'#fff'}" data-act="preset" data-id="${b}|${a}"><i style="background:${a}"></i>${n}</button>`).join('')}</div>
    ${cell('↺','#8e8e93','Reset to default look','',null,'resetColors')}
  </div>
  <div class="glabel st" style="${si()}">General</div>
  <div class="group icons st" style="${si()}">
    ${cell('💵','#30d158','Currency','',sel('currency',[['$','$ USD'],['€','€ EUR'],['£','£ GBP'],['MX$','MX$ MXN'],['C$','C$ CAD'],['¥','¥ JPY'],['₹','₹ INR']],s.currency))}
    ${cell('🟠','#ff9f0a','Due soon warning','Bills turn orange this early',sel('soonDays',[[1,'1 day'],[2,'2 days'],[3,'3 days'],[5,'5 days'],[7,'7 days'],[14,'14 days']],s.soonDays))}
    ${cell('🔁','#0a84ff','New bills repeat','',sel('defaultCycle',[['monthly','Monthly'],['yearly','Yearly'],['once','Once']],s.defaultCycle))}
    ${cell('👁️','#636366','Privacy mode','Blurs every amount',sw('privacy',s.privacy))}
  </div>
  <div class="glabel st" style="${si()}">Reminders</div>
  <div class="group icons st" style="${si()}">
    ${cell('⏰','#ff453a','Default reminder','',sel('remindDays',REM_OPTS,s.remindDays))}
    ${cell('🕘','#ff9f0a','Reminder time','',`<input type="time" value="${s.remindTime}" data-set="remindTime">`)}
    ${cell('📅','#ff3b30','Add all to Calendar','iPhone Calendar, Outlook, Google',null,'icsAll')}
    ${notifOK?cell('🔔','#ff2d55','Pop-up alerts',isIOS?'Works when Billy is on your Home Screen':'Shows while Billy is open',sw('notify',s.notify)):''}
  </div>
  <div class="ghint st" style="${si()}">Calendar reminders are the most reliable: your bills repeat in the Calendar app and alert you even when Billy is closed. On iPhone, tap "Add All". On PC the file opens in Outlook or Windows Calendar, or you can import it in Google Calendar. Do it again after adding new bills.</div>
  <div class="glabel st" style="${si()}">Backup & sync</div>
  <div class="group icons st" style="${si()}">
    ${cell('📤','#0a84ff','Export backup','Saves a .json file with everything',null,'exportJson')}
    ${cell('📥','#30d158','Import backup','Load a .json file from another device',null,'importFile')}
    ${cell('📋','#5e5ce6','Copy backup as text','Paste it into Notes or a message',null,'copyJson')}
    ${cell('📝','#bf5af2','Paste backup text','',null,'pasteJson')}
  </div>
  <div class="glabel st" style="${si()}">More</div>
  <div class="group icons st" style="${si()}">
    ${cell('✨','#ff9f0a','Add sample bills','',null,'sample')}
    <div class="cell tap" data-act="wipe"><span class="ico" style="--ic:#ff3b30">🗑️</span><div class="cell-main"><div class="t red">Delete everything</div></div></div>
  </div>
  <div class="about"><b>Billy ${VERSION}</b><br>${state.bills.length} bill${state.bills.length===1?'':'s'} saved on this device<br>Made with 💜 for GOZA</div>`;
}

/* ---------- sheet (add / edit) ---------- */
let emojiTouched=false,catTouched=false,editingId=null;
function openSheet(id){
  const b=id?getBill(id):null,s=state.settings;editingId=id||null;emojiTouched=!!b;catTouched=!!b;
  const v=b||{name:'',emoji:'🧾',amount:'',due:addDays(today(),7),cycle:s.defaultCycle,every:2,category:'other',color:s.accent,autopay:false,note:'',remind:{on:true,days:s.remindDays,time:s.remindTime},payments:[]};
  const custom=!COLORS.includes(v.color);
  $('#sheetTitle').textContent=b?'Edit Bill':'New Bill';
  $('#sheetSave').textContent=b?'Save':'Add';
  $('#sheetBody').innerHTML=`<form id="billForm" autocomplete="off" onsubmit="return false" style="--c:${v.color}">
    <div class="ident">
      <button type="button" class="ident-emo" id="emoBtn" data-act="emojiToggle" aria-label="Choose icon">${esc(v.emoji)}</button>
      <input class="ident-name" name="name" placeholder="Bill name" maxlength="60" value="${esc(v.name)}" enterkeyhint="done">
      <div class="ident-amt"><span>${esc(s.currency)}</span><input name="amount" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00" value="${v.amount===''?'':v.amount}"></div>
    </div>
    <input type="hidden" name="emoji" value="${esc(v.emoji)}">
    <div class="collapse" id="emoGrid"><div><div class="emogrid">${EMOJIS.map(e=>`<button type="button" data-act="emojiPick" data-id="${e}" class="${e===v.emoji?'on':''}">${e}</button>`).join('')}
      <div class="emo-custom"><input id="emoCustom" placeholder="Or type any emoji" maxlength="8"><button type="button" class="btn sm" data-act="emojiCustom">Use</button></div></div></div></div>
    <div class="group">
      <div class="cell"><div class="cell-main"><div class="t">${b&&!b.paid&&step(b)?'Next due':'Due date'}</div></div><input type="date" name="due" value="${v.due}"></div>
      <div class="cell col"><div class="t">Repeats</div>${seg([['once','Once'],['monthly','Monthly'],['yearly','Yearly'],['custom','Custom']],v.cycle,'cycle')}</div>
    </div>
    <input type="hidden" name="cycle" value="${v.cycle}"><input type="hidden" name="every" value="${v.every}">
    <div class="collapse ${v.cycle==='custom'?'open':''}" id="everyBox"><div><div class="group" style="margin-top:10px"><div class="cell"><div class="cell-main"><div class="t">Every</div><div class="d">Like every 2 or 3 months</div></div><div class="stepper"><button type="button" data-act="every" data-id="-1">−</button><b id="everyVal">${v.every}</b><button type="button" data-act="every" data-id="1">+</button></div><span class="muted" style="font-size:15px">mo</span></div></div></div></div>
    <div class="glabel">Category</div><input type="hidden" name="category" value="${v.category}">
    <div class="chips" style="padding-bottom:4px">${CATS.map(([key,l])=>`<button type="button" class="chip ${v.category===key?'on':''}" data-act="cat" data-id="${key}">${l}</button>`).join('')}</div>
    <div class="glabel">Highlight color</div><input type="hidden" name="color" value="${v.color}">
    <div class="group"><div class="swatches">${COLORS.map(c=>`<button type="button" class="sw ${c===v.color?'on':''}" style="--s:${c}" data-act="color" data-id="${c}" aria-label="Color ${c}"></button>`).join('')}
      <label class="sw rainbow ${custom?'on':''}" id="cpLabel" style="--s:${custom?v.color:'#888'}" title="Custom color"><input type="color" id="customColor" value="${v.color}"></label></div></div>
    <div class="glabel">Options</div>
    <div class="group icons">
      <div class="cell"><span class="ico" style="--ic:#0a84ff">🔁</span><div class="cell-main"><div class="t">Autopay</div><div class="d">Marks itself paid on the due date</div></div><label class="switch"><input type="checkbox" name="autopay" ${v.autopay?'checked':''}><span></span></label></div>
      <div class="cell"><span class="ico" style="--ic:#ff453a">⏰</span><div class="cell-main"><div class="t">Reminder</div><div class="d">In Billy and on your calendar</div></div><label class="switch"><input type="checkbox" name="remOn" id="remOn" ${v.remind.on?'checked':''}><span></span></label></div>
      <div class="collapse ${v.remind.on?'open':''}" id="remOpts"><div><div class="cell"><span class="ico" style="--ic:transparent"></span><div class="cell-main"><select name="remDays" style="width:100%">${REM_OPTS.map(([key,l])=>`<option value="${key}" ${+v.remind.days===key?'selected':''}>${l}</option>`).join('')}</select></div><input type="time" name="remTime" value="${v.remind.time}"></div></div></div>
    </div>
    <div class="glabel">Side note</div>
    <div class="group"><textarea class="g-note" name="note" placeholder="Account number, login hint, who pays…">${esc(v.note)}</textarea></div>
    <div class="ghint">🔒 Hidden on the main screen. Only shows here.</div>
    ${b&&b.payments.length?`<div class="glabel">Payment history</div><div class="group">${[...b.payments].reverse().slice(0,10).map(p=>`<div class="cell"><div class="cell-main"><div class="t" style="font-size:15px">${fmtDate(p.date)}</div><div class="d">${p.auto?'Autopay':'Paid'}${p.date>p.due?' · late':''}</div></div><div class="cell-end">${money(p.amount)}</div></div>`).join('')}</div>`:''}
    <div class="sheet-actions">
      ${b?'':`<button type="button" class="btn primary" data-act="save">Add bill</button><button type="button" class="btn ghost" data-act="saveAnother">＋ Add and start another</button>`}
      ${b?`<div class="two">${b.paid?`<button type="button" class="btn ghost" data-act="unpay" data-id="${b.id}">↩ Unpaid</button>`:`<button type="button" class="btn primary" data-act="paySheet" data-id="${b.id}">✓ Paid</button>`}<button type="button" class="btn ghost" data-act="icsOne" data-id="${b.id}">📅 Calendar</button></div>
      <button type="button" class="btn danger" data-act="delete" data-id="${b.id}">Delete bill</button>`:''}
    </div></form>`;
  const f=$('#billForm'),amt=f.querySelector('[name=amount]');
  const sizeAmt=()=>{amt.style.width=Math.max(5,(amt.value||'').length+1)+'ch';};sizeAmt();
  amt.addEventListener('input',sizeAmt);
  f.querySelector('[name=name]').addEventListener('input',e=>{
    const n=e.target.value.toLowerCase();const hit=SMART.find(([re])=>re.test(n));if(!hit)return;
    if(!emojiTouched&&f.querySelector('[name=emoji]').value!==hit[1])setEmoji(hit[1],false);
    if(!catTouched)setCat(hit[2],false);
  });
  f.querySelector('#remOn').addEventListener('change',e=>$('#remOpts').classList.toggle('open',e.target.checked));
  f.querySelector('#customColor').addEventListener('input',e=>setColor(e.target.value,true));
  $('#sheetBody').scrollTop=0;
  showSheet();
  if(!b&&wide())setTimeout(()=>f.querySelector('[name=name]').focus(),450);
}
function showSheet(){
  const st=$('#stage');
  st.style.transformOrigin=`50% ${scrollY+innerHeight/2}px`;
  if(!wide()){const bottom=Math.max(0,st.offsetHeight-scrollY-innerHeight);st.style.clipPath=`inset(${scrollY}px 0 ${bottom}px 0 round 22px)`;}
  $('#sheet').style.transform='';
  document.documentElement.classList.add('dim');
  $('#sheet').setAttribute('aria-hidden','false');
}
function closeSheet(){
  document.documentElement.classList.remove('dim');
  $('#sheet').style.transform='';
  $('#sheet').setAttribute('aria-hidden','true');
  if(document.activeElement)document.activeElement.blur();
  clearTimeout(closeSheet.t);closeSheet.t=setTimeout(()=>{if(!document.documentElement.classList.contains('dim'))$('#stage').style.clipPath='';},620);
}
const sheetOpen=()=>document.documentElement.classList.contains('dim');
function setEmoji(e,touched){const f=$('#billForm');f.querySelector('[name=emoji]').value=e;const btn=$('#emoBtn');btn.textContent=e;btn.classList.remove('pop');void btn.offsetWidth;btn.classList.add('pop');
  f.querySelectorAll('[data-act=emojiPick]').forEach(x=>x.classList.toggle('on',x.dataset.id===e));if(touched){emojiTouched=true;$('#emoGrid').classList.remove('open');haptic();}}
function setCat(c,touched){const f=$('#billForm');f.querySelector('[name=category]').value=c;f.querySelectorAll('[data-act=cat]').forEach(x=>x.classList.toggle('on',x.dataset.id===c));if(touched)catTouched=true;}
function setColor(c,custom){const f=$('#billForm');f.querySelector('[name=color]').value=c;f.style.setProperty('--c',c);
  f.querySelectorAll('.sw[data-act=color]').forEach(x=>x.classList.toggle('on',!custom&&x.dataset.id===c));const l=$('#cpLabel');l.classList.toggle('on',!!custom);if(custom)l.style.setProperty('--s',c);}
function readForm(){
  const f=$('#billForm'),g=n=>f.querySelector(`[name=${n}]`);
  return{name:g('name').value.trim(),emoji:g('emoji').value||'🧾',amount:Math.max(0,Math.round((parseFloat(g('amount').value)||0)*100)/100),due:g('due').value,cycle:g('cycle').value,every:+g('every').value||2,
    category:g('category').value,color:g('color').value,autopay:g('autopay').checked,note:g('note').value.trim(),
    remind:{on:g('remOn').checked,days:+g('remDays').value||0,time:g('remTime').value||'09:00'}};
}
function shake(el){el.classList.remove('err');void el.offsetWidth;el.classList.add('err');haptic();}
function saveForm(again){
  if(!$('#billForm'))return;
  const d=readForm(),f=$('#billForm');
  if(!d.name){const n=f.querySelector('[name=name]');shake(n);n.focus();return;}
  if(!d.due){shake(f.querySelector('[name=due]'));return;}
  haptic();
  flip(()=>{
    if(editingId){const b=getBill(editingId);if(d.due!==b.due)d.anchor=parse(d.due).getDate();Object.assign(b,d);island(`${d.emoji} Saved`);}
    else{state.bills.push(normBill({...d,anchor:parse(d.due).getDate(),id:uid(),created:today()}));island(`${d.emoji} ${esc(d.name)} added`);}
    processAuto();save();render();
  });
  if(again){$('#sheetBody').style.opacity='0';setTimeout(()=>{openSheet(null);$('#sheetBody').style.opacity='';},180);}
  else closeSheet();
}

/* sheet drag-to-dismiss */
(function(){
  let y0=null,last=0,t0=0,dy=0;
  const head=()=>$('#sheetHead');
  document.addEventListener('pointerdown',e=>{if(wide()||!sheetOpen()||!e.target.closest('#sheetHead')||e.target.closest('button'))return;y0=e.clientY;t0=performance.now();last=y0;dy=0;$('#sheet').style.transition='none';},{passive:true});
  document.addEventListener('pointermove',e=>{if(y0==null)return;dy=Math.max(0,e.clientY-y0);const r=dy>0?dy:dy*.2;$('#sheet').style.transform=`translateY(${r}px)`;last=e.clientY;},{passive:true});
  const end=()=>{if(y0==null)return;const v=dy/Math.max(1,performance.now()-t0);y0=null;const s=$('#sheet');s.style.transition='';
    if(dy>120||v>.7){closeSheet();}else{s.style.transform='';}};
  document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);
})();

/* ---------- swipe rows ---------- */
let sw0=null,openRow=null,suppressClick=0;const ACTW=168;
function setX(row,x,anim){const b=row.querySelector('.bill');if(!b)return;b.style.transform=x?`translateX(${x}px)`:'';row._x=x;}
function closeRow(row){if(!row)return;setX(row,0);if(openRow===row)openRow=null;}
document.addEventListener('pointerdown',e=>{
  const row=e.target.closest('#list .swipe, .list .swipe');
  if(openRow&&row!==openRow&&!e.target.closest('.row-actions'))closeRow(openRow);
  if(!row||!row.querySelector('.row-actions')||e.target.closest('.row-actions')||(e.pointerType==='mouse'&&e.button!==0))return;
  sw0={row,x0:e.clientX,y0:e.clientY,base:row._x||0,active:false,id:e.pointerId};
},{passive:true});
document.addEventListener('pointermove',e=>{
  if(!sw0||e.pointerId!==sw0.id)return;
  const dx=e.clientX-sw0.x0,dy=e.clientY-sw0.y0;
  if(!sw0.active){if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.3){sw0.active=true;sw0.row.classList.add('dragging');}else if(Math.abs(dy)>10){sw0=null;return;}else return;}
  let x=sw0.base+dx;if(x>0)x*=.2;
  const w=sw0.row.offsetWidth;if(x<-ACTW){const over=-x-ACTW;x=-ACTW-over*.6;}
  x=Math.max(x,-w);setX(sw0.row,x);
  const full=x<-w*.6;if(full!==sw0.full){sw0.full=full;sw0.row.querySelector('.row-actions').style.width=full?'100%':'';if(full)haptic();}
},{passive:true});
function swipeEnd(){
  if(!sw0)return;const s=sw0;sw0=null;if(!s.active)return;
  suppressClick=Date.now();s.row.classList.remove('dragging');
  const x=s.row._x||0,acts=s.row.querySelector('.row-actions');
  if(s.full){const btn=acts.querySelector('.ra-pay')||acts.querySelector('.ra-del');setX(s.row,-s.row.offsetWidth);setTimeout(()=>{acts.style.width='';btn.click();},180);return;}
  acts.style.width='';
  if(x<-60){setX(s.row,-ACTW);openRow=s.row;}else closeRow(s.row);
}
document.addEventListener('pointerup',swipeEnd);document.addEventListener('pointercancel',swipeEnd);

/* calendar swipe between months */
(function(){let x0=null,y0=null;
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('#calcard'))return;x0=e.clientX;y0=e.clientY;},{passive:true});
  document.addEventListener('pointerup',e=>{if(x0==null)return;const dx=e.clientX-x0,dy=e.clientY-y0;x0=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){suppressClick=Date.now();calNav(dx<0?1:-1);}});
})();
function calNav(n){const[y,m]=ui.cal.split('-').map(Number);const d=new Date(y,m-1+n,1);ui.cal=ymd(d).slice(0,7);ui.calSel=ui.cal===today().slice(0,7)?today():ymd(d);ui.calDir=n;haptic();render();}

/* ---------- pay flow ---------- */
function payBill(id,btn){
  const b=getBill(id);if(!b||b.paid)return;
  haptic();
  if(btn){btn.classList.add('done');burst(btn,b.emoji);}
  if(openRow)closeRow(openRow);
  setTimeout(()=>{
    let snap;flip(()=>{snap=markPaid(b);render();});
    island(step(b)?`${esc(b.emoji)} Paid · next ${fmtDate(b.due)}`:`${esc(b.emoji)} Paid`,'Undo',()=>flip(()=>{restore(snap);render();}));
  },btn?480:120);
}

/* ---------- dialog + island + confetti ---------- */
let dlgResolve=null;
function dialog({icon='',title,msg='',buttons,input}){
  return new Promise(res=>{
    if(dlgResolve)dlgResolve('');dlgResolve=res;
    $('#alert').innerHTML=`<div class="ab">${icon?`<div class="ai">${icon}</div>`:''}<h3>${title}</h3>${msg?`<p>${msg}</p>`:''}${input!=null?`<textarea id="dlgIn" placeholder="${esc(input)}" spellcheck="false"></textarea>`:''}</div>
      ${buttons.map(b=>`<button class="abtn ${b.cls||''}" data-act="dlg" data-id="${b.v}">${b.t}</button>`).join('')}`;
    $('#alertWrap').classList.add('show');
  });
}
function closeDialog(v){$('#alertWrap').classList.remove('show');const r=dlgResolve;dlgResolve=null;if(r)r(v);}
let islandTimer=null,islandAction=null;
function island(msg,label,fn){
  const el=$('#island');islandAction=fn||null;
  el.innerHTML=`<span>${msg}</span>${label?`<button data-act="islandAct">${label}</button>`:''}`;
  el.classList.toggle('has-act',!!label);
  el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
  clearTimeout(islandTimer);islandTimer=setTimeout(()=>el.classList.remove('show'),label?4800:2300);
}
function burst(el,emoji){
  if(reduceMotion)return;
  const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,set=['💸','✨','🎉',emoji,'💜'];
  for(let i=0;i<16;i++){const s=document.createElement('span');s.className='burst';s.textContent=set[i%set.length];s.style.left=(x-11)+'px';s.style.top=(y-11)+'px';
    const a=Math.random()*Math.PI*2,d=70+Math.random()*100;s.style.setProperty('--dx',Math.cos(a)*d+'px');s.style.setProperty('--dy',(Math.sin(a)*d-50)+'px');s.style.setProperty('--r',(Math.random()*360-180)+'deg');
    s.style.animationDelay=(Math.random()*60)+'ms';document.body.appendChild(s);setTimeout(()=>s.remove(),1200);}
}

/* ---------- import / export ---------- */
const backup=()=>JSON.stringify({app:'Billy',version:2,exported:new Date().toISOString(),settings:state.settings,bills:state.bills},null,2);
function download(name,text,type){const blob=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);}
async function shareFile(name,text,type,title){
  try{if(navigator.canShare){const file=new File([text],name,{type});if(navigator.canShare({files:[file]})){await navigator.share({files:[file],title});return 'shared';}}}catch(e){if(e&&e.name==='AbortError')return 'cancel';}
  return null;
}
async function exportJson(){
  const name=`billy-backup-${today()}.json`,txt=backup();
  if(isIOS){const r=await shareFile(name,txt,'application/json','Billy backup');if(r)return;}
  download(name,txt,'application/json');island('📤 Backup saved');
}
async function importText(txt){
  let d;try{d=JSON.parse(txt);}catch(e){island('⚠️ That isn\u2019t a Billy backup');return;}
  const bills=Array.isArray(d)?d:d&&d.bills;
  if(!Array.isArray(bills)){island('⚠️ No bills found');return;}
  const choice=await dialog({icon:'📥',title:`Import ${bills.length} bill${bills.length===1?'':'s'}?`,msg:'Replace swaps everything here for the backup. Merge keeps your bills and adds the new ones.',
    buttons:[{t:'Replace everything',v:'replace',cls:'primary'},{t:'Merge',v:'merge'},{t:'Cancel',v:''}]});
  if(!choice)return;
  const incoming=bills.map(normBill);
  if(choice==='replace'){state.bills=incoming;if(d.settings)state.settings={...DEFAULTS,...d.settings};}
  else incoming.forEach(b=>{const i=state.bills.findIndex(x=>x.id===b.id);if(i>-1)state.bills[i]=b;else state.bills.push(b);});
  processAuto();save();applyTheme(true);ui.tab='bills';ui.animate=true;render();scrollTo(0,0);island(`✅ Imported ${incoming.length} bill${incoming.length===1?'':'s'}`);
}

/* ---------- calendar (.ics) ---------- */
const icsEsc=s=>String(s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
function fold(l){const out=[];while(l.length>73){out.push(l.slice(0,73));l=' '+l.slice(73);}out.push(l);return out.join('\r\n');}
function buildICS(bills){
  const stamp=new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Billy//Bill Reminders//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Billy Bills'];
  bills.forEach(b=>{
    const d=parse(b.due),s=b.due.replace(/-/g,''),e=ymd(new Date(d.getFullYear(),d.getMonth(),d.getDate()+1)).replace(/-/g,'');
    L.push('BEGIN:VEVENT',`UID:billy-${b.id}@billy.local`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${s}`,`DTEND;VALUE=DATE:${e}`,
      fold(`SUMMARY:${icsEsc(`${b.emoji} ${b.name} due${b.amount?' · '+moneyTxt(b.amount):''}`)}`),
      fold(`DESCRIPTION:${icsEsc(`${cycleLabel(b)} bill from Billy.${b.autopay?' Autopay is on.':''}`)}`),'TRANSP:TRANSPARENT');
    if(step(b))L.push(`RRULE:${b.cycle==='yearly'?'FREQ=YEARLY':`FREQ=MONTHLY;INTERVAL=${step(b)}`}${b.cycle!=='yearly'&&b.anchor>=31?';BYMONTHDAY=-1':''}`);
    if(b.remind.on){const[h,m]=(b.remind.time||'09:00').split(':').map(Number);const mins=b.remind.days*1440-(h*60+m);
      L.push('BEGIN:VALARM','ACTION:DISPLAY',fold(`DESCRIPTION:${icsEsc(`${b.emoji} ${b.name} is due ${b.remind.days===0?'today':b.remind.days===1?'tomorrow':'in '+b.remind.days+' days'}`)}`),`TRIGGER:${mins>0?'-PT'+mins+'M':'PT'+(-mins)+'M'}`,'END:VALARM');}
    L.push('END:VEVENT');
  });
  L.push('END:VCALENDAR');return L.join('\r\n');
}
async function sendICS(bills,name){
  if(!bills.length){island('No bills to add yet');return;}
  const txt=buildICS(bills);
  if(isIOS){
    if(standalone){const r=await shareFile(name,txt,'text/calendar','Billy reminders');if(r)return;}
    location.href='data:text/calendar;charset=utf-8,'+encodeURIComponent(txt);return;
  }
  download(name,txt,'text/calendar');island('📅 Open the file to add it');
}

/* ---------- sample ---------- */
function sample(){
  const t=today(),mk=(name,emoji,amount,days,cycle,category,color,extra)=>normBill({name,emoji,amount,due:addDays(t,days),cycle,category,color,id:uid(),created:t,...(extra||{})});
  state.bills.push(mk('Rent','🏠',1450,12,'monthly','housing','#a855f7',{note:'Pay through the tenant portal'}),mk('Phone','📱',65,1,'monthly','phone','#3b82f6'),
    mk('Netflix','📺',15.49,3,'monthly','subs','#ef4444',{autopay:true}),mk('Electric','⚡',92.3,6,'monthly','utilities','#eab308'),
    mk('Water','💧',58,-2,'custom','utilities','#14b8a6',{every:2}),mk('Game Pass','🎮',19.99,20,'monthly','subs','#22c55e',{autopay:true}),
    mk('Car insurance','🛡️',720,64,'yearly','insurance','#f97316'));
  save();ui.tab='bills';ui.animate=true;render();scrollTo(0,0);island('✨ Sample bills added');
}

/* ---------- notifications ---------- */
function notify(title,body,tag){
  const opts={body,tag,icon:'icons/icon-192.png',badge:'icons/icon-192.png'};
  if(navigator.serviceWorker&&navigator.serviceWorker.controller){navigator.serviceWorker.ready.then(r=>r.showNotification(title,opts)).catch(()=>{});return;}
  try{new Notification(title,opts);}catch(e){}
}
function checkNotify(){
  if(!state.settings.notify||!('Notification' in window)||Notification.permission!=='granted')return;
  const t=today(),now=new Date(),hm=pad(now.getHours())+':'+pad(now.getMinutes());let ch=false;
  state.meta.notified=state.meta.notified||{};
  Object.keys(state.meta.notified).forEach(key=>{if(!key.endsWith(t))delete state.meta.notified[key];});
  active().forEach(b=>{if(!b.remind.on)return;const d=diffDays(t,b.due);if(d>b.remind.days)return;if(d===b.remind.days&&hm<b.remind.time)return;
    const key=`${b.id}|${b.due}|${t}`;if(state.meta.notified[key])return;state.meta.notified[key]=1;ch=true;
    notify(`${b.emoji} ${b.name}`,`${status(b).txt}${b.amount?' · '+moneyTxt(b.amount):''}`,b.id);});
  if(ch)save();
}

/* ---------- events ---------- */
document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-act]');
  if(!el){if(e.target.id==='scrim')closeSheet();if(e.target.id==='alertWrap')closeDialog('');return;}
  const a=el.dataset.act,id=el.dataset.id;
  if(el.tagName==='BUTTON')e.preventDefault();
  if((a==='open'||a==='calDay'||(a==='pay'&&!el.classList.contains('ra')))&&Date.now()-suppressClick<350)return;
  if(a==='open'&&openRow&&el.closest('.swipe')===openRow){closeRow(openRow);return;}
  switch(a){
    case 'tab':
      if(ui.tab===id){scrollTo({top:0,behavior:reduceMotion?'auto':'smooth'});break;}
      ui.tab=id;ui.animate=true;el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');haptic();scrollTo(0,0);render();break;
    case 'new':haptic();openSheet(null);break;
    case 'open':openSheet(id);break;
    case 'close':closeSheet();break;
    case 'filter':if(ui.filter===id)break;ui.filter=id;haptic();flip(render);break;
    case 'togglePaid':ui.showPaid=!ui.showPaid;flip(render);break;
    case 'pay':e.stopPropagation();payBill(id,el.classList.contains('ra')?null:el);break;
    case 'paySheet':{const b=getBill(id);closeSheet();setTimeout(()=>payBill(b.id,null),350);break;}
    case 'unpay':{const b=getBill(id);b.paid=false;b.payments.pop();save();closeSheet();flip(render);island('↩ Marked unpaid');break;}
    case 'islandAct':haptic();if(islandAction)islandAction();$('#island').classList.remove('show');break;
    case 'save':saveForm(false);break;
    case 'saveAnother':saveForm(true);break;
    case 'delete':{const b=getBill(id);if(!b)break;
      const ok=await dialog({icon:'🗑️',title:`Delete ${esc(b.name)}?`,msg:'The bill, its side note, and its payment history are gone for good.',buttons:[{t:'Delete',v:'1',cls:'danger'},{t:'Cancel',v:'',cls:'primary'}]});
      if(openRow)closeRow(openRow);
      if(ok){if(sheetOpen())closeSheet();haptic();
        const r=$(`[data-key="r-${id}"]`)||$(`[data-key="h-${id}"]`);
        const go=()=>flip(()=>{state.bills=state.bills.filter(x=>x.id!==id);save();render();});
        if(r&&!reduceMotion){r.animate([{opacity:1,transform:'none'},{opacity:0,transform:'scale(.9)'}],{duration:260,easing:'ease-in',fill:'forwards'});setTimeout(go,240);}else go();
        island('🗑️ Bill deleted');}
      break;}
    case 'emojiToggle':$('#emoGrid').classList.toggle('open');haptic();break;
    case 'emojiPick':setEmoji(id,true);break;
    case 'emojiCustom':{const v=$('#emoCustom').value.trim();if(v)setEmoji([...v].slice(0,2).join(''),true);break;}
    case 'cycle':{$('#billForm [name=cycle]').value=id;moveSeg(el);$('#everyBox').classList.toggle('open',id==='custom');haptic();break;}
    case 'every':{const inp=$('#billForm [name=every]'),v=Math.min(24,Math.max(2,(+inp.value||2)+(+id)));inp.value=v;const b=$('#everyVal');b.textContent=v;b.classList.remove('tick');void b.offsetWidth;b.classList.add('tick');haptic();break;}
    case 'cat':setCat(id,true);haptic();break;
    case 'color':setColor(id,false);haptic();break;
    case 'calNav':calNav(+id);break;
    case 'calToday':ui.calDir=ui.cal<today().slice(0,7)?1:-1;ui.cal=today().slice(0,7);ui.calSel=today();render();break;
    case 'calDay':{if(ui.calSel===id)break;ui.calSel=id;haptic();const keep=scrollY;render();scrollTo(0,keep);break;}
    case 'privacy':state.settings.privacy=!state.settings.privacy;save();applyTheme();haptic();if(ui.tab==='settings'){const c=$('[data-set=privacy]');if(c)c.checked=state.settings.privacy;}break;
    case 'theme':moveSeg(el);state.settings.bg=id==='light'?'#ffffff':'#000000';save();applyTheme(true);setTimeout(render,460);break;
    case 'preset':{const[b,ac]=id.split('|');state.settings.bg=b;state.settings.accent=ac;save();applyTheme(true);haptic();setTimeout(render,460);break;}
    case 'resetColors':state.settings.bg=DEFAULTS.bg;state.settings.accent=DEFAULTS.accent;save();applyTheme(true);setTimeout(render,460);island('Back to the default look');break;
    case 'exportJson':exportJson();break;
    case 'copyJson':
      try{await navigator.clipboard.writeText(backup());island('📋 Backup copied');}
      catch(err){dialog({icon:'📋',title:'Copy this text',msg:'Select all and copy.',input:'',buttons:[{t:'Done',v:'',cls:'primary'}]});const ta=$('#dlgIn');if(ta){ta.value=backup();ta.select();}}
      break;
    case 'pasteJson':{const p=dialog({icon:'📝',title:'Paste backup',msg:'Paste the text from "Copy backup as text".',input:'{ "app": "Billy", … }',buttons:[{t:'Import',v:'go',cls:'primary'},{t:'Cancel',v:''}]});
      const v=await p;if(v&&typeof v==='object'&&v.text)importText(v.text);break;}
    case 'dlg':{const ta=$('#dlgIn');closeDialog(id==='go'&&ta?{text:ta.value.trim()}:id);break;}
    case 'importFile':$('#fileIn').click();break;
    case 'sample':sample();break;
    case 'wipe':{const ok=await dialog({icon:'⚠️',title:'Delete everything?',msg:'All bills, notes, history, and settings on this device will be erased. Export a backup first if you want to keep them.',buttons:[{t:'Erase everything',v:'1',cls:'danger'},{t:'Cancel',v:'',cls:'primary'}]});
      if(ok){state={settings:{...DEFAULTS},bills:[],meta:{notified:{}}};save();applyTheme(true);ui.tab='bills';ui.animate=true;render();scrollTo(0,0);island('Everything erased');}break;}
    case 'icsAll':sendICS(active(),'billy-reminders.ics');break;
    case 'icsOne':{const b=getBill(id);sendICS([b],`billy-${b.name.replace(/\W+/g,'-').toLowerCase()}.ics`);break;}
  }
});
function moveSeg(btn){const s=btn.parentNode;s.style.setProperty('--i',btn.dataset.ix);s.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===btn));}
document.addEventListener('change',async e=>{
  const key=e.target.dataset.set;if(!key)return;const s=state.settings;
  if(key==='privacy'){s.privacy=e.target.checked;save();applyTheme();return;}
  if(key==='notify'){
    if(e.target.checked){let p='denied';try{p=await Notification.requestPermission();}catch(err){}s.notify=p==='granted';e.target.checked=s.notify;
      island(s.notify?'🔔 Alerts on':'⚠️ Alerts were blocked');if(s.notify)checkNotify();}
    else s.notify=false;
    save();return;}
  if(key==='bg'||key==='accent'){s[key]=e.target.value;save();applyTheme();return;}
  s[key]=(key==='soonDays'||key==='remindDays')?+e.target.value:e.target.value;
  save();applyTheme();render();
});
document.addEventListener('input',e=>{
  const key=e.target.dataset.set;
  if(key==='bg'||key==='accent'){state.settings[key]=e.target.value;applyTheme();const w=e.target.closest('.well');if(w)w.style.background=e.target.value;const hx=$(key==='bg'?'#bgHex':'#acHex');if(hx)hx.textContent=e.target.value.toUpperCase();}
  if(e.target.id==='search'){ui.query=e.target.value;applySearch();}
});
$('#fileIn').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>importText(String(r.result));r.readAsText(f);e.target.value='';});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if($('#alertWrap').classList.contains('show'))closeDialog('');else if(sheetOpen())closeSheet();}
  if(e.key==='Enter'&&sheetOpen()&&e.target.name==='name'){e.preventDefault();saveForm(false);}
  if((e.key==='n'||e.key==='N')&&!sheetOpen()&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();openSheet(null);}
});

/* nav bar + large title on scroll */
let ticking=false;
addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{ticking=false;const y=scrollY;
  $('#navbar').classList.toggle('scrolled',y>38);
  const lt=$('#lt');if(lt)lt.style.transform=y<0?`scale(${Math.min(1.12,1-y/700)})`:'';
});},{passive:true});

/* ---------- boot ---------- */
load();
const autoCount=processAuto();
applyTheme();
render();
const splash=$('#splash');
setTimeout(()=>{splash.classList.add('out');setTimeout(()=>splash.remove(),500);},reduceMotion?0:650);
if(autoCount)setTimeout(()=>island(`🔁 ${autoCount} autopay bill${autoCount>1?'s':''} logged`),1000);
checkNotify();
let lastDay=today();
setInterval(()=>{if(today()!==lastDay){lastDay=today();processAuto();render();}checkNotify();},60000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)return;if(today()!==lastDay){lastDay=today();processAuto();render();}checkNotify();});
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
  addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
})();
