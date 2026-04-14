// routes/voice.js
// Drop-in replacement for your existing file.
// Changes from your original:
//   1. /end/:callId — removed `auth` middleware (candidates have no JWT)
//                     added callId-based ownership check instead
//   2. /start/:token — added candidateName + companyName to VapiService.createWebCall()
//   3. /webhook — responds 200 BEFORE processing (prevents Vapi timeouts)
//   4. processWebhook() now handles Vapi's actual event names (end-of-call-report, etc.)
// Everything else is identical to your original.

const express = require('express');
const router = express.Router();
const VapiService = require('../services/vapiService');
const OpenAIService = require('../services/openaiService');
const ApplicationService = require('../services/applicationService');
const InterviewService = require('../services/interviewService');
const { auth } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/validation');
const { saveInterviewResult } = require('../middleware/voiceController');


// Apply input sanitization to all routes
router.use(sanitizeInput);

router.post('/save-result', saveInterviewResult);


// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/voice/start/:token
//  Public — candidate opens magic link, no JWT needed
// ─────────────────────────────────────────────────────────────────────────────
router.post('/start/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    // Validate magic link
    const { application, job } = await ApplicationService.validateMagicLink(token);

    if (!application || !job) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired interview link'
      });
    }

    // Get candidate info
    const candidate = await require('../models/User').findById(application.candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Generate question variations using OpenAI
    const originalQuestions = job.interviewQuestions || [];
    let questionVariations = originalQuestions;

    try {
      questionVariations = await OpenAIService.generateQuestionVariations(
        originalQuestions,
        job.title,
        candidate.name
      );
    } catch (openAIErr) {
      // Non-fatal — fall back to original questions if OpenAI fails
      console.warn('OpenAI question variation failed, using originals:', openAIErr.message);
    }

    // Create VAPI web call — now passes candidateName + companyName for the assistant prompt
    const callData = {
      jobTitle: job.title,
      companyName: job.company?.name || 'the company',
      candidateName: candidate.name,
      durationMins: job.interviewDuration || 10,
      questions: questionVariations,
      applicationId: application._id,
      candidateId: candidate._id,
      jobId: job._id
    };

    const vapiCall = await VapiService.createWebCall(callData);

    // Create interview record
    const interview = await InterviewService.createInterview({
      applicationId: application._id,
      candidateId: candidate._id,
      recruiterId: job.recruiterId,
      jobId: job._id,
      type: 'voice',
      status: 'in_progress',
      scheduledAt: new Date(),
      startedAt: new Date(),
      questions: questionVariations,
      vapiCallId: vapiCall.id,
      metadata: {
        originalQuestions,
        questionVariations,
        vapiCallData: vapiCall
      }
    });

    // Mark magic link as used (prevents replay)
    await ApplicationService.useMagicLink(token);

    res.status(200).json({
      success: true,
      message: 'Voice interview started successfully',
      data: {
        interview,
        vapiCall,           // { id, webCallUrl, ... } — frontend uses vapiCall.id
        candidate: {
          name: candidate.name,
          email: candidate.email
        },
        job: {
          title: job.title,
          company: job.company,
          interviewDuration: job.interviewDuration,
          interviewQuestions: questionVariations
        }
      }
    });
  } catch (error) {
    console.error('Voice interview start error:', error);
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/voice/end/:callId
//  Called by frontend when interview ends.
//  NOTE: auth middleware REMOVED — candidates have no JWT token.
//        Security: callId is a Vapi-generated UUID; only someone who did the
//        interview knows it. For extra security, verify it exists in your DB.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/end/:callId', async (req, res, next) => {
  try {
    const { callId } = req.params;
    const { responses, duration, transcript: clientTranscript } = req.body;

    // Get call details from VAPI
    const vapiCall = await VapiService.getCall(callId);

    if (!vapiCall) {
      return res.status(404).json({
        success: false,
        message: 'Voice call not found'
      });
    }

    // Find interview by VAPI call ID
    const interview = await InterviewService.getInterviewByVapiCallId(callId);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    // Get job details for evaluation
    const job = await require('../models/Job').findById(interview.jobId);

    // Evaluate responses using OpenAI
    let evaluation = null;
    if (responses && responses.length > 0) {
      try {
        evaluation = await OpenAIService.evaluateResponses(
          responses,
          job.title,
          job.requirements || job.description
        );
      } catch (evalErr) {
        console.warn('OpenAI evaluation failed:', evalErr.message);
      }
    }

    // Use Vapi transcript if available, fall back to client-sent transcript
    const transcript = vapiCall.transcript
      || (Array.isArray(clientTranscript)
        ? clientTranscript.map(m =>
            `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.text}`
          ).join('\n')
        : clientTranscript)
      || 'Transcript not available';

    // Generate interview summary
    const interviewDuration = duration || vapiCall.duration || 0;
    let summary = 'Summary generation in progress.';
    try {
      summary = await OpenAIService.generateInterviewSummary(
        transcript,
        job.title,
        interviewDuration
      );
    } catch (summaryErr) {
      console.warn('OpenAI summary failed:', summaryErr.message);
    }

    // Update interview with results
    const updatedInterview = await InterviewService.completeInterview(interview._id, {
      status: 'completed',
      endedAt: new Date(),
      duration: interviewDuration,
      transcript,
      summary,
      responses: responses || [],
      evaluation,
      vapiCallData: vapiCall
    });

    // Update application status
    await ApplicationService.updateStatus(
      interview.applicationId,
      'interview_completed',
      interview.recruiterId,
      'Voice interview completed successfully'
    );

    res.status(200).json({
      success: true,
      message: 'Voice interview completed successfully',
      data: {
        interview: updatedInterview,
        evaluation,
        summary
      }
    });
  } catch (error) {
    console.error('Voice interview end error:', error);
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/voice/webhook
//  Vapi sends events here — configure in Vapi Dashboard → Server URL
//  IMPORTANT: respond 200 IMMEDIATELY, then process async.
//             Vapi will retry if it doesn't get 200 within ~10s.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/webhook', async (req, res, next) => {
  // Respond immediately — never let Vapi timeout waiting for your DB calls
  res.status(200).json({
    success: true,
    message: 'Webhook processed successfully'
  });

  // Process async after response is sent
  try {
    const webhookData = req.body;

    // Process webhook data — maps Vapi event names to your internal types
    const processedData = VapiService.processWebhook(webhookData);

    switch (processedData.type) {
      case 'interview-started':
        if (processedData.applicationId) {
          await InterviewService.updateInterviewByApplicationId(
            processedData.applicationId,
            { status: 'in_progress', startedAt: processedData.startedAt }
          );
        }
        break;

      case 'interview-ended':
        if (processedData.applicationId) {
          const interview = await InterviewService.getInterviewByApplicationId(
            processedData.applicationId
          );

          // Only process if not already completed by /end/:callId route
          if (interview && interview.status !== 'completed') {
            const job = await require('../models/Job').findById(interview.jobId);

            let summary = processedData.summary; // Vapi may send its own summary
            if (!summary && processedData.transcript) {
              try {
                summary = await OpenAIService.generateInterviewSummary(
                  processedData.transcript,
                  job?.title || '',
                  processedData.duration
                );
              } catch (err) {
                console.warn('Webhook summary generation failed:', err.message);
              }
            }

            await InterviewService.completeInterview(interview._id, {
              status: 'completed',
              endedAt: processedData.endedAt,
              duration: processedData.duration,
              transcript: processedData.transcript,
              recordingUrl: processedData.recordingUrl,
              summary,
              vapiAnalysis: processedData.analysis,
              vapiMessages: processedData.messages
            });

            // Update application if /end route hasn't already done it
            await ApplicationService.updateStatus(
              processedData.applicationId,
              'interview_completed',
              interview.recruiterId,
              'Voice interview completed via webhook'
            );
          }
        }
        break;

      case 'transcript-update':
        // Only save final transcripts — not partials (too many writes)
        if (processedData.transcriptType === 'final' && processedData.applicationId) {
          await InterviewService.updateInterviewByApplicationId(
            processedData.applicationId,
            { transcript: processedData.transcript }
          );
        }
        break;

      default:
        // status-update, hang, tool-calls etc — log but no action needed
        break;
    }
  } catch (error) {
    // Don't rethrow — response already sent
    console.error('VAPI webhook processing error:', error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/voice/call/:callId
//  Recruiter dashboard — fetch live/completed call details
// ─────────────────────────────────────────────────────────────────────────────
router.get('/call/:callId', auth, async (req, res, next) => {
  try {
    const { callId } = req.params;

    const vapiCall = await VapiService.getCall(callId);

    if (!vapiCall) {
      return res.status(404).json({
        success: false,
        message: 'Voice call not found'
      });
    }

    res.status(200).json({
      success: true,
      data: vapiCall
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;