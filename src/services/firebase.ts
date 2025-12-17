
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDSZnBxLfy3SLDvu3mKZZRaTyWsnQbvQqE",
  authDomain: "new-nottai.firebaseapp.com",
  projectId: "new-nottai",
  storageBucket: "new-nottai.firebasestorage.app",
  messagingSenderId: "1018973546184",
  appId: "1:1018973546184:web:cc85716ed0cd41f114a7fd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { db };
