// src/App.jsx
import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { signOut, updateEmail } from "firebase/auth";
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
import { useLocation } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import StudyRoomList from "./pages/StudyRoomList";
import RoomMessages from "./pages/RoomMessages";
import StudyBuddyRoom from "./pages/StudyBuddyRoom";
import CreateStudyBuddyRoom from "./pages/CreateStudyBuddyRoom";
import EditProfile from "./pages/EditProfile";
import CreateRoom from "./pages/CreateRoom";

export default function App() {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [creatingStudyBuddy, setCreatingStudyBuddy] = useState(false);
  const [showStudyBuddyRoom, setShowStudyBuddyRoom] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState(null);
  const [showJoinLoginModal, setShowJoinLoginModal] = useState(false);
  const location = useLocation();

  // Listen for auth changes and fetch profile
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, "users", u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          // Make sure uid is included
          setProfile({
            ...docSnap.data(),
            uid: u.uid,
          });
        } else {
          setProfile({
            username: u.email.split("@")[0],
            fullName: "",
            fieldOfStudy: "",
            email: u.email,
            photoBase64: null,
            uid: u.uid,
          });
        }
      } else {
        setProfile(null);
      }
      setShowLogin(false);
    });
    return () => unsubscribe();
  }, []);

  // Handle join link from URL
  useEffect(() => {
    const pathSegments = location.pathname.split("/");
    if (pathSegments[1] === "join" && pathSegments[2]) {
      const roomId = pathSegments[2];
      setPendingRoomId(roomId);
      setShowJoinLoginModal(true);
    }
  }, [location.pathname]);

  // After user logs in via join modal, join the pending room
  useEffect(() => {
    if (user && pendingRoomId && !showJoinLoginModal) {
      handleJoinRoom(pendingRoomId);
      setPendingRoomId(null);
    }
  }, [user, pendingRoomId, showJoinLoginModal]);

  // Handle joining a room via invite link
  const handleJoinRoom = async (roomId) => {
    try {
      const roomRef = doc(db, "studyRooms", roomId);
      const roomSnap = await getDoc(roomRef);

      if (roomSnap.exists()) {
        const room = { id: roomSnap.id, ...roomSnap.data() };
        setSelectedRoom(room);
        setShowStudyBuddyRoom(true);
      } else {
        alert("Room not found!");
      }
    } catch (err) {
      alert("Error joining room: " + err.message);
    }
  };

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
    setShowStudyBuddyRoom(false);
  };

  // Create Regular Room
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
        participants: [],
      });

      const newRoom = {
        id: docRef.id,
        ...roomData,
        createdBy: user.uid,
        participants: [],
      };

      setCreatingRoom(false);
      setSelectedRoom(newRoom);
    } catch (err) {
      alert("Error creating room: " + err.message);
    }
  };

  // Create Study Buddy Room
  const handleCreateStudyBuddy = () => {
    if (!user) {
      alert("Please login to create a room!");
      return;
    }
    setCreatingStudyBuddy(true);
  };

  const handleSaveStudyBuddyRoom = async (roomData) => {
    try {
      const docRef = await addDoc(collection(db, "studyRooms"), {
        ...roomData,
        createdBy: user.uid,
        createdAt: new Date(),
        participants: [],
        isPrivate: true,
        type: "studyBuddy",
      });

      const newRoom = {
        id: docRef.id,
        ...roomData,
        createdBy: user.uid,
        participants: [],
        isPrivate: true,
        type: "studyBuddy",
      };

      console.log("StudyBuddy Room Created:", newRoom);
      
      setCreatingStudyBuddy(false);
      setSelectedRoom(newRoom);
      setShowStudyBuddyRoom(true);
    } catch (err) {
      alert("Error creating room: " + err.message);
      console.error("Error:", err);
    }
  };

  const handleExitStudyBuddyRoom = () => {
    setShowStudyBuddyRoom(false);
    setSelectedRoom(null);
  };

  // --- RENDERING LOGIC ---

  // 1. Handle Loading State
  if (user === undefined)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Loading FocusHub...</h2>
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );

  // 2. MOVE THIS HERE: Show Login page if showLogin is true
  // This ensures that when Home.jsx calls onLoginClick, this screen appears immediately.
  if (showLogin) return <Login onLogin={() => setShowLogin(false)} onBack={() => setShowLogin(false)} />;

  // 3. Special login for join invite links
  if (showJoinLoginModal && pendingRoomId) {
    return <Login onLogin={() => setShowJoinLoginModal(false)} onBack={() => setShowJoinLoginModal(false)} />;
  }

  // 4. Show Home only if no user and not a guest
  if (!user && !isGuest)
    return <Home onGuest={() => setIsGuest(true)} onLoginClick={() => setShowLogin(true)} />;

  // 5. Auth-protected Views (These stay exactly as they were)
  // Since user is now defined or isGuest is true, your study buddy logic will work here
  if (editingProfile)
    return <EditProfile user={profile} onSave={handleProfileUpdate} onCancel={() => setEditingProfile(false)} />;

  if (creatingRoom)
    return <CreateRoom onSave={handleSaveRoom} onCancel={() => setCreatingRoom(false)} />;

  if (creatingStudyBuddy)
    return <CreateStudyBuddyRoom onSave={handleSaveStudyBuddyRoom} onCancel={() => setCreatingStudyBuddy(false)} />;

  if (showStudyBuddyRoom && selectedRoom)
    return <StudyBuddyRoom room={selectedRoom} user={profile} onBack={handleExitStudyBuddyRoom} />;

  if (selectedRoom)
    return <RoomMessages room={selectedRoom} user={profile} onBack={() => setSelectedRoom(null)} />;

  // 6. Main App Dashboard
  return (
    <StudyRoomList
      user={profile}
      onSelectRoom={handleSelectRoom}
      onLogout={handleLogout}
      onEditProfile={() => setEditingProfile(true)}
      onCreateRoom={handleCreateRoom}
      onOpenStudyBuddyRoom={handleCreateStudyBuddy}
    />
  );
}