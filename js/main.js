// js/main.js
import { db, dbFunctions } from './firebase-init.js';

/* --- Constantes ---
 * O Firestore tem um limite máximo de 1 MiB (1.048.576 bytes) por documento.
 * A codificação Base64 aumenta o tamanho do arquivo em ~33%.
 * Para evitar erros, o limite para o arquivo original deve ser menor que 1MB. 700KB é um valor seguro.
 */
const MAX_FILE_SIZE_BYTES = 700 * 1024; // 700KB

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

/**
 * Processa o anexo (arquivo ou URL) e retorna os dados para o Firestore.
 * @param {File} file O arquivo do input.
 * @param {string} url A URL do input.
 * @returns {Promise<Object>} Um objeto com os dados do anexo.
 */
async function processarAnexo(file, url) {
    const anexoData = {};

    if (file) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
            throw new Error(`O arquivo excede o limite de ${Math.round(MAX_FILE_SIZE_BYTES / 1024)}KB. Por favor, use um link externo.`);
        }
        anexoData.anexoBase64 = await fileToBase64(file);
        anexoData.anexoInfo = {
            nome: file.name,
            tipo: file.type,
            tamanho: file.size
        };
    } else if (url) {
        anexoData.anexoUrl = url;
    }

    return anexoData;
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

    try {
        const anexoData = await processarAnexo(anexoFile, anexoUrl);

        const chamadoData = {
            nome,
            setor,
            problema,
            urgencia,
            status: 'pendente',
            dataAbertura: serverTimestamp(),
            historico: [{
                timestamp: serverTimestamp(), // Usando serverTimestamp para consistência
                descricao: 'Chamado aberto.',
                usuario: 'Sistema'
            }],
            ...anexoData // Adiciona os dados do anexo ao chamado
        };

        // Adiciona o chamado ao Firestore
        const docRef = await addDoc(collection(db, "chamados"), chamadoData);

        // O ID do documento agora é o nosso protocolo único
        const protocolo = docRef.id;

        // Exibe a mensagem de sucesso
        formAberturaChamado.style.display = 'none';
        newProtocolNumberEl.textContent = protocolo;
        linkConsulta.href = `consulta.html?protocolo=${protocolo}`;
        successMessageEl.style.display = 'block';
        document.querySelector('.form-header').style.display = 'none';

    } catch (error) {
        showTopMessage(`Ocorreu um erro ao abrir seu chamado: ${error.message}`, 'error');
        
        // Reabilita o botão em caso de erro
        submitButton.disabled = false;
        submitButton.textContent = 'Abrir Chamado';
    }
});