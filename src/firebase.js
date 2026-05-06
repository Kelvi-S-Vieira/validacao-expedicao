import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAt_4n80JP0Krw0zaWtybM37Jx4f3PbHdM",
  authDomain: "validacao-expedicao.firebaseapp.com",
  projectId: "validacao-expedicao",
  storageBucket: "validacao-expedicao.firebasestorage.app",
  messagingSenderId: "905707450575",
  appId: "1:905707450575:web:237c97c15de7ab0221c7ba"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)