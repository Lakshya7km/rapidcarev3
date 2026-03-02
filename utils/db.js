// utils/db.js
// Vercel-safe MongoDB connection using a cached singleton pattern.
// On serverless platforms (Vercel), each request may spin up a new Lambda.
// Without caching, each invocation would open a new connection, exhausting
// the MongoDB connection pool and causing buffering/timeout errors.

const mongoose = require('mongoose');

// Use a global cache so warm Lambda invocations reuse the existing connection.
let cached = global.mongooseCache;

if (!cached) {
    cached = global.mongooseCache = { conn: null, promise: null };
}

const MONGO_OPTIONS = {
    // Disable Mongoose command buffering — fail fast instead of hanging
    bufferCommands: false,

    // How long to wait for a server to be selected (ms)
    serverSelectionTimeoutMS: 10000,

    // How long the driver waits on an open connection (ms)
    socketTimeoutMS: 45000,

    // Connection pool — tune for serverless (stay small)
    maxPoolSize: 10,
    minPoolSize: 0,

    // Keep connection alive between requests
    heartbeatFrequencyMS: 10000,
};

async function connectDB() {
    const uri = process.env.MONGO_URI;

    if (!uri) {
        throw new Error('MONGO_URI environment variable is not set');
    }

    // Return existing connection if already established
    if (cached.conn) {
        return cached.conn;
    }

    // Return in-progress connection promise if already connecting
    if (!cached.promise) {
        cached.promise = mongoose
            .connect(uri, MONGO_OPTIONS)
            .then((mongooseInstance) => {
                console.log('✅ MongoDB connected (via db.js)');
                return mongooseInstance;
            })
            .catch((err) => {
                // Clear the promise so a future call can retry
                cached.promise = null;
                throw err;
            });
    }

    try {
        cached.conn = await cached.promise;
    } catch (err) {
        cached.promise = null;
        throw err;
    }

    // Re-attach lifecycle event listeners only once
    if (mongoose.connection.listenerCount('error') === 0) {
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err.message);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB disconnected — clearing cache');
            cached.conn = null;
            cached.promise = null;
        });

        mongoose.connection.on('reconnected', () => {
            console.log('🔄 MongoDB reconnected');
        });
    }

    return cached.conn;
}

module.exports = connectDB;
