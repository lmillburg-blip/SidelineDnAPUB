(function(root){
'use strict';
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
function validate(state){
 if(!object(state)||!Array.isArray(state.teams)||!Array.isArray(state.games))throw Error('Expected a SidelineIQ state with teams and games arrays.');
 const teams=new Set(),games=new Set();
 for(const t of state.teams){if(!object(t)||t.id==null||teams.has(String(t.id))||!Array.isArray(t.roster))throw Error('Invalid or duplicate team, or missing roster.');teams.add(String(t.id));const ids=new Set();for(const p of t.roster){if(!object(p)||p.id==null||ids.has(String(p.id)))throw Error('Invalid or duplicate roster player.');ids.add(String(p.id));}}
 for(const g of state.games){if(!object(g)||g.id==null||games.has(String(g.id))||!teams.has(String(g.teamId))||!Array.isArray(g.plays)||g.plays.some(p=>!object(p)))throw Error('Invalid game, duplicate ID, missing team, or invalid plays.');games.add(String(g.id));}
 return state;
}
function candidates(input){if(input?.format==='sdna-recovery-1')return input.snapshots.map(s=>({...s,state:validate(s.state)}));return [{label:'Uploaded state',state:validate(input)}];}
async function scan(){
 const snapshots=[],warnings=[];
 for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!/^sideline(iq|dna)[_:-]/i.test(key))continue;try{const state=JSON.parse(localStorage.getItem(key));if(state?.teams&&state?.games)snapshots.push({label:key,state:validate(state)});}catch(e){warnings.push(key+': '+e.message);}}
 if(indexedDB.databases){
  const dbs=await indexedDB.databases();
  for(const entry of dbs.filter(d=>/^sideline(iq|dna)/i.test(d.name||''))){let db;
   try{db=await new Promise((resolve,reject)=>{const r=indexedDB.open(entry.name);r.onupgradeneeded=()=>{r.transaction.abort();reject(Error('Database disappeared; scan skipped.'));};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Database blocked; close other app tabs.'));});
    if(!['teams','roster_memberships','games','plays'].every(n=>db.objectStoreNames.contains(n))) {warnings.push(entry.name+': unrecognized schema; not exported.');continue;}
    const names=['teams','roster_memberships','games','plays'];
    const rows=await new Promise((resolve,reject)=>{const tx=db.transaction(names,'readonly'),result={};names.forEach(n=>{const r=tx.objectStore(n).getAll();r.onsuccess=()=>result[n]=r.result;});tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Read failed'));});
    const state={teams:rows.teams.map(t=>({...t.data,roster:rows.roster_memberships.filter(p=>String(p.teamId)===String(t.id)).sort((a,b)=>(a.sequence||0)-(b.sequence||0)).map(p=>p.player)})),games:rows.games.map(g=>({...g.data,plays:rows.plays.filter(p=>String(p.gameId)===String(g.id)).sort((a,b)=>a.sequence-b.sequence).map(p=>p.play)}))};
    snapshots.push({label:entry.name+' (IndexedDB)',state:validate(state)});
   }catch(e){warnings.push(entry.name+': '+e.message);}finally{db?.close();}
  }
 }else warnings.push('This browser cannot list IndexedDB databases. Local Storage was checked.');
 return {format:'sdna-recovery-1',origin:location.origin,exportedAt:new Date().toISOString(),snapshots,warnings};
}
function download(data){const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='SidelineIQ-recovery-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
const api={validate,candidates,scan,download};root.SDNARecovery=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
