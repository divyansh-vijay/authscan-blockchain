const crypto = require('crypto');
const fs = require('fs');

class CertificateUtils {
    // Generate hash from certificate data
    static generateHash(data) {
        if (typeof data === 'object') {
            data = JSON.stringify(data);
        }
        return crypto.createHash('sha256').update(data).digest('hex');
    }
    
    // Generate hash from file
    static generateHashFromFile(filePath) {
        const fileBuffer = fs.readFileSync(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    }
    
    // Create certificate object
    static createCertificate(studentName, courseName, issueDate, additionalData = {}) {
        return {
            studentName,
            courseName,
            issueDate,
            ...additionalData,
            timestamp: Date.now()
        };
    }
    
    // Pretty print certificate
    static printCertificate(cert) {
        console.log('\n📜 CERTIFICATE DETAILS:');
        console.log('========================');
        Object.entries(cert).forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
        });
        console.log('========================\n');
    }
}

module.exports = CertificateUtils;