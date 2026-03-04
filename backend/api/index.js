let handler;
let initError = null;

try {
    const { default: app } = await import("../src/app.js");
    handler = app;
} catch (err) {
    console.error("INIT ERROR:", err);
    initError = { message: err.message, stack: err.stack };
    handler = (req, res) => {
        res.status(503).json({ initError });
    };
}

export default handler;
