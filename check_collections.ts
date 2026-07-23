import mongoose from 'mongoose';

async function checkCollections() {
  await mongoose.connect('mongodb://localhost:27017/wake_up_makeup');
  const collections = await mongoose.connection.db!.listCollections().toArray();
  console.log(collections.map(c => c.name));
  process.exit(0);
}

checkCollections();
