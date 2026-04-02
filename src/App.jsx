// src/App.jsx
import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { signOut, updateEmail } from "firebase/auth";
import { doc, getDoc, setDoc, collection, addDoc, onSnapshot } from "firebase/firestore";
import { useLocation } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import StudyRoomList from "./pages/StudyRoomList";
import RoomMessages from "./pages/RoomMessages";
import StudyBuddyRoom from "./pages/StudyBuddyRoom";
import CreateStudyBuddyRoom from "./pages/CreateStudyBuddyRoom";
import EditProfile from "./pages/EditProfile";
import CreateRoom from "./pages/CreateRoom";
import UserStatistics from "./pages/UserStatistics";
import FlashcardHub from "./pages/FlashcardHub"; 
import AdminDashboard from "./pages/AdminDashboard";

export default function App() {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [viewingStats, setViewingStats] = useState(false);
  const [viewingFlashcards, setViewingFlashcards] = useState(false); // Flashcard State
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [creatingStudyBuddy, setCreatingStudyBuddy] = useState(false);
  const [showStudyBuddyRoom, setShowStudyBuddyRoom] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState(null);
  const [showJoinLoginModal, setShowJoinLoginModal] = useState(false);
  const location = useLocation();
  const [viewingAdmin, setViewingAdmin] = useState(false);

  // --- REAL-TIME PROFILE SYNC ---
  useEffect(() => {
    let userUnsub; 
    
    const authUnsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      
      if (u) {
        const docRef = doc(db, "users", u.uid);
        
        userUnsub = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
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
              totalScore: 0,
              totalFocusTime: 0,
              badges: []
            });
          }
        });
      } else {
        setProfile(null);
        if (userUnsub) userUnsub(); 
      }
      setShowLogin(false);
    });

    return () => {
      authUnsub();
      if (userUnsub) userUnsub();
    };
  }, []);

  useEffect(() => {
    const pathSegments = location.pathname.split("/");
    if (pathSegments[1] === "join" && pathSegments[2]) {
      const roomId = pathSegments[2];
      setPendingRoomId(roomId);
      setShowJoinLoginModal(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (user && pendingRoomId && !showJoinLoginModal) {
      handleJoinRoom(pendingRoomId);
      setPendingRoomId(null);
    }
  }, [user, pendingRoomId, showJoinLoginModal]);

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

  const handleCreateRoom = () => {
    if (!user) {
      alert("Please login to create a room!");
      return;
    }
    setCreatingRoom(true);
  };

  const initialTimer = {
    timeLeft: 1500,
    isRunning: false,
    mode: "work",
  };

  const handleSaveRoom = async (roomData) => {
    try {
      const docRef = await addDoc(collection(db, "studyRooms"), {
        ...roomData,
        createdBy: user.uid,
        createdAt: new Date(),
        participants: [],
        timer: initialTimer,
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
        timer: initialTimer,
      });

      const newRoom = {
        id: docRef.id,
        ...roomData,
        createdBy: user.uid,
        participants: [],
        isPrivate: true,
        type: "studyBuddy",
        timer: initialTimer,
      };
      
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

  // Guest user profile with limited access
  const guestProfile = {
    uid: 'guest-user',
    username: 'Guest User',
    fullName: 'Guest User',
    email: 'guest@focushub.local',
    photoBase64: null,
    isGuest: true,
    totalScore: 0,
    totalFocusTime: 0,
    badges: [],
    // Guest limitations
    limitations: {
      canCreateRooms: false,
      canEditProfile: false,
      canViewStats: false,
      canAccessFlashcards: true,
      canJoinRooms: true,
      canViewRooms: true,
      maxStudyTime: 30, // 30 minutes max per session
      roomFeatures: {
        canChat: false,
        canShareFiles: false,
        canUseTimer: true,
        canUseBreaks: true,
        canViewParticipants: true
      }
    }
  };

  if (user === undefined)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Loading FocusHub...</h2>
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );

  if (showLogin) return <Login onLogin={() => setShowLogin(false)} onBack={() => setShowLogin(false)} />;

  if (showJoinLoginModal && pendingRoomId) {
    return <Login onLogin={() => setShowJoinLoginModal(false)} onBack={() => setShowJoinLoginModal(false)} />;
  }

  // Handle guest mode - show StudyRoomList with guest profile
  if (!user && isGuest)
    return <StudyRoomList
      user={guestProfile}
      onSelectRoom={handleSelectRoom}
      onLogout={() => setIsGuest(false)}
      onEditProfile={() => {}} // Disabled for guests
      onCreateRoom={() => {}} // Disabled for guests
      onOpenStudyBuddyRoom={() => {}} // Disabled for guests
      onShowStats={() => {}} // Disabled for guests
      onShowFlashcards={() => setViewingFlashcards(true)} // Enabled for guests
      onShowAdmin={() => {}} // Disabled for guests
    />;

  if (!user && !isGuest)
    return <Home onGuest={() => setIsGuest(true)} onLoginClick={() => setShowLogin(true)} />;

  if (editingProfile)
    return <EditProfile user={profile} onSave={handleProfileUpdate} onCancel={() => setEditingProfile(false)} />;

  if (creatingRoom)
    return <CreateRoom onSave={handleSaveRoom} onCancel={() => setCreatingRoom(false)} />;

  if (creatingStudyBuddy)
    return <CreateStudyBuddyRoom onSave={handleSaveStudyBuddyRoom} onCancel={() => setCreatingStudyBuddy(false)} />;

  if (viewingStats)
    return <UserStatistics user={profile} onBack={() => setViewingStats(false)} />;

  if (viewingFlashcards)
    return <FlashcardHub user={profile} onBack={() => setViewingFlashcards(false)} />; // <-- THIS HANDLES THE RENDER

  if (showStudyBuddyRoom && selectedRoom)
    return <StudyBuddyRoom room={selectedRoom} user={profile} onBack={handleExitStudyBuddyRoom} />;

  if (selectedRoom)
    return <RoomMessages room={selectedRoom} user={profile} onBack={() => setSelectedRoom(null)} />;

  if (viewingAdmin)
    return <AdminDashboard user={profile} onBack={() => setViewingAdmin(false)} />;

  // --- ENFORCE BAN RULE ---
  if (profile?.isBanned) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 text-center p-6">
        <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-4xl mb-6 shadow-lg border-4 border-white">
            ⛔
        </div>
        <h1 className="text-3xl font-black text-gray-800 mb-2">Account Suspended</h1>
        <p className="text-gray-500 max-w-md mb-8">Your account has been banned by an administrator for violating community guidelines. You can no longer access FocusHub.</p>
        <button onClick={handleLogout} className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition shadow-lg">
            Sign Out
        </button>
      </div>
    );
  }

  return (
    <StudyRoomList
      user={profile}
      onSelectRoom={handleSelectRoom}
      onLogout={handleLogout}
      onEditProfile={() => setEditingProfile(true)}
      onCreateRoom={handleCreateRoom}
      onOpenStudyBuddyRoom={handleCreateStudyBuddy}
      onShowStats={() => setViewingStats(true)} 
      onShowFlashcards={() => setViewingFlashcards(true)} 
      onShowAdmin={() => setViewingAdmin(true)} // <-- ADD THIS
    />
  );
}