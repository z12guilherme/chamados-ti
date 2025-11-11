import { db, dbFunctions } from './firebase-init.js';
const { collection, addDoc, serverTimestamp } = dbFunctions;

// Elementos do formulário
const formChamado = document.getElementById('formChamado');
const mensagemEl = document.getElementById('mensagem');
const btnSubmit = document.getElementById('btnSubmit');
const anexoInput = document.getElementById('anexo');
const anexoUrlInput = document.getElementById('anexoUrl');
const LIMITE_TAMANHO_ANEXO = 750 * 1024; // 750KB

/**
 * Converte um arquivo de imagem para uma string Base64 (Data URL).
 * @param {File} file O arquivo de imagem selecionado pelo usuário.
 * @returns {Promise<string|null>} Uma promessa que resolve com a string Base64 ou null se não houver arquivo.
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
}


import { showMessage } from './utils.js';

formChamado.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Desabilita o botão para evitar múltiplos envios
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Enviando...';

    const nome = document.getElementById('nome').value;
    const setor = document.getElementById('setor').value;
    const problema = document.getElementById('problema').value;
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
        
        await addDoc(collection(db, "chamados"), {
            protocolo,
            nome,
            setor,
            problema,
            urgencia,
            status: 'Pendente',
            dataAbertura: serverTimestamp(),
            anexoBase64: anexoBase64 || null, // Salva a string Base64
            anexoInfo: anexoInfo || null,      // Salva nome e tipo do arquivo
            anexoUrl: anexoUrl || null         // Salva a URL do anexo grande
        });
        
        // Limpa o formulário e exibe a mensagem de sucesso com o protocolo
        formChamado.reset();
        showMessage(mensagemEl, `✅ Chamado aberto com sucesso! Anote seu protocolo: <strong>${protocolo}</strong>. <a href="consulta.html?protocolo=${protocolo}">Clique aqui para consultar.</a>`, 'success');

    } catch (error) {
        showMessage(mensagemEl, `❌ Erro: ${error.message}`, 'error');
    } finally {
        // Reabilita o botão
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Abrir Chamado';
    }
});