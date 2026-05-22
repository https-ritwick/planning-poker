const mongoose = require('mongoose');

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/planning-poker');
};

module.exports = connectDB;
