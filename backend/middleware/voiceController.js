const Interview = require('../models/Interview');
const OpenAIService = require('../services/openaiService');
const ApplicationService = require('../services/applicationService');
const Job = require('../models/Job');

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
      terminated,
      terminationReason,
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

        interview.addResponse(question, null, msg.text, null);
      }
    });

    // ── 2. Save structured transcript array ───────────────────────────────────
    if (messages.length > 0) {
      interview.transcript = messages
        .filter(m => m.text?.trim())
        .map(m => ({
          role: m.role,
          text: m.text,
          question: m.question || null,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        }));
    }

    // ── 3. Build flat transcript string for OpenAI evaluation ─────────────────
    const transcriptString = messages
      .filter(m => m.text?.trim())
      .map(m => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.text}`)
      .join('\n');

    // ── 4. Evaluate with OpenAI ───────────────────────────────────────────────
    if (transcriptString) {
      try {
        const job = await Job.findById(interview.jobId);
        console.log('[Voice] Transcript for evaluation:\n', transcriptString);

        const evaluationData = await OpenAIService.evaluateTranscript(
          transcriptString,
          job?.title || 'the position',
          job?.requirements || job?.description || ''
        );

        console.log('[Voice] OpenAI evaluation result:', evaluationData);
        interview.setEvaluation(evaluationData);

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

    // ── 5. Proctoring metadata ────────────────────────────────────────────────
    interview.technicalMetadata = {
      ...interview.technicalMetadata,
      interruptionCount: tabSwitchCount || 0,
      connectionQuality: proctoringFlagged ? 'flagged' : 'good',
    };

    interview.aiMetadata = {
      ...interview.aiMetadata,
      proctoringViolations: Array.isArray(proctoringViolations) ? proctoringViolations : [],
      proctoringFlagged:    proctoringFlagged    || false,
      tabSwitchCount:       tabSwitchCount       || 0,
      ...(terminated         && { terminated:        true }),
      ...(terminationReason  && { terminationReason: terminationReason }),
    };

    // ── 6. Finalise interview fields ──────────────────────────────────────────
    if (callId) interview.vapiCallId = callId;

    interview.duration    = durationSeconds || 0;
    interview.completedAt = completedAt ? new Date(completedAt) : new Date();
    interview.status      = 'completed';

    await interview.save();

    // ── 7. Update application status ─────────────────────────────────────────
    try {
      await ApplicationService.updateApplicationStatus(
        interview.applicationId,
        'interview_completed',
        interview.recruiterId,
        'Voice interview completed'
      );
    } catch (appErr) {
      console.warn('[Voice] Application status update failed (non-fatal):', appErr.message);
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[Voice] saveInterviewResult error:', error);
    return res.status(500).json({ message: 'Failed to save result' });
  }
}

module.exports = { saveInterviewResult };