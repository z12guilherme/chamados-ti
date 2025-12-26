// js/theme-switcher.js
//Arquivo para trocar o tema entre claro e escuro

const themeToggleBtn = document.getElementById('theme-toggle');

/**
 * Aplica o tema salvo no localStorage ou o tema padrão do sistema.
 */
function applyInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    // Se o tema salvo for 'dark', adiciona a classe. Caso contrário, não faz nada (mantém o padrão 'light').
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

// Adiciona o evento de clique ao botão para alternar o tema
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
});

// Aplica o tema inicial ao carregar a página
applyInitialTheme();

// --- LÓGICA DE INSTALAÇÃO PWA (NOVO) ---
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Impede que o Chrome mostre a barra nativa automaticamente (para controlarmos quando mostrar)
    e.preventDefault();
    // Salva o evento para disparar depois quando o usuário clicar no botão
    deferredPrompt = e;
    // Mostra nosso botão personalizado
    mostrarBotaoInstalar();
});

function mostrarBotaoInstalar() {
    // Evita criar duplicatas se o evento disparar mais de uma vez
    if (document.getElementById('btn-install-pwa')) return;

    const themeSwitcher = document.querySelector('.theme-switcher');
    if (!themeSwitcher) return;

    // Cria o botão de instalação
    const installBtn = document.createElement('button');
    installBtn.id = 'btn-install-pwa';
    installBtn.className = 'theme-switcher-btn';
    installBtn.title = 'Instalar App';
    installBtn.style.marginTop = '10px'; // Separa do botão de tema
    installBtn.style.display = 'flex';
    installBtn.style.justifyContent = 'center';
    installBtn.style.alignItems = 'center';
    
    // Ícone de Download/Instalar
    installBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';

    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            // Mostra o prompt nativo do navegador
            deferredPrompt.prompt();
            // Espera a resposta do usuário
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`Resultado da instalação: ${outcome}`);
            deferredPrompt = null;
            // Remove o botão se o usuário aceitou instalar
            if (outcome === 'accepted') {
                installBtn.remove();
            }
        }
    });

    themeSwitcher.appendChild(installBtn);
}