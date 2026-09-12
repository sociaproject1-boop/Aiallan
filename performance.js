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
      img.loading='lazy';
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
    refresh();
    if(window.MutationObserver){
      rootObserver=new MutationObserver(refresh);
      rootObserver.observe(document.body,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
