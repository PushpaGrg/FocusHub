// src/pages/Home.jsx
import { useState } from "react";
import { FaVideo, FaUsers, FaTools, FaTachometerAlt, FaPhoneAlt, FaEnvelope } from "react-icons/fa";
import Login from "./Login";

export default function Home({ onGuest }) {
  const [showLogin, setShowLogin] = useState(false);

  const handleLoginClick = () => setShowLogin(true);

  return (
    <div className="font-sans relative">
      {/* Navbar */}
      <nav className="fixed w-full bg-white/95 backdrop-blur-sm shadow z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent cursor-pointer">
            FocusHub
          </div>
          <div className="space-x-6 hidden md:flex">
            <a href="#features" className="text-gray-700 hover:text-blue-600 transition">Features</a>
            <a href="#reviews" className="text-gray-700 hover:text-blue-600 transition">Reviews</a>
            <a href="#contact" className="text-gray-700 hover:text-blue-600 transition">Contact</a>
          </div>
          <div className="space-x-4">
            <button
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition transform hover:scale-105 shadow-md"
              onClick={handleLoginClick}
            >
              Login / Sign Up
            </button>
            <button
              className="bg-transparent border-2 border-blue-500 text-blue-500 px-4 py-2 rounded-lg hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white hover:border-transparent transition"
              onClick={onGuest}
            >
              Continue as Guest
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section with Animated Background */}
      <section className="relative min-h-screen flex flex-col justify-center items-center text-center p-6 pt-32 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500">
          {/* Floating Circles Animation */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute top-40 right-20 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-float-delayed"></div>
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-pink-400/15 rounded-full blur-3xl animate-float-slow"></div>
          
          {/* Grid Pattern Overlay */}
          <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-white">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-4 animate-fadeIn drop-shadow-2xl">
            FocusHub
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mb-8 animate-fadeIn delay-200 drop-shadow-lg">
            Join live study rooms, collaborate with peers, track your productivity, and take your learning to the next level.
          </p>
          <div className="flex flex-col md:flex-row gap-4 animate-fadeIn delay-400">
            <button
              className="bg-gradient-to-r from-white to-gray-100 text-blue-600 px-8 py-4 rounded-xl font-bold hover:scale-105 transition transform shadow-2xl hover:shadow-blue-500/50"
              onClick={handleLoginClick}
            >
              Login / Sign Up
            </button>
            <button
              className="bg-gradient-to-r from-purple-600 to-pink-600 border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:scale-105 transition transform shadow-2xl hover:shadow-pink-500/50"
              onClick={onGuest}
            >
              Continue as Guest
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce z-10">
          <svg className="w-6 h-6 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-gray-50">
        <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Why FocusHub?
        </h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          Discover powerful features designed to enhance your learning experience
        </p>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-2 text-center border-t-4 border-blue-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
              <FaVideo size={32} className="text-white" />
            </div>
            <h3 className="font-bold text-xl mb-2">Live Study Rooms</h3>
            <p className="text-gray-600">Join real-time focused study sessions with peers.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-2 text-center border-t-4 border-green-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <FaUsers size={32} className="text-white" />
            </div>
            <h3 className="font-bold text-xl mb-2">Study Buddy System</h3>
            <p className="text-gray-600">Find partners to stay accountable and motivated.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-2 text-center border-t-4 border-pink-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center">
              <FaTools size={32} className="text-white" />
            </div>
            <h3 className="font-bold text-xl mb-2">Study Tools</h3>
            <p className="text-gray-600">Organize notes, tasks, and flashcards efficiently.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-2 text-center border-t-4 border-yellow-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
              <FaTachometerAlt size={32} className="text-white" />
            </div>
            <h3 className="font-bold text-xl mb-2">Personal Dashboard</h3>
            <p className="text-gray-600">Track productivity, sessions, and progress with analytics.</p>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-20 px-6 bg-gradient-to-br from-gray-50 to-blue-50">
        <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          What Users Say
        </h2>
        <p className="text-center text-gray-600 mb-12">Real feedback from our community</p>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-2 border-l-4 border-blue-500">
            <div className="text-5xl mb-4">⭐⭐⭐⭐⭐</div>
            <p className="text-gray-600 mb-4 italic">
              "FocusHub helped me stay on track and made my study sessions so much more effective!"
            </p>
            <p className="font-bold text-blue-600">- Alice</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-2 border-l-4 border-purple-500">
            <div className="text-5xl mb-4">⭐⭐⭐⭐⭐</div>
            <p className="text-gray-600 mb-4 italic">
              "The study buddy system keeps me accountable and motivated!"
            </p>
            <p className="font-bold text-purple-600">- Bob</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-2 border-l-4 border-pink-500">
            <div className="text-5xl mb-4">⭐⭐⭐⭐⭐</div>
            <p className="text-gray-600 mb-4 italic">
              "Personal dashboards make tracking my progress so easy."
            </p>
            <p className="font-bold text-pink-600">- Carol</p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-center mb-4">Contact Us</h2>
          <p className="text-center mb-12 opacity-90">We'd love to hear from you</p>
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-center gap-12 text-center">
            <div className="flex flex-col items-center bg-white/10 backdrop-blur-sm p-6 rounded-xl hover:bg-white/20 transition">
              <FaPhoneAlt size={28} className="mb-2" />
              <p className="font-semibold">+977 9812345678</p>
            </div>
            <div className="flex flex-col items-center bg-white/10 backdrop-blur-sm p-6 rounded-xl hover:bg-white/20 transition">
              <FaEnvelope size={28} className="mb-2" />
              <p className="font-semibold">support@focushub.com</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-6 bg-gray-900 text-white text-center">
        <p>&copy; 2025 FocusHub. All rights reserved.</p>
        <p className="text-sm text-gray-400 mt-2">Made with ❤️ for students worldwide</p>
      </footer>

      {/* Show Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md relative animate-slideUp">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 font-bold text-2xl transition"
              onClick={() => setShowLogin(false)}
            >
              ✕
            </button>
            <Login onLogin={() => setShowLogin(false)} />
          </div>
        </div>
      )}

      {/* Styles */}
      <style>
        {`
          html { scroll-behavior: smooth; }
          
          /* Fade In Animations */
          .animate-fadeIn { 
            opacity: 0; 
            animation: fadeIn 1s forwards; 
          }
          .animate-fadeIn.delay-200 { animation-delay: 0.2s; }
          .animate-fadeIn.delay-400 { animation-delay: 0.4s; }
          
          @keyframes fadeIn { 
            to { opacity: 1; } 
          }

          /* Floating Animations */
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          .animate-float-delayed {
            animation: float 8s ease-in-out infinite;
            animation-delay: 1s;
          }
          .animate-float-slow {
            animation: float 10s ease-in-out infinite;
            animation-delay: 2s;
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            25% { transform: translateY(-20px) translateX(10px); }
            50% { transform: translateY(-40px) translateX(-10px); }
            75% { transform: translateY(-20px) translateX(10px); }
          }

          /* Grid Pattern */
          .bg-grid-pattern {
            background-image: 
              linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
            background-size: 50px 50px;
          }

          /* Slide Up Animation */
          .animate-slideUp {
            animation: slideUp 0.3s ease-out;
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}