import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCLGZf6eTcUhCTA5-f4dSBkaxbexx8dCMo",
  authDomain: "teamstellarx-b532e.firebaseapp.com",
  projectId: "teamstellarx-b532e",
  storageBucket: "teamstellarx-b532e.firebasestorage.app",
  messagingSenderId: "451013396917",
  appId: "1:451013396917:web:7b5ee05e8f1c2eb81631fc",
  measurementId: "G-J7D3S8NSHZ"
};

// Initialize secondary Firebase app
const app = initializeApp(firebaseConfig, 'googleAuthApp');
export const googleAuth = getAuth(app);

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(googleAuth, provider);
    const user = result.user;
    
    // Check for domain restriction
    if (!user.email || !user.email.endsWith('@indiamart.com')) {
      await googleAuth.signOut();
      throw new Error("Only @indiamart.com emails are allowed to login.");
    }
    
    return user;
  } catch (error) {
    throw error;
  }
};
