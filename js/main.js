// js/main.js
import { db, storage, dbFunctions, storageFunctions } from './firebase-init.js';
import { showMessage } from './utils.js';

const { collection, addDoc, serverTimestamp, doc, updateDoc } = dbFunctions;
const { ref, uploadBytes, getDownloadURL } = storageFunctions;

const formAberturaChamado = document.getElementById('formAberturaChamado');
const successMessage = document.getElementById('successMessage');
const newProtocolNumber = document.getElementById('newProtocolNumber');
const errorMessageEl = document.getElementById('errorMessage');

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
 * Gera um número de protocolo único.
 * Formato: CH-ANO-XXXXXX (onde X é um caractere aleatório)
 * @returns {string} O protocolo gerado.
 */
function gerarProtocolo() {
    const ano = new Date().getFullYear().toString().slice(-2); // Pega os 2 últimos dígitos do ano
    const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `CH-${ano}-${randomChars}`;
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
        showMessage(errorMessageEl, 'Por favor, preencha todos os campos obrigatórios.', 'error');
        return;
    }

    const btnSubmit = formAberturaChamado.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Enviando...';
    errorMessageEl.style.display = 'none';

    try {
        const protocolo = gerarProtocolo();

        // 1. Cria o documento no Firestore com os dados iniciais para obter um ID
        const docRef = await addDoc(collection(db, "chamados"), {
            nome,
            setor,
            problema,
            urgencia,
            protocolo,
            status: 'pendente',
            dataAbertura: serverTimestamp(),
            resolucao: null,
            pecaSolicitada: null,
            anexoUrl: anexoUrlExterno || null, // Salva o link externo imediatamente
            historico: [{
                status: 'pendente',
                data: serverTimestamp(),
                responsavel: 'Sistema'
            }]
        });

        // 2. Faz o upload do anexo para o Firebase Storage (se houver)
        const anexoStorageUrl = await uploadAnexo(anexoFile, docRef.id);

        // 3. Atualiza o documento com a URL do anexo do Storage (se foi feito upload)
        if (anexoStorageUrl) {
            await updateDoc(doc(db, "chamados", docRef.id), {
                anexoUrl: anexoStorageUrl, // Sobrescreve o link externo se um arquivo foi enviado
                anexoInfo: {
                    nome: anexoFile.name,
                    tipo: anexoFile.type,
                    path: `anexos/${docRef.id}/${anexoFile.name}`
                }
            });
        }

        console.log("Chamado aberto com sucesso! ID:", docRef.id);

        // Exibe a mensagem de sucesso com o protocolo
        formAberturaChamado.style.display = 'none';
        newProtocolNumber.textContent = protocolo;
        document.getElementById('linkConsulta').href = `consulta.html?protocolo=${protocolo}`;
        successMessage.style.display = 'block';

    } catch (error) {
        console.error("Erro ao abrir chamado:", error);
        showMessage(errorMessageEl, `Ocorreu um erro ao abrir seu chamado. Tente novamente. Detalhes: ${error.message}`, 'error');
        
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Abrir Chamado';
    }
});