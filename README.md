# BitLuck DApp

BitLuck is a decentralized application (DApp) that enables users to participate in a dual-reward system on the Binance Smart Chain (BSC). Users can earn rewards in **$USD1 tokens** and **BNB**.

## Features
- **Dual Reward System**: Earn rewards in **$USD1** and **BNB**.
- **Referral Program**: Invite others to participate and earn referral bonuses.
- **Referral Statistics**: View your total referrals and BNB earned from them.
- **BSC Network**: This DApp is compatible with the BSC network only.
- **Pool Statistics**: View the current BNB pool and the latest winner with a link to the full history on BscScan.
- **BscScan Link**: Access the contract on BscScan using the new icon next to the contract address.
- **Chart Links**: Quick access to price charts on **Ave.ai**.


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

The **Pool Statistics** section on the page shows the amount of BNB currently in the reward pool and the address of the most recent winner. A **Full History** link opens BscScan with an advanced filter so you can verify every payout.

## Referral Program Details

BitLuck offers a multi-level referral system. When you invite others, you receive a percentage of their deposits based on your level in the hierarchy:

| Level | Reward | Notes |
|-------|-------|------|
| **1** | **10%** | Direct referral bonus |
| **2** | **5%** | Indirect bonus (optional) |
| **3** | **2%** | If you want to incentivize additional invites |

Rewards can be withdrawn immediately after they are credited, or they can be locked for a period to encourage long-term participation.

## Development
Install project dependencies with npm:

```bash
npm install
```
