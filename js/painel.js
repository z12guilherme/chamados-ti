// js/painel.js
import { db, auth, dbFunctions, authFunctions } from './firebase-init.js';

const { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs, limit, startAfter, where, serverTimestamp, arrayUnion, getDoc } = dbFunctions;
const { onAuthStateChanged, signOut } = authFunctions;

// Declaração de variáveis globais que não dependem do DOM
let btnLogout, btnExportarExcel, loader, btnModalConfirmar, modalStatus, formStatus, selectStatus, btnStatusCancelar, listaAtivosEl, listaResolvidosEl, modalConfirmacao, btnModalCancelar;
let campoResolucao, textoResolucao, campoPeca, textoPeca, btnSalvarStatus, modalAnexo, imgAnexoViewer, closeViewerBtn, btnCarregarMaisResolvidos;
let btnCarregarMais;

let chamadoIdParaAcao = null;
let chamadoAtualParaStatus = null;
let todosOsChamados = [];

let graficoStatusInstance = null;
let graficoSetoresInstance = null;
let graficoUrgenciaInstance = null;
let graficoMensalInstance = null; // NOVO: Instância para o gráfico mensal

let ultimoDocumentoVisivel = null;
const CHAMADOS_POR_PAGINA = 25;
let carregandoMais = false;

let isFirstLoad = true;
let originalTitle, intervalId = null;


// SOLUÇÃO: Envolve toda a lógica que depende do DOM em um listener.
document.addEventListener('DOMContentLoaded', () => {
    // CORREÇÃO: Mover a inicialização para o topo do listener para garantir que as variáveis existam.
    // Inicialização de variáveis que dependem do DOM
    btnLogout = document.getElementById('btnLogout');
    btnExportarExcel = document.getElementById('btnExportarExcel');
    loader = document.querySelector('.loader');
    listaAtivosEl = document.getElementById('lista-ativos');
    listaResolvidosEl = document.getElementById('lista-resolvidos'); // CORREÇÃO: Variável não inicializada
    listaResolvidosEl = document.getElementById('lista-resolvidos');
    modalConfirmacao = document.getElementById('modalConfirmacao');
    btnModalCancelar = document.getElementById('btnModalCancelar');
    btnModalConfirmar = document.getElementById('btnModalConfirmar');
    modalStatus = document.getElementById('modalStatus');
    formStatus = document.getElementById('formStatus');
    selectStatus = document.getElementById('novoStatus');
    btnStatusCancelar = document.getElementById('btnStatusCancelar');
    campoResolucao = document.getElementById('campoResolucao');
    textoResolucao = document.getElementById('textoResolucao');
    campoPeca = document.getElementById('campoPeca');
    textoPeca = document.getElementById('textoPeca');
    btnSalvarStatus = document.querySelector('#formStatus button[type="submit"]');
    modalAnexo = document.getElementById('modalAnexo');
    imgAnexoViewer = document.getElementById('imgAnexoViewer');
    closeViewerBtn = document.querySelector('.close-viewer');
    btnCarregarMaisResolvidos = document.getElementById('btnCarregarMaisResolvidos');

    // --- MELHORIA: Elementos para Paginação ---
    btnCarregarMais = document.createElement('button');
    btnCarregarMais.id = 'btnCarregarMais';
    btnCarregarMais.className = 'btn-carregar-mais';
    btnCarregarMais.innerHTML = '<i class="fas fa-plus"></i> Carregar Mais Chamados';
    // Esta linha agora funcionará, pois '.main-content' já existe.
    if (document.querySelector('.main-content')) {
    document.querySelector('.main-content').appendChild(btnCarregarMais);
    }

    // --- MELHORIA: Notificações no Navegador ---
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

    // --- MELHORIA 2: Alerta Sonoro e Visual na Aba ---
    originalTitle = document.title;

    // --- MELHORIA: Injetar Modal de Histórico ---
    criarModalHistorico();
    adicionarEventListeners();
    inicializarPainel(); // Garante que a lógica de autenticação e carregamento comece aqui.
});

function inicializarPainel() {

    // Proteção de Rota e Carregamento de Dados
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Agora, quando carregarChamados for chamado, 'loader' e outros elementos já existirão.
            carregarChamados();
        } else {
            window.location.href = 'login.html';
        }
    });
}

/**
 * MELHORIA: Função para carregar chamados com paginação.
 * @param {boolean} carregarMais - Se true, busca a próxima "página" de chamados.
 */
async function carregarChamados(carregarMais = false) {
    if (carregandoMais) return;
    carregandoMais = true;

    let q;
    const chamadosRef = collection(db, "chamados");

    if (carregarMais && ultimoDocumentoVisivel) {
        btnCarregarMais.textContent = 'Carregando...';
        q = query(chamadosRef, orderBy("dataAbertura", "desc"), startAfter(ultimoDocumentoVisivel), limit(CHAMADOS_POR_PAGINA)); // CORREÇÃO DE SINTAXE
    } else {
        loader.style.display = 'flex';
        // Limpa o array e as listas para a carga inicial
        todosOsChamados = []; // Limpa o array de chamados
        listaAtivosEl.innerHTML = '';
        if(listaResolvidosEl) listaResolvidosEl.innerHTML = '';
        q = query(chamadosRef, orderBy("dataAbertura", "desc"), limit(CHAMADOS_POR_PAGINA));
    }

        try {
            const querySnapshot = await getDocs(q);
            ultimoDocumentoVisivel = querySnapshot.docs[querySnapshot.docs.length - 1];

            querySnapshot.forEach((doc) => {
                const chamado = { ...doc.data(), id: doc.id };
                if (!todosOsChamados.some(c => c.id === chamado.id)) {
                    todosOsChamados.push(chamado);
                    adicionarCardNaColunaCorreta(criarCardChamado(chamado), chamado.status);
                }
            });
            // Mostra o botão "Carregar Mais"
            btnCarregarMais.style.display = querySnapshot.docs.length < CHAMADOS_POR_PAGINA ? 'none' : 'block';

            if (isFirstLoad) {
                escutarTodasAsAlteracoes(); // Inicia o listener de tempo real APÓS a primeira carga
            }
        } catch (error) {
            console.error("Erro ao carregar chamados:", error);
        } finally {
            loader.style.display = 'none';
            btnCarregarMais.innerHTML = '<i class="fas fa-plus"></i> Carregar Mais Chamados';
            carregandoMais = false;
            if (isFirstLoad) {
                isFirstLoad = false;
                filtrarChamados(); // CORREÇÃO: Usa a função de filtro para a renderização inicial
            }
        }
}

/**
 * CORREÇÃO: A função agora escuta todas as alterações na coleção, não apenas os novos chamados.
 * Isso garante que modificações e exclusões de chamados existentes sejam refletidas em tempo real.
 */
function escutarTodasAsAlteracoes() {
    const q = query(collection(db, "chamados"));

    onSnapshot(q, (querySnapshot) => {
        querySnapshot.docChanges().forEach((change) => {
            const chamado = { ...change.doc.data(), id: change.doc.id };
            const status = (chamado.status || 'Pendente').trim().toLowerCase();

            if (change.type === "added") {
                // Evita duplicar os chamados que já foram carregados na carga inicial
                if (todosOsChamados.some(c => c.id === chamado.id)) {
                    return;
                }

                // Adiciona ao array global apenas se não for o primeiro carregamento
                todosOsChamados.unshift(chamado); // Adiciona no início
                dispararNotificacao(chamado);
                adicionarCardNaColunaCorreta(criarCardChamado(chamado), status, true); // Adiciona no topo
            }

            if (change.type === "modified") {
                // console.log("Chamado modificado:", chamado.id);
                const index = todosOsChamados.findIndex(c => c.id === chamado.id);
                if (index > -1) {
                    todosOsChamados[index] = chamado;
                }

                const cardExistente = document.querySelector(`.chamado-card[data-id="${chamado.id}"]`);
                if (cardExistente) {
                    // Apenas atualiza o array, a renderização cuidará do resto
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

        // Após qualquer mudança, re-renderiza a lista de chamados e atualiza os gráficos
        filtrarChamados();
    });
}

function adicionarCardNaColunaCorreta(card, status, adicionarNoTopo = false) {
    const statusNormalizado = (status || 'pendente').toLowerCase();
    let colunaDestino;

    if (statusNormalizado === 'resolvido' && listaResolvidosEl) {
        colunaDestino = listaResolvidosEl;
    } else {
        colunaDestino = listaAtivosEl;
    }

    if (adicionarNoTopo && colunaDestino.firstChild) {
        colunaDestino.insertBefore(card, colunaDestino.firstChild);
    } else {
        colunaDestino.appendChild(card);
    }
}

/**
 * OTIMIZAÇÃO: Atualiza um card existente no DOM sem recriá-lo.
 * @param {HTMLElement} cardElement O elemento do card a ser atualizado.
 * @param {object} chamadoData Os novos dados do chamado.
 */
function atualizarCardExistente(cardElement, chamadoData) {
    const novoCardHTML = criarCardChamado(chamadoData).innerHTML;
    cardElement.innerHTML = novoCardHTML;
    // Atualiza classes importantes para estilo
    const statusClass = (chamadoData.status || 'pendente').replace(/\s+/g, '-');
    cardElement.className = `chamado-card ${statusClass}`;
}

/**
 * ADIÇÃO: Verifica se as listas de chamados estão vazias e exibe uma mensagem.
 */
function verificarEmptyStates() {
    const board = document.querySelector('.chamados-board');
    const temCards = board ? board.querySelector('.chamado-card') : null;
    // Aqui você pode adicionar uma mensagem de "Nenhum chamado encontrado" se o container estiver vazio.
}

function dispararNotificacao(chamado) {
    // Notificação de Desktop
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Novo Chamado Aberto!', {
            body: `Solicitante: ${chamado.nome}\nSetor: ${chamado.setor}`,
        });
    }

    // Piscar título
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
    const ctxMensal = document.getElementById('graficoMensal').getContext('2d'); // NOVO: Contexto do novo gráfico

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

    // 4. NOVO: Gráfico de Chamados Abertos por Mês (últimos 6 meses)
    const contagemMensal = {};
    const meses = [];
    const hoje = new Date();

    // Gera as labels para os últimos 6 meses
    for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const mesAno = `${d.toLocaleString('pt-BR', { month: 'short' })}/${d.getFullYear().toString().slice(-2)}`;
        meses.push(mesAno);
        contagemMensal[mesAno] = 0;
    }

    chamados.forEach(chamado => {
        if (chamado.dataAbertura) {
            const data = toJsDate(chamado.dataAbertura);
            const mesAno = `${data.toLocaleString('pt-BR', { month: 'short' })}/${data.getFullYear().toString().slice(-2)}`;
            if (mesAno in contagemMensal) {
                contagemMensal[mesAno]++;
            }
        }
    });

    if (graficoMensalInstance) graficoMensalInstance.destroy();
    graficoMensalInstance = new Chart(ctxMensal, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [{
                label: 'Chamados Abertos',
                data: Object.values(contagemMensal),
                backgroundColor: 'rgba(122, 162, 247, 0.2)',
                borderColor: 'rgba(122, 162, 247, 1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Chamados Abertos por Mês', color: corTexto, font: { size: 16 } }
            },
            scales: { y: { beginAtZero: true, ticks: { color: corTexto }, grid: { color: corGrid } }, x: { ticks: { color: corTexto }, grid: { color: 'transparent' } } }
        }
    });
}

function criarCardChamado(chamado) {
    const id = chamado.id;
    // CORREÇÃO: O timestamp do servidor pode ser nulo em um primeiro momento.
    // É preciso verificar sua existência antes de chamar toDate().
    const dataAbertura = chamado.dataAbertura ? chamado.dataAbertura.toDate().toLocaleString('pt-BR') : 'Processando...';
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
    // card.dataset.chamado = JSON.stringify(chamado); // MELHORIA: Removido para economizar memória

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
            <button class="btn-historico" data-id="${id}" title="Ver histórico do chamado"><i class="fas fa-history"></i> Histórico</button>
            <button class="btn-status" data-id="${id}" title="Alterar status do chamado"><i class="fas fa-edit"></i> Alterar Status</button>
            ${status === 'resolvido' ? '<button class="btn-reabrir" data-id="' + id + '" title="Reabrir chamado"><i class="fas fa-undo"></i> Reabrir</button>' : ''}
            <button class="btn-remover" data-id="${id}" title="Remover chamado"><i class="fas fa-trash"></i> Remover</button>
        </div>
    `;
    return card;
}


// Event Listeners para Ações

// --- MELHORIA: Paginação ---
function adicionarEventListeners() {
    // --- MELHORIA 2: Para de piscar o título quando o usuário volta para a aba ---
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            clearInterval(intervalId);
            intervalId = null;
            document.title = originalTitle;
        }
    });

    btnCarregarMais.addEventListener('click', () => carregarChamados(true));

    const filtroTextoInput = document.getElementById('filtro');
    const filtroStatusSelect = document.getElementById('filtroStatus');
    const filtroUrgenciaSelect = document.getElementById('filtroUrgencia');
    const btnLimparFiltros = document.getElementById('btnLimparFiltros');

    let debounceTimer;

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
    btnExportarExcel.addEventListener('click', async () => {
        const originalText = btnExportarExcel.innerHTML;
        btnExportarExcel.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
        btnExportarExcel.disabled = true;

        const todosOsDocsSnapshot = await getDocs(query(collection(db, "chamados"), orderBy("dataAbertura", "desc")));
        const chamadosParaExportar = todosOsDocsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        if (chamadosParaExportar.length === 0) {
            alert('Nenhum chamado encontrado para exportar.');
            btnExportarExcel.innerHTML = originalText;
            btnExportarExcel.disabled = false;
            return;
        }

        const dadosParaExportar = chamadosParaExportar.map(chamado => {
            return {
                'Data de Abertura': chamado.dataAbertura ? chamado.dataAbertura.toDate().toLocaleString('pt-BR') : 'N/A',
                'Solicitante': chamado.nome,
                'Setor': chamado.setor,
                'Problema': chamado.problema,
                'Urgência': chamado.urgencia,
                'Status': chamado.status,
                'Peça Aguardando': chamado.pecaAguardando || '',
                'Resolução': chamado.resolucao?.descricao || ''
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dadosParaExportar);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Chamados');
        const nomeArquivo = `Relatorio_Chamados_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(workbook, nomeArquivo);

        btnExportarExcel.innerHTML = originalText;
        btnExportarExcel.disabled = false;
    });

    // Delegação de eventos para os botões de ação nos cards
    // Otimização: Adiciona um listener ao container pai das duas colunas
    const board = document.querySelector('.chamados-board');
    if (board) {
        board.addEventListener('click', (e) => { 
        const target = e.target.closest('button, a'); // Garante que pegamos o botão ou link, mesmo clicando no ícone dentro dele
        if (!target) return;
        
        if (target.classList.contains('anexo-link') && !target.hasAttribute('target')) {
                e.preventDefault();
                const chamadoId = target.dataset.id;
                const chamadoCompleto = todosOsChamados.find(c => c.id === chamadoId);

                if (chamadoCompleto && chamadoCompleto.anexoBase64) {
                    const tipoAnexo = chamadoCompleto.anexoInfo?.tipo || '';
                    if (tipoAnexo.startsWith('image/')) {
                        abrirModalAnexo(chamadoCompleto.anexoBase64);
                    } else {
                        window.open(chamadoCompleto.anexoBase64, '_blank');
                    }
                }
        }

        if (!target.dataset.id) return;

        if (target.classList.contains('btn-remover')) {
            chamadoIdParaAcao = target.dataset.id;
            modalConfirmacao.style.display = 'flex';
        }

        if (target.classList.contains('btn-status')) {
            const card = target.closest('.chamado-card');
            // MELHORIA: Busca o chamado pelo ID em vez de usar o dataset
            chamadoAtualParaStatus = todosOsChamados.find(c => c.id === card.dataset.id);

            selectStatus.value = chamadoAtualParaStatus.status || 'Pendente';
            const statusNormalizado = (chamadoAtualParaStatus.status || '').toLowerCase();
            textoResolucao.value = chamadoAtualParaStatus.resolucao?.descricao || '';
            campoResolucao.style.display = statusNormalizado === 'resolvido' ? 'block' : 'none';
            textoPeca.value = chamadoAtualParaStatus.pecaAguardando || '';
            campoPeca.style.display = statusNormalizado === 'aguardando-peça' ? 'block' : 'none';
            validarFormStatus();
            modalStatus.style.display = 'flex';
        }

        if (target.classList.contains('btn-reabrir')) {
            const chamadoId = target.dataset.id;
            const chamadoRef = doc(db, "chamados", chamadoId);
            updateDoc(chamadoRef, {
                status: 'pendente',
                resolucao: null,
                historico: arrayUnion({
                    descricao: 'Chamado reaberto pelo painel.',
                    timestamp: new Date(),
                    usuario: auth.currentUser.email
                })
            }).then(() => {
                console.log(`Chamado ${chamadoId} reaberto.`);
            });
        }

        if (target.classList.contains('btn-historico')) {
            const card = target.closest('.chamado-card');
            // MELHORIA: Busca o chamado pelo ID em vez de usar o dataset
            const chamadoData = todosOsChamados.find(c => c.id === card.dataset.id);
            abrirModalHistorico(chamadoData);
        }
    });
    };

    // Ações do Modal de Exclusão
    btnModalCancelar.addEventListener('click', () => {
        modalConfirmacao.style.display = 'none';
        chamadoIdParaAcao = null;
    });

    btnModalConfirmar.addEventListener('click', async () => {
        if (chamadoIdParaAcao) {
            await deleteDoc(doc(db, "chamados", chamadoIdParaAcao));
            
            // MELHORIA: Remove o card da UI imediatamente para feedback visual rápido.
            const cardParaRemover = document.querySelector(`.chamado-card[data-id="${chamadoIdParaAcao}"]`);
            if (cardParaRemover) {
                cardParaRemover.remove();
            }
            modalConfirmacao.style.display = 'none';
            chamadoIdParaAcao = null;
        }
    });

    // --- MELHORIA: Event Listeners para Modais ---
    if (closeViewerBtn) {
        closeViewerBtn.onclick = () => { modalAnexo.style.display = "none"; };
    }

    // Evento para o novo botão "Carregar Mais" da coluna de resolvidos
    if (btnCarregarMaisResolvidos) {
        btnCarregarMaisResolvidos.addEventListener('click', mostrarTodosResolvidos);
    }

    // Ações do Modal de Status
    btnStatusCancelar.addEventListener('click', () => {
        modalStatus.style.display = 'none';
        campoResolucao.style.display = 'none';
        campoPeca.style.display = 'none';
        chamadoIdParaAcao = null;
        chamadoAtualParaStatus = null;
    });

    selectStatus.addEventListener('change', () => {
        validarFormStatus();
    });

    textoResolucao.addEventListener('input', validarFormStatus);
    textoPeca.addEventListener('input', validarFormStatus);

    formStatus.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (chamadoAtualParaStatus && chamadoAtualParaStatus.id) {
            const novoStatus = selectStatus.value;
            const chamadoId = chamadoAtualParaStatus.id;
            const chamadoRef = doc(db, "chamados", chamadoId);

            const docSnap = await getDoc(chamadoRef);
            const chamadoAtual = docSnap.data();
            const novoHistorico = chamadoAtual.historico || [];
            novoHistorico.push({
                descricao: `Status alterado para: ${novoStatus}`,
                timestamp: new Date(),
                usuario: auth.currentUser.email
            });

            let dadosParaAtualizar = {
                status: novoStatus,
                historico: novoHistorico,
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
                dadosParaAtualizar.pecaAguardando = textoPeca.value.trim();
            }

            await updateDoc(chamadoRef, dadosParaAtualizar);
            modalStatus.style.display = 'none';
            chamadoAtualParaStatus = null;
        }
    });
}

/**
 * MELHORIA: Renderiza os chamados nas listas corretas a partir de um array.
 * @param {Array} chamadosParaRenderizar - O array de chamados a serem exibidos.
 */
function renderizarChamados(chamadosParaRenderizar) {
    // 1. Limpa as colunas
    if(listaAtivosEl) listaAtivosEl.innerHTML = '';
    listaResolvidosEl.innerHTML = '';

    // 2. Separa os chamados em ativos e resolvidos
    const chamadosAtivos = chamadosParaRenderizar.filter(c => (c.status || 'pendente') !== 'resolvido');
    const chamadosResolvidos = chamadosParaRenderizar.filter(c => (c.status || 'pendente') === 'resolvido');

    // 3. Ordena os resolvidos pela data de resolução (mais recentes primeiro)
    chamadosResolvidos.sort((a, b) => {
        const dataA = a.resolucao?.data ? toJsDate(a.resolucao.data).getTime() : 0;
        const dataB = b.resolucao?.data ? toJsDate(b.resolucao.data).getTime() : 0;
        return dataB - dataA;
    });

    // 4. Renderiza os chamados nas colunas corretas
    chamadosAtivos.forEach(chamado => {
        adicionarCardNaColunaCorreta(criarCardChamado(chamado), chamado.status);
    });
    chamadosResolvidos.forEach(chamado => {
        adicionarCardNaColunaCorreta(criarCardChamado(chamado), chamado.status);
    });

    // Após renderizar, atualiza os gráficos e a visibilidade dos resolvidos
    atualizarGraficos(chamadosParaRenderizar);
    gerenciarVisibilidadeResolvidos(); // Atualiza a visibilidade após renderizar
}


function filtrarChamados() {
    const termo = document.getElementById('filtro').value.toLowerCase().trim();
    const statusFiltro = document.getElementById('filtroStatus').value;
    const urgenciaFiltro = document.getElementById('filtroUrgencia').value;

    const chamadosFiltrados = todosOsChamados.filter(chamado => {
        const textoParaBuscar = [ // CORREÇÃO: Lógica de busca estava incompleta
            chamado.protocolo || '',
            chamado.nome || '',
            chamado.setor || '',
            chamado.problema || '',
            chamado.resolucao?.descricao || ''
        ].join(' ').toLowerCase();

        const matchTexto = textoParaBuscar.includes(termo);
        const matchStatus = !statusFiltro || (chamado.status || '').toLowerCase() === statusFiltro.toLowerCase();
        const matchUrgencia = !urgenciaFiltro || (chamado.urgencia || '').toLowerCase() === urgenciaFiltro;
        return matchTexto && matchStatus && matchUrgencia;
    });

    // Renderiza apenas os chamados que passaram no filtro
    renderizarChamados(chamadosFiltrados);
}

function limparFiltros() {
    document.getElementById('filtro').value = '';
    document.getElementById('filtroStatus').value = '';
    document.getElementById('filtroUrgencia').value = '';
    filtrarChamados();
    // Ao limpar, renderiza todos os chamados carregados novamente
    renderizarChamados(todosOsChamados);
}

// --- SOLUÇÃO: Função que estava faltando ---
function validarFormStatus() {
    // Garante que os campos de texto sejam exibidos ou ocultados
    // de acordo com o status selecionado ANTES de validar.
    const status = selectStatus.value.toLowerCase();
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

    // Valida se o botão de salvar deve estar ativo
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

/**
 * Converte um objeto de data (seja Timestamp do Firebase ou objeto JSON) para um objeto Date de JS.
 * @param {object | {seconds: number, nanoseconds: number}} dateObject O objeto de data.
 * @returns {Date}
 */
function toJsDate(dateObject) {
    if (!dateObject) return new Date(); // Retorna data atual se for nulo
    if (dateObject.toDate) return dateObject.toDate(); // Já é um Timestamp
    if (dateObject.seconds) return new Date(dateObject.seconds * 1000); // É um objeto vindo de JSON
    return new Date(dateObject); // Tenta converter como string
}

// --- MELHORIA: Função para abrir o modal de anexo ---
function abrirModalAnexo(base64Data) {
    if (modalAnexo && imgAnexoViewer) {
        imgAnexoViewer.src = base64Data;
        modalAnexo.style.display = 'flex';
    } else {
        console.error("Modal de anexo ou visualizador de imagem não encontrado.");
    }
}

// --- MELHORIA: Funções para o Modal de Histórico ---
function criarModalHistorico() {
    const modalHtml = `
        <div id="modalHistorico" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Histórico do Chamado</h2>
                    <button id="btnHistoricoFechar" class="close-button">&times;</button>
                </div>
                <div class="modal-body" id="historicoConteudo">
                    <!-- O conteúdo do histórico será inserido aqui -->
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('modalHistorico');
    const btnFechar = document.getElementById('btnHistoricoFechar');

    btnFechar.addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', (e) => {
        if (e.target.id === 'modalHistorico') {
            modal.style.display = 'none';
        }
    });
}

function abrirModalHistorico(chamado) {
    const modal = document.getElementById('modalHistorico');
    const conteudo = document.getElementById('historicoConteudo');

    let historicoHtml = `
        <p><strong>Protocolo:</strong> ${chamado.protocolo || 'N/A'}</p>
        <p><strong>Solicitante:</strong> ${chamado.nome}</p>
        <hr>
        <ul class="historico-lista">
    `;

    // Adiciona o evento de abertura como o primeiro item
    historicoHtml += `
        <li>
            <div class="historico-item">
                <span class="historico-data">${toJsDate(chamado.dataAbertura).toLocaleString('pt-BR')}</span>
                <span class="historico-desc"><strong>Chamado Aberto</strong></span>
            </div>
        </li>`;

    if (chamado.historico && chamado.historico.length > 0) {
        chamado.historico.forEach(item => {
            historicoHtml += `
                <li>
                    <div class="historico-item">
                        <span class="historico-data">${toJsDate(item.timestamp).toLocaleString('pt-BR')}</span>
                        <span class="historico-desc">${item.descricao} por <strong>${item.usuario || 'Sistema'}</strong></span>
                    </div>
                </li>`;
        });
    }
    historicoHtml += '</ul>';
    conteudo.innerHTML = historicoHtml;
    modal.style.display = 'flex';
}

/**
 * NOVO: Gerencia a visibilidade dos chamados resolvidos, mostrando apenas os 5 últimos.
 */
function gerenciarVisibilidadeResolvidos() {
    if (!listaResolvidosEl) return;

    const cardsResolvidos = listaResolvidosEl.querySelectorAll('.chamado-card');
    
    // Adiciona a classe para esconder os cards excedentes
    cardsResolvidos.forEach((card, index) => {
        if (index >= 5) {
            card.classList.add('resolvido-oculto');
        } else {
            card.classList.remove('resolvido-oculto');
        }
    });

    // Mostra ou esconde o botão "Carregar Mais"
    if (cardsResolvidos.length > 5) {
        btnCarregarMaisResolvidos.style.display = 'block';
    } else {
        btnCarregarMaisResolvidos.style.display = 'none';
    }
}

function mostrarTodosResolvidos() {
    listaResolvidosEl.querySelectorAll('.resolvido-oculto').forEach(card => card.classList.remove('resolvido-oculto'));
    btnCarregarMaisResolvidos.style.display = 'none'; // Esconde o botão após o uso
}