import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export class NotificationService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: "smtp.sendgrid.net",
            port: 587,
            auth: {
                user: "apikey",
                pass: process.env.SENDGRID_API_KEY,
            },
        });
    }

    async sendBudgetOverrunEmail(email, category, limit, spent) {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: `Budget Overrun: ${category}`,
            text: `Your budget for ${category} has been exceeded. Limit: ${limit}, Spent: ${spent}`,
            html: `<h1>Budget Overrun Alert</h1><p>Your budget for <strong>${category}</strong> has been exceeded.</p><p>Limit: ${limit}</p><p>Spent: ${spent}</p>`,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Overrun email sent to ${email}`);
        } catch (error) {
            console.error("Error sending email:", error);
        }
    }

    async sendMonthlySummaryEmail(email, summary) {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: "Your Monthly Financial Summary",
            text: `Monthly summary: Income: ${summary.income}, Expenses: ${summary.expenses}, Savings: ${summary.savings}`,
            html: `<h1>Monthly Financial Summary</h1><p>Income: ${summary.income}</p><p>Expenses: ${summary.expenses}</p><p>Savings: ${summary.savings}</p>`,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Monthly summary email sent to ${email}`);
        } catch (error) {
            console.error("Error sending email:", error);
        }
    }
}
