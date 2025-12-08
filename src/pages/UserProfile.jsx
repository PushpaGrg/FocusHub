import { useState } from "react";

export default function UserProfile({ user, profileData, onSave, onCancel }) {
  const [profile, setProfile] = useState(profileData);
  const [file, setFile] = useState(null);

  const handleSave = () => {
    onSave(profile, file);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-gray-100">
      <h2 className="text-3xl font-bold mb-4">Edit Profile</h2>

      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md space-y-4">
        <div className="flex flex-col items-center gap-2">
          <img
            src={file ? URL.createObjectURL(file) : profile.photoURL || "/src/assets/default-profile.png"}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover"
          />
          <input
            type="file"
            accept="image/png"
            onChange={(e) => setFile(e.target.files[0])}
            className="text-sm"
          />
        </div>

        <input
          type="text"
          placeholder="Full Name"
          className="w-full p-2 border rounded"
          value={profile.fullName}
          onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
        />
        <input
          type="text"
          placeholder="Username"
          className="w-full p-2 border rounded"
          value={profile.username}
          onChange={(e) => setProfile({ ...profile, username: e.target.value })}
        />
        <input
          type="text"
          placeholder="Field of Study"
          className="w-full p-2 border rounded"
          value={profile.fieldOfStudy}
          onChange={(e) => setProfile({ ...profile, fieldOfStudy: e.target.value })}
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 border rounded"
          value={profile.email}
          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
        />

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Save Changes
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
