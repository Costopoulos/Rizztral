import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBArnNtHo6fPdLMaQuhxJmOE0bpG4cYHnQ",
  authDomain: "rizztral.firebaseapp.com",
  projectId: "rizztral",
  storageBucket: "rizztral.firebasestorage.app",
  messagingSenderId: "1082161165894",
  appId: "1:1082161165894:web:cd9a46e74893522b68fc47"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export { app };