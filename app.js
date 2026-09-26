
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const BUILD='v0.42.5';
const DBKEY='sidelineiq_v0425';
const LEGACY_KEYS=['sidelineiq_v0424','sidelineiq_v0423','sidelineiq_v0422','sidelineiq_v0421','sidelineiq_v0420','sidelineiq_v0415','sidelineiq_v0414','sidelineiq_v0413','sidelineiq_v0412','sidelineiq_v0411','sidelineiq_v0410','sidelineiq_v0406','sidelineiq_v0405','sidelineiq_v0404','sidelineiq_v0403','sidelineiq_v0402','sidelineiq_v0401','sidelineiq_v0301','sidelineiq_v0300','sidelineiq_v0230','sidelineiq_v0222','sidelineiq_v0221','sidelineiq_v0220','sidelineiq_v0210','sidelineiq_v0204','sidelineiq_v0203','sidelineiq_v0202','sidelineiq_v0201','sidelineiq_v0200','sidelineiq_v020','sidelineiq_v01515','sidelineiq_v01514','sidelineiq_v01513','sidelineiq_v01512','sidelineiq_v01511','sidelineiq_v01510','sidelineiq_v0159','sidelineiq_v0158','sidelineiq_v0157','sidelineiq_v0156','sidelineiq_v0155','sidelineiq_v0154','sidelineiq_v0153','sidelineiq_v0152','sidelineiq_v0151','sidelineiq_v015','sidelineiq_v014','sidelineiq_v013_corrected','sidelineiq_v013','sidelineiq_v012'];
const defaultState={teams:[],games:[]};
let selectedPlayId=null;
let mobilePaneOpen='off';

function uid(){return crypto.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now()}
function load(){
  try{
    let raw=localStorage.getItem(DBKEY);
    if(!raw){
      for(const k of LEGACY_KEYS){raw=localStorage.getItem(k);if(raw)break}
      if(raw)localStorage.setItem(DBKEY,raw);
    }
    return {...defaultState,...(raw?JSON.parse(raw):{})};
  }catch(e){console.warn(e);return structuredClone(defaultState)}
}
let state=load();
function save(){localStorage.setItem(DBKEY,JSON.stringify(state))}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function clamp(n){return Math.max(0,Math.min(100,Math.round(Number(n)||0)))}
function other(s){return s==='team'?'opp':'team'}
function teamById(id){return state.teams.find(t=>String(t.id)===String(id))||null}
function gameById(id){return state.games.find(g=>String(g.id)===String(id))||null}
function fmtPos(v){v=clamp(v);if(v===50)return '50';return v<50?`OWN ${v}`:`OPP ${100-v}`}
function ordinal(n){return n===1?'1st':n===2?'2nd':n===3?'3rd':`${n}th`}
function sideYard(v){v=clamp(v);if(v===50)return{side:'50',yard:50};return v<50?{side:'OWN',yard:v}:{side:'OPP',yard:100-v}}
function teamAbbr(name=''){const s=String(name).toUpperCase().replace(/[^A-Z0-9]/g,'');return (s.slice(0,3)||'---').padEnd(3,'-')}
function lighten(hex='#64748B',amount=.82){let h=hex.replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');let r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);r=Math.round(r+(255-r)*amount);g=Math.round(g+(255-g)*amount);b=Math.round(b+(255-b)*amount);return `rgb(${r},${g},${b})`}
function relSpot(screenSpot,dir=1){return dir===1?clamp(screenSpot):100-clamp(screenSpot)}
function screenSpot(relativeSpot,dir=1){return dir===1?clamp(relativeSpot):100-clamp(relativeSpot)}
function fmtDrive(screenValue,dir=1){return fmtPos(relSpot(screenValue,dir))}
function touchdownSpot(dir=1){return dir===1?100:0}
function textColor(hex='#000'){let h=hex.replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return ((r*299+g*587+b*114)/1000)>150?'#071922':'#fff'}
function toast(msg){const d=document.createElement('div');d.className='toast';d.textContent=msg;$('#toastHost')?.appendChild(d);setTimeout(()=>d.remove(),2200)}
function shell(content,topActions=''){ $('#app').innerHTML=`<div class="app-shell"><header class="topbar"><img class="brand-image" src="./assets/sidelineiq-header-logo.png" alt="SidelineIQ — Find Your Edge"><div class="top-actions"><span class="build-badge">${BUILD}</span>${topActions}</div></header>${content}<footer class="app-version-footer">SIDELINEIQ ${BUILD}</footer></div>`}
function route(){
 try{
   const h=location.hash||'#teams';
   if(h.startsWith('#team/'))return renderTeam(h.split('/')[1]);
   if(h.startsWith('#game/'))return renderGame(h.split('/')[1]);
   renderTeams()
 }catch(err){
   console.error('SidelineIQ route error',err);
   const appRoot=document.querySelector('#app');
   if(appRoot)appRoot.innerHTML=`<div class="app-shell"><main class="page"><section class="content-card route-error"><div class="eyebrow">SIDELINEIQ ${BUILD}</div><h2>Unable to open this screen</h2><p>${esc(err?.message||'Unknown application error')}</p><button class="btn btn-primary" onclick="location.hash='#teams'">Back to Teams</button></section></main></div>`
 }
}
window.addEventListener('hashchange',route);
function openGameById(id){
 if(!id)return;
 const g=gameById(id);
 if(!g)return toast('Game could not be found.');
 const next='#game/'+g.id;
 if(location.hash===next)renderGame(g.id);
 else location.hash=next
}

function renderTeams(){
 const cards=state.teams.map(t=>{const count=state.games.filter(g=>g.teamId===t.id).length;return `<div class="team-card" data-open-team="${t.id}"><div class="team-left"><div class="team-swatch" style="background:linear-gradient(135deg,${t.primary} 0 60%,${t.secondary} 60%)"></div><div><div class="team-name">${esc(t.name)}</div><div class="team-meta">Football · ${count} game${count===1?'':'s'}</div></div></div><div class="chev">›</div></div>`}).join('');
 shell(`<main class="page"><div class="home-grid"><aside class="feature-card"><img src="./assets/sidelineiq-home-feature.png" alt="Every play builds a bigger picture — Find Your Edge"></aside><section class="content-card"><div class="section-head"><div><div class="eyebrow">Sideline Command Center</div><h1>My Teams</h1></div><button class="btn btn-primary" id="addTeam">+ Add Team</button></div><div class="team-list">${cards||'<div class="empty">No teams yet. Add your first team to get started.</div>'}</div></section></div></main>`);
 $('#addTeam').onclick=showAddTeam;$$('[data-open-team]').forEach(x=>x.onclick=()=>location.hash='#team/'+x.dataset.openTeam)
}
function removeModal(w=document.querySelector('.modal-wrap')){
 if(w)w.remove();
 if(!document.querySelector('.modal-wrap'))document.body.classList.remove('modal-open')
}
function showModal(html){
 const w=document.createElement('div');w.className='modal-wrap';
 const shellClass=html.includes('analytics-modal')?' analytics-shell':html.includes('player-stat-modal')?' player-stat-shell':html.includes('allplays-modal')?' allplays-shell':html.includes('retro-edit-modal')?' retro-edit-shell':'';
 w.innerHTML=`<div class="modal${shellClass}">${html}</div>`;
 document.body.appendChild(w);document.body.classList.add('modal-open');
 $$('[data-close]',w).forEach(b=>b.onclick=()=>removeModal(w));
 w.onclick=e=>{if(e.target===w)removeModal(w)}
}
function closeModal(){removeModal()}
function showAddTeam(){
 showModal(`<div class="setup-modal setup-team-modal">
   <div class="setup-head">
     <div><div class="eyebrow">TEAM SETUP</div><h2>Add Team</h2><p>Set the identity once. You can change it later.</p></div>
     <button class="setup-close" data-close aria-label="Close">×</button>
   </div>

   <div class="setup-body">
     <div class="setup-field setup-field-wide">
       <label>Team Name</label>
       <input id="teamName" placeholder="Auburn Jr. High Trojans" autocomplete="off">
     </div>

     <div class="setup-color-row">
       <div class="setup-field">
         <label>Primary Color</label>
         <div class="setup-color-control">
           <input id="primary" type="color" value="#5B21B6">
           <div><b>Primary</b><span>Main team color</span></div>
         </div>
       </div>
       <div class="setup-field">
         <label>Secondary Color</label>
         <div class="setup-color-control">
           <input id="secondary" type="color" value="#F4C43D">
           <div><b>Secondary</b><span>Accent color</span></div>
         </div>
       </div>
     </div>

     <div class="setup-field setup-field-inline">
       <div><label>Sport</label><span class="setup-help">SidelineIQ game tracking</span></div>
       <div class="setup-value-chip">Football</div>
     </div>
   </div>

   <div class="setup-actions">
     <button class="btn btn-light" data-close>Cancel</button>
     <button class="btn btn-primary" id="saveTeam">Save Team</button>
   </div>
 </div>`);
 $('#saveTeam').onclick=()=>{const name=$('#teamName').value.trim();if(!name)return alert('Enter a team name.');state.teams.push({id:uid(),name,primary:$('#primary').value,secondary:$('#secondary').value});save();closeModal();renderTeams()}
}

const OFFENSE_POSITIONS=['QB','RB','FB','WR','TE','C','G','T','OL'];
const DEFENSE_POSITIONS=['DE','DT','DL','LB','OLB','ILB','CB','S','DB'];
const SPECIAL_POSITIONS=['K','P','LS'];
function normalizeRoster(t){
 t.roster??=[];
 t.roster.forEach(p=>{
   p.id??=uid();
   p.number=(p.number??'').toString();
   p.first??='';p.last??='';p.grade??='';p.positions??=[];
   p.active=p.active!==false
 });
 return t.roster
}
function rosterPlayerName(p){
 const full=[p.first,p.last].filter(Boolean).join(' ').trim();
 return full||`Player #${p.number||'—'}`
}
function rosterShortName(p){
 const fi=(p.first||'').trim().charAt(0).toUpperCase();
 const li=(p.last||'').trim().charAt(0).toUpperCase();
 return `${fi}${li}`.trim()
}
function rosterPlayerByNumber(t,n){
 normalizeRoster(t);
 return t.roster.find(p=>String(p.number)===String(n))
}
function positionGroup(pos){
 if(OFFENSE_POSITIONS.includes(pos))return 'Offense';
 if(DEFENSE_POSITIONS.includes(pos))return 'Defense';
 return 'Special Teams'
}
function positionButtons(selected=[]){
 const section=(title,arr)=>`<div class="roster-pos-group"><span>${title}</span><div class="roster-pos-options">${arr.map(pos=>`<button type="button" class="roster-pos ${selected.includes(pos)?'active':''}" data-pos="${pos}">${pos}</button>`).join('')}</div></div>`;
 return section('Offense',OFFENSE_POSITIONS)+section('Defense',DEFENSE_POSITIONS)+section('Special Teams',SPECIAL_POSITIONS)
}
function rosterSummary(t){
 const r=normalizeRoster(t),active=r.filter(p=>p.active),off=active.filter(p=>p.positions.some(x=>OFFENSE_POSITIONS.includes(x))),def=active.filter(p=>p.positions.some(x=>DEFENSE_POSITIONS.includes(x)));
 return `<div class="roster-summary">
   <div><b>${r.length}</b><span>Players</span></div>
   <div><b>${active.length}</b><span>Active</span></div>
   <div><b>${off.length}</b><span>Offense</span></div>
   <div><b>${def.length}</b><span>Defense</span></div>
 </div>`
}
function rosterTable(t){
 const r=normalizeRoster(t).slice().sort((a,b)=>(Number(a.number)||999)-(Number(b.number)||999)||rosterPlayerName(a).localeCompare(rosterPlayerName(b)));
 if(!r.length)return `<div class="roster-empty"><div class="roster-empty-icon">#</div><h3>No players yet</h3><p>Add the roster once, then SidelineIQ can use it throughout games and statistics.</p><button class="btn btn-primary" id="emptyAddPlayer">+ Add Player</button></div>`;
 return `<div class="roster-table-wrap"><table class="roster-table"><thead><tr><th>#</th><th>Player</th><th>Grade</th><th>Positions</th><th>Status</th><th></th></tr></thead><tbody>${r.map(p=>`<tr>
   <td><span class="jersey-badge">${esc(p.number||'—')}</span></td>
   <td><button class="roster-player-name" data-roster-stats="${p.id}">${esc(rosterPlayerName(p))}</button></td>
   <td>${esc(p.grade||'—')}</td>
   <td><div class="position-chip-row">${p.positions.length?p.positions.map(x=>`<span class="position-chip">${esc(x)}</span>`).join(''):'<span class="muted">—</span>'}</div></td>
   <td><span class="status-pill ${p.active?'active':'inactive'}">${p.active?'Active':'Inactive'}</span></td>
   <td><button class="roster-more" data-edit-player="${p.id}">Edit</button></td>
 </tr>`).join('')}</tbody></table></div>`
}
function renderRosterPanel(t){
 const host=$('#teamPanel');if(!host)return;
 host.innerHTML=`<section class="content-card roster-card">
   <div class="roster-toolbar"><div><div class="eyebrow">TEAM ROSTER</div><h2>${esc(t.name)}</h2><p>Players saved here are available as quick selections during games.</p></div><button class="btn btn-primary" id="addPlayer">+ Add Player</button></div>
   ${rosterSummary(t)}
   ${rosterTable(t)}
 </section>`;
 if($('#addPlayer'))$('#addPlayer').onclick=()=>showRosterPlayer(t);
 if($('#emptyAddPlayer'))$('#emptyAddPlayer').onclick=()=>showRosterPlayer(t);
 $$('[data-edit-player]').forEach(b=>b.onclick=()=>showRosterPlayer(t,b.dataset.editPlayer));
 $$('[data-roster-stats]').forEach(b=>b.onclick=()=>showSeasonPlayerStats(t,b.dataset.rosterStats))
}
function showRosterPlayer(t,id=null){
 normalizeRoster(t);
 const existing=id?t.roster.find(p=>p.id===id):null;
 const p=existing?structuredClone(existing):{id:uid(),number:'',first:'',last:'',grade:'',positions:[],active:true};
 showModal(`<div class="roster-player-modal">
   <div class="setup-head"><div><div class="eyebrow">${existing?'EDIT PLAYER':'ROSTER'}</div><h2>${existing?'Edit Player':'Add Player'}</h2><p>${esc(t.name)}</p></div><button class="setup-close" data-close>×</button></div>
   <div class="roster-player-body">
     <div class="roster-player-grid">
       <div class="setup-field jersey-field"><label>Jersey #</label><input id="rpNumber" inputmode="numeric" maxlength="3" value="${esc(p.number)}" placeholder="12"></div>
       <div class="setup-field"><label>First Name</label><input id="rpFirst" value="${esc(p.first)}" placeholder="First"></div>
       <div class="setup-field"><label>Last Name</label><input id="rpLast" value="${esc(p.last)}" placeholder="Last"></div>
       <div class="setup-field"><label>Grade</label><select id="rpGrade"><option value="">—</option>${['5','6','7','8','9','10','11','12'].map(x=>`<option value="${x}" ${p.grade===x?'selected':''}>${x}${x==='5'?'th':x==='6'?'th':x==='7'?'th':x==='8'?'th':x==='9'?'th':x==='10'?'th':x==='11'?'th':'th'} Grade</option>`).join('')}</select></div>
       <div class="setup-field roster-status-field"><label>Status</label><div class="seg" id="rpStatus"><button class="${p.active?'active':''}" data-active="true">Active</button><button class="${!p.active?'active':''}" data-active="false">Inactive</button></div></div>
     </div>
     <div class="roster-position-picker"><div class="section-label">Positions</div>${positionButtons(p.positions)}</div>
   </div>
   <div class="setup-actions roster-player-actions">
     ${existing?'<button class="btn btn-danger-outline" id="deleteRosterPlayer">Delete</button>':''}
     <span class="action-spacer"></span>
     <button class="btn btn-light" data-close>Cancel</button>
     <button class="btn btn-primary" id="saveRosterPlayer">${existing?'Save Changes':'Add Player'}</button>
   </div>
 </div>`);
 let active=p.active;
 $('#rpStatus [data-active="true"]').onclick=()=>{active=true;$$('#rpStatus button').forEach(x=>x.classList.toggle('active',x.dataset.active==='true'))};
 $('#rpStatus [data-active="false"]').onclick=()=>{active=false;$$('#rpStatus button').forEach(x=>x.classList.toggle('active',x.dataset.active==='false'))};
 $$('.roster-pos').forEach(b=>b.onclick=()=>b.classList.toggle('active'));
 $('#saveRosterPlayer').onclick=()=>{
   const number=$('#rpNumber').value.trim(),first=$('#rpFirst').value.trim(),last=$('#rpLast').value.trim();
   if(!number)return toast('Enter a jersey number.');
   const duplicate=t.roster.find(x=>x.id!==p.id&&String(x.number)===number);
   if(duplicate)return toast(`#${number} is already on this roster.`);
   const positions=$$('.roster-pos.active').map(x=>x.dataset.pos);
   Object.assign(p,{number,first,last,grade:$('#rpGrade').value,positions,active});
   if(existing)Object.assign(existing,p);else t.roster.push(p);
   save();closeModal();renderRosterPanel(t)
 };
 if($('#deleteRosterPlayer'))$('#deleteRosterPlayer').onclick=()=>{
   if(!confirm(`Remove #${p.number} ${rosterPlayerName(p)} from the roster?`))return;
   t.roster=t.roster.filter(x=>x.id!==p.id);save();closeModal();renderRosterPanel(t)
 }
}


function emptySeasonPlayer(number,player=null){
 return {
   number:String(number),
   player,
   games:0,
   pass:{att:0,comp:0,yds:0,td:0,int:0,sacks:0},
   rush:{car:0,yds:0,td:0},
   rec:{tar:0,rec:0,yds:0,td:0},
   def:{tackle:0,tfl:0,tflYds:0,sack:0,int:0,intYds:0,intTD:0,pbu:0,ff:0,fr:0,pressure:0,hurry:0,missed:0},
   fum:0
 }
}
function mergePlayerStats(dest,src){
 dest.pass.att+=src.pass.att;dest.pass.comp+=src.pass.comp;dest.pass.yds+=src.pass.yds;dest.pass.td+=src.pass.td;dest.pass.int+=src.pass.int;dest.pass.sacks+=src.pass.sacks;
 dest.rush.car+=src.rush.car;dest.rush.yds+=src.rush.yds;dest.rush.td+=src.rush.td;
 dest.rec.tar+=src.rec.tar;dest.rec.rec+=src.rec.rec;dest.rec.yds+=src.rec.yds;dest.rec.td+=src.rec.td;
 dest.def.tackle+=src.def.tackle;dest.def.tfl+=src.def.tfl||0;dest.def.tflYds+=src.def.tflYds||0;dest.def.sack+=src.def.sack;dest.def.int+=src.def.int;dest.def.intYds+=src.def.intYds;dest.def.intTD+=src.def.intTD;dest.def.pbu+=src.def.pbu||0;dest.def.ff+=src.def.ff||0;dest.def.fr+=src.def.fr||0;dest.def.pressure+=src.def.pressure;dest.def.hurry+=src.def.hurry;dest.def.missed+=src.def.missed;
 dest.fum+=src.fum
}
function computeSeasonAnalytics(t){
 normalizeRoster(t);
 const games=state.games.filter(g=>g.teamId===t.id);
 const season={
   games:games.length,completed:games.filter(g=>g.gameOver).length,
   pointsFor:0,pointsAgainst:0,wins:0,losses:0,ties:0,
   totalYards:0,rushYards:0,passYards:0,rushAtt:0,passAtt:0,completions:0,plays:0,
   firstDowns:0,turnovers:0,sacksAllowed:0,thirdMade:0,thirdAtt:0,fourthMade:0,fourthAtt:0,
   players:{}
 };
 t.roster.forEach(rp=>{
   const sp=emptySeasonPlayer(rp.number,rp);
   season.players[String(rp.number)]=sp
 });
 for(const g of games){
   normalizeGame(g);
   const s=computeTeamStats(g,'team');
   season.pointsFor+=g.teamScore||0;season.pointsAgainst+=g.oppScore||0;
   if(g.gameOver){
     if(g.teamScore>g.oppScore)season.wins++;
     else if(g.teamScore<g.oppScore)season.losses++;
     else season.ties++
   }
   ['totalYards','rushYards','passYards','rushAtt','passAtt','completions','plays','firstDowns','turnovers','sacksAllowed','thirdMade','thirdAtt','fourthMade','fourthAtt'].forEach(k=>season[k]+=s[k]||0);
   Object.values(s.players).forEach(ps=>{
     const key=String(ps.number);
     if(!season.players[key])season.players[key]=emptySeasonPlayer(key,rosterPlayerByNumber(t,key)||null);
     mergePlayerStats(season.players[key],ps);
     const hasGameStat=ps.pass.att||ps.pass.comp||ps.rush.car||ps.rec.tar||ps.def.tackle||ps.def.tfl||ps.def.sack||ps.def.int||ps.def.pbu||ps.def.ff||ps.def.fr||ps.def.pressure||ps.def.hurry;
     if(hasGameStat)season.players[key].games++
   })
 }
 season.yardsPerPlay=season.plays?season.totalYards/season.plays:0;
 season.rushAvg=season.rushAtt?season.rushYards/season.rushAtt:0;
 season.passPct=season.passAtt?season.completions/season.passAtt*100:0;
 return season
}
function seasonPlayerName(t,sp){
 const rp=sp.player||rosterPlayerByNumber(t,sp.number);
 return rp?rosterPlayerName(rp):`#${sp.number}`
}
function seasonPlayerRows(t,season){
 const players=Object.values(season.players).sort((a,b)=>(Number(a.number)||999)-(Number(b.number)||999));
 if(!players.length)return `<div class="season-empty">Add players to the roster to begin building player analytics.</div>`;
 return `<div class="season-player-table-wrap"><table class="season-player-table"><thead><tr><th>#</th><th>Player</th><th>Pos</th><th>GP</th><th>Rush</th><th>Rec</th><th>Pass</th><th>Tkl</th><th>Sk</th><th>INT</th></tr></thead><tbody>${players.map(sp=>{
   const rp=sp.player||rosterPlayerByNumber(t,sp.number);
   const pos=rp?.positions?.join(' · ')||'—';
   return `<tr data-season-player="${rp?.id||sp.number}">
     <td><span class="jersey-badge">${esc(sp.number)}</span></td>
     <td><button class="season-player-link" data-season-player="${rp?.id||sp.number}">${esc(seasonPlayerName(t,sp))}</button></td>
     <td>${esc(pos)}</td><td>${sp.games}</td>
     <td>${sp.rush.yds} yd</td><td>${sp.rec.yds} yd</td><td>${sp.pass.yds} yd</td>
     <td>${sp.def.tackle.toFixed(1)}</td><td>${sp.def.sack.toFixed(1)}</td><td>${sp.def.int}</td>
   </tr>`
 }).join('')}</tbody></table></div>`
}
function renderOverallAnalytics(t){
 const host=$('#teamPanel');if(!host)return;
 const s=computeSeasonAnalytics(t);
 const record=s.completed?`${s.wins}-${s.losses}${s.ties?'-'+s.ties:''}`:'—';
 host.innerHTML=`<section class="content-card season-analytics-card">
   <div class="season-analytics-head">
     <div><div class="eyebrow">OVERALL ANALYTICS</div><h2>${esc(t.name)}</h2><p>Team and player performance across ${s.games} game${s.games===1?'':'s'}.</p></div>
     <div class="season-record"><span>Record</span><b>${record}</b></div>
   </div>

   <div class="season-kpis">
     <div><span>Games</span><b>${s.games}</b><small>${s.completed} final</small></div>
     <div><span>Points For</span><b>${s.pointsFor}</b><small>${s.games?(s.pointsFor/s.games).toFixed(1):'0.0'} / game</small></div>
     <div><span>Points Against</span><b>${s.pointsAgainst}</b><small>${s.games?(s.pointsAgainst/s.games).toFixed(1):'0.0'} / game</small></div>
     <div class="primary"><span>Total Offense</span><b>${s.totalYards}</b><small>${s.yardsPerPlay.toFixed(1)} / play</small></div>
   </div>

   <div class="season-split-grid">
     <div class="season-split-card"><div><span>Rushing</span><b>${s.rushYards}</b><small>${s.rushAtt} attempts · ${s.rushAvg.toFixed(1)} avg</small></div></div>
     <div class="season-split-card"><div><span>Passing</span><b>${s.passYards}</b><small>${s.completions}/${s.passAtt} · ${s.passPct.toFixed(0)}%</small></div></div>
     <div class="season-split-card"><div><span>First Downs</span><b>${s.firstDowns}</b><small>${s.games?(s.firstDowns/s.games).toFixed(1):'0.0'} / game</small></div></div>
     <div class="season-split-card"><div><span>Turnovers</span><b>${s.turnovers}</b><small>${s.games?(s.turnovers/s.games).toFixed(1):'0.0'} / game</small></div></div>
   </div>

   <div class="season-rate-row">
     <div><span>3rd Down</span><b>${s.thirdMade}/${s.thirdAtt}</b><small>${pct(s.thirdMade,s.thirdAtt)}%</small></div>
     <div><span>4th Down</span><b>${s.fourthMade}/${s.fourthAtt}</b><small>${pct(s.fourthMade,s.fourthAtt)}%</small></div>
     <div><span>Sacks Allowed</span><b>${s.sacksAllowed}</b></div>
     <div><span>Offensive Plays</span><b>${s.plays}</b></div>
   </div>

   <div class="season-player-section">
     <div class="season-section-head"><div><h3>Players</h3><p>Rostered players appear immediately, even before recording a statistic.</p></div></div>
     ${seasonPlayerRows(t,s)}
   </div>
 </section>`;
 $$('[data-season-player]').forEach(b=>b.onclick=()=>{
   const key=b.dataset.seasonPlayer;
   const rp=t.roster.find(x=>x.id===key)||rosterPlayerByNumber(t,key);
   if(rp)showSeasonPlayerStats(t,rp.id)
 })
}
function showSeasonPlayerStats(t,playerId){
 normalizeRoster(t);
 const rp=t.roster.find(p=>p.id===playerId)||rosterPlayerByNumber(t,playerId);
 if(!rp)return toast('Player not found.');
 const s=computeSeasonAnalytics(t);
 const p=s.players[String(rp.number)]||emptySeasonPlayer(rp.number,rp);
 showModal(`<div class="season-player-modal">
   <div class="player-stat-hero" style="--team-color:${t.primary}">
     <div class="player-number">#${esc(rp.number)}</div>
     <div><div class="eyebrow">${esc(t.name)}</div><h2>${esc(rosterPlayerName(rp))}</h2><p>${esc(rp.positions.join(' · ')||'No positions assigned')} · ${p.games} game${p.games===1?'':'s'} with stats</p></div>
   </div>

   <div class="player-stat-grid">
     <div class="player-stat-card"><h4>Rushing</h4><div class="player-stat-numbers">
       <div><b>${p.rush.car}</b><span>Carries</span></div><div><b>${p.rush.yds}</b><span>Yards</span></div><div><b>${fmtAvg(p.rush.yds,p.rush.car)}</b><span>Avg</span></div><div><b>${p.rush.td}</b><span>TD</span></div><div><b>${p.fum}</b><span>Fumbles</span></div>
     </div></div>
     <div class="player-stat-card"><h4>Receiving</h4><div class="player-stat-numbers">
       <div><b>${p.rec.tar}</b><span>Targets</span></div><div><b>${p.rec.rec}</b><span>Rec</span></div><div><b>${p.rec.yds}</b><span>Yards</span></div><div><b>${fmtAvg(p.rec.yds,p.rec.rec)}</b><span>Avg</span></div><div><b>${p.rec.td}</b><span>TD</span></div>
     </div></div>
     <div class="player-stat-card"><h4>Passing</h4><div class="player-stat-numbers">
       <div><b>${p.pass.comp}/${p.pass.att}</b><span>Comp/Att</span></div><div><b>${pct(p.pass.comp,p.pass.att)}%</b><span>Comp %</span></div><div><b>${p.pass.yds}</b><span>Yards</span></div><div><b>${p.pass.td}</b><span>TD</span></div><div><b>${p.pass.int}</b><span>INT</span></div><div><b>${p.pass.sacks}</b><span>Sacked</span></div>
     </div></div>
     <div class="player-stat-card"><h4>Defense</h4><div class="player-stat-numbers">
       <div><b>${p.def.tackle.toFixed(1)}</b><span>Tackles</span></div><div><b>${p.def.tfl.toFixed(1)}</b><span>TFL</span></div><div><b>${p.def.tflYds}</b><span>TFL Yards</span></div><div><b>${p.def.sack.toFixed(1)}</b><span>Sacks</span></div><div><b>${p.def.int}</b><span>INT</span></div><div><b>${p.def.intYds}</b><span>INT Yards</span></div><div><b>${p.def.intTD}</b><span>INT TD</span></div><div><b>${p.def.pbu}</b><span>PBU</span></div><div><b>${p.def.ff}</b><span>Forced Fumble</span></div><div><b>${p.def.fr}</b><span>Fumble Recovery</span></div><div><b>${p.def.pressure}</b><span>Pressure</span></div><div><b>${p.def.hurry}</b><span>Hurry</span></div><div><b>${p.def.missed}</b><span>Missed</span></div>
     </div></div>
   </div>
   <div class="setup-actions"><button class="btn btn-light" data-close>Close</button><button class="btn btn-primary" id="editFromStats">Edit Player</button></div>
 </div>`);
 $('#editFromStats').onclick=()=>{closeModal();showRosterPlayer(t,rp.id)}
}

function renderTeam(id){
 const t=state.teams.find(x=>x.id===id);if(!t)return location.hash='#teams';
 normalizeRoster(t);
 const games=state.games.filter(g=>g.teamId===id).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 const rows=games.map(g=>`<tr data-open-game="${g.id}" tabindex="0" role="button" aria-label="Open game versus ${esc(g.opponent)}"><td>${esc(g.date||'')}</td><td>${esc(g.opponent)}</td><td>${esc(g.location||'Home')}</td><td>${g.gameOver?`${g.teamScore>=g.oppScore?'W':'L'} ${g.teamScore}-${g.oppScore}`:`${g.teamScore||0}-${g.oppScore||0}`}</td><td><button class="game-open-btn" data-open-game-button="${g.id}">Open ›</button></td></tr>`).join('');
 shell(`<main class="page"><button class="btn" onclick="location.hash='#teams'">‹ Back to Teams</button>
 <section class="content-card team-banner" style="border-left:6px solid ${t.primary}">
   <div class="team-banner-left"><div class="team-swatch" style="background:linear-gradient(135deg,${t.primary} 0 60%,${t.secondary} 60%)"></div><div><div class="team-title">${esc(t.name)}</div><div class="team-meta">Football · ${t.roster.length} rostered player${t.roster.length===1?'':'s'}</div></div></div>
   <button class="btn" id="editTeam">Edit Team</button>
 </section>
 <div class="tabs team-tabs">
   <button class="tab active" data-team-tab="games">Games</button>
   <button class="tab" data-team-tab="roster">Roster <span class="tab-count">${t.roster.length}</span></button>
   <button class="tab" data-team-tab="analytics">Analytics</button>
   <button class="btn btn-primary" id="teamPrimaryAction">+ Add Game</button>
 </div>
 <div id="teamPanel"><section class="content-card"><table class="games-table"><thead><tr><th>Date</th><th>Opponent</th><th>Location</th><th>Score</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="empty">No games yet.</td></tr>'}</tbody></table></section></div>
 </main>`);
 const bindGameListOpeners=()=>{
   const panel=$('#teamPanel');if(!panel)return;
   panel.onclick=e=>{
     const btn=e.target.closest?.('[data-open-game-button]');
     const row=e.target.closest?.('[data-open-game]');
     const id=btn?.dataset.openGameButton||row?.dataset.openGame;
     if(id){e.preventDefault();e.stopPropagation();openGameById(id)}
   };
   panel.onkeydown=e=>{
     if(e.key!=='Enter'&&e.key!==' ')return;
     const row=e.target.closest?.('[data-open-game]');
     if(row){e.preventDefault();openGameById(row.dataset.openGame)}
   }
 };
 const renderGames=()=>{
   $('#teamPanel').innerHTML=`<section class="content-card"><table class="games-table"><thead><tr><th>Date</th><th>Opponent</th><th>Location</th><th>Score</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="empty">No games yet.</td></tr>'}</tbody></table></section>`;
   $('#teamPrimaryAction').textContent='+ Add Game';
   $('#teamPrimaryAction').style.display='';
   $('#teamPrimaryAction').onclick=()=>showAddGame(t);
   bindGameListOpeners()
 };
 const selectTab=name=>{
   $$('[data-team-tab]').forEach(b=>b.classList.toggle('active',b.dataset.teamTab===name));
   if(name==='games')renderGames();
   else if(name==='roster'){
     renderRosterPanel(t);
     $('#teamPrimaryAction').textContent='+ Add Player';
     $('#teamPrimaryAction').style.display='';
     $('#teamPrimaryAction').onclick=()=>showRosterPlayer(t)
   }else{
     renderOverallAnalytics(t);
     $('#teamPrimaryAction').style.display='none'
   }
 };
 $$('[data-team-tab]').forEach(b=>b.onclick=()=>selectTab(b.dataset.teamTab));
 $('#teamPrimaryAction').onclick=()=>showAddGame(t);
 $('#editTeam').onclick=()=>showEditTeam(t);
 bindGameListOpeners()
}
function showEditTeam(t){
 showModal(`<div class="setup-modal setup-team-modal"><div class="setup-head"><div><div class="eyebrow">TEAM SETUP</div><h2>Edit Team</h2><p>Update team identity.</p></div><button class="setup-close" data-close>×</button></div><div class="setup-body"><div class="setup-field"><label>Team Name</label><input id="teamName" value="${esc(t.name)}"></div><div class="setup-color-row"><div class="setup-field"><label>Primary Color</label><div class="setup-color-control"><input id="primary" type="color" value="${t.primary}"><div><b>Primary</b><span>Main color</span></div></div></div><div class="setup-field"><label>Secondary Color</label><div class="setup-color-control"><input id="secondary" type="color" value="${t.secondary}"><div><b>Secondary</b><span>Accent color</span></div></div></div></div></div><div class="setup-actions"><button class="btn btn-light" data-close>Cancel</button><button class="btn btn-primary" id="saveTeam">Save Changes</button></div></div>`);
 $('#saveTeam').onclick=()=>{t.name=$('#teamName').value.trim()||t.name;t.primary=$('#primary').value;t.secondary=$('#secondary').value;save();closeModal();renderTeam(t.id)}
}
function showAddGame(t){
 showModal(`<div class="setup-modal setup-game-modal">
   <div class="setup-head">
     <div><div class="eyebrow">GAME SETUP</div><h2>Add Game</h2><p>${esc(t.name)}</p></div>
     <button class="setup-close" data-close aria-label="Close">×</button>
   </div>

   <div class="setup-body">
     <div class="setup-game-grid">
       <div class="setup-field setup-span-2">
         <label>Opponent</label>
         <input id="opp" placeholder="Rochester" autocomplete="off">
       </div>

       <div class="setup-field">
         <label>Opponent Color</label>
         <div class="setup-color-control compact">
           <input id="oppColor" type="color" value="#B8860B">
           <div><b>Color</b><span>Opponent accent</span></div>
         </div>
       </div>

       <div class="setup-field">
         <label>Date</label>
         <input id="gdate" type="date" value="${new Date().toISOString().slice(0,10)}">
       </div>

       <div class="setup-field">
         <label>Location</label>
         <select id="loc"><option>Home</option><option>Away</option><option>Neutral</option></select>
       </div>

       <div class="setup-field">
         <label>Game Format</label>
         <select id="format"><option value="quarters">4 Quarters</option><option value="halves">2 Halves</option></select>
       </div>

       <div class="setup-field setup-span-2">
         <label>Opening Kick</label>
         <select id="kick"><option value="team">${esc(t.name)} kicks</option><option value="opp">Opponent kicks</option></select>
       </div>

       <div class="setup-field">
         <label>Kickoff Yard</label>
         <input id="kickYard" type="number" min="20" max="50" value="40">
       </div>
     </div>

     <div class="setup-callout">
       <span>🏈</span>
       <div><b>Game starts with the opening kickoff.</b><small>The second-half kickoff is handled automatically.</small></div>
     </div>
   </div>

   <div class="setup-actions">
     <button class="btn btn-light" data-close>Cancel</button>
     <button class="btn btn-primary" id="saveGame">Create Game</button>
   </div>
 </div>`);
 $('#saveGame').onclick=()=>{const opponent=$('#opp').value.trim();if(!opponent)return alert('Enter opponent.');const openingKick=$('#kick').value,kickoffYard=Math.max(20,Math.min(50,+$('#kickYard').value||40)),receiving=other(openingKick);const g={id:uid(),teamId:t.id,opponent,date:$('#gdate').value,location:$('#loc').value,oppColor:$('#oppColor').value,format:$('#format').value,openingKick,kickoffYard,teamScore:0,oppScore:0,period:1,down:1,toGo:10,los:20,poss:receiving,plays:[],awaitingTry:false,driveDir:1,kickoffPending:true,kickoff:{phase:'kick',kickingTeam:openingKick,receivingTeam:receiving,startYard:kickoffYard,kickDir:1,startSpot:kickoffYard,landing:null,returnEnd:null,kicker:'',returner:'',tacklers:[],touchback:false}};state.games.push(g);save();closeModal();location.hash='#game/'+g.id}
}

let currentPlay=null;
function normalizeGame(g){
 g.teamScore??=0;g.oppScore??=0;g.period??=1;g.overtime??=0;g.gameOver??=false;g.down??=1;g.toGo??=10;g.los??=20;g.poss??='team';g.plays??=[];g.kickoffYard??=40;g.awaitingTry??=false;g.tryType??=null;g.puntPending??=false;g.punt??=null;g.pendingPenalties??=[];
 if(g.driveDir==null){
   const lastKick=[...g.plays].reverse().find(p=>p.kind==='Kickoff');
   if(lastKick){
     const kickingSide=lastKick.team||lastKick.before?.poss||g.openingKick||'team';
     const receivingSide=other(kickingSide);
     g.driveDir=(g.poss===receivingSide)?-1:1;
   }else{
     g.driveDir=1;
   }
 }
 if(g.kickoffPending&&!g.kickoff){const receiving=other(g.openingKick||'team');g.kickoff={phase:'kick',kickingTeam:g.openingKick||'team',receivingTeam:receiving,startYard:g.kickoffYard,kickDir:1,startSpot:g.kickoffYard,landing:null,returnEnd:null,kicker:'',returner:'',tacklers:[],touchback:false}}
}
function teamSide(g,t,side){return side==='team'?{name:t.name,color:t.primary,secondary:t.secondary}:{name:g.opponent,color:g.oppColor||'#B8860B',secondary:'#111'}}
function snapshot(g){return {teamScore:g.teamScore,oppScore:g.oppScore,period:g.period,overtime:g.overtime||0,gameOver:!!g.gameOver,down:g.down,toGo:g.toGo,los:g.los,poss:g.poss,driveDir:g.driveDir,awaitingTry:g.awaitingTry,tryType:g.tryType||null,kickoffPending:!!g.kickoffPending,kickoff:g.kickoff?structuredClone(g.kickoff):null,puntPending:!!g.puntPending,punt:g.punt?structuredClone(g.punt):null}}
function defaultPlay(g){return {type:'Run',end:g.los,player:'',qb:'',receiver:'',passResult:'Complete',defenders:[],penalties:[],score:null,tryResult:null,fumble:false,fumbleRecovery:null,fumbleDetail:null,badSnap:{active:false,center:'',notCaught:false,recoveredBy:null},interception:null,turnover:false,special:null,kicker:'',returner:'',kickGood:null,note:''}}
function syncTurnoverState(){
 const p=currentPlay;
 p.turnover=
   p.passResult==='Interception'||
   (p.fumble&&p.fumbleRecovery==='Defense')||
   (p.badSnap?.active&&p.badSnap.notCaught&&p.badSnap.recoveredBy==='Defense');
}
function chooseRecovery(title,onChoose){
 showModal(`<h2>${esc(title)}</h2><div class="notice">Who recovered the loose ball?</div><div class="modal-actions recovery-actions"><button class="btn btn-light" id="recoverOffense">Offense</button><button class="btn btn-primary" id="recoverDefense">Defense</button></div>`);
 $('#recoverOffense').onclick=()=>{closeModal();onChoose('Offense')};
 $('#recoverDefense').onclick=()=>{closeModal();onChoose('Defense')};
}

function showFumbleDetails(g,onDone){
 const d=currentPlay.fumbleDetail||{forcedBy:'',recoveryTeam:'Offense',recoverer:'',recoverySpot:currentPlay.end??g.los,returnEnd:null,returnTD:false};
 showModal(`<div class="workflow-modal"><div class="setup-head"><div><div class="eyebrow">LOOSE BALL</div><h2>Fumble Details</h2></div><button class="setup-close" data-close>×</button></div>
 <div class="setup-body"><div class="setup-game-grid">
 <div class="setup-field"><label>Forced by #</label><input id="fumForced" inputmode="numeric" value="${esc(d.forcedBy||'')}"></div>
 <div class="setup-field"><label>Recovered by</label><select id="fumTeam"><option ${d.recoveryTeam==='Offense'?'selected':''}>Offense</option><option ${d.recoveryTeam==='Defense'?'selected':''}>Defense</option></select></div>
 <div class="setup-field"><label>Recoverer #</label><input id="fumRecoverer" inputmode="numeric" value="${esc(d.recoverer||'')}"></div>
 <div class="setup-field"><label>Recovery spot</label><input id="fumSpot" type="number" min="0" max="100" value="${clamp(d.recoverySpot)}"></div>
 <div class="setup-field"><label>Return end (optional)</label><input id="fumReturn" type="number" min="0" max="100" value="${d.returnEnd==null?'':clamp(d.returnEnd)}"></div>
 <div class="setup-field"><label><input type="checkbox" id="fumTD" ${d.returnTD?'checked':''}> Fumble return TD</label></div>
 </div></div><div class="setup-actions"><button class="btn btn-light" data-close>Cancel</button><button class="btn btn-primary" id="saveFumbleDetail">Apply Fumble</button></div></div>`);
 $('#saveFumbleDetail').onclick=()=>{const ret=$('#fumReturn').value;const x={forcedBy:$('#fumForced').value.trim(),recoveryTeam:$('#fumTeam').value,recoverer:$('#fumRecoverer').value.trim(),recoverySpot:clamp($('#fumSpot').value),returnEnd:ret===''?null:clamp(ret),returnTD:$('#fumTD').checked};closeModal();onDone(x)}
}
function showGameControl(g,t){
 const s=sideYard(relSpot(g.los,g.driveDir||1));
 showModal(`<div class="control-modal"><div class="setup-head"><div><div class="eyebrow">GAME CONTROL</div><h2>Correct Game State</h2><p>Use this when the automatic workflow does not match the field.</p></div><button class="setup-close" data-close>×</button></div>
 <div class="setup-body"><div class="setup-game-grid">
 <div class="setup-field"><label>Possession</label><select id="ctlPoss"><option value="team" ${g.poss==='team'?'selected':''}>${esc(t.name)}</option><option value="opp" ${g.poss==='opp'?'selected':''}>${esc(g.opponent)}</option></select></div>
 <div class="setup-field"><label>Direction</label><select id="ctlDir"><option value="1" ${g.driveDir===1?'selected':''}>Toward right end zone</option><option value="-1" ${g.driveDir===-1?'selected':''}>Toward left end zone</option></select></div>
 <div class="setup-field"><label>Ball side</label><select id="ctlSide"><option ${s.side==='OWN'?'selected':''}>OWN</option><option ${s.side==='OPP'?'selected':''}>OPP</option><option ${s.side==='50'?'selected':''}>50</option></select></div>
 <div class="setup-field"><label>Yard line</label><input id="ctlYard" type="number" min="0" max="50" value="${s.yard}"></div>
 <div class="setup-field"><label>Down</label><select id="ctlDown">${[1,2,3,4].map(n=>`<option ${g.down===n?'selected':''}>${n}</option>`).join('')}</select></div>
 <div class="setup-field"><label>Distance</label><input id="ctlDist" type="number" min="1" max="99" value="${g.toGo}"></div>
 <div class="setup-field"><label>Period</label><input id="ctlPeriod" type="number" min="1" max="${g.format==='halves'?2:4}" value="${g.period}"></div>
 <div class="setup-field"><label>Overtime</label><input id="ctlOT" type="number" min="0" max="9" value="${g.overtime||0}"></div>
 <div class="setup-field"><label>${esc(t.name)} score</label><input id="ctlTeamScore" type="number" min="0" value="${g.teamScore}"></div>
 <div class="setup-field"><label>${esc(g.opponent)} score</label><input id="ctlOppScore" type="number" min="0" value="${g.oppScore}"></div>
 </div></div><div class="setup-actions"><button class="btn btn-light" data-close>Cancel</button><button class="btn btn-primary" id="applyControl">Apply State</button></div></div>`);
 $('#applyControl').onclick=()=>{g.poss=$('#ctlPoss').value;g.driveDir=Number($('#ctlDir').value);const side=$('#ctlSide').value,y=Number($('#ctlYard').value)||0;const rel=side==='50'?50:side==='OWN'?y:100-y;g.los=screenSpot(rel,g.driveDir);g.down=Number($('#ctlDown').value);g.toGo=Math.max(1,Number($('#ctlDist').value)||10);g.period=Number($('#ctlPeriod').value);g.overtime=Math.max(0,Number($('#ctlOT').value)||0);g.teamScore=Math.max(0,Number($('#ctlTeamScore').value)||0);g.oppScore=Math.max(0,Number($('#ctlOppScore').value)||0);g.kickoffPending=false;g.kickoff=null;g.puntPending=false;g.punt=null;save();closeModal();toast('Game state corrected');renderGame(g.id)}
}
function driveResult(p){
 const d=(p.desc||'').toUpperCase();
 if(d.includes('TOUCHDOWN')||d.includes('RETURN TD'))return 'TD';
 if(p.kind==='Field Goal'&&d.includes('GOOD'))return 'FG';
 if(p.kind==='Punt')return 'Punt';
 if(p.passResult==='Interception')return 'INT';
 if(p.fumbleRecovery==='Defense'||p.badSnap?.recoveredBy==='Defense')return 'Fumble';
 return null
}
function computeDrives(g){
 const drives=[];let d=null,lastPoss=null;
 for(const p of (g.plays||[])){
   if(p.kind==='Kickoff')continue;
   const side=p.team||p.before?.poss||lastPoss||'team';
   if(!d||side!==lastPoss){if(d)drives.push(d);d={side,start:p.start??p.before?.los??0,end:p.end??p.start??0,plays:0,yards:0,result:'',period:p.period||p.before?.period||1}}
   if(isOffensivePlay(p)){d.plays++;d.yards+=statYards(p);d.end=p.end??d.end}
   const r=driveResult(p);if(r)d.result=r;
   lastPoss=side;
 }
 if(d)drives.push(d);
 drives.forEach(x=>{if(!x.result)x.result='Current'});
 return drives
}
function validateGame(g){
 const issues=[];const a=computeTeamStats(g,'team'),b=computeTeamStats(g,'opp');
 if(a.completions!==Object.values(a.players).reduce((s,p)=>s+p.rec.rec,0))issues.push('Team completions do not equal team receptions.');
 if(b.completions!==Object.values(b.players).reduce((s,p)=>s+p.rec.rec,0))issues.push('Opponent completions do not equal opponent receptions.');
 for(const p of (g.plays||[])){
   if(p.passResult==='Sack'&&!(p.defenders||[]).some(d=>d.action==='Sack'))issues.push(`Play ${g.plays.indexOf(p)+1}: sack has no defender credit.`);
   if(p.fumble&&p.fumbleRecovery==='Defense'&&!p.fumbleDetail?.recoverer)issues.push(`Play ${g.plays.indexOf(p)+1}: lost fumble has no recovering player.`);
   if(p.kind==='Punt'&&p.specialResult==='Return'&&!p.returner)issues.push(`Play ${g.plays.indexOf(p)+1}: punt return has no returner.`);
   if(p.kind==='Kickoff'&&p.specialResult==='Return'&&!p.returner)issues.push(`Play ${g.plays.indexOf(p)+1}: kickoff return has no returner.`);
   if((p.kind==='Field Goal'||p.kind==='PAT'||p.kind==='Punt')&&p.blocked&&!p.blocker)issues.push(`Play ${g.plays.indexOf(p)+1}: blocked kick has no blocker.`);
   if(p.kind==='Punt'&&p.specialResult==='Blocked'&&!p.recoverer)issues.push(`Play ${g.plays.indexOf(p)+1}: blocked punt has no recoverer.`);
 }
 return issues
}

function showDriveSummary(g,t){
 const ds=computeDrives(g);
 showModal(`<div class="drive-modal"><div class="setup-head"><div><div class="eyebrow">DRIVE CHART</div><h2>${esc(t.name)} vs ${esc(g.opponent)}</h2></div><button class="setup-close" data-close>×</button></div><div class="drive-list">${ds.length?ds.map((d,i)=>{const tm=teamSide(g,t,d.side);return `<div class="drive-row" style="border-left-color:${tm.color}"><b>${i+1}. ${esc(tm.name)}</b><span>${d.plays} plays · ${d.yards} yds</span><span>${esc(d.result)}</span></div>`}).join(''):'<div class="empty">No drives yet.</div>'}</div></div>`)
}

function showGameValidation(g,t,onFinalize){
 const issues=validateGame(g);
 showModal(`<div class="validation-modal"><div class="setup-head"><div><div class="eyebrow">GAME CHECK</div><h2>${issues.length?`${issues.length} item${issues.length===1?'':'s'} to review`:'Statistics reconciled'}</h2></div><button class="setup-close" data-close>×</button></div>
 <div class="validation-list">${issues.length?issues.map(x=>`<div class="validation-item warn">⚠ ${esc(x)}</div>`).join(''):'<div class="validation-item ok">✓ Core statistical checks passed.</div>'}</div>
 <div class="setup-actions"><button class="btn btn-light" data-close>Review Game</button><button class="btn btn-primary" id="finalizeChecked">${issues.length?'Finalize Anyway':'Finalize Game'}</button></div></div>`);
 $('#finalizeChecked').onclick=()=>{closeModal();onFinalize()}
}


function uiIcon(name){
 const mockupIcons=new Set(['run','pass','badsnap','fumble','normal','td','tackle','sack','pbu','pressure','safety','deftd']);
 const ext=mockupIcons.has(name)?'png':'svg';
 return `<img class="play-action-icon" src="./icons/actions/${name}.${ext}?v=0425" alt="" aria-hidden="true">`;
}
function iconButton(icon,label,attrs='',extra=''){
 return `<button ${attrs} class="icon-action-btn ${extra}" aria-label="${esc(label)}" title="${esc(label)}">${uiIcon(icon)}<span class="action-text">${esc(label)}</span></button>`;
}

function badSnapFields(){
 const b=currentPlay.badSnap||{active:false,center:'',notCaught:false,recoveredBy:null};
 return `<div class="bad-snap-block"><div class="section-label">Snap</div><button type="button" class="btn btn-light bad-snap-toggle icon-action-btn ${b.active?'active':''}" id="badSnapBtn" aria-label="Bad Snap" title="Bad Snap">${uiIcon('badsnap')}<span class="action-text">Bad Snap</span></button>${b.active?`<div class="bad-snap-details"><div class="form-row"><label>Center #</label><input id="centerNum" inputmode="numeric" placeholder="#" value="${esc(b.center||'')}"></div><div class="section-label">Was the snap caught?</div><div class="seg" id="snapCaught"><button data-caught="true" class="${!b.notCaught?'active':''}">Caught</button><button data-caught="false" class="${b.notCaught?'active':''}">Not Caught</button></div>${b.notCaught?`<div class="section-label">Who Recovered?</div><div class="seg" id="snapRecovery"><button data-recovery="Offense" class="${b.recoveredBy==='Offense'?'active':''}">Offense</button><button data-recovery="Defense" class="${b.recoveredBy==='Defense'?'active':''}">Defense</button></div>`:''}</div>`:''}</div>`;
}



function addRemembered(arr,n){
 n=(n??'').toString().trim();
 if(!n||n==='—'||arr.includes(n))return;
 arr.push(n);
}
function rememberedPlayers(g,side){
 const m={qb:[],rb:[],wr:[],def:[]};
 [...(g.plays||[])].reverse().forEach(p=>{
   const team=p.team||p.before?.poss;
   if(team===side){
     if(p.kind==='Run'){
       let n=p.player;
       if(!n){const x=(p.desc||'').match(/^Run #(\d+)/);n=x?.[1]}
       addRemembered(m.rb,n);
     }
     if(p.kind==='Pass'){
       let qb=p.qb,wr=p.receiver;
       if(!qb){
         let x=(p.desc||'').match(/^Pass #(\d+)/);
         if(!x)x=(p.desc||'').match(/^Sack of QB #(\d+)/);
         qb=x?.[1]
       }
       if(!wr){const x=(p.desc||'').match(/→ #(\d+)/);wr=x?.[1]}
       addRemembered(m.qb,qb);addRemembered(m.wr,wr)
     }
   }
   if(team&&other(team)===side)(p.defenders||[]).slice().reverse().forEach(d=>addRemembered(m.def,d.n))
 });
 if(side==='team'){
   const t=teamById(g.teamId);
   if(t){
     normalizeRoster(t);
     const active=t.roster.filter(p=>p.active&&p.number);
     active.filter(p=>p.positions.includes('QB')).reverse().forEach(p=>addRemembered(m.qb,p.number));
     active.filter(p=>p.positions.some(x=>['RB','FB'].includes(x))).reverse().forEach(p=>addRemembered(m.rb,p.number));
     active.filter(p=>p.positions.some(x=>['WR','TE'].includes(x))).reverse().forEach(p=>addRemembered(m.wr,p.number));
     active.filter(p=>p.positions.some(x=>DEFENSE_POSITIONS.includes(x))).reverse().forEach(p=>addRemembered(m.def,p.number))
   }
 }
 return m
}
function memoryButtons(nums,role,g=null,side=null){
 const t=g&&side==='team'?teamById(g.teamId):null;
 return nums.length?nums.map(n=>{
   const rp=t?rosterPlayerByNumber(t,n):null;
   const short=rp?rosterShortName(rp):'';
   return `<button type="button" class="memory-chip" data-memory-role="${role}" data-memory-player="${esc(n)}" title="${rp?esc(rosterPlayerName(rp)):''}">#${esc(n)}${short?` ${esc(short)}`:''}</button>`
 }).join(''):'<span class="memory-empty">—</span>'
}
function offenseMemory(g){
 const m=rememberedPlayers(g,g.poss);
 return `<div class="player-memory"><div class="memory-title">PLAYERS</div><div class="memory-columns"><div class="memory-col"><small>QB</small><div>${memoryButtons(m.qb,'qb',g,g.poss)}</div></div><div class="memory-col"><small>RB</small><div>${memoryButtons(m.rb,'rb',g,g.poss)}</div></div><div class="memory-col"><small>WR / TARGETS</small><div>${memoryButtons(m.wr,'wr',g,g.poss)}</div></div></div></div>`;
}
function defenseMemory(g){
 const m=rememberedPlayers(g,other(g.poss));
 return `<div class="player-memory defense-memory"><div class="memory-title">DEFENDERS</div><div class="memory-chip-row">${memoryButtons(m.def,'def',g,other(g.poss))}</div></div>`;
}



function statYards(p){
 const dir=p.before?.driveDir??1;
 return Math.round(((p.end??p.start??0)-(p.start??0))*dir);
}
function isOffensivePlay(p){return p.kind==='Run'||p.kind==='Pass'}
function playHasTd(p){
 const d=(p.desc||'').toUpperCase();
 return (d.includes('TOUCHDOWN')||d.includes(' TD'))&&!d.includes('DEFENSIVE TD')&&!d.includes('RETURN TD');
}
function ensurePlayer(map,n){
 n=(n??'').toString().trim();
 if(!n||n==='—')return null;
 if(!map[n])map[n]={
   number:n,
   pass:{att:0,comp:0,yds:0,td:0,int:0,sacks:0},
   rush:{car:0,yds:0,td:0},
   rec:{tar:0,rec:0,yds:0,td:0},
   def:{tackle:0,sack:0,int:0,intYds:0,intTD:0,pressure:0,hurry:0,missed:0},
   fum:0
 };
 return map[n]
}
function parsedPlayPlayers(p){
 const d=p.desc||'';
 let player=p.player||'',qb=p.qb||'',receiver=p.receiver||'',result=p.passResult||'';
 if(p.kind==='Run'&&!player){
   const m=d.match(/^Run #(\d+)/i);if(m)player=m[1]
 }
 if(p.kind==='Pass'){
   if(!qb){
     let m=d.match(/^Pass #(\d+)/i);
     if(!m)m=d.match(/^Sack of QB #(\d+)/i);
     if(m)qb=m[1]
   }
   if(!receiver){
     const m=d.match(/→ #(\d+)/);if(m)receiver=m[1]
   }
   if(!result){
     if(/incomplete/i.test(d))result='Incomplete';
     else if(/intercept/i.test(d))result='Interception';
     else if(/^Sack of QB/i.test(d))result='Sack';
     else result='Complete';
   }
 }
 return {player,qb,receiver,result}
}
function computeTeamStats(g,side){
 const team={
   side,totalYards:0,rushYards:0,passYards:0,
   rushAtt:0,passAtt:0,completions:0,plays:0,
   firstDowns:0,thirdAtt:0,thirdMade:0,fourthAtt:0,fourthMade:0,
   turnovers:0,sacksAllowed:0,players:{}
 };
 if(side==='team'){
   const rt=teamById(g.teamId);
   if(rt){
     normalizeRoster(rt);
     rt.roster.filter(p=>p.active&&p.number).forEach(p=>ensurePlayer(team.players,p.number))
   }
 }

 for(const p of (g.plays||[])){
   const offense=p.team||p.before?.poss;

   if(offense===side&&isOffensivePlay(p)){
     const y=statYards(p);
     const f=parsedPlayPlayers(p);
     team.plays++;

     if(p.kind==='Run'){
       team.rushAtt++;
       team.rushYards+=y;
       const rb=ensurePlayer(team.players,f.player);
       if(rb){
         rb.rush.car++;
         rb.rush.yds+=y;
         if(playHasTd(p))rb.rush.td++;
         if(p.fumble)rb.fum++;
       }
     }else{
       const result=f.result||'Complete';
       const complete=result==='Complete';
       const sack=result==='Sack';
       const interception=result==='Interception';

       if(!sack)team.passAtt++;
       if(complete){team.completions++;team.passYards+=y}
       if(sack)team.sacksAllowed++;

       const qb=ensurePlayer(team.players,f.qb);
       if(qb){
         if(!sack)qb.pass.att++;
         if(complete){qb.pass.comp++;qb.pass.yds+=y}
         if(sack)qb.pass.sacks++;
         if(interception)qb.pass.int++;
         if(playHasTd(p)&&complete)qb.pass.td++;
       }

       const wr=ensurePlayer(team.players,f.receiver);
       if(wr){
         if(!sack)wr.rec.tar++;
         if(complete){
           wr.rec.rec++;
           wr.rec.yds+=y;
           if(playHasTd(p))wr.rec.td++;
         }
       }

       if(interception)team.turnovers++;
     }

     if(p.fumble&&p.fumbleRecovery==='Defense')team.turnovers++;
     if(p.badSnap?.active&&p.badSnap.notCaught&&p.badSnap.recoveredBy==='Defense')team.turnovers++;

     const down=Number(p.before?.down||0);
     const toGo=Number(p.before?.toGo||0);
     const gained=Math.max(0,y);
     const converted=toGo>0&&gained>=toGo;
     if(down===3){team.thirdAtt++;if(converted)team.thirdMade++}
     if(down===4){team.fourthAtt++;if(converted)team.fourthMade++}
     if(converted||playHasTd(p))team.firstDowns++;
   }

   // Defensive actions are stored on the offensive play.
   if(offense&&other(offense)===side){
     for(const d of (p.defenders||[])){
       const pl=ensurePlayer(team.players,d.n);
       if(!pl)continue;
       if(d.action==='Tackle'){
         const credit=Number(d.credit??1);
         pl.def.tackle+=credit;
         const loss=Math.max(0,-statYards(p));
         if(loss>0){pl.def.tfl+=credit;pl.def.tflYds+=loss*credit}
       }
       else if(d.action==='TFL'){pl.def.tackle+=Number(d.credit??1);pl.def.tfl+=Number(d.credit??1);pl.def.tflYds+=Number(d.yards||0)}
       else if(d.action==='Assist')pl.def.tackle+=0.5;
       else if(d.action==='Sack'){pl.def.sack+=Number(d.credit??1);pl.def.tfl+=Number(d.credit??1);pl.def.tflYds+=Math.max(0,-statYards(p))}
       else if(d.action==='PBU')pl.def.pbu++;
       else if(d.action==='Forced Fumble')pl.def.ff++;
       else if(d.action==='Fumble Recovery')pl.def.fr++;
       else if(d.action==='Pressure')pl.def.pressure++;
       else if(d.action==='Hurry')pl.def.hurry++;
       else if(d.action==='Missed')pl.def.missed++;
     }
     if(p.fumbleDetail?.forcedBy){const fp=ensurePlayer(team.players,p.fumbleDetail.forcedBy);if(fp)fp.def.ff++}
     if(p.fumbleDetail?.recoveryTeam==='Defense'&&p.fumbleDetail?.recoverer){const rp=ensurePlayer(team.players,p.fumbleDetail.recoverer);if(rp)rp.def.fr++}
     if(p.passResult==='Interception'&&p.interception?.interceptor){
       const ip=ensurePlayer(team.players,p.interception.interceptor);
       if(ip){
         ip.def.int++;
         ip.def.intYds+=Math.abs((p.interception.returnEnd??p.interception.catchSpot)-p.interception.catchSpot);
         if(p.interception.returnTD)ip.def.intTD++;
       }
     }
   }
 }

 team.totalYards=team.rushYards+team.passYards;
 team.yardsPerPlay=team.plays?team.totalYards/team.plays:0;
 team.rushAvg=team.rushAtt?team.rushYards/team.rushAtt:0;
 team.passAvg=team.passAtt?team.passYards/team.passAtt:0;
 return team
}
function gameAnalytics(g,t){return {team:computeTeamStats(g,'team'),opp:computeTeamStats(g,'opp')}}
function fmtAvg(y,n){return n?(y/n).toFixed(1):'0.0'}
function pct(n,d){return d?Math.round(n/d*100):0}
function playerButton(side,n){return `<button class="stat-player-link" data-stat-side="${side}" data-stat-player="${esc(n)}">#${esc(n)}</button>`}
function metric(label,value,sub='',cls=''){
 return `<div class="analytics-kpi ${cls}"><span>${label}</span><b>${value}</b>${sub?`<small>${sub}</small>`:''}</div>`
}
function offenseTables(stats){
 const players=Object.values(stats.players).map(safeDefStats).sort((a,b)=>Number(a.number)-Number(b.number));
 const qbs=players.filter(p=>p.pass.att||p.pass.comp||p.pass.yds||p.pass.sacks||p.pass.int||p.pass.td);
 const rbs=players.filter(p=>p.rush.car);
 const wrs=players.filter(p=>p.rec.tar||p.rec.rec);

 const qbRows=qbs.length?qbs.map(p=>`<tr><td>${playerButton(stats.side,p.number)}</td><td>${p.pass.comp}/${p.pass.att}</td><td>${pct(p.pass.comp,p.pass.att)}%</td><td>${p.pass.yds}</td><td>${p.pass.td}</td><td>${p.pass.int}</td><td>${p.pass.sacks}</td></tr>`).join(''):`<tr><td colspan="7" class="stat-empty">No QB stats recorded yet</td></tr>`;
 const rbRows=rbs.length?rbs.map(p=>`<tr><td>${playerButton(stats.side,p.number)}</td><td>${p.rush.car}</td><td>${p.rush.yds}</td><td>${fmtAvg(p.rush.yds,p.rush.car)}</td><td>${p.rush.td}</td><td>${p.fum}</td></tr>`).join(''):`<tr><td colspan="6" class="stat-empty">No rushing player stats recorded yet</td></tr>`;
 const wrRows=wrs.length?wrs.map(p=>`<tr><td>${playerButton(stats.side,p.number)}</td><td>${p.rec.tar}</td><td>${p.rec.rec}</td><td>${p.rec.yds}</td><td>${fmtAvg(p.rec.yds,p.rec.rec)}</td><td>${p.rec.td}</td></tr>`).join(''):`<tr><td colspan="6" class="stat-empty">No receiving player stats recorded yet</td></tr>`;

 return `
 <div class="stat-section"><h4>Quarterbacks</h4><div class="stat-table-wrap"><table class="stat-table"><thead><tr><th>Player</th><th>C/A</th><th>Cmp%</th><th>Yds</th><th>TD</th><th>INT</th><th>Sk</th></tr></thead><tbody>${qbRows}</tbody></table></div></div>
 <div class="stat-section"><h4>Rushing</h4><div class="stat-table-wrap"><table class="stat-table"><thead><tr><th>Player</th><th>Car</th><th>Yds</th><th>Avg</th><th>TD</th><th>Fum</th></tr></thead><tbody>${rbRows}</tbody></table></div></div>
 <div class="stat-section"><h4>Receiving</h4><div class="stat-table-wrap"><table class="stat-table"><thead><tr><th>Player</th><th>Tgt</th><th>Rec</th><th>Yds</th><th>Avg</th><th>TD</th></tr></thead><tbody>${wrRows}</tbody></table></div></div>`
}

function safeDefStats(p){
 p.def??={};
 for(const k of ['tackle','tfl','tflYds','sack','int','intYds','intTD','pbu','ff','fr','pressure','hurry','missed']){
   if(!Number.isFinite(Number(p.def[k])))p.def[k]=0;
   else p.def[k]=Number(p.def[k]);
 }
 p.pass??={att:0,comp:0,yds:0,td:0,int:0,sacks:0};
 p.rush??={car:0,yds:0,td:0};
 p.rec??={tar:0,rec:0,yds:0,td:0};
 p.fum=Number(p.fum||0);
 return p
}

function defenseTable(stats){
 const players=Object.values(stats.players).map(safeDefStats)
   .filter(p=>p.def.tackle||p.def.tfl||p.def.sack||p.def.int||p.def.pbu||p.def.ff||p.def.fr||p.def.pressure)
   .sort((a,b)=>((b.def.tackle+b.def.sack+b.def.int)-(a.def.tackle+a.def.sack+a.def.int)));
 const rows=players.length?players.map(p=>`<tr><td>${playerButton(stats.side,p.number)}</td><td>${p.def.tackle.toFixed(1)}</td><td>${p.def.tfl.toFixed(1)}</td><td>${Number(p.def.tflYds||0).toFixed(1).replace('.0','')}</td><td>${p.def.sack.toFixed(1)}</td><td>${p.def.int}</td><td>${p.def.intYds}</td><td>${p.def.pbu}</td><td>${p.def.ff}</td><td>${p.def.fr}</td><td>${p.def.pressure}</td></tr>`).join(''):`<tr><td colspan="11" class="stat-empty">No defensive player stats recorded yet</td></tr>`;
 return `<div class="stat-section"><h4>Defense</h4><div class="stat-table-wrap"><table class="stat-table"><thead><tr><th>Player</th><th>Tkl</th><th>TFL</th><th>TFL Yds</th><th>Sk</th><th>INT</th><th>INT Yds</th><th>PBU</th><th>FF</th><th>FR</th><th>Prs</th></tr></thead><tbody>${rows}</tbody></table></div></div>`
}

function teamAnalyticsColumn(g,t,side,stats){
 const ts=teamSide(g,t,side);
 return `<section class="analytics-team-card" style="--team-color:${ts.color}">
   <div class="analytics-team-head">
     <span class="analytics-swatch" style="background:${ts.color}"></span>
     <div><h3>${esc(ts.name)}</h3><small>${stats.plays} offensive plays · ${stats.yardsPerPlay.toFixed(1)} yards/play</small></div>
   </div>

   <div class="analytics-hero-row">
     <div class="analytics-total"><span>TOTAL OFFENSE</span><b>${stats.totalYards}</b><small>yards</small></div>
     <div class="analytics-split">
       <div><span>Rushing</span><b>${stats.rushYards}</b><small>${stats.rushAtt} att · ${stats.rushAvg.toFixed(1)} avg</small></div>
       <div><span>Passing</span><b>${stats.passYards}</b><small>${stats.completions}/${stats.passAtt} · ${pct(stats.completions,stats.passAtt)}%</small></div>
     </div>
   </div>

   <div class="analytics-kpis">
     ${metric('First Downs',stats.firstDowns)}
     ${metric('Turnovers',stats.turnovers)}
     ${metric('3rd Down',`${stats.thirdMade}/${stats.thirdAtt}`,`${pct(stats.thirdMade,stats.thirdAtt)}%`)}
     ${metric('4th Down',`${stats.fourthMade}/${stats.fourthAtt}`,`${pct(stats.fourthMade,stats.fourthAtt)}%`)}
     ${metric('Sacks Allowed',stats.sacksAllowed)}
     ${metric('Yards / Play',stats.yardsPerPlay.toFixed(1))}
   </div>

   ${offenseTables(stats)}
   ${defenseTable(stats)}
 </section>`
}
function showGameAnalytics(g,t){
 try{
   const a=gameAnalytics(g,t);
   showModal(`<div class="analytics-modal">
     <div class="analytics-modal-head">
       <div><div class="eyebrow">IN-GAME ANALYTICS</div><h2>${esc(t.name)} vs ${esc(g.opponent)}</h2><p>Live game statistics calculated from recorded plays.</p></div>
       <button class="btn btn-light" id="closeAnalytics">Close</button>
     </div>
     <div class="analytics-compare">${teamAnalyticsColumn(g,t,'team',a.team)}${teamAnalyticsColumn(g,t,'opp',a.opp)}</div>
   </div>`);
   if($('#closeAnalytics'))$('#closeAnalytics').onclick=closeModal;
   $$('[data-stat-player]').forEach(b=>b.onclick=()=>showPlayerStats(g,t,b.dataset.statSide,b.dataset.statPlayer))
 }catch(err){
   console.error('SidelineIQ analytics error',err);
   showModal(`<div class="analytics-error"><div class="eyebrow">IN-GAME ANALYTICS</div><h2>Analytics could not be calculated</h2><p>${esc(err?.message||'Unknown analytics error')}</p><div class="modal-actions"><button class="btn btn-light" data-close>Close</button></div></div>`)
 }
}
function showPlayerStats(g,t,side,number){
 const a=computeTeamStats(g,side),p=a.players[String(number)]||ensurePlayer(a.players,String(number)),ts=teamSide(g,t,side);
 const hasPass=p.pass.att||p.pass.comp||p.pass.yds||p.pass.td||p.pass.int||p.pass.sacks;
 const hasRush=p.rush.car||p.rush.yds||p.rush.td;
 const hasRec=p.rec.tar||p.rec.rec||p.rec.yds||p.rec.td;
 const hasDef=p.def.tackle||p.def.sack||p.def.int||p.def.pressure||p.def.hurry||p.def.missed;
 showModal(`<div class="player-stat-modal">
   <div class="player-stat-hero" style="--team-color:${ts.color}">
     <div class="player-number">#${esc(number)}</div>
     <div><div class="eyebrow">${esc(ts.name)}</div><h2>Player Statistics</h2></div>
   </div>
   <div class="player-stat-grid">
     ${hasPass?`<div class="player-stat-card"><h4>Passing</h4><div class="player-stat-numbers"><div><b>${p.pass.comp}/${p.pass.att}</b><span>Comp/Att</span></div><div><b>${pct(p.pass.comp,p.pass.att)}%</b><span>Comp %</span></div><div><b>${p.pass.yds}</b><span>Yards</span></div><div><b>${p.pass.td}</b><span>TD</span></div><div><b>${p.pass.int}</b><span>INT</span></div><div><b>${p.pass.sacks}</b><span>Sacked</span></div></div></div>`:''}
     ${hasRush?`<div class="player-stat-card"><h4>Rushing</h4><div class="player-stat-numbers"><div><b>${p.rush.car}</b><span>Carries</span></div><div><b>${p.rush.yds}</b><span>Yards</span></div><div><b>${fmtAvg(p.rush.yds,p.rush.car)}</b><span>Avg</span></div><div><b>${p.rush.td}</b><span>TD</span></div><div><b>${p.fum}</b><span>Fumbles</span></div></div></div>`:''}
     ${hasRec?`<div class="player-stat-card"><h4>Receiving</h4><div class="player-stat-numbers"><div><b>${p.rec.tar}</b><span>Targets</span></div><div><b>${p.rec.rec}</b><span>Rec</span></div><div><b>${p.rec.yds}</b><span>Yards</span></div><div><b>${fmtAvg(p.rec.yds,p.rec.rec)}</b><span>Avg</span></div><div><b>${p.rec.td}</b><span>TD</span></div></div></div>`:''}
     ${hasDef?`<div class="player-stat-card"><h4>Defense</h4><div class="player-stat-numbers"><div><b>${p.def.tackle.toFixed(1)}</b><span>Tackles</span></div><div><b>${p.def.sack.toFixed(1)}</b><span>Sacks</span></div><div><b>${p.def.int}</b><span>INT</span></div><div><b>${p.def.intYds}</b><span>INT Yards</span></div><div><b>${p.def.intTD}</b><span>INT TD</span></div><div><b>${p.def.pressure}</b><span>Pressure</span></div><div><b>${p.def.hurry}</b><span>Hurry</span></div><div><b>${p.def.missed}</b><span>Missed</span></div></div></div>`:''}
     ${!hasPass&&!hasRush&&!hasRec&&!hasDef?`<div class="stat-empty">No recorded statistics for this player yet.</div>`:''}
   </div>
   <div class="modal-actions"><button class="btn btn-light" id="backAnalytics">Back to Game Analytics</button><button class="btn btn-primary" id="closePlayerStats">Close</button></div>
 </div>`);
 $('#backAnalytics').onclick=()=>showGameAnalytics(g,t);
 $('#closePlayerStats').onclick=closeModal
}

function renderGame(id){
 const g=gameById(id);if(!g){console.error('Game not found',id);toast('Game could not be found.');return location.hash='#teams'};normalizeGame(g);
 const t=teamById(g.teamId);if(!t){console.error('Team not found for game',g.teamId);toast('Team could not be found for this game.');return location.hash='#teams'};currentPlay=defaultPlay(g);
 const homeTeam=g.location==='Away'?'opp':'team';const left=teamSide(g,t,homeTeam),right=teamSide(g,t,other(homeTeam));left.score=homeTeam==='team'?g.teamScore:g.oppScore;right.score=homeTeam==='team'?g.oppScore:g.teamScore;
 const off=teamSide(g,t,g.poss),def=teamSide(g,t,other(g.poss));
 const stateLabel=g.gameOver?'FINAL':g.kickoffPending?'KICKOFF':g.puntPending?'PUNT':g.awaitingTry?'TRY':`${ordinal(g.down)} & ${g.toGo}`;const periodLabel=g.overtime?`OT${g.overtime>1?g.overtime:''}`:`${g.format==='halves'?'H':'Q'}${g.period}`;
 shell(`<main class="game-page"><section class="game-top"><div class="game-brand"><img src="./assets/sidelineiq-header-logo.png" alt="SidelineIQ"></div><div class="score-card" style="background:${left.color};color:${textColor(left.color)}"><span class="team-label">${esc(left.name)}${homeTeam===g.poss?' <span class="poss-indicator" title="Possession">🏈</span>':''}</span><span class="score-value">${left.score}</span></div><div class="game-state"><div class="period period-control"><span>${periodLabel}</span><button class="period-next ${g.period>=(g.format==='halves'?2:4)?'game-over-btn':''}" id="nextPeriod" title="${g.gameOver?'Game is final':g.period>=(g.format==='halves'?2:4)?'End game':'Advance period'}">${g.gameOver?'FINAL':g.period>=(g.format==='halves'?2:4)?'Game Over':'›'}</button></div><div class="downline">${stateLabel}</div><div class="pos">${g.kickoffPending?(g.kickoff?.halftime?'Second-half kickoff':'Opening kickoff'):g.puntPending?(g.punt?.phase==='kick'?'Punt':'Punt return'):fmtDrive(g.los,g.driveDir)}</div></div><div class="score-card" style="background:${right.color};color:${textColor(right.color)}"><span class="score-value">${right.score}</span><span class="team-label">${other(homeTeam)===g.poss?'<span class="poss-indicator" title="Possession">🏈</span> ':''}${esc(right.name)}</span></div><div class="nav-strip"><button class="nav-button" onclick="location.hash='#team/${t.id}'"><span class="ico">▣</span>Games</button><button class="nav-button" id="gamePlays"><span class="ico">☷</span>Plays</button><button class="nav-button mobile-primary-action" id="mobileUndo"><span class="ico">↶</span>Undo</button><button class="nav-button mobile-save-action" id="mobileSave"><span class="ico">✓</span>Save</button><button class="nav-button mobile-note-action" id="mobileNotes"><span class="ico">✎</span>Notes</button><button class="nav-button secondary-mobile-nav" id="gameControl"><span class="ico">⌘</span>Control</button><button class="nav-button secondary-mobile-nav" id="gameDrives"><span class="ico">↳</span>Drives</button><button class="nav-button analytics-nav" id="gameAnalytics"><span class="ico">▥</span>Analytics</button><button class="nav-button mobile-hide-action" id="resetGame"><span class="ico">↻</span>Reset</button><button class="nav-button danger-nav mobile-hide-action" id="deleteGame"><span class="ico">✕</span>Delete</button><button class="nav-button settings-nav mobile-hide-action"><span class="ico">⚙</span>Settings</button></div></section>
 <div class="main-grid mobile-field-zone"><section class="field-panel"><div class="field" id="field"></div><div class="field-controls"><div class="mini"><small>Line of Scrimmage</small><div class="los-control"><select id="losSide"><option>OWN</option><option>OPP</option><option>50</option></select><input id="losYard" type="number" min="0" max="49"><button class="btn btn-light" id="setLos">Set</button></div></div><div class="mini"><small>Ball at</small><b id="ballText">${g.kickoffPending?'—':fmtDrive(g.los,g.driveDir)}</b></div><div class="mini"><small>Distance</small><b>${g.kickoffPending?'—':g.toGo}</b></div><div class="mini"><small>Down</small><b>${g.kickoffPending?'—':g.down}</b></div><div class="mini"><small>State</small><b>${g.kickoffPending?'KO':g.awaitingTry?'TRY':'LIVE'}</b></div></div></section>
 <aside class="recent-panel"><div class="recent-head"><span>Recent Plays</span><button class="btn btn-light all-plays-btn" id="allPlays">View All</button></div><div class="recent-list">${recentRows(g,t)}</div><div class="recent-actions"><button class="btn btn-light" id="editPlay">Edit Selected</button><button class="btn btn-light" id="undoPlay">Undo Last Play</button></div></aside></div>
 <section class="workbench mobile-side-workspace">
 <div class="pane off" data-pane="off"><button type="button" class="pane-title" data-pane-toggle="off"><span>OFFENSE</span><span class="pane-chevron">⌄</span></button><div class="pane-body">${offensePane(g)}</div></div>
 <div class="pane def" data-pane="def"><button type="button" class="pane-title" data-pane-toggle="def"><span>DEFENSE</span><span class="pane-chevron">⌄</span></button><div class="pane-body">${defensePane(g)}</div></div>
 <div class="pane st" data-pane="st"><button type="button" class="pane-title" data-pane-toggle="st"><span>SPECIAL TEAMS</span><span class="pane-chevron">⌄</span></button><div class="pane-body">${specialPane(g,t)}</div></div>
 <div class="pane pen" data-pane="pen"><button type="button" class="pane-title" data-pane-toggle="pen"><span>PENALTY</span><span class="pane-chevron">⌄</span></button><div class="pane-body">${penaltyPane()}</div></div>
 </section>
 <section class="savebar"><button class="btn btn-light note-trigger" id="playNotes">✎ Notes</button><div class="save-actions"><button class="btn btn-primary" id="savePlay">✓ Save Play</button><button class="btn btn-light" id="clearPlay">Clear</button></div></section></main>`);
 document.querySelector('.topbar')?.remove();composeMobileGameLayout();bindGame(g,t);bindMobilePaneCollapse(g);drawField(g,t)
}

function offensePane(g){
 if(g.kickoffPending)return `<div class="notice">Finish the kickoff in Special Teams before recording an offensive play.</div>`;
 if(g.awaitingTry&&g.tryType==='2PT'){
   return `<div class="notice two-point-notice"><b>2-Point Conversion</b><br>Ball placed at OPP 5. Record the run/pass, then mark the try Successful or Failed.</div><div class="section-label">Play Type</div><div class="seg icon-action-grid offense-play-icons" id="playTypes">${iconButton('run','Run','data-type="Run"','active')}${iconButton('pass','Pass','data-type="Pass"')}</div><div id="offDynamic">${runFields(g)}</div><div class="section-label">Try Result</div><div class="seg" id="tryResult"><button data-try="successful">Successful</button><button data-try="failed">Failed</button></div><div class="summary" id="offSummary">Drag the football to the end of the conversion attempt.</div>${offenseMemory(g)}`
 }
 return `<div class="section-label">Play Type</div><div class="seg icon-action-grid offense-play-icons" id="playTypes">${iconButton('run','Run','data-type="Run"','active')}${iconButton('pass','Pass','data-type="Pass"')}</div><div id="offDynamic">${runFields(g)}</div><div class="section-label">Result</div><div class="seg icon-action-grid offense-result-icons" id="offScore">${iconButton('normal','Normal','data-score=""','active')}${iconButton('td','Touchdown','data-score="TD"')}${iconButton('twopt','2-Point Try','data-score="2PT"')}${iconButton('fumble','Fumble','id="fumbleBtn"')}</div><div class="summary" id="offSummary">Drag the football to the end of the play.</div>${offenseMemory(g)}`
}
function runFields(g){
 const m=rememberedPlayers(g,g.poss),last=m.rb[0]||'';
 return `<div class="form-row"><label>Ball Carrier #</label><input id="player" inputmode="numeric" placeholder="#" value="${esc(last)}"></div>${badSnapFields()}`
}
function interceptionFields(g){
 const i=currentPlay.interception||{phase:'catch',interceptor:'',catchSpot:currentPlay.end??g.los,returnEnd:null,returnTD:false,tacklers:[]};
 if(i.phase==='catch')return `<div class="turnover-workflow"><div class="workflow-steps"><b class="active">1 · INTERCEPTION</b><span>›</span><b>2 · RETURN</b></div><div class="form-row"><label>Interceptor #</label><input id="interceptorNum" inputmode="numeric" value="${esc(i.interceptor||'')}" placeholder="#"></div><div class="notice">Drag the football to the interception spot, then lock it.</div><button class="btn btn-primary" id="lockInterception">Lock Interception →</button></div>`;
 return `<div class="turnover-workflow"><div class="workflow-steps"><b>✓ INTERCEPTION</b><span>›</span><b class="active">2 · RETURN</b></div><div class="summary">Interceptor #${esc(i.interceptor||'—')} · interception spot locked</div><div class="notice">Field perspective is now the intercepting team. Drag the football to the end of the return.</div><div class="form-row"><label>Return tackler #</label><input id="intTackler" inputmode="numeric" placeholder="Optional"><button class="btn btn-light" id="addIntTackler">Add</button></div><div class="summary">Return tacklers: ${(i.tacklers||[]).length?i.tacklers.map(x=>'#'+esc(x)).join(', '):'—'}</div><label class="inline-check"><input type="checkbox" id="intReturnTD" ${i.returnTD?'checked':''}> Interception return TD</label></div>`
}
function sackFields(){
 const sacks=currentPlay.defenders.filter(d=>d.action==='Sack');
 return `<div class="sack-workflow"><div class="section-label">Defensive Sack Credit</div><div class="form-row"><label>Defender #</label><input id="sackDefender" inputmode="numeric" placeholder="#"><div class="seg compact-credit" id="sackCredit"><button class="active" data-credit="1">1.0</button><button data-credit="0.5">0.5</button></div><button class="btn btn-light" id="addSackCredit">Add Sack</button></div><div class="summary">${sacks.length?sacks.map(d=>`#${esc(d.n)} Sack ${Number(d.credit??1).toFixed(1)}`).join(' · '):'Add the defender(s) credited with the sack.'}</div></div>`
}
function passFields(g){
 const m=rememberedPlayers(g,g.poss),last=m.qb[0]||'';
 return `<div class="form-row"><label>QB #</label><input id="qb" inputmode="numeric" value="${esc(currentPlay.qb||last)}"><label>Receiver #</label><input id="receiver" inputmode="numeric" value="${esc(currentPlay.receiver||'')}"></div><div class="seg" id="passResult"><button class="${currentPlay.passResult==='Complete'?'active':''}">Complete</button><button class="${currentPlay.passResult==='Incomplete'?'active':''}">Incomplete</button><button class="${currentPlay.passResult==='Interception'?'active':''}">Interception</button><button class="${currentPlay.passResult==='Sack'?'active':''}">Sack</button></div>${currentPlay.passResult==='Interception'?interceptionFields(g):''}${currentPlay.passResult==='Sack'?sackFields():''}${badSnapFields()}`
}

function defensePane(g){
 return `<div class="form-row"><label>Player #</label><input id="defNum" inputmode="numeric"><div class="seg compact-credit" id="defCredit"><button class="active" data-credit="1">1.0</button><button data-credit="0.5">0.5</button></div></div><div class="section-label">Action</div><div class="action-grid defense-icon-grid">${iconButton('tackle','Tackle','data-def="Tackle"')}${iconButton('sack','Sack','data-def="Sack"')}${iconButton('pbu','Pass Breakup','data-def="PBU"','alt')}${iconButton('pressure','Pressure','data-def="Pressure"','alt')}${iconButton('safety','Safety +2','data-dscore="Safety"','score')}${iconButton('deftd','Defensive TD +6','data-dscore="Def TD"','score')}<button class="alt mobile-def-extra" data-def="Forced Fumble">Forced Fumble</button><button class="alt mobile-def-extra" data-def="Fumble Recovery">Fumble Recovery</button></div><div class="summary" id="defList">No defensive actions yet.</div>${defenseMemory(g)}`
}

function penaltyPane(){return `<div class="section-label">Side</div><div class="seg pen-toggle" id="penSideToggle"><button class="active" data-pen-side="Offense">Offense</button><button data-pen-side="Defense">Defense</button></div><div class="section-label">Apply To</div><div class="seg pen-toggle" id="penApplyToggle"><button class="active" data-apply="current">Current</button><button data-apply="former">Former</button><button data-apply="next">Next Play</button></div><div class="section-label">Status</div><div class="seg pen-toggle" id="penStatusToggle"><button class="active" data-status="accepted">Accepted</button><button data-status="declined">Declined</button></div><div class="form-row"><select id="penType"><option>Holding</option><option>False Start</option><option>Delay of Game</option><option>Offside</option><option>Pass Interference</option><option>Personal Foul</option><option>Illegal Formation</option><option>Illegal Motion</option><option>Facemask</option><option>Unsportsmanlike Conduct</option><option>Other</option></select><input id="penYards" type="number" value="10" aria-label="Penalty yards" placeholder="Yards"></div><div class="form-row"><input id="penPlayer" inputmode="numeric" placeholder="Player #" aria-label="Player number"></div><div class="pen-checks"><label><input type="checkbox" id="spotFoul"> Enforce from spot of foul</label><div id="foulSpotFields" class="foul-spot-fields hidden"><span class="field-hint">Spot of foul</span><select id="foulSpotSide" aria-label="Spot of foul side"><option>OWN</option><option>OPP</option><option>50</option></select><input id="foulSpotYard" type="number" min="0" max="49" placeholder="Yard" aria-label="Spot of foul yard line"></div><label><input type="checkbox" id="negate"> Ignore play yardage; enforce from previous LOS</label><label><input type="checkbox" id="repeatDown"> Repeat down / no play</label><label><input type="checkbox" id="autoFirst"> Automatic first down</label></div><div class="form-row"><button class="btn btn-light" id="attachPenalty">Apply Penalty</button><button class="btn btn-light" id="clearPenalty">Clear Current</button></div><div class="summary penalty-list" id="penSummary">No penalties applied.</div><div class="summary pending-penalty-list" id="pendingPenSummary"></div>`}
function specialPane(g,t){
 if(g.kickoffPending)return kickoffPane(g,t);
 if(g.puntPending)return puntPane(g,t);
 return `<div class="seg" id="stTypes"><button class="active" data-st="Kickoff">Kickoff</button><button data-st="Punt">Punt</button><button data-st="Field Goal">Field Goal</button><button data-st="PAT">PAT</button></div><div id="stDynamic">${manualKickoffFields()}</div>`
}
function manualKickoffFields(){return `<div class="notice">Start a kickoff after a score. Kicking team is the current possession team.</div><div class="form-row"><label>Kicker #</label><input id="stKicker"><label>Kick from</label><input id="stFrom" type="number" value="40"></div><button class="btn btn-light" id="startKickoff">Start Kickoff Workflow</button>`}
function puntFields(){return `<div class="notice">Start the punt workflow. You will mark the punt landing spot first, lock it in, then enter the return.</div><button class="btn btn-light" id="startPunt">Start Punt Workflow</button>`}
function puntPane(g,t){
 const p=g.punt,punting=teamSide(g,t,p.puntingTeam),receiving=teamSide(g,t,p.receivingTeam);
 if(p.phase==='kick')return `<div class="kick-steps"><div class="step active">1 · KICK</div><span>›</span><div class="step">2 · RETURN</div></div><div class="notice"><b>${esc(punting.name)}</b> punts from ${fmtDrive(p.startSpot,p.kickDir||1)}. Enter punter, drag the football to the landing/catch spot, then lock it in.</div><div class="form-row"><label>Punter #</label><input id="puntPunter" value="${esc(p.punter||'')}"></div><div class="summary">Landing: <b>${p.landing==null?'drag football':fmtDrive(p.landing,p.kickDir||1)}</b>${p.landing==null?'':` · ${Math.abs(p.landing-p.startSpot)} yd punt`}</div><div class="section-label">Punt Result</div><div class="seg special-results"><button id="puntTouchbackKick">Touchback</button><button data-punt-result="Fair Catch">Fair Catch</button><button data-punt-result="Downed">Downed</button><button data-punt-result="Out of Bounds">Out of Bounds</button><button data-punt-result="Blocked">Blocked</button></div><div class="form-row"><label>Blocked by #</label><input id="puntBlocker" inputmode="numeric" value="${esc(p.blocker||'')}" style="max-width:75px"><button class="btn btn-primary" id="lockPunt" ${p.landing==null?'disabled':''}>Return →</button></div>`;
 return `<div class="kick-steps"><div class="step done">✓ KICK</div><span>›</span><div class="step active">2 · RETURN</div></div><div class="notice"><b>${esc(receiving.name)}</b> return. Field perspective has flipped to the receiving team.</div><div class="form-row"><label>Returner #</label><input id="puntReturner" value="${esc(p.returner||'')}"><label>Tackler #</label><input id="puntTackler"><button class="btn btn-light" id="addPuntTackler">Add</button></div><div class="summary">Catch: <b>${fmtDrive(p.landing,-(p.kickDir||1))}</b> · End: <b>${p.returnEnd==null?'drag football':fmtDrive(p.returnEnd,-(p.kickDir||1))}</b><br>Tacklers: ${p.tacklers.length?p.tacklers.map(x=>'#'+esc(x)).join(', '):'—'}</div><div class="form-row"><button class="btn btn-light" id="puntTouchbackReturn">Touchback</button><button class="btn btn-light" id="puntReturnTD">${p.returnTD?'✓ Return TD':'Return TD'}</button><button class="btn btn-primary" id="finishPunt" ${p.returnEnd==null?'disabled':''}>Finish Punt</button></div>`
}
function kickFields(type){return `<div class="form-row"><label>Kicker #</label><input id="stKicker"><label>${type==='PAT'?'Try':'Distance'}</label><input id="stDistance" type="number" value="${type==='PAT'?1:35}"></div><div class="seg" id="kickGood"><button data-good="true">Good</button><button data-good="false">No Good</button></div><div class="form-row"><label><input type="checkbox" id="kickBlocked"> Blocked</label><label>Blocked by #</label><input id="kickBlocker" inputmode="numeric" style="max-width:75px"></div><div class="form-row"><label>Loose-ball recovery</label><select id="kickRecoveryTeam"><option value="Defense">Defense</option><option value="Offense">Offense</option></select><label>Recoverer #</label><input id="kickRecoverer" inputmode="numeric" style="max-width:75px"></div>`}
function kickoffPane(g,t){
 const k=g.kickoff,kick=teamSide(g,t,k.kickingTeam),rec=teamSide(g,t,k.receivingTeam);
 if(k.phase==='kick')return `<div class="kick-steps"><div class="step active">1 · KICK</div><span>›</span><div class="step">2 · RETURN</div></div><div class="notice">${k.halftime?'<b>SECOND-HALF KICKOFF</b><br>':''}<b>${esc(kick.name)}</b> kicks from OWN ${k.startYard}. Enter kicker, then drag the football to the landing/catch spot.</div><div class="form-row"><label>Kicker #</label><input id="koKicker" value="${esc(k.kicker||'')}"></div><div class="summary">Landing: <b>${k.landing==null?'drag football':fmtDrive(k.landing,k.kickDir||1)}</b>${k.landing==null?'':` · ${Math.abs(k.landing-(k.startSpot??k.startYard))} yd kick`}</div><div class="section-label">Kickoff Result</div><div class="seg special-results"><button id="touchbackKick">Touchback</button><button data-ko-result="Fair Catch">Fair Catch</button><button data-ko-result="Out of Bounds">Out of Bounds</button><button data-ko-result="Onside">Onside</button></div><div class="form-row"><button class="btn btn-primary" id="lockKick" ${k.landing==null?'disabled':''}>Return →</button></div>`;
 return `<div class="kick-steps"><div class="step done">✓ KICK</div><span>›</span><div class="step active">2 · RETURN</div></div><div class="notice"><b>${esc(rec.name)}</b> return. Field perspective has flipped to the receiving team.</div><div class="form-row"><label>Returner #</label><input id="koReturner" value="${esc(k.returner||'')}"><label>Tackler #</label><input id="koTackler"><button class="btn btn-light" id="addKoTackler">Add</button></div><div class="summary">Catch: <b>${fmtDrive(k.landing,-(k.kickDir||1))}</b> · End: <b>${k.returnEnd==null?'drag football':fmtDrive(k.returnEnd,-(k.kickDir||1))}</b><br>Tacklers: ${k.tacklers.length?k.tacklers.map(x=>'#'+esc(x)).join(', '):'—'}</div><div class="form-row"><button class="btn btn-light" id="touchbackReturn">Touchback</button><button class="btn btn-light" id="kickReturnTD">${k.returnTD?'✓ Return TD':'Return TD'}</button><button class="btn btn-primary" id="finishKickoff" ${k.returnEnd==null?'disabled':''}>Finish Kickoff</button></div>`
}
function recentRows(g,t){return [...g.plays].reverse().slice(0,25).map((p,i)=>{const n=g.plays.length-i,team=p.team||p.before?.poss||'team',tm=teamSide(g,t,team),abbr=teamAbbr(tm.name),period=p.period||p.before?.period||1,yds=Number.isFinite(p.yds)?(p.yds>0?'+':'')+p.yds:'';return `<div class="play-row" data-play="${p.id}" style="--play-team:${tm.color};color:#132D36"><div class="play-num">${n}</div><div class="play-period">Q${period}</div><div class="play-time">${esc(p.time||'')}</div><div class="play-team"><b>${abbr}</b></div><div class="desc">${esc(p.desc||'')}</div><div class="yds ${Number(p.yds)>0?'gain':Number(p.yds)<0?'loss':''}">${yds}</div></div>`}).join('')||'<div class="empty">No plays yet.</div>'}


function playTeamName(g,t,p){
 const side=p.team||p.before?.poss||'team';
 return teamSide(g,t,side).name
}
function playPeriodLabel(g,p){
 const n=p.period||p.before?.period||1;
 return g.format==='halves'?`H${n}`:`Q${n}`
}
function allPlayRows(g,t){
 if(!(g.plays||[]).length)return `<div class="allplays-empty">No plays recorded yet.</div>`;
 return [...g.plays].map((p,i)=>{
   const side=p.team||p.before?.poss||'team';
   const tm=teamSide(g,t,side);
   const y=Number.isFinite(p.yds)?p.yds:statYards(p);
   const defenders=(p.defenders||[]).map(d=>`#${esc(d.n)} ${esc(d.action)}`).join(' · ');
   return `<div class="allplay-row" data-allplay="${p.id}" style="--play-team:${tm.color}">
     <div class="allplay-num">${i+1}</div>
     <div class="allplay-period">${playPeriodLabel(g,p)}</div>
     <div class="allplay-team">${teamAbbr(tm.name)}</div>
     <div class="allplay-main">
       <div class="allplay-desc">${esc(p.desc||p.kind||'Play')}</div>
       ${defenders?`<div class="allplay-defense">${defenders}</div>`:''}
     </div>
     <div class="allplay-yards">${Number.isFinite(y)?(y>0?'+':'')+y:''}</div>
     <button class="btn btn-light allplay-edit" data-edit-allplay="${p.id}">Edit</button>
   </div>`
 }).join('')
}
function showAllPlays(g,t){
 showModal(`<div class="allplays-modal">
   <div class="allplays-head">
     <div><div class="eyebrow">GAME LOG</div><h2>All Plays</h2><p>${esc(t.name)} vs ${esc(g.opponent)} · ${g.plays.length} recorded plays</p></div>
     <button class="btn btn-light" id="closeAllPlays">Close</button>
   </div>
   <div class="allplays-tools">
     <input id="playSearch" placeholder="Search plays, player numbers, tackles..." autocomplete="off">
     <select id="playPeriodFilter"><option value="">All periods</option>${Array.from({length:g.format==='halves'?2:4},(_,i)=>`<option value="${i+1}">${g.format==='halves'?'Half':'Quarter'} ${i+1}</option>`).join('')}</select>
     <select id="playTeamFilter"><option value="">Both teams</option><option value="team">${esc(t.name)}</option><option value="opp">${esc(g.opponent)}</option></select>
   </div>
   <div class="allplays-list" id="allPlaysList">${allPlayRows(g,t)}</div>
 </div>`);
 $('#closeAllPlays').onclick=closeModal;

 const apply=()=>{
   const q=($('#playSearch')?.value||'').trim().toLowerCase();
   const per=$('#playPeriodFilter')?.value||'';
   const team=$('#playTeamFilter')?.value||'';
   $$('.allplay-row').forEach(row=>{
     const p=g.plays.find(x=>x.id===row.dataset.allplay);
     const txt=row.textContent.toLowerCase();
     const pper=String(p?.period||p?.before?.period||1);
     const pteam=p?.team||p?.before?.poss||'team';
     row.style.display=(!q||txt.includes(q))&&(!per||pper===per)&&(!team||pteam===team)?'grid':'none'
   })
 };
 $('#playSearch').oninput=apply;
 $('#playPeriodFilter').onchange=apply;
 $('#playTeamFilter').onchange=apply;
 $$('[data-edit-allplay]').forEach(b=>b.onclick=()=>{
   const id=b.dataset.editAllplay;
   closeModal();
   showPlayEditor(g,t,id)
 });
 $$('.allplay-row').forEach(row=>row.addEventListener('click',e=>{if(e.target.closest('[data-edit-allplay]'))return;const id=row.dataset.allplay;closeModal();showPlayEditor(g,t,id)}))
}
function defenderEditorRows(p){
 const defs=p.defenders||[];
 return defs.length?defs.map((d,i)=>{
   const action=d.action==='Assist'?'Tackle':d.action;
   const credit=Number(d.credit??(d.action==='Assist'?0.5:1));
   return `<div class="retro-defender-row">
   <input class="retro-def-num" data-def-i="${i}" inputmode="numeric" value="${esc(d.n||'')}" placeholder="#">
   <select class="retro-def-action" data-def-i="${i}">${['Tackle','Sack','Pressure','Hurry','Missed'].map(a=>`<option ${action===a?'selected':''}>${a}</option>`).join('')}</select>
   <select class="retro-def-credit" data-def-i="${i}"><option value="1" ${credit===1?'selected':''}>1.0</option><option value="0.5" ${credit===0.5?'selected':''}>0.5</option></select>
   <button class="btn btn-light retro-remove-def" data-remove-def="${i}">Remove</button>
 </div>`}).join(''):`<div class="retro-empty-defense">No defenders recorded on this play.</div>`
}

function offensiveEditFields(p){
 const parsed=parsedPlayPlayers(p);
 if(p.kind==='Run')return `<div class="retro-grid">
   <div class="retro-field"><label>Ball Carrier #</label><input id="retroPlayer" inputmode="numeric" value="${esc(parsed.player||'')}"></div>
   <div class="retro-field"><label>Fumble</label><select id="retroFumble"><option value="no" ${!p.fumble?'selected':''}>No</option><option value="Offense" ${p.fumble&&p.fumbleRecovery==='Offense'?'selected':''}>Yes · Recovered by Offense</option><option value="Defense" ${p.fumble&&p.fumbleRecovery==='Defense'?'selected':''}>Yes · Recovered by Defense</option></select></div>
 </div>`;
 if(p.kind==='Pass')return `<div class="retro-grid">
   <div class="retro-field"><label>QB #</label><input id="retroQB" inputmode="numeric" value="${esc(parsed.qb||'')}"></div>
   <div class="retro-field"><label>Receiver #</label><input id="retroReceiver" inputmode="numeric" value="${esc(parsed.receiver||'')}"></div>
   <div class="retro-field"><label>Pass Result</label><select id="retroPassResult">${['Complete','Incomplete','Interception','Sack'].map(x=>`<option ${parsed.result===x?'selected':''}>${x}</option>`).join('')}</select></div>
   <div class="retro-field"><label>Fumble</label><select id="retroFumble"><option value="no" ${!p.fumble?'selected':''}>No</option><option value="Offense" ${p.fumble&&p.fumbleRecovery==='Offense'?'selected':''}>Yes · Recovered by Offense</option><option value="Defense" ${p.fumble&&p.fumbleRecovery==='Defense'?'selected':''}>Yes · Recovered by Defense</option></select></div>
 </div>`;
 return `<div class="retro-note">This is a ${esc(p.kind||'special teams')} play. You can correct the description, period, statistical yardage, and defensive actions below.</div>`
}
function showPlayEditor(g,t,id){
 const p=g.plays.find(x=>x.id===id);
 if(!p){toast('Play not found.');return showAllPlays(g,t)}
 const originalYds=Number.isFinite(p.yds)?p.yds:statYards(p);
 const period=p.period||p.before?.period||1;
 showModal(`<div class="retro-edit-modal">
   <div class="retro-edit-head">
     <div><div class="eyebrow">EDIT RECORDED PLAY</div><h2>Play ${g.plays.indexOf(p)+1} · ${esc(p.kind||'Play')}</h2><p>${esc(playTeamName(g,t,p))} · ${playPeriodLabel(g,p)}</p></div>
     <button class="btn btn-light" id="cancelRetroEdit">Back to All Plays</button>
   </div>

   <div class="retro-section">
     <h3>Play Details</h3>
     <div class="retro-grid">
       <div class="retro-field"><label>Period</label><select id="retroPeriod">${Array.from({length:g.format==='halves'?2:4},(_,i)=>`<option value="${i+1}" ${period===i+1?'selected':''}>${g.format==='halves'?'Half':'Quarter'} ${i+1}</option>`).join('')}</select></div>
       <div class="retro-field"><label>Statistical Yards</label><input id="retroYards" type="number" value="${originalYds}"><small>Changing this updates the stored end spot for statistics; it does not rewind current game state.</small></div>
     </div>
     ${offensiveEditFields(p)}
     <div class="retro-field"><label>Description</label><textarea id="retroDesc" rows="3">${esc(p.desc||'')}</textarea></div>
   </div>

   <div class="retro-section">
     <div class="retro-section-head"><div><h3>Defense</h3><p>Add or correct tackles, assists, sacks, pressures, hurries, and missed tackles.</p></div></div>
     <div id="retroDefenders">${defenderEditorRows(p)}</div>
     <div class="retro-add-defense">
       <input id="retroNewDefender" inputmode="numeric" placeholder="Defender #">
       <select id="retroNewAction"><option>Tackle</option><option>Sack</option><option>Pressure</option><option>Hurry</option><option>Missed</option></select>
       <select id="retroNewCredit"><option value="1">1.0</option><option value="0.5">0.5</option></select>
       <button class="btn btn-light" id="retroAddDefender">+ Add Defender</button>
     </div>
   </div>

   <div class="retro-savebar">
     <button class="btn btn-light" id="retroBack">Cancel</button>
     <button class="btn btn-primary" id="retroSave">Save Corrections</button>
   </div>
 </div>`);

 const collectDefenders=()=>{
   const defs=[];
   $$('.retro-defender-row').forEach(row=>{
     const n=row.querySelector('.retro-def-num')?.value.trim();
     let action=row.querySelector('.retro-def-action')?.value;
     const credit=Number(row.querySelector('.retro-def-credit')?.value||1);
     if(action==='Assist')action='Tackle';
     if(n)defs.push({n,action,credit:(action==='Tackle'||action==='Sack')?credit:1})
   });
   return defs
 };
 const rerenderDefs=(defs)=>{
   p.defenders=defs;
   $('#retroDefenders').innerHTML=defenderEditorRows(p);
   bindDefRows()
 };
 const bindDefRows=()=>{
   $$('.retro-remove-def').forEach(b=>b.onclick=()=>{
     const defs=collectDefenders();
     defs.splice(Number(b.dataset.removeDef),1);
     rerenderDefs(defs)
   })
 };
 bindDefRows();

 $('#retroAddDefender').onclick=()=>{
   const n=$('#retroNewDefender').value.trim();
   if(!n)return toast('Enter a defender number.');
   const defs=collectDefenders();
   defs.push({n,action:$('#retroNewAction').value,credit:Number($('#retroNewCredit')?.value||1)});
   $('#retroNewDefender').value='';
   rerenderDefs(defs)
 };

 const back=()=>{closeModal();showAllPlays(g,t)};
 $('#cancelRetroEdit').onclick=back;
 $('#retroBack').onclick=back;

 $('#retroSave').onclick=()=>{
   p.period=Number($('#retroPeriod').value)||period;
   const y=Number($('#retroYards').value);
   if(Number.isFinite(y)){
     const dir=p.before?.driveDir??1;
     const start=Number.isFinite(p.start)?p.start:(p.before?.los??0);
     p.start=start;
     p.end=clamp(start+y*dir);
     p.yds=y;
   }

   if(p.kind==='Run'){
     p.player=$('#retroPlayer')?.value.trim()||'';
   }
   if(p.kind==='Pass'){
     p.qb=$('#retroQB')?.value.trim()||'';
     p.receiver=$('#retroReceiver')?.value.trim()||'';
     p.passResult=$('#retroPassResult')?.value||p.passResult||'Complete';
   }
   if($('#retroFumble')){
     const f=$('#retroFumble').value;
     p.fumble=f!=='no';
     p.fumbleRecovery=f==='no'?null:f;
   }

   p.defenders=collectDefenders();
   p.desc=$('#retroDesc').value.trim()||p.desc;

   save();
   closeModal();
   toast('Play corrections saved.');
   renderGame(g.id);
   showAllPlays(g,t)
 }
}

function resetGameState(g){
 const openingKick=g.openingKick||'team';
 const receiving=other(openingKick);
 const kickoffYard=g.kickoffYard||40;
 g.teamScore=0;g.gameOver=false;
 g.oppScore=0;
 g.period=1;
 g.down=1;
 g.toGo=10;
 g.los=20;
 g.poss=receiving;
 g.plays=[];
 g.awaitingTry=false;g.puntPending=false;g.punt=null;
 g.tryType=null;
 g.driveDir=1;
 g.kickoffPending=true;
 g.kickoff={
   phase:'kick',
   kickingTeam:openingKick,
   receivingTeam:receiving,
   startYard:kickoffYard,
   kickDir:1,
   startSpot:kickoffYard,
   landing:null,
   returnEnd:null,
   kicker:'',
   returner:'',
   tacklers:[],
   touchback:false
 };
 selectedPlayId=null;
}


function beginHalftimeKickoff(g){
 const openingKicker=g.openingKick||'team';
 const secondHalfKicker=other(openingKicker);
 const secondHalfReceiver=openingKicker;
 const from=g.kickoffYard||40;
 const kickDir=1;

 g.awaitingTry=false;
 g.tryType=null;
 g.kickoffPending=true;
 g.poss=secondHalfReceiver;
 g.down=1;
 g.toGo=10;
 g.driveDir=-1;
 g.kickoff={
   phase:'kick',
   kickingTeam:secondHalfKicker,
   receivingTeam:secondHalfReceiver,
   startYard:from,
   kickDir,
   startSpot:screenSpot(from,kickDir),
   landing:null,
   returnEnd:null,
   kicker:'',
   returner:'',
   tacklers:[],
   touchback:false,
   halftime:true
 };
 g.los=g.kickoff.startSpot;
 currentPlay=defaultPlay(g);
 selectedSt='Kickoff';
}


function isMobileGameLayout(){
 return window.innerWidth<=900;
}
function important(el,prop,val){
 if(el)el.style.setProperty(prop,val,'important');
}
function composeMobileGameLayout(){
 const page=document.querySelector('.game-page');
 if(!page||!isMobileGameLayout())return false;

 page.classList.add('mobile-game-active');
 document.body.classList.add('mobile-game-active');

 // Remove both decorative brand areas from the live scoring screen.
 document.querySelector('.topbar')?.remove();
 page.querySelector('.game-brand')?.remove();

 const top=page.querySelector('.game-top');
 const main=page.querySelector('.main-grid');
 const workbench=page.querySelector('.workbench');
 const fieldPanel=page.querySelector('.field-panel');
 const recent=page.querySelector('.recent-panel');
 if(!top||!main||!workbench||!fieldPanel)return false;

 // Exactly five mobile game actions.
 const nav=top.querySelector('.nav-strip');
 if(nav){
   [...nav.children].forEach(b=>{
     if(!['gamePlays','mobileUndo','mobileNotes','gameAnalytics','gameControl'].includes(b.id))b.remove();
   });
   const a=nav.querySelector('#gameAnalytics');
   if(a){
     const ico=a.querySelector('.ico')?.outerHTML||'<span class="ico">▥</span>';
     a.innerHTML=ico+'Stats';
   }
 }

 // Move live field state/LOS controls into the compact mobile scoreboard.
 // This preserves the existing functional controls/IDs while removing the large block below the field.
 const mobileFieldControls=fieldPanel.querySelector('.field-controls');
 if(mobileFieldControls){
   mobileFieldControls.classList.add('mobile-status-strip');
   top.insertBefore(mobileFieldControls,nav||null);
 }

 const off=workbench.querySelector('.pane.off');
 const def=workbench.querySelector('.pane.def');
 const st=workbench.querySelector('.pane.st');
 const pen=workbench.querySelector('.pane.pen');
 if(!off||!def||!st||!pen)return false;

 const root=document.createElement('section');
 root.className='mobile-score-workspace';
 const left=document.createElement('div');left.className='mobile-score-side mobile-score-left';
 const center=document.createElement('div');center.className='mobile-score-center';
 const right=document.createElement('div');right.className='mobile-score-side mobile-score-right';
 left.append(off,st);
 const fieldSave=document.createElement('button');
 fieldSave.id='mobileFieldSave';fieldSave.type='button';fieldSave.className='mobile-field-save';
 fieldSave.innerHTML='<span class="field-save-icon">✓</span><span>Save Play</span>';
 center.append(fieldSave,fieldPanel);
 right.append(def,pen);root.append(left,center,right);
 main.replaceWith(root);workbench.remove();recent?.remove();

 // Geometry is applied inline with !important so it cannot be defeated by
 // legacy desktop/mobile CSS or a stale stylesheet.
 important(page,'padding','4px 4px 70px');
 important(page,'max-width','none');
 important(top,'display','grid');
 important(top,'grid-template-columns','minmax(0,1fr) 76px minmax(0,1fr)');
 important(top,'grid-template-rows','52px 38px 42px');
 important(top,'gap','2px');
 important(top,'padding','3px');
 important(top,'position','sticky');
 important(top,'top','0');
 important(top,'z-index','50');

 // v0.41.4: old <=760px rules were still forcing .game-state to grid-column:1/-1
 // and order:-1. Explicitly place all three scoreboard cells in row 1.
 const scoreCards=[...top.querySelectorAll('.score-card')];
 const gameState=top.querySelector('.game-state');
 if(scoreCards[0]){
   important(scoreCards[0],'grid-column','1');
   important(scoreCards[0],'grid-row','1');
   important(scoreCards[0],'order','0');
 }
 if(gameState){
   important(gameState,'grid-column','2');
   important(gameState,'grid-row','1');
   important(gameState,'order','0');
 }
 if(scoreCards[1]){
   important(scoreCards[1],'grid-column','3');
   important(scoreCards[1],'grid-row','1');
   important(scoreCards[1],'order','0');
 }
 scoreCards.forEach(card=>{
   important(card,'height','52px');important(card,'min-height','52px');
   important(card,'padding','4px 6px');important(card,'border-radius','7px');
   important(card,'display','flex');important(card,'align-items','center');
   important(card,'justify-content','space-between');important(card,'overflow','hidden');
   const label=card.querySelector('.team-label');
   const value=card.querySelector('.score-value');
   if(label){important(label,'font-size','9px');important(label,'line-height','1.05');important(label,'max-width','72%');important(label,'overflow','hidden')}
   if(value){important(value,'font-size','24px');important(value,'line-height','1')}
 });
 if(gameState){
   important(gameState,'height','52px');important(gameState,'min-height','52px');
   important(gameState,'padding','2px');important(gameState,'border-radius','7px');
   important(gameState,'display','flex');important(gameState,'flex-direction','column');
   important(gameState,'align-items','center');important(gameState,'justify-content','center');
   const period=gameState.querySelector('.period');
   const next=gameState.querySelector('.period-next');
   const down=gameState.querySelector('.downline');
   const pos=gameState.querySelector('.pos');
   if(period){important(period,'font-size','11px');important(period,'line-height','1')}
   if(next){important(next,'width','20px');important(next,'height','20px');important(next,'font-size','13px');important(next,'padding','0')}
   if(down){important(down,'display','block');important(down,'font-size','10px');important(down,'line-height','1');important(down,'white-space','nowrap')}
   if(pos){important(pos,'display','block');important(pos,'font-size','7px');important(pos,'line-height','1');important(pos,'white-space','nowrap')}
 }

 if(mobileFieldControls){
   important(mobileFieldControls,'grid-column','1 / -1');
   important(mobileFieldControls,'grid-row','2');
   important(mobileFieldControls,'order','0');
   important(mobileFieldControls,'display','grid');
   important(mobileFieldControls,'grid-template-columns','1.75fr .85fr .55fr .48fr .55fr');
   important(mobileFieldControls,'gap','2px');important(mobileFieldControls,'margin','0');
   important(mobileFieldControls,'padding','2px');important(mobileFieldControls,'height','38px');
   important(mobileFieldControls,'overflow','hidden');
   [...mobileFieldControls.querySelectorAll('.mini')].forEach(m=>{
     important(m,'min-width','0');important(m,'width','auto');important(m,'height','34px');
     important(m,'min-height','34px');important(m,'padding','2px 3px');important(m,'overflow','hidden');
     const small=m.querySelector('small'); const bold=m.querySelector('b');
     if(small){important(small,'font-size','5.5px');important(small,'line-height','1');important(small,'white-space','nowrap')}
     if(bold){important(bold,'font-size','9px');important(bold,'line-height','1')}
   });
   const los=mobileFieldControls.querySelector('.los-control');
   if(los){
     important(los,'display','grid');important(los,'grid-template-columns','1fr .72fr .72fr');
     important(los,'gap','1px');important(los,'align-items','center');
     [...los.children].forEach(x=>{
       important(x,'min-width','0');important(x,'width','100%');important(x,'height','21px');
       important(x,'padding','0 1px');important(x,'font-size','7px');important(x,'margin','0');
     });
   }
 }
 if(nav){
   important(nav,'grid-row','3');

   important(nav,'grid-column','1 / -1');
   important(nav,'display','grid');
   important(nav,'grid-template-columns','repeat(5,minmax(0,1fr))');
   important(nav,'gap','4px');
   important(nav,'overflow','hidden');
   important(nav,'height','42px');important(nav,'min-height','42px');important(nav,'padding','1px');
   [...nav.children].forEach(b=>{
     important(b,'display','flex');important(b,'width','auto');important(b,'min-width','0');
     important(b,'height','40px');important(b,'min-height','40px');
     important(b,'padding','1px');important(b,'font-size','8px');important(b,'gap','1px');
   });
 }

 important(root,'display','grid');
 important(root,'grid-template-columns','minmax(0,.82fr) 112px minmax(0,.94fr)');
 important(root,'gap','4px');
 important(root,'align-items','start');
 important(root,'width','100%');
 important(root,'min-width','0');

 [left,right].forEach(side=>{
   important(side,'display','grid');important(side,'grid-template-columns','minmax(0,1fr)');
   important(side,'gap','5px');important(side,'align-content','start');important(side,'min-width','0');
 });
 important(center,'min-width','0');

 [off,def,st,pen].forEach(p=>{
   important(p,'position','static');important(p,'inset','auto');important(p,'float','none');
   important(p,'width','auto');important(p,'max-width','none');important(p,'min-width','0');
   important(p,'min-height','0');important(p,'height','auto');important(p,'margin','0');
   important(p,'overflow','hidden');
   const body=p.querySelector('.pane-body');
   if(body){important(body,'padding','5px');important(body,'max-height','none');important(body,'overflow','hidden')}
 });

 // v0.42.4: icon geometry is controlled here because legacy CSS from earlier mobile
 // iterations was still winning on some iPhones. These are deliberately compact.
 [...off.querySelectorAll('.icon-action-btn')].forEach(b=>{
   important(b,'width','38px');important(b,'height','38px');important(b,'min-width','38px');
   important(b,'min-height','38px');important(b,'flex','0 0 38px');important(b,'padding','3px');
   important(b,'aspect-ratio','auto');
   const img=b.querySelector('.play-action-icon');
   if(img){important(img,'width','30px');important(img,'height','30px')}
 });
 [...def.querySelectorAll('.icon-action-btn')].forEach(b=>{
   important(b,'width','34px');important(b,'height','34px');important(b,'min-width','34px');
   important(b,'min-height','34px');important(b,'flex','0 0 34px');important(b,'padding','2px');
   important(b,'aspect-ratio','auto');
   const img=b.querySelector('.play-action-icon');
   if(img){important(img,'width','28px');important(img,'height','28px')}
 });
 [off.querySelector('.icon-action-grid'),def.querySelector('.defense-icon-grid')].filter(Boolean).forEach(grid=>{
   important(grid,'display','flex');important(grid,'flex-wrap','wrap');
   important(grid,'grid-template-columns','none');important(grid,'gap','3px');
   important(grid,'justify-content','flex-start');important(grid,'width','100%');
 });
 const badSnap=off.querySelector('.bad-snap-toggle');
 if(badSnap){important(badSnap,'width','38px');important(badSnap,'height','38px');important(badSnap,'min-width','38px')}

 important(fieldPanel,'width','100%');important(fieldPanel,'min-width','0');important(fieldPanel,'margin','0');important(fieldPanel,'padding','3px');
 const field=fieldPanel.querySelector('.field');
 if(field){
   important(field,'width','100%');important(field,'height','535px');important(field,'min-height','535px');
   important(field,'margin','0');important(field,'border-width','3px');
 }

 // Never restore the user's prior desktop scroll position into a different mobile geometry.

 requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
 return true;
}

function bindMobilePaneCollapse(g){
 if(!document.querySelector('.mobile-score-workspace'))return;
 const panes=[
   document.querySelector('.pane.off'),
   document.querySelector('.pane.def'),
   document.querySelector('.pane.st'),
   document.querySelector('.pane.pen')
 ].filter(Boolean);

 panes.forEach(p=>{
   const title=p.querySelector('.pane-title');
   const body=p.querySelector('.pane-body');
   if(!title||!body)return;

   title.setAttribute('role','button');
   title.setAttribute('tabindex','0');

   const glyph=()=>{
     let x=title.querySelector('.mobile-collapse-glyph');
     if(!x){x=document.createElement('span');x.className='mobile-collapse-glyph';title.appendChild(x)}
     return x;
   };
   const setCollapsed=(collapsed)=>{
     p.classList.toggle('mobile-collapsed',collapsed);
     p.classList.toggle('mobile-open',!collapsed);
     body.style.setProperty('display',collapsed?'none':'block','important');
     glyph().textContent=collapsed?'+':'−';
     title.setAttribute('aria-expanded',String(!collapsed));
   };

   // Penalty starts closed. Other panes remain open so no current workflow is hidden.
   setCollapsed(p.classList.contains('pen'));

   // bindGame has already run, so this cannot be overwritten afterward.
   title.onclick=(e)=>{
     e.preventDefault();
     e.stopPropagation();
     setCollapsed(!p.classList.contains('mobile-collapsed'));
   };
   title.onkeydown=(e)=>{
     if(e.key==='Enter'||e.key===' '){
       e.preventDefault();
       e.stopPropagation();
       setCollapsed(!p.classList.contains('mobile-collapsed'));
     }
   };
 });
}

function bindGame(g,t){
 if(g.kickoffPending||g.puntPending)mobilePaneOpen='st';
 const syncMobilePanes=()=>{
   $$('.pane[data-pane]').forEach(p=>{
     const open=p.dataset.pane===mobilePaneOpen;
     p.classList.toggle('mobile-open',open);
     p.classList.toggle('mobile-collapsed',!open);
     const c=p.querySelector('.pane-chevron');if(c)c.textContent=open?'⌃':'⌄'
   })
 };
 $$('[data-pane-toggle]').forEach(b=>b.onclick=()=>{
   const pane=b.dataset.paneToggle;
   mobilePaneOpen=mobilePaneOpen===pane?'':pane;
   syncMobilePanes()
 });
 syncMobilePanes();
 const analyticsBtn=$('#gameAnalytics');
 if(analyticsBtn){
   analyticsBtn.onclick=null;
   analyticsBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showGameAnalytics(g,t)})
 }
 if($('#gameControl'))$('#gameControl').onclick=()=>showGameControl(g,t);
 if($('#gameDrives'))$('#gameDrives').onclick=()=>showDriveSummary(g,t);
 if($('#gamePlays'))$('#gamePlays').onclick=()=>showAllPlays(g,t);
 if($('#mobileUndo'))$('#mobileUndo').onclick=()=>undoPlay(g);
 if($('#mobileSave'))$('#mobileSave').onclick=()=>savePlay(g,t);
 if($('#mobileFieldSave'))$('#mobileFieldSave').onclick=()=>savePlay(g,t);
 const openNotes=()=>showPlayNotes(g,t);
 if($('#mobileNotes'))$('#mobileNotes').onclick=openNotes;
 if($('#playNotes'))$('#playNotes').onclick=openNotes;
 if($('#allPlays'))$('#allPlays').onclick=()=>showAllPlays(g,t);
 if($('#resetGame'))$('#resetGame').onclick=()=>{
   const ok=confirm(`Are you sure you want to reset this game against ${g.opponent}?\n\nThis will permanently clear all plays, scores, penalties, and game progress. The game itself will remain on the schedule.`);
   if(!ok)return;
   resetGameState(g);
   save();
   toast('Game reset');
   renderGame(g.id);
 };
 if($('#deleteGame'))$('#deleteGame').onclick=()=>{
   const ok=confirm(`Are you sure you want to DELETE this game against ${g.opponent}?\n\nThis will permanently delete the game and all recorded plays and statistics. This cannot be undone.`);
   if(!ok)return;
   const teamId=g.teamId;
   state.games=state.games.filter(x=>x.id!==g.id);
   save();
   location.hash='#team/'+teamId;
 };
 const sy=sideYard(relSpot(g.los,g.driveDir||1));$('#losSide').value=sy.side;$('#losYard').value=sy.yard;
 $('#setLos').onclick=()=>{if(g.kickoffPending)return toast('Finish the kickoff first.');if(g.puntPending)return toast('Finish the punt first.');const side=$('#losSide').value,y=+$('#losYard').value||0;const rel=side==='50'?50:side==='OWN'?y:100-y;g.los=screenSpot(rel,g.driveDir||1);g.los=clamp(g.los);currentPlay.end=g.los;save();renderGame(g.id)};
 if($('#savePlay'))$('#savePlay').onclick=()=>savePlay(g,t);
 if($('#clearPlay'))$('#clearPlay').onclick=()=>renderGame(g.id);
 if($('#undoPlay'))$('#undoPlay').onclick=()=>undoPlay(g);
 if($('#editPlay'))$('#editPlay').onclick=()=>editSelected(g);
 if($('#nextPeriod'))$('#nextPeriod').onclick=()=>{
   const max=g.format==='halves'?2:4;
   if(g.period>=max){
     if(g.gameOver)return toast('Game is already final.');
     const team=teamSide(g,t,'team'),opp=teamSide(g,t,'opp');
     if(g.teamScore===g.oppScore&&!g.overtime){
       if(confirm(`The game is tied ${g.teamScore}-${g.oppScore}. Start overtime?`)){g.overtime=1;g.down=1;g.toGo=10;save();toast('Overtime started');renderGame(g.id);return}
     }
     showGameValidation(g,t,()=>{g.gameOver=true;save();toast('Game marked final.');renderGame(g.id)});return
   }
   const fromPeriod=g.period,toPeriod=g.period+1;
   const secondHalfBoundary=(g.format==='quarters'&&fromPeriod===2&&toPeriod===3)||(g.format==='halves'&&fromPeriod===1&&toPeriod===2);
   if(secondHalfBoundary){
     const secondHalfKicker=other(g.openingKick||'team'),secondHalfReceiver=g.openingKick||'team';
     const kickerName=teamSide(g,t,secondHalfKicker).name,receiverName=teamSide(g,t,secondHalfReceiver).name;
     if(!confirm(`Advance to ${g.format==='halves'?'2nd half':'Q3'} and begin the second-half kickoff?\n\n${kickerName} kicks to ${receiverName}.`))return;
     g.period=toPeriod;beginHalftimeKickoff(g);applyPendingPenalties(g);save();toast(`${g.format==='halves'?'2nd half':'Q3'} · ${kickerName} kicks to ${receiverName}`);renderGame(g.id);return
   }
   const label=g.format==='halves'?`Half ${toPeriod}`:`Q${toPeriod}`;
   if(!confirm(`Advance to ${label}?`))return;
   g.period=toPeriod;applyPendingPenalties(g);save();toast(`Advanced to ${label}`);renderGame(g.id)
 };
 $$('.play-row').forEach(r=>r.onclick=()=>{selectedPlayId=r.dataset.play;$$('.play-row').forEach(x=>x.style.outline=x.dataset.play===selectedPlayId?'2px solid #00D4FF':'none')});
 if(!g.kickoffPending){bindOffense(g);bindDefense(g);bindPenalty(g);bindSpecial(g)}
 bindKickoff(g,t);
}

function bindOffense(g){
 $$('#playTypes button').forEach(b=>b.onclick=()=>{
   $$('#playTypes button').forEach(x=>x.classList.remove('active'));
   b.classList.add('active');
   currentPlay.type=b.dataset.type;
   $('#offDynamic').innerHTML=currentPlay.type==='Pass'?passFields(g):runFields(g);
   bindOffDynamic(g)
 });
 bindOffDynamic(g);
 if($('#offScore')){
   $$('#offScore [data-score]').forEach(b=>b.onclick=()=>{
     $$('#offScore [data-score]').forEach(x=>x.classList.remove('active'));
     b.classList.add('active');
     const score=b.dataset.score||null;
     if(score==='2PT'){
       g.awaitingTry=true;
       g.tryType='2PT';
       g.los=screenSpot(95,g.driveDir||1);
       g.down=1;
       g.toGo=5;
       save();
       renderGame(g.id);
       return;
     }
     currentPlay.score=score
   });
 }
 if($('#tryResult')){
   $$('#tryResult [data-try]').forEach(b=>b.onclick=()=>{
     $$('#tryResult [data-try]').forEach(x=>x.classList.remove('active'));
     b.classList.add('active');
     currentPlay.tryResult=b.dataset.try
   });
 }
 if($('#fumbleBtn'))$('#fumbleBtn').onclick=()=>{
   currentPlay.fumble=!currentPlay.fumble;
   $('#fumbleBtn').classList.toggle('active',currentPlay.fumble);
   if(!currentPlay.fumble){
     currentPlay.fumbleRecovery=null;
     syncTurnoverState();
     return;
   }
   showFumbleDetails(g,detail=>{
     currentPlay.fumbleDetail=detail;
     currentPlay.fumbleRecovery=detail.recoveryTeam;
     syncTurnoverState();
     if($('#fumbleBtn')){$('#fumbleBtn').classList.add('active');$('#fumbleBtn').title=`Fumble · ${detail.recoveryTeam}${detail.recoverer?' #'+detail.recoverer:''}`;}
   })
 };
 $$('[data-memory-role]').forEach(b=>b.onclick=()=>{
   const role=b.dataset.memoryRole,n=b.dataset.memoryPlayer;
   if(role==='rb'){
     const run=$('#playTypes [data-type="Run"]');
     if(run&&!run.classList.contains('active'))run.click();
     if($('#player')){$('#player').value=n;currentPlay.player=n}
   }else if(role==='qb'){
     const pass=$('#playTypes [data-type="Pass"]');
     if(pass&&!pass.classList.contains('active'))pass.click();
     if($('#qb')){$('#qb').value=n;currentPlay.qb=n}
   }else if(role==='wr'){
     const pass=$('#playTypes [data-type="Pass"]');
     if(pass&&!pass.classList.contains('active'))pass.click();
     if($('#receiver')){$('#receiver').value=n;currentPlay.receiver=n}
   }
 });
}
function bindOffDynamic(g){
 if($('#player')){
   currentPlay.player=$('#player').value.trim();
   $('#player').oninput=e=>currentPlay.player=e.target.value.trim()
 }
 if($('#qb')){
   currentPlay.qb=$('#qb').value.trim();
   $('#qb').oninput=e=>currentPlay.qb=e.target.value.trim()
 }
 if($('#receiver')){
   currentPlay.receiver=$('#receiver').value.trim();
   $('#receiver').oninput=e=>currentPlay.receiver=e.target.value.trim()
 }

 if($('#badSnapBtn'))$('#badSnapBtn').onclick=()=>{
   currentPlay.badSnap??={active:false,center:'',notCaught:false,recoveredBy:null};
   currentPlay.badSnap.active=!currentPlay.badSnap.active;
   if(!currentPlay.badSnap.active){currentPlay.badSnap.notCaught=false;currentPlay.badSnap.recoveredBy=null}
   syncTurnoverState();$('#offDynamic').innerHTML=currentPlay.type==='Pass'?passFields(g):runFields(g);bindOffDynamic(g)
 };
 if($('#centerNum'))$('#centerNum').oninput=e=>currentPlay.badSnap.center=e.target.value.trim();
 $$('#snapCaught [data-caught]').forEach(b=>b.onclick=()=>{
   currentPlay.badSnap.notCaught=b.dataset.caught==='false';
   if(!currentPlay.badSnap.notCaught)currentPlay.badSnap.recoveredBy=null;
   syncTurnoverState();$('#offDynamic').innerHTML=currentPlay.type==='Pass'?passFields(g):runFields(g);bindOffDynamic(g)
 });
 $$('#snapRecovery [data-recovery]').forEach(b=>b.onclick=()=>{
   currentPlay.badSnap.recoveredBy=b.dataset.recovery;syncTurnoverState();
   $$('#snapRecovery [data-recovery]').forEach(x=>x.classList.toggle('active',x===b))
 });

 $$('#passResult button').forEach(b=>b.onclick=()=>{
   currentPlay.qb=$('#qb')?.value.trim()||currentPlay.qb;
   currentPlay.receiver=$('#receiver')?.value.trim()||currentPlay.receiver;
   currentPlay.passResult=b.textContent;
   if(currentPlay.passResult==='Interception'&&!currentPlay.interception)currentPlay.interception={phase:'catch',interceptor:'',catchSpot:currentPlay.end??g.los,returnEnd:null,returnTD:false,tacklers:[]};
   if(currentPlay.passResult!=='Interception')currentPlay.interception=null;
   syncTurnoverState();
   $('#offDynamic').innerHTML=passFields(g);bindOffDynamic(g)
 });

 if($('#interceptorNum'))$('#interceptorNum').oninput=e=>currentPlay.interception.interceptor=e.target.value.trim();
 if($('#lockInterception'))$('#lockInterception').onclick=()=>{
   const i=currentPlay.interception;i.interceptor=$('#interceptorNum')?.value.trim()||i.interceptor;
   if(!i.interceptor)return toast('Enter the interceptor number.');
   i.catchSpot=currentPlay.end??g.los;i.returnEnd=i.catchSpot;i.phase='return';currentPlay.end=i.returnEnd;
   $('#offDynamic').innerHTML=passFields(g);bindOffDynamic(g);drawField(g,teamById(g.teamId))
 };
 if($('#addIntTackler'))$('#addIntTackler').onclick=()=>{
   const n=$('#intTackler').value.trim();if(!n)return;
   currentPlay.interception.tacklers.push(n);$('#intTackler').value='';
   $('#offDynamic').innerHTML=passFields(g);bindOffDynamic(g)
 };
 if($('#intReturnTD'))$('#intReturnTD').onchange=e=>currentPlay.interception.returnTD=e.target.checked;

 $$('#sackCredit [data-credit]').forEach(b=>b.onclick=()=>{$$('#sackCredit [data-credit]').forEach(x=>x.classList.remove('active'));b.classList.add('active')});
 if($('#addSackCredit'))$('#addSackCredit').onclick=()=>{
   const n=$('#sackDefender').value.trim();if(!n)return toast('Enter defender number.');
   const credit=Number($('#sackCredit .active')?.dataset.credit||1);
   currentPlay.defenders.push({n,action:'Sack',credit});$('#sackDefender').value='';
   renderDefenders();$('#offDynamic').innerHTML=passFields(g);bindOffDynamic(g)
 }
}

function bindDefense(g){
 $$('#defCredit [data-credit]').forEach(b=>b.onclick=()=>{$$('#defCredit [data-credit]').forEach(x=>x.classList.remove('active'));b.classList.add('active')});
 $$('[data-def]').forEach(b=>b.onclick=()=>{
   const n=$('#defNum').value.trim();if(!n)return toast('Enter defender number.');
   const action=b.dataset.def,credit=(action==='Tackle'||action==='TFL'||action==='Sack')?Number($('#defCredit .active')?.dataset.credit||1):1;
   const yards=0;
   currentPlay.defenders.push({n,action,credit,yards});$('#defNum').value='';renderDefenders()
 });
 $$('[data-dscore]').forEach(b=>b.onclick=()=>{currentPlay.score=b.dataset.dscore;toast(`${b.textContent} selected`)});
 $$('[data-memory-role="def"]').forEach(b=>b.onclick=()=>{if($('#defNum')){$('#defNum').value=b.dataset.memoryPlayer;$('#defNum').focus()}})
}

function renderDefenders(){
 if(!$('#defList'))return;
 $('#defList').innerHTML=currentPlay.defenders.length
   ?currentPlay.defenders.map((d,i)=>`#${esc(d.n)} ${d.action}${(d.action==='Tackle'||d.action==='TFL'||d.action==='Sack')?' '+Number(d.credit??(d.action==='Assist'?0.5:1)).toFixed(1)+(d.action==='TFL'&&d.yards?' / '+d.yards+' yd':''):''}${i<currentPlay.defenders.length-1?' · ':''}`).join('')
   :'No defensive actions yet.'
}


function penaltyShiftForSide(g,p,dir){
 // Penalty "side" is relative to the offense of the play on which it will be enforced.
 return (p.side==='Offense'?-Number(p.yards||0):Number(p.yards||0))*(dir||1)
}
function pendingPenaltyText(g){
 const list=g.pendingPenalties||[];
 return list.length
   ?`<b>Pending for next play:</b> `+list.map((p,i)=>`${i+1}. ${esc(p.side)} ${esc(p.type)}${p.player?` #${esc(p.player)}`:''} ${p.yards} yd ${String(p.status||'accepted').toUpperCase()}`).join(' · ')
   :''
}
function applyPendingPenalties(g){
 const list=(g.pendingPenalties||[]).filter(p=>p.status==='accepted');
 if(!list.length){g.pendingPenalties=[];return false}
 if(g.kickoffPending&&g.kickoff){
   // Enforce on the kickoff itself. startYard is measured from the kicking team's goal line.
   let from=Number(g.kickoff.startYard??g.kickoffYard??40);
   for(const p of list){
     from+=p.side==='Offense'?-Number(p.yards||0):Number(p.yards||0);
   }
   from=Math.max(1,Math.min(50,from));
   g.kickoff.startYard=from;
   g.kickoff.startSpot=screenSpot(from,g.kickoff.kickDir||1);
   g.los=g.kickoff.startSpot;
 }else{
   // Scrimmage next play. Keep the down but move the ball and recompute distance to the existing line to gain.
   const dir=g.driveDir||1;
   const oldLos=g.los;
   const target=clamp(oldLos+dir*(g.toGo||10));
   let spot=oldLos;
   for(const p of list)spot=clamp(spot+penaltyShiftForSide(g,p,dir));
   g.los=spot;
   g.toGo=Math.max(1,Math.abs(target-spot));
 }
 g.pendingPenalties=[];
 return true
}

function bindPenalty(g){
 const activate=root=>{$$(root+' button').forEach(b=>b.onclick=()=>{$$(root+' button').forEach(x=>x.classList.remove('active'));b.classList.add('active')})};
 activate('#penSideToggle');activate('#penApplyToggle');activate('#penStatusToggle');

 const defaults={
   'Holding':{yards:10,side:'Offense',negate:true,repeat:false,auto:false},
   'False Start':{yards:5,side:'Offense',negate:true,repeat:true,auto:false},
   'Delay of Game':{yards:5,side:'Offense',negate:true,repeat:true,auto:false},
   'Offside':{yards:5,side:'Defense',negate:true,repeat:true,auto:false},
   'Illegal Formation':{yards:5,side:'Offense',negate:true,repeat:false,auto:false},
   'Illegal Motion':{yards:5,side:'Offense',negate:true,repeat:false,auto:false}
 };
 const setSide=side=>{$$('#penSideToggle button').forEach(b=>b.classList.toggle('active',b.dataset.penSide===side))};
 const applyDefaults=()=>{
   const d=defaults[$('#penType')?.value];if(!d)return;
   $('#penYards').value=d.yards;setSide(d.side);$('#negate').checked=d.negate;$('#repeatDown').checked=d.repeat;$('#autoFirst').checked=d.auto;$('#spotFoul').checked=false;toggleFoulSpot();
 };
 const toggleFoulSpot=()=>$('#foulSpotFields')?.classList.toggle('hidden',!$('#spotFoul')?.checked);
 $('#spotFoul').onchange=toggleFoulSpot;
 if($('#penType')){$('#penType').onchange=applyDefaults;applyDefaults()}
 toggleFoulSpot();

 const getFoulSpot=()=>{
   if(!$('#spotFoul').checked)return null;
   const side=$('#foulSpotSide').value;
   const yard=Math.max(0,Math.min(49,+$('#foulSpotYard').value||0));
   if(side==='50')return screenSpot(50,g.driveDir||1);
   const relative=side==='OWN'?yard:100-yard;
   return screenSpot(relative,g.driveDir||1);
 };
 const render=()=>{
   if(!$('#penSummary'))return;
   $('#penSummary').innerHTML=currentPlay.penalties.length
     ?currentPlay.penalties.map((p,i)=>`<div>${i+1}. ${p.side} ${p.type}${p.player?` #${esc(p.player)}`:''} ${p.yards} yd · ${p.status.toUpperCase()}${p.spotFoul&&p.foulSpot!=null?` · FOUL @ ${fmtDrive(p.foulSpot,g.driveDir||1)}`:''}${p.negate?' · PREVIOUS LOS':''}${p.repeatDown?' · REPEAT DOWN':''}</div>`).join('')
     :'No penalties applied.';
   if($('#pendingPenSummary'))$('#pendingPenSummary').innerHTML=pendingPenaltyText(g);
 };
 $('#attachPenalty').onclick=()=>{
   const spotChecked=$('#spotFoul').checked;
   if(spotChecked&&$('#foulSpotSide').value!=='50'&&$('#foulSpotYard').value==='')return toast('Enter the spot of the foul.');
   const p={
     side:$('#penSideToggle .active')?.dataset.penSide||'Offense',
     applyTo:$('#penApplyToggle .active')?.dataset.apply||'current',
     status:$('#penStatusToggle .active')?.dataset.status||'accepted',
     type:$('#penType').value,
     yards:+$('#penYards').value||0,
     player:$('#penPlayer').value.trim(),
     spotFoul:spotChecked,
     foulSpot:getFoulSpot(),
     negate:$('#negate').checked,
     repeatDown:$('#repeatDown').checked,
     autoFirst:$('#autoFirst').checked
   };
   if(p.applyTo==='next'){
     // Dead-ball / succeeding-spot foul. Keep it with the game state until the next play is established.
     p.spotFoul=false;p.foulSpot=null;p.negate=false;p.repeatDown=false;p.autoFirst=false;
     g.pendingPenalties??=[];g.pendingPenalties.push(structuredClone(p));
     save();render();toast('Penalty will be enforced on the next play.');return;
   }
   if(p.applyTo==='former'){
     const former=g.plays[g.plays.length-1];if(!former)return toast('There is no former play to apply the penalty to.');
     former.penalties??=[];former.penalties.push(structuredClone(p));
     former.desc+=` · PEN ${p.side} ${p.type}${p.player?` #${p.player}`:''} ${p.yards}yd ${p.status.toUpperCase()}`;
     if(p.status==='accepted')enforceFormerPenalty(g,former,p);save();toast('Penalty applied to former play');renderGame(g.id);return;
   }
   currentPlay.penalties.push(p);render();toast('Penalty attached to current play');
 };
 $('#clearPenalty').onclick=()=>{currentPlay.penalties=[];render()}
}
function enforceFormerPenalty(g,former,p){
 if(p.status!=='accepted')return;
 const dir=former.before?.driveDir??g.driveDir??1;
 const before=former.before||snapshot(g);
 const originalTarget=clamp((before.los??g.los)+dir*(before.toGo??g.toGo));
 const previousLos=before.los??g.los;
 const currentSpot=g.los;

 // No-play / negated-yardage penalties enforce from the previous line of scrimmage.
 // Spot-foul penalties use the recorded end/ball spot. Otherwise use the current post-play spot.
 let base=p.spotFoul&&p.foulSpot!=null?p.foulSpot:(p.negate?previousLos:currentSpot);
 const shift=(p.side==='Offense'?-p.yards:p.yards)*dir;
 const enforced=clamp(base+shift);

 if(p.repeatDown){
   const keepPlays=g.plays,keepScores={team:g.teamScore,opp:g.oppScore};
   Object.assign(g,structuredClone(before));
   g.plays=keepPlays;g.teamScore=keepScores.team;g.oppScore=keepScores.opp;
   g.los=enforced;
   g.toGo=Math.max(1,Math.abs(originalTarget-g.los));
   return;
 }

 g.los=enforced;
 if(p.autoFirst){
   g.down=1;
   g.toGo=Math.min(10,Math.max(1,dir===1?100-g.los:g.los));
   return;
 }
 g.toGo=Math.max(1,Math.abs(originalTarget-g.los));
}
function bindSpecial(g){
 if(g.puntPending){bindPunt(g);return}
 currentPlay.special='Kickoff';
 $$('#stTypes [data-st]').forEach(b=>b.onclick=()=>{$$('#stTypes [data-st]').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentPlay.special=b.dataset.st;$('#stDynamic').innerHTML=b.dataset.st==='Kickoff'?manualKickoffFields():b.dataset.st==='Punt'?puntFields():kickFields(b.dataset.st);bindSpecialDynamic(g)});
 bindSpecialDynamic(g)
}
function bindSpecialDynamic(g){
 if($('#startKickoff'))$('#startKickoff').onclick=()=>{const from=Math.max(20,Math.min(50,+$('#stFrom').value||40));g.kickoffPending=true;g.kickoff={phase:'kick',kickingTeam:g.poss,receivingTeam:other(g.poss),startYard:from,kickDir:g.driveDir||1,startSpot:screenSpot(from,g.driveDir||1),landing:null,returnEnd:null,kicker:$('#stKicker').value.trim(),returner:'',tacklers:[],touchback:false,result:'Return',onsideRecoveryTeam:null,recoverer:''};save();renderGame(g.id)};
 if($('#stKicker'))$('#stKicker').oninput=e=>currentPlay.kicker=e.target.value.trim();
 if($('#stReturner'))$('#stReturner').oninput=e=>currentPlay.returner=e.target.value.trim();
 if($('#startPunt'))$('#startPunt').onclick=()=>{g.puntPending=true;g.punt={phase:'kick',puntingTeam:g.poss,receivingTeam:other(g.poss),startSpot:g.los,kickDir:g.driveDir||1,landing:null,returnEnd:null,punter:'',returner:'',tacklers:[],touchback:false,returnTD:false,result:'Return',blocker:''};save();renderGame(g.id)};
 $$('#kickGood [data-good]').forEach(b=>b.onclick=()=>{$$('#kickGood [data-good]').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentPlay.kickGood=b.dataset.good==='true'})
}
function bindPunt(g){
 if(!g.puntPending||!g.punt)return;const p=g.punt;
 if($('#puntPunter'))$('#puntPunter').oninput=e=>{p.punter=e.target.value.trim();save()};
 $$('[data-punt-result]').forEach(b=>b.onclick=()=>{
   if(p.landing==null)return toast('Drag the ball to the punt ending spot first.');
   p.result=b.dataset.puntResult;p.blocker=$('#puntBlocker')?.value.trim()||p.blocker||'';
   if(p.result==='Blocked'){
     showModal(`<div class="workflow-modal"><h2>Blocked Punt Recovery</h2><div class="setup-body"><div class="setup-game-grid"><div class="setup-field"><label>Recovered by</label><select id="blockedPuntTeam"><option value="${p.receivingTeam}">Receiving team</option><option value="${p.puntingTeam}">Punting team</option></select></div><div class="setup-field"><label>Recoverer #</label><input id="blockedPuntPlayer" inputmode="numeric"></div></div></div><div class="setup-actions"><button class="btn btn-light" data-close>Cancel</button><button class="btn btn-primary" id="finishBlockedPunt">Finish Punt</button></div></div>`);
     $('#finishBlockedPunt').onclick=()=>{p.recoveryTeam=$('#blockedPuntTeam').value;p.recoverer=$('#blockedPuntPlayer').value.trim();p.returnEnd=p.landing;p.phase='return';closeModal();finishPunt(g)};return}
   p.returnEnd=p.landing;p.phase='return';g.poss=p.receivingTeam;g.driveDir=-(p.kickDir||1);finishPunt(g)
 });

 if($('#puntTouchbackKick'))$('#puntTouchbackKick').onclick=()=>{p.landing=touchdownSpot(p.kickDir||1);p.phase='return';p.touchback=true;p.returnTD=false;const retDir=-(p.kickDir||1);p.returnEnd=screenSpot(20,retDir);g.poss=p.receivingTeam;g.driveDir=retDir;save();renderGame(g.id)};
 if($('#lockPunt'))$('#lockPunt').onclick=()=>{p.phase='return';p.returnEnd=p.landing;g.poss=p.receivingTeam;g.driveDir=-(p.kickDir||1);save();renderGame(g.id)};
 if($('#puntReturner'))$('#puntReturner').oninput=e=>{p.returner=e.target.value.trim();save()};
 if($('#addPuntTackler'))$('#addPuntTackler').onclick=()=>{const n=$('#puntTackler').value.trim();if(!n)return;p.tacklers.push(n);save();renderGame(g.id)};
 if($('#puntTouchbackReturn'))$('#puntTouchbackReturn').onclick=()=>{p.touchback=true;p.returnTD=false;const retDir=-(p.kickDir||1);p.returnEnd=screenSpot(20,retDir);save();renderGame(g.id)};
 if($('#puntReturnTD'))$('#puntReturnTD').onclick=()=>{p.returnTD=!p.returnTD;if(p.returnTD)p.touchback=false;save();renderGame(g.id)};
 if($('#finishPunt'))$('#finishPunt').onclick=()=>finishPunt(g)
}
function bindKickoff(g,t){
 if(!g.kickoffPending)return;const k=g.kickoff;
 if($('#koKicker'))$('#koKicker').oninput=e=>{k.kicker=e.target.value.trim();save()};
 $$('[data-ko-result]').forEach(b=>b.onclick=()=>{
   if(k.landing==null)return toast('Drag the ball to the kick ending spot first.');
   k.result=b.dataset.koResult;
   if(k.result==='Onside'){
     showModal(`<div class="workflow-modal"><h2>Onside Kick Recovery</h2><div class="setup-body"><div class="setup-game-grid"><div class="setup-field"><label>Recovered by team</label><select id="onsideTeam"><option value="${k.kickingTeam}">Kicking team</option><option value="${k.receivingTeam}">Receiving team</option></select></div><div class="setup-field"><label>Recoverer #</label><input id="onsidePlayer" inputmode="numeric"></div></div></div><div class="setup-actions"><button class="btn btn-light" data-close>Cancel</button><button class="btn btn-primary" id="finishOnside">Finish Kick</button></div></div>`);
     $('#finishOnside').onclick=()=>{k.onsideRecoveryTeam=$('#onsideTeam').value;k.recoverer=$('#onsidePlayer').value.trim();k.returnEnd=k.landing;closeModal();finishKickoff(g)}
     return
   }
   k.returnEnd=k.result==='Fair Catch'?k.landing:k.landing;finishKickoff(g)
 });

 if($('#touchbackKick'))$('#touchbackKick').onclick=()=>{k.landing=touchdownSpot(k.kickDir||1);k.phase='return';k.touchback=true;const retDir=-(k.kickDir||1);k.returnEnd=screenSpot(20,retDir);save();renderGame(g.id)};
 if($('#lockKick'))$('#lockKick').onclick=()=>{k.phase='return';k.returnEnd=k.landing;save();renderGame(g.id)};
 if($('#koReturner'))$('#koReturner').oninput=e=>{k.returner=e.target.value.trim();save()};
 if($('#addKoTackler'))$('#addKoTackler').onclick=()=>{const n=$('#koTackler').value.trim();if(!n)return;k.tacklers.push(n);save();renderGame(g.id)};
 if($('#touchbackReturn'))$('#touchbackReturn').onclick=()=>{k.touchback=true;k.returnTD=false;const retDir=-(k.kickDir||1);k.returnEnd=screenSpot(20,retDir);save();renderGame(g.id)};
 if($('#kickReturnTD'))$('#kickReturnTD').onclick=()=>{k.returnTD=!k.returnTD;if(k.returnTD)k.touchback=false;save();renderGame(g.id)};
 if($('#finishKickoff'))$('#finishKickoff').onclick=()=>finishKickoff(g)
}
function finishPunt(g){
 const p=g.punt;if(!p||p.returnEnd==null)return;
 const before=snapshot(g),end=clamp(p.returnEnd),kickDir=p.kickDir||1,returnDir=-kickDir,puntDistance=Math.abs((p.landing??p.startSpot)-p.startSpot),returnYards=p.touchback?0:Math.abs(end-(p.landing??end)),returnTD=!!p.returnTD&&!p.touchback;
 const result=p.touchback?'Touchback':(p.result||'Return');const desc=result!=='Return'?`Punt #${p.punter||'—'} ${puntDistance} yd · ${result.toUpperCase()}${result==='Blocked'&&p.blocker?' by #'+p.blocker:''}${result==='Blocked'&&p.recoverer?' · recovered #'+p.recoverer:''}`:`Punt #${p.punter||'—'} ${puntDistance} yd; return #${p.returner||'—'} ${returnYards} yd to ${fmtDrive(end,returnDir)}${returnTD?' · RETURN TD':''}${p.tacklers.length&&!returnTD?`; tackle ${p.tacklers.map(x=>'#'+x).join(', ')}`:''}`;
 g.plays.push({id:uid(),kind:'Punt',team:p.puntingTeam,period:before.period,start:p.startSpot,end,yds:puntDistance,desc,before,returnTD,returner:p.returner,specialResult:result,blocker:p.blocker||'',recoveryTeam:p.recoveryTeam||null,recoverer:p.recoverer||''});
 g.poss=result==='Blocked'?(p.recoveryTeam||p.receivingTeam):p.receivingTeam;g.driveDir=g.poss===p.receivingTeam?returnDir:kickDir;
 if(returnTD){score(g,p.receivingTeam,6);g.los=touchdownSpot(returnDir);g.down=1;g.toGo=10;g.awaitingTry=true;g.tryType=null}
 else{g.los=end;g.down=1;g.toGo=Math.min(10,Math.max(1,returnDir===1?100-end:end));g.awaitingTry=false;g.tryType=null}
 g.puntPending=false;g.punt=null;save();renderGame(g.id)
}
function finishKickoff(g){
 const k=g.kickoff;if(k.returnEnd==null)return;const before=snapshot(g),end=clamp(k.returnEnd),kickDir=k.kickDir||1,returnDir=-kickDir,kickDistance=Math.abs(k.landing-(k.startSpot??k.startYard)),returnYards=k.touchback?0:Math.abs(end-k.landing),returnTD=!!k.returnTD&&!k.touchback;
 const koLabel=k.halftime?'2H Kickoff':'Kickoff';const result=k.touchback?'Touchback':(k.result||'Return');
 const desc=result==='Onside'?`${koLabel} #${k.kicker||'—'} ${kickDistance} yd · ONSIDE · recovered by ${k.onsideRecoveryTeam===k.kickingTeam?'kicking':'receiving'} team${k.recoverer?' #'+k.recoverer:''}`:result!=='Return'?`${koLabel} #${k.kicker||'—'} ${kickDistance} yd · ${result.toUpperCase()}`:`${koLabel} #${k.kicker||'—'} ${kickDistance} yd; return #${k.returner||'—'} ${returnYards} yd to ${fmtDrive(end,returnDir)}${returnTD?' · RETURN TD':''}${k.tacklers.length&&!returnTD?`; tackle ${k.tacklers.map(x=>'#'+x).join(', ')}`:''}`;
 g.plays.push({id:uid(),kind:'Kickoff',team:k.kickingTeam,period:before.period,start:k.startSpot??k.startYard,end,yds:kickDistance,desc,before,returnTD,returner:k.returner,specialResult:result,recoverer:k.recoverer||'',recoveryTeam:k.onsideRecoveryTeam||null});
 g.poss=result==='Onside'?(k.onsideRecoveryTeam||k.receivingTeam):k.receivingTeam;g.driveDir=g.poss===k.receivingTeam?returnDir:kickDir;
 if(returnTD){score(g,k.receivingTeam,6);g.los=touchdownSpot(returnDir);g.down=1;g.toGo=10;g.awaitingTry=true;g.tryType=null}
 else{g.los=end;g.down=1;g.toGo=Math.min(10,Math.max(1,returnDir===1?100-end:end));g.awaitingTry=false;g.tryType=null}
 g.kickoffPending=false;g.kickoff=null;save();renderGame(g.id)
}
function score(g,side,pts){if(side==='team')g.teamScore+=pts;else g.oppScore+=pts}
function beginKickoffAfterScore(g,scoringSide){const dir=g.driveDir||1,from=g.kickoffYard||40;g.tryType=null;g.kickoffPending=true;g.kickoff={phase:'kick',kickingTeam:scoringSide,receivingTeam:other(scoringSide),startYard:from,kickDir:dir,startSpot:screenSpot(from,dir),landing:null,returnEnd:null,kicker:'',returner:'',tacklers:[],touchback:false,result:'Return',onsideRecoveryTeam:null,recoverer:''};g.awaitingTry=false}

function showPlayNotes(g,t){
 showModal(`<div class="play-notes-modal">
   <div class="compact-modal-head">
     <div><div class="eyebrow">CURRENT PLAY</div><h2>Play Notes</h2><p>Add optional context without taking space from the scoring screen.</p></div>
     <button class="btn btn-light" id="closePlayNotes">Close</button>
   </div>
   <label class="notes-label" for="playNotePopup">Notes</label>
   <textarea id="playNotePopup" rows="6" placeholder="e.g. screen right, blitz, alignment...">${esc(currentPlay.note||'')}</textarea>
   <div class="modal-actions">
     <button class="btn btn-light" id="clearPlayNotes">Clear</button>
     <button class="btn btn-primary" id="savePlayNotes">Save Notes</button>
   </div>
 </div>`);
 $('#closePlayNotes').onclick=closeModal;
 $('#clearPlayNotes').onclick=()=>{$('#playNotePopup').value=''};
 $('#savePlayNotes').onclick=()=>{
   currentPlay.note=$('#playNotePopup').value.trim();
   closeModal();
   toast(currentPlay.note?'Notes saved for current play.':'Play notes cleared.')
 }
}

function savePlay(g,t){
 if(g.kickoffPending)return toast('Finish the kickoff workflow first.');
 if(g.puntPending)return toast('Finish the punt workflow first.');
 currentPlay.note=($('#playNote')?.value??currentPlay.note??'').trim();
 if(currentPlay.badSnap?.active){
   currentPlay.badSnap.center=$('#centerNum')?.value.trim()||currentPlay.badSnap.center||'';
   if(currentPlay.badSnap.notCaught&&!currentPlay.badSnap.recoveredBy)return toast('Choose who recovered the bad snap: Offense or Defense.');
 }
 syncTurnoverState();
 const before=snapshot(g),start=g.los;
 let end=currentPlay.end==null?start:clamp(currentPlay.end),yds=(end-start)*(g.driveDir||1),desc='';
 const selectedSt=$('#stTypes .active')?.dataset.st;

 if(selectedSt==='Field Goal'||selectedSt==='PAT'){
   const kicker=$('#stKicker')?.value.trim()||'',dist=+$('#stDistance')?.value||0,blocked=!!$('#kickBlocked')?.checked,blocker=$('#kickBlocker')?.value.trim()||'',kickRecoveryTeam=$('#kickRecoveryTeam')?.value||'Defense',kickRecoverer=$('#kickRecoverer')?.value.trim()||'';
   if(currentPlay.kickGood==null)return toast('Choose Good or No Good.');
   if(blocked)currentPlay.kickGood=false;
   const pts=selectedSt==='PAT'?1:3;
   if(currentPlay.kickGood)score(g,g.poss,pts);
   desc=`${selectedSt} #${kicker||'—'} ${selectedSt==='Field Goal'?dist+' yd ':''}${currentPlay.kickGood?'GOOD':'NO GOOD'}${blocked?` · BLOCKED${blocker?' by #'+blocker:''}`:''}`;
   g.plays.push({id:uid(),kind:selectedSt,team:before.poss,period:before.period,start,end:start,yds:0,desc,before,kicker,distance:dist,kickGood:currentPlay.kickGood,blocked,blocker,kickRecoveryTeam,kickRecoverer});
   if(selectedSt==='PAT')beginKickoffAfterScore(g,g.poss);
   else if(currentPlay.kickGood)beginKickoffAfterScore(g,g.poss);
   else{if(!blocked||kickRecoveryTeam==='Defense'){g.poss=other(g.poss);g.driveDir=-(g.driveDir||1)}g.down=1;g.toGo=10;g.los=start}
   applyPendingPenalties(g);
   save();renderGame(g.id);return
 }

 if(selectedSt==='Punt')return toast('Use the Punt workflow: kick, lock landing, then return.');

 if(currentPlay.type==='Run'){
   currentPlay.player=$('#player')?.value.trim()||currentPlay.player;
   desc=`Run #${currentPlay.player||'—'} ${yds>=0?'+':''}${yds} yd`
 }else{
   currentPlay.qb=$('#qb')?.value.trim()||currentPlay.qb;
   currentPlay.receiver=$('#receiver')?.value.trim()||currentPlay.receiver;
   currentPlay.passResult=$('#passResult .active')?.textContent||currentPlay.passResult;
   if(currentPlay.passResult==='Incomplete'){end=start;yds=0;desc=`Pass #${currentPlay.qb||'—'} → #${currentPlay.receiver||'—'} incomplete`}
   else if(currentPlay.passResult==='Interception'){
     const i=currentPlay.interception;
     if(!i||i.phase!=='return')return toast('Lock the interception spot before recording the return.');
     if(!i.interceptor)return toast('Enter the interceptor number.');
     const returnDir=-(g.driveDir||1);
     i.returnEnd=currentPlay.end??i.returnEnd??i.catchSpot;
     if(i.returnTD)i.returnEnd=touchdownSpot(returnDir);
     end=i.returnEnd;yds=0;
     const returnYds=Math.abs((i.returnEnd??i.catchSpot)-i.catchSpot);
     desc=`Pass #${currentPlay.qb||'—'} INTERCEPTED by #${i.interceptor} · return ${returnYds} yd to ${fmtDrive(i.returnEnd,returnDir)}${i.returnTD?' · RETURN TD':''}`;
     if((i.tacklers||[]).length&&!i.returnTD)desc+=` · return tackle ${i.tacklers.map(x=>'#'+x).join(', ')}`;
     currentPlay.turnover=true
   }
   else if(currentPlay.passResult==='Sack'){
     if(!currentPlay.defenders.some(d=>d.action==='Sack'))return toast('Add the defender credited with the sack.');
     desc=`Sack of QB #${currentPlay.qb||'—'} ${yds} yd`;
   }
   else desc=`Pass #${currentPlay.qb||'—'} → #${currentPlay.receiver||'—'} ${yds>=0?'+':''}${yds} yd`
 }

 // Dedicated 2-point try workflow.
 if(g.awaitingTry&&g.tryType==='2PT'){
   if(!currentPlay.tryResult)return toast('Mark the 2-point conversion Successful or Failed.');
   const success=currentPlay.tryResult==='successful';
   if(success)score(g,g.poss,2);
   desc=`2PT ${currentPlay.type==='Run'?`Run #${currentPlay.player||'—'}`:`Pass #${currentPlay.qb||'—'} → #${currentPlay.receiver||'—'}`} · ${success?'SUCCESSFUL':'FAILED'}`;
   if(currentPlay.defenders.length)desc+=` · ${currentPlay.defenders.map(d=>`#${d.n} ${d.action}`).join(', ')}`;
   if(currentPlay.penalties.length)desc+=currentPlay.penalties.map(p=>` · PEN ${p.side} ${p.type}${p.player?' #'+p.player:''} ${p.yards}yd ${p.status.toUpperCase()}`).join('');
   if(currentPlay.note)desc+=` · ${currentPlay.note}`;
   g.plays.push({id:uid(),kind:'2PT',team:before.poss,period:before.period,start,end,yds:end-start,desc,before,player:currentPlay.player,qb:currentPlay.qb,receiver:currentPlay.receiver,passResult:currentPlay.passResult,tryResult:currentPlay.tryResult,fumble:currentPlay.fumble,fumbleRecovery:currentPlay.fumbleRecovery,fumbleDetail:currentPlay.fumbleDetail?structuredClone(currentPlay.fumbleDetail):null,badSnap:structuredClone(currentPlay.badSnap),penalties:structuredClone(currentPlay.penalties),defenders:structuredClone(currentPlay.defenders)});
   g.tryType=null;
   beginKickoffAfterScore(g,before.poss);
   applyPendingPenalties(g);
   save();renderGame(g.id);return
 }

 if(currentPlay.badSnap?.active){
   desc+=` · BAD SNAP C #${currentPlay.badSnap.center||'—'}`;
   if(currentPlay.badSnap.notCaught)desc+=` · CENTER FUMBLE · REC ${currentPlay.badSnap.recoveredBy?.toUpperCase()||'—'}`;
   else desc+=` · CAUGHT`;
 }
 if(currentPlay.fumble&&currentPlay.fumbleDetail?.returnEnd!=null)end=currentPlay.fumbleDetail.returnEnd;
 if(currentPlay.fumble){const fd=currentPlay.fumbleDetail;desc+=` · FUMBLE${fd?.forcedBy?' forced #'+fd.forcedBy:''} · REC ${(currentPlay.fumbleRecovery||'—').toUpperCase()}${fd?.recoverer?' #'+fd.recoverer:''}${fd?.returnEnd!=null?' · return '+Math.abs(fd.returnEnd-fd.recoverySpot)+' yd':''}${fd?.returnTD?' · RETURN TD':''}`;}
 if(currentPlay.fumbleDetail?.returnTD&&currentPlay.fumbleDetail.recoveryTeam==='Defense'){score(g,other(g.poss),6);currentPlay.turnover=true;g.awaitingTry=true;g.tryType=null}
 if(currentPlay.score==='TD'){score(g,g.poss,6);desc+=' · TOUCHDOWN';end=touchdownSpot(g.driveDir);g.awaitingTry=true;g.tryType=null}
 else if(currentPlay.score==='Safety'){score(g,other(g.poss),2);desc+=' · SAFETY'}
 else if(currentPlay.score==='Def TD'){score(g,other(g.poss),6);desc+=' · DEFENSIVE TD';g.poss=other(g.poss);g.awaitingTry=true;g.tryType=null}
 else if((g.driveDir||1)===1?end>=100:end<=0){score(g,g.poss,6);desc+=' · TOUCHDOWN';end=touchdownSpot(g.driveDir);g.awaitingTry=true;g.tryType=null}

 if(currentPlay.defenders.length)desc+=` · ${currentPlay.defenders.map(d=>`#${d.n} ${d.action}`).join(', ')}`;
 if(currentPlay.penalties.length)desc+=currentPlay.penalties.map(p=>` · PEN ${p.side} ${p.type}${p.player?' #'+p.player:''} ${p.yards}yd ${p.status.toUpperCase()}`).join('');
 if(currentPlay.note)desc+=` · ${currentPlay.note}`;

 g.plays.push({id:uid(),kind:currentPlay.type,team:before.poss,period:before.period,start,end,yds:currentPlay.passResult==='Interception'?0:end-start,desc,before,player:currentPlay.player,qb:currentPlay.qb,receiver:currentPlay.receiver,passResult:currentPlay.passResult,interception:currentPlay.interception?structuredClone(currentPlay.interception):null,fumble:currentPlay.fumble,fumbleRecovery:currentPlay.fumbleRecovery,fumbleDetail:currentPlay.fumbleDetail?structuredClone(currentPlay.fumbleDetail):null,badSnap:structuredClone(currentPlay.badSnap),penalties:structuredClone(currentPlay.penalties),defenders:structuredClone(currentPlay.defenders)});
 if(currentPlay.passResult==='Interception'&&currentPlay.interception?.returnTD)score(g,other(before.poss),6);
 if(!g.awaitingTry&&!g.kickoffPending)applyAfterPlay(g,currentPlay,start,end);
 if(currentPlay.passResult==='Interception'&&currentPlay.interception?.returnTD){g.awaitingTry=true;g.tryType=null}
 if(!g.awaitingTry)applyPendingPenalties(g);
 save();renderGame(g.id)
}
function applyAfterPlay(g,p,start,end){
 const dir=g.driveDir||1;
 const accepted=(p.penalties||[]).filter(x=>x.status==='accepted');
 const hasAccepted=accepted.length>0;
 const originalTarget=clamp(start+dir*g.toGo);

 // A turnover only takes effect if the play itself stands.
 const negatePlay=accepted.some(x=>x.negate||x.repeatDown);
 if(p.turnover&&!negatePlay){g.poss=other(g.poss);g.driveDir=-dir;g.los=end;g.down=1;g.toGo=Math.min(10,Math.max(1,g.driveDir===1?100-end:end));return}

 // Incomplete pass with no accepted penalty behaves normally.
 if(p.type==='Pass'&&p.passResult==='Incomplete'&&!hasAccepted){g.down++;if(g.down>4)turnoverDowns(g,start);return}

 // Determine enforcement base. If play yardage is ignored/no-play, start at previous LOS.
 // If spot-of-foul is selected, the dragged ball/end spot is the enforcement spot.
 let base=end;
 const spotPenalty=accepted.find(x=>x.spotFoul&&x.foulSpot!=null);
 if(spotPenalty)base=spotPenalty.foulSpot;
 else if(accepted.some(x=>x.negate||x.repeatDown))base=start;

 const net=accepted.reduce((sum,x)=>sum+(x.side==='Offense'?-x.yards:x.yards),0);
 const actual=clamp(base+net*dir);
 const repeat=accepted.some(x=>x.repeatDown);
 const auto=accepted.some(x=>x.autoFirst);

 if(repeat){
   g.los=actual;
   g.toGo=Math.max(1,Math.abs(originalTarget-g.los));
   return;
 }
 if(auto){
   g.los=actual;g.down=1;g.toGo=Math.min(10,Math.max(1,dir===1?100-actual:actual));return;
 }

 // Down counts on accepted live-ball penalties unless Repeat Down / No Play is checked.
 // Keep the original first-down target fixed and recalculate distance from the enforced spot.
 g.los=actual;
 const reachedTarget=dir===1?actual>=originalTarget:actual<=originalTarget;
 if(reachedTarget){
   g.down=1;
   g.toGo=Math.min(10,Math.max(1,dir===1?100-actual:actual));
 }else{
   g.toGo=Math.max(1,Math.abs(originalTarget-actual));
   g.down++;
   if(g.down>4)turnoverDowns(g,actual);
 }
}
function turnoverDowns(g,spot){g.poss=other(g.poss);g.driveDir=-(g.driveDir||1);g.los=clamp(spot);g.down=1;g.toGo=Math.min(10,Math.max(1,g.driveDir===1?100-g.los:g.los))}
function undoPlay(g){const p=g.plays.pop();if(!p)return toast('No play to undo.');Object.assign(g,structuredClone(p.before));save();renderGame(g.id)}
function editSelected(g){const p=g.plays.find(x=>x.id===selectedPlayId);if(!p)return toast('Select a play first.');const t=teamById(g.teamId);showPlayEditor(g,t,p.id)}
function drawField(g,t){
 const f=$('#field');if(!f)return;const driveDir=g.driveDir||1,k=g.kickoff,p=g.punt,intRet=currentPlay?.type==='Pass'&&currentPlay?.passResult==='Interception'?currentPlay.interception:null;
 const perspective=g.kickoffPending?(k.phase==='kick'?(k.kickDir||1)===1?k.kickingTeam:other(k.kickingTeam):(-(k.kickDir||1))===1?k.receivingTeam:other(k.receivingTeam)):g.puntPending?(p.phase==='kick'?(p.kickDir||1)===1?p.puntingTeam:other(p.puntingTeam):(-(p.kickDir||1))===1?p.receivingTeam:other(p.receivingTeam)):intRet?.phase==='return'?((-(driveDir||1))===1?other(g.poss):g.poss):(driveDir===1?g.poss:other(g.poss)),left=teamSide(g,t,perspective),right=teamSide(g,t,other(perspective));
 let ballAbs=g.kickoffPending?(k.phase==='kick'?(k.landing??k.startSpot??k.startYard):(k.returnEnd??k.landing)):g.puntPending?(p.phase==='kick'?(p.landing??p.startSpot):(p.returnEnd??p.landing)):intRet?(intRet.phase==='return'?(intRet.returnEnd??intRet.catchSpot):(intRet.catchSpot??currentPlay.end)):currentPlay.end;
 const portrait=()=>!!document.querySelector('.mobile-score-workspace');
 const place=(el,pct,kind='mark')=>{
   if(portrait()){
     if(kind==='ball'){
       important(el,'left','50%');important(el,'top',pct+'%');important(el,'width','25px');important(el,'height','16px');important(el,'transform','translate(-50%,-50%) rotate(90deg)');
     }else{
       important(el,'left','0');important(el,'right','0');important(el,'top',pct+'%');important(el,'bottom','auto');
       if(el.classList.contains('yard-line')){important(el,'width','auto');important(el,'height',el.classList.contains('major')?'2px':'1px')}
       if(el.classList.contains('hash')){important(el,'left','50%');important(el,'right','auto');important(el,'width','7px');important(el,'height','1px');important(el,'transform','translate(-50%,-50%)')}
       if(el.classList.contains('los-line')||el.classList.contains('fd-line')||el.classList.contains('kick-line')){important(el,'width','auto');important(el,'height','3px')}
     }
   }else important(el,'left',pct+'%')
 };
 f.innerHTML=`<div class="endzone left" style="background:${left.color};color:${textColor(left.color)}">${esc(left.name.slice(0,12))}</div><div class="endzone right" style="background:${right.color};color:${textColor(right.color)}">${esc(right.name.slice(0,12))}</div><div class="field-inner" id="fieldInner"></div>`;
 const inner=$('#fieldInner');
 if(portrait()){
   important(f,'height','500px');important(f,'min-height','500px');important(f,'width','100%');
   const ezL=f.querySelector('.endzone.left'),ezR=f.querySelector('.endzone.right');
   [ezL,ezR].forEach(e=>{important(e,'left','0');important(e,'right','0');important(e,'width','auto');important(e,'height','7%');important(e,'writing-mode','horizontal-tb');important(e,'transform','none')});
   important(ezL,'top','0');important(ezL,'bottom','auto');important(ezR,'top','auto');important(ezR,'bottom','0');
   important(inner,'left','0');important(inner,'right','0');important(inner,'top','7%');important(inner,'bottom','7%');
 }
 for(let y=0;y<=100;y+=5){const d=document.createElement('div');d.className='yard-line'+(y%10===0?' major':'');place(d,y);inner.appendChild(d)}
 for(let y=10;y<100;y+=10){const n=y<=50?y:100-y;['top','bottom'].forEach(pos=>{const d=document.createElement('div');d.className='yard-number '+pos;place(d,y);d.textContent=n;if(portrait()){important(d,'font-size','8px');important(d,'bottom','auto');if(pos==='top'){important(d,'left','7px');important(d,'right','auto');important(d,'transform','translateY(-50%) rotate(90deg)')}else{important(d,'left','auto');important(d,'right','7px');important(d,'transform','translateY(-50%) rotate(-90deg)')}}inner.appendChild(d)})}
 for(let y=1;y<100;y++){const d=document.createElement('div');d.className='hash';place(d,y);inner.appendChild(d)}
 if(!g.kickoffPending&&!g.puntPending){const los=document.createElement('div');los.className='los-line';place(los,g.los);inner.appendChild(los);const fd=document.createElement('div');fd.className='fd-line';place(fd,clamp(g.los+(g.driveDir||1)*g.toGo));inner.appendChild(fd)}
 else if(g.kickoffPending&&g.kickoff.phase==='kick'){const kl=document.createElement('div');kl.className='kick-line';place(kl,g.kickoff.startSpot??screenSpot(g.kickoff.startYard,g.kickoff.kickDir||1));inner.appendChild(kl)}
 else if(g.puntPending&&g.punt.phase==='kick'){const pl=document.createElement('div');pl.className='kick-line';place(pl,g.punt.startSpot);inner.appendChild(pl)}
 const ball=document.createElement('div');ball.className='football';place(ball,ballAbs,'ball');inner.appendChild(ball);
 const setBall=(clientX,clientY)=>{const r=inner.getBoundingClientRect();const pct=clamp(portrait()?((clientY-r.top)/r.height*100):((clientX-r.left)/r.width*100));if(portrait())important(ball,'top',pct+'%');else ball.style.left=pct+'%';if($('#ballText'))$('#ballText').textContent=fmtDrive(pct,g.driveDir||1);if(g.kickoffPending){if(g.kickoff.phase==='kick')g.kickoff.landing=pct;else g.kickoff.returnEnd=pct;save()}else if(g.puntPending){if(g.punt.phase==='kick')g.punt.landing=pct;else g.punt.returnEnd=pct;save()}else if(intRet){if(intRet.phase==='catch'){intRet.catchSpot=pct;currentPlay.end=pct}else{intRet.returnEnd=pct;currentPlay.end=pct}}else currentPlay.end=pct};
 let drag=false;ball.addEventListener('pointerdown',e=>{drag=true;ball.setPointerCapture(e.pointerId);e.preventDefault()});ball.addEventListener('pointermove',e=>{if(drag)setBall(e.clientX,e.clientY)});ball.addEventListener('pointerup',e=>{drag=false;setBall(e.clientX,e.clientY);if(g.kickoffPending||g.puntPending)renderGame(g.id)});inner.addEventListener('click',e=>{if(e.target===ball)return;setBall(e.clientX,e.clientY);if(g.kickoffPending||g.puntPending)renderGame(g.id)})
}
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.warn));
route();
