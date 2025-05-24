// app/firebase-config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 🚨 Replace this with your actual Firebase project config!
const firebaseConfig = {
    apiKey: "AIzaSyBmM6734oZJkcxWZ3g8gijjsbBWTuZ_L8A",
    authDomain: "toda-go-dd81a.firebaseapp.com",
    databaseURL: "https://toda-go-dd81a-default-rtdb.firebaseio.com",
    projectId: "toda-go-dd81a",
    storageBucket: "toda-go-dd81a.firebasestorage.app",
    messagingSenderId: "702097062002",
    appId: "1:702097062002:web:a656198eaf56b68351eaeb",
    measurementId: "G-L1N01B6DTX"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
