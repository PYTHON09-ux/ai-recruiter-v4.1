import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import interviewService from '../../services/interviewService';

const InterviewPortal = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [interview, setInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  
  // Initialize interview
  useEffect(() => {
    initializeInterview();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [interviewId]);
  
  const initializeInterview = async () => {
    try {
      setIsLoading(true);
      
      // Validate magic link and start interview
      const data = await interviewService.startInterview(interviewId);
      
      setInterview(data.interview);
      setCurrentQuestion(data.firstQuestion);
      setQuestionIndex(0);
      
      // Start question timer
      if (data.firstQuestion?.expectedDuration) {
        startQuestionTimer(data.firstQuestion.expectedDuration);
      }
      
    } catch (error) {
      console.error('Failed to initialize interview:', error);
      setError(error.response?.data?.message || 'Failed to start interview');
      toast.error('Failed to start interview');
    } finally {
      setIsLoading(false);
    }
  };
  
  const startQuestionTimer = (duration) => {
    setTimeRemaining(duration);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await submitResponse(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast.success('Recording started');
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to access microphone');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };
  
  const submitResponse = async (audioBlob) => {
    try {
      const response = await interviewService.submitVoiceResponse(
        interview._id,
        audioBlob,
        questionIndex
      );
      
      // Add response to local state
      setResponses(prev => [...prev, {
        questionIndex,
        question: currentQuestion.question,
        evaluation: response.evaluation
      }]);
      
      // Move to next question or complete interview
      if (response.isLastQuestion) {
        await completeInterview();
      } else {
        setQuestionIndex(response.nextQuestionIndex);
        setCurrentQuestion(response.nextQuestion);
        
        // Start timer for next question
        if (response.nextQuestion?.expectedDuration) {
          startQuestionTimer(response.nextQuestion.expectedDuration);
        }
      }
      
      toast.success('Response submitted successfully');
      
    } catch (error) {
      console.error('Failed to submit response:', error);
      toast.error('Failed to submit response');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const completeInterview = async () => {
    try {
      setIsProcessing(true);
      
      await interviewService.completeInterview(interview._id);
      
      toast.success('Interview completed successfully!');
      navigate(`/interview/${interviewId}/complete`);
      
    } catch (error) {
      console.error('Failed to complete interview:', error);
      toast.error('Failed to complete interview');
      setIsProcessing(false);
    }
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Preparing your interview...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Interview Session</h1>
          <p className="text-gray-600">Question {questionIndex + 1} of {interview?.questions?.length}</p>
        </div>
        
        {/* Progress Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-white rounded-full h-3 shadow-inner">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${((questionIndex + 1) / interview?.questions?.length) * 100}%` }}
            ></div>
          </div>
        </div>
        
        {/* Main Interview Area */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={questionIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-lg p-8 mb-8"
            >
              {/* Question */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <span className="text-2xl">🎤</span>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  {currentQuestion?.question}
                </h2>
                <p className="text-gray-600">
                  Take your time to think and provide a comprehensive answer.
                </p>
              </div>
              
              {/* Timer */}
              {timeRemaining !== null && (
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center px-4 py-2 rounded-full ${
                    timeRemaining <= 30 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    <span className="text-sm font-medium">
                      Time remaining: {formatTime(timeRemaining)}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Recording Controls */}
              <div className="text-center">
                {!isRecording && !isProcessing && (
                  <button
                    onClick={startRecording}
                    className="inline-flex items-center px-8 py-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors text-lg font-medium"
                  >
                    <span className="w-4 h-4 bg-white rounded-full mr-3"></span>
                    Start Recording
                  </button>
                )}
                
                {isRecording && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-500 font-medium">Recording...</span>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="inline-flex items-center px-8 py-4 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors text-lg font-medium"
                    >
                      <span className="w-4 h-4 bg-white rounded-sm mr-3"></span>
                      Stop Recording
                    </button>
                  </div>
                )}
                
                {isProcessing && (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Processing your response...</p>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Previous Responses */}
          {responses.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous Responses</h3>
              <div className="space-y-4">
                {responses.map((response, index) => (
                  <div key={index} className="border-l-4 border-green-400 pl-4">
                    <p className="text-sm text-gray-600 mb-1">
                      Question {response.questionIndex + 1}
                    </p>
                    <p className="text-gray-900 font-medium mb-2">
                      {response.question}
                    </p>
                    <div className="flex items-center text-sm text-green-600">
                      <span className="mr-2">✓</span>
                      Response submitted successfully
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewPortal;