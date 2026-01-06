import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Create email transporter
 * Supports SMTP, Gmail, and other email services
 */
const createTransporter = () => {
  // If SMTP is configured, use it
  if (env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT, 10),
      secure: env.SMTP_SECURE === 'true' || env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  // If Gmail is configured, use it
  if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.GMAIL_USER,
        pass: env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // No email configured - return null
  // In development, this will trigger console logging instead of sending email
  return null;
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, resetToken) => {
  const transporter = createTransporter();
  // Get frontend URL from env or default to localhost for development
  const frontendUrl = env.FRONTEND_URL || (env.NODE_ENV === 'production' 
    ? 'https://park-wise-two.vercel.app' 
    : 'http://localhost:5173');
  const resetLink = `${frontendUrl}/login?token=${resetToken}`;

  const mailOptions = {
    from: env.EMAIL_FROM || env.SMTP_USER || env.GMAIL_USER || 'noreply@parkwise.com',
    to: email,
    subject: 'Password Reset Request - Park Wise',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 8px;
              padding: 30px;
              border: 1px solid #e0e0e0;
            }
            .header {
              background-color: #1e293b;
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
              margin: -30px -30px 20px -30px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #1e293b;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #334155;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              font-size: 12px;
              color: #666;
            }
            .token {
              background-color: #f0f0f0;
              padding: 10px;
              border-radius: 4px;
              font-family: monospace;
              word-break: break-all;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <p>Hello,</p>
            <p>You have requested to reset your password for your Park Wise account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <div class="token">${resetLink}</div>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you did not request this password reset, please ignore this email. Your password will remain unchanged.</p>
            <div class="footer">
              <p>This is an automated message from Park Wise. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Password Reset Request - Park Wise
      
      You have requested to reset your password for your Park Wise account.
      
      Click this link to reset your password:
      ${resetLink}
      
      This link will expire in 1 hour.
      
      If you did not request this password reset, please ignore this email.
    `,
  };

  // In development without email config, just log to console
  if (env.NODE_ENV === 'development' && !transporter) {
    console.log('\n📧 [DEV MODE] Password reset email would be sent:');
    console.log('   To:', email);
    console.log('   Reset Link:', resetLink);
    console.log('   Token:', resetToken);
    console.log('\n💡 To enable actual email sending, configure SMTP or Gmail in .env file');
    console.log('   Example: GMAIL_USER=your-email@gmail.com');
    console.log('            GMAIL_APP_PASSWORD=your-app-password\n');
    return { success: true, devMode: true };
  }

  // In production without email config, log warning but don't throw
  // This allows the token to still be returned for manual use
  if (!transporter) {
    console.warn('⚠️  Email transporter not configured. Password reset token will be logged but not emailed.');
    console.warn('💡 To enable email sending, configure SMTP or Gmail in .env file');
    // Return success with devMode flag so token can be returned
    return { success: false, devMode: true, error: 'Email service not configured' };
  }

  // Send actual email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully');
    console.log('   To:', email);
    console.log('   Message ID:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command
    });
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send parking report email with CSV or PDF attachment
 * Uses SMTP/Gmail if configured (allows sending to any email), otherwise falls back to Supabase Edge Function (Resend)
 */
export const sendReportEmail = async (toEmail, reportData) => {
  const { startDate, endDate, logs, attachment, format = 'csv' } = reportData;

  // Format date range for subject
  const dateRange = startDate === endDate 
    ? startDate 
    : `${startDate} to ${endDate}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            border: 1px solid #e0e0e0;
          }
          .header {
            background-color: #1e293b;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 20px -30px;
          }
          .stats {
            background-color: white;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            border-left: 4px solid #1e293b;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Parking Report</h1>
          </div>
          <p>Hello,</p>
          <p>Please find attached your parking report for <strong>${dateRange}</strong>.</p>
          <div class="stats">
            <p><strong>Total Vehicles Logged:</strong> ${logs.length}</p>
            <p><strong>Green Permits:</strong> ${logs.filter(l => l.parking_type === 'Green').length}</p>
            <p><strong>Yellow Permits:</strong> ${logs.filter(l => l.parking_type === 'Yellow').length}</p>
            <p><strong>Unregistered (Red):</strong> ${logs.filter(l => l.parking_type === 'Red').length}</p>
          </div>
            <p>The ${format === 'pdf' ? 'PDF' : 'CSV'} file is attached to this email for your records.</p>
          <div class="footer">
            <p>This is an automated report from Park Wise. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
    Parking Report - Park Wise
    
    Date Range: ${dateRange}
    Total Vehicles Logged: ${logs.length}
    Green Permits: ${logs.filter(l => l.parking_type === 'Green').length}
    Yellow Permits: ${logs.filter(l => l.parking_type === 'Yellow').length}
    Unregistered (Red): ${logs.filter(l => l.parking_type === 'Red').length}
    
      Please see the attached ${format === 'pdf' ? 'PDF' : 'CSV'} file for detailed information.
    
    This is an automated report from Park Wise.
  `;

  // Try SMTP/Gmail first (allows sending to any email)
  const transporter = createTransporter();
  
  if (transporter) {
    // Use SMTP/Gmail - can send to any email address
    try {
      const mailOptions = {
        from: env.EMAIL_FROM || env.SMTP_USER || env.GMAIL_USER || 'noreply@parkwise.com',
        to: toEmail,
        subject: `Park Wise Parking Report - ${dateRange} (${format.toUpperCase()})`,
        html: htmlContent,
        text: textContent,
      };

      // Add attachment if provided
      if (attachment) {
        // Convert base64 content to buffer for nodemailer
        const attachmentBuffer = Buffer.from(attachment.content, 'base64');
        mailOptions.attachments = [
          {
            filename: attachment.filename,
            content: attachmentBuffer,
            contentType: attachment.contentType,
          }
        ];
      }

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Report email sent successfully via SMTP/Gmail');
      console.log('   To:', toEmail);
      console.log('   Date Range:', dateRange);
      console.log('   Message ID:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send report email via SMTP/Gmail:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        command: error.command
      });
      // Fall through to try Edge Function as fallback
      console.log('⚠️  Falling back to Supabase Edge Function (Resend)...');
    }
  }

  // Fallback to Supabase Edge Function (Resend) if SMTP/Gmail not configured or failed
  try {
    const edgeFunctionUrl = `${env.SUPABASE_URL}/functions/v1/send-report-email`;
    
    const emailPayload = {
      to: toEmail,
      subject: `Park Wise Parking Report - ${dateRange} (${format.toUpperCase()})`,
      html: htmlContent,
      text: textContent,
    };

    // Add attachment if provided
    if (attachment) {
      emailPayload.attachment = attachment;
    }
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Edge Function error:', errorData);
      throw new Error(`Failed to send email via Supabase Edge Function: ${errorData}`);
    }

    const result = await response.json();
    console.log('✅ Report email sent successfully via Supabase Edge Function');
    console.log('   To:', toEmail);
    console.log('   Date Range:', dateRange);
    console.log('   Message ID:', result.messageId);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send report email:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

