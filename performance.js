/* AIALAN performance + premium motion layer
   Scope: media delivery, scrolling/painting stability, and UI motion only.
   No catalog, Supabase, authentication, uploads, routes, affiliate links,
   or business logic are changed here.
*/
(function(){
  'use strict';

  var CDN='https://cdn.aiallan.shop';
  var refreshTimer=0;
  var warmQueue=[];
  var warming=new Set();
  var hinted=new Set();
  var mediaObserver=null;
  var MAX_WARM=4;
  var MAX_PRELOAD=8;

  function addHint(rel,href,cross){
    if(document.head.querySelector('link[rel="'+rel+'"][href="'+CSS.escape(href)+'"]')) return;
    var l=document.createElement('link');
    l.rel=rel;
    l.href=href;
    if(cross) l.crossOrigin='anonymous';
    document.head.appendChild(l);
  }

  addHint('preconnect',CDN,true);
  addHint('dns-prefetch',CDN,false);

  function root(){ return document.getElementById('vHomePage') || document.body; }
  function real(u){ return !!u && !/^data:|^blob:/i.test(u); }

  function getImages(){
    var r=root();
    return r && r.querySelectorAll ? Array.prototype.slice.call(r.querySelectorAll('img[src]')) : [];
  }

  function preloadCritical(){
    var imgs=getImages();
    var count=0;
    imgs.forEach(function(img,i){
      var u=img.currentSrc || img.src;
      if(!real(u) || count>=MAX_PRELOAD || hinted.has(u)) return;
      /* Only the first viewport/early content gets link-preload. This avoids
         competing with every image on a large catalog page. */
      if(i<MAX_PRELOAD || img.closest('#vHeroMedia')){
        hinted.add(u);
        addHint('preload',u,true);
        count++;
      }
    });
  }

  function stabilizeImage(img,index){
    if(!img) return;
    img.decoding='async';
    if(img.getAttribute('loading')==='lazy') img.setAttribute('loading','eager');
    else img.loading='eager';
    img.fetchPriority=index<8 || img.closest('#vHeroMedia') ? 'high' : 'auto';

    /* Critical: never let CSS content-visibility recycle an image while the
       user is flinging the page. This is the main fix for scroll blanking. */
    img.style.contentVisibility='visible';
    img.style.contain='none';
  }

  function polishImages(){
    var imgs=getImages();
    imgs.forEach(stabilizeImage);
    preloadCritical();

    /* Warm all currently known media in small concurrent batches. The browser
       can reuse these decoded/network resources when the card reaches view. */
    imgs.forEach(function(img){
      var u=img.currentSrc || img.src;
      if(real(u)) queueWarm(u);
    });
  }

  function queueWarm(url){
    if(!real(url) || warming.has(url) || warmQueue.indexOf(url)>=0) return;
    warmQueue.push(url);
    drainWarm();
  }

  function drainWarm(){
    while(warmQueue.length && warming.size<MAX_WARM){
      warmImage(warmQueue.shift());
    }
  }

  function warmImage(url){
    if(warming.has(url)) return;
    warming.add(url);
    var im=new Image();
    try{ im.decoding='async'; im.fetchPriority='low'; }catch(_){ }
    var done=function(){
      im.onload=null; im.onerror=null;
      warming.delete(url);
      drainWarm();
    };
    im.onload=done;
    im.onerror=done;
    im.src=url;
  }

  function setupNearViewport(){
    if(!('IntersectionObserver' in window)) return;
    var r=root();
    if(!r || !r.querySelectorAll) return;
    if(mediaObserver) mediaObserver.disconnect();
    mediaObserver=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting) return;
        var img=entry.target;
        stabilizeImage(img,0);
        var u=img.currentSrc || img.src;
        if(real(u)) queueWarm(u);
        mediaObserver.unobserve(img);
      });
    },{root:null,rootMargin:'1400px 0px',threshold:0.01});
    r.querySelectorAll('img[src]').forEach(function(img){ mediaObserver.observe(img); });
  }

  function setupVideo(){
    var video=document.getElementById('vHomeVideo');
    var section=document.getElementById('vHomeVideoSection');
    if(!video || !section || video.dataset.aiallanPerfBound) return;
    video.dataset.aiallanPerfBound='1';
    if(!video.getAttribute('src')) return;
    video.preload='metadata';
    video.playsInline=true;
    video.autoplay=true;
    video.loop=true;
    video.muted=true;
    video.defaultMuted=true;
    function start(){
      video.preload='auto';
      try{ video.load(); }catch(_){ }
      var p=video.play();
      if(p && p.catch) p.catch(function(){ video.muted=true; video.play().catch(function(){}); });
    }
    function stop(){ if(!video.paused) video.pause(); }
    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(entries){
        entries.forEach(function(e){ if(e.isIntersecting) start(); else if(e.intersectionRatio===0) stop(); });
      },{root:null,rootMargin:'1000px 0px',threshold:0.01});
      io.observe(section);
    }else start();
  }

  function setupMotion(){
    if(document.documentElement.dataset.aiallanMotionBound) return;
    document.documentElement.dataset.aiallanMotionBound='1';
    var style=document.createElement('style');
    style.textContent=`
      /* ---- Scroll/paint stability ---- */
      .v-card-image img,.v-home-category-image img,.v-product-thumbs img,
      .v-feature-media img,.v-product-main-image img,.v-product-thumb img,
      .v-suggestion-image img{content-visibility:visible!important;contain:none!important;}

      /* ---- Global premium motion ---- */
      button,a,[role="button"],input[type="button"],input[type="submit"],input[type="reset"],select,
      .admin-btn,.v-btn,.v-card,.v-category-card,.v-product-card{
        -webkit-tap-highlight-color:transparent;
      }
      button,a,[role="button"],input[type="button"],input[type="submit"],input[type="reset"],select,
      .admin-btn,.v-btn{
        transition:transform .26s cubic-bezier(.22,.61,.36,1),opacity .24s ease,
                    background-color .26s ease,border-color .26s ease,color .26s ease,
                    box-shadow .30s ease;
      }
      button:active,a:active,[role="button"]:active,input[type="button"]:active,
      input[type="submit"]:active,input[type="reset"]:active,.admin-btn:active,.v-btn:active{
        transform:scale(.975);transition-duration:.12s;
      }
      .v-card,.v-category-card,.v-product-card{
        transition:transform .38s cubic-bezier(.22,.61,.36,1),opacity .28s ease,box-shadow .38s ease;
      }
      .v-card:active,.v-category-card:active,.v-product-card:active{transform:scale(.987);}

      /* Panels/overlays that otherwise appear as hard cuts. */
      .v-mobile-drawer{display:block!important;visibility:hidden;opacity:0;pointer-events:none;transition:opacity .36s ease,visibility 0s linear .36s;}
      .v-mobile-drawer.open{visibility:visible;opacity:1;pointer-events:auto;transition:opacity .36s ease,visibility 0s linear 0s;}
      .v-mobile-panel{transform:translateX(-20px);transition:transform .44s cubic-bezier(.22,.61,.36,1);}
      .v-mobile-drawer.open .v-mobile-panel{transform:translateX(0);}
      .v-search{display:block!important;visibility:hidden;opacity:0;transform:translateY(-10px);pointer-events:none;transition:opacity .32s ease,transform .40s cubic-bezier(.22,.61,.36,1),visibility 0s linear .32s;}
      .v-search.open{visibility:visible;opacity:1;transform:translateY(0);pointer-events:auto;transition:opacity .32s ease,transform .40s cubic-bezier(.22,.61,.36,1),visibility 0s linear 0s;}

      /* Generic modal/layer movement. Works with dynamically created admin UI. */
      .v-modal,.modal,.admin-modal,.admin-modal-overlay,.v-overlay,.v-product-layer{
        transition:opacity .34s cubic-bezier(.22,.61,.36,1),visibility .34s ease,background-color .34s ease;
      }
      .modal-box,.admin-modal-box,.v-product-layer-inner,.v-modal-box{
        transition:transform .42s cubic-bezier(.22,.61,.36,1),opacity .34s ease,box-shadow .42s ease;
      }

      /* Route transition. */
      .v-page.aiallan-page-enter{animation:aiallanPageEnter .46s cubic-bezier(.22,.61,.36,1) both;}
      @keyframes aiallanPageEnter{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}

      /* View Transition API, where the browser supports it. */
      ::view-transition-old(root){animation:aiallanViewOld .24s ease both;}
      ::view-transition-new(root){animation:aiallanViewNew .42s cubic-bezier(.22,.61,.36,1) both;}
      @keyframes aiallanViewOld{to{opacity:.97}}
      @keyframes aiallanViewNew{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}

      /* Never opt the normal experience into reduced motion. */
      html.aiallan-motion-active{scroll-behavior:smooth!important;}
    `;
    (document.head||document.documentElement).appendChild(style);
    document.documentElement.classList.add('aiallan-motion-active');

    var original=window.show;
    if(typeof original==='function' && !original.__aiallanPremiumWrapped){
      function animatedShow(page,opts){
        opts=opts||{};
        if(opts.instant){ original(page,opts); return; }
        var run=function(){
          original(page,Object.assign({},opts,{instant:true}));
          var el=document.getElementById(page);
          if(el){
            el.classList.remove('aiallan-page-enter');
            void el.offsetWidth;
            el.classList.add('aiallan-page-enter');
            setTimeout(function(){el.classList.remove('aiallan-page-enter');},540);
          }
        };
        if(document.startViewTransition){
          try{ document.startViewTransition(run); return; }catch(_){ }
        }
        run();
      }
      animatedShow.__aiallanPremiumWrapped=true;
      window.show=animatedShow;
    }
  }

  function refresh(){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(function(){
      refreshTimer=0;
      setupMotion();
      polishImages();
      setupNearViewport();
      setupVideo();
    },30);
  }

  function init(){
    setupMotion();
    refresh();
    if(window.MutationObserver){
      var mo=new MutationObserver(refresh);
      mo.observe(document.body,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
