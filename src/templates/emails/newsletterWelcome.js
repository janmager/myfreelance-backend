import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendNewsletterWelcomeEmail = async (email, friendlyName) => {
    const name = friendlyName || 'Witaj';
    
    const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER || 'onboarding@resend.dev';
    const subject = '🎉 Witamy w newsletterze Freelenzy!';
    
    const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Witamy w newsletterze Freelenzy</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #30aeff 0%, #926dff 100%); padding: 40px 20px; text-align: center;">
                        <h1 style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0;">
                            Freelenzy
                        </h1>
                        <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 10px 0 0 0;">
                            Nowoczesna platforma dla freelancerów
                        </p>
                    </div>

                    <!-- Content -->
                    <div style="padding: 40px 30px;">
                        <h2 style="color: #1f2937; font-size: 24px; font-weight: bold; margin: 0 0 20px 0;">
                            Cześć ${name}! 👋
                        </h2>
                        
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                            Dziękujemy za zapisanie się do newslettera Freelenzy! Jesteśmy niesamowicie podekscytowani, że dołączasz do naszej społeczności.
                        </p>

                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                            Co możesz oczekiwać od naszego newslettera:
                        </p>

                        <ul style="color: #4b5563; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0; padding-left: 20px;">
                            <li>🚀 Najnowsze funkcje i aktualizacje platformy</li>
                            <li>💡 Porady dla freelancerów i najlepsze praktyki</li>
                            <li>📊 Wskazówki dotyczące zarządzania projektami</li>
                            <li>🎁 Ekskluzywne oferty i promocje</li>
                            <li>📰 Inspirujące historie sukcesu</li>
                        </ul>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'https://freelenzy.com'}" 
                               style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #30aeff 0%, #926dff 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
                                Odwiedź Freelenzy
                            </a>
                        </div>

                        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                            Nie chcesz już otrzymywać naszych wiadomości? <a href="${process.env.FRONTEND_URL || 'https://freelenzy.com'}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #30aeff; text-decoration: underline;">Wypisz się</a>
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="color: #9ca3af; font-size: 14px; margin: 0 0 10px 0;">
                            © 2025 Freelenzy. Wszystkie prawa zastrzeżone.
                        </p>
                        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                            Nowoczesna platforma dla freelancerów
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;
    
    const textContent = `
Cześć ${name}!

Dziękujemy za zapisanie się do newslettera Freelenzy! Jesteśmy niesamowicie podekscytowani, że dołączasz do naszej społeczności.

Co możesz oczekiwać od naszego newslettera:
- Najnowsze funkcje i aktualizacje platformy
- Porady dla freelancerów i najlepsze praktyki
- Wskazówki dotyczące zarządzania projektami
- Ekskluzywne oferty i promocje
- Inspirujące historie sukcesu

Odwiedź nas: ${process.env.FRONTEND_URL || 'https://freelenzy.com'}

Nie chcesz już otrzymywać naszych wiadomości? Wypisz się: ${process.env.FRONTEND_URL || 'https://freelenzy.com'}/unsubscribe?email=${encodeURIComponent(email)}

© 2025 Freelenzy. Wszystkie prawa zastrzeżone.
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: subject,
            html: htmlContent,
            text: textContent
        });

        if (error) {
            console.error('Error sending newsletter welcome email:', error);
            throw error;
        }

        console.log('Newsletter welcome email sent to:', email, 'ID:', data?.id);
        return data;
    } catch (error) {
        console.error('Error sending newsletter welcome email:', error);
        throw error;
    }
};

