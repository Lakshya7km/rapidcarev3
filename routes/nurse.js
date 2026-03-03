const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Nurse = require('../models/Nurse');
const Hospital = require('../models/Hospital');
const Bed = require('../models/Bed');
const { auth, getJwtSecret } = require('../middleware/auth');

// Nurse Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Nurse username might be nurseId? Let's assume nurseId or username is mobile?
        // User said "Reception can do create there particular user like doctor, emt/ambulance, nurse"
        // So Nurse login likely by nurseId

        const nurse = await Nurse.findOne({ nurseId: username }).collation({ locale: 'en', strength: 2 });
        if (!nurse) return res.status(404).json({ message: 'Nurse not found' });

        // Simple password check for now (or bcrypt if we hash nurse passwords)
        // Assuming we hash:
        const isMatch = await bcrypt.compare(password, nurse.password);
        // If migration from plain text needed, add fallback

        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            {
                id: nurse._id,
                role: 'nurse',
                ref: nurse.nurseId,
                hospitalId: nurse.hospitalId
            },
            getJwtSecret(),
            { expiresIn: '24h' }
        );

        res.json({ token, nurse });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Get My Hospital Beds
router.get('/beds', auth(['nurse']), async (req, res) => {
    try {
        const beds = await Bed.find({ hospitalId: req.user.hospitalId });
        res.json(beds);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// GET all nurses for a hospital (Reception)
router.get('/:hospitalId', auth(['hospital', 'superadmin']), async (req, res) => {
    try {
        if (req.user.role === 'hospital' && String(req.user.ref || '').toUpperCase() !== String(req.params.hospitalId || '').toUpperCase()) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const nurses = await Nurse.find({ hospitalId: req.params.hospitalId });
        res.json(nurses);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Register new nurse (Reception)
router.post('/', auth(['hospital', 'superadmin']), async (req, res) => {
    try {
        const { nurseId, name, mobile, hospitalId, password } = req.body;

        if (!hospitalId || typeof hospitalId !== 'string' || hospitalId.trim() === '') {
            return res.status(400).json({ message: 'hospitalId is required' });
        }

        if (req.user.role === 'hospital' && String(req.user.ref || '').toUpperCase() !== String(hospitalId || '').toUpperCase()) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        // Check if nurse already exists
        const existing = await Nurse.findOne({ nurseId });
        if (existing) return res.status(400).json({ message: 'Nurse ID already exists' });

        if (!password) return res.status(400).json({ message: 'Password is required' });
        const hashedPassword = await bcrypt.hash(password, 10);

        const nurse = new Nurse({
            nurseId,
            name,
            mobile,
            hospitalId,
            password: hashedPassword
        });

        await nurse.save();
        res.json({ success: true, nurse });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Delete nurse (Reception)
router.delete('/:nurseId', auth(['hospital', 'superadmin']), async (req, res) => {
    try {
        const existing = await Nurse.findOne({ nurseId: req.params.nurseId }).collation({ locale: 'en', strength: 2 });
        if (!existing) return res.status(404).json({ message: 'Nurse not found' });
        if (req.user.role === 'hospital' && String(req.user.ref || '').toUpperCase() !== String(existing.hospitalId || '').toUpperCase()) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const result = await Nurse.findOneAndDelete({ nurseId: req.params.nurseId }).collation({ locale: 'en', strength: 2 });
        if (!result) return res.status(404).json({ message: 'Nurse not found' });
        res.json({ success: true, message: 'Nurse deleted successfully' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

module.exports = (io) => {
    // Update Bed Status (with IO emission)
    router.put('/bed-status', auth(['nurse']), async (req, res) => {
        try {
            const { bedId, status } = req.body;
            const allowed = ['Vacant', 'Occupied', 'Reserved', 'Cleaning'];
            if (!bedId || typeof bedId !== 'string' || bedId.trim() === '') {
                return res.status(400).json({ message: 'bedId is required' });
            }
            if (!status || !allowed.includes(status)) {
                return res.status(400).json({ message: 'Invalid status' });
            }
            const bed = await Bed.findOne({ bedId, hospitalId: req.user.hospitalId });

            if (!bed) return res.status(404).json({ message: 'Bed not found' });

            bed.status = status;

            await bed.save();

            // Emit socket event
            io.to(`hospital_${req.user.hospitalId}`).emit('bed:update', {
                bedId,
                hospitalId: req.user.hospitalId,
                status,
                bed
            });

            // Public update
            io.emit('bed:publicUpdate', {
                bedId,
                hospitalId: req.user.hospitalId,
                status
            });

            res.json({ message: 'Bed status updated', bed });
        } catch (e) {
            res.status(500).json({ message: e.message });
        }
    });

    return router;
};
