import { db, dbFunctions } from './firebase-init.js';
import { db, dbFunctions, storage, storageFunctions } from './firebase-init.js';
import { showMessage } from './utils.js';
const { collection, addDoc, serverTimestamp } = dbFunctions;
const { collection, addDoc, serverTimestamp, doc, updateDoc } = dbFunctions;
const { ref, uploadBytes, getDownloadURL } = storageFunctions;

// Elementos do formulário
const formChamado = document.getElementById('formChamado');
const mensagemEl = document.getElementById('mensagem');
const btnSubmit = document.getElementById('btnSubmit');
const anexoInput = document.getElementById('anexo'); // Assumindo que este é o input de arquivo
const anexoUrlInput = document.getElementById('anexoUrl');

// Constantes
const LIMITE_TAMANHO_ANEXO = 750 * 1024; // 750KB
const STATUS_PENDENTE = 'Pendente';
const BTN_TEXT_ENVIANDO = 'Enviando...';
const BTN_TEXT_PADRAO = 'Abrir Chamado';
const COLECAO_CHAMADOS = 'chamados';

/**
 * Converte um arquivo de imagem para uma string Base64 (Data URL).
 * @param {File} file O arquivo de imagem selecionado pelo usuário.
 * @returns {Promise<string|null>} Uma promessa que resolve com a string Base64 ou null se não houver arquivo.
 * Faz upload de um arquivo para o Firebase Storage e retorna sua URL de download.
 * @param {File} file O arquivo a ser enviado.
 * @param {string} docId O ID do documento do chamado para nomear a pasta.
 * @returns {Promise<string|null>} Uma promessa que resolve com a URL de download do arquivo.
 */
function converterImagemParaBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            return resolve(null);
        }
        // Validação de tamanho
        if (file.size > LIMITE_TAMANHO_ANEXO) {
            return reject(new Error('O arquivo selecionado é muito grande! O limite para anexo direto é 750KB. Por favor, use a opção de link externo.'));
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
async function uploadAnexo(file, docId) {
    if (!file) return null;
    const storageRef = ref(storage, `anexos/${docId}/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
}

formChamado.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Desabilita o botão para evitar múltiplos envios
    btnSubmit.disabled = true;
    btnSubmit.textContent = BTN_TEXT_ENVIANDO;

    // Validação de campos
    const nome = document.getElementById('nome').value.trim();
    const setor = document.getElementById('setor').value.trim();
    const problema = document.getElementById('problema').value.trim();
    if (!nome || !setor || !problema) {
        showMessage(mensagemEl, '❌ Por favor, preencha todos os campos obrigatórios (Nome, Setor e Problema).', 'error');
        btnSubmit.disabled = false;
        btnSubmit.textContent = BTN_TEXT_PADRAO;
        return;
    }

    const urgencia = document.querySelector('input[name="urgencia"]:checked').value;
    const anexoFile = anexoInput.files[0];
    const anexoUrl = anexoUrlInput.value.trim();

    try {
        // Converte o arquivo para Base64 ANTES de salvar
        const anexoBase64 = await converterImagemParaBase64(anexoFile);

        let anexoInfo = null;
        if (anexoFile) {
            anexoInfo = {
                nome: anexoFile.name,
                tipo: anexoFile.type
            };
        }

        // Gera um protocolo simples e único
        const ano = new Date().getFullYear();
        const randomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const protocolo = `CH-${ano}-${randomId}`;
        
        await addDoc(collection(db, COLECAO_CHAMADOS), {
            protocolo,
        // 1. Cria o documento no Firestore para obter um ID único
        const docRef = await addDoc(collection(db, COLECAO_CHAMADOS), {
            nome,
            setor,
            problema,
            urgencia,
            status: STATUS_PENDENTE,
            dataAbertura: serverTimestamp(),
            historico: [{ // Inicia o histórico na criação do chamado
            historico: [{
                status: STATUS_PENDENTE,
                data: serverTimestamp(),
                responsavel: 'Sistema'
            }],
            anexoBase64: anexoBase64 || null,
            anexoInfo: anexoInfo || null,      // Salva nome e tipo do arquivo
            anexoUrl: anexoUrl || null         // Salva a URL do anexo grande
            anexoUrl: anexoUrl || null // Salva a URL externa, se houver
        });

        // 2. Gera o protocolo usando o ID único do Firestore
        const ano = new Date().getFullYear();
        const idCurto = docRef.id.substring(0, 5).toUpperCase();
        const protocolo = `CH-${ano}-${idCurto}`;

        // 3. Faz o upload do anexo para o Firebase Storage (se existir)
        const anexoStorageUrl = await uploadAnexo(anexoFile, docRef.id);

        // 4. Atualiza o documento com o protocolo e a URL do anexo
        await updateDoc(doc(db, COLECAO_CHAMADOS, docRef.id), {
            protocolo: protocolo,
            anexoUrl: anexoStorageUrl || anexoUrl || null, // Prioriza o anexo do storage
            anexoInfo: anexoFile ? {
                nome: anexoFile.name,
                tipo: anexoFile.type,
                path: `anexos/${docRef.id}/${anexoFile.name}` // Caminho no Storage
            } : null
        });
        
        // Limpa o formulário e exibe a mensagem de sucesso com o protocolo
        formChamado.reset();
        showMessage(mensagemEl, `✅ Chamado aberto com sucesso! Anote seu protocolo: <strong>${protocolo}</strong>. <a href="consulta.html?protocolo=${protocolo}">Clique aqui para consultar.</a>`, 'success');

    } catch (error) {
        showMessage(mensagemEl, `❌ Erro: ${error.message}`, 'error');
    } finally {
        // Reabilita o botão
        btnSubmit.disabled = false;
        btnSubmit.textContent = BTN_TEXT_PADRAO;
    }
});