// src/pages/Home.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { FaVideo, FaUsers, FaTools, FaTachometerAlt, FaPhoneAlt, FaEnvelope } from "react-icons/fa";

// Fallback data if the Admin hasn't added any slides yet
const FALLBACK_SLIDE = {
  id: "default",
  type: "gradient", // Triggers your original CSS background
  title: "FocusHub",
  subtitle: "Join live study rooms, collaborate with peers, and track your productivity in a shared learning space."
};

export default function Home({ onGuest, onLoginClick }) {
  const [slides, setSlides] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // 1. Fetch Dynamic Data from Admin Database
  useEffect(() => {
    const docRef = doc(db, "app_config", "homepage");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().heroSlides?.length > 0) {
        setSlides(docSnap.data().heroSlides);
      } else {
        setSlides([FALLBACK_SLIDE]); // Use your original design if empty
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Auto-slide Logic (Changes every 6 seconds)
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const activeSlide = slides[currentIdx] || FALLBACK_SLIDE;

  return (
    <div className="font-sans relative">
      {/* Navbar (Untouched) */}
      <nav className="fixed w-full bg-white/95 backdrop-blur-md shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            FocusHub
          </div>
          <div className="space-x-6 hidden md:flex text-sm font-medium">
            <a href="#features" className="text-gray-600 hover:text-blue-600 transition">Features</a>
            <a href="#reviews" className="text-gray-600 hover:text-blue-600 transition">Reviews</a>
            <a href="#contact" className="text-gray-600 hover:text-blue-600 transition">Contact</a>
          </div>
          <div className="space-x-4">
            <button onClick={onLoginClick} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2 rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition transform hover:scale-105 active:scale-95 shadow-md">Login / Sign Up</button>
          </div>
        </div>
      </nav>

      {/* DYNAMIC HERO SECTION */}
      <section className="relative min-h-screen flex flex-col justify-center items-center text-center p-6 overflow-hidden bg-gray-900 transition-colors duration-1000">
        
        {/* Dynamic Background Media */}
        <div className="absolute inset-0 z-0">
            {activeSlide.type === 'video' ? (
                <video key={activeSlide.url} src={activeSlide.url} autoPlay muted loop playsInline className="w-full h-full object-cover opacity-50 animate-fadeIn" />
            ) : activeSlide.type === 'image' ? (
                <img key={activeSlide.url} src={activeSlide.url} alt="Background" className="w-full h-full object-cover opacity-50 animate-fadeIn" />
            ) : (
                // Your original fallback animated gradient
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 animate-fadeIn">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float"></div>
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-float-slow"></div>
                    <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                </div>
            )}
            {/* Dark overlay for text readability when using images/videos */}
            {activeSlide.type !== 'gradient' && <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/80"></div>}
        </div>

        {/* Content */}
        <div className="relative z-10 text-white max-w-4xl mt-16">
          <h1 key={`title-${currentIdx}`} className="text-5xl md:text-7xl font-black mb-6 animate-slideUp drop-shadow-2xl tracking-tight leading-tight">
            {activeSlide.title}
          </h1>
          <p key={`subtitle-${currentIdx}`} className="text-lg md:text-2xl max-w-2xl mb-12 animate-slideUp delay-200 opacity-90 mx-auto leading-relaxed drop-shadow-md">
            {activeSlide.subtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center w-full animate-fadeIn delay-400">
            <button
              className="w-full sm:w-auto min-w-[200px] bg-white text-blue-600 px-10 py-4 rounded-2xl font-bold hover:scale-105 transition transform shadow-2xl"
              onClick={onLoginClick}
            >
              Start Focusing
            </button>
            <button
              className="w-full sm:w-auto min-w-[200px] bg-white/10 backdrop-blur-md border-2 border-white/30 text-white px-10 py-4 rounded-2xl font-bold hover:bg-white/20 transition transform hover:scale-105 shadow-xl"
              onClick={onGuest}
            >
              Try as Guest
            </button>
          </div>
        </div>

        {/* Slider Indicators (Dots at the bottom) */}
        {slides.length > 1 && (
            <div className="absolute bottom-10 flex gap-3 z-10">
                {slides.map((_, index) => (
                    <div 
                        key={index} 
                        onClick={() => setCurrentIdx(index)}
                        className={`transition-all duration-500 rounded-full cursor-pointer ${index === currentIdx ? 'w-10 h-2.5 bg-blue-500 shadow-lg shadow-blue-500/50' : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/70'}`}
                    ></div>
                ))}
            </div>
        )}
      </section>

      {/* Features Section (Untouched) */}
      <section id="features" className="py-24 px-6 bg-white">
        <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Powerful Study Tools
        </h2>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <FeatureCard icon={<FaVideo />} title="Study Rooms" desc="Real-time video and chat study sessions." color="blue" />
          <FeatureCard icon={<FaUsers />} title="Study Buddies" desc="Match with peers who share your goals." color="green" />
          <FeatureCard icon={<FaTools />} title="Productivity" desc="Flashcards, timers, and task management." color="pink" />
          <FeatureCard icon={<FaTachometerAlt />} title="Analytics" desc="Detailed insights into your study habits." color="yellow" />
        </div>
      </section>

      {/* Reviews Section (Untouched) */}
      <section id="reviews" className="py-24 px-6 bg-gray-50">
        <h2 className="text-4xl font-bold text-center mb-16 text-gray-800">Community Stories</h2>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <ReviewCard name="Alice" text="Changed how I study for exams. No more distractions!" />
          <ReviewCard name="Bob" text="Found a study group for Organic Chem in 5 minutes." />
          <ReviewCard name="Carol" text="The dashboard helps me visualize my progress beautifully." />
        </div>
      </section>

      {/* Contact & Footer (Untouched) */}
      <section id="contact" className="py-20 bg-gray-900 text-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-8">Ready to boost your grades?</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-8 mb-12">
            <div className="flex items-center gap-3 justify-center"><FaEnvelope className="text-blue-400"/> support@focushub.com</div>
            <div className="flex items-center gap-3 justify-center"><FaPhoneAlt className="text-purple-400"/> +977 9812345678</div>
          </div>
          <p className="text-gray-500 text-sm">© 2025 FocusHub. Made with ❤️ for students.</p>
        </div>
      </section>

      <style>{`
        html { scroll-behavior: smooth; }
        .bg-grid-pattern {
          background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .animate-fadeIn { opacity: 0; animation: fadeIn 0.8s forwards; }
        .animate-slideUp { opacity: 0; animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-400 { animation-delay: 0.4s; }
        
        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-slow { animation: float 10s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
      `}</style>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }) {
  const colors = {
    blue: "border-blue-500", green: "border-green-500", pink: "border-pink-500", yellow: "border-yellow-500"
  };
  return (
    <div className={`bg-white p-8 rounded-3xl shadow-lg border-b-8 ${colors[color]} hover:shadow-2xl transition-all hover:-translate-y-2`}>
      <div className="text-3xl text-blue-600 mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-500 text-sm">{desc}</p>
    </div>
  );
}

function ReviewCard({ name, text }) {
  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
      <div className="text-yellow-400 text-lg mb-4">★★★★★</div>
      <p className="text-gray-600 italic mb-6">"{text}"</p>
      <div className="font-bold text-gray-800">— {name}</div>
    </div>
  );
}