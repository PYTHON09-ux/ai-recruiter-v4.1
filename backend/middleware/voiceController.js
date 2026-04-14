const Interview = require('../models/Interview');
const OpenAIService = require('../services/openaiService');
const ApplicationService = require('../services/applicationService');
const Job = require('../models/Job');

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/voice/save-result
//
//  Frontend sends:
//  { interviewId, transcript, callId, durationSeconds, completedAt,
//    proctoringViolations, proctoringFlagged, tabSwitchCount }
//
//  transcript = [{ role: 'assistant'|'user', text, question?, timestamp }]
// ─────────────────────────────────────────────────────────────────────────────
async function saveInterviewResult(req, res) {
  try {
    const {
      interviewId,
      transcript,
      callId,
      durationSeconds,
      completedAt,
      proctoringViolations,
      proctoringFlagged,
      tabSwitchCount,
    } = req.body;

    if (!interviewId) {
      return res.status(400).json({ message: 'interviewId is required' });
    }

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    const messages = Array.isArray(transcript) ? transcript : [];

    // ── 1. Persist each user answer with its paired question ─────────────────
    messages.forEach((msg, i) => {
      if (msg.role === 'user' && msg.text?.trim()) {
        const question =
          msg.question ||
          messages.slice(0, i).reverse().find(m => m.role === 'assistant')?.text ||
          'Interview question';

        interview.addResponse(
          question,  // questionId key
          null,      // audioUrl
          msg.text,  // Vapi STT transcription
          null       // duration
        );
      }
    });

    // ── 2. Build flat transcript string (full conversation) ───────────────────
    const transcriptString = messages
      .filter(m => m.text?.trim())
      .map(m => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.text}`)
      .join('\n');

    // ── 3. Send FULL transcript to OpenAI for evaluation ─────────────────────
    //       Evaluation stored in model via setEvaluation — never returned to frontend
    if (transcriptString) {
      try {
        const job = await Job.findById(interview.jobId);
        console.log(transcriptString);
        // evaluateTranscript receives the whole conversation — no Q&A parsing needed
        const evaluationData = await OpenAIService.evaluateTranscript(
          transcriptString,
          job?.title || 'the position',
          job?.requirements || job?.description || ''
        );

        console.log('[Voice] OpenAI evaluation result:', evaluationData);
        // setEvaluation stamps evaluatedAt + evaluatedBy:'ai'
        interview.setEvaluation(evaluationData);

        // Generate summary from same transcript
        const summary = await OpenAIService.generateInterviewSummary(
          transcriptString,
          job?.title || 'the position',
          durationSeconds || 0
        );
        if (summary) interview.summary = summary;

      } catch (evalErr) {
        console.warn('[Voice] OpenAI evaluation failed (non-fatal):', evalErr.message);
      }
    }

    // ── 4. Proctoring metadata ────────────────────────────────────────────────
    interview.technicalMetadata = {
      ...interview.technicalMetadata,
      interruptionCount: tabSwitchCount || 0,
      connectionQuality: proctoringFlagged ? 'flagged' : 'good',
    };

    if (proctoringViolations?.length) {
      interview.aiMetadata = {
        ...interview.aiMetadata,
        errors: proctoringViolations.map(v => `${v.type}: ${v.desc}`),
      };
    }

    // ── 5. Finalise ───────────────────────────────────────────────────────────
    if (transcriptString) interview.transcript = transcriptString;
    if (callId)           interview.vapiCallId  = callId;

    interview.duration    = durationSeconds || 0;
    interview.completedAt = completedAt ? new Date(completedAt) : new Date();
    interview.status      = 'completed';

    await interview.save();

    // ── 6. Update application status ─────────────────────────────────────────
    try {
      await ApplicationService.updateStatus(
        interview.applicationId,
        'interview_completed',
        interview.recruiterId,
        'Voice interview completed'
      );
    } catch (appErr) {
      console.warn('[Voice] Application status update failed (non-fatal):', appErr.message);
    }

    // Only success flag — evaluation stays in DB
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[Voice] saveInterviewResult error:', error);
    return res.status(500).json({ message: 'Failed to save result' });
  }
}

module.exports = { saveInterviewResult };