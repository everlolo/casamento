// ================== CONFIG ==================
const WEBHOOK_URL_GAS = '/api/rsvp'; // proxy da Vercel para o Apps Script

// ================== CONTADOR ==================
const diasEl = document.getElementById('dias');
const horasEl = document.getElementById('horas');
const minutosEl = document.getElementById('minutos');
const segundosEl = document.getElementById('segundos');
const dataFinal = new Date('December 28, 2025 18:00:00').getTime();

function countdown() {
  const agora = new Date().getTime();
  const distancia = dataFinal - agora;

  const dias = Math.floor(distancia / (1000 * 60 * 60 * 24));
  const horas = Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60));
  const segundos = Math.floor((distancia % (1000 * 60)) / 1000);

  if (diasEl)    diasEl.innerHTML    = dias    < 10 ? '0' + dias    : dias;
  if (horasEl)   horasEl.innerHTML   = horas   < 10 ? '0' + horas   : horas;
  if (minutosEl) minutosEl.innerHTML = minutos < 10 ? '0' + minutos : minutos;
  if (segundosEl)segundosEl.innerHTML= segundos< 10 ? '0' + segundos: segundos;

  if (distancia < 0) {
      clearInterval(x);
      const c = document.getElementById("contador");
      if (c) c.innerHTML = "O GRANDE DIA CHEGOU!";
  }
}
const x = setInterval(countdown, 1000);

// ================== ELEMENTOS RSVP ==================
const checkNomeBtn = document.getElementById('checkNomeBtn');
const nomeInput = document.getElementById('nomeInput');
const rsvpMessage = document.getElementById('rsvp-message');
const confirmationArea = document.getElementById('rsvp-confirmation-area');
const convidadoNomeEl = document.getElementById('convidado-nome');
const btnSim = document.getElementById('btnSim');
const btnNao = document.getElementById('btnNao');

if (confirmationArea) confirmationArea.style.display = 'none';

// ================== HELPERS VISUAIS ==================
function launchConfetti(pieces = 90, durationMs = 1800){
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

function setAriaLive(msg){
  const live = document.getElementById("aria-live");
  if (live) live.textContent = msg;
}

function detectarOrigem(){
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /iphone|android|ipad|ipod/.test(ua);
  return isMobile ? 'Site - Mobile' : 'Site - Desktop';
}

// ================== LÓGICA DE CHAMADA ==================
async function processarRSVP(resposta) {
  const nome = (nomeInput?.value || '').trim();
  if (!rsvpMessage) return;

  rsvpMessage.textContent = '⏳ Processando sua resposta...';
  rsvpMessage.className = 'rsvp-message loading';
  if (checkNomeBtn) checkNomeBtn.disabled = true;
  if (btnSim) btnSim.disabled = true;
  if (btnNao) btnNao.disabled = true;

  try {
    const response = await fetch(WEBHOOK_URL_GAS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome,
        resposta,
        origem: detectarOrigem()
      })
    });

    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { status: 'texto', message: raw }; }

    if (!response.ok) {
      throw new Error(data && data.message ? data.message : `HTTP ${response.status}`);
    }

    // === Controle total via resposta do GAS ===
    if (data.status === 'nao_encontrado') {
      rsvpMessage.innerHTML = '🔎 Nome não encontrado. Verifique a ortografia ou contate os noivos.';
      rsvpMessage.className = 'rsvp-message error';
      if (nomeInput) nomeInput.disabled = false;
      if (checkNomeBtn) { checkNomeBtn.disabled = false; checkNomeBtn.style.display = ''; }
      if (confirmationArea) confirmationArea.style.display = 'none';
      setAriaLive('Nome não encontrado.');
      return;
    }

    if (data.status === 'nome_encontrado') {
      // Só agora mostramos a área de confirmação
      if (rsvpMessage){
        rsvpMessage.textContent = 'Nome verificado. Por favor, confirme sua presença:';
        rsvpMessage.className = 'rsvp-message info';
      }
      if (confirmationArea) confirmationArea.style.display = 'block';
      if (checkNomeBtn) checkNomeBtn.style.display = 'none';
      if (nomeInput) nomeInput.disabled = true;

      if (btnSim) { btnSim.disabled = false; btnSim.onclick = () => processarRSVP('Confirmado'); }
      if (btnNao) { btnNao.disabled = false; btnNao.onclick = () => processarRSVP('Recusado'); }
      setAriaLive('Nome verificado. Confirme sua presença.');
      return;
    }

    if (data.status === 'bloqueado') {
      rsvpMessage.innerHTML = `ℹ️ ${data.message || 'Resposta já registrada.'}`;
      rsvpMessage.className = 'rsvp-message info';
      if (confirmationArea) confirmationArea.style.display = 'block';
      setAriaLive('Resposta já registrada anteriormente.');
      return;
    }

    if (data.status === 'sucesso') {
      const confirmou = (resposta === 'Confirmado');
      rsvpMessage.innerHTML = confirmou
        ? '🎉 <span class="heart-pulse">Presença confirmada!</span> Que alegria ter você(s) lá!'
        : '💌 Sua resposta foi registrada. Lamentamos sua ausência.';
      rsvpMessage.className = 'rsvp-message success';

      if (confirmationArea) {
        confirmationArea.innerHTML = `<p class="rsvp-boas-vindas" style="font-size:1.5rem;margin:.5rem 0 0">
          ${confirmou ? 'Nos vemos no grande dia! ✨' : 'Obrigado por responder com antecedência 🙏'}
        </p>`;
      }

      setAriaLive(confirmou ? 'Presença confirmada com sucesso.' : 'Ausência registrada com sucesso.');
      if (confirmou) launchConfetti(100, 2000);
      rsvpMessage?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // fallback quando o servidor mandar texto/HTML
    rsvpMessage.textContent = 'Recebemos sua resposta.';
    rsvpMessage.className = 'rsvp-message info';

  } catch (error) {
    rsvpMessage.textContent = 'Erro de conexão ou servidor. Tente novamente.';
    rsvpMessage.className = 'rsvp-message error';
    if (checkNomeBtn) checkNomeBtn.disabled = false;

  } finally {
    if (btnSim) btnSim.disabled = false;
    if (btnNao) btnNao.disabled = false;
  }
}

// botão “verificar”
if (checkNomeBtn) {
  checkNomeBtn.addEventListener('click', async () => {
    const nome = (nomeInput?.value || '').trim();
    if (!nome) {
      if (rsvpMessage){
        rsvpMessage.textContent = 'Por favor, digite seu nome.';
        rsvpMessage.className = 'rsvp-message error';
      }
      return;
    }
    if (convidadoNomeEl) convidadoNomeEl.textContent = nome;

    // Espera a resposta do servidor (não escreve mensagens aqui)
    await processarRSVP('Verificar');
  });
}
