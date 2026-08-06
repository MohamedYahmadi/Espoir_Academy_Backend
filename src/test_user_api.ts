import mongoose from 'mongoose';
import User from './models/User.js';
import Child from './models/Child.js';

const mongoUri = 'mongodb://localhost:27017/espoir_academy';

async function run() {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Let's find saif jaouadi's ID
  const db = mongoose.connection.db;
  const parent = await db.collection('users').findOne({ email: 'mohamedyahmdi02@gmail.com' });
  if (!parent) {
    console.log('Parent not found!');
    await mongoose.disconnect();
    return;
  }

  const id = parent._id.toString();
  console.log(`Parent ID: ${id}`);

  const user = await User.findById(id);
  const children = await Child.find({ parentId: id }).sort({ createdAt: -1 });

  console.log('User found:', !!user);
  console.log('Children found:', children.length);
  console.log('Children data:', children);

  await mongoose.disconnect();
}

run().catch(console.error);
