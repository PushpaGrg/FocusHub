import { useState, useEffect, useRef } from "react";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaCommentDots, FaCopy, FaCheck, FaSignOutAlt, FaPlay, FaPause, FaUndo, FaExclamationTriangle } from "react-icons/fa";
import { db } from "../firebase";
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, addDoc, query, orderBy, deleteDoc, setDoc, getDoc } from "firebase/firestore";
import Peer from "peerjs";
import { containsSpam } from "../utils/spamDetection";

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
        timer: {
          timeLeft: nextMode === "work" ? 1500 : 300,
          isRunning: false,
          mode: nextMode
        }
      });
    }
    return () => clearInterval(interval);
  }, [isHost, timerData.isRunning, timerData.timeLeft]);

  // --- ROOM LOGIC ---
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
    const userData = {
      uid: user.uid,
      username: user.username || user.email.split("@")[0],
      email: user.email,
      joinedAt: new Date(),
    };
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

  // --- CHAT & SPAM LOGIC ---
  useEffect(() => {
    if (!sessionStarted) return;
    const q = query(collection(roomRef, "messages"), orderBy("timestamp", "asc"));
    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [room.id, sessionStarted]);

  // FIXED: Standard leave logic (No permanent ban)
  const leaveSession = async () => { 
    try {
      const userData = {
        uid: user.uid,
        username: user.username || user.email.split("@")[0],
        email: user.email,
      };
      const snap = await getDoc(roomRef);
      if (snap.exists()) {
        if (isHost) {
          await deleteDoc(roomRef);
        } else {
          await updateDoc(roomRef, { participants: arrayRemove(userData) });
        }
      }
      await deleteDoc(doc(roomRef, "peers", user.uid)).catch(() => {});
    } catch (err) {
      console.error("Leave error:", err);
    }
    onBack(); 
  };

  // FIXED: Kick logic with Cooldown
  const sendMessage = async () => {
    const trimmedMsg = newMessage.trim();
    if (!trimmedMsg) return;

    if (containsSpam(trimmedMsg)) {
      const newWarningCount = spamWarnings + 1;
      
      if (newWarningCount >= 3) {
        // Set cooldown timestamp (Current time + 60 seconds)
        const cooldownUntil = Date.now() + 60000;
        localStorage.setItem(`cooldown_${room.id}`, cooldownUntil);
        
        alert("❌ You have been kicked for spamming. You can re-join in 60 seconds.");
        leaveSession();
        return;
      }

      setSpamWarnings(newWarningCount);
      setNewMessage("");
      alert(`⚠️ Spam detected! Warning ${newWarningCount}/3. One more and you will be kicked.`);
      return;
    }

    await addDoc(collection(roomRef, "messages"), {
      senderId: user.uid,
      username: user.username || user.email.split("@")[0],
      text: trimmedMsg,
      timestamp: new Date(),
    });
    setNewMessage("");
  };

  // --- VIDEO/PEER LOGIC ---
  useEffect(() => {
    if (!sessionStarted) return;
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (myVideoRef.current) myVideoRef.current.srcObject = stream;
        const peer = new Peer(user.uid, {
          host: "0.peerjs.com",
          port: 443,
          secure: true,
          config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }
        });
        peerRef.current = peer;
        peer.on("open", async (id) => {
          setPeerReady(true);
          await setDoc(doc(roomRef, "peers", user.uid), {
            peerId: id, 
            userId: user.uid,
            timestamp: Date.now() 
          });
        });
        peer.on("call", (call) => {
          call.answer(localStreamRef.current);
          call.on("stream", (remoteStream) => {
            setRemoteStreams(prev => ({ ...prev, [call.peer]: remoteStream }));
          });
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
                  call.on("stream", (remoteStream) => {
                    setRemoteStreams(prev => ({ ...prev, [data.userId]: remoteStream }));
                  });
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

  if (!sessionStarted) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-white/20">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{room.name}</h2>
            <p className="text-gray-300 text-sm">Pre-Session Lobby</p>
          </div>
          <div className="mb-6">
            <label className="text-sm font-semibold text-gray-300 mb-2 block">Invite Link</label>
            <div className="bg-black/40 rounded-xl px-4 py-3 flex items-center justify-between gap-3 border border-white/10">
              <span className="text-sm truncate flex-1 text-gray-200">{inviteLink}</span>
              <button onClick={copyLink} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-all flex items-center gap-2">
                {copied ? <><FaCheck /> Copied</> : <><FaCopy /> Copy</>}
              </button>
            </div>
          </div>
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Participants ({buddies.length})
            </h3>
            <div className="bg-black/30 rounded-xl p-4 max-h-48 overflow-y-auto border border-white/10">
              <ul className="space-y-2">
                {buddies.map((b) => (
                  <li key={b.uid} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold">{b.username?.charAt(0).toUpperCase()}</div>
                      <span className="font-medium">{b.username}</span>
                    </div>
                    {b.uid === room.createdBy && <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded-full font-semibold">Host</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="space-y-3">
            {isHost ? (
              <button onClick={startSession} disabled={buddies.length === 0} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 py-3 rounded-xl font-semibold text-lg shadow-lg transition-all">▶ Start Session</button>
            ) : (
              <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl px-4 py-3 text-center text-blue-200 text-sm">Waiting for host...</div>
            )}
            <button onClick={leaveSession} className="w-full bg-red-600/80 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"><FaSignOutAlt /> {isHost ? "End Room" : "Leave Room"}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden relative">
      <div className="flex-1 flex flex-col relative">
        <div className="bg-gray-800 px-4 py-3 flex justify-between items-center border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <h3 className="font-semibold">{room.name}</h3>
          </div>
          <button onClick={leaveSession} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2"><FaSignOutAlt /> {isHost ? "End" : "Leave"}</button>
        </div>

        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-black/40 backdrop-blur-md border border-white/20 p-1 rounded-2xl flex items-center shadow-xl">
            <div className="px-6 py-1 text-center border-r border-white/10">
              <p className={`text-[10px] uppercase font-black tracking-widest ${timerData.mode === 'work' ? 'text-blue-400' : 'text-green-400'}`}>
                {timerData.mode === 'work' ? 'Focus' : 'Break'}
              </p>
              <h2 className="text-2xl font-mono font-bold leading-none tabular-nums">
                {Math.floor(timerData.timeLeft / 60)}:{String(timerData.timeLeft % 60).padStart(2, "0")}
              </h2>
            </div>
            {isHost && (
              <div className="flex gap-1 px-2">
                <button 
                  onClick={() => updateDoc(roomRef, { "timer.isRunning": !timerData.isRunning })}
                  className="p-2 hover:bg-white/10 rounded-lg text-blue-400 transition"
                >
                  {timerData.isRunning ? <FaPause size={14}/> : <FaPlay size={14}/>}
                </button>
                <button 
                  onClick={() => updateDoc(roomRef, { "timer.timeLeft": timerData.mode === 'work' ? 1500 : 300, "timer.isRunning": false })}
                  className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition"
                >
                  <FaUndo size={12}/>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 bg-gray-950 p-4 overflow-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            <div className="relative bg-gray-800 rounded-xl overflow-hidden shadow-lg aspect-video">
              <video ref={myVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">{user.username} (You)</div>
              {!videoOn && (
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-3xl font-bold">{user.username?.charAt(0).toUpperCase()}</div>
                </div>
              )}
            </div>
            {buddies.filter(b => b.uid !== user.uid).map((buddy) => (
              <RemoteVideo key={buddy.uid} buddy={buddy} stream={remoteStreams[buddy.uid]} />
            ))}
          </div>
        </div>

        <div className="bg-gray-800 px-4 py-4 flex justify-center items-center gap-3 border-t border-gray-700">
          <button onClick={toggleMic} className={`p-4 rounded-full transition-all ${micOn ? 'bg-gray-700' : 'bg-red-600'}`}>{micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}</button>
          <button onClick={toggleVideo} className={`p-4 rounded-full transition-all ${videoOn ? 'bg-gray-700' : 'bg-red-600'}`}>{videoOn ? <FaVideo /> : <FaVideoSlash />}</button>
          <button onClick={() => setShowChat(!showChat)} className={`p-4 rounded-full transition-all ${showChat ? 'bg-blue-600' : 'bg-gray-700'}`}><FaCommentDots /></button>
        </div>
      </div>

      {showChat && (
        <div className="w-80 bg-gray-800 flex flex-col border-l border-gray-700 relative z-10">
          <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold text-lg">Chat</h3>
            <button onClick={() => setShowChat(false)}>✕</button>
          </div>

          {spamWarnings > 0 && (
            <div className={`mx-4 mt-3 px-3 py-2 rounded-lg border flex items-center gap-3 transition-all animate-pulse ${
              spamWarnings === 1 ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' : 'bg-red-500/10 border-red-500/50 text-red-500'
            }`}>
              <FaExclamationTriangle className="flex-shrink-0" />
              <div className="text-xs font-bold uppercase tracking-wider">
                Warnings: {spamWarnings} / 3
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-lg px-3 py-2 ${msg.senderId === user.uid ? 'bg-blue-600' : 'bg-gray-700'}`}>
                  <div className="text-xs font-semibold mb-1 opacity-80">{msg.username}</div>
                  <div className="text-sm break-words">{msg.text}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Type a message..." className="flex-1 px-3 py-2 rounded-lg bg-gray-700 focus:outline-none" />
              <button onClick={sendMessage} className="bg-blue-600 px-4 py-2 rounded-lg">Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RemoteVideo({ buddy, stream }) {
  const videoRef = useRef();
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play().catch(e => console.error("Auto-play failed:", e));
      };
    }
  }, [stream]);

  return (
    <div className="relative bg-gray-800 rounded-xl overflow-hidden shadow-lg aspect-video">
      <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${!stream ? 'hidden' : 'block'}`} />
      {!stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
          <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold mb-2 animate-pulse">{buddy.username?.charAt(0).toUpperCase()}</div>
          <p className="text-gray-500 text-xs">Waiting for video...</p>
        </div>
      )}
      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">{buddy.username}</div>
    </div>
  );
}