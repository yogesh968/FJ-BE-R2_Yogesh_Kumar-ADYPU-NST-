import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { UserRepository } from "../repositories/UserRepository.js";
import dotenv from "dotenv";

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
                    let user = await userRepository.findByGoogleId(profile.id);

                    if (!user) {
                        // Check if user exists with the same email
                        const email = profile.emails?.[0]?.value;
                        if (email) {
                            user = await userRepository.findByEmail(email);
                            if (user) {
                                // Merge account
                                user = await userRepository.updateProfile(user.id, { googleId: profile.id });
                            } else {
                                // Create new user
                                user = await userRepository.createUser({
                                    googleId: profile.id,
                                    email: email,
                                    name: profile.displayName,
                                });
                            }
                        }
                    }

                    return done(null, user || false);
                } catch (error) {
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
