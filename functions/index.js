const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
 
admin.initializeApp();
 
// Carrega as configurações de ambiente que definimos no Passo 2
const SURI_API_URL = functions.config().suri.endpoint;
const SURI_AUTH_TOKEN = functions.config().suri.token;
 
/**
 * Função genérica para enviar mensagem via SURI
 * @param {string} numeroDestino O número do WhatsApp no formato 55119...
 * @param {string} mensagem O texto a ser enviado.
 */
async function enviarMensagemSuri(numeroDestino, mensagem) {
  // --- Monte a requisição para a API da SURI ---
  const fullApiUrl = `${SURI_API_URL}send`;
  const requestBody = {
    chatId: `${numeroDestino}@c.us`,
    message: mensagem,
  };
 
  try {
    console.log("Enviando notificação via SURI para:", requestBody.chatId);
    const response = await fetch(fullApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SURI_AUTH_TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    });
 
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Erro ao chamar a API da SURI: ${response.status} ${errorText}`
      );
    }
 
    const responseData = await response.json();
    console.log("Notificação enviada com sucesso pela SURI!", responseData);
  } catch (error) {
    console.error("Falha grave ao enviar notificação pela SURI:", error);
  }
}
 
/**
 * Gatilho para quando um NOVO chamado é criado. (DESATIVADO TEMPORARIAMENTE)
 */
// exports.enviarNotificacaoSuri = functions.firestore
//   .document("chamados/{chamadoId}")
//   .onCreate(async (snap, context) => {
//     const novoChamado = snap.data();
//     const chamadoId = context.params.chamadoId;
//
//     console.log(`Novo chamado detectado: ${chamadoId}`, novoChamado);
//
//     const MEU_WHATSAPP = "5581989035561"; // <-- TROQUE PELO SEU NÚMERO COM CÓDIGO DO PAÍS E DDD
//
//     const mensagem = `🔔 *Novo Chamado Aberto!*\n\n*ID:* ${chamadoId}\n*Problema:* ${novoChamado.problema}\n*Setor:* ${novoChamado.setor}`;
//
//     await enviarMensagemSuri(MEU_WHATSAPP, mensagem);
//   });
 
/**
 * Gatilho para quando um chamado existente é ATUALIZADO.
 */
exports.notificarAtualizacaoChamado = functions.firestore
  .document("chamados/{chamadoId}")
  .onUpdate(async (change, context) => {
    const dadosAntigos = change.before.data();
    const dadosNovos = change.after.data();
    const chamadoId = context.params.chamadoId;
 
    // Pega o número do admin para notificar
    const MEU_WHATSAPP = "5581989035561";
 
    // Exemplo: Notificar se o STATUS do chamado mudou
    if (dadosAntigos.status !== dadosNovos.status) {
      console.log(`Status do chamado ${chamadoId} mudou para: ${dadosNovos.status}`);
 
      const mensagem = `⚙️ *Atualização no Chamado!*\n\n*ID:* ${chamadoId}\n*Novo Status:* ${dadosNovos.status}\n*Técnico:* ${dadosNovos.tecnico || "Não atribuído"}`;
 
      await enviarMensagemSuri(MEU_WHATSAPP, mensagem);
 
      // BÔNUS: Notificar também o usuário que abriu o chamado!
      // if (dadosNovos.telefoneUsuario) {
      //   const msgUsuario = `Olá! O status do seu chamado (${chamadoId}) foi atualizado para: *${dadosNovos.status}*`;
      //   await enviarMensagemSuri(dadosNovos.telefoneUsuario, msgUsuario);
      // }
    }
  });