// js/auth.js
import { auth, authFunctions } from './firebase-init.js';
const { signInWithEmailAndPassword, onAuthStateChanged, signOut } = authFunctions;

/**
 * Tenta autenticar um usuário com email e senha.
 * @param {string} email O email do usuário.
 * @param {string} password A senha do usuário.
 * @returns {Promise<import("firebase/auth").UserCredential>}
 */
export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Desloga o usuário atual.
 * @returns {Promise<void>}
 */
export function logout() {
  return signOut(auth);
}

/**
 * Registra um observador para mudanças no estado de autenticação do usuário.
 * @param {function(import("firebase/auth").User | null): void} callback A função a ser chamada quando o estado de autenticação mudar.
 * @returns {import("firebase/auth").Unsubscribe}
 */
export function onAuthStateChangedObserver(callback) {
  return onAuthStateChanged(auth, callback);
}
