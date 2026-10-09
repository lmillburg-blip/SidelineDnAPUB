let recoveryPackage;
const element=(tag,text)=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;return node;};
document.getElementById('scan').onclick=async()=>{
 const b=document.getElementById('scan'),status=document.getElementById('status'),results=document.getElementById('results');
 b.disabled=true;document.getElementById('download').hidden=true;results.replaceChildren();status.textContent='Reading saved records…';
 try{
  recoveryPackage=await SDNARecovery.scan();
  const combined=recoveryPackage.snapshots.find(s=>s.label.startsWith('COMBINED HISTORY'));
  const state=combined?.state||recoveryPackage.snapshots[0]?.state;
  status.textContent='Recovery scanner 4 — '+(state?.games.length||0)+' unique games found. Website: '+recoveryPackage.origin;
  if(state){
   results.append(element('h2','Games found'));
   const list=element('ul');
   for(const g of state.games){
    const team=state.teams.find(t=>String(t.id)===String(g.teamId));
    const item=element('li',(team?.name||g.teamId)+' vs '+(g.opponent||g.name||'Unnamed opponent')+' — '+(g.date||g.startsAt||'No date')+' — '+g.plays.length+' plays');
    const detail=element('details');detail.append(element('summary','Saved copies / sources'));
    const sources=recoveryPackage.snapshots.filter(s=>!s.label.startsWith('COMBINED HISTORY')&&s.state.games.some(x=>String(x.id)===String(g.id)&&String(x.teamId)===String(g.teamId)));
    for(const source of sources)detail.append(element('p',source.label));
    item.append(detail);list.append(item);
   }
   results.append(list);
  }
  const details=element('details');details.append(element('summary','Storage diagnostics'));
  details.append(element('p','Only storage for this website, browser and profile can be read. Compare this website address with the old app.'));
  for(const line of [...recoveryPackage.snapshots.filter(s=>!s.label.startsWith('COMBINED HISTORY')).map(s=>s.label+': '+s.state.games.length+' games'),...(recoveryPackage.diagnostics||[]),...recoveryPackage.warnings])details.append(element('p',line));
  results.append(details);
  if(recoveryPackage.warnings.length)results.append(element('p','Some storage could not be recovered. Expand Storage diagnostics for details.'));
  document.getElementById('download').hidden=!recoveryPackage.snapshots.length;
 }catch(e){status.textContent=e.message;}finally{b.disabled=false;}
};
document.getElementById('download').onclick=()=>SDNARecovery.download(recoveryPackage);
