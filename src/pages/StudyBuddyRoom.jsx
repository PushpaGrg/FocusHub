// src/pages/StudyBuddyRoom.jsx
import { useState, useEffect } from "react";
import { FaArrowLeft, FaLock, FaCopy } from "react-icons/fa";
import { db } from "../firebase";
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

export default function StudyBuddyRoom({ room, user, onBack }) {
  const [copied, setCopied] = useState(false);
  const [buddies, setBuddies] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if current user is host
  useEffect(() => {
    if (user && room) {
      const userUid = user.uid;
      const roomCreatorUid = room.createdBy;
      const isHostUser = userUid === roomCreatorUid;
      
      setIsHost(isHostUser);
      console.log("=== HOST CHECK DEBUG ===");
      console.log("Room Creator:", roomCreatorUid);
      console.log("Current User UID:", userUid);
      console.log("Is Host?:", isHostUser);
      console.log("User Profile:", user);
      console.log("Room Data:", room);
    }
  }, [user, room]);

  // Real-time buddy list listener
  useEffect(() => {
    if (!room || !room.id) return;

    const roomRef = doc(db, "studyRooms", room.id);
    
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const roomData = docSnap.data();
        const roomBuddies = roomData.participants || [];
        setBuddies(roomBuddies);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [room?.id]);

  // Add current user to participants when entering room
  useEffect(() => {
    if (!room || !room.id || !user || !user.uid) return;

    const addUserToRoom = async () => {
      const roomRef = doc(db, "studyRooms", room.id);
      
      // Make sure all fields are defined
      const userData = {
        uid: user.uid,
        username: user.username || user.email?.split("@")[0] || "User",
        email: user.email || "unknown@email.com",
        photoBase64: user.photoBase64 || "",
        joinedAt: new Date(),
      };

      try {
        // Check if user already in participants
        const exists = buddies.some(b => b.uid === user.uid);
        if (!exists && userData.uid) {
          await updateDoc(roomRef, {
            participants: arrayUnion(userData),
          });
        }
      } catch (err) {
        console.error("Error adding user to room:", err);
      }
    };

    addUserToRoom();

    // Cleanup: remove user when leaving
    return () => {
      const removeUserFromRoom = async () => {
        try {
          const roomRef = doc(db, "studyRooms", room.id);
          const userData = {
            uid: user.uid,
            username: user.username || user.email?.split("@")[0] || "User",
            email: user.email || "unknown@email.com",
            photoBase64: user.photoBase64 || "",
            joinedAt: new Date(),
          };
          await updateDoc(roomRef, {
            participants: arrayRemove(userData),
          });
        } catch (err) {
          console.error("Error removing user from room:", err);
        }
      };

      removeUserFromRoom();
    };
  }, [room?.id, user, buddies]);

  // Generate invite link based on room ID
  const inviteLink = `${window.location.origin}/join/${room.id}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
          <button
            onClick={onBack}
            className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md transition flex items-center gap-2 font-medium"
          >
            <FaArrowLeft /> Exit
          </button>
          <div className="px-3 py-1 rounded-md bg-black/40 font-medium">
            {room.name || "Study Buddy Room"}
          </div>
          <div className="px-3 py-1 rounded-md bg-green-600 font-semibold flex items-center gap-2">
            <FaLock className="text-sm" /> Private
          </div>
        </div>

        {/* Center content */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 w-full max-w-[420px] shadow-xl border border-white/10">
            {isHost ? (
              <>
                {/* HOST VIEW */}
                <h2 className="text-2xl font-semibold mb-2">Invite your study buddies</h2>
                <p className="text-sm text-gray-300 mb-6">
                  Share this link with your friends to study together in real time.
                </p>

                {/* Invite Link Box */}
                <div className="bg-black/40 rounded-lg px-4 py-3 flex items-center justify-between gap-2 mb-6 border border-white/10">
                  <span className="text-sm truncate text-gray-300">{inviteLink}</span>
                  <button
                    onClick={copyLink}
                    className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-sm font-medium transition flex items-center gap-2 whitespace-nowrap"
                  >
                    <FaCopy className="text-xs" />
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                {/* Description */}
                <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg mb-6">
                  <p className="text-xs text-blue-200">
                    📌 {room.description || "Join this study room and focus together!"}
                  </p>
                </div>

                {/* Action Buttons - Host Only */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 px-4 py-2 rounded-lg transition font-medium text-sm">
                    ▶ Start Session
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition font-medium text-sm">
                    ⚙ Settings
                  </button>
                </div>

                <div className="text-xs text-gray-400 text-center">
                  🔒 Only users with this link can join this room.
                </div>
              </>
            ) : (
              <>
                {/* MEMBER VIEW - Waiting for session to start */}
                <h2 className="text-2xl font-semibold mb-2">Waiting for host...</h2>
                <p className="text-sm text-gray-300 mb-6">
                  The host will start the study session shortly.
                </p>

                {/* Room Info */}
                <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg mb-6">
                  <p className="text-xs text-blue-200">
                    📌 {room.description || "Join this study room and focus together!"}
                  </p>
                </div>

                {/* Waiting Message */}
                <div className="p-6 bg-white/10 border border-white/20 rounded-lg text-center">
                  <p className="text-sm text-gray-300 mb-2">⏳ Waiting for host to start session...</p>
                  <p className="text-xs text-gray-400">Check the buddy list to see who's here</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right panel - Study Buddies */}
      <div className="w-80 bg-white text-black flex flex-col shadow-xl border-l border-gray-200">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <h3 className="text-lg font-semibold text-gray-800">Study Buddies</h3>
          <p className="text-sm text-gray-600">{buddies.length} people in this room</p>
        </div>

        {/* Buddies List */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-500">Loading buddies...</div>
          ) : buddies.length === 0 ? (
            <div className="flex items-center gap-3 p-3 rounded-lg opacity-50">
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-bold">
                ?
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Waiting for buddies…</p>
                <p className="text-xs text-gray-400">Share the invite link</p>
              </div>
            </div>
          ) : (
            buddies.map((buddy) => (
              <div
                key={buddy.uid}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  buddy.uid === user?.uid
                    ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                  buddy.uid === user?.uid
                    ? "bg-gradient-to-r from-blue-400 to-blue-600"
                    : "bg-gradient-to-r from-purple-400 to-pink-600"
                } shadow-md`}>
                  {buddy.photoBase64 ? (
                    <img
                      src={buddy.photoBase64}
                      alt={buddy.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    buddy.username?.charAt(0).toUpperCase() || "U"
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">
                    {buddy.username || buddy.email?.split("@")[0] || "User"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {buddy.uid === user?.uid ? (
                      <span className="text-blue-600 font-medium">👑 You</span>
                    ) : buddy.uid === room.createdBy ? (
                      <span className="text-purple-600 font-medium">👑 Host</span>
                    ) : (
                      <span className="text-gray-500">Member</span>
                    )}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Tip */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600 text-center">
            💡 Tip: Share the invite link on WhatsApp or Discord
          </p>
        </div>
      </div>
    </div>
  );
}