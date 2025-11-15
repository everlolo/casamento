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
/*
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
*/

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




/************************************************
 * RSVP POR PIN – JSONP (sem CORS)
 ************************************************/

// 1) COLOQUE AQUI a URL do SEU WebApp (termina em /exec)
const URL_WEBAPP = "https://script.google.com/macros/s/AKfycbzktn7dyPIvfIo2JskZ4YH55mOS6q1VX-88QSSZJNi9lp_2M67jrQc86sXCDzDjI20PRg/exec";

// 2) Pega os elementos da área de RSVP
const pinInput        = document.getElementById("pinInput");
const buscarBtn       = document.getElementById("buscarPinBtn");
const salvarBtn       = document.getElementById("btnSalvarRsvp");
const mensagem        = document.getElementById("pin-message");
const listaArea       = document.getElementById("lista-membros");
const membrosContainer = document.getElementById("membros-container");
const recusarBtn       = document.getElementById("btnRecusarTodos");


let membrosEncontrados = [];

/**
 * Helper para chamar o Apps Script via JSONP
 * params: objeto { acao: 'buscar', pin: '1234', ... }
 */
function chamarJsonp(params) {
  return new Promise((resolve, reject) => {
    const callbackName = "jsonp_cb_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    params.callback = callbackName;

    const qs = new URLSearchParams(params).toString();

    const script = document.createElement("script");
    script.src = `${URL_WEBAPP}?${qs}`;

    // callback chamado pelo Apps Script
    window[callbackName] = (data) => {
      delete window[callbackName];
      script.remove();
      resolve(data);
    };

    script.onerror = () => {
      delete window[callbackName];
      script.remove();
      reject(new Error("Falha na requisição JSONP"));
    };

    document.body.appendChild(script);
  });
}

// === BUSCAR FAMÍLIA PELO PIN ===
if (buscarBtn) {
  buscarBtn.addEventListener("click", async () => {
    const pin = (pinInput.value || "").trim();

    mensagem.textContent = "";
    listaArea.style.display = "none";
    membrosContainer.innerHTML = "";

    if (pin.length !== 4) {
      mensagem.textContent = "Digite um PIN válido (4 dígitos).";
      return;
    }

    mensagem.textContent = "Buscando...";

    try {
      const data = await chamarJsonp({ acao: "buscar", pin });

      if (!data.ok) {
        mensagem.textContent = data.error || "PIN não encontrado.";
        return;
      }

      membrosEncontrados = data.membros || [];

      if (!membrosEncontrados.length) {
        mensagem.textContent = "Nenhum convidado vinculado a este PIN.";
        return;
      }

      // Monta a lista de checkboxes
      listaArea.style.display = "block";
      mensagem.textContent = "";

      membrosContainer.innerHTML = "";

      membrosEncontrados.forEach((m) => {
        const div = document.createElement("div");
        div.className = "membro-item" + (m.rsvp === "Confirmado" ? " confirmado" : "");
        div.innerHTML = `
          <label>
            <input type="checkbox"
              class="chk-membro"
              data-linha="${m.linha}"
              ${m.rsvp === "Confirmado" ? "checked" : ""}>
            ${m.nome}
          </label>
        `;
        membrosContainer.appendChild(div);
      });

       

    } catch (err) {
      console.error("Erro na busca por PIN:", err);
      mensagem.textContent = "Erro ao falar com o servidor. Tente novamente.";
    }
  });
}

// === SALVAR CONFIRMAÇÕES ===
if (salvarBtn) {
  salvarBtn.addEventListener("click", async () => {
    const checkboxes = document.querySelectorAll(".chk-membro");

    if (!checkboxes.length) {
      mensagem.textContent = "Busque primeiro o PIN da sua família.";
      return;
    }

    const atualizacoes = [];

    checkboxes.forEach((chk) => {
      const linha = Number(chk.dataset.linha);
      const status = chk.checked ? "Confirmado" : "Recusado";
      atualizacoes.push({ linha, status });
    });

    mensagem.textContent = "Salvando...";

    try {
      const data = await chamarJsonp({
        acao: "salvar",
        atualizacoes: JSON.stringify(atualizacoes)
      });

      if (data.ok) {
        const temConfirmado = atualizacoes.some(a => a.status === "Confirmado");

        mensagem.innerHTML = `
          Confirmação salva com sucesso! 🎉
          <span class="rsvp-hotel-tip">
            Caso precise de hospedagem, os hotéis Primma Hotel e B&amp;S
            oferecerão condições especiais para os convidados do casamento
            de Caroline e Everton. Basta informar que a reserva é para o
            casamento.
          </span>
        `;

        if (temConfirmado) {
          soltarConfeteRsvp();
        }
      } else {
        mensagem.textContent = data.error || "Erro ao salvar.";
      }
    } catch (err) {
      console.error("Erro ao salvar RSVP:", err);
      mensagem.textContent = "Erro ao falar com o servidor. Tente novamente.";
    }
  });
}

/*confete*/

function soltarConfeteRsvp() {
  const container = document.getElementById("confetti-container");
  if (!container) return;

  const cores = ["#2f8f58", "#ff8a3d", "#e76b83", "#f5c045", "#ffffff"];
  const quantidade = 120;

  for (let i = 0; i < quantidade; i++) {
    const pedaco = document.createElement("div");
    pedaco.className = "confetti";
    pedaco.style.left = Math.random() * 100 + "vw";
    pedaco.style.backgroundColor = cores[Math.floor(Math.random() * cores.length)];
    pedaco.style.animationDuration = 2.5 + Math.random() * 1.5 + "s";
    container.appendChild(pedaco);
    setTimeout(() => pedaco.remove(), 4000);
  }
}

/*não poderemos comparecer*/

if (recusarBtn) {
  recusarBtn.addEventListener("click", async () => {
    const checkboxes = document.querySelectorAll(".chk-membro");

    if (!checkboxes.length) {
      mensagem.textContent = "Busque primeiro o PIN da sua família.";
      return;
    }

    const atualizacoes = [];

    checkboxes.forEach((chk) => {
      const linha = Number(chk.dataset.linha);
      atualizacoes.push({ linha, status: "Recusado" });
      chk.checked = false;
      const item = chk.closest(".membro-item");
      if (item) item.classList.remove("confirmado");
    });

    mensagem.textContent = "Registrando ausência...";

    try {
      const data = await chamarJsonp({
        acao: "salvar",
        atualizacoes: JSON.stringify(atualizacoes)
      });

      if (data.ok) {
        mensagem.textContent =
          "Registro realizado. Sentiremos sua falta, mas agradecemos por avisar! ❤️";
      } else {
        mensagem.textContent = data.error || "Erro ao salvar.";
      }
    } catch (err) {
      console.error("Erro ao registrar ausência:", err);
      mensagem.textContent = "Erro ao falar com o servidor. Tente novamente.";
    }
  });
}

/* 1) fora do click, uma vez só:*/
membrosContainer.addEventListener("change", (e) => {
  if (!e.target.classList.contains("chk-membro")) return;
  const item = e.target.closest(".membro-item");
  if (!item) return;
  if (e.target.checked) {
    item.classList.add("confirmado");
  } else {
    item.classList.remove("confirmado");
  }
});

/* ============================================================
   LISTA DE PRESENTES (DINÂMICA + PIN DO CONVIDADO)
   ============================================================ */

const presentesContainer = document.getElementById("carrossel-presentes");
const giftCodeInput      = document.getElementById("gift-code");
const giftPinInput       = document.getElementById("gift-pin");
const giftMsg            = document.getElementById("gift-message");
const giftBtn            = document.getElementById("gift-submit");

// Carrega presentes ao abrir a página
if (presentesContainer) {
  carregarPresentes();
}

/**
 * Busca no Apps Script a lista de presentes disponíveis
 * (apenas os que ainda não têm PIN de comprador na coluna K)
 */
async function carregarPresentes() {
  try {
    presentesContainer.innerHTML = "<p>Carregando presentes...</p>";

    const data = await chamarJsonp(
      { acao: "presentesListar" },
      "callbackPresentesListar"
    );

    if (!data.ok) {
      presentesContainer.innerHTML =
        "<p>Não foi possível carregar a lista de presentes.</p>";
      console.error(data.error);
      return;
    }

    const presentes = data.presentes || [];

    if (!presentes.length) {
      presentesContainer.innerHTML =
        "<p>Todos os presentes já foram escolhidos! 💝</p>";
      return;
    }

    presentesContainer.innerHTML = "";

    presentes.forEach((p) => {
      const card = document.createElement("article");
      card.className = "gift-card";

     // --- SUBSTITUA O BLOCO card.innerHTML EM script (7).js ---

// Lógica para formatar o valor (seja cota ou valor cheio)
let valorHtml = '';
if (p.cota_sim === 'Sim' && p.cota_valor) {
  // É COTA
  const valorCotaNum = parseFloat(String(p.cota_valor).replace(',', '.'));
  const valorCotaFmt = isNaN(valorCotaNum) ? p.cota_valor : valorCotaNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  valorHtml = `<p class="gift-value">Valor da cota: <strong>R$ ${valorCotaFmt}</strong></p>`;
  if (p.cota_desc) {
    valorHtml += `<p class="gift-cota-desc">${p.cota_desc}</p>`;
  }

} else if (p.valor) {
  // É PRESENTE NORMAL
  const valorNumerico = parseFloat(String(p.valor).replace(',', '.'));
  const valorFormatado = isNaN(valorNumerico) ? p.valor : valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  valorHtml = `<p class="gift-value">Valor aproximado: <strong>R$ ${valorFormatado}</strong></p>`;
}

// Lógica para o botão (Muda o texto e o link se for cota)
let botaoHtml = '';
if (p.cota_sim === 'Sim' && p.url) {
  // É COTA -> Botão "Comprar Cota" (usa o link do Mercado Pago da col. H)
  botaoHtml = `<a href="${p.url}" class="btn btn-principal" target="_blank" rel="noopener">Comprar Cota</a>`;
} else if (p.url) {
  // É PRESENTE NORMAL -> Botão "Abrir link"
  botaoHtml = `<a href="${p.url}" class="btn btn-principal" target="_blank" rel="noopener">Abrir link</a>`;
}

// Monta o card
card.innerHTML = `
  <div class="gift-image">
    ${p.foto ? `<img src="${p.foto}" alt="${p.item || "Presente"}" loading="lazy">` : ""}
  </div>
  <div class="gift-content">
    <h3>${p.item || "Presente"}</h3>
    ${valorHtml} 
    <p class="gift-code">
      Código do presente: <strong>${p.codigo}</strong>
    </p>
    <div class="gift-actions">
      ${botaoHtml}
    </div>
  </div>
`;
// --- FIM DA SUBSTITUIÇÃO ---
        <div class="gift-content">
          <h3>${p.item || "Presente"}</h3>
          ${
  p.valor
    ? (() => {
        // Tenta converter o valor para um número, aceitando "," como decimal
        const valorNumerico = parseFloat(String(p.valor).replace(',', '.'));

        if (isNaN(valorNumerico)) {
          // Se não for um número, só troca o texto
          return `<p class="gift-value">Valor aproximado: <strong>R$ ${p.valor}</strong></p>`;
        }

        // Formata o número para o padrão R$ (ex: 799,00 ou 749,90)
        const valorFormatado = valorNumerico.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });

        // Retorna o HTML com o texto novo e o valor formatado
        return `<p class="gift-value">Valor aproximado: <strong>R$ ${valorFormatado}</strong></p>`;
      })()
    : ""
}
          <p class="gift-code">
            Código do presente: <strong>${p.codigo}</strong>
          </p>
          <div class="gift-actions">
            ${
              p.url
                ? `<a href="${p.url}" class="btn btn-light" target="_blank" rel="noopener">Abrir link</a>`
                : ""
            }
          </div>
        </div>
      `;

      presentesContainer.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    presentesContainer.innerHTML =
      "<p>Erro ao carregar a lista de presentes.</p>";
  }
}

/**
 * Quando o convidado informa que JÁ COMPROU o presente
 * – ele digita o código do presente (col. I da Lista Presentes)
 * – e o PIN do convite (col. I da Lista de Convidados)
 */
if (giftBtn) {
  giftBtn.addEventListener("click", async () => {
    const codigo = giftCodeInput.value.trim();
    const pin    = giftPinInput.value.trim();

    giftMsg.textContent = "";

    if (!codigo || !pin) {
      giftMsg.textContent =
        "Preencha o código do presente e o PIN do convite.";
      return;
    }

    giftMsg.textContent = "Enviando...";

    try {
      const data = await chamarJsonp(
        { acao: "presentesComprar", codigo: codigo, pinConvite: pin },
        "callbackPresentesComprar"
      );

      if (!data.ok) {
        giftMsg.textContent = data.error || "Não foi possível registrar a compra.";
        return;
      }

      giftMsg.textContent =
        "Obrigados pelo carinho! Seu presente foi registrado com sucesso. 💝";

      giftCodeInput.value = "";
      giftPinInput.value = "";

      // Recarrega a lista para esconder o presente já escolhido
      carregarPresentes();
    } catch (err) {
      console.error(err);
      giftMsg.textContent = "Erro ao se comunicar com o servidor.";
    }
  });
}







