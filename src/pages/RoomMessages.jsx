// src/pages/RoomMessages.jsx
import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import {
  collection, doc, deleteDoc, getDocs, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, setDoc, where, updateDoc, increment, arrayUnion, getDoc
} from "firebase/firestore";
import { containsSpam } from "../utils/spamDetection";
import { 
  FaArrowLeft, FaEye, FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash,
  FaBroadcastTower, FaStopCircle, FaPowerOff, FaPaperPlane,
  FaStopwatch, FaCoffee, FaCheck, FaThumbsUp, FaHeart, FaBolt, 
  FaExclamationTriangle, FaPaperclip, FaLink, FaExternalLinkAlt, 
  FaTimes, FaPlus, FaCloudUploadAlt, FaFilePdf, FaImage, FaDownload, 
  FaDesktop, FaTrash, FaCheckCircle, FaClock, FaInfoCircle, FaMedal, FaStar
} from "react-icons/fa";
const Peer = window.SimplePeer;
import { useAuthState } from "react-firebase-hooks/auth";

const dingSound = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
const alertSound = new Audio("https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg");
alertSound.loop = true; 
const successSound = new Audio("https://actions.google.com/sounds/v1/cartoon/magic_chime.ogg"); 

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  const bg = type === "error" ? "bg-red-500" : type === "success" ? "bg-green-500" : "bg-blue-500";
  return (
    <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-[300] ${bg} text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-slideDown border border-white/10`}>
      {type === "error" ? <FaExclamationTriangle /> : (type === "success" ? <FaCheckCircle /> : <FaInfoCircle />)}
      <span className="text-sm font-semibold tracking-wide">{message}</span>
      <button onClick={onClose} className="ml-2 hover:text-white/80"><FaTimes /></button>
    </div>
  );
};

const ConfirmModal = ({ title, message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center border border-gray-200">
      <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-xl"><FaExclamationTriangle /></div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm mb-6">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition text-sm">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition text-sm">Confirm</button>
      </div>
    </div>
  </div>
);

const SessionReportModal = ({ stats, onClose }) => {
  useEffect(() => { successSound.play().catch(() => {}); }, []);
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-md text-center border-4 border-blue-500 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        <div className="mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl text-blue-600 shadow-inner"><FaMedal /></div>
          <h2 className="text-3xl font-black text-gray-800 mb-1">Session Complete!</h2>
          <p className="text-gray-500 font-medium text-sm">Here is how you performed</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-bold">Focus Time</p>
            <p className="text-2xl font-bold text-gray-800">{stats.minutes} <span className="text-sm font-normal">min</span></p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-bold">Total Score</p>
            <p className="text-2xl font-bold text-blue-600">{stats.score} <span className="text-sm font-normal">pts</span></p>
          </div>
        </div>
        <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-[10px] text-gray-500 mb-6 text-left space-y-1">
            <p className="font-bold text-blue-800 mb-1">Scoring Breakdown:</p>
            <p className="flex justify-between"><span>• Time Focused (+10/min):</span> <span>+{stats.minutes * 10}</span></p>
            <p className="flex justify-between"><span>• Uploads (+50/ea):</span> <span>+{stats.uploads * 50}</span></p>
            <p className="flex justify-between text-red-500"><span>• Distractions (-20/ea):</span> <span>-{stats.distractions * 20}</span></p>
        </div>
        {stats.badges.length > 0 ? (
          <div className="mb-6">
            <p className="text-xs text-gray-400 uppercase font-bold mb-2">Badges Earned</p>
            <div className="flex justify-center gap-2 flex-wrap">
              {stats.badges.map((badge, index) => (
                <span key={index} className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full border border-yellow-200 flex items-center gap-1 shadow-sm"><FaStar /> {badge}</span>
              ))}
            </div>
          </div>
        ) : (
            <p className="text-xs text-gray-400 mb-6 italic">No badges this time. Stay focused >10m for Zen Master!</p>
        )}
        <button onClick={onClose} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3.5 rounded-xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] transition-all">Continue</button>
      </div>
    </div>
  );
};

const TimerSetupModal = ({ onClose, onSave, isStreamLive }) => {
  const [w, setW] = useState(25);
  const [b, setB] = useState(5);
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-white/20 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"><FaCheck /></button>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 text-3xl"><FaStopwatch /></div>
          <h2 className="text-2xl font-bold text-gray-800">Set Pomodoro</h2>
          <p className="text-gray-500 text-sm mt-1">{isStreamLive ? "Timer starts immediately." : "Timer starts when you Go Live."}</p>
        </div>
        <div className="space-y-4">
          <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Focus (Minutes)</label><input type="number" value={w} onChange={e => setW(Number(e.target.value))} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg" /></div>
          <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Break (Minutes)</label><input type="number" value={b} onChange={e => setB(Number(e.target.value))} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-mono text-lg" /></div>
          <button onClick={() => onSave(w, b)} className={`w-full text-white py-3 rounded-xl font-bold hover:shadow-lg transition-transform active:scale-95 ${isStreamLive ? "bg-gradient-to-r from-blue-600 to-purple-600" : "bg-gray-800"}`}>{isStreamLive ? "Start Timer Now" : "Save Configuration"}</button>
        </div>
      </div>
    </div>
  );
};

const ControlButton = ({ onClick, icon, label, variant = "default", disabled = false, active = false }) => {
  const variants = {
    default: "bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10",
    danger: "bg-red-500/80 hover:bg-red-500 text-white backdrop-blur-md shadow-red-500/20",
    success: "bg-green-500/80 hover:bg-green-500 text-white backdrop-blur-md shadow-green-500/20",
    warning: "bg-yellow-500/80 hover:bg-yellow-500 text-white backdrop-blur-md",
    primary: "bg-blue-600/80 hover:bg-blue-500 text-white backdrop-blur-md shadow-blue-500/20",
    active: "bg-white text-blue-900 shadow-white/50",
    locked: "bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700" 
  };
  return (
    <div className="relative group">
      <button onClick={onClick} disabled={disabled} className={`p-4 rounded-2xl shadow-lg transition-all transform hover:scale-105 active:scale-95 ${disabled ? variants.locked : (active ? variants.active : variants[variant])}`}><div className="text-xl">{icon}</div></button>
      {!disabled && (<span className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-white text-gray-900 text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl z-50">{label}<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45"></div></span>)}
    </div>
  );
};

export default function RoomMessages({ room, onBack }) {
  const [user] = useAuthState(auth);
  if (!user || !room) return <div className="h-screen flex items-center justify-center text-white bg-gray-900">Loading...</div>;

  const isDummy = room?.isDummy;
  const isHost = !isDummy && (room?.createdBy === user?.uid || room?.isHost);

  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [viewers, setViewers] = useState(room?.viewers || Math.floor(Math.random() * 150 + 30));
  const [reactions, setReactions] = useState([]);
  
  const [streamLive, setStreamLive] = useState(isDummy ? true : false);
  
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showFiles, setShowFiles] = useState(false);
  
  const [resources, setResources] = useState([]);
  const [newResourceLink, setNewResourceLink] = useState("");
  const [newResourceName, setNewResourceName] = useState("");
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeResource, setActiveResource] = useState(null); 
  const fileInputRef = useRef(null);

  const [timerData, setTimerData] = useState({ 
    timeLeft: 1500, isRunning: false, mode: 'work', config: { work: 25, break: 5 }, isConfigured: false, autoStart: false
  });
  const [showTimerModal, setShowTimerModal] = useState(false);

  const [distractionCount, setDistractionCount] = useState(0);
  const [showDistractionAlert, setShowDistractionAlert] = useState(false);
  const [sessionReport, setSessionReport] = useState(null); 
  const [isExiting, setIsExiting] = useState(false);

  const [toast, setToast] = useState(null); 
  const [confirmDialog, setConfirmDialog] = useState(null); 

  const [remoteStreams, setRemoteStreams] = useState({});
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const chatEndRef = useRef(null);
  const peersRef = useRef({});
  const signalingUnsubscribeRef = useRef(null);
  const sessionStartTime = useRef(Date.now()); 
  const uploadsCount = useRef(0); 
  
  const viewerIdRef = useRef(user ? `${user.uid}_${Date.now()}` : null);
  const roomRef = doc(db, "studyRooms", room.id);

  const triggerToast = (msg, type="info") => setToast({ message: msg, type });
  const triggerConfirm = (title, message, action) => {
    setConfirmDialog({ title, message, onConfirm: () => { action(); setConfirmDialog(null); }, onCancel: () => setConfirmDialog(null) });
  };

  const generateSessionReport = async () => {
    const endTime = Date.now();
    const durationMinutes = Math.max(1, Math.floor((endTime - sessionStartTime.current) / 1000 / 60));
    
    let score = (durationMinutes * 10) + (uploadsCount.current * 50) - (distractionCount * 20);
    if (score < 0) score = 0;

    const badges = [];
    if (distractionCount === 0 && durationMinutes > 10) badges.push("Zen Master");
    if (uploadsCount.current > 0) badges.push("Scholar");
    if (durationMinutes > 30) badges.push("Iron Will");

    try {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          totalFocusTime: increment(durationMinutes),
          totalScore: increment(score),
          badges: badges.length > 0 ? arrayUnion(...badges) : userDoc.data().badges || []
        });
      } else {
        await setDoc(userRef, { totalFocusTime: durationMinutes, totalScore: score, badges: badges }, { merge: true });
      }
    } catch (e) { console.error("Score Error:", e); }

    setSessionReport({ minutes: durationMinutes, score, badges, distractions: distractionCount, uploads: uploadsCount.current });
  };

  const handleExit = async () => {
      setIsExiting(true);
      if (isHost) {
          if (streamLive) {
              await handleStopStream(false);
              onBack();
          } else {
              onBack();
          }
      } else {
          await generateSessionReport();
      }
  };

  const handleEndRoom = () => {
    if (isHost) {
      triggerConfirm("End Room?", "This will delete the room for everyone.", async () => {
        if (streamLive) await handleStopStream(false); 
        await deleteDoc(doc(db, "studyRooms", room.id));
        onBack();
      });
    }
  };

  useEffect(() => {
    if (timerData.mode !== 'work' || !streamLive) {
      alertSound.pause(); 
      alertSound.currentTime = 0; 
      return;
    }

    const handleVisibilityChange = () => {
      if (!streamLive) return; 

      if (document.hidden) {
        setDistractionCount(prev => prev + 1);
        alertSound.currentTime = 0; 
        alertSound.play().catch(e => console.warn(e));
      } else {
        alertSound.pause(); 
        alertSound.currentTime = 0;
        setShowDistractionAlert(true); 
        setTimeout(() => setShowDistractionAlert(false), 3000); 
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      alertSound.pause(); 
      alertSound.currentTime = 0;
    };
  }, [timerData.mode, streamLive]); 

  useEffect(() => {
    if (!room?.id) return;
    const roomUnsub = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.timer) setTimerData(data.timer);
        if (data.activeResource) setActiveResource(data.activeResource); else setActiveResource(null);
        if (!isHost && data.isLive !== undefined) setStreamLive(data.isLive);
      } else if (!isDummy) {
        triggerToast("Room ended by host", "info");
        setTimeout(onBack, 2000);
      }
    });
    const q = query(collection(db, "room_resources"), where("roomId", "==", room.id), orderBy("createdAt", "desc"));
    const filesUnsub = onSnapshot(q, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { roomUnsub(); filesUnsub(); };
  }, [room.id, isHost, isDummy]);

  useEffect(() => {
    if (isHost && !activeResource && localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [activeResource, isHost]);

  const handlePresentResource = async (resource) => { if (isHost) await updateDoc(roomRef, { activeResource: resource }); };
  const handleStopPresentation = async () => { if (isHost) await updateDoc(roomRef, { activeResource: null }); };

  const handleApproveResource = async (resourceId) => {
    if (!isHost) return;
    try { await updateDoc(doc(db, "room_resources", resourceId), { approved: true }); triggerToast("Approved!", "success"); } 
    catch (err) { triggerToast("Permission Error", "error"); }
  };

  const handleDeleteResource = (resourceId) => {
    triggerConfirm("Delete Resource?", "This cannot be undone.", async () => {
      try {
        await deleteDoc(doc(db, "room_resources", resourceId));
        if (activeResource && activeResource.id === resourceId) handleStopPresentation();
        triggerToast("Deleted", "success");
      } catch (err) { triggerToast("Error deleting", "error"); }
    });
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    if (!newResourceLink.trim() || !newResourceName.trim()) return;
    try {
      const isApproved = isHost ? true : false;
      await addDoc(collection(db, "room_resources"), {
        roomId: room.id, name: newResourceName.trim(), url: newResourceLink.trim(), type: "link", addedBy: user.email.split("@")[0], createdAt: serverTimestamp(), approved: isApproved
      });
      uploadsCount.current += 1;
      if (isHost) { triggerToast("Link added!", "success"); } 
      else triggerToast("Sent for approval", "info");
      setNewResourceLink(""); setNewResourceName(""); setIsAddingResource(false);
    } catch (err) { triggerToast("Error adding link", "error"); }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { triggerToast("File too large (>500KB)", "error"); return; }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const isApproved = isHost ? true : false;
        await addDoc(collection(db, "room_resources"), {
          roomId: room.id, name: file.name, data: reader.result, type: file.type, size: file.size, addedBy: user.email.split("@")[0], createdAt: serverTimestamp(), approved: isApproved
        });
        uploadsCount.current += 1;
        if (isHost) { triggerToast("Uploaded!", "success"); }
        else triggerToast("Sent for approval", "info");
      } catch (err) { triggerToast("Upload failed", "error"); } finally { setIsUploading(false); }
    };
    reader.readAsDataURL(file);
  };
  const triggerFileInput = () => { if (fileInputRef.current) fileInputRef.current.click(); };

  useEffect(() => {
    let interval = null;
    if (isHost && timerData?.isRunning && timerData?.timeLeft > 0) {
      interval = setInterval(async () => { await updateDoc(roomRef, { "timer.timeLeft": timerData.timeLeft - 1 }); }, 1000);
    } else if (isHost && timerData?.isRunning && timerData?.timeLeft === 0) { handleTimerComplete(); }
    return () => clearInterval(interval);
  }, [isHost, timerData?.isRunning, timerData?.timeLeft]);

  const handleTimerComplete = async () => {
    if (timerData.mode === 'work') {
      if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.enabled = false); setCamOn(false); setMicOn(false); }
      await updateDoc(roomRef, { timer: { ...timerData, timeLeft: timerData.config.break * 60, isRunning: true, mode: 'break' }, isLive: true });
    } else {
      if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.enabled = true); setCamOn(true); setMicOn(true); }
      await updateDoc(roomRef, { timer: { timeLeft: 1500, isRunning: false, mode: 'work', isConfigured: false, config: timerData.config } });
    }
  };

  const handleSaveTimerConfig = async (workMin, breakMin) => {
    const shouldRun = streamLive; 
    await updateDoc(roomRef, { timer: { timeLeft: workMin * 60, isRunning: shouldRun, mode: 'work', config: { work: workMin, break: breakMin }, isConfigured: shouldRun, autoStart: !shouldRun } });
    setShowTimerModal(false);
  };

  useEffect(() => {
    if (!room?.id) return;
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.filter(d => d.data().roomId === room.id).map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [room?.id]);

  useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages, showChat]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    if (containsSpam(newMsg)) { triggerToast("Spam detected.", "error"); setNewMsg(""); return; }
    await addDoc(collection(db, "messages"), { roomId: room.id, sender: user.email, text: newMsg.trim(), createdAt: serverTimestamp() });
    setNewMsg("");
  };

  const handleStartStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setStreamLive(true); setCamOn(true); setMicOn(true);
      sessionStartTime.current = Date.now(); 
      await updateDoc(roomRef, { isLive: true });
      if (timerData.autoStart) { await updateDoc(roomRef, { "timer.isRunning": true, "timer.isConfigured": true, "timer.autoStart": false }); } 
      else if (!timerData.isConfigured) { await updateDoc(roomRef, { "timer.isConfigured": false }); }
      
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
    } catch (err) { triggerToast(`Camera Error: ${err.message}`, "error"); }
  };

  const handleStopStream = async (showReport = true) => {
     setStreamLive(false); setCamOn(false); setMicOn(false);
     Object.values(peersRef.current).forEach(p => p.destroy());
     peersRef.current = {};
     if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
     if (signalingUnsubscribeRef.current) signalingUnsubscribeRef.current();
     await updateDoc(roomRef, { isLive: false, liveThumbnail: null, activeResource: null, "timer.isRunning": false, "timer.isConfigured": false, "timer.timeLeft": 1500, "timer.mode": 'work' });
     
     if (showReport) {
        await generateSessionReport();
     }
  };

  useEffect(() => {
    if (isHost || isDummy || !user?.uid || !room?.id) return;
    const viewerId = viewerIdRef.current;
    const signalDocRef = doc(db, "studyRooms", room.id, "signals", viewerId);
    const joinRoom = async () => {
      try {
        await setDoc(signalDocRef, { type: "viewer", roomId: room.id, viewerId, userId: user.uid, hostId: room.createdBy, timestamp: Date.now() });
        const unsubscribe = onSnapshot(signalDocRef, docSnap => {
          const data = docSnap.data();
          if (!data?.hostSignal || peersRef.current[viewerId]) return;
          const peer = new Peer({ initiator: false, trickle: false });
          peer.on("signal", async signal => { await setDoc(signalDocRef, { viewerSignal: signal }, { merge: true }); });
          peer.on("stream", remoteStream => { setRemoteStreams(prev => ({ ...prev, [viewerId]: remoteStream })); });
          peer.signal(data.hostSignal);
          peersRef.current[viewerId] = peer;
        });
      } catch (err) {}
    };
    joinRoom();
  }, [isHost, isDummy, room?.id, room?.createdBy, user?.uid]);

  const toggleCamera = () => { if (!localStreamRef.current) return; const track = localStreamRef.current.getVideoTracks()[0]; if (track) { track.enabled = !track.enabled; setCamOn(track.enabled); } };
  const toggleMicrophone = () => { if (!localStreamRef.current) return; const track = localStreamRef.current.getAudioTracks()[0]; if (track) { track.enabled = !track.enabled; setMicOn(track.enabled); } };

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
    } else if (isHost && !streamLive) { updateDoc(roomRef, { liveThumbnail: null, isLive: false }).catch(()=>{}); }
    return () => clearInterval(interval);
  }, [isHost, streamLive, timerData.mode]);

  useEffect(() => {
    if (!room?.id) return;
    const reactionsQuery = query(collection(db, "reactions"), where("roomId", "==", room.id), orderBy("timestamp", "desc"));
    return onSnapshot(reactionsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const reactionData = change.doc.data();
          setReactions(prev => [...prev, { id: change.doc.id, emoji: reactionData.emoji }]);
          setTimeout(() => setReactions(prev => prev.filter(r => r.id !== change.doc.id)), 2000);
        }
      });
    });
  }, [room?.id]);

  const sendReaction = async (emoji) => { try { await addDoc(collection(db, "reactions"), { roomId: room.id, emoji, timestamp: serverTimestamp(), senderId: user?.uid || "guest" }); } catch (err) {} };

  const BreakOverlay = () => {
    if (timerData.mode !== 'break') return null;
    return (
      <div className="absolute inset-0 z-40 bg-gradient-to-br from-green-400 via-teal-500 to-blue-500 flex flex-col items-center justify-center text-white animate-fadeIn">
        <div className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6 animate-bounce shadow-2xl"><FaCoffee className="text-6xl text-white" /></div>
        <h2 className="text-5xl font-extrabold mb-4 drop-shadow-md">Take a Break</h2>
        <div className="text-8xl font-mono font-black tracking-tighter tabular-nums drop-shadow-lg">{Math.floor(timerData.timeLeft / 60)}:{String(timerData.timeLeft % 60).padStart(2, "0")}</div>
      </div>
    );
  };

  const DistractionAlert = () => {
    if (!showDistractionAlert) return null;
    return (
      <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
         <div className="bg-red-500/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-400">
           <FaExclamationTriangle className="text-2xl" />
           <div><h3 className="font-bold uppercase tracking-wider text-xs">Distraction Detected</h3><p className="font-mono text-lg leading-none">Tab Switched: {distractionCount}x</p></div>
         </div>
      </div>
    );
  }

  const toggleSidePanel = (panel) => { 
      if (panel === "chat") { 
          setShowChat(!showChat); 
          setShowFiles(false); 
      } else { 
          setShowFiles(!showFiles); 
          setShowChat(false); 
      } 
  };

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden font-sans">
      <div className="flex-1 relative bg-black">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        {confirmDialog && <ConfirmModal title={confirmDialog.title} message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={confirmDialog.onCancel} />}
        
        {sessionReport && <SessionReportModal stats={sessionReport} onClose={() => { setSessionReport(null); if(isExiting) onBack(); }} />}
        
        {activeResource ? (
          <div className="w-full h-full flex flex-col bg-gray-900">
            <div className="h-12 bg-black/50 backdrop-blur flex items-center justify-between px-6 text-white border-b border-white/10 relative z-30">
              <span className="font-bold flex items-center gap-2"><FaDesktop className="text-blue-400"/> Presenting: {activeResource.name}</span>
              {isHost && <button onClick={handleStopPresentation} className="bg-red-600 px-3 py-1 text-xs font-bold rounded-lg hover:bg-red-500">Stop Presenting</button>}
            </div>
            <div className="flex-1 p-4 flex items-center justify-center relative">
              {activeResource.type?.includes("image") ? <img src={activeResource.data} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" alt="Presentation" /> : activeResource.type === "link" ? <div className="text-center"><p className="text-gray-400 mb-4">Sharing external link...</p><a href={activeResource.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-2xl font-bold">{activeResource.url}</a></div> : <iframe src={activeResource.data} className="w-full h-full bg-white rounded-lg" title="PDF Presentation" />}
            </div>
          </div>
        ) : (
          <>
            {isDummy ? (
                // ADDED POSTER HERE AS WELL
                <video src={room.previewURL} poster={room.fallbackImage || null} autoPlay muted loop playsInline className="w-full h-full object-cover" />
            ) : isHost ? ( 
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" /> 
            ) : ( 
                <> 
                    {Object.entries(remoteStreams).map(([id, stream]) => <video key={id} ref={el => { if (el && el.srcObject !== stream) { el.srcObject = stream; el.play().catch(() => {}); } }} autoPlay playsInline className="w-full h-full object-cover" />)} 
                    {Object.keys(remoteStreams).length === 0 && timerData.mode !== 'break' && <div className="w-full h-full flex items-center justify-center"><p className="text-gray-500">Waiting for host...</p></div>} 
                </> 
            )}
          </>
        )}

        <BreakOverlay />
        <DistractionAlert />
        
        {streamLive && timerData.mode === 'work' && (
            <div className="absolute top-20 left-6 z-20 flex gap-2">
                <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-green-500/30 text-green-400 text-xs font-bold flex items-center gap-2 shadow-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Focus Mode On
                </div>
                {distractionCount > 0 && (
                     <div className="bg-red-500/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1 shadow-lg">
                         <FaExclamationTriangle size={10} /> {distractionCount} Distractions
                     </div>
                )}
            </div>
        )}

        {isHost && showTimerModal && <TimerSetupModal onClose={() => setShowTimerModal(false)} onSave={handleSaveTimerConfig} isStreamLive={streamLive} />}

        {timerData.isConfigured && timerData.mode === 'work' && (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 bg-black/40 backdrop-blur-xl border border-white/20 px-6 py-2 rounded-2xl flex items-center gap-3 shadow-xl animate-slideDown">
            <FaBolt className="text-yellow-400 animate-pulse" />
            <span className="text-2xl font-mono font-bold text-white tabular-nums">{Math.floor(timerData.timeLeft / 60)}:{String(timerData.timeLeft % 60).padStart(2, "0")}</span>
          </div>
        )}

        <button onClick={handleExit} className="absolute top-5 left-5 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 z-20 flex items-center gap-2 text-white hover:bg-white/10 transition"><FaArrowLeft /> Exit</button>
        <div className="absolute top-5 right-5 z-20 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full z-20 flex items-center gap-2 border border-white/10 text-white"><FaEye className="text-blue-400"/> {viewers}</div>
        
        {reactions.map(r => <div key={r.id} className="absolute bottom-32 left-1/2 transform -translate-x-1/2 text-4xl animate-float z-30">{r.emoji}</div>)}

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 p-3 bg-black/50 backdrop-blur-2xl rounded-3xl border border-white/10 flex gap-4 pointer-events-auto shadow-2xl animate-slideUp">
            {!isHost && (
              <>
                <ControlButton onClick={() => sendReaction("👍")} icon={<FaThumbsUp className="text-blue-400"/>} label="Like" />
                <ControlButton onClick={() => sendReaction("❤️")} icon={<FaHeart className="text-red-500"/>} label="Love" />
                <div className="w-px bg-white/20 mx-1"></div>
              </>
            )}
            {isHost && (
              <>
                <ControlButton onClick={() => !timerData.isConfigured && setShowTimerModal(true)} disabled={timerData.isConfigured || timerData.mode === 'break'} icon={<FaStopwatch />} label={timerData.isConfigured ? "Timer Active" : "Pomodoro"} variant={timerData.isConfigured ? "success" : "primary"} />
                <div className="w-px bg-white/20 mx-1"></div>
                <ControlButton onClick={toggleCamera} disabled={!streamLive || timerData.mode === 'break'} icon={camOn ? <FaVideo /> : <FaVideoSlash />} label={camOn ? "Cam Off" : "Cam On"} variant={camOn ? "default" : "danger"} />
                <ControlButton onClick={toggleMicrophone} disabled={!streamLive || timerData.mode === 'break'} icon={micOn ? <FaMicrophone /> : <FaMicrophoneSlash />} label={micOn ? "Mute" : "Unmute"} variant={micOn ? "default" : "danger"} />
                {!streamLive ? (
                  <ControlButton onClick={handleStartStream} disabled={timerData.mode === 'break'} icon={<FaBroadcastTower />} label="Go Live" variant="success" />
                ) : (
                  <ControlButton onClick={() => handleStopStream(true)} disabled={timerData.mode === 'break'} icon={<FaStopCircle />} label="Stop Live" variant="warning" />
                )}
                <div className="w-px bg-white/20 mx-1"></div>
              </>
            )}
            <ControlButton onClick={() => toggleSidePanel("files")} active={showFiles} icon={<FaPaperclip />} label="Resources" variant="default" />
            <ControlButton onClick={() => toggleSidePanel("chat")} active={showChat} icon={<FaPaperPlane />} label="Chat" variant="default" />
            {isHost && <ControlButton onClick={handleEndRoom} icon={<FaPowerOff />} label="End Room" variant="danger" />}
        </div>
      </div>

      {(showChat || showFiles) && (
        <div className="w-96 bg-white flex flex-col shadow-2xl border-l border-gray-100 relative z-20">
            {showChat && (
            <>
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
            </>
            )}

            {showFiles && (
            <>
                <div className="p-5 border-b border-gray-100 bg-white flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaPaperclip /> Resources</h3>
                <button onClick={() => { setShowFiles(false); setShowChat(true); }} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
                </div>
                <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-gray-50/50">
                {isHost && resources.filter(r => !r.approved).length > 0 && (
                    <div className="mb-6 animate-fadeIn">
                    <h4 className="text-xs font-extrabold text-orange-600 uppercase tracking-widest mb-3 flex items-center gap-2"><FaClock /> Pending Approval</h4>
                    {resources.filter(r => !r.approved).map(res => (
                        <div key={res.id} className="bg-orange-50/50 p-4 rounded-xl border border-orange-200 mb-3">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-bold text-gray-800 truncate w-32">{res.name}</span>
                            <div className="flex gap-2">
                            <button onClick={() => handleApproveResource(res.id)} className="bg-green-100 text-green-600 p-2 rounded-lg hover:bg-green-200 transition"><FaCheckCircle size={14} /></button>
                            <button onClick={() => handleDeleteResource(res.id)} className="bg-red-100 text-red-500 p-2 rounded-lg hover:bg-red-200 transition"><FaTrash size={12} /></button>
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-500">From: {res.addedBy}</p>
                        </div>
                    ))}
                    <div className="h-px bg-gray-200 my-4"></div>
                    </div>
                )}

                {resources.filter(r => r.approved).length === 0 && !isAddingResource && <div className="text-center text-gray-400 mt-10">No resources yet.</div>}

                {resources.filter(r => r.approved).map(res => (
                    <div key={res.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 group hover:shadow-md transition-all mb-3">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">{res.type === 'link' ? <FaLink /> : (res.type && res.type.includes('image') ? <FaImage /> : <FaFilePdf />)}</div>
                        <div className="truncate"><p className="text-sm font-bold text-gray-800 truncate w-32" title={res.name}>{res.name}</p><p className="text-[10px] text-gray-400">By {res.addedBy}</p></div>
                        </div>
                        <div className="flex gap-1">
                        {isHost && (
                            <>
                            <button onClick={() => handlePresentResource(res)} className="text-gray-400 hover:text-blue-600 p-2"><FaEye /></button>
                            <button onClick={() => handleDeleteResource(res.id)} className="text-gray-400 hover:text-red-500 p-2"><FaTrash size={12}/></button>
                            </>
                        )}
                        {!isHost && (res.type === 'link' ? <a href={res.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600 p-2"><FaExternalLinkAlt /></a> : <a href={res.data} download={res.name} className="text-gray-400 hover:text-blue-600 p-2"><FaDownload /></a>)}
                        </div>
                    </div>
                    {res.type && res.type.includes('image') && <img src={res.data} alt="preview" className="w-full h-32 object-cover rounded-lg border border-gray-100 mt-2 cursor-pointer hover:opacity-90" onClick={() => isHost && handlePresentResource(res)} />}
                    </div>
                ))}

                {isAddingResource && (
                    <form onSubmit={handleAddResource} className="bg-white p-4 rounded-xl shadow-lg border border-blue-100 mb-4 animate-slideUp">
                    <h5 className="text-xs font-bold text-gray-500 uppercase mb-3">Add New Link</h5>
                    <input value={newResourceName} onChange={e => setNewResourceName(e.target.value)} placeholder="Title" className="w-full mb-3 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" autoFocus />
                    <input value={newResourceLink} onChange={e => setNewResourceLink(e.target.value)} placeholder="Paste URL" className="w-full mb-4 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                    <div className="flex gap-2"><button type="button" onClick={() => setIsAddingResource(false)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg text-xs font-bold">Cancel</button><button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold">Add</button></div>
                    </form>
                )}
                </div>
                <div className="p-4 border-t border-gray-100 bg-white grid grid-cols-2 gap-3">
                <button onClick={() => setIsAddingResource(true)} className="bg-gray-50 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-100 transition flex items-center justify-center gap-2 text-xs border border-gray-200"><FaPlus /> Add Link</button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf" />
                <button onClick={triggerFileInput} disabled={isUploading} className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3 rounded-xl font-bold hover:shadow-lg transition flex items-center justify-center gap-2 text-xs disabled:opacity-70">{isUploading ? "Uploading..." : <><FaCloudUploadAlt /> Upload File</>}</button>
                </div>
            </>
            )}
        </div>
      )}

      <style>{`
        .animate-fadeIn { animation: fadeIn 0.5s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-slideDown { animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1); } @keyframes slideDown { from { opacity: 0; transform: translateY(-20px) translateX(-50%); } to { opacity: 1; transform: translateY(0) translateX(-50%); } }
        .animate-slideUp { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); } @keyframes slideUp { from { opacity: 0; transform: translateY(40px) translateX(-50%); } to { opacity: 1; transform: translateY(0) translateX(-50%); } }
        @keyframes float { 0% { transform: translate(-50%, 0) scale(1); opacity: 1; } 100% { transform: translate(-50%, -200px) scale(1.5); opacity: 0; } } .animate-float { animation: float 2s forwards; }
      `}</style>
    </div>
  );
}