import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import  interviewService from '../../services/interviewService';
import { FaChartBar, FaClipboardList, FaRegLightbulb, FaVideo } from 'react-icons/fa';

const InterviewFeedbackPage = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setLoading(true);
        const data = await interviewService.getInterviewFeedback(interviewId);
        setFeedback(data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch feedback:', err);
        setError('Unable to load your feedback. Please try again later.');
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [interviewId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your interview feedback...</p>
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

  // Dummy data in case the API doesn't return complete information
  const dummyFeedback = {
    summary: "Overall, you demonstrated strong technical knowledge and good problem-solving abilities. Your communication was clear, though sometimes verbose. You showed enthusiasm for the role and company culture.",
    strengths: [
      "Technical knowledge in the required areas",
      "Structured approach to problem-solving",
      "Good examples of past experiences",
      "Enthusiastic attitude"
    ],
    improvements: [
      "Be more concise in your answers",
      "Provide more quantitative results when discussing past achievements",
      "Deepen your knowledge of [specific technology]",
      "Work on explaining complex concepts more simply"
    ],
    questionFeedback: [
      {
        question: "Tell me about your experience with React.",
        answer: "I've been working with React for 3 years, building various applications including e-commerce platforms and dashboard interfaces...",
        feedback: "Good depth of knowledge shown. Consider focusing more on specific technical challenges you've overcome with React."
      },
      {
        question: "How would you optimize database queries in a high-traffic application?",
        answer: "I would implement caching strategies, optimize indexes, use connection pooling...",
        feedback: "Excellent technical understanding. Your answer showed both breadth and depth of knowledge."
      }
    ],
    behavioralAnalysis: {
      confidence: 7.5,
      clarity: 8.2,
      engagement: 7.8,
      nervousness: 3.5
    },
    proctoringInsights: {
      attentiveness: "Maintained good focus throughout the interview",
      environmentIssues: "None detected",
      potentialConcerns: "No concerns identified"
    },
    nextSteps: "Based on your performance, we recommend focusing on improving your conciseness and practicing more specific technical questions related to the role."
  };

  // Merge any missing data from the API with our dummy data
  const mergedFeedback = { ...dummyFeedback, ...feedback };

  const tabContent = {
    summary: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Overall Summary</h3>
          <p className="text-gray-700">{mergedFeedback.summary}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-50 p-4 rounded-md">
            <h4 className="font-medium text-green-700 mb-2">Strengths</h4>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              {mergedFeedback.strengths.map((strength, index) => (
                <li key={index}>{strength}</li>
              ))}
            </ul>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-md">
            <h4 className="font-medium text-amber-700 mb-2">Areas for Improvement</h4>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              {mergedFeedback.improvements.map((improvement, index) => (
                <li key={index}>{improvement}</li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Next Steps</h3>
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-gray-700">{mergedFeedback.nextSteps}</p>
          </div>
        </div>
      </div>
    ),
    
    questions: (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-800">Question-by-Question Analysis</h3>
        
        {mergedFeedback.questionFeedback.map((item, index) => (
          <div key={index} className="border-b border-gray-200 pb-5 mb-5 last:border-b-0 last:pb-0 last:mb-0">
            <div className="bg-gray-50 p-3 rounded-md mb-3">
              <h4 className="font-medium text-gray-800">{item.question}</h4>
            </div>
            
            <div className="pl-4 border-l-2 border-gray-200 mb-3">
              <p className="text-gray-600 italic">{item.answer}</p>
            </div>
            
            <div className="pl-4 border-l-2 border-blue-400">
              <p className="text-gray-700">{item.feedback}</p>
            </div>
          </div>
        ))}
      </div>
    ),
    
    behavioral: (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Behavioral Analysis</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(mergedFeedback.behavioralAnalysis).map(([key, value]) => (
            <div key={key} className="bg-gray-50 p-4 rounded-md">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 capitalize">{key}</span>
                <span className="text-sm font-semibold">{value}/10</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div 
                  className={`h-2 rounded-full ${
                    value > 7 ? 'bg-green-500' : value > 4 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${value * 10}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6">
          <h4 className="font-medium text-gray-800 mb-3">Proctoring Insights</h4>
          
          <div className="space-y-4">
            {Object.entries(mergedFeedback.proctoringInsights).map(([key, value]) => (
              <div key={key} className="flex">
                <div className="w-1/3 text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                <div className="w-2/3 text-gray-800">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    
    recommendations: (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Personalized Recommendations</h3>
        
        <div className="bg-blue-50 p-5 rounded-md mb-6">
          <h4 className="font-medium text-blue-700 mb-3">Interview Improvement Plan</h4>
          <p className="text-gray-700 mb-4">Based on your performance, here are some targeted areas to focus on:</p>
          
          <ul className="space-y-4">
            {mergedFeedback.improvements.map((improvement, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-3 mt-1 text-blue-500">•</span>
                <div>
                  <p className="font-medium text-gray-800">{improvement}</p>
                  <p className="text-gray-600 text-sm mt-1">
                    {index === 0 
                      ? "Try using the STAR method (Situation, Task, Action, Result) while keeping answers under 2 minutes."
                      : index === 1
                      ? "Include metrics and specific outcomes when discussing your achievements."
                      : "Set aside time for focused learning in this area and create practical projects to solidify knowledge."
                    }
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-800 mb-3">Resources</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 p-4 rounded-md">
              <h5 className="font-medium mb-2">Practice Interviews</h5>
              <p className="text-gray-600 text-sm mb-3">Schedule additional practice sessions focused on your improvement areas.</p>
              <button className="text-blue-600 text-sm font-medium hover:text-blue-800">
                Book Practice Session
              </button>
            </div>
            
            <div className="border border-gray-200 p-4 rounded-md">
              <h5 className="font-medium mb-2">Learning Materials</h5>
              <p className="text-gray-600 text-sm mb-3">Access curated resources to strengthen your knowledge gaps.</p>
              <button className="text-blue-600 text-sm font-medium hover:text-blue-800">
                View Resources
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Interview Feedback</h1>
            <p className="text-gray-600 mt-1">Detailed analysis and recommendations for your interview</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="py-2 px-4 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition duration-200"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-3 text-sm font-medium flex items-center whitespace-nowrap ${
                activeTab === 'summary' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FaClipboardList className="mr-2" /> Summary
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-4 py-3 text-sm font-medium flex items-center whitespace-nowrap ${
                activeTab === 'questions' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FaVideo className="mr-2" /> Question Analysis
            </button>
            <button
              onClick={() => setActiveTab('behavioral')}
              className={`px-4 py-3 text-sm font-medium flex items-center whitespace-nowrap ${
                activeTab === 'behavioral' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FaChartBar className="mr-2" /> Behavioral Analysis
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`px-4 py-3 text-sm font-medium flex items-center whitespace-nowrap ${
                activeTab === 'recommendations' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FaRegLightbulb className="mr-2" /> Recommendations
            </button>
          </div>
          
          <div className="p-6">
            {tabContent[activeTab]}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default InterviewFeedbackPage;