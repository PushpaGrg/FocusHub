// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { auth } from "../firebase";
import { useEffect, useState } from "react";

export default function ProtectedRoute({ children, isGuest }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!user && isGuest) {
    alert("You must login or sign up to enter a study room!");
    return <Navigate to="/" replace />;
  }

  if (!user && !isGuest) return <Navigate to="/" replace />;

  return children;
}
