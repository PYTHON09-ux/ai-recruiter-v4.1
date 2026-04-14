const nodemailer = require('nodemailer');
const { logger } = require('../middleware/logger');

class NotificationService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    try {
      // Use nodemailer.createTransport (not createTransporter)
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER || 'test@example.com',
          pass: process.env.SMTP_PASS || 'testpassword'
        }
      });
    } catch (error) {
      logger.error('Failed to create email transporter', { error: error.message });
      // Return a mock transporter for development
      return {
        sendMail: async (options) => {
          logger.info('Mock email sent', { to: options.to, subject: options.subject });
          return { messageId: 'mock-' + Date.now() };
        }
      };
    }
  }

  async sendEmail(to, subject, html, text = '') {
    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@ai-recruiter.com',
        to,
        subject,
        html,
        text
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { to, subject, messageId: result.messageId });
      return result;
    } catch (error) {
      logger.error('Failed to send email', { to, subject, error: error.message });
      throw error;
    }
  }

  async sendWelcomeEmail(user) {
    const subject = 'Welcome to AI Recruiter Platform';
    const html = `
      <h1>Welcome ${user.firstName || user.name}!</h1>
      <p>Thank you for joining AI Recruiter Platform.</p>
      <p>Your account has been successfully created.</p>
    `;
    
    return this.sendEmail(user.email, subject, html);
  }

  async sendPasswordResetEmail(user, resetToken) {
    const subject = 'Password Reset Request';
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const html = `
      <h1>Password Reset Request</h1>
      <p>Hi ${user.firstName || user.name},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;
    
    return this.sendEmail(user.email, subject, html);
  }

  async sendInterviewInvitation(candidate, interview, job) {
    const subject = `Interview Invitation for ${job.title}`;
    const html = `
      <h1>Interview Invitation</h1>
      <p>Hi ${candidate.firstName || candidate.name},</p>
      <p>You have been invited for an interview for the position of <strong>${job.title}</strong>.</p>
      <p><strong>Date:</strong> ${new Date(interview.scheduledAt).toLocaleDateString()}</p>
      <p><strong>Time:</strong> ${new Date(interview.scheduledAt).toLocaleTimeString()}</p>
      <p><strong>Type:</strong> ${interview.type}</p>
      ${interview.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${interview.meetingLink}">Join Meeting</a></p>` : ''}
    `;
    
    return this.sendEmail(candidate.email, subject, html);
  }

  async sendMagicLinkInterviewInvitation(candidate, job, magicLink) {
    const subject = `AI Voice Interview Invitation for ${job.title}`;
    const html = `
      <h1>AI Voice Interview Invitation</h1>
      <p>Hi ${candidate.name},</p>
      <p>You have been invited to complete an AI-powered voice interview for the <strong>${job.title}</strong> position.</p>
      <p>Please use the magic link below to start your interview. The link will expire in 48 hours.</p>
      <a href="${magicLink}" style="background-color: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Start AI Interview</a>
      <p>If you have any questions, please contact the recruiter.</p>
    `;

    return this.sendEmail(candidate.email, subject, html);
  }

  async sendApplicationStatusUpdate(candidate, application, status) {
    const subject = `Application Status Update - ${status}`;
    const html = `
      <h1>Application Status Update</h1>
      <p>Hi ${candidate.firstName || candidate.name},</p>
      <p>Your application status has been updated to: <strong>${status}</strong></p>
      <p>Job: ${application.job?.title || 'N/A'}</p>
      <p>Company: ${application.job?.company || 'N/A'}</p>
    `;
    
    return this.sendEmail(candidate.email, subject, html);
  }
}

module.exports = new NotificationService();