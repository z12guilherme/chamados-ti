// js/login.js
import { login } from './auth.js';

const formLogin = document.getElementById('formLogin');
const mensagemEl = document.getElementById('mensagem');
const btnLogin = document.getElementById('btnLogin');

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    btnLogin.disabled = true;
    btnLogin.textContent = 'Verificando...';
    mensagemEl.style.display = 'none';

    try {
        await login(email, senha);
        // Se o login for bem-sucedido, redireciona para o painel
        window.location.href = 'painel.html';

    } catch (error) {
        console.error("Erro de autenticação:", error.code);
        let mensagemErro = '❌ Ocorreu um erro ao tentar fazer login.';
        // As versões mais recentes do Firebase SDK retornam 'auth/invalid-credential' tanto para email não encontrado quanto para senha incorreta.
        if (error.code === 'auth/invalid-credential') {
            mensagemErro = '❌ Credenciais inválidas. Verifique seu email e senha.';
        }
        
        mensagemEl.className = 'message error';
        mensagemEl.textContent = mensagemErro;
        mensagemEl.style.display = 'block';
    } finally {
        btnLogin.disabled = false;
        btnLogin.textContent = 'Entrar';
    }
});