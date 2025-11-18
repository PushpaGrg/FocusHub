// src/pages/StudyRoomList.jsx
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { FaUserCircle, FaTools, FaUsers, FaTachometerAlt, FaHome } from "react-icons/fa";

export default function StudyRoomList({ user, onSelectRoom, onBackHome }) {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const fetchRooms = async () => {
      const snapshot = await getDocs(collection(db, "studyRooms"));
      setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchRooms();
  }, []);

  const handleJoinRoom = (room) => {
    if (!user) {
      alert("Please login or sign up to enter this room!");
      return;
    }
    onSelectRoom(room);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header / Navbar */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-md">
        <button onClick={onBackHome} className="flex items-center gap-2 text-gray-700 hover:text-blue-500 transition">
          <FaHome /> Home
        </button>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-gray-700">
            <FaUserCircle size={24} />
            <span>{user ? user.email : "Guest"}</span>
          </div>
          <button className="text-gray-700 hover:text-blue-500 transition"><FaTools size={24} title="Study Tools" /></button>
          <button className="text-gray-700 hover:text-blue-500 transition"><FaUsers size={24} title="Study Buddy System" /></button>
          <button className={`text-gray-400 ${user ? "text-gray-700 hover:text-blue-500" : ""} transition`} disabled={!user}>
            <FaTachometerAlt size={24} title="Personal Dashboard" />
          </button>
        </div>
      </div>

      {/* Study Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map(room => (
          <div
            key={room.id}
            className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transform hover:scale-105 transition cursor-pointer"
          >
            <div className="relative">
              <video
                className="w-full h-48 object-cover"
                src="/src/assets/girlstudy.mp4" // replace with live URL
                autoPlay
                muted
                loop
              ></video>
              <span className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">LIVE</span>
              <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-sm font-semibold">
                {room.name}
              </div>
            </div>

            <div className="p-4 flex flex-col justify-between h-48">
              <p className="text-gray-500 mb-2">{room.description}</p>
              <button
                onClick={() => handleJoinRoom(room)}
                className={`w-full py-2 rounded font-semibold transition ${
                  user
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-gray-300 text-gray-600 cursor-not-allowed"
                }`}
              >
                {user ? "Join Room" : "Login to Join"}
              </button>
            </div>
          </div>
        ))}

        {/* Create Room Card (only for logged-in users) */}
        {user && (
          <div
            onClick={() => alert("Create Room functionality goes here!")}
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-400 rounded-xl p-6 hover:border-blue-500 transition cursor-pointer h-48"
          >
            <span className="text-blue-500 font-bold text-lg mb-2">+ Create New Room</span>
            <p className="text-gray-500 text-sm text-center">
              Start your own study room and livestream for others.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
