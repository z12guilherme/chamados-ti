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

        // LÓGICA PARA EXIBIR A RESOLUÇÃO
        let resolucaoHtml = '';
        if (chamado.status === 'resolvido' && chamado.resolucao?.descricao) {
            const dataResolucao = chamado.resolucao.data ? chamado.resolucao.data.toDate().toLocaleString('pt-BR') : 'Data não registrada';
            resolucaoHtml = `
                <div class="detalhe-chamado status-resolvido">
                    <h4>✅ Como o problema foi resolvido:</h4>
                    <p>${chamado.resolucao.descricao}</p>
                    <div class="detalhe-data">Finalizado em: ${dataResolucao}</div>
                </div>
            `;
        }

        resultadoConsultaEl.innerHTML = `
            <div class="detalhe-chamado">
                <h4>Detalhes do Chamado</h4>
                <p><strong>Protocolo:</strong> ${chamado.protocolo}</p>
                <p><strong>Solicitante:</strong> ${chamado.nome}</p>
                <p><strong>Setor:</strong> ${chamado.setor}</p>
                <p><strong>Problema Reportado:</strong> ${chamado.problema}</p>
                <p><strong>Urgência:</strong> <span class="urgency-tag urgencia-${chamado.urgencia}">${chamado.urgencia}</span></p>
                <div class="detalhe-data">Aberto em: ${dataAbertura}</div>
            </div>

            <div class="detalhe-chamado">
                <h4>Andamento</h4>
                <p><strong>Status Atual:</strong> <span class="status-tag ${statusClass}">${chamado.status}</span></p>
            </div>

            ${resolucaoHtml}
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