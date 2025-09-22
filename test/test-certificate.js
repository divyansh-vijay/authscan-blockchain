const { ethers } = require('ethers');
const fs = require('fs');

async function testConnection() {
    console.log('🧪 Testing blockchain connection...\n');
    
    try {
        // Test 1: Check if contract-info.json exists
        console.log('📋 Test 1: Checking contract-info.json...');
        if (!fs.existsSync('./contract-info.json')) {
            throw new Error('contract-info.json not found');
        }
        const contractInfo = JSON.parse(fs.readFileSync('./contract-info.json', 'utf8'));
        console.log('✅ Contract info loaded');
        console.log('📍 Contract Address:', contractInfo.address);
        
        // Test 2: Connect to provider
        console.log('\n🌐 Test 2: Connecting to provider...');
        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        console.log('✅ Provider created');
        
        // Test 3: Check network
        console.log('\n📡 Test 3: Getting network info...');
        const network = await provider.getNetwork();
        console.log('✅ Network:', network.name);
        console.log('🔢 Chain ID:', network.chainId);
        
        // Test 4: List accounts
        console.log('\n👥 Test 4: Getting accounts...');
        const accounts = await provider.listAccounts();
        console.log('✅ Found', accounts.length, 'accounts');
        console.log('👤 First account:', accounts[0]);
        
        // Test 5: Create signer
        console.log('\n✍️ Test 5: Creating signer...');
        const signer = await provider.getSigner(accounts[0]);
        const signerAddress = await signer.getAddress();
        console.log('✅ Signer address:', signerAddress);
        
        // Test 6: Get balance
        console.log('\n💰 Test 6: Getting balance...');
        const balance = await provider.getBalance(signerAddress);
        console.log('✅ Balance:', ethers.formatEther(balance), 'ETH');
        
        // Test 7: Connect to contract
        console.log('\n📝 Test 7: Connecting to contract...');
        const contract = new ethers.Contract(
            contractInfo.address, 
            JSON.parse(contractInfo.abi), 
            signer
        );
        console.log('✅ Contract instance created');
        
        // Test 8: Call contract function
        console.log('\n👑 Test 8: Calling contract owner()...');
        const owner = await contract.owner();
        console.log('✅ Contract owner:', owner);
        
        // Test 9: Check if signer is authorized
        console.log('\n🔐 Test 9: Checking if signer is authorized issuer...');
        const isAuthorized = await contract.authorizedIssuers(signerAddress);
        console.log('✅ Is authorized issuer:', isAuthorized);
        
        console.log('\n🎉 ALL TESTS PASSED! Your blockchain connection is working perfectly!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('🔍 Full error:', error);
        
        console.log('\n🛠️ Troubleshooting steps:');
        console.log('1. Make sure Hardhat node is running: npx hardhat node');
        console.log('2. Make sure contract is deployed: npx hardhat run scripts/deploy.js --network localhost');
        console.log('3. Check that both are running in the same project directory');
    }
}

testConnection();