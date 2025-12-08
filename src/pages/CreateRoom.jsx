// src/pages/CreateRoom.jsx
import { useState } from "react";

export default function CreateRoom({ onSave, onCancel }) {
  const [roomData, setRoomData] = useState({
    name: "",
    description: "",
    previewURL: "",
  });

  const handleSave = (e) => {
    e.preventDefault();
    if (!roomData.name) {
      alert("Room name is required");
      return;
    }
    onSave(roomData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <form className="bg-white p-6 rounded-xl shadow-md w-full max-w-md space-y-4" onSubmit={handleSave}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Create Room</h2>
          <button type="button" onClick={onCancel} className="text-red-600 text-xl font-bold">&times;</button>
        </div>

        <input type="text" placeholder="Room Name" value={roomData.name} onChange={(e) => setRoomData({ ...roomData, name: e.target.value })} className="w-full p-2 border rounded" />
        <input type="text" placeholder="Description" value={roomData.description} onChange={(e) => setRoomData({ ...roomData, description: e.target.value })} className="w-full p-2 border rounded" />
        <input type="text" placeholder="Preview URL (optional)" value={roomData.previewURL} onChange={(e) => setRoomData({ ...roomData, previewURL: e.target.value })} className="w-full p-2 border rounded" />

        <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition">Create Room</button>
      </form>
    </div>
  );
}
