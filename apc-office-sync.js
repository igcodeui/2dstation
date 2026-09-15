/* ============================================================
   AGENT PERFORMANCE CENTER — GOOGLE SHEETS LIVE SYNC
   Connects the existing 2D Station office to the user's
   Google Sheets / Apps Script leaderboard API.
   ============================================================ */
(() => {
  'use strict';
  const OFFICE_API = 'https://script.google.com/macros/s/AKfycbzp2ys7EwU_wiWHNAISRaIBIWeddE4CxzQv-r4aivvfKGGMpNc21JZa5yScbI4ePwDy4Q/exec';
  const RR_API = 'https://script.google.com/macros/s/AKfycbyMXt3sSNYLvpL4ZukswXlaIi1kXI3X88ohn163h-QGJk4MmOBN82LfrbmDhcYNSrNG/exec';
  const OFFICE_SETTINGS_API = OFFICE_API + '?api=officeSettings';
  const POLL_MS = 30000;
  const NAME_TO_PC = {'marnelie':'PC-1','selyn':'PC-2','edna':'PC-3','angelo':'PC-4','karen':'PC-5','zara':'PC-6','zarah':'PC-6','gia':'PC-7','cherylyn':'PC-8','arc':'PC-10','frank':'PC-11','minjubail':'PC-13','jd':'PC-14','rea':'PC-15','jhoana':'PC-16'};
  const ACTUAL_OFFICE = {'PC-1':'Marnelie','PC-2':'Selyn','PC-3':'Edna','PC-4':'Angelo','PC-5':'Karen','PC-6':'Zarah','PC-7':'Gia','PC-8':'Cherylyn','PC-9':'Red Molina','PC-10':'Arc','PC-11':'Frank','PC-12':null,'PC-13':'Minjubail','PC-14':'JD','PC-15':'Rea','PC-16':'Jhoana','PC-17':null,'PC-18':null,'PC-19':'Carnel','PC-20':'Maika','PC-21':'Shanley','PC-22':'Normie','PC-23':'Angelica'};
  const GENDER = {'marnelie':'female','selyn':'female','edna':'female','minjubail':'female','karen':'female','zarah':'female','zara':'female','gia':'female','cherylyn':'female','rea':'female','jhoana':'female','shanley':'female','angelica':'female','normie':'female','carnel':'female','maika':'female','angelo':'male','alfredo molina':'male','red molina':'male','frank':'male','arc':'male','jd':'male'};
  const state = {data:null,rrData:null,officeSettings:null,mapped:[],rrMapped:[],loading:false,timer:null,settingsTimer:null,started:false,badgesVisible:false,source:'all',settingsOpen:false,floorPlanDisabled:false};
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct=v=>(Number(v||0)*100).toFixed(1)+'%';
  const money=v=>Number(v||0).toLocaleString();
  const keyName=s=>String(s||'').trim().toLowerCase();

  function ensureStyles(){
    if(document.getElementById('apc-live-style'))return;
    const style=document.createElement('style'); style.id='apc-live-style';
    style.textContent=`
      #apcLivePanel{position:absolute;right:14px;top:14px;z-index:28;width:620px;max-width:calc(100vw - 28px);max-height:calc(100% - 28px);background:rgba(13,16,24,.95);border:1px solid #333c4d;border-radius:12px;box-shadow:0 14px 36px rgba(0,0,0,.48);color:#e8ecf3;font-family:"Segoe UI",system-ui,sans-serif;backdrop-filter:blur(6px);overflow:hidden}
      #apcLivePanel .apc-head{display:flex;align-items:center;justify-content:space-between;padding:20px 22px 16px;border-bottom:1px solid #262d3a}\n      #apcLivePanel .apc-tabs{display:flex;gap:8px;padding:12px 16px;border-bottom:1px solid #262d3a;background:rgba(255,255,255,.015)}
      #apcLivePanel .apc-schedule-btn{margin:0 14px 10px;width:calc(100% - 28px);border:1px solid #333c4d;background:#151a23;color:#dce7f5;border-radius:7px;padding:8px 10px;font:800 10px/1 "Segoe UI",system-ui,sans-serif;letter-spacing:.8px;cursor:pointer}
      #apcLivePanel .apc-schedule-btn:hover{border-color:#5b9cff;color:#fff}
      #apcLivePanel.has-buyers{width:980px!important;max-width:calc(100vw - 28px)!important}
      #apcLivePanel.has-buyers .apc-buyer-panel{position:absolute;right:16px;top:150px;width:330px;height:auto;max-height:none;margin:0;display:block!important}
      #apcLivePanel.has-buyers .apc-buyer-list{max-height:none;overflow:visible}
      #apcLivePanel.has-buyers .apc-buyer-row{padding:5px 8px;font-size:12px;grid-template-columns:1fr 82px 78px;gap:5px}
      #apcLivePanel.has-buyers .apc-buyer-name{font-size:12px}
      #apcLivePanel.has-buyers .apc-buyer-vertical{font-size:9px}
      #apcLivePanel.has-buyers .apc-buyer-status{font-size:12px}
      #apcLivePanel.has-buyers .apc-list{width:calc(100% - 360px);max-height:680px}
      #apcLivePanel.has-buyers .apc-schedule-btn{width:calc(100% - 360px)}
      #apcLivePanel.has-buyers .apc-date{width:calc(100% - 360px)}
      #apcLivePanel .apc-buyer-panel{margin:0 16px 16px;border:1px solid #262d3a;border-radius:10px;background:#101620;overflow:hidden}
      #apcLivePanel .apc-buyer-hd{padding:10px 12px;font-size:12px;font-weight:900;letter-spacing:1.1px;color:#5b9cff;border-bottom:1px solid #262d3a}
      #apcLivePanel .apc-buyer-list{display:grid;grid-template-columns:1fr;max-height:220px;overflow:auto}
      #apcLivePanel .apc-buyer-row{display:grid;grid-template-columns:1fr 90px 95px;gap:8px;align-items:center;padding:8px 10px;border-top:1px solid rgba(255,255,255,.04);font-size:11px}
      #apcLivePanel .apc-buyer-row:first-child{border-top:0}
      #apcLivePanel .apc-buyer-name{font-weight:900;color:#fff}
      #apcLivePanel .apc-buyer-vertical{color:#94a3b8;font-size:12px}
      #apcLivePanel .apc-buyer-status{font-weight:900;text-align:right}
      #apcLivePanel .apc-buyer-status.live{color:#4cd964}
      #apcLivePanel .apc-buyer-status.closed{color:#ff5a5f}
      #apcLivePanel .apc-buyer-empty{padding:14px 12px;color:#94a3b8;font-size:11px;text-align:center}      #apcLivePanel .apc-st.wfh{color:#60a5fa}
      #apcLivePanel .apc-st.wfh i{background:#60a5fa}
      #apcOfficeSchedule{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.58);font-family:"Segoe UI",system-ui,sans-serif}
      #apcOfficeSchedule .box{width:min(880px,calc(100vw - 28px));max-height:86vh;background:#111720;border:1px solid #394455;border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.55);overflow:hidden}
      #apcOfficeSchedule .hd{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid #2a3340}
      #apcOfficeSchedule .hd b{font-size:16px;letter-spacing:1.6px;color:#60a5fa}
      #apcOfficeSchedule .body{padding:14px 18px;overflow:auto;max-height:70vh}
      #apcOfficeSchedule .hint{font-size:11px;color:#94a3b8;margin-bottom:12px}
      #apcOfficeSchedule .display-setting{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 14px;padding:16px 18px;border:1px solid #2f3948;border-radius:9px;background:#0d131b}
      #apcOfficeSchedule .display-setting .copy{display:flex;flex-direction:column;gap:4px;text-align:left}
      #apcOfficeSchedule .display-setting .copy b{font-size:12px;color:#fff;letter-spacing:.8px}
      #apcOfficeSchedule .display-setting .copy span{font-size:12px;color:#94a3b8;line-height:1.35}
      #apcOfficeSchedule .switch{position:relative;width:48px;height:26px;flex:0 0 auto}
      #apcOfficeSchedule .switch input{opacity:0;width:0;height:0}
      #apcOfficeSchedule .slider{position:absolute;inset:0;border-radius:999px;background:#273140;border:1px solid #394455;cursor:pointer;transition:.18s}
      #apcOfficeSchedule .slider:before{content:"";position:absolute;width:20px;height:20px;left:2px;top:2px;border-radius:50%;background:#94a3b8;transition:.18s}
      #apcOfficeSchedule .switch input:checked + .slider{background:#1f4f88;border-color:#5b9cff}
      #apcOfficeSchedule .switch input:checked + .slider:before{transform:translateX(22px);background:#fff}
      #apcOfficeSchedule table{width:100%;border-collapse:collapse}
      #apcOfficeSchedule th,#apcOfficeSchedule td{padding:8px 6px;border-bottom:1px solid #252e3b;font-size:11px;text-align:center}
      #apcOfficeSchedule th{color:#dce7f5;font-size:12px;letter-spacing:.8px}
      #apcOfficeSchedule td.name{text-align:left;font-weight:800;color:#fff}
      #apcOfficeSchedule input,#apcOfficeSchedule select{background:#0d131b;color:#fff;border:1px solid #313c4d;border-radius:6px;padding:6px 7px;font:600 11px "Segoe UI",system-ui,sans-serif}
      #apcOfficeSchedule .foot{padding:12px 18px;border-top:1px solid #2a3340;display:flex;justify-content:flex-end;gap:8px}
      #apcOfficeSchedule button{border:1px solid #394455;background:#18212d;color:#dce7f5;border-radius:7px;padding:8px 12px;font:800 10px "Segoe UI",system-ui,sans-serif;cursor:pointer}
      #apcOfficeSchedule button.primary{background:#1f4f88;border-color:#4b94ed;color:#fff}\n      #apcLivePanel .apc-tab{flex:1;border:1px solid #333c4d;background:#151a23;color:#8b94a7;border-radius:7px;padding:10px 8px;font:900 11px/1.1 "Segoe UI",system-ui,sans-serif;letter-spacing:.7px;cursor:pointer}\n      #apcLivePanel .apc-tab:hover{color:#e8ecf3;border-color:#5b9cff}\n      #apcLivePanel .apc-tab.on{color:#fff;border-color:#5b9cff;background:rgba(91,156,255,.16);box-shadow:inset 0 0 0 1px rgba(91,156,255,.18)}
      body.apc-floor-disabled #stage{background:#080b11!important}
      body.apc-floor-disabled #world,
      body.apc-floor-disabled #stageVignette,
      body.apc-floor-disabled #infoPanel,
      body.apc-floor-disabled #tooltip{visibility:hidden!important;pointer-events:none!important}
      body.apc-floor-disabled #apcLivePanel{position:fixed!important;left:50%!important;right:auto!important;top:50%!important;transform:translate(-50%,-50%)!important;width:min(920px,calc(100vw - 40px))!important;max-width:calc(100vw - 40px)!important;max-height:calc(100vh - 40px)!important;z-index:999!important}
      body.apc-floor-disabled #apcLivePanel .apc-list{max-height:none!important}
      body.apc-floor-disabled #apcLivePanel .apc-title{font-size:28px!important}
      body.apc-floor-disabled #apcLivePanel .apc-name{font-size:24px!important}
      body.apc-floor-disabled #apcLivePanel .apc-rank{font-size:28px!important}
      body.apc-floor-disabled #apcLivePanel .apc-num{font-size:20px!important}
      #apcLivePanel .apc-title{font-size:24px;font-weight:900;letter-spacing:2px;color:#5b9cff}
      #apcLivePanel .apc-tools{display:flex;align-items:center;gap:8px}\n      #apcLivePanel .apc-toggle{border:1px solid #333c4d;background:#151a23;color:#8b94a7;border-radius:7px;padding:5px 8px;font:800 10px/1 "Segoe UI",system-ui,sans-serif;letter-spacing:.7px;cursor:pointer}\n      #apcLivePanel .apc-toggle:hover{color:#e8ecf3;border-color:#5b9cff}\n      #apcLivePanel .apc-toggle.on{color:#5b9cff;border-color:rgba(91,156,255,.55);background:rgba(91,156,255,.12)}
      #apcLivePanel.apc-minimized{width:auto!important;max-width:none!important;overflow:visible!important}
      #apcLivePanel.apc-minimized .apc-title,
      #apcLivePanel.apc-minimized .apc-tabs,
      #apcLivePanel.apc-minimized .apc-kpis,
      #apcLivePanel.apc-minimized .apc-date,
      #apcLivePanel.apc-minimized .apc-schedule-btn,
      #apcLivePanel.apc-minimized .apc-list{display:none!important}
      #apcLivePanel.apc-minimized .apc-head{border-bottom:0!important;padding:10px 12px!important}
      #apcLivePanel.apc-minimized .apc-sync{display:none!important}\n      #apcLivePanel .apc-sync{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:800;letter-spacing:1px;color:#8b94a7}
      #apcLivePanel .apc-dot{width:10px;height:10px;border-radius:50%;background:#4cd964;box-shadow:0 0 7px rgba(76,217,100,.55)}
      #apcLivePanel.offline .apc-dot{background:#ffb340;box-shadow:none}
      #apcLivePanel .apc-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:16px 18px}
      #apcLivePanel .apc-kpi{background:#151a23;border:1px solid #262d3a;border-radius:10px;padding:12px 8px;text-align:center}
      #apcLivePanel .apc-kpi b{display:block;font-size:34px;line-height:1.05}
      #apcLivePanel .apc-kpi span{display:block;margin-top:6px;color:#8b94a7;font-size:13px;font-weight:800;letter-spacing:1px}
      #apcLivePanel .apc-date{padding:2px 14px 10px;color:#8b94a7;font-size:11px;font-weight:800;letter-spacing:.8px}
      #apcLivePanel .apc-list{padding:0 12px 14px;max-height:560px;overflow:auto}
      #apcLivePanel .apc-row{display:grid;grid-template-columns:58px 1fr 90px 108px;align-items:center;gap:12px;padding:15px 10px;border-top:1px solid rgba(255,255,255,.045)}
      #apcLivePanel .apc-row:first-child{border-top:0}.apc-rank{font-size:24px;font-weight:900;text-align:center;color:#8b94a7}.apc-row.top .apc-rank{color:#ffcf5a}.apc-row.rank1{background:linear-gradient(90deg,rgba(255,207,90,.16),rgba(255,207,90,.06));border-left:4px solid #ffcf5a}.apc-row.rank2{background:linear-gradient(90deg,rgba(205,214,223,.13),rgba(205,214,223,.04));border-left:4px solid #cbd5e1}.apc-row.rank3{background:linear-gradient(90deg,rgba(205,130,76,.13),rgba(205,130,76,.04));border-left:4px solid #cd824c}.apc-row.rank1 .apc-rank{color:#ffcf5a}.apc-row.rank2 .apc-rank{color:#d8e0e8}.apc-row.rank3 .apc-rank{color:#e09a68}
      #apcLivePanel .apc-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:21px;font-weight:900}
      #apcLivePanel .apc-st{display:flex;align-items:center;gap:4px;margin-top:5px;font-size:13px;font-weight:800;letter-spacing:.7px;color:#8b94a7}#apcLivePanel .apc-st.abs{color:#ff5a5f}
      #apcLivePanel .apc-st i{width:8px;height:8px;border-radius:50%;display:inline-block;background:#4cd964}.apc-st.abs i{background:#ff5a5f}
      #apcLivePanel .apc-num{text-align:right;font-size:18px;font-weight:900}.apc-num small{display:block;color:#8b94a7;font-size:12px}
      .apc-agent-badge{position:absolute;z-index:27;pointer-events:none;transform:translate(-50%,-100%);min-width:150px;padding:7px 9px 8px;border-radius:6px;border:1px solid rgba(91,156,255,.45);background:rgba(13,16,24,.92);color:#e8ecf3;text-align:center;box-shadow:0 5px 12px rgba(0,0,0,.35);font-family:"Segoe UI",system-ui,sans-serif;transition:left .08s linear,top .08s linear}
      .apc-agent-badge .r{font-size:13px;font-weight:900;color:#5b9cff;letter-spacing:.5px}.apc-agent-badge .v{margin-top:3px;font-size:11px;font-weight:800;color:#8b94a7;white-space:nowrap}
      .apc-agent-badge.top{border-color:rgba(255,207,90,.78);box-shadow:0 0 14px rgba(255,207,90,.18),0 5px 12px rgba(0,0,0,.35)}.apc-agent-badge.top .r{color:#ffcf5a}.apc-agent-badge.abs{opacity:.6;border-color:rgba(123,132,148,.45)}
      @media(max-width:760px){#apcLivePanel{width:calc(100vw - 24px);right:12px;top:12px}#apcLivePanel .apc-list{max-height:46vh}#apcLivePanel .apc-title{font-size:14px}#apcLivePanel .apc-row{grid-template-columns:34px 1fr 54px 64px}.apc-agent-badge{display:none}}
    `; document.head.appendChild(style);
    // TV DISPLAY OVERRIDE: make the live leaderboard easy to read from a distance.
    if (!document.getElementById('apc-tv-readable-style')) {
      const tvStyle = document.createElement('style');
      tvStyle.id = 'apc-tv-readable-style';
      tvStyle.textContent = `
        #apcLivePanel { width: 620px !important; }
        #apcLivePanel .apc-head { padding: 20px 22px 16px !important; }
        #apcLivePanel .apc-title { font-size: 21px !important; }
        #apcLivePanel .apc-tabs { gap: 8px !important; padding: 12px 16px !important; }
        #apcLivePanel .apc-tab { padding: 10px 8px !important; font-size: 11px !important; }
        #apcLivePanel .apc-kpis { gap: 12px !important; padding: 16px 18px !important; }
        #apcLivePanel .apc-kpi { padding: 16px 10px !important; }
        #apcLivePanel .apc-kpi b { font-size: 30px !important; }
        #apcLivePanel .apc-kpi span { font-size: 13px !important; }
        #apcLivePanel .apc-date { padding: 4px 18px 12px !important; font-size: 13px !important; }
        #apcLivePanel .apc-list { padding: 0 16px 18px !important; max-height: 680px !important; }
        #apcLivePanel .apc-row { grid-template-columns: 58px 1fr 90px 108px !important; gap: 12px !important; padding: 15px 10px !important; }
        #apcLivePanel .apc-rank { font-size: 24px !important; }
        #apcLivePanel .apc-name { font-size: 19px !important; }
        #apcLivePanel .apc-st { margin-top: 5px !important; font-size: 13px !important; }
        #apcLivePanel .apc-num { font-size: 17px !important; }
        #apcLivePanel .apc-num small { font-size: 12px !important; }
        @media (max-width: 760px) {
          #apcLivePanel { width: calc(100vw - 24px) !important; }
        }
      `;
      document.head.appendChild(tvStyle);
    }
  }
  function ensurePanel(){
    if(document.getElementById('apcLivePanel'))return; const stage=document.getElementById('stage'); if(!stage)return;
    const p=document.createElement('div'); p.id='apcLivePanel';
    p.innerHTML='<div class="apc-head"><div class="apc-title">LIVE PERFORMANCE CENTER</div><div class="apc-tools"><button id="apcMinimize" class="apc-toggle">MINIMIZE</button><button id="apcToggleBadges" class="apc-toggle">SHOW LABELS</button><div class="apc-sync"><i class="apc-dot"></i><span id="apcSyncText">CONNECTING</span></div></div></div><div class="apc-tabs"><button class="apc-tab on" data-source="all">ALL</button><button class="apc-tab" data-source="apc">HELPING HANDS</button><button class="apc-tab" data-source="rr">RAPID RELIEF</button></div><div class="apc-kpis"><div class="apc-kpi"><b id="apcTransfers">0</b><span>TRANSFERS</span></div><div class="apc-kpi"><b id="apcRevenue">0</b><span>REVENUE</span></div><div class="apc-kpi"><b id="apcPresent">0</b><span>PRESENT</span></div></div><div id="apcBuyerPanel" class="apc-buyer-panel" style="display:none"></div><div class="apc-date" id="apcDate">WAITING FOR SHEETS…</div><button class="apc-schedule-btn" id="apcScheduleBtn">BREAK SCHEDULE &amp; WORK LOCATION</button><div class="apc-list" id="apcList"></div>';
    stage.appendChild(p);
  }
  const SETTINGS_AGENTS=['Marnelie','Selyn','Edna','Angelo','Karen','Zarah','Gia','Cherylyn','Minjubail','Rea','Jhoana','Shanley','Normie','Angelica','Carnel','Maika','Arc','Frank','JD','Margarita','Lucie','Dominic','Alfredo Molina','Abbey'];
  const DEFAULT_BREAKS={};
  SETTINGS_AGENTS.forEach(n=>DEFAULT_BREAKS[n]={coffee:'10:00',lunch:'12:30',bio:'15:00',location:n==='Minjubail'?'WFH':'OFFICE'});
  function ensureScheduleModal(){
    if(document.getElementById('apcOfficeSchedule'))return;
    const m=document.createElement('div');m.id='apcOfficeSchedule';m.style.display='none';
    m.innerHTML='<div class="box"><div class="hd"><b>OFFICE SETTINGS</b><button id="apcSchedClose">CLOSE</button></div><div class="body"><div class="display-setting"><div class="copy"><b>DISABLE FLOOR PLAN</b><span>Hide the 2D floor and center the Live Performance Center for the TV.</span></div><label class="switch"><input type="checkbox" id="apcFloorDisabled"><span class="slider"></span></label></div><div class="hint">Set individual coffee, lunch and bio-break times. Choose OFFICE or WORK FROM HOME. Break schedules are saved to the main Google Sheet.</div><table><thead><tr><th>AGENT</th><th>COFFEE</th><th>LUNCH</th><th>BIO</th><th>LOCATION</th></tr></thead><tbody id="apcSchedBody"></tbody></table></div><div class="foot"><button id="apcSchedSave" class="primary">SAVE ALL</button></div></div>';
    document.body.appendChild(m);
    document.getElementById('apcSchedClose').onclick=()=>{m.style.display='none';state.settingsOpen=false;};
    document.getElementById('apcFloorDisabled').addEventListener('change',e=>{
      setFloorPlanDisabled(e.target.checked);
    });
    document.getElementById('apcSchedSave').onclick=saveOfficeSettings;
  }
  function normalizeOfficeSettings(data){
    const out={agents:{}};
    const src=(data&&data.agents)||{};
    SETTINGS_AGENTS.forEach(n=>{
      const x=src[n]||DEFAULT_BREAKS[n]||{coffee:'10:00',lunch:'12:30',bio:'15:00',location:'OFFICE'};
      out.agents[n]={coffee:String(x.coffee||''),lunch:String(x.lunch||''),bio:String(x.bio||''),location:String(x.location||'OFFICE').toUpperCase()==='WFH'?'WFH':'OFFICE'};
    });
    return out;
  }
  function renderOfficeSettings(){
    ensureScheduleModal();
    const body=document.getElementById('apcSchedBody');
    const data=normalizeOfficeSettings(state.officeSettings);
    body.innerHTML=SETTINGS_AGENTS.map(n=>{
      const x=data.agents[n];
      return '<tr><td class="name">'+esc(n)+'</td><td><input type="time" data-k="coffee" data-agent="'+esc(n)+'" value="'+esc(x.coffee)+'"></td><td><input type="time" data-k="lunch" data-agent="'+esc(n)+'" value="'+esc(x.lunch)+'"></td><td><input type="time" data-k="bio" data-agent="'+esc(n)+'" value="'+esc(x.bio)+'"></td><td><select data-k="location" data-agent="'+esc(n)+'"><option value="OFFICE"'+(x.location==='OFFICE'?' selected':'')+'>OFFICE</option><option value="WFH"'+(x.location==='WFH'?' selected':'')+'>WORK FROM HOME</option></select></td></tr>';
    }).join('');
    const toggle=document.getElementById('apcFloorDisabled');
    if(toggle) toggle.checked=state.floorPlanDisabled;
    document.getElementById('apcOfficeSchedule').style.display='flex'; state.settingsOpen=true;
  }
  function setFloorPlanDisabled(disabled){
    state.floorPlanDisabled=!!disabled;
    try{localStorage.setItem('apcFloorPlanDisabled',state.floorPlanDisabled?'1':'0');}catch(_){}
    document.body.classList.toggle('apc-floor-disabled',state.floorPlanDisabled);
    const world=document.getElementById('world');
    const vignette=document.getElementById('stageVignette');
    const info=document.getElementById('infoPanel');
    const tooltip=document.getElementById('tooltip');
    [world,vignette,info,tooltip].forEach(el=>{if(el){el.style.visibility=state.floorPlanDisabled?'hidden':'';el.style.pointerEvents=state.floorPlanDisabled?'none':'';}});
    const panel=document.getElementById('apcLivePanel');
    if(panel){
      restoreLeaderboardPlacement();
    }
    const toggle=document.getElementById('apcFloorDisabled');
    if(toggle) toggle.checked=state.floorPlanDisabled;
  }
  function loadFloorPlanDisabled(){
    try{state.floorPlanDisabled=localStorage.getItem('apcFloorPlanDisabled')==='1';}catch(_){state.floorPlanDisabled=false;}
    setFloorPlanDisabled(state.floorPlanDisabled);
    restoreLeaderboardPlacement();
  }
  function openOfficeSettings(){ensureScheduleModal();renderOfficeSettings();}
  async function saveOfficeSettings(){
    const payload={agents:{}};
    document.querySelectorAll('#apcOfficeSchedule [data-agent]').forEach(el=>{
      const n=el.dataset.agent;
      if(!payload.agents[n]) payload.agents[n]={};
      payload.agents[n][el.dataset.k]=el.value;
    });
    state.officeSettings=payload;
    persistSettingsJSONP(payload).then(()=>{document.getElementById('apcOfficeSchedule').style.display='none';state.settingsOpen=false;applyDisplaySource();updatePanel();});
  }
  function getSettingsFromServer(){
    return loadJSONP(OFFICE_SETTINGS_API);
  }
  function persistSettingsJSONP(data){
    const url=OFFICE_SETTINGS_API+'&action=save&data='+encodeURIComponent(JSON.stringify(data));
    return loadJSONP(url);
  }
  
  function officeAgents(){return typeof Agents==='undefined'||!Array.isArray(Agents.agents)?[]:Agents.agents.filter(a=>a&&a.counted&&a.pc!=='CEO');}
  function chooseDesk(row,used){const office=officeAgents(), direct=office.find(a=>!used.has(a)&&a.pc===NAME_TO_PC[keyName(row.name)]);if(direct)return direct;const same=office.find(a=>!used.has(a)&&keyName(a.name)===keyName(row.name));return same||office.find(a=>!used.has(a));}
  function normalizeStatus(row){const s=String(row&&row.status||'').toUpperCase();return s==='ABSENT'?'ABSENT':'PRESENT';}
  function applyOfficeLocation(name, a){const rec=state.officeSettings&&state.officeSettings.agents&&state.officeSettings.agents[name];const wfh=rec&&String(rec.location||'').toUpperCase()==='WFH';a.wfh=!!wfh;a.officeStatus=wfh?'WFH':'OFFICE';return a;}

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
      a.gender=GENDER[keyName(a.name)] || a.gender || null;
      applyOfficeLocation(a.name,a);
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

      a.syncAbsent = source==='apc' && a.syncStatus==='ABSENT';
      if(a.syncStatus==='ABSENT' || a.wfh){
        // Absent or WFH means the character is NOT on the physical office floor.
        a.visible=false; a.alpha=0; a.fading=0; a.path=null; a.lerp=null;
        a.sitting=false; a.state='OFFLINE'; a.tState=999999; a.decideT=999999; a.bubbleT=0; a.bubbleMsg=null;
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

  function calculateRRPerformanceRows(){
    if(!state.rrData || !Array.isArray(state.rrData.agents)) return [];
    const rows=state.rrData.agents.map(r=>Object.assign({},r));
    const maxSsdi=Math.max(1,...rows.map(r=>Number(r.ssdi||0)));
    const maxTax=Math.max(1,...rows.map(r=>Number(r.tax||0)));
    const maxDebt=Math.max(1,...rows.map(r=>Number(r.debt||0)));
    const maxFe=Math.max(1,...rows.map(r=>Number(r.finalExpense||0)));
    rows.forEach(r=>{
      const attendance=String(r.status||r.attendance||'').toUpperCase()==='ABSENT'?0:1;
      const ssdi=(Number(r.ssdi||0)/maxSsdi)*0.35;
      const tax=(Number(r.tax||0)/maxTax)*0.17;
      const debt=(Number(r.debt||0)/maxDebt)*0.17;
      const fe=(Number(r.finalExpense||0)/maxFe)*0.01;
      const att=attendance*0.30;
      r.performanceScore=att+ssdi+tax+debt+fe;
    });
    rows.sort((a,b)=>b.performanceScore-a.performanceScore || Number(b.total||0)-Number(a.total||0) || String(a.name).localeCompare(String(b.name)));
    rows.forEach((r,i)=>r.performanceRank=i+1);
    return rows;
  }

  function getDisplayRows(source){
    if(source==='rr') return calculateRRPerformanceRows();
    if(source==='apc') return state.data ? state.data.agents.slice() : [];
    const apcRows=(state.data&&state.data.agents||[]).map(r=>Object.assign({_source:'apc'},r));
    const rrRows=calculateRRPerformanceRows().map(r=>Object.assign({_source:'rr'},r));
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
        a.gender=GENDER[keyName(a.name)] || a.gender || null;
        applyOfficeLocation(a.name,a);
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
        a.syncAbsent = !rr && status==='ABSENT';
        if(status==='ABSENT' || a.wfh){
          // Absent/WFH employees stay off the physical floor; leaderboard remains visible.
          a.visible=false;a.alpha=0;a.sitting=false;a.state='OFFLINE';a.tState=999999;a.decideT=999999;a.bubbleT=0;a.bubbleMsg=null;
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

    function parseHHTime_(s){
      const m=String(s||'').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if(!m)return null;
      let h=Number(m[1]), min=Number(m[2]); const ap=m[3].toUpperCase();
      if(ap==='AM'&&h===12)h=0;
      if(ap==='PM'&&h!==12)h+=12;
      return h*60+min;
    }
    function buyerLiveFromHours_(hours){
      const text=String(hours||'').toUpperCase().replace(/\s+/g,' ').trim();
      if(!text)return {live:false,message:'No schedule'};
      if(/24\s*\/\s*7|24\s*HOURS/.test(text))return {live:true,message:'Open 24/7'};
      const now=new Date();
      const day=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',weekday:'short'}).format(now).toUpperCase().slice(0,3);
      const mins=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour:'2-digit',minute:'2-digit',hour12:false}).format(now).replace(':',''));
      const currentMin=Math.floor(mins/100)*60+(mins%100);
      const parts=text.split(/\s*,\s*/);
      for(const part of parts){
        const ranges=[...part.matchAll(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/g)];
        if(!ranges.length)continue;
        const prefix=part.slice(0,ranges[0].index);
        let days=[];
        if(/MON\s*[-–]\s*THURS?/.test(prefix)||/MON\s*[-–]\s*THU/.test(prefix)) days=['MON','TUE','WED','THU'];
        else if(/MON\s*[-–]\s*FRI|M\s*[-–]\s*F/.test(prefix)) days=['MON','TUE','WED','THU','FRI'];
        else {
          const map=[['MON',/MONDAY|MON/],['TUE',/TUESDAY|TUE/],['WED',/WEDNESDAY|WED/],['THU',/THURSDAY|THURS|THU/],['FRI',/FRIDAY|FRI/],['SAT',/SATURDAY|SAT/],['SUN',/SUNDAY|SUN/]];
          days=map.filter(x=>x[1].test(prefix)).map(x=>x[0]);
        }
        if(!days.length)days=['MON','TUE','WED','THU','FRI'];
        if(!days.includes(day))continue;
        const open=parseHHTime_(ranges[0][1]), close=parseHHTime_(ranges[0][2]);
        if(open==null||close==null)continue;
        const live=close>=open ? (currentMin>=open&&currentMin<=close) : (currentMin>=open||currentMin<=close);
        if(live)return {live:true,message:'Open until '+ranges[0][2]};
      }
      return {live:false,message:'Closed'};
    }

    function renderHelpingHandsBuyers(){
    const panel=document.getElementById('apcBuyerPanel');
    if(!panel)return;
    if(state.source!=='apc'){panel.style.display='none';return;}
    const buyers=(state.data&&Array.isArray(state.data.buyers))?state.data.buyers:[];
    if(!buyers.length){panel.style.display='none';return;}
    panel.style.display='';
    const rows=buyers.map(b=>{
      const calc=buyerLiveFromHours_(b.hours||'');
      const live=calc.live;
      const status=live?'LIVE':'CLOSED';
      const msg=calc.message || b.message || '';
      return '<div class="apc-buyer-row"><div><div class="apc-buyer-name">'+esc(b.name||b.buyer||'')+'</div><div class="apc-buyer-vertical">'+esc(b.vertical||'')+'</div></div><div class="apc-buyer-vertical">'+esc(b.hours||'')+'<div style="font-size:12px;margin-top:2px;color:#6f7b8e">'+esc(msg)+'</div></div><div class="apc-buyer-status '+(live?'live':'closed')+'">● '+status+'</div></div>';
    }).join('');
    panel.innerHTML='<div class="apc-buyer-hd">AVAILABLE BUYERS · PACIFIC TIME</div><div class="apc-buyer-list">'+(rows||'<div class="apc-buyer-empty">No buyer availability data</div>')+'</div>';
  }

function updatePanel(){
    const p=document.getElementById('apcLivePanel'); if(!p)return;
    const good = state.source==='rr' ? !!state.rrData : state.source==='apc' ? !!state.data : (!!state.data||!!state.rrData);
    p.classList.toggle('offline',!good);
    p.classList.toggle('has-buyers',state.source==='apc' && !!(state.data&&Array.isArray(state.data.buyers)&&state.data.buyers.length));
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
      const wfh=state.source==='rr'?false:(state.officeSettings&&state.officeSettings.agents&&String((state.officeSettings.agents[row.name]||{}).location||'').toUpperCase()==='WFH');
      const rank=Number(rr?row.performanceRank:row.rank||row.buyerRank||0);
      const score=rr?'':(' · '+pct(row.overallScore));
      const sub=rr
        ? (' '+(abs?'ABSENT':'ACTIVE')+' · SSDI '+money(row.ssdi||0)+' · Debt '+money(row.debt||0)+' · Tax '+money(row.tax||0)+' · FE '+money(row.finalExpense||0))
        : (' '+(abs?'ABSENT':wfh?'WORK FROM HOME':'PRESENT')+score);
      const tr=rr?Number(row.total||0):Number(row.todayTransfers||0);
      const rev=rr?null:Number(row.todayRevenue||0);
      return '<div class="apc-row '+(rank===1?'top rank1':rank===2?'rank2':rank===3?'rank3':'')+'"><div class="apc-rank">#'+esc(rank||'—')+'</div><div><div class="apc-name">'+esc(row.name)+'</div><div class="apc-st '+(abs?'abs':wfh?'wfh':'')+'"><i></i>'+esc(sub)+'</div></div><div class="apc-num">'+money(tr)+'<small>TR</small></div><div class="apc-num">'+(rev==null?'—':money(rev))+'<small>REV</small></div></div>';
    }).join('');
    renderHelpingHandsBuyers();
  }

  function makeBadges(){
    const stage=document.getElementById('stage'); if(!stage)return;
    stage.querySelectorAll('.apc-agent-badge').forEach(el=>el.remove());
    const add=(list)=>{
      list.forEach(({office:a,row})=>{
        const rr=a.syncSource==='rr';
        const el=document.createElement('div');
        const displayRank = rr ? Number(row.performanceRank||0) : Number(row.rank||row.buyerRank||0);
        el.className='apc-agent-badge'+(displayRank===1?' top':'')+(String(row.status||'').toUpperCase()==='ABSENT'?' abs':'');
        el.dataset.pc=a.pc;
        el.innerHTML='<div class="r">'+esc('#'+(displayRank||'—')+' · '+row.name)+'</div><div class="v">'+money(rr?row.total:row.todayTransfers)+' TRANSFERS'+(rr?'':' · '+money(row.todayRevenue)+' REV')+'</div>';
        stage.appendChild(el);
      });
    };
    if(state.source==='apc') add(state.mapped);
    else if(state.source==='rr') add(state.rrMapped);
    else { add(state.mapped); add(state.rrMapped); }
  }

function positionBadges(){if(typeof Game==='undefined'||typeof Game.worldToScreen!=='function')return;const seen=new Set();[...state.mapped,...state.rrMapped].forEach(({office:a})=>{if(seen.has(a))return;seen.add(a);const el=document.querySelector('.apc-agent-badge[data-pc="'+CSS.escape(a.pc)+'"]');if(!el||!a.visible||!state.badgesVisible){if(el)el.style.display='none';return;}const p=Game.worldToScreen(a.pos.x,a.pos.y-(a.sitting?58:72));el.style.display='';el.style.left=Math.round(p.x)+'px';el.style.top=Math.round(p.y)+'px';});}
  function refreshBadges(){[...state.mapped,...state.rrMapped].forEach(({office:a,row})=>{const el=document.querySelector('.apc-agent-badge[data-pc="'+CSS.escape(a.pc)+'"]');if(!el)return;el.classList.toggle('top',Number(row.rank||row.buyerRank)===1);el.classList.toggle('abs',normalizeStatus(row)==='ABSENT');});}
  function restoreLeaderboardPlacement(){
    const p=document.getElementById('apcLivePanel');
    if(!p)return;
    if(state.floorPlanDisabled){
      p.classList.remove('apc-minimized');
      p.style.position='fixed';
      p.style.left='50%';
      p.style.right='auto';
      p.style.top='50%';
      p.style.transform='translate(-50%,-50%)';
      p.style.width='min(920px,calc(100vw - 40px))';
      p.style.maxWidth='calc(100vw - 40px)';
      p.style.zIndex='999';
    }else{
      p.classList.remove('apc-minimized');
      p.style.position='absolute';
      p.style.left='';
      p.style.right='14px';
      p.style.top='14px';
      p.style.bottom='';
      p.style.transform='';
      p.style.width='620px';
      p.style.maxWidth='calc(100vw - 28px)';
      p.style.zIndex='28';
    }
  }

  function setupMinimizeToggle(){
    const btn=document.getElementById('apcMinimize');
    const p=document.getElementById('apcLivePanel');
    if(!btn||!p||btn.dataset.bound==='1')return;
    btn.dataset.bound='1';
    btn.addEventListener('click',()=>{
      const minimized=p.classList.toggle('apc-minimized');
      btn.textContent=minimized?'RESTORE':'MINIMIZE';
      btn.classList.toggle('on',minimized);
      if(state.floorPlanDisabled && minimized){
        // Keep a small control accessible while in centered TV mode so Settings can be opened.
        p.style.width='auto';
      } else if(state.floorPlanDisabled){
        p.style.width='min(920px,calc(100vw - 40px))';
      } else {
        p.style.width='620px';
      }
    });
  }

  function setupBadgeToggle(){const btn=document.getElementById('apcToggleBadges');if(!btn||btn.dataset.bound==='1')return;btn.dataset.bound='1';btn.addEventListener('click',()=>{state.badgesVisible=!state.badgesVisible;btn.classList.toggle('on',state.badgesVisible);btn.textContent=state.badgesVisible?'HIDE LABELS':'SHOW LABELS';positionBadges();});}

  function loadJSONP(url){
    return new Promise((resolve,reject)=>{
      const cb='__apc_jsonp_'+Date.now()+'_'+Math.floor(Math.random()*100000),script=document.createElement('script'); let done=false;
      const cleanup=()=>{if(script.parentNode)script.parentNode.removeChild(script);try{delete window[cb]}catch(_){window[cb]=undefined}};
      const finish=(fn,v)=>{if(done)return;done=true;clearTimeout(timeout);cleanup();fn(v)};
      const timeout=setTimeout(()=>finish(reject,new Error('API timeout')),12000);
      window[cb]=p=>finish(resolve,p);
      script.onerror=()=>finish(reject,new Error('API script load failed'));
      const sep=url.includes('?')?'&':'?'; script.src=url+sep+'api=office&callback='+encodeURIComponent(cb)+'&_='+Date.now();
      document.head.appendChild(script);
    });
  }

  async function refreshOfficeSettings(){try{const s=await getSettingsFromServer();if(s&&s.success!==false)state.officeSettings=s;applyDisplaySource();}catch(e){if(!state.officeSettings)state.officeSettings=normalizeOfficeSettings({});}}

  async function refresh(){
    if(state.loading)return; state.loading=true;
    try{
      const results=await Promise.allSettled([loadJSONP(OFFICE_API),loadJSONP(RR_API),getSettingsFromServer()]);
      if(results[0].status==='fulfilled') state.data=results[0].value;
      if(results[1].status==='fulfilled') state.rrData=results[1].value;
      if(results[2].status==='fulfilled') state.officeSettings=results[2].value;

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

  function start(){if(state.started)return;state.started=true;ensureStyles();ensurePanel();loadFloorPlanDisabled();setTimeout(()=>{setupMinimizeToggle();setupBadgeToggle();setupSourceTabs();restoreLeaderboardPlacement();refresh();state.timer=setInterval(refresh,POLL_MS);requestAnimationFrame(loop)},500);}

  function loop(){positionBadges();refreshBadges();requestAnimationFrame(loop)}

  window.APCOfficeSync={refresh,getData:()=>state.data,getMappings:()=>state.mapped.slice(),setFloorPlanDisabled};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
