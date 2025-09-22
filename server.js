const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CertificateVerifierApp = require('./app');
const CertificateUtils = require('./utils/certificateUtils');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Disable cache for static assets to ensure latest UI is served
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
});
app.use(express.static('public', { etag: false, lastModified: false, cacheControl: false, maxAge: 0 }));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Initialize blockchain connection
let blockchainApp;
let contractInfo;

async function initializeBlockchain() {
    try {
        if (!fs.existsSync('./contract-info.json')) {
            throw new Error('Contract not deployed. Run: npx hardhat run scripts/deploy.js --network localhost');
        }

        contractInfo = JSON.parse(fs.readFileSync('./contract-info.json', 'utf8'));
        blockchainApp = new CertificateVerifierApp();

        console.log('🔄 Attempting to connect to blockchain...');
        console.log('📍 Contract Address:', contractInfo.address);

        const success = await blockchainApp.initialize(contractInfo.address, contractInfo.abi);

        if (success) {
            console.log('✅ Blockchain connection established');
            return true;
        } else {
            throw new Error('Failed to connect to blockchain - check app.js initialization');
        }
    } catch (error) {
        console.error('❌ Blockchain initialization failed:', error.message);
        console.error('🔍 Full error:', error);
        console.log('📝 Make sure:');
        console.log('   1. Hardhat node is running: npx hardhat node');
        console.log('   2. Contract is deployed: npx hardhat run scripts/deploy.js --network localhost');
        return false;
    }
}

// Routes

// Home page - serve the simple UI for reliability
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.simple.html'));
});

// Get contract info
app.get('/api/contract-info', async (req, res) => {
    try {
        if (!blockchainApp) {
            return res.status(500).json({ error: 'Blockchain not initialized' });
        }

        const info = await blockchainApp.getContractInfo();
        const payload = {
            success: true,
            contractAddress: String(contractInfo.address),
            contractOwner: info ? String(info.contractOwner) : null,
            signerAddress: info ? String(info.signerAddress) : null,
            signerBalance: info ? String(info.signerBalance) : null,
            networkId: info ? String(info.networkId) : null
        };

        // Ensure no BigInt sneaks into JSON
        res.set('Content-Type', 'application/json');
        res.send(JSON.stringify(payload, (_, value) => typeof value === 'bigint' ? value.toString() : value));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Issue certificate from form data
app.post('/api/issue-certificate', async (req, res) => {
    try {
        if (!blockchainApp) {
            return res.status(500).json({ error: 'Blockchain not initialized' });
        }
        if (!blockchainApp.contract) {
            return res.status(503).json({ error: 'Smart contract not ready. Try again in a moment.' });
        }

        const { studentName, courseName, issueDate, grade, institution } = req.body;

        // Validate required fields
        if (!studentName || !courseName || !issueDate) {
            return res.status(400).json({ error: 'Missing required fields: studentName, courseName, issueDate' });
        }

        // Create certificate object (stable fields only; no timestamp to keep hash consistent)
        const certificate = {
            studentName,
            courseName,
            issueDate,
            grade: grade || 'N/A'
        };

        const metadata = {
            institution: institution || 'Unknown Institution',
            certificateType: 'Course Completion',
            issuedVia: 'Web Interface'
        };

        // Issue on blockchain
        console.log('HTTP issue request:', { certificate, metadata });
        const result = await blockchainApp.issueCertificate(certificate, metadata);

        if (result.success) {
            res.json({
                success: true,
                message: 'Certificate issued successfully!',
                certificateHash: result.hash,
                transactionHash: result.transactionHash,
                blockNumber: result.blockNumber,
                certificate: certificate,
                metadata: metadata
            });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        console.error('Error issuing certificate:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verify certificate from form data
app.post('/api/verify-certificate', async (req, res) => {
    try {
        if (!blockchainApp) {
            return res.status(500).json({ error: 'Blockchain not initialized' });
        }
        if (!blockchainApp.contract) {
            return res.status(503).json({ error: 'Smart contract not ready. Try again in a moment.' });
        }

        const { studentName, courseName, issueDate, grade } = req.body;

        // Create certificate object for verification (match issue fields exactly)
        const certificate = {
            studentName,
            courseName,
            issueDate,
            grade: grade || 'N/A'
        };

        console.log('HTTP verify request:', { certificate });
        const result = await blockchainApp.verifyCertificate(certificate);

        res.json({
            success: true,
            valid: result.valid,
            message: result.valid ? 'Certificate is authentic!' : 'Certificate not found or invalid',
            details: result.valid ? result : null,
            searchedHash: result.hash
        });

    } catch (error) {
        console.error('Error verifying certificate:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload and verify certificate file
app.post('/api/verify-file', upload.single('certificate'), async (req, res) => {
    try {
        if (!blockchainApp) {
            return res.status(500).json({ error: 'Blockchain not initialized' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Generate hash from uploaded file
        const fileHash = CertificateUtils.generateHashFromFile(req.file.path);

        // Check if this hash exists on blockchain
        const exists = await blockchainApp.contract.certificateExists(fileHash);

        if (exists) {
            const [, issuer, timestamp, isRevoked, metadata] = await blockchainApp.contract.verifyCertificate(fileHash);

            res.json({
                success: true,
                valid: !isRevoked,
                message: isRevoked ? 'Certificate is revoked' : 'File certificate is authentic!',
                details: {
                    fileHash,
                    issuer,
                    issueDate: new Date(Number(timestamp) * 1000),
                    metadata: JSON.parse(metadata || '{}'),
                    isRevoked,
                    fileName: req.file.originalname
                }
            });
        } else {
            res.json({
                success: true,
                valid: false,
                message: 'Certificate file not found on blockchain',
                details: { fileHash, fileName: req.file.originalname }
            });
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

    } catch (error) {
        console.error('Error verifying file:', error);

        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ error: error.message });
    }
});

// Get certificate by hash
app.get('/api/certificate/:hash', async (req, res) => {
    try {
        if (!blockchainApp) {
            return res.status(500).json({ error: 'Blockchain not initialized' });
        }

        const hash = req.params.hash;
        const exists = await blockchainApp.contract.certificateExists(hash);

        if (exists) {
            const [, issuer, timestamp, isRevoked, metadata] = await blockchainApp.contract.verifyCertificate(hash);

            res.json({
                success: true,
                certificate: {
                    hash,
                    issuer,
                    issueDate: new Date(Number(timestamp) * 1000),
                    metadata: JSON.parse(metadata || '{}'),
                    isRevoked,
                    valid: !isRevoked
                }
            });
        } else {
            res.status(404).json({ error: 'Certificate not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
async function startServer() {
    const blockchainInitialized = await initializeBlockchain();

    app.listen(PORT, () => {
        console.log('\n🚀 Certificate Verifier Web Server Started!');
        console.log(`📱 Open your browser and go to: http://localhost:${PORT}`);
        console.log(`🔗 Contract Address: ${contractInfo ? contractInfo.address : 'Not loaded'}`);
        console.log(`⛓️  Blockchain Status: ${blockchainInitialized ? '✅ Connected' : '❌ Not Connected'}`);

        if (!blockchainInitialized) {
            console.log('\n⚠️  Warning: Blockchain not connected!');
            console.log('   Please make sure:');
            console.log('   1. Hardhat node is running: npx hardhat node');
            console.log('   2. Contract is deployed: npx hardhat run scripts/deploy.js --network localhost');
            console.log('   3. Restart this server: node server.js');
        }
    });
}

startServer();