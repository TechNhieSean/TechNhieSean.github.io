// Firebase initialization for LFG Scheduler
// This file is loaded via <script> tag, no build tools needed

// Firebase v9+ modular CDN imports
// See: https://firebase.google.com/docs/web/alt-setup

// Add Firebase SDKs via CDN
// (These <script> tags will be added to index.html)

// Your config (from user):
const firebaseConfig = {
  apiKey: "AIzaSyCZ7zP8Zi3XSJGzscAqlMNPuvrUkW6z9c4",
  authDomain: "ttrpg-lfg-finder.firebaseapp.com",
  projectId: "ttrpg-lfg-finder",
  storageBucket: "ttrpg-lfg-finder.firebasestorage.app",
  messagingSenderId: "487870909004",
  appId: "1:487870909004:web:e2915b4eae0cbb9577c2e9",
  measurementId: "G-J0T9PH30HQ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
