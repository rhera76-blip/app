// Generates the lightweight zero-dependency embeddable widget script.
// Served at GET /api/widget.js
export function buildWidgetScript(baseUrl) {
  return `(function(){
  if (window.__babehchatinLoaded) return; window.__babehchatinLoaded = true;
  var BASE = ${JSON.stringify(baseUrl)};
  var script = document.currentScript || (function(){var s=document.getElementsByTagName('script');for(var i=s.length-1;i>=0;i--){if(s[i].getAttribute('data-bot-id'))return s[i];}return null;})();
  var BOT_ID = script && script.getAttribute('data-bot-id');
  if (!BOT_ID) { console.warn('[BABEHCHATin] data-bot-id missing'); return; }
  var ORIGIN = window.location.origin;
  var SKEY = 'bc_session_' + BOT_ID;
  var sessionId = null; try { sessionId = localStorage.getItem(SKEY); } catch(e) {}
  var cfg = null, open = false, busy = false;

  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
  function fmt(s){ return esc(s).replace(/\\*\\*(.+?)\\*\\*/g,'<b>$1</b>').replace(/\\n/g,'<br>'); }

  function injectCSS(color, pos){
    var side = pos === 'bottom-left' ? 'left' : 'right';
    var css = ''+
    '.bc-btn{position:fixed;bottom:20px;'+side+':20px;width:60px;height:60px;border-radius:50%;background:'+color+';box-shadow:0 8px 24px rgba(0,0,0,.2);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2147483000;transition:transform .2s}'+
    '.bc-btn:hover{transform:scale(1.05)}'+
    '.bc-btn svg{width:28px;height:28px;fill:#fff}'+
    '.bc-panel{position:fixed;bottom:92px;'+side+':20px;width:380px;max-width:calc(100vw - 40px);height:560px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,.22);display:none;flex-direction:column;overflow:hidden;z-index:2147483000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#111}'+
    '.bc-panel.bc-open{display:flex;animation:bcIn .2s ease-out}'+
    '@keyframes bcIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}'+
    '.bc-head{background:'+color+';color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px}'+
    '.bc-avatar{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-weight:700;overflow:hidden;flex-shrink:0}'+
    '.bc-avatar img{width:100%;height:100%;object-fit:cover}'+
    '.bc-title{font-weight:600;font-size:15px;line-height:1.2}'+
    '.bc-sub{font-size:12px;opacity:.85;display:flex;align-items:center;gap:5px}'+
    '.bc-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;display:inline-block}'+
    '.bc-close{margin-left:auto;background:transparent;border:none;color:#fff;cursor:pointer;font-size:22px;line-height:1;padding:4px}'+
    '.bc-msgs{flex:1;overflow-y:auto;padding:16px;background:#f7f7f9;display:flex;flex-direction:column;gap:10px}'+
    '.bc-msg{max-width:82%;padding:10px 13px;border-radius:14px;line-height:1.45;word-wrap:break-word;white-space:pre-wrap}'+
    '.bc-msg.bc-bot{background:#fff;border:1px solid #e5e7eb;border-bottom-left-radius:4px;align-self:flex-start}'+
    '.bc-msg.bc-user{background:'+color+';color:#fff;border-bottom-right-radius:4px;align-self:flex-end}'+
    '.bc-msg.bc-err{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;align-self:flex-start}'+
    '.bc-typing span{display:inline-block;width:6px;height:6px;margin:0 2px;background:#9ca3af;border-radius:50%;animation:bcB 1.2s infinite}'+
    '.bc-typing span:nth-child(2){animation-delay:.2s}.bc-typing span:nth-child(3){animation-delay:.4s}'+
    '@keyframes bcB{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}'+
    '.bc-form{display:flex;gap:8px;padding:12px;border-top:1px solid #e5e7eb;background:#fff}'+
    '.bc-input{flex:1;border:1px solid #d1d5db;border-radius:10px;padding:10px 12px;font-size:14px;outline:none;font-family:inherit;resize:none;max-height:100px}'+
    '.bc-input:focus{border-color:'+color+'}'+
    '.bc-send{background:'+color+';border:none;color:#fff;border-radius:10px;width:42px;cursor:pointer;display:flex;align-items:center;justify-content:center}'+
    '.bc-send:disabled{opacity:.5;cursor:default}'+
    '.bc-send svg{width:18px;height:18px;fill:#fff}'+
    '.bc-foot{text-align:center;font-size:11px;color:#9ca3af;padding:6px;background:#fff}'+
    '.bc-foot a{color:#6b7280;text-decoration:none;font-weight:600}'+
    '@media(max-width:480px){.bc-panel{bottom:0;'+side+':0;width:100vw;max-width:100vw;height:100vh;max-height:100vh;border-radius:0}}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  }

  var els = {};
  function build(){
    injectCSS(cfg.primaryColor || '#4f46e5', cfg.position || 'bottom-right');
    var btn = document.createElement('button'); btn.className='bc-btn'; btn.setAttribute('aria-label','Buka chat');
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-3 9H7V9h10v2zm0-3H7V6h10v2z"/></svg>';
    var panel = document.createElement('div'); panel.className='bc-panel';
    var avatar = cfg.avatarUrl ? '<img src="'+esc(cfg.avatarUrl)+'" alt="">' : esc((cfg.name||'B').charAt(0).toUpperCase());
    panel.innerHTML = '<div class="bc-head"><div class="bc-avatar">'+avatar+'</div><div><div class="bc-title">'+esc(cfg.name)+'</div><div class="bc-sub"><span class="bc-dot"></span>Online</div></div><button class="bc-close" aria-label="Tutup">&times;</button></div>'+
      '<div class="bc-msgs"></div>'+
      '<form class="bc-form"><textarea class="bc-input" rows="1" placeholder="'+esc(cfg.placeholder||'Tulis pesan...')+'"></textarea><button class="bc-send" type="submit"><svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg></button></form>'+
      '<div class="bc-foot">Powered by <a href="'+BASE+'" target="_blank" rel="noopener">BABEHCHATin</a></div>';
    document.body.appendChild(btn); document.body.appendChild(panel);
    els.btn=btn; els.panel=panel; els.msgs=panel.querySelector('.bc-msgs'); els.form=panel.querySelector('.bc-form'); els.input=panel.querySelector('.bc-input'); els.send=panel.querySelector('.bc-send');
    btn.onclick = toggle; panel.querySelector('.bc-close').onclick = toggle;
    els.form.onsubmit = function(e){ e.preventDefault(); send(); };
    els.input.onkeydown = function(e){ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); } };
    if (cfg.welcomeMessage) addMsg('bot', cfg.welcomeMessage);
  }
  function toggle(){ open=!open; els.panel.classList.toggle('bc-open', open); if(open) setTimeout(function(){els.input.focus();},50); }
  function addMsg(role, text){ var d=document.createElement('div'); d.className='bc-msg bc-'+role; d.innerHTML=fmt(text); els.msgs.appendChild(d); els.msgs.scrollTop=els.msgs.scrollHeight; return d; }
  function typing(){ var d=document.createElement('div'); d.className='bc-msg bc-bot bc-typing'; d.innerHTML='<span></span><span></span><span></span>'; els.msgs.appendChild(d); els.msgs.scrollTop=els.msgs.scrollHeight; return d; }

  function send(){
    var text = els.input.value.trim(); if(!text || busy) return;
    busy=true; els.send.disabled=true; els.input.value='';
    addMsg('user', text);
    var t = typing(); var botEl=null; var full='';
    fetch(BASE + '/api/v1/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ botId: BOT_ID, sessionId: sessionId, message: text, origin: ORIGIN, pageUrl: location.href }) })
    .then(function(res){
      if(!res.ok){ return res.json().then(function(j){ throw new Error(j.error||'Gagal mengirim pesan'); }); }
      var reader=res.body.getReader(); var dec=new TextDecoder(); var buf='';
      function pump(){ return reader.read().then(function(r){
        if(r.done) return;
        buf += dec.decode(r.value,{stream:true});
        var parts = buf.split('\\n\\n'); buf = parts.pop();
        parts.forEach(function(rec){
          var ev = (rec.match(/^event: (.+)$/m)||[])[1]; var dl = (rec.match(/^data: (.+)$/m)||[])[1]; if(!dl) return;
          var data; try{ data=JSON.parse(dl);}catch(e){return;}
          if(ev==='meta' && data.sessionId){ sessionId=data.sessionId; try{localStorage.setItem(SKEY,sessionId);}catch(e){} }
          if(ev==='delta'){ if(!botEl){ t.remove(); botEl=addMsg('bot',''); } full+=data; botEl.innerHTML=fmt(full); els.msgs.scrollTop=els.msgs.scrollHeight; }
          if(ev==='error'){ t.remove(); addMsg('err', data.message||'Terjadi kesalahan'); }
        });
        return pump();
      }); }
      return pump();
    })
    .catch(function(e){ t.remove(); addMsg('err', e.message||'Terjadi kesalahan'); })
    .then(function(){ busy=false; els.send.disabled=false; if(t.parentNode) t.remove(); });
  }

  fetch(BASE + '/api/v1/bot/' + encodeURIComponent(BOT_ID) + '/config?origin=' + encodeURIComponent(ORIGIN))
    .then(function(r){ return r.json(); })
    .then(function(j){ if(!j || j.error){ console.warn('[BABEHCHATin] '+(j&&j.error)); return; } cfg=j; if(document.body) build(); else document.addEventListener('DOMContentLoaded', build); })
    .catch(function(e){ console.warn('[BABEHCHATin] failed to load config', e); });
})();`
}
