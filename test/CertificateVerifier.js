const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificateVerifier", function () {
    let certificateVerifier;
    let owner, issuer, user;

    beforeEach(async function () {
        [owner, issuer, user] = await ethers.getSigners();

        const CertificateVerifier = await ethers.getContractFactory("CertificateVerifier");
        certificateVerifier = await CertificateVerifier.deploy();
        await certificateVerifier.deployed();
    });

    it("Should issue and verify a certificate", async function () {
        const hash = "0x123abc...";
        const metadata = '{"name": "John Doe", "course": "Blockchain"}';

        // Authorize issuer
        await certificateVerifier.authorizeIssuer(issuer.address);

        // Issue certificate
        await certificateVerifier.connect(issuer).issueCertificate(hash, metadata);

        // Verify certificate
        const [exists, certIssuer, timestamp, isRevoked, certMetadata] = await certificateVerifier.verifyCertificate(hash);

        expect(exists).to.be.true;
        expect(certIssuer).to.equal(issuer.address);
        expect(isRevoked).to.be.false;
        expect(certMetadata).to.equal(metadata);
    });
});