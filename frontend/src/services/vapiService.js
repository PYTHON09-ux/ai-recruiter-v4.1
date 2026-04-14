import Vapi from '@vapi-ai/web';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// ─── Local backend API client ─────────────────────────────────────────────────
const localAPI = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

localAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Vapi Web SDK (browser) ───────────────────────────────────────────────────
// IMPORTANT: Uses PUBLIC key only — never expose secret key in frontend
const vapi = new Vapi(import.meta.env.VITE_VAPI_PUBLIC_KEY);

class VapiService {
  constructor() {
    this.vapi = vapi;
    this.activeCallId = null;
    this.isCallActive = false;
  }

  // ── Build assistant config from your MongoDB job document ──────────────────
  buildAssistantConfig(jobData, candidateName) {
    const questions = jobData.interviewQuestions || [];
    const duration = jobData.interviewDuration || 10;
    const companyName = jobData.company?.name || 'our company';
    const jobTitle = jobData.title || 'the role';

    const questionsList = questions
      .map((q, i) => `  Q${i + 1} [${q.type?.toUpperCase()}]: ${q.question}`)
      .join('\n');

    const systemPrompt = `You are a professional, warm AI interviewer at ${companyName} conducting a structured interview for the "${jobTitle}" position.

CANDIDATE NAME: ${candidateName}

YOUR TASK:
1. Greet ${candidateName} by name and briefly introduce yourself
2. Ask each question below EXACTLY as written, ONE AT A TIME, in order
3. After each answer, give ONE brief natural acknowledgment (e.g., "That's great context, thank you.")
4. Only ask ONE follow-up if the answer was under 15 seconds or unclear — keep it short
5. After ALL questions are done, thank ${candidateName} warmly and say the interview is now complete
6. NEVER reveal the full question list upfront
7. NEVER evaluate or score answers out loud
8. Keep the entire interview within ${duration} minutes

QUESTIONS TO ASK (in this exact order):
${questionsList}

TONE: Professional, warm, conversational, encouraging. Think senior HR manager — not robotic.

IMPORTANT: Do NOT skip any questions. Do NOT go off-topic. Do NOT repeat questions.`;

    return {
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.65,
        systemPrompt,
      },
      voice: {
        provider: '11labs',
        voiceId: 'paula', // Clear, professional neutral voice
      },
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en-US',
      },
      firstMessage: `Hello ${candidateName}! I'm your AI interviewer for the ${jobTitle} position at ${companyName}. We have about ${duration} minutes together. Please speak clearly and take your time — there's no rush. Ready to begin?`,
      endCallMessage: `Thank you so much for your time today, ${candidateName}. Your responses have been recorded and will be reviewed by the team. We'll be in touch with next steps. Best of luck — have a wonderful day!`,
      maxDurationSeconds: (duration + 2) * 60, // slight buffer
      recordingEnabled: true,
      endCallPhrases: [
        'end the interview',
        'finish the interview',
        'that concludes our interview',
        'the interview is complete',
      ],
    };
  }

  // ── Start in-browser voice interview ──────────────────────────────────────
  async startWebInterview(jobData, candidateName) {
    if (this.isCallActive) {
      console.warn('A call is already active');
      return;
    }
    const config = this.buildAssistantConfig(jobData, candidateName);
    await this.vapi.start(config);
    this.isCallActive = true;
  }

  // ── Stop the call ─────────────────────────────────────────────────────────
  stopWebInterview() {
    this.vapi.stop();
    this.isCallActive = false;
    this.activeCallId = null;
  }

  // ── Mute / unmute candidate microphone ────────────────────────────────────
  setMuted(muted) {
    this.vapi.setMuted(muted);
  }

  isMuted() {
    return this.vapi.isMuted();
  }

  // ── Notify YOUR backend that a call started (for webhook correlation) ──────
  async notifyCallStarted(interviewId, callData) {
    try {
      await localAPI.post('/voice/call-started', {
        interviewId,
        vapiCallId: callData?.id,
        callData,
      });
    } catch (err) {
      console.warn('Could not notify backend of call start:', err.message);
      // Non-fatal — interview can still proceed
    }
  }

  // ── Save transcript + metadata to your backend after interview ends ────────
  async saveInterviewResult({ interviewId, transcript, callId, durationSeconds }) {
    try {
      console.log(interviewId, transcript, callId, durationSeconds);
      const response = await localAPI.post('/voice/save-result', {
        interviewId,
        transcript,
        callId,
        durationSeconds,
        completedAt: new Date().toISOString(),
      });
      return response.data;
    } catch (err) {
      console.error('Failed to save interview result:', err);
      throw err;
    }
  }

  // ── Validate a magic link token from your backend ─────────────────────────
  async validateMagicLink(token) {
    const response = await localAPI.post('/interviews/validate-magic-link', { token });
    return response.data;
    // Expected shape: { job, candidateName, interviewId, candidateId }
  }

  // ── Get interview summary after completion ────────────────────────────────
  async getInterviewSummary(interviewId) {
    const response = await localAPI.get(`/interviews/${interviewId}/summary`);
    return response.data;
  }
}

export default new VapiService();