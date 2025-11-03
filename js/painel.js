// js/painel.js
import { db, auth, dbFunctions, authFunctions } from './firebase-init.js';

const { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } = dbFunctions;
const { onAuthStateChanged, signOut } = authFunctions;

const listaChamadosEl = document.getElementById('listaChamados');
const btnLogout = document.getElementById('btnLogout');

// Elementos do Modal de Exclusão
const modalConfirmacao = document.getElementById('modalConfirmacao');
const btnModalCancelar = document.getElementById('btnModalCancelar');
const btnModalConfirmar = document.getElementById('btnModalConfirmar');

// Elementos do Modal de Status
const modalStatus = document.getElementById('modalStatus');
const formStatus = document.getElementById('formStatus');
const selectNovoStatus = document.getElementById('novoStatus');
const btnStatusCancelar = document.getElementById('btnStatusCancelar');

let chamadoIdParaAcao = null; // Armazena o ID do chamado para exclusão ou mudança de status

// Proteção de Rota e Carregamento de Dados
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário está logado, busca os chamados
        carregarChamados();
    } else {
        // Usuário não está logado, redireciona para a página de login
        window.location.href = 'login.html';
    }
});

// Função para carregar e exibir os chamados em tempo real
function carregarChamados() {
    const q = query(collection(db, "chamados"), orderBy("dataAbertura", "desc"));

    onSnapshot(q, (querySnapshot) => {
        if (querySnapshot.empty) {
            listaChamadosEl.innerHTML = `<div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
                <h3>Nenhum chamado aberto.</h3>
                <p>Quando um novo chamado for criado, ele aparecerá aqui.</p>
            </div>`;
            return;
        }

        listaChamadosEl.innerHTML = ''; // Limpa a lista antes de adicionar os novos
        querySnapshot.forEach((documento) => {
            const chamado = documento.data();
            const id = documento.id;

            // Formata a data para um formato legível
            const dataAbertura = chamado.dataAbertura ? chamado.dataAbertura.toDate().toLocaleString('pt-BR') : 'Data indisponível';
            
            const statusClass = chamado.status.toLowerCase().replace(' ', '-');

            const card = document.createElement('div');
            card.className = `chamado-card ${statusClass.replace('í', 'i')}`;
            card.innerHTML = `
                <div class="card-item solicitante-info">
                    <span class="solicitante-nome">${chamado.nome}</span>
                    <span class="solicitante-setor">${chamado.setor}</span>
                </div>
                <div class="card-item problema-resumo">
                    <p>${chamado.problema}</p>
                </div>
                <div class="card-item data-abertura">
                    <span>${dataAbertura}</span>
                </div>
                <div class="card-item status-container">
                    <span class="status-tag">${chamado.status}</span>
                </div>
                <div class="card-item acoes-container">
                    <button class="btn-status" data-id="${id}">Alterar</button>
                    <button class="btn-remover" data-id="${id}">Remover</button>
                </div>
            `;
            listaChamadosEl.appendChild(card);
        });
    });
}

// Event Listeners para Ações

// Logout
btnLogout.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
    }
});

// Delegação de eventos para os botões de ação nos cards
listaChamadosEl.addEventListener('click', (e) => {
    chamadoIdParaAcao = e.target.dataset.id;
    if (!chamadoIdParaAcao) return;

    if (e.target.classList.contains('btn-remover')) {
        modalConfirmacao.style.display = 'flex';
    }
    if (e.target.classList.contains('btn-status')) {
        modalStatus.style.display = 'flex';
    }
});

// Ações do Modal de Exclusão
btnModalCancelar.addEventListener('click', () => {
    modalConfirmacao.style.display = 'none';
    chamadoIdParaAcao = null;
});

btnModalConfirmar.addEventListener('click', async () => {
    if (chamadoIdParaAcao) {
        await deleteDoc(doc(db, "chamados", chamadoIdParaAcao));
        modalConfirmacao.style.display = 'none';
        chamadoIdParaAcao = null;
    }
});

// Ações do Modal de Status
btnStatusCancelar.addEventListener('click', () => {
    modalStatus.style.display = 'none';
    chamadoIdParaAcao = null;
});

formStatus.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (chamadoIdParaAcao) {
        const novoStatus = selectNovoStatus.value;
        const chamadoRef = doc(db, "chamados", chamadoIdParaAcao);
        await updateDoc(chamadoRef, {
            status: novoStatus
        });
        modalStatus.style.display = 'none';
        chamadoIdParaAcao = null;
    }
});