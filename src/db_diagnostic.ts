import mongoose from 'mongoose';

const mongoUri = 'mongodb://localhost:27017/espoir_academy';

async function run() {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // Let's get list of users
  const users = await db.collection('users').find({}).toArray();
  console.log(`Found ${users.length} users:`);
  for (const user of users) {
    console.log(`User: ${user.fullName} (${user.email}) - ID: ${user._id}`);
  }

  // Let's get list of children
  const children = await db.collection('children').find({}).toArray();
  console.log(`\nFound ${children.length} children:`);
  for (const child of children) {
    console.log(`Child: ${child.firstName} ${child.lastName} - ParentID: ${child.parentId}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
