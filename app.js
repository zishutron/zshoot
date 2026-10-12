/* ZShoot community: reviews, ideas, support, My requests and the admin panel.
   Talks to the data layer in store.js (window.ZS). */
(function(){
  'use strict';
  var $=function(id){return document.getElementById(id)};
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function trunc(s,n){s=String(s||'');return s.length>n?s.slice(0,n-1)+'…':s}
  function fmtDate(t){try{return new Date(t).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(_){return ''}}
  function ago(t){
    var s=Math.max(1,Math.round((Date.now()-t)/1000));
    if(s<60)return 'just now';if(s<3600)return Math.round(s/60)+' min ago';
    if(s<86400)return Math.round(s/3600)+' h ago';return Math.round(s/86400)+' d ago';
  }
  function lsGet(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(_){return d}}
  function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}

  var CATS={feature:'New feature',powerup:'Power-up or weapon',waves:'Waves and difficulty',controls:'Controls and interface',art:'Art and sound',balance:'Balance change',other:'Something else',
    install:'Install problem',bug:'Bug or crash',performance:'Lag or performance',privacy:'Privacy or data request'};
  var KIND={review:'Review',idea:'Idea',ticket:'Support'};
  var STAGE={planned:'Planned',in_progress:'In progress',shipped:'Shipped'};

  var ds=null,ready=false;
  var S={mine:[],pubReviews:[],pubIdeas:[],votes:[],all:[]};
  var unsubs={};

  /* ---------- toast ---------- */
  var toastT;
  function toast(msg){
    var t=$('toast');if(!t)return;t.textContent=msg;t.hidden=false;
    clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true},4200);
  }
  function setMsg(el,text,cls){el.textContent=text||'';el.className='msg'+(cls?' '+cls:'')}

  /* ---------- My requests drawer open/close ---------- */
  var openName=null;
  function lockScroll(on){document.body.style.overflow=on?'hidden':''}
  function closeAll(){
    if($('drawer')){$('drawer').hidden=true;$('scrim').hidden=true}
    lockScroll(false);openName=null;
    try{if(location.hash==='#requests')history.replaceState(null,'',location.pathname+location.search)}catch(_){}
  }
  function openSheet(name){
    if(name!=='requests'||!$('drawer'))return;
    closeAll();openName=name;
    $('drawer').hidden=false;$('scrim').hidden=false;lockScroll(true);openDrawer();
    var b=$('drawer').querySelector('[data-close]');if(b)b.focus();
  }
  document.addEventListener('click',function(e){
    var o=e.target.closest('[data-open]');
    if(o){e.preventDefault();openSheet(o.getAttribute('data-open'));return}
    if(e.target.closest('[data-close]')||e.target.id==='scrim'){closeAll()}
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&openName)closeAll()});
  if($('reqBtn'))$('reqBtn').addEventListener('click',function(){openSheet('requests')});

  /* ---------- helpers ---------- */
  function stars(n,cls){
    var h='';
    for(var i=1;i<=5;i++)h+='<svg viewBox="0 0 24 24" class="'+(i<=n?'':'off')+'" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.2 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/></svg>';
    return '<span class="stars-ro '+(cls||'')+'" role="img" aria-label="'+n+' out of 5 stars">'+h+'</span>';
  }
  function statusInfo(it){
    var s=it.status;
    if(it.kind==='review')return s==='approved'?['Published','p-ok']:s==='rejected'?['Not published','p-bad']:['In review','p-pending'];
    if(it.kind==='idea'){
      if(s==='approved')return [(STAGE[it.stage]||'Approved'),it.stage==='shipped'?'p-ok':'p-plan'];
      return s==='rejected'?['Not planned','p-bad']:['In review','p-pending'];
    }
    return s==='answered'?['Answered','p-ok']:s==='resolved'?['Resolved','p-ok']:s==='closed'?['Closed','']:['Open','p-info'];
  }
  function pill(it){var i=statusInfo(it);return '<span class="pill '+i[1]+'">'+esc(i[0])+'</span>'}
  function titleOf(it){return it.kind==='ticket'?it.subject:it.title}
  function blocked(){return ready&&!ds.canSubmit()}
  var lastSubmit=0;
  function cooldownLeft(){
    var t=lsGet('zs-last-submit',0);var left=30-Math.round((Date.now()-t)/1000);return left>0?left:0;
  }

  /* ---------- API on top of the docstore ---------- */
  var A={
    submit:function(kind,f){
      var u=ds.uid(),id=ds.newId(),now=Date.now();
      var item={id:id,uid:u,kind:kind,code:'ZS-'+id.slice(-4).toUpperCase(),status:kind==='ticket'?'open':'pending',createdAt:now,updatedAt:now,adminAt:0,lastMsgBy:'',lastMsgAt:0};
      for(var k in f)item[k]=f[k];
      return ds.set('inbox/'+u+'/items/'+id,item).then(function(){return ds.merge('inbox/'+u,{uid:u,lastAt:now})}).then(function(){lsSet('zs-last-submit',now);return item});
    },
    postMsg:function(it,text,from){
      var mid=ds.newId(),now=Date.now(),base='inbox/'+it.uid+'/items/'+it.id;
      return ds.set(base+'/msgs/'+mid,{id:mid,from:from,text:text,at:now}).then(function(){
        var p={lastMsgBy:from,lastMsgAt:now,updatedAt:now};
        if(from==='admin'){p.adminAt=now;if(it.kind==='ticket'&&it.status==='open')p.status='answered'}
        return ds.update(base,p);
      }).then(function(){return ds.merge('inbox/'+it.uid,{uid:it.uid,lastAt:now})});
    },
    toggleVote:function(ideaId){
      var u=ds.uid(),mine={};
      S.votes.forEach(function(v){if(v.id===u&&v.ids)for(var k in v.ids)if(v.ids[k])mine[k]=true});
      if(mine[ideaId])delete mine[ideaId];else mine[ideaId]=true;
      return ds.set('votes/'+u,{ids:mine});
    }
  };

  /* ---------- forms: counters, honeypot, shared checks ---------- */
  document.querySelectorAll('.count[data-for]').forEach(function(c){
    var el=$(c.getAttribute('data-for'));if(!el)return;var max=el.maxLength;
    function upd(){c.textContent=el.value.length+' / '+max}
    el.addEventListener('input',upd);upd();
  });
  function bad(el,on){el.classList.toggle('invalid',!!on)}
  function checkLen(el,min,label,errs){
    var v=el.value.trim();var ok=v.length>=min;bad(el,!ok);
    if(!ok)errs.push(label+' needs at least '+min+' characters.');return v;
  }
  function gate(msgEl){
    if(!ready){setMsg(msgEl,'Still connecting. Try again in a moment.','err');return false}
    if(!ds.canSubmit()){setMsg(msgEl,ds.whyNoSubmit||'Sending is not available right now.','err');return false}
    var l=cooldownLeft();
    if(l){setMsg(msgEl,'Please wait '+l+' seconds before sending another one.','err');return false}
    return true;
  }
  function lastName(){return lsGet('zs-name','')}
  ['rv-name','id-name'].forEach(function(id){if($(id))$(id).value=lastName()});

  /* ---------- reviews ---------- */
  var rating=0,starBox=$('stars');
  if(starBox)(function(){
    var h='';
    for(var i=1;i<=5;i++)h+='<button type="button" role="radio" aria-checked="false" aria-label="'+i+' star'+(i>1?'s':'')+'" data-v="'+i+'"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.2 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/></svg></button>';
    starBox.innerHTML=h;
  })();
  function setRating(n){
    rating=n;
    starBox.querySelectorAll('button').forEach(function(b){var v=+b.dataset.v;b.classList.toggle('on',v<=n);b.setAttribute('aria-checked',String(v===n))});
  }
  if(starBox)starBox.addEventListener('click',function(e){var b=e.target.closest('button');if(b)setRating(+b.dataset.v)});
  if(starBox)starBox.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'||e.key==='ArrowUp'){e.preventDefault();setRating(Math.min(5,rating+1))}
    if(e.key==='ArrowLeft'||e.key==='ArrowDown'){e.preventDefault();setRating(Math.max(1,rating-1))}
  });
  if($('revToggle'))$('revToggle').addEventListener('click',function(){
    var f=$('revForm'),open=f.hidden;f.hidden=!open;
    $('revToggle').setAttribute('aria-expanded',String(open));
    $('revToggle').textContent=open?'Close':'Write a review';
    if(open)$('rv-title').focus();
  });
  if($('revForm'))$('revForm').addEventListener('submit',function(e){
    e.preventDefault();
    var msg=$('revMsg'),errs=[];
    if($('rv-hp').value){setMsg(msg,'Thanks! Your review is waiting for the developer.','ok');return}
    if(!rating)errs.push('Pick a star rating.');
    var title=checkLen($('rv-title'),4,'The headline',errs),body=checkLen($('rv-body'),20,'The review',errs);
    if(errs.length){setMsg(msg,errs[0],'err');return}
    if(!gate(msg))return;
    var name=$('rv-name').value.trim()||'Player';lsSet('zs-name',name);
    var btn=e.target.querySelector('button[type=submit]');btn.disabled=true;setMsg(msg,'Sending...');
    A.submit('review',{rating:rating,title:title,body:body,name:name,version:$('rv-ver').value}).then(function(it){
      e.target.reset();setRating(0);$('rv-name').value=name;
      document.querySelectorAll('.count[data-for]').forEach(function(c){var t=$(c.getAttribute('data-for'));if(t)c.textContent='0 / '+t.maxLength});
      setMsg(msg,'Thank you! Your review is waiting for the developer. Reference '+it.code+'.','ok');
      toast('Review sent. It appears here once the developer approves it. Reference '+it.code+'.');
    }).catch(function(){setMsg(msg,'Could not send. Check your connection and try again.','err')}).then(function(){btn.disabled=false});
  });

  function renderReviews(){
    var rows=S.pubReviews.slice().sort(function(a,b){return (b.featured?1:0)-(a.featured?1:0)||(b.at||0)-(a.at||0)});
    var sum=$('revSummary'),list=$('revList');if(!list)return;
    if(!ready){sum.innerHTML='';list.innerHTML='<div class="empty"><b>Loading reviews</b></div>';return}
    var n=rows.length,total=0,dist=[0,0,0,0,0,0];
    rows.forEach(function(r){var v=Math.max(1,Math.min(5,r.rating|0));total+=v;dist[v]++});
    if(n){
      var bars='';for(var s=5;s>=1;s--)bars+='<div class="bar"><span>'+s+'</span><i><b style="width:'+Math.round(dist[s]/n*100)+'%"></b></i><span>'+dist[s]+'</span></div>';
      sum.innerHTML='<div><div class="avg">'+(total/n).toFixed(1)+'</div>'+stars(Math.round(total/n))+'<div class="hint">'+n+' review'+(n>1?'s':'')+'</div></div><div class="bars">'+bars+'</div>';
    }else sum.innerHTML='';
    if(!n){list.innerHTML='<div class="empty"><b>No reviews yet</b><span>Be the first to review ZShoot 3. The developer reads every one before it appears here.</span></div>';return}
    list.innerHTML=rows.map(function(r){
      return '<article class="rev">'+stars(r.rating|0)+'<h4>'+esc(r.title)+'</h4><p>'+esc(r.body)+'</p><span class="by">'+esc(r.name||'Player')+(r.version==='older'?' &middot; older version':' &middot; version '+esc(r.version||''))+' &middot; '+esc(fmtDate(r.at).split(',')[0])+'</span>'+(r.reply?'<div class="dev"><b>Developer reply</b>'+esc(r.reply)+'</div>':'')+'</article>';
    }).join('');
  }

  /* ---------- ideas ---------- */
  if($('ideaForm'))$('ideaForm').addEventListener('submit',function(e){
    e.preventDefault();
    var msg=$('ideaMsg'),errs=[];
    if($('id-hp').value){setMsg(msg,'Sent to the developer. Thank you!','ok');return}
    var title=checkLen($('id-title'),4,'The title',errs),body=checkLen($('id-body'),40,'The description',errs);
    var email=$('id-email').value.trim();
    if(email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){bad($('id-email'),true);errs.push('That email address does not look right.')}else bad($('id-email'),false);
    if(!$('id-ok').checked)errs.push('Please tick the box to confirm you understand how ideas are used.');
    if(errs.length){setMsg(msg,errs[0],'err');return}
    if(!gate(msg))return;
    var name=$('id-name').value.trim()||'Player';lsSet('zs-name',name);
    var btn=e.target.querySelector('button[type=submit]');btn.disabled=true;setMsg(msg,'Sending...');
    A.submit('idea',{title:title,category:$('id-cat').value,body:body,why:$('id-why').value.trim(),name:name,email:email}).then(function(it){
      e.target.reset();$('id-name').value=name;
      document.querySelectorAll('.count[data-for]').forEach(function(c){var t=$(c.getAttribute('data-for'));if(t)c.textContent='0 / '+t.maxLength});
      setMsg(msg,'Sent to the developer. Your reference is '+it.code+'. Follow it under My requests.','ok');
      toast('Idea sent to the developer.');
    }).catch(function(){setMsg(msg,'Could not send. Check your connection and try again.','err')}).then(function(){btn.disabled=false});
  });

  var stageTab='planned';
  if($('roadList'))document.querySelector('.road .tabs').addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;
    stageTab=b.dataset.stage;
    this.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-selected',String(x===b))});
    renderRoad();
  });
  function voteCounts(){
    var c={},mine={},u=ready?ds.uid():null;
    S.votes.forEach(function(v){if(!v.ids)return;for(var k in v.ids)if(v.ids[k]){c[k]=(c[k]||0)+1;if(v.id===u)mine[k]=true}});
    return {c:c,mine:mine};
  }
  function renderRoad(){
    var box=$('roadList');if(!box)return;
    if(!ready){box.innerHTML='<div class="empty"><b>Loading</b></div>';return}
    var vc=voteCounts();
    var rows=S.pubIdeas.filter(function(i){return (i.stage||'planned')===stageTab}).sort(function(a,b){return (vc.c[b.id]||0)-(vc.c[a.id]||0)||(b.updatedAt||0)-(a.updatedAt||0)});
    if(!rows.length){
      var txt={planned:'Nothing planned yet. Send an idea and it could be the first.',in_progress:'Nothing is in progress right now.',shipped:'Nothing shipped from the community yet.'};
      box.innerHTML='<div class="empty"><b>'+esc(STAGE[stageTab])+'</b><span>'+txt[stageTab]+'</span></div>';return;
    }
    var can=ds.canSubmit();
    box.innerHTML=rows.map(function(i){
      var on=!!vc.mine[i.id];
      return '<article class="idea"><h4>'+esc(i.title)+'</h4><button class="vote" type="button" data-v="'+esc(i.id)+'" aria-pressed="'+on+'" aria-label="Vote for '+esc(i.title)+'"'+(can?'':' disabled')+'><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l9 15H3z"/></svg>'+(vc.c[i.id]||0)+'</button><p>'+esc(trunc(i.body,200))+'</p><div class="meta"><span class="pill">'+esc(CATS[i.category]||'Idea')+'</span>'+(i.targetVersion?'<span class="pill p-plan">'+esc(i.targetVersion)+'</span>':'')+(i.credit?'<span>by '+esc(i.credit)+'</span>':'')+'</div></article>';
    }).join('');
  }
  if($('roadList'))$('roadList').addEventListener('click',function(e){
    var b=e.target.closest('.vote');if(!b||b.disabled)return;
    b.disabled=true;A.toggleVote(b.dataset.v).catch(function(){toast('Could not save your vote.')}).then(function(){b.disabled=false});
  });

  /* ---------- support ---------- */
  if($('tkForm'))$('tkForm').addEventListener('submit',function(e){
    e.preventDefault();
    var msg=$('tkMsg'),errs=[];
    if($('tk-hp').value){setMsg(msg,'Sent to support. Thank you!','ok');return}
    var subj=checkLen($('tk-subject'),4,'The subject',errs),body=checkLen($('tk-body'),20,'The message',errs);
    var email=$('tk-email').value.trim();
    if(email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){bad($('tk-email'),true);errs.push('That email address does not look right.')}else bad($('tk-email'),false);
    if(errs.length){setMsg(msg,errs[0],'err');return}
    if(!gate(msg))return;
    var btn=e.target.querySelector('button[type=submit]');btn.disabled=true;setMsg(msg,'Sending...');
    A.submit('ticket',{subject:subj,category:$('tk-cat').value,body:body,device:$('tk-device').value.trim(),email:email,name:lastName()||'Player'}).then(function(it){
      e.target.reset();
      document.querySelectorAll('.count[data-for]').forEach(function(c){var t=$(c.getAttribute('data-for'));if(t)c.textContent='0 / '+t.maxLength});
      setMsg(msg,'Ticket sent. Your reference is '+it.code+'. The answer will appear under My requests.','ok');
      toast('Support ticket sent.');
    }).catch(function(){setMsg(msg,'Could not send. Check your connection and try again.','err')}).then(function(){btn.disabled=false});
  });

  /* ---------- thread (shared by player drawer and admin) ---------- */
  function mountThread(box,it,who){
    var key='thr:'+who+':'+it.id;
    if(unsubs[key]){unsubs[key]();delete unsubs[key]}
    box.innerHTML='<div class="thread" aria-live="polite"></div><form class="reply"><textarea maxlength="800" rows="1" placeholder="'+(who==='admin'?'Reply to the player':'Write a message to the developer')+'" aria-label="Message"></textarea><button class="btn" type="submit">Send</button></form>';
    var th=box.querySelector('.thread'),ta=box.querySelector('textarea'),form=box.querySelector('form');
    unsubs[key]=ds.watch('inbox/'+it.uid+'/items/'+it.id+'/msgs',function(rows){
      rows.sort(function(a,b){return a.at-b.at});
      th.innerHTML=rows.length?rows.map(function(m){
        var mine=(m.from==='admin')===(who==='admin');
        return '<div class="bub '+(m.from==='admin'?'admin':'user')+'">'+esc(m.text)+'<small>'+(m.from==='admin'?'Developer':esc(it.name||'Player'))+' &middot; '+esc(ago(m.at))+'</small></div>';
      }).join(''):'<p class="hint">No messages yet.</p>';
    });
    form.addEventListener('submit',function(e){
      e.preventDefault();var t=ta.value.trim();if(!t)return;
      var b=form.querySelector('button');b.disabled=true;
      A.postMsg(it,t,who).then(function(){ta.value='';if(who==='admin'){var ss=$('d-status');if(ss&&ss.value==='open')ss.value='answered';afterAdminWrite(it.uid)}}).catch(function(){toast('Could not send the message.')}).then(function(){b.disabled=false});
    });
  }
  function stopThreads(prefix){
    Object.keys(unsubs).forEach(function(k){if(k.indexOf(prefix)===0){unsubs[k]();delete unsubs[k]}});
  }

  /* ---------- My requests drawer ---------- */
  var seen=lsGet('zs-seen',{}),prevAdmin={},firstMine=true,openThreads={};
  function unseenCount(){
    var n=0;S.mine.forEach(function(i){if((i.adminAt||0)>(seen[i.id]||0))n++});return n;
  }
  function updateBadge(){
    var n=unseenCount(),b=$('reqBadge');if(!b)return;b.hidden=!n||openName==='requests';b.textContent=n;
  }
  function planBox(it){
    if(it.kind!=='idea'||it.status!=='approved')return '';
    var cells=[['Stage',STAGE[it.stage]||'Planned'],['Priority',it.priority||''],['Target version',it.targetVersion||''],['Estimate',it.eta||'']].filter(function(c){return c[1]});
    return '<div class="planbox">'+cells.map(function(c){return '<div><span>'+esc(c[0])+'</span>'+esc(c[1])+'</div>'}).join('')+'</div>'+(it.plan?'<div class="note"><b>How it will be added</b>'+esc(it.plan)+'</div>':'');
  }
  function reqCard(it,isNew){
    var open=!!openThreads[it.id];
    return '<article class="req'+(isNew?' new':'')+'" data-id="'+esc(it.id)+'"><div class="req-top"><span class="pill">'+KIND[it.kind]+'</span>'+pill(it)+'<span class="code">'+esc(it.code||'')+'</span></div>'
      +'<h4>'+esc(titleOf(it))+'</h4>'
      +(it.kind==='review'?stars(it.rating|0):'')
      +'<div class="body">'+esc(trunc(it.body,260))+'</div>'
      +(it.adminNote?'<div class="note"><b>From the developer</b>'+esc(it.adminNote)+'</div>':'')
      +(it.kind==='review'&&it.replyPublic?'<div class="note"><b>Public reply</b>'+esc(it.replyPublic)+'</div>':'')
      +planBox(it)
      +'<button class="linkbtn" type="button" data-thread="'+esc(it.id)+'">'+(open?'Hide conversation':'Open conversation')+'</button>'
      +'<div class="thread-box"'+(open?'':' hidden')+'></div>'
      +'<span class="hint">Sent '+esc(fmtDate(it.createdAt))+'</span></article>';
  }
  var newInSession={};
  function renderMine(){
    var box=$('drawerBody');if(!box)return;
    if(!ready){box.innerHTML='<div class="empty"><b>Connecting</b></div>';return}
    var rows=S.mine.slice().sort(function(a,b){return b.createdAt-a.createdAt});
    if(!rows.length){box.innerHTML='<div class="empty"><b>Nothing sent yet</b><span>Reviews, ideas and support tickets you send show up here with their status and the developer\'s reply.</span><a class="btn" href="'+(window.ZS_ROOT||'')+'ideas/" style="margin-top:10px">Send an idea</a></div>';return}
    box.innerHTML=rows.map(function(it){return reqCard(it,!!newInSession[it.id])}).join('');
    rows.forEach(function(it){
      if(openThreads[it.id]){var c=box.querySelector('[data-id="'+it.id+'"] .thread-box');if(c)mountThread(c,it,'user')}
    });
  }
  function openDrawer(){
    newInSession={};
    S.mine.forEach(function(i){if((i.adminAt||0)>(seen[i.id]||0))newInSession[i.id]=true;seen[i.id]=Math.max(seen[i.id]||0,i.adminAt||0)});
    lsSet('zs-seen',seen);renderMine();updateBadge();
  }
  if($('drawerBody'))$('drawerBody').addEventListener('click',function(e){
    var t=e.target.closest('[data-thread]');if(!t)return;
    var id=t.getAttribute('data-thread');openThreads[id]=!openThreads[id];
    if(!openThreads[id])stopThreads('thr:user:'+id);
    renderMine();
  });

  /* ================= ADMIN ================= */
  var AD={on:false,tab:'overview',filter:'all',q:'',sel:null,started:false,watcher:null};
  function afterAdminWrite(uid){if(AD.watcher)AD.watcher.refresh(uid)}

  function startAdminData(){
    if(AD.started)return;AD.started=true;
    var users={},items={};
    function emit(){var all=[];Object.keys(items).forEach(function(k){all=all.concat(items[k])});S.all=all;adminRefresh()}
    function load(u){return ds.list('inbox/'+u+'/items').then(function(l){items[u]=l;emit()}).catch(function(){})}
    unsubs.adminInbox=ds.watch('inbox',function(rows){
      rows.forEach(function(u){if(!users[u.id]||users[u.id].lastAt!==u.lastAt){users[u.id]=u;load(u.id)}});
    });
    AD.watcher={refresh:function(u){return load(u)}};
  }
  function needsAttention(it){
    if(it.kind==='ticket')return it.status==='open'||(it.lastMsgBy==='user'&&it.status!=='closed');
    return it.status==='pending';
  }
  var FILTERS={ideas:[['all','All'],['pending','Pending'],['approved','Approved'],['rejected','Rejected']],reviews:[['all','All'],['pending','Pending'],['approved','Published'],['rejected','Rejected']],tickets:[['all','All'],['open','Open'],['answered','Answered'],['resolved','Resolved'],['closed','Closed']]};
  var TABKIND={ideas:'idea',reviews:'review',tickets:'ticket'};

  function renderAdmin(){
    var root=$('adminRoot');if(!root)return;
    AD.on=true;
    if($('adminMode'))$('adminMode').textContent=ds?ds.label:'Connecting';
    if($('adminOut'))$('adminOut').hidden=!(ds&&ds.adminLogout&&ds.adminEmail&&ds.adminEmail());
    if(!ready){root.innerHTML='<div class="gate"><h2>Connecting</h2><p class="hint">One moment.</p></div>';return}
    if(!ds.isAdmin()){
      var who=ds.adminEmail&&ds.adminEmail(),uid=ds.adminUid&&ds.adminUid();
      var h='<div class="gate"><h2>Admin only</h2>';
      if(ds.kind==='offline')h+='<p class="hint">'+esc(ds.whyNoSubmit)+'</p>';
      else if(uid){
        h+='<p class="hint">Signed in as <b>'+esc(who)+'</b>, but this account is not an admin yet.</p>'
          +'<div class="note"><b>To make this account the admin</b><span>In the Firebase console open Firestore Database. Create a collection named <code>admins</code>. Add a document whose Document ID is the UID below, with one field <code>admin</code> (boolean) set to <code>true</code>. Then reload this page.</span></div>'
          +'<div class="mail-card"><span class="l">Your UID</span><div class="mail-row"><code id="uidTxt" style="word-break:break-all">'+esc(uid)+'</code><button class="mute" id="copyUid" type="button">Copy</button></div></div>'
          +'<button class="btn ghost" id="gOut" type="button">Sign out</button>';
      }else if(ds.adminLogin){
        h+='<p class="hint">Sign in with the developer Google account to manage reviews, ideas and support tickets.</p><button class="btn" id="gLogin" type="button">Sign in with Google</button><p class="msg" id="gMsg"></p>';
      }else h+='<p class="hint">Admin sign-in is not available in this mode.</p>';
      root.innerHTML=h+'</div>';
      var g=$('gLogin');if(g)g.addEventListener('click',function(){ds.adminLogin().catch(function(e){setMsg($('gMsg'),'Sign in failed: '+(e&&e.message||'try again'),'err')})});
      var go=$('gOut');if(go)go.addEventListener('click',function(){ds.adminLogout()});
      var cu=$('copyUid');if(cu)cu.addEventListener('click',function(){try{navigator.clipboard.writeText(uid);cu.textContent='Copied'}catch(_){}});
      return;
    }
    startAdminData();
    root.innerHTML='<div class="adm"><nav class="adm-nav" aria-label="Admin sections" id="admNav"></nav><div class="adm-main" id="admMain"></div></div>';
    $('admNav').addEventListener('click',function(e){
      var b=e.target.closest('button');if(!b)return;AD.tab=b.dataset.tab;AD.filter='all';AD.q='';AD.sel=null;adminRefresh(true);
    });
    adminRefresh(true);
  }
  if($('adminOut'))$('adminOut').addEventListener('click',function(){if(ds&&ds.adminLogout)ds.adminLogout()});

  function countKind(k,fn){return S.all.filter(function(i){return i.kind===k&&(!fn||fn(i))}).length}
  function adminRefresh(full){
    if(!AD.on||!$('admNav'))return;
    var nIdea=countKind('idea',needsAttention),nRev=countKind('review',needsAttention),nTk=countKind('ticket',needsAttention);
    var tabs=[['overview','Overview',0],['ideas','Ideas',nIdea],['reviews','Reviews',nRev],['tickets','Support',nTk]];
    $('admNav').innerHTML=tabs.map(function(t){return '<button type="button" data-tab="'+t[0]+'" aria-current="'+(AD.tab===t[0])+'">'+t[1]+(t[2]?'<span class="n">'+t[2]+'</span>':'')+'</button>'}).join('');
    if(AD.tab==='overview'){renderOverview();return}
    if(full||!$('admList'))renderListShell();
    renderRows();
    if(full)renderDetail();
  }

  function renderOverview(){
    var main=$('admMain');
    var ideas=S.all.filter(function(i){return i.kind==='idea'}),revs=S.all.filter(function(i){return i.kind==='review'}),tks=S.all.filter(function(i){return i.kind==='ticket'});
    var pubN=S.pubReviews.length,tot=0,dist=[0,0,0,0,0,0];
    S.pubReviews.forEach(function(r){var v=Math.max(1,Math.min(5,r.rating|0));tot+=v;dist[v]++});
    var by=function(arr,fn){return arr.filter(fn).length};
    var stage={planned:0,in_progress:0,shipped:0};ideas.forEach(function(i){if(i.status==='approved')stage[i.stage||'planned']=(stage[i.stage||'planned']||0)+1});
    function bars(rows,max){return rows.map(function(r){return '<div class="hbar"><span>'+esc(r[0])+'</span><i><b style="width:'+(max?Math.round(r[1]/max*100):0)+'%"></b></i><span>'+r[1]+'</span></div>'}).join('')}
    var attn=S.all.filter(needsAttention).sort(function(a,b){return a.createdAt-b.createdAt}).slice(0,8);
    main.innerHTML='<div class="kpis">'
      +'<div class="kpi'+(by(ideas,needsAttention)?' hot':'')+'"><b>'+by(ideas,needsAttention)+'</b><span>Ideas waiting</span></div>'
      +'<div class="kpi'+(by(revs,needsAttention)?' hot':'')+'"><b>'+by(revs,needsAttention)+'</b><span>Reviews waiting</span></div>'
      +'<div class="kpi'+(by(tks,needsAttention)?' hot':'')+'"><b>'+by(tks,needsAttention)+'</b><span>Tickets to answer</span></div>'
      +'<div class="kpi"><b>'+(pubN?(tot/pubN).toFixed(1):'-')+'</b><span>Average rating ('+pubN+' published)</span></div>'
      +'<div class="kpi"><b>'+S.all.length+'</b><span>Total received</span></div></div>'
      +'<div class="two"><div class="panel2"><h3>Ideas by decision</h3>'+bars([['Pending',by(ideas,function(i){return i.status==='pending'})],['Approved',by(ideas,function(i){return i.status==='approved'})],['Rejected',by(ideas,function(i){return i.status==='rejected'})]],ideas.length)+'<h3 style="margin-top:8px">Roadmap</h3>'+bars([['Planned',stage.planned],['In progress',stage.in_progress],['Shipped',stage.shipped]],Math.max(1,stage.planned,stage.in_progress,stage.shipped))+'</div>'
      +'<div class="panel2"><h3>Published ratings</h3>'+bars([['5 stars',dist[5]],['4 stars',dist[4]],['3 stars',dist[3]],['2 stars',dist[2]],['1 star',dist[1]]],Math.max.apply(null,dist.slice(1).concat(1)))+'</div></div>'
      +'<div class="panel2"><h3>Needs your attention</h3>'+(attn.length?'<div class="rows">'+attn.map(function(it){return '<button class="row-i" type="button" data-go="'+esc(it.id)+'"><strong>'+esc(titleOf(it))+'</strong><span class="sub"><span class="pill">'+KIND[it.kind]+'</span>'+pill(it)+'<span>'+esc(it.name||'Player')+'</span><span>'+esc(ago(it.createdAt))+'</span></span></button>'}).join('')+'</div>':'<p class="hint">All caught up. New reviews, ideas and tickets appear here the moment they arrive.</p>')+'</div>';
    main.onclick=function(e){
      var b=e.target.closest('[data-go]');if(!b)return;
      var it=S.all.filter(function(i){return i.id===b.getAttribute('data-go')})[0];if(!it)return;
      AD.tab=it.kind==='idea'?'ideas':it.kind==='review'?'reviews':'tickets';AD.sel=it.id;AD.filter='all';AD.q='';adminRefresh(true);
    };
  }

  function renderListShell(){
    var main=$('admMain');main.onclick=null;
    main.innerHTML='<div class="tools" id="admTools"></div><div class="list-wrap"><div class="rows" id="admList" aria-label="Items"></div><div id="admDetail"></div></div>';
    $('admTools').innerHTML='<input id="admQ" type="search" placeholder="Search" aria-label="Search" value="'+esc(AD.q)+'"><span id="admChips" class="tools"></span>';
    $('admQ').addEventListener('input',function(){AD.q=this.value;renderRows()});
    $('admTools').addEventListener('click',function(e){var b=e.target.closest('.fchip');if(!b)return;AD.filter=b.dataset.f;renderChips();renderRows()});
    $('admList').addEventListener('click',function(e){var b=e.target.closest('.row-i');if(!b)return;AD.sel=b.dataset.id;renderRows();renderDetail()});
    renderChips();
  }
  function renderChips(){
    $('admChips').innerHTML=FILTERS[AD.tab].map(function(f){return '<button type="button" class="fchip" data-f="'+f[0]+'" aria-pressed="'+(AD.filter===f[0])+'">'+f[1]+'</button>'}).join('');
  }
  function listItems(){
    var k=TABKIND[AD.tab],q=AD.q.toLowerCase();
    return S.all.filter(function(i){
      if(i.kind!==k)return false;
      if(AD.filter!=='all'&&i.status!==AD.filter)return false;
      if(q&&((titleOf(i)||'')+' '+(i.body||'')+' '+(i.name||'')+' '+(i.code||'')).toLowerCase().indexOf(q)<0)return false;
      return true;
    }).sort(function(a,b){return (needsAttention(b)?1:0)-(needsAttention(a)?1:0)||b.createdAt-a.createdAt});
  }
  function renderRows(){
    var box=$('admList');if(!box)return;
    var rows=listItems();
    if(!rows.length){box.innerHTML='<div class="empty"><b>Nothing here</b><span>New submissions appear instantly.</span></div>';return}
    box.innerHTML=rows.map(function(it){
      return '<button class="row-i" type="button" data-id="'+esc(it.id)+'" aria-current="'+(AD.sel===it.id)+'"><strong>'+esc(trunc(titleOf(it),70))+'</strong><span class="sub">'+(needsAttention(it)?'<i class="dot"></i>':'')+pill(it)+'<span>'+esc(it.name||'Player')+'</span><span>'+esc(ago(it.createdAt))+'</span></span></button>';
    }).join('');
  }

  var QUICK={
    idea_ok:['Great idea. It is going on the roadmap.','Thanks, this fits the game well and I want to build it.'],
    idea_no:['Thanks for the idea, but it is outside what ZShoot is trying to be.','This is already planned. Watch the roadmap.','Could you describe how it should work in more detail? Then I can look again.','This is not possible with the current game engine.'],
    review_no:['This review does not follow the community rules.','Please remove personal details and send it again.'],
    ticket:['Thanks for the report. Could you tell me your phone model and Android version?','Please uninstall ZShoot, download the latest build from the website and install it again. Check the SHA-256 checksum if you can.','Thanks, I can reproduce this and will fix it in the next update.','Glad it works now. I am closing this ticket.']
  };
  function quick(list){return '<div class="quick">'+list.map(function(t){return '<button type="button" data-q="'+esc(t)+'">'+esc(trunc(t,48))+'</button>'}).join('')+'</div>'}
  function kv(a){return '<div class="kv">'+a.filter(function(x){return x[1]}).map(function(x){return '<div><span>'+esc(x[0])+'</span>'+esc(x[1])+'</div>'}).join('')+'</div>'}

  function renderDetail(){
    var box=$('admDetail');if(!box)return;
    stopThreads('thr:admin:');
    var it=S.all.filter(function(i){return i.id===AD.sel})[0];
    if(!it){box.innerHTML='<div class="empty"><b>Select an item</b><span>Pick something from the list to read it and decide what to do.</span></div>';return}
    var email=it.email?'<a href="mailto:'+esc(it.email)+'?subject='+encodeURIComponent('Re: ['+it.code+'] '+titleOf(it))+'" style="color:var(--amber)">'+esc(it.email)+'</a>':'';
    var h='<div class="detail"><div class="req-top"><span class="pill">'+KIND[it.kind]+'</span>'+pill(it)+'<span class="code">'+esc(it.code)+'</span></div><h3>'+esc(titleOf(it))+'</h3>';
    if(it.kind==='review')h+=stars(it.rating|0);
    h+=kv([['From',it.name||'Player'],['Sent',fmtDate(it.createdAt)],['Type',CATS[it.category]||''],['Version',it.version||''],['Device',it.device||'']]);
    if(email)h+='<div class="kv"><div><span>Email</span>'+email+'</div></div>';
    h+='<div class="note"><b>'+(it.kind==='review'?'Review':it.kind==='idea'?'The idea':'Message')+'</b>'+esc(it.body)+'</div>';
    if(it.why)h+='<div class="note"><b>Why it would help</b>'+esc(it.why)+'</div>';
    if(it.kind==='idea')h+=ideaForm(it);
    else if(it.kind==='review')h+=reviewForm(it);
    else h+=ticketForm(it);
    h+='<div><div class="l" style="margin-bottom:8px">Conversation</div><div id="admThread"></div></div></div>';
    box.innerHTML=h;
    mountThread($('admThread'),it,'admin');
    wireDecision(it);
  }
  function opt(val,cur,label){return '<option value="'+val+'"'+(val===cur?' selected':'')+'>'+label+'</option>'}
  function seg(name,cur,items,cls){return '<div class="seg '+(cls||'')+'" role="radiogroup">'+items.map(function(i){return '<label><input type="radio" name="'+name+'" value="'+i[0]+'"'+(i[0]===cur?' checked':'')+'><span>'+i[1]+'</span></label>'}).join('')+'</div>'}
  function ideaForm(it){
    var st=it.status||'pending';
    return '<form class="decide" id="dForm"><div class="l">Decision</div>'+seg('dec',st,[['approved','Approve'],['pending','Keep in review'],['rejected','Reject']])
      +'<div id="apprBox"'+(st==='approved'?'':' hidden')+' style="display:grid;gap:14px"><div class="row2"><div class="field"><label class="l" for="d-stage">Stage</label><select id="d-stage">'+opt('planned',it.stage||'planned','Planned')+opt('in_progress',it.stage,'In progress')+opt('shipped',it.stage,'Shipped')+'</select></div>'
      +'<div class="field"><label class="l" for="d-prio">Priority</label><select id="d-prio">'+opt('',it.priority||'','Not set')+opt('Low',it.priority,'Low')+opt('Medium',it.priority,'Medium')+opt('High',it.priority,'High')+'</select></div></div>'
      +'<div class="row2"><div class="field"><label class="l" for="d-ver">Target version</label><input id="d-ver" maxlength="20" placeholder="Like 3.1.0" value="'+esc(it.targetVersion||'')+'"></div><div class="field"><label class="l" for="d-eta">Estimate</label><input id="d-eta" maxlength="40" placeholder="Like Next update" value="'+esc(it.eta||'')+'"></div></div>'
      +'<div class="field"><label class="l" for="d-plan">How you will add it</label><textarea id="d-plan" rows="4" maxlength="1200" placeholder="The player sees this under My requests">'+esc(it.plan||'')+'</textarea></div>'
      +'<label class="check"><input type="checkbox" id="d-pub"'+(it.showPublic===false?'':' checked')+'><span>Show on the public roadmap</span></label><label class="check"><input type="checkbox" id="d-credit"'+(it.credit===false?'':' checked')+'><span>Credit the player by name</span></label></div>'
      +'<div class="field"><label class="l" for="d-note">Message to the player</label><textarea id="d-note" rows="3" maxlength="800">'+esc(it.adminNote||'')+'</textarea></div>'
      +'<div id="qNote"></div><button class="btn" type="submit">Save decision</button><p class="msg" id="dMsg" role="status"></p></form>';
  }
  function reviewForm(it){
    var st=it.status||'pending';
    return '<form class="decide" id="dForm"><div class="l">Decision</div>'+seg('dec',st,[['approved','Publish'],['pending','Keep in review'],['rejected','Reject']])
      +'<div class="field"><label class="l" for="d-reply">Public reply</label><textarea id="d-reply" rows="3" maxlength="500" placeholder="Shown under the review when it is published">'+esc(it.replyPublic||'')+'</textarea></div>'
      +'<div class="field"><label class="l" for="d-note">Private note to the player</label><textarea id="d-note" rows="2" maxlength="500">'+esc(it.adminNote||'')+'</textarea></div><div id="qNote"></div>'
      +'<label class="check"><input type="checkbox" id="d-feat"'+(it.featured?' checked':'')+'><span>Pin to the top of the reviews</span></label>'
      +'<button class="btn" type="submit">Save decision</button><p class="msg" id="dMsg" role="status"></p></form>';
  }
  function ticketForm(it){
    return '<form class="decide" id="dForm"><div class="field"><label class="l" for="d-status">Ticket status</label><select id="d-status">'+opt('open',it.status,'Open')+opt('answered',it.status,'Answered')+opt('resolved',it.status,'Resolved')+opt('closed',it.status,'Closed')+'</select></div>'
      +'<div class="l">Quick replies</div>'+quick(QUICK.ticket)+'<button class="btn" type="submit">Save status</button><p class="msg" id="dMsg" role="status"></p></form>';
  }
  function wireDecision(it){
    var f=$('dForm');if(!f)return;
    var msg=$('dMsg');
    function quickInto(ta,list){var q=$('qNote');if(q)q.innerHTML='<div class="l" style="margin-bottom:8px">Quick messages</div>'+quick(list)}
    if(it.kind==='ticket'){
      f.addEventListener('click',function(e){var b=e.target.closest('[data-q]');if(!b)return;var ta=document.querySelector('#admThread textarea');if(ta){ta.value=b.getAttribute('data-q');ta.focus()}});
    }else{
      var apprBox=$('apprBox');
      function sync(){
        var dec=f.querySelector('input[name=dec]:checked').value;
        if(apprBox)apprBox.hidden=dec!=='approved';
        var list=it.kind==='idea'?(dec==='approved'?QUICK.idea_ok:dec==='rejected'?QUICK.idea_no:[]):(dec==='rejected'?QUICK.review_no:[]);
        $('qNote').innerHTML=list.length?'<div class="l" style="margin-bottom:8px">Quick messages</div>'+quick(list):'';
      }
      f.addEventListener('change',function(e){if(e.target.name==='dec')sync()});
      f.addEventListener('click',function(e){var b=e.target.closest('[data-q]');if(!b)return;$('d-note').value=b.getAttribute('data-q');$('d-note').focus()});
      sync();
    }
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var now=Date.now(),base='inbox/'+it.uid+'/items/'+it.id,patch={adminAt:now,updatedAt:now},jobs=[];
      if(it.kind==='ticket'){
        patch.status=$('d-status').value;
      }else{
        var dec=f.querySelector('input[name=dec]:checked').value;
        patch.status=dec;patch.adminNote=$('d-note').value.trim();patch.decidedAt=now;
        if(it.kind==='idea'){
          patch.stage=$('d-stage').value;patch.priority=$('d-prio').value;patch.targetVersion=$('d-ver').value.trim();patch.eta=$('d-eta').value.trim();patch.plan=$('d-plan').value.trim();
          patch.showPublic=$('d-pub').checked;patch.credit=$('d-credit').checked;
          if(dec==='approved'&&patch.showPublic){
            jobs.push(ds.set('pubIdeas/'+it.id,{id:it.id,title:it.title,category:it.category,body:trunc(it.body,400),stage:patch.stage,targetVersion:patch.targetVersion,credit:patch.credit?(it.name||'A player'):'',updatedAt:now}));
          }else jobs.push(ds.del('pubIdeas/'+it.id));
        }else{
          patch.replyPublic=$('d-reply').value.trim();patch.featured=$('d-feat').checked;
          if(dec==='approved'){
            jobs.push(ds.set('pubReviews/'+it.id,{id:it.id,rating:it.rating,title:it.title,body:it.body,name:it.name||'Player',version:it.version||'',at:it.createdAt,reply:patch.replyPublic,featured:patch.featured}));
          }else jobs.push(ds.del('pubReviews/'+it.id));
        }
      }
      var btn=f.querySelector('button[type=submit]');btn.disabled=true;setMsg(msg,'Saving...');
      ds.update(base,patch).then(function(){return Promise.all(jobs)}).then(function(){return ds.merge('inbox/'+it.uid,{uid:it.uid,lastAt:now})}).then(function(){
        for(var k in patch)it[k]=patch[k];
        afterAdminWrite(it.uid);setMsg(msg,'Saved. The player sees this under My requests.','ok');renderRows();
      }).catch(function(){setMsg(msg,'Could not save. Check your access and try again.','err')}).then(function(){btn.disabled=false});
    });
  }

  /* ---------- live data wiring ---------- */
  function connect(){
    var u=ds.uid();
    unsubs.pubReviews=ds.watch('pubReviews',function(r){S.pubReviews=r;renderReviews();if(AD.started)adminRefresh()});
    unsubs.pubIdeas=ds.watch('pubIdeas',function(r){S.pubIdeas=r;renderRoad()});
    unsubs.votes=ds.watch('votes',function(r){S.votes=r;renderRoad()});
    if(u){
      unsubs.mine=ds.watch('inbox/'+u+'/items',function(rows){
        S.mine=rows;
        rows.forEach(function(it){
          var p=prevAdmin[it.id];
          if(!firstMine&&p!==undefined&&(it.adminAt||0)>p&&openName!=='requests'){var i=statusInfo(it);toast('Update on '+it.code+': '+i[0])}
          prevAdmin[it.id]=it.adminAt||0;
        });
        firstMine=false;updateBadge();
        if(openName==='requests')renderMine();
      });
    }
  }
  function modeNote(){
    var n=$('modeNote');if(!n)return;
    if(ds.kind==='local'){n.hidden=false;n.textContent='Offline demo: Firebase keys are missing in config.js, so everything is saved only in this browser.'}
    else if(ds.kind==='offline'){n.hidden=false;n.textContent='Could not reach the server, so sending is paused. Reload the page to try again.'}
    else n.hidden=true;
  }

  renderReviews();renderRoad();renderMine();
  if($('adminRoot'))renderAdmin();
  ZS.init().then(function(b){
    ds=b;ready=true;modeNote();connect();
    renderReviews();renderRoad();
    if(!ds.canSubmit()&&ds.kind!=='local'){
      var m=ds.whyNoSubmit;['revMsg','ideaMsg','tkMsg'].forEach(function(id){if($(id))setMsg($(id),m)});
    }
    if($('adminRoot'))renderAdmin();
    if(openName==='requests')renderMine();
    if(location.hash==='#requests')openSheet('requests');
  });
})();
