const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const nurseSchema = new mongoose.Schema({
    nurseId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true
    },
    hospitalId: {
        type: String,
        required: true,
        ref: 'Hospital'
    },
    password: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true
    },
    photoUrl: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

nurseSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        if (this.password.startsWith('$2b$')) return next();
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

nurseSchema.methods.comparePassword = async function (candidate) {
    try {
        return await bcrypt.compare(candidate, this.password);
    } catch (err) {
        return candidate === this.password;
    }
};

module.exports = mongoose.model('Nurse', nurseSchema);
