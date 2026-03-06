try {
    const { default: app } = await import("../src/app.js");
    handler = app;
} catch (err) {
    console.error("INIT ERROR:", err);
    initError = { message: err.message, stack: err.stack };
    handler = (req, res) => {
        // Fallback CORS for init errors
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');

        if (req.method === 'OPTIONS') return res.status(200).end();

        res.status(503).json({
            success: false,
            message: "Backend initialization failed",
            error: err.message,
            stack: err.stack
        });
    };
}

export default handler;
