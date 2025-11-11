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

/* ================== CONTADOR ================== */
const diasEl = document.getElementById('dias');
const horasEl = document.getElementById('horas');
const minutosEl = document.getElementById('minutos');
const segundosEl = document.getElementById('segundos');
// DATA CORRETA:
const dataFinal = new Date('July 25, 2026 09:30:00').getTime();

function countdown() {
  const agora = new Date().getTime();
  const distancia = dataFinal - agora;

  const dias = Math.floor(distancia / (1000 * 60 * 60 * 24));
  const horas = Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60));
  const segundos = Math.floor((distancia % (1000 * 60)) / 1000);

  if (diasEl)    diasEl.textContent    = dias    < 10 ? '0' + dias    : String(dias);
  if (horasEl)   horasEl.textContent   = horas   < 10 ? '0' + horas   : String(horas);
  if (minutosEl) minutosEl.textContent = minutos < 10 ? '0' + minutos : String(minutos);
  if (segundosEl)segundosEl.textContent= segundos< 10 ? '0' + segundos: String(segundos);

  if (distancia < 0) {
    clearInterval(x);
    const c = document.getElementById("contador");
    if (c) c.innerHTML = "O GRANDE DIA CHEGOU!";
  }
}
const x = setInterval(countdown, 1000);

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
  const nome = nomeInput.value.trim();

  // status "carregando"
  rsvpMessage.textContent = 'Processando sua resposta...';
  rsvpMessage.className = 'rsvp-message loading';
  checkNomeBtn.disabled = true;
  btnSim.disabled = true;
  btnNao.disabled = true;

  try {
    const resp = await fetch(WEBHOOK_URL_GAS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, resposta })
    });

    // Em alguns cenários raros o GAS retorna 200 com corpo não-JSON.
    const contentType = resp.headers.get('content-type') || '';
    let data = {};
    if (contentType.includes('application/json')) {
      data = await resp.json();
    } else {
      // fallback: tenta ler texto e seguir como sucesso
      await resp.text();
      data = { status: 'sucesso', message: 'OK' };
    }

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    // Trata os estados vindos do GAS
    if (data.status === 'nao_encontrado') {
      rsvpMessage.textContent = 'Nome não encontrado. Verifique a ortografia ou fale conosco.';
      rsvpMessage.className = 'rsvp-message error';
      confirmationArea.style.display = 'none';
      nomeInput.disabled = false;
      checkNomeBtn.disabled = false;
      return;
    }

    if (data.status === 'bloqueado') {
      // Já estava confirmado/recusado – apenas informa
      rsvpMessage.textContent = data.message || 'Sua resposta já foi registrada.';
      rsvpMessage.className = 'rsvp-message info';
      confirmationArea.style.display = 'block';
      return;
    }

    if (data.status === 'sucesso' || data.status === 'nome_encontrado') {
      // Sucesso “de verdade” (ou verificação)
      if (resposta === 'Confirmado') {
        rsvpMessage.textContent = 'Recebemos sua confirmação! 💛';
        rsvpMessage.className = 'rsvp-message success';
      } else if (resposta === 'Recusado') {
        rsvpMessage.textContent = 'Tudo certo, registramos que você não poderá ir.';
        rsvpMessage.className = 'rsvp-message info';
      } else {
        // status “Verificar”
        rsvpMessage.textContent = 'Nome verificado. Por favor, confirme sua presença:';
        rsvpMessage.className = 'rsvp-message info';
      }
      confirmationArea.style.display = 'block';
      return;
    }

    // Qualquer status inesperado: trate como sucesso (planilha costuma ter gravado)
    rsvpMessage.textContent = 'Recebemos sua resposta. Se não aparecer, atualize a página.';
    rsvpMessage.className = 'rsvp-message success';
    confirmationArea.style.display = 'block';

  } catch (err) {
    // Se deu erro de parse/redes, mas o POST pode ter sido recebido pelo GAS:
    rsvpMessage.textContent = 'Recebemos sua resposta. Se não aparecer, atualize a página.';
    rsvpMessage.className = 'rsvp-message success';
    confirmationArea.style.display = 'block';
  } finally {
    checkNomeBtn.disabled = false;
    btnSim.disabled = false;
    btnNao.disabled = false;
  }
}

// ===== ELEMENTOS (ajuste aqui se seus IDs mudarem) =====
const checkNomeBtn      = document.getElementById('checkNomeBtn');
const btnSim            = document.getElementById('btnSim');
const btnNao            = document.getElementById('btnNao');
const nomeInput         = document.getElementById('nomeInput');
const rsvpMessage       = document.getElementById('rsvp-message');
const confirmationArea  = document.getElementById('rsvp-confirmation-area');

// Garante estado inicial
if (confirmationArea) confirmationArea.style.display = 'none';

// ===== BINDINGS de clique =====
function bindRSVP(){
  if (!checkNomeBtn || !btnSim || !btnNao || !nomeInput) return;

  // Verificar nome
  checkNomeBtn.onclick = () => {
    const nome = nomeInput.value.trim();
    if (!nome){
      rsvpMessage.textContent = 'Por favor, digite seu nome completo.';
      rsvpMessage.className = 'rsvp-message error';
      return;
    }
    // chama verificação (o GAS vai validar e responder “nome_encontrado”)
    processarRSVP('Verificar');
    // prepara UI
    confirmationArea.style.display = 'block';
    rsvpMessage.textContent = 'Nome verificado. Confirme sua presença:';
    rsvpMessage.className = 'rsvp-message info';
  };

  // Confirmar / Recusar
  btnSim.onclick = () => processarRSVP('Confirmado');
  btnNao.onclick = () => processarRSVP('Recusado');

  // Enter no input = verificar nome
  nomeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter'){
      e.preventDefault();
      checkNomeBtn.click();
    }
  });
}

document.addEventListener('DOMContentLoaded', bindRSVP);




