// src/pages/RoomMessages.jsx
import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  doc,
  deleteDoc,
  getDocs,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  setDoc,
  where
} from "firebase/firestore";
import { containsSpam } from "../utils/spamDetection";
// Use SimplePeer from CDN (loaded in index.html)
const Peer = window.SimplePeer;
import { useAuthState } from "react-firebase-hooks/auth";

export default function RoomMessages({ room, onBack }) {
  const [user] = useAuthState(auth);
  const isHost = room?.createdBy === user?.uid || room?.isHost;

  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [viewers, setViewers] = useState(Math.floor(Math.random() * 150 + 30));
  const [reactions, setReactions] = useState([]);
  const [streamLive, setStreamLive] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);

  const [remoteStreams, setRemoteStreams] = useState({});
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const chatEndRef = useRef(null);
  const peersRef = useRef({});
  const signalingUnsubscribeRef = useRef(null);
  const viewerIdRef = useRef(user ? `${user.uid}_${Date.now()}` : null);

  // --- Messages subscription ---
  useEffect(() => {
    if (!room?.id) return;
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMessages(snapshot.docs.filter(d => d.data().roomId === room.id).map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => console.error("Messages snapshot failed:", err)
    );
    return () => unsubscribe();
  }, [room?.id]);

  // --- Listen for reactions (for host) ---
  useEffect(() => {
    if (!room?.id) return;
    
    const reactionsQuery = query(
      collection(db, "reactions"),
      where("roomId", "==", room.id),
      orderBy("timestamp", "desc")
    );
    
    const unsubscribe = onSnapshot(
      reactionsQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const reactionData = change.doc.data();
            const id = change.doc.id;
            
            // Add reaction to local state
            setReactions(prev => [...prev, { id, emoji: reactionData.emoji }]);
            
            // Remove after 2 seconds
            setTimeout(() => {
              setReactions(prev => prev.filter(r => r.id !== id));
            }, 2000);
          }
        });
      },
      (err) => console.error("Reactions snapshot failed:", err)
    );
    
    return () => unsubscribe();
  }, [room?.id]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    if (containsSpam(newMsg)) {
      alert("⚠️ Spam detected — message blocked.");
      setNewMsg("");
      return;
    }
    try {
      await addDoc(collection(db, "messages"), {
        roomId: room.id,
        sender: user.email,
        text: newMsg.trim(),
        createdAt: serverTimestamp(),
      });
      setNewMsg("");
    } catch (err) {
      console.error(err);
      alert("Failed to send message.");
    }
  };

  const sendReaction = async (emoji) => {
    // Send reaction to Firestore so host can see it
    try {
      await addDoc(collection(db, "reactions"), {
        roomId: room.id,
        emoji,
        timestamp: serverTimestamp(),
        senderId: user?.uid || "guest"
      });
    } catch (err) {
      console.error("Error sending reaction:", err);
    }
  };

  // --- Toggle camera ---
  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCamOn(videoTrack.enabled);
    }
  };

  // --- Toggle microphone ---
  const toggleMicrophone = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  };

  // --- Host stream ---
  const handleStartStream = async () => {
    try {
      console.log("🎥 Requesting media...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });

      console.log("✅ Got stream");
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setStreamLive(true);
      setCamOn(true);
      setMicOn(true);

      console.log("👀 Listening for viewers...");

      // Listen for viewers
      const signalingRef = collection(db, "studyRooms", room.id, "signals");
      const unsubscribe = onSnapshot(signalingRef, async snapshot => {
        for (const change of snapshot.docChanges()) {
          if (change.type !== "added") continue;
          
          const data = change.doc.data();
          if (!data?.viewerId || data.type !== "viewer") continue;
          if (peersRef.current[data.viewerId]) continue;

          console.log("📡 New viewer:", data.viewerId);

          try {
            // Create peer WITHOUT any options first
            const peer = new Peer({
              initiator: true,
              trickle: false
            });

            console.log("✅ Peer created");

            // Add stream after creation (only once!)
            if (localStreamRef.current) {
              peer.addStream(localStreamRef.current);
              console.log("✅ Stream added to peer");
            }

            peer.on("signal", async signal => {
              console.log("📤 Sending signal");
              await setDoc(
                doc(db, "studyRooms", room.id, "signals", data.viewerId),
                { hostSignal: signal },
                { merge: true }
              );
            });

            peer.on("connect", () => console.log("✅ Connected:", data.viewerId));
            peer.on("error", err => console.error("❌ Peer error:", err));
            peer.on("close", () => delete peersRef.current[data.viewerId]);

            peersRef.current[data.viewerId] = peer;

            // Listen for answer
            const viewerDocRef = doc(db, "studyRooms", room.id, "signals", data.viewerId);
            const viewerUnsub = onSnapshot(viewerDocRef, docSnap => {
              const viewerData = docSnap.data();
              if (viewerData?.viewerSignal && peer && !peer.destroyed) {
                console.log("📥 Got viewer signal");
                peer.signal(viewerData.viewerSignal);
                viewerUnsub();
              }
            });

          } catch (err) {
            console.error("❌ Error:", err);
          }
        }
      });

      signalingUnsubscribeRef.current = unsubscribe;

    } catch (err) {
      console.error("❌ Failed:", err);
      alert(`Failed to start stream: ${err.message}`);
    }
  };

  const handleStopStream = () => {
    console.log("🛑 Stopping...");
    setStreamLive(false);
    setCamOn(false);
    setMicOn(false);

    Object.values(peersRef.current).forEach(p => {
      try {
        if (p && !p.destroyed) p.destroy();
      } catch (e) {}
    });
    peersRef.current = {};

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (signalingUnsubscribeRef.current) {
      signalingUnsubscribeRef.current();
      signalingUnsubscribeRef.current = null;
    }
  };

  // --- Viewer joins ---
  useEffect(() => {
    if (isHost || !user?.uid || !room?.id) return;

    const viewerId = viewerIdRef.current;
    if (!viewerId) return;

    console.log("👤 Joining as viewer");

    const signalDocRef = doc(db, "studyRooms", room.id, "signals", viewerId);
    let unsubscribe = null;
    let peer = null;

    const joinRoom = async () => {
      try {
        await setDoc(signalDocRef, {
          type: "viewer",
          roomId: room.id,
          viewerId,
          userId: user.uid,
          hostId: room.createdBy,
          timestamp: Date.now()
        });

        console.log("✅ Announced presence");

        unsubscribe = onSnapshot(signalDocRef, docSnap => {
          const data = docSnap.data();
          if (!data?.hostSignal || peer) return;

          console.log("📡 Got host signal");

          try {
            peer = new Peer({
              initiator: false,
              trickle: false
            });

            peer.on("signal", async signal => {
              console.log("📤 Sending answer");
              await setDoc(signalDocRef, { viewerSignal: signal }, { merge: true });
            });

            peer.on("stream", remoteStream => {
              console.log("🎥 ✅ Got stream!");
              setRemoteStreams(prev => ({ ...prev, [viewerId]: remoteStream }));
            });

            peer.on("connect", () => console.log("✅ Connected"));
            peer.on("error", err => console.error("❌ Error:", err));
            peer.on("close", () => {
              setRemoteStreams(prev => {
                const n = { ...prev };
                delete n[viewerId];
                return n;
              });
            });

            peer.signal(data.hostSignal);
            peersRef.current[viewerId] = peer;

          } catch (err) {
            console.error("❌ Error:", err);
          }
        });
      } catch (err) {
        console.error("❌ Join error:", err);
      }
    };

    joinRoom();

    return () => {
      if (peer && !peer.destroyed) peer.destroy();
      if (unsubscribe) unsubscribe();
      deleteDoc(signalDocRef).catch(() => {});
    };
  }, [isHost, room?.id, room?.createdBy, user?.uid]);

  // --- End room ---
  const handleEndRoom = async () => {
    if (!confirm("End the stream and delete this room? This cannot be undone.")) return;

    try {
      handleStopStream();

      const msgsQuery = query(collection(db, "messages"), where("roomId", "==", room.id));
      const msgsSnapshot = await getDocs(msgsQuery);
      await Promise.all(msgsSnapshot.docs.map(docSnap => deleteDoc(doc(db, "messages", docSnap.id))));

      const signalsSnapshot = await getDocs(collection(db, "studyRooms", room.id, "signals"));
      await Promise.all(signalsSnapshot.docs.map(docSnap => deleteDoc(docSnap.ref)));

      await deleteDoc(doc(db, "studyRooms", room.id));
      onBack();
    } catch (err) {
      console.error(err);
      alert("Failed to delete the room.");
    }
  };

  if (!user) return <div className="h-screen flex items-center justify-center text-white">Loading...</div>;

  // --- Host UI ---
  if (isHost) {
    return (
      <div className="flex h-screen bg-gray-900 overflow-hidden">
        <div className="flex-1 relative bg-black">
          {/* Video container with all overlays */}
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          
          {/* Top bar with status */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
            <button onClick={onBack} className="bg-white/10 text-white px-3 py-1 rounded-md hover:bg-white/20">← Exit</button>
            <div className="px-3 py-1 rounded-md bg-black/40 text-white font-medium">Host</div>
            {streamLive ? <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-red-600 text-white font-bold">● LIVE</div> : <div className="px-3 py-1 rounded-md bg-yellow-500 text-white font-semibold">Offline</div>}
          </div>
          
          {/* Viewer count */}
          <div className="absolute top-4 right-4 z-20 bg-black/50 text-white px-3 py-1 rounded-lg">👀 {viewers}</div>
          
          {/* No stream message */}
          {!streamLive && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <p className="text-white text-xl">Click "Start Stream" to begin</p>
            </div>
          )}
          
          {/* Reactions */}
          {reactions.map(r => <div key={r.id} className="absolute bottom-32 left-1/2 transform -translate-x-1/2 text-4xl animate-float z-30">{r.emoji}</div>)}
          
          {/* FIXED: Control bar inside video container with high z-index */}
          <div className="absolute bottom-0 left-0 right-0 z-50 p-6 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none">
            <div className="flex items-center justify-center gap-4 pointer-events-auto">
              <button
                onClick={toggleCamera}
                disabled={!streamLive}
                className={`px-5 py-3 rounded-lg text-white font-medium ${camOn ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} ${!streamLive && "opacity-50 cursor-not-allowed"} transition-colors shadow-lg`}
              >
                {camOn ? "📹 On" : "📹 Off"}
              </button>
              <button
                onClick={toggleMicrophone}
                disabled={!streamLive}
                className={`px-5 py-3 rounded-lg text-white font-medium ${micOn ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} ${!streamLive && "opacity-50 cursor-not-allowed"} transition-colors shadow-lg`}
              >
                {micOn ? "🎤 On" : "🎤 Off"}
              </button>
              {!streamLive ? (
                <button onClick={handleStartStream} className="px-5 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors shadow-lg">Start Stream</button>
              ) : (
                <button onClick={handleStopStream} className="px-5 py-3 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-semibold transition-colors shadow-lg">Stop Stream</button>
              )}
              <button onClick={handleEndRoom} className="px-5 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors shadow-lg">End Room</button>
            </div>
          </div>
        </div>

        <div className="w-96 bg-white text-black flex flex-col shadow-xl">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">{room.name}</h3>
            <p className="text-sm text-gray-600">{room.description}</p>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 && <p className="text-gray-500">No messages yet.</p>}
            {messages.map(m => <div key={m.id} className={`p-2 rounded-xl max-w-[85%] ${m.sender === user.email ? "ml-auto bg-blue-100 text-right" : "bg-gray-100"}`}><div className="text-xs font-semibold text-gray-700">{m.sender.split("@")[0]}</div><div className="mt-1 text-sm">{m.text}</div></div>)}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSend} className="p-4 border-t flex gap-2">
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Message..." className="flex-1 p-2 border rounded-lg focus:outline-none" />
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">Send</button>
          </form>
        </div>

        <style>{`
          @keyframes float {
            0% { transform: translate(-50%, 0) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -200px) scale(1.5); opacity: 0; }
          }
          .animate-float { animation: float 2s forwards; }
        `}</style>
      </div>
    );
  }

  // --- Viewer UI ---
  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      <div className="flex-1 relative bg-black">
        {Object.keys(remoteStreams).length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-xl">Waiting for host...</p>
          </div>
        ) : (
          Object.entries(remoteStreams).map(([id, stream]) => (
            <video
              key={id}
              ref={el => {
                if (el && el.srcObject !== stream) {
                  el.srcObject = stream;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ))
        )}
        <button onClick={onBack} className="absolute top-4 left-4 bg-white/10 px-3 py-1 rounded-md hover:bg-white/20">← Back</button>
        <div className="absolute top-4 right-4 bg-black/40 px-3 py-1 rounded-md">👀 {viewers}</div>
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3 bg-black/40 px-4 py-2 rounded-lg">
          <button onClick={() => sendReaction("👍")} className="px-3 py-1 bg-white/10 rounded-lg hover:bg-white/20">👍</button>
          <button onClick={() => sendReaction("❤️")} className="px-3 py-1 bg-white/10 rounded-lg hover:bg-white/20">❤️</button>
        </div>
        {reactions.map(r => <div key={r.id} className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-3xl animate-float">{r.emoji}</div>)}
      </div>
      <div className="w-96 bg-white text-black flex flex-col shadow-xl">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">{room.name}</h3>
          <p className="text-sm text-gray-600">{room.description}</p>
        </div>
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.length === 0 && <p className="text-gray-500">No messages yet.</p>}
          {messages.map(m => <div key={m.id} className={`p-2 rounded-xl max-w-[85%] ${m.sender === user.email ? "ml-auto bg-blue-100 text-right" : "bg-gray-100"}`}><div className="text-xs font-semibold text-gray-700">{m.sender.split("@")[0]}</div><div className="mt-1 text-sm">{m.text}</div></div>)}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleSend} className="p-4 border-t flex gap-2">
          <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Type..." className="flex-1 p-2 border rounded-lg focus:outline-none" />
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">Send</button>
        </form>
      </div>
      <style>{`
        @keyframes float {
          0% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -200px) scale(1.5); opacity: 0; }
        }
        .animate-float { animation: float 2s forwards; }
      `}</style>
    </div>
  );
}