import { Resend } from 'resend';
import 'dotenv/config';
import { contactEmailTemplate, contactEmailTextTemplate } from '../templates/emails/contactTemplate.js';
import { confirmAccountEmailTemplate, confirmAccountEmailTextTemplate } from '../templates/emails/confirmAccountTemplate.js';
import { newPasswordEmailTemplate, newPasswordEmailTextTemplate } from '../templates/emails/newPasswordTemplate.js';
import { requestPasswordResetEmailTemplate, requestPasswordResetEmailTextTemplate } from '../templates/emails/requestPasswordResetTemplate.js';
import { passwordChangedEmailTemplate, passwordChangedEmailTextTemplate } from '../templates/emails/passwordChangedTemplate.js';

// Initialize Resend
let resend;
if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('[RESEND] API key configured');
} else {
    console.log('[RESEND] No API key found, Resend will not be available');
}

// Helper function to send email via Resend
const sendEmailViaResend = async (mailOptions) => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('Resend API key not configured');
    }
    
    console.log('[RESEND] Sending email via Resend API');
    console.log('[RESEND] From:', process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER);
    console.log('[RESEND] To:', mailOptions.to);
    console.log('[RESEND] Subject:', mailOptions.subject);
    
    // Resend requires verified domain or specific sender
    const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER || 'onboarding@resend.dev';
    
    try {
        const response = await resend.emails.send({
            from: fromEmail,
            to: mailOptions.to,
            subject: mailOptions.subject,
            html: mailOptions.html,
            text: mailOptions.text
        });
        
        console.log('[RESEND] Email sent successfully:', response.data?.id);
        return {
            success: true,
            messageId: response.data?.id,
            response: response.data
        };
    } catch (error) {
        console.error('[RESEND] Error sending email:', error);
        console.error('[RESEND] Error details:', {
            message: error.message,
            name: error.name
        });
        throw error;
    }
};

// Helper function to send email directly via Resend
const sendEmailWithResend = async (mailOptions) => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('Resend API key not configured');
    }
    
    console.log('[EMAIL] Sending email via Resend API');
    const resendResult = await sendEmailViaResend(mailOptions);
    console.log('[EMAIL] Successfully sent via Resend');
    return { messageId: resendResult.messageId, method: 'Resend' };
};


export async function sendContactMessage(req, res) {
    try {
        const { name, email, subject, message } = req.body;
        console.log(`📧 [MAILING] Send contact message request - From: ${email}, Subject: ${subject}`);
        
        // Validate required fields
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ 
                message: "Imię, email, temat i wiadomość są wymagane.", 
                response: false 
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: "Proszę podać prawidłowy adres email.", 
                response: false 
            });
        }
        
        // Generate timestamp
        const timestamp = new Date().toLocaleString('pl-PL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Create email content with name and subject
        const emailContent = `Imię: ${name}\nEmail: ${email}\n\nWiadomość:\n${message}`;
        
        // Email content using template
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: process.env.CONTACT_EMAIL,
            subject: `Wiadomość kontaktowa: ${subject} | ${timestamp}`,
            html: contactEmailTemplate(email, subject, emailContent, timestamp),
            text: contactEmailTextTemplate(email, subject, emailContent, timestamp)
        };
        
        // Send email via Resend
        const result = await sendEmailWithResend(mailOptions);
        const info = { messageId: result.messageId };
        
        
        console.log(`✅ [MAILING] Contact message sent successfully - Message ID: ${info.messageId}`);
        
        res.status(200).json({ 
            message: "Wiadomość kontaktowa została pomyślnie wysłana.", 
            response: true,
            messageId: info.messageId
        });
        
    } catch (error) {
        console.error('Error sending contact email:', error);
        res.status(500).json({ 
            message: "Nie udało się wysłać wiadomości kontaktowej. Spróbuj ponownie później.", 
            response: false 
        });
    }
}

export async function sendConfirmAccountEmail(req, res) {
    try {
        const { user_id, email_token, email_receiver } = req.body;
        
        // Validate required fields
        if (!user_id || !email_token || !email_receiver) {
            return res.status(400).json({ 
                message: "user_id, email_token i email_receiver są wymagane.", 
                response: false 
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email_receiver)) {
            return res.status(400).json({ 
                message: "Proszę podać prawidłowy adres email.", 
                response: false 
            });
        }
        
        // Email content using template
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email_receiver,
            subject: `Potwierdzenie konta - Freelenzy.com | ${new Date().toLocaleString()}`,
            html: confirmAccountEmailTemplate(email_receiver, email_token, user_id),
            text: confirmAccountEmailTextTemplate(email_receiver, email_token, user_id)
        };
        
        // Send email via Resend
        const result = await sendEmailWithResend(mailOptions);
        const info = { messageId: result.messageId };
        
        
        console.log(`✅ [MAILING] Confirm account email sent successfully - Message ID: ${info.messageId}`);
        
        res.status(200).json({ 
            message: "Email potwierdzenia konta został pomyślnie wysłany.", 
            response: true,
            messageId: info.messageId
        });
        
    } catch (error) {
        console.error('Error sending account confirmation email:', error);
        res.status(500).json({ 
            message: "Nie udało się wysłać emaila potwierdzenia konta. Spróbuj ponownie później.", 
            response: false 
        });
    }
}

// Helper function for internal use (without Express req/res)
export async function sendConfirmAccountEmailInternal(user_id, email_token, email_receiver) {
    try {
        // Validate required fields
        if (!user_id || !email_token || !email_receiver) {
            throw new Error("user_id, email_token, and email_receiver are required.");
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email_receiver)) {
            throw new Error("Please provide a valid email address.");
        }
        
        // Email content using template
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email_receiver,
            subject: `Potwierdzenie konta - Freelenzy.com`,
            html: confirmAccountEmailTemplate(email_receiver, email_token, user_id),
            text: confirmAccountEmailTextTemplate(email_receiver, email_token, user_id)
        };
        
        // Send email via Resend
        const result = await sendEmailWithResend(mailOptions);
        console.log(`✅ [MAILING] Internal confirm account email sent successfully - Message ID: ${result.messageId}`);
        
        return {
            success: true,
            messageId: result.messageId,
            message: "Email potwierdzenia konta został pomyślnie wysłany."
        };
        
    } catch (error) {
        console.error('Error sending account confirmation email:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

export async function sendNewPasswordEmail(req, res) {
    try {
        const { email_receiver, new_password } = req.body;
        
        // Validate required fields
        if (!email_receiver || !new_password) {
            return res.status(400).json({ 
                message: "email_receiver i new_password są wymagane.", 
                response: false 
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email_receiver)) {
            return res.status(400).json({ 
                message: "Proszę podać prawidłowy adres email.", 
                response: false 
            });
        }
        
        // Email content using template
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email_receiver,
            subject: `Nowe hasło - Freelenzy.com | ${new Date().toLocaleString()}`,
            html: newPasswordEmailTemplate(email_receiver, new_password),
            text: newPasswordEmailTextTemplate(email_receiver, new_password)
        };
        
        // Send email via Resend
        const result = await sendEmailWithResend(mailOptions);
        const info = { messageId: result.messageId };
        
        
        console.log(`✅ [MAILING] New password email sent successfully - Message ID: ${info.messageId}`);
        
        res.status(200).json({ 
            message: "Email z nowym hasłem został pomyślnie wysłany.", 
            response: true,
            messageId: info.messageId
        });
        
    } catch (error) {
        console.error('Error sending new password email:', error);
        res.status(500).json({ 
            message: "Nie udało się wysłać emaila z nowym hasłem. Spróbuj ponownie później.", 
            response: false 
        });
    }
}

export async function sendRequestPasswordResetEmail(req, res) {
    try {
        const { email_receiver, user_id, email_token } = req.body;
        
        // Validate required fields
        if (!email_receiver || !user_id || !email_token) {
            return res.status(400).json({ 
                message: "email_receiver, user_id i email_token są wymagane.", 
                response: false 
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email_receiver)) {
            return res.status(400).json({ 
                message: "Proszę podać prawidłowy adres email.", 
                response: false 
            });
        }
        
        // Email content using template
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email_receiver,
            subject: `Reset hasła - Freelenzy.com | ${new Date().toLocaleString()}`,
            html: requestPasswordResetEmailTemplate(email_receiver, user_id, email_token),
            text: requestPasswordResetEmailTextTemplate(email_receiver, user_id, email_token)
        };
        
        // Send email via Resend
        const result = await sendEmailWithResend(mailOptions);
        const info = { messageId: result.messageId };
        
        
        console.log(`✅ [MAILING] Password reset request email sent successfully - Message ID: ${info.messageId}`);
        
        res.status(200).json({ 
            message: "Email żądania resetowania hasła został pomyślnie wysłany.", 
            response: true,
            messageId: info.messageId
        });
        
    } catch (error) {
        console.error('Error sending password reset request email:', error);
        res.status(500).json({ 
            message: "Nie udało się wysłać emaila żądania resetowania hasła. Spróbuj ponownie później.", 
            response: false 
        });
    }
}

// Helper function for internal use (without Express req/res)
export async function sendRequestPasswordResetEmailInternal(email_receiver, user_id, email_token) {
    try {
        // Validate required fields
        if (!email_receiver || !user_id || !email_token) {
            throw new Error("email_receiver, user_id, and email_token are required.");
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email_receiver)) {
            throw new Error("Please provide a valid email address.");
        }
        
        // Email content using template
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email_receiver,
            subject: `Reset hasła - Freelenzy.com`,
            html: requestPasswordResetEmailTemplate(email_receiver, user_id, email_token),
            text: requestPasswordResetEmailTextTemplate(email_receiver, user_id, email_token)
        };
        
        // Send email via Resend
        const result = await sendEmailWithResend(mailOptions);
        console.log(`✅ [MAILING] Internal password reset request email sent successfully - Message ID: ${result.messageId}`);
        
        return {
            success: true,
            messageId: result.messageId,
            message: "Email żądania resetowania hasła został pomyślnie wysłany."
        };
        
    } catch (error) {
        console.error('Error sending password reset request email:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

export async function sendPasswordChangedEmail(req, res) {
    try {
        const { email_receiver } = req.body;
        
        // Validate required fields
        if (!email_receiver) {
            return res.status(400).json({ 
                message: "email_receiver jest wymagany.", 
                response: false 
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email_receiver)) {
            return res.status(400).json({ 
                message: "Proszę podać prawidłowy adres email.", 
                response: false 
            });
        }
        
        // Email content using template
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email_receiver,
            subject: `Hasło zostało zmienione - Freelenzy.com | ${new Date().toLocaleString()}`,
            html: passwordChangedEmailTemplate(email_receiver),
            text: passwordChangedEmailTextTemplate(email_receiver)
        };
        
        // Send email via Resend
        const result = await sendEmailWithResend(mailOptions);
        const info = { messageId: result.messageId };
        
        
        console.log(`✅ [MAILING] Password changed notification email sent successfully - Message ID: ${info.messageId}`);
        
        res.status(200).json({ 
            message: "Email powiadomienia o zmianie hasła został pomyślnie wysłany.", 
            response: true,
            messageId: info.messageId
        });
        
    } catch (error) {
        console.error('Error sending password changed email:', error);
        res.status(500).json({ 
            message: "Nie udało się wysłać emaila powiadomienia o zmianie hasła. Spróbuj ponownie później.", 
            response: false 
        });
    }
}

// Helper function for internal use (without Express req/res)
export async function sendPasswordChangedEmailInternal(email_receiver) {
    try {
        // Validate required fields
        if (!email_receiver) {
            throw new Error("email_receiver is required.");
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email_receiver)) {
            throw new Error("Please provide a valid email address.");
        }
        
        // Email content using template
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email_receiver,
            subject: `Hasło zostało zmienione - Freelenzy.com`,
            html: passwordChangedEmailTemplate(email_receiver),
            text: passwordChangedEmailTextTemplate(email_receiver)
        };
        
        // Send email via Resend
        const result = await sendEmailWithResend(mailOptions);
        console.log(`✅ [MAILING] Internal password changed notification email sent successfully - Message ID: ${result.messageId}`);
        
        return {
            success: true,
            messageId: result.messageId,
            message: "Email powiadomienia o zmianie hasła został pomyślnie wysłany."
        };
        
    } catch (error) {
        console.error('Error sending password changed email:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
