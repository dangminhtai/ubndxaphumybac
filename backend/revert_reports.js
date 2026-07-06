const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/report_system')
  .then(() => mongoose.connection.db.collection('reports').updateMany({}, { $set: { status: 'draft' } }))
  .then((res) => { console.log('Reverted to draft:', res.modifiedCount); process.exit(0); })
  .catch(console.error);
