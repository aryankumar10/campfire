import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const TEST_USERS = [
  { username: 'student1', password: 'pass123', name: 'Alice Johnson' },
  { username: 'student2', password: 'pass123', name: 'Bob Smith' },
  { username: 'student3', password: 'pass123', name: 'Charlie Brown' },
  { username: 'student4', password: 'pass123', name: 'Diana Prince' }
];

async function seed() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing from .env');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('Clearing old users...');
    await User.deleteMany({ username: { $in: TEST_USERS.map(u => u.username) } });

    console.log('Seeding new users...');
    for (const u of TEST_USERS) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(u.password, salt);
      
      const newUser = new User({
        username: u.username,
        password: hashedPassword,
        name: u.name,
      });
      
      await newUser.save();
      console.log(`Created user: ${u.username}`);
    }

    console.log('✅ Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
