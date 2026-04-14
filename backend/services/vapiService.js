// backend/services/vapiService.js
// Matches your existing voice.routes.js usage:
//   VapiService.createWebCall(callData)
//   VapiService.getCall(callId)
//   VapiService.processWebhook(webhookData)

const axios = require('axios');

const VAPI_SECRET_KEY = process.env.VAPI_SECRET_KEY;
const VAPI_BASE_URL = 'https://api.vapi.ai';

const vapiAPI = axios.create({
  baseURL: VAPI_BASE_URL,
  headers: {
    Authorization: `Bearer ${VAPI_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

class VapiService {
  // ── Build system prompt from job + questions ──────────────────────────────
  _buildSystemPrompt(jobTitle, company, questions, duration = 10) {
    const questionsList = questions
      .map((q, i) => {
        const qText = typeof q === 'string' ? q : q.question;
        const qType = typeof q === 'object' ? q.type : 'general';
        return `  Q${i + 1} [${qType?.toUpperCase() || 'GENERAL'}]: ${qText}`;
      })
      .join('\n');

    return `You are a professional AI interviewer at ${company || 'the company'} conducting a structured ${duration}-minute interview for the "${jobTitle}" role.

YOUR INSTRUCTIONS:
1. Greet the candidate warmly by name (use the name from the call metadata)
2. Ask each question EXACTLY as written, ONE AT A TIME, in strict order
3. After each response, give ONE short natural acknowledgment (max 1 sentence)
4. Ask a brief follow-up ONLY if the answer was under 15 seconds or unclear
5. After ALL questions are complete, thank the candidate and state the interview is finished
6. NEVER skip questions, NEVER reveal all questions upfront, NEVER evaluate out loud

QUESTIONS (ask in this exact order):
${questionsList}

TONE: Professional, warm, conversational. Think senior recruiter — encouraging but focused.
TIMING: Stay within ${duration} minutes total.
DO NOT: Go off-topic, repeat questions, or discuss salary/benefits.`;
  }

  // ── Build full assistant config for a web call ────────────────────────────
  _buildAssistantConfig(jobTitle, company, questions, candidateName, duration = 10) {
    return {
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.65,
        systemPrompt: this._buildSystemPrompt(jobTitle, company, questions, duration),
      },
      voice: {
        provider: '11labs',
        voiceId: 'paula',
      },
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en-US',
      },
      firstMessage: `Hello ${candidateName}! I'm your AI interviewer for the ${jobTitle} position${company ? ` at ${company}` : ''}. We have about ${duration} minutes together and I'll be asking you ${questions.length} questions. Please speak clearly and take your time. Ready to begin?`,
      endCallMessage: `Thank you so much for your time today, ${candidateName}. Your responses have been recorded and will be reviewed by the hiring team. We'll be in touch with next steps very soon. Have a great day!`,
      maxDurationSeconds: (duration + 2) * 60,
      recordingEnabled: true,
      endCallPhrases: [
        'end the interview',
        'finish the interview',
        'that concludes our interview',
        'the interview is now complete',
      ],
    };
  }

  // ── createWebCall — called by POST /voice/start/:token ────────────────────
  // callData shape: { jobTitle, questions, applicationId, candidateId, jobId }
  async createWebCall(callData) {
    const {
      jobTitle,
      company,
      questions = [],
      applicationId,
      candidateId,
      jobId,
      candidateName = 'Candidate',
      duration = 10,
    } = callData;

    const assistantConfig = this._buildAssistantConfig(
      jobTitle,
      company,
      questions,
      candidateName,
      duration
    );

    // POST to Vapi /call/web — creates a web call session
    const response = await vapiAPI.post('/call/web', {
      assistant: assistantConfig,
      metadata: {
        applicationId: applicationId?.toString(),
        candidateId: candidateId?.toString(),
        jobId: jobId?.toString(),
      },
    });

    // response.data shape: { id, webCallUrl, status, ... }
    return response.data;
  }

  // ── getCall — called by GET /voice/call/:callId ───────────────────────────
  async getCall(callId) {
    const response = await vapiAPI.get(`/call/${callId}`);
    return response.data;
  }

  // ── endCall — optionally call Vapi to terminate a call early ─────────────
  async endCall(callId) {
    const response = await vapiAPI.delete(`/call/${callId}`);
    return response.data;
  }

  // ── processWebhook — called by POST /voice/webhook ───────────────────────
  // Normalises Vapi webhook payloads into a consistent internal shape
  processWebhook(webhookData) {
    const { type, call, artifact } = webhookData;

    switch (type) {
      // ── Call started ────────────────────────────────────────────────────
      case 'call-started':
      case 'status-update': {
        if (call?.status === 'in-progress') {
          return {
            type: 'interview-started',
            callId: call.id,
            applicationId: call.metadata?.applicationId,
            startedAt: call.startedAt || new Date().toISOString(),
          };
        }
        if (call?.status === 'ended') {
          return {
            type: 'interview-ended',
            callId: call.id,
            applicationId: call.metadata?.applicationId,
            endedAt: call.endedAt || new Date().toISOString(),
            duration: call.duration || 0,
            transcript: artifact?.transcript || '',
            recordingUrl: artifact?.recordingUrl || null,
            summary: artifact?.summary || '',
          };
        }
        return { type: 'status-update', callId: call?.id, status: call?.status };
      }

      // ── Call ended (final report) ───────────────────────────────────────
      case 'end-of-call-report': {
        return {
          type: 'interview-ended',
          callId: call?.id,
          applicationId: call?.metadata?.applicationId,
          endedAt: call?.endedAt || new Date().toISOString(),
          duration: call?.duration || 0,
          transcript: artifact?.transcript || '',
          messages: artifact?.messages || [],
          recordingUrl: artifact?.recordingUrl || null,
          summary: artifact?.summary || '',
          analysis: call?.analysis || null,
        };
      }

      // ── Live transcript update ──────────────────────────────────────────
      case 'transcript': {
        return {
          type: 'transcript-update',
          callId: call?.id,
          applicationId: call?.metadata?.applicationId,
          transcript: webhookData.transcript || '',
          role: webhookData.role,
          transcriptType: webhookData.transcriptType, // 'partial' | 'final'
        };
      }

      // ── Tool / function calls (if you add tool use later) ───────────────
      case 'tool-calls':
      case 'function-call': {
        return {
          type: 'tool-call',
          callId: call?.id,
          applicationId: call?.metadata?.applicationId,
          toolCall: webhookData.toolCallList || webhookData.functionCall,
        };
      }

      default:
        return {
          type: 'unknown',
          originalType: type,
          callId: call?.id,
        };
    }
  }
}

module.exports = new VapiService();