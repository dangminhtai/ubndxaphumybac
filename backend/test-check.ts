import mongoose from 'mongoose';
import Notification from './src/models/Notification';
import User from './src/models/User';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');
  
  const user = await User.findOne({ fullName: 'Tài' }) || await User.findOne({ username: 'tai1' });
  if (!user) {
    console.log('No user found');
    process.exit(1);
  }
  
  console.log('User:', user.username);
  const notifs = await Notification.find({ recipientId: user._id });
  console.log('Notifs length:', notifs.length);
  if (notifs.length > 0) {
    console.log('First notif:', notifs[0]);
  }
  
  process.exit(0);
}

run();
