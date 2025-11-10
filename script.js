// ====================================================================
// --- COLA AQUI A URL DA SUA API DO GOOGLE APPS SCRIPT (GAS) ---
// ====================================================================
// Cole AQUI a URL que você copiou do Google Apps Script (Web app URL)
const WEBHOOK_URL_GAS = '/api/rsvp';

// Variáveis do Contador de Tempo (Mantidas do seu código original)
const diasEl = document.getElementById('dias');
const horasEl = document.getElementById('horas');
const minutosEl = document.getElementById('minutos');
const segundosEl = document.getElementById('segundos');
const dataFinal = new Date('July 25, 2025 09:30:00').getTime();

// Funções do Contador (Mantidas)
function countdown() {
    const agora = new Date().getTime();
    const distancia = dataFinal - agora;

    const dias = Math.floor(distancia / (1000 * 60 * 60 * 24));
    const horas = Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((distancia % (1000 * 60)) / 1000);

    diasEl.innerHTML = dias < 10 ? '0' + dias : dias;
    horasEl.innerHTML = horas < 10 ? '0' + horas : horas;
    minutosEl.innerHTML = minutos < 10 ? '0' + minutos : minutos;
    segundosEl.innerHTML = segundos < 10 ? '0' + segundos : segundos;

    if (distancia < 0) {
        clearInterval(x);
        document.getElementById("contador").innerHTML = "O GRANDE DIA CHEGOU!";
    }
}

// Inicia o Contador
const x = setInterval(countdown, 1000);

// ==============================================
// --- LÓGICA DO RSVP (AGORA CONECTADO AO GAS) ---
// ==============================================

// Seleciona os elementos do HTML do RSVP
const checkNomeBtn = document.getElementById('checkNomeBtn');
const nomeInput = document.getElementById('nomeInput');
const rsvpMessage = document.getElementById('rsvp-message');
const confirmationArea = document.getElementById('rsvp-confirmation-area');
const convidadoNomeEl = document.getElementById('convidado-nome');
const btnSim = document.getElementById('btnSim');
const btnNao = document.getElementById('btnNao');

// Esconde a área de confirmação no início
confirmationArea.style.display = 'none';

// Função que registra a resposta no GAS (FAZ VERIFICAÇÃO E REGISTRO)
async function processarRSVP(resposta) {
    const nome = nomeInput.value.trim();
    
    // 1. Mostrar status de "Carregando"
    rsvpMessage.textContent = 'Processando sua resposta...';
    rsvpMessage.className = 'rsvp-message loading';
    checkNomeBtn.disabled = true;
    btnSim.disabled = true;
    btnNao.disabled = true;

    try {
        const response = await fetch(WEBHOOK_URL_GAS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nome: nome,
                resposta: resposta // Será "Confirmado" ou "Recusado"
            })
        });
        
        const data = await response.json();

        // LÓGICA DE RESPOSTA DO GAS
        if (data.status === 'nao_encontrado') {
            rsvpMessage.textContent = 'Nome não encontrado. Contate os noivos.';
            rsvpMessage.className = 'rsvp-message error';
            nomeInput.disabled = false;
            checkNomeBtn.disabled = false;
            confirmationArea.style.display = 'none';
        
        } else if (data.status === 'bloqueado') {
            rsvpMessage.textContent = data.message; // Ex: "Sua presença já está confirmada!"
            rsvpMessage.className = 'rsvp-message error';
            confirmationArea.style.display = 'block';
            
        } else if (data.status === 'sucesso') {
            // SUCESSO!
            rsvpMessage.textContent = `Registro bem-sucedido!`;
            rsvpMessage.className = 'rsvp-message success';
            // Atualiza a área de confirmação com a mensagem final
            confirmationArea.innerHTML = `<p class="rsvp-boas-vindas" style="font-size: 1.5rem;">${resposta === 'Confirmado' ? 'Que alegria ter você(s) lá!' : 'Lamentamos sua ausência. :('}</p>`;
        }

    } catch (error) {
        rsvpMessage.textContent = 'Erro de conexão ou servidor. Tente novamente.';
        rsvpMessage.className = 'rsvp-message error';
        checkNomeBtn.disabled = false;
    }
}

// Lógica de "Verificar Nome" (AGORA APENAS PREPARA A INTERFACE)
checkNomeBtn.addEventListener('click', () => {
    const nome = nomeInput.value.trim();
    if (!nome) {
        rsvpMessage.textContent = 'Por favor, digite seu nome.';
        rsvpMessage.className = 'rsvp-message error';
        return;
    }
    
    // Mostra o nome na tela e exibe os botões SIM/NÃO
    convidadoNomeEl.textContent = nome;
    
    // Chamamos a função de processo com um status temporário para forçar a verificação inicial.
    // O GAS irá verificar a lista e enviar a mensagem de 'bloqueado' se já estiver na lista.
    processarRSVP('Verificar')
    
    // O próximo passo será fazer a chamada real do processo com SIM ou NÃO
    rsvpMessage.textContent = 'Nome verificado. Por favor, confirme sua presença:';
    rsvpMessage.className = 'rsvp-message info';
    confirmationArea.style.display = 'block';
    checkNomeBtn.style.display = 'none';
    nomeInput.disabled = true;

    // Configura os botões SIM/NÃO
    btnSim.onclick = () => processarRSVP('Confirmado');
    btnNao.onclick = () => processarRSVP('Recusado');
    
    // Reabilita os botões para a próxima ação
    btnSim.disabled = false;
    btnNao.disabled = false;
});


