/* Aiallan Guests — public UI only. OAuth secrets/tokens never live here. */
(() => {
  'use strict';
  const FUNCTION_BASE = 'https://tqtmssdjfptmbvjtxien.supabase.co/functions/v1/guest-social';
  const PROVIDERS = {
    tiktok: {label:'TikTok', icon:'fa-brands fa-tiktok'},
    instagram: {label:'Instagram', icon:'fa-brands fa-instagram'},
    youtube: {label:'YouTube', icon:'fa-brands fa-youtube'},
    facebook: {label:'Facebook', icon:'fa-brands fa-facebook-f'}
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const provider = key => PROVIDERS[key] || {label:key,icon:'fa-solid fa-user'};
  const formatCount = value => {
    if (value === null || value === undefined || value === '') return '';
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    if (n >= 1e9) return `${(n/1e9).toFixed(n>=1e10?0:1).replace(/\.0$/,'')}B`;
    if (n >= 1e6) return `${(n/1e6).toFixed(n>=1e7?0:1).replace(/\.0$/,'')}M`;
    if (n >= 1e3) return `${(n/1e3).toFixed(n>=1e5?0:1).replace(/\.0$/,'')}K`;
    return n.toLocaleString();
  };
  const initial = value => String(value || '?').trim().charAt(0).toUpperCase() || '?';

  function sourceLabel(){
    try{
      const params = new URLSearchParams(location.search);
      const raw = `${params.get('utm_source')||''} ${document.referrer||''}`.toLowerCase();
      if(/tiktok\.com|tiktok/i.test(raw)) return 'You arrived from TikTok.';
      if(/instagram\.com|instagram/i.test(raw)) return 'You arrived from Instagram.';
      if(/youtube\.com|youtu\.be|youtube/i.test(raw)) return 'You arrived from YouTube.';
      if(/facebook\.com|fb\.me|facebook/i.test(raw)) return 'You arrived from Facebook.';
      return '';
    }catch(_){ return ''; }
  }

  function setStatus(text, error=false){
    const el=document.getElementById('aiallanGuestStatus');
    if(!el)return;
    el.textContent=text||'';
    el.classList.toggle('error',!!error);
  }

  function render(list){
    const grid=document.getElementById('aiallanGuestsGrid');
    if(!grid)return;
    const items=Array.isArray(list)?list.slice(0,20):[];
    if(!items.length){
      grid.innerHTML='<div class="aiallan-guests-empty">Be the first guest to connect a social profile to Aiallan.</div>';
      return;
    }
    grid.innerHTML=items.map(x=>{
      const p=provider(x.provider);
      const name=esc(x.display_name||x.username||p.label);
      const handle=x.username ? '@'+esc(x.username) : '';
      const follower=x.followers_count!==null&&x.followers_count!==undefined&&x.followers_count!=='' ? `${esc(formatCount(x.followers_count))} followers` : '';
      const country=x.country_code ? esc(String(x.country_code).toUpperCase()) : '';
      const meta=[country,follower,p.label].filter(Boolean).join(' · ');
      const avatar=x.avatar_url ? `<img src="${esc(x.avatar_url)}" alt="${name}" loading="lazy" referrerpolicy="no-referrer">` : `<span class="aiallan-guest-initial">${initial(x.display_name||x.username)}</span>`;
      const link=/^https:\/\//i.test(String(x.profile_url||'')) ? `<a class="aiallan-guest-profile-link" href="${esc(x.profile_url)}" target="_blank" rel="noopener noreferrer">View profile ↗</a>` : '';
      return `<article class="aiallan-guest-card"><div class="aiallan-guest-avatar">${avatar}</div><div class="aiallan-guest-name">${name}${x.is_verified?'<span class="aiallan-guest-verified">✓</span>':''}</div>${handle?`<div class="aiallan-guest-handle">${handle}</div>`:''}<div class="aiallan-guest-meta">${meta}</div>${link}</article>`;
    }).join('');
  }

  async function load(){
    try{
      const r=await fetch(`${FUNCTION_BASE}?action=list`,{headers:{'Accept':'application/json'},cache:'no-store'});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data.error||'Guest profiles are temporarily unavailable.');
      render(data.profiles||[]);
      setStatus('');
    }catch(e){
      render([]);
      setStatus(e.message||'Guest profiles are temporarily unavailable.',true);
    }
  }

  function bind(){
    const root=document.getElementById('aiallanGuestsSection');
    if(!root)return;
    root.querySelectorAll('[data-guest-provider]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const p=btn.dataset.guestProvider;
        if(!PROVIDERS[p])return;
        btn.disabled=true;
        setStatus(`Connecting to ${PROVIDERS[p].label}…`);
        location.href=`${FUNCTION_BASE}/start?provider=${encodeURIComponent(p)}`;
      });
    });
    const src=sourceLabel();
    const sourceEl=document.getElementById('aiallanGuestSource');
    if(sourceEl&&src){sourceEl.textContent=src;sourceEl.classList.add('show');}
    const params=new URLSearchParams(location.search);
    const guest=params.get('guest');
    if(guest==='connected')setStatus('Connected — your profile is now part of Guests of Aiallan.');
    if(guest==='error')setStatus(params.get('message')||'The social connection could not be completed.',true);
    if(guest){
      params.delete('guest');params.delete('message');
      const clean=params.toString();
      history.replaceState(null,'',location.pathname+(clean?'?'+clean:'')+location.hash);
    }
    load();
    setInterval(load,60000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
