// js/admin.js
import { db, dbFunctions } from './firebase-init.js';

// Funções do Firestore que vamos usar
const { collection, query, orderBy, onSnapshot, doc, deleteDoc } = dbFunctions;

const tableBody = document.getElementById('chamados-table-body');

/**
 * Converte o timestamp do Firebase para uma string de data legível.
 * @param {object} timestamp O objeto de timestamp do Firebase.
 * @returns {string} A data formatada.
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    // O timestamp do servidor pode chegar nulo inicialmente, antes de ser definido
    const date = timestamp.toDate();
    return date.toLocaleString('pt-BR');
}

// 1. Cria uma consulta para buscar os chamados, ordenados pela data de abertura (os mais recentes primeiro)
const q = query(collection(db, "chamados"), orderBy("dataAbertura", "desc"));

// 2. Usa onSnapshot para "escutar" as atualizações em tempo real na coleção de chamados
const unsubscribe = onSnapshot(q, (querySnapshot) => {
    // Limpa a tabela sempre que houver uma atualização (adição, modificação ou exclusão)
    tableBody.innerHTML = '';

    if (querySnapshot.empty) {
        tableBody.innerHTML = '<tr><td colspan="6">Nenhum chamado encontrado.</td></tr>';
        return;
    }

    // 3. Itera sobre os documentos e renderiza a tabela novamente com os dados atualizados
    querySnapshot.forEach((docSnapshot) => {
        const chamado = docSnapshot.data();
        const id = docSnapshot.id; // O ID do documento é nosso protocolo

        const row = tableBody.insertRow();
        row.innerHTML = `
            <td><a href="consulta.html?protocolo=${id}" target="_blank">${id}</a></td>
            <td>${chamado.nome || 'N/A'}</td>
            <td>${chamado.setor || 'N/A'}</td>
            <td>${chamado.problema || 'N/A'}</td>
            <td>${chamado.status || 'N/A'}</td>
            <td><button class="delete-btn" data-id="${id}">Excluir</button></td>
        `;
    });
});

// 4. Adiciona um único event listener na tabela para gerenciar os cliques nos botões de exclusão
tableBody.addEventListener('click', async (e) => {
    // Verifica se o elemento clicado é um botão de exclusão
    if (e.target && e.target.classList.contains('delete-btn')) {
        const id = e.target.dataset.id;

        if (confirm(`Tem certeza que deseja excluir o chamado ${id}? Esta ação não pode ser desfeita.`)) {
            try {
                // Deleta o documento no Firestore usando o ID
                await deleteDoc(doc(db, "chamados", id));
                // Não é preciso fazer mais nada! O 'onSnapshot' vai detectar a exclusão
                // e redesenhar a tabela automaticamente, removendo a linha.
                console.log(`Chamado ${id} excluído com sucesso!`);
            } catch (error) {
                console.error("Erro ao excluir chamado: ", error);
                alert("Ocorreu um erro ao tentar excluir o chamado.");
            }
        }
    }
});