// src/pages/StudyRoomList.jsx
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { FaPlus, FaLayerGroup, FaSignOutAlt, FaUser, FaVideo } from "react-icons/fa";
import CreateRoom from "./CreateRoom";
import { addDoc, collection, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function StudyRoomList({ user, onSelectRoom, onLogout, onEditProfile, onCreateRoom, onOpenStudyBuddyRoom }) {
  const [rooms, setRooms] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showMyRooms, setShowMyRooms] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  
  // NEW: State to track active cooldowns locally
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

  // NEW: Effect to manage the cooldown countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      const newCooldowns = {};
      rooms.forEach(room => {
        const cooldownUntil = localStorage.getItem(`cooldown_${room.id}`);
        if (cooldownUntil) {
          const timeLeft = Math.ceil((parseInt(cooldownUntil) - Date.now()) / 1000);
          if (timeLeft > 0) {
            newCooldowns[room.id] = timeLeft;
          } else {
            localStorage.removeItem(`cooldown_${room.id}`);
          }
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

  const userCreatedRooms = rooms.filter(room => room.createdBy === currentUserId);

  const handleStudyBuddyClick = () => {
    onOpenStudyBuddyRoom();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Top Navbar */}
      <nav className="fixed w-full bg-white/95 backdrop-blur-sm shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent cursor-pointer">
            FocusHub
          </div>

          <div className="flex items-center gap-4">
            {rooms.length > 0 && (
              <button
                onClick={handleStudyBuddyClick}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition transform hover:scale-105 shadow-md font-medium"
              >
                <FaVideo /> Study Buddy
              </button>
            )}

            <button
              onClick={() => setShowCreateRoom(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition transform hover:scale-105 shadow-md font-medium"
            >
              <FaPlus /> Create Room
            </button>

            <button
              onClick={() => setShowMyRooms(!showMyRooms)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition transform hover:scale-105 shadow-md ${
                showMyRooms
                  ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white"
                  : "bg-white text-gray-700 border-2 border-gray-300 hover:border-purple-500"
              }`}
            >
              <FaLayerGroup /> {showMyRooms ? "All Rooms" : "My Rooms"}
            </button>

            <div className="relative">
              <div
                className="flex items-center gap-3 cursor-pointer bg-white border-2 border-gray-300 px-4 py-2 rounded-lg hover:border-blue-500 transition"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <img
                  src={user?.photoBase64 || "/src/assets/default-avatar.png"}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="font-medium text-gray-700">{username}</span>
              </div>
              
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white shadow-2xl rounded-xl overflow-hidden border border-gray-100 animate-slideDown">
                  <button
                    onClick={() => {
                      onEditProfile();
                      setIsDropdownOpen(false);
                    }}
                    className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition"
                  >
                    <FaUser className="text-blue-600" /> Edit Profile
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      setIsDropdownOpen(false);
                    }}
                    className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 transition border-t"
                  >
                    <FaSignOutAlt /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {showMyRooms ? "My Study Rooms" : "Study Rooms"}
            </h1>
            <p className="text-gray-600">
              {showMyRooms
                ? `You have created ${filteredRooms.length} room${filteredRooms.length !== 1 ? 's' : ''}`
                : `Join ${rooms.length} live study session${rooms.length !== 1 ? 's' : ''} and boost your productivity`}
            </p>
          </div>

          {filteredRooms.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-2xl font-bold text-gray-700 mb-2">
                {showMyRooms ? "No rooms created yet" : "No study rooms available"}
              </h3>
              <p className="text-gray-500 mb-6">
                {showMyRooms
                  ? "Create your first study room and start learning!"
                  : "Be the first to create a study room!"}
              </p>
              <button
                onClick={() => setShowCreateRoom(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition transform hover:scale-105 shadow-lg font-medium"
              >
                Create Study Room
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredRooms.map(room => (
                <div
                  key={room.id}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border-t-4 border-blue-500 cursor-pointer"
                  onClick={() => !cooldowns[room.id] && onSelectRoom(room)}
                >
                  <div className="relative h-48 bg-gray-200 overflow-hidden">
                    {room.liveThumbnail ? (
                      <img 
                        src={room.liveThumbnail} 
                        alt="Live Preview" 
                        loading="eager"
                        className="room-thumbnail-img animate-fadeIn"
                      />
                    ) : (
                      <video
                        className="w-full h-full object-cover"
                        src={room.previewURL || "/src/assets/girlstudy.mp4"}
                        autoPlay
                        muted
                        loop
                      />
                    )}
                    
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      {room.isLive ? "LIVE" : "OFFLINE"}
                    </div>
                    
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-semibold z-10">
                      👀 {Math.floor(Math.random() * 150 + 30)}
                    </div>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    <div className="absolute bottom-3 left-3 right-3 z-10">
                      <h3 className="text-white font-bold text-xl drop-shadow-lg">
                        {room.name}
                      </h3>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[40px]">
                      {room.description || "Join this study room and focus together!"}
                    </p>
                    
                    {room.createdBy === currentUserId && (
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-block bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold">
                          👑 Your Room
                        </span>
                        {room.isPrivate && (
                          <span className="inline-block bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
                            🔒 Private
                          </span>
                        )}
                      </div>
                    )}

                    {/* UPDATED BUTTON: Disables and shows countdown if on cooldown */}
                    <button
                      disabled={!!cooldowns[room.id]}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRoom(room);
                      }}
                      className={`w-full py-3 rounded-lg font-semibold transition transform shadow-md ${
                        cooldowns[room.id] 
                        ? "bg-gray-400 cursor-not-allowed text-white scale-100" 
                        : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 hover:scale-105"
                      }`}
                    >
                      {cooldowns[room.id] ? `Cooldown (${cooldowns[room.id]}s)` : "Join Room"}
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
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md relative animate-slideUp">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 font-bold text-2xl transition"
              onClick={() => setShowCreateRoom(false)}
            >
              ✕
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
                  createdBy: firebaseUser.uid,
                  createdAt: serverTimestamp(),
                  participants: [],
                  isLive: false,
                  liveThumbnail: null
                };

                await addDoc(collection(db, "studyRooms"), newRoom);
                setShowCreateRoom(false);
              }}
            />
          </div>
        </div>
      )}

      <style>
        {`
          .animate-slideDown { animation: slideDown 0.2s ease-out; }
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .animate-slideUp { animation: slideUp 0.3s ease-out; }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .animate-fadeIn { 
            animation: fastFade 0.4s ease-in-out; 
            backface-visibility: hidden;
          }
          
          @keyframes fastFade {
            0% { opacity: 0.7; filter: contrast(1.1); }
            100% { opacity: 1; filter: contrast(1); }
          }

          .room-thumbnail-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            image-rendering: -webkit-optimize-contrast; 
            transition: opacity 0.2s ease-in-out;
            background-color: #000;
            animation: subtleShake 4s ease-in-out infinite alternate;
          }

          @keyframes subtleShake {
            0% { transform: scale(1.02) translateX(0); }
            100% { transform: scale(1.05) translateX(1px); }
          }

          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.98); }
          }
          .animate-pulse { animation: pulse 2s infinite; }
        `}
      </style>
    </div>
  );
}