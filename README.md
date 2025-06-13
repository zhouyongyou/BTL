# BitLuck DApp

BitLuck is a decentralized application (DApp) that enables users to participate in a dual-reward system on the Binance Smart Chain (BSC). Users can earn rewards in **$USD1 tokens** and **BNB**.

## Features
- **Dual Reward System**: Earn rewards in **$USD1** and **BNB**.
- **Referral Program**: Invite others to participate and earn referral bonuses.
- **BSC Network**: This DApp is compatible with the BSC network only.

## How to Use
1. **Connect Wallet**: Connect your MetaMask or Rabby wallet.
2. **Deposit BNB**: Deposit a minimum of 0.02 BNB to participate in the reward system.
3. **Earn Rewards**: Receive rewards based on your activity and holding duration.
4. **Referral System**: Share your referral link and earn additional rewards.

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

## Building Assets
After installing dependencies run:

```bash
npm run build
```

This copies the Web3, Web3Modal and WalletConnect provider scripts from
`node_modules` into a local `libs` folder so the page can load them without
external CDNs.

## Wallet Setup
- Click **Connect Wallet** in the DApp and select MetaMask or Rabby.
- Deposit at least **0.02 BNB** to start earning rewards.
