import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaFileAlt, FaUser } from 'react-icons/fa';
import  interviewService  from '../../services/interviewService';

const InterviewCompletePage = () => {
  const [interviewData, setInterviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { interviewId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInterviewSummary = async () => {
      try {
        setLoading(true);
        const data = await interviewService.getInterviewSummary(interviewId);
        setInterviewData(data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch interview summary:', err);
        setError('Unable to load your interview summary. Please try again later.');
        setLoading(false);
      }
    };

    fetchInterviewSummary();
  }, [interviewId]);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your interview summary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition duration-200"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <FaCheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Interview Completed!</h1>
          <p className="mt-2 text-gray-600">
            Thank you for completing your interview. Here's a summary of your session.
          </p>
        </div>

        {interviewData && (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="bg-blue-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white">Interview Summary</h2>
              <p className="text-blue-100">
                Completed on {formatDate(interviewData.completedAt || new Date())}
              </p>
            </div>

            <div className="p-6">
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <FaFileAlt className="h-5 w-5 text-gray-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-800">Job Position</h3>
                </div>
                <div className="ml-7">
                  <p className="text-gray-700 font-semibold">{interviewData.position || 'Software Engineer'}</p>
                  <p className="text-gray-600">{interviewData.company || 'Tech Company'}</p>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <FaUser className="h-5 w-5 text-gray-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-800">Your Performance</h3>
                </div>
                <div className="ml-7 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Overall Score
                    </p>
                    <div className="h-3 bg-gray-200 rounded-full">
                      <div 
                        className="h-3 bg-blue-600 rounded-full"
                        style={{ width: `${interviewData.overallScore || 0}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">0%</span>
                      <span className="text-xs font-medium">{interviewData.overallScore || 0}%</span>
                      <span className="text-xs text-gray-500">100%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Technical Skills</p>
                      <p className="font-semibold text-gray-800">{interviewData.technicalScore || 'N/A'}/10</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Communication</p>
                      <p className="font-semibold text-gray-800">{interviewData.communicationScore || 'N/A'}/10</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Problem Solving</p>
                      <p className="font-semibold text-gray-800">{interviewData.problemSolvingScore || 'N/A'}/10</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Cultural Fit</p>
                      <p className="font-semibold text-gray-800">{interviewData.culturalFitScore || 'N/A'}/10</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Feedback Summary</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-gray-700 whitespace-pre-line">
                    {interviewData.feedback || 
                    "The AI is currently analyzing your interview responses and preparing personalized feedback. This may take a few minutes to complete. Please check back in your dashboard shortly to view your comprehensive feedback."}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition duration-200"
                >
                  Return to Dashboard
                </button>
                <button
                  onClick={() => navigate(`/interview/${interviewId}/feedback`)}
                  className="py-2 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-md transition duration-200"
                >
                  View Detailed Feedback
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Your interview data is being analyzed by our AI system for further review.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default InterviewCompletePage;