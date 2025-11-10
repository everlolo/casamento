(function() {
    // ==============================================
    // --- VARIÁVEIS DO WEBHOOK (COLE SUAS URLs AQUI) ---
    // ==============================================
    // URL do Webhook 1 (Verificar Nome)
    const WEBHOOK_URL_VERIFICAR = '/api/rsvp/webhook-test/verificar-nome-casamento'; 
    // URL do Webhook 2 (Registrar Sim/Não)
    const WEBHOOK_URL_REGISTRAR = '/api/rsvp/webhook-test/registrar-rsvp-casamento'; 

    
    // ==============================================
    // --- LÓGICA DO CONTADOR REGRESSIVO ---
    // ==============================================
    const dataCasamento = new Date("2026-07-25T09:30:00").getTime();

    const elDias = document.getElementById('dias');
    const elHoras = document.getElementById('horas');
    const elMinutos = document.getElementById('minutos');
    const elSegundos = document.getElementById('segundos');
    const elCountdown = document.getElementById('countdown');

    function formatarTempo(tempo) {
        return tempo < 10 ? `0${tempo}` : tempo;
    }

    const intervalo = setInterval(() => {
        const agora = new Date().getTime();
        const distancia = dataCasamento - agora;

        if (distancia < 0) {
            clearInterval(intervalo);
            elCountdown.innerHTML = "<div class='countdown-finalizado'>É hoje!</div>";
            return;
        }

        const dias = Math.floor(distancia / (1000 * 60 * 60 * 24));
        const horas = Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((distancia % (1000 * 60)) / 1000);

        elDias.innerHTML = formatarTempo(dias);
        elHoras.innerHTML = formatarTempo(horas);
        elMinutos.innerHTML = formatarTempo(minutos);
        elSegundos.innerHTML = formatarTempo(segundos);

    }, 1000);

    
    // ==============================================
    // --- LÓGICA DO RSVP (CONFIRMAÇÃO DE PRESENÇA) ---
    // ==============================================

    // Seleciona os elementos do HTML do RSVP
    const checkNomeBtn = document.getElementById('checkNomeBtn');
    const nomeInput = document.getElementById('nomeInput');
    const rsvpMessage = document.getElementById('rsvp-message');
    const confirmationArea = document.getElementById('rsvp-confirmation-area');
    const convidadoNomeEl = document.getElementById('convidado-nome');
    const btnSim = document.getElementById('btnSim');
    const btnNao = document.getElementById('btnNao');

    // --- FUNÇÃO 2: REGISTRAR RESPOSTA ---
    async function registrarResposta(resposta) {
        const nome = nomeInput.value;
        
        btnSim.disabled = true;
        btnNao.disabled = true;
        rsvpMessage.textContent = 'Registrando sua resposta...';
        rsvpMessage.className = 'rsvp-message loading';

        try {
            const response = await fetch(WEBHOOK_URL_REGISTRAR, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    nome: nome,
                    resposta: resposta // 'Confirmado' ou 'Recusado'
                })
            });
            
            const data = await response.json();

            if (data.status === 'sucesso') {
                // SUCESSO!
                rsvpMessage.textContent = `Obrigado! Sua presença foi registrada como: ${resposta}.`;
                rsvpMessage.className = 'rsvp-message success';
                confirmationArea.innerHTML = `<p class="rsvp-boas-vindas" style="color: ${resposta === 'Confirmado' ? 'var(--cor-verde)' : 'var(--cor-texto)'}; font-size: 1.5rem;">${resposta === 'Confirmado' ? 'Que alegria ter você(s) lá!' : 'Lamentamos sua ausência. :('}</p>`;
            } else {
                // ERRO
                rsvpMessage.textContent = 'Ocorreu um erro ao registrar. Por favor, tente novamente mais tarde.';
                rsvpMessage.className = 'rsvp-message error';
            }

        } catch (error) {
            rsvpMessage.textContent = 'Erro de conexão. Tente novamente.';
            rsvpMessage.className = 'rsvp-message error';
        }
    }

    // --- FUNÇÃO 1: VERIFICAR NOME ---
    checkNomeBtn.addEventListener('click', async () => {
        const nome = nomeInput.value;
        
        if (!nome) {
            rsvpMessage.textContent = 'Por favor, digite seu nome.';
            rsvpMessage.className = 'rsvp-message error';
            return;
        }

        rsvpMessage.textContent = 'Verificando sua lista...';
        rsvpMessage.className = 'rsvp-message loading';
        checkNomeBtn.disabled = true;

        try {
            const response = await fetch(WEBHOOK_URL_VERIFICAR, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nome: nome })
            });
            
            const data = await response.json();

            if (data.status === 'encontrado') {
                // SUCESSO!
                rsvpMessage.textContent = 'Nome encontrado!';
                rsvpMessage.className = 'rsvp-message success';
                convidadoNomeEl.textContent = nome;
                confirmationArea.style.display = 'block';
                checkNomeBtn.style.display = 'none';
                nomeInput.disabled = true;
                
                // Configura os botões SIM/NÃO para ligar a FUNÇÃO 2
                btnSim.addEventListener('click', () => registrarResposta('Confirmado'));
                btnNao.addEventListener('click', () => registrarResposta('Recusado'));
            
            } else {
                // NÃO ENCONTRADO
                rsvpMessage.textContent = 'Nome não encontrado. Verifique se digitou igual ao convite ou entre em contato conosco.';
                rsvpMessage.className = 'rsvp-message error';
                checkNomeBtn.disabled = false;
            }

        } catch (error) {
            rsvpMessage.textContent = 'Ocorreu um erro ao conectar. Tente novamente.';
            rsvpMessage.className = 'rsvp-message error';
            checkNomeBtn.disabled = false;
        }
    });

})();