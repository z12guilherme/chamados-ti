// js/consulta.js
import { db, dbFunctions } from './firebase-init.js';
const { collection, query, where, getDocs } = dbFunctions;

const formConsulta = document.getElementById('formConsulta');
const resultadoEl = document.getElementById('resultadoConsulta');
const mensagemEl = document.getElementById('mensagem');
const btnConsultar = document.getElementById('btnConsultar');

formConsulta.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnConsultar.disabled = true;
    btnConsultar.textContent = 'Buscando...';
    
    resultadoEl.style.display = 'none';
    mensagemEl.style.display = 'none';

    const protocolo = document.getElementById('protocolo').value.trim().toUpperCase();

    try {
        const q = query(collection(db, "chamados"), where("protocolo", "==", protocolo));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            mensagemEl.className = 'message error';
            mensagemEl.textContent = '❌ Nenhum chamado encontrado com este protocolo.';
            mensagemEl.style.display = 'block';
        } else {
            const chamado = querySnapshot.docs[0].data();
            const dataAbertura = chamado.dataAbertura.toDate().toLocaleString('pt-BR');

            resultadoEl.innerHTML = `
                <h3>Detalhes do seu Chamado</h3>
                <p><strong>Status:</strong> <span class="status-tag">${chamado.status}</span></p>
                <p><strong>Problema Reportado:</strong> ${chamado.problema}</p>
                <p><strong>Aberto em:</strong> ${dataAbertura}</p>
                ${chamado.status === 'Resolvido' && chamado.resolucao ? `<p><strong>Solução:</strong> ${chamado.resolucao}</p>` : ''}
                ${chamado.status === 'Aguardando Peça' && chamado.pecaAguardando ? `<p><strong>Informação:</strong> Aguardando a peça '${chamado.pecaAguardando}'.</p>` : ''}
            `;
            resultadoEl.style.display = 'block';
        }

    } catch (error) {
        console.error("Erro ao consultar chamado:", error);
        mensagemEl.className = 'message error';
        mensagemEl.textContent = '❌ Ocorreu um erro ao buscar as informações. Tente novamente.';
        mensagemEl.style.display = 'block';
    } finally {
        btnConsultar.disabled = false;
        btnConsultar.textContent = 'Consultar';
    }
});