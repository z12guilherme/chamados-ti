// js/painel.js
import { db, auth, dbFunctions, authFunctions } from './firebase-init.js';

const { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } = dbFunctions;
const { onAuthStateChanged, signOut } = authFunctions;

const btnLogout = document.getElementById('btnLogout');
const btnExportarExcel = document.getElementById('btnExportarExcel');

// Elementos das listas de chamados
const loader = document.querySelector('.loader');
const listaPendentesEl = document.getElementById('listaPendentes');
const listaEmAndamentoEl = document.getElementById('listaEmAndamento');
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
let todosOsChamados = []; // Armazena todos os chamados para a exportação

// --- MELHORIA: Gráficos ---
let graficoStatusInstance = null;
let graficoSetoresInstance = null;

// --- MELHORIA: Notificações no Navegador ---
// Solicita permissão para notificações assim que o painel carrega
if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission();
}
let isFirstLoad = true; // Flag para evitar notificação no primeiro carregamento

// --- MELHORIA 2: Alerta Sonoro e Visual na Aba ---
const audio = new Audio('../sounds/notification.mp3');
const originalTitle = document.title;
let intervalId = null; // Controla o piscar do título


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
        const isUpdate = !isFirstLoad; // Considera uma atualização se não for o primeiro carregamento
        loader.style.display = 'none';

        // Limpa as listas antes de recarregar
        listaPendentesEl.innerHTML = '';
        listaEmAndamentoEl.innerHTML = '';
        listaAguardandoPecaEl.innerHTML = '';
        listaResolvidosEl.innerHTML = '';

        const chamados = {
            pendentes: [],
            aguardandoPeca: [],
            emAndamento: [],
            resolvidos: []
        };

        // --- MELHORIA: Lógica de Notificação ---
        if (isUpdate && querySnapshot.docChanges().some(change => change.type === 'added')) {
            const newDoc = querySnapshot.docChanges().find(change => change.type === 'added').doc.data();
            
            // Notificação de Desktop (já implementada)
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Novo Chamado Aberto!', {
                    body: `Solicitante: ${newDoc.nome}\nSetor: ${newDoc.setor}`,
                });
            }

            // --- MELHORIA 2: Tocar som e piscar título ---
            audio.play().catch(e => console.log("Não foi possível tocar o som. Interação do usuário pode ser necessária."));

            // Começa a piscar o título se já não estiver piscando
            if (!intervalId) {
                intervalId = setInterval(() => {
                    document.title = document.title === originalTitle ? '*** NOVO CHAMADO! ***' : originalTitle;
                }, 1000);
            }
        }


        querySnapshot.forEach((documento) => {
            const chamado = documento.data();
            const id = documento.id;
            chamado.id = id; // Adiciona o ID ao objeto do chamado
            todosOsChamados.push({ id, ...chamado }); // Adiciona o chamado à lista de exportação

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
                        <span class="solicitante-nome">${chamado.nome}</span>
                        <span class="solicitante-setor">Setor: ${chamado.setor}</span>
                    </div>
                    <div class="status-container" style="display: flex; align-items: center; gap: 10px;">
                        ${urgenciaHtml}
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
            } else if (status === 'Em Andamento') {
                chamados.emAndamento.push(card);
            } else if (status === 'Aguardando Peça') {
                chamados.aguardandoPeca.push(card);
            } else if (status === 'Resolvido') {
                chamados.resolvidos.push(card);
            }
        });

        // Exibe os chamados ou a mensagem de "nenhum chamado"
        if (chamados.pendentes.length === 0 && chamados.aguardandoPeca.length === 0 && chamados.emAndamento.length === 0) {
            document.getElementById('chamados-ativos').innerHTML += `<p class="empty-category-message">Nenhum chamado pendente.</p>`;
        } else {
            if (chamados.pendentes.length > 0) {
                listaPendentesEl.innerHTML += '<h4>Pendentes</h4>';
                chamados.pendentes.forEach(card => listaPendentesEl.appendChild(card));
            }
            if (chamados.emAndamento.length > 0) {
                listaEmAndamentoEl.innerHTML += '<h4>Em Andamento</h4>';
                chamados.emAndamento.forEach(card => listaEmAndamentoEl.appendChild(card));
            }
            if (chamados.aguardandoPeca.length > 0) {
                listaAguardandoPecaEl.innerHTML += '<h4>Aguardando Peça</h4>';
                chamados.aguardandoPeca.forEach(card => listaAguardandoPecaEl.appendChild(card));
            }
        }

        if (chamados.resolvidos.length === 0) {
            listaResolvidosEl.innerHTML = `<p class="empty-category-message">Nenhum chamado foi resolvido ainda.</p>`;
        } else {
            chamados.resolvidos.forEach(card => listaResolvidosEl.appendChild(card));
        }

        // --- MELHORIA: Atualiza os gráficos com os novos dados ---
        atualizarGraficos(todosOsChamados);

        isFirstLoad = false; // Marca que o primeiro carregamento já ocorreu
    });
}

// --- MELHORIA: Função para criar/atualizar os gráficos ---
function atualizarGraficos(chamados) {
    const ctxStatus = document.getElementById('graficoStatus').getContext('2d');
    const ctxSetores = document.getElementById('graficoSetores').getContext('2d');

    // 1. Gráfico de Chamados por Status
    const contagemStatus = chamados.reduce((acc, chamado) => {
        const status = chamado.status || 'Pendente';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    if (graficoStatusInstance) graficoStatusInstance.destroy();
    graficoStatusInstance = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: Object.keys(contagemStatus),
            datasets: [{
                label: 'Chamados por Status',
                data: Object.values(contagemStatus),
                backgroundColor: ['#f39c12', '#3498db', '#e74c3c', '#2ecc71'],
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Chamados por Status' }
            }
        }
    });

    // 2. Gráfico de Chamados por Setor
    const contagemSetores = chamados.reduce((acc, chamado) => {
        const setor = chamado.setor || 'Não informado';
        acc[setor] = (acc[setor] || 0) + 1;
        return acc;
    }, {});

    if (graficoSetoresInstance) graficoSetoresInstance.destroy();
    graficoSetoresInstance = new Chart(ctxSetores, {
        type: 'bar',
        data: {
            labels: Object.keys(contagemSetores),
            datasets: [{
                label: 'Nº de Chamados',
                data: Object.values(contagemSetores),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Deixa o gráfico deitado (barras horizontais)
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Chamados por Setor' }
            }
        }
    });
}

// --- MELHORIA 2: Para de piscar o título quando o usuário volta para a aba ---
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        clearInterval(intervalId);
        intervalId = null;
        document.title = originalTitle;
    }
});


// Event Listeners para Ações

const filtroInput = document.getElementById('filtro');

// Event listener para o campo de filtro
filtroInput.addEventListener('input', () => {
    const termo = filtroInput.value.toLowerCase();
    const todosOsCards = document.querySelectorAll('.chamado-card');

    todosOsCards.forEach(card => {
        const chamado = JSON.parse(card.dataset.chamado);
        const nome = chamado.nome.toLowerCase();
        const setor = chamado.setor.toLowerCase();
        const problema = chamado.problema.toLowerCase();

        if (nome.includes(termo) || setor.includes(termo) || problema.includes(termo)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});

// Logout
btnLogout.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
    }
});

// Exportar para Excel
btnExportarExcel.addEventListener('click', () => {
    if (todosOsChamados.length === 0) {
        alert('Não há chamados para exportar.');
        return;
    }

    // Formata os dados para a planilha
    const dadosParaExportar = todosOsChamados.map(chamado => {
        return {
            'Data de Abertura': chamado.dataAbertura ? chamado.dataAbertura.toDate().toLocaleString('pt-BR') : 'N/A',
            'Solicitante': chamado.nome,
            'Setor': chamado.setor,
            'Problema': chamado.problema,
            'Urgência': chamado.urgencia,
            'Status': chamado.status,
            'Peça Aguardando': chamado.pecaAguardando || '',
            'Resolução': chamado.resolucao || ''
        };
    });

    // Cria a planilha a partir do array de objetos
    const worksheet = XLSX.utils.json_to_sheet(dadosParaExportar);

    // Cria um novo workbook
    const workbook = XLSX.utils.book_new();

    // Adiciona a planilha ao workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chamados');

    // Gera o arquivo .xlsx e dispara o download
    const nomeArquivo = `Relatorio_Chamados_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(workbook, nomeArquivo);
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