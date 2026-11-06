(() => {
  const cfg=window.STUDY_CLOUD_CONFIG, SESSION=KEY+'-cloud-session', OWNER=KEY+'-cloud-owner';
  const clone=x=>JSON.parse(JSON.stringify(x));
  let session=null, meta=null, busy=false, timer, status='未登录 · 记录保存在本机', authBusy=false,needsLogin=false;
  try{session=JSON.parse(localStorage.getItem(SESSION)||'null')}catch{}
  const domestic=cfg?.provider==='unicloud';
  const configured=!!(cfg?.url?.startsWith('https://')&&(domestic||cfg?.key));
  const metaKey=()=>KEY+'-cloud-'+session.user.id;
  const snapshot=()=>{const k=KEY+'-cloud-recovery';let a=[];try{a=JSON.parse(localStorage.getItem(k)||'[]')}catch{}a.push({at:new Date().toISOString(),state:clone(state)});localStorage.setItem(k,JSON.stringify(a.slice(-5)))};
  function persist(){localStorage.setItem(SESSION,JSON.stringify(session));if(meta)localStorage.setItem(metaKey(),JSON.stringify(meta))}
  function paint(){document.querySelectorAll('[data-cloud-status]').forEach(el=>el.textContent=status);const side=document.querySelector('.side-bottom');if(side&&!side.querySelector('[data-cloud-status]'))side.innerHTML='<span class="live-dot"></span><span data-cloud-status></span><br><button class="text-button" data-view="settings">账号与备份 ↗</button>';document.querySelectorAll('[data-cloud-status]').forEach(el=>el.textContent=status)}
  async function request(path,body,auth=true,method='POST'){
    if(domestic){
      let payload;
      if(path.includes('grant_type=password'))payload={action:'login',username:body.email,password:body.password};
      else if(path.includes('/rpc/'))payload={action:'sync',...body};
      else if(path.includes('logout'))payload={action:'logout'};
      else if(method==='GET')payload={action:'pull'};
      else throw Error('请使用已配置的学习同步账号登录');
      // uniCloud answers OPTIONS before invoking the function. A simple HTTPS
      // POST avoids that gateway preflight; the bearer remains in the body.
      if(auth)payload.token=session.access_token;
      const r=await fetch(cfg.url,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
      const data=await r.json();if(!r.ok){if(auth&&r.status===401){needsLogin=true;if(view==='settings')render()}throw Error(data.message||'云端暂时无法连接')}
      return method==='GET'?[data]:data;
    }
    if(auth&&session.expires_at*1000<Date.now()+60000){
      const next=await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token},false);
      session=next;persist();
    }
    const r=await fetch(cfg.url+path,{method,headers:{apikey:cfg.key,...(auth?{Authorization:'Bearer '+session.access_token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
    const data=await r.json();
    if(!r.ok)throw Error(r.status===401?'登录已过期或账号密码有误，请重新登录':r.status===429?'操作较频繁，请稍后重试':'云端暂时无法连接，请检查邮箱验证和网络');
    return data;
  }
  function normalize(s){return {records:{},custom:[],notes:{},theme:state.theme,legacy:[],moves:{},memory:{},checks:{},sessions:{},politics:null,...s}}
  function apply(s){state=normalize(s);originalSave();if(plan){initV2();if(!document.querySelector('dialog[open]')&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))render()}}
  async function pull(){const rows=await request('/rest/v1/study_progress?select=data,revision',null,true,'GET');return rows[0]||{data:{},revision:0}}
  async function connect(mergeLocal){
    status='正在读取云端记录…';paint();
    const row=await pull();snapshot();
    meta={base:clone(row.data),revision:row.revision,ready:true};
    const next=mergeLocal?StudyMerge.merge({},clone(state),row.data):row.data;
    localStorage.setItem(OWNER,session.user.id);persist();apply(next);await sync();
  }
  async function sync(){
    if(!configured||!session||!meta?.ready||busy||!plan||needsLogin)return;
    // Avoid re-rendering while the user is typing into a note or task form.
    if(document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
    busy=true;status='正在同步…';paint();
    try{
      let row=await pull();
      for(let attempt=0;attempt<5;attempt++){
        const sent=clone(state),merged=StudyMerge.merge(meta.base,sent,row.data);
        if(StudyMerge.same(merged,row.data)){
          if(!StudyMerge.same(sent,merged)){snapshot();apply(merged)}
          meta={base:clone(row.data),revision:row.revision,ready:true};persist();status='已同步 · '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});return;
        }
        const result=await request('/rest/v1/rpc/sync_study_progress',{expected_revision:row.revision,progress:merged});
        if(!result.ok){row=result;continue}
        // Include edits made while this request was in flight.
        const next=StudyMerge.merge(sent,clone(state),result.data);
        if(!StudyMerge.same(state,next)){snapshot();apply(next)}
        meta={base:clone(result.data),revision:result.revision,ready:true};persist();
        status=StudyMerge.same(next,result.data)?'已同步 · '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):'本机已保存 · 等待同步';
        if(!StudyMerge.same(next,result.data))schedule();return;
      }
      throw Error('其他设备正在保存，稍后自动重试');
    }catch(e){status=navigator.onLine?e.message:'离线 · 记录已保存在本机，联网后同步'}
    finally{busy=false;paint()}
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(sync,900)}
  const originalSave=save;save=function(){originalSave();if(session&&meta?.ready){status='本机已保存 · 等待同步';schedule();paint()}};
  const originalRender=render;render=function(){originalRender();if(view==='settings')panel();paint()};
  function panel(){
    const node=document.createElement('section');node.className='setting-row';node.style.cssText='display:block';
    const owner=localStorage.getItem(OWNER),mayMerge=!owner||owner===session?.user?.id;
    node.innerHTML=`<h2>账号与云端同步</h2><p data-cloud-status>${esc(status)}</p>${!configured?'<p>云端同步尚未启用，现有记录仍保存在本机。</p>':session&&!needsLogin?`<p>已登录：${esc(session.user.email)}</p>${!meta?.ready?`<p>首次连接前会保留本机快照。请选择要同步的记录。</p>${mayMerge?'<button class="primary" data-cloud="merge">合并本机与云端记录</button>':'<p>这台设备此前使用过另一个账号，本次只读取当前账号的云端记录。</p>'}<button class="secondary" data-cloud="pull">使用云端记录</button>`:'<button class="primary" data-cloud="sync">立即同步</button>'} <button class="secondary" data-cloud="logout">退出登录</button>`:`<form id="cloud-login"><label>邮箱<input name="email" type="email" autocomplete="username" required></label><label>密码<input name="password" type="password" autocomplete="current-password" minlength="8" required></label><p>所有设备使用相同邮箱登录。首次使用请注册并完成邮箱验证。</p><div class="setting-actions"><button class="primary" name="action" value="login">登录</button><button class="secondary" name="action" value="signup">注册账号</button></div></form>`}<p class="tiny">联网时自动同步打卡、笔记、改期、自定任务和专题进度；离线时先保存在本机。两台设备同时修改同一条笔记时，保留正在同步设备的版本；合并前快照可恢复。</p><button class="secondary" data-cloud="recovery">导出合并前快照</button>`;
    $('#main').prepend(node);
    if(domestic){const f=$('#cloud-login');if(f){f.querySelector('[name="email"]').type='text';f.querySelector('[name="email"]').parentElement.firstChild.textContent='同步账号';f.querySelector('[value="signup"]').remove();f.querySelector('p').textContent='手机和电脑使用同一个同步账号与密码登录。';f.querySelector('[name="password"]').minLength=12}}
    $('#main').querySelectorAll('.section-note').forEach(el=>{if(el.textContent.includes('暂不跨设备'))el.textContent='未登录时记录保存在本机；登录后可启用云端同步。换设备仍可使用备份导入导出。'});
    const intro=$('#main > .subtext');if(intro)intro.textContent='登录同一账号，在手机和电脑间继续学习；也可以随时导出本机备份。';
  }
  document.addEventListener('submit',async e=>{
    if(e.target.id!=='cloud-login')return;e.preventDefault();if(authBusy)return;authBusy=true;
    const f=new FormData(e.target),signup=e.submitter?.value==='signup';
    try{
      status='正在'+(signup?'注册':'登录')+'…';paint();
      const data=await request(signup?'/auth/v1/signup':'/auth/v1/token?grant_type=password',{email:f.get('email'),password:f.get('password')},false);
      if(!data.access_token){status='请到邮箱完成验证，再返回这里登录';toast(status);return}
      session=data;needsLogin=false;meta=null;try{meta=JSON.parse(localStorage.getItem(metaKey())||'null')}catch{}
      if(localStorage.getItem(OWNER)!==session.user.id)meta=null;
      persist();status='已登录，请选择记录合并方式';render();
      if(meta?.ready&&localStorage.getItem(OWNER)===session.user.id)await sync();
    }catch(err){status=err.message;toast(status)}finally{authBusy=false;paint()}
  });
  document.addEventListener('click',async e=>{
    const action=e.target.closest('[data-cloud]')?.dataset.cloud;if(!action)return;
    try{
      if(action==='sync')await sync();
      if(action==='merge'||action==='pull'){if(busy)return;busy=true;try{await connect(action==='merge')}finally{busy=false}await sync();render()}
      if(action==='logout'){
        if(busy){toast('正在保存，请稍等');return}
        if(meta?.ready&&!StudyMerge.same(state,meta.base)){toast('还有本机记录等待同步，请先联网同步后退出');return}
        if(domestic)await request('/logout',{});
        session=null;meta=null;localStorage.removeItem(SESSION);status='已退出 · 本机记录仍保留';render();
      }
      if(action==='recovery'){
        const raw=localStorage.getItem(KEY+'-cloud-recovery');if(!raw){toast('暂时没有合并前快照');return}
        const entries=JSON.parse(raw),last=entries.at(-1);const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({format:KEY,state:last.state,cloudSnapshots:entries},null,2)],{type:'application/json'}));a.href=url;a.download='study-合并前备份.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }
    }catch(err){status=err.message;toast(status);paint()}
  });
  if(session){try{meta=JSON.parse(localStorage.getItem(metaKey())||'null')}catch{}if(localStorage.getItem(OWNER)!==session.user.id)meta=null;status=meta?.ready?'正在连接云端…':'已登录 · 请在设置中选择记录合并方式'}
  addEventListener('online',schedule);addEventListener('focus',schedule);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
  setInterval(()=>{if(!document.hidden)sync()},domestic?600000:15000);schedule();
})();
