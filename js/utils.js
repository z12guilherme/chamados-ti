// js/utils.js

/**
 * Exibe uma mensagem para o usuário.
 * @param {HTMLElement} element O elemento onde a mensagem será exibida.
 * @param {string} message A mensagem a ser exibida.
 * @param {'success' | 'error'} type O tipo de mensagem ('success' ou 'error').
 */
export function showMessage(element, message, type) {
  element.className = `message ${type}`;
  element.innerHTML = message;
  element.style.display = 'block';
}
