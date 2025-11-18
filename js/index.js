import { db, dbFunctions } from './firebase-init.js';
import { showMessage, gerarProtocolo } from './utils.js';

const { collection, addDoc, serverTimestamp } = dbFunctions;

// Elementos do formulário
const formChamado = document.getElementById('formAberturaChamado');
const mensagemEl = document.getElementById('topMessage');
const btnSubmit = document.getElementById('btnSubmit');
const anexoInput = document.getElementById('anexo');
const anexoUrlInput = document.getElementById('anexoUrl');

// Constantes
const LIMITE_TAMANHO_ANEXO = 750 * 1024; // 750KB
const STATUS_PENDENTE = 'pendente'; // PADRONIZAÇÃO: Usar status em minúsculo
const BTN_TEXT_ENVIANDO = 'Enviando...';
const BTN_TEXT_PADRAO = 'Abrir Chamado';
const COLECAO_CHAMADOS = 'chamados';

/**
 * Converte um arquivo para uma string Base64 (Data URL).
 * @param {File} file O arquivo selecionado pelo usuário.
 * @returns {Promise<string|null>} Uma promessa que resolve com a string Base64 ou null se não houver arquivo.
 */
function converterParaBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            return resolve(null);
        }
        // Validação de tamanho
        if (file.size > LIMITE_TAMANHO_ANEXO) {
            return reject(new Error(`O arquivo é muito grande (${(file.size / 1024).toFixed(1)}KB). O limite para anexo direto é ${LIMITE_TAMANHO_ANEXO / 1024}KB.`));
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Listener para o input de anexo, para mostrar o nome do arquivo selecionado
anexoInput.addEventListener('change', () => {
    const anexoLabel = document.getElementById('anexoLabel');
    if (anexoInput.files.length > 0) {
        anexoLabel.textContent = anexoInput.files[0].name;
    } else {
        anexoLabel.textContent = 'Clique para selecionar um arquivo...';
    }
});


formChamado.addEventListener('submit', async (e) => {
    e.preventDefault();

    // O botão pode não existir se o formulário já foi submetido
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = BTN_TEXT_ENVIANDO;
    }

    const nome = document.getElementById('nome').value.trim();
    const setor = document.getElementById('setor').value.trim();
    const problema = document.getElementById('problema').value.trim();
    const urgencia = document.querySelector('input[name="urgencia"]:checked').value;
    const anexoFile = anexoInput.files[0];
    const anexoUrl = anexoUrlInput.value.trim();

    if (!nome || !setor || !problema) {
        showMessage(mensagemEl, '❌ Por favor, preencha todos os campos obrigatórios (Nome, Setor e Problema).', 'error');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = BTN_TEXT_PADRAO;
        }
        return;
    }

    try {
        // Converte o arquivo para Base64 ANTES de criar o documento
        const anexoBase64 = await converterParaBase64(anexoFile);

        let anexoInfo = null;
        if (anexoFile && anexoBase64) {
            anexoInfo = {
                nome: anexoFile.name,
                tipo: anexoFile.type
            };
        }

        const protocolo = gerarProtocolo();

        await addDoc(collection(db, COLECAO_CHAMADOS), {
            protocolo,
            nome,
            setor,
            problema,
            urgencia,
            status: STATUS_PENDENTE,
            dataAbertura: serverTimestamp(),
            historico: [{
                descricao: 'Chamado criado',
                status: STATUS_PENDENTE,
                timestamp: new Date(),
                usuario: 'Sistema'
            }],
            anexoBase64: anexoBase64 || null,
            anexoInfo: anexoInfo || null,
            anexoUrl: anexoUrl || null
        });

        // Exibe a mensagem de sucesso no topo da tela
        const linkConsulta = `<a href="consulta.html?protocolo=${protocolo}" target="_blank">Consulte aqui</a>`;
        showMessage(mensagemEl, `✅ Chamado aberto com sucesso! Protocolo: <strong>${protocolo}</strong>. ${linkConsulta}`, 'success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
 
        // Limpa o formulário para um novo chamado e reativa o botão
        formChamado.reset();
        document.getElementById('anexoLabel').textContent = 'Clique para selecionar um arquivo...';
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = BTN_TEXT_PADRAO;
        }

    } catch (error) {
        showMessage(mensagemEl, `❌ Erro ao abrir chamado: ${error.message}`, 'error');
        btnSubmit.disabled = false;
        btnSubmit.textContent = BTN_TEXT_PADRAO;
    }
});
