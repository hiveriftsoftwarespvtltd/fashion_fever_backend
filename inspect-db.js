const mongoose = require('mongoose');

const uri = 'mongodb+srv://rs5045280:xbpneTRReMJD9LAc@cluster0.sbbouj5.mongodb.net/wakeup-makeup?retryWrites=true&w=majority';

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected!');

    const userCount = await mongoose.connection.db.collection('users').countDocuments({});
    const vendorCount = await mongoose.connection.db.collection('vendors').countDocuments({});
    const productCount = await mongoose.connection.db.collection('products').countDocuments({});
    const variantCount = await mongoose.connection.db.collection('productvariants').countDocuments({});
    const deliveryPersonCount = await mongoose.connection.db.collection('deliverypersons').countDocuments({});

    console.log({
      users: userCount,
      vendors: vendorCount,
      products: productCount,
      variants: variantCount,
      deliveryPersons: deliveryPersonCount
    });

    if (userCount > 0) {
      console.log('Sample Users:');
      const users = await mongoose.connection.db.collection('users').find({}).limit(5).toArray();
      users.forEach(u => console.log(`- ID: ${u._id}, Name: ${u.name}, Email: ${u.email}, Roles: ${JSON.stringify(u.roles)}`));
    }

    if (vendorCount > 0) {
      console.log('Sample Vendors:');
      const vendors = await mongoose.connection.db.collection('vendors').find({}).limit(3).toArray();
      vendors.forEach(v => console.log(`- ID: ${v._id}, Name: ${v.businessName}, Owner: ${v.ownerId}, Pincode: ${v.vendorPincode}, QuickComEnabled: ${v.quickCommerce?.enabled}`));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
