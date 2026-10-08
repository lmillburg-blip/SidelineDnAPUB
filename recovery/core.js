(function(root){
'use strict';
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const LEGACY_KEY_ORDER=["sidelinedna_v0600", "sidelineiq_v0516", "sidelineiq_v0515", "sidelineiq_v0514", "sidelineiq_v0513", "sidelineiq_v0510", "sidelineiq_v0509", "sidelineiq_v0508", "sidelineiq_v0507", "sidelineiq_v0506", "sidelineiq_v0505", "sidelineiq_v0504", "sidelineiq_v0503", "sidelineiq_v0502", "sidelineiq_v0501", "sidelineiq_v0430", "sidelineiq_v0427", "sidelineiq_v0426", "sidelineiq_v0425", "sidelineiq_v0424", "sidelineiq_v0423", "sidelineiq_v0422", "sidelineiq_v0421", "sidelineiq_v0420", "sidelineiq_v0415", "sidelineiq_v0414", "sidelineiq_v0413", "sidelineiq_v0412", "sidelineiq_v0411", "sidelineiq_v0410", "sidelineiq_v0406", "sidelineiq_v0405", "sidelineiq_v0404", "sidelineiq_v0403", "sidelineiq_v0402", "sidelineiq_v0401", "sidelineiq_v0301", "sidelineiq_v0300", "sidelineiq_v0230", "sidelineiq_v0222", "sidelineiq_v0221", "sidelineiq_v0220", "sidelineiq_v0210", "sidelineiq_v0204", "sidelineiq_v0203", "sidelineiq_v0202", "sidelineiq_v0201", "sidelineiq_v0200", "sidelineiq_v020", "sidelineiq_v01515", "sidelineiq_v01514", "sidelineiq_v01513", "sidelineiq_v01512", "sidelineiq_v01511", "sidelineiq_v01510", "sidelineiq_v0159", "sidelineiq_v0158", "sidelineiq_v0157", "sidelineiq_v0156", "sidelineiq_v0155", "sidelineiq_v0154", "sidelineiq_v0153", "sidelineiq_v0152", "sidelineiq_v0151", "sidelineiq_v015", "sidelineiq_v014", "sidelineiq_v013_corrected", "sidelineiq_v013", "sidelineiq_v012"];

function validate(state){
 if(!object(state)||!Array.isArray(state.games))throw Error('Expected a saved games array.');
 // Old releases do not consistently have rosters. They are irrelevant to game recovery.
 const sourceTeams=Array.isArray(state.teams)?state.teams:[];
 const teams=new Map(),games=new Set();
 for(const g of state.games){
  if(!object(g)||g.id==null||games.has(String(g.id))||g.teamId==null||!Array.isArray(g.plays)||g.plays.some(p=>!object(p)))throw Error('Invalid game, duplicate game ID, missing team ID, or invalid plays.');
  games.add(String(g.id));
  const id=String(g.teamId),t=sourceTeams.find(t=>object(t)&&String(t.id)===id);
  if(!teams.has(id))teams.set(id,{id:g.teamId,name:t?.name||('Legacy team '+id),roster:[]});
 }
 return {teams:[...teams.values()],games:structuredClone(state.games)};
}
function candidates(input){if(input?.format==='sdna-recovery-1')return input.snapshots.map(s=>({...s,state:validate(s.state)}));return [{label:'Uploaded state',state:validate(input)}];}
function combineSnapshots(snapshots){
 const teams=new Map(),games=new Map();let duplicates=0;
 for(const snapshot of snapshots){
  const normalized=validate(snapshot.state);
  for(const team of normalized.teams)if(!teams.has(String(team.id)))teams.set(String(team.id),team);
  for(const game of normalized.games){const key=String(game.teamId)+'\u0000'+String(game.id),prior=games.get(key);if(!prior){games.set(key,{game,plays:game.plays.length});continue;}duplicates++;if(game.plays.length>prior.plays)games.set(key,{game,plays:game.plays.length});}
 }
 const merged={teams:[...teams.values()],games:[...games.values()].map(x=>x.game)};
 return {label:'COMBINED HISTORY — '+snapshots.length+' cached versions; '+merged.games.length+' unique games ('+duplicates+' duplicate copies skipped)',state:merged};
}
async function scan(){
 const snapshots=[],warnings=[];
 for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!/^sideline(iq|dna)[_:-]/i.test(key))continue;try{const state=JSON.parse(localStorage.getItem(key));if(state?.games)snapshots.push({label:key,state:validate(state)});}catch(e){warnings.push(key+': '+e.message);}}
 if(indexedDB.databases){
  const dbs=await indexedDB.databases();
  for(const entry of dbs){let db;
   try{db=await new Promise((resolve,reject)=>{const r=indexedDB.open(entry.name);r.onupgradeneeded=()=>{try{r.transaction.abort();}catch(_){} reject(Error('Database disappeared; scan skipped.'));};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Database blocked; close other app tabs.'));});
    const stores=[...db.objectStoreNames];
    const gameStore=['games','game_records','game'].find(n=>stores.includes(n));
    const playStore=['plays','game_plays','play'].find(n=>stores.includes(n));
    if(!gameStore||!playStore)continue;
    const teamStore=['teams','team'].find(n=>stores.includes(n));
    const names=[gameStore,playStore,...(teamStore?[teamStore]:[])];
    const rows=await new Promise((resolve,reject)=>{const tx=db.transaction(names,'readonly'),result={};names.forEach(n=>{const r=tx.objectStore(n).getAll();r.onsuccess=()=>result[n]=r.result;});tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Read failed'));});
    const rawGames=rows[gameStore]||[],rawPlays=rows[playStore]||[],rawTeams=teamStore?(rows[teamStore]||[]):[];
    const teams=rawTeams.map(t=>t.data||t).filter(t=>t?.id!=null);
    const games=rawGames.map(record=>{const g=record.data||record;const id=g.id??record.id;const teamId=g.teamId??g.team_id??record.teamId;const plays=rawPlays.filter(q=>String(q.gameId??q.game_id??q.data?.gameId)===String(id)).sort((a,b)=>(a.sequence??a.data?.sequence??0)-(b.sequence??b.data?.sequence??0)).map(q=>q.play||q.data?.play||q);return {...g,id,teamId,plays};}).filter(g=>g.id!=null&&g.teamId!=null&&Array.isArray(g.plays));
    if(!games.length)continue;
    snapshots.push({label:(entry.name||'IndexedDB')+' (IndexedDB '+gameStore+'/'+playStore+')',state:validate({teams,games})});
   }catch(e){warnings.push((entry.name||'IndexedDB')+': '+e.message);}finally{db?.close();}
  }
 }else warnings.push('This browser cannot list IndexedDB databases. Local Storage was checked.');
 snapshots.sort((a,b)=>{const ai=LEGACY_KEY_ORDER.indexOf(a.label),bi=LEGACY_KEY_ORDER.indexOf(b.label);return (ai<0?9999:ai)-(bi<0?9999:bi);});
 if(snapshots.length>1)snapshots.unshift(combineSnapshots(snapshots));
 return {format:'sdna-recovery-1',origin:location.origin,exportedAt:new Date().toISOString(),snapshots,warnings};
}
function download(data){const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='SidelineIQ-recovery-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
const api={validate,candidates,combineSnapshots,scan,download};root.SDNARecovery=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
