export const confirmAccountEmailTemplate = (email, email_token, user_id) => {
    return `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Potwierdzenie konta - Freelenzy.com</title>
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
            .button {
                display: inline-block;
                background: linear-gradient(135deg, #3f95ff 0%, #926dff 100%);
                color: white;
                padding: 16px 32px;
                text-decoration: none;
                border-radius: 16px;
                margin: 28px 0;
                font-weight: 800;
                font-size: 16px;
                box-shadow: 0 8px 32px rgba(63, 149, 255, 0.3);
                transition: all 0.3s ease;
                border: 2px solid transparent;
                position: relative;
                overflow: hidden;
            }
            .button::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                transition: left 0.5s;
            }
            .button:hover {
                transform: translateY(-3px);
                box-shadow: 0 12px 40px rgba(63, 149, 255, 0.4);
            }
            .button:hover::before {
                left: 100%;
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
                    <img src="https://freelenzy.vercel.app/assets/brand/logo.png" alt="Freelenzy.com Logo">
                </div>
                <h1 style="margin: 0; font-size: 32px; font-weight: 800; position: relative; z-index: 1;">Witaj w Freelenzy.com!</h1>
                <p style="margin: 12px 0 0; opacity: 0.95; font-size: 18px; position: relative; z-index: 1;">Aktywuj swoje konto</p>
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
                <p style="margin: 0;">© 2024 Freelenzy.com. Wszystkie prawa zastrzeżone.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

export const confirmAccountEmailTextTemplate = (email, email_token, user_id) => {
    return `
Witaj w Freelenzy.com!

Dziękujemy za rejestrację! Aby aktywować konto, kliknij link:

${process.env.HOST}/confirm-account?user_id=${user_id}&email_token=${email_token}

© 2024 Freelenzy.com. Wszystkie prawa zastrzeżone.
    `;
};
