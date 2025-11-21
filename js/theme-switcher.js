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