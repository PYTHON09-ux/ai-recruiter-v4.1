import React from 'react';
import { formatDistanceToNow, format, isValid } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  Video, 
  Phone, 
  MapPin, 
  Mic,
  Edit,
  Trash2,
  Play,
  Square,
  MoreHorizontal
} from 'lucide-react';

// ── Safe date helpers ─────────────────────────────────────────────────────────
// interview.scheduledAt doesn't exist in the Mongoose schema — it may come from
// aiMetadata.scheduledAt, createdAt, or simply be missing. These helpers make
// every date render safe so we never throw "Invalid time value".

const safeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isValid(d) ? d : null;
};

const safeFormat = (value, fmt, fallback = '—') => {
  const d = safeDate(value);
  return d ? format(d, fmt) : fallback;
};

const safeDistance = (value, fallback = 'Unknown time') => {
  const d = safeDate(value);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : fallback;
};

// Derive the best available date to display for an interview
const getDisplayDate = (interview) => {
  return (
    interview.scheduledAt ||
    interview.aiMetadata?.scheduledAt ||
    interview.startedAt ||
    interview.createdAt ||
    null
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const InterviewList = ({ 
  interviews = [], 
  loading, 
  onEdit, 
  onDelete,
  onStart, 
  onReschedule, 
  onCancel 
}) => {
  const getInterviewIcon = (type) => {
    switch (type) {
      case 'video':    return <Video   className="w-4 h-4" />;
      case 'phone':    return <Phone   className="w-4 h-4" />;
      case 'in-person':return <MapPin  className="w-4 h-4" />;
      case 'voice':    return <Mic     className="w-4 h-4" />;
      default:         return <Calendar className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':   return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'completed':   return 'bg-gray-100 text-gray-800';
      case 'cancelled':   return 'bg-red-100 text-red-800';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800';
      default:            return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'video':     return 'text-blue-600';
      case 'phone':     return 'text-green-600';
      case 'in-person': return 'text-purple-600';
      case 'voice':     return 'text-orange-600';
      default:          return 'text-gray-600';
    }
  };

  const canStartInterview = (interview) => {
    if (interview.status !== 'scheduled') return false;
    const displayDate = getDisplayDate(interview);
    if (!displayDate) return true; // no date stored — allow start
    const d = safeDate(displayDate);
    if (!d) return true;
    const minutesDiff = (d.getTime() - Date.now()) / (1000 * 60);
    return minutesDiff <= 15 && minutesDiff >= -30;
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-24" />
                </div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (interviews.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No interviews scheduled</p>
      </div>
    );
  }

  // ── Interview cards ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {interviews.map((interview) => {
        const displayDate = getDisplayDate(interview);

        // Resolve candidate + job from either top-level virtuals or populated refs
        const candidateName =
          interview.candidate?.name ||
          interview.candidateId?.name ||
          'Unknown Candidate';

        const jobTitle   = interview.job?.title   || interview.jobId?.title   || '—';
        const jobCompany = interview.job?.company  || interview.jobId?.company || '';

        return (
          <div
            key={interview._id}
            className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              {/* Left: icon + details */}
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg bg-gray-50 ${getTypeColor(interview.type)}`}>
                  {getInterviewIcon(interview.type)}
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {candidateName}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(interview.status)}`}>
                      {interview.status?.replace('_', ' ') || 'unknown'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {jobTitle}{jobCompany ? ` at ${jobCompany}` : ''}
                  </p>

                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{safeFormat(displayDate, 'MMM dd, yyyy', 'Date not set')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{safeFormat(displayDate, 'HH:mm', '—')}</span>
                    </div>
                    {interview.duration > 0 && (
                      <div className="flex items-center space-x-1">
                        <span>{interview.duration} min</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: action buttons */}
              <div className="flex items-center space-x-2">
                {canStartInterview(interview) && (
                  <button
                    onClick={() => onStart(interview)}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start</span>
                  </button>
                )}

                {interview.status === 'scheduled' && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onEdit(interview)}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Edit interview"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onReschedule(interview)}
                      className="p-2 text-gray-400 hover:text-yellow-600 rounded-lg hover:bg-yellow-50 transition-colors"
                      title="Reschedule interview"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onCancel(interview)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Cancel interview"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {onDelete && (
                  <button
                    onClick={() => onDelete(interview)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete interview"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Meeting link / notes */}
            {(interview.meetingLink || interview.notes) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                {interview.meetingLink && (
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Meeting:</strong>{' '}
                    <a
                      href={interview.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 ml-1"
                    >
                      {interview.type === 'in-person' ? interview.meetingLink : 'Join Meeting'}
                    </a>
                  </p>
                )}
                {interview.notes && (
                  <p className="text-sm text-gray-600">
                    <strong>Notes:</strong> {interview.notes}
                  </p>
                )}
              </div>
            )}

            {/* Time until / since interview */}
            {interview.status === 'scheduled' && displayDate && (
              <div className="mt-3 text-xs text-gray-500">
                {safeDistance(displayDate)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default InterviewList;