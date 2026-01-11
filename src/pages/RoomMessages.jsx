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
  where,
  updateDoc
} from "firebase/firestore";
import { containsSpam } from "../utils/spamDetection";
import { FaPlay, FaPause, FaUndo } from "react-icons/fa";
const Peer = window.SimplePeer;
import { useAuthState } from "react-firebase-hooks/auth";

// Notification sound for timer completion
const dingSound = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

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

  // --- TIMER STATE ---
  const [timerData, setTimerData] = useState({ timeLeft: 1500, isRunning: false, mode: 'work' });

  const [remoteStreams, setRemoteStreams] = useState({});
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const chatEndRef = useRef(null);
  const peersRef = useRef({});
  const signalingUnsubscribeRef = useRef(null);
  const viewerIdRef = useRef(user ? `${user.uid}_${Date.now()}` : null);
  const roomRef = doc(db, "studyRooms", room.id);

  // --- TIMER LOGIC ---
  
  // 1. Listen for Timer Updates (Everyone)
  useEffect(() => {
    if (!room?.id) return;
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().timer) {
        const data = docSnap.data().timer;
        setTimerData(data);
        
        // Play sound for everyone when timer hits zero
        if (data.timeLeft === 0 && data.isRunning === false) {
           dingSound.play().catch(e => console.log("Audio play blocked by browser"));
        }
      }
    });
    return unsubscribe;
  }, [room.id]);

  // 2. Host-Only Countdown Driver (Fixed NaN logic)
  useEffect(() => {
    let interval = null;
    
    // Safety check: only run if all data exists
    if (isHost && timerData?.isRunning && (timerData?.timeLeft ?? 0) > 0) {
      interval = setInterval(async () => {
        await updateDoc(roomRef, { 
          "timer.timeLeft": timerData.timeLeft - 1 
        });
      }, 1000);
    } else if (isHost && timerData?.isRunning && timerData?.timeLeft === 0) {
      const nextMode = timerData.mode === "work" ? "break" : "work";
      updateDoc(roomRef, {
        timer: {
          timeLeft: nextMode === "work" ? 1500 : 300,
          isRunning: false,
          mode: nextMode
        }
      });
    }
    return () => clearInterval(interval);
  }, [isHost, timerData?.isRunning, timerData?.timeLeft]);

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

  // Thumbnail Capture logic
  useEffect(() => {
    let interval = null;
    if (isHost && streamLive && localVideoRef.current) {
      interval = setInterval(async () => {
        try {
          const video = localVideoRef.current;
          const canvas = document.createElement("canvas");
          canvas.width = 640; 
          canvas.height = 360;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailData = canvas.toDataURL("image/jpeg", 0.8);

          await updateDoc(roomRef, {
            liveThumbnail: thumbnailData,
            isLive: true
          });
        } catch (err) {
          console.error("Thumbnail capture failed:", err);
        }
      }, 1500);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (isHost) {
        updateDoc(roomRef, { liveThumbnail: null, isLive: false }).catch(() => {});
      }
    };
  }, [isHost, streamLive]);

  // Reactions logic
  useEffect(() => {
    if (!room?.id) return;
    const reactionsQuery = query(
      collection(db, "reactions"),
      where("roomId", "==", room.id),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(reactionsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const reactionData = change.doc.data();
          const id = change.doc.id;
          setReactions(prev => [...prev, { id, emoji: reactionData.emoji }]);
          setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== id));
          }, 2000);
        }
      });
    });
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

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCamOn(videoTrack.enabled);
    }
  };

  const toggleMicrophone = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  };

  const handleStartStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });
      
      // Initialize timer data when stream starts to prevent NaN
      await updateDoc(roomRef, {
        timer: {
          timeLeft: 1500,
          isRunning: false,
          mode: 'work'
        }
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setStreamLive(true);
      setCamOn(true);
      setMicOn(true);

      const signalingRef = collection(db, "studyRooms", room.id, "signals");
      const unsubscribe = onSnapshot(signalingRef, async snapshot => {
        for (const change of snapshot.docChanges()) {
          if (change.type !== "added") continue;
          const data = change.doc.data();
          if (!data?.viewerId || data.type !== "viewer") continue;
          if (peersRef.current[data.viewerId]) continue;

          try {
            const peer = new Peer({ initiator: true, trickle: false });
            if (localStreamRef.current) peer.addStream(localStreamRef.current);
            peer.on("signal", async signal => {
              await setDoc(doc(db, "studyRooms", room.id, "signals", data.viewerId), { hostSignal: signal }, { merge: true });
            });
            peer.on("close", () => delete peersRef.current[data.viewerId]);
            peersRef.current[data.viewerId] = peer;
            const viewerDocRef = doc(db, "studyRooms", room.id, "signals", data.viewerId);
            const viewerUnsub = onSnapshot(viewerDocRef, docSnap => {
              const viewerData = docSnap.data();
              if (viewerData?.viewerSignal && peer && !peer.destroyed) {
                peer.signal(viewerData.viewerSignal);
                viewerUnsub();
              }
            });
          } catch (err) { console.error("❌ Error:", err); }
        }
      });
      signalingUnsubscribeRef.current = unsubscribe;
    } catch (err) { alert(`Failed to start stream: ${err.message}`); }
  };

  const handleStopStream = () => {
    setStreamLive(false); setCamOn(false); setMicOn(false);
    Object.values(peersRef.current).forEach(p => { try { if (p && !p.destroyed) p.destroy(); } catch (e) {} });
    peersRef.current = {};
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (signalingUnsubscribeRef.current) { signalingUnsubscribeRef.current(); signalingUnsubscribeRef.current = null; }
  };

  useEffect(() => {
    if (isHost || !user?.uid || !room?.id) return;
    const viewerId = viewerIdRef.current;
    if (!viewerId) return;
    const signalDocRef = doc(db, "studyRooms", room.id, "signals", viewerId);
    let unsubscribe = null;
    let peer = null;
    const joinRoom = async () => {
      try {
        await setDoc(signalDocRef, { type: "viewer", roomId: room.id, viewerId, userId: user.uid, hostId: room.createdBy, timestamp: Date.now() });
        unsubscribe = onSnapshot(signalDocRef, docSnap => {
          const data = docSnap.data();
          if (!data?.hostSignal || peer) return;
          try {
            peer = new Peer({ initiator: false, trickle: false });
            peer.on("signal", async signal => { await setDoc(signalDocRef, { viewerSignal: signal }, { merge: true }); });
            peer.on("stream", remoteStream => { setRemoteStreams(prev => ({ ...prev, [viewerId]: remoteStream })); });
            peer.on("close", () => { setRemoteStreams(prev => { const n = { ...prev }; delete n[viewerId]; return n; }); });
            peer.signal(data.hostSignal);
            peersRef.current[viewerId] = peer;
          } catch (err) { console.error("❌ Error:", err); }
        });
      } catch (err) { console.error("❌ Join error:", err); }
    };
    joinRoom();
    return () => {
      if (peer && !peer.destroyed) peer.destroy();
      if (unsubscribe) unsubscribe();
      deleteDoc(signalDocRef).catch(() => {});
    };
  }, [isHost, room?.id, room?.createdBy, user?.uid]);

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
    } catch (err) { alert("Failed to delete the room."); }
  };

  const TimerUI = () => {
    const timeLeft = timerData?.timeLeft ?? 1500;
    const isRunning = timerData?.isRunning ?? false;
    const mode = timerData?.mode ?? 'work';

    return (
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-black/40 backdrop-blur-md border border-white/20 p-1 rounded-2xl flex items-center shadow-xl text-white">
          <div className={`px-5 py-1 text-center ${isHost ? 'border-r border-white/10' : ''}`}>
            <p className={`text-[10px] uppercase font-black tracking-widest ${mode === 'work' ? 'text-blue-400' : 'text-green-400'}`}>
              {mode === 'work' ? 'Focus' : 'Break'}
            </p>
            <h2 className="text-2xl font-mono font-bold leading-none tabular-nums">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
            </h2>
          </div>
          {isHost && (
            <div className="flex gap-1 px-2">
              <button 
                onClick={() => updateDoc(roomRef, { "timer.isRunning": !isRunning })} 
                className="p-2 hover:bg-white/10 rounded-lg text-blue-400 transition"
              >
                {isRunning ? <FaPause size={14}/> : <FaPlay size={14}/>}
              </button>
              <button 
                onClick={() => updateDoc(roomRef, { "timer.timeLeft": mode === 'work' ? 1500 : 300, "timer.isRunning": false })} 
                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition"
              >
                <FaUndo size={12}/>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!user) return <div className="h-screen flex items-center justify-center text-white">Loading...</div>;

  if (isHost) {
    return (
      <div className="flex h-screen bg-gray-900 overflow-hidden">
        <div className="flex-1 relative bg-black">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <TimerUI />
          <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
            <button onClick={onBack} className="bg-white/10 text-white px-3 py-1 rounded-md hover:bg-white/20">← Exit</button>
            <div className="px-3 py-1 rounded-md bg-black/40 text-white font-medium">Host</div>
            {streamLive ? <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-red-600 text-white font-bold">● LIVE</div> : <div className="px-3 py-1 rounded-md bg-yellow-500 text-white font-semibold">Offline</div>}
          </div>
          <div className="absolute top-4 right-4 z-20 bg-black/50 text-white px-3 py-1 rounded-lg">👀 {viewers}</div>
          {!streamLive && <div className="absolute inset-0 flex items-center justify-center z-10"><p className="text-white text-xl">Click "Start Stream" to begin</p></div>}
          {reactions.map(r => <div key={r.id} className="absolute bottom-32 left-1/2 transform -translate-x-1/2 text-4xl animate-float z-30">{r.emoji}</div>)}
          <div className="absolute bottom-0 left-0 right-0 z-50 p-6 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none">
            <div className="flex items-center justify-center gap-4 pointer-events-auto">
              <button onClick={toggleCamera} disabled={!streamLive} className={`px-5 py-3 rounded-lg text-white font-medium ${camOn ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} ${!streamLive && "opacity-50 cursor-not-allowed"} transition-colors shadow-lg`}>{camOn ? "📹 On" : "📹 Off"}</button>
              <button onClick={toggleMicrophone} disabled={!streamLive} className={`px-5 py-3 rounded-lg text-white font-medium ${micOn ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} ${!streamLive && "opacity-50 cursor-not-allowed"} transition-colors shadow-lg`}>{micOn ? "🎤 On" : "🎤 Off"}</button>
              {!streamLive ? <button onClick={handleStartStream} className="px-5 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors shadow-lg">Start Stream</button> : <button onClick={handleStopStream} className="px-5 py-3 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-semibold transition-colors shadow-lg">Stop Stream</button>}
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
        <style>{`@keyframes float { 0% { transform: translate(-50%, 0) scale(1); opacity: 1; } 100% { transform: translate(-50%, -200px) scale(1.5); opacity: 0; } } .animate-float { animation: float 2s forwards; }`}</style>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      <div className="flex-1 relative bg-black">
        <TimerUI />
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
        <button onClick={onBack} className="absolute top-4 left-4 bg-white/10 px-3 py-1 rounded-md hover:bg-white/20 z-20">← Back</button>
        <div className="absolute top-4 right-4 bg-black/40 px-3 py-1 rounded-md z-20">👀 {viewers}</div>
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3 bg-black/40 px-4 py-2 rounded-lg z-20">
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
      <style>{`@keyframes float { 0% { transform: translate(-50%, 0) scale(1); opacity: 1; } 100% { transform: translate(-50%, -200px) scale(1.5); opacity: 0; } } .animate-float { animation: float 2s forwards; }`}</style>
    </div>
  );
}