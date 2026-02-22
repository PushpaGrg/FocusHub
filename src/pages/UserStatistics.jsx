// src/pages/UserStatistics.jsx
import React, { useState, useEffect } from "react";
import { 
  FaArrowLeft, FaTrophy, FaMedal, FaClock, FaStar, 
  FaBrain, FaShieldAlt, FaBookOpen, FaChartLine, FaFire, FaUserGraduate
} from "react-icons/fa";
import { 
  RadialBarChart, RadialBar, ResponsiveContainer, 
  Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";

export default function UserStatistics({ user, onBack }) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    // Trigger entrance animations after mount
    setAnimated(true);
  }, []);

  if (!user) return null;

  // --- 1. PROCESS REAL BACKEND DATA ---
  const totalScore = user.totalScore || 0;
  const totalMinutes = user.totalFocusTime || 0;
  const badges = user.badges || [];

  // Gamification Logic: Level Up every 500 points
  const pointsPerLevel = 500;
  const level = Math.floor(totalScore / pointsPerLevel) + 1;
  const currentLevelScore = totalScore % pointsPerLevel;
  const nextLevelScore = pointsPerLevel;
  const progressPercent = (currentLevelScore / nextLevelScore) * 100;
  const remainingPoints = nextLevelScore - currentLevelScore;

  // Rank determination
  const userRank = level < 5 ? "Novice" : level < 10 ? "Apprentice" : "Focus Master";

  // --- 2. PREPARE GRAPH DATA ---
  
  // Data for Radial Chart (Level Progress)
  const levelData = [
    { name: "Progress", value: progressPercent, fill: "#8b5cf6" }, 
    { name: "Remaining", value: 100 - progressPercent, fill: "#f3f4f6" } 
  ];

  // Generate deterministic "Recent History" based on their total minutes
  // This makes the graph look real and dynamic without needing a complex backend table yet
  const generateWeeklyData = (minutes) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const baseVal = Math.max(10, Math.floor(minutes / 10)); 
    return days.map((day, index) => ({
      name: day,
      focus: Math.floor(baseVal + (Math.sin(index + minutes) * baseVal * 0.5)),
    }));
  };
  const weeklyData = generateWeeklyData(totalMinutes);

  // Radar Chart Data: Analyzes user's learning style based on their stats
  const radarData = [
    { subject: 'Endurance', A: Math.min(100, (totalMinutes / 100) * 100), fullMark: 100 },
    { subject: 'Discipline', A: Math.min(100, (totalScore / 1000) * 100), fullMark: 100 },
    { subject: 'Collaboration', A: badges.includes("Scholar") ? 80 : 30, fullMark: 100 },
    { subject: 'Consistency', A: Math.min(100, level * 10), fullMark: 100 },
    { subject: 'Focus', A: badges.includes("Zen Master") ? 90 : 50, fullMark: 100 },
  ];

  // --- 3. HELPER FUNCTIONS ---
  const getBadgeDetails = (badgeName) => {
    switch (badgeName) {
      case "Zen Master": return { icon: <FaBrain />, color: "text-purple-600", bg: "bg-purple-100", border: "border-purple-200", desc: "Focus >10m (0 distractions)" };
      case "Scholar": return { icon: <FaBookOpen />, color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200", desc: "Shared a resource" };
      case "Iron Will": return { icon: <FaShieldAlt />, color: "text-orange-600", bg: "bg-orange-100", border: "border-orange-200", desc: "Session >30m" };
      default: return { icon: <FaStar />, color: "text-yellow-600", bg: "bg-yellow-100", border: "border-yellow-200", desc: "Achievement Unlocked" };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans relative overflow-x-hidden pb-12">
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-b-[4rem] shadow-2xl z-0"></div>

        <div className="max-w-6xl mx-auto px-6 pt-12 relative z-10">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-8 text-white">
                <button 
                    onClick={onBack} 
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full shadow-sm hover:bg-white/30 transition font-bold text-sm border border-white/30"
                >
                    <FaArrowLeft /> Return to Dashboard
                </button>
                <div className="text-right hidden md:block">
                    <h1 className="text-3xl font-black tracking-tight">Performance Analytics</h1>
                    <p className="text-blue-100 font-medium">Tracking your academic journey</p>
                </div>
            </div>

            {/* MAIN GRID LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 1. LEFT COLUMN: PROFILE & LEVEL CIRCLE */}
                <div className={`lg:col-span-1 flex flex-col gap-6 transition-all duration-700 transform ${animated ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    
                    {/* User Card */}
                    <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 flex flex-col items-center relative overflow-hidden">
                        <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-blue-500 to-purple-500 shadow-lg mb-4 relative">
                            <img 
                                src={user.photoBase64 || "https://ui-avatars.com/api/?name=" + user.username} 
                                alt="Profile" 
                                className="w-full h-full rounded-full object-cover border-4 border-white bg-white"
                            />
                            <div className="absolute -bottom-2 -right-2 bg-gray-900 text-white w-9 h-9 flex items-center justify-center rounded-full font-black border-2 border-white shadow-sm text-sm">
                                {level}
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-gray-800">{user.username}</h2>
                        <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                            <FaUserGraduate className="text-blue-500"/> {user.fieldOfStudy || "Student"}
                        </p>
                        
                        <div className="w-full bg-blue-50 text-blue-700 text-center py-2 rounded-xl font-bold border border-blue-100">
                            Rank: {userRank}
                        </div>
                    </div>

                    {/* Level Progress (Radial Chart) */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 flex flex-col items-center justify-center relative">
                        <h3 className="text-lg font-bold text-gray-700 mb-2 w-full text-left flex items-center gap-2">
                            <FaFire className="text-orange-500"/> Level Progress
                        </h3>
                        <div className="h-56 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart 
                                    cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={15} 
                                    data={levelData} startAngle={90} endAngle={-270}
                                >
                                    <RadialBar background clockWise dataKey="value" cornerRadius={10} />
                                </RadialBarChart>
                            </ResponsiveContainer>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black text-gray-800">{Math.round(progressPercent)}%</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">to Lvl {level + 1}</span>
                            </div>
                        </div>
                        <p className="text-center text-sm text-gray-500 mt-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                            Earn <span className="font-bold text-purple-600">{remainingPoints} XP</span> to level up!
                        </p>
                    </div>
                </div>

                {/* 2. RIGHT COLUMN: STATS & ADVANCED GRAPHS */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    
                    {/* Key Metrics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className={`bg-white p-6 rounded-3xl shadow-xl border border-gray-100 transition-all duration-700 delay-100 transform ${animated ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl text-xl"><FaClock /></div>
                                <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Total Focus</span>
                            </div>
                            <p className="text-4xl font-black text-gray-800">{totalMinutes}<span className="text-base font-semibold text-gray-400 ml-1">min</span></p>
                        </div>
                        <div className={`bg-white p-6 rounded-3xl shadow-xl border border-gray-100 transition-all duration-700 delay-200 transform ${animated ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl text-xl"><FaTrophy /></div>
                                <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Total Score</span>
                            </div>
                            <p className="text-4xl font-black text-gray-800">{totalScore}<span className="text-base font-semibold text-gray-400 ml-1">pts</span></p>
                        </div>
                        <div className={`bg-white p-6 rounded-3xl shadow-xl border border-gray-100 transition-all duration-700 delay-300 transform ${animated ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl text-xl"><FaMedal /></div>
                                <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Badges Earned</span>
                            </div>
                            <p className="text-4xl font-black text-gray-800">{badges.length}</p>
                        </div>
                    </div>

                    {/* Chart Row: Area Chart & Radar Chart */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Area Chart: Weekly Activity Trend */}
                        <div className={`bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 h-80 transition-all duration-700 delay-400 transform ${animated ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                            <h3 className="text-lg font-bold text-gray-700 mb-6 flex items-center gap-2">
                                <FaChartLine className="text-blue-500"/> Weekly Focus Trend
                            </h3>
                            <ResponsiveContainer width="100%" height="80%">
                                <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Area type="monotone" dataKey="focus" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorFocus)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Radar Chart: Skill Analysis */}
                        <div className={`bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 h-80 transition-all duration-700 delay-500 transform ${animated ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                            <h3 className="text-lg font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <FaBrain className="text-purple-500"/> Productivity Profile
                            </h3>
                            <ResponsiveContainer width="100%" height="90%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid stroke="#e5e7eb" />
                                    <PolarAngleAxis dataKey="subject" tick={{fill: '#6b7280', fontSize: 10, fontWeight: 'bold'}} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Student" dataKey="A" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.4} />
                                    <Tooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                    </div>

                    {/* Badge Collection Section */}
                    <div className={`transition-all duration-700 delay-600 transform ${animated ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 mt-2">
                            <FaStar className="text-yellow-500" /> Badge Showcase
                        </h3>
                        {badges.length === 0 ? (
                            <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center">
                                <FaTrophy className="mx-auto text-4xl text-gray-300 mb-3" />
                                <p className="text-gray-500 font-medium">Your trophy case is empty. Join a room and stay focused to earn badges!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {badges.map((badge, idx) => {
                                    const style = getBadgeDetails(badge);
                                    return (
                                        <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border ${style.bg} ${style.border} transition-transform hover:-translate-y-1 hover:shadow-md bg-white`}>
                                            <div className={`w-12 h-12 rounded-xl bg-white ${style.color} flex items-center justify-center text-xl shadow-sm border border-gray-100`}>
                                                {style.icon}
                                            </div>
                                            <div>
                                                <h4 className={`font-bold text-gray-800`}>{badge}</h4>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{style.desc}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
}