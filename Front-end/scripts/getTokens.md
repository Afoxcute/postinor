# How to Get Test Tokens

## Quick Method: Use Dev Accounts

The easiest way is to import a dev account that's already pre-funded:

1. **Install Polkadot.js Extension** (if not already installed)
   - Chrome: https://chrome.google.com/webstore/detail/polkadot%7Bjs%7D-extension/mopnmbcafieddcagagdcbnhejhlodfdd
   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/polkadot-js-extension/

2. **Import Dev Account**
   - Open Polkadot.js Extension
   - Click "+" → "Import account from pre-existing seed"
   - Enter: `//Alice` (or `//Bob`, `//Charlie`, etc.)
   - Name it and import

3. **Connect in App**
   - Refresh your app
   - Click "Connect Wallet"
   - Select the imported dev account

## Dev Account Seeds

All these accounts are pre-funded with tokens:

- `//Alice` - Pre-funded
- `//Bob` - Pre-funded  
- `//Charlie` - Pre-funded
- `//Dave` - Pre-funded
- `//Eve` - Pre-funded
- `//Ferdie` - Pre-funded

## Transfer Tokens to Your Account

If you want to use your own account:

1. **Open Polkadot.js Apps**
   - Go to: https://polkadot.js.org/apps/?rpc=ws://127.0.0.1:38901#/accounts
   - (Update port if your chain uses a different one)

2. **Import Both Accounts**
   - Import a dev account (e.g., `//Alice`) in extension
   - Import your account in extension

3. **Transfer Tokens**
   - In Polkadot.js Apps, go to "Accounts" tab
   - Find Alice's account
   - Click "Send" button
   - Enter your account address
   - Enter amount (e.g., 1000 SLAW)
   - Sign and submit transaction

## Check Balance

You can check your balance in:
- Polkadot.js Apps: https://polkadot.js.org/apps/?rpc=ws://127.0.0.1:38901#/accounts
- Your app's wallet connection (if balance is displayed)

## Token Details

- **Symbol**: SLAW
- **Decimals**: 12
- **Pre-funded Amount**: 1,152,921,504,606,846,976 SLAW per dev account
- **Network**: Local Testnet (para_id: 2000)





