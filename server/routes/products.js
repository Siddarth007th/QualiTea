const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../db');
const crypto = require('crypto');
const { z } = require('zod');

// Validation schemas
const productSchema = z.object({
    name: z.string().min(1, 'Product name is required').max(255),
    description: z.string().optional().nullable(),
});

// GET /api/products — list all products
router.get('/', async (_req, res, next) => {
    try {
        const result = await query('SELECT * FROM products ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

// GET /api/products/:id — single product
router.get('/:id', async (req, res, next) => {
    try {
        const result = await queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

// POST /api/products — create a product
router.post('/', async (req, res, next) => {
    try {
        const validated = productSchema.parse(req.body);
        const id = crypto.randomUUID();

        await run(
            'INSERT INTO products (id, name, description) VALUES (?, ?, ?)',
            [id, validated.name, validated.description || null]
        );
        const result = await queryOne('SELECT * FROM products WHERE id = ?', [id]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await run('DELETE FROM products WHERE id = ?', [id]);
        if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
