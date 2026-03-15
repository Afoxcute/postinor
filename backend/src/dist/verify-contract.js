"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./utils/config");
const viem_1 = require("viem");
// imite IP contract ABI (simplified for IP registration)
const SEAR_ABI = [
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "ipHash",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "metadata",
                "type": "string"
            },
            {
                "internalType": "bool",
                "name": "isEncrypted",
                "type": "bool"
            }
        ],
        "name": "registerIP",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];
async function verifyContract(contractAddress, contractName) {
    console.log(`\n🔍 Checking ${contractName}...`);
    console.log(`📍 Address: ${contractAddress}`);
    try {
        // 1. Check if contract exists
        const bytecode = await config_1.publicClient.getBytecode({
            address: contractAddress,
        });
        if (!bytecode || bytecode === '0x') {
            console.log(`❌ No contract found at ${contractAddress}`);
            return false;
        }
        console.log(`✅ Contract exists (has bytecode)`);
        // 2. Try to encode the function call
        try {
            const functionData = (0, viem_1.encodeFunctionData)({
                abi: SEAR_ABI,
                functionName: 'registerIP',
                args: ['ipfs://test', '{"test":"data"}', false],
            });
            console.log(`✅ Function signature is valid (can be encoded)`);
        }
        catch (encodeError) {
            console.log(`❌ Function encoding failed: ${encodeError.message}`);
            return false;
        }
        // 3. Try to estimate gas (this will fail if function doesn't exist)
        try {
            const gasEstimate = await config_1.publicClient.estimateContractGas({
                address: contractAddress,
                abi: SEAR_ABI,
                functionName: 'registerIP',
                args: ['ipfs://test', '{"test":"data"}', false],
                account: config_1.account.address,
            });
            console.log(`✅ Gas estimation successful: ${gasEstimate.toString()}`);
            console.log(`✅✅✅ CONTRACT HAS registerIP FUNCTION! ✅✅✅`);
            return true;
        }
        catch (gasError) {
            const errorMsg = gasError?.message || gasError?.shortMessage || String(gasError || '');
            if (errorMsg.includes('returned no data') || errorMsg.includes('zero data')) {
                console.log(`❌ Function does NOT exist (returned no data)`);
                return false;
            }
            else if (errorMsg.includes('execution reverted')) {
                console.log(`⚠️ Function exists but reverts (may have access control or validation)`);
                console.log(`   This could mean the function exists but requires specific conditions`);
                return true; // Function exists, just reverting
            }
            else {
                console.log(`❌ Gas estimation failed: ${errorMsg}`);
                return false;
            }
        }
    }
    catch (error) {
        console.log(`❌ Error checking contract: ${error?.message || error}`);
        return false;
    }
}
async function main() {
    console.log('🔍 Verifying Contracts for registerIP Function\n');
    console.log('='.repeat(60));
    const imiteIPAddress = '0xDa5E551070dB21890Be1fa17721DD549D3b6Ed31';
    const hasFunction = await verifyContract(imiteIPAddress, 'ImiteIP');
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 SUMMARY:');
    console.log(`ImiteIP (${imiteIPAddress.substring(0, 10)}...): ${hasFunction ? '✅ HAS registerIP' : '❌ NO registerIP'}`);
    if (hasFunction) {
        console.log('\n💡 ImiteIP contract is ready for use.');
    }
    else {
        console.log('\n⚠️  WARNING: ImiteIP contract does not have registerIP function');
        console.log('   You may need to deploy a new contract');
    }
}
main().catch(console.error);
