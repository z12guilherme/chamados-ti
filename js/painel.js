// js/painel.js
import { db, auth, dbFunctions, authFunctions } from './firebase-init.js';

const { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } = dbFunctions;
const { onAuthStateChanged, signOut } = authFunctions;

const btnLogout = document.getElementById('btnLogout');

// Elementos das listas de chamados
const loader = document.querySelector('.loader');
const listaPendentesEl = document.getElementById('listaPendentes');
const listaAguardandoPecaEl = document.getElementById('listaAguardandoPeca');
const listaResolvidosEl = document.getElementById('listaResolvidos');

const modalConfirmacao = document.getElementById('modalConfirmacao');
const btnModalCancelar = document.getElementById('btnModalCancelar');
const btnModalConfirmar = document.getElementById('btnModalConfirmar');

// Elementos do Modal de Status
const modalStatus = document.getElementById('modalStatus');
const formStatus = document.getElementById('formStatus');
const selectStatus = document.getElementById('novoStatus');
const btnStatusCancelar = document.getElementById('btnStatusCancelar');
const campoResolucao = document.getElementById('campoResolucao');
const textoResolucao = document.getElementById('textoResolucao');
const campoPeca = document.getElementById('campoPeca');
const textoPeca = document.getElementById('textoPeca');
const btnSalvarStatus = document.querySelector('#formStatus button[type="submit"]');

let chamadoIdParaAcao = null; // Armazena o ID do chamado para exclusão ou mudança de status
let chamadoAtualParaStatus = null; // Armazena os dados do chamado para o modal de status

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
        loader.style.display = 'none';

        // Limpa as listas antes de recarregar
        listaPendentesEl.innerHTML = '';
        listaAguardandoPecaEl.innerHTML = '';
        listaResolvidosEl.innerHTML = '';

        const chamados = {
            pendentes: [],
            aguardandoPeca: [],
            resolvidos: []
        };

        querySnapshot.forEach((documento) => {
            const chamado = documento.data();
            const id = documento.id;

            const dataAbertura = chamado.dataAbertura ? chamado.dataAbertura.toDate().toLocaleString('pt-BR') : 'Data indisponível';
            const status = chamado.status || 'Pendente';
            const statusClass = status.toLowerCase().replace(/\s+/g, '-');

            // Adiciona a validação para o campo de resolução ser obrigatório
            if (status === 'Resolvido' && !chamado.resolucao) {
                chamado.resolucao = "Resolução não informada.";
            }

            const resolucaoHtml = chamado.status === 'Resolvido' && chamado.resolucao
                ? `<div class="resolucao-info">
                     <strong>Solução:</strong> ${chamado.resolucao}
                   </div>`
                : '';

            const pecaHtml = chamado.status === 'Aguardando Peça' && chamado.pecaAguardando
                ? `<div class="peca-info">
                     <strong>Aguardando Peça:</strong> ${chamado.pecaAguardando}
                   </div>`
                : '';

            const urgenciaClass = chamado.urgencia ? `urgencia-${chamado.urgencia.toLowerCase()}` : '';
            const urgenciaHtml = chamado.urgencia 
                ? `<span class="urgency-tag ${urgenciaClass}">${chamado.urgencia}</span>`
                : '';

            const card = document.createElement('div');
            card.className = `chamado-card ${statusClass.replace('í', 'i').replace('ç', 'c').replace('ê', 'e')}`;
            card.dataset.id = id;
            card.dataset.chamado = JSON.stringify(chamado);
            
            card.innerHTML = `
                <div class="card-header">
                    <div class="solicitante-info">
                        <span class="solicitante-nome">${chamado.nome} ${urgenciaHtml}</span>
                        <span class="solicitante-setor">Setor: ${chamado.setor}</span>
                    </div>
                    <div class="status-container">
                        <span class="status-tag">${chamado.status}</span>
                    </div>
                </div>
                <div class="problema-resumo">
                    <p>${chamado.problema}</p>
                </div>
                ${pecaHtml}
                ${resolucaoHtml}
                <div class="card-footer">
                    <div class="data-abertura">
                        Aberto em: ${dataAbertura}
                    </div>
                    <button class="btn-status" data-id="${id}">Alterar</button>
                    <button class="btn-remover" data-id="${id}">Remover</button>
                </div>
            `;

            // Separa os chamados por categoria
            if (status === 'Pendente') {
                chamados.pendentes.push(card);
            } else if (status === 'Aguardando Peça') {
                chamados.aguardandoPeca.push(card);
            } else if (status === 'Resolvido' || status === 'Em Andamento') {
                // Agrupando "Em Andamento" com "Resolvidos" para o histórico ou pode criar outra categoria
                if (status === 'Resolvido') {
                    chamados.resolvidos.push(card);
                } else { // Em Andamento vai para a lista de pendentes para manter visibilidade
                    chamados.pendentes.push(card);
                }
            }
        });

        // Exibe os chamados ou a mensagem de "nenhum chamado"
        if (chamados.pendentes.length === 0 && chamados.aguardandoPeca.length === 0) {
            document.getElementById('chamados-ativos').innerHTML += `<p class="empty-category-message">Nenhum chamado pendente.</p>`;
        } else {
            chamados.pendentes.forEach(card => listaPendentesEl.appendChild(card));
            chamados.aguardandoPeca.forEach(card => listaAguardandoPecaEl.appendChild(card));
        }

        if (chamados.resolvidos.length === 0) {
            listaResolvidosEl.innerHTML = `<p class="empty-category-message">Nenhum chamado foi resolvido ainda.</p>`;
        } else {
            chamados.resolvidos.forEach(card => listaResolvidosEl.appendChild(card));
        }
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
document.querySelector('.categorias-container').addEventListener('click', (e) => {
    const target = e.target;
    if (!target.dataset.id) return;

    chamadoIdParaAcao = target.dataset.id;

    if (target.classList.contains('btn-remover')) {
        modalConfirmacao.style.display = 'flex';
    }

    if (target.classList.contains('btn-status')) {
        const card = target.closest('.chamado-card');
        chamadoAtualParaStatus = JSON.parse(card.dataset.chamado);
        
        selectStatus.value = chamadoAtualParaStatus.status || 'Pendente';
        textoResolucao.value = chamadoAtualParaStatus.resolucao || '';
        campoResolucao.style.display = chamadoAtualParaStatus.status === 'Resolvido' ? 'block' : 'none';
        textoPeca.value = chamadoAtualParaStatus.pecaAguardando || '';
        campoPeca.style.display = chamadoAtualParaStatus.status === 'Aguardando Peça' ? 'block' : 'none';
        validarFormStatus(); // Valida o formulário ao abrir
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
    campoResolucao.style.display = 'none';
    campoPeca.style.display = 'none';
    chamadoIdParaAcao = null;
    chamadoAtualParaStatus = null;
});
function validarFormStatus() {
    const statusSelecionado = selectStatus.value;
    const resolucaoTexto = textoResolucao.value.trim();
    const pecaTexto = textoPeca.value.trim();

    if (statusSelecionado === 'Resolvido' && resolucaoTexto === '') {
        btnSalvarStatus.disabled = true;
    } else if (statusSelecionado === 'Aguardando Peça' && pecaTexto === '') {
        btnSalvarStatus.disabled = true;
    } else {
        btnSalvarStatus.disabled = false;
    }
}

selectStatus.addEventListener('change', () => {
    const status = selectStatus.value;
    if (status === 'Resolvido') {
        campoResolucao.style.display = 'block';
        campoPeca.style.display = 'none';
    } else if (status === 'Aguardando Peça') {
        campoResolucao.style.display = 'none';
        campoPeca.style.display = 'block';
    } else {
        campoResolucao.style.display = 'none';
        campoPeca.style.display = 'none';
    }
    validarFormStatus();
});

textoResolucao.addEventListener('input', validarFormStatus);
textoPeca.addEventListener('input', validarFormStatus);


formStatus.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (chamadoIdParaAcao) {
        const novoStatus = selectStatus.value;
        const chamadoRef = doc(db, "chamados", chamadoIdParaAcao);
        const dadosParaAtualizar = {
            status: novoStatus
        };

        if (novoStatus === 'Resolvido') {
            if (textoResolucao.value.trim() === '') {
                alert('Por favor, descreva como o problema foi resolvido.');
                return;
            }
            dadosParaAtualizar.resolucao = textoResolucao.value.trim();
        } else if (novoStatus === 'Aguardando Peça') {
            if (textoPeca.value.trim() === '') {
                alert('Por favor, informe qual peça está sendo aguardada.');
                return;
            }
            dadosParaAtualizar.pecaAguardando = textoPeca.value.trim();
            dadosParaAtualizar.resolucao = ''; // Limpa a resolução caso estivesse preenchida
        }

        await updateDoc(chamadoRef, dadosParaAtualizar);
        modalStatus.style.display = 'none';
        chamadoIdParaAcao = null;
    }
});