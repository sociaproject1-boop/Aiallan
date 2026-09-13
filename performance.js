/* AIALAN performance layer
   Scope: media loading and lightweight UI motion.
   IMPORTANT: this file must never rescan/rebuild the whole DOM on every mutation.
*/
(function(){
  'use strict';

  var CDN='https://cdn.aiallan.shop';
  var mediaObserver=null;
  var mutationObserver=null;
  var videoObserver=null;
  var initialized=false;
  var queued=new WeakSet();

  function addHint(rel,href,cross){
    try{
      if(document.head.querySelector('link[rel="'+rel+'"][href="'+CSS.escape(href)+'"]')) return;
    }catch(_){}
    var l=document.createElement('link');
    l.rel=rel;l.href=href;
    if(cross) l.crossOrigin='anonymous';
    document.head.appendChild(l);
  }

  addHint('preconnect',CDN,true);
  addHint('dns-prefetch',CDN,false);

  function root(){
    return document.getElementById('vHomePage') || document.body;
  }

  function real(u){ return !!u && !/^data:|^blob:/i.test(u); }

  /* Keep images painted when they exist. The browser may still lazy-load them,
     but CSS content-visibility is never allowed to recycle a product image. */
  function stabilize(img,priority){
    if(!img || img.tagName!=='IMG') return;
    img.decoding='async';
    img.style.contentVisibility='visible';
    img.style.contain='none';

    var near=!!(img.closest('#vHeroMedia') || img.closest('.v-home-category-image'));
    if(priority || near){
      img.loading='eager';
      img.fetchPriority='high';
    }else{
      /* Eager is applied progressively by the viewport observer. This prevents
         a large catalog from starting hundreds of downloads at once. */
      if(!img.hasAttribute('loading')) img.loading='lazy';
      img.fetchPriority='low';
    }
  }

  function warmNear(img){
    if(!img || queued.has(img)) return;
    queued.add(img);
    var u=img.currentSrc || img.src;
    if(!real(u)) return;
    /* Asking the browser to decode a near-viewport image is enough. Do not
       create a second Image() for every catalog asset; that was a major source
       of network contention and scroll jank in the previous version. */
    try{ img.decode?.().catch?.(function(){}); }catch(_){}
  }

  function observeImages(scope){
    if(!scope || !scope.querySelectorAll) return;
    var imgs=[];
    if(scope.tagName==='IMG') imgs=[scope];
    else imgs=Array.prototype.slice.call(scope.querySelectorAll('img[src]'));

    imgs.forEach(function(img){
      var isHero=!!img.closest('#vHeroMedia');
      var isTop=!!img.closest('.v-home-category-image');
      stabilize(img,isHero||isTop);
      if(isHero||isTop) warmNear(img);
      if(mediaObserver && !img.dataset.aiallanMediaObserved){
        img.dataset.aiallanMediaObserved='1';
        mediaObserver.observe(img);
      }
    });
  }

  function setupMediaObserver(){
    if(!('IntersectionObserver' in window)) return;
    if(mediaObserver) mediaObserver.disconnect();
    mediaObserver=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting) return;
        var img=entry.target;
        /* Promote only when the image is actually approaching the viewport.
           A large root margin avoids blank cards during fast scrolling. */
        img.loading='eager';
        img.fetchPriority='auto';
        stabilize(img,false);
        warmNear(img);
        mediaObserver.unobserve(img);
      });
    },{
      root:null,
      rootMargin:'2200px 0px',
      threshold:0.01
    });
    observeImages(root());
  }

  function setupVideo(){
    var video=document.getElementById('vHomeVideo');
    var section=document.getElementById('vHomeVideoSection');
    if(!video || !section || video.dataset.aiallanPerfBound) return;
    video.dataset.aiallanPerfBound='1';
    video.preload='metadata';
    video.playsInline=true;
    video.autoplay=true;
    video.loop=true;
    video.muted=true;
    video.defaultMuted=true;

    function start(){
      video.preload='auto';
      try{ video.load(); }catch(_){}
      var p=video.play();
      if(p && p.catch) p.catch(function(){video.muted=true;video.play().catch(function(){});});
    }
    function stop(){if(!video.paused)video.pause();}

    if('IntersectionObserver' in window){
      videoObserver=new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if(e.isIntersecting) start();
          else if(e.intersectionRatio===0) stop();
        });
      },{root:null,rootMargin:'1000px 0px',threshold:0.01});
      videoObserver.observe(section);
    }else start();
  }

  function setupMotion(){
    if(document.documentElement.dataset.aiallanMotionBound) return;
    document.documentElement.dataset.aiallanMotionBound='1';

    var style=document.createElement('style');
    style.textContent=`
      /* Product/category images must never be recycled into blank tiles. */
      .v-card-image img,.v-home-category-image img,.v-product-thumbs img,
      .v-feature-media img,.v-product-main-image img,.v-product-thumb img,
      .v-suggestion-image img,.aiallan-cat-card-img img{
        content-visibility:visible!important;
        contain:none!important;
      }

      button,a,[role="button"],input[type="button"],input[type="submit"],
      input[type="reset"],select,.admin-btn,.v-btn{
        -webkit-tap-highlight-color:transparent;
        transition:transform .18s ease,opacity .18s ease,
                    background-color .18s ease,border-color .18s ease,
                    color .18s ease,box-shadow .18s ease;
      }
      button:active,a:active,[role="button"]:active,
      input[type="button"]:active,input[type="submit"]:active,
      input[type="reset"]:active,.admin-btn:active,.v-btn:active{
        transform:scale(.985);
      }

      .v-card,.v-category-card,.v-product-card{
        transition:transform .24s ease,opacity .18s ease,box-shadow .24s ease;
      }
      .v-card:active,.v-category-card:active,.v-product-card:active{
        transform:scale(.995);
      }

      .v-mobile-drawer{
        display:block!important;visibility:hidden;opacity:0;pointer-events:none;
        transition:opacity .24s ease,visibility 0s linear .24s;
      }
      .v-mobile-drawer.open{
        visibility:visible;opacity:1;pointer-events:auto;
        transition:opacity .24s ease,visibility 0s linear 0s;
      }
      .v-mobile-panel{transform:translateX(-12px);transition:transform .28s ease;}
      .v-mobile-drawer.open .v-mobile-panel{transform:translateX(0);}
      .v-search{
        display:block!important;visibility:hidden;opacity:0;transform:translateY(-8px);
        pointer-events:none;transition:opacity .22s ease,transform .24s ease,
        visibility 0s linear .22s;
      }
      .v-search.open{
        visibility:visible;opacity:1;transform:translateY(0);pointer-events:auto;
        transition:opacity .22s ease,transform .24s ease,visibility 0s linear 0s;
      }
      .v-modal,.modal,.admin-modal,.admin-modal-overlay,.v-overlay,.v-product-layer{
        transition:opacity .22s ease,visibility .22s ease,background-color .22s ease;
      }
      .modal-box,.admin-modal-box,.v-product-layer-inner,.v-modal-box{
        transition:transform .26s ease,opacity .22s ease,box-shadow .26s ease;
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  /* Only inspect nodes that were actually added. The old version observed the
     entire body and then rescanned every image on every keystroke/mutation. */
  function setupMutationObserver(){
    if(!window.MutationObserver || mutationObserver) return;
    mutationObserver=new MutationObserver(function(records){
      var needsVideo=false;
      records.forEach(function(record){
        Array.prototype.forEach.call(record.addedNodes||[],function(node){
          if(node.nodeType!==1) return;
          observeImages(node);
          if(node.id==='vHomeVideoSection' || node.querySelector?.('#vHomeVideoSection')) needsVideo=true;
        });
      });
      if(needsVideo) setupVideo();
    });
    mutationObserver.observe(document.body,{childList:true,subtree:true});
  }

  function init(){
    if(initialized) return;
    initialized=true;
    setupMotion();
    setupMediaObserver();
    setupVideo();
    setupMutationObserver();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
