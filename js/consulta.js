// js/consulta.js
import { db, dbFunctions } from './firebase-init.js';
import { showMessage } from './utils.js';

const { collection, query, where, getDocs } = dbFunctions;

const formConsulta = document.getElementById('formConsulta');
const btnConsultar = document.getElementById('btnConsultar');
const resultadoEl = document.getElementById('resultadoConsulta');
const protocoloInputEl = document.getElementById('protocolo');

// --- MELHORIA: Preenchimento automático via URL ---
// Roda quando a página carrega para verificar se um protocolo foi passado na URL
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const protocoloFromUrl = params.get('protocolo');

    if (protocoloFromUrl) {
        protocoloInputEl.value = protocoloFromUrl; // Preenche o campo
        formConsulta.requestSubmit(); // Envia o formulário automaticamente
    }
});
// ----------------------------------------------------

formConsulta.addEventListener('submit', async (e) => {
    e.preventDefault();
    let protocoloInput = document.getElementById('protocolo').value.trim().toUpperCase();

    // Remove o '#' se o usuário o digitar, tornando a busca mais flexível.
    if (protocoloInput.startsWith('#')) { protocoloInput = protocoloInput.substring(1); }

    if (!protocoloInput) {
        showMessage(resultadoEl, '<p class="error">Por favor, insira um protocolo.</p>', 'error');
        return;
    }

    btnConsultar.disabled = true;
    btnConsultar.textContent = 'Buscando...';
    resultadoEl.style.display = 'none';
    resultadoEl.innerHTML = '';

    try {
        const q = query(collection(db, "chamados"), where("protocolo", "==", protocoloInput));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showMessage(resultadoEl, `<p class="error">❌ Nenhum chamado encontrado com o protocolo <strong>${protocoloInput}</strong>. Verifique o número e tente novamente.</p>`, 'error');
        } else {
            const chamado = querySnapshot.docs[0].data();
            const dataAbertura = chamado.dataAbertura ? chamado.dataAbertura.toDate().toLocaleString('pt-BR') : 'Data indisponível';

            const resolucaoHtml = chamado.status === 'Resolvido' && chamado.resolucao
                ? `<div class="info-section">
                     <h4>Solução Aplicada</h4>
                     <p>${chamado.resolucao}</p>
                   </div>`
                : '';
            
            const pecaHtml = chamado.status === 'Aguardando Peça' && chamado.pecaAguardando
                ? `<div class="info-section">
                     <h4>Peça em Aguardo</h4>
                     <p>${chamado.pecaAguardando}</p>
                   </div>`
                : '';

            const resultadoHtml = `
                <div class="card-consulta">
                    <div class="card-consulta-header">
                        <div class="protocolo-info">
                            <span>Protocolo</span>
                            <h3>#${chamado.protocolo}</h3>
                        </div>
                        <div class="status-info">
                            <span>Status</span>
                            <p class="status-tag status-consulta ${chamado.status.toLowerCase().replace(/\s+/g, '-')}">${chamado.status}</p>
                        </div>
                    </div>
                    <div class="card-consulta-body">
                        <div class="info-grid">
                            <div class="info-item"><strong>Solicitante:</strong><p>${chamado.nome}</p></div>
                            <div class="info-item"><strong>Setor:</strong><p>${chamado.setor}</p></div>
                            <div class="info-item info-full-width"><strong>Problema Reportado:</strong><p>${chamado.problema}</p></div>
                            <div class="info-item info-full-width"><strong>Data de Abertura:</strong><p>${dataAbertura}</p></div>
                        </div>
                        ${pecaHtml}
                        ${resolucaoHtml}
                    </div>
                </div>
            `;
            showMessage(resultadoEl, resultadoHtml, 'success');
        }
    } catch (error) {
        console.error("Erro ao consultar chamado:", error);
        showMessage(resultadoEl, '<p class="error">❌ Ocorreu um erro ao buscar as informações. Tente novamente mais tarde.</p>', 'error');
    } finally {
        btnConsultar.disabled = false;
        btnConsultar.textContent = 'Consultar';
    }
});
