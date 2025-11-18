// src/pages/Login.jsx
import { useState } from "react";
import { auth, provider, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (isSignup) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save additional info in Firestore
        await setDoc(doc(db, "users", user.uid), {
          fullName,
          username,
          email,
          fieldOfStudy,
          createdAt: new Date(),
        });

        onLogin(user);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onLogin(auth.currentUser);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      onLogin(user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-purple-200 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">{isSignup ? "Sign Up" : "Login"}</h1>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Username"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                type="text"
                placeholder="Field of Study / Interests"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition"
          >
            {isSignup ? "Sign Up" : "Login"}
          </button>
        </form>

        <p className="text-center mt-4 text-gray-500">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            className="text-blue-600 font-semibold underline"
            onClick={() => setIsSignup(!isSignup)}
          >
            {isSignup ? "Login" : "Sign Up"}
          </button>
        </p>

        <div className="my-4 flex items-center">
          <hr className="flex-1 border-gray-300" />
          <span className="mx-2 text-gray-400">or</span>
          <hr className="flex-1 border-gray-300" />
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-semibold transition"
        >
          <FaGoogle /> Continue with Google
        </button>

        <p className="text-center mt-4 text-gray-400 text-sm">
          By signing up, you agree to our <span className="underline">Terms</span> and <span className="underline">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
