/* ================== ENDPOINT ==================
   1) Se você usa proxy da Vercel, mantenha '/api/rsvp'.
   2) Se preferir chamar direto o GAS, coloque a URL do GAS em GAS_FALLBACK_URL.
*/
const WEBHOOK_URL_PROXY = '/api/rsvp';
const GAS_FALLBACK_URL  = ''; // opcional: cole aqui a URL do seu Web App do GAS

async function postRSVP(payload){
  // tenta proxy primeiro; se falhar, tenta GAS fallback (se houver)
  try {
    const r = await fetch(WEBHOOK_URL_PROXY, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error('proxy');
    return await r.json();
  } catch {
    if (!GAS_FALLBACK_URL) throw new Error('Falha no proxy e sem fallback configurado.');
    const r = await fetch(GAS_FALLBACK_URL, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (!r.ok) throw new Error('fallback');
    return await r.json();
  }
}

/* ================== CONTADOR ================== */
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

  rsvpMessage.textContent = '⏳ Processando sua resposta...';
  rsvpMessage.className = 'rsvp-message loading';
  checkNomeBtn && (checkNomeBtn.disabled = true);
  btnSim && (btnSim.disabled = true);
  btnNao && (btnNao.disabled = true);

  try {
    const data = await postRSVP({ nome, resposta, origem: detectarOrigem() });

    if (data.status === 'nao_encontrado') {
      rsvpMessage.innerHTML = '🔎 Nome não encontrado. Verifique a ortografia ou contate os noivos.';
      rsvpMessage.className = 'rsvp-message error';
      nomeInput && (nomeInput.disabled = false);
      checkNomeBtn && (checkNomeBtn.disabled = false, checkNomeBtn.style.display = '');
      confirmationArea && (confirmationArea.style.display = 'none');
      live('Nome não encontrado.');
      return;
    }

    if (data.status === 'nome_encontrado') {
      rsvpMessage.textContent = 'Nome verificado. Por favor, confirme sua presença:';
      rsvpMessage.className = 'rsvp-message info';
      confirmationArea && (confirmationArea.style.display = 'block');
      checkNomeBtn && (checkNomeBtn.style.display = 'none');
      nomeInput && (nomeInput.disabled = true);

      btnSim && (btnSim.disabled = false, btnSim.onclick = () => processarRSVP('Confirmado'));
      btnNao && (btnNao.disabled = false, btnNao.onclick = () => processarRSVP('Recusado'));

      live('Nome verificado. Confirme sua presença.');
      return;
    }

    if (data.status === 'bloqueado') {
      rsvpMessage.innerHTML = `ℹ️ ${data.message || 'Resposta já registrada.'}`;
      rsvpMessage.className = 'rsvp-message info';
      confirmationArea && (confirmationArea.style.display = 'block');
      live('Resposta já registrada anteriormente.');
      return;
    }

    if (data.status === 'sucesso') {
      const confirmou = (resposta === 'Confirmado');
      rsvpMessage.innerHTML = confirmou
        ? '🎉 <strong>Presença confirmada!</strong> Que alegria ter você conosco! 💚'
        : '💌 <strong>Resposta registrada.</strong> Agradecemos o carinho e desejamos o melhor!';

      rsvpMessage.className = 'rsvp-message success';
      confirmationArea && (confirmationArea.innerHTML =
        `<p class="rsvp-boas-vindas" style="font-size:1.3rem;margin:.5rem 0 0">
           ${confirmou ? 'Nos vemos no grande dia! ✨' : 'Obrigado por nos avisar com antecedência 🙏'}
         </p>`);

      live(confirmou ? 'Presença confirmada.' : 'Ausência registrada.');
      if (confirmou) confetti(140, 2400);
      rsvpMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // fallback
    rsvpMessage.textContent = 'Recebemos sua resposta.';
    rsvpMessage.className = 'rsvp-message info';

  } catch (e) {
    rsvpMessage.textContent = 'Erro de conexão ou servidor. Tente novamente.';
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
    await processarRSVP('Verificar'); // espera retorno do servidor
  });
}
