require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const productsRouter = require('./routes/products');
const attributesRouter = require('./routes/attributes');
const resultsRouter = require('./routes/results');
const teamRouter = require('./routes/team');

const app = express();
const PORT = process.env.PORT || 5001;

// ── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── API Routes ─────────────────────────────────────────
app.use('/api/products', productsRouter);
app.use('/api/attributes', attributesRouter);
app.use('/api/results', resultsRouter);
app.use('/api/team', teamRouter);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Serve built frontend (production) ──────────────────
const distPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(distPath));

// SPA fallback — serve index.html for any non-API route
app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('🔥 Global Error:', err.message);
    if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ── Start ──────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🍵  QualiTea running on http://localhost:${PORT}`);
    console.log(`💽  Using PostgreSQL database`);
});
