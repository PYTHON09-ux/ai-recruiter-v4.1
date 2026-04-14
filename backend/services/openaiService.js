// services/openaiService.js
// Uses the OpenAI SDK pointed at OpenRouter's API — the simplest, most reliable
// way to call OpenRouter. No @openrouter/sdk quirks; same interface as before.
//
// .env:  OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxx
//
// Requires the openai package (already installed):  npm install openai

const OpenAI = require("openai");

const MODEL = "arcee-ai/trinity-large-preview:free";

class OpenRouterService {
  constructor() {
    this.apiKey = process.env.OPEN_ROUTER_API_KEY;

    if (!this.apiKey) {
      console.warn("[OpenRouter] OPENROUTER_API_KEY not found in environment variables");
      return;
    }

    // Point the standard OpenAI SDK at OpenRouter's base URL — officially recommended
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.APP_URL  || "https://localhost",
        "X-Title":      process.env.APP_NAME || "AI Recruiter",
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Internal helper — send messages, return the full text response
  // ─────────────────────────────────────────────────────────────────────────
  async _chat(systemPrompt, userPrompt, temperature = 0.3) {
    if (!this.client) throw new Error("OpenRouter not configured");

    const response = await this.client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt   },
      ],
      temperature,
    });

    return response.choices[0].message.content.trim();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Generate slight variations of interview questions
  // ─────────────────────────────────────────────────────────────────────────
  async generateQuestionVariations(originalQuestions, jobTitle, candidateName) {
    try {
      const userPrompt = `You are an expert interviewer. Generate slight variations of these interview questions for a ${jobTitle} position interview with ${candidateName}.

Original Questions:
${originalQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Requirements:
- Keep the core intent of each question the same
- Make small variations in wording to feel more natural and personalized
- Maintain professional tone
- Ensure questions are relevant to the ${jobTitle} role
- Return exactly ${originalQuestions.length} questions

Format your response as a JSON array of strings. Return ONLY valid JSON — no markdown, no extra text.`;

      const content = await this._chat(
        "You are an expert interviewer who creates personalized interview questions. Always respond with valid JSON only — no markdown, no extra text.",
        userPrompt,
        0.7
      );

      try {
        const clean = content.replace(/```json|```/g, "").trim();
        const variations = JSON.parse(clean);
        return Array.isArray(variations) ? variations : originalQuestions;
      } catch {
        console.warn("[OpenRouter] Failed to parse question variations JSON");
        return originalQuestions;
      }
    } catch (error) {
      console.error("[OpenRouter] generateQuestionVariations error:", error.message);
      return originalQuestions;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Evaluate a full interview transcript
  //
  //  transcript — plain string:
  //    "Interviewer: Tell me about yourself\nCandidate: ..."
  //
  //  Returns object shaped to match Interview.evaluation schema:
  //  { overallScore, scores, strengths, improvements, recommendation, summary }
  // ─────────────────────────────────────────────────────────────────────────
  async evaluateTranscript(transcript, jobTitle, jobRequirements) {
    try {
      const userPrompt = `You are an expert technical interviewer evaluating a candidate for a "${jobTitle}" position.

Job Requirements:
${jobRequirements || "Not specified"}

Full Interview Transcript:
${transcript}

Evaluate the candidate based on the entire conversation above. Assess across these categories:
- Technical Knowledge
- Communication
- Problem Solving
- Cultural Fit
- Confidence

Return ONLY a valid JSON object in exactly this format (no extra text, no markdown):
{
  "overallScore": <number 0-100>,
  "scores": [
    { "category": "Technical Knowledge", "score": <0-100>, "feedback": "<specific feedback>" },
    { "category": "Communication",       "score": <0-100>, "feedback": "<specific feedback>" },
    { "category": "Problem Solving",     "score": <0-100>, "feedback": "<specific feedback>" },
    { "category": "Cultural Fit",        "score": <0-100>, "feedback": "<specific feedback>" },
    { "category": "Confidence",          "score": <0-100>, "feedback": "<specific feedback>" }
  ],
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area 1>", "<area 2>"],
  "recommendation": "<hire|maybe|reject>",
  "summary": "<2-3 sentence overall summary of the candidate>"
}`;

      const content = await this._chat(
        "You are an expert interviewer. Evaluate candidates fairly and objectively. Always respond with valid JSON only — no markdown, no extra text.",
        userPrompt,
        0.3
      );

      try {
        const clean = content.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);

        // Normalise recommendation to schema enum: 'hire' | 'maybe' | 'reject'
        const recMap = { consider: "maybe", yes: "hire", no: "reject" };
        if (parsed.recommendation) {
          parsed.recommendation = recMap[parsed.recommendation] ?? parsed.recommendation;
        }

        return parsed;
      } catch (parseError) {
        console.error("[OpenRouter] Failed to parse evaluation JSON:", parseError.message);
        return {
          overallScore: 50,
          scores: [
            { category: "Technical Knowledge", score: 50, feedback: "Manual review required" },
            { category: "Communication",       score: 50, feedback: "Manual review required" },
            { category: "Problem Solving",     score: 50, feedback: "Manual review required" },
            { category: "Cultural Fit",        score: 50, feedback: "Manual review required" },
            { category: "Confidence",          score: 50, feedback: "Manual review required" },
          ],
          strengths: [],
          improvements: ["Automatic evaluation failed — manual review required"],
          recommendation: "maybe",
          summary: "Evaluation could not be parsed automatically. Manual review required.",
        };
      }
    } catch (error) {
      console.error("[OpenRouter] evaluateTranscript error:", error);
      throw new Error("Failed");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Generate a short interview summary from the transcript
  // ─────────────────────────────────────────────────────────────────────────
  async generateInterviewSummary(transcript, jobTitle, durationSeconds) {
    try {
      const mins = Math.round((durationSeconds || 0) / 60);

      const userPrompt = `Analyze this interview transcript for a "${jobTitle}" position (Duration: ~${mins} minutes).

Transcript:
${transcript}

Provide a concise professional summary covering:
1. Key topics discussed
2. Candidate's main qualifications highlighted
3. Notable strengths or concerns
4. Overall interview flow

Keep it to 3-5 sentences. Be objective.`;

      const summary = await this._chat(
        "You are an expert interviewer who writes concise, professional interview summaries.",
        userPrompt,
        0.3
      );

      return summary || "Summary generation failed — manual review required";
    } catch (error) {
      console.error("[OpenRouter] generateInterviewSummary error:", error.message);
      return "Summary generation failed — manual review required";
    }
  }
}

module.exports = new OpenRouterService();