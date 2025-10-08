import { sql } from "../config/db.js";
import { sendNewsletterWelcomeEmail } from "../templates/emails/newsletterWelcome.js";

// Subscribe to newsletter
export const subscribeToNewsletter = async (req, res) => {
    try {
        const { email, friendly_name } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        // Check if already subscribed
        const existing = await sql`
            SELECT id, email, active FROM newsletter
            WHERE email = ${email}
        `;

        if (existing.length > 0) {
            if (existing[0].active) {
                return res.status(400).json({ error: "This email is already subscribed to the newsletter" });
            } else {
                // Reactivate subscription
                await sql`
                    UPDATE newsletter
                    SET active = TRUE, friendly_name = ${friendly_name || ''}
                    WHERE email = ${email}
                `;
                
                // Send welcome email
                try {
                    await sendNewsletterWelcomeEmail(email, friendly_name || '');
                    
                    // Update last_sent after successful email send
                    await sql`
                        UPDATE newsletter
                        SET last_sent = NOW()
                        WHERE email = ${email}
                    `;
                } catch (emailError) {
                    console.error('Error sending welcome email:', emailError);
                }

                return res.status(200).json({ 
                    success: true,
                    message: "Subscription reactivated successfully"
                });
            }
        }

        // Insert new subscriber
        const newSubscriber = await sql`
            INSERT INTO newsletter (email, friendly_name, active, created_at, updated_at)
            VALUES (${email}, ${friendly_name || ''}, TRUE, NOW(), NOW())
            RETURNING *
        `;

        // Send welcome email
        try {
            await sendNewsletterWelcomeEmail(email, friendly_name || '');
            
            // Update last_sent after successful email send
            await sql`
                UPDATE newsletter
                SET last_sent = NOW()
                WHERE email = ${email}
            `;
        } catch (emailError) {
            console.error('Error sending welcome email:', emailError);
            // Don't fail the subscription if email fails
        }

        res.status(201).json({ 
            success: true,
            message: "Successfully subscribed to newsletter",
            subscriber: newSubscriber[0]
        });
    } catch (error) {
        console.error("Error subscribing to newsletter:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Unsubscribe from newsletter
export const unsubscribeFromNewsletter = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const result = await sql`
            UPDATE newsletter
            SET active = FALSE
            WHERE email = ${email}
            RETURNING *
        `;

        if (result.length === 0) {
            return res.status(404).json({ error: "Email not found in newsletter" });
        }

        res.json({ 
            success: true,
            message: "Successfully unsubscribed from newsletter"
        });
    } catch (error) {
        console.error("Error unsubscribing from newsletter:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

