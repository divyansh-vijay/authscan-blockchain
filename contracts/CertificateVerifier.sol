// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CertificateVerifier {
    struct Certificate {
        string certificateHash;
        address issuer;
        uint256 timestamp;
        bool isRevoked;
        string metadata;
    }
    
    mapping(string => Certificate) public certificates;
    mapping(address => bool) public authorizedIssuers;
    mapping(string => bool) public certificateExists;
    
    address public owner;
    
    event CertificateIssued(string indexed certificateHash, address indexed issuer, uint256 timestamp);
    event CertificateRevoked(string indexed certificateHash, address indexed issuer);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender], "Only authorized issuers can issue certificates");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        authorizedIssuers[msg.sender] = true;
    }
    
    function authorizeIssuer(address issuer) external onlyOwner {
        authorizedIssuers[issuer] = true;
    }
    
    function issueCertificate(string memory certificateHash, string memory metadata) external onlyAuthorizedIssuer {
        require(!certificateExists[certificateHash], "Certificate already exists");
        
        certificates[certificateHash] = Certificate({
            certificateHash: certificateHash,
            issuer: msg.sender,
            timestamp: block.timestamp,
            isRevoked: false,
            metadata: metadata
        });
        
        certificateExists[certificateHash] = true;
        emit CertificateIssued(certificateHash, msg.sender, block.timestamp);
    }
    
    function verifyCertificate(string memory certificateHash) external view returns (bool exists, address issuer, uint256 timestamp, bool isRevoked, string memory metadata) {
        Certificate memory cert = certificates[certificateHash];
        return (certificateExists[certificateHash], cert.issuer, cert.timestamp, cert.isRevoked, cert.metadata);
    }
    
    function revokeCertificate(string memory certificateHash) external {
        require(certificateExists[certificateHash], "Certificate does not exist");
        require(certificates[certificateHash].issuer == msg.sender || msg.sender == owner, "Not authorized");
        
        certificates[certificateHash].isRevoked = true;
        emit CertificateRevoked(certificateHash, msg.sender);
    }
}