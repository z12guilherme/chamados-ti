// js/login.js
import { auth, authFunctions } from './firebase-init.js';

const { signInWithEmailAndPassword } = authFunctions;

const formLogin = document.getElementById('formLogin');
const emailInput = document.getElementById('email');
const senhaInput = document.getElementById('senha');
const mensagemEl = document.getElementById('mensagem');
const btnLogin = document.getElementById('btnLogin');

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();

    btnLogin.disabled = true;
    btnLogin.textContent = 'Entrando...';
    mensagemEl.style.display = 'none';

    const email = emailInput.value.trim();
    const senha = senhaInput.value.trim();

    try {
        await signInWithEmailAndPassword(auth, email, senha);
        // Redireciona para o painel de chamados em caso de sucesso
        window.location.href = 'painel.html';
    } catch (error) {
        console.error("Erro de autenticação:", error.code);
        let mensagemErro = 'Ocorreu um erro ao tentar fazer login.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            mensagemErro = 'E-mail ou senha inválidos. Por favor, tente novamente.';
        }
        
        mensagemEl.textContent = mensagemErro;
        mensagemEl.className = 'message error';
        mensagemEl.style.display = 'block';

        btnLogin.disabled = false;
        btnLogin.textContent = 'Entrar';
    }
});