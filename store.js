/* ZShoot data layer.
   One small "docstore" interface, three backends:
     db        the Claude artifact database (live preview, shared with invited viewers)
     firebase  Cloud Firestore + Firebase Auth (real public site, see README.txt)
     local     this browser only (demo mode, nothing is shared)
   Collections (identical in every backend):
     inbox/{uid}                       index doc per player {uid,lastAt}
     inbox/{uid}/items/{id}            reviews, ideas and support tickets a player sent
     inbox/{uid}/items/{id}/msgs/{m}   conversation between player and developer
     pubReviews/{id}                   approved reviews (written by admin)
     pubIdeas/{id}                     approved ideas on the public roadmap (written by admin)
     votes/{uid}                       {ids:{ideaId:true}} one doc per voter
*/
window.ZS = (function(){
  var CFG = window.ZS_CONFIG || {};
  var ADMINS = (CFG.adminEmails || []).map(function(s){return String(s).toLowerCase()});

  function rid(){
    var a=new Uint8Array(12), s='';
    (window.crypto||{getRandomValues:function(x){for(var i=0;i<x.length;i++)x[i]=Math.random()*256}}).getRandomValues(a);
    for(var i=0;i<a.length;i++)s+='abcdefghijklmnopqrstuvwxyz0123456789'[a[i]%36];
    return s;
  }
  function lastSeg(p){return p.slice(p.lastIndexOf('/')+1)}
  function parentOf(p){return p.slice(0,p.lastIndexOf('/'))}
  function withId(id,d){var o={};for(var k in d)o[k]=d[k];o.id=id;return o}

  /* ---------- Claude artifact db ---------- */
  function dbBackend(db,user,uid,canW,admin){
    return {
      kind:'db', label:'Live database', uid:function(){return uid},
      canSubmit:function(){return !!uid && canW!==false},
      whyNoSubmit:'Sign in to Claude with an account that can edit this page to send requests from the preview.',
      isAdmin:function(){return !!admin}, adminLogin:null, newId:rid,
      watch:function(path,cb){
        return db.collection(path).onSnapshot(function(s){cb(s.docs.map(function(d){return withId(d.id,d.data())}))},function(){cb([])});
      },
      list:function(path){return db.collection(path).get().then(function(s){return s.docs.map(function(d){return withId(d.id,d.data())})})},
      get:function(path){return db.doc(path).get().then(function(d){return d.exists?withId(d.id,d.data()):null})},
      set:function(path,data){return db.doc(path).set(data)},
      update:function(path,data){return db.doc(path).update(data)},
      merge:function(path,data){var r=db.doc(path);return r.update(data).catch(function(){return r.set(data)})},
      del:function(path){return db.doc(path).delete()}
    };
  }

  /* ---------- Firebase ---------- */
  function loadScript(src){
    return new Promise(function(res,rej){
      var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=function(){rej(new Error('load '+src))};
      document.head.appendChild(s);
    });
  }
  function fbBackend(cfg){
    var base='https://www.gstatic.com/firebasejs/10.12.2/';
    return loadScript(base+'firebase-app-compat.js').then(function(){
      return Promise.all([loadScript(base+'firebase-auth-compat.js'),loadScript(base+'firebase-firestore-compat.js')]);
    }).then(function(){
      firebase.initializeApp(cfg.firebase);
      var auth=firebase.auth(), fs=firebase.firestore();
      return new Promise(function(res){var u=auth.onAuthStateChanged(function(x){u();res(x)})}).then(function(user){
        if(user)return user;
        return auth.signInAnonymously().then(function(){return auth.currentUser}).catch(function(){return null});
      }).then(function(user){
        function isAdmin(){return !!(user&&!user.isAnonymous&&user.email&&ADMINS.indexOf(user.email.toLowerCase())>-1)}
        function snapDocs(s){return s.docs.map(function(d){return withId(d.id,d.data())})}
        return {
          kind:'firebase', label:'Firebase', uid:function(){return user?user.uid:null},
          canSubmit:function(){return !!user},
          whyNoSubmit:'Anonymous sign-in is not enabled for this site yet.',
          isAdmin:isAdmin, newId:rid,
          adminLogin:function(){
            return auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).then(function(){location.reload()});
          },
          adminLogout:function(){return auth.signOut().then(function(){location.reload()})},
          adminEmail:function(){return user&&!user.isAnonymous?user.email:null},
          watch:function(path,cb){return fs.collection(path).onSnapshot(function(s){cb(snapDocs(s))},function(){cb([])})},
          list:function(path){return fs.collection(path).get().then(snapDocs)},
          get:function(path){return fs.doc(path).get().then(function(d){return d.exists?withId(d.id,d.data()):null})},
          set:function(path,data){return fs.doc(path).set(data)},
          update:function(path,data){return fs.doc(path).update(data)},
          merge:function(path,data){return fs.doc(path).set(data,{merge:true})},
          del:function(path){return fs.doc(path).delete()}
        };
      });
    });
  }

  /* ---------- local demo ---------- */
  function localBackend(){
    var mem={}, key='zs-local-db-v1', listeners={}, me=null;
    try{var raw=localStorage.getItem(key);if(raw)mem=JSON.parse(raw)||{}}catch(_){}
    try{me=localStorage.getItem('zs-local-uid');if(!me){me='local-'+rid();localStorage.setItem('zs-local-uid',me)}}catch(_){me=me||'local-'+rid()}
    function save(){try{localStorage.setItem(key,JSON.stringify(mem))}catch(_){}}
    function rows(col){var c=mem[col]||{};return Object.keys(c).map(function(id){return withId(id,c[id])})}
    function emit(col){(listeners[col]||[]).slice().forEach(function(f){f(rows(col))})}
    function put(path,fn){
      var col=parentOf(path),id=lastSeg(path);mem[col]=mem[col]||{};
      var next=fn(mem[col][id]);
      if(next===null)delete mem[col][id];else mem[col][id]=JSON.parse(JSON.stringify(next));
      save();emit(col);return Promise.resolve();
    }
    return {
      kind:'local', label:'Demo mode', uid:function(){return me},
      canSubmit:function(){return true}, whyNoSubmit:'', isAdmin:function(){return true}, adminLogin:null, newId:rid,
      watch:function(path,cb){
        (listeners[path]=listeners[path]||[]).push(cb);
        setTimeout(function(){cb(rows(path))},0);
        return function(){listeners[path]=(listeners[path]||[]).filter(function(f){return f!==cb})};
      },
      list:function(path){return Promise.resolve(rows(path))},
      get:function(path){var c=mem[parentOf(path)]||{},d=c[lastSeg(path)];return Promise.resolve(d?withId(lastSeg(path),d):null)},
      set:function(path,data){return put(path,function(){return data})},
      update:function(path,data){return put(path,function(o){var n={},k;o=o||{};for(k in o)n[k]=o[k];for(k in data)n[k]=data[k];return n})},
      merge:function(path,data){return put(path,function(o){var n={},k;o=o||{};for(k in o)n[k]=o[k];for(k in data)n[k]=data[k];return n})},
      del:function(path){return put(path,function(){return null})}
    };
  }

  /* ---------- pick a backend ---------- */
  function timeout(ms,v){return new Promise(function(r){setTimeout(function(){r(v)},ms)})}
  function init(){
    var tryDb=Promise.resolve(null);
    if(window.claude&&typeof claude.use==='function'){
      tryDb=Promise.race([
        Promise.all([claude.use('db'),claude.use('user')]).then(function(r){
          var db=r[0],user=r[1];if(!db||!user)return null;
          return Promise.all([user.id(),user.can('data.write'),user.canEdit()]).then(function(v){
            return dbBackend(db,user,v[0],v[1],v[2]);
          });
        }),
        timeout(7000,null)
      ]).catch(function(){return null});
    }
    return tryDb.then(function(b){
      if(b)return b;
      if(CFG.firebase&&CFG.firebase.apiKey)return fbBackend(CFG).catch(function(e){console.warn('Firebase failed',e);return localBackend()});
      return localBackend();
    });
  }

  return {init:init, rid:rid};
})();
