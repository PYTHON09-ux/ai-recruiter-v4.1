/**
 * POST /api/interviews/:interviewId/complete
 *
 * Called by vapiService.saveInterviewResult() after the voice call ends.
 * Marks the Interview record as completed, persists the transcript as
 * responses, and stores the Vapi callId + duration for later AI evaluation.
 *
 * Body: { transcript: [{role, text, timestamp}], callId, durationSeconds }
 */

const Interview = require('../models/Interview');

async function completeInterview(req, res) {
  try {
    const { interviewId } = req.params;
    const { transcript = [], callId, durationSeconds = 0,
      proctoringViolations,
      proctoringFlagged,
      tabSwitchCount,
      terminated,
      terminationReason,
    } = req.body;

    const interview = await Interview.findById(interviewId);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Only allow completing interviews that are scheduled or in_progress
    if (!['scheduled', 'in_progress'].includes(interview.status)) {
      return res.status(400).json({
        message: `Cannot complete interview in status: ${interview.status}`
      });
    }

    // Mark interview as started if it wasn't already
    if (interview.status === 'scheduled') {
      interview.start();
    }

    // Complete the interview — sets status, completedAt, duration via model method
    interview.complete();

    // Override duration with the client-reported value if the model's own
    // calculation isn't available (e.g. startedAt was never set server-side)
    if (!interview.duration || interview.duration === 0) {
      interview.duration = durationSeconds;
    }

    // Persist transcript as structured responses.
    // We map each assistant turn to the nearest question by order, and each
    // user turn becomes the response transcription for that question.
    const assistantTurns = transcript.filter(m => m.role === 'assistant');
    const userTurns = transcript.filter(m => m.role === 'user');

    interview.responses = userTurns.map((turn, i) => {
      const matchedQuestion = interview.questions[i];
      return {
        questionId: matchedQuestion?.id || `q_${i}`,
        transcription: turn.text,
        submittedAt: turn.timestamp ? new Date(turn.timestamp) : new Date(),
        retryCount: 0,
      };
    });

    // Store Vapi metadata for AI evaluation pipeline
    if (callId) {
      interview.aiMetadata = {
        ...interview.aiMetadata,
        model: 'vapi',
        processingTime: durationSeconds,
      };
    }

    // Full transcript stored for reference / manual review
    // Using a virtual field or aiMetadata.errors array isn't ideal;
    // if your schema has a `rawTranscript` field, use that instead.
    // For now we attach it to aiMetadata:
    interview.aiMetadata = interview.aiMetadata || {};
    interview.aiMetadata.rawTranscript = transcript;
    interview.aiMetadata.vapiCallId = callId;

    await interview.save();

    return res.status(200).json({
      message: 'Interview completed successfully',
      interviewId: interview._id,
      status: interview.status,
      duration: interview.duration,
      responsesCount: interview.responses.length,
    });
  } catch (error) {
    console.error('completeInterview error:', error);
    return res.status(500).json({ message: 'Failed to save interview result' });
  }
}

/**
 * POST /api/interviews/:interviewId/call-started
 *
 * Called by vapiService.notifyCallStarted() when the Vapi call connects.
 * Marks the Interview as in_progress and stores the call reference.
 *
 * Body: { callId, call }
 */
async function notifyCallStarted(req, res) {
  try {
    const { interviewId } = req.params;
    const { callId, call } = req.body;

    const interview = await Interview.findById(interviewId);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    interview.start(); // sets status = 'in_progress', startedAt = now
    interview.aiMetadata = {
      ...interview.aiMetadata,
      vapiCallId: callId,
    };

    await interview.save();

    return res.status(200).json({ message: 'Interview started', status: interview.status });
  } catch (error) {
    console.error('notifyCallStarted error:', error);
    return res.status(500).json({ message: 'Failed to update interview status' });
  }
}


/**
 * POST /api/interviews/:interviewId/response
 *
 * Called by vapiService or a future per-question submission flow.
 * Adds a single question response to the Interview record.
 *
 * Body: { questionId, transcription, audioUrl, duration }
 */
async function submitResponse(req, res) {
  try {
    const { interviewId } = req.params;
    const { questionId, transcription, audioUrl, duration } = req.body;

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    interview.addResponse(questionId, audioUrl, transcription, duration);
    await interview.save();

    return res.status(200).json({ message: 'Response recorded' });
  } catch (error) {
    console.error('submitResponse error:', error);
    return res.status(500).json({ message: 'Failed to save response' });
  }
}

module.exports = { completeInterview, notifyCallStarted, submitResponse };