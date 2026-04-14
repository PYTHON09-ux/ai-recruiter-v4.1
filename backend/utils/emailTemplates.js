const emailTemplates = {
  // Application confirmation email
  applicationConfirmation: (candidateName, jobTitle, companyName) => ({
    subject: `Application Confirmation - ${jobTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Received!</h1>
          </div>
          <div class="content">
            <h2>Hello ${candidateName},</h2>
            <p>Thank you for applying to the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
            <p>We have successfully received your application and our recruiting team will review it shortly. You will receive an email notification about the next steps in the hiring process.</p>
            <p>In the meantime, you can track your application status in your candidate dashboard.</p>
            <a href="${process.env.FRONTEND_URL}/candidate/applications" class="button">View Application Status</a>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Best regards,<br>The ${companyName} Recruiting Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hello ${candidateName},\n\nThank you for applying to the ${jobTitle} position at ${companyName}.\n\nWe have successfully received your application and our recruiting team will review it shortly. You will receive an email notification about the next steps in the hiring process.\n\nBest regards,\nThe ${companyName} Recruiting Team`
  }),

  // Interview invitation email
  interviewInvitation: (candidateName, jobTitle, companyName, magicLink, expiresAt) => ({
    subject: `Interview Invitation - ${jobTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interview Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Interview Invitation</h1>
          </div>
          <div class="content">
            <h2>Congratulations ${candidateName}!</h2>
            <p>We are pleased to invite you for an AI-powered voice interview for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
            
            <div class="warning">
              <strong>⚠️ Important Instructions:</strong>
              <ul>
                <li>Ensure you have a stable internet connection</li>
                <li>Use a quiet environment with good lighting</li>
                <li>Allow camera and microphone access when prompted</li>
                <li>The interview will be monitored for security purposes</li>
                <li>This link expires on ${new Date(expiresAt).toLocaleString()}</li>
              </ul>
            </div>

            <p>Click the button below to start your interview:</p>
            <a href="${magicLink}" class="button">Start Interview</a>
            
            <p><strong>Interview Link:</strong><br>${magicLink}</p>
            
            <p>The interview consists of several questions and should take approximately 15-20 minutes to complete. Please answer each question thoughtfully and speak clearly.</p>
            
            <p>Good luck!</p>
            <p>Best regards,<br>The ${companyName} Recruiting Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Congratulations ${candidateName}!\n\nWe are pleased to invite you for an AI-powered voice interview for the ${jobTitle} position at ${companyName}.\n\nInterview Link: ${magicLink}\n\nImportant Instructions:\n- Ensure you have a stable internet connection\n- Use a quiet environment with good lighting\n- Allow camera and microphone access when prompted\n- The interview will be monitored for security purposes\n- This link expires on ${new Date(expiresAt).toLocaleString()}\n\nGood luck!\n\nBest regards,\nThe ${companyName} Recruiting Team`
  }),

  // Interview completion notification
  interviewComplete: (candidateName, jobTitle, companyName) => ({
    subject: `Interview Completed - ${jobTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interview Completed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Interview Completed</h1>
          </div>
          <div class="content">
            <h2>Thank you ${candidateName}!</h2>
            <p>You have successfully completed the interview for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
            <p>Our AI system is now processing your responses and generating an evaluation. The recruiting team will review your interview and get back to you with the next steps.</p>
            <p>You can check your application status in your candidate dashboard:</p>
            <a href="${process.env.FRONTEND_URL}/candidate/applications" class="button">View Application Status</a>
            <p>Thank you for your time and interest in joining our team!</p>
            <p>Best regards,<br>The ${companyName} Recruiting Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Thank you ${candidateName}!\n\nYou have successfully completed the interview for the ${jobTitle} position at ${companyName}.\n\nOur AI system is now processing your responses and generating an evaluation. The recruiting team will review your interview and get back to you with the next steps.\n\nThank you for your time and interest in joining our team!\n\nBest regards,\nThe ${companyName} Recruiting Team`
  }),

  // Evaluation ready notification for recruiter
  evaluationReady: (recruiterName, candidateName, jobTitle) => ({
    subject: `Interview Evaluation Ready - ${candidateName} for ${jobTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interview Evaluation Ready</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Interview Evaluation Ready</h1>
          </div>
          <div class="content">
            <h2>Hello ${recruiterName || 'Recruiter'},</h2>
            <p><strong>${candidateName}</strong> has completed their interview for the <strong>${jobTitle}</strong> position.</p>
            <p>The AI evaluation has been generated and is now available for your review in the recruiter dashboard.</p>
            <p>The evaluation includes:</p>
            <ul>
              <li>Overall interview score</li>
              <li>Skill-specific assessments</li>
              <li>Strengths and areas for improvement</li>
              <li>Hiring recommendation</li>
              <li>Proctoring report</li>
            </ul>
            <a href="${process.env.FRONTEND_URL}/recruiter/candidates" class="button">Review Evaluation</a>
            <p>Please review the evaluation and take the next steps in your hiring process.</p>
            <p>Best regards,<br>AI Recruiter Platform</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hello ${recruiterName || 'Recruiter'},\n\n${candidateName} has completed their interview for the ${jobTitle} position.\n\nThe AI evaluation has been generated and is now available for your review in the recruiter dashboard.\n\nPlease review the evaluation and take the next steps in your hiring process.\n\nBest regards,\nAI Recruiter Platform`
  }),

  // Hired notification
  hiredNotification: (candidateName, jobTitle, companyName) => ({
    subject: `🎉 Congratulations! You've been selected for ${jobTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Job Offer</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Congratulations!</h1>
          </div>
          <div class="content">
            <h2>Hello ${candidateName},</h2>
            <p>We are thrilled to inform you that you have been selected for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>!</p>
            <p>Your interview performance was impressive, and we believe you will be a great addition to our team.</p>
            <p>Our HR team will be in touch with you shortly with the formal offer letter and next steps.</p>
            <a href="${process.env.FRONTEND_URL}/candidate/applications" class="button">View Application Status</a>
            <p>Welcome to the team!</p>
            <p>Best regards,<br>The ${companyName} Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hello ${candidateName},\n\nWe are thrilled to inform you that you have been selected for the ${jobTitle} position at ${companyName}!\n\nYour interview performance was impressive, and we believe you will be a great addition to our team.\n\nOur HR team will be in touch with you shortly with the formal offer letter and next steps.\n\nWelcome to the team!\n\nBest regards,\nThe ${companyName} Team`
  }),

  // Rejection notification
  rejectionNotification: (candidateName, jobTitle, companyName) => ({
    subject: `Update on your application for ${jobTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6b7280; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Update</h1>
          </div>
          <div class="content">
            <h2>Hello ${candidateName},</h2>
            <p>Thank you for your interest in the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong> and for taking the time to complete the interview process.</p>
            <p>After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs.</p>
            <p>We were impressed by your qualifications and encourage you to apply for future opportunities that align with your skills and experience.</p>
            <a href="${process.env.FRONTEND_URL}/candidate/jobs" class="button">View Open Positions</a>
            <p>Thank you again for your interest in our company.</p>
            <p>Best regards,<br>The ${companyName} Recruiting Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hello ${candidateName},\n\nThank you for your interest in the ${jobTitle} position at ${companyName} and for taking the time to complete the interview process.\n\nAfter careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs.\n\nWe were impressed by your qualifications and encourage you to apply for future opportunities that align with your skills and experience.\n\nThank you again for your interest in our company.\n\nBest regards,\nThe ${companyName} Recruiting Team`
  })
};

module.exports = emailTemplates;