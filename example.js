const CertificateVerifierApp = require('./app');
const CertificateUtils = require('./utils/certificateUtils');
const fs = require('fs');

async function main() {
    console.log('🚀 Starting Certificate Verifier Example...\n');
    
    // Check if contract info exists
    if (!fs.existsSync('./contract-info.json')) {
        console.log('❌ contract-info.json not found!');
        console.log('📝 Please run the following commands first:');
        console.log('   1. npx hardhat node (in Terminal 1)');
        console.log('   2. npx hardhat run scripts/deploy.js --network localhost (in Terminal 2)');
        console.log('   3. Then run this example again');
        process.exit(1);
    }
    
    let contractInfo;
    try {
        contractInfo = JSON.parse(fs.readFileSync('./contract-info.json', 'utf8'));
        console.log('✅ Contract info loaded successfully');
    } catch (error) {
        console.error('❌ Error reading contract-info.json:', error.message);
        process.exit(1);
    }
    
    const app = new CertificateVerifierApp();
    
    // Initialize with deployed contract
    const initialized = await app.initialize(contractInfo.address, JSON.parse(contractInfo.abi));
    
    if (!initialized) {
        console.log('❌ Failed to initialize. Make sure Hardhat node is running!');
        process.exit(1);
    }
    
    // Show contract info
    console.log('\n=== CONTRACT INFO ===');
    const info = await app.getContractInfo();
    if (info) {
        console.log('📋 Contract Owner:', info.contractOwner);
        console.log('👤 Your Address:', info.signerAddress);
        console.log('💰 Your Balance:', info.signerBalance, 'ETH');
        console.log('🌐 Network ID:', info.networkId);
    }
    
    // Create a test certificate
    const certificate = CertificateUtils.createCertificate(
        "John Doe",
        "Blockchain Development Fundamentals",
        "2024-01-15",
        {
            grade: "A+",
            credits: 3,
            instructor: "Prof. Smith"
        }
    );
    
    console.log('\n=== CERTIFICATE CREATED ===');
    CertificateUtils.printCertificate(certificate);
    
    // Issue certificate on blockchain
    console.log('=== ISSUING CERTIFICATE ON BLOCKCHAIN ===');
    const issueResult = await app.issueCertificate(certificate, {
        institution: "Blockchain Academy",
        certificateType: "Course Completion",
        validUntil: "2025-01-15"
    });
    
    if (issueResult.success) {
        console.log('🎉 Certificate issued successfully!');
        console.log('📝 Transaction Hash:', issueResult.transactionHash);
        console.log('📦 Block Number:', issueResult.blockNumber);
        console.log('⛽ Gas Used:', issueResult.gasUsed);
        
        // Wait a moment then verify the certificate
        console.log('\n⏳ Waiting 2 seconds before verification...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n=== VERIFYING CERTIFICATE ===');
        const verifyResult = await app.verifyCertificate(certificate);
        
        if (verifyResult.valid) {
            console.log('🎉 Certificate is VALID and AUTHENTIC! ✅');
            console.log('📅 Issue Date:', verifyResult.issueDate);
            console.log('🏛️ Issued by:', verifyResult.issuer);
            console.log('📋 Metadata:', verifyResult.metadata);
        } else {
            console.log('⚠️ Certificate verification failed! ❌');
            console.log('📝 Reason:', verifyResult.message || verifyResult.error);
        }
        
        // Test with different certificate data (should fail)
        console.log('\n=== TESTING WITH FAKE CERTIFICATE ===');
        const fakeCertificate = CertificateUtils.createCertificate(
            "Jane Doe", // Different name
            "Blockchain Development Fundamentals",
            "2024-01-15"
        );
        
        const fakeVerifyResult = await app.verifyCertificate(fakeCertificate);
        
        if (fakeVerifyResult.valid) {
            console.log('❌ Something is wrong - fake certificate was validated!');
        } else {
            console.log('✅ Good! Fake certificate was rejected as expected');
            console.log('📝 Reason:', fakeVerifyResult.message || fakeVerifyResult.error);
        }
        
    } else {
        console.log('❌ Failed to issue certificate:', issueResult.error);
    }
    
    console.log('\n🎉 Example completed! Check the results above.');
}

// Handle errors gracefully
main().catch((error) => {
    console.error('\n💥 Fatal error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure Hardhat node is running: npx hardhat node');
    console.log('2. Make sure contract is deployed: npx hardhat run scripts/deploy.js --network localhost');
    console.log('3. Check that all files exist in the correct locations');
    process.exit(1);
});