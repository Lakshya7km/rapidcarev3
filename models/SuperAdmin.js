const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const superAdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

superAdminSchema.pre('save', async function (next) {
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

superAdminSchema.methods.comparePassword = async function (candidate) {
  try {
    return await bcrypt.compare(candidate, this.password);
  } catch (err) {
    return candidate === this.password;
  }
};

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
