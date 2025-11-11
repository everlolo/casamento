/* ======================================================
   CONFIGURAÇÃO
   Preencha a URL do seu Google Apps Script se não vier do index.html
====================================================== */
const WEBHOOK_URL_GAS = window.WEBHOOK_URL_GAS || 'COLE_AQUI_SUA_URL_WEB_APP_GAS';

/* ======================================================
   CONTADOR – 25/07/2026 09:30 America/Sao_Paulo
====================================================== */
(function initCountdown(){
  // Data-alvo em fuso de São Paulo
  const target = new Date('2026-07-25T09:30:00-03:00').getTime();

  const elDias  = document.getElementById('cd-dias');
  const elHoras = document.getElementById('cd-horas');
  const elMin   = document.getElementById('cd-min');
  const elSeg   = document.getElementById('cd-seg');

  const pad = (n)=> String(n).padStart(2,'0');

  function tick(){
    const now = Date.now();
    let delta = Math.max(target - now, 0);

    const dias  = Math.floor(delta / (1000*60*60*24));
    delta -= dias * (1000*60*60*24);
    const horas = Math.floor(delta / (1000*60*60));
    delta -= horas * (1000*60*60);
    const min   = Math.floor(delta / (1000*60));
    delta -= min * (1000*60);
    const seg   = Math.floor(delta / 1000);

    if (elDias)  elDias.textContent  = dias;
    if (elHoras) elHoras.textContent = pad(horas);
    if (elMin)   elMin.textContent   = pad(min);
    if (elSeg)   elSeg.textContent   = pad(seg);
  }

  tick();
  setInterval(tick, 1000);
})();

/* ======================================================
   CARROSSEL – Lista de Presentes
====================================================== */
(function giftsCarousel(){
  const track = document.getElementById('presentesTrack');
  if (!track) return;
  const prev = document.querySelector('#presentes .scroll-btn.prev');
  const next = document.querySelector('#presentes .scroll-btn.next');

  const step = 320; // px por clique
  prev?.addEventListener('click', ()=> track.scrollBy({left: -step, behavior:'smooth'}));
  next?.addEventListener('click', ()=> track.scrollBy({left:  step, behavior:'smooth'}));
})();

/* ======================================================
   RSVP – Verificação + Confirmação (GAS)
====================================================== */

// Elementos
const nomeInput        = document.getElementById('nomeInput');
const checkNomeBtn     = document.getElementById('checkNomeBtn');
const rsvpMessage      = document.getElementById('rsvp-message');
const confirmationArea = document.getElementById('rsvp-confirmation-area');
const btnSim           = document.getElementById('btnSim');
const btnNao           = document.getElementById('btnNao');

// Garante estado inicial
if (confirmationArea) confirmationArea.style.display = 'none';

// Bindings seguros
document.addEventListener('DOMContentLoaded', () => {
  if (checkNomeBtn) {
    checkNomeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const nome = (nomeInput?.value || '').trim();
      if (!nome){
        rsvpMessage.textContent = 'Por favor, digite seu nome completo.';
        rsvpMessage.className = 'rsvp-message error';
        return;
      }
      processarRSVP('Verificar');
    });
  }

  btnSim?.addEventListener('click', (e) => { e.preventDefault(); processarRSVP('Confirmado'); });
  btnNao?.addEventListener('click', (e) => { e.preventDefault(); processarRSVP('Recusado'); });

  nomeInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter'){ e.preventDefault(); checkNomeBtn?.click(); }
  });
});

async function processarRSVP(resposta) {
  try {
    // UI "carregando"
    if (rsvpMessage){
      rsvpMessage.textContent = 'Processando sua resposta...';
      rsvpMessage.className = 'rsvp-message loading';
    }
    checkNomeBtn?.setAttribute('disabled','');
    btnSim?.setAttribute('disabled','');
    btnNao?.setAttribute('disabled','');

    const body = { nome: (nomeInput?.value || '').trim(), resposta };
    const resp = await fetch(WEBHOOK_URL_GAS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    // Alguns Apps Script retornam texto/HTML mesmo gravando corretamente
    const ct = resp.headers.get('content-type') || '';
    let data = {};
    if (ct.includes('application/json')) {
      data = await resp.json();
    } else {
      await resp.text();
      data = { status: 'sucesso', message: 'OK' };
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    tratarRespostaGAS(data, resposta);
  } catch (err) {
    // Falha de rede/CORS mas geralmente o GAS gravou — mostramos sucesso para não travar o usuário.
    rsvpMessage.textContent = 'Recebemos sua resposta. Se não aparecer, atualize a página.';
    rsvpMessage.className = 'rsvp-message success';
    confirmationArea.style.display = 'block';
  } finally {
    checkNomeBtn?.removeAttribute('disabled');
    btnSim?.removeAttribute('disabled');
    btnNao?.removeAttribute('disabled');
  }
}

function tratarRespostaGAS(data, resposta){
  if (!data || !data.status){
    rsvpMessage.textContent = 'Recebemos sua resposta.';
    rsvpMessage.className = 'rsvp-message success';
    confirmationArea.style.display = 'block';
    return;
  }

  if (data.status === 'nao_encontrado'){
    rsvpMessage.textContent = 'Nome não encontrado. Verifique a ortografia ou fale conosco.';
    rsvpMessage.className   = 'rsvp-message error';
    confirmationArea.style.display = 'none';
    return;
  }

  if (data.status === 'bloqueado'){
    rsvpMessage.textContent = data.message || 'Sua resposta já foi registrada.';
    rsvpMessage.className   = 'rsvp-message info';
    confirmationArea.style.display = 'block';
    return;
  }

  if (data.status === 'nome_encontrado'){
    rsvpMessage.textContent = 'Nome verificado. Confirme sua presença:';
    rsvpMessage.className   = 'rsvp-message info';
    confirmationArea.style.display = 'block';
    return;
  }

  if (data.status === 'sucesso'){
    if (resposta === 'Confirmado'){
      rsvpMessage.textContent = 'Recebemos sua confirmação! 💛';
      rsvpMessage.className   = 'rsvp-message success';
    } else if (resposta === 'Recusado'){
      rsvpMessage.textContent = 'Tudo certo, registramos que você não poderá ir.';
      rsvpMessage.className   = 'rsvp-message info';
    } else {
      rsvpMessage.textContent = 'Nome verificado. Confirme sua presença:';
      rsvpMessage.className   = 'rsvp-message info';
    }
    confirmationArea.style.display = 'block';
    return;
  }

  // fallback
  rsvpMessage.textContent = 'Recebemos sua resposta. Se não aparecer, atualize a página.';
  rsvpMessage.className = 'rsvp-message success';
  confirmationArea.style.display = 'block';
}

/* ======================================================
   Navegação suave (opcional)
====================================================== */
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', (e)=>{
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({behavior:'smooth', block:'start'});
  });
});
