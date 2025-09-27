export const newPasswordEmailTemplate = (email_receiver, new_password) => {
    return `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nowe hasło - Freelenzy.com</title>
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
            .password-box {
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                border: 2px solid #3b82f6;
                border-radius: 12px;
                padding: 22px;
                margin: 22px 0;
                text-align: center;
            }
            .password {
                font-family: 'Courier New', monospace;
                font-size: 20px;
                font-weight: bold;
                color: #333;
                background-color: white;
                padding: 15px 20px;
                border-radius: 8px;
                margin: 15px 0;
                border: 1px solid #dee2e6;
                letter-spacing: 1px;
            }
            .warning {
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
                <h1 style="margin: 0; font-size: 32px; font-weight: 800; position: relative; z-index: 1;">Nowe hasło</h1>
                <p style="margin: 12px 0 0; opacity: 0.95; font-size: 18px; position: relative; z-index: 1;">Twoje dane logowania</p>
            </div>
            
            <div class="content">
                <p style="font-size: 18px; margin-bottom: 25px;">Oto Twoje nowe hasło do konta Freelenzy.com:</p>
                
                <div class="password-box">
                    <h3 style="color: #efb414; margin-bottom: 15px;">Twoje hasło:</h3>
                    <div class="password">${new_password}</div>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Ważne:</strong> Zmień to hasło po pierwszym zalogowaniu dla bezpieczeństwa.
                </div>
                
                <p style="margin-top: 30px; font-size: 16px;">
                    <strong>Email:</strong> ${email_receiver}
                </p>
            </div>
            
            <div class="footer">
                <p style="margin: 0;">© 2024 Freelenzy.com. Wszystkie prawa zastrzeżone.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

export const newPasswordEmailTextTemplate = (email_receiver, new_password) => {
    return `
Nowe hasło - Freelenzy.com

Twoje nowe hasło: ${new_password}
Email: ${email_receiver}

WAŻNE: Zmień to hasło po pierwszym zalogowaniu.

© 2024 Freelenzy.com. Wszystkie prawa zastrzeżone.
    `;
};
