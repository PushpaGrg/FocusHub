// src/pages/Login.jsx
import { useState } from "react";
import { auth, provider, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { FaGoogle } from "react-icons/fa";

export default function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      if (isSignup) {
        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save extra info
        await setDoc(doc(db, "users", user.uid), {
          fullName,
          username,
          fieldOfStudy,
          email,
          createdAt: new Date(),
        });

        // Send verification email
        await sendEmailVerification(user);

        // Show message and sign out immediately to prevent auto-login
        setMessage("✅ Verification email sent! Please check your inbox before logging in.");
        await signOut(auth);
      } else {
        // Login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (!user.emailVerified) {
          setMessage("❗ Please verify your email first. Check your inbox.");
          await signOut(auth);
          return;
        }

        // Successful login
        onLogin(user);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePasswordReset = async () => {
    setError("");
    setMessage("");
    if (!email) return setError("Please enter your email first");
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("✅ Password reset email sent! Check your inbox.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setMessage("");
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user.emailVerified) {
        await signOut(auth);
        setMessage("❗ Google account detected but email not verified. Please verify first.");
        return;
      }

      onLogin(user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg">
      <h2 className="text-center text-2xl font-bold mb-4">{isSignup ? "Sign Up" : "Login"}</h2>

      {error && <p className="text-red-500 mb-2">{error}</p>}
      {message && <p className="text-blue-600 mb-2">{message}</p>}

      <form onSubmit={handleSubmit} className="space-y-3">
        {isSignup && (
          <>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full Name" className="w-full p-2 border rounded"/>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="w-full p-2 border rounded"/>
            <input value={fieldOfStudy} onChange={e => setFieldOfStudy(e.target.value)} placeholder="Field of Study" className="w-full p-2 border rounded"/>
          </>
        )}
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full p-2 border rounded" required />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full p-2 border rounded" required />

        <p className="text-sm text-blue-600 cursor-pointer text-right" onClick={handlePasswordReset}>
          Forgot Password?
        </p>

        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded mt-2 hover:bg-blue-700 transition">
          {isSignup ? "Sign Up" : "Login"}
        </button>
      </form>

      <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-2 bg-red-500 text-white py-2 rounded mt-2 hover:bg-red-600 transition">
        <FaGoogle /> Continue with Google
      </button>

      <p className="text-center mt-2">
        {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
        <span onClick={() => setIsSignup(!isSignup)} className="text-blue-600 cursor-pointer underline">
          {isSignup ? "Login" : "Sign Up"}
        </span>
      </p>
    </div>
  );
}
