const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://rs5045280:xbpneTRReMJD9LAc@cluster0.sbbouj5.mongodb.net/wakeup-makeup?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  console.log('=== REGULAR ORDERS (vendor-orders collection) ===');
  const regularOrders = await db.collection('vendororders').find({}).toArray();
  if (regularOrders.length === 0) {
    console.log('  No regular orders found in vendororders collection');
  }
  regularOrders.forEach(o => {
    console.log(`  OrderID: ${o._id} | vendorId: ${o.vendorId} | status: ${o.orderStatus || o.status}`);
  });

  // Also check other possible collection names
  console.log('\n=== ALL DB COLLECTIONS ===');
  const collections = await db.listCollections().toArray();
  collections.forEach(c => console.log(' ', c.name));

  mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
