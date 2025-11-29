// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA8jp0XgK7tUIDa0v9_XvsmzP8BPdMZKlo",
  authDomain: "focushub-a5ea0.firebaseapp.com",
  projectId: "focushub-a5ea0",
  storageBucket: "focushub-a5ea0.firebasestorage.app",
  messagingSenderId: "74042894055",
  appId: "1:74042894055:web:526b5f5653113c38646442",
  measurementId: "G-W7WZ9QJ8RE"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
