# BitLuck DApp

BitLuck is a decentralized application (DApp) that enables users to participate in a dual-reward system on the Binance Smart Chain (BSC). Users can earn rewards in **$USD1 tokens** and **BNB**.

## Features
- **Dual Reward System**: Earn rewards in **$USD1** and **BNB**.
- **Referral Program**: Invite others to participate and earn referral bonuses.
- **Referral Statistics**: View your total referrals and BNB earned from them.
- **BSC Network**: This DApp is compatible with the BSC network only.
- **Pool Statistics**: View the current BNB pool and the latest winner with a link to the full history on BscScan.
- **BscScan Link**: Access the contract on BscScan using the new icon next to the contract address.
- **Leaderboard**: View top referrers on `leaderboard.html`.


## How to Use
1. **Connect Wallet**: Connect your MetaMask or Rabby wallet.
2. **Deposit BTL**: Deposit your BTL tokens to participate in the reward system.
3. **Earn Rewards**: Receive rewards based on your activity and holding duration.
4. **Referral System**: Share your referral link and earn additional rewards. The DApp now displays how many users you referred and the BNB earned from referrals.

## Installation
Clone the repository:

```bash
git clone https://github.com/yourusername/BitLuck-DApp.git
cd BitLuck-DApp
```

## Serving the DApp
Use any static server to view `index.html`. A quick option is Python's built-in server:

```bash
python3 -m http.server
```

Visit [http://localhost:8000/index.html](http://localhost:8000/index.html) in your browser.

## Wallet Setup
- Click **Connect Wallet** in the DApp and select MetaMask or Rabby.
- Deposit BTL tokens to start earning rewards.

## Deposit & Withdrawal Rules
- The minimum amount you can deposit is **0.01 BNB**.
- Both deposits and withdrawals have a **24‑hour cooldown**. You must wait at
  least one day between each action.

The **Pool Statistics** section on the page shows the amount of BNB currently in the reward pool and the address of the most recent winner. A **Full History** link opens BscScan with an advanced filter so you can verify every payout.

## Development
Install project dependencies with npm:

```bash
npm install
```

## Additional Documentation
- [Top Referrer Leaderboard Design](docs/top_referrer_design.md)

## Listening for RoastPad Deposits
A Node.js script `listenDeposits.js` captures `Deposit` events from the RoastPad contract and stores them in MongoDB.

### Setup
1. Define these environment variables:
   - `RPC_URL` – RPC endpoint for the chain.
   - `CONTRACT_ADDRESS` – RoastPad contract address.
   - `MONGO_URI` – MongoDB connection string.
2. Install dependencies with `npm install`.
3. Start the listener using:

```bash
npm run listen-deposits
```

Deposits are saved in the `deposits` collection and each referrer’s totals are kept in `leaderboard`.
