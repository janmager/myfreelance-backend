import nodemailer from 'nodemailer';
import 'dotenv/config';
import { contactEmailTemplate, contactEmailTextTemplate } from '../templates/emails/contactTemplate.js';
import { confirmAccountEmailTemplate, confirmAccountEmailTextTemplate } from '../templates/emails/confirmAccountTemplate.js';
import { newPasswordEmailTemplate, newPasswordEmailTextTemplate } from '../templates/emails/newPasswordTemplate.js';
import { requestPasswordResetEmailTemplate, requestPasswordResetEmailTextTemplate } from '../templates/emails/requestPasswordResetTemplate.js';
import { passwordChangedEmailTemplate, passwordChangedEmailTextTemplate } from '../templates/emails/passwordChangedTemplate.js';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Helper function to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to verify transporter with retry
const verifyTransporterWithRetry = async (transporter, maxRetries = MAX_RETRIES) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[SMTP] Verifying transporter configuration (attempt ${attempt}/${maxRetries})...`);
            await transporter.verify();
            console.log('[SMTP] Transporter verification successful');
            return true;
        } catch (error) {
            console.error(`[SMTP] Verification attempt ${attempt} failed:`, error.message);
            
            if (attempt === maxRetries) {
                console.error('[SMTP] All verification attempts failed');
                throw error;
            }
            
            console.log(`[SMTP] Retrying in ${RETRY_DELAY}ms...`);
            await sleep(RETRY_DELAY);
        }
    }
};

// Create email transporter with fallback ports
const createTransporter = (fallbackPort = null) => {
    const port = fallbackPort || parseInt(process.env.SMTP_PORT);
    const isSecure = port === 465;
    
    console.log(`[SMTP] Configuring transporter - Host: ${process.env.SMTP_HOST}, Port: ${port}, User: ${process.env.SMTP_USER}, Secure: ${isSecure}`);
    
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: port,
        secure: isSecure, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS?.replace(/['"]/g, '') // Remove quotes if present
        },
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000, // 30 seconds
        socketTimeout: 60000, // 60 seconds
        pool: true, // Use connection pooling
        maxConnections: 5, // Maximum number of connections
        maxMessages: 100, // Maximum messages per connection
        rateDelta: 20000, // Rate limiting
        rateLimit: 5 // Messages per rateDelta
    });
};

// Helper function to create transporter with fallback
const createTransporterWithFallback = async () => {
    const primaryPort = parseInt(process.env.SMTP_PORT);
    const fallbackPorts = [587, 25]; // Common SMTP ports
    
    console.log(`[SMTP] Starting connection process with primary port ${primaryPort}`);
    
    // Try primary port first
    try {
        console.log(`[SMTP] Trying primary port ${primaryPort}...`);
        const transporter = createTransporter();
        await verifyTransporterWithRetry(transporter, 1); // Only 1 retry for primary
        console.log(`[SMTP] Successfully connected using primary port ${primaryPort}`);
        return transporter;
    } catch (error) {
        console.error(`[SMTP] Primary port ${primaryPort} failed:`, error.message);
        console.error(`[SMTP] Error code: ${error.code}, Command: ${error.command}`);
        
        // Try fallback ports
        for (const port of fallbackPorts) {
            if (port === primaryPort) continue; // Skip if same as primary
            
            try {
                console.log(`[SMTP] Trying fallback port ${port}...`);
                const transporter = createTransporter(port);
                await verifyTransporterWithRetry(transporter, 1); // Only 1 retry for fallback
                console.log(`[SMTP] Successfully connected using fallback port ${port}`);
                return transporter;
            } catch (fallbackError) {
                console.error(`[SMTP] Fallback port ${port} also failed:`, fallbackError.message);
                console.error(`[SMTP] Fallback error code: ${fallbackError.code}, Command: ${fallbackError.command}`);
            }
        }
        
        // If all ports fail, throw the original error with additional context
        console.error(`[SMTP] All connection attempts failed. Primary port: ${primaryPort}, Fallback ports: ${fallbackPorts.join(', ')}`);
        throw new Error(`SMTP connection failed on all ports. Primary error: ${error.message}`);
    }
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
        
        // Create transporter with fallback
        let transporter;
        try {
            transporter = await createTransporterWithFallback();
        } catch (error) {
            console.error('[SMTP] Configuration error:', error);
            console.error('[SMTP] Error details:', {
                code: error.code,
                response: error.response,
                responseCode: error.responseCode,
                command: error.command
            });
            return res.status(500).json({ 
                message: "Błąd konfiguracji usługi email.", 
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
        
        // Send email
        const info = await transporter.sendMail(mailOptions);
        
        
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
        
        // Create transporter with fallback
        let transporter;
        try {
            transporter = await createTransporterWithFallback();
        } catch (error) {
            console.error('[SMTP] Configuration error:', error);
            console.error('[SMTP] Error details:', {
                code: error.code,
                response: error.response,
                responseCode: error.responseCode,
                command: error.command
            });
            return res.status(500).json({ 
                message: "Błąd konfiguracji usługi email.", 
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
        
        // Send email
        const info = await transporter.sendMail(mailOptions);
        
        
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
        
        // Create transporter with fallback
        const transporter = await createTransporterWithFallback();
        
        // Email content using template
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email_receiver,
            subject: `Potwierdzenie konta - Freelenzy.com`,
            html: confirmAccountEmailTemplate(email_receiver, email_token, user_id),
            text: confirmAccountEmailTextTemplate(email_receiver, email_token, user_id)
        };
        
        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ [MAILING] Internal confirm account email sent successfully - Message ID: ${info.messageId}`);
        
        return {
            success: true,
            messageId: info.messageId,
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
        
        // Create transporter with fallback
        let transporter;
        try {
            transporter = await createTransporterWithFallback();
        } catch (error) {
            console.error('[SMTP] Configuration error:', error);
            console.error('[SMTP] Error details:', {
                code: error.code,
                response: error.response,
                responseCode: error.responseCode,
                command: error.command
            });
            return res.status(500).json({ 
                message: "Błąd konfiguracji usługi email.", 
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
        
        // Send email
        const info = await transporter.sendMail(mailOptions);
        
        
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
        
        // Create transporter with fallback
        let transporter;
        try {
            transporter = await createTransporterWithFallback();
        } catch (error) {
            console.error('[SMTP] Configuration error:', error);
            console.error('[SMTP] Error details:', {
                code: error.code,
                response: error.response,
                responseCode: error.responseCode,
                command: error.command
            });
            return res.status(500).json({ 
                message: "Błąd konfiguracji usługi email.", 
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
        
        // Send email
        const info = await transporter.sendMail(mailOptions);
        
        
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
        
        // Create transporter with fallback
        const transporter = await createTransporterWithFallback();
        
        // Email content using template
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email_receiver,
            subject: `Reset hasła - Freelenzy.com`,
            html: requestPasswordResetEmailTemplate(email_receiver, user_id, email_token),
            text: requestPasswordResetEmailTextTemplate(email_receiver, user_id, email_token)
        };
        
        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ [MAILING] Internal password reset request email sent successfully - Message ID: ${info.messageId}`);
        
        return {
            success: true,
            messageId: info.messageId,
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
        
        // Create transporter with fallback
        let transporter;
        try {
            transporter = await createTransporterWithFallback();
        } catch (error) {
            console.error('[SMTP] Configuration error:', error);
            console.error('[SMTP] Error details:', {
                code: error.code,
                response: error.response,
                responseCode: error.responseCode,
                command: error.command
            });
            return res.status(500).json({ 
                message: "Błąd konfiguracji usługi email.", 
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
        
        // Send email
        const info = await transporter.sendMail(mailOptions);
        
        
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
        
        // Create transporter with fallback
        const transporter = await createTransporterWithFallback();
        
        // Email content using template
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email_receiver,
            subject: `Hasło zostało zmienione - Freelenzy.com`,
            html: passwordChangedEmailTemplate(email_receiver),
            text: passwordChangedEmailTextTemplate(email_receiver)
        };
        
        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ [MAILING] Internal password changed notification email sent successfully - Message ID: ${info.messageId}`);
        
        return {
            success: true,
            messageId: info.messageId,
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
