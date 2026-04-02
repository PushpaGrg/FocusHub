import { useState, useEffect } from "react";
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
import { 
  FaGoogle, FaUser, FaEnvelope, FaLock, FaGraduationCap, FaUserCircle, FaArrowLeft, FaArrowRight,
  FaEye, FaEyeSlash, FaCheck, FaTimes, FaExclamationTriangle, FaCheckCircle,
  FaShieldAlt, FaKey, FaUserCheck
} from "react-icons/fa";

// Custom Dialog Components
const ErrorDialog = ({ message, onClose }) => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full text-center border border-gray-200 animate-slideUp">
      <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
        <FaExclamationTriangle />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">Authentication Error</h3>
      <p className="text-gray-600 mb-6">{message}</p>
      <button 
        onClick={onClose} 
        className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold"
      >
        OK
      </button>
    </div>
  </div>
);

const SuccessDialog = ({ message, onClose }) => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full text-center border border-gray-200 animate-slideUp">
      <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
        <FaCheckCircle />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">Success!</h3>
      <p className="text-gray-600 mb-6">{message}</p>
      <button 
        onClick={onClose} 
        className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold"
      >
        OK
      </button>
    </div>
  </div>
);

const ForgotPasswordDialog = ({ isOpen, onClose, email, onSendReset }) => (
  <div className={`fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
    <div className={`bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 transition-all ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          <FaKey />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Reset Password</h3>
        <p className="text-gray-600">Enter your email address and we'll send you a link to reset your password.</p>
      </div>
      
      <div className="space-y-4">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <FaEnvelope />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => onSendReset(e.target.value)}
            placeholder="Enter your email"
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
          />
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={() => onSendReset(email)}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold"
          >
            Send Reset Link
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default function Login({ onLogin, onBack }) {
  const [isSignup, setIsSignup] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [errorDialog, setErrorDialog] = useState(null);
  const [successDialog, setSuccessDialog] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] });
  const [isLoading, setIsLoading] = useState(false);

  // Password strength checker
  const checkPasswordStrength = (password) => {
    const feedback = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push("At least 8 characters");
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("One uppercase letter");
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("One lowercase letter");
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push("One number");
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push("One special character");
    }

    return { score, feedback };
  };

  useEffect(() => {
    if (password) {
      setPasswordStrength(checkPasswordStrength(password));
    }
  }, [password]);

  const getPasswordStrengthColor = (score) => {
    if (score <= 2) return "bg-red-500";
    if (score <= 3) return "bg-yellow-500";
    if (score <= 4) return "bg-blue-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = (score) => {
    if (score <= 2) return "Weak";
    if (score <= 3) return "Fair";
    if (score <= 4) return "Good";
    return "Strong";
  };

  const validateForm = () => {
    if (!email || !password) {
      setErrorDialog("Please fill in all required fields");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorDialog("Please enter a valid email address");
      return false;
    }

    if (isSignup) {
      if (!fullName || !username || !fieldOfStudy) {
        setErrorDialog("Please fill in all required fields");
        return false;
      }

      if (username.length < 3) {
        setErrorDialog("Username must be at least 3 characters long");
        return false;
      }

      if (passwordStrength.score < 3) {
        setErrorDialog("Password is too weak. Please include uppercase, lowercase, numbers, and special characters");
        return false;
      }

      if (password !== confirmPassword) {
        setErrorDialog("Passwords do not match");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
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
        
        // Show success message and keep user on signup page
        setSuccessDialog("✅ Account created successfully! Please check your email for the verification link. Click the link in the email to verify your account and then sign in.");
        
        // Sign out but keep user on the same page
        await signOut(auth);
        
        // Clear form but stay on signup page
        setFullName("");
        setUsername("");
        setFieldOfStudy("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setPasswordStrength({ score: 0, feedback: [] });
        
        // Don't switch to login mode - keep user on signup page
        // setIsSignup(false); // Remove this line
        
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (!user.emailVerified) {
          setErrorDialog("❗ Please verify your email first. Check your inbox for the verification link and click it to activate your account.");
          await signOut(auth);
          return;
        }
        onLogin(user);
      }
    } catch (err) {
      let errorMessage = "An error occurred during authentication";
      
      switch (err.code) {
        case "auth/email-already-in-use":
          errorMessage = "An account with this email already exists. Please sign in instead.";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address format.";
          break;
        case "auth/weak-password":
          errorMessage = "Password is too weak. Please choose a stronger password.";
          break;
        case "auth/user-not-found":
          errorMessage = "No account found with this email address.";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password. Please try again.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later.";
          break;
        default:
          errorMessage = err.message;
      }
      
      setErrorDialog(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (resetEmail = email) => {
    if (!resetEmail) {
      setErrorDialog("Please enter your email address");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      setErrorDialog("Please enter a valid email address");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setSuccessDialog("✅ Password reset email sent! Please check your inbox for the reset link.");
      setShowForgotPassword(false);
    } catch (err) {
      setErrorDialog("Failed to send password reset email. Please try again.");
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      onLogin(user);
    } catch (err) {
      let errorMessage = "Failed to sign in with Google";
      
      switch (err.code) {
        case "auth/popup-closed-by-user":
          errorMessage = "Google sign-in was cancelled";
          break;
        case "auth/popup-blocked":
          errorMessage = "Pop-up was blocked by your browser. Please allow pop-ups for this site.";
          break;
        default:
          errorMessage = err.message;
      }
      
      setErrorDialog(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gray-50">
      {/* Background elements consistent with Home */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/20 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      </div>

      {/* Navigation */}
      <button 
        onClick={onBack}
        className="absolute top-8 left-8 z-20 flex items-center gap-2 text-white/80 hover:text-white transition-all bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20"
      >
        <FaArrowLeft /> Back to Home
      </button>

      {/* Main Login Card */}
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
              
              <div className="space-y-2">
                <InputWithIcon 
                  icon={<FaLock />} 
                  placeholder="Password" 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={setPassword}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  }
                />
                
                {/* Password Strength Indicator */}
                {isSignup && password && (
                  <div className="px-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">Password Strength</span>
                      <span className={`text-xs font-semibold ${getPasswordStrengthColor(passwordStrength.score).replace('bg-', 'text-')}`}>
                        {getPasswordStrengthText(passwordStrength.score)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${getPasswordStrengthColor(passwordStrength.score)}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    {passwordStrength.feedback.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        Add: {passwordStrength.feedback.join(", ")}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isSignup && (
                <div className="space-y-2">
                  <InputWithIcon 
                    icon={<FaLock />} 
                    placeholder="Confirm Password" 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={confirmPassword} 
                    onChange={setConfirmPassword}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    }
                  />
                  {confirmPassword && password && (
                    <div className="px-2 flex items-center gap-2">
                      {password === confirmPassword ? (
                        <>
                          <FaCheck className="text-green-500 text-sm" />
                          <span className="text-xs text-green-500">Passwords match</span>
                        </>
                      ) : (
                        <>
                          <FaTimes className="text-red-500 text-sm" />
                          <span className="text-xs text-red-500">Passwords do not match</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!isSignup && (
                <div className="text-right">
                  <button 
                    type="button" 
                    onClick={() => setShowForgotPassword(true)} 
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3.5 rounded-xl font-bold shadow-lg hover:shadow-blue-500/25 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    {isSignup ? "Get Started" : "Sign In"}
                    <FaArrowRight className="text-sm" />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">Or continue with</span></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaGoogle className="text-red-500" /> Google
            </button>

            <p className="text-center mt-8 text-sm text-gray-500">
              {isSignup ? "Already have an account?" : "New to FocusHub?"}{" "}
              <button
                onClick={() => { 
                  setIsSignup(!isSignup); 
                  setError(""); 
                  setMessage(""); 
                  setPassword("");
                  setConfirmPassword("");
                  setPasswordStrength({ score: 0, feedback: [] });
                }}
                className="text-blue-600 font-bold hover:underline"
              >
                {isSignup ? "Sign In" : "Create one now"}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Custom Dialogs */}
      {errorDialog && (
        <ErrorDialog 
          message={errorDialog} 
          onClose={() => setErrorDialog(null)} 
        />
      )}
      
      {successDialog && (
        <SuccessDialog 
          message={successDialog} 
          onClose={() => setSuccessDialog(null)} 
        />
      )}

      {showForgotPassword && (
        <ForgotPasswordDialog
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          email={email}
          onSendReset={(resetEmail) => {
            if (typeof resetEmail === 'string') {
              setEmail(resetEmail);
            } else {
              handlePasswordReset();
            }
          }}
        />
      )}

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
          .animate-fadeIn { opacity: 0; animation: fadeIn 0.3s forwards; }
          .animate-slideUp { opacity: 0; animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          @keyframes fadeIn { to { opacity: 1; } }
          @keyframes slideUp { 
            from { opacity: 0; transform: translateY(20px); } 
            to { opacity: 1; transform: translateY(0); } 
          }
        `}
      </style>
    </div>
  );

}

// Enhanced Input Component with Right Icon Support
function InputWithIcon({ icon, placeholder, value, onChange, type = "text", rightIcon }) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full ${rightIcon ? 'pl-11 pr-12' : 'pl-11 pr-4'} py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all text-sm`}
        required
      />
      {rightIcon && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {rightIcon}
        </div>
      )}
    </div>
  );
}