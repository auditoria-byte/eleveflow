import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyAmID1OzPcXMF2O43KjsHqSQv7t7aIgm1Y",
  authDomain: "elevacon-sistema.firebaseapp.com",
  projectId: "elevacon-sistema",
  storageBucket: "elevacon-sistema.firebasestorage.app",
  messagingSenderId: "491467114353",
  appId: "1:491467114353:web:a4826d60f58f8e421dd8d0",
  measurementId: "G-49LSQZP1QB"
};

const app = initializeApp(firebaseConfig);

window.db = getFirestore(app);
window.auth = getAuth(app);

// Auth
window.fbSignIn = signInWithEmailAndPassword;
window.fbSignOut = signOut;
window.fbOnAuthChange = onAuthStateChanged;

// Firestore (exposto pra scripts não-módulo usarem)
window.fs = {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, orderBy, onSnapshot, serverTimestamp
};

try { getAnalytics(app); } catch (e) { console.warn("Analytics não iniciado:", e); }

window.dispatchEvent(new Event("firebaseReady"));
