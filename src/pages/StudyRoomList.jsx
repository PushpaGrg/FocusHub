// src/pages/StudyRoomList.jsx
import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  FaTools, FaHome, FaTrophy, FaGamepad, FaBook, FaChevronDown, FaLayerGroup, FaPlus
} from "react-icons/fa";
import CreateRoom from "./CreateRoom";
import { addDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function StudyRoomList({ user, onSelectRoom, onLogout, onEditProfile, onCreateRoom }) {
  const [rooms, setRooms] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showMyRooms, setShowMyRooms] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const auth = getAuth();
  const firebaseUser = auth.currentUser;


  useEffect(() => {
    const fetchRooms = async () => {
      const snapshot = await getDocs(collection(db, "studyRooms"));
      setRooms(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetchRooms();
  }, []);

  const username = user?.username || user?.email?.split("@")[0];

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Left Menu */}
      <div className="w-16 bg-white shadow-lg flex flex-col items-center py-6 space-y-6">
        <FaHome size={24} title="Home" className="hover:text-blue-600 cursor-pointer" onClick={() => setShowMyRooms(false)} />
        <FaBook size={24} title="Study Rooms" className="hover:text-blue-600 cursor-pointer" />
        <FaGamepad size={24} title="Gamification" className="hover:text-blue-600 cursor-pointer" />
        <FaTrophy size={24} title="Leaderboards" className="hover:text-blue-600 cursor-pointer" />
        <FaTools size={24} title="Study Tools" className="hover:text-blue-600 cursor-pointer" />

        <FaLayerGroup
          size={24}
          title={showMyRooms ? "All Rooms" : "My Rooms"}
          className={`cursor-pointer transition hover:text-purple-600 ${showMyRooms ? "text-purple-600" : ""}`}
          onClick={() => setShowMyRooms(!showMyRooms)}
        />

        <FaPlus
          size={24}
          title="Create Room"
          className="cursor-pointer hover:text-green-600 transition"
          onClick={() => setShowCreateRoom(true)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <div className="flex justify-between items-center bg-white shadow-md p-4 relative">
          <div className="text-2xl font-bold">FocusHub</div>

          {/* Profile Dropdown */}
          <div className="relative">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <img
                src={user?.photoBase64 || "/src/assets/default-avatar.png"}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border"
              />
              <span>{username}</span>
              <FaChevronDown />
            </div>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg z-10">
                <button onClick={onEditProfile} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Edit Profile</button>
                <button className="block w-full text-left px-4 py-2 hover:bg-gray-100">Privacy Settings</button>
                <button className="block w-full text-left px-4 py-2 hover:bg-gray-100">Account Settings</button>
                <button onClick={onLogout} className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600">Logout</button>
              </div>
            )}
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms
            .filter(room => !showMyRooms || room.createdBy === user.uid)
            .map(room => (
              <div key={room.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transform hover:scale-105 transition cursor-pointer">
                <div className="relative">
                  <video className="w-full h-48 object-cover" src={room.previewURL || "/src/assets/girlstudy.mp4"} autoPlay muted loop />
                  <span className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">LIVE</span>
                  <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-sm font-semibold">{room.name}</div>
                </div>
                <div className="p-4 flex flex-col justify-between h-48">
                  <p className="text-gray-500 mb-2">{room.description}</p>
                  <button onClick={() => onSelectRoom(room)} className="w-full py-2 rounded font-semibold transition bg-blue-500 hover:bg-blue-600 text-white">
                    Join Room
                  </button>
                </div>
              </div>
            ))}
        </div>
      {/* Create Room Modal */}
        {showCreateRoom && (
          <CreateRoom
            onCancel={() => setShowCreateRoom(false)}
            onSave={async (roomData) => {
              const auth = getAuth();
              const firebaseUser = auth.currentUser;

              if (!firebaseUser) {
                alert("You must be logged in to create a room.");
                return;
              }

              const newRoom = {
                ...roomData,
                createdBy: firebaseUser.uid,
                createdAt: serverTimestamp(),
              };

              const docRef = await addDoc(collection(db, "studyRooms"), newRoom);

              setRooms(prev => [...prev, { id: docRef.id, ...newRoom }]);

              setShowCreateRoom(false);

              // Automatically open room as HOST
              onSelectRoom({ id: docRef.id, ...newRoom, isHost: true });
            }}
          />

        )}
      </div>
    </div>
  );
}
