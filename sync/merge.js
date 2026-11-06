(function(root){
  const safe=k=>!['__proto__','prototype','constructor'].includes(k);
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
  function merge(base,local,remote,path=''){
    if(same(local,base))return remote;
    if(same(remote,base)||same(local,remote))return local;
    if(object(local)&&object(remote)){
      // A completion/session/move is one action: don't combine half of two edits.
      if(local.updatedAt||remote.updatedAt)return (local.updatedAt||'')>(remote.updatedAt||'')?local:remote;
      const out={};
      for(const k of new Set([...Object.keys(base||{}),...Object.keys(local),...Object.keys(remote)])){
        if(!safe(k))continue;
        const v=merge(base?.[k],local[k],remote[k],path+'/'+k);
        if(v!==undefined)out[k]=v;
      }
      return out;
    }
    if(Array.isArray(local)&&Array.isArray(remote)&&path==='/custom'){
      const byId=a=>Object.fromEntries((a||[]).filter(t=>t&&safe(t.id)).map(t=>[t.id,t]));
      return Object.values(merge(byId(base),byId(local),byId(remote),'/tasks'));
    }
    if(Array.isArray(local)&&Array.isArray(remote)&&path==='/legacy')
      return [...new Map([...remote,...local].map(v=>[JSON.stringify(v),v])).values()];
    // Concurrent edits to one note keep this device's edit. A full local snapshot
    // is retained before every merge, so either version can be recovered.
    return local;
  }
  root.StudyMerge={merge,same};
  if(typeof module!=='undefined')module.exports=root.StudyMerge;
})(globalThis);
