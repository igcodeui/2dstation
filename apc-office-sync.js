/* ============================================================
   AGENT PERFORMANCE CENTER — GOOGLE SHEETS LIVE SYNC
   Connects the existing 2D Station office to the user's
   Google Sheets / Apps Script leaderboard API.
   ============================================================ */
(() => {
  'use strict';
  const OFFICE_API = 'https://script.google.com/macros/s/AKfycbx-3fn-3ByKw2Ef5fYJ0ulY-Bp4TYPit7fMBcsdDmKmtaPsyNZ7UzWvKuSrpqU5Y6V6/exec';
  const RR_API = 'https://script.google.com/macros/s/AKfycbyMXt3sSNYLvpL4ZukswXlaIi1kXI3X88ohn163h-QGJk4MmOBN82LfrbmDhcYNSrNG/exec';
  const POLL_MS = 30000;
  const NAME_TO_PC = {'marnelie':'PC-1','selyn':'PC-2','edna':'PC-3','angelo':'PC-4','karen':'PC-5','zara':'PC-6','zarah':'PC-6','gia':'PC-7','cherylyn':'PC-8','arc':'PC-10','frank':'PC-11','minjubail':'PC-13','jd':'PC-14','rea':'PC-15','jhoana':'PC-16'};
  const ACTUAL_OFFICE = {'PC-1':'Marnelie','PC-2':'Selyn','PC-3':'Edna','PC-4':'Angelo','PC-5':'Karen','PC-6':'Zarah','PC-7':'Gia','PC-8':'Cherylyn','PC-9':'Red Molina','PC-10':'Arc','PC-11':'Frank','PC-12':null,'PC-13':'Minjubail','PC-14':'JD','PC-15':'Rea','PC-16':'Jhoana','PC-17':null,'PC-18':null,'PC-19':'Carnel','PC-20':'Maika','PC-21':'Shanley','PC-22':'Normie','PC-23':'Angelica'};
  const state = {data:null,rrData:null,mapped:[],rrMapped:[],loading:false,timer:null,started:false,badgesVisible:false,source:'apc'};
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct=v=>(Number(v||0)*100).toFixed(1)+'%';
  const money=v=>Number(v||0).toLocaleString();
  const keyName=s=>String(s||'').trim().toLowerCase();

  function ensureStyles(){
    if(document.getElementById('apc-live-style'))return;
    const style=document.createElement('style'); style.id='apc-live-style';
    style.textContent=`
      #apcLivePanel{position:absolute;right:14px;top:14px;z-index:28;width:440px;max-width:calc(100vw - 28px);max-height:calc(100% - 28px);background:rgba(13,16,24,.95);border:1px solid #333c4d;border-radius:12px;box-shadow:0 14px 36px rgba(0,0,0,.48);color:#e8ecf3;font-family:"Segoe UI",system-ui,sans-serif;backdrop-filter:blur(6px);overflow:hidden}
      #apcLivePanel .apc-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 12px;border-bottom:1px solid #262d3a}\n      #apcLivePanel .apc-tabs{display:flex;gap:6px;padding:10px 14px;border-bottom:1px solid #262d3a;background:rgba(255,255,255,.015)}\n      #apcLivePanel .apc-tab{flex:1;border:1px solid #333c4d;background:#151a23;color:#8b94a7;border-radius:7px;padding:8px 6px;font:800 9px/1.1 "Segoe UI",system-ui,sans-serif;letter-spacing:.7px;cursor:pointer}\n      #apcLivePanel .apc-tab:hover{color:#e8ecf3;border-color:#5b9cff}\n      #apcLivePanel .apc-tab.on{color:#fff;border-color:#5b9cff;background:rgba(91,156,255,.16);box-shadow:inset 0 0 0 1px rgba(91,156,255,.18)}
      #apcLivePanel .apc-title{font-size:18px;font-weight:900;letter-spacing:2px;color:#5b9cff}
      #apcLivePanel .apc-tools{display:flex;align-items:center;gap:8px}\n      #apcLivePanel .apc-toggle{border:1px solid #333c4d;background:#151a23;color:#8b94a7;border-radius:7px;padding:5px 8px;font:800 10px/1 "Segoe UI",system-ui,sans-serif;letter-spacing:.7px;cursor:pointer}\n      #apcLivePanel .apc-toggle:hover{color:#e8ecf3;border-color:#5b9cff}\n      #apcLivePanel .apc-toggle.on{color:#5b9cff;border-color:rgba(91,156,255,.55);background:rgba(91,156,255,.12)}\n      #apcLivePanel .apc-sync{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:800;letter-spacing:1px;color:#8b94a7}
      #apcLivePanel .apc-dot{width:10px;height:10px;border-radius:50%;background:#4cd964;box-shadow:0 0 7px rgba(76,217,100,.55)}
      #apcLivePanel.offline .apc-dot{background:#ffb340;box-shadow:none}
      #apcLivePanel .apc-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px 14px}
      #apcLivePanel .apc-kpi{background:#151a23;border:1px solid #262d3a;border-radius:10px;padding:12px 8px;text-align:center}
      #apcLivePanel .apc-kpi b{display:block;font-size:28px;line-height:1.05}
      #apcLivePanel .apc-kpi span{display:block;margin-top:5px;color:#8b94a7;font-size:11px;font-weight:800;letter-spacing:1px}
      #apcLivePanel .apc-date{padding:2px 14px 10px;color:#8b94a7;font-size:11px;font-weight:800;letter-spacing:.8px}
      #apcLivePanel .apc-list{padding:0 12px 14px;max-height:560px;overflow:auto}
      #apcLivePanel .apc-row{display:grid;grid-template-columns:46px 1fr 68px 82px;align-items:center;gap:10px;padding:12px 8px;border-top:1px solid rgba(255,255,255,.045)}
      #apcLivePanel .apc-row:first-child{border-top:0}.apc-rank{font-size:18px;font-weight:900;text-align:center;color:#8b94a7}.apc-row.top .apc-rank{color:#ffcf5a}
      #apcLivePanel .apc-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:16px;font-weight:900}
      #apcLivePanel .apc-st{display:flex;align-items:center;gap:4px;margin-top:4px;font-size:11px;font-weight:800;letter-spacing:.7px;color:#8b94a7}
      #apcLivePanel .apc-st i{width:8px;height:8px;border-radius:50%;display:inline-block;background:#4cd964}.apc-st.abs i{background:#7b8494}
      #apcLivePanel .apc-num{text-align:right;font-size:14px;font-weight:900}.apc-num small{display:block;color:#8b94a7;font-size:10px}
      .apc-agent-badge{position:absolute;z-index:27;pointer-events:none;transform:translate(-50%,-100%);min-width:150px;padding:7px 9px 8px;border-radius:6px;border:1px solid rgba(91,156,255,.45);background:rgba(13,16,24,.92);color:#e8ecf3;text-align:center;box-shadow:0 5px 12px rgba(0,0,0,.35);font-family:"Segoe UI",system-ui,sans-serif;transition:left .08s linear,top .08s linear}
      .apc-agent-badge .r{font-size:13px;font-weight:900;color:#5b9cff;letter-spacing:.5px}.apc-agent-badge .v{margin-top:3px;font-size:11px;font-weight:800;color:#8b94a7;white-space:nowrap}
      .apc-agent-badge.top{border-color:rgba(255,207,90,.78);box-shadow:0 0 14px rgba(255,207,90,.18),0 5px 12px rgba(0,0,0,.35)}.apc-agent-badge.top .r{color:#ffcf5a}.apc-agent-badge.abs{opacity:.6;border-color:rgba(123,132,148,.45)}
      @media(max-width:760px){#apcLivePanel{width:calc(100vw - 24px);right:12px;top:12px}#apcLivePanel .apc-list{max-height:46vh}#apcLivePanel .apc-title{font-size:14px}#apcLivePanel .apc-row{grid-template-columns:34px 1fr 54px 64px}.apc-agent-badge{display:none}}
    `; document.head.appendChild(style);
  }
  function ensurePanel(){
    if(document.getElementById('apcLivePanel'))return; const stage=document.getElementById('stage'); if(!stage)return;
    const p=document.createElement('div'); p.id='apcLivePanel';
    p.innerHTML='<div class="apc-head"><div class="apc-title">LIVE PERFORMANCE CENTER</div><div class="apc-tools"><button id="apcToggleBadges" class="apc-toggle">SHOW LABELS</button><div class="apc-sync"><i class="apc-dot"></i><span id="apcSyncText">CONNECTING</span></div></div></div><div class="apc-tabs"><button class="apc-tab on" data-source="apc">AGENT PERFORMANCE</button><button class="apc-tab" data-source="rr">RAPID RELIEF</button><button class="apc-tab" data-source="all">ALL</button></div><div class="apc-kpis"><div class="apc-kpi"><b id="apcTransfers">0</b><span>TRANSFERS</span></div><div class="apc-kpi"><b id="apcRevenue">0</b><span>REVENUE</span></div><div class="apc-kpi"><b id="apcPresent">0</b><span>PRESENT</span></div></div><div class="apc-date" id="apcDate">WAITING FOR SHEETS…</div><div class="apc-list" id="apcList"></div>';
    stage.appendChild(p);
  }
  function officeAgents(){return typeof Agents==='undefined'||!Array.isArray(Agents.agents)?[]:Agents.agents.filter(a=>a&&a.counted&&a.pc!=='CEO');}
  function chooseDesk(row,used){const office=officeAgents(), direct=office.find(a=>!used.has(a)&&a.pc===NAME_TO_PC[keyName(row.name)]);if(direct)return direct;const same=office.find(a=>!used.has(a)&&keyName(a.name)===keyName(row.name));return same||office.find(a=>!used.has(a));}
  function normalizeStatus(row){return String(row&&row.status||'').toUpperCase()==='ABSENT'?'ABSENT':'PRESENT';}

  function applyActualOfficeLayout(){
    if(typeof Agents==='undefined'||!Array.isArray(Agents.agents)) return;
    Agents.agents.forEach(a=>{
      if(!a || !a.pc) return;
      const actual = Object.prototype.hasOwnProperty.call(ACTUAL_OFFICE,a.pc)
        ? ACTUAL_OFFICE[a.pc]
        : undefined;
      if(actual === undefined) return;
      if(actual === null){
        a.counted=false; a.visible=false; a.alpha=0; a.fading=0;
        a.path=null; a.lerp=null; a.sitting=false; a.state='OFFLINE'; a.tState=999999; a.decideT=999999;
      }else{
        a.name=actual;
      }
    });
  }

  function applySourceData(data, source){
    if(!data||data.success!==true||!Array.isArray(data.agents)) throw new Error((data&&data.error)||('Invalid '+source+' API response'));
    const office=officeAgents(), used=new Set(), mapped=[];
    data.agents.forEach(row=>{
      const key=keyName(row.name);
      const pc=source==='rr'
        ? NAME_TO_PC[key]
        : NAME_TO_PC[key];
      const a=office.find(x=>!used.has(x)&&x.pc===pc) || office.find(x=>!used.has(x)&&keyName(x.name)===key);
      if(a){used.add(a);mapped.push({office:a,row});}
    });
    if(source==='rr') state.rrMapped=mapped;
    else state.mapped=mapped;

    mapped.forEach(({office:a,row})=>{
      a.name=String(row.name||a.name);
      a.counted=true;
      a.syncSource=source;
      a.syncStatus=source==='rr'
        ? (String(row.status||'').toUpperCase()==='ABSENT'?'ABSENT':'ACTIVE')
        : (String(row.status||'').toUpperCase()==='ABSENT'?'ABSENT':'PRESENT');
      a.syncRank=Number(row.rank||row.buyerRank||0);
      a.syncTransfers=Number(row.todayTransfers!=null?row.todayTransfers:row.total||0);
      a.syncRevenue=Number(row.todayRevenue!=null?row.todayRevenue:0);
      a.syncScore=Number(row.overallScore||0);
      a.syncTotal=Number(row.total||0);
      a.syncDate=String(data.date||'');
      a.syncCategory=source==='rr'?{
        ssdi:Number(row.ssdi||0),
        debt:Number(row.debt||0),
        tax:Number(row.tax||0),
        finalExpense:Number(row.finalExpense||0)
      }:null;
      a.decideT=999999;
      a.tState=999999;

      if(a.syncStatus==='ABSENT'){
        a.visible=false; a.alpha=0; a.fading=0; a.path=null; a.lerp=null;
        a.sitting=false; a.state='OFFLINE'; a.bubbleT=0; a.bubbleMsg=null;
      }else{
        a.visible=true; a.alpha=1; a.fading=0;
        a.path=null; a.lerp=null; a.sitting=true; a.state='WORKING'; a.facing=a.seat.facing;
      }
    });
  }

  function clearSyncedAgents(source){
    const list=source==='rr'?state.rrMapped:state.mapped;
    list.forEach(({office:a})=>{
      a.counted=false; a.visible=false; a.alpha=0; a.fading=0; a.path=null; a.lerp=null;
      a.sitting=false; a.state='OFFLINE'; a.tState=999999; a.decideT=999999;
    });
  }

  function getDisplayRows(source){
    if(source==='rr') return state.rrData ? state.rrData.agents.slice() : [];
    if(source==='apc') return state.data ? state.data.agents.slice() : [];
    const apcRows=(state.data&&state.data.agents||[]).map(r=>Object.assign({_source:'apc'},r));
    const rrRows=(state.rrData&&state.rrData.agents||[]).map(r=>Object.assign({_source:'rr'},r));
    return apcRows.concat(rrRows).sort((a,b)=>{
      const ar=Number(a.rank||999), br=Number(b.rank||999);
      if(a._source!==b._source) return a._source==='apc'?-1:1;
      return ar-br;
    });
  }

  function applyDisplaySource(){
    applyActualOfficeLayout();
    // Hide only the tracked performance agents when not in the selected view.
    const allTracked = [...state.mapped,...state.rrMapped].map(x=>x.office);
    const uniq=[...new Set(allTracked)];
    uniq.forEach(a=>{a.visible=false;a.alpha=0;a.path=null;a.lerp=null;a.sitting=false;a.state='OFFLINE';a.tState=999999;a.decideT=999999;});

    const activate=(list)=>{
      list.forEach(({office:a,row})=>{
        a.name=String(row.name||a.name);
        a.counted=true;
        const rr = a.syncSource==='rr';
        const status = rr
          ? (String(row.status||'').toUpperCase()==='ABSENT'?'ABSENT':'ACTIVE')
          : (String(row.status||'').toUpperCase()==='ABSENT'?'ABSENT':'PRESENT');
        a.syncStatus=status;
        a.syncRank=Number(row.rank||row.buyerRank||0);
        a.syncTransfers=Number(row.todayTransfers!=null?row.todayTransfers:row.total||0);
        a.syncRevenue=Number(row.todayRevenue!=null?row.todayRevenue:0);
        a.syncScore=Number(row.overallScore||0);
        a.syncTotal=Number(row.total||0);
        a.syncDate=String((rr?state.rrData:state.data)?.date||'');
        a.syncCategory=rr?{
          ssdi:Number(row.ssdi||0),debt:Number(row.debt||0),tax:Number(row.tax||0),finalExpense:Number(row.finalExpense||0)
        }:null;
        a.decideT=999999; a.tState=999999;
        if(status==='ABSENT'){
          a.visible=false;a.alpha=0;a.sitting=false;a.state='OFFLINE';a.bubbleT=0;a.bubbleMsg=null;
        }else{
          a.visible=true;a.alpha=1;a.fading=0;a.path=null;a.lerp=null;a.sitting=true;a.state='WORKING';a.facing=a.seat.facing;
        }
      });
    };
    if(state.source==='apc') activate(state.mapped);
    else if(state.source==='rr') activate(state.rrMapped);
    else { activate(state.mapped); activate(state.rrMapped); }

    updateHeader();
    updatePanel();
    makeBadges();
    positionBadges();
  }

function updateHeader(){
    const apcPresent=state.data?Number(state.data.presentCount||0):0;
    const rrPresent=state.rrData?Number(state.rrData.activeAgents||0):0;
    const visibleCount=state.source==='apc'?apcPresent:state.source==='rr'?rrPresent:(apcPresent+rrPresent);
    const w=document.getElementById('cntWorking'),b=document.getElementById('cntBreak'),m=document.getElementById('cntMeeting'),t=document.getElementById('cntTotal');
    if(w)w.textContent=visibleCount;
    if(b)b.textContent='—'; if(m)m.textContent='—';
    if(t)t.textContent=state.source==='rr'?(state.rrData?.agentCount||0):(state.source==='apc'?(state.data?.agentCount||0):((state.data?.agentCount||0)+(state.rrData?.agentCount||0)));
    const title=document.querySelector('.brand h1'),sub=document.querySelector('.brand span');
    if(title)title.textContent='AGENT PERFORMANCE';
    if(sub)sub.textContent='LIVE 2D OPERATIONS FLOOR';
    const sim=document.getElementById('clockSim');
    const d=state.source==='rr'?state.rrData?.date:state.source==='apc'?state.data?.date:(state.data?.date||state.rrData?.date);
    if(sim)sim.textContent='SHEETS · '+(d||'LIVE');
    const cd=document.getElementById('clockDate');
    if(cd&&d)cd.textContent=d;
  }

  function updatePanel(){
    const p=document.getElementById('apcLivePanel'); if(!p)return;
    const good = state.source==='rr' ? !!state.rrData : state.source==='apc' ? !!state.data : (!!state.data||!!state.rrData);
    p.classList.toggle('offline',!good);
    const s=document.getElementById('apcSyncText'); if(s)s.textContent=good?'LIVE':'OFFLINE';
    p.querySelectorAll('.apc-tab').forEach(btn=>btn.classList.toggle('on',btn.dataset.source===state.source));

    let transfers=0,revenue=0,present=0;
    if(state.source==='apc' && state.data){transfers=Number(state.data.totalTransfers||0);revenue=Number(state.data.totalRevenue||0);present=Number(state.data.presentCount||0);}
    if(state.source==='rr' && state.rrData){transfers=Number(state.rrData.totalBuyers||0);revenue=0;present=Number(state.rrData.activeAgents||0);}
    if(state.source==='all'){transfers=Number(state.data?.totalTransfers||0)+Number(state.rrData?.totalBuyers||0);revenue=Number(state.data?.totalRevenue||0);present=Number(state.data?.presentCount||0)+Number(state.rrData?.activeAgents||0);}
    document.getElementById('apcTransfers').textContent=money(transfers);
    document.getElementById('apcRevenue').textContent=money(revenue);
    document.getElementById('apcPresent').textContent=money(present);

    const d=document.getElementById('apcDate');
    if(d)d.textContent=String((state.source==='rr'?state.rrData?.date:state.source==='apc'?state.data?.date:(state.data?.date||state.rrData?.date))||'WAITING FOR SHEETS…').toUpperCase();

    const list=document.getElementById('apcList'); if(!list)return;
    const rows=getDisplayRows(state.source);
    list.innerHTML=rows.map(row=>{
      const rr=row._source==='rr' || state.source==='rr';
      const abs=String(row.status||'').toUpperCase()==='ABSENT';
      const rank=Number(row.rank||row.buyerRank||0);
      const score=rr?'':(' · '+pct(row.overallScore));
      const sub=rr
        ? (' '+(abs?'ABSENT':'ACTIVE')+' · SSDI '+money(row.ssdi||0)+' · Debt '+money(row.debt||0)+' · Tax '+money(row.tax||0)+' · FE '+money(row.finalExpense||0))
        : (' '+(abs?'ABSENT':'PRESENT')+score);
      const tr=rr?Number(row.total||0):Number(row.todayTransfers||0);
      const rev=rr?null:Number(row.todayRevenue||0);
      return '<div class="apc-row '+(rank===1?'top':'')+'"><div class="apc-rank">#'+esc(rank||'—')+'</div><div><div class="apc-name">'+esc(row.name)+'</div><div class="apc-st"><i></i>'+esc(sub)+'</div></div><div class="apc-num">'+money(tr)+'<small>TR</small></div><div class="apc-num">'+(rev==null?'—':money(rev))+'<small>REV</small></div></div>';
    }).join('');
  }

  function makeBadges(){
    const stage=document.getElementById('stage'); if(!stage)return;
    stage.querySelectorAll('.apc-agent-badge').forEach(el=>el.remove());
    const add=(list)=>{
      list.forEach(({office:a,row})=>{
        const rr=a.syncSource==='rr';
        const el=document.createElement('div');
        el.className='apc-agent-badge'+(Number(row.rank||row.buyerRank)===1?' top':'')+(String(row.status||'').toUpperCase()==='ABSENT'?' abs':'');
        el.dataset.pc=a.pc;
        el.innerHTML='<div class="r">'+esc('#'+(row.rank||row.buyerRank||'—')+' · '+row.name)+'</div><div class="v">'+money(rr?row.total:row.todayTransfers)+' TRANSFERS'+(rr?'':' · '+money(row.todayRevenue)+' REV')+'</div>';
        stage.appendChild(el);
      });
    };
    if(state.source==='apc') add(state.mapped);
    else if(state.source==='rr') add(state.rrMapped);
    else { add(state.mapped); add(state.rrMapped); }
  }

function positionBadges(){if(typeof Game==='undefined'||typeof Game.worldToScreen!=='function')return;const seen=new Set();[...state.mapped,...state.rrMapped].forEach(({office:a})=>{if(seen.has(a))return;seen.add(a);const el=document.querySelector('.apc-agent-badge[data-pc="'+CSS.escape(a.pc)+'"]');if(!el||!a.visible||!state.badgesVisible){if(el)el.style.display='none';return;}const p=Game.worldToScreen(a.pos.x,a.pos.y-(a.sitting?58:72));el.style.display='';el.style.left=Math.round(p.x)+'px';el.style.top=Math.round(p.y)+'px';});}
  function refreshBadges(){[...state.mapped,...state.rrMapped].forEach(({office:a,row})=>{const el=document.querySelector('.apc-agent-badge[data-pc="'+CSS.escape(a.pc)+'"]');if(!el)return;el.classList.toggle('top',Number(row.rank||row.buyerRank)===1);el.classList.toggle('abs',normalizeStatus(row)==='ABSENT');});}
  function setupBadgeToggle(){const btn=document.getElementById('apcToggleBadges');if(!btn||btn.dataset.bound==='1')return;btn.dataset.bound='1';btn.addEventListener('click',()=>{state.badgesVisible=!state.badgesVisible;btn.classList.toggle('on',state.badgesVisible);btn.textContent=state.badgesVisible?'HIDE LABELS':'SHOW LABELS';positionBadges();});}

  function loadJSONP(url){
    return new Promise((resolve,reject)=>{
      const cb='__apc_jsonp_'+Date.now()+'_'+Math.floor(Math.random()*100000),script=document.createElement('script'); let done=false;
      const cleanup=()=>{if(script.parentNode)script.parentNode.removeChild(script);try{delete window[cb]}catch(_){window[cb]=undefined}};
      const finish=(fn,v)=>{if(done)return;done=true;clearTimeout(timeout);cleanup();fn(v)};
      const timeout=setTimeout(()=>finish(reject,new Error('API timeout')),12000);
      window[cb]=p=>finish(resolve,p);
      script.onerror=()=>finish(reject,new Error('API script load failed'));
      script.src=url+'?api=office&callback='+encodeURIComponent(cb)+'&_='+Date.now();
      document.head.appendChild(script);
    });
  }

  async function refresh(){
    if(state.loading)return; state.loading=true;
    try{
      const results=await Promise.allSettled([loadJSONP(OFFICE_API),loadJSONP(RR_API)]);
      if(results[0].status==='fulfilled') state.data=results[0].value;
      if(results[1].status==='fulfilled') state.rrData=results[1].value;

      if(results[0].status==='fulfilled') applySourceData(state.data,'apc');
      if(results[1].status==='fulfilled') applySourceData(state.rrData,'rr');
      applyDisplaySource();
    }catch(err){
      console.warn('[APC] Live sync failed:',err);
      updatePanel();
    }finally{state.loading=false;}
  }

  function setupSourceTabs(){
    document.querySelectorAll('#apcLivePanel .apc-tab').forEach(btn=>{
      if(btn.dataset.bound==='1')return;
      btn.dataset.bound='1';
      btn.addEventListener('click',()=>{
        state.source=btn.dataset.source;
        applyDisplaySource();
      });
    });
  }

  function start(){if(state.started)return;state.started=true;ensureStyles();ensurePanel();setTimeout(()=>{setupBadgeToggle();setupSourceTabs();refresh();state.timer=setInterval(refresh,POLL_MS);requestAnimationFrame(loop)},500);}

  function loop(){positionBadges();refreshBadges();requestAnimationFrame(loop)}

  window.APCOfficeSync={refresh,getData:()=>state.data,getMappings:()=>state.mapped.slice()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();