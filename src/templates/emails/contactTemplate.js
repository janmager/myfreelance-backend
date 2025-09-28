export const contactEmailTemplate = (email_sender, title, content, timestamp) => {
    return `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Wiadomość kontaktowa - Freelenzy.com</title>
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
                padding: 28px 22px;
                text-align: center;
            }
            .logo {
                width: 60px;
                height: 60px;
                margin: 0 auto 15px;
                background-color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            .logo img {
                width: 35px;
                height: 35px;
                object-fit: contain;
            }
            .content {
                padding: 40px 30px;
            }
            .message-box {
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                border: 2px solid #3f95ff;
                border-radius: 16px;
                padding: 24px;
                margin: 24px 0;
                box-shadow: 0 4px 20px rgba(63, 149, 255, 0.1);
            }
            .message-title {
                color: #1e293b;
                font-size: 20px;
                font-weight: 800;
                margin-bottom: 16px;
                text-align: center;
            }
            .message-meta {
                color: #64748b;
                font-size: 14px;
                margin-bottom: 20px;
                text-align: center;
                background-color: white;
                padding: 12px 16px;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
            }
            .message-content {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                padding: 20px;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                white-space: pre-wrap;
                line-height: 1.7;
                font-size: 15px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            }
            .footer {
                text-align: center;
                padding: 24px 30px;
                color: #64748b;
                font-size: 13px;
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
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
                <h1 style="margin: 0; font-size: 28px; font-weight: 800; position: relative; z-index: 1;">Nowa wiadomość</h1>
                <p style="margin: 12px 0 0; opacity: 0.95; font-size: 16px; position: relative; z-index: 1;">Formularz kontaktowy</p>
            </div>
            
            <div class="content">
                <div class="message-box">
                    <div class="message-title">${title}</div>
                    <div class="message-meta">
                        <strong>Od:</strong> ${email_sender}<br>
                        <strong>Data:</strong> ${timestamp}
                    </div>
                    <div class="message-content">${content}</div>
                </div>
                
                <p style="text-align: center; margin-top: 25px;">
                    <strong>Odpowiedz:</strong> <a href="mailto:${email_sender}" style="color: #3f95ff;">${email_sender}</a>
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

export const contactEmailTextTemplate = (email_sender, title, content, timestamp) => {
    return `
Nowa wiadomość kontaktowa

Tytuł: ${title}
Od: ${email_sender}
Data: ${timestamp}

Treść:
${content}

Odpowiedz: ${email_sender}

© 2024 Freelenzy.com. Wszystkie prawa zastrzeżone.
    `;
};
