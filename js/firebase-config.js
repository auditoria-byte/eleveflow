// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAmID1OzPcXMF2043KjsHqSQv7t7aIgm1Y",
  authDomain: "elevacon-sistema.firebaseapp.com",
  projectId: "elevacon-sistema",
  storageBucket: "elevacon-sistema.firebasestorage.app",
  messagingSenderId: "491467114353",
  appId: "1:491467114353:web:a4826d60f58f8e421dd8d0",
  measurementId: "G-49LSQZP1QB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Expõe tudo que core.js / dashboard.js / cadastros.js / ordens.js precisam
window.auth = auth;
window.db = db;
window.fs = {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDocs, getDoc, serverTimestamp
};
window.fbSignIn = signInWithEmailAndPassword;
window.fbOnAuthChange = onAuthStateChanged;
window.fbSignOut = signOut;

// Avisa os outros scripts que o Firebase está pronto
window.dispatchEvent(new Event("firebaseReady"));
