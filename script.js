/* ==================== CONFIG ==================== */
// Se estiver usando Google Apps Script diretamente:
const GAS_URL = 'https://script.google.com/macros/s/AKfycbygYup61ahqKlAPN5Nr0_ldLItzN3MwFUU1GQl0-b6K-6J5-MDUr_bbCWz33NlAMgmvoA/exec';
// Se preferir via API route (Vercel) para nunca ter CORS, troque por '/api/rsvp'

/* ==================== CONTADOR ==================== */
const dataEvento = new Date('2026-07-25T09:30:00-04:00').getTime();
const elDias = document.getElementById('dias');
const elHoras = document.getElementById('horas');
const elMin = document.getElementById('minutos');
const elSeg = document.getElementById('segundos');

function tick() {
  const agora = Date.now();
  const diff = Math.max(0, dataEvento - agora);

  const d = Math.floor(diff / (1000*60*60*24));
  const h = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
  const m = Math.floor((diff % (1000*60*60)) / (1000*60));
  const s = Math.floor((diff % (1000*60)) / 1000);

  elDias.textContent = String(d).padStart(2,'0');
  elHoras.textContent = String(h).padStart(2,'0');
  elMin.textContent = String(m).padStart(2,'0');
  elSeg.textContent = String(s).padStart(2,'0');
}
tick();
setInterval(tick, 1000);

/* ==================== CARROSSEL ==================== */
const pista = document.getElementById('pista');
document.querySelector('.car-seta.esq')?.addEventListener('click', () => {
  pista.scrollBy({left: -pista.clientWidth*0.9, behavior:'smooth'});
});
document.querySelector('.car-seta.dir')?.addEventListener('click', () => {
  pista.scrollBy({left:  pista.clientWidth*0.9, behavior:'smooth'});
});

/* ==================== RSVP ==================== */
const nomeInput = document.getElementById('nomeInput');
const checkNomeBtn = document.getElementById('checkNomeBtn');
const rsvpMessage = document.getElementById('rsvp-message');
const areaConfirm = document.getElementById('rsvp-confirmation-area');
const convidadoNomeEl = document.getElementById('convidado-nome');
const btnSim = document.getElementById('btnSim');
const btnNao = document.getElementById('btnNao');

function info(text){ rsvpMessage.textContent = text; rsvpMessage.className = 'msg info'; }
function ok(text){ rsvpMessage.textContent = text; rsvpMessage.className = 'msg success'; }
function err(text){ rsvpMessage.textContent = text; rsvpMessage.className = 'msg error'; }

checkNomeBtn.addEventListener('click', async () => {
  const nome = nomeInput.value.trim();
  if (!nome) { err('Por favor, digite seu nome.'); return; }

  // UI
  convidadoNomeEl.textContent = nome;
  areaConfirm.hidden = false;
  ok('Nome verificado. Confirme sua presença abaixo.');
});

async function enviarRSVP(resposta){
  const nome = nomeInput.value.trim();
  if (!nome) { err('Digite seu nome.'); return; }

  // trava UI
  btnSim.disabled = btnNao.disabled = checkNomeBtn.disabled = true;
  info('Processando sua resposta...');

  try{
    const resp = await fetch(GAS_URL, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ nome, resposta })
    });

    // Se o GAS responder 200 mas sem JSON válido, evita “nada acontece”
    if (!resp.ok) throw new Error('Falha HTTP ' + resp.status);
    const data = await resp.json().catch(() => ({}));

    // Normaliza campos esperados
    const status = (data.status || '').toLowerCase();

    if (status === 'nao_encontrado'){
      areaConfirm.hidden = true;
      err('Nome não encontrado na lista. Fale com os noivos 😊');
    } else if (status === 'bloqueado'){
      ok(data.message || 'Sua resposta já estava registrada.');
    } else if (status === 'sucesso'){
      ok(resposta === 'Confirmado'
        ? 'Oba! Presença confirmada 🎉'
        : 'Lamentamos sua ausência. Obrigado por avisar 💛'
      );
    } else {
      // Se veio algo inesperado, mas o GAS atualiza a planilha, avisa o usuário
      ok('Recebemos sua resposta. Se não aparecer na planilha, atualize a página.');
    }

  }catch(e){
    // Mesmo se o GAS gravar e o CORS atrapalhar, não deixa “sem reação”
    err('Erro de conexão. Tente novamente em alguns segundos.');
  }finally{
    btnSim.disabled = btnNao.disabled = checkNomeBtn.disabled = false;
  }
}

btnSim.addEventListener('click', () => enviarRSVP('Confirmado'));
btnNao.addEventListener('click', () => enviarRSVP('Recusado'));
