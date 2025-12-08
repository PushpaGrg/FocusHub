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
import SimplePeer from "simple-peer";
import { useAuthState } from "react-firebase-hooks/auth";

export default function RoomMessages({ room, onBack }) {
  const [user, loading] = useAuthState(auth);
  const isHost = (room?.createdBy && user?.uid && room.createdBy === user.uid) || room?.isHost;

  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [viewers, setViewers] = useState(Math.floor(Math.random() * 150 + 30));
  const [reactions, setReactions] = useState([]);
  const [streamLive, setStreamLive] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);

  const peersRef = useRef([]);
  const remoteStreamsRef = useRef({});
  const localVideoRef = useRef(null);
  const chatEndRef = useRef(null);
  const signalingRef = collection(db, "webrtcSignals");
  const viewerIdRef = useRef(user ? `${user.uid}_${Date.now()}` : null);

  useEffect(() => {
    if (!room?.id) return;
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .filter((d) => d.data().roomId === room.id)
        .map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
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

  const sendReaction = (emoji) => {
    const id = Date.now();
    setReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 2000);
  };

  const handleStartStream = async () => {
    if (!user?.uid) {
      alert("User not authenticated.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;
      setStreamLive(true);
      setCamOn(true);
      setMicOn(true);

      const unsubscribe = onSnapshot(signalingRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          const data = change.doc.data();
          if (!data?.viewerId || data.type !== "viewer") return;
          const viewerId = data.viewerId;
          if (peersRef.current.find(p => p.viewerId === viewerId)) return;

          const peer = new SimplePeer({ initiator: true, trickle: false, stream });
          peer.viewerId = viewerId;

          peer.on("signal", async (signal) => {
            if (!signal) return;
            try {
              await setDoc(doc(db, "webrtcSignals", viewerId), {
                ...data,
                hostSignal: signal,
                userId: data.userId,
                viewerId: data.viewerId,
                hostId: room.createdBy
              }, { merge: true });
            } catch (err) {
              console.error("Error sending host signal:", err);
            }
          });

          onSnapshot(doc(db, "webrtcSignals", viewerId), (docSnap) => {
            const updated = docSnap.data();
            if (updated?.viewerSignal) {
              try {
                peer.signal(updated.viewerSignal);
              } catch (err) {
                console.error("Error applying viewer signal:", err, updated.viewerSignal);
              }
            }
          });

          peersRef.current.push(peer);
        });
      });

      localVideoRef.current.unsubscribeSnapshot = unsubscribe;
    } catch (err) {
      console.error("Error starting stream:", err);
      alert("Failed to start stream.");
    }
  };

  const handleStopStream = () => {
    setStreamLive(false);
    setCamOn(false);
    setMicOn(false);
    peersRef.current.forEach(p => p.destroy());
    peersRef.current = [];
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      localVideoRef.current.srcObject = null;
    }
    if (localVideoRef.current?.unsubscribeSnapshot) {
      localVideoRef.current.unsubscribeSnapshot();
      localVideoRef.current.unsubscribeSnapshot = null;
    }
  };

  useEffect(() => {
    if (isHost || !user?.uid || !room?.id) return;

    const viewerId = viewerIdRef.current;
    if (!viewerId) return;
    const signalDocRef = doc(db, "webrtcSignals", viewerId);

    const joinRoom = async () => {
      try {
        await setDoc(signalDocRef, {
          type: "viewer",
          roomId: room.id,
          viewerId,
          userId: user.uid,
          hostId: room.createdBy
        });

        const unsubscribe = onSnapshot(signalDocRef, (docSnap) => {
          const data = docSnap.data();
          if (!data?.hostSignal) return;
          if (peersRef.current.find(p => p.viewerId === viewerId)) return;

          const peer = new SimplePeer({ initiator: false, trickle: false });

          peer.on("signal", async (signal) => {
            if (!signal) return;
            try {
              await setDoc(signalDocRef, { ...data, viewerSignal: signal }, { merge: true });
            } catch (err) {
              console.error("Error sending viewer signal:", err);
            }
          });

          peer.on("stream", (remoteStream) => {
            remoteStreamsRef.current = { ...remoteStreamsRef.current, [viewerId]: remoteStream };
            // trigger re-render
            setRemoteStreams({ ...remoteStreamsRef.current });
          });

          peer.viewerId = viewerId;
          try {
            peer.signal(data.hostSignal);
          } catch (err) {
            console.error("Error applying host signal:", err, data.hostSignal);
          }

          peersRef.current.push(peer);
        });

        return unsubscribe;
      } catch (err) {
        console.error("Failed to join WebRTC room:", err);
      }
    };

    const unsubPromise = joinRoom();

    return () => {
      handleStopStream();
      unsubPromise?.then(unsub => unsub?.());
      deleteDoc(signalDocRef).catch(() => {});
    };
  }, [isHost, room?.id, user?.uid]);

  const handleEndRoom = async () => {
    if (!confirm("End the stream and delete this room? This cannot be undone.")) return;

    try {
      const msgsQuery = query(collection(db, "messages"), where("roomId", "==", room.id));
      const msgsSnapshot = await getDocs(msgsQuery);
      const batchDeletes = msgsSnapshot.docs.map(docSnap => deleteDoc(doc(db, "messages", docSnap.id)));
      await Promise.all(batchDeletes);

      await deleteDoc(doc(db, "studyRooms", room.id));
      handleStopStream();
      onBack();
    } catch (err) {
      console.error(err);
      alert("Failed to delete the room.");
    }
  };

  if (!user) return <div className="h-screen flex items-center justify-center text-white">Loading...</div>;

  if (isHost) {
    return (
      <div className="flex h-screen bg-gray-900 overflow-hidden">
        {/* Host video and controls */}
        <div className="flex-1 relative flex flex-col">
          <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
            <button onClick={onBack} className="bg-white/10 text-white px-3 py-1 rounded-md hover:bg-white/20">← Exit</button>
            <div className="px-3 py-1 rounded-md bg-black/40 text-white font-medium">Host</div>
            {streamLive ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-red-600 text-white font-bold">● LIVE</div>
            ) : (
              <div className="px-3 py-1 rounded-md bg-yellow-500 text-white font-semibold">Offline</div>
            )}
          </div>

          <div className="flex-1 relative">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            <div className="absolute top-4 right-4 z-20 bg-black/50 text-white px-3 py-1 rounded-lg">👀 {viewers} viewers</div>
            {reactions.map(r => (
              <div key={r.id} className="absolute bottom-24 left-1/2 transform -translate-x-1/2 text-4xl animate-float">{r.emoji}</div>
            ))}
          </div>

          <div className="p-4 bg-gradient-to-t from-black/40 to-transparent flex items-center justify-center gap-4">
            <button onClick={() => setCamOn(s => !s)} className={`px-4 py-2 rounded-lg text-white ${camOn ? "bg-green-600" : "bg-white/10"}`}>{camOn ? "Turn Cam Off" : "Turn Cam On"}</button>
            <button onClick={() => setMicOn(s => !s)} className={`px-4 py-2 rounded-lg text-white ${micOn ? "bg-green-600" : "bg-white/10"}`}>{micOn ? "Mute Mic" : "Unmute Mic"}</button>
            {!streamLive ? (
              <button onClick={handleStartStream} className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold">Start Stream</button>
            ) : (
              <button onClick={handleStopStream} className="px-4 py-2 rounded-lg bg-yellow-500 text-white font-semibold">Stop Stream</button>
            )}
            <button onClick={handleEndRoom} className="px-4 py-2 rounded-lg bg-gray-700 text-white">End Room</button>
          </div>
        </div>

        {/* Chat / info panel */}
        <div className="w-96 bg-white text-black flex flex-col shadow-xl">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">{room.name}</h3>
            <p className="text-sm text-gray-600">{room.description}</p>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 && <p className="text-gray-500">No messages yet.</p>}
            {messages.map(m => (
              <div key={m.id} className={`p-2 rounded-xl max-w-[85%] ${m.sender === user.email ? "ml-auto bg-blue-100 text-right" : "bg-gray-100"}`}>
                <div className="text-xs font-semibold text-gray-700">{m.sender.split("@")[0]}</div>
                <div className="mt-1 text-sm">{m.text}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-4 border-t flex gap-2">
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Message your viewers..." className="flex-1 p-2 border rounded-lg focus:outline-none" />
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

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      <div className="flex-1 relative">
        {Object.entries(remoteStreamsRef.current).map(([id, stream]) => (
          <video
            key={id}
            ref={(el) => { if(el) el.srcObject = stream; }}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ))}

        <button onClick={onBack} className="absolute top-4 left-4 bg-white/10 px-3 py-1 rounded-md">← Back</button>
        <div className="absolute top-4 right-4 bg-black/40 px-3 py-1 rounded-md">👀 {viewers}</div>
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3 bg-black/40 px-4 py-2 rounded-lg">
          <button onClick={() => sendReaction("👍")} className="px-3 py-1 bg-white/10 rounded-lg">👍</button>
          <button onClick={() => sendReaction("❤️")} className="px-3 py-1 bg-white/10 rounded-lg">❤️</button>
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
          {messages.map(m => (
            <div key={m.id} className={`p-2 rounded-xl max-w-[85%] ${m.sender === user.email ? "ml-auto bg-blue-100 text-right" : "bg-gray-100"}`}>
              <div className="text-xs font-semibold text-gray-700">{m.sender.split("@")[0]}</div>
              <div className="mt-1 text-sm">{m.text}</div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t flex gap-2">
          <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Type your message..." className="flex-1 p-2 border rounded-lg focus:outline-none" />
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
