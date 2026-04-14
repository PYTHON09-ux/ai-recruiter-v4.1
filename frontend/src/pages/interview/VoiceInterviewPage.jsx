import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhone, FiAlertTriangle, FiEye } from 'react-icons/fi';
import interviewService from '../../services/interviewService';
import toast from 'react-hot-toast';

export default function VoiceInterviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes
  const [interviewLoading, setInterviewLoading] = useState(true);
  
  // Proctoring states
  const [proctoringViolations, setProctoringViolations] = useState([]);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isTabActive, setIsTabActive] = useState(true);
  const [faceDetectionActive, setFaceDetectionActive] = useState(false);
  const [multipleFacesDetected, setMultipleFacesDetected] = useState(false);
  const [backgroundNoiseLevel, setBackgroundNoiseLevel] = useState(0);
  const [suspiciousActivity, setSuspiciousActivity] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const faceDetectionIntervalRef = useRef(null);
  const noiseDetectionIntervalRef = useRef(null);

  const fallbackQuestions = [
    "Tell me about yourself and your background.",
    "What interests you about this position?",
    "Describe a challenging project you've worked on.",
    "How do you handle working under pressure?",
    "Where do you see yourself in 5 years?"
  ];

  const [questions, setQuestions] = useState(fallbackQuestions);

  // Fetch interview data from backend on mount
  useEffect(() => {
    const fetchInterview = async () => {
      try {
        setInterviewLoading(true);
        const response = await interviewService.getInterviewById(id);
        const interview = response.data || response;
        if (interview && interview.questions && interview.questions.length > 0) {
          const fetchedQuestions = interview.questions.map(q => q.question);
          setQuestions(fetchedQuestions);
        }
      } catch (err) {
        console.error('Failed to fetch interview data, using fallback questions:', err);
        // Keep fallback questions
      } finally {
        setInterviewLoading(false);
      }
    };
    if (id) {
      fetchInterview();
    } else {
      setInterviewLoading(false);
    }
  }, [id]);

  // Add violation to the list
  const addViolation = useCallback((type, description) => {
    const violation = {
      id: Date.now(),
      type,
      description,
      timestamp: new Date().toLocaleTimeString(),
      severity: type === 'tab_switch' ? 'medium' : type === 'multiple_faces' ? 'high' : 'low'
    };
    
    setProctoringViolations(prev => [...prev, violation]);
    
    // Show warning toast
    if (violation.severity === 'high') {
      toast.error(`⚠️ Proctoring Alert: ${description}`);
    } else {
      toast.error(`⚠️ Warning: ${description}`);
    }
    
    // Mark as suspicious if too many violations
    setProctoringViolations(prev => {
      if (prev.length >= 3) {
        setSuspiciousActivity(true);
        toast.error('🚨 Multiple violations detected! Interview flagged for review.');
      }
      return prev;
    });
  }, []);

  // FIX: Wrapped stopProctoring in useCallback before endInterview since
  // endInterview depends on it.
  const stopProctoring = useCallback(() => {
    setFaceDetectionActive(false);
    
    if (faceDetectionIntervalRef.current) {
      clearInterval(faceDetectionIntervalRef.current);
    }
    if (noiseDetectionIntervalRef.current) {
      clearInterval(noiseDetectionIntervalRef.current);
    }
  }, []);

  // FIX: Wrapped endInterview in useCallback so the timer effect can safely
  // list it as a dependency and always call the latest version without a
  // stale closure.
  const endInterview = useCallback(() => {
    setInterviewStarted(false);
    stopProctoring();
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    // Exit fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
    
    toast.success('Interview completed!');
    navigate(`/interview/complete/${id}`, { 
      state: { 
        violations: proctoringViolations,
        suspicious: suspiciousActivity 
      }
    });
  }, [id, isRecording, navigate, proctoringViolations, stopProctoring, suspiciousActivity]);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (interviewStarted) {
        if (document.hidden) {
          setIsTabActive(false);
          setTabSwitchCount(prev => prev + 1);
          addViolation('tab_switch', 'Candidate switched away from interview tab');
        } else {
          setIsTabActive(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [interviewStarted, addViolation]);

  // Prevent right-click and keyboard shortcuts
  useEffect(() => {
    const preventRightClick = (e) => {
      if (interviewStarted) {
        e.preventDefault();
        addViolation('suspicious_action', 'Right-click attempted during interview');
      }
    };

    const preventKeyboardShortcuts = (e) => {
      if (interviewStarted) {
        // Prevent common shortcuts like Alt+Tab, Ctrl+T, F12, etc.
        if (
          (e.altKey && e.key === 'Tab') ||
          (e.ctrlKey && (e.key === 't' || e.key === 'T')) ||
          (e.ctrlKey && (e.key === 'n' || e.key === 'N')) ||
          (e.ctrlKey && (e.key === 'w' || e.key === 'W')) ||
          e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i'))
        ) {
          e.preventDefault();
          addViolation('suspicious_action', 'Keyboard shortcut blocked during interview');
        }
      }
    };

    document.addEventListener('contextmenu', preventRightClick);
    document.addEventListener('keydown', preventKeyboardShortcuts);

    return () => {
      document.removeEventListener('contextmenu', preventRightClick);
      document.removeEventListener('keydown', preventKeyboardShortcuts);
    };
  }, [interviewStarted, addViolation]);

  // Initialize media and proctoring
  useEffect(() => {
    initializeMedia();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (faceDetectionIntervalRef.current) {
        clearInterval(faceDetectionIntervalRef.current);
      }
      if (noiseDetectionIntervalRef.current) {
        clearInterval(noiseDetectionIntervalRef.current);
      }
    };
  }, []);

  // FIX: Added `endInterview` to the dependency array. Because endInterview is
  // now stable via useCallback, this won't cause infinite re-renders while
  // ensuring the timer always calls the up-to-date function.
  useEffect(() => {
    if (interviewStarted && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            endInterview();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [interviewStarted, timeRemaining, endInterview]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Initialize audio analysis for background noise detection
      initializeAudioAnalysis(stream);
      
      toast.success('Camera and microphone initialized successfully');
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Unable to access camera/microphone. Please check permissions.');
      addViolation('technical_issue', 'Failed to access camera/microphone');
    }
  };

  const initializeAudioAnalysis = (stream) => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
    } catch (error) {
      console.error('Error initializing audio analysis:', error);
    }
  };

  const startProctoring = () => {
    setFaceDetectionActive(true);
    
    // Start face detection (simplified version - in production, use proper face detection library)
    faceDetectionIntervalRef.current = setInterval(() => {
      detectFaces();
    }, 2000);

    // Start noise level monitoring
    noiseDetectionIntervalRef.current = setInterval(() => {
      monitorBackgroundNoise();
    }, 1000);

    toast.success('Proctoring system activated');
  };

  const detectFaces = () => {
    // Simplified face detection - in production, integrate with face-api.js or similar
    // This is a placeholder that randomly simulates face detection
    const simulatedFaceCount = Math.random() > 0.9 ? 2 : 1; // 10% chance of multiple faces
    
    if (simulatedFaceCount > 1) {
      setMultipleFacesDetected(true);
      addViolation('multiple_faces', 'Multiple faces detected in camera feed');
    } else {
      setMultipleFacesDetected(false);
    }
    
    // Simulate no face detection
    if (Math.random() > 0.95) { // 5% chance of no face
      addViolation('no_face', 'No face detected - candidate may have moved away');
    }
  };

  const monitorBackgroundNoise = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    setBackgroundNoiseLevel(average);

    // Detect suspicious noise levels (threshold can be adjusted)
    if (average > 50) { // Adjust threshold as needed
      addViolation('background_noise', 'High background noise detected');
    }
  };

  const startInterview = () => {
    setInterviewStarted(true);
    setCurrentQuestion(questions[0]);
    startProctoring();
    
    // Request fullscreen for better proctoring
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        addViolation('technical_issue', 'Fullscreen mode denied');
      });
    }
    
    toast.success('Interview started! Proctoring is now active.');
  };

  const nextQuestion = () => {
    if (questionIndex < questions.length - 1) {
      const nextIndex = questionIndex + 1;
      setQuestionIndex(nextIndex);
      setCurrentQuestion(questions[nextIndex]);
    } else {
      endInterview();
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
        
        if (!videoTrack.enabled && interviewStarted) {
          addViolation('camera_disabled', 'Camera was disabled during interview');
        }
      }
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
        
        if (!audioTrack.enabled && interviewStarted) {
          addViolation('microphone_disabled', 'Microphone was disabled during interview');
        }
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getViolationColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-blue-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header with Proctoring Status */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">AI Voice Interview</h1>
            {interviewStarted && (
              <div className="flex items-center space-x-2">
                <FiEye className={`w-5 h-5 ${faceDetectionActive ? 'text-green-400' : 'text-gray-400'}`} />
                <span className="text-sm">Proctoring Active</span>
                {suspiciousActivity && (
                  <div className="flex items-center text-red-400">
                    <FiAlertTriangle className="w-4 h-4 mr-1" />
                    <span className="text-xs">Flagged</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-lg font-mono">
              {formatTime(timeRemaining)}
            </div>
            <div className="text-sm text-gray-400">
              Question {questionIndex + 1} of {questions.length}
            </div>
            {!isTabActive && interviewStarted && (
              <div className="text-red-400 text-sm font-bold animate-pulse">
                ⚠️ TAB INACTIVE
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Video Feed */}
          <div className="lg:col-span-3">
            <div className="bg-black rounded-lg overflow-hidden aspect-video relative">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {!isVideoEnabled && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <FiVideoOff className="w-16 h-16 text-gray-400" />
                </div>
              )}

              {/* Proctoring Indicators */}
              {interviewStarted && (
                <div className="absolute top-4 left-4 space-y-2">
                  <div className={`px-2 py-1 rounded text-xs ${multipleFacesDetected ? 'bg-red-600' : 'bg-green-600'}`}>
                    {multipleFacesDetected ? 'Multiple Faces' : 'Single Face'}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${backgroundNoiseLevel > 50 ? 'bg-yellow-600' : 'bg-green-600'}`}>
                    Noise: {Math.round(backgroundNoiseLevel)}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${tabSwitchCount > 0 ? 'bg-red-600' : 'bg-green-600'}`}>
                    Tab Switches: {tabSwitchCount}
                  </div>
                </div>
              )}
              
              {/* Controls Overlay */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                <button
                  onClick={toggleAudio}
                  className={`p-3 rounded-full ${
                    isAudioEnabled ? 'bg-gray-700' : 'bg-red-600'
                  } hover:bg-opacity-80 transition-colors`}
                >
                  {isAudioEnabled ? <FiMic /> : <FiMicOff />}
                </button>
                
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-full ${
                    isVideoEnabled ? 'bg-gray-700' : 'bg-red-600'
                  } hover:bg-opacity-80 transition-colors`}
                >
                  {isVideoEnabled ? <FiVideo /> : <FiVideoOff />}
                </button>
                
                <button
                  onClick={endInterview}
                  className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
                >
                  <FiPhone className="transform rotate-135" />
                </button>
              </div>
            </div>
          </div>

          {/* Interview Panel */}
          <div className="space-y-4">
            {/* Current Question */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Current Question</h3>
              {interviewStarted ? (
                <div>
                  <p className="text-gray-300 mb-3 text-sm">{currentQuestion}</p>
                  <button
                    onClick={nextQuestion}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg transition-colors text-sm"
                  >
                    {questionIndex < questions.length - 1 ? 'Next Question' : 'Finish Interview'}
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-400 mb-3 text-sm">Ready to begin your proctored interview?</p>
                  <button
                    onClick={startInterview}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg transition-colors font-semibold text-sm"
                  >
                    Start Interview
                  </button>
                </div>
              )}
            </div>

            {/* Proctoring Violations */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <FiAlertTriangle className="mr-2" />
                Proctoring Log
              </h3>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {proctoringViolations.length === 0 ? (
                  <p className="text-gray-400 text-xs">No violations detected</p>
                ) : (
                  proctoringViolations.slice(-5).map((violation) => (
                    <div key={violation.id} className={`text-xs ${getViolationColor(violation.severity)}`}>
                      <span className="font-mono">{violation.timestamp}</span> - {violation.description}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Interview Progress */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Progress</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Questions</span>
                  <span>{questionIndex + 1} / {questions.length}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${((questionIndex + 1) / questions.length) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Proctoring Rules */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Proctoring Rules</h3>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• Stay in full view of camera</li>
                <li>• Do not switch tabs or applications</li>
                <li>• Ensure quiet environment</li>
                <li>• Only one person should be visible</li>
                <li>• Keep camera and microphone on</li>
                <li>• No external assistance allowed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}