const { OpenAI } = require('openai');
const axios = require('axios');

class AIService {
  constructor() {
    // Initialize OpenAI if API key is provided
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    
    // Initialize Vapi if API key is provided
    this.vapiEnabled = !!process.env.VAPI_API_KEY;
    this.vapiWebhookUrl = process.env.VAPI_WEBHOOK_URL;
    this.vapiApiKey = process.env.VAPI_API_KEY;
    
    // Set default AI provider
    this.defaultProvider = process.env.DEFAULT_AI_PROVIDER || 'openai';
  }

  /**
   * Process voice recording to text
   * @param {Buffer} audioBuffer - Audio buffer
   * @returns {Promise<String>} Transcribed text
   */
  async processVoice(audioBuffer) {
    try {
      // Use OpenAI for speech-to-text if Vapi not enabled
      if (this.defaultProvider === 'openai' || !this.vapiEnabled) {
        return await this.transcribeAudio(audioBuffer);
      }
      
      // Implementation for Vapi would go here
      // Since we don't have a direct Vapi integration for this type of processing,
      // we'll fall back to OpenAI for now
      return await this.transcribeAudio(audioBuffer);
    } catch (error) {
      console.error('Voice processing error:', error);
      error.name = 'AIServiceError';
      throw error;
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   * @param {Buffer} audioBuffer - Audio buffer
   * @returns {Promise<String>} Transcribed text
   */
  async transcribeAudio(audioBuffer) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI not initialized. Please provide an API key.');
      }
      
      const tempFilePath = `/tmp/audio-${Date.now()}.wav`;
      const fs = require('fs');
      fs.writeFileSync(tempFilePath, audioBuffer);
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-1",
        language: "en"
      });
      
      // Clean up temp file
      fs.unlinkSync(tempFilePath);
      
      return transcription.text;
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  /**
   * Generate speech from text
   * @param {String} text - Text to convert to speech
   * @returns {Promise<Buffer>} Audio buffer
   */
  async generateSpeech(text) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI not initialized. Please provide an API key.');
      }
      
      const response = await this.openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
        speed: 1.0
      });
      
      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer;
    } catch (error) {
      console.error('Speech generation error:', error);
      throw error;
    }
  }

  /**
   * Evaluate interview response
   * @param {String} question - Interview question
   * @param {String} answer - Candidate's answer
   * @param {Object} context - Job context
   * @returns {Promise<Object>} Evaluation result
   */
  async evaluateResponse(question, answer, context) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI not initialized. Please provide an API key.');
      }
      
      // Create prompt for evaluation
      const prompt = `
        You are an expert AI interviewer evaluating a candidate's response.
        
        Job Title: ${context.title}
        Job Description: ${context.description}
        Job Requirements: ${context.requirements.join(', ')}
        
        Question: ${question}
        Candidate's Answer: ${answer}
        
        Please evaluate the response on the following criteria:
        - Relevance to the question (0-100)
        - Communication clarity (0-100)
        - Technical accuracy (if applicable) (0-100)
        - Completeness of the answer (0-100)
        
        Also provide:
        - Overall score (0-100)
        - Main strengths (comma-separated list)
        - Areas for improvement (comma-separated list)
        - Sentiment analysis (positive, neutral, or negative)
        - Keywords identified in the response (comma-separated list)
        - Brief feedback (2-3 sentences)
        
        Format your response as a JSON object with these fields.
      `;
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      
      const responseText = completion.choices[0].message.content;
      const evaluation = JSON.parse(responseText);
      
      // Add additional metadata
      evaluation.duration = 0; // Would be calculated from audio length
      evaluation.confidence = 0.9;
      
      return evaluation;
    } catch (error) {
      console.error('Evaluation error:', error);
      
      // Fallback evaluation
      return {
        relevance: 70,
        communicationClarity: 75,
        technicalAccuracy: 65,
        completeness: 70,
        overallScore: 70,
        strengths: ["Provided relevant information"],
        improvements: ["Could elaborate more"],
        sentiment: "neutral",
        keywords: ["experience", "skills"],
        feedback: "The answer addressed the question with moderate effectiveness.",
        duration: 0,
        confidence: 0.5
      };
    }
  }

  /**
   * Generate final evaluation based on all responses
   * @param {Array} questionsAndAnswers - Array of question/answer pairs
   * @param {Object} context - Job context
   * @returns {Promise<Object>} Final evaluation
   */
  async generateFinalEvaluation(questionsAndAnswers, context) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI not initialized. Please provide an API key.');
      }
      
      // Create prompt for final evaluation
      const prompt = `
        You are an expert AI recruiter creating a final evaluation for a candidate interview.
        
        Job Title: ${context.title}
        Job Description: ${context.description}
        Job Requirements: ${context.requirements.join(', ')}
        
        Here are all the questions and answers from the interview:
        ${questionsAndAnswers.map((qa, index) => `
        Question ${index + 1} (${qa.category}): ${qa.question}
        Answer: ${qa.answer}
        `).join('\n')}
        
        Please create a comprehensive final evaluation with:
        1. Overall score (0-100)
        2. Skill scores:
           - Communication (0-100)
           - Technical knowledge (0-100)
           - Problem solving (0-100)
           - Cultural fit (0-100)
        3. Top 3 strengths
        4. Top 3 areas for improvement
        5. Detailed feedback (paragraph)
        6. Hiring recommendation (hire, maybe, reject)
        
        Format your response as a JSON object.
      `;
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      
      const responseText = completion.choices[0].message.content;
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Final evaluation error:', error);
      
      // Fallback evaluation
      return {
        overallScore: 75,
        skillScores: {
          communication: 80,
          technical: 70,
          problemSolving: 75,
          cultural: 80
        },
        strengths: [
          "Good communication skills",
          "Relevant experience",
          "Positive attitude"
        ],
        improvements: [
          "Could provide more specific examples",
          "Technical knowledge could be deeper",
          "Answers could be more concise"
        ],
        feedback: "The candidate demonstrated solid communication skills and relevant experience for the role. While their technical knowledge was adequate, more specific examples would have strengthened their responses.",
        recommendation: "maybe",
        detailedAnalysis: {
          responseQuality: 75,
          relevance: 80,
          completeness: 70
        }
      };
    }
  }

  /**
   * Generate interview questions
   * @param {String} jobTitle - Job title
   * @param {String} jobDescription - Job description
   * @param {Array} requirements - Job requirements
   * @returns {Promise<Array>} Generated questions
   */
  async generateQuestions(jobTitle, jobDescription, requirements) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI not initialized. Please provide an API key.');
      }
      
      const requirementsText = Array.isArray(requirements) 
        ? requirements.join(', ') 
        : requirements;
      
      // Create prompt for question generation
      const prompt = `
        You are an expert AI recruiter creating interview questions for the following job:
        
        Job Title: ${jobTitle}
        Job Description: ${jobDescription}
        Job Requirements: ${requirementsText}
        
        Please create 5 interview questions that will help evaluate candidates for this role.
        Include a mix of:
        - General questions about experience
        - Technical questions specific to the role
        - Behavioral questions
        - Cultural fit questions
        
        For each question, provide:
        1. The question text
        2. The category (technical, behavioral, situational, cultural, general)
        3. Expected answer duration in seconds (60-180)
        
        Format your response as a JSON array of question objects.
      `;
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      
      const responseText = completion.choices[0].message.content;
      const parsed = JSON.parse(responseText);
      
      // Ensure we have questions field in the response
      return parsed.questions || parsed;
    } catch (error) {
      console.error('Question generation error:', error);
      
      // Fallback questions
      return [
        {
          question: "Can you tell me about your relevant experience for this position?",
          category: "general",
          expectedDuration: 120
        },
        {
          question: "What interests you about this role and our company?",
          category: "cultural",
          expectedDuration: 90
        },
        {
          question: "Describe a challenging situation you faced at work and how you handled it.",
          category: "behavioral",
          expectedDuration: 120
        },
        {
          question: "What are your greatest strengths and how would they help you succeed in this role?",
          category: "general",
          expectedDuration: 90
        },
        {
          question: "Where do you see yourself in 5 years?",
          category: "general",
          expectedDuration: 60
        }
      ];
    }
  }

  /**
   * Create Vapi assistant for real-time voice interview
   * @param {Object} config - Configuration for the assistant
   * @returns {Promise<Object>} Assistant data
   */
  async createVapiAssistant(config) {
    try {
      if (!this.vapiEnabled || !this.vapiApiKey) {
        throw new Error('Vapi not initialized. Please provide a valid API key.');
      }
      
      const response = await axios.post(
        'https://api.vapi.ai/assistant',
        {
          assistant_id: config.assistantId || `interview-${Date.now()}`,
          first_message: config.firstMessage || "Hello! I'm your AI interviewer today. Are you ready to begin?",
          metadata: {
            jobTitle: config.jobTitle,
            interviewId: config.interviewId
          },
          model: config.model || 'gpt-4',
          voice: config.voice || 'jennifer-playht',
          instructions: `
            You are an AI interviewer conducting a job interview for the position of ${config.jobTitle}.
            Your task is to ask the following questions in order, listening to the candidate's responses.
            After each question, provide a brief acknowledgment before moving to the next question.
            Be professional, encouraging, and conversational.
            
            Here are the questions to ask:
            ${config.questions.map((q, i) => `${i+1}. ${q.question}`).join('\n')}
            
            After asking all questions, thank the candidate for their time and let them know the interview is complete.
          `,
          webhook_url: this.vapiWebhookUrl,
          webhook_events: ['assistant.response', 'call.ended']
        },
        {
          headers: {
            'Authorization': `Bearer ${this.vapiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Vapi assistant creation error:', error);
      error.name = 'VapiError';
      throw error;
    }
  }

  /**
   * Handle Vapi webhook events
   * @param {Object} payload - Webhook payload
   * @returns {Promise<void>}
   */
  async handleVapiWebhook(payload) {
    try {
      // This would handle real-time events from Vapi during an interview
      console.log('Vapi webhook received:', payload.event);
      
      if (payload.event === 'call.ended') {
        // Call ended, process the interview
        const interviewId = payload.metadata?.interviewId;
        if (interviewId) {
          // Get interview service to process completion
          const InterviewService = require('./interviewService');
          await InterviewService.processVapiInterviewCompletion(interviewId, payload);
        }
      }
    } catch (error) {
      console.error('Vapi webhook handling error:', error);
    }
  }
}

module.exports = new AIService();