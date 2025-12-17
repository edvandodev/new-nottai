import { initializeApp, getApps } from 'firebase/app'

const firebaseConfig = {
  apiKey: 'AIzaSyDSZnBxLfy3SLDvu3mKZZRaTyWsnQbvQqE',
  authDomain: 'new-nottai.firebaseapp.com',
  projectId: 'new-nottai',
  storageBucket: 'new-nottai.firebasestorage.app',
  messagingSenderId: '1018973546184',
  appId: '1:1018973546184:web:cc85716ed0cd41f114a7fd'
}

export function initFirebase() {
  if (!getApps().length) {
    initializeApp(firebaseConfig)
  }
}
