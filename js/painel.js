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
        const isUpdate = !isFirstLoad; // Considera uma atualização se não for o primeiro carregamento
        loader.style.display = 'none';

        // Limpa as listas antes de recarregar
        listaPendentesEl.innerHTML = '';
        listaEmAndamentoEl.innerHTML = '';
        listaAguardandoPecaEl.innerHTML = '';
        listaResolvidosEl.innerHTML = '';

        todosOsChamados = []; // CORREÇÃO: Limpa a lista geral para reconstruí-la
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
            chamado.id = id;
            todosOsChamados.push(chamado); // Adiciona o chamado à lista geral

            const dataAbertura = chamado.dataAbertura ? chamado.dataAbertura.toDate().toLocaleString('pt-BR') : 'Data indisponível';
            // CORREÇÃO 2: Normaliza o status para garantir a correspondência correta.
            const status = (chamado.status || 'pendente')
                .trim()
                .toLowerCase()
                .replace('ç', 'c')
                .replace('í', 'i')
                .replace('ê', 'e'); // status sempre em minúsculas para lógica
            let statusClass = status.toLowerCase().replace(/\s+/g, '-');

            // INVERSÃO DE CORES: Troca as classes para inverter as cores no CSS
            if (statusClass === 'pendente') {
                statusClass = 'urgencia-alta'; // Usa a classe vermelha para pendentes
            } else if (statusClass === 'resolvido') {
                statusClass = 'resolvido'; // Mantém a classe verde para resolvidos
            }

            // Adiciona a validação para o campo de resolução ser obrigatório
            if (status === 'resolvido' && !chamado.resolucao) {
                chamado.resolucao = "Resolução não informada.";
            }

            // CORREÇÃO: Exibe a descrição da resolução e a data
            const resolucaoHtml = status === 'resolvido' && chamado.resolucao?.descricao
                ? `<div class="resolucao-info">
                     <strong>Solução:</strong> ${chamado.resolucao.descricao}
                     <span class="resolucao-data">Resolvido em: ${chamado.resolucao.data ? chamado.resolucao.data.toDate().toLocaleString('pt-BR') : 'Data não registrada'}</span>
                   </div>`
                : '';

            const pecaHtml = chamado.status === 'aguardando-peça' && chamado.pecaAguardando
                ? `<div class="peca-info">
                     <strong>Aguardando Peça:</strong> ${chamado.pecaAguardando}
                   </div>`
                : '';

            const urgenciaClass = chamado.urgencia ? `urgencia-${chamado.urgencia.toLowerCase()}` : '';
            const urgenciaHtml = chamado.urgencia 
                ? `<span class="urgency-tag ${urgenciaClass}">${chamado.urgencia}</span>`
                : '';

            // ATUALIZADO: Cria o link de anexo correto (Base64 ou URL externa)
            let anexoHtml = '';
            if (chamado.anexoBase64) {
                anexoHtml = `<div class="anexo-info">
                     <a href="#" class="anexo-link" data-chamado-id="${id}">Ver Anexo</a>
                   </div>`;
            } else if (chamado.anexoUrl) {
                anexoHtml = `<div class="anexo-info">
                     <a href="${chamado.anexoUrl}" class="anexo-link" target="_blank" rel="noopener noreferrer">Ver Anexo (Link Externo)</a>
                   </div>`;
            }

            const card = document.createElement('div');
            card.className = `chamado-card ${statusClass.replace(/\s+/g, '-')}`;
            card.dataset.id = id;
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
                        <span class="status-tag ${statusClass}">${chamado.status || 'Pendente'}</span>
                    </div>
                </div>
                <div class="problema-resumo">
                    <p>${chamado.problema}</p>
                </div>
                ${anexoHtml}
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
            if (status === 'pendente') {
                chamados.pendentes.push(card);
            } else if (status === 'em-andamento') {
                chamados.emAndamento.push(card);
            } else if (status === 'aguardando-peça') {
                chamados.aguardandoPeca.push(card);
            } else if (status === 'resolvido') {
                chamados.resolvidos.push(card);
            }
        });

        // Exibe os chamados ou a mensagem de "nenhum chamado"
        const chamadosAtivosContainer = document.getElementById('chamados-ativos');
        if (chamados.pendentes.length === 0 && chamados.aguardandoPeca.length === 0 && chamados.emAndamento.length === 0) {
            chamadosAtivosContainer.innerHTML = `<p class="empty-category-message">Nenhum chamado ativo no momento.</p>`;
        } else {
            // CORREÇÃO: Limpa a mensagem de "nenhum chamado" se houver chamados, mas preserva os contêineres das listas.
            if (chamadosAtivosContainer.querySelector('.empty-category-message')) {
                chamadosAtivosContainer.innerHTML = '';
            }

            if (chamados.pendentes.length > 0) {
                if (!document.getElementById('listaPendentes').parentNode) {
                    chamadosAtivosContainer.appendChild(listaPendentesEl);
                }
                listaPendentesEl.innerHTML = '<h4>Pendentes</h4>';
                chamados.pendentes.forEach(card => listaPendentesEl.appendChild(card));
            }
            if (chamados.emAndamento.length > 0) {
                if (!document.getElementById('listaEmAndamento').parentNode) {
                    chamadosAtivosContainer.appendChild(listaEmAndamentoEl);
                }
                listaEmAndamentoEl.innerHTML = '<h4>Em Andamento</h4>';
                chamados.emAndamento.forEach(card => listaEmAndamentoEl.appendChild(card));
            }
            if (chamados.aguardandoPeca.length > 0) {
                if (!document.getElementById('listaAguardandoPeca').parentNode) {
                    chamadosAtivosContainer.appendChild(listaAguardandoPecaEl);
                }
                listaAguardandoPecaEl.innerHTML = '<h4>Aguardando Peça</h4>';
                chamados.aguardandoPeca.forEach(card => listaAguardandoPecaEl.appendChild(card));
            }
        }
        
        if (chamados.resolvidos.length === 0) {
            listaResolvidosEl.innerHTML = `<p class="empty-category-message">Nenhum chamado foi resolvido ainda.</p>`;
        } else {
            listaResolvidosEl.innerHTML = '<h4>Concluídos</h4>'; // Adiciona o título da seção

            // ORDENAÇÃO: Ordena os chamados resolvidos pela data de resolução (mais recentes primeiro)
            chamados.resolvidos.sort((cardA, cardB) => {
                const chamadoA = JSON.parse(cardA.dataset.chamado);
                const chamadoB = JSON.parse(cardB.dataset.chamado);

                // Usa a data da resolução para ordenar. Se não houver data, considera como mais antigo.
                const dataResolucaoA = chamadoA.resolucao?.data?.seconds || 0;
                const dataResolucaoB = chamadoB.resolucao?.data?.seconds || 0;

                return dataResolucaoB - dataResolucaoA;
            });

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
    let contagemSetores = chamados.reduce((acc, chamado) => {
        let setor = chamado.setor || 'Não Informado';

        // --- MELHORIA: Normaliza o nome do setor para agrupar corretamente ---
        // Ex: "faturamento", "Faturamento" e " FATURAMENTO " viram "Faturamento"
        const setorNormalizado = setor
            .trim()
            .toLowerCase()
            .split(' ')
            .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
            .join(' ');

        acc[setorNormalizado] = (acc[setorNormalizado] || 0) + 1;
        return acc;
    }, {});

    // --- MELHORIA: Ordenar, limitar e agrupar setores ---
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
        type: 'bar',
        data: {
            labels: labelsSetores,
            datasets: [{
                label: 'Nº de Chamados',
                data: dadosSetores,
                // --- MELHORIA: Paleta de cores mais rica ---
                backgroundColor: ['#7aa2f7', '#bb9af7', '#f7768e', '#e0af68', '#9ece6a', '#7dcfff', '#c0caf5', '#a9b1d6'],
                borderColor: '#414868',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Deixa o gráfico deitado (barras horizontais)
            responsive: true,
            maintainAspectRatio: false,
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

// --- MELHORIA: Debounce para o filtro ---
let debounceTimer;

function filtrarChamados() {
    const termo = filtroInput.value.toLowerCase().trim();
    const todosOsCards = document.querySelectorAll('.chamado-card');

    todosOsCards.forEach(card => {
        // Pega os dados do dataset, que é mais confiável
        const chamadoData = JSON.parse(card.dataset.chamado);
        const textoParaBuscar = [
            chamadoData.protocolo || '',
            chamadoData.nome || '',
            chamadoData.setor || '',
            chamadoData.problema || ''
        ].join(' ').toLowerCase();

        card.style.display = textoParaBuscar.includes(termo) ? 'block' : 'none';
    });
}

filtroInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        filtrarChamados();
    }, 300); // Atraso de 300ms
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

    // CORREÇÃO: Lógica para visualizar o anexo (Modal ou Nova Aba)
    // Esta verificação deve vir ANTES das outras que dependem de 'data-id'
    if (target.classList.contains('anexo-link')) {
        // ATUALIZADO: Apenas executa a lógica se for um anexo interno (com data-chamado-id)
        // Se for um link externo (Google Drive), o navegador cuidará disso.
        if (target.dataset.chamadoId) {
            e.preventDefault(); // Impede que o link '#' navegue
            const chamadoId = target.dataset.chamadoId;
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
    }

    // As ações abaixo dependem do 'data-id'
    if (!target.dataset.id) return;

    chamadoIdParaAcao = target.dataset.id;

    if (target.classList.contains('btn-remover')) {
        modalConfirmacao.style.display = 'flex';
    }

    if (target.classList.contains('btn-status')) {
        const card = target.closest('.chamado-card');
        chamadoAtualParaStatus = JSON.parse(card.dataset.chamado);
        
        selectStatus.value = chamadoAtualParaStatus.status || 'pendente';
        const statusNormalizado = (chamadoAtualParaStatus.status || '').toLowerCase();
        textoResolucao.value = chamadoAtualParaStatus.resolucao?.descricao || '';
        campoResolucao.style.display = statusNormalizado === 'resolvido' ? 'block' : 'none';
        textoPeca.value = chamadoAtualParaStatus.pecaAguardando || '';
        campoPeca.style.display = statusNormalizado === 'aguardando-peça' ? 'block' : 'none';
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
        novoHistorico.push({
            status: novoStatus,
            data: new Date(), // Usamos a data local do cliente. serverTimestamp() não é suportado aqui.
            responsavel: auth.currentUser.email
        });

        const dadosParaAtualizar = {
            status: novoStatus,
            historico: novoHistorico
        };

        if (novoStatus === 'resolvido') {
            if (textoResolucao.value.trim() === '') {
                alert('Por favor, descreva como o problema foi resolvido.');
                return;
            }
            // CORREÇÃO: Salva a resolução como um objeto
            dadosParaAtualizar.resolucao = {
                descricao: textoResolucao.value.trim(),
                data: serverTimestamp()
            };
        } else if (novoStatus === 'aguardando-peça') {
            if (textoPeca.value.trim() === '') {
                alert('Por favor, informe qual peça está sendo aguardada.');
                return;
            }
            dadosParaAtualizar.pecaAguardando = textoPeca.value.trim();
            dadosParaAtualizar.resolucao = null; // CORREÇÃO: Limpa a resolução para null
        }

        await updateDoc(chamadoRef, dadosParaAtualizar);
        modalStatus.style.display = 'none';
        chamadoAtualParaStatus = null;
    }
});