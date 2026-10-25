import { initializeApp } from
"https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import { getFirestore }
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {

  apiKey: "YOUR_API_KEY",

  authDomain:
    "your-project.firebaseapp.com",

  projectId:
    "your-project-id",

  storageBucket:
    "your-project.appspot.com",

  messagingSenderId:
    "123456789",

  appId:
    "APP_ID"
};

const app =
    initializeApp(firebaseConfig);

export const db =
    getFirestore(app);
