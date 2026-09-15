/* ============================================================
   AGENT PERFORMANCE CENTER — GOOGLE SHEETS LIVE SYNC
   Connects the existing 2D Station office to the user's
   Google Sheets / Apps Script leaderboard API.
   ============================================================ */
(() => {
  'use strict';
  const OFFICE_API = 'https://script.google.com/macros/s/AKfycbx-3fn-3ByKw2Ef5fYJ0ulY-Bp4TYPit7fMBcsdDmKmtaPsyNZ7UzWvKuSrpqU5Y6V6/exec';
  const POLL_MS = 30000;
  const NAME_TO_PC = {'cherylyn':'PC-1','gia':'PC-2','marnelie':'PC-3','minjubail':'PC-4','edna':'PC-5','selyn':'PC-6','karen':'PC-7','zara':'PC-8','angelo':'PC-10'};
  const state = {data:null,mapped:[],loading:false,timer:null,started:false};
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct=v=>(Number(v||0)*100).toFixed(1)+'%';
  const money=v=>Number(v||0).toLocaleString();
  const keyName=s=>String(s||'').trim().toLowerCase();

  function ensureStyles(){
    if(document.getElementById('apc-live-style'))return;
    const style=document.createElement('style'); style.id='apc-live-style';
    style.textContent=`
      #apcLivePanel{position:absolute;right:14px;top:14px;z-index:28;width:285px;max-width:calc(100vw - 28px);background:rgba(13,16,24,.95);border:1px solid #333c4d;border-radius:12px;box-shadow:0 14px 36px rgba(0,0,0,.48);color:#e8ecf3;font-family:"Segoe UI",system-ui,sans-serif;backdrop-filter:blur(6px);overflow:hidden}
      #apcLivePanel .apc-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px 8px;border-bottom:1px solid #262d3a}
      #apcLivePanel .apc-title{font-size:10px;font-weight:900;letter-spacing:1.6px;color:#5b9cff}
      #apcLivePanel .apc-sync{display:flex;align-items:center;gap:5px;font-size:8px;font-weight:800;letter-spacing:.8px;color:#8b94a7}
      #apcLivePanel .apc-dot{width:7px;height:7px;border-radius:50%;background:#4cd964;box-shadow:0 0 7px rgba(76,217,100,.55)}
      #apcLivePanel.offline .apc-dot{background:#ffb340;box-shadow:none}
      #apcLivePanel .apc-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:8px 10px}
      #apcLivePanel .apc-kpi{background:#151a23;border:1px solid #262d3a;border-radius:8px;padding:6px 5px;text-align:center}
      #apcLivePanel .apc-kpi b{display:block;font-size:16px;line-height:1.05}
      #apcLivePanel .apc-kpi span{display:block;margin-top:3px;color:#8b94a7;font-size:7.5px;font-weight:800;letter-spacing:1px}
      #apcLivePanel .apc-date{padding:0 10px 7px;color:#8b94a7;font-size:8px;font-weight:700;letter-spacing:.7px}
      #apcLivePanel .apc-list{padding:0 8px 8px;max-height:340px;overflow:auto}
      #apcLivePanel .apc-row{display:grid;grid-template-columns:24px 1fr 42px 52px;align-items:center;gap:5px;padding:6px 5px;border-top:1px solid rgba(255,255,255,.045)}
      #apcLivePanel .apc-row:first-child{border-top:0}.apc-rank{font-size:10px;font-weight:900;text-align:center;color:#8b94a7}.apc-row.top .apc-rank{color:#ffcf5a}
      #apcLivePanel .apc-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;font-weight:800}
      #apcLivePanel .apc-st{display:flex;align-items:center;gap:4px;margin-top:2px;font-size:7px;font-weight:800;letter-spacing:.5px;color:#8b94a7}
      #apcLivePanel .apc-st i{width:5px;height:5px;border-radius:50%;display:inline-block;background:#4cd964}.apc-st.abs i{background:#7b8494}
      #apcLivePanel .apc-num{text-align:right;font-size:9px;font-weight:800}.apc-num small{display:block;color:#8b94a7;font-size:7px}
      .apc-agent-badge{position:absolute;z-index:27;pointer-events:none;transform:translate(-50%,-100%);min-width:62px;padding:3px 5px 4px;border-radius:6px;border:1px solid rgba(91,156,255,.45);background:rgba(13,16,24,.92);color:#e8ecf3;text-align:center;box-shadow:0 5px 12px rgba(0,0,0,.35);font-family:"Segoe UI",system-ui,sans-serif;transition:left .08s linear,top .08s linear}
      .apc-agent-badge .r{font-size:8px;font-weight:900;color:#5b9cff;letter-spacing:.4px}.apc-agent-badge .v{margin-top:1px;font-size:7px;font-weight:700;color:#8b94a7;white-space:nowrap}
      .apc-agent-badge.top{border-color:rgba(255,207,90,.78);box-shadow:0 0 14px rgba(255,207,90,.18),0 5px 12px rgba(0,0,0,.35)}.apc-agent-badge.top .r{color:#ffcf5a}.apc-agent-badge.abs{opacity:.6;border-color:rgba(123,132,148,.45)}
      @media(max-width:760px){#apcLivePanel{width:225px}#apcLivePanel .apc-list{max-height:220px}}
    `; document.head.appendChild(style);
  }
  function ensurePanel(){
    if(document.getElementById('apcLivePanel'))return; const stage=document.getElementById('stage'); if(!stage)return;
    const p=document.createElement('div'); p.id='apcLivePanel';
    p.innerHTML='<div class="apc-head"><div class="apc-title">LIVE PERFORMANCE CENTER</div><div class="apc-sync"><i class="apc-dot"></i><span id="apcSyncText">CONNECTING</span></div></div><div class="apc-kpis"><div class="apc-kpi"><b id="apcTransfers">0</b><span>TRANSFERS</span></div><div class="apc-kpi"><b id="apcRevenue">0</b><span>REVENUE</span></div><div class="apc-kpi"><b id="apcPresent">0</b><span>PRESENT</span></div></div><div class="apc-date" id="apcDate">WAITING FOR SHEETS…</div><div class="apc-list" id="apcList"></div>';
    stage.appendChild(p);
  }
  function officeAgents(){return typeof Agents==='undefined'||!Array.isArray(Agents.agents)?[]:Agents.agents.filter(a=>a&&a.counted&&a.pc!=='CEO');}
  function chooseDesk(row,used){const office=officeAgents(), direct=office.find(a=>!used.has(a)&&a.pc===NAME_TO_PC[keyName(row.name)]);if(direct)return direct;const same=office.find(a=>!used.has(a)&&keyName(a.name)===keyName(row.name));return same||office.find(a=>!used.has(a));}
  function normalizeStatus(row){return String(row&&row.status||'').toUpperCase()==='ABSENT'?'ABSENT':'PRESENT';}

  function applyData(data){
    if(!data||data.success!==true||!Array.isArray(data.agents))throw new Error((data&&data.error)||'Invalid office API response');
    state.data=data; const office=officeAgents(),used=new Set(),mapped=[];
    data.agents.forEach(row=>{const a=chooseDesk(row,used);if(a){used.add(a);mapped.push({office:a,row})}}); state.mapped=mapped;
    office.forEach(a=>{if(used.has(a))return;a.counted=false;a.visible=false;a.alpha=0;a.fading=0;a.path=null;a.lerp=null;a.sitting=false;a.state='OFFLINE';a.tState=999999;});
    mapped.forEach(({office:a,row})=>{
      const status=normalizeStatus(row); a.name=String(row.name||a.name);a.syncStatus=status;a.syncRank=Number(row.rank||0);a.syncTransfers=Number(row.todayTransfers||0);a.syncRevenue=Number(row.todayRevenue||0);a.syncScore=Number(row.overallScore||0);a.syncDate=String(data.date||'');a.counted=true;
      if(status==='ABSENT'){a.visible=false;a.alpha=0;a.fading=0;a.path=null;a.lerp=null;a.sitting=false;a.bubbleT=0;a.bubbleMsg=null;a.state='OFFLINE';a.tState=999999;}
      else{a.visible=true;a.alpha=1;a.fading=0;if(a.state==='OFFLINE'&&!a.path&&!a.lerp){a.state='WORKING';a.sitting=true;}}
    });
    if(Agents.ceo)Agents.ceo.counted=false; updateHeader(data);updatePanel(data);makeBadges();positionBadges();
  }
  function updateHeader(data){const present=Number(data.presentCount||0),w=document.getElementById('cntWorking'),b=document.getElementById('cntBreak'),m=document.getElementById('cntMeeting'),t=document.getElementById('cntTotal');if(w)w.textContent=present;if(b)b.textContent='—';if(m)m.textContent='—';if(t)t.textContent=data.agentCount||data.agents.length;const title=document.querySelector('.brand h1'),sub=document.querySelector('.brand span');if(title)title.textContent='AGENT PERFORMANCE';if(sub)sub.textContent='LIVE 2D OPERATIONS FLOOR';const sim=document.getElementById('clockSim');if(sim)sim.textContent='SHEETS · '+(data.date||'LIVE');const cd=document.getElementById('clockDate');if(cd&&data.date)cd.textContent=data.date;}
  function updatePanel(data){const p=document.getElementById('apcLivePanel');if(!p)return;p.classList.remove('offline');const s=document.getElementById('apcSyncText');if(s)s.textContent='LIVE';document.getElementById('apcTransfers').textContent=money(data.totalTransfers);document.getElementById('apcRevenue').textContent=money(data.totalRevenue);document.getElementById('apcPresent').textContent=money(data.presentCount);document.getElementById('apcDate').textContent=String(data.date||'LIVE').toUpperCase();const list=document.getElementById('apcList');if(!list)return;list.innerHTML=data.agents.map(row=>{const abs=normalizeStatus(row)==='ABSENT',top=Number(row.rank)===1;return '<div class="apc-row '+(top?'top':'')+'"><div class="apc-rank">#'+esc(row.rank||'—')+'</div><div><div class="apc-name">'+esc(row.name)+'</div><div class="apc-st '+(abs?'abs':'')+'"><i></i>'+(abs?'ABSENT':'PRESENT')+' · '+pct(row.overallScore)+'</div></div><div class="apc-num">'+money(row.todayTransfers)+'<small>TR</small></div><div class="apc-num">'+money(row.todayRevenue)+'<small>REV</small></div></div>';}).join('');}
  function makeBadges(){const stage=document.getElementById('stage');if(!stage)return;stage.querySelectorAll('.apc-agent-badge').forEach(el=>el.remove());state.mapped.forEach(({office:a,row})=>{const el=document.createElement('div');el.className='apc-agent-badge'+(Number(row.rank)===1?' top':'')+(normalizeStatus(row)==='ABSENT'?' abs':'');el.dataset.pc=a.pc;el.innerHTML='<div class="r">#'+esc(row.rank||'—')+' · '+esc(row.name)+'</div><div class="v">'+money(row.todayTransfers)+' TRANSFERS · '+money(row.todayRevenue)+' REV</div>';stage.appendChild(el);});}
  function positionBadges(){if(typeof Game==='undefined'||typeof Game.worldToScreen!=='function')return;state.mapped.forEach(({office:a})=>{const el=document.querySelector('.apc-agent-badge[data-pc="'+CSS.escape(a.pc)+'"]');if(!el||!a.visible){if(el)el.style.display='none';return;}const p=Game.worldToScreen(a.pos.x,a.pos.y-(a.sitting?58:72));el.style.display='';el.style.left=Math.round(p.x)+'px';el.style.top=Math.round(p.y)+'px';});}
  function refreshBadges(){if(!state.data)return;state.mapped.forEach(({office:a,row})=>{const el=document.querySelector('.apc-agent-badge[data-pc="'+CSS.escape(a.pc)+'"]');if(!el)return;el.classList.toggle('top',Number(row.rank)===1);el.classList.toggle('abs',normalizeStatus(row)==='ABSENT');});}
  function loadJSONP(){return new Promise((resolve,reject)=>{const cb='__apc_jsonp_'+Date.now()+'_'+Math.floor(Math.random()*100000),script=document.createElement('script');let done=false;const cleanup=()=>{if(script.parentNode)script.parentNode.removeChild(script);try{delete window[cb]}catch(_){window[cb]=undefined}};const finish=(fn,v)=>{if(done)return;done=true;clearTimeout(timeout);cleanup();fn(v)};const timeout=setTimeout(()=>finish(reject,new Error('API timeout')),12000);window[cb]=p=>finish(resolve,p);script.onerror=()=>finish(reject,new Error('API script load failed'));script.src=OFFICE_API+'?api=office&callback='+encodeURIComponent(cb)+'&_='+Date.now();document.head.appendChild(script);});}
  async function refresh(){if(state.loading)return;state.loading=true;try{applyData(await loadJSONP())}catch(err){const p=document.getElementById('apcLivePanel');if(p)p.classList.add('offline');const s=document.getElementById('apcSyncText');if(s)s.textContent=state.data?'STALE':'OFFLINE';console.warn('[APC] Live sync failed:',err)}finally{state.loading=false}}
  function loop(){positionBadges();refreshBadges();requestAnimationFrame(loop)}
  function start(){if(state.started)return;state.started=true;ensureStyles();ensurePanel();setTimeout(()=>{refresh();state.timer=setInterval(refresh,POLL_MS);requestAnimationFrame(loop)},800)}
  window.APCOfficeSync={refresh,getData:()=>state.data,getMappings:()=>state.mapped.slice()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();