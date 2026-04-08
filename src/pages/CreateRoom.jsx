import { useState } from "react";
import { FaLaptopCode, FaStethoscope, FaBook, FaHeadphones, FaCoffee } from "react-icons/fa";

const CATEGORIES = [
  { name: "Tech", icon: <FaLaptopCode /> },
  { name: "Medical", icon: <FaStethoscope /> },
  { name: "Reading", icon: <FaBook /> },
  { name: "Music", icon: <FaHeadphones /> },
  { name: "Quiet", icon: <FaCoffee /> },
];

export default function CreateRoom({ onSave, onCancel }) {
  const [roomData, setRoomData] = useState({
    name: "",
    description: "",
    previewURL: "",
    category: "",
  });

  const handleSave = (e) => {
    e.preventDefault();
    if (!roomData.name.trim()) { alert("Room name is required"); return; }
    if (!roomData.category) { alert("Please select a category"); return; }
    onSave(roomData);
  };

  return (
    <form className="space-y-5" onSubmit={handleSave}>
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Create a Room</h2>
        <p className="text-sm text-gray-400">Set up your study session</p>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Room Name *</label>
        <input
          type="text"
          placeholder="e.g. Late Night MCAT Grind"
          value={roomData.name}
          onChange={(e) => setRoomData({ ...roomData, name: e.target.value })}
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Description</label>
        <textarea
          placeholder="What are you studying? Any rules for the room?"
          value={roomData.description}
          onChange={(e) => setRoomData({ ...roomData, description: e.target.value })}
          rows={2}
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Category *</label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setRoomData({ ...roomData, category: cat.name })}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                roomData.category === cat.name
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"
              }`}
            >
              <span className="text-lg">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:shadow-lg hover:shadow-blue-500/30 transition text-sm"
        >
          Create Room
        </button>
      </div>
    </form>
  );
}