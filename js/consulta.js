// js/consulta.js
import { db, dbFunctions } from './firebase-init.js';

const { collection, query, where, getDocs } = dbFunctions;

const formConsulta = document.getElementById('formConsulta');
const resultadoConsultaEl = document.getElementById('resultadoConsulta');
const protocoloInput = document.getElementById('protocolo');
const btnConsultar = document.getElementById('btnConsultar');

/**
 * Busca e exibe um chamado com base no protocolo.
 * @param {string} protocolo O protocolo a ser consultado.
 */
async function consultarChamado(protocolo) {
    if (!protocolo) return;

    btnConsultar.disabled = true;
    btnConsultar.textContent = 'Consultando...';
    resultadoConsultaEl.style.display = 'block';
    resultadoConsultaEl.innerHTML = '<div class="loader-small"></div>'; // Mostra um loader

    const q = query(collection(db, "chamados"), where("protocolo", "==", protocolo.trim().toUpperCase()));

    try {
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            resultadoConsultaEl.innerHTML = `<p class="message error">Nenhum chamado encontrado com o protocolo informado.</p>`;
            return;
        }

        const chamado = querySnapshot.docs[0].data();
        const dataAbertura = chamado.dataAbertura ? chamado.dataAbertura.toDate().toLocaleString('pt-BR') : 'Data indisponível';
        const statusClass = (chamado.status || 'pendente').toLowerCase().replace(/\s+/g, '-');

        // LÓGICA PARA EXIBIR O HISTÓRICO
        let historicoHtml = '';
        if (chamado.historico && chamado.historico.length > 0) {
            const historicoOrdenado = chamado.historico.sort((a, b) => (b.data.seconds || b.data) - (a.data.seconds || a.data));
            historicoHtml = `
                <div class="info-section">
                    <h4>Histórico de Andamento</h4>
                    <ul class="timeline">
                        ${historicoOrdenado.map(item => `
                            <li class="timeline-item">
                                <span class="timeline-status">${item.status}</span>
                                <span class="timeline-date">${item.data.toDate ? item.data.toDate().toLocaleString('pt-BR') : new Date(item.data).toLocaleString('pt-BR')}</span>
                                <span class="timeline-responsavel">por: ${item.responsavel}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        // LÓGICA PARA EXIBIR A RESOLUÇÃO
        let resolucaoHtml = '';
        if ((chamado.status || '').toLowerCase() === 'resolvido' && chamado.resolucao?.descricao) {
            const dataResolucao = chamado.resolucao.data ? chamado.resolucao.data.toDate().toLocaleString('pt-BR') : 'Data não registrada';
            resolucaoHtml = `
                <div class="info-section resolucao-final">
                    <h4>✅ Problema Resolvido</h4>
                    <p>${chamado.resolucao.descricao}</p>
                    <div class="detalhe-data">Finalizado em: ${dataResolucao}</div>
                </div>
            `;
        }

        resultadoConsultaEl.innerHTML = `
            <div class="card-consulta">
                <div class="card-consulta-header">
                    <div class="protocolo-info">
                        <span>Protocolo</span>
                        <h3>${chamado.protocolo}</h3>
                    </div>
                    <div class="status-info">
                        <span>Status Atual</span>
                        <span class="status-tag ${statusClass}">${chamado.status}</span>
                    </div>
                </div>
                <div class="card-consulta-body">
                    <div class="info-grid">
                        <div class="info-item">
                            <h4>Solicitante</h4>
                            <p>${chamado.nome}</p>
                        </div>
                        <div class="info-item">
                            <h4>Setor</h4>
                            <p>${chamado.setor}</p>
                        </div>
                        <div class="info-item info-full-width">
                            <h4>Problema Reportado</h4>
                            <p>${chamado.problema}</p>
                        </div>
                    </div>
                    ${historicoHtml}
                    ${resolucaoHtml}
                </div>
            </div>
        `;

    } catch (error) {
        console.error("Erro ao consultar chamado:", error);
        resultadoConsultaEl.innerHTML = `<p class="message error">Ocorreu um erro ao buscar os dados. Tente novamente.</p>`;
    } finally {
        btnConsultar.disabled = false;
        btnConsultar.textContent = 'Consultar';
    }
}

// Event listener para o formulário
formConsulta.addEventListener('submit', (e) => {
    e.preventDefault();
    const protocolo = protocoloInput.value;
    consultarChamado(protocolo);
});

// Verifica se há um protocolo na URL ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const protocoloFromUrl = params.get('protocolo');
    if (protocoloFromUrl) {
        protocoloInput.value = protocoloFromUrl;
        consultarChamado(protocoloFromUrl);
    }
});