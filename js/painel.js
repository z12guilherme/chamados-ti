// js/painel.js
import { db, auth, dbFunctions, authFunctions } from './firebase-init.js';

const { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs, limit, startAfter, where, serverTimestamp, arrayUnion, getDoc } = dbFunctions;
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

// CORREÇÃO: Reintroduzindo os elementos do Modal
const modalAnexo = document.getElementById('modalAnexo');
const imgAnexoViewer = document.getElementById('imgAnexoViewer');
const closeViewerBtn = document.querySelector('.close-viewer');


let chamadoIdParaAcao = null; // Armazena o ID do chamado para exclusão ou mudança de status
let chamadoAtualParaStatus = null; // Armazena os dados do chamado para o modal de status
let todosOsChamados = []; // Armazena todos os chamados para a exportação

// --- MELHORIA: Gráficos ---
let graficoStatusInstance = null;
let graficoSetoresInstance = null;
let graficoUrgenciaInstance = null;

// --- MELHORIA: Notificações no Navegador ---
// Solicita permissão para notificações assim que o painel carrega
if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission();
}
let isFirstLoad = true; // Flag para evitar notificação no primeiro carregamento

// --- MELHORIA 2: Alerta Sonoro e Visual na Aba ---
const audio = new Audio('assets/sounds/notification.mp3');
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
    // Reintroduzida a ordenação por data para exibir os chamados mais recentes primeiro.
    const q = query(collection(db, "chamados"), orderBy("dataAbertura", "desc"));

    onSnapshot(q, (querySnapshot) => {
        if (isFirstLoad) {
            loader.style.display = 'none';
            // No primeiro carregamento, preenche a lista 'todosOsChamados'
            todosOsChamados = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        }

        querySnapshot.docChanges().forEach((change) => {
            const chamado = { ...change.doc.data(), id: change.doc.id };
            const status = (chamado.status || 'Pendente').trim().toLowerCase();

            if (change.type === "added") {
                if (!isFirstLoad) {
                    // Adiciona ao array global apenas se não for o primeiro carregamento
                    todosOsChamados.unshift(chamado); // Adiciona no início
                    dispararNotificacao(chamado);
                }
                const card = criarCardChamado(chamado);
                adicionarCardNaLista(card, status);
            }

            if (change.type === "modified") {
                const index = todosOsChamados.findIndex(c => c.id === chamado.id);
                if (index > -1) {
                    todosOsChamados[index] = chamado;
                }

                const cardExistente = document.querySelector(`.chamado-card[data-id="${chamado.id}"]`);
                if (cardExistente) {
                    const statusAntigo = cardExistente.dataset.status;

                    // Otimização: Se o status mudou, movemos o card. Senão, apenas atualizamos o conteúdo.
                    if (statusAntigo !== status) {
                        // O status mudou, então o card precisa ser movido para outra lista.
                        cardExistente.remove();
                        const novoCard = criarCardChamado(chamado); // Recria o card para a nova lista
                        adicionarCardNaLista(novoCard, status);
                    } else {
                        // O status é o mesmo, então apenas atualizamos o card existente.
                        // Isso é muito mais performático do que recriar o elemento.
                        atualizarCardExistente(cardExistente, chamado);
                    }
                }
            }

            if (change.type === "removed") {
                todosOsChamados = todosOsChamados.filter(c => c.id !== chamado.id);
                const cardParaRemover = document.querySelector(`.chamado-card[data-id="${chamado.id}"]`);
                if (cardParaRemover) {
                    cardParaRemover.remove();
                }
            }
        });

        // --- MELHORIA: Atualiza os gráficos com os novos dados ---
        // A lista 'todosOsChamados' agora está sempre atualizada.
        atualizarGraficos(todosOsChamados);

        // ADIÇÃO: Verifica e exibe mensagens de lista vazia
        verificarEmptyStates();
        isFirstLoad = false; // Marca que o primeiro carregamento já ocorreu
    });
}

function adicionarCardNaLista(card, status) {
    let lista;
    switch (status) {
        case 'em-andamento':
            lista = listaEmAndamentoEl;
            break;
        case 'aguardando-peça':
            lista = listaAguardandoPecaEl;
            break;
        case 'resolvido':
            lista = listaResolvidosEl;
            break;
        default:
            lista = listaPendentesEl;
    }
    // Adiciona o novo card no topo da lista correspondente
    lista.insertBefore(card, lista.children[1]); // Insere depois do título h4
}

/**
 * OTIMIZAÇÃO: Atualiza um card existente no DOM sem recriá-lo.
 * @param {HTMLElement} cardElement O elemento do card a ser atualizado.
 * @param {object} chamadoData Os novos dados do chamado.
 */
function atualizarCardExistente(cardElement, chamadoData) {
    const novoCardHTML = criarCardChamado(chamadoData).innerHTML;
    cardElement.innerHTML = novoCardHTML;
    cardElement.dataset.chamado = JSON.stringify(chamadoData); // Atualiza os dados no dataset
}

/**
 * ADIÇÃO: Verifica se as listas de chamados estão vazias e exibe uma mensagem.
 */
function verificarEmptyStates() {
    const listas = [
        listaPendentesEl,
        listaEmAndamentoEl,
        listaAguardandoPecaEl,
        listaResolvidosEl
    ];
    listas.forEach(lista => {
        const temCards = lista.querySelector('.chamado-card');
        const mensagem = lista.querySelector('.empty-state-message');
        if (mensagem) mensagem.style.display = temCards ? 'none' : 'block';
    });
}

function dispararNotificacao(chamado) {
    // Notificação de Desktop
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Novo Chamado Aberto!', {
            body: `Solicitante: ${chamado.nome}\nSetor: ${chamado.setor}`,
        });
    }

    // Tocar som e piscar título
    audio.play().catch(e => console.log("Não foi possível tocar o som."));
    if (!intervalId) {
        intervalId = setInterval(() => {
            document.title = document.title === originalTitle ? '*** NOVO CHAMADO! ***' : originalTitle;
        }, 1000);
    }
}

// --- MELHORIA: Função para criar/atualizar os gráficos ---
function atualizarGraficos(chamados) {
    const ctxStatus = document.getElementById('graficoStatus').getContext('2d');
    const ctxSetores = document.getElementById('graficoSetores').getContext('2d');
    const ctxUrgencia = document.getElementById('graficoUrgencia').getContext('2d');

    // --- Lógica para os KPIs ---
    const totalChamados = chamados.length;
    const totalPendentes = chamados.filter(c => (c.status || '').toLowerCase() === 'pendente').length;
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();
    const resolvidosNoMes = chamados.filter(c => {
        const statusResolvido = (c.status || '').toLowerCase() === 'resolvido';
        if (statusResolvido && c.resolucao?.data) {
            const dataResolucao = c.resolucao.data.toDate();
            return dataResolucao.getMonth() === mesAtual && dataResolucao.getFullYear() === anoAtual;
        }
        return false;
    }).length;

    document.getElementById('kpi-total').textContent = totalChamados;
    document.getElementById('kpi-pendentes').textContent = totalPendentes;
    document.getElementById('kpi-resolvidos-mes').textContent = resolvidosNoMes;

    // --- Cores dinâmicas baseadas no tema ---
    const style = getComputedStyle(document.body);
    const corTexto = style.getPropertyValue('--text-secondary');
    const corGrid = style.getPropertyValue('--border-color');
    const coresGrafico = [
        style.getPropertyValue('--primary-color'),
        style.getPropertyValue('--success-color'),
        style.getPropertyValue('--warning-color'),
        style.getPropertyValue('--danger-color'),
        '#bb9af7', // Roxo do tema escuro
        '#7dcfff'  // Azul claro do tema escuro
    ];

    // 1. Gráfico de Chamados por Status
    const contagemStatus = chamados.reduce((acc, chamado) => {
        const statusRaw = (chamado.status || 'pendente').trim();
        const statusDisplay = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);
        acc[statusDisplay] = (acc[statusDisplay] || 0) + 1;
        return acc;
    }, {});

    if (graficoStatusInstance) graficoStatusInstance.destroy();
    graficoStatusInstance = new Chart(ctxStatus, {
        type: 'bar',
        data: {
            labels: Object.keys(contagemStatus),
            datasets: [{
                label: 'Chamados por Status',
                data: Object.values(contagemStatus),
                backgroundColor: coresGrafico,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Chamados por Status', color: corTexto, font: { size: 16 } }
            },
            scales: {
                y: { ticks: { color: corTexto }, grid: { color: corGrid } },
                x: { ticks: { color: corTexto }, grid: { color: 'transparent' } }
            }
        }
    });

    // 2. Gráfico de Chamados por Setor
    let contagemSetores = chamados.reduce((acc, chamado) => {
        let setor = chamado.setor || 'Não Informado';
        const setorNormalizado = setor
            .trim()
            .toLowerCase()
            .split(' ')
            .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
            .join(' ');
        acc[setorNormalizado] = (acc[setorNormalizado] || 0) + 1;
        return acc;
    }, {});

    const LIMITE_SETORES = 7;
    let setoresOrdenados = Object.entries(contagemSetores).sort(([, a], [, b]) => b - a);

    let labelsSetores = [];
    let dadosSetores = [];

    if (setoresOrdenados.length > LIMITE_SETORES) {
        const topSetores = setoresOrdenados.slice(0, LIMITE_SETORES);
        const outrosSetores = setoresOrdenados.slice(LIMITE_SETORES);
        
        topSetores.forEach(([setor, contagem]) => {
            labelsSetores.push(setor);
            dadosSetores.push(contagem);
        });

        const contagemOutros = outrosSetores.reduce((acc, [, contagem]) => acc + contagem, 0);
        labelsSetores.push('Outros');
        dadosSetores.push(contagemOutros);
    } else {
        setoresOrdenados.forEach(([setor, contagem]) => {
            labelsSetores.push(setor);
            dadosSetores.push(contagem);
        });
    }

    if (graficoSetoresInstance) graficoSetoresInstance.destroy();
    graficoSetoresInstance = new Chart(ctxSetores, {
        type: 'doughnut',
        data: {
            labels: labelsSetores,
            datasets: [{
                label: 'Nº de Chamados',
                data: dadosSetores,
                backgroundColor: coresGrafico,
                borderColor: style.getPropertyValue('--surface-color'),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: corTexto } },
                title: { display: true, text: 'Chamados por Setor', color: corTexto, font: { size: 16 } }
            }
        }
    });

    // 3. NOVO: Gráfico de Chamados por Urgência
    const contagemUrgencia = chamados.reduce((acc, chamado) => {
        // CORREÇÃO: Normaliza para minúsculas e unifica 'media' e 'média' para garantir que sejam contadas juntas.
        let urgenciaRaw = (chamado.urgencia || 'baixa').toLowerCase();
        if (urgenciaRaw === 'media') {
            urgenciaRaw = 'média'; // Padroniza para a versão com acento.
        }

        const urgencia = urgenciaRaw.charAt(0).toUpperCase() + urgenciaRaw.slice(1);
        acc[urgencia] = (acc[urgencia] || 0) + 1;
        return acc;
    }, {});

    if (graficoUrgenciaInstance) graficoUrgenciaInstance.destroy();
    graficoUrgenciaInstance = new Chart(ctxUrgencia, {
        type: 'pie',
        data: {
            labels: Object.keys(contagemUrgencia),
            datasets: [{
                label: 'Chamados por Urgência',
                data: Object.values(contagemUrgencia),
                backgroundColor: [coresGrafico[3], coresGrafico[2], coresGrafico[0]], // Vermelho, Amarelo, Azul
                borderColor: style.getPropertyValue('--surface-color'),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Chamados por Classificação' }
            }
        }
    });
}

function criarCardChamado(chamado) {
    const id = chamado.id;
    const dataAbertura = chamado.dataAbertura ? chamado.dataAbertura.toDate().toLocaleString('pt-BR') : 'Data indisponível';
    const status = (chamado.status || 'Pendente').trim().toLowerCase();
    const statusClass = status.replace(/\s+/g, '-');
    const displayStatus = (chamado.status || 'Pendente').charAt(0).toUpperCase() + (chamado.status || 'Pendente').slice(1);

    if (status === 'resolvido' && !chamado.resolucao) {
        // Garante que a estrutura exista para evitar erros, mas não exibe nada se a descrição estiver faltando.
        chamado.resolucao = { descricao: "Resolução não informada." };
    }

    const resolucaoHtml = status === 'resolvido' && chamado.resolucao?.descricao
        ? `<div class="resolucao-info">
             <strong>Solução:</strong> ${chamado.resolucao.descricao}
             <span class="resolucao-data">Resolvido em: ${chamado.resolucao.data ? chamado.resolucao.data.toDate().toLocaleString('pt-BR') : 'Data não registrada'}</span>
           </div>`
        : '';

    // CORREÇÃO: A lógica de anexo estava na função errada.
    let anexoHtml = '';
    if (chamado.anexoBase64) {
        anexoHtml = `<div class="anexo-info">
             <a href="${chamado.anexoBase64}" class="anexo-link" data-id="${id}">Ver Anexo</a>
           </div>`;
    }
 
    const pecaHtml = status === 'aguardando-peça' && chamado.pecaAguardando
        ? `<div class="peca-info">
             <strong>Aguardando Peça:</strong> ${chamado.pecaAguardando}
           </div>` : '';

    // Combina com a lógica de anexo externo que já existia
    if (chamado.anexoUrl && !chamado.anexoBase64) {
        anexoHtml = `<div class="anexo-info">
             <a href="${chamado.anexoUrl}" class="anexo-link" target="_blank" rel="noopener noreferrer">Ver Anexo (Link Externo)</a>
           </div>`;
    }

    const urgenciaClass = chamado.urgencia ? `urgencia-${chamado.urgencia.toLowerCase()}` : '';
    const urgenciaHtml = chamado.urgencia
        ? `<span class="urgency-tag ${urgenciaClass}">${chamado.urgencia}</span>`
        : '';

    const card = document.createElement('div');
    card.className = `chamado-card ${statusClass.replace(/\s+/g, '-')}`;
    card.dataset.id = id;
    card.dataset.status = status; // OTIMIZAÇÃO: Adiciona o status ao dataset para fácil acesso
    card.dataset.chamado = JSON.stringify(chamado);

    card.innerHTML = `
        <div class="card-header">
            <div class="solicitante-info">
                <span class="protocolo-info">${chamado.protocolo || 'S/P'}</span>
                <span class="solicitante-nome">${chamado.nome}</span>
                <span class="solicitante-setor">Setor: ${chamado.setor}</span>
            </div>
            <div class="status-container" style="display: flex; align-items: center; gap: 10px;">
                ${urgenciaHtml}
                <span class="status-tag ${statusClass}">${displayStatus}</span>
            </div>
        </div>
        <div class="problema-resumo">
            <p>${chamado.problema}</p>
        </div>
        ${anexoHtml}
        ${pecaHtml}
        ${resolucaoHtml}
        <div class="card-footer">
            <div class="data-abertura">Aberto em: ${dataAbertura}</div>
            <button class="btn-status" data-id="${id}" title="Alterar status do chamado">Atualizar Status</button>
            ${status === 'resolvido' ? `<button class="btn-reabrir" data-id="${id}">Reabrir</button>` : ''}
            <button class="btn-remover" data-id="${id}">Remover</button>
        </div>
    `;
    return card;
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

const filtroTextoInput = document.getElementById('filtro');
const filtroStatusSelect = document.getElementById('filtroStatus');
const filtroUrgenciaSelect = document.getElementById('filtroUrgencia');
const btnLimparFiltros = document.getElementById('btnLimparFiltros');

// --- MELHORIA: Debounce para o filtro ---
let debounceTimer;

function filtrarChamados() {
    const termo = filtroTextoInput.value.toLowerCase().trim();
    const statusFiltro = filtroStatusSelect.value;
    const urgenciaFiltro = filtroUrgenciaSelect.value;
    const todosOsCards = document.querySelectorAll('.chamado-card');

    todosOsCards.forEach(card => {
        // Pega os dados do dataset, que é mais confiável
        const chamadoData = JSON.parse(card.dataset.chamado);

        // 1. Verifica o filtro de texto
        const textoParaBuscar = [
            chamadoData.protocolo || '',
            chamadoData.nome || '',
            chamadoData.setor || '',
            chamadoData.problema || ''
        ].join(' ').toLowerCase();
        const matchTexto = textoParaBuscar.includes(termo);

        // 2. Verifica o filtro de status
        const matchStatus = !statusFiltro || (chamadoData.status || '').toLowerCase() === statusFiltro.toLowerCase();

        // 3. Verifica o filtro de urgência
        const matchUrgencia = !urgenciaFiltro || (chamadoData.urgencia || '').toLowerCase() === urgenciaFiltro;

        // O card só é exibido se todas as condições forem verdadeiras
        card.style.display = matchTexto && matchStatus && matchUrgencia ? 'block' : 'none';
    });
}

function limparFiltros() {
    filtroTextoInput.value = '';
    filtroStatusSelect.value = '';
    filtroUrgenciaSelect.value = '';
    filtrarChamados();
}

filtroTextoInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        filtrarChamados();
    }, 300); // Atraso de 300ms
});

filtroStatusSelect.addEventListener('change', filtrarChamados);
filtroUrgenciaSelect.addEventListener('change', filtrarChamados);
btnLimparFiltros.addEventListener('click', limparFiltros);


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

    // Ação 1: Visualizar o anexo (tratada com prioridade)
    if (target.classList.contains('anexo-link')) {
        // Verifica se é um anexo interno (com data-id) e não um link externo
        if (target.dataset.id && !target.getAttribute('href').startsWith('http')) {
            e.preventDefault(); // Impede que o link '#' navegue
            const chamadoId = target.dataset.id;
            const chamadoCompleto = todosOsChamados.find(c => c.id === chamadoId);
    
            if (chamadoCompleto && chamadoCompleto.anexoBase64) {
                const tipoAnexo = chamadoCompleto.anexoInfo?.tipo || '';
    
                if (tipoAnexo.startsWith('image/')) {
                    // Se for imagem, abre no modal
                    abrirModalAnexo(chamadoCompleto.anexoBase64);
                } else {
                    // Se for PDF ou outro tipo, abre em nova aba
                    window.open(chamadoCompleto.anexoBase64, '_blank');
                }
            }
        }
        return; // Encerra a execução aqui, pois a ação de anexo já foi tratada.
    }

    // Ações 2, 3, 4... (Alterar, Remover, Reabrir)
    if (!target.dataset.id) return;

    if (target.classList.contains('btn-remover')) {
        chamadoIdParaAcao = target.dataset.id; // Armazena o ID para a ação de exclusão
        modalConfirmacao.style.display = 'flex';
    }

    if (target.classList.contains('btn-status')) {
        const card = target.closest('.chamado-card');
        chamadoAtualParaStatus = JSON.parse(card.dataset.chamado);
        
        selectStatus.value = chamadoAtualParaStatus.status || 'Pendente';
        const statusNormalizado = (chamadoAtualParaStatus.status || '').toLowerCase();
        textoResolucao.value = chamadoAtualParaStatus.resolucao?.descricao || '';
        campoResolucao.style.display = statusNormalizado === 'resolvido' ? 'block' : 'none';
        textoPeca.value = chamadoAtualParaStatus.pecaAguardando || '';
        campoPeca.style.display = statusNormalizado === 'aguardando-peça' ? 'block' : 'none';
        validarFormStatus(); // Valida o formulário ao abrir
        modalStatus.style.display = 'flex';
    }

    if (target.classList.contains('btn-reabrir')) {
        const chamadoId = target.dataset.id;
        const chamadoRef = doc(db, "chamados", chamadoId);
        updateDoc(chamadoRef, {
            status: 'pendente',
            resolucao: null, // Limpa a resolução anterior
            // CORREÇÃO: Padroniza a estrutura do objeto de histórico
            historico: arrayUnion({
                descricao: 'Chamado reaberto pelo painel.',
                timestamp: new Date(),
                usuario: auth.currentUser.email
            })
        }).then(() => {
            console.log(`Chamado ${chamadoId} reaberto.`);
        });
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

// CORREÇÃO: Funções para controlar o Modal de Anexo
function abrirModalAnexo(src) {
    modalAnexo.style.display = "block";
    imgAnexoViewer.src = src;
}

// Fecha o modal ao clicar no 'X'
closeViewerBtn.onclick = function() {
    modalAnexo.style.display = "none";
}


// Ações do Modal de Status
btnStatusCancelar.addEventListener('click', () => {
    modalStatus.style.display = 'none';
    campoResolucao.style.display = 'none';
    campoPeca.style.display = 'none';
    chamadoIdParaAcao = null;
    chamadoAtualParaStatus = null;
});
function validarFormStatus() {
    // CORREÇÃO: Garante que os campos de texto sejam exibidos ou ocultados
    // de acordo com o status selecionado ANTES de validar.
    const status = selectStatus.value.toLowerCase(); // Normaliza para minúsculas
    if (status === 'resolvido') {
        campoResolucao.style.display = 'block';
        campoPeca.style.display = 'none';
    } else if (status === 'aguardando-peça') {
        campoResolucao.style.display = 'none';
        campoPeca.style.display = 'block';
    } else {
        campoResolucao.style.display = 'none';
        campoPeca.style.display = 'none';
    }
    const statusSelecionado = selectStatus.value;
    const resolucaoTexto = textoResolucao.value.trim();
    const pecaTexto = textoPeca.value.trim();

    if (statusSelecionado.toLowerCase() === 'resolvido' && resolucaoTexto === '') {
        btnSalvarStatus.disabled = true;
    } else if (statusSelecionado.toLowerCase() === 'aguardando-peça' && pecaTexto === '') {
        btnSalvarStatus.disabled = true;
    } else {
        btnSalvarStatus.disabled = false;
    }
}

selectStatus.addEventListener('change', () => {
    validarFormStatus();
});

textoResolucao.addEventListener('input', validarFormStatus);
textoPeca.addEventListener('input', validarFormStatus);


formStatus.addEventListener('submit', async (e) => {
    e.preventDefault();
    // CORREÇÃO: Usa o ID do 'chamadoAtualParaStatus' que já está em memória,
    // em vez de depender de uma variável que pode não estar definida.
    if (chamadoAtualParaStatus && chamadoAtualParaStatus.id) {
        const novoStatus = selectStatus.value;
        const chamadoId = chamadoAtualParaStatus.id;
        const chamadoRef = doc(db, "chamados", chamadoId);

        // CORREÇÃO: Para contornar a limitação do serverTimestamp com arrayUnion,
        // lemos o documento, atualizamos o array em memória e salvamos de volta.
        const docSnap = await getDoc(chamadoRef);
        const chamadoAtual = docSnap.data();
        const novoHistorico = chamadoAtual.historico || [];
        // CORREÇÃO: Padroniza a estrutura do objeto de histórico
        novoHistorico.push({
            descricao: `Status alterado para: ${novoStatus}`,
            timestamp: new Date(),
            usuario: auth.currentUser.email
        });

        let dadosParaAtualizar = { // Objeto base com as atualizações padrão
            status: novoStatus,
            historico: novoHistorico,
            // Limpa campos antigos para evitar dados inconsistentes
            ...(chamadoAtual.resolucao && { resolucao: null }),
            ...(chamadoAtual.pecaAguardando && { pecaAguardando: null })
        };

        if (novoStatus === 'resolvido') {
            if (textoResolucao.value.trim() === '') {
                alert('Por favor, descreva como o problema foi resolvido.');
                return;
            }
            dadosParaAtualizar = {
                ...dadosParaAtualizar,
                resolucao: {
                    descricao: textoResolucao.value.trim(),
                    data: serverTimestamp()
                }
            };
        } else if (novoStatus === 'aguardando-peça') {
            if (textoPeca.value.trim() === '') {
                alert('Por favor, informe qual peça está sendo aguardada.');
                return;
            }
            dadosParaAtualizar.pecaAguardando = textoPeca.value.trim(); // Adiciona o campo diretamente
        }

        await updateDoc(chamadoRef, dadosParaAtualizar);
        modalStatus.style.display = 'none';
        chamadoAtualParaStatus = null;
    }
});