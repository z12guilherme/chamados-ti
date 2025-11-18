// js/main.js
import { db, dbFunctions } from './firebase-init.js';

const { collection, addDoc, serverTimestamp } = dbFunctions;

const formAberturaChamado = document.getElementById('formAberturaChamado');
const successMessageEl = document.getElementById('successMessage');
const errorMessageEl = document.getElementById('errorMessage');
const newProtocolNumberEl = document.getElementById('newProtocolNumber');
const linkConsulta = document.getElementById('linkConsulta');
const topMessageEl = document.getElementById('topMessage');
const anexoInput = document.getElementById('anexo');
const anexoLabel = document.getElementById('anexoLabel');

/**
 * Converte um arquivo para uma string Base64.
 * @param {File} file O arquivo a ser convertido.
 * @returns {Promise<string>} Uma promise que resolve com a string Base64.
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * Gera um número de protocolo único.
 * @returns {string} O protocolo gerado.
 */
function gerarProtocolo() {
    const ano = new Date().getFullYear();
    const aleatorio = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `CH-${ano}-${aleatorio}`;
}

/**
 * Exibe uma mensagem no topo da página.
 * @param {string} message A mensagem a ser exibida.
 * @param {string} type O tipo da mensagem ('success' ou 'error').
 */
function showTopMessage(message, type) {
    topMessageEl.className = `message ${type}`;
    topMessageEl.textContent = message;
    topMessageEl.style.display = 'block';
    window.scrollTo(0, 0); // Rola para o topo para ver a mensagem
}

// Atualiza o nome do arquivo no label do input de anexo
anexoInput.addEventListener('change', () => {
    if (anexoInput.files.length > 0) {
        anexoLabel.textContent = anexoInput.files[0].name;
    } else {
        anexoLabel.textContent = 'Clique para selecionar um arquivo...';
    }
});

// Event listener para o envio do formulário
formAberturaChamado.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitButton = formAberturaChamado.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';

    const nome = document.getElementById('nome').value;
    const setor = document.getElementById('setor').value;
    const problema = document.getElementById('problema').value;
    const urgencia = document.querySelector('input[name="urgencia"]:checked').value;
    const anexoUrl = document.getElementById('anexoUrl').value;
    const anexoFile = anexoInput.files[0];

    const protocolo = gerarProtocolo();
    const chamadoData = {
        protocolo,
        nome,
        setor,
        problema,
        urgencia,
        status: 'pendente',
        dataAbertura: serverTimestamp(),
        historico: [{
            timestamp: new Date(),
            descricao: 'Chamado aberto.',
            usuario: 'Sistema'
        }]
    };

    try {
        // Lida com o anexo
        if (anexoFile) {
            if (anexoFile.size > 750 * 1024) { // Limite de 750KB
                throw new Error('O arquivo anexado excede o limite de 750KB. Por favor, use um link externo.');
            }
            chamadoData.anexoBase64 = await fileToBase64(anexoFile);
            chamadoData.anexoInfo = {
                nome: anexoFile.name,
                tipo: anexoFile.type,
                tamanho: anexoFile.size
            };
        } else if (anexoUrl) {
            chamadoData.anexoUrl = anexoUrl;
        }

        // Adiciona o chamado ao Firestore
        await addDoc(collection(db, "chamados"), chamadoData);

        // Exibe a mensagem de sucesso
        formAberturaChamado.style.display = 'none';
        newProtocolNumberEl.textContent = protocolo;
        linkConsulta.href = `consulta.html?protocolo=${protocolo}`;
        successMessageEl.style.display = 'block';
        document.querySelector('.form-header').style.display = 'none';

    } catch (error) {
        console.error("Erro ao abrir chamado: ", error);
        showTopMessage(`Ocorreu um erro ao abrir seu chamado: ${error.message}`, 'error');
        
        // Reabilita o botão em caso de erro
        submitButton.disabled = false;
        submitButton.textContent = 'Abrir Chamado';
    }
});