// src/pages/Home.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { 
  FaVideo, FaUsers, FaTools, FaTachometerAlt, FaPhoneAlt, FaEnvelope, 
  FaArrowRight, FaPlay, FaStar, FaQuoteLeft, FaQuoteRight, FaCheckCircle,
  FaBrain, FaClock, FaChartLine, FaRocket, FaShieldAlt, FaLightbulb,
  FaGraduationCap, FaBookOpen, FaLaptopCode, FaMicroscope, FaPalette
} from "react-icons/fa";

// Fallback data if the Admin hasn't added any slides yet
const FALLBACK_SLIDE = {
  id: "default",
  type: "gradient",
  title: "FocusHub",
  subtitle: "Join live study rooms, collaborate with peers, and track your productivity in a shared learning space."
};

export default function Home({ onGuest, onLoginClick }) {
  const [slides, setSlides] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Mouse tracking for 3D effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch Dynamic Data from Admin Database
  useEffect(() => {
    const docRef = doc(db, "app_config", "homepage");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().heroSlides?.length > 0) {
        setSlides(docSnap.data().heroSlides);
      } else {
        setSlides([FALLBACK_SLIDE]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto-slide Logic
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const activeSlide = slides[currentIdx] || FALLBACK_SLIDE;

  return (
    <div className="font-sans relative overflow-x-hidden">
      {/* Enhanced Navbar with Glassmorphism */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/90 backdrop-blur-xl shadow-lg border-b border-white/20' 
          : 'bg-white/10 backdrop-blur-md border-b border-white/10'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaBrain className="text-white text-lg" />
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              FocusHub
            </div>
          </div>
          
          <div className="space-x-8 hidden lg:flex text-sm font-medium">
            {['Features', 'Reviews', 'Contact'].map((item, i) => (
              <a 
                key={item}
                href={`#${item.toLowerCase()}`} 
                className={`relative transition-colors ${
                  isScrolled ? 'text-gray-600 hover:text-blue-600' : 'text-white/90 hover:text-white'
                } group`}
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 transition-all group-hover:w-full"></span>
              </a>
            ))}
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={onGuest}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                isScrolled 
                  ? 'text-gray-600 hover:text-blue-600 border border-gray-300 hover:border-blue-300' 
                  : 'text-white/90 hover:text-white border border-white/30 hover:border-white/60'
              }`}
            >
              Try as Guest
            </button>
            <button 
              onClick={onLoginClick} 
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-xl hover:shadow-blue-500/30 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Enhanced Hero Section with 3D Effects */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Dynamic Background with Enhanced Effects */}
        <div className="absolute inset-0 z-0">
          {activeSlide.type === 'video' ? (
            <video key={activeSlide.url} src={activeSlide.url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
          ) : activeSlide.type === 'image' ? (
            <img key={activeSlide.url} src={activeSlide.url} alt="Background" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
              {/* Enhanced animated background elements */}
              <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-full blur-3xl animate-float"></div>
              <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-full blur-3xl animate-float-slow"></div>
              <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-r from-pink-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
              
              {/* Grid pattern */}
              <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
              
              {/* Mouse-following spotlight effect */}
              <div 
                className="absolute w-96 h-96 rounded-full bg-white/5 pointer-events-none"
                style={{
                  left: mousePosition.x - 192,
                  top: mousePosition.y - 192,
                  background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)'
                }}
              />
            </div>
          )}
          
          {/* Enhanced overlay */}
          <div className={`absolute inset-0 ${
            activeSlide.type === 'gradient' 
              ? 'bg-gradient-to-b from-transparent via-black/20 to-black/40' 
              : 'bg-gradient-to-b from-black/70 via-black/50 to-black/80'
          }`} />
        </div>

        {/* Hero Content with Enhanced Animations */}
        <div className="relative z-10 text-center px-6 max-w-6xl mx-auto pt-20">
          <div className="animate-slideUp">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 mb-8 text-white/90 text-sm font-medium">
              <FaShieldAlt className="text-green-400" />
              Trusted by 10,000+ Students Worldwide
            </div>
            
            {/* Main Title */}
            <h1 className="text-6xl md:text-8xl font-black mb-8 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent leading-tight tracking-tight">
              {activeSlide.title}
            </h1>
            
            {/* Enhanced Subtitle */}
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
              {activeSlide.subtitle}
            </p>
            
            {/* Enhanced CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <button
                onClick={onLoginClick}
                className="group relative px-12 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-2xl hover:shadow-blue-500/50 transition-all transform hover:scale-105 active:scale-95 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Start Focusing
                  <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              
              <button
                onClick={onGuest}
                className="group px-12 py-5 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white rounded-2xl font-bold text-lg hover:bg-white/20 hover:border-white/50 transition-all transform hover:scale-105 active:scale-95 shadow-xl"
              >
                <span className="flex items-center gap-3">
                  <FaPlay className="text-sm" />
                  Try as Guest
                </span>
              </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              {[
                { number: '10K+', label: 'Active Students' },
                { number: '95%', label: 'Success Rate' },
                { number: '4.9★', label: 'User Rating' }
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold text-white mb-1">{stat.number}</div>
                  <div className="text-white/70 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Slider Indicators */}
        {slides.length > 1 && (
          <div className="absolute bottom-10 flex gap-3 z-10">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIdx(index)}
                className={`transition-all duration-500 rounded-full ${
                  index === currentIdx 
                    ? 'w-12 h-3 bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg' 
                    : 'w-3 h-3 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="py-16 px-6 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 rounded-full px-4 py-2 mb-6 text-sm font-semibold">
              <FaLightbulb />
              Powerful Features
            </div>
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
              Everything You Need to Excel
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive suite of study tools helps you stay focused, organized, and motivated throughout your academic journey.
            </p>
          </div>

          {/* Enhanced Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <FaVideo />,
                title: "Study Rooms",
                desc: "Create study rooms with unique invite links. Share with friends and collaborate in real-time with video, chat, and shared resources.",
                color: "blue",
                stats: "HD Video",
                gradient: "from-blue-500 to-cyan-500"
              },
              {
                icon: <FaUsers />,
                title: "Invite System",
                desc: "Generate unique invite links for your study rooms. Perfect for study groups, class projects, and exam preparation sessions.",
                color: "green", 
                stats: "Instant Access",
                gradient: "from-green-500 to-emerald-500"
              },
              {
                icon: <FaBrain />,
                title: "Focus Tools",
                desc: "Pomodoro timers, distraction blockers, and ambient sounds to optimize your study sessions and maintain concentration.",
                color: "purple",
                stats: "2x Focus",
                gradient: "from-purple-500 to-pink-500"
              },
              {
                icon: <FaChartLine />,
                title: "Progress Analytics",
                desc: "Detailed insights into your study patterns, productivity trends, and learning outcomes with visual dashboards.",
                color: "orange",
                stats: "Real-time",
                gradient: "from-orange-500 to-red-500"
              },
              {
                icon: <FaBookOpen />,
                title: "Resource Sharing",
                desc: "Share study materials, notes, and resources within your study room. Collaborate on documents and presentations.",
                color: "indigo",
                stats: "Unlimited",
                gradient: "from-indigo-500 to-blue-500"
              },
              {
                icon: <FaRocket />,
                title: "Gamified Learning",
                desc: "Earn points, badges, and rewards as you achieve your study goals. Stay motivated with achievement tracking.",
                color: "pink",
                stats: "50+ Badges",
                gradient: "from-pink-500 to-rose-500"
              }
            ].map((feature, i) => (
              <div 
                key={i}
                className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 overflow-hidden"
              >
                {/* Gradient Border Effect */}
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl`} />
                <div className="relative z-10">
                  {/* Icon with gradient background */}
                  <div className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center text-white text-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  
                  {/* Stats Badge */}
                  <div className="absolute top-8 right-8 bg-gray-900 text-white text-xs px-2 py-1 rounded-full font-bold">
                    {feature.stats}
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed mb-6">{feature.desc}</p>
                  
                  {/* Functional Learn More Link */}
                  <button 
                    onClick={() => {
                      // Scroll to relevant section based on feature
                      if (feature.title.includes('Study Rooms') || feature.title.includes('Invite')) {
                        document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                      } else if (feature.title.includes('Focus')) {
                        document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="flex items-center gap-2 text-gray-900 font-semibold hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    Get Started
                    <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Reviews Section */}
      <section id="reviews" className="py-16 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 rounded-full px-4 py-2 mb-6 text-sm font-semibold">
              <FaStar />
              Student Success Stories
            </div>
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent">
              Hear From Our Community
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join thousands of students who have transformed their study habits with FocusHub.
            </p>
          </div>

          {/* Enhanced Review Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Chen",
                role: "Medical Student",
                text: "FocusHub completely revolutionized how I study for exams. The focus rooms and accountability features helped me maintain a 4.0 GPA while balancing clinical rotations.",
                rating: 5,
                avatar: "SC"
              },
              {
                name: "Marcus Johnson",
                role: "Computer Science Major",
                text: "Found the perfect study group for Data Structures in minutes. The collaborative coding sessions and shared whiteboard made complex concepts click!",
                rating: 5,
                avatar: "MJ"
              },
              {
                name: "Emily Rodriguez",
                role: "Graduate Student",
                text: "The analytics dashboard helped me identify my peak study hours. I've increased my productivity by 200% and actually have time for hobbies now!",
                rating: 5,
                avatar: "ER"
              }
            ].map((review, i) => (
              <div 
                key={i}
                className="group bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 relative overflow-hidden"
              >
                {/* Quote Icon */}
                <div className="absolute top-6 right-6 text-purple-200 text-6xl opacity-50">
                  <FaQuoteRight />
                </div>
                
                {/* Rating */}
                <div className="flex gap-1 mb-6">
                  {[...Array(review.rating)].map((_, i) => (
                    <FaStar key={i} className="text-yellow-400 text-xl" />
                  ))}
                </div>
                
                {/* Review Text */}
                <p className="text-gray-700 text-lg leading-relaxed mb-8 italic">
                  "{review.text}"
                </p>
                
                {/* Author Info */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    {review.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{review.name}</div>
                    <div className="text-gray-500 text-sm">{review.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Contact Section */}
      <section id="contact" className="py-32 px-6 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-float-slow"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Header */}
          <div className="mb-16">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 mb-6 text-sm font-semibold">
              <FaRocket />
              Ready to Get Started?
            </div>
            <h2 className="text-5xl font-bold mb-6">Transform Your Study Journey Today</h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Join thousands of students who are already achieving their academic goals with FocusHub.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <button
              onClick={onLoginClick}
              className="group px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-2xl hover:shadow-blue-500/50 transition-all transform hover:scale-105 flex items-center justify-center gap-3"
            >
              Start Free Trial
              <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onGuest}
              className="px-10 py-4 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white rounded-2xl font-bold text-lg hover:bg-white/20 transition-all"
            >
              Explore as Guest
            </button>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="flex items-center justify-center gap-4 bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <FaEnvelope className="text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold mb-1">Email Support</div>
                <div className="text-white/70">support@focushub.com</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <FaPhoneAlt className="text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold mb-1">Phone Support</div>
                <div className="text-white/70">+977 9812345678</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 pt-8">
            <p className="text-white/60 text-sm">
              2025 FocusHub. Made with for students worldwide.
            </p>
          </div>
        </div>
      </section>

      <style>{`
        html { scroll-behavior: smooth; }
        
        .bg-grid-pattern {
          background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), 
                           linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        
        .animate-fadeIn { opacity: 0; animation: fadeIn 1s forwards; }
        .animate-slideUp { opacity: 0; animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes fadeIn { 
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp { 
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-slow { animation: float 10s ease-in-out infinite; }
        
        @keyframes float { 
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }

        /* Enhanced animations for better UX */
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        /* Smooth scroll behavior */
        * {
          scroll-behavior: smooth;
        }

        /* Enhanced hover states */
        .group:hover .group-hover\\:translate-x-1 {
          transform: translateX(4px);
        }

        /* Better focus states for accessibility */
        button:focus-visible {
          outline: 2px solid rgba(59, 130, 246, 0.5);
          outline-offset: 2px;
        }

        /* Enhanced transitions */
        .transition-all {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}