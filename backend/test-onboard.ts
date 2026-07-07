import mongoose from 'mongoose';
import { generateOnboardingNotifications } from './src/services/notification.service';
import User from './src/models/User';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');
  
  const user = await User.findOne({ username: 'Tài' }) || await User.findOne().sort({ createdAt: -1 });
  if (!user) {
    console.log('No user found');
    process.exit(1);
  }
  
  console.log('Generating notifications for user:', user.username);
  try {
    await generateOnboardingNotifications(user._id.toString());
    console.log('Done');
  } catch (err) {
    console.error(err);
  }
  
  process.exit(0);
}

run();
