import { useState, useEffect, useRef } from "react";
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaCommentDots, FaCopy, FaCheck, FaSignOutAlt } from "react-icons/fa";
import { db } from "../firebase";
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, addDoc, query, orderBy, deleteDoc, writeBatch, getDocs, setDoc, getDoc } from "firebase/firestore";
import Peer from "peerjs";

export default function StudyBuddyRoom({ room, user, onBack }) {
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

  const myVideoRef = useRef();
  const peersRef = useRef({}); 
  const peerRef = useRef();
  const localStreamRef = useRef();

  const isHost = user.uid === room.createdBy;
  const roomRef = doc(db, "studyRooms", room.id);
  const inviteLink = `${window.location.origin}/join/${room.id}`;

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

  useEffect(() => {
    if (!sessionStarted) return;
    const q = query(collection(roomRef, "messages"), orderBy("timestamp", "asc"));
    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [room.id, sessionStarted]);

  // PeerJS & Media Initialization
  useEffect(() => {
    if (!sessionStarted) return;

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }

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
            // Trigger state update with a fresh object reference
            setRemoteStreams(prev => ({ ...prev, [call.peer]: remoteStream }));
          });
        });

      } catch (err) {
        alert("Camera/Mic access denied.");
      }
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
              }, 2000); // 2 second delay to ensure newcomer is fully ready
            }
          }
        }
      });
    });
    return unsubscribe;
  }, [sessionStarted, peerReady]);

  // UI Handlers
  const startSession = () => updateDoc(roomRef, { sessionStarted: true });
  const copyLink = () => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    await addDoc(collection(roomRef, "messages"), {
      senderId: user.uid,
      username: user.username || user.email.split("@")[0],
      text: newMessage.trim(),
      timestamp: new Date(),
    });
    setNewMessage("");
  };

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !micOn; setMicOn(!micOn); }
  };

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !videoOn; setVideoOn(!videoOn); }
  };

  const leaveSession = async () => {
    if (isHost) await deleteDoc(roomRef);
    onBack();
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
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      <div className="flex-1 flex flex-col">
        <div className="bg-gray-800 px-4 py-3 flex justify-between items-center border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <h3 className="font-semibold">{room.name}</h3>
          </div>
          <button onClick={leaveSession} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2"><FaSignOutAlt /> {isHost ? "End" : "Leave"}</button>
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
        <div className="w-80 bg-gray-800 flex flex-col border-l border-gray-700">
          <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center"><h3 className="font-semibold text-lg">Chat</h3><button onClick={() => setShowChat(false)}>✕</button></div>
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
      // Force play because some browsers block auto-play until explicitly told
      video.onloadedmetadata = () => {
        video.play().catch(e => console.error("Auto-play failed:", e));
      };
    }
  }, [stream]);

  return (
    <div className="relative bg-gray-800 rounded-xl overflow-hidden shadow-lg aspect-video">
      {/* Video is always rendered but visible only when stream exists */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className={`w-full h-full object-cover ${!stream ? 'hidden' : 'block'}`} 
      />
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