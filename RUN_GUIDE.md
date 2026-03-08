# Softlaw - Complete Run Guide

This guide will help you run all components of the Softlaw project.

## Project Structure

The project consists of three main components:

1. **Softlaw Chain** - Substrate parachain (Rust)
2. **IP Pallet** - Substrate pallet for IP management (Rust)
3. **Front-end** - Next.js application (TypeScript/React)

---

## Prerequisites

### 1. Install Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### 2. Install Pop CLI
```bash
cargo install --force --locked pop-cli
```

For detailed installation instructions, visit: https://learn.onpop.io/appchains/guides/set-up-your-development-environment

### 3. Install Node.js and Yarn
```bash
# Install Node.js (v18 or higher recommended)
# Then install Yarn
npm install -g yarn
```

---

## Step-by-Step Instructions

### Step 1: Build the Softlaw Chain

Navigate to the chain directory and build it:

```bash
cd /home/afolabi/postinor/softlaw_chain
pop build --release
```

This will compile the Substrate node and runtime. The build process may take 10-30 minutes depending on your system.

**Note:** The built binary will be located at `./target/release/softlaw-node`

### Step 2: Run the Softlaw Chain

Start the parachain network:

```bash
cd /home/afolabi/postinor/softlaw_chain
pop up network network.toml -y
```

The `-y` flag automatically downloads required binaries (polkadot, paseo-chain-spec-generator, etc.) without prompting.

**Note:** The network.toml file has been updated to use `paseo-local` as the relay chain (the chain spec is configured for Paseo). If you encounter issues, Pop CLI will download the necessary binaries automatically.

This will:
- Start a local Paseo relay chain
- Start the Softlaw parachain (para_id: 2000)
- Launch a collator node

**Important:** Keep this terminal window open. The chain must be running for the front-end to connect.

After starting, you should see:
- Relay chain nodes (Alice, Bob)
- Parachain collator
- WebSocket endpoints for connecting

Look for the collator link in the output - you can click it to interact with the chain via Polkadot.js Apps.

**Alternative:** If the network command doesn't work, you can try using the built-in Paseo command and manually register your parachain, but the network.toml approach is recommended.

### Step 3: Set Up Front-end Environment Variables

Create a `.env.local` file in the Front-end directory:

```bash
cd /home/afolabi/postinor/Front-end
```

Create `.env.local` with the following content:

```env
# Chain WebSocket URL (use the local chain when running locally)
# The parachain collator endpoint will be shown in the pop up output
# Example: ws://127.0.0.1:38901 (check your terminal output for the actual port)
NEXT_PUBLIC_CHAIN_WEB_SOCKET=ws://127.0.0.1:38901

# Firebase Configuration (if needed)
# NEXT_PUBLIC_API_KEY=your_firebase_api_key_here
```

**Note:** The WebSocket URL should match the **parachain collator endpoint** from your running chain. Look for the `collator-01` endpoint in the `pop up network` output. The port number (38901 in the example) may vary each time you start the chain.

### Step 4: Install Front-end Dependencies

```bash
cd /home/afolabi/postinor/Front-end
yarn install
```

### Step 5: Run the Front-end Development Server

```bash
cd /home/afolabi/postinor/Front-end
yarn dev
```

The front-end will start on `http://localhost:3000`

---

## Getting Test Tokens

### Quick Method: Use Pre-funded Dev Accounts

Your local testnet has dev accounts that are pre-funded with tokens. To use them:

1. **Install Polkadot.js Extension** (if not already installed)
   - Chrome: https://chrome.google.com/webstore/detail/polkadot%7Bjs%7D-extension/mopnmbcafieddcagagdcbnhejhlodfdd
   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/polkadot-js-extension/

2. **Import a Dev Account**
   - Open Polkadot.js Extension
   - Click "+" → "Import account from pre-existing seed"
   - Enter one of these seeds:
     - `//Alice`
     - `//Bob`
     - `//Charlie`
     - `//Dave`
     - `//Eve`
     - `//Ferdie`
   - Name it and import

3. **Connect in Your App**
   - Refresh your browser
   - Click "Connect Wallet"
   - Select the imported dev account

**Note:** Each dev account is pre-funded with **1,152,921,504,606,846,976 SLAW tokens** (more than enough for testing!)

### Alternative: Transfer Tokens

If you want to use your own account, you can transfer tokens from a dev account:

1. Open Polkadot.js Apps: https://polkadot.js.org/apps/?rpc=ws://127.0.0.1:38901#/accounts
   (Update the port to match your chain's collator endpoint)

2. Import both accounts (dev account + your account) in the extension

3. In Polkadot.js Apps:
   - Go to "Accounts" tab
   - Find a dev account (e.g., Alice)
   - Click "Send"
   - Enter your account address
   - Enter amount and submit

---

## Running Everything Together

### Terminal 1: Run the Chain
```bash
cd /home/afolabi/postinor/softlaw_chain
pop up network network.toml
```

### Terminal 2: Run the Front-end
```bash
cd /home/afolabi/postinor/Front-end
yarn dev
```

---

## Testing the IP Pallet

To run tests for the IP Pallet:

```bash
cd /home/afolabi/postinor/IP_pallet
cargo test
```

This will run all unit tests for the pallet including:
- NFT minting tests
- License offer/acceptance tests
- Purchase contract tests
- Payment schedule tests

---

## Troubleshooting

### Chain Won't Start
- Ensure Pop CLI is installed: `pop --version`
- Check if ports are available (typically 9944, 9945, etc.)
- Try cleaning and rebuilding: `pop build --release`
- If you see "relay chain is unsupported" error:
  - The network.toml has been updated to use `paseo-local`
  - Pop CLI will automatically download required binaries with the `-y` flag
  - Make sure you're using: `pop up network network.toml -y`

### Front-end Can't Connect to Chain
- Verify the chain is running
- Check the WebSocket URL in `.env.local` matches the chain endpoint
- Look at the browser console for connection errors

### Build Errors
- For Rust: `cargo clean && cargo build --release`
- For Front-end: `rm -rf node_modules && yarn install`

### Port Already in Use
- Stop any existing Substrate nodes
- Change ports in `network.toml` if needed

---

## Production Build

### Build Front-end for Production
```bash
cd /home/afolabi/postinor/Front-end
yarn build
yarn start
```

### Build Chain for Production
```bash
cd /home/afolabi/postinor/softlaw_chain
pop build --release
# The binary is at: ./target/release/softlaw-node
```

---

## Additional Resources

- **Pop CLI Documentation**: https://learn.onpop.io/
- **Polkadot SDK Docs**: https://github.com/paritytech/polkadot-sdk
- **Project Rust Docs**: https://warm-dasik-d33c94.netlify.app/
- **Website**: https://soft.law/

---

## Quick Reference Commands

```bash
# Build chain
cd softlaw_chain && pop build --release

# Run chain
cd softlaw_chain && pop up network network.toml

# Install front-end deps
cd Front-end && yarn install

# Run front-end
cd Front-end && yarn dev

# Test pallet
cd IP_pallet && cargo test
```

