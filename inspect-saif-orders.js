const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://rs5045280:xbpneTRReMJD9LAc@cluster0.sbbouj5.mongodb.net/wakeup-makeup?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI).then(async () => {
  const db = mongoose.connection.db;

  // saif vendor ID
  const saifVendorId = new mongoose.Types.ObjectId('6a60745eed6a7773aa793ac5');

  console.log('=== saif vendorquickorders ===');
  const orders = await db.collection('vendorquickorders').find({ vendorId: saifVendorId }).toArray();
  console.log('Count:', orders.length);
  orders.forEach(o => {
    console.log('  ID:', o._id, '| status:', o.status, '| total:', o.total, '| grandTotal:', o.grandTotal);
    console.log('  Full order:', JSON.stringify(o, null, 2));
  });

  mongoose.disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
