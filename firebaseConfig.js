// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";

import { getFirestore, query, getDocs, collection, where, addDoc} from "firebase/firestore";


// TODO: Add SDKs for Firebase products that you want to use

// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration

// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {

  apiKey: "AIzaSyDSV1pIxPAaBnrOa5xXCgl2KFwRdF4c3WU",

  authDomain: "all-sample-projects-34369.firebaseapp.com",

  projectId: "all-sample-projects-34369",

  storageBucket: "all-sample-projects-34369.appspot.com",

  messagingSenderId: "333339748769",

  appId: "1:333339748769:web:9a4bbd2cf782b65b8803e0",

  measurementId: "G-TFL75JXHCY"

};


// Initialize Firebase

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
  auth,
  db,
};