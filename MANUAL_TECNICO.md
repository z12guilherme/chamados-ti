# Manual Técnico - Sistema de Chamados de T.I.

Este documento fornece uma visão técnica detalhada do projeto, sua arquitetura, configuração e estrutura de arquivos. É destinado a desenvolvedores que desejam rodar, manter ou contribuir para o sistema.

## 1. Visão Geral da Arquitetura

O sistema é uma Single Page Application (SPA) com múltiplas "páginas" (arquivos HTML) e utiliza o Firebase como um backend completo (Backend-as-a-Service).

*   **Frontend**: Construído com HTML5, CSS3 puro e JavaScript moderno (ES6+ com Módulos). A interface é reativa e renderiza os dados dinamicamente a partir do Firestore.
*   **Backend**: Totalmente baseado nos serviços do **Firebase**.
    *   **Firestore**: Banco de dados NoSQL para armazenar todos os dados dos chamados de forma reativa.
    *   **Firebase Authentication**: Gerencia a autenticação de administradores (login com email e senha).
*   **Ambiente de Desenvolvimento**:
    *   **Node.js**: Utilizado para gerenciar pacotes via npm e para rodar scripts de manutenção.
    *   **`serve`**: Um pacote npm simples para criar um servidor local estático, permitindo o uso de Módulos JavaScript (`import`/`export`).

## 2. Estrutura de Arquivos

```
chamados-ti/
├── assets/
│   └── logo.jpg            # Logo da empresa
├── css/
│   └── style.css           # Folha de estilos principal
├── functions/
│   └── index.js            # Para futuras Cloud Functions (ex: notificações)
├── js/
│   ├── auth.js             # Lógica de login e logout do admin
│   ├── consulta.js         # Lógica da página de consulta pública de chamados
│   ├── firebase-config.js  # (A SER CRIADO) Configuração do Firebase
│   ├── main.js             # Lógica do formulário público de abertura de chamados
│   ├── painel.js           # Lógica principal do painel administrativo
│   └── utils.js            # Funções utilitárias (ex: mostrar mensagens)
├── .gitignore
├── atualizar-protocolos.js # Script Node.js para atualizar chamados antigos
├── consulta.html           # Página para o usuário consultar um chamado pelo protocolo
├── index.html              # Página inicial para abertura de chamados
├── login.html              # Página de login do administrador
├── manual.html             # (NOVO) Página que exibe o manual do usuário
├── MANUAL_TECNICO.md       # (ESTE ARQUIVO) Manual técnico
├── MANUAL_USUARIO.md       # (NOVO) Conteúdo do manual do usuário
├── package.json
├── painel.html             # Painel de administração dos chamados
└── README.md               # Readme geral do projeto
```

## 3. Modelo de Dados no Firestore

Todos os dados são armazenados na coleção `chamados`. Cada documento nesta coleção representa um chamado e possui a seguinte estrutura:

*   `nome` (string): Nome do solicitante.
*   `setor` (string): Setor do solicitante.
*   `problema` (string): Descrição detalhada do problema.
*   `urgencia` (string): Nível de urgência ('baixa', 'media', 'alta').
*   `dataAbertura` (timestamp): Data e hora em que o chamado foi criado.
*   `status` (string): Status atual do chamado ('pendente', 'em-andamento', 'resolvido', 'aguardando-peça').
*   `protocolo` (string): Identificador único do chamado (ex: `CH-2025-ABCDEF`).
*   `anexoUrl` (string, opcional): URL pública para o arquivo anexado no Firebase Storage.
*   `resolucao` (object, opcional): Contém detalhes do fechamento do chamado.
    *   `descricao` (string): Descrição da solução aplicada.
    *   `data` (timestamp): Data da resolução.
*   `pecaSolicitada` (object, opcional): Contém detalhes da peça pendente.
    *   `descricao` (string): Qual peça foi solicitada.
    *   `data` (timestamp): Data da solicitação.

## 4. Configuração e Instalação

Os passos detalhados para configurar o ambiente do zero estão no arquivo `README.md`.

## 5. Scripts e Ferramentas

### Servidor de Desenvolvimento

O comando `npm run serve` (definido no `package.json`) inicia um servidor local na porta 3000. É essencial para que os módulos JavaScript (`import`) funcionem corretamente no navegador.

### Script `atualizar-protocolos.js`

Este é um script de manutenção essencial para garantir a integridade dos dados.

*   **Propósito**: Percorrer todos os documentos na coleção `chamados` e atribuir um número de protocolo único a qualquer chamado que não o possua. Isso é útil para aplicar a nova funcionalidade de protocolo a dados que já existiam antes de sua implementação.
*   **Como usar**:
    1.  **Obtenha a Chave de Serviço**: No seu projeto Firebase, vá em "Configurações do projeto" > "Contas de serviço". Clique em "Gerar nova chave privada" e baixe o arquivo JSON.
    2.  **Renomeie e Mova**: Renomeie o arquivo baixado para `serviceAccountKey.json` e coloque-o na pasta raiz do projeto. (Este arquivo já está no `.gitignore` para não ser enviado ao repositório).
    3.  **Instale as dependências do Admin SDK**:
        ```bash
        npm install firebase-admin
        ```
    4.  **Execute o Script**:
        ```bash
        node atualizar-protocolos.js
        ```
    O script irá verificar todos os chamados e atualizar apenas os necessários em um único lote (`batch`), otimizando as operações de escrita no banco.

## 6. Potenciais Melhorias (Cloud Functions)

A pasta `functions` está preparada para a implementação de **Firebase Cloud Functions**. Algumas ideias para o futuro:

*   **Notificações por Email**: Criar uma função que é acionada (`trigger`) sempre que um novo chamado é criado (`onDocumentCreated`) e envia um email para a equipe de T.I.
*   **Logs de Auditoria**: Registrar alterações de status importantes em uma coleção separada para auditoria.
*   **Relatórios Programados**: Uma função agendada (`scheduled function`) que gera e envia um relatório semanal do status dos chamados.