// src/pages/EditProfile.jsx
import { useState } from "react";

export default function EditProfile({ user, onSave, onCancel }) {
  const [profileData, setProfileData] = useState({ ...user });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileData({ ...profileData, photoBase64: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSave(profileData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form className="bg-white p-6 rounded-xl shadow-md w-full max-w-md space-y-4" onSubmit={handleSave}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Edit Profile</h2>
          <button type="button" onClick={onCancel} className="text-red-600 text-xl font-bold">&times;</button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <img src={profileData.photoBase64 || "/src/assets/default-avatar.png"} alt="Profile" className="w-20 h-20 rounded-full object-cover border" />
          <input type="file" onChange={handleFileChange} accept="image/*" />
        </div>

        <input type="text" placeholder="Username" value={profileData.username} onChange={(e) => setProfileData({ ...profileData, username: e.target.value })} className="w-full p-2 border rounded" />
        <input type="text" placeholder="Full Name" value={profileData.fullName} onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })} className="w-full p-2 border rounded" />
        <input type="text" placeholder="Field of Study" value={profileData.fieldOfStudy} onChange={(e) => setProfileData({ ...profileData, fieldOfStudy: e.target.value })} className="w-full p-2 border rounded" />
        <input type="email" placeholder="Email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} className="w-full p-2 border rounded" />

        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">Save Changes</button>
      </form>
    </div>
  );
}
