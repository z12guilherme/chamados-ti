// public/firebase-init.js

// Importa as funções que vamos usar do Firebase
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"; // prettier-ignore
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs, arrayUnion, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Inicializa o Firebase com as suas configurações
const app = initializeApp(firebaseConfig);

// Disponibiliza os serviços do Firebase para usarmos nas outras páginas
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Exporta as funções específicas para facilitar o uso
export const dbFunctions = { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs, arrayUnion, getDoc, setDoc };
export const authFunctions = { onAuthStateChanged, signInWithEmailAndPassword, signOut };
export const storageFunctions = { ref, uploadBytes, getDownloadURL };