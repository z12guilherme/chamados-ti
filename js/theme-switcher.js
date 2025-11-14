// js/theme-switcher.js

const themeToggleBtn = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme');

/**
 * Aplica o tema salvo no localStorage ou o tema padrão do sistema.
 */
function applyInitialTheme() {
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        // O padrão é o tema claro, então remove a classe dark se não estiver definida
        document.body.classList.remove('dark-theme');
    }
}

/**
 * Alterna entre os temas light e dark.
 */
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
}

// Aplica o tema inicial ao carregar a página
applyInitialTheme();

// Adiciona o evento de clique ao botão
themeToggleBtn.addEventListener('click', toggleTheme);