const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('Cloudinary config:', cloudinary.config());

const getSignedUrl = (publicId) => {
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    sign_url: true,
    type: 'upload',
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  });
};


// Configure storage for resumes
const resumeStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const mimeToFormat = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    };
    const format = mimeToFormat[file.mimetype] || 'pdf';
    const userId = req.userId || req.user?._id || 'anonymous';
    const timestamp = Date.now();

    return {
      folder: 'ai-recruiter/resumes',
      resource_type: 'raw',  // ✅ back to raw — publicly accessible
      format,
      public_id: `resume_${userId}_${timestamp}`,
    };
  },
});

// Configure storage for profile pictures
const profilePictureStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const userId = req.userId || req.user?._id || 'anonymous';
    const timestamp = Date.now();

    return {
      folder: 'ai-recruiter/profile-pictures',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
      resource_type: 'image',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
      public_id: `profile_${userId}_${timestamp}`,
    };
  },
});

// Configure storage for interview recordings
const interviewStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const interviewId = req.params.interviewId || 'unknown';
    const questionIndex = req.body.questionIndex || '0';
    const timestamp = Date.now();

    return {
      folder: 'ai-recruiter/interviews',
      allowed_formats: ['mp3', 'wav', 'webm', 'm4a'],
      resource_type: 'video',
      public_id: `interview_${interviewId}_q${questionIndex}_${timestamp}`,
    };
  },
});

// Create multer instances
const uploadResume = multer({
  storage: resumeStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'), false);
    }
  }
});

const uploadProfilePicture = multer({
  storage: profilePictureStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and GIF images are allowed.'), false);
    }
  }
});

const uploadInterviewRecording = multer({
  storage: interviewStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP3, WAV, WebM, and M4A audio files are allowed.'), false);
    }
  }
});

// Helper functions
const deleteFile = async (publicId, resourceType = 'auto') => {  // ✅ default changed from 'image' to 'auto'
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
};

const getFileUrl = (publicId, resourceType = 'auto') => {  // ✅ default changed from 'image' to 'auto'
  return cloudinary.url(publicId, { resource_type: resourceType });
};

module.exports = {
  cloudinary,
  uploadResume,
  uploadProfilePicture,
  uploadInterviewRecording,
  deleteFile,
  getFileUrl,
  getSignedUrl
};