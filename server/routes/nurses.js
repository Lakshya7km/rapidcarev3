const router = require('express').Router();
const auth = require('../middleware/auth');
const Nurse = require('../models/Nurse');
const Bed = require('../models/Bed');

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const nurse = await Nurse.findOne({ nurseId: username });
        if (!nurse) return res.status(404).json({ message: 'Nurse not found' });
        const ok = await nurse.comparePassword(password);
        if (!ok) return res.status(401).json({ message: 'Invalid password' });
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ role: 'nurse', id: nurse._id, hospitalId: nurse.hospitalId, ref: nurse.nurseId }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, nurse });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// List nurses
router.get('/', auth(['hospital', 'superadmin', 'nurse', 'doctor']), async (req, res) => {
    try {
        const { hospitalId } = req.query;
        const q = hospitalId ? { hospitalId } : {};
        res.json(await Nurse.find(q, '-password'));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Create nurse
router.post('/', auth(['hospital', 'superadmin']), async (req, res) => {
    try {
        const n = new Nurse({ ...req.body, password: 'test@1234' });
        await n.save();
        res.json(n);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Beds for nurse (scoped to hospital)
router.get('/beds', auth(['nurse']), async (req, res) => {
    try {
        const beds = await Bed.find({ hospitalId: req.user.hospitalId }).sort({ wardNumber: 1, bedNumber: 1 });
        res.json(beds);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
