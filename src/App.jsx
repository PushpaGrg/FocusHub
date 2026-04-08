// src/App.jsx
import { useState, useEffect, useLayoutEffect } from "react";
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
import { FaTimes, FaLock } from "react-icons/fa";

/** Study Buddy / invite-only rooms: main grid never opens these — only invite URL, post-create, or “My Rooms” (host). */
function isInviteOnlyStudyBuddyRoom(room) {
  if (!room) return false;
  return room.type === "studyBuddy" || room.inviteOnly === true;
}

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
  const [studyBuddyAccessDenied, setStudyBuddyAccessDenied] = useState(false);

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

  useLayoutEffect(() => {
    if (!selectedRoom) return;
    if (!isInviteOnlyStudyBuddyRoom(selectedRoom)) return;
    const allowed = showStudyBuddyRoom === true;
    if (allowed) return;
    setSelectedRoom(null);
    setShowStudyBuddyRoom(false);
    setStudyBuddyAccessDenied(true);
  }, [selectedRoom, showStudyBuddyRoom]);

  const handleJoinRoom = async (roomId) => {
    try {
      const roomRef = doc(db, "studyRooms", roomId);
      const roomSnap = await getDoc(roomRef);

      if (roomSnap.exists()) {
        const room = { id: roomSnap.id, ...roomSnap.data() };
        setSelectedRoom(room);
        setShowStudyBuddyRoom(isInviteOnlyStudyBuddyRoom(room));
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

  /**
   * @param {object} room
   * @param {{ source?: 'browse' | 'myRooms' | 'internal' }} [opts]
   * - browse: main grid — invite-only Study Buddy is blocked for everyone (use invite link).
   * - myRooms: host may open their own Study Buddy room without an invite.
   * - internal: e.g. right after creating a normal room from the modal.
   */
  const handleSelectRoom = (room, opts = {}) => {
    const source = opts.source ?? "browse";
    if (!user && !isGuest) {
      alert("Please login or sign up to enter a study room!");
      return;
    }
    const uid = auth.currentUser?.uid ?? profile?.uid;

    if (isInviteOnlyStudyBuddyRoom(room)) {
      if (source === "browse") {
        setStudyBuddyAccessDenied(true);
        return;
      }
      if (source === "myRooms") {
        if (room.createdBy !== uid) {
          setStudyBuddyAccessDenied(true);
          return;
        }
        setSelectedRoom(room);
        setShowStudyBuddyRoom(true);
        return;
      }
    }

    setSelectedRoom(room);
    setShowStudyBuddyRoom(isInviteOnlyStudyBuddyRoom(room));
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setSelectedRoom(null);
    setShowStudyBuddyRoom(false);
    setStudyBuddyAccessDenied(false);
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
      setShowStudyBuddyRoom(false);
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
        inviteOnly: true,
        timer: initialTimer,
      });

      const newRoom = {
        id: docRef.id,
        ...roomData,
        createdBy: user.uid,
        participants: [],
        isPrivate: true,
        type: "studyBuddy",
        inviteOnly: true,
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

  if (selectedRoom) {
    const inviteBuddy = isInviteOnlyStudyBuddyRoom(selectedRoom);
    const mayUseStudyBuddyUI = inviteBuddy && showStudyBuddyRoom === true;

    if (inviteBuddy) {
      if (mayUseStudyBuddyUI) {
        return (
          <StudyBuddyRoom
            room={selectedRoom}
            user={profile}
            onBack={handleExitStudyBuddyRoom}
          />
        );
      }
      return null;
    }

    return (
      <RoomMessages
        room={selectedRoom}
        user={profile}
        onBack={() => setSelectedRoom(null)}
      />
    );
  }

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
    <>
      {studyBuddyAccessDenied && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[60] bg-black/40 backdrop-blur-sm p-4 animate-fadeIn"
          role="presentation"
          onClick={() => setStudyBuddyAccessDenied(false)}
        >
          <div
            className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-md relative border border-white/50 animate-slideUp"
            role="alertdialog"
            aria-labelledby="study-buddy-denied-title"
            aria-describedby="study-buddy-denied-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-800 transition p-2 hover:bg-gray-100 rounded-full"
              onClick={() => setStudyBuddyAccessDenied(false)}
              aria-label="Close"
            >
              <FaTimes size={20} />
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500">
                <FaLock className="text-2xl" />
              </div>
              <h3
                id="study-buddy-denied-title"
                className="text-2xl font-bold text-gray-800 mb-2"
              >
                Access denied
              </h3>
              <p id="study-buddy-denied-desc" className="text-gray-600 text-sm leading-relaxed">
                Study Buddy rooms can only be joined with the host&apos;s invite link. Opening the room from the main list is not allowed.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStudyBuddyAccessDenied(false)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/30 transition"
            >
              Got it
            </button>
          </div>
          <style>
            {`
              .animate-fadeIn { animation: fhFadeIn 0.25s ease-out; }
              @keyframes fhFadeIn { from { opacity: 0; } to { opacity: 1; } }
              .animate-slideUp { animation: fhSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
              @keyframes fhSlideUp {
                from { opacity: 0; transform: translateY(28px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}
          </style>
        </div>
      )}
      <StudyRoomList
        user={profile}
        onSelectRoom={handleSelectRoom}
        onLogout={handleLogout}
        onEditProfile={() => setEditingProfile(true)}
        onCreateRoom={handleCreateRoom}
        onOpenStudyBuddyRoom={handleCreateStudyBuddy}
        onShowStats={() => setViewingStats(true)}
        onShowFlashcards={() => setViewingFlashcards(true)}
        onShowAdmin={() => setViewingAdmin(true)}
      />
    </>
  );
}