// src/App.jsx
import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { signOut, updateEmail } from "firebase/auth";
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";

import Home from "./pages/Home";
import Login from "./pages/Login";
import StudyRoomList from "./pages/StudyRoomList";
import RoomMessages from "./pages/RoomMessages";
import EditProfile from "./pages/EditProfile";
import CreateRoom from "./pages/CreateRoom";

export default function App() {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(null); // stores profile data including photoBase64
  const [isGuest, setIsGuest] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Listen for auth changes and fetch profile
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, "users", u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        } else {
          setProfile({
            username: u.email.split("@")[0],
            fullName: "",
            fieldOfStudy: "",
            email: u.email,
            photoBase64: null,
          });
        }
      } else {
        setProfile(null);
      }
      setShowLogin(false);
    });
    return () => unsubscribe();
  }, []);

  // Save profile changes
  const handleProfileUpdate = async (updatedData) => {
    try {
      const docRef = doc(db, "users", user.uid);
      await setDoc(docRef, updatedData, { merge: true });

      if (updatedData.email && updatedData.email !== user.email) {
        await updateEmail(user, updatedData.email);
      }

      setProfile(updatedData);
      setEditingProfile(false);
    } catch (err) {
      alert("Error updating profile: " + err.message);
    }
  };

  const handleSelectRoom = (room) => {
    if (!user && !isGuest) {
      alert("Please login or sign up to enter a study room!");
      return;
    }
    setSelectedRoom(room);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setSelectedRoom(null);
  };

  // Create Room
  const handleCreateRoom = () => {
    if (!user) {
      alert("Please login to create a room!");
      return;
    }
    setCreatingRoom(true);
  };

  const handleSaveRoom = async (roomData) => {
  try {
    const docRef = await addDoc(collection(db, "studyRooms"), {
      ...roomData,
      createdBy: user.uid,
      createdAt: new Date(),
    });

    const newRoom = {
      id: docRef.id,
      ...roomData,
      createdBy: user.uid,
    };

    setCreatingRoom(false);

    // Immediately open the room as host
    setSelectedRoom(newRoom);
  } catch (err) {
    alert("Error creating room: " + err.message);
  }
};


  // Loading & Conditional Rendering
  if (user === undefined)
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (showLogin) return <Login onLogin={() => setShowLogin(false)} />;
  if (!user && !isGuest) return <Home onGuest={() => setIsGuest(true)} onLoginClick={() => setShowLogin(true)} />;

  if (editingProfile)
    return <EditProfile user={profile} onSave={handleProfileUpdate} onCancel={() => setEditingProfile(false)} />;

  if (creatingRoom)
    return <CreateRoom onSave={handleSaveRoom} onCancel={() => setCreatingRoom(false)} />;

  if (selectedRoom)
    return <RoomMessages room={selectedRoom} user={profile} onBack={() => setSelectedRoom(null)} />;

  return (
    <StudyRoomList
      user={profile}
      onSelectRoom={handleSelectRoom}
      onLogout={handleLogout}
      onEditProfile={() => setEditingProfile(true)}
      onCreateRoom={handleCreateRoom}
    />
  );
}
