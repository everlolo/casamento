/* ========= Config ========= */
// >>> Se trocar a planilha/implantação do GAS, atualize aqui:
const GAS_URL = 'https://script.google.com/macros/s/AKfycbygYup61ahqKlAPN5Nr0_ldLItzN3MwFUU1GQl0-b6K-6J5-MDUr_bbCWz33NlAMgmvoA/exec';

// Data / hora do casamento (Brasília)
const EVENTO = new Date('2026-07-25T09:30:00-03:00');

/* ========= Contador ========= */
const elDias  = document.getElementById('cd-dias');
const elHoras = document.getElementById('cd-horas');
const elMin   = document.getElementById('cd-min');

function updateCountdown() {
  const agora = new Date();
  let diff = EVENTO.getTime() - agora.getTime();

  if (diff < 0) diff = 0;

  const dias  = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins  = Math.floor((diff / (1000 * 60)) % 60);

  animateFlip(elDias,  dias);
  animateFlip(elHoras, horas);
  animateFlip(elMin,   mins);
}

function animateFlip(el, novo) {
  const atual = el.textContent.trim();
  const val = String(novo);
  if (atual === val) return;
  el.classList.add('flip');
  el.textContent = val;
  setTimeout(() => el.classList.remove('flip'), 180);
}

setInterval(updateCountdown, 1000);
updateCountdown();

/* ========= Carrossel ========= */
const track = document.getElementById('carTrack');
const dots  = document.getElementById('carDots');

function buildDots() {
  const cards = track.querySelectorAll('.gift');
  dots.innerHTML = '';
  cards.forEach((_, i) => {
    const d = document.createElement('span');
    d.className = 'dot' + (i === 0 ? ' active' : '');
    dots.appendChild(d);
  });
}
buildDots();

function updateDots() {
  const cards = [...track.querySelectorAll('.gift')];
  const scrollLeft = track.scrollLeft;
  const width = track.clientWidth;
  const idx = Math.round(scrollLeft / (track.scrollWidth / cards.length));
  dots.querySelectorAll('.dot').forEach((d, i) => {
    d.classList.toggle('active', i === idx);
  });
}
track.addEventListener('scroll', debounce(updateDots, 100));

document.querySelector('.car-arrow.left').addEventListener('click', () => {
  track.scrollBy({ left: -track.clientWidth * 0.9, behavior: 'smooth' });
});
document.querySelector('.car-arrow.right').addEventListener('click', () => {
  track.scrollBy({ left:  track.clientWidth * 0.9, behavior: 'smooth' });
});

/* ========= RSVP ========= */
const nomeInput   = document.getElementById('nomeInput');
const btnVerif    = document.getElementById('btnVerificar');
const btnSim      = document.getElementById('btnSim');
const btnNao      = document.getElementById('btnNao');
const msg         = document.getElementById('msg');
const spinner     = document.getElementById('spinner');

btnVerif.addEventListener('click', () => {
  const nome = nomeInput.value.trim();
  if (!nome) {
    setMsg('Por favor, digite seu nome.', 'warn');
    disableActions();
    return;
  }
  setMsg(`Olá, <b>${escapeHTML(nome)}</b> — você poderá comparecer?`);
  enableActions();
});

btnSim.addEventListener('click', debounce(() => enviarRSVP('Confirmado'), 800));
btnNao.addEventListener('click', debounce(() => enviarRSVP('Recusado'), 800));

function enableActions() {
  btnSim.disabled = false;
  btnNao.disabled = false;
}
function disableActions() {
  btnSim.disabled = true;
  btnNao.disabled = true;
}

async function enviarRSVP(resposta) {
  const nome = nomeInput.value.trim();
  if (!nome) return;

  setLoading(true);
  setMsg('', 'clear');

  try {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const resp = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, resposta }),
      signal: controller.signal
    });
    clearTimeout(to);

    // Tenta parsear; em CORS pode dar erro — tratamos abaixo.
    let data = null;
    try { data = await resp.json(); } catch(e){ /* ignora */ }

    if (data && data.status) {
      handleServerStatus(data.status, data.message || '');
    } else {
      // Fallback: registro realizado mas sem JSON (CORS/opaque)
      handleFallback(resposta);
    }
  } catch (err) {
    // Timeout, rede, CORS bloqueado etc.
    handleFallback(resposta);
  } finally {
    setLoading(false);
  }
}

function handleServerStatus(status, message){
  switch(status){
    case 'nao_encontrado':
      setMsg('Não encontramos seu nome na lista. Por favor, fale com a gente 🙏', 'error');
      disableActions();
      break;
    case 'bloqueado':
      setMsg(message || 'Sua posição já está registrada 🙂', 'warn');
      enableActions(); // mantém botões caso queira alterar
      break;
    case 'sucesso':
      finalizeOk();
      break;
    case 'nome_encontrado':
      setMsg('Nome verificado. Agora confirme abaixo:', 'ok');
      enableActions();
      break;
    default:
      setMsg('Algo inesperado ocorreu. Tente novamente.', 'error');
  }
}

function handleFallback(resposta){
  if (resposta === 'Confirmado') finalizeOk(true);
  else setMsg('Recebemos sua resposta. Se não aparecer, atualize a página.', 'warn');
}

function finalizeOk(silent = false){
  setMsg('Oba! Presença confirmada 🎉', 'ok');
  disableActions();
  if (!silent) shootConfetti();
}

/* ========= UI helpers ========= */
function setLoading(on){
  spinner.style.display = on ? 'inline-block' : 'none';
  btnSim.disabled = on; btnNao.disabled = on; btnVerif.disabled = on; nomeInput.disabled = on;
}

function setMsg(text, kind='info'){
  msg.className = 'msg ' + kind;
  msg.innerHTML = text;
}

function debounce(fn, wait){
  let t; return (...args) => {
    clearTimeout(t); t = setTimeout(() => fn(...args), wait);
  };
}

function escapeHTML(s){
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#039;'}[c]));
}

/* ========= Confete (leve) ========= */
function shootConfetti(){
  // efeito leve sem lib externa
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  resize();
  let pieces = Array.from({length: 120}, () => newPiece());

  let raf;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (const p of pieces){
      p.y += p.gravity; p.x += p.wind; p.tilt += p.tiltSpeed;
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.ellipse(p.x, p.y, p.size, p.size/2, p.tilt, 0, 2*Math.PI);
      ctx.fill();
      if (p.y > canvas.height) Object.assign(p, newPiece(true));
    }
    raf = requestAnimationFrame(draw);
  }
  draw();
  setTimeout(() => cancelAnimationFrame(raf), 2500);

  function newPiece(fromTop=false){
    const colors = ['#2f7d4b','#f27d3d','#f5c04d','#e76786','#7c5aa2'];
    return {
      x: Math.random() * canvas.width,
      y: fromTop ? -20 : (Math.random() * -canvas.height/2),
      size: 6 + Math.random()*6,
      color: colors[Math.floor(Math.random()*colors.length)],
      gravity: 2 + Math.random()*2,
      wind: -1 + Math.random()*2,
      tilt: Math.random()*Math.PI,
      tiltSpeed: (Math.random()-.5)*0.2
    };
  }
  function resize(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize, { once:true });
}
