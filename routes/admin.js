const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const Ambulance = require('../models/Ambulance');
const EmergencyRequest = require('../models/EmergencyRequest');
const { auth, getJwtSecret } = require('../middleware/auth');
const crypto = require('crypto');

// Super Admin Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await SuperAdmin.findOne({ username });

        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: admin._id, role: 'superadmin', ref: admin.username }, getJwtSecret(), { expiresIn: '24h' });
        res.json({ token, admin: { username: admin.username } });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Create Initial Super Admin (Run once or protect)
router.post('/create-initial', async (req, res) => {
    try {
        const count = await SuperAdmin.countDocuments();
        if (count > 0) return res.status(403).json({ message: 'Super Admin already exists' });

        const { username, password } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const admin = new SuperAdmin({ username, password: hashedPassword });
        await admin.save();

        res.json({ message: 'Super Admin created' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Register Hospital (Only Super Admin)
router.post('/register-hospital', auth(['superadmin']), async (req, res) => {
    try {
        const { hospitalId, contact, password, lat, lng, name, address } = req.body;

        // Check if hospital exists
        const exists = await Hospital.findOne({ hospitalId });
        if (exists) return res.status(400).json({ message: 'Hospital ID already exists' });

        const tempPassword = (typeof password === 'string' && password.trim() !== '')
            ? password
            : crypto.randomBytes(9).toString('base64url');

        const newHospital = new Hospital({
            hospitalId,
            contact,
            password: tempPassword, // Will be hashed by pre-save
            location: { lat, lng },
            name,
            address
        });

        await newHospital.save();
        res.json({ message: 'Hospital registered successfully', hospital: newHospital, tempPassword: password ? undefined : tempPassword });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// Global Stats (Only Super Admin)
router.get('/stats', auth(['superadmin']), async (req, res) => {
    try {
        const hospitals = await Hospital.countDocuments();
        const doctors = await Doctor.countDocuments();
        const ambulances = await Ambulance.countDocuments();
        const emergencies = await EmergencyRequest.countDocuments(); // Total requests
        const activeEmergencies = await EmergencyRequest.countDocuments({ status: { $in: ['Pending', 'Accepted'] } });

        res.json({
            hospitals,
            doctors,
            ambulances,
            emergencies,
            activeEmergencies
        });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

module.exports = router;
