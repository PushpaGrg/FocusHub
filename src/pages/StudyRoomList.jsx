// src/pages/StudyRoomList.jsx
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { 
  FaPlus, FaLayerGroup, FaSignOutAlt, FaUser, FaVideo, 
  FaEye, FaLock, FaCrown, FaDoorOpen, FaTimes, FaChartBar,
  FaSearch, FaLaptopCode, FaHeadphones, FaStethoscope, FaBook, FaCoffee, FaGlobe, FaBookOpen
} from "react-icons/fa";
import CreateRoom from "./CreateRoom";
import { addDoc, collection, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Dummy avatars for social proof UI
const getDummyAvatars = (seed) => [
  `https://i.pravatar.cc/150?u=${seed}1`,
  `https://i.pravatar.cc/150?u=${seed}2`,
  `https://i.pravatar.cc/150?u=${seed}3`
];

// Pre-defined dummy rooms with categories and fake users
const DUMMY_ROOMS = [
  {
    id: "dummy-1",
    name: "Late Night Med Students",
    description: "Silent study session. Pomodoro 50/10. Med students only but others welcome to lurk!",
    isLive: true,
    category: "Medical",
    previewURL: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-working-on-a-laptop-at-home-5047-small.mp4",
    fallbackImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
    viewers: 142,
    activeUsers: getDummyAvatars('med'),
    isDummy: true,
    createdBy: "system_dummy"
  },
  {
    id: "dummy-2",
    name: "CS Majors Leetcode Grind",
    description: "Prepping for FAANG interviews. Camera on for accountability!",
    isLive: true,
    category: "Tech",
    previewURL: "https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-4171-small.mp4",
    fallbackImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
    viewers: 205,
    activeUsers: getDummyAvatars('tech'),
    isDummy: true,
    createdBy: "system_dummy"
  },
  {
    id: "dummy-3",
    name: "Library Vibes (Silent)",
    description: "Just reading and taking notes. Please keep the chat quiet and focused.",
    isLive: true,
    category: "Quiet",
    previewURL: "https://assets.mixkit.co/videos/preview/mixkit-girl-sitting-in-a-cafe-reading-a-book-4248-small.mp4",
    fallbackImage: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=800&q=80",
    viewers: 56,
    activeUsers: getDummyAvatars('lib'),
    isDummy: true,
    createdBy: "system_dummy"
  },
  {
    id: "dummy-4",
    name: "Law School Bar Prep",
    description: "12 hour grind today. Join if you want serious accountability.",
    isLive: true,
    category: "Reading",
    previewURL: "https://assets.mixkit.co/videos/preview/mixkit-student-walking-in-a-library-4315-small.mp4",
    fallbackImage: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=800&q=80",
    viewers: 310,
    activeUsers: getDummyAvatars('law'),
    isDummy: true,
    createdBy: "system_dummy"
  },
  {
    id: "dummy-5",
    name: "Lofi Hip Hop Study Beats",
    description: "Chill vibes, low stress. Everyone is welcome. We are currently working on assignments.",
    isLive: true,
    category: "Music",
    previewURL: "https://assets.mixkit.co/videos/preview/mixkit-woman-working-on-laptop-at-home-5054-small.mp4",
    fallbackImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
    viewers: 89,
    activeUsers: getDummyAvatars('lofi'),
    isDummy: true,
    createdBy: "system_dummy"
  },
  {
    id: "dummy-6",
    name: "Productivity & Planning",
    description: "Sunday reset. Planning the week, journaling, and light reading.",
    isLive: true,
    category: "Quiet",
    previewURL: "https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-book-and-reading-4316-small.mp4",
    fallbackImage: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=800&q=80",
    viewers: 42,
    activeUsers: getDummyAvatars('plan'),
    isDummy: true,
    createdBy: "system_dummy"
  }
];

const CATEGORIES = [
  { name: "All", icon: <FaGlobe /> },
  { name: "Tech", icon: <FaLaptopCode /> },
  { name: "Medical", icon: <FaStethoscope /> },
  { name: "Reading", icon: <FaBook /> },
  { name: "Music", icon: <FaHeadphones /> },
  { name: "Quiet", icon: <FaCoffee /> }
];

// Helper component for navbar buttons
const NavIconButton = ({ onClick, icon, label, active = false }) => {
  return (
    <div className="relative group z-50">
      <button
        onClick={onClick}
        className={`p-3.5 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md border 
        ${active 
          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-blue-500/30" 
          : "bg-white text-gray-500 border-white hover:text-blue-600 hover:shadow-lg"
        }`}
      >
        <div className="text-lg">{icon}</div>
      </button>
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 px-3 py-1.5 bg-white text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap border border-gray-100 translate-y-2 group-hover:translate-y-0">
        {label}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-t border-l border-gray-100"></div>
      </div>
    </div>
  );
};

// Animated equalizer component for "Live" indicator
const LiveEqualizer = () => (
  <div className="flex items-center gap-[2px] h-3">
    <div className="w-[3px] bg-red-500 rounded-full animate-eq-1"></div>
    <div className="w-[3px] bg-red-500 rounded-full animate-eq-2"></div>
    <div className="w-[3px] bg-red-500 rounded-full animate-eq-3"></div>
  </div>
);

// ---> FIX 1: Added onShowAdmin to the props list here! <---
export default function StudyRoomList({ user, onSelectRoom, onLogout, onEditProfile, onCreateRoom, onOpenStudyBuddyRoom, onShowStats, onShowFlashcards, onShowAdmin }) {
  // States
  const [rooms, setRooms] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showMyRooms, setShowMyRooms] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [cooldowns, setCooldowns] = useState({});
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const auth = getAuth();
  const firebaseUser = auth.currentUser;

  // Fetch real rooms from Firebase
  useEffect(() => {
    const q = query(collection(db, "studyRooms"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRooms = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRooms(fetchedRooms);
    });
    return () => unsubscribe();
  }, []);

  // Handle cooldown timers
  useEffect(() => {
    const timer = setInterval(() => {
      const newCooldowns = {};
      rooms.forEach(room => {
        const cooldownUntil = localStorage.getItem(`cooldown_${room.id}`);
        if (cooldownUntil) {
          const timeLeft = Math.ceil((parseInt(cooldownUntil) - Date.now()) / 1000);
          if (timeLeft > 0) newCooldowns[room.id] = timeLeft;
          else localStorage.removeItem(`cooldown_${room.id}`);
        }
      });
      setCooldowns(newCooldowns);
    }, 1000);
    return () => clearInterval(timer);
  }, [rooms]);

  const username = user?.username || user?.email?.split("@")[0];
  const currentUserId = firebaseUser?.uid || user?.uid;
  
  // Combine real rooms with dummy rooms
  const allRooms = showMyRooms 
    ? rooms.filter(room => room.createdBy === currentUserId)
    : [...rooms, ...DUMMY_ROOMS];

  // Filter by search and category
  const filteredRooms = allRooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (room.description && room.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const roomCat = room.category || "Quiet"; 
    const matchesCategory = activeCategory === "All" || roomCat === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen relative bg-gray-50 font-sans overflow-hidden">
      
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 opacity-60"></div>
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-3xl animate-float"></div>
        <div className="absolute inset-0" style={{ 
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }}></div>
      </div>

      {/* Navbar */}
      <nav className="fixed w-full bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-sm z-50 transition-all">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="text-2xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent cursor-pointer tracking-tight">
            FocusHub
          </div>

          <div className="flex items-center gap-3">
            {allRooms.length > 0 && (
              <NavIconButton 
                onClick={onOpenStudyBuddyRoom} 
                icon={<FaVideo />} 
                label="Study Buddy" 
              />
            )}

            <NavIconButton 
              onClick={onShowFlashcards} 
              icon={<FaBookOpen />} 
              label="Flashcards" 
            />

            <NavIconButton 
              onClick={() => setShowCreateRoom(true)} 
              icon={<FaPlus />} 
              label="Create Room" 
            />

            <NavIconButton 
              onClick={() => setShowMyRooms(!showMyRooms)} 
              icon={<FaLayerGroup />} 
              label={showMyRooms ? "Show All Rooms" : "Show My Rooms"}
              active={showMyRooms}
            />

            {/* Profile Dropdown */}
            <div className="relative ml-2">
              <button
                className="w-11 h-11 rounded-full p-0.5 border-2 border-transparent hover:border-blue-400 transition-all transform hover:scale-105 shadow-sm"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <img
                  src={user?.photoBase64 || "/src/assets/default-avatar.png"}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover bg-white"
                />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden border border-white/50 animate-slideDown origin-top-right">
                  <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
                    <p className="text-sm font-bold text-gray-800 truncate">{username}</p>
                    <p className="text-xs text-gray-500 truncate font-medium">{user?.email}</p>
                  </div>
                  
                  <button
                    onClick={() => { onShowStats(); setIsDropdownOpen(false); }}
                    className="flex items-center gap-3 w-full text-left px-5 py-3 hover:bg-gray-50 text-gray-600 hover:text-blue-600 transition text-sm font-medium"
                  >
                    <FaChartBar className="text-lg" /> My Statistics
                  </button>

                  <button
                    onClick={() => { onEditProfile(); setIsDropdownOpen(false); }}
                    className="flex items-center gap-3 w-full text-left px-5 py-3 hover:bg-gray-50 text-gray-600 hover:text-blue-600 transition text-sm font-medium"
                  >
                    <FaUser className="text-lg" /> Edit Profile
                  </button>

                  {/* ---> FIX 2: Admin button properly separated from Logout button <--- */}
                  {true && (
                    <button
                      onClick={() => { onShowAdmin(); setIsDropdownOpen(false); }}
                      className="flex items-center gap-3 w-full text-left px-5 py-3 hover:bg-purple-50 text-purple-600 transition text-sm font-bold border-t border-gray-100"
                    >
                      <FaCrown className="text-lg" /> Admin Panel
                    </button>
                  )}

                  <button
                    onClick={() => { onLogout(); setIsDropdownOpen(false); }}
                    className="flex items-center gap-3 w-full text-left px-5 py-3 hover:bg-red-50 text-red-500 hover:text-red-600 transition border-t border-gray-100 text-sm font-medium"
                  >
                    <FaSignOutAlt className="text-lg" /> Logout
                  </button>

                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="relative pt-28 px-6 pb-12 z-10">
        <div className="max-w-7xl mx-auto">
          
          {/* Header & Controls Container */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-gray-800 tracking-tight">
                {showMyRooms ? "My Rooms" : "Live Sessions"}
              </h1>
              <p className="text-lg text-gray-500 font-medium">
                {showMyRooms
                  ? `You have created ${filteredRooms.length} active room${filteredRooms.length !== 1 ? 's' : ''}.`
                  : `Find a room and start studying with others.`}
              </p>
            </div>

            {/* Search Bar */}
            {!showMyRooms && (
              <div className="relative w-full md:w-72">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search rooms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/60 backdrop-blur-md border border-white focus:border-blue-400 focus:ring-2 focus:ring-blue-200 rounded-xl shadow-sm text-sm outline-none transition-all"
                />
              </div>
            )}
          </div>

          {/* Category Pills */}
          {!showMyRooms && (
            <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all shadow-sm border ${
                    activeCategory === cat.name
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Render Rooms */}
          {filteredRooms.length === 0 ? (
            <div className="text-center py-24 bg-white/40 backdrop-blur-sm rounded-[2rem] border border-white shadow-xl">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md text-4xl text-blue-200">
                <FaLayerGroup />
              </div>
              <h3 className="text-2xl font-bold text-gray-700 mb-2">
                No rooms found
              </h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                {searchQuery ? "Try adjusting your search or category." : "Be the first to open a room!"}
              </p>
              <button
                onClick={() => setShowCreateRoom(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3.5 rounded-2xl hover:shadow-lg hover:shadow-blue-500/30 transition transform hover:scale-105 font-bold flex items-center gap-2 mx-auto"
              >
                <FaPlus /> Create Room
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredRooms.map(room => (
                <div
                  key={room.id}
                  className="bg-white rounded-[2rem] shadow-lg shadow-gray-200/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 group cursor-pointer border border-gray-100 overflow-hidden flex flex-col hover:-translate-y-2"
                  onClick={() => !cooldowns[room.id] && onSelectRoom(room)}
                >
                  {/* Thumbnail/Video Area */}
                  <div className="relative h-56 bg-gray-900 overflow-hidden">
                    {room.liveThumbnail && !room.isDummy ? (
                      <img 
                        src={room.liveThumbnail} 
                        alt="Live Preview" 
                        loading="eager"
                        className="room-thumbnail-img"
                      />
                    ) : (
                      <video
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        src={room.previewURL || "/src/assets/girlstudy.mp4"}
                        poster={room.fallbackImage || null}
                        autoPlay 
                        muted 
                        loop 
                        playsInline
                      />
                    )}
                    
                    {/* Live Badge with Animated Equalizer */}
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/95 backdrop-blur-md text-gray-800 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm">
                      {room.isLive ? <LiveEqualizer /> : <span className="w-2 h-2 rounded-full bg-gray-400"></span>}
                      {room.isLive ? "Live" : "Offline"}
                    </div>
                    
                    {/* Avatar Stack + Viewer Count */}
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md text-gray-800 pr-3 pl-2 py-1 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm border border-gray-100">
                      
                      {room.isDummy && (
                        <div className="flex -space-x-2">
                          {room.activeUsers.map((avatar, i) => (
                             <img key={i} className="w-6 h-6 rounded-full border-2 border-white object-cover" src={avatar} alt="user" />
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-gray-600">
                        <FaEye className="text-blue-500" /> 
                        {room.isDummy ? room.viewers : (room.participants?.length || 0)}
                      </div>
                    </div>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 via-transparent to-transparent"></div>
                    
                    <div className="absolute bottom-5 left-5 right-5">
                      <h3 className="text-white font-bold text-xl drop-shadow-md line-clamp-2 leading-tight">
                        {room.name}
                      </h3>
                    </div>
                  </div>

                  {/* Room Details Area */}
                  <div className="p-6 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {room.createdBy === currentUserId && !room.isDummy && (
                          <span className="flex items-center gap-1 bg-orange-50 text-orange-600 border border-orange-100 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide">
                            <FaCrown /> Owner
                          </span>
                        )}
                        {room.isPrivate ? (
                          <span className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide">
                            <FaLock /> Private
                          </span>
                        ) : (
                           <span className="flex items-center gap-1 bg-green-50 text-green-600 border border-green-100 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide">
                            <FaDoorOpen /> Public
                          </span>
                        )}
                      </div>

                      <p className="text-gray-500 text-sm line-clamp-2 mb-6 h-10 leading-relaxed">
                        {room.description || "Join this study room and focus together with peers!"}
                      </p>
                    </div>

                    <button
                      disabled={!!cooldowns[room.id]}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRoom(room);
                      }}
                      className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 group-hover:translate-y-0 ${
                        cooldowns[room.id] 
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none" 
                        : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-blue-500/30 transform active:scale-95"
                      }`}
                    >
                      {cooldowns[room.id] ? (
                        <>Cooldown ({cooldowns[room.id]}s)</>
                      ) : (
                        <>Join Room <FaDoorOpen /></>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateRoom && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-md relative animate-slideUp border border-white/50">
            <button
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-800 transition p-2 hover:bg-gray-100 rounded-full"
              onClick={() => setShowCreateRoom(false)}
            >
              <FaTimes size={20} />
            </button>
            <CreateRoom
              onCancel={() => setShowCreateRoom(false)}
              onSave={async (roomData) => {
                if (!firebaseUser) {
                  alert("You must be logged in to create a room.");
                  return;
                }
                
                const newRoom = {
                  ...roomData,
                  category: "Quiet", // Default category for user created rooms
                  createdBy: firebaseUser.uid,
                  createdAt: serverTimestamp(),
                  participants: [],
                  isLive: false,
                  liveThumbnail: null
                };

                const docRef = await addDoc(collection(db, "studyRooms"), newRoom);
                setShowCreateRoom(false);
                onSelectRoom({ id: docRef.id, ...newRoom });
              }}
            />
          </div>
        </div>
      )}

      {/* Global styles for animations and hiding scrollbars */}
      <style>
        {`
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

          /* Equalizer Animation for Live Badge */
          @keyframes eq {
            0%, 100% { height: 4px; }
            50% { height: 12px; }
          }
          .animate-eq-1 { animation: eq 0.8s ease-in-out infinite; }
          .animate-eq-2 { animation: eq 0.8s ease-in-out infinite 0.2s; }
          .animate-eq-3 { animation: eq 0.8s ease-in-out infinite 0.4s; }

          .animate-slideDown { animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
          @keyframes slideDown { from { opacity: 0; transform: translateY(-10px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
          
          .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
          @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
          
          .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

          .animate-float { animation: float 10s ease-in-out infinite; }
          .animate-float-slow { animation: float 15s ease-in-out infinite; }
          @keyframes float { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, -20px); } }

          .room-thumbnail-img { width: 100%; height: 100%; object-fit: cover; animation: subtleShake 4s ease-in-out infinite alternate; background-color: #f3f4f6; }
          @keyframes subtleShake { 0% { transform: scale(1.02); } 100% { transform: scale(1.05); } }
          
          .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        `}
      </style>
    </div>
  );
}