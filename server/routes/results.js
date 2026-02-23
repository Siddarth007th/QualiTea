const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../db');
const { sendAlertEmail } = require('../mailer');
const crypto = require('crypto');
const { z } = require('zod');

const VALID_STATUSES = ['Pass', 'Fail', 'Semi-Pass', 'Waiting', 'Blocked', 'Skipped', 'In Review', 'Deferred'];
const EMAIL_STATUSES = ['Fail', 'Semi-Pass'];

// Validation schemas
const resultCreateSchema = z.object({
    attribute_id: z.string().uuid('Invalid attribute ID'),
    product_id: z.string().uuid('Invalid product ID'),
    status: z.enum(VALID_STATUSES, {
        errorMap: () => ({ message: `status must be one of: ${VALID_STATUSES.join(', ')}` })
    }),
    notes: z.string().optional().nullable(),
    tested_by: z.string().optional().nullable(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional().nullable(),
});

// GET /api/results?product_id=... — list results, optionally filtered
router.get('/', async (req, res, next) => {
    const { product_id } = req.query;

    let sql = `
        SELECT r.*, p.name as product_name, a.name as attribute_name
        FROM qa_results r
        LEFT JOIN products p ON r.product_id = p.id
        LEFT JOIN qa_attributes a ON r.attribute_id = a.id
    `;
    const values = [];

    if (product_id) {
        // Validate uuid if provided
        const uuidSchema = z.string().uuid();
        try {
            uuidSchema.parse(product_id);
        } catch {
            return res.status(400).json({ error: 'Invalid product_id format' });
        }

        sql += ' WHERE r.product_id = ?';
        values.push(product_id);
    }

    sql += ' ORDER BY r.tested_at DESC';

    try {
        const result = await query(sql, values);
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

// POST /api/results — record a QA result
router.post('/', async (req, res, next) => {
    try {
        const validated = resultCreateSchema.parse(req.body);
        const id = crypto.randomUUID();

        const insertQuery = `
            INSERT INTO qa_results (id, attribute_id, product_id, status, notes, tested_by, difficulty)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        await run(insertQuery, [
            id,
            validated.attribute_id,
            validated.product_id,
            validated.status,
            validated.notes || null,
            validated.tested_by || null,
            validated.difficulty || null
        ]);

        const fetchResult = await queryOne('SELECT * FROM qa_results WHERE id = ?', [id]);
        const newResult = fetchResult.rows[0];

        // Only Fail and Semi-Pass trigger email alerts
        if (EMAIL_STATUSES.includes(validated.status)) {
            // Fetch names for email
            const productRes = await queryOne('SELECT name FROM products WHERE id = ?', [validated.product_id]);
            const attrRes = await queryOne('SELECT name FROM qa_attributes WHERE id = ?', [validated.attribute_id]);

            const productName = productRes.rows[0]?.name || 'Unknown Product';
            const attributeName = attrRes.rows[0]?.name || 'Unknown Attribute';

            sendAlertEmail({
                productName,
                attributeName,
                status: validated.status,
                difficulty: validated.difficulty || '',
                notes: validated.notes || '',
                testedBy: validated.tested_by || '',
            });

            newResult._emailTriggered = true;
        }

        res.status(201).json(newResult);
    } catch (err) {
        next(err);
    }
});

// DELETE /api/results/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await run('DELETE FROM qa_results WHERE id = ?', [id]);
        if (result.changes === 0) return res.status(404).json({ error: 'Result not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
