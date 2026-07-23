const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://rs5045280:xbpneTRReMJD9LAc@cluster0.sbbouj5.mongodb.net/wakeup-makeup?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  // Activate saif vendor
  const r1 = await db.collection('vendors').updateOne(
    { _id: new mongoose.Types.ObjectId('6a60745eed6a7773aa793ac5') },
    { $set: { isActive: true, status: 'APPROVED', 'quickCommerce.acceptingOrders': true, 'quickCommerce.enabled': true } }
  );
  console.log('Updated saif vendor:', r1.modifiedCount, 'doc(s)');

  // Also fix hiverift vendor
  const r2 = await db.collection('vendors').updateOne(
    { _id: new mongoose.Types.ObjectId('6a3bc1aee4acd3bbdb8bddc8') },
    { $set: { isActive: true, status: 'APPROVED' } }
  );
  console.log('Updated hiverift vendor:', r2.modifiedCount, 'doc(s)');

  // Verify
  const vendors = await db.collection('vendors').find({}).project({ businessName: 1, isActive: 1, status: 1 }).toArray();
  vendors.forEach(v => console.log(v.businessName, '| isActive:', v.isActive, '| status:', v.status));

  mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
