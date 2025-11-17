// js/main.js
import { db, storage, dbFunctions, storageFunctions } from './firebase-init.js';
import { showMessage } from './utils.js'; // Assumindo que showMessage lida com a sanitização de HTML

const { collection, addDoc, serverTimestamp, doc, updateDoc } = dbFunctions;
const { ref, uploadBytes, getDownloadURL } = storageFunctions;

const formAberturaChamado = document.getElementById('formAberturaChamado');
const successMessage = document.getElementById('successMessage');
const newProtocolNumber = document.getElementById('newProtocolNumber');
const topMessageEl = document.getElementById('topMessage');
const anexoInput = document.getElementById('anexo');
const anexoLabel = document.getElementById('anexoLabel');

/**
 * Faz upload de um arquivo para o Firebase Storage.
 * @param {File} file O arquivo a ser enviado.
 * @param {string} docId O ID do documento do chamado para nomear a pasta.
 * @returns {Promise<string|null>} Uma promessa que resolve com a URL de download do arquivo.
 */
async function uploadAnexo(file, docId) {
    if (!file) return null;
    // Cria uma referência única para o arquivo no Storage
    const storageRef = ref(storage, `anexos/${docId}/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}

/**
 * Gera um número de protocolo único baseado no ID do documento.
 * Formato: CH-ANO-FINAL_ID (onde FINAL_ID são os últimos 6 caracteres do ID do documento)
 * @param {string} docId O ID do documento do Firestore.
 * @returns {string} O protocolo gerado.
 */
function gerarProtocolo(docId) {
    const ano = new Date().getFullYear();
    const idFinal = docId.slice(-6).toUpperCase();
    return `CH-${ano}-${idFinal}`;
}

anexoInput.addEventListener('change', () => {
    const fileName = anexoInput.files.length > 0 ? anexoInput.files[0].name : 'Clique para selecionar um arquivo...';
    anexoLabel.textContent = fileName;
});

/**
 * Controla o estado do botão de submit do formulário.
 * @param {HTMLButtonElement} button O elemento do botão.
 * @param {boolean} isLoading Se o estado é de carregamento.
 */
function setSubmitButtonState(button, isLoading) {
    button.disabled = isLoading;
    button.textContent = isLoading ? 'Enviando...' : 'Abrir Chamado';
}

formAberturaChamado.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = formAberturaChamado.nome.value.trim();
    const setor = formAberturaChamado.setor.value.trim();
    const problema = formAberturaChamado.problema.value.trim();
    const urgencia = document.querySelector('input[name="urgencia"]:checked').value;
    const anexoFile = document.getElementById('anexo').files[0];
    const anexoUrlExterno = document.getElementById('anexoUrl').value.trim();

    // Validação simples
    if (!nome || !setor || !problema || !urgencia) {
        showMessage(topMessageEl, 'Por favor, preencha todos os campos obrigatórios.', 'error');
        return;
    }

    const submitButton = formAberturaChamado.querySelector('button[type="submit"]');
    setSubmitButtonState(submitButton, true);
    topMessageEl.style.display = 'none';

    try {
        // 1. Gera uma referência de documento no cliente para obter um ID único ANTES de qualquer operação de escrita.
        const newChamadoRef = doc(collection(db, "chamados"));
        const docId = newChamadoRef.id;

        // 2. Faz o upload do anexo para o Storage usando o ID gerado.
        const anexoStorageUrl = await uploadAnexo(anexoFile, docId);

        // 3. Gera o protocolo usando o ID único do documento.
        const protocolo = gerarProtocolo(docId);

        // 4. Monta o objeto do chamado.
        const chamadoData = {
            nome,
            setor,
            problema,
            urgencia,
            protocolo,
            status: 'pendente',
            dataAbertura: serverTimestamp(),
            anexoUrl: anexoStorageUrl || anexoUrlExterno || null,
            resolucao: null,
            pecaSolicitada: null,
            historico: []
        };

        if (anexoStorageUrl && anexoFile) {
            chamadoData.anexoInfo = {
                nome: anexoFile.name,
                tipo: anexoFile.type,
                path: `anexos/${docId}/${anexoFile.name}`
            };
        }

        // 5. Cria o documento no Firestore de uma só vez.
        await setDoc(newChamadoRef, chamadoData);

        console.log("Chamado aberto com sucesso! ID:", docId);

        // Limpa o formulário e exibe a mensagem de sucesso no topo
        formAberturaChamado.reset();
        const linkConsulta = `<a href="consulta.html?protocolo=${protocolo}" target="_blank">Clique aqui para consultar.</a>`;
        showMessage(topMessageEl, `✅ Chamado aberto com sucesso! Seu protocolo é <strong>${protocolo}</strong>. ${linkConsulta}`, 'success');
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola a página para o topo para ver a mensagem

    } catch (error) {
        console.error("Erro ao abrir chamado:", error);
        showMessage(topMessageEl, `Ocorreu um erro ao abrir seu chamado. Tente novamente. Detalhes: ${error.message}`, 'error');
        
    } finally {
        setSubmitButtonState(submitButton, false);
    }
});