const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../db');
const crypto = require('crypto');
const { z } = require('zod');

// Validation schemas
const attributeCreateSchema = z.object({
    product_id: z.string().uuid('Invalid product ID'),
    name: z.string().min(1, 'Attribute name is required').max(255),
    description: z.string().optional().nullable(),
    prerequisite_id: z.string().uuid().optional().nullable(),
    sort_order: z.number().int().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
});

const attributeUpdateSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional().nullable(),
    prerequisite_id: z.string().uuid().optional().nullable(),
    sort_order: z.number().int().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
});

// GET /api/attributes/product/:productId — all attributes for a product
router.get('/product/:productId', async (req, res, next) => {
    try {
        const result = await query(
            'SELECT * FROM qa_attributes WHERE product_id = $1 ORDER BY sort_order ASC, created_at ASC',
            [req.params.productId]
        );
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

// POST /api/attributes — create an attribute
router.post('/', async (req, res, next) => {
    try {
        const validated = attributeCreateSchema.parse(req.body);
        const id = crypto.randomUUID();

        await run(
            `INSERT INTO qa_attributes (id, product_id, name, description, prerequisite_id, sort_order, priority)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                id,
                validated.product_id,
                validated.name,
                validated.description || null,
                validated.prerequisite_id || null,
                validated.sort_order || 0,
                validated.priority || 'medium'
            ]
        );
        const result = await queryOne('SELECT * FROM qa_attributes WHERE id = $1', [id]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

// PUT /api/attributes/:id — update an attribute
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const validated = attributeUpdateSchema.parse(req.body);

        // Prevent circular prerequisites
        if (validated.prerequisite_id) {
            if (validated.prerequisite_id === id) {
                return res.status(400).json({ error: 'Cannot set self as prerequisite' });
            }

            const attrResult = await queryOne('SELECT product_id FROM qa_attributes WHERE id = $1', [id]);
            if (attrResult.rows.length === 0) return res.status(404).json({ error: 'Attribute not found' });

            const product_id = attrResult.rows[0].product_id;
            const allAttrsResult = await query('SELECT id, prerequisite_id FROM qa_attributes WHERE product_id = $1', [product_id]);

            let current = validated.prerequisite_id;
            const visited = new Set([id]);
            while (current) {
                if (visited.has(current)) {
                    return res.status(400).json({ error: 'Circular prerequisite detected' });
                }
                visited.add(current);
                const parent = allAttrsResult.rows.find((a) => a.id === current);
                current = parent?.prerequisite_id || null;
            }
        }

        const updates = [];
        const values = [];
        let paramIdx = 1;

        if (validated.name !== undefined) {
            updates.push(`name = $${paramIdx++}`);
            values.push(validated.name);
        }
        if (validated.description !== undefined) {
            updates.push(`description = $${paramIdx++}`);
            values.push(validated.description);
        }
        if (validated.prerequisite_id !== undefined) {
            updates.push(`prerequisite_id = $${paramIdx++}`);
            values.push(validated.prerequisite_id || null);
        }
        if (validated.sort_order !== undefined) {
            updates.push(`sort_order = $${paramIdx++}`);
            values.push(validated.sort_order);
        }
        if (validated.priority !== undefined) {
            updates.push(`priority = $${paramIdx++}`);
            values.push(validated.priority);
        }

        if (updates.length === 0) {
            const current = await queryOne('SELECT * FROM qa_attributes WHERE id = $1', [id]);
            return res.json(current.rows[0]);
        }

        values.push(id);
        const sql = `UPDATE qa_attributes SET ${updates.join(', ')} WHERE id = $${paramIdx}`;

        const updateResult = await run(sql, values);
        if (updateResult.rowCount === 0) return res.status(404).json({ error: 'Attribute not found' });

        const finalResult = await queryOne('SELECT * FROM qa_attributes WHERE id = $1', [id]);
        res.json(finalResult.rows[0]);
    } catch (err) {
        next(err);
    }
});

// DELETE /api/attributes/:id
router.delete('/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await run('DELETE FROM qa_attributes WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Attribute not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
