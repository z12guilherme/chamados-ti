// CORREÇÃO: Importa a instância 'auth' e as funções de autenticação do arquivo de inicialização central.
// Isso garante que estamos usando a configuração correta do Firebase e evita inicializações duplicadas.
import { auth, authFunctions } from './firebase-init.js';
const { signInWithEmailAndPassword, sendPasswordResetEmail } = authFunctions; // SUGESTÃO: Importa sendPasswordResetEmail de firebase-init.js

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('formLogin');
    const emailInput = document.getElementById('email');
    const senhaInput = document.getElementById('senha');
    const mensagemDiv = document.getElementById('mensagem');
    const togglePassword = document.getElementById('togglePassword');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const btnLogin = document.getElementById('btnLogin');
    const btnLoginText = btnLogin.querySelector('.btn-text');
    const btnLoginLoader = btnLogin.querySelector('.btn-loader');

    // NOVO: Elementos do Modal de Redefinição de Senha
    const modalReset = document.getElementById('modalResetPassword');
    const formReset = document.getElementById('formResetPassword');
    const emailResetInput = document.getElementById('emailReset');
    const mensagemResetDiv = document.getElementById('mensagemReset');
    const btnCloseModal = document.getElementById('btnModalResetClose');
    const btnCancelModal = document.getElementById('btnModalResetCancel');
    const btnSendResetLink = document.getElementById('btnSendResetLink');

    // 1. Lógica de Login
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = senhaInput.value;

        // Feedback visual no botão
        btnLogin.disabled = true;
        btnLoginText.style.display = 'none';
        btnLoginLoader.style.display = 'inline';
        mensagemDiv.style.display = 'none'; // Esconde mensagens antigas

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Login bem-sucedido, redireciona para o painel
                console.log('Login bem-sucedido:', userCredential.user);
                window.location.href = 'painel.html'; 
            })
            .catch((error) => {
                // Exibe mensagem de erro
                console.error('Erro no login:', error.code, error.message);
                // SUGESTÃO: Melhora o feedback de erro para o usuário
                switch (error.code) {
                    case 'auth/invalid-email':
                        mensagemDiv.textContent = 'O formato do e-mail é inválido. Verifique e tente novamente.';
                        break;
                    default: // Para auth/user-not-found, auth/wrong-password, etc.
                        mensagemDiv.textContent = 'E-mail ou senha inválidos. Tente novamente.';
                        break;
                }
                mensagemDiv.className = 'message error';
                mensagemDiv.style.display = 'block';
            })
            .finally(() => {
                // Restaura o botão
                btnLogin.disabled = false;
                btnLoginText.style.display = 'inline';
                btnLoginLoader.style.display = 'none';
            });
    });

    // 2. Lógica para Mostrar/Ocultar Senha
    togglePassword.addEventListener('click', () => {
        const type = senhaInput.getAttribute('type') === 'password' ? 'text' : 'password';
        senhaInput.setAttribute('type', type);

        // MODIFICADO: Lógica para alternar entre os ícones SVG de olho aberto/fechado
        const iconOpen = togglePassword.querySelector('.icon-eye-open');
        const iconClosed = togglePassword.querySelector('.icon-eye-closed');

        const isPassword = type === 'password';
        iconOpen.style.display = isPassword ? 'block' : 'none';
        iconClosed.style.display = isPassword ? 'none' : 'block';
    });

    // 3. Lógica para ABRIR o modal de "Esqueci minha senha"
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Preenche o campo do modal com o e-mail do formulário de login, se houver
        emailResetInput.value = emailInput.value;
        mensagemResetDiv.style.display = 'none'; // Limpa mensagens antigas
        modalReset.style.display = 'flex';
    });

    // Funções para fechar o modal
    const closeModal = () => {
        modalReset.style.display = 'none';
    };
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelModal.addEventListener('click', closeModal);
    modalReset.addEventListener('click', (e) => {
        if (e.target === modalReset) {
            closeModal();
        }
    });

    // 4. Lógica para ENVIAR o e-mail de redefinição a partir do modal
    formReset.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailResetInput.value;

        if (!email) {
            mensagemResetDiv.textContent = 'Por favor, digite um endereço de e-mail.';
            mensagemResetDiv.className = 'message warning';
            mensagemResetDiv.style.display = 'block';
            return;
        }

        // Feedback visual para o envio do e-mail
        btnSendResetLink.disabled = true;
        btnSendResetLink.textContent = 'Enviando...';
        mensagemResetDiv.textContent = 'Processando sua solicitação...';
        mensagemResetDiv.className = 'message info';
        mensagemResetDiv.style.display = 'block';

        sendPasswordResetEmail(auth, email)
            .then(() => {
                mensagemResetDiv.textContent = `E-mail de redefinição enviado para ${email}. Verifique sua caixa de entrada e spam.`;
                mensagemResetDiv.className = 'message success';
            })
            .catch((error) => {
                console.error('Erro ao enviar e-mail de redefinição:', error);
                mensagemResetDiv.textContent = 'Não foi possível enviar o e-mail. Verifique se o endereço está correto e tente novamente.';
                mensagemResetDiv.className = 'message error';
            })
            .finally(() => {
                btnSendResetLink.disabled = false;
                btnSendResetLink.textContent = 'Enviar Link';
            });
    });
});