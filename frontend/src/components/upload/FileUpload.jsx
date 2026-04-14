import { useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import uploadService from '../../services/uploadService';

const FileUpload = ({ 
  type = 'resume', 
  onUploadSuccess, 
  onUploadError,
  currentFile = null,
  disabled = false,
  className = ''
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const getAcceptedFileTypes = () => {
    switch (type) {
      case 'resume':
        return {
          'application/pdf': ['.pdf'],
          'application/msword': ['.doc'],
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        };
      case 'profilePicture':
        return {
          'image/jpeg': ['.jpg', '.jpeg'],
          'image/png': ['.png'],
          'image/gif': ['.gif']
        };
      default:
        return {};
    }
  };

  const getMaxSize = () => {
    switch (type) {
      case 'resume':
        return 10 * 1024 * 1024; // 10MB
      case 'profilePicture':
        return 5 * 1024 * 1024; // 5MB
      default:
        return 1024 * 1024; // 1MB
    }
  };

  const handleFileUpload = async (file) => {
    // Validate file
    const validation = uploadService.validateFile(file, type);
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      if (onUploadError) onUploadError(validation.errors);
      return;
    }

    setUploading(true);
    setProgress(0);

    // Generate preview for images
    if (type === 'profilePicture') {
      const previewUrl = uploadService.generatePreviewUrl(file);
      setPreview(previewUrl);
    }

    try {
      let result;
      
      if (type === 'resume') {
        result = await uploadService.uploadResume(file, setProgress);
      } else if (type === 'profilePicture') {
        result = await uploadService.uploadProfilePicture(file, setProgress);
      }

      toast.success(result.message || 'File uploaded successfully!');
      if (onUploadSuccess) onUploadSuccess(result);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
      if (onUploadError) onUploadError([error.message]);
      setPreview(null);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!currentFile) return;

    try {
      let result;
      
      if (type === 'resume') {
        result = await uploadService.deleteResume();
      } else if (type === 'profilePicture') {
        result = await uploadService.deleteProfilePicture();
      }

      toast.success(result.message || 'File deleted successfully!');
      if (onUploadSuccess) onUploadSuccess({ deleted: true });
      setPreview(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete file');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: getAcceptedFileTypes(),
    maxSize: getMaxSize(),
    multiple: false,
    disabled: disabled || uploading,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleFileUpload(acceptedFiles[0]);
      }
    },
    onDropRejected: (fileRejections) => {
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach(error => {
          if (error.code === 'file-too-large') {
            toast.error(`File is too large. Maximum size is ${uploadService.formatFileSize(getMaxSize())}`);
          } else if (error.code === 'file-invalid-type') {
            toast.error('Invalid file type. Please check the allowed formats.');
          } else {
            toast.error(error.message);
          }
        });
      });
    }
  });

  const getUploadText = () => {
    switch (type) {
      case 'resume':
        return {
          title: 'Upload Resume',
          subtitle: 'PDF, DOC, DOCX up to 10MB',
          dragText: 'Drop your resume here',
          buttonText: 'Choose Resume'
        };
      case 'profilePicture':
        return {
          title: 'Upload Profile Picture',
          subtitle: 'JPG, PNG, GIF up to 5MB',
          dragText: 'Drop your image here',
          buttonText: 'Choose Image'
        };
      default:
        return {
          title: 'Upload File',
          subtitle: 'Select a file to upload',
          dragText: 'Drop your file here',
          buttonText: 'Choose File'
        };
    }
  };

  const uploadText = getUploadText();

  return (
    <div className={`w-full ${className}`}>
      {/* Current File Display */}
      {currentFile && !uploading && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {type === 'profilePicture' && currentFile ? (
                <img
                  src={currentFile}
                  alt="Profile"
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {type === 'resume' ? 'Resume uploaded' : 'Profile picture uploaded'}
                </p>
                <p className="text-xs text-gray-500">Click to replace</p>
              </div>
            </div>
            <button
              onClick={handleDelete}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
              disabled={disabled}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        
        {uploading ? (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Uploading...</p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{progress}% complete</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="w-24 h-24 mx-auto rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
            )}
            
            <div>
              <h3 className="text-lg font-medium text-gray-900">{uploadText.title}</h3>
              <p className="text-sm text-gray-500">{uploadText.subtitle}</p>
            </div>
            
            {isDragActive ? (
              <p className="text-blue-600 font-medium">{uploadText.dragText}</p>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-600">Drag and drop your file here, or</p>
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={disabled || uploading}
                >
                  {uploadText.buttonText}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;