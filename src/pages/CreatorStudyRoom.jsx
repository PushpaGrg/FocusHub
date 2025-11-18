// src/pages/MainStudyRoom.jsx
import { useState, useEffect } from "react";

export default function CreatorStudyRoom({ userEmail }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setMessages([...messages, { text: newMsg, sender: userEmail }]);
    setNewMsg("");
  };

  return (
    <div className="flex flex-col md:flex-row h-screen gap-4 bg-gray-100 p-4">
      {/* Streamer Video Section */}
      <div className="flex-1 bg-black rounded-xl shadow-lg relative overflow-hidden flex flex-col">
        <video
          className="w-full h-full object-cover flex-1 rounded-xl"
          autoPlay
          muted
          // Replace with your actual camera feed or placeholder for now
          src="https://www.w3schools.com/html/mov_bbb.mp4"
        ></video>

        {/* Stream Info */}
        <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded font-bold">
          Main Study Room
        </div>

        {/* Stream Controls */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4 bg-black/50 px-4 py-2 rounded">
          <button
            className="px-3 py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700 transition"
            onClick={() => alert("Ending stream...")}
          >
            End Stream
          </button>
          <button
            className="px-3 py-2 rounded bg-yellow-500 text-white font-semibold hover:bg-yellow-600 transition"
            onClick={() => alert("Sent a 👍 reaction!")}
          >
            👍
          </button>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-full md:w-1/3 bg-white rounded-xl shadow-lg flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold text-lg mb-2">Live Chat</h2>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2">
          {messages.length === 0 && (
            <p className="text-gray-400 text-sm">No messages yet...</p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`p-2 rounded ${
                msg.sender === userEmail
                  ? "bg-blue-100 self-end text-right"
                  : "bg-gray-100 self-start text-left"
              }`}
            >
              <span className="font-semibold">{msg.sender}: </span>
              {msg.text}
            </div>
          ))}
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
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
