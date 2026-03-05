const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
    hospitalId: { type: String, required: true },
    ambulanceId: String,
    source: { type: String, enum: ['Ambulance', 'Public'], default: 'Public' },
    patientName: { type: String, required: true },
    age: Number,
    gender: String,
    mobile: String,
    address: String,
    emergencyType: String,
    equipment: String,
    symptoms: String,
    reason: String,
    status: { type: String, enum: ['Pending', 'Accepted', 'Denied', 'Transferred', 'Admitted'], default: 'Pending' },
    transferredTo: String,
    bedId: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EmergencyRequest', emergencySchema);
