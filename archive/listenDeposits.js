require('dotenv').config();
const { ethers } = require('ethers');
const { MongoClient } = require('mongodb');
const roastPadAbi = require('./RoastPad.json');

const RPC_URL = process.env.RPC_URL || 'https://mainnet.infura.io/v3/YOUR_KEY';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const MONGO_URI = process.env.MONGO_URI;

if (!CONTRACT_ADDRESS) {
  console.error('Missing CONTRACT_ADDRESS environment variable');
  process.exit(1);
}
if (!MONGO_URI) {
  console.error('Missing MONGO_URI environment variable');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, roastPadAbi, provider);

const client = new MongoClient(MONGO_URI);

async function main() {
  await client.connect();
  const db = client.db();
  const depositsCol = db.collection('deposits');
  const leaderboardCol = db.collection('leaderboard');

  contract.on('Deposit', async (user, amount, event) => {
    try {
      const userInfo = await contract.users(user);
      const referrer = userInfo.referrer;
      const amountEth = Number(ethers.formatEther(amount));
      const doc = {
        user,
        referrer,
        amount: amountEth,
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: Date.now()
      };
      await depositsCol.insertOne(doc);
      await leaderboardCol.updateOne(
        { referrer },
        { $inc: { totalAmount: amountEth, depositCount: 1 } },
        { upsert: true }
      );
      console.log('New deposit:', doc);
    } catch (err) {
      console.error('Failed to process deposit event', err);
    }
  });

  console.log('Listening for Deposit events...');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
