// src/pages/EditProfile.jsx
import { useState, useRef } from "react";
import { FaCamera, FaUser, FaGraduationCap, FaEnvelope, FaTimes, FaSave, FaUpload, FaCheckCircle, FaExclamationTriangle, FaCompress } from "react-icons/fa";

// Custom Error Dialog Component
const ErrorDialog = ({ message, onClose }) => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full text-center border border-gray-200 animate-slideUp">
      <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
        <FaExclamationTriangle />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">Upload Error</h3>
      <p className="text-gray-600 mb-6">{message}</p>
      <button 
        onClick={onClose} 
        className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold"
      >
        OK
      </button>
    </div>
  </div>
);

// Success Dialog Component  
const SuccessDialog = ({ message, onClose }) => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full text-center border border-gray-200 animate-slideUp">
      <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
        <FaCheckCircle />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">Success!</h3>
      <p className="text-gray-600 mb-6">{message}</p>
      <button 
        onClick={onClose} 
        className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold"
      >
        OK
      </button>
    </div>
  </div>
);

export default function EditProfile({ user, onSave, onCancel }) {
  const [profileData, setProfileData] = useState({ 
    username: user?.username || "",
    fullName: user?.fullName || "",
    fieldOfStudy: user?.fieldOfStudy || "",
    email: user?.email || "",
    bio: user?.bio || "",
    studyPreferences: user?.studyPreferences || "",
    photoBase64: user?.photoBase64 || null
  });
  
  const [errors, setErrors] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [errorDialog, setErrorDialog] = useState(null);
  const [successDialog, setSuccessDialog] = useState(null);
  const fileInputRef = useRef(null);

  // Reduced file size limit to account for base64 encoding overhead (33% increase)
  // Firebase limit is ~1MB per field, so we need to keep original file under ~750KB
  const MAX_FILE_SIZE = 750 * 1024; // 750KB to account for base64 encoding
  const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  // Image compression function
  const compressImage = (file, quality = 0.7, maxWidth = 800, maxHeight = 800) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const validateField = (name, value) => {
    let error = "";
    
    switch (name) {
      case 'username':
        if (!value.trim()) error = "Username is required";
        else if (value.length < 3) error = "Username must be at least 3 characters";
        else if (value.length > 20) error = "Username must be less than 20 characters";
        else if (!/^[a-zA-Z0-9_]+$/.test(value)) error = "Username can only contain letters, numbers, and underscores";
        break;
      case 'fullName':
        if (!value.trim()) error = "Full name is required";
        else if (value.length < 2) error = "Full name must be at least 2 characters";
        break;
      case 'email':
        if (!value.trim()) error = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Please enter a valid email";
        break;
      case 'fieldOfStudy':
        if (!value.trim()) error = "Field of study is required";
        break;
      case 'bio':
        if (value.length > 500) error = "Bio must be less than 500 characters";
        break;
    }
    
    return error;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData({ ...profileData, [name]: value });
    
    // Clear error for this field if user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleFileChange = async (file) => {
    if (!file) return;

    // Validate file type
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      setErrorDialog("Please upload a valid image file (JPG, PNG, WebP, or GIF)");
      return;
    }

    // Validate file size (before compression)
    if (file.size > MAX_FILE_SIZE) {
      setErrorDialog(`File size must be less than 750KB (current: ${(file.size / 1024).toFixed(2)}KB). Your image will be compressed automatically.`);
      
      // Try to compress the image
      try {
        setIsUploading(true);
        setUploadProgress(0);
        
        const compressedFile = await compressImage(file, 0.6, 600, 600);
        
        if (compressedFile.size > MAX_FILE_SIZE) {
          setErrorDialog(`Even after compression, the file is too large (${(compressedFile.size / 1024).toFixed(2)}KB). Please choose a smaller image.`);
          setIsUploading(false);
          return;
        }
        
        // Continue with compressed file
        await processFileUpload(compressedFile);
        
      } catch (error) {
        setErrorDialog("Failed to compress image. Please try a different image.");
        setIsUploading(false);
      }
      return;
    }

    // File is within limits, process normally
    await processFileUpload(file);
  };

  const processFileUpload = async (file) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const reader = new FileReader();
      reader.onloadend = () => {
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        const base64String = reader.result;
        
        // Check final base64 size
        const base64Size = new Blob([base64String]).size;
        if (base64Size > 1048487) { // Firebase limit
          setErrorDialog(`Image is too large after encoding (${(base64Size / 1024 / 1024).toFixed(2)}MB). Please choose a smaller image or compress it first.`);
          setIsUploading(false);
          setUploadProgress(0);
          return;
        }
        
        setProfileData({ ...profileData, photoBase64: base64String });
        setErrors({ ...errors, photo: "" });
        setSuccessDialog("Image uploaded successfully!");
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
          setSuccessDialog(null);
        }, 1500);
      };
      reader.onerror = () => {
        clearInterval(progressInterval);
        setErrorDialog("Failed to read file. Please try again.");
        setIsUploading(false);
        setUploadProgress(0);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setErrorDialog("Failed to upload image. Please try again.");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    handleFileChange(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  const handleSave = (e) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors = {};
    Object.keys(profileData).forEach(key => {
      if (key !== 'photoBase64' && key !== 'studyPreferences') {
        const error = validateField(key, profileData[key]);
        if (error) newErrors[key] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setErrorDialog("Please fix the errors in the form before saving.");
      return;
    }

    try {
      onSave(profileData);
      setSuccessDialog("Profile updated successfully!");
      setTimeout(() => {
        setSuccessDialog(null);
      }, 2000);
    } catch (error) {
      if (error.message && error.message.includes("longer than")) {
        setErrorDialog("Image is too large for storage. Please upload a smaller image (under 750KB).");
      } else {
        setErrorDialog("Failed to update profile. Please try again.");
      }
    }
  };

  const removePhoto = () => {
    setProfileData({ ...profileData, photoBase64: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      {/* Custom Dialogs */}
      {errorDialog && (
        <ErrorDialog 
          message={errorDialog} 
          onClose={() => setErrorDialog(null)} 
        />
      )}
      
      {successDialog && (
        <SuccessDialog 
          message={successDialog} 
          onClose={() => setSuccessDialog(null)} 
        />
      )}

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-2xl border border-white/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold flex items-center gap-3">
                  <FaUser className="text-2xl" />
                  Edit Profile
                </h2>
                <p className="text-blue-100 mt-1">Update your study buddy profile</p>
              </div>
              <button 
                type="button" 
                onClick={onCancel} 
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <FaTimes size={20} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSave} className="p-8 space-y-6">
            {/* Profile Photo Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-gradient-to-br from-blue-100 to-purple-100">
                  {profileData.photoBase64 ? (
                    <img 
                      src={profileData.photoBase64} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FaUser className="text-4xl text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* Upload/Remove buttons */}
                <div className="absolute -bottom-2 -right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50"
                    title="Upload photo"
                  >
                    <FaCamera size={16} />
                  </button>
                  {profileData.photoBase64 && (
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                      title="Remove photo"
                    >
                      <FaTimes size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Drag and Drop Area */}
              <div 
                className={`w-full max-w-md border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <FaUpload className="mx-auto text-2xl text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Drag & drop your photo here or click the camera icon
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Max file size: 750KB (JPG, PNG, WebP, GIF)
                </p>
                <p className="text-xs text-blue-500 mt-1 flex items-center justify-center gap-1">
                  <FaCompress size={10} />
                  Auto-compression enabled for larger files
                </p>
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="w-full max-w-md">
                  <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    {uploadProgress < 100 ? `Processing... ${uploadProgress}%` : 'Finalizing...'}
                  </p>
                </div>
              )}

              {errors.photo && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <FaExclamationTriangle />
                  <span>{errors.photo}</span>
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              accept="image/*"
              className="hidden"
            />

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Username */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FaUser className="text-blue-500" />
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={profileData.username}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border transition-all ${
                    errors.username 
                      ? 'border-red-500 bg-red-50 focus:ring-red-500' 
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'
                  } outline-none focus:ring-2`}
                  placeholder="Enter username"
                />
                {errors.username && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <FaExclamationTriangle size={10} />
                    {errors.username}
                  </p>
                )}
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FaUser className="text-purple-500" />
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={profileData.fullName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border transition-all ${
                    errors.fullName 
                      ? 'border-red-500 bg-red-50 focus:ring-red-500' 
                      : 'border-gray-200 focus:border-purple-500 focus:ring-purple-500'
                  } outline-none focus:ring-2`}
                  placeholder="Enter your full name"
                />
                {errors.fullName && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <FaExclamationTriangle size={10} />
                    {errors.fullName}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FaEnvelope className="text-green-500" />
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border transition-all ${
                    errors.email 
                      ? 'border-red-500 bg-red-50 focus:ring-red-500' 
                      : 'border-gray-200 focus:border-green-500 focus:ring-green-500'
                  } outline-none focus:ring-2`}
                  placeholder="your.email@example.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <FaExclamationTriangle size={10} />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Field of Study */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FaGraduationCap className="text-orange-500" />
                  Field of Study *
                </label>
                <input
                  type="text"
                  name="fieldOfStudy"
                  value={profileData.fieldOfStudy}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border transition-all ${
                    errors.fieldOfStudy 
                      ? 'border-red-500 bg-red-50 focus:ring-red-500' 
                      : 'border-gray-200 focus:border-orange-500 focus:ring-orange-500'
                  } outline-none focus:ring-2`}
                  placeholder="e.g., Computer Science, Medicine"
                />
                {errors.fieldOfStudy && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <FaExclamationTriangle size={10} />
                    {errors.fieldOfStudy}
                  </p>
                )}
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Bio</label>
              <textarea
                name="bio"
                value={profileData.bio}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-4 py-3 rounded-xl border transition-all resize-none ${
                  errors.bio 
                    ? 'border-red-500 bg-red-50 focus:ring-red-500' 
                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500'
                } outline-none focus:ring-2`}
                placeholder="Tell us about yourself and your study habits..."
                maxLength={500}
              />
              <div className="flex justify-between items-center">
                {errors.bio && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <FaExclamationTriangle size={10} />
                    {errors.bio}
                  </p>
                )}
                <span className="text-xs text-gray-400 ml-auto">
                  {profileData.bio?.length || 0}/500
                </span>
              </div>
            </div>

            {/* Study Preferences */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Study Preferences</label>
              <textarea
                name="studyPreferences"
                value={profileData.studyPreferences}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-blue-500 outline-none focus:ring-2 transition-all resize-none"
                placeholder="e.g., Quiet environment, Morning sessions, Group study..."
                maxLength={300}
              />
              <span className="text-xs text-gray-400">
                {profileData.studyPreferences?.length || 0}/300
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold flex items-center justify-center gap-2 shadow-lg"
              >
                <FaSave />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}
