const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://rs5045280:xbpneTRReMJD9LAc@cluster0.sbbouj5.mongodb.net/wakeup-makeup?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  console.log('=== ALL VENDORS ===');
  const vendors = await db.collection('vendors').find({}).toArray();
  vendors.forEach(v => {
    console.log(`  ID: ${v._id} | Name: ${v.businessName} | ownerId: ${v.ownerId}`);
  });

  console.log('\n=== ALL VENDOR QUICK ORDERS ===');
  const vendorOrders = await db.collection('vendorquickorders').find({}).toArray();
  vendorOrders.forEach(o => {
    console.log(`  OrderID: ${o._id} | vendorId: ${o.vendorId} | status: ${o.status} | items: ${o.items?.length}`);
  });

  console.log('\n=== ALL CUSTOMER QUICK ORDERS ===');
  const customerOrders = await db.collection('quickorders').find({}).toArray();
  customerOrders.forEach(o => {
    console.log(`  OrderID: ${o._id} | customerId: ${o.customerId} | status: ${o.status} | total: ${o.grandTotal}`);
  });

  mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
