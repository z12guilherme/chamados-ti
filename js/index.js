import { db, dbFunctions } from './firebase-init.js';
const { collection, addDoc, serverTimestamp } = dbFunctions;

const form = document.getElementById('formChamado');
const mensagemEl = document.getElementById('mensagem');
const btnSubmit = document.getElementById('btnSubmit');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Desabilita o botão para evitar múltiplos envios
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Enviando...';

    const nome = document.getElementById('nome').value;
    const setor = document.getElementById('setor').value;
    const problema = document.getElementById('problema').value;
    const urgencia = document.querySelector('input[name="urgencia"]:checked').value;

    // Gera um protocolo simples e único
    const ano = new Date().getFullYear();
    const randomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const protocolo = `CH-${ano}-${randomId}`;
    
    // Salva o novo chamado no Firestore
    await addDoc(collection(db, "chamados"), {
        protocolo,
        nome,
        setor,
        problema,
        urgencia,
        status: 'Pendente',
        dataAbertura: serverTimestamp()
    });
    
    // Limpa o formulário e exibe a mensagem de sucesso com o protocolo
    form.reset();
    mensagemEl.className = 'message success';
    mensagemEl.innerHTML = `✅ Chamado aberto com sucesso! Anote seu protocolo: <strong>${protocolo}</strong>. <a href="consulta.html?protocolo=${protocolo}">Clique aqui para consultar.</a>`;
    mensagemEl.style.display = 'block';
    
    // Reabilita o botão
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Abrir Chamado';
});