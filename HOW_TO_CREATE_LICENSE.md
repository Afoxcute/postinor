# How to Create a License Offer & See it in the UI

## Step-by-Step Guide

### Prerequisites
1. **Connect your wallet** - Make sure you have the Polkadot.js extension installed and connected
2. **Have tokens** - You need SLAW tokens to pay for transaction fees (use the faucet at `/faucet` if needed)
3. **Own an NFT** - You need to have minted at least one IP asset (NFT) to license

### Steps to Create a License Offer

#### Step 1: Navigate to the Licensing Page
- Go to `/licensing` in your browser
- Or click "Create License" button from the Manage section

#### Step 2: Start License Creation
- Click the **"Create New License"** button (if no licenses exist)
- Or click **"Renew License"** button (if licenses already exist)
- This will open the License Creation Form

#### Step 3: Fill Out License Creation Form (Step 1)
Fill in the following details:
- **NFT ID**: Enter the ID of the NFT you want to license (must be an NFT you own)
- **License Price**: 
  - Amount: The price in SLAW tokens
  - Currency: Usually "SLAW"
- **Royalty Rate**: Percentage (e.g., 10 for 10%)
- **License Type**: 
  - **Exclusive**: Only one licensee can use it
  - **Non-Exclusive**: Multiple licensees can use it
- **Duration Type**:
  - **Permanent**: License never expires
  - **Custom**: Set a specific duration
- **Payment Type**:
  - **OneTime**: Single payment upfront
  - **Periodic**: Recurring payments (if selected, fill in periodic payment details)

Click **"Next"** to proceed to Step 2.

#### Step 4: Review and Submit (Step 2)
- Review all the information you entered
- Click **"Create License"** or **"Submit"** button
- **Sign the transaction** in your Polkadot.js extension popup
- Wait for the transaction to be finalized (you'll see a success toast)

#### Step 5: View Your License Offer
After the transaction is finalized:
- The page will automatically refresh after 2 seconds
- Your license offer will appear in the list with **"Pending"** status (yellow badge)
- The list shows:
  - **NFT ID**: The NFT being licensed
  - **License Type**: Exclusive or Non-Exclusive
  - **Status**: Pending (until someone accepts) or Active (after acceptance)
  - **License Price**: The payment amount
  - **Royalty Rate**: The royalty percentage
  - **Duration Type**: Permanent or Custom
  - **Payment Type**: OneTime or Periodic

### Understanding License Status

- **Pending** (Yellow badge): Your license offer is waiting for someone to accept it
- **Active** (Green badge): Someone has accepted your offer, and the license contract is now active

### Auto-Refresh
The license list automatically refreshes:
- Every 15 seconds
- When you switch accounts
- After creating a new license (2-second delay)

### Troubleshooting

**Issue: License doesn't appear after creation**
- Wait a few seconds for the transaction to be included in a block
- Check the browser console for any errors
- Make sure the transaction was successful (check the toast notification)
- Click the "Retry" button if there's an error

**Issue: "No account selected" error**
- Make sure your wallet is connected
- Select an account in the Polkadot.js extension
- Refresh the page

**Issue: "NFT not found" or "You don't own this NFT"**
- Make sure you entered the correct NFT ID
- Verify you own the NFT by checking the "My Products" section
- The NFT must exist and be owned by your account

**Issue: Transaction fails**
- Check you have enough tokens for transaction fees
- Make sure the blockchain node is running
- Check the error message in the toast notification

### Quick Access URLs

- **License List**: `/licensing`
- **Create License Directly**: `/licensing?create=true` (opens creation form immediately)
- **Faucet** (Get test tokens): `/faucet`
- **My Products** (View your NFTs): Dashboard → My Products

### Example License Offer

```
NFT ID: 1
License Type: Exclusive
Status: Pending
License Price: 1000 SLAW
Royalty Rate: 10%
Duration Type: Permanent
Payment Type: OneTime
```

This means you're offering an exclusive license for NFT #1 for a one-time payment of 1000 SLAW tokens with a 10% royalty rate, and the license will never expire.




