export const passwordChangedEmailTemplate = (email_receiver) => {
    return `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hasło zostało zmienione - Freelenzy.com</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 0;
                background-color: #f8f9fa;
            }
            .container {
                background-color: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                margin: 20px;
            }
            .header {
                background: linear-gradient(135deg, #3f95ff 0%, #926dff 100%);
                color: white;
                padding: 40px 22px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            .header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: float 6s ease-in-out infinite;
            }
            @keyframes float {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-20px) rotate(180deg); }
            }
            .logo {
                width: 90px;
                height: 90px;
                margin: 0 auto 20px;
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border-radius: 22px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                position: relative;
                z-index: 1;
            }
            .logo img {
                width: 55px;
                height: 55px;
                object-fit: contain;
            }
            .content {
                padding: 40px 30px;
                text-align: center;
            }
            .success-box {
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                border: 2px solid #22c55e;
                border-radius: 16px;
                padding: 28px;
                margin: 28px 0;
                text-align: center;
                box-shadow: 0 8px 32px rgba(34, 197, 94, 0.15);
            }
            .success-icon {
                font-size: 48px;
                margin-bottom: 15px;
            }
            .details {
                background-color: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                text-align: left;
            }
            .warning-box {
                background-color: #fff7ed;
                border: 1px solid #fed7aa;
                border-radius: 12px;
                padding: 14px;
                margin: 18px 0;
                color: #9a3412;
                font-size: 13px;
            }
            .footer {
                text-align: center;
                padding: 22px 30px;
                color: #64748b;
                font-size: 13px;
                background-color: #f8fafc;
                border-top: 1px solid #e2e8f0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">
                    <img src="https://freelenzy.vercel.app/assets/brand/logo.png" alt="Freelenzy.com Logo">
                </div>
                <h1 style="margin: 0; font-size: 32px; font-weight: 800; position: relative; z-index: 1;">Hasło zmienione</h1>
                <p style="margin: 12px 0 0; opacity: 0.95; font-size: 18px; position: relative; z-index: 1;">Potwierdzenie zmiany</p>
            </div>
            
            <div class="content">
                <div class="success-box">
                    <div class="success-icon">✅</div>
                    <h3 style="color: #059669; margin: 0 0 10px;">Hasło zostało zmienione!</h3>
                    <p style="margin: 0; color: #047857;">Twoje konto jest bezpieczne</p>
                </div>
                
                <div class="details">
                    <p style="margin: 0 0 10px;"><strong>Email:</strong> ${email_receiver}</p>
                    <p style="margin: 0;"><strong>Data:</strong> ${new Date().toLocaleString('pl-PL')}</p>
                </div>
                
                <div class="warning-box">
                    <strong>⚠️ Ważne:</strong> Jeśli to nie Ty zmieniłeś hasło, natychmiast skontaktuj się z nami.
                </div>
            </div>
            
            <div class="footer">
                <p style="margin: 0;">© 2024 Freelenzy.com. Wszystkie prawa zastrzeżone.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

export const passwordChangedEmailTextTemplate = (email_receiver) => {
    return `
Hasło zostało zmienione - Freelenzy.com

✅ Twoje hasło zostało pomyślnie zmienione!

Email: ${email_receiver}
Data: ${new Date().toLocaleString('pl-PL')}

⚠️ Jeśli to nie Ty zmieniłeś hasło, natychmiast skontaktuj się z nami.

© 2024 Freelenzy.com. Wszystkie prawa zastrzeżone.
    `;
};
