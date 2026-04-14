const OpenAI = require("openai");

class InterviewQuestionGen {
  constructor() {
    this.openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPEN_ROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Recruiter",
      },
    });
  }

  async generateQuestions(interviewData) {
    try {
      const { title, description, requirements, jobType, skills, company, interviewQuestions, interviewDuration } = interviewData;

      // Format existing questions
      const existing = interviewQuestions
        .map(q => `• ${q.question} (${q.type})`)
        .join("\n");

      const prompt = `
Generate ${interviewQuestions.length + 3} interview questions for the job below.
consider existing questions:
${existing ? existing : "None"}
generate no of questions for interview duration of ${interviewDuration} minutes.

Include:
- "question"
- "type": technical | behavioral | situational
- "category": general
- "expectedDuration": 120 (seconds)

Job Details:
Title: ${title}
Description: ${description}
Requirements: ${requirements}
Job Type: ${jobType}
Skills: ${JSON.stringify(skills)}
Company: ${JSON.stringify(company)}



Return ONLY a valid JSON array. No explanation, no comments.
`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
      });

      const responseText = completion.choices[0]?.message?.content .replace(/```json|```/g, "").trim() || "[]";
      return JSON.parse(responseText);

    } catch (err) {
      console.error("Error generating interview questions:", err.message);
      throw new Error("AI question generation failed");
    }
  }
}

// Export CLASS instance
module.exports = new InterviewQuestionGen();
