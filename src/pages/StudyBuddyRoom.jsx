// Study Buddy Room - P2P video chat with real-time collaboration
// Uses PeerJS for WebRTC + Firebase for signaling and stuff
// has timers, quizzes, chat, file sharing, the works

import { useState, useEffect, useRef, memo, useCallback} from 'react';
import { db, auth } from '../firebase';
import {
  collection, doc, deleteDoc, getDocs, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, setDoc, where, updateDoc, increment, arrayUnion, getDoc, arrayRemove,
  deleteField,
} from 'firebase/firestore';
import { 
  FaArrowLeft, FaEye, FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash,
  FaStopCircle, FaPowerOff, FaPaperPlane, FaStopwatch, FaCoffee, FaCheck, 
  FaThumbsUp, FaHeart, FaBolt, FaExclamationTriangle, FaPaperclip, FaLink, 
  FaExternalLinkAlt, FaTimes, FaPlus, FaCloudUploadAlt, FaFilePdf, FaImage, 
  FaDownload, FaDesktop, FaTrash, FaCheckCircle, FaClock, FaInfoCircle, 
  FaTasks, FaBrain, FaPlay, FaCheckCircle as FaCheckIcon, 
  FaTimesCircle, FaFlag, FaCrown, FaCopy, FaSignOutAlt, FaCommentDots
} from 'react-icons/fa';
import Peer from 'peerjs';
import { useAuthState } from 'react-firebase-hooks/auth';
import { containsSpam } from '../utils/spamDetection';
import { getStudyBuddyPeerOptions } from '../utils/webrtcConfig';

// sound for distraction alerts
const ALERT_SOUND_URL = 'https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg';
const alertSound = new Audio(ALERT_SOUND_URL);
alertSound.loop = true;

// timer stuff
const DEFAULT_WORK_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;

// message rate limiting - stop spam
const MESSAGE_COOLDOWN_MS = 2000;
const MAX_MESSAGE_LENGTH = 300;

// ────────────────────────────────────────────────
// Shared Components
// ────────────────────────────────────────────────

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // pick color based on what kinda toast it is
  const bg = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
  
  return (
    <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-[300] ${bg} text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-slideDown border border-white/10`}>
      {type === 'error' ? <FaExclamationTriangle /> : (type === 'success' ? <FaCheckCircle /> : <FaInfoCircle />)}
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

const TimerSetupModal = ({ onClose, onSave }) => {
  const [workMinutes, setWorkMinutes] = useState(String(DEFAULT_WORK_MINUTES));
  const [breakMinutes, setBreakMinutes] = useState(String(DEFAULT_BREAK_MINUTES));

  const handleSave = () => {
    onSave(Number(workMinutes) || DEFAULT_WORK_MINUTES, Number(breakMinutes) || DEFAULT_BREAK_MINUTES);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-white/20 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition"><FaTimes size={18} /></button>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 text-3xl shadow-inner"><FaStopwatch /></div>
          <h2 className="text-2xl font-bold text-gray-800">Set Pomodoro</h2>
          <p className="text-gray-500 text-sm mt-1">Let's start your focus mode!</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Focus (Minutes)</label>
            <input 
              type="number" 
              value={workMinutes} 
              onChange={e => setWorkMinutes(e.target.value)} 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg text-gray-900 transition" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Break (Minutes)</label>
            <input 
              type="number" 
              value={breakMinutes} 
              onChange={e => setBreakMinutes(e.target.value)} 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-mono text-lg text-gray-900 transition" 
            />
          </div>
          <button onClick={handleSave} className="w-full text-white py-3.5 mt-2 rounded-xl font-bold hover:shadow-lg transition-transform active:scale-95 bg-gradient-to-r from-blue-600 to-purple-600">
            Start Timer Now
          </button>
        </div>
      </div>
    </div>
  );
};

const ControlButton = ({ onClick, icon, label, variant = 'default', disabled = false, active = false }) => {
  const variants = {
    default: 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10',
    danger: 'bg-red-500/80 hover:bg-red-600 text-white backdrop-blur-md shadow-red-500/20',
    primary: 'bg-blue-600/80 hover:bg-blue-500 text-white backdrop-blur-md shadow-blue-500/20',
    success: 'bg-green-500/80 hover:bg-green-500 text-white backdrop-blur-md shadow-green-500/20',
    toggle: active ? 'bg-white text-gray-900 hover:bg-gray-200' : 'bg-red-500/80 text-white hover:bg-red-600'
  };

  return (
    <div className="relative group">
      <button 
        onClick={onClick} 
        disabled={disabled} 
        className={`p-4 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center ${variants[variant] || variants.default} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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

const BreakOverlay = memo(({ isBreak, timeLeft }) => {
  if (!isBreak) return null;
  const mins = Math.floor(timeLeft / 60);
  const secs = String(timeLeft % 60).padStart(2, "0");
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center text-white animate-fadeIn pointer-events-none"
      style={{ zIndex: 45, background: "linear-gradient(135deg, rgba(22,163,74,0.92) 0%, rgba(37,99,235,0.92) 100%)", backdropFilter: "blur(12px)" }}
    >
      <FaCoffee className="text-8xl mb-6 animate-bounce" style={{ filter: "drop-shadow(0 0 24px rgba(255,255,255,0.3))" }} />
      <h2 className="text-6xl font-black mb-2 tracking-tight">Break Time!</h2>
      <p className="text-white/70 text-lg mb-6 font-medium">Relax — you've earned it</p>
      <div className="text-8xl font-mono font-black tracking-tighter tabular-nums" style={{ textShadow: "0 4px 32px rgba(0,0,0,0.3)" }}>
        {mins}:{secs}
      </div>
    </div>
  );
});

// remote video player - shows buddy's camera feed
// tries to play video when stream arrives, shows loading avatar if not ready yet
function RemoteVideo({ buddy, stream, isHost, mutedByHost, onHostMuteToggle }) {
  const videoRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    console.log(`[Video] attaching stream for ${buddy.username}`);
    
    // assign the stream to video element
    video.srcObject = stream;

    // Keep incoming video alive without overriding host microphone controls.
    stream.getVideoTracks().forEach(t => {
      t.enabled = true;
      console.log(`[Video] ${t.kind} track is ${t.readyState}`);
    });

    // keep trying to play video until frames show up
    let attempts = 0;
    const playHammer = setInterval(() => {
      if (video.videoWidth > 0) {
        setHasVideo(true);
        clearInterval(playHammer);
        console.log(`[Video] ${buddy.username}'s video is rendering`);
      } else {
        attempts++;
        video.play().catch(() => {});
        // if no video after 10 seconds, try reassigning the stream
        if (attempts === 20) video.srcObject = stream; 
      }
    }, 500);

    return () => {
      clearInterval(playHammer);
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [stream?.id, buddy.username]);

  useEffect(() => {
    if (!stream) return;
    stream.getAudioTracks().forEach(track => {
      track.enabled = !mutedByHost;
    });
  }, [stream, mutedByHost]);

  return (
    <div className="relative bg-gray-900 rounded-2xl overflow-hidden border border-white/10 w-full h-full min-h-[200px]">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover bg-black"
        style={{ opacity: hasVideo ? 1 : 0, transition: 'opacity 0.3s' }}
      />

      {!hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
           <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-2xl font-bold text-white mb-2 shadow-lg">
            {(buddy.username || "S").charAt(0).toUpperCase()}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">Initializing Video...</p>
          </div>
        </div>
      )}

      {isHost && onHostMuteToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHostMuteToggle(buddy.uid);
          }}
          className={`absolute top-3 right-3 z-30 p-3 rounded-xl border text-sm font-extrabold shadow-xl backdrop-blur-md transition ${
            mutedByHost
              ? "bg-green-500/90 border-green-300/40 text-white hover:bg-green-400"
              : "bg-red-500/90 border-red-300/40 text-white hover:bg-red-400"
          }`}
          title={mutedByHost ? `Allow ${buddy.username || "participant"} to unmute` : `Mute ${buddy.username || "participant"}`}
        >
          {mutedByHost ? <FaMicrophoneSlash /> : <FaMicrophone />}
        </button>
      )}

      <div className="absolute bottom-3 left-3 z-20 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold border border-white/10 text-white flex items-center gap-2 max-w-[calc(100%-1.5rem)]">
        {mutedByHost ? <FaMicrophoneSlash className="text-red-400 shrink-0" /> : <FaMicrophone className="text-green-400 shrink-0" />}
        <span>{buddy.username}</span>
        {mutedByHost && <span className="text-red-300 uppercase tracking-wide">Muted</span>}
      </div>
    </div>
  );
}

// small tile for the filmstrip at the bottom when presenting
const FilmstripTile = memo(function FilmstripTile({ label, stream, videoRef, muted = false, mutedByHost = false, camOn = true, initial }) {
  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden border border-white/15 shrink-0" style={{ width: 180, height: 112 }}>
      <video
        ref={videoRef || ((node) => {
          if (node && stream && node.srcObject !== stream) {
            node.srcObject = stream;
            node.onloadedmetadata = () => node.play().catch(() => {});
          }
        })}
        autoPlay playsInline muted={muted || mutedByHost}
        className="w-full h-full object-cover"
        style={{ opacity: (camOn && stream) ? 1 : 0 }}
      />
      {(!camOn || !stream) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-base font-bold text-white">
            {(initial || "S").toUpperCase()}
          </div>
        </div>
      )}
      {label && (
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/10 truncate max-w-[90%] flex items-center gap-1">
          {mutedByHost && <FaMicrophoneSlash className="text-red-300 shrink-0" />}
          {label}
        </div>
      )}
    </div>
  );
});

// shows everyone's videos in a grid layout
// the KEY part is important - don't use stream in it or videos will flicker
function VideoGrid({ myVideoRef, camOn, safeUsername, buddies, remoteStreams, user, isHost, hostMutedMicUids, onHostMuteToggle }) {
  const hostMutedMe = !!hostMutedMicUids?.[user?.uid];
  const totalCount = 1 + buddies.filter(b => b.uid !== user.uid).length;
  const cols = totalCount === 1 ? 1 : totalCount <= 4 ? 2 : 3;

  const localVideoAssign = useCallback((node) => {
    myVideoRef.current = node;
    if (!node) return;
    const stream = window.__localStream;
    if (stream && node.srcObject !== stream) {
      node.srcObject = stream;
      const tryPlay = () => node.play().catch(() => {});
      if (node.readyState >= 1) tryPlay();
      else node.addEventListener('loadedmetadata', tryPlay, { once: true });
    }
  }, []);

  return (
    <div className="w-full h-full p-5" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: "1fr", gap: 12, alignContent: "center", justifyContent: "center" }}>
      <div className="relative bg-gray-900 rounded-2xl overflow-hidden border border-white/10" style={{ minHeight: 0 }}>
        <video
          ref={localVideoAssign}
          autoPlay playsInline muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: camOn ? 1 : 0, transition: 'opacity 0.3s' }}
        />
        {!camOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900" style={{ pointerEvents: 'none' }}>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
              {(safeUsername || "S").charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold border border-white/10 text-white flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
          {safeUsername} (You)
          {hostMutedMe && <span className="text-red-400 font-extrabold">· Muted by host</span>}
        </div>
      </div>

      {/* KEY is uid only — never change it on stream arrival, that causes remount + srcObject wipe */}
      {buddies.filter(b => b.uid !== user.uid).map((buddy) => (
        <div key={buddy.uid} style={{ minHeight: 200, minWidth: 200, position: 'relative' }}>
          <RemoteVideo
            buddy={buddy}
            stream={remoteStreams[buddy.uid] || null}
            isHost={isHost}
            mutedByHost={!!hostMutedMicUids?.[buddy.uid]}
            onHostMuteToggle={onHostMuteToggle}
          />
        </div>
      ))}
    </div>
  );
}

function PresentingBottomZone({
  safeUsername, myVideoRef, camOn, micOn, buddies, remoteStreams, user, isHost, activeQuiz, timerData, setShowTimerModal,
  toggleMic, toggleCamera, toggleSidePanel, showTasks, showFiles, showChat, setShowQuizPicker, onHoverChange,
  hostMutedMicUids, onHostMuteToggle,
}) {
  const hostMutedMe = !!hostMutedMicUids?.[user?.uid];
  return (
    <div
      className="absolute bottom-0 left-0 w-full z-[55] group/bottom"
      style={{ height: 168 }}
      onMouseEnter={() => onHoverChange && onHoverChange(true)}
      onMouseLeave={() => onHoverChange && onHoverChange(false)}
    >
      <div
        className="absolute left-0 w-full flex items-center gap-3 px-5 py-3 overflow-x-auto
                   translate-y-full group-hover/bottom:translate-y-0
                   transition-transform duration-300 ease-out"
        style={{
          bottom: 68,
          height: 112,
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 100%)",
          backdropFilter: "blur(8px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <FilmstripTile
          label={`${safeUsername} (You)`}
          videoRef={myVideoRef}
          muted
          camOn={camOn}
          initial={(safeUsername || "S").charAt(0)}
        />
        {buddies.filter(b => b.uid !== user.uid).map((buddy) => (
          <div key={buddy.uid} className="relative shrink-0">
            {isHost && onHostMuteToggle && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onHostMuteToggle(buddy.uid);
                }}
                className={`absolute top-1 right-1 z-10 p-1.5 rounded-lg border text-xs font-extrabold shadow-lg transition ${
                  hostMutedMicUids?.[buddy.uid]
                    ? "bg-green-500/90 border-green-300/40 text-white hover:bg-green-400"
                    : "bg-red-500/90 border-red-300/40 text-white hover:bg-red-400"
                }`}
                title={hostMutedMicUids?.[buddy.uid] ? "Allow mic" : "Mute mic"}
              >
                {hostMutedMicUids?.[buddy.uid] ? <FaMicrophoneSlash /> : <FaMicrophone />}
              </button>
            )}
            <FilmstripTile
              label={buddy.username}
              stream={remoteStreams[buddy.uid]}
              mutedByHost={!!hostMutedMicUids?.[buddy.uid]}
              camOn={true}
              initial={(buddy.username || "S").charAt(0)}
            />
          </div>
        ))}
      </div>

      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2
                   opacity-0 group-hover/bottom:opacity-100
                   transition-opacity duration-300
                   p-2.5 bg-black/70 backdrop-blur-2xl rounded-3xl border border-white/10
                   flex gap-2 sm:gap-3 shadow-2xl w-max z-[100]"
      >
        {isHost && (
          <>
            {!activeQuiz && (
              <ControlButton onClick={() => setShowQuizPicker(true)} icon={<FaBrain className="text-purple-400" />} label="Live Quiz" variant="default" />
            )}
            <div className="w-px bg-white/10 mx-1 hidden sm:block"></div>
            <ControlButton
              onClick={() => !timerData?.isConfigured && setShowTimerModal(true)}
              disabled={timerData?.isConfigured}
              icon={<FaStopwatch />}
              label="Timer"
              variant={timerData?.isConfigured ? "success" : "primary"}
            />
            <div className="w-px bg-white/10 mx-1 hidden sm:block"></div>
          </>
        )}
        <ControlButton
          onClick={toggleMic}
          active={micOn && !hostMutedMe}
          variant="toggle"
          icon={hostMutedMe ? <FaMicrophoneSlash /> : micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
          label={hostMutedMe ? "Muted by host" : "Mic"}
          disabled={hostMutedMe}
        />
        <ControlButton onClick={toggleCamera} active={camOn} variant="toggle" icon={camOn ? <FaVideo /> : <FaVideoSlash />} label="Camera" />
        <div className="w-px bg-white/10 mx-1 sm:mx-2"></div>
        <ControlButton onClick={() => toggleSidePanel("tasks")} active={showTasks} icon={<FaTasks />} label="Goals" />
        <ControlButton onClick={() => toggleSidePanel("files")} active={showFiles} icon={<FaPaperclip />} label="Resources" />
        <ControlButton onClick={() => toggleSidePanel("chat")} active={showChat} icon={<FaCommentDots />} label="Chat" />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Main StudyBuddy Room Component
// handles all the P2P video, messaging, timers, etc
// ────────────────────────────────────────────────
export default function StudyBuddyRoom({ room, onBack }) {
  const [user] = useAuthState(auth);

  // user profile stuff
  const [userProfile, setUserProfile] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isBottomHovered, setIsBottomHovered] = useState(false);

  // connection status
  const [sessionStarted, setSessionStarted] = useState(false);
  const [peerReady, setPeerReady] = useState(false);
  const [peerError, setPeerError] = useState(null);

  // local media
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [hostMutedMicUids, setHostMutedMicUids] = useState({});

  // people in this room
  const [buddies, setBuddies] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const [resources, setResources] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeResource, setActiveResource] = useState(null);

  
  // pomodoro timer config
  const [timerData, setTimerData] = useState({
    timeLeft: 1500,
    isRunning: false,
    mode: 'work',
    config: { work: DEFAULT_WORK_MINUTES, break: DEFAULT_BREAK_MINUTES },
    isConfigured: false,
  });
  const [showTimerModal, setShowTimerModal] = useState(false);

  // quizzes and flashcards
  const [showQuizPicker, setShowQuizPicker] = useState(false);
  const [hostDecks, setHostDecks] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizDeckData, setQuizDeckData] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);

  // tasks/goals list
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');

  // sidebar panels
  const [showChat, setShowChat] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [showTasks, setShowTasks] = useState(false);

  // AI helper chat
  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', content: 'Hi! Ask me anything...' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // distraction detection alerts
  const [distractionCount, setDistractionCount] = useState(0);
  const [showDistractionAlert, setShowDistractionAlert] = useState(false);

  // ────────────────────────────────────────────────
  // Refs for WebRTC and DOM stuff
  // ────────────────────────────────────────────────
  const myVideoRef = useRef(null);
  const peerRef = useRef(null);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const hostMutedMicUidsRef = useRef({});
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // tracking quiz points and session timing
  const earnedQuizPoints = useRef(0);
  const lastScoredIndex = useRef(-1);
  const sessionStartTime = useRef(Date.now());
  const uploadsCount = useRef(0);


  if (!user || !room) {
    return <div className="h-screen flex items-center justify-center text-white bg-gray-900">Loading...</div>;
  }

  // figure out if i'm running this room
  const isHost = room?.createdBy === user?.uid;
  const roomRef = doc(db, 'studyRooms', room.id);
  const inviteLink = `${window.location.origin}/join/${room.id}`;
  // make a safe name to display (no null pointers!)
  const safeUsername = userProfile?.username || user?.displayName || (user?.email ? user.email.split('@')[0] : 'Student');
  hostMutedMicUidsRef.current = hostMutedMicUids || {};

  // quick way to trigger a toast notification
  const triggerToast = (msg, type = 'info') => {
    setToast({ message: msg, type });
  };

  // confirm dialog for destructive actions
  const triggerConfirm = (title, message, action) => {
    setConfirmDialog({
      title,
      message,
      onConfirm: () => {
        action();
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  // fetch user profile on load
  useEffect(() => {
    if (user?.uid) {
      getDoc(doc(db, "users", user.uid)).then(docSnap => {
        if (docSnap.exists()) setUserProfile(docSnap.data());
      }).catch(err => console.error("Profile Fetch Error:", err));
    }
  }, [user.uid]);

  useEffect(() => {
    if (!room?.id) return;

    const roomUnsub = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.timer) setTimerData(data.timer);
        if (data.activeResource !== undefined) setActiveResource(data.activeResource);
        setBuddies(data.participants || []);
        setHostMutedMicUids(data.hostMutedMicUids && typeof data.hostMutedMicUids === "object" ? data.hostMutedMicUids : {});
        setSessionStarted(data.sessionStarted || false);
        if (data.activeQuiz) { setActiveQuiz(data.activeQuiz); }
        else { setActiveQuiz(null); setQuizDeckData(null); setSelectedOption(null); }
      } else {
        triggerToast("Room ended by host", "info");
        onBack();
      }
    }, (error) => console.error("Room Sync Error:", error));

    const filesUnsub = onSnapshot(query(collection(db, "room_resources"), where("roomId", "==", room.id), orderBy("createdAt", "desc")), (snapshot) => {
      setResources(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const tasksUnsub = onSnapshot(query(collection(db, "room_tasks"), where("roomId", "==", room.id), orderBy("createdAt", "asc")), (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const msgUnsub = onSnapshot(query(collection(db, "messages"), where("roomId", "==", room.id), orderBy("createdAt", "asc")), (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { roomUnsub(); filesUnsub(); tasksUnsub(); msgUnsub(); };
  }, [room.id, onBack]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, showChat]);

  useEffect(() => {
    const userData = { uid: user.uid, username: safeUsername, email: user.email, joinedAt: new Date() };
    const join = async () => { 
      try {
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
          const participants = roomSnap.data().participants || [];
          const existingUser = participants.find(p => p.uid === user.uid);
          if (existingUser) {
            triggerToast("You are already logged into this room from another device/tab", "error");
            setTimeout(onBack, 2000);
            return;
          }
        }
        await updateDoc(roomRef, { participants: arrayUnion(userData) }); 
      } catch (err) { } 
    };
    join();

    return () => {
      const leave = async () => {
        try {
          const snap = await getDoc(roomRef);
          if (snap.exists()) await updateDoc(roomRef, { participants: arrayRemove(userData) });
          await deleteDoc(doc(db, "studyRooms", room.id, "peers", user.uid)).catch(() => {});
        } catch (err) {}
      };
      leave();
    };
  }, [room.id, user.uid, user.email, safeUsername]);

  useEffect(() => {
    let interval = null;

    if (isHost && timerData?.isRunning && timerData?.timeLeft > 0) {
      interval = setInterval(async () => {
        await updateDoc(roomRef, { "timer.timeLeft": timerData.timeLeft - 1 });
      }, 1000);

    } else if (isHost && timerData?.isRunning && timerData?.timeLeft === 0) {
      const workMin = timerData.config?.work || 25;
      const breakMin = timerData.config?.break || 5;

      if (timerData.mode === "work") {
        updateDoc(roomRef, {
          timer: {
            ...timerData,
            timeLeft: breakMin * 60,
            isRunning: true,
            mode: "break",
            config: { work: workMin, break: breakMin },
            isConfigured: true,
          }
        });
      } else {
        updateDoc(roomRef, {
          timer: {
            ...timerData,
            isRunning: false,
            timeLeft: 0,
            mode: "work",
            isConfigured: false,
          }
        });
      }
    }

    return () => clearInterval(interval);
  }, [isHost, timerData?.isRunning, timerData?.timeLeft, timerData?.mode, timerData?.config, roomRef]);

  useEffect(() => {
    if (!sessionStarted || timerData?.mode !== 'work') {
      alertSound.pause();
      alertSound.currentTime = 0;
      return;
    }
    const handleVisibilityChange = () => {
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
  }, [timerData?.mode, sessionStarted]);

  // ────────────────────────────────────────────────
  // Start camera and PeerJS connection when session begins
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionStarted) return;

    let reconnectTimeout = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    const baseReconnectDelay = 1000;

    const initMedia = async () => {
      console.log("[StudyBuddy] initMedia called - starting media acquisition");
      try {
        // request camera and microphone from user
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        // make sure video is enabled and not power-saving
        stream.getVideoTracks().forEach(track => {
          track.enabled = true;
          if (track.contentHint !== undefined) {
            track.contentHint = 'motion';
          }
        });
        const hostMutedMeOnJoin = !!hostMutedMicUidsRef.current?.[user.uid];
        stream.getAudioTracks().forEach(track => {
          track.enabled = !hostMutedMeOnJoin;
        });
        console.log("[StudyBuddy] Got stream from getUserMedia, tracks:", { 
          video: stream.getVideoTracks().length, 
          audio: stream.getAudioTracks().length 
        });
        
        // save the stream so we can reuse it
        localStreamRef.current = stream;
        window.__localStream = stream;

        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
          console.log("[StudyBuddy] Set myVideoRef.srcObject");
        }
        setCamOn(stream.getVideoTracks()[0]?.enabled ?? true);
        setMicOn(stream.getAudioTracks()[0]?.enabled ?? true);

        sessionStartTime.current = Date.now();

        console.log("[StudyBuddy] Creating PeerJS instance with options...");
        const peer = new Peer(getStudyBuddyPeerOptions());
        peerRef.current = peer;
        reconnectAttempts = 0;
        console.log("[StudyBuddy] PeerJS instance created, waiting for 'open' event...");

        peer.on("open", async (id) => {
          console.log("[StudyBuddy] PeerJS 'open' event fired with ID:", id);
          setPeerReady(true);
          setPeerError(null);
          reconnectAttempts = 0;
          console.log("[StudyBuddy] PeerJS connected with ID:", id, "Saving to firestore...");
          try {
            await setDoc(doc(db, "studyRooms", room.id, "peers", user.uid), { peerId: id, userId: user.uid, timestamp: Date.now() });
            console.log("[StudyBuddy] Successfully saved peer info to firestore");
          } catch (err) {
            console.error("[StudyBuddy] Failed to save peer info to firestore:", err);
          }
        });

        peer.on("error", (err) => {
          console.error("[StudyBuddy] Peer error:", err.type, err.message);
          setPeerError(`Connection issue (${err.type}). Retrying...`);
          triggerToast("Peer connection issue. Retrying with TURN relay...", "error");
          
          if (peer && peer.disconnected && reconnectAttempts < maxReconnectAttempts) {
            const delay = baseReconnectDelay * Math.pow(1.5, reconnectAttempts);
            reconnectAttempts++;
            reconnectTimeout = setTimeout(() => {
              try { peer.reconnect(); } catch (e) { console.error("[StudyBuddy] Reconnect error:", e); }
            }, delay);
          }
        });

        peer.on("disconnected", () => {
          console.warn("[StudyBuddy] Peer disconnected from signaling server");
          setPeerReady(false);
          setPeerError("Disconnected from peer network. Reconnecting...");
          triggerToast("Connection lost. Attempting to reconnect...", "error");
          
          if (peer && peer.reconnect && reconnectAttempts < maxReconnectAttempts) {
            const delay = baseReconnectDelay * Math.pow(1.5, reconnectAttempts);
            reconnectAttempts++;
            reconnectTimeout = setTimeout(() => {
              try { peer.reconnect(); } catch (e) { console.error("[StudyBuddy] Reconnect error:", e); }
            }, delay);
          }
        });

        peer.on("close", () => {
          console.log("[StudyBuddy] Peer connection closed");
          setPeerReady(false);
        });

        // ── FIXED incoming call handler ──
        peer.on("call", (call) => {
          const callerId = call.metadata?.userId || call.peer;
          console.log("[StudyBuddy] Incoming call from:", callerId);

          if (!localStreamRef.current) {
            console.error("[StudyBuddy] Local stream missing during incoming call");
            return;
          }

          // Answer the call with our local stream
          call.answer(localStreamRef.current);
          
          // Track the call object
          peersRef.current[callerId] = call;

          call.on("stream", (remoteStream) => {
            console.log("[StudyBuddy] Received remote stream for:", callerId);
            // Explicitly enable tracks on the incoming stream
            remoteStream.getTracks().forEach(t => t.enabled = true);
            
            setRemoteStreams(prev => ({ 
              ...prev, 
              [callerId]: remoteStream 
            }));
          });

          call.on("error", (err) => {
            console.error("[StudyBuddy] Call error:", err);
            delete peersRef.current[callerId];
          });
        });

      } catch (err) {
        console.error("[StudyBuddy] Webcam Error:", err);
        if (err.name === "NotReadableError") triggerToast("Camera is in use by another app. Please refresh.", "error");
        else triggerToast("Camera/Mic access denied.", "error");
      }
    };

    initMedia();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      window.__localStream = null;
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
      if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null; }
    };
  }, [sessionStarted, room.id, user.uid]);

  useEffect(() => {
    if (myVideoRef.current && localStreamRef.current) {
      if (myVideoRef.current.srcObject !== localStreamRef.current) {
        console.log("[StudyBuddy] Syncing local stream to video ref");
        myVideoRef.current.srcObject = localStreamRef.current;
      }
    }
  }, []);

  useEffect(() => {
    const node = myVideoRef.current;
    const stream = localStreamRef.current;
    if (node && stream && node.srcObject !== stream) {
      node.srcObject = stream;
      const tryPlay = () => node.play().catch(() => {});
      if (node.readyState >= 1) tryPlay();
      else node.addEventListener('loadedmetadata', tryPlay, { once: true });
    }
  }, [sessionStarted, camOn]);

  // ────────────────────────────────────────────────
  // Listen for study buddies and connect to them via P2P
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionStarted || !peerReady) return;
    console.log("[StudyBuddy] Setting up peer listener. sessionStarted:", sessionStarted, "peerReady:", peerReady, "localStream available:", !!localStreamRef.current);

    const callPeer = (targetUserId, targetPeerId) => {
      if (!peerRef.current || !localStreamRef.current) return;

      // close old call first if it exists
      if (peersRef.current[targetUserId]) {
        peersRef.current[targetUserId].close();
      }

      console.log("[StudyBuddy] Dialing:", targetUserId);
      const call = peerRef.current.call(targetPeerId, localStreamRef.current, {
        metadata: { userId: user.uid }
      });

      peersRef.current[targetUserId] = call;

      call.on("stream", (remoteStream) => {
        remoteStream.getTracks().forEach(t => t.enabled = true);
        setRemoteStreams(prev => ({ ...prev, [targetUserId]: remoteStream }));
      });
    };

    // watch for peers joining from firestore
    const unsubscribe = onSnapshot(
      collection(db, "studyRooms", room.id, "peers"),
      (snapshot) => {
        snapshot.docs.forEach((doc) => {
          const peerData = doc.data();
          if (peerData.userId === user.uid) return; // don't call yourself lol

          // only ONE person should make the call (the one with the smaller ID alphabetically)
          // the other just waits to receive - prevents duplicate calls
          const iAmCaller = user.uid < peerData.userId;

          if (iAmCaller && !peersRef.current[peerData.userId]) {
            console.log("[StudyBuddy] I am the designated caller for:", peerData.userId);
            callPeer(peerData.userId, peerData.peerId);
          }
        });
      }
    );

    return () => {
      console.log("[StudyBuddy] Cleaning up peer listener");
      unsubscribe();
    };
  }, [sessionStarted, peerReady, room.id, user.uid]);

  // ────────────────────────────────────────────────
  // Event Handlers
  // ────────────────────────────────────────────────
  
  // toggle camera on/off
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) { track.enabled = !camOn; setCamOn(track.enabled); }
    }
  };

  // host can mute/unmute people's mics
  const hostMuteToggle = async (targetUid) => {
    if (!isHost || !targetUid || targetUid === user.uid) return;
    try {
      const muted = !!hostMutedMicUids?.[targetUid];
      if (muted) {
        await updateDoc(roomRef, { [`hostMutedMicUids.${targetUid}`]: deleteField() });
      } else {
        await updateDoc(roomRef, { [`hostMutedMicUids.${targetUid}`]: true });
      }
    } catch (e) {
      triggerToast("Could not update mute", "error");
    }
  };

  // listen if host muted ME
  useEffect(() => {
    if (!localStreamRef.current || !sessionStarted) return;
    const track = localStreamRef.current.getAudioTracks()[0];
    if (!track) return;
    if (hostMutedMicUids?.[user.uid]) {
      track.enabled = false;
      setMicOn(false);
    }
  }, [hostMutedMicUids, user.uid, sessionStarted]);

  // toggle mic on/off (but host can block this)
  const toggleMic = () => {
    if (hostMutedMicUids?.[user.uid]) {
      triggerToast("The host has muted your microphone", "error");
      return;
    }
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) { track.enabled = !micOn; setMicOn(track.enabled); }
    }
  };

  const startSession = () => updateDoc(roomRef, { sessionStarted: true });
  const copyLink = () => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const toggleSidePanel = (panel) => {
    setShowChat(panel === "chat" ? !showChat : false);
    setShowFiles(panel === "files" ? !showFiles : false);
    setShowTasks(panel === "tasks" ? !showTasks : false);
  };

  const generateSessionReport = async () => {
    const endTime = Date.now();
    const durationMinutes = Math.max(1, Math.floor((endTime - sessionStartTime.current) / 1000 / 60));
    try {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        await updateDoc(userRef, { totalFocusTime: increment(durationMinutes) });
        const refreshedUser = await getDoc(userRef);
        if (refreshedUser.exists()) setUserProfile(refreshedUser.data());
      }
    } catch (e) {
      console.error("Session report update failed:", e);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      const userData = { uid: user.uid, username: safeUsername, email: user.email };
      const snap = await getDoc(roomRef);
      if (snap.exists()) {
        if (isHost) await deleteDoc(roomRef);
        else await updateDoc(roomRef, { participants: arrayRemove(userData) });
      }
      await deleteDoc(doc(db, "studyRooms", room.id, "peers", user.uid)).catch(() => {});
    } catch (err) {}

    if (sessionStarted) await generateSessionReport();
    onBack();
  };

  const handleSaveTimerConfig = async (workMin, breakMin) => {
    await updateDoc(roomRef, { timer: { timeLeft: workMin * 60, isRunning: true, mode: 'work', config: { work: workMin, break: breakMin }, isConfigured: true } });
    setShowTimerModal(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;

    if (containsSpam(newMsg)) {
      triggerToast("Spam detected! Repeated offenses will result in a ban.", "error");
      setNewMsg("");
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { spamStrikes: increment(1) });
        const userSnap = await getDoc(userDocRef);
        if (userSnap.data()?.spamStrikes >= 3) await updateDoc(userDocRef, { isFlagged: true });
      } catch (err) {}
      return;
    }

    const now = Date.now();
    if (now - lastMessageTime < 2000) return triggerToast("Please wait before sending another message.", "error");

    try {
      setLastMessageTime(now);
      await addDoc(collection(db, "messages"), {
        roomId: room.id, sender: user.email || "guest", senderName: safeUsername,
        senderRole: userProfile?.role || "student", isHost: isHost || false,
        text: newMsg.trim(), createdAt: serverTimestamp()
      });
      setNewMsg("");
    } catch (err) { triggerToast("Failed to send message.", "error"); }
  };

  const handleReportUser = async (reportedEmail) => {
    if (reportedEmail === user?.email) return triggerToast("You cannot report yourself.", "error");
    try {
      await addDoc(collection(db, "reports"), { reportedEmail, reportedBy: user?.email || "guest", roomId: room.id, timestamp: serverTimestamp() });
      const q = query(collection(db, "users"), where("email", "==", reportedEmail));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) await updateDoc(doc(db, "users", snapshot.docs[0].id), { isFlagged: true });
      triggerToast("User reported.", "success");
    } catch (err) {}
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    try {
      await addDoc(collection(db, "room_tasks"), { roomId: room.id, text: newTaskText.trim(), completed: false, addedBy: safeUsername, createdAt: serverTimestamp() });
      setNewTaskText("");
    } catch (err) { triggerToast("Error adding task", "error"); }
  };
  const handleToggleTask = async (taskId, currentStatus) => { try { await updateDoc(doc(db, "room_tasks", taskId), { completed: !currentStatus }); } catch (err) {} };
  const handleDeleteTask = async (taskId) => { try { await deleteDoc(doc(db, "room_tasks", taskId)); } catch (err) {} };
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const taskProgressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const handlePresentResource = async (resource) => { if (isHost) await updateDoc(roomRef, { activeResource: resource }); };
  const handleStopPresentation = async () => { if (isHost) await updateDoc(roomRef, { activeResource: null }); };
  const handleApproveResource = async (resourceId) => { if (!isHost) return; try { await updateDoc(doc(db, "room_resources", resourceId), { approved: true }); } catch (err) {} };
  const handleDeleteResource = async (resourceId) => { try { await deleteDoc(doc(db, "room_resources", resourceId)); if (activeResource && activeResource.id === resourceId) handleStopPresentation(); } catch (err) {} };
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
    e.target.value = "";
  };
  const triggerFileInput = () => { if (fileInputRef.current) fileInputRef.current.click(); };

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    const prompt = aiInput.trim();
    if (!prompt) return;

    setAiMessages(prev => [...prev, { role: "user", content: prompt }]);
    setAiInput("");
    setIsAiLoading(true);

    const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
    if (!API_KEY) {
      setAiMessages(prev => [...prev, { role: "assistant", content: "AI key missing. Add VITE_GROQ_API_KEY to your .env." }]);
      setIsAiLoading(false);
      return;
    }

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      setAiMessages(prev => [...prev, { role: "assistant", content: aiResponse }]);
    } catch (err) {
      console.error(err);
      setAiMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't get a response. Try again in a moment." }]);
    } finally {
      setIsAiLoading(false);
    }
  };

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
        } catch (err) {}
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
          triggerToast("Correct!", "success");
        } else { triggerToast("Incorrect answer.", "error"); }
        lastScoredIndex.current = activeQuiz.currentIndex;
      }
    }
  }, [activeQuiz?.isRevealed, selectedOption, quizDeckData, activeQuiz?.currentIndex]);

  useEffect(() => { setSelectedOption(null); }, [activeQuiz?.currentIndex]);

  const startLiveQuiz = async (deck) => {
    if (!deck.cards || deck.cards.length === 0) return triggerToast("Deck is empty!", "error");
    try { await updateDoc(roomRef, { activeQuiz: { deckId: deck.id, currentIndex: 0, isRevealed: false } }); setShowQuizPicker(false); }
    catch (err) {}
  };
  const stopLiveQuiz = async () => { if (!isHost) return; try { await updateDoc(roomRef, { activeQuiz: null }); } catch (err) {} };
  const nextQuizQuestion = async () => {
    if (!isHost || !quizDeckData || !activeQuiz) return;
    if (activeQuiz.currentIndex < quizDeckData.cards.length - 1) {
      try { await updateDoc(roomRef, { "activeQuiz.currentIndex": activeQuiz.currentIndex + 1, "activeQuiz.isRevealed": false }); } catch (err) {}
    } else { stopLiveQuiz(); triggerToast("Quiz Finished!", "success"); }
  };
  const revealAnswer = async () => { if (!isHost || !activeQuiz) return; try { await updateDoc(roomRef, { "activeQuiz.isRevealed": true }); } catch (err) {} };

  const currentQuizCard = quizDeckData?.cards?.[activeQuiz?.currentIndex];
  const isPresenting = !!(activeQuiz || activeResource);

  const bottomZoneProps = {
    safeUsername, myVideoRef, camOn, micOn, buddies, remoteStreams, user,
    isHost, activeQuiz, timerData, setShowTimerModal, toggleMic, toggleCamera,
    toggleSidePanel, showTasks, showFiles, showChat, setShowQuizPicker,
    onHoverChange: setIsBottomHovered,
    hostMutedMicUids, onHostMuteToggle: hostMuteToggle,
  };

  // ─────────────────────────── LOBBY ───────────────────────────
  if (!sessionStarted) {
    return (
      <div className="flex min-h-screen relative overflow-hidden items-center justify-center p-4 font-sans">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50"></div>
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl border border-white/50 relative z-10 animate-slideUp">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">{room.name}</h2>
            <p className="text-gray-500 font-medium">Study Buddy Match Lobby</p>
          </div>
          <div className="mb-8">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block ml-2">Invite Friends</label>
            <div className="bg-gray-50 rounded-2xl p-2 flex items-center justify-between gap-3 border border-gray-200 pl-4">
              <span className="text-sm truncate flex-1 text-gray-600 font-medium">{inviteLink}</span>
              <button onClick={copyLink} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md ${copied ? "bg-green-500 text-white" : "bg-white text-blue-600 hover:bg-blue-50"}`}>{copied ? <FaCheck /> : <FaCopy />}</button>
            </div>
          </div>
          <div className="mb-8">
            <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-green-200"></span> Participants ({buddies.length})
            </h3>
            <div className="bg-gray-50/80 rounded-2xl p-4 max-h-48 overflow-y-auto border border-gray-100 space-y-2">
              {buddies.map((b) => (
                <div key={b.uid} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold shadow-md shrink-0">{(b.username || "S").charAt(0).toUpperCase()}</div>
                    <span className="font-semibold text-gray-700 text-sm truncate">{b.username || "Student"}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {b.uid === room.createdBy && <span className="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-1 rounded-md font-extrabold uppercase tracking-wide">Host</span>}
                    {isHost && b.uid !== user.uid && (
                      <button
                        type="button"
                        onClick={() => hostMuteToggle(b.uid)}
                        className={`p-2 rounded-lg border transition ${hostMutedMicUids?.[b.uid] ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-100"}`}
                        title={hostMutedMicUids?.[b.uid] ? `Allow ${b.username || "participant"} to unmute` : `Mute ${b.username || "participant"}`}
                      >
                        {hostMutedMicUids?.[b.uid] ? <FaMicrophoneSlash /> : <FaMicrophone />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {isHost ? (
              <button onClick={startSession} disabled={buddies.length === 0} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                <FaPlay size={16} /> Start Collaboration
              </button>
            ) : (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl px-6 py-4 text-center text-blue-700 font-medium animate-pulse">Waiting for host to begin...</div>
            )}
            <button onClick={handleLeaveRoom} className="w-full bg-white border border-red-100 text-red-500 py-4 rounded-2xl font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2">
              <FaSignOutAlt /> Leave Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────── ACTIVE SESSION ───────────────────────────
  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden relative font-sans">

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirmDialog && <ConfirmModal title={confirmDialog.title} message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={confirmDialog.onCancel} />}
      {isHost && showTimerModal && <TimerSetupModal onClose={() => setShowTimerModal(false)} onSave={handleSaveTimerConfig} />}
      


      {showQuizPicker && isHost && (
        <div className="absolute inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl text-gray-900">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2"><FaBrain className="text-purple-500" /> Start Live Quiz</h2>
              <button onClick={() => setShowQuizPicker(false)} className="text-gray-400 hover:text-gray-800"><FaTimes /></button>
            </div>
            {hostDecks.length === 0 ? (
              <p className="text-gray-500 text-center py-6">You haven't created any flashcard decks yet.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {hostDecks.map(deck => (
                  <button key={deck.id} onClick={() => startLiveQuiz(deck)} className="w-full text-left bg-gray-50 hover:bg-purple-50 hover:border-purple-200 border border-gray-200 p-4 rounded-xl transition flex justify-between items-center group">
                    <div>
                      <p className="font-bold group-hover:text-purple-700">{deck.title}</p>
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

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-black min-w-0">

        {/* top bar */}
        <div className="absolute top-0 left-0 w-full p-4 z-[60] flex justify-between items-center pointer-events-none">
          <div className="pointer-events-auto bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-3 shadow-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <h3 className="font-bold text-sm">{room.name}</h3>
          </div>

          {timerData?.isConfigured && !activeQuiz && (
            <div className="pointer-events-auto bg-black/50 backdrop-blur-xl border border-white/20 px-5 py-2 rounded-full flex items-center gap-2.5 shadow-xl">
              {timerData.mode === 'work' ? <FaBolt className="text-yellow-400" style={{ fontSize: 13 }} /> : <FaCoffee className="text-green-400" style={{ fontSize: 13 }} />}
              <span className="text-lg font-mono font-bold tabular-nums">
                {Math.floor((timerData?.timeLeft || 0) / 60)}:{String((timerData?.timeLeft || 0) % 60).padStart(2, "0")}
              </span>
            </div>
          )}

          <div className="pointer-events-auto flex items-center gap-3">
            <div className="bg-black/50 backdrop-blur-md px-3 py-2 rounded-full flex items-center gap-2 border border-white/10 text-sm">
              <FaEye className="text-blue-400" style={{ fontSize: 12 }} /> {buddies.length}
            </div>
            <button onClick={handleLeaveRoom} className="p-2.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full backdrop-blur-md shadow-lg transition-transform hover:scale-105 border border-red-500/50">
              {isHost ? <FaPowerOff size={14} /> : <FaSignOutAlt size={14} />}
            </button>
          </div>
        </div>

        {peerError && (
          <div className="absolute top-24 right-4 z-[70] pointer-events-auto bg-red-500/90 text-white px-4 py-3 rounded-3xl shadow-2xl border border-red-400">
            {peerError}
          </div>
        )}

        {showDistractionAlert && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[70] animate-bounce">
            <div className="bg-red-500/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-400">
              <FaExclamationTriangle />
              <div>
                <h3 className="font-bold uppercase tracking-wider text-xs">Distraction Detected</h3>
                <p className="font-mono text-lg leading-none">Tab Switched: {distractionCount}x</p>
              </div>
            </div>
          </div>
        )}

        <BreakOverlay isBreak={timerData?.mode === 'break' && timerData?.isConfigured} timeLeft={timerData?.timeLeft || 0} />

        {/* ── QUIZ MODE ── */}
        {activeQuiz && currentQuizCard ? (
          <div
            className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden bg-gray-900 pt-20 transition-all duration-300"
            style={{ paddingBottom: isBottomHovered ? 350 : 120 }}
          >
            <div className="flex flex-col items-center mb-6 z-10">
              <div className="bg-purple-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest animate-pulse shadow-lg mb-2">Live Group Quiz</div>
              <p className="text-gray-400 font-bold text-sm bg-black/50 px-4 py-1 rounded-full border border-white/10">
                {quizDeckData.title} — Question {activeQuiz.currentIndex + 1} of {quizDeckData.cards.length}
              </p>
            </div>
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full border-b-8 border-blue-500 z-10 text-gray-900">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">{currentQuizCard.front}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuizCard.options ? currentQuizCard.options.map((opt, i) => {
                  let btnClass = "bg-gray-50 border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50";
                  if (activeQuiz.isRevealed) {
                    if (opt === currentQuizCard.back) btnClass = "bg-green-100 border-green-500 text-green-800 font-bold";
                    else if (selectedOption === opt) btnClass = "bg-red-100 border-red-500 text-red-800 line-through";
                    else btnClass = "bg-gray-100 border-gray-200 text-gray-400 opacity-50";
                  } else if (selectedOption === opt) { btnClass = "bg-blue-500 border-blue-600 text-white font-bold shadow-md"; }
                  return (
                    <button key={i} disabled={isHost || activeQuiz.isRevealed} onClick={() => setSelectedOption(opt)} className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${btnClass} ${isHost ? 'cursor-default' : ''}`}>
                      <div className="flex justify-between items-center">
                        <span>{opt}</span>
                        {activeQuiz.isRevealed && opt === currentQuizCard.back && <FaCheckIcon className="text-green-600" />}
                        {activeQuiz.isRevealed && selectedOption === opt && opt !== currentQuizCard.back && <FaTimesCircle className="text-red-500" />}
                      </div>
                    </button>
                  );
                }) : <p className="col-span-full text-center text-gray-400">Wait for host to reveal answer.</p>}
              </div>
              {!isHost && !activeQuiz.isRevealed && <p className="text-center text-gray-400 text-sm mt-6 animate-pulse">Select an answer...</p>}
            </div>

            {isHost && (
              <div
                className="absolute flex gap-4 bg-black/60 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-2xl z-20 transition-all duration-300"
                style={{ bottom: isBottomHovered ? 280 : 140 }}
              >
                {!activeQuiz.isRevealed ? (
                  <button onClick={revealAnswer} className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-400 transition flex items-center gap-2"><FaCheckIcon /> Reveal</button>
                ) : (
                  <button onClick={nextQuizQuestion} className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-400 transition flex items-center gap-2">Next <FaPlay /></button>
                )}
                <div className="w-px bg-white/20 mx-2"></div>
                <button onClick={stopLiveQuiz} className="px-4 py-3 bg-red-500/20 hover:bg-red-500 text-white rounded-xl font-bold transition flex items-center gap-2">End Quiz</button>
              </div>
            )}

            <PresentingBottomZone {...bottomZoneProps} />
          </div>

        ) : activeResource ? (
          <div className="w-full h-full flex flex-col bg-gray-900 pt-14">
            <div className="h-11 bg-black/60 backdrop-blur flex items-center justify-between px-5 border-b border-white/10 relative z-30 shrink-0">
              <span className="font-bold text-sm flex items-center gap-2"><FaDesktop className="text-blue-400" style={{ fontSize: 12 }} /> Shared Resource</span>
              {isHost && <button onClick={handleStopPresentation} className="text-xs font-bold bg-red-600 px-4 py-1.5 rounded-lg hover:bg-red-500 transition">Stop</button>}
            </div>
            <div
              className="flex-1 flex items-center justify-center bg-black/40 overflow-hidden transition-all duration-300"
              style={{ paddingBottom: isBottomHovered ? 168 : 0 }}
            >
              {activeResource.type?.includes("image")
                ? <img src={activeResource.data} className="max-w-full max-h-full object-contain rounded-xl" alt="shared" />
                : activeResource.type === "link"
                  ? <a href={activeResource.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-2xl font-bold">{activeResource.url}</a>
                  : <iframe src={activeResource.data} className="w-full h-full bg-white rounded-xl" title="resource" />}
            </div>

            <PresentingBottomZone {...bottomZoneProps} />
          </div>

        ) : (
          <div className="absolute inset-0 pt-16 pb-24">
            <VideoGrid
              myVideoRef={myVideoRef}
              camOn={camOn}
              safeUsername={safeUsername}
              buddies={buddies}
              remoteStreams={remoteStreams}
              user={user}
              isHost={isHost}
              hostMutedMicUids={hostMutedMicUids}
              onHostMuteToggle={hostMuteToggle}
            />
          </div>
        )}

        {/* ── CONTROL DOCK ── */}
        {!isPresenting && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[100] p-2.5 bg-black/70 backdrop-blur-2xl rounded-3xl border border-white/10 flex gap-2 sm:gap-3 shadow-2xl w-max">
            {isHost && (
              <>
                {!activeQuiz && <ControlButton onClick={() => setShowQuizPicker(true)} icon={<FaBrain className="text-purple-400" />} label="Live Quiz" variant="default" />}
                <div className="w-px bg-white/10 mx-1 hidden sm:block"></div>
                <ControlButton
                  onClick={() => !timerData?.isConfigured && setShowTimerModal(true)}
                  disabled={timerData?.isConfigured}
                  icon={<FaStopwatch />}
                  label="Timer"
                  variant={timerData?.isConfigured ? "success" : "primary"}
                />
                <div className="w-px bg-white/10 mx-1 hidden sm:block"></div>
              </>
            )}
            <ControlButton
              onClick={toggleMic}
              active={micOn && !hostMutedMicUids?.[user.uid]}
              variant="toggle"
              icon={hostMutedMicUids?.[user.uid] ? <FaMicrophoneSlash /> : micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
              label={hostMutedMicUids?.[user.uid] ? "Muted by host" : "Mic"}
              disabled={!!hostMutedMicUids?.[user.uid]}
            />
            <ControlButton onClick={toggleCamera} active={camOn} variant="toggle" icon={camOn ? <FaVideo /> : <FaVideoSlash />} label="Camera" />
            <div className="w-px bg-white/10 mx-1 sm:mx-2"></div>
            <ControlButton onClick={() => toggleSidePanel("tasks")} active={showTasks} icon={<FaTasks />} label="Goals" />
            <ControlButton onClick={() => toggleSidePanel("files")} active={showFiles} icon={<FaPaperclip />} label="Resources" />
            <ControlButton onClick={() => toggleSidePanel("chat")} active={showChat} icon={<FaCommentDots />} label="Chat" />
          </div>
        )}
      </div>

      {/* ── RIGHT SIDEBAR ── */}
      {(showChat || showFiles || showTasks) && (
        <div className="w-80 md:w-96 bg-white flex flex-col shadow-2xl border-l border-gray-200 relative z-[80] animate-slideLeft text-gray-900 shrink-0">

          {showChat && (
            <>
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
                <h3 className="font-bold text-lg flex items-center gap-2"><FaCommentDots className="text-blue-500" /> Group Chat</h3>
                <button onClick={() => setShowChat(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition"><FaTimes /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
                {messages.map((msg) => {
                  const safeUserEmail = user?.email || "hidden-email@student.com";
                  const isMe = msg.sender === safeUserEmail;
                  return (
                    <div key={msg.id} className={`flex flex-col mb-2 ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`flex items-center gap-1.5 mb-1 text-[10px] font-bold ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        <span className="text-gray-500">{msg.senderName || "Student"}</span>
                        {msg.senderRole === "admin" && <span className="bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded uppercase flex items-center gap-1"><FaCrown size={8} /> Admin</span>}
                        {msg.isHost && <span className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded uppercase flex items-center gap-1"><FaMicrophone size={8} /> Host</span>}
                      </div>
                      <div className={`flex items-center gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        {!isMe && msg.senderRole !== "admin" && (
                          <button onClick={() => handleReportUser(msg.sender)} className="text-gray-300 hover:text-red-500 transition" title="Report User"><FaFlag size={10} /></button>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] shadow-sm ${isMe ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-tr-none' : 'bg-white border text-gray-700 rounded-tl-none'}`}>
                          <div className="text-sm leading-relaxed">{msg.text}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-white flex gap-2">
                <input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Type a message..." className="flex-1 px-5 py-3 bg-gray-50 border border-gray-200 rounded-full outline-none focus:border-blue-500 text-sm transition" />
                <button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3.5 rounded-full hover:shadow-lg transition transform active:scale-95"><FaPaperPlane /></button>
              </form>
            </>
          )}

          {showFiles && (
            <>
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
                <h3 className="text-xl font-bold flex items-center gap-2"><FaPaperclip className="text-blue-500" /> Resources</h3>
                <button onClick={() => setShowFiles(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition"><FaTimes /></button>
              </div>
              <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-gray-50/50">
                {isHost && resources.filter(r => !r.approved).map(res => (
                  <div key={res.id} className="bg-orange-50 p-4 rounded-xl border border-orange-200 mb-3">
                    <span className="text-sm font-bold truncate block mb-2">{res.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => handleApproveResource(res.id)} className="bg-green-100 text-green-600 px-3 py-1 rounded text-xs font-bold">Approve</button>
                      <button onClick={() => triggerConfirm(
                        "Delete Resource",
                        "Are you sure you want to remove this pending resource?",
                        () => handleDeleteResource(res.id)
                      )} className="bg-red-100 text-red-500 px-3 py-1 rounded text-xs font-bold">Reject</button>
                    </div>
                  </div>
                ))}
                {resources.filter(r => r.approved).length === 0 && <p className="text-center text-gray-400 mt-10 text-sm">No resources shared yet.</p>}
                {resources.filter(r => r.approved).map(res => (
                  <div key={res.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600">{res.type === 'link' ? <FaLink /> : <FaFilePdf />}</div>
                      <span className="text-sm font-bold truncate w-28 md:w-32">{res.name}</span>
                    </div>
                    <div className="flex gap-2">
                      {isHost && <button onClick={() => handlePresentResource(res)} className="text-gray-400 hover:text-blue-600 transition"><FaEye /></button>}
                      {isHost && (
                        <button onClick={() => triggerConfirm(
                          "Delete Resource",
                          "Are you sure you want to delete this resource permanently?",
                          () => handleDeleteResource(res.id)
                        )} className="text-gray-400 hover:text-red-500 transition"><FaTrash /></button>
                      )}
                      {res.type === 'link'
                        ? <a href={res.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600 transition"><FaExternalLinkAlt /></a>
                        : <a href={res.data} download={res.name} className="text-gray-400 hover:text-blue-600 transition"><FaDownload /></a>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-100 bg-white">
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf" />
                <button onClick={triggerFileInput} disabled={isUploading} className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3 rounded-xl font-bold hover:shadow-lg transition flex items-center justify-center gap-2 text-xs disabled:opacity-70 mb-4">
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FaCloudUploadAlt /> Upload File (Images, PDF)
                    </>
                  )}
                </button>
                <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold">Study Buddy AI</p>
                      <p className="text-xs text-gray-500">Your AI Study Companion</p>
                    </div>
                    <span className="text-xs font-semibold text-blue-600">Assistant</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-3 pb-2 border-b border-gray-100 mb-3">
                    {aiMessages.map((msg, index) => (
                      <div key={index} className={`rounded-2xl p-3 ${msg.role === 'user' ? 'bg-blue-600 text-white self-end' : 'bg-gray-100 text-gray-800'}`}>
                        <div className="text-[10px] uppercase tracking-[0.18em] mb-1 opacity-70">{msg.role === 'user' ? 'You' : 'Assistant'}</div>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAiSubmit} className="flex gap-2">
                    <input
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder="Ask the study buddy assistant..."
                      disabled={isAiLoading}
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={isAiLoading}
                      className="bg-blue-600 text-white px-4 py-3 rounded-2xl font-semibold shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {isAiLoading ? "Thinking..." : "Ask"}
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}

          {showTasks && (
            <>
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
                <h3 className="font-bold text-lg flex items-center gap-2"><FaTasks className="text-blue-500" /> Session Goals</h3>
                <button onClick={() => setShowTasks(false)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition"><FaTimes /></button>
              </div>
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                <div className="flex justify-between text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
                  <span>Group Progress</span>
                  <span className={taskProgressPercent === 100 ? "text-green-600" : "text-blue-600"}>{taskProgressPercent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${taskProgressPercent === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${taskProgressPercent}%` }}></div>
                </div>
              </div>
              <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-gray-50/50">
                {tasks.length === 0 ? (
                  <div className="text-center text-gray-400 mt-10">
                    <FaTasks className="mx-auto text-4xl mb-3 text-gray-300" />
                    <p className="text-sm font-medium">No goals set yet. Add one below!</p>
                  </div>
                ) : (
                  tasks.map(task => (
                    <div key={task.id} className={`bg-white p-4 rounded-xl shadow-sm border group flex items-start gap-3 transition-colors ${task.completed ? 'border-green-200 bg-green-50/50' : 'border-gray-200 hover:border-blue-300'}`}>
                      <input type="checkbox" checked={task.completed} onChange={() => handleToggleTask(task.id, task.completed)} className="mt-1 text-blue-600 rounded cursor-pointer w-4 h-4 border-gray-300 focus:ring-blue-500" />
                      <div className="flex-1">
                        <p className={`text-sm font-semibold transition-all ${task.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.text}</p>
                        <p className="text-[10px] text-gray-400 mt-1 font-medium">Added by {task.addedBy}</p>
                      </div>
                      {(isHost || task.addedBy === safeUsername) && (
                        <button onClick={() => handleDeleteTask(task.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1"><FaTrash size={13} /></button>
                      )}
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleAddTask} className="p-4 border-t border-gray-100 bg-white flex gap-2">
                <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)} placeholder="Add a shared goal..." className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all text-sm" />
                <button className="bg-gray-900 text-white px-5 rounded-xl font-bold text-sm shadow-md hover:bg-gray-800 hover:scale-105 transition-all">Add</button>
              </form>
            </>
          )}
        </div>
      )}

      <style>{`
        .animate-slideDown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px) translateX(-50%); } to { opacity: 1; transform: translateY(0) translateX(-50%); } }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideLeft { animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
