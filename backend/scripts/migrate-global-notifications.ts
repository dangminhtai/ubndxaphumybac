import mongoose from 'mongoose';
import GlobalNotification from '../src/models/GlobalNotification';
import Notification from '../src/models/Notification';
import WorkSchedule from '../src/models/WorkSchedule';
import User from '../src/models/User';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  // Migrate existing Work Schedules into GlobalNotification
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const schedules = await WorkSchedule.find({
    createdAt: { $gte: thirtyDaysAgo },
    isDeleted: false,
  });

  for (const schedule of schedules) {
    const link = `/work-schedules/${schedule._id}`;
    const exists = await GlobalNotification.findOne({ link });
    if (!exists) {
      await GlobalNotification.create({
        title: 'Có lịch công tác mới',
        message: `Lịch công tác "${schedule.title}" đã được tạo.`,
        type: 'work_schedule',
        link: link,
        createdAt: schedule.createdAt,
      });
      console.log(`Created GlobalNotification for WorkSchedule ${schedule._id}`);
    }
  }

  // Find recent users and ensure they have these notifications
  const recentUsers = await User.find({ createdAt: { $gte: thirtyDaysAgo } });
  for (const user of recentUsers) {
    const globalNotifs = await GlobalNotification.find({
      createdAt: { $gte: thirtyDaysAgo }
    });

    for (const gn of globalNotifs) {
      const exists = await Notification.findOne({
        recipientId: user._id,
        link: gn.link,
      });
      if (!exists) {
        await Notification.create({
          recipientId: user._id,
          title: gn.title,
          message: gn.message,
          type: gn.type,
          link: gn.link,
          createdAt: gn.createdAt,
        });
        console.log(`Created Notification for user ${user.username} - ${gn.title}`);
      }
    }
  }

  console.log('Migration completed');
  process.exit(0);
}

run();
