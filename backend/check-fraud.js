const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

(async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/land_registry');
    const db = mongoose.connection.db;
    
    const fraudulentTxs = await db.collection('transactions')
      .find({ isFraudulent: true })
      .limit(20)
      .toArray();
    
    const legitTxs = await db.collection('transactions')
      .find({ isFraudulent: false })
      .limit(5)
      .toArray();
    
    console.log('\n========== FRAUDULENT TRANSACTIONS ==========\n');
    fraudulentTxs.forEach((tx, idx) => {
      console.log(`[${idx + 1}] FRAUD DETECTED`);
      console.log(`    Land ID: ${tx.landId}`);
      console.log(`    Risk Score: ${tx.riskScore}/100`);
      console.log(`    Status: ${tx.status}`);
      console.log(`    From: ${tx.fromAddress.substring(0, 12)}...`);
      console.log(`    To: ${tx.toAddress.substring(0, 12)}...`);
      console.log(`    Type: ${tx.transactionType}`);
      console.log(`    Fraud Indicators:`);
      tx.fraudIndicators.forEach(ind => {
        console.log(`      • ${ind}`);
      });
      console.log(`    Rejection Reason: ${tx.rejectionReason || 'N/A'}`);
      console.log('');
    });
    
    console.log(`\n========== LEGITIMATE TRANSACTIONS (Sample) ==========\n`);
    legitTxs.forEach((tx, idx) => {
      console.log(`[${idx + 1}] LEGITIMATE`);
      console.log(`    Land ID: ${tx.landId}`);
      console.log(`    Risk Score: ${tx.riskScore}/100`);
      console.log(`    Status: ${tx.status}`);
      console.log(`    From: ${tx.fromAddress.substring(0, 12)}...`);
      console.log(`    To: ${tx.toAddress.substring(0, 12)}...`);
      console.log(`    Type: ${tx.transactionType}`);
      console.log('');
    });
    
    const totalFraud = await db.collection('transactions').countDocuments({ isFraudulent: true });
    const totalLegit = await db.collection('transactions').countDocuments({ isFraudulent: false });
    
    console.log(`\n========== SUMMARY ==========`);
    console.log(`Total Fraudulent Transactions: ${totalFraud}`);
    console.log(`Total Legitimate Transactions: ${totalLegit}`);
    console.log(`Total Transactions: ${totalFraud + totalLegit}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
