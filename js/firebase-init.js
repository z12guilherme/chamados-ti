// public/firebase-init.js

// Importa as funções que vamos usar do Firebase
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// Inicializa o Firebase com as suas configurações
const app = initializeApp(firebaseConfig);

// Disponibiliza os serviços do Firebase para usarmos nas outras páginas
export const db = getFirestore(app);
export const auth = getAuth(app);

// Exporta as funções específicas para facilitar o uso
export const dbFunctions = { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs };
export const authFunctions = { onAuthStateChanged, signInWithEmailAndPassword, signOut };