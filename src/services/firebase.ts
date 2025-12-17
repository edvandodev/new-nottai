import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

console.log('[DEBUG] firebase.ts: Início da execução do arquivo.');

const firebaseConfig = {
  apiKey: 'AIzaSyDSZnBxLfy3SLDvu3mKZZRaTyWsnQbvQqE',
  authDomain: 'new-nottai.firebaseapp.com',
  projectId: 'new-nottai',
  storageBucket: 'new-nottai.firebasestorage.app',
  messagingSenderId: '1018973546184',
  appId: '1:1018973546184:web:cc85716ed0cd41f114a7fd'
}

const app = initializeApp(firebaseConfig)
console.log('[DEBUG] firebase.ts: initializeApp() chamado com sucesso.');

const db = getFirestore(app)
console.log('[DEBUG] firebase.ts: getFirestore() chamado com sucesso.');

export { db }
