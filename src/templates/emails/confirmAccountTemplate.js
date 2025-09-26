export const confirmAccountEmailTemplate = (email, email_token, user_id) => {
    return `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Potwierdzenie konta - Freelario</title>
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
                background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
                color: white;
                padding: 32px 22px;
                text-align: center;
            }
            .logo {
                width: 80px;
                height: 80px;
                margin: 0 auto 15px;
                background-color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            .logo img {
                width: 50px;
                height: 50px;
                object-fit: contain;
            }
            .content {
                padding: 40px 30px;
                text-align: center;
            }
            .button {
                display: inline-block;
                background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
                color: white;
                padding: 14px 28px;
                text-decoration: none;
                border-radius: 12px;
                margin: 24px 0;
                font-weight: 700;
                font-size: 15px;
                box-shadow: 0 8px 20px rgba(37, 99, 235, 0.25);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .button:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 24px rgba(37, 99, 235, 0.35);
            }
            .link-box {
                background-color: #f1f5f9;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 14px;
                margin: 18px 0;
                word-break: break-word;
                font-size: 13px;
                color: #334155;
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
                    <img src="https://typerka-2026.vercel.app/assets/brand/logo.png" alt="Freelario Logo">
                </div>
                <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Witaj w Freelario!</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">Aktywuj swoje konto</p>
            </div>
            
            <div class="content">
                <p style="font-size: 18px; margin-bottom: 25px;">Dziękujemy za rejestrację! Kliknij przycisk poniżej, aby aktywować konto:</p>
                
                <a href="${process.env.HOST}/confirm-account?user_id=${user_id}&email_token=${email_token}" class="button">
                    Potwierdź konto
                </a>
                
                <p style="font-size: 14px; color: #6c757d; margin-top: 30px;">Jeśli przycisk nie działa, skopiuj link:</p>
                <div class="link-box">
                    ${process.env.HOST}/confirm-account?user_id=${user_id}&email_token=${email_token}
                </div>
            </div>
            
            <div class="footer">
                <p style="margin: 0;">© 2024 Freelario. Wszystkie prawa zastrzeżone.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

export const confirmAccountEmailTextTemplate = (email, email_token, user_id) => {
    return `
Witaj w Freelario!

Dziękujemy za rejestrację! Aby aktywować konto, kliknij link:

${process.env.HOST}/confirm-account?user_id=${user_id}&email_token=${email_token}

© 2024 Freelario. Wszystkie prawa zastrzeżone.
    `;
};
