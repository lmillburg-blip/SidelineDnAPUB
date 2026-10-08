(function(root){
'use strict';
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
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
async function scan(){
 const snapshots=[],warnings=[];
 for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!/^sideline(iq|dna)[_:-]/i.test(key))continue;try{const state=JSON.parse(localStorage.getItem(key));if(state?.games)snapshots.push({label:key,state:validate(state)});}catch(e){warnings.push(key+': '+e.message);}}
 if(indexedDB.databases){
  const dbs=await indexedDB.databases();
  for(const entry of dbs.filter(d=>/^sideline(iq|dna)/i.test(d.name||''))){let db;
   try{db=await new Promise((resolve,reject)=>{const r=indexedDB.open(entry.name);r.onupgradeneeded=()=>{r.transaction.abort();reject(Error('Database disappeared; scan skipped.'));};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Database blocked; close other app tabs.'));});
    if(!['teams','games','plays'].every(n=>db.objectStoreNames.contains(n))) {warnings.push(entry.name+': unrecognized schema; not exported.');continue;}
    const names=['teams','games','plays'];
    const rows=await new Promise((resolve,reject)=>{const tx=db.transaction(names,'readonly'),result={};names.forEach(n=>{const r=tx.objectStore(n).getAll();r.onsuccess=()=>result[n]=r.result;});tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Read failed'));});
    const state={teams:rows.teams.map(t=>t.data),games:rows.games.map(g=>({...g.data,plays:rows.plays.filter(p=>String(p.gameId)===String(g.id)).sort((a,b)=>a.sequence-b.sequence).map(p=>p.play)}))};
    snapshots.push({label:entry.name+' (IndexedDB)',state:validate(state)});
   }catch(e){warnings.push(entry.name+': '+e.message);}finally{db?.close();}
  }
 }else warnings.push('This browser cannot list IndexedDB databases. Local Storage was checked.');
 return {format:'sdna-recovery-1',origin:location.origin,exportedAt:new Date().toISOString(),snapshots,warnings};
}
function download(data){const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='SidelineIQ-recovery-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
const api={validate,candidates,scan,download};root.SDNARecovery=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
