// src/pages/StudyBuddyRoom.jsx
import { useState, useEffect, useRef } from "react";
import { 
  FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, 
  FaCommentDots, FaCopy, FaCheck, FaSignOutAlt, FaPlay, 
  FaPause, FaUndo, FaExclamationTriangle, FaTimes, FaPowerOff, FaPaperPlane 
} from "react-icons/fa";
import { db } from "../firebase";
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, addDoc, query, orderBy, deleteDoc, setDoc, getDoc } from "firebase/firestore";
import Peer from "peerjs";
import { containsSpam } from "../utils/spamDetection";

// --- REUSABLE GLASS CONTROL BUTTON ---
const ControlButton = ({ onClick, icon, label, variant = "default", active = false }) => {
  // Variants using Glassmorphism suitable for dark video backgrounds
  const variants = {
    default: "bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10",
    danger: "bg-red-500/80 hover:bg-red-600 text-white backdrop-blur-md shadow-red-500/20",
    primary: "bg-blue-600/80 hover:bg-blue-500 text-white backdrop-blur-md shadow-blue-500/20",
    toggle: active 
      ? "bg-white text-gray-900 hover:bg-gray-200" // Active state (e.g., Mic On)
      : "bg-red-500/80 text-white hover:bg-red-600" // Inactive state (e.g., Mic Off)
  };

  const styleClass = variants[variant] || variants.default;

  return (
    <div className="relative group">
      <button 
        onClick={onClick} 
        className={`p-4 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center ${styleClass}`}
      >
        <div className="text-xl">{icon}</div>
      </button>
      
      {/* Tooltip */}
      <span className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-white text-gray-900 text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl z-50">
        {label}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45"></div>
      </span>
    </div>
  );
};

export default function StudyBuddyRoom({ room, user, onBack }) {
  const [timerData, setTimerData] = useState({ timeLeft: 1500, isRunning: false, mode: 'work' });
  const [buddies, setBuddies] = useState([]);
  const [copied, setCopied] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [remoteStreams, setRemoteStreams] = useState({});
  const [peerReady, setPeerReady] = useState(false);
  const [spamWarnings, setSpamWarnings] = useState(0);

  const myVideoRef = useRef();
  const peersRef = useRef({}); 
  const peerRef = useRef();
  const localStreamRef = useRef();
  const chatEndRef = useRef(null);

  const isHost = user.uid === room.createdBy;
  const roomRef = doc(db, "studyRooms", room.id);
  const inviteLink = `${window.location.origin}/join/${room.id}`;

  // --- TIMER LOGIC ---
  useEffect(() => {
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().timer) {
        setTimerData(docSnap.data().timer);
      }
    });
    return unsubscribe;
  }, [room.id]);

  useEffect(() => {
    let interval = null;
    if (isHost && timerData.isRunning && timerData.timeLeft > 0) {
      interval = setInterval(async () => {
        await updateDoc(roomRef, { "timer.timeLeft": timerData.timeLeft - 1 });
      }, 1000);
    } else if (isHost && timerData.timeLeft === 0) {
      const nextMode = timerData.mode === "work" ? "break" : "work";
      updateDoc(roomRef, {
        timer: { timeLeft: nextMode === "work" ? 1500 : 300, isRunning: false, mode: nextMode }
      });
    }
    return () => clearInterval(interval);
  }, [isHost, timerData.isRunning, timerData.timeLeft]);

  // --- ROOM SYNC ---
  useEffect(() => {
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const roomData = docSnap.data();
        setBuddies(roomData.participants || []);
        setSessionStarted(roomData.sessionStarted || false);
      }
    });
    return unsubscribe;
  }, [room.id]);

  useEffect(() => {
    const userData = { uid: user.uid, username: user.username || user.email.split("@")[0], email: user.email, joinedAt: new Date() };
    const join = async () => { await updateDoc(roomRef, { participants: arrayUnion(userData) }); };
    join();
    return () => {
      const leave = async () => {
        try {
          const snap = await getDoc(roomRef);
          if (snap.exists()) await updateDoc(roomRef, { participants: arrayRemove(userData) });
          await deleteDoc(doc(roomRef, "peers", user.uid)).catch(() => {});
        } catch (err) {}
      };
      leave();
    };
  }, [room.id, user.uid]);

  // --- CHAT & SPAM ---
  useEffect(() => {
    if (!sessionStarted) return;
    const q = query(collection(roomRef, "messages"), orderBy("timestamp", "asc"));
    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [room.id, sessionStarted]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, showChat]);

  const leaveSession = async () => { 
    try {
      const userData = { uid: user.uid, username: user.username || user.email.split("@")[0], email: user.email };
      const snap = await getDoc(roomRef);
      if (snap.exists()) {
        if (isHost) { await deleteDoc(roomRef); } else { await updateDoc(roomRef, { participants: arrayRemove(userData) }); }
      }
      await deleteDoc(doc(roomRef, "peers", user.uid)).catch(() => {});
    } catch (err) { console.error("Leave error:", err); }
    onBack(); 
  };

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    const trimmedMsg = newMessage.trim();
    if (!trimmedMsg) return;
    if (containsSpam(trimmedMsg)) {
      const newWarningCount = spamWarnings + 1;
      if (newWarningCount >= 3) {
        const cooldownUntil = Date.now() + 60000;
        localStorage.setItem(`cooldown_${room.id}`, cooldownUntil);
        alert("❌ You have been kicked for spamming. You can re-join in 60 seconds.");
        leaveSession();
        return;
      }
      setSpamWarnings(newWarningCount);
      setNewMessage("");
      alert(`⚠️ Spam detected! Warning ${newWarningCount}/3.`);
      return;
    }
    await addDoc(collection(roomRef, "messages"), {
      senderId: user.uid, username: user.username || user.email.split("@")[0], text: trimmedMsg, timestamp: new Date(),
    });
    setNewMessage("");
  };

  // --- WEBRTC ---
  useEffect(() => {
    if (!sessionStarted) return;
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (myVideoRef.current) myVideoRef.current.srcObject = stream;
        const peer = new Peer(user.uid, { host: "0.peerjs.com", port: 443, secure: true, config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] } });
        peerRef.current = peer;
        peer.on("open", async (id) => {
          setPeerReady(true);
          await setDoc(doc(roomRef, "peers", user.uid), { peerId: id, userId: user.uid, timestamp: Date.now() });
        });
        peer.on("call", (call) => {
          call.answer(localStreamRef.current);
          call.on("stream", (remoteStream) => { setRemoteStreams(prev => ({ ...prev, [call.peer]: remoteStream })); });
        });
      } catch (err) { alert("Camera/Mic access denied."); }
    };
    initMedia();
    return () => {
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
      if (peerRef.current) peerRef.current.destroy();
    };
  }, [sessionStarted]);

  useEffect(() => {
    if (!sessionStarted || !peerReady) return;
    const unsubscribe = onSnapshot(collection(roomRef, "peers"), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.userId !== user.uid && !peersRef.current[data.userId]) {
            const myDoc = await getDoc(doc(roomRef, "peers", user.uid));
            if (myDoc.exists() && myDoc.data().timestamp < data.timestamp) {
              setTimeout(() => {
                if (peerRef.current && localStreamRef.current) {
                  const call = peerRef.current.call(data.peerId, localStreamRef.current);
                  call.on("stream", (remoteStream) => { setRemoteStreams(prev => ({ ...prev, [data.userId]: remoteStream })); });
                  peersRef.current[data.userId] = call;
                }
              }, 2000);
            }
          }
        }
      });
    });
    return unsubscribe;
  }, [sessionStarted, peerReady]);

  const startSession = () => updateDoc(roomRef, { sessionStarted: true });
  const copyLink = () => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !micOn; setMicOn(!micOn); }
  };
  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !videoOn; setVideoOn(!videoOn); }
  };

  // --- RENDER: LOBBY (MATCHES HOME UI) ---
  if (!sessionStarted) {
    return (
      <div className="flex min-h-screen relative overflow-hidden items-center justify-center p-4">
        {/* Background Elements (Matches Home/Login) */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50"></div>
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-3xl animate-float"></div>
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        {/* Lobby Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl border border-white/50 relative z-10 animate-slideUp">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
              {room.name}
            </h2>
            <p className="text-gray-500 font-medium">Lobby - Waiting for session</p>
          </div>

          {/* Invite Link Section */}
          <div className="mb-8">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block ml-2">Invite Link</label>
            <div className="bg-gray-50 rounded-2xl p-2 flex items-center justify-between gap-3 border border-gray-200 pl-4">
              <span className="text-sm truncate flex-1 text-gray-600 font-medium">{inviteLink}</span>
              <button 
                onClick={copyLink} 
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md ${copied ? "bg-green-500 text-white" : "bg-white text-blue-600 hover:bg-blue-50"}`}
              >
                {copied ? <FaCheck /> : <FaCopy />}
              </button>
            </div>
          </div>

          {/* Participants List */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-green-200"></span>
              Participants ({buddies.length})
            </h3>
            <div className="bg-gray-50/80 rounded-2xl p-4 max-h-48 overflow-y-auto border border-gray-100 space-y-2">
              {buddies.map((b) => (
                <div key={b.uid} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold shadow-md">
                      {b.username?.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-gray-700 text-sm">{b.username}</span>
                  </div>
                  {b.uid === room.createdBy && <span className="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-1 rounded-md font-extrabold uppercase tracking-wide">Host</span>}
                </div>
              ))}
              {buddies.length === 0 && <p className="text-gray-400 text-center text-sm italic">You are the first one here!</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {isHost ? (
              <button 
                onClick={startSession} 
                disabled={buddies.length === 0} 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-blue-500/30 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FaPlay size={16} /> Start Session
              </button>
            ) : (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl px-6 py-4 text-center text-blue-700 font-medium animate-pulse">
                Waiting for host to start...
              </div>
            )}
            
            <button 
              onClick={leaveSession} 
              className="w-full bg-white border border-red-100 text-red-500 py-4 rounded-2xl font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
            >
              <FaSignOutAlt /> {isHost ? "End Room" : "Leave Room"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: ACTIVE SESSION (Dark Video Mode + Sleek Controls) ---
  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden relative font-sans">
      <div className="flex-1 flex flex-col relative">
        
        {/* Header (Clean Dark) */}
        <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-start pointer-events-none">
          <div className="pointer-events-auto bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-3">
             <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
             <h3 className="font-bold text-sm tracking-wide">{room.name}</h3>
          </div>
          
          <div className="pointer-events-auto">
            <ControlButton 
              onClick={leaveSession} 
              icon={isHost ? <FaPowerOff /> : <FaSignOutAlt />} 
              label={isHost ? "End Room" : "Leave Room"}
              variant="danger"
            />
          </div>
        </div>

        {/* Timer Overlay */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <div className="bg-black/50 backdrop-blur-xl border border-white/20 p-1.5 rounded-2xl flex items-center shadow-2xl">
            <div className="px-5 py-1 text-center border-r border-white/10">
              <p className={`text-[10px] uppercase font-black tracking-widest ${timerData.mode === 'work' ? 'text-blue-400' : 'text-green-400'}`}>
                {timerData.mode === 'work' ? 'Focus' : 'Break'}
              </p>
              <h2 className="text-2xl font-mono font-bold leading-none tabular-nums text-white">
                {Math.floor(timerData.timeLeft / 60)}:{String(timerData.timeLeft % 60).padStart(2, "0")}
              </h2>
            </div>
            {isHost && (
              <div className="flex gap-2 px-2">
                <button onClick={() => updateDoc(roomRef, { "timer.isRunning": !timerData.isRunning })} className="p-2 hover:bg-white/10 rounded-xl text-blue-400 transition">
                  {timerData.isRunning ? <FaPause size={12}/> : <FaPlay size={12}/>}
                </button>
                <button onClick={() => updateDoc(roomRef, { "timer.timeLeft": timerData.mode === 'work' ? 1500 : 300, "timer.isRunning": false })} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 transition">
                  <FaUndo size={12}/>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-6 flex items-center justify-center overflow-auto pt-24 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl w-full">
            {/* My Video */}
            <div className="relative bg-gray-900 rounded-3xl overflow-hidden shadow-2xl aspect-video border border-white/5 ring-1 ring-white/5 group">
              <video ref={myVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-105" />
              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10">
                {user.username} (You)
              </div>
              {!videoOn && (
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-500/20">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
            </div>
            {/* Remote Videos */}
            {buddies.filter(b => b.uid !== user.uid).map((buddy) => (
              <RemoteVideo key={buddy.uid} buddy={buddy} stream={remoteStreams[buddy.uid]} />
            ))}
          </div>
        </div>

        {/* Bottom Control Dock */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 p-2.5 bg-black/60 backdrop-blur-2xl rounded-3xl border border-white/10 flex gap-4 shadow-2xl">
          <ControlButton 
            onClick={toggleMic} 
            active={micOn} 
            variant="toggle"
            icon={micOn ? <FaMicrophone /> : <FaMicrophoneSlash />} 
            label={micOn ? "Mute" : "Unmute"}
          />
          <ControlButton 
            onClick={toggleVideo} 
            active={videoOn} 
            variant="toggle"
            icon={videoOn ? <FaVideo /> : <FaVideoSlash />} 
            label={videoOn ? "Stop Video" : "Start Video"}
          />
          <div className="w-px bg-white/10 mx-1"></div>
          <ControlButton 
            onClick={() => setShowChat(!showChat)} 
            active={showChat}
            variant={showChat ? "primary" : "default"}
            icon={<FaCommentDots />} 
            label={showChat ? "Close Chat" : "Open Chat"}
          />
        </div>
      </div>

      {/* Chat Sidebar (Matches RoomMessages style - White/Clean) */}
      {showChat && (
        <div className="w-96 bg-white flex flex-col shadow-2xl border-l border-gray-200 relative z-40 animate-slideLeft">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
            <h3 className="font-bold text-gray-800 text-lg">Group Chat</h3>
            <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-800 transition p-2 hover:bg-gray-100 rounded-full">
              <FaTimes />
            </button>
          </div>

          {spamWarnings > 0 && (
            <div className={`mx-4 mt-4 px-4 py-3 rounded-xl border flex items-center gap-3 transition-all animate-pulse ${spamWarnings === 1 ? 'bg-yellow-50 border-yellow-200 text-yellow-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
              <FaExclamationTriangle className="flex-shrink-0" />
              <div className="text-xs font-bold uppercase tracking-wider">Warning: {spamWarnings} / 3</div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <FaCommentDots size={40} className="mb-2 opacity-20" />
                <p className="text-sm">No messages yet</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.senderId === user.uid ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] shadow-sm ${msg.senderId === user.uid ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none'}`}>
                  <div className={`text-[10px] font-bold mb-1 uppercase tracking-wide opacity-80 ${msg.senderId === user.uid ? 'text-blue-100' : 'text-gray-400'}`}>
                    {msg.username}
                  </div>
                  <div className="text-sm leading-relaxed">{msg.text}</div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 bg-white flex gap-2">
            <input 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)} 
              placeholder="Type a message..." 
              className="flex-1 px-5 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm text-gray-800"
            />
            <button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3.5 rounded-full hover:shadow-lg hover:shadow-blue-500/30 transition-transform transform active:scale-95">
              <FaPaperPlane />
            </button>
          </form>
        </div>
      )}

      <style>
        {`
          .animate-slideUp { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
          @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
          
          .animate-slideLeft { animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
          @keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
          
          .animate-float { animation: float 10s ease-in-out infinite; }
          .animate-float-slow { animation: float 15s ease-in-out infinite; }
          @keyframes float { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, -20px); } }
        `}
      </style>
    </div>
  );
}

function RemoteVideo({ buddy, stream }) {
  const videoRef = useRef();
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.onloadedmetadata = () => { video.play().catch(e => console.error("Auto-play failed:", e)); };
    }
  }, [stream]);

  return (
    <div className="relative bg-gray-900 rounded-3xl overflow-hidden shadow-2xl aspect-video border border-white/5 ring-1 ring-white/5">
      <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${!stream ? 'hidden' : 'block'}`} />
      {!stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
          <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-3xl font-bold mb-3 animate-pulse text-gray-300">
            {buddy.username?.charAt(0).toUpperCase()}
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Connecting...</p>
        </div>
      )}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10">
        {buddy.username}
      </div>
    </div>
  );
}