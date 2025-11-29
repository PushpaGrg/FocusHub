import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

export default function RoomMessages({ room, userEmail }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [viewers, setViewers] = useState(Math.floor(Math.random() * 100 + 50));
  const [reactions, setReactions] = useState([]);

  const chatEndRef = useRef(null);

  // Fetch messages in real-time
  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .filter((doc) => doc.data().roomId === room.id)
        .map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [room.id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;

    try {
      await addDoc(collection(db, "messages"), {
        roomId: room.id,
        sender: userEmail,
        text: newMsg,
        createdAt: serverTimestamp(),
      });
      setNewMsg("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const sendReaction = (emoji) => {
    const id = Date.now();
    setReactions([...reactions, { id, emoji }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden relative">
      {/* Video Section */}
      <div
        className={`flex-1 relative transition-all duration-300 ${
          chatOpen ? "md:w-2/3" : "w-full"
        }`}
      >
        <video
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          src="/src/assets/girlstudy.mp4" // Girl studying video
        ></video>

        {/* Room Name */}
        <div className="absolute top-4 left-4 bg-blue-600 px-3 py-1 rounded font-bold shadow">
          {room.name}
        </div>

        {/* Viewer count */}
        <div className="absolute top-4 right-4 bg-black/50 px-3 py-1 rounded font-semibold">
          👀 {viewers} viewers
        </div>

        {/* Floating Reactions */}
        {reactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-3xl animate-float"
          >
            {r.emoji}
          </div>
        ))}

        {/* Controls */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/50 px-4 py-2 rounded">
          <button
            className="px-3 py-2 rounded bg-red-600 font-semibold hover:bg-red-700 transition"
            onClick={() => alert("Leaving room...")}
          >
            Leave
          </button>
          <button
            className="px-3 py-2 rounded bg-yellow-500 font-semibold hover:bg-yellow-600 transition"
            onClick={() => sendReaction("👍")}
          >
            👍
          </button>
          <button
            className="px-3 py-2 rounded bg-pink-500 font-semibold hover:bg-pink-600 transition"
            onClick={() => sendReaction("❤️")}
          >
            ❤️
          </button>
          <button
            className="px-3 py-2 rounded bg-purple-500 font-semibold hover:bg-purple-600 transition md:hidden"
            onClick={() => setChatOpen(!chatOpen)}
          >
            {chatOpen ? "Hide Chat" : "Show Chat"}
          </button>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div
        className={`bg-white text-black w-full md:w-1/3 flex flex-col transition-all duration-300 ${
          chatOpen ? "flex" : "hidden md:flex"
        }`}
      >
        <div className="flex-1 p-4 overflow-y-auto space-y-2">
          {messages.length === 0 && (
            <p className="text-gray-500 text-sm">No messages yet...</p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2 rounded max-w-[80%] break-words ${
                msg.sender === userEmail
                  ? "bg-blue-100 self-end text-right"
                  : "bg-gray-100 self-start text-left"
              }`}
            >
              <span className="font-semibold">
                {msg.sender.split("@")[0]}:{" "}
              </span>
              {msg.text}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <form
          onSubmit={handleSend}
          className="p-4 border-t border-gray-200 flex gap-2"
        >
          <input
            type="text"
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition hover:scale-105"
          >
            Send
          </button>
        </form>
      </div>

      <style>
        {`
          @keyframes float {
            0% { transform: translate(-50%, 0) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -200px) scale(1.5); opacity: 0; }
          }
          .animate-float {
            animation: float 2s forwards;
          }
        `}
      </style>
    </div>
  );
}
