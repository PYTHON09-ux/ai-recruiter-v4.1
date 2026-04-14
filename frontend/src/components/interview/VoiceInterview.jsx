import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  FiMic, 
  FiMicOff, 
  FiPlay, 
  FiPause,
  FiSkipForward,
  FiCheck,
  FiAlertCircle,
  FiLoader
} from 'react-icons/fi';
import api from '../../services/api';

export default function VoiceInterview() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [interviewData, setInterviewData] = useState(null);
  const [vapiCall, setVapiCall] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState([]);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {
    initializeInterview();
    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [token]);

  const initializeInterview = async () => {
    try {
      setLoading(true);
      const response = await api.post(`/voice/start/${token}`);
      console.log('Interview initialization response:', response.data);
      if (response.data.success) {
        setInterviewData(response.data.data);
        setVapiCall(response.data.data.vapiCall);
        setInterviewStarted(true);
        toast.success('Interview started successfully!');
      }
    } catch (error) {
      console.error('Failed to start interview:', error);
      setError(error.response?.data?.message || 'Failed to start interview');
      toast.error(error.response?.data?.message || 'Failed to start interview');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleRecordingComplete(audioBlob);
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
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleRecordingComplete = async (audioBlob) => {
    try {
      // Convert blob to base64 for transmission
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1];
        
        const newResponse = {
          questionIndex: currentQuestion,
          question: interviewData?.interview?.questions?.[currentQuestion]?.question || '',
          audioData: base64Audio,
          timestamp: new Date().toISOString()
        };
        
        setResponses(prev => [...prev, newResponse]);
        
        // Move to next question or complete interview
        if (currentQuestion < (interviewData?.interview?.questions?.length || 0) - 1) {
          setCurrentQuestion(prev => prev + 1);
          toast.success('Response recorded! Moving to next question.');
        } else {
          await completeInterview([...responses, newResponse]);
        }
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Failed to process recording:', error);
      toast.error('Failed to process recording');
    }
  };

  const completeInterview = async (allResponses) => {
    try {
      setLoading(true);
      
      const response = await api.post(`/voice/end/${vapiCall?.id}`, {
        responses: allResponses,
        duration: Math.floor((Date.now() - new Date(interviewData?.interview?.createdAt).getTime()) / 1000)
      });
      
      if (response.data.success) {
        setInterviewCompleted(true);
        toast.success('Interview completed successfully!');
        
        // Redirect to completion page after a delay
        setTimeout(() => {
          navigate(`/interview/${interviewData?.interview?._id}/complete`);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to complete interview:', error);
      toast.error('Failed to complete interview');
    } finally {
      setLoading(false);
    }
  };

  const skipQuestion = () => {
    if (currentQuestion < (interviewData?.interview?.questions?.length || 0) - 1) {
      setCurrentQuestion(prev => prev + 1);
      toast.info('Question skipped');
    } else {
      completeInterview(responses);
    }
  };

  if (loading && !interviewData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Starting your interview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <FiAlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/candidate/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (interviewCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <FiCheck className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Completed!</h2>
          <p className="text-gray-600 mb-4">
            Thank you for completing the interview. Your responses have been recorded and will be evaluated.
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Redirecting...</p>
        </div>
      </div>
    );
  }

  const currentQuestionData = interviewData?.interview?.questions?.[currentQuestion];
  const totalQuestions = interviewData?.interview?.questions?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Voice Interview
              </h1>
              <p className="text-gray-600">
                {interviewData?.job?.title} at {interviewData?.job?.company?.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Question</p>
              <p className="text-2xl font-bold text-blue-600">
                {currentQuestion + 1} / {totalQuestions}
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Current Question */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Question {currentQuestion + 1}
          </h2>
          <p className="text-xl text-gray-800 mb-6">
            {currentQuestionData?.question || 'Loading question...'}
          </p>
          
          {/* Recording Controls */}
          <div className="flex items-center justify-center space-x-4">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                <FiMic className="mr-2" />
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                <FiMicOff className="mr-2" />
                Stop Recording
              </button>
            )}
            
            <button
              onClick={skipQuestion}
              className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              <FiSkipForward className="mr-2" />
              Skip Question
            </button>
          </div>
          
          {isRecording && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center text-red-600">
                <div className="animate-pulse w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                Recording in progress...
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Click "Start Recording" to begin answering the question</li>
            <li>• Speak clearly and at a normal pace</li>
            <li>• Click "Stop Recording" when you're finished with your answer</li>
            <li>• You can skip questions if needed, but try to answer all of them</li>
            <li>• The interview will automatically complete after the last question</li>
          </ul>
        </div>

        {/* Response History */}
        {responses.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Completed Questions</h3>
            <div className="space-y-2">
              {responses.map((response, index) => (
                <div key={index} className="flex items-center text-sm text-gray-600">
                  <FiCheck className="text-green-500 mr-2" />
                  Question {response.questionIndex + 1} - Recorded
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}