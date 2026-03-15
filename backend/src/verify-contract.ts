import { publicClient, account } from './utils/config';
import { Address, encodeFunctionData } from 'viem';

// imite IP contract ABI (simplified for IP registration)
const IP_ABI = [
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
] as const;

async function verifyContract(contractAddress: Address, contractName: string) {
    console.log(`\n🔍 Checking ${contractName}...`);
    console.log(`📍 Address: ${contractAddress}`);
    
    try {
        // 1. Check if contract exists
        const bytecode = await publicClient.getBytecode({
            address: contractAddress,
        });

        if (!bytecode || bytecode === '0x') {
            console.log(`❌ No contract found at ${contractAddress}`);
            return false;
        }

        console.log(`✅ Contract exists (has bytecode)`);

        // 2. Try to encode the function call
        try {
            const functionData = encodeFunctionData({
                abi: IP_ABI,
                functionName: 'registerIP',
                args: ['ipfs://test', '{"test":"data"}', false],
            });
            console.log(`✅ Function signature is valid (can be encoded)`);
        } catch (encodeError: any) {
            console.log(`❌ Function encoding failed: ${encodeError.message}`);
            return false;
        }

        // 3. Try to estimate gas (this will fail if function doesn't exist)
        try {
            const gasEstimate = await publicClient.estimateContractGas({
                address: contractAddress,
                abi: IP_ABI,
                functionName: 'registerIP',
                args: ['ipfs://test', '{"test":"data"}', false],
                account: account.address,
            });
            console.log(`✅ Gas estimation successful: ${gasEstimate.toString()}`);
            console.log(`✅✅✅ CONTRACT HAS registerIP FUNCTION! ✅✅✅`);
            return true;
        } catch (gasError: any) {
            const errorMsg = gasError?.message || gasError?.shortMessage || String(gasError || '');
            if (errorMsg.includes('returned no data') || errorMsg.includes('zero data')) {
                console.log(`❌ Function does NOT exist (returned no data)`);
                return false;
            } else if (errorMsg.includes('execution reverted')) {
                console.log(`⚠️ Function exists but reverts (may have access control or validation)`);
                console.log(`   This could mean the function exists but requires specific conditions`);
                return true; // Function exists, just reverting
            } else {
                console.log(`❌ Gas estimation failed: ${errorMsg}`);
                return false;
            }
        }
    } catch (error: any) {
        console.log(`❌ Error checking contract: ${error?.message || error}`);
        return false;
    }
}

async function main() {
    console.log('🔍 Verifying Contracts for registerIP Function\n');
    console.log('=' .repeat(60));

    const imiteIPAddress = '0xDa5E551070dB21890Be1fa17721DD549D3b6Ed31' as Address;

    const hasFunction = await verifyContract(imiteIPAddress, 'ImiteIP');

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 SUMMARY:');
    console.log(`ImiteIP (${imiteIPAddress.substring(0, 10)}...): ${hasFunction ? '✅ HAS registerIP' : '❌ NO registerIP'}`);
    
    if (hasFunction) {
        console.log('\n💡 ImiteIP contract is ready for use.');
    } else {
        console.log('\n⚠️  WARNING: ImiteIP contract does not have registerIP function');
        console.log('   You may need to deploy a new contract');
    }
}

main().catch(console.error);


