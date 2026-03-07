# How to Run the Softlaw Project

This guide will help you run the complete Softlaw project, which consists of:
1. **Softlaw Chain** - A Substrate-based blockchain (parachain)
2. **IP Pallet** - Custom Substrate pallet for IP management
3. **Frontend** - Next.js application

## Prerequisites

Before starting, ensure you have the following installed:

1. **Rust** (latest stable version)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   ```

2. **Pop CLI** - The all-in-one Polkadot development tool
   ```bash
   cargo install --force --locked pop-cli
   ```
   > Detailed installation: https://learn.onpop.io/v/cli/installing-pop-cli

3. **Node.js** (v18 or later) and **Yarn**
   ```bash
   # Install Node.js (if not installed)
   # Then install Yarn
   npm install -g yarn
   ```

## Step 1: Build the Blockchain

Navigate to the project root and build the chain:

```bash
cd /home/afolabi/postinor/softlaw_chain
pop build --release
```

> **Note**: This build process can take 15-30 minutes depending on your system. The `--release` flag creates an optimized build.

## Step 2: Run the Blockchain

Once the build is complete, start the parachain network:

```bash
cd /home/afolabi/postinor/softlaw_chain
pop up parachain -f network.toml
```

This will:
- Start a local Rococo relay chain
- Deploy and start the Softlaw parachain
- Provide you with a collator link to interact with the chain

> **Note**: Keep this terminal running. The chain needs to be running for the frontend to work.

## Step 3: Set Up the Frontend

Open a **new terminal** window and navigate to the frontend directory:

```bash
cd /home/afolabi/postinor/Front-end
```

### Install Dependencies

```bash
yarn install
```

### Configure Environment Variables (if needed)

If you need to connect to a different chain endpoint, create a `.env.local` file:

```bash
# .env.local
NEXT_PUBLIC_CHAIN_WEB_SOCKET=ws://127.0.0.1:9944
```

> **Note**: The default WebSocket URL is `wss://testnet.soft.law/node`. For local development, you may want to use `ws://127.0.0.1:9944` (adjust port based on your local chain).

## Step 4: Run the Frontend

Start the development server:

```bash
cd /home/afolabi/postinor/Front-end
yarn dev
```

The frontend will be available at: **http://localhost:3000**

## Quick Start Summary

Here's the complete sequence in separate terminals:

### Terminal 1: Blockchain
```bash
cd /home/afolabi/postinor/softlaw_chain
pop build --release          # First time only (takes 15-30 min)
pop up parachain -f network.toml
```

### Terminal 2: Frontend
```bash
cd /home/afolabi/postinor/Front-end
yarn install                  # First time only
yarn dev
```

## Troubleshooting

### Blockchain Issues

1. **Build fails**: Make sure you have the latest Rust toolchain:
   ```bash
   rustup update
   ```

2. **Port already in use**: The chain might already be running. Check for existing processes:
   ```bash
   # Kill existing processes if needed
   pkill -f softlaw-node
   ```

3. **Pop CLI not found**: Make sure Pop CLI is installed and in your PATH:
   ```bash
   cargo install --force --locked pop-cli
   ```

### Frontend Issues

1. **Connection errors**: Ensure the blockchain is running and check the WebSocket URL in your environment variables.

2. **Build errors**: Clear the Next.js cache and rebuild:
   ```bash
   cd /home/afolabi/postinor/Front-end
   rm -rf .next
   yarn build
   ```

3. **Dependencies issues**: Clear node_modules and reinstall:
   ```bash
   cd /home/afolabi/postinor/Front-end
   rm -rf node_modules yarn.lock
   yarn install
   ```

## Production Build

### Build Frontend for Production
```bash
cd /home/afolabi/postinor/Front-end
yarn build
yarn start
```

### Run Blockchain in Production Mode
The release build (`pop build --release`) is already optimized for production use.

## Additional Resources

- **Pop CLI Documentation**: https://learn.onpop.io/v/appchains
- **Polkadot SDK Docs**: https://github.com/paritytech/polkadot-sdk
- **Next.js Documentation**: https://nextjs.org/docs

## Project Structure

```
postinor/
├── softlaw_chain/          # Substrate parachain
│   ├── node/              # Node binary
│   ├── runtime/           # Runtime logic
│   └── network.toml       # Network configuration
├── IP_pallet/             # IP management pallet
└── Front-end/             # Next.js frontend
    └── src/
        ├── app/           # Next.js app router
        ├── components/    # React components
        └── utils/         # Utilities (API, etc.)
```

