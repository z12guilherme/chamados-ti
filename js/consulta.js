// js/consulta.js
import { db, dbFunctions } from './firebase-init.js';

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
        exibirResultado('<p class="error">Por favor, insira um protocolo.</p>');
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
            exibirResultado(`<p class="error">❌ Nenhum chamado encontrado com o protocolo <strong>${protocoloInput}</strong>. Verifique o número e tente novamente.</p>`);
        } else {
            const chamado = querySnapshot.docs[0].data();
            const dataAbertura = chamado.dataAbertura ? chamado.dataAbertura.toDate().toLocaleString('pt-BR') : 'Data indisponível';

            const resolucaoHtml = chamado.status === 'Resolvido' && chamado.resolucao
                ? `<div class="info-item"><strong>Solução:</strong><p>${chamado.resolucao}</p></div>`
                : '';
            
            const pecaHtml = chamado.status === 'Aguardando Peça' && chamado.pecaAguardando
                ? `<div class="info-item"><strong>Peça em Aguardo:</strong><p>${chamado.pecaAguardando}</p></div>`
                : '';

            const resultadoHtml = `
                <h4>Detalhes do Chamado</h4>
                <div class="info-item"><strong>Protocolo:</strong><p>${chamado.protocolo}</p></div>
                <div class="info-item"><strong>Status:</strong><p class="status-tag status-consulta ${chamado.status.toLowerCase().replace(/\s+/g, '-')}">${chamado.status}</p></div>
                <div class="info-item"><strong>Solicitante:</strong><p>${chamado.nome}</p></div>
                <div class="info-item"><strong>Setor:</strong><p>${chamado.setor}</p></div>
                <div class="info-item"><strong>Problema Reportado:</strong><p>${chamado.problema}</p></div>
                <div class="info-item"><strong>Data de Abertura:</strong><p>${dataAbertura}</p></div>
                ${pecaHtml}
                ${resolucaoHtml}
            `;
            exibirResultado(resultadoHtml);
        }
    } catch (error) {
        console.error("Erro ao consultar chamado:", error);
        exibirResultado('<p class="error">❌ Ocorreu um erro ao buscar as informações. Tente novamente mais tarde.</p>');
    } finally {
        btnConsultar.disabled = false;
        btnConsultar.textContent = 'Consultar';
    }
});

function exibirResultado(html) {
    resultadoEl.innerHTML = html;
    resultadoEl.style.display = 'block';
}