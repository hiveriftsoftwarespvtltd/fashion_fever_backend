const mongoose = require('mongoose');

const uri = 'mongodb+srv://rs5045280:xbpneTRReMJD9LAc@cluster0.sbbouj5.mongodb.net/wakeup-makeup?retryWrites=true&w=majority';

async function main() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected!');

    // Find vendor sub-orders for the recent order '6a60aabfe0786d49ea80ec04'
    const orderId = '6a60aabfe0786d49ea80ec04';
    
    console.log(`Searching vendororders matching orderId: ${orderId}...`);
    const subOrders = await mongoose.connection.db.collection('vendororders').find({
      orderId: new mongoose.Types.ObjectId(orderId)
    }).toArray();
    
    console.log(`Found vendor orders: ${subOrders.length}`);
    subOrders.forEach(o => {
      console.log('VendorOrder Details:', {
        _id: o._id,
        orderId: o.orderId,
        vendorId: o.vendorId,
        orderNumber: o.orderNumber,
        grandTotal: o.grandTotal,
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus
      });
    });

    console.log('\nListing last 5 vendor orders overall:');
    const allSubOrders = await mongoose.connection.db.collection('vendororders').find({}).sort({ createdAt: -1 }).limit(5).toArray();
    allSubOrders.forEach(o => {
      console.log('VendorOrder Details:', {
        _id: o._id,
        orderId: o.orderId,
        vendorId: o.vendorId,
        orderNumber: o.orderNumber,
        grandTotal: o.grandTotal,
        orderStatus: o.orderStatus,
        createdAt: o.createdAt
      });
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

main();
