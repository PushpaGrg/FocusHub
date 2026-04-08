// src/pages/RoomMessages.jsx
import { useState, useEffect, useRef } from "react";
import { db, auth, storage } from "../firebase";
import { 
  collection, doc, deleteDoc, getDocs, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, setDoc, where, updateDoc, increment, arrayUnion, getDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { containsSpam } from "../utils/spamDetection";
import { 
  FaArrowLeft, FaEye, FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash,
  FaBroadcastTower, FaStopCircle, FaPowerOff, FaPaperPlane,
  FaStopwatch, FaCoffee, FaCheck, FaThumbsUp, FaHeart, FaBolt, 
  FaExclamationTriangle, FaPaperclip, FaLink, FaExternalLinkAlt, 
  FaTimes, FaPlus, FaCloudUploadAlt, FaFilePdf, FaImage, FaDownload, 
  FaDesktop, FaTrash, FaCheckCircle, FaClock, FaInfoCircle, FaMedal, FaStar,
  FaTasks, FaBrain, FaPlay, FaCheckCircle as FaCheckIcon, FaTimesCircle, FaFlag, FaCrown, FaCircle
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
            <p className="flex justify-between"><span>• Time Focused:</span> <span>+{stats.minutes >= 0.5 ? Math.floor(stats.minutes * 10) : 0}</span></p>
            <p className="flex justify-between"><span>• Uploads (+50/ea):</span> <span>+{stats.uploads * 50}</span></p>
            <p className="flex justify-between text-green-600 font-bold"><span>• Quiz Points:</span> <span>+{stats.quizPoints}</span></p>
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
            <p className="text-xs text-gray-400 mb-6 italic">No badges this time. Keep practicing to earn more!</p>
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
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  
  if (!user || !room) return <div className="h-screen flex items-center justify-center text-white bg-gray-900">Loading...</div>;

  const isDummy = room?.isDummy;
  const isHost = !isDummy && (room?.createdBy === user?.uid || room?.isHost);

  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [viewers, setViewers] = useState(0);
  const [reactions, setReactions] = useState([]);
  
  const [streamLive, setStreamLive] = useState(isDummy ? true : false);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  
  const [showChat, setShowChat] = useState(true);
  const [showFiles, setShowFiles] = useState(false);
  const [showTasks, setShowTasks] = useState(false); 
  
  const [resources, setResources] = useState([]);
  const [newResourceLink, setNewResourceLink] = useState("");
  const [newResourceName, setNewResourceName] = useState("");
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeResource, setActiveResource] = useState(null); 
  const fileInputRef = useRef(null);

  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState("");

  const [timerData, setTimerData] = useState({ 
    timeLeft: 1500, isRunning: false, mode: 'work', config: { work: 25, break: 5 }, isConfigured: false, autoStart: false
  });
  const [showTimerModal, setShowTimerModal] = useState(false);

  const [showQuizPicker, setShowQuizPicker] = useState(false);
  const [hostDecks, setHostDecks] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null); 
  const [quizDeckData, setQuizDeckData] = useState(null); 
  
  const [selectedOption, setSelectedOption] = useState(null);
  const earnedQuizPoints = useRef(0); 
  const lastScoredIndex = useRef(-1); 

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
  
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingStartTimeRef = useRef(null);
  const recordingIntervalRef = useRef(null); 
  
  const viewerIdRef = useRef(user ? `${user.uid}_${Date.now()}` : null);
  const roomRef = doc(db, "studyRooms", room.id);

  const triggerToast = (msg, type="info") => setToast({ message: msg, type });
  const triggerConfirm = (title, message, action) => {
    setConfirmDialog({ title, message, onConfirm: () => { action(); setConfirmDialog(null); }, onCancel: () => setConfirmDialog(null) });
  };

  useEffect(() => {
    if(user?.uid) {
      getDoc(doc(db, "users", user.uid)).then(docSnap => {
        if(docSnap.exists()) setUserProfile(docSnap.data());
      });
    }
  }, [user]);

  // ─── CHANGE 1: Real-time presence-based viewer count ───────────────────────
  useEffect(() => {
    if (!room?.id || !user?.uid) return;

    // Host doesn't write presence — only viewers do
    if (!isHost) {
      const presenceRef = doc(db, "studyRooms", room.id, "presence", viewerIdRef.current);
      const writePresence = async () => {
        try { await setDoc(presenceRef, { uid: user.uid, joinedAt: serverTimestamp() }); } catch (e) {}
      };
      const removePresence = async () => {
        try { await deleteDoc(presenceRef); } catch (e) {}
      };
      writePresence();
      window.addEventListener("beforeunload", removePresence);
      return () => {
        removePresence();
        window.removeEventListener("beforeunload", removePresence);
      };
    }
  }, [room?.id, user?.uid, isHost]);
    // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!room?.id || !isHost) return;
    const presenceCol = collection(db, "studyRooms", room.id, "presence");
    const unsub = onSnapshot(presenceCol, (snapshot) => {
      const count = snapshot.size;
      setViewers(count);
      updateDoc(roomRef, { viewerCount: count }).catch(() => {});
    });
    return () => unsub();
  }, [room?.id, isHost]);

  useEffect(() => {
    if (!room?.id || isHost) return;
    const presenceCol = collection(db, "studyRooms", room.id, "presence");
    const unsub = onSnapshot(presenceCol, (snapshot) => {
      setViewers(snapshot.size);
    });
    return () => unsub();
  }, [room?.id, isHost]);
  
  // ─── CHANGE 2: Live thumbnail broadcast (host only, every 1.5s) ────────────
  useEffect(() => {
    if (!isHost || !streamLive) return;
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");
    const interval = setInterval(async () => {
      const video = localVideoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) return;
      try {
        ctx.drawImage(video, 0, 0, 320, 180);
        const dataURL = canvas.toDataURL("image/jpeg", 0.5);
        await updateDoc(roomRef, { liveThumbnail: dataURL });
      } catch (e) {}
    }, 1500);
    return () => {
      clearInterval(interval);
      updateDoc(roomRef, { liveThumbnail: null }).catch(() => {});
    };
  }, [isHost, streamLive]);
  // ───────────────────────────────────────────────────────────────────────────

  const generateSessionReport = async () => {
    const endTime = Date.now();
    const durationMinutes = Math.floor((endTime - sessionStartTime.current) / 1000 / 60);
    const timePoints = durationMinutes >= 0.5 ? Math.floor(durationMinutes * 10) : 0;
    let score = timePoints + (uploadsCount.current * 50) + earnedQuizPoints.current - (distractionCount * 20);
    if (score < 0) score = 0;
    const badges = [];
    if (distractionCount === 0 && durationMinutes > 10) badges.push("Zen Master");
    if (uploadsCount.current > 0) badges.push("Scholar");
    if (durationMinutes > 30) badges.push("Iron Will");
    if (earnedQuizPoints.current >= 100) badges.push("Quiz Whiz");
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
    setSessionReport({ 
      minutes: durationMinutes, score, badges, 
      distractions: distractionCount, 
      uploads: uploadsCount.current,
      quizPoints: earnedQuizPoints.current 
    });
  };

  const handleExit = async () => {
    setIsExiting(true);
    if (isHost) {
      if (streamLive) { await handleStopStream(false); onBack(); } 
      else { onBack(); }
    } else { await generateSessionReport(); }
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
      alertSound.pause(); alertSound.currentTime = 0; return;
    }
    const handleVisibilityChange = () => {
      if (!streamLive) return; 
      if (document.hidden) {
        setDistractionCount(prev => prev + 1);
        alertSound.currentTime = 0; alertSound.play().catch(e => console.warn(e));
      } else {
        alertSound.pause(); alertSound.currentTime = 0;
        setShowDistractionAlert(true); setTimeout(() => setShowDistractionAlert(false), 3000); 
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => { document.removeEventListener("visibilitychange", handleVisibilityChange); alertSound.pause(); alertSound.currentTime = 0; };
  }, [timerData.mode, streamLive]); 

  useEffect(() => {
    if (!room?.id) return;
    const roomUnsub = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.timer) setTimerData(data.timer);
        if (data.activeResource) setActiveResource(data.activeResource); else setActiveResource(null);
        if (!isHost && data.isLive !== undefined) setStreamLive(data.isLive);
        if (data.activeQuiz) { setActiveQuiz(data.activeQuiz); } 
        else { setActiveQuiz(null); setQuizDeckData(null); setSelectedOption(null); }
      } else if (!isDummy) {
        triggerToast("Room ended by host", "info");
        setTimeout(onBack, 2000);
      }
    });
    const filesUnsub = onSnapshot(query(collection(db, "room_resources"), where("roomId", "==", room.id), orderBy("createdAt", "desc")), (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const tasksUnsub = onSnapshot(query(collection(db, "room_tasks"), where("roomId", "==", room.id), orderBy("createdAt", "asc")), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { roomUnsub(); filesUnsub(); tasksUnsub(); };
  }, [room.id, isHost, isDummy]);

  useEffect(() => {
    const fetchDeck = async () => {
      if (activeQuiz?.deckId && (!quizDeckData || quizDeckData.id !== activeQuiz.deckId)) {
        try {
          const snap = await getDoc(doc(db, "flashcard_decks", activeQuiz.deckId));
          if (snap.exists()) setQuizDeckData({ id: snap.id, ...snap.data() });
        } catch (err) {}
      }
    };
    fetchDeck();
  }, [activeQuiz?.deckId, quizDeckData]);

  useEffect(() => {
    const fetchHostDecks = async () => {
      if (isHost && showQuizPicker) {
        try {
          const q = query(collection(db, "flashcard_decks"), where("createdBy", "==", user.uid));
          const snap = await getDocs(q);
          setHostDecks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch(err) {}
      }
    };
    fetchHostDecks();
  }, [isHost, showQuizPicker, user.uid]);

  useEffect(() => {
    if (activeQuiz?.isRevealed && selectedOption && quizDeckData) {
      const currentCard = quizDeckData.cards[activeQuiz.currentIndex];
      if (lastScoredIndex.current !== activeQuiz.currentIndex) {
        if (selectedOption === currentCard.back) {
          earnedQuizPoints.current += 50;
          triggerToast("Correct! +50 Points", "success");
        } else {
          triggerToast("Incorrect answer.", "error");
        }
        lastScoredIndex.current = activeQuiz.currentIndex;
      }
    }
  }, [activeQuiz?.isRevealed, selectedOption, quizDeckData, activeQuiz?.currentIndex]);

  useEffect(() => { setSelectedOption(null); }, [activeQuiz?.currentIndex]);

  const startLiveQuiz = async (deck) => {
    if (!deck.cards || deck.cards.length === 0) return triggerToast("Deck is empty!", "error");
    try {
      await updateDoc(roomRef, { activeQuiz: { deckId: deck.id, currentIndex: 0, isRevealed: false } });
      setShowQuizPicker(false);
    } catch (err) { triggerToast("Failed to start quiz", "error"); }
  };

  const stopLiveQuiz = async () => {
    if (!isHost) return;
    try { await updateDoc(roomRef, { activeQuiz: null }); } catch (err) {}
  };

  const nextQuizQuestion = async () => {
    if (!isHost || !quizDeckData || !activeQuiz) return;
    if (activeQuiz.currentIndex < quizDeckData.cards.length - 1) {
      try { await updateDoc(roomRef, { "activeQuiz.currentIndex": activeQuiz.currentIndex + 1, "activeQuiz.isRevealed": false }); } catch(err){}
    } else {
      stopLiveQuiz(); triggerToast("Quiz Finished!", "success");
    }
  };

  const revealAnswer = async () => {
    if (!isHost || !activeQuiz) return;
    try { await updateDoc(roomRef, { "activeQuiz.isRevealed": true }); } catch (err) {}
  };

  useEffect(() => {
    if (isHost && !activeResource && !activeQuiz && localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [activeResource, activeQuiz, isHost]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const displayName = user?.displayName || (user?.email ? user.email.split("@")[0] : "Student");
    try {
      await addDoc(collection(db, "room_tasks"), {
        roomId: room.id, text: newTaskText.trim(), completed: false, addedBy: displayName, createdAt: serverTimestamp()
      });
      setNewTaskText("");
    } catch (err) { triggerToast("Error adding task", "error"); }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    try { await updateDoc(doc(db, "room_tasks", taskId), { completed: !currentStatus }); } 
    catch (err) { triggerToast("Error updating task", "error"); }
  };

  const handleDeleteTask = async (taskId) => {
    try { await deleteDoc(doc(db, "room_tasks", taskId)); } 
    catch (err) { triggerToast("Error deleting task", "error"); }
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const taskProgressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

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
        roomId: room.id, name: newResourceName.trim(), url: newResourceLink.trim(), type: "link", 
        addedBy: user.email.split("@")[0], createdAt: serverTimestamp(), approved: isApproved
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
          roomId: room.id, name: file.name, data: reader.result, type: file.type, size: file.size, 
          addedBy: user.email.split("@")[0], createdAt: serverTimestamp(), approved: isApproved
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

  useEffect(() => { 
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); 
  }, [messages, showChat]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    if (containsSpam(newMsg)) { 
      triggerToast("Spam detected! Repeated offenses will result in a ban.", "error"); 
      setNewMsg(""); 
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { spamStrikes: increment(1) });
        const userSnap = await getDoc(userRef);
        if (userSnap.data().spamStrikes >= 3) {
          await updateDoc(userRef, { isFlagged: true });
        }
      } catch(err) { console.error("Error logging spam:", err) }
      return; 
    }
    const now = Date.now();
    const COOLDOWN_MS = 2000; 
    if (now - lastMessageTime < COOLDOWN_MS) {
      const waitTime = ((COOLDOWN_MS - (now - lastMessageTime)) / 1000).toFixed(1);
      triggerToast(`Please wait ${waitTime}s before sending another message.`, "error");
      return;
    }
    try {
      setLastMessageTime(now);
      let safeName = "Student";
      if (userProfile?.username) safeName = userProfile.username;
      else if (user?.displayName) safeName = user.displayName;
      else if (user?.email) safeName = user.email.split("@")[0];
      const safeEmail = user?.email || "hidden-email@student.com";
      const safeRole = userProfile?.role || "student";
      await addDoc(collection(db, "messages"), { 
        roomId: room.id, sender: safeEmail, senderName: safeName,
        senderRole: safeRole, isHost: isHost || false,
        text: newMsg.trim(), createdAt: serverTimestamp() 
      });
      setNewMsg("");
    } catch (err) { 
      console.error(err);
      triggerToast("Failed to send message.", "error"); 
    }
  };

  const handleReportUser = async (reportedEmail) => {
    if (reportedEmail === user?.email) return triggerToast("You cannot report yourself.", "error");
    try {
      await addDoc(collection(db, "reports"), {
        reportedEmail: reportedEmail, reportedBy: user?.email || "guest",
        roomId: room.id, timestamp: serverTimestamp()
      });
      const q = query(collection(db, "users"), where("email", "==", reportedEmail));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const reportedUserId = snapshot.docs[0].id;
        await updateDoc(doc(db, "users", reportedUserId), { isFlagged: true });
      }
      triggerToast("User reported to Admin.", "success");
    } catch (err) { triggerToast("Failed to report user.", "error"); }
  };

  const handleStartStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setStreamLive(true); setCamOn(true); setMicOn(true);
      sessionStartTime.current = Date.now(); 
      await startAutomaticRecording();
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
            // ICE servers for NAT traversal - includes STUN and TURN for college/corporate networks
            const iceServers = [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
              // Free TURN servers for better connectivity on restrictive networks
              { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
              { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
              { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" }
            ];
            const peer = new Peer({ initiator: true, trickle: false, config: { iceServers } });
            if (localStreamRef.current) peer.addStream(localStreamRef.current);
            peer.on("signal", async signal => { 
              try {
                await setDoc(doc(db, "studyRooms", room.id, "signals", data.viewerId), { hostSignal: signal }, { merge: true }); 
              } catch (err) { console.error("Error sending host signal:", err); }
            });
            peer.on("close", () => { delete peersRef.current[data.viewerId]; });
            peer.on("error", (err) => { console.error("Peer error:", err); delete peersRef.current[data.viewerId]; });
            peersRef.current[data.viewerId] = peer;
            const viewerDocRef = doc(db, "studyRooms", room.id, "signals", data.viewerId);
            const viewerUnsub = onSnapshot(viewerDocRef, docSnap => {
              const viewerData = docSnap.data();
              if (viewerData?.viewerSignal && peer && !peer.destroyed && peer.signalingState !== 'closed') { 
                try {
                  peer.signal(viewerData.viewerSignal); 
                  viewerUnsub(); 
                } catch (err) {
                  console.error("Error signaling peer:", err);
                  if (peer.destroyed || peer.signalingState === 'closed') {
                    delete peersRef.current[data.viewerId];
                    viewerUnsub();
                  }
                }
              }
            });
          } catch (err) { console.error("Error handling viewer signal:", err); }
        }
      });
    } catch (err) { console.error("Error starting stream:", err); }
  };

  // Zero out viewerCount + liveThumbnail when stream stops 
  const handleStopStream = async (showReport = true) => {
    setStreamLive(false); setCamOn(false); setMicOn(false);
    Object.values(peersRef.current).forEach(p => p.destroy());
    peersRef.current = {};
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (signalingUnsubscribeRef.current) signalingUnsubscribeRef.current();
    await stopAutomaticRecording();

    // clear all presence docs so viewerCount resets properly 
    try {
      const presenceCol = collection(db, "studyRooms", room.id, "presence");
      const presenceSnap = await getDocs(presenceCol);
      await Promise.all(presenceSnap.docs.map(d => deleteDoc(d.ref)));
    } catch (e) {}
    // ─────────────────────────────────────────────────────────────────────

    await updateDoc(roomRef, { 
      isLive: false, liveThumbnail: null, viewerCount: 0,
      activeResource: null, activeQuiz: null, 
      "timer.isRunning": false, "timer.isConfigured": false, 
      "timer.timeLeft": 1500, "timer.mode": 'work' 
    });
    if (showReport) { await generateSessionReport(); }
  };
  // ───────────────────────────────────────────────────────────────────────────

  // ─── toggleCamera and toggleMicrophone defined here ────────────────────────
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
  // ───────────────────────────────────────────────────────────────────────────

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
          if (!peersRef.current[viewerId]) {
            // ICE servers for NAT traversal - includes STUN and TURN for college/corporate networks
            const iceServers = [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
              // Free TURN servers for better connectivity on restrictive networks
              { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
              { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
              { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" }
            ];
            const peer = new Peer({ initiator: false, trickle: false, config: { iceServers } });
            peer.on("signal", async signal => { 
              try { await setDoc(signalDocRef, { viewerSignal: signal }, { merge: true }); } 
              catch (err) { console.error("Error sending viewer signal:", err); }
            });
            peer.on("stream", remoteStream => { setRemoteStreams(prev => ({ ...prev, [viewerId]: remoteStream })); });
            peer.on("close", () => { delete peersRef.current[viewerId]; });
            peer.on("error", (err) => { console.error("Viewer peer error:", err); delete peersRef.current[viewerId]; });
            if (peer && !peer.destroyed && peer.signalingState !== 'closed') {
              try { peer.signal(data.hostSignal); } 
              catch (err) { console.error("Error setting host signal:", err); }
            }
            peersRef.current[viewerId] = peer;
          } else {
            const existingPeer = peersRef.current[viewerId];
            if (existingPeer && !existingPeer.destroyed && existingPeer.signalingState !== 'closed') {
              try { existingPeer.signal(data.hostSignal); } 
              catch (err) { console.error("Error signaling existing peer:", err); delete peersRef.current[viewerId]; }
            }
          }
        });
      } catch (err) {}
    };
    joinRoom();
  }, [isHost, isDummy, room?.id, room?.createdBy, user?.uid]);

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

  const sendReaction = async (emoji) => { 
    try { await addDoc(collection(db, "reactions"), { roomId: room.id, emoji, timestamp: serverTimestamp(), senderId: user?.uid || "guest" }); } 
    catch (err) {} 
  };

  const startAutomaticRecording = () => {
    if (!localStreamRef.current || mediaRecorderRef.current) return;
    try {
      const mediaRecorder = new MediaRecorder(localStreamRef.current, { mimeType: 'video/webm;codecs=vp8,opus' });
      recordedChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartTimeRef.current) / 1000));
      }, 1000);
    } catch (error) { console.error("Error starting automatic recording:", error); }
  };

  const stopAutomaticRecording = async () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
    await saveRecordedVideo();
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setRecordingDuration(0);
  };

  const saveRecordedVideo = async () => {
    if (recordedChunksRef.current.length === 0) return;
    try {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const timestamp = Date.now();
      const fileName = `room_${room.id}_${user.uid}_${timestamp}.webm`;
      const videoURL = await saveToCloudinary(blob, fileName);
      const storageType = videoURL ? 'cloudinary' : 'local';
      const videoDoc = {
        roomId: room.id, userId: user.uid,
        userName: user?.displayName || user?.email?.split('@')[0] || 'Anonymous',
        fileName, videoURL, duration: recordingDuration,
        timestamp: serverTimestamp(), size: blob.size, type: 'webm', storageType
      };
      const videoRef = await addDoc(collection(db, "room_videos"), videoDoc);
      await updateDoc(roomRef, {
        latestVideo: {
          id: videoRef.id, duration: recordingDuration, timestamp: serverTimestamp(),
          userName: videoDoc.userName, fileName, videoURL, storageType
        }
      });
      recordedChunksRef.current = [];
    } catch (error) { console.error("Error saving video:", error); }
  };

  const saveToCloudinary = async (blob, fileName) => {
    try {
      const cloudName = 'dp4ounwlg';
      const uploadPreset = 'livestreams';
      const formData = new FormData();
      formData.append('file', blob);
      formData.append('upload_preset', uploadPreset);
      formData.append('resource_type', 'video');
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, { method: 'POST', body: formData });
      if (response.ok) {
        const result = await response.json();
        return result.secure_url;
      } else { throw new Error('Cloudinary upload failed'); }
    } catch (error) { console.error('Cloudinary storage error:', error); return null; }
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const saveToComputer = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
  };

  const toggleSidePanel = (panel) => { 
    setShowChat(panel === "chat" ? !showChat : false);
    setShowFiles(panel === "files" ? !showFiles : false);
    setShowTasks(panel === "tasks" ? !showTasks : false);
  };

  const currentQuizCard = quizDeckData?.cards?.[activeQuiz?.currentIndex];

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden font-sans">
      <div className="flex-1 relative bg-black flex flex-col">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        {confirmDialog && <ConfirmModal title={confirmDialog.title} message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={confirmDialog.onCancel} />}
        {sessionReport && <SessionReportModal stats={sessionReport} onClose={() => { setSessionReport(null); if(isExiting) onBack(); }} />}
        
        {showQuizPicker && isHost && (
          <div className="absolute inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center animate-fadeIn">
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FaBrain className="text-purple-500"/> Start a Live Quiz</h2>
                <button onClick={() => setShowQuizPicker(false)} className="text-gray-400 hover:text-gray-800"><FaTimes /></button>
              </div>
              {hostDecks.length === 0 ? (
                <p className="text-gray-500 text-center py-6">You haven't created any flashcard decks yet. Go to the Flashcard Hub on the dashboard to create one!</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {hostDecks.map(deck => (
                    <button key={deck.id} onClick={() => startLiveQuiz(deck)} className="w-full text-left bg-gray-50 hover:bg-purple-50 hover:border-purple-200 border border-gray-200 p-4 rounded-xl transition flex justify-between items-center group">
                      <div>
                        <p className="font-bold text-gray-800 group-hover:text-purple-700">{deck.title}</p>
                        <p className="text-xs text-gray-400">{deck.cards?.length || 0} Cards</p>
                      </div>
                      <FaPlay className="text-purple-500 opacity-0 group-hover:opacity-100 transition" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeQuiz && currentQuizCard ? (
          <div className="flex-1 bg-gray-900 flex flex-col items-center justify-center p-8 relative overflow-hidden">
            <div className="absolute top-6 flex flex-col items-center z-10">
              <div className="bg-purple-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest animate-pulse shadow-lg shadow-purple-500/50 mb-2">Live Group Quiz</div>
              <p className="text-gray-400 font-bold text-sm bg-black/50 px-4 py-1 rounded-full border border-white/10">
                {quizDeckData.title} — Question {activeQuiz.currentIndex + 1} of {quizDeckData.cards.length}
              </p>
            </div>
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full border-b-8 border-blue-500 z-10">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-8">{currentQuizCard.front}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuizCard.options ? currentQuizCard.options.map((opt, i) => {
                  let btnClass = "bg-gray-50 border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50";
                  if (activeQuiz.isRevealed) {
                    if (opt === currentQuizCard.back) btnClass = "bg-green-100 border-green-500 text-green-800 font-bold"; 
                    else if (selectedOption === opt) btnClass = "bg-red-100 border-red-500 text-red-800 line-through"; 
                    else btnClass = "bg-gray-100 border-gray-200 text-gray-400 opacity-50"; 
                  } else if (selectedOption === opt) {
                    btnClass = "bg-blue-500 border-blue-600 text-white font-bold shadow-md"; 
                  }
                  return (
                    <button key={i} disabled={isHost || activeQuiz.isRevealed} onClick={() => setSelectedOption(opt)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${btnClass} ${isHost ? 'cursor-default' : ''}`}>
                      <div className="flex justify-between items-center">
                        <span>{opt}</span>
                        {activeQuiz.isRevealed && opt === currentQuizCard.back && <FaCheckIcon className="text-green-600" />}
                        {activeQuiz.isRevealed && selectedOption === opt && opt !== currentQuizCard.back && <FaTimesCircle className="text-red-500" />}
                      </div>
                    </button>
                  );
                }) : <p className="col-span-full text-center text-gray-400">No options provided for this card. Host must reveal answer.</p>}
              </div>
              {!isHost && !activeQuiz.isRevealed && (
                <p className="text-center text-gray-400 text-sm mt-6 animate-pulse">Select an answer and wait for host to reveal...</p>
              )}
            </div>
            {isHost && (
              <div className="absolute bottom-32 flex gap-4 bg-black/60 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-2xl z-20">
                {!activeQuiz.isRevealed ? (
                  <button onClick={revealAnswer} className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-400 transition flex items-center gap-2"><FaCheckIcon /> Reveal Answer</button>
                ) : (
                  <button onClick={nextQuizQuestion} className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-400 transition flex items-center gap-2">Next Question <FaPlay /></button>
                )}
                <div className="w-px bg-white/20 mx-2"></div>
                <button onClick={stopLiveQuiz} className="px-4 py-3 bg-red-500/20 hover:bg-red-500 text-white rounded-xl font-bold transition flex items-center gap-2">End Quiz</button>
              </div>
            )}
          </div>

        ) : activeResource ? (
          <div className="w-full h-full flex flex-col bg-gray-900">
            <div className="h-12 bg-black/50 backdrop-blur flex items-center justify-between px-6 text-white border-b border-white/10 relative z-30">
              <span className="font-bold flex items-center gap-2"><FaDesktop className="text-blue-400"/> Presenting: {activeResource.name}</span>
              {isHost && <button onClick={handleStopPresentation} className="bg-red-600 px-3 py-1 text-xs font-bold rounded-lg hover:bg-red-500">Stop Presenting</button>}
            </div>
            <div className="flex-1 p-4 flex items-center justify-center relative">
              {activeResource.type?.includes("image") ? 
                <img src={activeResource.data} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" alt="Presentation" /> 
                : activeResource.type === "link" ? 
                <div className="text-center"><p className="text-gray-400 mb-4">Sharing external link...</p><a href={activeResource.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-2xl font-bold">{activeResource.url}</a></div> 
                : <iframe src={activeResource.data} className="w-full h-full bg-white rounded-lg" title="PDF Presentation" />}
            </div>
          </div>
        ) : (
          <>
            {isDummy ? (
              <video src={room.previewURL} poster={room.fallbackImage || null} autoPlay muted loop playsInline className="w-full h-full object-cover" />
            ) : isHost ? ( 
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" /> 
            ) : ( 
              <> 
                {Object.entries(remoteStreams).map(([id, stream]) => 
                  <video key={id} ref={el => { if (el && el.srcObject !== stream) { el.srcObject = stream; el.play().catch(() => {}); } }} autoPlay playsInline className="w-full h-full object-cover" />
                )} 
                {Object.keys(remoteStreams).length === 0 && timerData.mode !== 'break' && 
                  <div className="w-full h-full flex items-center justify-center"><p className="text-gray-500">Waiting for host...</p></div>
                } 
              </> 
            )}
          </>
        )}

        <BreakOverlay />
        <DistractionAlert />
        
        {streamLive && timerData.mode === 'work' && !activeQuiz && (
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
        <div className="absolute top-5 right-5 z-20 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-white/10 text-white"><FaEye className="text-blue-400"/> {viewers}</div>
        
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
              {!activeQuiz && (
                <ControlButton onClick={() => setShowQuizPicker(true)} icon={<FaBrain className="text-purple-400" />} label="Live Quiz" variant="default" />
              )}
              <div className="w-px bg-white/20 mx-1"></div>
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
          <ControlButton onClick={() => toggleSidePanel("tasks")} active={showTasks} icon={<FaTasks />} label="Goals" variant="default" />
          <ControlButton onClick={() => toggleSidePanel("files")} active={showFiles} icon={<FaPaperclip />} label="Resources" variant="default" />
          <ControlButton onClick={() => toggleSidePanel("chat")} active={showChat} icon={<FaPaperPlane />} label="Chat" variant="default" />
          {isHost && <ControlButton onClick={handleEndRoom} icon={<FaPowerOff />} label="End Room" variant="danger" />}
        </div>
      </div>

      {(showChat || showFiles || showTasks) && (
        <div className="w-96 bg-white flex flex-col shadow-2xl border-l border-gray-100 relative z-20">
          {showChat && (
            <>
              <div className="p-5 border-b border-gray-100 bg-white flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaPaperPlane /> Room Chat</h3>
                <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
              </div>
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-gray-50/50">
                {messages.map(m => {
                  const safeUserEmail = user?.email || "hidden-email@student.com";
                  const isMyMessage = m.sender === safeUserEmail;
                  return (
                    <div key={m.id} className={`flex flex-col mb-3 ${isMyMessage ? "items-end" : "items-start"}`}>
                      <div className={`flex items-center gap-1.5 mb-1 text-[10px] font-bold ${isMyMessage ? "flex-row-reverse" : "flex-row"}`}>
                        <span className="text-gray-500">{m.senderName || "Student"}</span>
                        {m.senderRole === "admin" && (
                          <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 shadow-sm border border-yellow-200">
                            <FaCrown size={8}/> Admin
                          </span>
                        )}
                        {m.isHost && (
                          <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 shadow-sm border border-blue-200">
                            <FaMicrophone size={8}/> Host
                          </span>
                        )}
                      </div>
                      <div className={`flex items-center gap-2 ${isMyMessage ? "flex-row-reverse" : "flex-row"}`}>
                        {!isMyMessage && m.senderRole !== "admin" && (
                          <button onClick={() => handleReportUser(m.sender)} className="text-gray-300 hover:text-red-500 transition" title="Report User">
                            <FaFlag size={10} />
                          </button>
                        )}
                        <div className={`px-4 py-2 rounded-2xl max-w-[85%] shadow-sm ${isMyMessage ? "bg-blue-600 text-white rounded-tr-none" : "bg-white border text-gray-700 rounded-tl-none"}`}>
                          <div className="text-sm">{m.text}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                <button onClick={() => setShowFiles(false)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
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
                        {!isHost && (res.type === 'link' ? 
                          <a href={res.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600 p-2"><FaExternalLinkAlt /></a> : 
                          <a href={res.data} download={res.name} className="text-gray-400 hover:text-blue-600 p-2"><FaDownload /></a>
                        )}
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
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setIsAddingResource(false)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg text-xs font-bold">Cancel</button>
                      <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold">Add</button>
                    </div>
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

          {showTasks && (
            <>
              <div className="p-5 border-b border-gray-100 bg-white flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FaTasks /> Session Goals</h3>
                <button onClick={() => setShowTasks(false)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
              </div>
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
                <div className="flex justify-between text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
                  <span>Progress</span>
                  <span className={taskProgressPercent === 100 ? "text-green-600" : "text-blue-600"}>{taskProgressPercent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${taskProgressPercent === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${taskProgressPercent}%` }}></div>
                </div>
              </div>
              <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-gray-50/50">
                {tasks.length === 0 ? (
                  <div className="text-center text-gray-400 mt-10">
                    <FaTasks className="mx-auto text-3xl mb-3 text-gray-300" />
                    <p className="text-sm font-medium">No goals set for this session.</p>
                  </div>
                ) : (
                  tasks.map(task => (
                    <div key={task.id} className={`bg-white p-4 rounded-xl shadow-sm border group transition-all flex items-start gap-3 ${task.completed ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-blue-300'}`}>
                      <input type="checkbox" checked={task.completed} onChange={() => handleToggleTask(task.id, task.completed)} className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" />
                      <div className="flex-1">
                        <p className={`text-sm font-semibold transition-all ${task.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.text}</p>
                        <p className="text-[10px] text-gray-400 mt-1 font-medium">Added by {task.addedBy}</p>
                      </div>
                      {(isHost || task.addedBy === (user?.email?.split("@")[0] || user?.displayName)) && (
                        <button onClick={() => handleDeleteTask(task.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><FaTrash size={13} /></button>
                      )}
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleAddTask} className="p-4 border-t border-gray-100 bg-white flex gap-2">
                <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)} placeholder="Add a new goal..." className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 outline-none text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-200 transition-all" />
                <button className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-5 rounded-xl shadow-md hover:shadow-lg transition-transform active:scale-95 font-bold text-sm">Add</button>
              </form>
            </>
          )}
        </div>
      )}

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-slideDown { animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1); } @keyframes slideDown { from { opacity: 0; transform: translateY(-20px) translateX(-50%); } to { opacity: 1; transform: translateY(0) translateX(-50%); } }
        .animate-slideUp { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); } @keyframes slideUp { from { opacity: 0; transform: translateY(40px) translateX(-50%); } to { opacity: 1; transform: translateY(0) translateX(-50%); } }
        @keyframes float { 0% { transform: translate(-50%, 0) scale(1); opacity: 1; } 100% { transform: translate(-50%, -200px) scale(1.5); opacity: 0; } } .animate-float { animation: float 2s forwards; }
      `}</style>
    </div>
  );
}