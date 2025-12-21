import { useState } from "react";

export default function StudyBuddyRoom() {
  const [copied, setCopied] = useState(false);

  const inviteLink = "https://focushub.app/join/ABCD1234";

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
          <button className="bg-white/10 px-3 py-1 rounded-md hover:bg-white/20">← Exit</button>
          <div className="px-3 py-1 rounded-md bg-black/40 font-medium">Study Buddy Room</div>
          <div className="px-3 py-1 rounded-md bg-green-600 font-semibold">Private</div>
        </div>

        {/* Center content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 w-[420px] shadow-xl">
            <h2 className="text-xl font-semibold mb-2">Invite your study buddies</h2>
            <p className="text-sm text-gray-300 mb-4">
              Share this link with your friends to study together in real time.
            </p>

            <div className="bg-black/40 rounded-lg px-4 py-3 flex items-center justify-between gap-2">
              <span className="text-sm truncate">{inviteLink}</span>
              <button
                onClick={copyLink}
                className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-sm"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg">
                Start Study Session
              </button>
              <button className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg">
                Room Settings
              </button>
            </div>

            <div className="mt-6 text-xs text-gray-400">
              Only users with this link can join this room.
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-96 bg-white text-black flex flex-col shadow-xl">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Study Buddies</h3>
          <p className="text-sm text-gray-600">People in this room</p>
        </div>

        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">U</div>
            <span className="text-sm">You (Host)</span>
          </div>

          <div className="flex items-center gap-3 opacity-60">
            <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm">?</div>
            <span className="text-sm">Waiting for buddies…</span>
          </div>
        </div>

        <div className="p-4 border-t text-sm text-gray-600">
          Tip: Share the invite link on WhatsApp or Discord
        </div>
      </div>
    </div>
  );
}
