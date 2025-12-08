import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCfvh-Vs69oXVJIFTFeTHthCIIn_9f78tQ",
  authDomain: "twitter-clone-joonsung.firebaseapp.com",
  projectId: "twitter-clone-joonsung",
  storageBucket: "twitter-clone-joonsung.firebasestorage.app",
  messagingSenderId: "813371597754",
  appId: "1:813371597754:web:ec2807a2e3b641285df383",
  measurementId: "G-ZLF1WLNKQ6"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);