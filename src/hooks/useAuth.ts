import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/popup-blocked') {
        setError("Das Popup wurde blockiert. Bitte erlaube Popups für diese Seite oder öffne die App in einem neuen Tab.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Google Login ist in Firebase noch nicht aktiviert.");
      } else {
        setError("Anmeldung fehlgeschlagen: " + (err.message || "Unbekannter Fehler"));
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return { user, loading, error, loginWithGoogle, logout };
}
