/* AIALAN performance layer
   Public-media and interaction tuning only. It does not change Supabase state,
   authentication, routes, catalog data, uploads, or affiliate links.
*/
(function(){
  'use strict';

  var CDN='https://cdn.aiallan.shop';
  var warmTimer=0;
  var warmQueue=[];
  var warmed=new Set();
  var observer=null;

  function addPreconnect(href){
    if(document.head.querySelector('link[rel="preconnect"][href="'+href+'"]')) return;
    var l=document.createElement('link');
    l.rel='preconnect';
    l.href=href;
    l.crossOrigin='anonymous';
    document.head.appendChild(l);
  }

  function addDNS(href){
    if(document.head.querySelector('link[rel="dns-prefetch"][href="'+href+'"]')) return;
    var l=document.createElement('link');
    l.rel='dns-prefetch';
    l.href=href;
    document.head.appendChild(l);
  }

  addPreconnect(CDN);
  addPreconnect('https://tqtmssdjfptmbvjtxien.supabase.co');
  addDNS(CDN);

  function publicRoot(){ return document.getElementById('vHomePage') || document.body; }

  /* Keep the first viewport fast: only the media most likely to be visible gets
     high priority. Everything else is eager without competing for high priority. */
  function prepareImage(img, index){
    if(!img || !img.src || img.src.indexOf('data:')===0) return;
    img.decoding='async';
    if(img.closest('#vHeroMedia') || index<3){
      img.loading='eager';
      img.fetchPriority='high';
    }else{
      img.loading='eager';
      img.fetchPriority='low';
    }
  }

  function polishImages(){
    var root=publicRoot();
    var imgs=root.querySelectorAll ? root.querySelectorAll('img') : [];
    imgs.forEach(function(img,i){ prepareImage(img,i); });
  }

  function setupVideo(){
    var video=document.getElementById('vHomeVideo');
    if(!video || video.dataset.aiallanPerfBound) return;
    video.dataset.aiallanPerfBound='1';
    if(!video.getAttribute('src')) return;

    video.preload='auto';
    video.playsInline=true;
    video.autoplay=true;
    video.loop=true;
    video.muted=true;
    video.defaultMuted=true;

    try{ video.load(); }catch(_){ }
    var p=video.play();
    if(p && p.catch) p.catch(function(){
      try{ video.muted=true; video.play().catch(function(){}); }catch(_){ }
    });
  }

  function mediaUrls(){
    var root=publicRoot();
    var urls=[];
    var seen=new Set();
    if(!root.querySelectorAll) return urls;
    root.querySelectorAll('img[src],video[src],video[poster]').forEach(function(el){
      ['src','poster'].forEach(function(attr){
        var u=el.getAttribute(attr);
        if(!u || u.indexOf('data:')===0 || seen.has(u)) return;
        seen.add(u);
        urls.push(u);
      });
    });
    return urls;
  }

  function enqueueWarm(){
    var urls=mediaUrls();
    urls.forEach(function(u){
      if(!warmed.has(u) && warmQueue.indexOf(u)===-1) warmQueue.push(u);
    });
    scheduleWarm();
  }

  /* Background warm-up is intentionally throttled. It keeps later sections
     ready without opening dozens of simultaneous downloads on mobile. */
  function scheduleWarm(){
    if(warmTimer || !warmQueue.length) return;
    var run=function(){
      warmTimer=0;
      var count=0;
      while(warmQueue.length && count<2){
        var url=warmQueue.shift();
        if(warmed.has(url)) continue;
        warmed.add(url);
        var img=new Image();
        try{ img.decoding='async'; img.fetchPriority='low'; }catch(_){ }
        img.src=url;
        count++;
      }
      if(warmQueue.length) warmTimer=setTimeout(scheduleWarm,180);
    };
    if('requestIdleCallback' in window){
      warmTimer=requestIdleCallback(run,{timeout:900});
    }else{
      warmTimer=setTimeout(run,180);
    }
  }

  /* Keep touch/scroll work on the browser compositor where possible. This
     does not force 120Hz; supported displays naturally render at their rate. */
  function tuneInteraction(){
    var root=document.documentElement;
    root.style.webkitTapHighlightColor='transparent';
    var rails=document.querySelectorAll('.v-home-products,.v-home-category-rail,.aiallan-product-gallery');
    rails.forEach(function(el){
      el.style.webkitOverflowScrolling='touch';
      el.style.overscrollBehavior='contain';
    });
  }

  function init(){
    polishImages();
    setupVideo();
    tuneInteraction();
    enqueueWarm();

    if(window.MutationObserver){
      observer=new MutationObserver(function(){
        polishImages();
        setupVideo();
        enqueueWarm();
      });
      observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src','poster']});
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
