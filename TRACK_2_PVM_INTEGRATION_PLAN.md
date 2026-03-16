# Track 2 - PVM Smart Contract Integration Plan

## Overview
This document outlines how to adapt Softlaw (IP Asset Management System) for **Track 2 - PVM Smart Contract**, focusing on:
1. **PVM-experiments**: Call Rust or C++ libraries from Solidity
2. **Applications using Polkadot native Assets**: Use `pallet-assets` for multi-asset support
3. **Accessing Polkadot native functionality**: Build precompiles to expose IP pallet to Solidity

---

## Current Architecture Analysis

### What We Have:
- ✅ Custom Substrate pallet (`IP_pallet`) for NFT minting, licensing, and purchase contracts
- ✅ Native balance transfers using `pallet_balances`
- ✅ Frontend using Polkadot.js API for direct pallet calls
- ✅ Payment system with one-time and periodic payments

### What We Need for Track 2:
- 🔄 Solidity smart contracts that interact with IP pallet
- 🔄 Precompiles to bridge Solidity ↔ Rust pallet
- 🔄 Multi-asset support using `pallet-assets`
- 🔄 Solidity contracts calling Rust libraries for complex operations

---

## Implementation Strategy

### Phase 1: Enable PVM in Runtime

#### 1.1 Add Frontier EVM Support
```rust
// In softlaw_chain/runtime/Cargo.toml
[dependencies]
pallet-evm = { version = "4.0", default-features = false }
pallet-ethereum = { version = "4.0", default-features = false }
fp-evm = { version = "4.0", default-features = false }
fp-rpc = { version = "4.0", default-features = false }
```

#### 1.2 Configure EVM in Runtime
```rust
// In softlaw_chain/runtime/src/lib.rs
impl pallet_evm::Config for Runtime {
    type FeeCalculator = FixedGasPrice;
    type GasWeightMapping = ();
    type WeightPerGas = ();
    type CallOrigin = EnsureAddressRoot<AccountId>;
    type WithdrawOrigin = EnsureAddressNever<AccountId>;
    type AddressMapping = HashedAddressMapping<BlakeTwo256>;
    type Currency = Balances;
    type Event = RuntimeEvent;
    type Runner = pallet_evm::runner::stack::Runner<Self>;
    type Precompiles = ();
    type ChainId = ();
    type BlockGasLimit = ();
    type BlockHashMapping = SubstrateBlockHashMapping<Self>;
    type FindAuthor = ();
    type OnCreate = ();
    type OnChargeTransaction = ();
    type WeightInfo = ();
}
```

---

### Phase 2: Create IP Pallet Precompiles

#### 2.1 Create Precompile Module
**File**: `softlaw_chain/runtime/src/precompiles/ip_pallet_precompile.rs`

```rust
use fp_evm::{Precompile, PrecompileResult, PrecompileHandle};
use sp_core::{H160, U256};
use sp_std::marker::PhantomData;
use frame_support::traits::Get;

/// Precompile address for IP Pallet operations
/// Use a reserved address range (e.g., 0x0000000000000000000000000000000000000800)
pub const IP_PALLET_PRECOMPILE_ADDRESS: H160 = H160([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x08, 0x00,
]);

/// Precompile for IP Pallet operations
pub struct IPPalletPrecompile<Runtime>(PhantomData<Runtime>);

impl<Runtime> Precompile for IPPalletPrecompile<Runtime>
where
    Runtime: pallet_ip_pallet::Config + frame_system::Config,
    Runtime::AccountId: From<H160>,
{
    fn execute(handle: &mut impl PrecompileHandle) -> PrecompileResult {
        let selector = handle.read_selector()?;
        
        match selector {
            // Function selectors (first 4 bytes of keccak256 hash)
            0x12345678 => Self::mint_nft(handle),      // mintNFT(address, string, string, string, string)
            0x23456789 => Self::offer_license(handle), // offerLicense(uint32, uint256, ...)
            0x34567890 => Self::accept_license(handle),// acceptLicense(uint32)
            0x45678901 => Self::offer_purchase(handle),// offerPurchase(uint32, uint256, ...)
            0x56789012 => Self::accept_purchase(handle),// acceptPurchase(uint32)
            0x67890123 => Self::make_payment(handle),  // makePeriodicPayment(uint32)
            0x78901234 => Self::get_nft_info(handle),  // getNFTInfo(uint32)
            0x89012345 => Self::get_contract_info(handle),// getContractInfo(uint32)
            _ => Err(PrecompileError::UnknownSelector),
        }
    }
    
    // Implementation of each function
    fn mint_nft(handle: &mut impl PrecompileHandle) -> PrecompileResult {
        // Decode input: address owner, string name, string description, string filingDate, string jurisdiction
        // Call: pallet_ip_pallet::Pallet::<Runtime>::mint_nft(...)
        // Return: NFT ID
    }
    
    fn offer_license(handle: &mut impl PrecompileHandle) -> PrecompileResult {
        // Decode input: uint32 nftId, uint256 amount, uint8 paymentType, ...
        // Call: pallet_ip_pallet::Pallet::<Runtime>::offer_license(...)
        // Return: Offer ID
    }
    
    // ... other function implementations
}
```

#### 2.2 Register Precompile in Runtime
```rust
// In softlaw_chain/runtime/src/lib.rs
pub type Precompiles = (
    // Add your precompile here
    ip_pallet_precompile::IPPalletPrecompile<Runtime>,
);

impl pallet_evm::Config for Runtime {
    // ... other config
    type Precompiles = Precompiles;
}
```

---

### Phase 3: Solidity Smart Contracts

#### 3.1 IP Asset Manager Contract
**File**: `contracts/IPAssetManager.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IPAssetManager
 * @notice Solidity interface to IP Pallet via precompiles
 * @dev Calls Rust pallet functions from Solidity
 */
contract IPAssetManager {
    // Precompile address
    address constant IP_PALLET_PRECOMPILE = 0x0000000000000000000000000000000000000800;
    
    // Events
    event NFTMinted(uint32 indexed nftId, address indexed owner, string name);
    event LicenseOffered(uint32 indexed offerId, uint32 indexed nftId, uint256 amount);
    event LicenseAccepted(uint32 indexed contractId, uint32 indexed offerId);
    event PurchaseOffered(uint32 indexed offerId, uint32 indexed nftId, uint256 amount);
    event PurchaseAccepted(uint32 indexed contractId, uint32 indexed offerId);
    event PaymentMade(uint32 indexed contractId, uint256 amount);
    
    /**
     * @notice Mint a new IP NFT
     * @dev Calls Rust pallet's mint_nft function via precompile
     * @param name IP asset name
     * @param description IP asset description
     * @param filingDate Filing date string
     * @param jurisdiction Jurisdiction code
     * @return nftId The minted NFT ID
     */
    function mintNFT(
        string memory name,
        string memory description,
        string memory filingDate,
        string memory jurisdiction
    ) external returns (uint32 nftId) {
        bytes memory data = abi.encodeWithSelector(
            0x12345678, // mintNFT selector
            msg.sender,
            name,
            description,
            filingDate,
            jurisdiction
        );
        
        (bool success, bytes memory result) = IP_PALLET_PRECOMPILE.call(data);
        require(success, "IP Pallet: mintNFT failed");
        
        nftId = abi.decode(result, (uint32));
        emit NFTMinted(nftId, msg.sender, name);
        return nftId;
    }
    
    /**
     * @notice Offer an IP asset for licensing
     * @dev Calls Rust pallet's offer_license function via precompile
     * @param nftId The NFT ID to license
     * @param amount Payment amount (one-time) or amount per payment (periodic)
     * @param paymentType 0 = OneTime, 1 = Periodic
     * @param totalPayments Number of payments (if periodic)
     * @param frequency Blocks between payments (if periodic)
     * @param royaltyRate Royalty rate in basis points (e.g., 500 = 5%)
     * @return offerId The created offer ID
     */
    function offerLicense(
        uint32 nftId,
        uint256 amount,
        uint8 paymentType,
        uint32 totalPayments,
        uint32 frequency,
        uint16 royaltyRate
    ) external returns (uint32 offerId) {
        bytes memory data = abi.encodeWithSelector(
            0x23456789, // offerLicense selector
            nftId,
            amount,
            paymentType,
            totalPayments,
            frequency,
            royaltyRate
        );
        
        (bool success, bytes memory result) = IP_PALLET_PRECOMPILE.call(data);
        require(success, "IP Pallet: offerLicense failed");
        
        offerId = abi.decode(result, (uint32));
        emit LicenseOffered(offerId, nftId, amount);
        return offerId;
    }
    
    /**
     * @notice Accept a license offer
     * @param offerId The offer ID to accept
     * @return contractId The created contract ID
     */
    function acceptLicense(uint32 offerId) external returns (uint32 contractId) {
        bytes memory data = abi.encodeWithSelector(
            0x34567890, // acceptLicense selector
            offerId
        );
        
        (bool success, bytes memory result) = IP_PALLET_PRECOMPILE.call(data);
        require(success, "IP Pallet: acceptLicense failed");
        
        contractId = abi.decode(result, (uint32));
        emit LicenseAccepted(contractId, offerId);
        return contractId;
    }
    
    /**
     * @notice Make a periodic payment for a contract
     * @param contractId The contract ID
     */
    function makePeriodicPayment(uint32 contractId) external {
        bytes memory data = abi.encodeWithSelector(
            0x67890123, // makePeriodicPayment selector
            contractId
        );
        
        (bool success, bytes memory result) = IP_PALLET_PRECOMPILE.call(data);
        require(success, "IP Pallet: makePeriodicPayment failed");
        
        uint256 amount = abi.decode(result, (uint256));
        emit PaymentMade(contractId, amount);
    }
    
    /**
     * @notice Get NFT information
     * @param nftId The NFT ID
     * @return owner The owner address
     * @return name The NFT name
     * @return description The NFT description
     */
    function getNFTInfo(uint32 nftId) external view returns (
        address owner,
        string memory name,
        string memory description
    ) {
        bytes memory data = abi.encodeWithSelector(
            0x78901234, // getNFTInfo selector
            nftId
        );
        
        (bool success, bytes memory result) = IP_PALLET_PRECOMPILE.staticcall(data);
        require(success, "IP Pallet: getNFTInfo failed");
        
        return abi.decode(result, (address, string, string));
    }
}
```

#### 3.2 Advanced Contract: Multi-Asset License Marketplace
**File**: `contracts/MultiAssetLicenseMarketplace.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MultiAssetLicenseMarketplace
 * @notice Marketplace supporting multiple Polkadot native assets for IP licensing
 * @dev Uses pallet-assets precompile for multi-asset payments
 */
contract MultiAssetLicenseMarketplace {
    // Native Assets precompile (pallet-assets)
    address constant NATIVE_ASSETS_PRECOMPILE = 0x0000000000000000000000000000000000000801;
    
    // IP Pallet precompile
    address constant IP_PALLET_PRECOMPILE = 0x0000000000000000000000000000000000000800;
    
    // Asset ID mapping: token symbol => asset ID
    mapping(string => uint32) public assetIds;
    
    // License offers with asset support
    struct AssetLicenseOffer {
        uint32 nftId;
        uint32 assetId;        // Polkadot native asset ID
        uint256 amount;
        uint8 paymentType;
        uint32 totalPayments;
        uint32 frequency;
        uint16 royaltyRate;
        address licensor;
        bool active;
    }
    
    mapping(uint32 => AssetLicenseOffer) public offers;
    uint32 public nextOfferId;
    
    event MultiAssetLicenseOffered(
        uint32 indexed offerId,
        uint32 indexed nftId,
        uint32 assetId,
        uint256 amount,
        address indexed licensor
    );
    
    /**
     * @notice Register a Polkadot native asset for use in marketplace
     * @param assetId The asset ID from pallet-assets
     * @param symbol The asset symbol (e.g., "USDT", "DOT")
     */
    function registerAsset(uint32 assetId, string memory symbol) external {
        assetIds[symbol] = assetId;
    }
    
    /**
     * @notice Offer license with a specific native asset
     * @param nftId The NFT ID
     * @param assetSymbol The asset symbol (must be registered)
     * @param amount Payment amount
     * @param paymentType 0 = OneTime, 1 = Periodic
     * @param totalPayments Number of payments
     * @param frequency Blocks between payments
     * @param royaltyRate Royalty rate in basis points
     * @return offerId The created offer ID
     */
    function offerLicenseWithAsset(
        uint32 nftId,
        string memory assetSymbol,
        uint256 amount,
        uint8 paymentType,
        uint32 totalPayments,
        uint32 frequency,
        uint16 royaltyRate
    ) external returns (uint32 offerId) {
        uint32 assetId = assetIds[assetSymbol];
        require(assetId > 0, "Asset not registered");
        
        offerId = nextOfferId++;
        offers[offerId] = AssetLicenseOffer({
            nftId: nftId,
            assetId: assetId,
            amount: amount,
            paymentType: paymentType,
            totalPayments: totalPayments,
            frequency: frequency,
            royaltyRate: royaltyRate,
            licensor: msg.sender,
            active: true
        });
        
        emit MultiAssetLicenseOffered(offerId, nftId, assetId, amount, msg.sender);
        return offerId;
    }
    
    /**
     * @notice Accept license offer and pay with native asset
     * @param offerId The offer ID
     * @dev Transfers native asset from buyer to licensor, then creates license contract
     */
    function acceptLicenseWithAsset(uint32 offerId) external {
        AssetLicenseOffer memory offer = offers[offerId];
        require(offer.active, "Offer not active");
        
        // Transfer native asset from buyer to licensor
        bytes memory transferData = abi.encodeWithSelector(
            0x9d9b5a3a, // transfer selector for pallet-assets
            offer.assetId,
            offer.licensor,
            offer.amount
        );
        
        (bool success, ) = NATIVE_ASSETS_PRECOMPILE.call(transferData);
        require(success, "Native asset transfer failed");
        
        // Create license contract via IP pallet precompile
        // (Implementation depends on precompile interface)
        
        offers[offerId].active = false;
    }
}
```

---

### Phase 4: Integrate Polkadot Native Assets

#### 4.1 Update Runtime to Use pallet-assets
```rust
// In softlaw_chain/runtime/src/lib.rs

// Already have pallet-assets configured, but need to ensure it's used for payments
impl pallet_assets::Config<TrustBackedAssets> for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type Balance = Balance;
    type AssetId = u32;
    type Currency = Balances;
    type CreateOrigin = AsEnsureOriginWithArg<EnsureSigned<AccountId>>;
    type ForceOrigin = AssetsForceOrigin;
    type AssetDeposit = AssetDeposit;
    type AssetAccountDeposit = AssetAccountDeposit;
    type MetadataDepositBase = MetadataDepositBase;
    type MetadataDepositPerByte = MetadataDepositPerByte;
    type ApprovalDeposit = ApprovalDeposit;
    type StringLimit = AssetsStringLimit;
    type Freezer = ();
    type Extra = ();
    type CallbackHandle = ();
    type WeightInfo = pallet_assets::weights::SubstrateWeight<Runtime>;
}
```

#### 4.2 Create Native Assets Precompile
**File**: `softlaw_chain/runtime/src/precompiles/native_assets_precompile.rs`

```rust
use fp_evm::{Precompile, PrecompileResult, PrecompileHandle};
use sp_core::H160;

pub const NATIVE_ASSETS_PRECOMPILE_ADDRESS: H160 = H160([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x08, 0x01,
]);

pub struct NativeAssetsPrecompile<Runtime>(PhantomData<Runtime>);

impl<Runtime> Precompile for NativeAssetsPrecompile<Runtime>
where
    Runtime: pallet_assets::Config<TrustBackedAssets> + frame_system::Config,
{
    fn execute(handle: &mut impl PrecompileHandle) -> PrecompileResult {
        let selector = handle.read_selector()?;
        
        match selector {
            0x9d9b5a3a => Self::transfer(handle),      // transfer(uint32 assetId, address to, uint256 amount)
            0x8b8b8b8b => Self::balance_of(handle),    // balanceOf(uint32 assetId, address account)
            0x7c7c7c7c => Self::create_asset(handle),  // createAsset(string symbol, uint8 decimals)
            _ => Err(PrecompileError::UnknownSelector),
        }
    }
    
    fn transfer(handle: &mut impl PrecompileHandle) -> PrecompileResult {
        // Decode: assetId, to, amount
        // Call: pallet_assets::Pallet::<Runtime, TrustBackedAssets>::transfer(...)
    }
    
    // ... other implementations
}
```

---

### Phase 5: Call Rust Libraries from Solidity (PVM Experiments)

#### 5.1 Create Rust Library with FFI
**File**: `softlaw_chain/runtime/src/libraries/ip_calculations.rs`

```rust
use sp_std::prelude::*;

/// Calculate royalty amount from payment
/// This Rust function can be called from Solidity via precompile
#[no_mangle]
pub extern "C" fn calculate_royalty(
    payment_amount: u128,
    royalty_rate_bps: u16, // basis points (e.g., 500 = 5%)
) -> u128 {
    let royalty_rate = royalty_rate_bps as u128;
    (payment_amount * royalty_rate) / 10_000
}

/// Calculate penalty for missed payment
#[no_mangle]
pub extern "C" fn calculate_penalty(
    missed_payments: u32,
    base_amount: u128,
) -> u128 {
    // 20% penalty per missed payment
    let penalty_rate = 20u128; // 20%
    (base_amount * penalty_rate * missed_payments as u128) / 100
}

/// Verify IP asset metadata hash
#[no_mangle]
pub extern "C" fn verify_metadata_hash(
    metadata: *const u8,
    metadata_len: u32,
    expected_hash: *const u8,
) -> bool {
    // Implementation using sp_core::hashing
    // This demonstrates calling Rust crypto libraries from Solidity
    true
}
```

#### 5.2 Expose Library Functions via Precompile
```rust
// In ip_pallet_precompile.rs

fn calculate_royalty(handle: &mut impl PrecompileHandle) -> PrecompileResult {
    // Decode input: uint256 paymentAmount, uint16 royaltyRateBps
    // Call Rust library function
    let payment_amount = handle.read_u256()?;
    let royalty_rate = handle.read_u16()?;
    
    let royalty = ip_calculations::calculate_royalty(
        payment_amount.as_u128(),
        royalty_rate
    );
    
    // Return royalty amount
    handle.write_u256(U256::from(royalty))
}
```

#### 5.3 Solidity Contract Using Rust Library
```solidity
contract RoyaltyCalculator {
    address constant IP_PALLET_PRECOMPILE = 0x0000000000000000000000000000000000000800;
    
    /**
     * @notice Calculate royalty using Rust library function
     * @param paymentAmount The payment amount
     * @param royaltyRateBps Royalty rate in basis points
     * @return royalty The calculated royalty amount
     */
    function calculateRoyalty(
        uint256 paymentAmount,
        uint16 royaltyRateBps
    ) external view returns (uint256 royalty) {
        bytes memory data = abi.encodeWithSelector(
            0xaaaaaaaa, // calculateRoyalty selector
            paymentAmount,
            royaltyRateBps
        );
        
        (bool success, bytes memory result) = IP_PALLET_PRECOMPILE.staticcall(data);
        require(success, "Royalty calculation failed");
        
        return abi.decode(result, (uint256));
    }
}
```

---

## Implementation Roadmap

### Week 1: Foundation
- [ ] Add Frontier EVM dependencies to runtime
- [ ] Configure `pallet-evm` in runtime
- [ ] Test basic Solidity contract deployment

### Week 2: Precompiles
- [ ] Create IP Pallet precompile module
- [ ] Implement `mintNFT`, `offerLicense`, `acceptLicense` functions
- [ ] Test precompile calls from Solidity

### Week 3: Solidity Contracts
- [ ] Deploy `IPAssetManager.sol`
- [ ] Create frontend integration for Solidity contracts
- [ ] Test end-to-end flow: Solidity → Precompile → Pallet

### Week 4: Native Assets
- [ ] Create Native Assets precompile
- [ ] Deploy `MultiAssetLicenseMarketplace.sol`
- [ ] Test multi-asset license payments

### Week 5: PVM Experiments
- [ ] Create Rust library with FFI functions
- [ ] Expose library functions via precompile
- [ ] Test Solidity calling Rust libraries

### Week 6: Testing & Documentation
- [ ] Comprehensive testing
- [ ] Write documentation
- [ ] Create demo video

---

## Key Benefits for Track 2

### 1. PVM Experiments ✅
- **Screenshot**: Solidity contract calling Rust `calculate_royalty` function
- **Demo**: Show Solidity → Precompile → Rust library → Return value

### 2. Polkadot Native Assets ✅
- **Screenshot**: License offer created with USDT (native asset) instead of native token
- **Demo**: Create license, accept with USDT, verify payment in pallet-assets

### 3. Precompiles ✅
- **Screenshot**: Solidity contract interacting with IP pallet via precompile
- **Demo**: Full flow: Solidity → Precompile → IP Pallet → Event emission

---

## Technical Highlights

1. **Hybrid Architecture**: Solidity smart contracts + Rust pallets
2. **Multi-Asset Support**: Use any Polkadot native asset for payments
3. **Performance**: Rust libraries for complex calculations (royalty, penalties)
4. **Developer Experience**: Familiar Solidity interface with Rust backend power
5. **Interoperability**: Bridge between EVM ecosystem and Substrate native features

---

## Files to Create/Modify

### New Files:
- `softlaw_chain/runtime/src/precompiles/ip_pallet_precompile.rs`
- `softlaw_chain/runtime/src/precompiles/native_assets_precompile.rs`
- `softlaw_chain/runtime/src/libraries/ip_calculations.rs`
- `contracts/IPAssetManager.sol`
- `contracts/MultiAssetLicenseMarketplace.sol`
- `contracts/RoyaltyCalculator.sol`

### Modified Files:
- `softlaw_chain/runtime/Cargo.toml` (add Frontier dependencies)
- `softlaw_chain/runtime/src/lib.rs` (configure EVM, register precompiles)
- `Front-end/src/components/...` (add Solidity contract interaction)

---

## Next Steps

1. **Review this plan** and adjust based on your priorities
2. **Start with Phase 1** (EVM integration) - this is the foundation
3. **Create a proof-of-concept** precompile for one function (e.g., `mintNFT`)
4. **Test the flow** end-to-end before building all features
5. **Document as you go** - screenshots and demos for Track 2 submission

---

## Questions to Consider

1. **Which functions are most important** to expose via precompile first?
2. **Do you want to support both** Solidity contracts AND direct pallet calls?
3. **What native assets** do you want to support initially? (USDT, DOT, etc.)
4. **Which Rust libraries** would be most valuable to call from Solidity?

---

## Resources

- [Frontier EVM Documentation](https://docs.frontier.xyz/)
- [Substrate Precompiles Guide](https://docs.substrate.io/reference/precompiles/)
- [Polkadot Native Assets](https://docs.substrate.io/reference/how-to-guides/pallet-design/implement-assets/)
- [PVM Track 2 Requirements](https://polkadot.network/blog/polkadot-virtual-machine-pvm-track-2/)

