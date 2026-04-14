const Interview = require('../models/Interview');
const Application = require('../models/Application');
const Job = require('../models/Job');
const jwt = require('jsonwebtoken');

class InterviewService {

  /**
   * Get all interviews with filters and pagination
   */
  async getAllInterviews(filters = {}, options = { page: 1, limit: 10 }) {
    try {
      const query = { ...filters };

      // Resolve recruiterId → jobIds owned by that recruiter
      if (query.recruiterId) {
        const jobs = await Job.find({ recruiterId: query.recruiterId }).select('_id');
        query.jobId = { $in: jobs.map(j => j._id) };
        delete query.recruiterId;
      }

      // Support basic text search across candidate name or job title
      // (requires populated fields — filter in-memory after populate, or use aggregation)
      const searchTerm = query.search;
      delete query.search;

      const interviews = await Interview.find(query)
        .populate('applicationId')
        .populate('jobId', 'title company location')
        .populate('candidateId', 'name email')
        .populate('recruiterId', 'name email')
        .sort({ createdAt: -1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit);

      // In-memory search filter (simple, avoids full-text index requirement)
      const filtered = searchTerm
        ? interviews.filter(i => {
            const name  = i.candidateId?.name?.toLowerCase()  || '';
            const title = i.jobId?.title?.toLowerCase()       || '';
            const term  = searchTerm.toLowerCase();
            return name.includes(term) || title.includes(term);
          })
        : interviews;

      const totalInterviews = await Interview.countDocuments(query);

      return {
        interviews: filtered,
        currentPage: options.page,
        totalPages: Math.ceil(totalInterviews / options.limit),
        totalInterviews,
        hasNextPage: options.page < Math.ceil(totalInterviews / options.limit),
        hasPrevPage: options.page > 1,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get interview by ID with authorization check
   */
  async getInterviewById(id, userId, userRole) {
    try {
      const interview = await Interview.findById(id)
        .populate('applicationId')
        .populate('jobId', 'title company location recruiterId')
        .populate('candidateId', 'name email')
        .populate('recruiterId', 'name email');

      if (!interview) return null;

      if (userRole === 'candidate' && interview.candidateId?._id?.toString() !== userId) {
        return null;
      }
      if (userRole === 'recruiter') {
        const recruiterId = interview.jobId?.recruiterId?.toString?.() || interview.recruiterId?.toString?.();
        if (recruiterId !== userId) return null;
      }

      return interview;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Schedule (create) a new interview
   */
  async scheduleInterview(data, recruiterId) {
    try {
      const job = await Job.findById(data.jobId).select('interviewQuestions interviewDuration');
      if (!job) throw new Error('Job not found');

      const questions = (job.interviewQuestions || []).map((q, index) => ({
        id: q._id.toString(),
        question: q.question,
        type: q.type,
        order: index + 1,
      }));

      const filter = {
        applicationId: data.applicationId,
        jobId: data.jobId,
        candidateId: data.candidateId,
      };

      const update = {
        $set: {
          recruiterId,
          status: 'scheduled',
          questions,
          duration: job.interviewDuration || data.duration || 0,
          // Store scheduledAt in aiMetadata since schema has no dedicated field
          ...(data.scheduledAt && {
            'aiMetadata.scheduledAt': new Date(data.scheduledAt)
          }),
        }
      };

      const options = { new: true, upsert: true, setDefaultsOnInsert: true };
      const interview = await Interview.findOneAndUpdate(filter, update, options);
      return interview;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get interview by Vapi call ID
   */
  async getInterviewByVapiCallId(callId) {
    try {
      return await Interview.findOne({ vapiCallId: callId });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get interview by application ID
   */
  async getInterviewByApplicationId(applicationId) {
    try {
      return await Interview.findOne({ applicationId });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update interview by application ID
   */
  async updateInterviewByApplicationId(applicationId, updates) {
    try {
      return await Interview.findOneAndUpdate(
        { applicationId },
        { $set: updates },
        { new: true }
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create interview (alias used by voice route)
   */
  async createInterview(data) {
    try {
      const interview = new Interview({
        applicationId: data.applicationId,
        jobId: data.jobId,
        candidateId: data.candidateId,
        recruiterId: data.recruiterId,
        status: data.status || 'scheduled',
        questions: data.questions || [],
        vapiCallId: data.vapiCallId,
        startedAt: data.startedAt,
        duration: data.duration || 0,
      });
      await interview.save();
      return interview;
    } catch (error) {
      // If duplicate (applicationId unique constraint), update instead
      if (error.code === 11000) {
        return await Interview.findOneAndUpdate(
          { applicationId: data.applicationId },
          { $set: { vapiCallId: data.vapiCallId, status: data.status || 'in_progress', startedAt: data.startedAt } },
          { new: true }
        );
      }
      throw error;
    }
  }

  /**
   * Complete interview — used by webhook and voice routes
   */
 async completeInterview(id, completionData) {
  try {
    // FIX 1: check interview existence BEFORE accessing its fields
    const interview = await Interview.findById(id);
    if (!interview) return null;

    console.log('Completing interview with data:', { id, completionData });
 
    const application = await Application.findById(interview.applicationId);
 
    interview.status      = 'completed';
    interview.completedAt = completionData.endedAt || new Date();
    interview.duration    = completionData.duration || interview.duration;
 
    if (completionData.transcript)  interview.transcript = completionData.transcript;
    if (completionData.summary)     interview.summary    = completionData.summary;
    if (completionData.evaluation)  interview.setEvaluation(completionData.evaluation);
 
    // FIX 3: persist proctoring data
    interview.aiMetadata = {
      ...interview.aiMetadata,
      ...(completionData.recordingUrl        && { recordingUrl:        completionData.recordingUrl }),
      ...(completionData.proctoringViolations && { proctoringViolations: completionData.proctoringViolations }),
      ...(completionData.proctoringFlagged != null && { proctoringFlagged: completionData.proctoringFlagged }),
      ...(completionData.tabSwitchCount != null    && { tabSwitchCount:    completionData.tabSwitchCount }),
      // FIX 2: persist termination reason if present
      ...(completionData.terminated          && { terminated:          true }),
      ...(completionData.terminationReason   && { terminationReason:   completionData.terminationReason }),
    };
 
    // FIX 2: always mark application as interview_completed, even if terminated
    if (application) {
      application.status = 'interview_completed';
      await application.save();
    }
 
    await interview.save();
    return interview;
  } catch (error) {
    throw error;
  }
}
  

  /**
   * Start interview (auth-based dashboard flow)
   */
  async startInterview(id, userId, userRole) {
    try {
      const interview = await Interview.findById(id).populate('jobId', 'recruiterId');
      if (!interview) return null;

      if (userRole === 'candidate' && interview.candidateId?.toString() !== userId) return null;
      if (userRole === 'recruiter' && interview.jobId?.recruiterId?.toString() !== userId) return null;

      if (['scheduled', 'ready'].includes(interview.status)) {
        interview.start();
        await interview.save();
      }

      return interview;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Start interview by magic link token (public, no auth)
   */
  async startInterviewByToken(token) {
    try {
      if (!token) return null;

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        return null;
      }

      if (decoded.type !== 'magic_interview_link') return null;

      const interview = await Interview.findOne({ applicationId: decoded.applicationId });
      if (!interview) return null;

      if (['scheduled', 'ready'].includes(interview.status)) {
        interview.start();
        await interview.save();
      }

      return interview;
    } catch (error) {
      throw error;
    }
  }

  /**
   * End interview
   */
  async endInterview(id, endData, userId, userRole) {
    try {
      const interview = await Interview.findById(id).populate('jobId', 'recruiterId');
      if (!interview) return null;

      if (userRole === 'candidate' && interview.candidateId?.toString() !== userId) return null;
      if (userRole === 'recruiter' && interview.jobId?.recruiterId?.toString() !== userId) return null;

      interview.complete();

      if (endData.feedback || endData.rating) {
        interview.evaluation = {
          ...interview.evaluation,
          summary: endData.feedback || interview.evaluation?.summary,
          overallScore: endData.rating || interview.evaluation?.overallScore,
          evaluatedAt: new Date(),
          evaluatedBy: userId,
        };
      }

      await interview.save();
      return interview;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get interview status
   */
  async getInterviewStatus(id) {
    try {
      const interview = await Interview.findById(id)
        .select('status startedAt completedAt duration questions responses');
      if (!interview) return null;

      return {
        id: interview._id,
        status: interview.status,
        startedAt: interview.startedAt,
        completedAt: interview.completedAt,
        duration: interview.duration,
        totalQuestions: interview.questions?.length || 0,
        answeredQuestions: interview.responses?.length || 0,
        completionPercentage: interview.getCompletionPercentage(),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reschedule an interview
   */
  async rescheduleInterview(id, scheduledAt, reason, userId) {
    try {
      const interview = await Interview.findById(id).populate('jobId', 'recruiterId');
      if (!interview) return null;

      if (
        interview.jobId?.recruiterId?.toString() !== userId &&
        interview.recruiterId?.toString() !== userId
      ) return null;

      if (['completed', 'cancelled'].includes(interview.status)) return null;

      interview.status = 'scheduled';
      interview.startedAt = undefined;
      // Store new scheduledAt in aiMetadata since schema has no dedicated scheduledAt field
      interview.aiMetadata = {
        ...interview.aiMetadata,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        rescheduleReason: reason,
      };

      await interview.save();
      return interview;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel an interview
   */
  async cancelInterview(id, reason, userId) {
    try {
      const interview = await Interview.findById(id).populate('jobId', 'recruiterId');
      if (!interview) return null;

      if (
        interview.jobId?.recruiterId?.toString() !== userId &&
        interview.recruiterId?.toString() !== userId
      ) return null;

      if (interview.status === 'completed') return null;

      interview.status = 'cancelled';
      interview.aiMetadata = { ...interview.aiMetadata, cancellationReason: reason };
      await interview.save();
      return interview;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get interview feedback
   */
  async getInterviewFeedback(id, userId, userRole) {
    try {
      const interview = await Interview.findById(id)
        .populate('jobId', 'recruiterId title')
        .populate('candidateId', 'name email');
      if (!interview) return null;

      if (userRole === 'candidate' && interview.candidateId?._id?.toString() !== userId) return null;
      if (userRole === 'recruiter') {
        const recruiterId = interview.jobId?.recruiterId?.toString() || interview.recruiterId?.toString();
        if (recruiterId !== userId) return null;
      }

      return {
        interviewId: interview._id,
        status: interview.status,
        evaluation: interview.evaluation,
        responses: interview.responses,
        duration: interview.duration,
        completedAt: interview.completedAt,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add interview feedback (recruiter only)
   */
  async addInterviewFeedback(id, feedbackData, userId) {
    try {
      const interview = await Interview.findById(id).populate('jobId', 'recruiterId');
      if (!interview) return null;

      if (
        interview.jobId?.recruiterId?.toString() !== userId &&
        interview.recruiterId?.toString() !== userId
      ) return null;

      interview.evaluation = {
        ...interview.evaluation,
        summary: feedbackData.feedback,
        overallScore: feedbackData.rating,
        strengths: feedbackData.strengths || [],
        improvements: feedbackData.weaknesses || [],
        recommendation: feedbackData.recommendations,
        evaluatedAt: new Date(),
        evaluatedBy: userId,
      };

      await interview.save();
      return interview;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update interview (recruiter only)
   */
  async updateInterview(id, updates, userId) {
    try {
      const interview = await Interview.findById(id).populate('jobId', 'recruiterId');
      if (!interview) return null;

      if (
        interview.jobId?.recruiterId?.toString() !== userId &&
        interview.recruiterId?.toString() !== userId
      ) return null;

      Object.assign(interview, updates);
      await interview.save();
      return interview;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete interview (recruiter only)
   */
  async deleteInterview(id, userId) {
    try {
      const interview = await Interview.findById(id).populate('jobId', 'recruiterId');
      if (!interview) return false;

      if (
        interview.jobId?.recruiterId?.toString() !== userId &&
        interview.recruiterId?.toString() !== userId
      ) return false;

      await Interview.findByIdAndDelete(id);
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get interviews by application ID
   */
  async getInterviewsByApplication(applicationId, options = { page: 1, limit: 10 }, userId, userRole) {
    try {
      const query = { applicationId };

      const interviews = await Interview.find(query)
        .populate('jobId', 'title company location recruiterId')
        .populate('candidateId', 'name email')
        .sort({ createdAt: -1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit);

      const authorized = interviews.filter(interview => {
        if (userRole === 'candidate') return interview.candidateId?._id?.toString() === userId;
        if (userRole === 'recruiter') {
          const recruiterId = interview.jobId?.recruiterId?.toString() || interview.recruiterId?.toString();
          return recruiterId === userId;
        }
        return true; // admin
      });

      const totalInterviews = await Interview.countDocuments(query);

      return {
        interviews: authorized,
        currentPage: options.page,
        totalPages: Math.ceil(totalInterviews / options.limit),
        totalInterviews,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new InterviewService();