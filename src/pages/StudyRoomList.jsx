// src/pages/StudyRoomList.jsx
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { 
  FaPlus, FaLayerGroup, FaSignOutAlt, FaUser, FaVideo, 
  FaEye, FaLock, FaCrown, FaDoorOpen, FaTimes 
} from "react-icons/fa";
import CreateRoom from "./CreateRoom";
import { addDoc, collection, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// --- REUSABLE NAVBAR ICON BUTTON ---
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
      
      {/* Tooltip */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 px-3 py-1.5 bg-white text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap border border-gray-100 translate-y-2 group-hover:translate-y-0">
        {label}
        {/* Little arrow pointing up */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-t border-l border-gray-100"></div>
      </div>
    </div>
  );
};

export default function StudyRoomList({ user, onSelectRoom, onLogout, onEditProfile, onCreateRoom, onOpenStudyBuddyRoom }) {
  const [rooms, setRooms] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showMyRooms, setShowMyRooms] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [cooldowns, setCooldowns] = useState({});

  const auth = getAuth();
  const firebaseUser = auth.currentUser;

  // Real-time listener for live updates
  useEffect(() => {
    const q = query(collection(db, "studyRooms"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRooms = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRooms(fetchedRooms);
    });
    return () => unsubscribe();
  }, []);

  // Cooldown timer management
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
  
  const filteredRooms = rooms.filter(room => {
    if (!showMyRooms) return true;
    return room.createdBy === currentUserId;
  });

  return (
    <div className="min-h-screen relative bg-gray-50 font-sans overflow-hidden">
      
      {/* --- BACKGROUND ELEMENTS (Matches Home.jsx) --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 opacity-60"></div>
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-3xl animate-float"></div>
        {/* Grid Pattern */}
        <div className="absolute inset-0" style={{ 
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }}></div>
      </div>

      {/* Navbar */}
      <nav className="fixed w-full bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-sm z-50 transition-all">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          {/* Logo */}
          <div className="text-2xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent cursor-pointer tracking-tight">
            FocusHub
          </div>

          {/* Icon Controls */}
          <div className="flex items-center gap-3">
            {rooms.length > 0 && (
              <NavIconButton 
                onClick={onOpenStudyBuddyRoom} 
                icon={<FaVideo />} 
                label="Study Buddy Mode" 
              />
            )}

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
                    onClick={() => { onEditProfile(); setIsDropdownOpen(false); }}
                    className="flex items-center gap-3 w-full text-left px-5 py-3 hover:bg-gray-50 text-gray-600 hover:text-blue-600 transition text-sm font-medium"
                  >
                    <FaUser className="text-lg" /> Edit Profile
                  </button>
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

      {/* Main Content */}
      <div className="relative pt-28 px-6 pb-12 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-gray-800 tracking-tight">
              {showMyRooms ? "My Rooms" : "Live Sessions"}
            </h1>
            <p className="text-lg text-gray-500 font-medium max-w-2xl">
              {showMyRooms
                ? `You have created ${filteredRooms.length} active room${filteredRooms.length !== 1 ? 's' : ''}.`
                : `Join ${rooms.length} active study room${rooms.length !== 1 ? 's' : ''} and boost your productivity.`}
            </p>
          </div>

          {filteredRooms.length === 0 ? (
            <div className="text-center py-24 bg-white/40 backdrop-blur-sm rounded-[2rem] border border-white shadow-xl">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md text-4xl text-blue-200">
                <FaLayerGroup />
              </div>
              <h3 className="text-2xl font-bold text-gray-700 mb-2">
                {showMyRooms ? "No rooms created yet" : "No study rooms available"}
              </h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                {showMyRooms
                  ? "Create your own space to study with friends or invite others to join you."
                  : "The library is empty! Be the first to open a study room."}
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
                  {/* Thumbnail Section */}
                  <div className="relative h-56 bg-gray-100 overflow-hidden">
                    {room.liveThumbnail ? (
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
                        autoPlay muted loop
                      />
                    )}
                    
                    {/* Live Badge */}
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-md text-gray-800 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm">
                      <span className={`w-2 h-2 rounded-full ${room.isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></span>
                      {room.isLive ? "Live" : "Offline"}
                    </div>
                    
                    {/* Viewers Badge */}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md text-gray-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                      <FaEye className="text-blue-500" /> {Math.floor(Math.random() * 150 + 30)}
                    </div>
                    
                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent"></div>
                    
                    {/* Title on Image */}
                    <div className="absolute bottom-5 left-5 right-5">
                      <h3 className="text-white font-bold text-2xl drop-shadow-md truncate leading-tight">
                        {room.name}
                      </h3>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-6 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {room.createdBy === currentUserId && (
                          <span className="flex items-center gap-1 bg-gradient-to-r from-yellow-50 to-orange-50 text-orange-600 border border-orange-100 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide">
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

                    {/* Action Button (Matches Home/Login gradient) */}
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

      {/* Create Room Modal */}
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
                
                // 1. Create Room Object
                const newRoom = {
                  ...roomData,
                  createdBy: firebaseUser.uid,
                  createdAt: serverTimestamp(),
                  participants: [],
                  isLive: false,
                  liveThumbnail: null
                };

                // 2. Add to Firestore
                const docRef = await addDoc(collection(db, "studyRooms"), newRoom);
                
                // 3. Auto-Join (Trigger onSelectRoom immediately)
                setShowCreateRoom(false);
                onSelectRoom({ id: docRef.id, ...newRoom });
              }}
            />
          </div>
        </div>
      )}

      <style>
        {`
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