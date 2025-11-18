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
      <nav className="fixed w-full bg-white shadow z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-blue-600 cursor-pointer">FocusHub</div>
          <div className="space-x-6 hidden md:flex">
            <a href="#features" className="text-gray-700 hover:text-blue-600 transition">Features</a>
            <a href="#reviews" className="text-gray-700 hover:text-blue-600 transition">Reviews</a>
            <a href="#contact" className="text-gray-700 hover:text-blue-600 transition">Contact</a>
          </div>
          <div className="space-x-4">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
              onClick={handleLoginClick}
            >
              Login / Sign Up
            </button>
            <button
              className="bg-transparent border-2 border-blue-500 text-blue-500 px-4 py-2 rounded hover:bg-blue-500 hover:text-white transition"
              onClick={onGuest}
            >
              Continue as Guest
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-500 to-purple-600 text-white min-h-screen flex flex-col justify-center items-center text-center p-6 pt-32">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 animate-fadeIn">FocusHub</h1>
        <p className="text-lg md:text-xl max-w-2xl mb-8 animate-fadeIn delay-200">
          Join live study rooms, collaborate with peers, track your productivity, and take your learning to the next level.
        </p>
        <div className="flex flex-col md:flex-row gap-4 animate-fadeIn delay-400">
          <button
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:scale-105 transition transform"
            onClick={handleLoginClick}
          >
            Login / Sign Up
          </button>
          <button
            className="bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg font-bold hover:bg-white hover:text-blue-600 transition"
            onClick={onGuest}
          >
            Continue as Guest
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-gray-50">
        <h2 className="text-3xl font-bold text-center mb-12">Why FocusHub?</h2>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition transform hover:-translate-y-2 text-center">
            <FaVideo size={40} className="mx-auto text-blue-500 mb-4" />
            <h3 className="font-bold text-xl mb-2">Live Study Rooms</h3>
            <p className="text-gray-600">Join real-time focused study sessions with peers.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition transform hover:-translate-y-2 text-center">
            <FaUsers size={40} className="mx-auto text-green-500 mb-4" />
            <h3 className="font-bold text-xl mb-2">Study Buddy System</h3>
            <p className="text-gray-600">Find partners to stay accountable and motivated.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition transform hover:-translate-y-2 text-center">
            <FaTools size={40} className="mx-auto text-pink-500 mb-4" />
            <h3 className="font-bold text-xl mb-2">Study Tools</h3>
            <p className="text-gray-600">Organize notes, tasks, and flashcards efficiently.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition transform hover:-translate-y-2 text-center">
            <FaTachometerAlt size={40} className="mx-auto text-yellow-500 mb-4" />
            <h3 className="font-bold text-xl mb-2">Personal Dashboard</h3>
            <p className="text-gray-600">Track productivity, sessions, and progress with analytics.</p>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-20 px-6 bg-gray-100">
        <h2 className="text-3xl font-bold text-center mb-12">What Users Say</h2>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition transform hover:-translate-y-2 text-center">
            <p className="text-gray-600 mb-4">
              "FocusHub helped me stay on track and made my study sessions so much more effective!"
            </p>
            <p className="font-bold">- Alice</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition transform hover:-translate-y-2 text-center">
            <p className="text-gray-600 mb-4">
              "The study buddy system keeps me accountable and motivated!"
            </p>
            <p className="font-bold">- Bob</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition transform hover:-translate-y-2 text-center">
            <p className="text-gray-600 mb-4">
              "Personal dashboards make tracking my progress so easy."
            </p>
            <p className="font-bold">- Carol</p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-6 bg-blue-600 text-white">
        <h2 className="text-3xl font-bold text-center mb-12">Contact Us</h2>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-center gap-12 text-center">
          <div className="flex flex-col items-center">
            <FaPhoneAlt size={28} className="mb-2" />
            <p>+977 9812345678</p>
          </div>
          <div className="flex flex-col items-center">
            <FaEnvelope size={28} className="mb-2" />
            <p>support@focushub.com</p>
          </div>
        </div>
      </section>

      <footer className="py-6 bg-gray-800 text-white text-center">
        &copy; 2025 FocusHub. All rights reserved.
      </footer>

      {/* Show Login Modal */}
      {/* Show Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-white p-8 rounded shadow-md w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 font-bold"
              onClick={() => setShowLogin(false)}
            >
              ✕
            </button>
            <Login onLogin={() => setShowLogin(false)} />
          </div>
        </div>
      )}


      {/* Smooth scroll and animations */}
      <style>
        {`
          html { scroll-behavior: smooth; }
          .animate-fadeIn { opacity: 0; animation: fadeIn 1s forwards; }
          .animate-fadeIn.delay-200 { animation-delay: 0.2s; }
          .animate-fadeIn.delay-400 { animation-delay: 0.4s; }
          @keyframes fadeIn { to { opacity: 1; } }
        `}
      </style>
    </div>
  );
}
