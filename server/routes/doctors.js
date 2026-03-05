const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Doctor = require('../models/Doctor');
const Attendance = require('../models/Attendance');
const Hospital = require('../models/Hospital');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/photos');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// List doctors (public for hospital info, also hospital/admin)
router.get('/', async (req, res) => {
    try {
        const { hospitalId } = req.query;
        const q = hospitalId ? { hospitalId } : {};
        const doctors = await Doctor.find(q, '-password');
        res.json(doctors);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Get single doctor
router.get('/doctor/:doctorId', async (req, res) => {
    try {
        const d = await Doctor.findOne({ doctorId: req.params.doctorId }, '-password');
        if (!d) return res.status(404).json({ message: 'Not found' });
        res.json(d);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Create doctor
router.post('/', auth(['hospital', 'superadmin']), async (req, res) => {
    try {
        const d = new Doctor({ ...req.body, password: 'test@1234' });
        await d.save();
        res.json(d);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Update doctor
router.put('/:doctorId', auth(['doctor', 'hospital', 'superadmin']), async (req, res) => {
    try {
        const d = await Doctor.findOneAndUpdate({ doctorId: req.params.doctorId }, req.body, { new: true }).select('-password');
        res.json(d);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Upload photo
router.post('/:doctorId/photo', auth(['doctor', 'hospital']), upload.single('photo'), async (req, res) => {
    try {
        const url = `/uploads/photos/${req.file.filename}`;
        const d = await Doctor.findOneAndUpdate({ doctorId: req.params.doctorId }, { photoUrl: url }, { new: true }).select('-password');
        res.json({ doctor: d });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Attendance list
router.get('/attendance/:doctorId', auth(['doctor', 'hospital']), async (req, res) => {
    try {
        const list = await Attendance.find({ doctorId: req.params.doctorId }).sort({ date: -1 });
        res.json(list);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Mark attendance
router.post('/attendance', auth(['doctor', 'hospital']), async (req, res) => {
    try {
        const { doctorId, date, availability, shift, method } = req.body;
        const d = new Date(date); d.setHours(0, 0, 0, 0);
        let a = await Attendance.findOne({ doctorId, date: d });
        if (a) { Object.assign(a, { availability, shift, method: method || 'Manual' }); }
        else a = new Attendance({ doctorId, date: d, availability, shift, method: method || 'Manual', hospitalId: req.body.hospitalId });
        await a.save();
        res.json(a);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Geofence check-in
router.post('/geofence-checkin', auth(['doctor']), async (req, res) => {
    try {
        const { doctorId, lat, lng } = req.body;
        const doctor = await Doctor.findOne({ doctorId });
        if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
        const hospital = await Hospital.findOne({ hospitalId: doctor.hospitalId });
        if (!hospital?.location?.lat) return res.status(400).json({ message: 'Hospital location not set' });
        const dist = Math.sqrt(Math.pow(lat - hospital.location.lat, 2) + Math.pow(lng - hospital.location.lng, 2)) * 111;
        if (dist > 0.1) return res.status(400).json({ message: `Too far from hospital (${(dist * 1000).toFixed(0)}m). Must be within 100m.`, distance: dist });
        const today = new Date(); today.setHours(0, 0, 0, 0);
        let a = await Attendance.findOne({ doctorId, date: today });
        if (!a) a = new Attendance({ doctorId, hospitalId: doctor.hospitalId, date: today, availability: 'Present', checkIn: new Date(), method: 'Geofence' });
        else { a.checkIn = new Date(); a.availability = 'Present'; a.method = 'Geofence'; }
        await a.save();
        await Doctor.findOneAndUpdate({ doctorId }, { availability: 'Available' });
        res.json({ success: true, attendance: a, distance: dist });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// Geofence check-out
router.post('/geofence-checkout', auth(['doctor']), async (req, res) => {
    try {
        const { doctorId, lat, lng } = req.body;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        let a = await Attendance.findOne({ doctorId, date: today });
        if (!a || !a.checkIn) return res.status(400).json({ message: 'No check-in found for today' });
        const hours = ((new Date() - a.checkIn) / 3600000).toFixed(1);
        a.checkOut = new Date(); a.totalHours = hours;
        await a.save();
        res.json({ success: true, attendance: a });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
