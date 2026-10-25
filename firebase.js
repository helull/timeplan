import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import { getFirestore }
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDgxepR17v3SquIBubNK1V36FiPAox2rEM",
  authDomain: "timeplan-8c778.firebaseapp.com",
  projectId: "timeplan-8c778",
  storageBucket: "timeplan-8c778.firebasestorage.app",
  messagingSenderId: "649347344670",
  appId: "1:649347344670:web:7c7df8c5505212536c410f"
};

const app =
    initializeApp(firebaseConfig);

export const db =
    getFirestore(app);
