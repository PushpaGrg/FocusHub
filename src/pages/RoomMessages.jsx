// src/pages/RoomMessages.jsx
import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import {
  collection, doc, deleteDoc, getDocs, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, setDoc, where, updateDoc
} from "firebase/firestore";
import { containsSpam } from "../utils/spamDetection";
import { 
  FaArrowLeft, FaEye, FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash,
  FaBroadcastTower, FaStopCircle, FaPowerOff, FaPaperPlane,
  FaStopwatch, FaCoffee, FaCheck, FaThumbsUp, FaHeart, FaBolt
} from "react-icons/fa";
const Peer = window.SimplePeer;
import { useAuthState } from "react-firebase-hooks/auth";

const dingSound = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

// --- MODAL COMPONENT ---
const TimerSetupModal = ({ onClose, onSave, isStreamLive }) => {
  const [w, setW] = useState(25);
  const [b, setB] = useState(5);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-white/20 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"><FaCheck /></button>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 text-3xl">
            <FaStopwatch />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Set Pomodoro</h2>
          <p className="text-gray-500 text-sm mt-1">
            {isStreamLive 
              ? "Session is live. Timer starts immediately." 
              : "Settings saved. Timer starts when you Go Live."}
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Focus (Minutes)</label>
            <input type="number" value={w} onChange={e => setW(Number(e.target.value))} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Break (Minutes)</label>
            <input type="number" value={b} onChange={e => setB(Number(e.target.value))} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-mono text-lg" />
          </div>
          <button 
            onClick={() => onSave(w, b)} 
            className={`w-full text-white py-3 rounded-xl font-bold hover:shadow-lg transition-transform active:scale-95 ${
              isStreamLive ? "bg-gradient-to-r from-blue-600 to-purple-600" : "bg-gray-800"
            }`}
          >
            {isStreamLive ? "Start Timer Now" : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- CONTROL BUTTON ---
const ControlButton = ({ onClick, icon, label, variant = "default", disabled = false }) => {
  const variants = {
    default: "bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10",
    danger: "bg-red-500/80 hover:bg-red-500 text-white backdrop-blur-md shadow-red-500/20",
    success: "bg-green-500/80 hover:bg-green-500 text-white backdrop-blur-md shadow-green-500/20",
    warning: "bg-yellow-500/80 hover:bg-yellow-500 text-white backdrop-blur-md",
    primary: "bg-blue-600/80 hover:bg-blue-500 text-white backdrop-blur-md shadow-blue-500/20",
    locked: "bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700" 
  };

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`p-4 rounded-2xl shadow-lg transition-all transform hover:scale-105 active:scale-95 ${disabled ? variants.locked : variants[variant]}`}
      >
        <div className="text-xl">{icon}</div>
      </button>
      {!disabled && (
        <span className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-white text-gray-900 text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl z-50">
          {label}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45"></div>
        </span>
      )}
    </div>
  );
};

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
  
  const [timerData, setTimerData] = useState({ 
    timeLeft: 1500, 
    isRunning: false, 
    mode: 'work',
    config: { work: 25, break: 5 }, 
    isConfigured: false,
    autoStart: false
  });
  const [showTimerModal, setShowTimerModal] = useState(false);

  const [remoteStreams, setRemoteStreams] = useState({});
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const chatEndRef = useRef(null);
  const peersRef = useRef({});
  const signalingUnsubscribeRef = useRef(null);
  const viewerIdRef = useRef(user ? `${user.uid}_${Date.now()}` : null);
  const roomRef = doc(db, "studyRooms", room.id);

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (!room?.id) return;
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().timer) {
        const data = docSnap.data().timer;
        setTimerData(data);
        if (data.timeLeft === 0 && data.isRunning === false) {
           dingSound.play().catch(e => console.log("Audio blocked"));
        }
      }
    });
    return unsubscribe;
  }, [room.id]);

  useEffect(() => {
    let interval = null;
    if (isHost && timerData?.isRunning && timerData?.timeLeft > 0) {
      interval = setInterval(async () => {
        await updateDoc(roomRef, { "timer.timeLeft": timerData.timeLeft - 1 });
      }, 1000);
    } 
    else if (isHost && timerData?.isRunning && timerData?.timeLeft === 0) {
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [isHost, timerData?.isRunning, timerData?.timeLeft]);

  const handleTimerComplete = async () => {
    if (timerData.mode === 'work') {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => t.enabled = false);
        localStreamRef.current.getAudioTracks().forEach(t => t.enabled = false);
        setCamOn(false); setMicOn(false);
      }
      await updateDoc(roomRef, {
        timer: { ...timerData, timeLeft: timerData.config.break * 60, isRunning: true, mode: 'break' },
        isLive: true
      });
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => t.enabled = true);
        localStreamRef.current.getAudioTracks().forEach(t => t.enabled = true);
        setCamOn(true); setMicOn(true);
      }
      await updateDoc(roomRef, {
        timer: { timeLeft: 1500, isRunning: false, mode: 'work', isConfigured: false, config: timerData.config }
      });
    }
  };

  const handleSaveTimerConfig = async (workMin, breakMin) => {
    const shouldRun = streamLive; 
    await updateDoc(roomRef, {
      timer: {
        timeLeft: workMin * 60,
        isRunning: shouldRun, 
        mode: 'work',
        config: { work: workMin, break: breakMin },
        isConfigured: shouldRun,
        autoStart: !shouldRun
      }
    });
    setShowTimerModal(false);
  };

  // --- MESSAGES ---
  useEffect(() => {
    if (!room?.id) return;
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.filter(d => d.data().roomId === room.id).map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [room?.id]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    if (containsSpam(newMsg)) { alert("⚠️ Spam blocked."); setNewMsg(""); return; }
    await addDoc(collection(db, "messages"), { 
      roomId: room.id, sender: user.email, text: newMsg.trim(), createdAt: serverTimestamp() 
    });
    setNewMsg("");
  };

  // --- THUMBNAIL ---
  useEffect(() => {
    let interval = null;
    if (isHost && streamLive && localVideoRef.current && timerData.mode === 'work') {
      interval = setInterval(async () => {
        try {
          const video = localVideoRef.current;
          const canvas = document.createElement("canvas");
          canvas.width = 640; canvas.height = 360;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailData = canvas.toDataURL("image/jpeg", 0.8);
          await updateDoc(roomRef, { liveThumbnail: thumbnailData, isLive: true });
        } catch (err) {}
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
      if (isHost) updateDoc(roomRef, { liveThumbnail: null, isLive: false }).catch(() => {});
    };
  }, [isHost, streamLive, timerData.mode]);

  // --- REACTIONS ---
  useEffect(() => {
    if (!room?.id) return;
    const reactionsQuery = query(collection(db, "reactions"), where("roomId", "==", room.id), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(reactionsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const reactionData = change.doc.data();
          const id = change.doc.id;
          setReactions(prev => [...prev, { id, emoji: reactionData.emoji }]);
          setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 2000);
        }
      });
    });
    return () => unsubscribe();
  }, [room?.id]);

  const sendReaction = async (emoji) => {
    try {
      await addDoc(collection(db, "reactions"), {
        roomId: room.id, emoji, timestamp: serverTimestamp(), senderId: user?.uid || "guest"
      });
    } catch (err) {}
  };

  // --- STREAMING ---
  const handleStartStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setStreamLive(true); setCamOn(true); setMicOn(true);
      
      // AUTO START TIMER IF NEEDED
      if (timerData.autoStart) {
        await updateDoc(roomRef, { 
          "timer.isRunning": true,
          "timer.isConfigured": true, 
          "timer.autoStart": false 
        });
      } else if (!timerData.isConfigured) {
        await updateDoc(roomRef, { "timer.isConfigured": false });
      }

      // Signaling... (Standard)
      const signalingRef = collection(db, "studyRooms", room.id, "signals");
      signalingUnsubscribeRef.current = onSnapshot(signalingRef, async snapshot => {
        for (const change of snapshot.docChanges()) {
          if (change.type !== "added") continue;
          const data = change.doc.data();
          if (!data?.viewerId || data.type !== "viewer") continue;
          if (peersRef.current[data.viewerId]) continue;
          try {
            const peer = new Peer({ initiator: true, trickle: false });
            if (localStreamRef.current) peer.addStream(localStreamRef.current);
            peer.on("signal", async signal => { await setDoc(doc(db, "studyRooms", room.id, "signals", data.viewerId), { hostSignal: signal }, { merge: true }); });
            peer.on("close", () => delete peersRef.current[data.viewerId]);
            peersRef.current[data.viewerId] = peer;
            const viewerDocRef = doc(db, "studyRooms", room.id, "signals", data.viewerId);
            const viewerUnsub = onSnapshot(viewerDocRef, docSnap => {
              const viewerData = docSnap.data();
              if (viewerData?.viewerSignal && peer && !peer.destroyed) { peer.signal(viewerData.viewerSignal); viewerUnsub(); }
            });
          } catch (err) {}
        }
      });
    } catch (err) { alert(`Failed: ${err.message}`); }
  };

  const handleStopStream = async () => {
     setStreamLive(false); setCamOn(false); setMicOn(false);
     Object.values(peersRef.current).forEach(p => p.destroy());
     peersRef.current = {};
     if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
     if (signalingUnsubscribeRef.current) signalingUnsubscribeRef.current();

     // *** FORCE STOP & HIDE TIMER ***
     await updateDoc(roomRef, {
       "timer.isRunning": false,
       "timer.isConfigured": false,
       "timer.timeLeft": 1500,
       "timer.mode": 'work'
     });
  };

  const handleEndRoom = async () => {
    if (!confirm("End room?")) return;
    await handleStopStream(); // Ensures timer stops too
    await deleteDoc(doc(db, "studyRooms", room.id));
    onBack();
  };

  // Viewer Join Logic
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
          } catch (err) {}
        });
      } catch (err) {}
    };
    joinRoom();
    return () => {
      if (peer && !peer.destroyed) peer.destroy();
      if (unsubscribe) unsubscribe();
      deleteDoc(signalDocRef).catch(() => {});
    };
  }, [isHost, room?.id, room?.createdBy, user?.uid]);

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOn(track.enabled); }
  };
  const toggleMicrophone = () => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(track.enabled); }
  };

  // --- UI ---
  const BreakOverlay = () => {
    if (timerData.mode !== 'break') return null;
    return (
      <div className="absolute inset-0 z-40 bg-gradient-to-br from-green-400 via-teal-500 to-blue-500 flex flex-col items-center justify-center text-white animate-fadeIn">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6 animate-bounce shadow-2xl">
          <FaCoffee className="text-6xl text-white" />
        </div>
        <h2 className="text-5xl font-extrabold mb-4 drop-shadow-md">Take a Break</h2>
        <div className="text-8xl font-mono font-black tracking-tighter tabular-nums drop-shadow-lg">
          {Math.floor(timerData.timeLeft / 60)}:{String(timerData.timeLeft % 60).padStart(2, "0")}
        </div>
      </div>
    );
  };

  if (!user) return <div className="h-screen flex items-center justify-center text-white">Loading...</div>;

  if (isHost) {
    const isBreak = timerData.mode === 'break';
    return (
      <div className="flex h-screen bg-gray-950 overflow-hidden font-sans">
        <div className="flex-1 relative bg-black">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <BreakOverlay />
          {showTimerModal && <TimerSetupModal onClose={() => setShowTimerModal(false)} onSave={handleSaveTimerConfig} isStreamLive={streamLive} />}

          {/* TIMER PILL - Only if configured + work mode */}
          {timerData.isConfigured && timerData.mode === 'work' && (
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 bg-black/40 backdrop-blur-xl border border-white/20 px-6 py-2 rounded-2xl flex items-center gap-3 shadow-xl animate-slideDown">
              <FaBolt className="text-yellow-400 animate-pulse" />
              <span className="text-2xl font-mono font-bold text-white tabular-nums">
                {Math.floor(timerData.timeLeft / 60)}:{String(timerData.timeLeft % 60).padStart(2, "0")}
              </span>
            </div>
          )}

          <div className="absolute top-5 left-5 z-20 flex items-center gap-3">
             <button onClick={onBack} className="bg-black/40 text-white px-4 py-2 rounded-full hover:bg-white/10 flex items-center gap-2 border border-white/10"><FaArrowLeft /> Exit</button>
            {streamLive && <div className="px-4 py-2 rounded-full bg-red-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg"><span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> LIVE</div>}
          </div>

          <div className="absolute top-5 right-5 z-20 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full z-20 flex items-center gap-2 border border-white/10">
            <FaEye className="text-blue-400"/> {viewers}
          </div>

          {!streamLive && <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"><p className="text-white text-xl font-light tracking-wide bg-black/50 px-6 py-3 rounded-full backdrop-blur-sm border border-white/10">Ready to stream</p></div>}
          
          {/* FLOATING REACTIONS */}
          {reactions.map(r => <div key={r.id} className="absolute bottom-32 left-1/2 transform -translate-x-1/2 text-4xl animate-float z-30">{r.emoji}</div>)}

          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 p-3 bg-black/50 backdrop-blur-2xl rounded-3xl border border-white/10 flex gap-4 pointer-events-auto shadow-2xl animate-slideUp">
              <ControlButton onClick={() => !timerData.isConfigured && setShowTimerModal(true)} disabled={timerData.isConfigured || isBreak} icon={<FaStopwatch />} label={timerData.isConfigured ? "Timer Active" : "Pomodoro"} variant={timerData.isConfigured ? "success" : "primary"} />
              <div className="w-px bg-white/20 mx-1"></div>
              <ControlButton onClick={toggleCamera} disabled={!streamLive || isBreak} icon={camOn ? <FaVideo /> : <FaVideoSlash />} label={camOn ? "Cam Off" : "Cam On"} variant={camOn ? "default" : "danger"} />
              <ControlButton onClick={toggleMicrophone} disabled={!streamLive || isBreak} icon={micOn ? <FaMicrophone /> : <FaMicrophoneSlash />} label={micOn ? "Mute" : "Unmute"} variant={micOn ? "default" : "danger"} />
              {!streamLive ? (
                <ControlButton onClick={handleStartStream} disabled={isBreak} icon={<FaBroadcastTower />} label="Go Live" variant="success" />
              ) : (
                <ControlButton onClick={handleStopStream} disabled={isBreak} icon={<FaStopCircle />} label="Stop Live" variant="warning" />
              )}
              <ControlButton onClick={handleEndRoom} icon={<FaPowerOff />} label="End Room" variant="danger" />
          </div>
        </div>

        <div className="w-96 bg-white flex flex-col shadow-2xl border-l border-gray-100 relative z-20">
          <div className="p-5 border-b border-gray-100 bg-white"><h3 className="text-xl font-bold text-gray-800">{room.name}</h3></div>
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-gray-50/50">
            {messages.map(m => (
              <div key={m.id} className={`flex flex-col ${m.sender === user.email ? "items-end" : "items-start"}`}>
                <div className={`px-4 py-2 rounded-2xl max-w-[85%] shadow-sm ${m.sender === user.email ? "bg-blue-600 text-white rounded-tr-none" : "bg-white border text-gray-700 rounded-tl-none"}`}><div className="text-sm">{m.text}</div></div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-white flex gap-2">
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Type a message..." className="flex-1 px-5 py-3 border rounded-full bg-gray-50 outline-none" />
            <button className="bg-blue-600 text-white p-3.5 rounded-full"><FaPaperPlane /></button>
          </form>
        </div>
        <style>{`@keyframes float { 0% { transform: translate(-50%, 0) scale(1); opacity: 1; } 100% { transform: translate(-50%, -200px) scale(1.5); opacity: 0; } } .animate-float { animation: float 2s forwards; }`}</style>
      </div>
    );
  }

  // --- VIEWER VIEW ---
  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans">
      <div className="flex-1 relative bg-black">
        {timerData.mode === 'break' && <BreakOverlay />}
        {Object.entries(remoteStreams).map(([id, stream]) => (
          <video key={id} ref={el => { if (el && el.srcObject !== stream) { el.srcObject = stream; el.play().catch(() => {}); } }} autoPlay playsInline className="w-full h-full object-cover" />
        ))}
        {Object.keys(remoteStreams).length === 0 && timerData.mode !== 'break' && (
          <div className="w-full h-full flex items-center justify-center"><p className="text-gray-500">Waiting for host...</p></div>
        )}
        {timerData.isConfigured && timerData.mode === 'work' && (
           <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 bg-black/40 backdrop-blur-xl border border-white/20 px-6 py-2 rounded-2xl flex items-center gap-3 animate-slideDown">
              <FaBolt className="text-yellow-400 animate-pulse" />
              <span className="text-2xl font-mono font-bold">{Math.floor(timerData.timeLeft / 60)}:{String(timerData.timeLeft % 60).padStart(2, "0")}</span>
           </div>
        )}
        <button onClick={onBack} className="absolute top-5 left-5 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 z-20 flex items-center gap-2"><FaArrowLeft /> Back</button>
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex gap-4 z-20 bg-black/40 backdrop-blur-xl p-2 rounded-2xl border border-white/10">
          <ControlButton onClick={() => sendReaction("👍")} icon={<FaThumbsUp className="text-blue-400"/>} label="Like" variant="default" />
          <ControlButton onClick={() => sendReaction("❤️")} icon={<FaHeart className="text-red-500"/>} label="Love" variant="default" />
        </div>
        {reactions.map(r => <div key={r.id} className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-3xl animate-float z-30">{r.emoji}</div>)}
      </div>
      <div className="w-96 bg-white flex flex-col border-l border-gray-100 z-20">
         <div className="p-5 border-b font-bold text-black">{room.name}</div>
         <div className="flex-1 p-5 overflow-y-auto bg-gray-50">
           {messages.map(m => <div key={m.id} className="text-black text-sm mb-2"><b>{m.sender.split('@')[0]}: </b>{m.text}</div>)}
           <div ref={chatEndRef} />
         </div>
         <form onSubmit={handleSend} className="p-4 border-t flex gap-2"><input value={newMsg} onChange={e => setNewMsg(e.target.value)} className="flex-1 border p-2 rounded-full text-black"/><button className="text-blue-600"><FaPaperPlane/></button></form>
      </div>
      <style>{`
        .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-slideUp { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px) translateX(-50%); } to { opacity: 1; transform: translateY(0) translateX(-50%); } }
        .animate-slideDown { animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-40px) translateX(-50%); } to { opacity: 1; transform: translateY(0) translateX(-50%); } }
        @keyframes float { 0% { transform: translate(-50%, 0) scale(1); opacity: 1; } 100% { transform: translate(-50%, -200px) scale(1.5); opacity: 0; } } .animate-float { animation: float 2s forwards; }
      `}</style>
    </div>
  );
}