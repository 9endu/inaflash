// firebase-config.js
// TODO: Replace with your actual Firebase configuration from the Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyDKAG4_yBpVFUIrKawBDMaKWxJcas0oV8Y",
    authDomain: "inaflash-e80df.firebaseapp.com",
    databaseURL: "https://inaflash-e80df-default-rtdb.firebaseio.com",
    projectId: "inaflash-e80df",
    storageBucket: "inaflash-e80df.firebasestorage.app",
    messagingSenderId: "325974592766",
    appId: "1:325974592766:web:8f60c9d911edc96096e9af",
    measurementId: "G-BKHM1M6QX9"
};

// Initialize Firebase
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);

    // Make auth and db queryable globally
    window.auth = firebase.auth();
    window.db = firebase.firestore();
    console.log("Firebase initialized successfully");
} else if (typeof firebase === 'undefined') {
    console.error("Firebase SDK not loaded!");
}
