// src/pages/CreateStudyBuddyRoom.jsx
import { useState } from "react";
import { FaTimes } from "react-icons/fa";

export default function CreateStudyBuddyRoom({ onCancel, onSave }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert("Please enter a room name");
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || "Study together and focus!",
        isPrivate: true, // Mark as private StudyBuddyRoom
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-slideUp">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition"
        >
          <FaTimes size={24} />
        </button>

        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Create Study Buddy Room
        </h2>
        <p className="text-gray-600 mb-6">
          Set up your private study room and invite your study buddies
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Room Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Math Study Group"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition"
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Preparing for midterm exams"
              rows={3}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition resize-none"
              disabled={loading}
            />
          </div>

          {/* Privacy Notice */}
          <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
            <p className="text-sm text-blue-800">
              🔒 <span className="font-semibold">Private Room</span> - Only people with your invite link can join
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Room"}
            </button>
          </div>
        </form>
      </div>

      <style>
        {`
          .animate-slideUp {
            animation: slideUp 0.3s ease-out;
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}