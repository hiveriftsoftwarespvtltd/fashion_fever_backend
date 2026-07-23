const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://rs5045280:xbpneTRReMJD9LAc@cluster0.sbbouj5.mongodb.net/wakeup-makeup?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  console.log('=== CHECKING USER vendorId FIELD FOR ALL VENDOR OWNERS ===');

  // saif vendor ownerId: 6a6073b6ed6a7773aa793ac2
  const saifUser = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId('6a6073b6ed6a7773aa793ac2') });
  console.log('\nSaif user:');
  console.log('  name:', saifUser?.name);
  console.log('  email:', saifUser?.email);
  console.log('  roles:', saifUser?.roles);
  console.log('  vendorId:', saifUser?.vendorId);
  console.log('  isActive:', saifUser?.isActive);

  // Neelam user ownerId: 6a34d8866ce206f5eece09fa
  const neelamUser = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId('6a34d8866ce206f5eece09fa') });
  console.log('\nNeelam user:');
  console.log('  name:', neelamUser?.name);
  console.log('  email:', neelamUser?.email);
  console.log('  roles:', neelamUser?.roles);
  console.log('  vendorId:', neelamUser?.vendorId);
  console.log('  isActive:', neelamUser?.isActive);

  mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
