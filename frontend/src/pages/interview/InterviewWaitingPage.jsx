import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaCheckCircle, FaSpinner } from 'react-icons/fa';
import  interviewService  from '../../services/interviewService';
import { motion } from 'framer-motion';

const InterviewWaitingPage = () => {
  console.log('Rendering InterviewWaitingPage');
  const [status, setStatus] = useState('preparing');
  const [countdown, setCountdown] = useState(30);
  const { id } = useParams(); 
  const navigate = useNavigate();

  useEffect(() => {
    const checkInterviewStatus = async () => {
      try {
        const response = await interviewService.getInterviewStatus(id); 
        console.log('Interview status response:', response);
        if (response.status === 'ready') {
          setStatus('ready');
          // Start countdown to automatically navigate
          const timer = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                clearInterval(timer);
                navigate(`/interview/voice/${id}`); 
                return 0;
              }
              return prev - 1;
            });
          }, 10000);
          return () => clearInterval(timer);
        } else {
          // If not ready, check again in 5 seconds
          setTimeout(checkInterviewStatus, 5000);
        }
      } catch (error) {
        console.error('Failed to check interview status:', error);
        setStatus('error');
      }
    };

    checkInterviewStatus();
  }, [id, navigate]); 

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg text-center"
      >
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Interview Preparation</h1>
        
        {status === 'preparing' && (
          <div className="space-y-4">
            <div className="flex justify-center mb-4">
              <FaSpinner className="animate-spin text-4xl text-blue-500" />
            </div>
            <p className="text-gray-600">
              Your interview is being prepared. This may take a few moments.
            </p>
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <h3 className="font-medium text-blue-700 mb-2">While you wait:</h3>
              <ul className="text-left text-sm text-gray-600 space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">•</span> Ensure your camera and microphone are working
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span> Find a quiet space with good lighting
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span> Have your resume and notes ready
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span> Take a deep breath and stay calm
                </li>
              </ul>
            </div>
          </div>
        )}

        {status === 'ready' && (
          <div className="space-y-4">
            <div className="flex justify-center mb-4">
              <FaCheckCircle className="text-4xl text-green-500" />
            </div>
            <p className="text-gray-600">
              Your interview is ready to begin!
            </p>
            <p className="font-semibold text-lg">
              Starting in {countdown} seconds...
            </p>
            <button 
              onClick={() => navigate(`/interview/voice/${id}`)} 
              className="mt-4 w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition duration-200"
            >
              Start Now
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 text-red-600">
            <p>There was an error preparing your interview.</p>
            <p>Please try again later or contact support.</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="mt-4 w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md transition duration-200"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default InterviewWaitingPage;