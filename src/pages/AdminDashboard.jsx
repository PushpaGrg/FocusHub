// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, setDoc, collection, query, deleteDoc, updateDoc } from "firebase/firestore";
import { 
  FaArrowLeft, FaPlus, FaTrash, FaImage, FaUsers, FaVideo, 
  FaCrown, FaCheckCircle, FaExclamationTriangle, FaBan, FaUnlock, FaInfoCircle, FaTimes 
} from "react-icons/fa";

// --- CUSTOM TOAST NOTIFICATION (Replaces alert()) ---
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  const bg = type === "error" ? "bg-red-500" : type === "success" ? "bg-green-500" : "bg-blue-500";
  return (
    <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-[400] ${bg} text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-slideDown border border-white/10`}>
      {type === "error" ? <FaExclamationTriangle /> : (type === "success" ? <FaCheckCircle /> : <FaInfoCircle />)}
      <span className="text-sm font-semibold tracking-wide">{message}</span>
      <button onClick={onClose} className="ml-2 hover:text-white/80"><FaTimes /></button>
    </div>
  );
};

// --- CUSTOM CONFIRMATION MODAL (Replaces window.confirm()) ---
const ConfirmModal = ({ title, message, onConfirm, onCancel, isDanger = true }) => (
  <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center border border-gray-200">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl ${isDanger ? 'bg-red-100 text-red-500' : 'bg-orange-100 text-orange-500'}`}>
        <FaExclamationTriangle />
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm mb-6">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition text-sm">Cancel</button>
        <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl text-white font-bold transition shadow-lg text-sm ${isDanger ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'}`}>
            Confirm
        </button>
      </div>
    </div>
  </div>
);

export default function AdminDashboard({ user, onBack }) {
  const [activeTab, setActiveTab] = useState("cms"); 
  const [confirmDialog, setConfirmDialog] = useState(null); 
  const [toast, setToast] = useState(null); // Custom Alerts

  const [slides, setSlides] = useState([]);
  const [newSlide, setNewSlide] = useState({ type: "image", url: "", title: "", subtitle: "" });
  const [isSaving, setIsSaving] = useState(false);

  const [allUsers, setAllUsers] = useState([]);
  const [allRooms, setAllRooms] = useState([]);

  const triggerToast = (msg, type = "info") => setToast({ message: msg, type });

  // Security Check: AMS-NF-1.0
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800 font-sans">
        <FaCrown className="text-6xl text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-gray-500 mb-6">You do not have administrator privileges.</p>
        <button onClick={onBack} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition">Return to Dashboard</button>
      </div>
    );
  }

  // --- FETCH DATA ---
  useEffect(() => {
    if (activeTab === "cms") {
      const docRef = doc(db, "app_config", "homepage");
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().heroSlides) setSlides(docSnap.data().heroSlides);
        else setSlides([]);
      });
      return () => unsubscribe();
    }

    if (activeTab === "users") {
      const q = query(collection(db, "users"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        users.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
        setAllUsers(users);
      });
      return () => unsubscribe();
    }

    if (activeTab === "rooms") {
      const q = query(collection(db, "studyRooms"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setAllRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [activeTab]);

  // --- CMS HANDLERS ---
  const saveToDatabase = async (updatedSlides) => {
    setIsSaving(true);
    try { 
        await setDoc(doc(db, "app_config", "homepage"), { heroSlides: updatedSlides }, { merge: true }); 
        triggerToast("Homepage updated successfully!", "success");
    } 
    catch (error) { triggerToast("Error saving: " + error.message, "error"); }
    setIsSaving(false);
  };

  const handleAddSlide = (e) => {
    e.preventDefault();
    if (!newSlide.url || !newSlide.title) return triggerToast("URL and Title are required!", "error");
    const updatedSlides = [...slides, { id: Date.now().toString(), ...newSlide }];
    saveToDatabase(updatedSlides);
    setNewSlide({ type: "image", url: "", title: "", subtitle: "" }); 
  };

  const triggerDeleteSlide = (id) => {
    setConfirmDialog({
        title: "Delete Slide?",
        message: "Are you sure you want to remove this slide from the homepage?",
        isDanger: true,
        onConfirm: () => {
            const updatedSlides = slides.filter(slide => slide.id !== id);
            saveToDatabase(updatedSlides);
            setConfirmDialog(null);
        },
        onCancel: () => setConfirmDialog(null)
    });
  };

  // --- MODERATION HANDLERS ---
  
  // AMS-F-1.1: Delete Inappropriate Content (Rooms)
  const triggerForceDeleteRoom = (roomId) => {
    setConfirmDialog({
        title: "Delete Room?",
        message: "This will instantly close the room and kick all active participants out.",
        isDanger: true,
        onConfirm: async () => {
            try { 
                await deleteDoc(doc(db, "studyRooms", roomId)); 
                triggerToast("Room forcefully closed.", "success");
            } 
            catch (error) { triggerToast("Error deleting room.", "error"); }
            setConfirmDialog(null);
        },
        onCancel: () => setConfirmDialog(null)
    });
  };

  // AMS-F-1.2: Ban or Unban Users
  const triggerToggleBanUser = (userId, currentBanStatus, username) => {
    if (userId === user.uid) return triggerToast("You cannot ban yourself!", "error");

    const actionText = currentBanStatus ? "Unban" : "Ban";
    setConfirmDialog({
        title: `${actionText} User?`,
        message: `Are you sure you want to ${actionText.toLowerCase()} ${username}? ${!currentBanStatus ? 'They will be locked out of their account instantly.' : 'They will regain access to the platform.'}`,
        isDanger: !currentBanStatus, 
        onConfirm: async () => {
            try { 
                await updateDoc(doc(db, "users", userId), { isBanned: !currentBanStatus }); 
                triggerToast(`User successfully ${actionText.toLowerCase()}ned.`, "success");
            } 
            catch (error) { 
                console.error(error);
                triggerToast(`Error trying to ${actionText.toLowerCase()} user. Check console.`, "error"); 
            }
            setConfirmDialog(null);
        },
        onCancel: () => setConfirmDialog(null)
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans relative">
      
      {/* Global Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Render Confirmation Modal if active (AMS-UR-1.0) */}
      {confirmDialog && (
          <ConfirmModal 
            title={confirmDialog.title} 
            message={confirmDialog.message} 
            onConfirm={confirmDialog.onConfirm} 
            onCancel={confirmDialog.onCancel}
            isDanger={confirmDialog.isDanger}
          />
      )}

      {/* --- SIDEBAR NAVIGATION --- */}
      <div className="w-full md:w-64 bg-gray-900 text-white p-6 flex flex-col z-10 relative">
        <h2 className="text-2xl font-black mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
            <FaCrown /> Admin Panel
        </h2>
        <nav className="flex-1 space-y-3">
            <button onClick={() => setActiveTab("cms")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'cms' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <FaImage /> Landing Page CMS
            </button>
            <button onClick={() => setActiveTab("users")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'users' ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <FaUsers /> User Management
            </button>
            <button onClick={() => setActiveTab("rooms")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition ${activeTab === 'rooms' ? 'bg-red-600/20 text-red-400 border border-red-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <FaVideo /> Room Moderation
            </button>
        </nav>
        <button onClick={onBack} className="mt-12 flex items-center gap-2 text-gray-400 hover:text-white transition font-bold">
            <FaArrowLeft /> Exit Admin
        </button>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 p-8 overflow-y-auto">
        
        {/* TAB 1: HOMEPAGE CMS */}
        {activeTab === "cms" && (
            <div className="animate-fadeIn">
                <h1 className="text-3xl font-black text-gray-800 mb-2">Homepage CMS</h1>
                <p className="text-gray-500 mb-8 font-medium">Add, remove, and manage the images/videos shown on the landing page.</p>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 mb-8">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><FaPlus /> Add New Slide</h3>
                    <form onSubmit={handleAddSlide} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-full md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Media Type</label>
                            <select value={newSlide.type} onChange={e => setNewSlide({...newSlide, type: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-medium text-sm">
                                <option value="image">Image (JPG/PNG)</option>
                                <option value="video">Video (MP4)</option>
                            </select>
                        </div>
                        <div className="col-span-full md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Media URL</label>
                            <input placeholder="https://example.com/image.jpg" value={newSlide.url} onChange={e => setNewSlide({...newSlide, url: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-sm" />
                        </div>
                        <div className="col-span-full md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Heading Title</label>
                            <input placeholder="e.g. Master Your Studies" value={newSlide.title} onChange={e => setNewSlide({...newSlide, title: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-sm" />
                        </div>
                        <div className="col-span-full md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sub-heading</label>
                            <input placeholder="e.g. Join thousands of students online." value={newSlide.subtitle} onChange={e => setNewSlide({...newSlide, subtitle: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-sm" />
                        </div>
                        <div className="col-span-full mt-2">
                            <button type="submit" disabled={isSaving} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition w-full md:w-auto">
                                {isSaving ? "Saving..." : "Add to Homepage"}
                            </button>
                        </div>
                    </form>
                </div>

                <div>
                    <h3 className="font-bold text-gray-700 mb-4 text-lg flex items-center gap-2"><FaImage className="text-gray-400"/> Active Slides ({slides.length})</h3>
                    {slides.length === 0 && <p className="text-gray-400 italic bg-white p-6 rounded-2xl border border-dashed border-gray-300 text-center">No slides added yet. The homepage will use default styling.</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {slides.map((slide, index) => (
                            <div key={slide.id} className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-200 group flex flex-col">
                                <div className="h-40 bg-gray-100 relative">
                                    {slide.type === 'video' ? <video src={slide.url} autoPlay muted loop className="w-full h-full object-cover" /> : <img src={slide.url} alt={slide.title} className="w-full h-full object-cover" />}
                                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] px-3 py-1 rounded-full uppercase font-bold shadow-sm">Slide {index + 1}</div>
                                    <button onClick={() => triggerDeleteSlide(slide.id)} className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-600 shadow-lg hover:scale-105"><FaTrash size={12}/></button>
                                </div>
                                <div className="p-5 flex-1 flex flex-col">
                                    <h4 className="font-black text-gray-800 text-lg mb-1 line-clamp-1">{slide.title}</h4>
                                    <p className="text-sm text-gray-500 line-clamp-2">{slide.subtitle}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {activeTab === "users" && (
            <div className="animate-fadeIn">
                <h1 className="text-3xl font-black text-gray-800 mb-2">User Management</h1>
                <p className="text-gray-500 mb-8 font-medium">Monitor users, view their stats, and enforce bans for guideline violations.</p>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                <th className="p-4 font-bold">Student</th>
                                <th className="p-4 font-bold hidden md:table-cell">Email</th>
                                <th className="p-4 font-bold">Total Score</th>
                                <th className="p-4 font-bold text-center">Status</th>
                                <th className="p-4 font-bold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {allUsers.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-400">No users found.</td></tr>
                            ) : (
                                allUsers.map((u) => (
                                    <tr key={u.id} className={`transition ${u.isBanned ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}>
                                        <td className="p-4 flex items-center gap-3">
                                            <img src={u.photoBase64 || "https://ui-avatars.com/api/?name=" + u.username} className={`w-10 h-10 rounded-full object-cover ${u.isBanned ? 'grayscale opacity-50' : 'bg-gray-200'}`} alt="avatar" />
                                            <div>
                                                <span className={`font-bold ${u.isBanned ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{u.username || "Anonymous"}</span>
                                                {u.role === "admin" && <FaCrown className="inline text-yellow-500 ml-1 mb-1" title="Admin"/>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 hidden md:table-cell">{u.email || "N/A"}</td>
                                        <td className="p-4 font-black text-blue-600">{u.totalScore || 0}</td>
                                        <td className="p-4 text-center">
                                            {u.isBanned ? (
                                                <span className="px-2 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded uppercase flex items-center justify-center gap-1 w-max mx-auto"><FaBan /> Banned</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-green-100 text-green-600 text-[10px] font-bold rounded uppercase">Active</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {u.role !== "admin" && (
                                                <button 
                                                    onClick={() => triggerToggleBanUser(u.id, u.isBanned, u.username)}
                                                    className={`px-4 py-2 border rounded-lg font-bold text-xs transition shadow-sm flex items-center gap-2 ml-auto ${u.isBanned ? 'bg-white border-orange-200 text-orange-500 hover:bg-orange-500 hover:text-white' : 'bg-white border-red-200 text-red-500 hover:bg-red-500 hover:text-white'}`}
                                                >
                                                    {u.isBanned ? <><FaUnlock /> Unban</> : <><FaBan /> Ban</>}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* TAB 3: ROOM MODERATION */}
        {activeTab === "rooms" && (
            <div className="animate-fadeIn">
                <h1 className="text-3xl font-black text-gray-800 mb-2">Room Moderation</h1>
                <p className="text-gray-500 mb-8 font-medium">Monitor active study rooms and force-close inappropriate sessions.</p>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                <th className="p-4 font-bold">Status</th>
                                <th className="p-4 font-bold">Room Name</th>
                                <th className="p-4 font-bold hidden md:table-cell">Host ID</th>
                                <th className="p-4 font-bold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {allRooms.length === 0 ? (
                                <tr><td colSpan="4" className="p-8 text-center text-gray-400">No active rooms right now.</td></tr>
                            ) : (
                                allRooms.map((r) => (
                                    <tr key={r.id} className="hover:bg-red-50 transition group">
                                        <td className="p-4">
                                            {r.isLive ? (
                                                <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full border border-red-200">LIVE</span>
                                            ) : (
                                                <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-full border border-gray-200">OFFLINE</span>
                                            )}
                                        </td>
                                        <td className="p-4 font-bold text-gray-800">{r.name}</td>
                                        <td className="p-4 text-xs text-gray-400 font-mono hidden md:table-cell truncate max-w-[150px]">{r.createdBy}</td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => triggerForceDeleteRoom(r.id)}
                                                className="px-4 py-2 bg-white border border-red-200 text-red-500 hover:bg-red-500 hover:text-white rounded-lg font-bold text-xs transition shadow-sm flex items-center gap-2 ml-auto"
                                            >
                                                <FaTrash /> Force Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </div>

      <style>{`
          .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
          .animate-slideDown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes slideDown { from { opacity: 0; transform: translateY(-20px) translateX(-50%); } to { opacity: 1; transform: translateY(0) translateX(-50%); } }
      `}</style>
    </div>
  );
}