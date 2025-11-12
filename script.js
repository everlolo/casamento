/* ================== ENDPOINT ==================
   Proxy da Vercel (caso exista) + fallback direto no GAS.
   Aqui deixei sua URL do Google Apps Script que já funcionou.
*/
const WEBHOOK_URL_PROXY = '/api/rsvp'; // se não tiver API routes, ignorará
const GAS_FALLBACK_URL  = 'https://script.google.com/macros/s/AKfycbygYup61ahqKlAPN5Nr0_ldLItzN3MwFUU1GQl0-b6K-6J5-MDUr_bbCWz33NlAMgmvoA/exec';

async function postRSVP(payload){
  // tenta proxy primeiro; se falhar/404, tenta GAS fallback
  async function tryUrl(url){
    const r = await fetch(url, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    // Alguns setups retornam 200 sem JSON; tratamos com tolerância
    let data = null;
    try { data = await r.clone().json(); } catch { /* ignora */ }
    return { ok: r.ok, status: r.status, data };
  }

  // 1) tenta proxy
  try {
    const pr = await tryUrl(WEBHOOK_URL_PROXY);
    if (pr.ok && pr.data) return pr.data;
    // se proxy respondeu 404/500 ou não trouxe JSON, tenta GAS
  } catch { /* segue para fallback */ }

  // 2) fallback GAS
  const gr = await tryUrl(GAS_FALLBACK_URL);
  // Se veio JSON, ótimo:
  if (gr.ok && gr.data) return gr.data;

  // Se não veio JSON, MAS o servidor recebeu (muito comum no GAS),
  // vamos retornar um "sucesso" otimista quando a resposta for 200/204.
  if (gr.ok) {
    // payload.resposta decide a mensagem adiante
    return { status: (payload.resposta === 'Verificar' ? 'nome_encontrado' : 'sucesso'),
             message: 'Registrado.' };
  }

  // Se chegou aqui, de fato falhou:
  throw new Error('Falha na comunicação com o servidor.');
}

// DATA EXATA DO CASAMENTO (mantém a sua)
const dataFinal = new Date('July 25, 2026 09:30:00').getTime();

function atualizarDiasRestantes(){
  const alvo = dataFinal;
  const agora = Date.now();
  let dias = Math.ceil((alvo - agora) / (1000 * 60 * 60 * 24));

  const el = document.getElementById('daysOnly');
  const banner = document.getElementById('bannerCountdown');
  if (!el || !banner) return;

  if (dias <= 0){
    // Chegou o grande dia
    banner.querySelector('.bc-label').textContent = '';
    el.textContent = 'HOJE!';
    banner.querySelectorAll('.bc-label')[1]?.remove?.(); // remove “DIAS”
    return;
  }

  // formata com 2–3 dígitos, se quiser
  el.textContent = String(dias).padStart(2, '0');
}

// inicia e mantém atualizado 1x por minuto (basta p/ dias)
atualizarDiasRestantes();
setInterval(atualizarDiasRestantes, 60 * 1000);



/* ================== SMOOTH SCROLL NAV ================== */
document.querySelectorAll('.topbar a[href^="#"]').forEach(a=>{
  a.addEventListener('click', e=>{
    e.preventDefault();
    const id = a.getAttribute('href');
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
  });
});

/* ================== CARROSSEL SETAS ================== */
(function(){
  const wrap = document.querySelector('.carrossel-wrap');
  if (!wrap) return;
  const car = wrap.querySelector('.carrossel');
  const esq = wrap.querySelector('.seta.esquerda');
  const dir = wrap.querySelector('.seta.direita');

  function step(){ return Math.min(360, car.clientWidth * 0.9); }
  esq.addEventListener('click', ()=> car.scrollBy({ left: -step(), behavior:'smooth' }));
  dir.addEventListener('click', ()=> car.scrollBy({ left:  step(), behavior:'smooth' }));
})();

/* ================== RSVP ================== */
const checkNomeBtn = document.getElementById('checkNomeBtn');
const nomeInput = document.getElementById('nomeInput');
const rsvpMessage = document.getElementById('rsvp-message');
const confirmationArea = document.getElementById('rsvp-confirmation-area');
const convidadoNomeEl = document.getElementById('convidado-nome');
const btnSim = document.getElementById('btnSim');
const btnNao = document.getElementById('btnNao');

if (confirmationArea) confirmationArea.style.display = 'none';

function detectarOrigem(){
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|android|ipad|ipod/.test(ua) ? 'Site - Mobile' : 'Site - Desktop';
}

function live(msg){
  const live = document.getElementById('aria-live');
  if (live) live.textContent = msg;
}

function confetti(pieces = 120, durationMs = 2200){
  const colors = ["#ff6b6b","#ffd166","#06d6a0","#4dabf7","#f78da7"];
  const cont = document.getElementById("confetti-container");
  if (!cont) return;
  const W = window.innerWidth;

  for (let i=0; i<pieces; i++){
    const el = document.createElement("div");
    el.className = "confetti";
    el.style.background = colors[i % colors.length];
    el.style.left = Math.random()*W + "px";
    el.style.top  = "-20px";
    el.style.transform = `translateY(0) rotate(${Math.random()*360}deg)`;
    el.style.animationDuration = (1 + Math.random()*1.2) + "s";
    el.style.borderRadius = Math.random() < .4 ? "2px" : "50%";
    cont.appendChild(el);
    setTimeout(()=> el.remove(), durationMs);
  }
}

async function processarRSVP(resposta) {
  const nome = (nomeInput?.value || '').trim();
  if (!rsvpMessage) return;

  if (!nome) {
    rsvpMessage.textContent = 'Por favor, digite seu nome.';
    rsvpMessage.className = 'rsvp-message error';
    return;
  }

  // Loading
  rsvpMessage.textContent = '⏳ Processando sua resposta...';
  rsvpMessage.className = 'rsvp-message loading';
  checkNomeBtn && (checkNomeBtn.disabled = true);
  btnSim && (btnSim.disabled = true);
  btnNao && (btnNao.disabled = true);

  // Etapa "Verificar": só prepara UI
  if (resposta === 'Verificar') {
    rsvpMessage.textContent = 'Nome verificado. Por favor, confirme sua presença:';
    rsvpMessage.className = 'rsvp-message info';
    confirmationArea && (confirmationArea.style.display = 'block');
    checkNomeBtn && (checkNomeBtn.style.display = 'none');
    nomeInput && (nomeInput.disabled = true);
    btnSim && (btnSim.disabled = false, btnSim.onclick = () => processarRSVP('Confirmado'));
    btnNao && (btnNao.disabled = false, btnNao.onclick = () => processarRSVP('Recusado'));
    live && live('Nome verificado. Confirme sua presença.');
    return;
  }

  try {
    // ---- RESOLVE URL (inclui GAS_FALLBACK_URL) ----
    const candidates = [
      (typeof GAS_URL !== 'undefined' && GAS_URL),
      (typeof WEBHOOK_URL_GAS !== 'undefined' && WEBHOOK_URL_GAS),
      (typeof GAS_FALLBACK_URL !== 'undefined' && GAS_FALLBACK_URL),
      (typeof window !== 'undefined' && (window.GAS_URL || window.WEBHOOK_URL_GAS || window.GAS_FALLBACK_URL))
    ].filter(Boolean);

    const url = candidates[0] || null;

    if (!url) {
      console.error('[RSVP] URL do GAS não encontrada. Defina GAS_URL / WEBHOOK_URL_GAS / GAS_FALLBACK_URL.');
      rsvpMessage.textContent = 'Configuração ausente do servidor (URL). Avise os noivos.';
      rsvpMessage.className = 'rsvp-message error';
      return;
    }

    console.log('[RSVP] Enviando para:', url, 'payload:', { nome, resposta });

    // Importante: em no-cors, não setar Content-Type "application/json"
    // Enviamos o corpo como texto (GAS lê e.postData.contents normalmente).
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        nome,
        resposta,
        origem: (typeof detectarOrigem === 'function') ? detectarOrigem() : 'site'
      })
    });

    // Sucesso otimista (a planilha registra mesmo com resposta "opaqua")
    const confirmou = (resposta === 'Confirmado');
    rsvpMessage.innerHTML = confirmou
      ? '🎉 <strong>Presença confirmada!</strong> Que alegria ter você conosco! 💚'
      : '💌 <strong>Resposta registrada.</strong> Agradecemos o carinho e desejamos o melhor!';
    rsvpMessage.className = 'rsvp-message success';

    confirmationArea && (confirmationArea.innerHTML =
      `<p class="rsvp-boas-vindas" style="font-size:1.3rem;margin:.5rem 0 0">
         ${confirmou ? 'Nos vemos no grande dia! ✨' : 'Obrigado por nos avisar com antecedência 🙏'}
       </p>`);

    live && live(confirmou ? 'Presença confirmada.' : 'Ausência registrada.');
    if (confirmou && typeof confetti === 'function') confetti(140, 2400);
    rsvpMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });

  } catch (e) {
    console.error('[RSVP] Falha no envio:', e);
    rsvpMessage.textContent = 'Erro de conexão. Tente novamente em alguns segundos.';
    rsvpMessage.className = 'rsvp-message error';
  } finally {
    checkNomeBtn && (checkNomeBtn.disabled = false);
    btnSim && (btnSim.disabled = false);
    btnNao && (btnNao.disabled = false);
  }
}




// Clique do "Verificar"
if (checkNomeBtn) {
  checkNomeBtn.addEventListener('click', async () => {
    const nome = (nomeInput?.value || '').trim();
    if (!nome) {
      rsvpMessage && (rsvpMessage.textContent = 'Por favor, digite seu nome.',
                      rsvpMessage.className = 'rsvp-message error');
      return;
    }
    convidadoNomeEl && (convidadoNomeEl.textContent = nome);
    await processarRSVP('Verificar');
  });
}

// Preenche automaticamente a data nas cápsulas, reaproveitando a sua dataFinal
(function renderWeddingDate(){
  try{
    const d = new Date(dataFinal);
    if (isNaN(d)) return;

    const meses = ["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO",
                   "JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];

    const dd   = String(d.getDate()).padStart(2,'0');
    const mes  = meses[d.getMonth()];
    const ano  = String(d.getFullYear());
    const hh   = String(d.getHours()).padStart(2,'0');
    const mm   = String(d.getMinutes()).padStart(2,'0');

    const dayEl   = document.querySelector('.date-day');
    const monthEl = document.querySelector('.date-month');
    const yearEl  = document.querySelector('.date-year');
    const timeEl  = document.querySelector('.date-time');

    if (dayEl)   dayEl.textContent   = dd;
    if (monthEl) monthEl.textContent = mes;
    if (yearEl)  yearEl.textContent  = ano;
    if (timeEl)  timeEl.textContent  = `${hh}:${mm}`;
  }catch(e){ /* silencioso */ }
})();

// 4) Títulos com sublinhado animado (IntersectionObserver)
(() => {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) e.target.classList.add('revealed');
  }, { threshold: 0.6 });

  document.querySelectorAll('.section-title').forEach(el => io.observe(el));
})();


// 3) Navegação por setas na lista de presentes
(() => {
  const track = document.querySelector('.gifts-wrapper');
  if (!track) return;

  const prev = document.querySelector('.gift-prev');
  const next = document.querySelector('.gift-next');

  const step = () => Math.max(track.clientWidth * 0.9, 320);

  prev?.addEventListener('click', () => {
    track.scrollBy({ left: -step(), behavior: 'smooth' });
  });

  next?.addEventListener('click', () => {
    track.scrollBy({ left: step(), behavior: 'smooth' });
  });
})();


// Navegação do carrossel (mantendo sua estrutura)
(() => {
  const trilho = document.getElementById('carrossel-presentes');
  const btnEsq = document.querySelector('.seta.esquerda');
  const btnDir = document.querySelector('.seta.direita');
  if (!trilho || !btnEsq || !btnDir) return;

  const passo = () => Math.round(trilho.clientWidth * 0.9);

  btnDir.addEventListener('click', () => {
    trilho.scrollBy({ left:  passo(), behavior: 'smooth' });
  });
  btnEsq.addEventListener('click', () => {
    trilho.scrollBy({ left: -passo(), behavior: 'smooth' });
  });

  // Snap com teclado (acessibilidade)
  trilho.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') btnDir.click();
    if (e.key === 'ArrowLeft')  btnEsq.click();
  });
})();

// ====== Navegação da galeria (mesma experiência do carrossel de presentes) ======
(function initGaleria() {
  const wrap = document.getElementById('galeria-noivos');
  if (!wrap) return;

  const prev = document.querySelector('#galeria .gallery-nav.prev');
  const next = document.querySelector('#galeria .gallery-nav.next');

  const step = () => Math.max(280, Math.floor(wrap.clientWidth * 0.8));

  prev?.addEventListener('click', () => wrap.scrollBy({ left: -step(), behavior: 'smooth' }));
  next?.addEventListener('click', () => wrap.scrollBy({ left:  step(), behavior: 'smooth' }));

  // Arrastar com o dedo/mouse (drag-to-scroll)
  let isDown = false, startX = 0, startLeft = 0, pid = null;
  wrap.addEventListener('pointerdown', (e) => {
    isDown = true; startX = e.clientX; startLeft = wrap.scrollLeft;
    pid = e.pointerId; wrap.setPointerCapture(pid);
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    wrap.scrollLeft = startLeft - (e.clientX - startX);
  });
  const stop = () => { isDown = false; if (pid) { wrap.releasePointerCapture(pid); pid = null; } };
  wrap.addEventListener('pointerup', stop);
  wrap.addEventListener('pointercancel', stop);

  // Roda do mouse (shift+scroll horizontal em alguns SOs)
  wrap.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      wrap.scrollBy({ left: e.deltaX, behavior: 'smooth' });
    }
  }, { passive: false });
})();





