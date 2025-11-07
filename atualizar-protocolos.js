// atualizar-protocolos.js
const admin = require('firebase-admin');

// O caminho para a sua chave de administrador que você baixou
const serviceAccount = require('./serviceAccountKey.json');

console.log('Iniciando script de atualização de protocolos...');

// Inicializa o app com as credenciais de administrador
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const chamadosRef = db.collection('chamados');

async function atribuirProtocolosAntigos() {
  try {
    const snapshot = await chamadosRef.get();

    if (snapshot.empty) {
      console.log('Nenhum chamado encontrado no banco de dados.');
      return;
    }

    console.log(`Encontrados ${snapshot.size} chamados. Verificando protocolos...`);

    const batch = db.batch(); // Usamos um "batch" para atualizar tudo de uma vez
    let atualizacoes = 0;

    snapshot.forEach(doc => {
      const chamado = doc.data();

      // Verifica se o campo 'protocolo' NÃO existe ou está vazio
      if (!chamado.protocolo) {
        const ano = (chamado.dataAbertura?.toDate() || new Date()).getFullYear();
        const randomId = Math.random().toString(36).substring(2, 8).toUpperCase(); // ID um pouco maior para garantir unicidade
        const novoProtocolo = `CH-${ano}-${randomId}`;

        console.log(`- Chamado antigo (ID: ${doc.id}) será atualizado com o protocolo: ${novoProtocolo}`);

        // Adiciona a operação de atualização ao batch
        const chamadoParaAtualizarRef = chamadosRef.doc(doc.id);
        batch.update(chamadoParaAtualizarRef, { protocolo: novoProtocolo });
        
        atualizacoes++;
      }
    });

    if (atualizacoes > 0) {
      console.log(`\nIniciando a atualização de ${atualizacoes} chamados...`);
      await batch.commit(); // Envia todas as atualizações para o Firebase
      console.log('✅ Sucesso! Todos os chamados antigos foram atualizados com um novo protocolo.');
    } else {
      console.log('✅ Nenhum chamado precisou ser atualizado. Todos já possuem protocolo.');
    }

  } catch (error) {
    console.error('❌ Erro ao executar o script:', error);
  }
}

// Executa a função
atribuirProtocolosAntigos();
