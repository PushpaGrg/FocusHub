// src/App.jsx
import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import Home from "./pages/Home";
import Login from "./pages/Login";
import StudyRoomList from "./pages/StudyRoomList";
import RoomMessages from "./pages/RoomMessages";

function App() {
  const [user, setUser] = useState(undefined);
  const [isGuest, setIsGuest] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) setShowLogin(false); // hide login if already logged in
    });
    return () => unsubscribe();
  }, []);

  const handleSelectRoom = (room) => {
    if (!user && !isGuest) {
      alert("Please login or sign up to enter a study room!");
      return;
    }
    setSelectedRoom(room);
  };

  // Loading screen
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-xl">Loading...</p>
      </div>
    );
  }

  // Show login page if triggered
  if (showLogin) {
    return (
      <Login
        onLogin={() => {
          setShowLogin(false);
        }}
      />
    );
  }

  // Not logged in & not guest: show homepage
  if (!user && !isGuest) {
    return <Home onGuest={() => setIsGuest(true)} onLoginClick={() => setShowLogin(true)} />;
  }

  // Logged in or guest: show rooms/messages
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded shadow">
        <p className="text-gray-700 font-medium">
          {user ? `Logged in as: ${user.email}` : "Browsing as Guest"}
        </p>
        {user && (
          <button
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
            onClick={() => signOut(auth)}
          >
            Logout
          </button>
        )}
      </div>

      {!selectedRoom ? (
        <StudyRoomList user={user} onSelectRoom={handleSelectRoom} />
      ) : (
        <div>
          <button
            onClick={() => setSelectedRoom(null)}
            className="mb-4 text-blue-600 underline"
          >
            ← Back to rooms
          </button>
          <RoomMessages
            room={selectedRoom}
            userEmail={user ? user.email : "Guest"}
          />
        </div>
      )}
    </div>
  );
}

export default App;
