// src/pages/CreateStudyBuddyRoom.jsx
import { useState, useEffect, useCallback } from "react";
import { FaTimes, FaUserFriends, FaLock } from "react-icons/fa";

export default function CreateStudyBuddyRoom({ onCancel, onSave }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState("");

  const handleDismiss = useCallback(() => {
    if (!loading) onCancel();
  }, [loading, onCancel]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDismiss]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setNameError("Please enter a room name");
      return;
    }
    setNameError("");

    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || "Study together and focus!",
        isPrivate: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm p-4 animate-fadeIn"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && handleDismiss()}
    >
      <div
        className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-lg relative animate-slideUp border border-white/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="study-buddy-room-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleDismiss}
          disabled={loading}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-800 transition p-2 hover:bg-gray-100 rounded-full disabled:opacity-40 disabled:pointer-events-none"
          aria-label="Close"
        >
          <FaTimes size={20} />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
            <FaUserFriends className="text-white text-2xl" />
          </div>
          <h2
            id="study-buddy-room-title"
            className="text-2xl font-bold text-gray-800 mb-1"
          >
            Study Buddy Room
          </h2>
          <p className="text-sm text-gray-500 font-medium">
            Private space — share the invite link only with people you trust
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="study-buddy-name"
              className="block text-xs font-bold text-gray-500 uppercase mb-1.5 tracking-wide"
            >
              Room name *
            </label>
            <input
              id="study-buddy-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError("");
              }}
              placeholder="e.g. Late night calculus crew"
              className={`w-full p-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-sm transition ${
                nameError ? "border-red-300 ring-1 ring-red-200" : "border-gray-200"
              }`}
              disabled={loading}
              autoFocus
            />
            {nameError ? (
              <p className="mt-1.5 text-xs font-semibold text-red-600">{nameError}</p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="study-buddy-desc"
              className="block text-xs font-bold text-gray-500 uppercase mb-1.5 tracking-wide"
            >
              Description
            </label>
            <textarea
              id="study-buddy-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you working on? Any house rules?"
              rows={3}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-sm resize-none min-h-[88px]"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50/80 border border-blue-100/80">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-blue-600">
              <FaLock className="text-lg" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 mb-0.5">Invite-only</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                This room does not appear in the public list. Only people with your link can join.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition text-sm disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:shadow-lg hover:shadow-blue-500/30 transition text-sm disabled:opacity-60 disabled:shadow-none flex items-center justify-center gap-2 min-h-[48px]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                "Create room"
              )}
            </button>
          </div>
        </form>
      </div>

      <style>
        {`
          .animate-fadeIn { animation: fadeIn 0.25s ease-out; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(28px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
}
