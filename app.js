const { ethers } = require('ethers');
const CertificateUtils = require('./utils/certificateUtils');

class CertificateVerifierApp {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
    }
    
    async initialize(contractAddress, contractABI) {
        try {
            console.log('🔄 Initializing blockchain connection...');
            
            // Connect to local Hardhat network (ethers v6 syntax)
            this.provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
            
            console.log('🌐 Connected to provider');
            
            // Test the connection first
            const network = await this.provider.getNetwork();
            console.log('📡 Network:', network.name, 'Chain ID:', network.chainId);
            
            // Get signer for account index 0 (ethers v6 + Hardhat)
            const accounts = await this.provider.listAccounts();
            console.log('👥 Found', accounts.length, 'accounts');
            if (accounts.length === 0) {
                throw new Error('No accounts found. Make sure Hardhat node is running.');
            }
            
            this.signer = await this.provider.getSigner(0);
            console.log('👤 Using signer:', await this.signer.getAddress());
            
            // Connect to contract
            this.contract = new ethers.Contract(contractAddress, contractABI, this.signer);
            console.log('📝 Contract connected');
            
            // Test contract connection by calling a view function
            const owner = await this.contract.owner();
            console.log('👑 Contract owner:', owner);
            
            console.log('✅ Blockchain initialization successful');
            return true;
        } catch (error) {
            console.error('❌ Blockchain initialization error:', error.message);
            console.error('🔍 Full error:', error);
            return false;
        }
    }
    
    async issueCertificate(certificateData, metadata = {}) {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }
            const hash = CertificateUtils.generateHash(certificateData);
            const metadataString = JSON.stringify(metadata);
            
            console.log('📝 Issuing certificate...');
            console.log('🔐 Hash:', hash);
            
            let tx;
            if (this.contract.estimateGas && this.contract.estimateGas.issueCertificate) {
                // Estimate gas if available
                const gasEstimate = await this.contract.estimateGas.issueCertificate(hash, metadataString);
                console.log('⛽ Estimated gas:', gasEstimate.toString());
                const gasLimit = (gasEstimate * 120n) / 100n;
                tx = await this.contract.issueCertificate(hash, metadataString, { gasLimit });
            } else {
                console.log('⛽ estimateGas unavailable; sending tx without manual gasLimit');
                tx = await this.contract.issueCertificate(hash, metadataString);
            }
            
            console.log('⏳ Transaction sent:', tx.hash);
            
            const receipt = await tx.wait();
            console.log('✅ Certificate issued! Block:', receipt.blockNumber);
            
            return { 
                success: true, 
                hash, 
                transactionHash: tx.hash,
                blockNumber: Number(receipt.blockNumber),
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            console.error('❌ Error issuing certificate:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    async verifyCertificate(certificateData) {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }
            const hash = CertificateUtils.generateHash(certificateData);
            console.log('🔍 Verifying certificate with hash:', hash);
            
            const [exists, issuer, timestamp, isRevoked, metadata] = await this.contract.verifyCertificate(hash);
            
            if (exists) {
                const result = {
                    valid: !isRevoked,
                    exists: exists,
                    issuer: issuer,
                    issueDate: new Date(Number(timestamp) * 1000), // Updated for ethers v6
                    metadata: JSON.parse(metadata || '{}'),
                    isRevoked: isRevoked,
                    hash: hash
                };
                
                console.log('✅ Certificate found!');
                console.log('📊 Details:', result);
                return result;
            } else {
                console.log('❌ Certificate not found on blockchain');
                return { valid: false, message: 'Certificate not found', hash };
            }
        } catch (error) {
            console.error('❌ Error verifying certificate:', error.message);
            return { valid: false, error: error.message };
        }
    }
    
    async revokeCertificate(certificateData) {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }
            const hash = CertificateUtils.generateHash(certificateData);
            console.log('🚫 Revoking certificate with hash:', hash);
            
            const tx = await this.contract.revokeCertificate(hash);
            console.log('⏳ Revocation transaction sent:', tx.hash);
            
            const receipt = await tx.wait();
            console.log('✅ Certificate revoked! Block:', receipt.blockNumber);
            
            return { 
                success: true, 
                hash,
                transactionHash: tx.hash,
                blockNumber: Number(receipt.blockNumber)
            };
        } catch (error) {
            console.error('❌ Error revoking certificate:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    async getContractInfo() {
        try {
            const owner = await this.contract.owner();
            const signerAddress = await this.signer.getAddress();
            const balance = await this.provider.getBalance(signerAddress);
            
            const network = await this.provider.getNetwork();
            return {
                contractOwner: owner,
                signerAddress: signerAddress,
                signerBalance: ethers.formatEther(balance), // Updated for ethers v6
                networkId: network.chainId.toString()
            };
        } catch (error) {
            console.error('❌ Error getting contract info:', error.message);
            return null;
        }
    }
}

module.exports = CertificateVerifierApp;