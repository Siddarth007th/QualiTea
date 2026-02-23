const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../db');
const crypto = require('crypto');
const { z } = require('zod');

// Validation schemas
const teamMemberCreateSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    email: z.string().email('Invalid email address'),
    role: z.enum(['tester', 'authority']).optional().default('tester')
});

// GET /api/team — list all team members
router.get('/', async (_req, res, next) => {
    try {
        const result = await query('SELECT * FROM team_members ORDER BY role DESC, name ASC');
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

// POST /api/team — add a team member
router.post('/', async (req, res, next) => {
    try {
        const validated = teamMemberCreateSchema.parse(req.body);
        const id = crypto.randomUUID();

        await run(
            'INSERT INTO team_members (id, name, email, role) VALUES (?, ?, ?, ?)',
            [id, validated.name, validated.email, validated.role]
        );
        const result = await queryOne('SELECT * FROM team_members WHERE id = ?', [id]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        next(err);
    }
});

// DELETE /api/team/:id
router.delete('/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await run('DELETE FROM team_members WHERE id = ?', [id]);
        if (result.changes === 0) return res.status(404).json({ error: 'Team member not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
