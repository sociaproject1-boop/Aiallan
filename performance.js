/* AIALAN performance layer
   Critical-media delivery only. No catalog, Supabase, authentication, uploads,
   routes, affiliate links, or visual design logic are changed here.
*/
(function(){
  'use strict';

  var CDN='https://cdn.aiallan.shop';
  var rootObserver=null;
  var mediaObserver=null;
  var scheduled=0;
  var warmQueue=[];
  var warming=new Set();
  var preloaded=new Set();
  var MAX_WARM=2;

  function addHint(rel,href,cross){
    if(document.head.querySelector('link[rel="'+rel+'"][href="'+href+'"]')) return;
    var l=document.createElement('link');
    l.rel=rel;
    l.href=href;
    if(cross) l.crossOrigin='anonymous';
    document.head.appendChild(l);
  }

  /* Establish the CDN connection before the first public image is requested. */
  addHint('preconnect',CDN,true);
  addHint('dns-prefetch',CDN,false);

  function publicRoot(){
    return document.getElementById('vHomePage') || document.body;
  }

  function isRealUrl(u){
    return !!u && u.indexOf('data:')!==0 && u.indexOf('blob:')!==0;
  }

  function heroImages(){
    var root=publicRoot(), out=[];
    if(!root.querySelectorAll) return out;
    root.querySelectorAll('#vHeroMedia img[src],#vHeroMedia source[src]').forEach(function(el){
      var u=el.getAttribute('src');
      if(isRealUrl(u) && out.indexOf(u)<0) out.push(u);
    });
    return out;
  }

  function preloadHero(){
    heroImages().slice(0,2).forEach(function(u){
      if(preloaded.has(u)) return;
      preloaded.add(u);
      addHint('preload',u,true);
    });
  }

  function markImage(img,priority){
    if(!img || !img.src || !isRealUrl(img.src)) return;
    img.decoding='async';
    if(priority==='critical'){
      img.loading='eager';
      img.fetchPriority='high';
    }else if(priority==='near'){
      img.loading='eager';
      img.fetchPriority='low';
    }else{
      /* Keep public media mounted during fast scrolling. Native lazy-loading can
         temporarily blank/recycle cards on some mobile browsers. */
      img.loading='eager';
      img.fetchPriority='low';
    }
  }

  function polishImages(){
    var root=publicRoot();
    if(!root.querySelectorAll) return;
    var imgs=root.querySelectorAll('img[src]');
    imgs.forEach(function(img,i){
      if(img.closest('#vHeroMedia')) markImage(img,'critical');
      else if(i<5) markImage(img,'near');
      else markImage(img,'lazy');
    });
    preloadHero();
  }

  function queueWarm(url){
    if(!isRealUrl(url) || warming.has(url) || warmQueue.indexOf(url)>=0) return;
    warmQueue.push(url);
    scheduleWarm();
  }

  function warmImage(url){
    if(warming.has(url)) return;
    warming.add(url);
    var im=new Image();
    try{
      im.decoding='async';
      im.fetchPriority='low';
    }catch(_){ }
    im.onload=im.onerror=function(){
      if(im.onload){ im.onload=null; im.onerror=null; }
    };
    im.src=url;
  }

  function scheduleWarm(){
    if(scheduled) return;
    var run=function(){
      scheduled=0;
      var n=0;
      while(warmQueue.length && n<MAX_WARM){
        var u=warmQueue.shift();
        if(warming.has(u)) continue;
        warmImage(u);
        n++;
      }
      if(warmQueue.length) scheduleWarm();
    };
    if('requestIdleCallback' in window){
      scheduled=requestIdleCallback(run,{timeout:700});
    }else{
      scheduled=setTimeout(run,120);
    }
  }

  function setupNearViewport(){
    var root=publicRoot();
    if(!root.querySelectorAll || !('IntersectionObserver' in window)) return;
    if(mediaObserver) mediaObserver.disconnect();
    mediaObserver=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting) return;
        var img=entry.target;
        markImage(img,'near');
        if(img.src) queueWarm(img.src);
        mediaObserver.unobserve(img);
      });
    },{root:null,rootMargin:'1000px 0px',threshold:0.01});
    root.querySelectorAll('img[src]').forEach(function(img){
      if(!img.closest('#vHeroMedia')) mediaObserver.observe(img);
    });
  }

  function setupVideo(){
    var video=document.getElementById('vHomeVideo');
    var section=document.getElementById('vHomeVideoSection');
    if(!video || !section || video.dataset.aiallanPerfBound) return;
    video.dataset.aiallanPerfBound='1';
    if(!video.getAttribute('src')) return;

    /* Do not let a large video compete with the first-screen hero images.
       Start it before the user reaches it, then keep normal autoplay behavior. */
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
      if(p && p.catch) p.catch(function(){
        try{ video.muted=true; video.play().catch(function(){}); }catch(_){ }
      });
    }
    function stop(){
      if(!video.paused) video.pause();
    }

    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting) start();
          else if(entry.intersectionRatio===0) stop();
        });
      },{root:null,rootMargin:'900px 0px',threshold:0.01});
      io.observe(section);
    }else{
      start();
    }
  }

  function tuneInteraction(){
    document.documentElement.style.webkitTapHighlightColor='transparent';
    document.querySelectorAll('.v-home-products,.v-home-category-rail,.aiallan-product-gallery').forEach(function(el){
      el.style.webkitOverflowScrolling='touch';
      el.style.overscrollBehavior='contain';
    });
  }

  /* Global premium motion engine: public site + admin UI. */
  function setupPremiumMotion(){
    if(document.documentElement.dataset.aiallanMotionBound) return;
    document.documentElement.dataset.aiallanMotionBound='1';
    var style=document.createElement('style');
    style.id='aiallan-premium-motion';
    style.textContent=`
      /* Keep media mounted during fast scrolling; do not recycle visible cards. */
      .v-card-image img,.v-home-category-image img,.v-product-thumbs img{content-visibility:visible!important;}
      .v-card-image img[loading="lazy"],.v-home-category-image img[loading="lazy"],.v-product-thumbs img[loading="lazy"]{content-visibility:visible!important;}

      /* Route/page motion */
      .v-page.aiallan-page-enter{animation:aiallanPageEnter .44s cubic-bezier(.22,.61,.36,1) both}
      @keyframes aiallanPageEnter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

      /* Global tap feedback: buttons, links and actionable cards feel responsive instead of cutting. */
      button,a,[role="button"],input[type="button"],input[type="submit"],input[type="reset"],select,
      .admin-btn,.v-btn,.v-card,.v-category-card,.v-product-card,.admin-section-head{
        -webkit-tap-highlight-color:transparent;
      }
      button,a,[role="button"],input[type="button"],input[type="submit"],input[type="reset"],select,
      .admin-btn,.v-btn{
        transition:transform .22s cubic-bezier(.22,.61,.36,1),opacity .22s ease,background-color .22s ease,border-color .22s ease,color .22s ease,box-shadow .22s ease;
      }
      button:active,a:active,[role="button"]:active,input[type="button"]:active,input[type="submit"]:active,input[type="reset"]:active,
      .admin-btn:active,.v-btn:active{transform:scale(.975);}
      .v-card,.v-category-card,.v-product-card{transition:transform .32s cubic-bezier(.22,.61,.36,1),opacity .28s ease,box-shadow .32s ease;}
      .v-card:active,.v-category-card:active,.v-product-card:active{transform:scale(.985);}

      /* Mobile drawer */
      .v-mobile-drawer{display:block!important;visibility:hidden;opacity:0;pointer-events:none;transition:opacity .34s cubic-bezier(.22,.61,.36,1),visibility 0s linear .34s}
      .v-mobile-drawer.open{visibility:visible;opacity:1;pointer-events:auto;transition:opacity .34s cubic-bezier(.22,.61,.36,1),visibility 0s linear 0s}
      .v-mobile-panel{transform:translateX(-18px);transition:transform .42s cubic-bezier(.22,.61,.36,1)}
      .v-mobile-drawer.open .v-mobile-panel{transform:translateX(0)}

      /* Search */
      .v-search{display:block!important;visibility:hidden;opacity:0;transform:translateY(-8px);pointer-events:none;transition:opacity .30s cubic-bezier(.22,.61,.36,1),transform .36s cubic-bezier(.22,.61,.36,1),visibility 0s linear .30s}
      .v-search.open{visibility:visible;opacity:1;transform:translateY(0);pointer-events:auto;transition:opacity .30s cubic-bezier(.22,.61,.36,1),transform .36s cubic-bezier(.22,.61,.36,1),visibility 0s linear 0s}

      /* Common overlays/modals/drawers in the admin/public UI. */
      .v-modal,.modal,.admin-modal,.admin-modal-overlay,.v-overlay,.v-product-layer{
        transition:opacity .30s cubic-bezier(.22,.61,.36,1),visibility .30s ease,background-color .30s ease;
      }
      .admin-modal-box,.modal-box,.v-product-layer-inner,.v-modal-box{
        transition:transform .38s cubic-bezier(.22,.61,.36,1),opacity .30s ease,box-shadow .38s ease;
      }

      /* Native View Transitions when available. */
      ::view-transition-old(root){animation:aiallanViewOld .28s ease both}
      ::view-transition-new(root){animation:aiallanViewNew .40s cubic-bezier(.22,.61,.36,1) both}
      @keyframes aiallanViewOld{to{opacity:.96}}
      @keyframes aiallanViewNew{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    `;
    (document.head || document.documentElement).appendChild(style);

    var original=window.show;
    if(typeof original==='function' && !original.__aiallanPremiumWrapped){
      function animateShow(page,opts){
        opts=opts||{};
        var run=function(){
          original(page,Object.assign({},opts,{instant:true}));
          var el=document.getElementById(page);
          if(el){
            el.classList.remove('aiallan-page-enter');
            void el.offsetWidth;
            el.classList.add('aiallan-page-enter');
            window.setTimeout(function(){el.classList.remove('aiallan-page-enter');},520);
          }
        };
        if(document.startViewTransition && !opts.instant){
          try{ document.startViewTransition(run); return; }catch(_){ }
        }
        run();
      }
      animateShow.__aiallanPremiumWrapped=true;
      window.show=animateShow;
    }

    /* Add a small pressed-state class for dynamically created controls too. */
    document.addEventListener('pointerdown',function(e){
      var el=e.target && e.target.closest ? e.target.closest('button,a,[role="button"],input[type="button"],input[type="submit"],input[type="reset"],.admin-btn,.v-btn') : null;
      if(!el) return;
      el.classList.add('aiallan-pressed');
    },{passive:true});
    document.addEventListener('pointerup',function(){
      document.querySelectorAll('.aiallan-pressed').forEach(function(el){el.classList.remove('aiallan-pressed');});
    },{passive:true});
    document.addEventListener('pointercancel',function(){
      document.querySelectorAll('.aiallan-pressed').forEach(function(el){el.classList.remove('aiallan-pressed');});
    },{passive:true});
  }

  function refresh(){
    if(scheduled) clearTimeout(scheduled);
    scheduled=setTimeout(function(){
      scheduled=0;
      polishImages();
      setupNearViewport();
      setupVideo();
      tuneInteraction();
    },60);
  }

  function init(){
    setupPremiumMotion();
    refresh();
    if(window.MutationObserver){
      rootObserver=new MutationObserver(refresh);
      rootObserver.observe(document.body,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
