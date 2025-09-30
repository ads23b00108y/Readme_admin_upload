// src/firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC8krppXLuTXliGvhYMrdnxym9y7Ga-YcA",
  authDomain: "readme-40267.firebaseapp.com",
  projectId: "readme-40267",
  storageBucket: "readme-40267.appspot.com", // <-- fix: should be .appspot.com
  messagingSenderId: "137949170130",
  appId: "1:137949170130:web:d9e08d9e802b59185e200b",
  measurementId: "G-Y27611WDKT"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);