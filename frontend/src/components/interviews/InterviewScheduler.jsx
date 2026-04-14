import React, { useState } from 'react';
import { X, Calendar, Link as LinkIcon, CheckCircle, Loader2 } from 'lucide-react';
import applicationService from '../../services/applicationService';
import toast from 'react-hot-toast';

const InterviewScheduler = ({ application, onSchedule, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [magicLink, setMagicLink] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerateLink = async () => {
    if (!application || !application._id) {
      setError('No application selected');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await applicationService.generateMagicLink(application._id);

      setMagicLink(response.data || response);

      // Notify parent that scheduling succeeded
      if (onSchedule) {
        onSchedule({
          applicationId: application._id,
          candidateId: application.candidateId?._id || application.candidateId,
          jobId: application.jobId?._id || application.jobId,
          status: 'interview_scheduled'
        });
      }

      toast.success('Interview scheduled and magic link generated!');
    } catch (err) {
      console.error('Failed to generate magic link:', err);
      const message = err?.response?.data?.message || err.message || 'Failed to generate interview link';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  const candidateName = application?.candidateId?.name || application?.candidate?.name || 'Candidate';
  const jobTitle = application?.jobId?.title || application?.job?.title || 'Position';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Schedule Interview</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Candidate & Job Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Candidate</div>
            <div className="font-medium text-gray-900">{candidateName}</div>
            <div className="text-sm text-gray-600 mt-2 mb-1">Position</div>
            <div className="font-medium text-gray-900">{jobTitle}</div>
          </div>

          {/* Description */}
          {!magicLink && (
            <p className="text-sm text-gray-600">
              Generate a magic interview link for this candidate. The link will be valid for 24 hours
              and allows the candidate to take their AI-powered interview at their convenience.
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Success - Magic Link Generated */}
          {magicLink && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Interview link generated successfully!</span>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="text-sm text-gray-600">Magic Link URL:</div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={magicLink.magicLinkUrl || ''}
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 truncate"
                  />
                  <button
                    onClick={() => copyToClipboard(magicLink.magicLinkUrl)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center space-x-1"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span>Copy</span>
                  </button>
                </div>

                {magicLink.expiresAt && (
                  <div className="text-xs text-gray-500">
                    Expires: {new Date(magicLink.expiresAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            {magicLink ? 'Close' : 'Cancel'}
          </button>
          {!magicLink && (
            <button
              onClick={handleGenerateLink}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>Generate Interview Link</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewScheduler;