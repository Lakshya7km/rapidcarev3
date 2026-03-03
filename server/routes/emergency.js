const router = require('express').Router();
const auth = require('../middleware/auth');
const EmergencyRequest = require('../models/EmergencyRequest');
const Bed = require('../models/Bed');

router.get('/', auth(['hospital', 'ambulance', 'superadmin']), async (req, res) => {
    try {
        const { hospitalId, ambulanceId, status } = req.query;
        const q = {};
        if (hospitalId) q.hospitalId = hospitalId;
        if (ambulanceId) q.ambulanceId = ambulanceId;
        if (status) q.status = status;
        res.json(await EmergencyRequest.find(q).sort({ createdAt: -1 }));
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', async (req, res) => {
    try {
        const er = new EmergencyRequest(req.body);
        await er.save();
        // Emit via socket (referenced in server.js)
        if (global.io) global.io.to(req.body.hospitalId).emit('emergency:new', er);
        res.json(er);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id/status', auth(['hospital']), async (req, res) => {
    try {
        const { status, transferredTo } = req.body;
        const update = { status, updatedAt: new Date() };
        if (transferredTo) update.transferredTo = transferredTo;
        const er = await EmergencyRequest.findByIdAndUpdate(req.params.id, update, { new: true });
        if (global.io) {
            global.io.to(er.hospitalId).emit('emergency:update', er);
            if (er.ambulanceId) global.io.to(er.ambulanceId).emit('emergency:update', er);
        }
        res.json(er);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id/admit', auth(['hospital']), async (req, res) => {
    try {
        const { bedId, patientName } = req.body;
        const er = await EmergencyRequest.findByIdAndUpdate(req.params.id, { status: 'Admitted', bedId, updatedAt: new Date() }, { new: true });
        if (bedId) await Bed.findOneAndUpdate({ bedId }, { status: 'Occupied', patientName: patientName || er.patientName, admittedAt: new Date() });
        if (global.io) global.io.to(er.hospitalId).emit('bed:update', { bedId });
        res.json(er);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
