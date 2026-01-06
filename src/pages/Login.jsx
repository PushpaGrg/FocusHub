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
import { FaGoogle, FaUser, FaEnvelope, FaLock, FaGraduationCap, FaUserCircle, FaArrowLeft } from "react-icons/fa";

export default function Login({ onLogin, onBack }) {
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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
          fullName,
          username,
          fieldOfStudy,
          email,
          createdAt: new Date(),
        });

        await sendEmailVerification(user);
        setMessage("✅ Verification email sent! Please check your inbox before logging in.");
        await signOut(auth);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (!user.emailVerified) {
          setMessage("❗ Please verify your email first. Check your inbox.");
          await signOut(auth);
          return;
        }
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
      onLogin(user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gray-50">
      {/* 1. Background elements consistent with Home */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/20 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      </div>

      {/* 2. Navigation */}
      <button 
        onClick={onBack}
        className="absolute top-8 left-8 z-20 flex items-center gap-2 text-white/80 hover:text-white transition-all bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20"
      >
        <FaArrowLeft /> Back to Home
      </button>

      {/* 3. Main Login Card */}
      <div className="relative z-10 w-full max-w-xl px-4 py-12">
        <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Side Decor (Visible on larger screens) */}
          <div className="hidden lg:flex w-1/3 bg-gradient-to-b from-blue-500 to-purple-600 p-8 flex-col justify-between text-white">
            <div>
              <h3 className="text-2xl font-bold">FocusHub</h3>
              <p className="text-sm opacity-80 mt-2">Your journey to productivity starts here.</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm bg-white/10 p-3 rounded-xl">
                <FaGraduationCap /> Study with Peers
              </div>
              <div className="flex items-center gap-3 text-sm bg-white/10 p-3 rounded-xl">
                <FaLock /> Secure Access
              </div>
            </div>
          </div>

          {/* Right Side Form */}
          <div className="flex-1 p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {isSignup ? "Create Account" : "Welcome Back"}
              </h2>
              <p className="text-gray-500 text-sm mt-2">
                {isSignup ? "Sign up to start your study sessions" : "Sign in to access your dashboard"}
              </p>
            </div>

            {/* Error/Success Alerts */}
            {error && (
              <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-xs animate-shake">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-6 p-3 bg-blue-50 border-l-4 border-blue-500 rounded text-blue-700 text-xs">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputWithIcon icon={<FaUser />} placeholder="Full Name" value={fullName} onChange={setFullName} />
                  <InputWithIcon icon={<FaUserCircle />} placeholder="Username" value={username} onChange={setUsername} />
                  <div className="md:col-span-2">
                    <InputWithIcon icon={<FaGraduationCap />} placeholder="Field of Study" value={fieldOfStudy} onChange={setFieldOfStudy} />
                  </div>
                </div>
              )}
              
              <InputWithIcon icon={<FaEnvelope />} placeholder="Email" type="email" value={email} onChange={setEmail} />
              <InputWithIcon icon={<FaLock />} placeholder="Password" type="password" value={password} onChange={setPassword} />

              {!isSignup && (
                <div className="text-right">
                  <button type="button" onClick={handlePasswordReset} className="text-xs text-blue-600 hover:underline">
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3.5 rounded-xl font-bold shadow-lg hover:shadow-blue-500/25 transition-all transform hover:-translate-y-1"
              >
                {isSignup ? "Get Started" : "Sign In"}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">Or continue with</span></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-sm"
            >
              <FaGoogle className="text-red-500" /> Google
            </button>

            <p className="text-center mt-8 text-sm text-gray-500">
              {isSignup ? "Already have an account?" : "New to FocusHub?"}{" "}
              <button
                onClick={() => { setIsSignup(!isSignup); setError(""); setMessage(""); }}
                className="text-blue-600 font-bold hover:underline"
              >
                {isSignup ? "Sign In" : "Create one now"}
              </button>
            </p>
          </div>
        </div>
      </div>

      <style>
        {`
          .bg-grid-pattern {
            background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
            background-size: 50px 50px;
          }
          .animate-float { animation: float 10s ease-in-out infinite; }
          .animate-float-slow { animation: float 15s ease-in-out infinite; }
          @keyframes float {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(20px, -40px); }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
          }
          .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
        `}
      </style>
    </div>
  );
}

// Reusable Input Component
function InputWithIcon({ icon, placeholder, value, onChange, type = "text" }) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all text-sm"
        required
      />
    </div>
  );
}