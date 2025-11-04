# Sistema de Chamados de T.I.

Um sistema web simples e moderno para abertura e gerenciamento de chamados de suporte técnico, utilizando Firebase como backend.

![Print da aplicação](https://github.com/z12guilherme/chamados-ti/raw/main/print.PNG)

## ✨ Funcionalidades

*   **Página Pública:** Formulário intuitivo para qualquer pessoa abrir um novo chamado de T.I., informando nome, setor e a descrição do problema.
*   **Painel Administrativo:**
    *   Login seguro para administradores.
    *   Visualização em tempo real de todos os chamados abertos, ordenados por data.
    *   Alteração de status do chamado (Pendente, Em Andamento, Concluído).
    *   Exclusão de chamados.
*   **Responsivo:** Interface que se adapta bem a diferentes tamanhos de tela.
*   **Feedback ao Usuário:** Mensagens claras de sucesso e erro nas operações.

## 🚀 Tecnologias Utilizadas

*   **Frontend:**
    *   HTML5
    *   CSS3 (Puro, sem frameworks)
    *   JavaScript (ES6+ com Módulos)
*   **Backend:**
    *   **Firebase**
        *   **Firestore:** Banco de dados NoSQL para armazenamento dos chamados.
        *   **Authentication:** Para gerenciar o login dos administradores.
*   **Ambiente de Desenvolvimento:**
    *   [Node.js](https://nodejs.org/)
    *   [serve](https://www.npmjs.com/package/serve): Pacote npm para rodar um servidor de desenvolvimento local.

## ⚙️ Configuração e Instalação

Siga os passos abaixo para configurar e rodar o projeto em sua máquina local.

### 1. Pré-requisitos

*   Ter o [Node.js](https://nodejs.org/en/) instalado (que já inclui o npm).
*   Ter uma conta no [Firebase](https://firebase.google.com/).

### 2. Configuração do Firebase

1.  Crie um novo projeto no [Console do Firebase](https://console.firebase.google.com/).
2.  Vá para a seção **Authentication**, clique em "Começar" e ative o provedor de login **Email/Senha**.
3.  Ainda em Authentication, vá para a aba **Users** e adicione um usuário (ex: `admin@email.com` com uma senha) para ser o administrador do painel.
4.  Vá para a seção **Firestore Database**, clique em "Criar banco de dados" e inicie no **modo de produção**.
5.  Nas configurações do seu projeto (clicando na engrenagem ⚙️), crie um novo **Aplicativo da Web** (ícone `</>`).
6.  Copie o objeto de configuração `firebaseConfig`.

### 3. Configuração do Projeto Local

1.  Clone ou baixe este repositório para sua máquina.

2.  Dentro da pasta `js/`, crie um arquivo chamado `firebase-config.js`.

3.  Cole o objeto `firebaseConfig` que você copiou do Firebase dentro deste novo arquivo e exporte-o. O arquivo deve ficar assim:

    ```javascript
    // js/firebase-config.js
    export const firebaseConfig = {
      apiKey: "SUA_API_KEY",
      authDomain: "SEU_AUTH_DOMAIN",
      projectId: "SEU_PROJECT_ID",
      storageBucket: "SEU_STORAGE_BUCKET",
      messagingSenderId: "SEU_MESSAGING_SENDER_ID",
      appId: "SEU_APP_ID"
    };
    ```

4.  Abra o terminal na pasta raiz do projeto e instale as dependências:
    ```bash
    npm install
    ```

5.  Para iniciar o servidor de desenvolvimento, execute:
    ```bash
    npm run serve
    ```

6.  Abra seu navegador e acesse `http://localhost:3000` (ou a porta indicada no terminal) para ver a página de abertura de chamados. Para acessar o painel, navegue para `http://localhost:3000/login.html`.
