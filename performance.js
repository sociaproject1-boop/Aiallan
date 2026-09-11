/* AIALAN performance layer
   Isolated public-media optimization. It does not change Supabase state,
   authentication, routes, catalog data, uploads, or affiliate links.
*/
(function(){
  'use strict';

  function addPreconnect(href){
    if(document.head.querySelector('link[rel="preconnect"][href="'+href+'"]')) return;
    var l=document.createElement('link');
    l.rel='preconnect';
    l.href=href;
    l.crossOrigin='';
    document.head.appendChild(l);
  }

  addPreconnect('https://cdn.aiallan.shop');
  addPreconnect('https://tqtmssdjfptmbvjtxien.supabase.co');

  function setupVideo(){
    var section=document.getElementById('vHomeVideoSection');
    var video=document.getElementById('vHomeVideo');
    if(!section || !video || video.dataset.aiallanPerfBound) return;
    video.dataset.aiallanPerfBound='1';

    var started=false;
    function start(){
      if(!video.getAttribute('src')) return;
      video.preload='metadata';
      if(!started){
        started=true;
        try{ video.load(); }catch(_){}
      }
      var p=video.play();
      if(p && p.catch){
        p.catch(function(){
          video.muted=true;
          video.defaultMuted=true;
          video.play().catch(function(){});
        });
      }
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
      },{root:null,rootMargin:'360px 0px',threshold:0.01});
      io.observe(section);
    }else{
      start();
    }
  }

  function polishImages(){
    var root=document.getElementById('vHomePage') || document;
    root.querySelectorAll('img').forEach(function(img){
      if(!img.hasAttribute('decoding')) img.decoding='async';
      if(img.closest('.v-card-image,.v-home-category-image,.v-product-thumbs') &&
         !img.hasAttribute('loading')) img.loading='lazy';
    });
  }

  function init(){
    setupVideo();
    polishImages();
    if(window.MutationObserver){
      var observer=new MutationObserver(function(){
        setupVideo();
        polishImages();
      });
      var target=document.getElementById('vHomePage') || document.body;
      if(target) observer.observe(target,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
