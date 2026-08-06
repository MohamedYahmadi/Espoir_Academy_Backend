import mongoose from 'mongoose';

const mongoUri = 'mongodb://localhost:27017/espoir_academy';

async function run() {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // Let's find saif jaouadi's ID
  const parent = await db.collection('users').findOne({ email: 'mohamedyahmdi02@gmail.com' });
  if (!parent) {
    console.log('Parent saif jaouadi not found!');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found parent: ${parent.fullName} with ID: ${parent._id}`);

  // Let's update the children in the database to point to this parent
  const result = await db.collection('children').updateMany(
    {},
    { $set: { parentId: parent._id } }
  );

  console.log(`Updated ${result.modifiedCount} children's parentId to ${parent._id}`);

  await mongoose.disconnect();
}

run().catch(console.error);
