const mongoose = require('mongoose');
const env = require('../config/env');

const connectDB = async () => {
  try {
    const dbUrl = 'mongodb://127.0.0.1:27017/express_demo';
    
    await mongoose.connect(dbUrl, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });
    
    console.log('MongoDB connected successfully');
    
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;