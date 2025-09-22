async function main() {
    console.log("Deploying CertificateVerifier contract...");
    
    const CertificateVerifier = await ethers.getContractFactory("CertificateVerifier");
    const certificateVerifier = await CertificateVerifier.deploy();
    
    // Wait for the contract to be deployed (new syntax for ethers v6)
    await certificateVerifier.waitForDeployment();
    
    // Get the contract address (new syntax for ethers v6)
    const contractAddress = await certificateVerifier.getAddress();
    console.log("✅ CertificateVerifier deployed to:", contractAddress);
    
    // Save contract info for the frontend
    const fs = require('fs');
    const contractInfo = {
        address: contractAddress,
        abi: certificateVerifier.interface.format('json')
    };
    
    fs.writeFileSync('contract-info.json', JSON.stringify(contractInfo, null, 2));
    console.log("📄 Contract info saved to contract-info.json");
    
    // Test the deployment
    const owner = await certificateVerifier.owner();
    console.log("👤 Contract owner:", owner);
    
    console.log("\n🎉 Deployment completed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });