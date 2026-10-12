/* ZShoot 3 site: content sections, sound lab and the browser demo.
   Edit the data blocks below to change names, descriptions and rewards. */
(function(){
  'use strict';
  var APK_URL='https://github.com/zishutron/Stardust-store/releases/download/v2.0.0/ZShoot_v3.0.0.3.apk';

  /* ---------- data (decoded from the v3 APK) ---------- */
  var CRATES=[
    {id:'normal',name:'Normal',txt:'The standard crate. A steady drop and a fair target.'},
    {id:'fast',name:'Fast',txt:'Falls quicker than the rest. Get your aim in early.'},
    {id:'tank',name:'Tank',txt:'Armoured plating. It takes more hits to break.'},
    {id:'power',name:'Power',txt:'A charged crate with a lightning core. Worth the shot.'},
    {id:'freez',name:'Freeze',txt:'Hit it and the whole field freezes for a few seconds.'},
    {id:'danger',name:'Danger',txt:'Marked with a skull. When it lands it sends out a shockwave.'}
  ];
  var GUNS=[[1,'Pistol'],[2,'Revolver'],[3,'SMG'],[4,'Rifle'],[5,'Shotgun'],[6,'Sniper'],[7,'Machine Gun'],[8,'Gatling'],[9,'Rocket Launcher'],[10,'Plasma Rifle'],[11,'Legendary'],[12,'Mythic'],[13,'Epic'],[14,'Divine'],[15,'Celestial'],[16,'Sky Booster'],[17,'Hen Gang'],[18,'Cat Master']];
  var GUN_DAY={11:4,12:12,13:19,14:24,15:28};
  var WORLDS=[[1,''],[2,'Space'],[3,'Forest'],[6,''],[7,''],[8,''],[9,''],[10,''],[11,'Aurora'],[12,'Galaxy'],[13,'Crystal'],[14,'Nebula'],[15,'Cosmos'],[16,'Space Man'],[17,'Peaceful cat'],[18,'Dragon World']];
  var WORLD_DAY={11:9,12:16,13:22,14:26,15:30};
  var COINS={1:500,2:1000,3:1500,5:2000,6:3000,7:5000,8:2000,10:3000,11:5000,13:3000,14:5000,15:8000,17:5000,18:8000,20:5000,21:8000,23:12000,25:12000,27:10000,29:15000};
  var TIERS=[[0,'EASY','#00ff88'],[200,'NORMAL','#66ccff'],[500,'HARD','#ffcc00'],[1000,'INTENSE','#ff8c42'],[2000,'EXTREME','#ff4444'],[3500,'INSANE','#ff00ff']];

  function $(id){return document.getElementById(id)}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function fmt(n){return n>=1000?(n/1000)+'K':String(n)}
  function gunName(id){for(var i=0;i<GUNS.length;i++)if(GUNS[i][0]===id)return GUNS[i][1];return ''}

  /* APK links all come from the one constant above */
  document.querySelectorAll('a[data-apk]').forEach(function(a){a.href=APK_URL});

  /* mobile menu */
  var menuBtn=$('menuBtn'),nav=$('mainNav');
  if(menuBtn&&nav){
    menuBtn.addEventListener('click',function(){
      var o=nav.classList.toggle('open');menuBtn.setAttribute('aria-expanded',String(o));
    });
    nav.addEventListener('click',function(e){
      if(e.target.tagName==='A'){nav.classList.remove('open');menuBtn.setAttribute('aria-expanded','false')}
    });
  }

  var mailBtn=$('copyMail');
  if(mailBtn)mailBtn.addEventListener('click',function(){
    var t='support.stardustofficial@gmail.com';
    function sel(){var r=document.createRange();r.selectNodeContents($('supportMail'));var s=getSelection();s.removeAllRanges();s.addRange(r);mailBtn.textContent='Selected'}
    try{navigator.clipboard.writeText(t).then(function(){mailBtn.textContent='Copied'},sel)}catch(_){sel()}
    setTimeout(function(){mailBtn.textContent='Copy'},1800);
  });

  if(!$('crateGrid'))return; /* the rest only exists on the home page */

  /* ---------- crates ---------- */
  $('crateGrid').innerHTML=CRATES.map(function(c){
    return '<article class="crate"><img src="assets/crates/'+c.id+'.webp" alt="'+esc(c.name)+' crate" loading="lazy"><h3>'+esc(c.name)+'</h3><p>'+esc(c.txt)+'</p></article>';
  }).join('');

  /* ---------- arsenal ---------- */
  var gunGrid=$('gunGrid'),gunImg=$('gunImg'),gunNameEl=$('gunName'),gunTag=$('gunTag');
  gunGrid.innerHTML=GUNS.map(function(g){
    return '<button class="gun-btn" type="button" data-g="'+g[0]+'" aria-pressed="'+(g[0]===16)+'" aria-label="'+esc(g[1])+'"><img src="assets/guns/gun'+g[0]+'.webp" alt="" loading="lazy"></button>';
  }).join('');
  function showGun(id){
    gunImg.src='assets/guns/gun'+id+'.webp';gunImg.alt=gunName(id);
    gunNameEl.textContent=gunName(id);
    gunTag.textContent=GUN_DAY[id]?'Daily reward, day '+GUN_DAY[id]:'';
    gunGrid.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(+b.dataset.g===id))});
  }
  gunGrid.addEventListener('click',function(e){var b=e.target.closest('button');if(b)showGun(+b.dataset.g)});
  showGun(16);

  /* ---------- worlds ---------- */
  var worldStrip=$('worldStrip'),worldImg=$('worldImg'),worldName=$('worldName'),worldTag=$('worldTag');
  function wLabel(w,i){return w[1]||('World '+(i<9?'0':'')+(i+1))}
  worldStrip.innerHTML=WORLDS.map(function(w,i){
    return '<button class="world-btn" type="button" data-i="'+i+'" aria-pressed="'+(i===WORLDS.length-1)+'" aria-label="'+esc(wLabel(w,i))+'"><img src="assets/worlds/bg'+w[0]+'.webp" alt="" loading="lazy"></button>';
  }).join('');
  function showWorld(i){
    var w=WORLDS[i];
    worldImg.src='assets/worlds/bg'+w[0]+'.webp';worldImg.alt=wLabel(w,i)+' background';
    worldName.textContent=wLabel(w,i);
    worldTag.textContent=WORLD_DAY[w[0]]?'Daily reward, day '+WORLD_DAY[w[0]]:'';
    worldStrip.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(+b.dataset.i===i))});
  }
  worldStrip.addEventListener('click',function(e){var b=e.target.closest('button');if(b)showWorld(+b.dataset.i)});
  showWorld(WORLDS.length-1);

  /* ---------- daily calendar ---------- */
  var gunByDay={},worldByDay={},total=0,cal='';
  Object.keys(GUN_DAY).forEach(function(g){gunByDay[GUN_DAY[g]]=+g});
  Object.keys(WORLD_DAY).forEach(function(w){worldByDay[WORLD_DAY[w]]=+w});
  for(var d=1;d<=30;d++){
    if(gunByDay[d]){
      cal+='<li class="day item"><span class="n">DAY '+d+'</span><img class="g" src="assets/guns/gun'+gunByDay[d]+'.webp" alt="" loading="lazy"><span class="k">Gun &middot; '+esc(gunName(gunByDay[d]))+'</span></li>';
    }else if(worldByDay[d]){
      var wi=0;WORLDS.forEach(function(w,i){if(w[0]===worldByDay[d])wi=i});
      cal+='<li class="day item"><span class="n">DAY '+d+'</span><img class="w" src="assets/worlds/bg'+worldByDay[d]+'.webp" alt="" loading="lazy"><span class="k">World &middot; '+esc(wLabel(WORLDS[wi],wi))+'</span></li>';
    }else{
      total+=COINS[d];
      cal+='<li class="day'+(COINS[d]>=10000?' big':'')+'"><span class="n">DAY '+d+'</span><span class="v"><i class="coin"></i>'+fmt(COINS[d])+'</span><span class="k">Coins</span></li>';
    }
  }
  $('cal').innerHTML=cal;
  $('rewardLede').textContent='Claim every day and you collect '+total.toLocaleString('en-US')+' coins, five rare guns and five worlds.';

  /* ---------- sound ---------- */
  var muted=false;
  function pool(src,n,vol){
    var a=[],i=0;
    for(var k=0;k<n;k++){var e=new Audio();e.preload='none';e.src=src;e.volume=vol;a.push(e)}
    return function(force){
      if(muted&&!force)return;
      var e=a[i++%n];
      try{e.currentTime=0;var p=e.play();if(p&&p.catch)p.catch(function(){})}catch(_){}
    };
  }
  var snd={
    fire:pool('assets/fire.mp3',4,.3),hit:pool('assets/hit.mp3',4,.4),explosion:pool('assets/explosion.mp3',3,.5),
    danger:pool('assets/danger_hit.mp3',2,.55),strike:pool('assets/strike.mp3',2,.55),gameover:pool('assets/gameover.mp3',1,.6)
  };
  document.querySelectorAll('.snd').forEach(function(b){
    var h='';
    for(var i=0;i<18;i++){h+='<i style="--n:'+i+';--h:'+(20+Math.round(Math.abs(Math.sin(i*1.7+b.dataset.snd.length))*80))+'%"></i>'}
    b.querySelector('.bars').innerHTML=h;
    b.addEventListener('click',function(){
      snd[b.dataset.snd](true);
      b.classList.add('on');clearTimeout(b._t);b._t=setTimeout(function(){b.classList.remove('on')},900);
    });
  });
  var muteBtn=$('muteBtn');
  muteBtn.textContent='Sound on';
  muteBtn.addEventListener('click',function(){
    muted=!muted;muteBtn.setAttribute('aria-pressed',String(muted));muteBtn.textContent=muted?'Sound off':'Sound on';
  });

  /* checksum copy */
  var copyBtn=$('copySha');
  copyBtn.addEventListener('click',function(){
    var el=$('sha'),t=el.textContent.trim();
    function sel(){var r=document.createRange();r.selectNodeContents(el);var s=getSelection();s.removeAllRanges();s.addRange(r);copyBtn.textContent='Selected'}
    try{navigator.clipboard.writeText(t).then(function(){copyBtn.textContent='Copied'},sel)}catch(_){sel()}
    setTimeout(function(){copyBtn.textContent='Copy'},1800);
  });
  /* ---------- browser demo ---------- */
  var cv=$('arena'),ctx=cv.getContext('2d');
  var W=960,H=540,dpr=Math.min(window.devicePixelRatio||1,2);
  cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  var uiStart=$('uiStart'),uiOver=$('uiOver');
  var FONT='"Saira Condensed","Arial Narrow",Impact,sans-serif';
  var gx=W/2,gy=H-26;

  var crateImg={};
  CRATES.forEach(function(c){var i=new Image();i.src='assets/crates/'+c.id+'.webp';crateImg[c.id]=i});
  var bgImg=new Image();bgImg.src='assets/worlds/bg12.webp';
  var gunImgs={},DEMO_GUNS=[1,2,3,4,7,10,16],gunId=1;
  DEMO_GUNS.forEach(function(g){var i=new Image();i.src='assets/guns/gun'+g+'.webp';gunImgs[g]=i});
  var pick=$('gunPick');
  pick.innerHTML=DEMO_GUNS.map(function(g){return '<button type="button" data-g="'+g+'" aria-pressed="'+(g===gunId)+'" aria-label="'+esc(gunName(g))+'"><img src="assets/guns/gun'+g+'.webp" alt=""></button>'}).join('');
  pick.addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;gunId=+b.dataset.g;
    pick.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',String(x===b))});
  });

  var KINDS=[
    {id:'normal',w:50,s:[56,68],hp:1,v:1},
    {id:'fast',w:16,s:[46,56],hp:1,v:1.75},
    {id:'tank',w:12,s:[72,84],hp:4,v:.7},
    {id:'power',w:6,s:[56,64],hp:2,v:1.1},
    {id:'freez',w:8,s:[54,62],hp:1,v:1},
    {id:'danger',w:8,s:[58,68],hp:2,v:1}
  ];
  var state='idle',crates,bullets,parts,dmgs,rings,score,combo,comboT,strikes,kills,wave,spawnT,frozenT,fireT,firing,aim,banner,bannerT,shake,best=0,onscreen=true;
  try{best=+localStorage.getItem('zshoot-best')||0}catch(_){}

  function tierOf(s){var t=TIERS[0];for(var i=0;i<TIERS.length;i++)if(s>=TIERS[i][0])t=TIERS[i];return t}
  function reset(){
    crates=[];bullets=[];parts=[];dmgs=[];rings=[];score=0;combo=0;comboT=0;strikes=3;kills=0;wave=1;
    spawnT=.6;frozenT=0;fireT=0;firing=false;banner='';bannerT=0;shake=0;aim=-Math.PI/2;
  }
  function seedIdle(){
    reset();
    [['normal',150,120,60,3],['fast',320,200,52,1],['tank',480,110,78,6],['power',650,190,60,2],['freez',790,110,58,1],['danger',250,300,62,2]].forEach(function(p){
      crates.push({k:p[0],x:p[1],y:p[2],s:p[3],hp:p[4],max:p[4],vy:0,flash:0});
    });
  }
  seedIdle();

  function pickKind(){
    var r=Math.random()*100,a=0;
    for(var i=0;i<KINDS.length;i++){a+=KINDS[i].w;if(r<a)return KINDS[i]}
    return KINDS[0];
  }
  function spawn(){
    var k=pickKind(),s=k.s[0]+Math.random()*(k.s[1]-k.s[0]);
    var base=1+Math.floor(Math.random()*(1+wave*.5));
    var hp=k.id==='tank'?k.hp+Math.floor(wave/2):(k.id==='fast'?1+Math.floor(wave/4):(k.id==='power'||k.id==='danger'?k.hp:base));
    crates.push({k:k.id,x:50+Math.random()*(W-100),y:-40,s:s,hp:hp,max:hp,vy:(38+wave*8)*k.v*(.85+Math.random()*.3),flash:0});
  }
  var bannerCol='#ff5a1f';
  function sayc(t,c){banner=t;bannerCol=c||'#ff5a1f';bannerT=1.6}
  function burst(x,y,n,col){
    for(var i=0;i<n;i++){var a=Math.random()*6.283,v=60+Math.random()*260;
      parts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:.5+Math.random()*.5,c:col||(Math.random()<.5?'#ff5a1f':'#ffa51f')})}
  }
  function kill(b){
    burst(b.x,b.y,22,b.k==='freez'?'#a5e6ff':null);snd.explosion();
    kills++;combo++;comboT=2.4;
    score+=b.max*10*(1+Math.floor(combo/3));
    if(b.k==='freez'){frozenT=3;sayc('FREEZE!','#a5e6ff')}
    if(b.k==='power'){
      sayc('SCREEN CLEAR!','#ffd24a');
      crates.forEach(function(o){if(o!==b&&o.hp>0){o.hp=0;score+=o.max*10;burst(o.x,o.y,14)}});
    }
    var w=1+Math.floor(kills/8);
    if(w>wave){wave=w;sayc('WAVE '+wave)}
  }
  function fire(){
    var dx=Math.cos(aim),dy=Math.sin(aim);
    bullets.push({x:gx+dx*60,y:gy+dy*60,vx:dx*1000,vy:dy*1000});
    snd.fire();
  }
  function over(){
    state='over';cv.classList.remove('live');snd.gameover();
    var nb=score>best;
    if(nb){best=score;try{localStorage.setItem('zshoot-best',String(best))}catch(_){}}
    $('finalScore').textContent=score.toLocaleString('en-US');
    $('finalMsg').textContent=(nb?'New best. ':'Best: '+best.toLocaleString('en-US')+'. ')+'You reached wave '+wave+' on '+tierOf(score)[1]+'.';
    uiOver.hidden=false;
  }
  function lose(b,n){
    strikes-=n;combo=0;shake=.3;burst(b.x,H-8,16,'#ff2d17');
    if(b.k==='danger'){snd.danger();rings.push({x:b.x,y:H-10,r:10,l:.7})}else snd.strike();
    sayc('STRIKE','#ff4444');
  }

  function update(dt){
    if(state!=='play')return;
    if(frozenT>0)frozenT-=dt;
    if(comboT>0){comboT-=dt;if(comboT<=0)combo=0}
    if(bannerT>0)bannerT-=dt;
    if(shake>0)shake-=dt;
    spawnT-=dt;
    if(spawnT<=0){spawn();spawnT=Math.max(.42,1.5-wave*.09)}
    fireT-=dt;
    if(firing&&fireT<=0){fire();fireT=.15}
    bullets.forEach(function(b){b.x+=b.vx*dt;b.y+=b.vy*dt});
    crates.forEach(function(b){if(frozenT<=0)b.y+=b.vy*dt;if(b.flash>0)b.flash-=dt});
    bullets.forEach(function(bl){
      for(var i=0;i<crates.length;i++){
        var b=crates[i],h=b.s*.4;
        if(b.hp>0&&Math.abs(bl.x-b.x)<h&&Math.abs(bl.y-b.y)<h){
          b.hp--;b.flash=.1;bl.dead=true;
          dmgs.push({x:b.x+(Math.random()*20-10),y:b.y-b.s/2,t:.7});
          if(b.hp<=0)kill(b);else snd.hit();
          break;
        }
      }
    });
    bullets=bullets.filter(function(b){return !b.dead&&b.x>-20&&b.x<W+20&&b.y>-20&&b.y<H+20});
    crates=crates.filter(function(b){
      if(b.hp<=0)return false;
      if(b.y+b.s/2>=H-6){lose(b,b.k==='danger'?2:1);return false}
      return true;
    });
    if(strikes<=0)over();
    parts.forEach(function(p){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=380*dt;p.l-=dt});
    parts=parts.filter(function(p){return p.l>0});
    dmgs.forEach(function(d){d.y-=44*dt;d.t-=dt});dmgs=dmgs.filter(function(d){return d.t>0});
    rings.forEach(function(r){r.r+=420*dt;r.l-=dt});rings=rings.filter(function(r){return r.l>0});
  }

  function draw(){
    ctx.save();
    if(shake>0)ctx.translate((Math.random()-.5)*8,(Math.random()-.5)*8);
    ctx.fillStyle='#0a0c12';ctx.fillRect(-10,-10,W+20,H+20);
    if(bgImg.complete&&bgImg.naturalWidth){ctx.globalAlpha=.42;ctx.drawImage(bgImg,0,0,W,H);ctx.globalAlpha=1}
    var g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(8,10,16,.55)');g.addColorStop(1,'rgba(8,10,16,.2)');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(255,45,23,.18)';ctx.fillRect(0,H-6,W,6);

    ctx.setLineDash([8,10]);ctx.strokeStyle='rgba(255,165,31,.5)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(gx+Math.cos(aim)*70,gy+Math.sin(aim)*70);ctx.lineTo(gx+Math.cos(aim)*900,gy+Math.sin(aim)*900);ctx.stroke();ctx.setLineDash([]);

    var frozen=frozenT>0;
    ctx.font='900 italic 22px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';
    crates.forEach(function(b){
      var im=crateImg[b.k],ar=im&&im.naturalWidth?im.naturalHeight/im.naturalWidth:1;
      if(im&&im.complete&&im.naturalWidth){
        if(b.flash>0)ctx.globalAlpha=.55;
        ctx.drawImage(im,b.x-b.s/2,b.y-b.s*ar/2,b.s,b.s*ar);ctx.globalAlpha=1;
      }else{ctx.fillStyle='#e67e22';ctx.fillRect(b.x-b.s/2,b.y-b.s/2,b.s,b.s)}
      if(frozen){ctx.fillStyle='rgba(165,230,255,.28)';ctx.fillRect(b.x-b.s/2,b.y-b.s/2,b.s,b.s)}
      var bx=b.x+b.s*.34,by=b.y-b.s*.34;
      ctx.fillStyle='rgba(8,9,12,.85)';ctx.beginPath();ctx.arc(bx,by,13,0,6.283);ctx.fill();
      ctx.fillStyle='#fff';ctx.fillText(String(b.hp),bx,by+1);
    });
    ctx.fillStyle='#ffd27a';
    bullets.forEach(function(b){ctx.beginPath();ctx.arc(b.x,b.y,4,0,6.283);ctx.fill()});
    parts.forEach(function(p){ctx.globalAlpha=Math.max(0,p.l*1.6);ctx.fillStyle=p.c;ctx.fillRect(p.x-2,p.y-2,4,4)});
    ctx.globalAlpha=1;
    rings.forEach(function(r){ctx.globalAlpha=Math.max(0,r.l);ctx.strokeStyle='#ff2d17';ctx.lineWidth=5;ctx.beginPath();ctx.arc(r.x,r.y,r.r,Math.PI,0);ctx.stroke()});
    ctx.globalAlpha=1;
    ctx.font='800 22px '+FONT;ctx.fillStyle='#ffa51f';
    dmgs.forEach(function(d){ctx.globalAlpha=Math.min(1,d.t*2);ctx.fillText('-1',d.x,d.y)});
    ctx.globalAlpha=1;

    /* gun */
    var gi=gunImgs[gunId];
    ctx.fillStyle='#161a22';ctx.beginPath();ctx.arc(gx,gy+16,34,Math.PI,0);ctx.fill();
    ctx.strokeStyle='#ff5a1f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(gx,gy+16,34,Math.PI,0);ctx.stroke();
    if(gi&&gi.complete&&gi.naturalWidth){
      var gw=120,gh=gw*gi.naturalHeight/gi.naturalWidth;
      ctx.save();ctx.translate(gx,gy);ctx.rotate(aim);
      ctx.drawImage(gi,-gw*.22,-gh/2,gw,gh);ctx.restore();
    }

    /* HUD */
    var t=tierOf(score);
    ctx.textAlign='left';ctx.textBaseline='top';
    ctx.fillStyle='#eceef2';ctx.font='900 italic 36px '+FONT;ctx.fillText(String(score),22,14);
    ctx.fillStyle='#8d95a6';ctx.font='700 16px '+FONT;ctx.fillText('WAVE '+wave+'   BEST '+best,24,54);
    ctx.textAlign='center';ctx.fillStyle=t[2];ctx.font='900 italic 24px '+FONT;ctx.fillText(t[1],W/2,16);
    ctx.textAlign='right';
    for(var i=0;i<3;i++){ctx.fillStyle=i<strikes?'#ff5a1f':'#2a303b';ctx.fillRect(W-30-i*26,20,18,18)}
    if(combo>1){ctx.fillStyle='#ffa51f';ctx.font='900 italic 28px '+FONT;ctx.fillText('COMBO x'+combo,W-22,50)}
    ctx.textAlign='center';ctx.textBaseline='middle';
    if(bannerT>0){ctx.globalAlpha=Math.min(1,bannerT*2);ctx.font='900 italic 64px '+FONT;ctx.fillStyle=bannerCol;ctx.fillText(banner,W/2,H*.4);ctx.globalAlpha=1}
    if(frozen){ctx.fillStyle='rgba(165,230,255,.07)';ctx.fillRect(0,0,W,H)}
    ctx.restore();
  }

  var last=0;
  function loop(t){
    var dt=Math.min(.05,(t-last)/1000||0);last=t;
    if(onscreen){update(dt);draw()}
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(e){onscreen=e[0].isIntersecting;if(!onscreen)firing=false},{threshold:.05}).observe(cv);
  }
  function aimAt(e){
    var r=cv.getBoundingClientRect();
    var x=(e.clientX-r.left)/r.width*W,y=(e.clientY-r.top)/r.height*H;
    var a=Math.atan2(y-gy,x-gx);
    aim=Math.max(-3.02,Math.min(-.12,a>0?(x<gx?-3.02:-.12):a));
  }
  cv.addEventListener('pointermove',aimAt);
  cv.addEventListener('pointerdown',function(e){
    if(state!=='play')return;
    aimAt(e);firing=true;fireT=0;
    try{cv.setPointerCapture(e.pointerId)}catch(_){}
  });
  ['pointerup','pointercancel','pointerleave'].forEach(function(n){cv.addEventListener(n,function(){firing=false})});
  function start(){reset();state='play';cv.classList.add('live');uiStart.hidden=true;uiOver.hidden=true}
  $('startBtn').addEventListener('click',start);
  $('againBtn').addEventListener('click',start);
})();
