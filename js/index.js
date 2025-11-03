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
    
    try {
        // Salva o novo chamado diretamente no banco de dados Firestore
        await addDoc(collection(db, "chamados"), {
            nome,
            setor,
            problema,
            status: 'Pendente',
            dataAbertura: serverTimestamp()
        });

        form.reset();

        // Mostra a mensagem de sucesso diretamente
        mensagemEl.className = 'message success';
        mensagemEl.textContent = '✅ Chamado aberto com sucesso! Obrigado.';
        mensagemEl.style.display = 'block';

    } catch (error) {
        console.error("Erro ao abrir chamado: ", error);
        mensagemEl.className = 'message error'; 
        mensagemEl.textContent = '❌ Ocorreu um erro ao enviar seu chamado. Tente novamente.';
        mensagemEl.style.display = 'block';
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Abrir Chamado';
    }
});