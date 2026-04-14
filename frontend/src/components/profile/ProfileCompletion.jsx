import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiUser,
  FiUpload,
  FiSave,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import api from "../../services/api";

const ProfileCompletion = ({ mode = "complete", initialData = {}, onComplete }) => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  // State
  const [profileData, setProfileData] = useState(initialData || {});
  const [resumeFile, setResumeFile] = useState(null);
  const [profilePicture, setProfilePicture] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load profile data in edit mode
  useEffect(() => {
    if (mode === "edit" && !initialData?.name) {
      const fetchProfile = async () => {
        try {
          const response = await api.get("/profile/me");
          if (response.data.success) {
            setProfileData(response.data.data);
          }
        } catch (error) {
          console.error("Failed to fetch profile:", error);
        }
      };
      fetchProfile();
    }
  }, [mode]); // ✅ no initialData here to avoid infinite loop

  // Handle text input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle file input change
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (type === "resume") {
        setResumeFile(file);
      } else if (type === "profilePicture") {
        setProfilePicture(file);
      }
    }
  };

  // Submit profile data
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();

      // Append text fields
      Object.keys(profileData).forEach((key) => {
        if (profileData[key]) {
          formData.append(key, profileData[key]);
        }
      });

      // Append files
      if (resumeFile) formData.append("resume", resumeFile);
      if (profilePicture) formData.append("profilePicture", profilePicture);

      const response = await api.put("/profile/me", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        toast.success("Profile updated successfully!");
        updateUser(response.data.data);

        if (mode === "complete" && response.data.data.profileComplete) {
          toast.success("Profile completed! You can now apply for jobs.");
          if (onComplete) {
            onComplete();
          } else {
            navigate("/candidate/dashboard");
          }
        } else if (mode === "edit") {
          navigate("/profile"); // ✅ redirect after edit
        } else {
          setMissingFields(response.data.data.missingFields || []);
        }
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // Helpers
  const isFieldMissing = (fieldName) => missingFields.includes(fieldName);
  const getFieldStatus = (fieldName) =>
    isFieldMissing(fieldName) ? (
      <FiAlertCircle className="text-red-500 ml-2" />
    ) : (
      <FiCheckCircle className="text-green-500 ml-2" />
    );

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {mode === "edit" ? "Edit Your Profile" : "Complete Your Profile"}
        </h2>
        <p className="text-gray-600">
          {mode === "edit"
            ? "Update your information below."
            : "Please complete all required fields to start applying for jobs."}
        </p>

        {missingFields.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <FiAlertCircle className="text-yellow-600 mr-2" />
              <span className="text-yellow-800 font-medium">
                Missing required fields: {missingFields.join(", ")}
              </span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FiUser className="mr-2" />
            Basic Information
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name {getFieldStatus("name")}
            </label>
            <input
              type="text"
              name="name"
              value={profileData.name || ""}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isFieldMissing("name") ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number {getFieldStatus("phoneNumber")}
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={profileData.phoneNumber || ""}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isFieldMissing("phoneNumber") ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="Enter your phone number"
              required
            />
          </div>
        </div>

        {/* Professional Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Professional Information</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Years of Experience {getFieldStatus("experience")}
            </label>
            <input
              type="number"
              name="experience"
              value={profileData.experience || ""}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isFieldMissing("experience") ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="Enter years of experience"
              min="0"
              max="50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skills {getFieldStatus("skills")}
            </label>
            <input
              type="text"
              name="skills"
              value={profileData.skills || ""}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isFieldMissing("skills") ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="Enter your skills (comma-separated)"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Example: JavaScript, React, Node.js, Python
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio (Optional)
            </label>
            <textarea
              name="bio"
              value={profileData.bio || ""}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tell us about yourself..."
            />
          </div>
        </div>

        {/* File Uploads */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FiUpload className="mr-2" />
            Documents
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resume {getFieldStatus("resume")}
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => handleFileChange(e, "resume")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {profileData?.resume && (
              <p className="text-sm text-green-600 mt-1">
                Current resume: {profileData.resume.split("/").pop()}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profile Picture (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, "profilePicture")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {profileData?.profilePicture && (
              <img
                src={profileData.profilePicture}
                alt="Current Profile"
                className="w-16 h-16 rounded-full mt-2 object-cover"
              />
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
            ) : (
              <FiSave className="mr-2" />
            )}
            {loading ? "Updating..." : mode === "edit" ? "Save Changes" : "Update Profile"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileCompletion;
