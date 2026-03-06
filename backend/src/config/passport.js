import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { UserRepository } from "../repositories/UserRepository.js";
import dotenv from "dotenv";
import prisma from "./db.js";

dotenv.config();

const userRepository = new UserRepository();

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL,
                scope: ["profile", "email"],
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    console.log(`[AUTH] Google login attempt: ${profile.emails?.[0]?.value}`);
                    const email = profile.emails?.[0]?.value;
                    if (!email) return done(new Error("Email not provided by Google"), false);

                    // 1. Find or create user
                    let user = await userRepository.findByGoogleId(profile.id);

                    if (!user) {
                        // Check if email already exists
                        user = await userRepository.findByEmail(email);
                        if (user) {
                            // Link Google account to existing email
                            user = await userRepository.updateProfile(user.id, {
                                googleId: profile.id,
                                avatar: user.avatar || profile.photos?.[0]?.value
                            });
                        } else {
                            // Create new user
                            user = await userRepository.createUser({
                                googleId: profile.id,
                                email: email,
                                name: profile.displayName || "Google User",
                                avatar: profile.photos?.[0]?.value
                            });
                        }
                    }

                    // 2. Ensure categories exist (Sequential for stability)
                    const count = await prisma.category.count({ where: { userId: user.id } });
                    if (count === 0) {
                        console.log(`[AUTH] Seeding categories for user ${user.id}`);
                        const defaults = [
                            { name: "Salary", type: "INCOME", userId: user.id },
                            { name: "Investment", type: "INCOME", userId: user.id },
                            { name: "Rent", type: "EXPENSE", userId: user.id },
                            { name: "Groceries", type: "EXPENSE", userId: user.id },
                            { name: "Utilities", type: "EXPENSE", userId: user.id },
                            { name: "Entertainment", type: "EXPENSE", userId: user.id },
                            { name: "Transport", type: "EXPENSE", userId: user.id }
                        ];
                        await prisma.category.createMany({ data: defaults, skipDuplicates: true });
                    }

                    return done(null, user);
                } catch (error) {
                    console.error("[AUTH] Google Strategy Error:", error);
                    return done(error, false);
                }
            }
        )
    );
} else {
    console.warn("Google OAuth keys missing in .env - Google Login will be disabled.");
}

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await userRepository.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;
