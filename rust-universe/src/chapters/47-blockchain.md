# Chapter 47: Creating a Blockchain Application

## Introduction

Blockchain technology has revolutionized how we think about trust, data integrity, and decentralized applications. From cryptocurrencies to supply chain management, blockchain applications continue to disrupt traditional systems by offering transparency, immutability, and security without centralized control.

In this chapter, we'll embark on an exciting journey to build a complete blockchain application from scratch using Rust. By leveraging Rust's performance, memory safety, and concurrency features, we'll create a robust system that demonstrates core blockchain principles while maintaining real-world applicability.

Our blockchain implementation, which we'll call "RustChain," will include all essential components:

- A secure and efficient blockchain data structure
- A practical consensus mechanism
- Cryptographic validation of transactions
- Peer-to-peer networking
- Smart contract functionality
- A command-line interface and web API

By the end of this chapter, you'll understand both the theoretical foundations and practical implementation details of blockchain technology. More importantly, you'll have the skills necessary to pursue professional opportunities in this rapidly growing field or to build your own blockchain applications.

### What You'll Learn

- Fundamental blockchain concepts and architecture
- How to implement core blockchain components in Rust
- Cryptographic primitives essential for blockchain security
- Consensus algorithms and their trade-offs
- Peer-to-peer network implementation
- Smart contract design and execution
- Transaction validation and processing
- State management in distributed systems
- Performance optimization techniques
- Security best practices for blockchain applications
- Building user interfaces for blockchain interaction

### Prerequisites

This chapter builds upon concepts covered throughout this book, particularly:

- Rust ownership and borrowing (Chapters 7-10)
- Concurrency and asynchronous programming (Chapters 24-25)
- Network programming (Chapter 32)
- Cryptography basics (from various security discussions)

While not strictly necessary, familiarity with distributed systems concepts will be helpful.

## Blockchain Fundamentals

Before diving into implementation, let's establish a solid understanding of blockchain technology and its core components.

### What Is a Blockchain?

A blockchain is a distributed, immutable ledger that records transactions across many computers. The key innovation is a data structure that makes it computationally impractical to modify historical records without consensus from the network. This property enables trust in a trustless environment.

The blockchain consists of a chain of blocks, where each block contains:

1. **Transactions**: The actual data being stored (transfers, contracts, etc.)
2. **Block header**: Metadata including timestamp, nonce, and most importantly, a hash pointer to the previous block
3. **Proof**: Evidence that creation of this block required computational work (in proof-of-work systems)

This structure creates a tamper-evident chain - modifying any historical block would invalidate all subsequent blocks, making fraud immediately detectable.

### Key Properties of Blockchain Systems

Successful blockchain implementations share several important properties:

#### 1. Decentralization

No single entity controls the network. Instead, multiple nodes maintain identical copies of the ledger, and updates require consensus among participants. This eliminates single points of failure and centralizes control.

#### 2. Immutability

Once data is recorded on the blockchain and confirmed by consensus, it cannot be altered without enormous computational effort (practically impossible in well-designed systems). This provides a verifiable, permanent record of all transactions.

#### 3. Transparency

All transactions are visible to all participants, creating an auditable trail of activities. Depending on the implementation, this can be fully public or restricted to authorized participants.

#### 4. Security

Cryptographic techniques ensure that only authorized participants can add transactions relevant to their own assets or contracts. The combination of cryptography, consensus, and the distributed nature of the system creates multiple layers of security.

### Blockchain Architecture

A blockchain system typically consists of the following components:

1. **Data Layer**: Defines the structure of blocks and transactions
2. **Network Layer**: Enables peer discovery and data propagation
3. **Consensus Layer**: Determines how nodes agree on the state of the blockchain
4. **Application Layer**: Provides interfaces and smart contract functionality

In our implementation, we'll build each of these layers methodically, ensuring they work together seamlessly while maintaining clean architectural boundaries.

### Types of Blockchains

While all blockchains share fundamental concepts, they differ in implementation details and use cases:

#### Public vs. Private Blockchains

- **Public blockchains** (like Bitcoin and Ethereum) allow anyone to participate in the network, read the ledger, and submit transactions.
- **Private blockchains** restrict participation to authorized entities, often used in enterprise settings where privacy and control are paramount.

#### Permissionless vs. Permissioned

- **Permissionless systems** allow anyone to participate in consensus and transaction validation.
- **Permissioned systems** restrict these functions to authorized validators.

#### Smart Contract Platforms

Blockchains like Ethereum extend beyond simple value transfer to support "smart contracts" - self-executing code that automatically enforces agreements when predefined conditions are met.

For our implementation, we'll focus on a permissionless public blockchain with basic smart contract capabilities, similar to Ethereum but simplified for educational purposes.

Now that we've covered the fundamentals, let's begin designing and implementing our RustChain blockchain system.

## Cryptographic Primitives

Cryptography is the cornerstone of blockchain technology, providing the essential security properties that make blockchains trustworthy. Let's explore the cryptographic primitives we'll use in our RustChain implementation.

### Cryptographic Hash Functions

A cryptographic hash function transforms data of arbitrary size into a fixed-size output (a "hash" or "digest") with these crucial properties:

1. **Deterministic**: The same input always produces the same output
2. **Fast to compute**: Calculating the hash is efficient
3. **Pre-image resistance**: Given a hash, it's infeasible to find the original input
4. **Small changes cause avalanche**: Slightly modifying input drastically changes the output
5. **Collision resistance**: It's extremely difficult to find two different inputs with the same hash

In our blockchain, we'll use SHA-256, a widely trusted hash function from the SHA-2 family. Here's how we'll implement hash functionality using Rust's crypto libraries:

```rust
use sha2::{Sha256, Digest};

/// Computes SHA-256 hash of the given data
pub fn hash_data(data: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();

    let mut hash = [0u8; 32];
    hash.copy_from_slice(&result);
    hash
}

/// Converts a 32-byte hash to a hexadecimal string
pub fn hash_to_hex(hash: &[u8; 32]) -> String {
    hash.iter()
        .map(|byte| format!("{:02x}", byte))
        .collect::<String>()
}
```

We'll use these hashing functions extensively for:

- Creating unique identifiers for blocks and transactions
- Building Merkle trees for efficient verification
- Generating proof-of-work
- Verifying the integrity of the blockchain

### Digital Signatures

Digital signatures provide authentication, non-repudiation, and integrity to blockchain transactions. They allow us to verify:

- The sender's identity (authentication)
- That the sender cannot deny sending the transaction (non-repudiation)
- That the transaction wasn't altered after signing (integrity)

We'll implement digital signatures using the Ed25519 algorithm, which offers a good balance of security, performance, and key size:

```rust
use ed25519_dalek::{Keypair, PublicKey, SecretKey, Signature, Signer, Verifier};
use rand::rngs::OsRng;

/// Represents a cryptographic identity in our blockchain
pub struct CryptoWallet {
    pub keypair: Keypair,
}

impl CryptoWallet {
    /// Creates a new wallet with a randomly generated keypair
    pub fn new() -> Self {
        let mut csprng = OsRng{};
        let keypair = Keypair::generate(&mut csprng);
        Self { keypair }
    }

    /// Creates a wallet from an existing secret key
    pub fn from_secret(secret_key: &[u8]) -> Result<Self, &'static str> {
        if secret_key.len() != 32 {
            return Err("Invalid secret key length");
        }

        let secret = SecretKey::from_bytes(secret_key)
            .map_err(|_| "Invalid secret key")?;
        let public = PublicKey::from(&secret);

        Ok(Self {
            keypair: Keypair { secret, public }
        })
    }

    /// Returns the wallet's public key as bytes
    pub fn public_key(&self) -> [u8; 32] {
        self.keypair.public.to_bytes()
    }

    /// Signs a message with the wallet's private key
    pub fn sign(&self, message: &[u8]) -> [u8; 64] {
        let signature = self.keypair.sign(message);
        signature.to_bytes()
    }
}

/// Verifies a signature against a public key and message
pub fn verify_signature(
    public_key: &[u8; 32],
    message: &[u8],
    signature: &[u8; 64]
) -> bool {
    match PublicKey::from_bytes(public_key) {
        Ok(public) => {
            match Signature::from_bytes(signature) {
                Ok(sig) => {
                    public.verify(message, &sig).is_ok()
                },
                Err(_) => false
            }
        },
        Err(_) => false
    }
}
```

### Merkle Trees

Merkle trees are binary trees of hashes that provide an efficient way to verify the integrity of large datasets. They're crucial for our blockchain for:

1. Efficiently verifying that a transaction is included in a block
2. Reducing the storage requirements for lightweight clients
3. Supporting simplified payment verification (SPV)

Here's our implementation:

```rust
/// Represents a Merkle Tree for efficient verification of transaction inclusion
pub struct MerkleTree {
    /// The root hash of the tree
    pub root: [u8; 32],
    /// All nodes in the tree, level by level
    nodes: Vec<Vec<[u8; 32]>>,
}

impl MerkleTree {
    /// Creates a new Merkle Tree from a list of transaction hashes
    pub fn new(transaction_hashes: Vec<[u8; 32]>) -> Self {
        if transaction_hashes.is_empty() {
            // Special case: empty tree has zero hash as root
            return Self {
                root: [0u8; 32],
                nodes: vec![vec![[0u8; 32]]],
            };
        }

        // Start with leaf nodes (the transaction hashes)
        let mut nodes = vec![transaction_hashes];
        let mut current_level = 0;

        // Build the tree bottom-up
        while nodes[current_level].len() > 1 {
            let current_nodes = &nodes[current_level];
            let mut next_level = Vec::new();

            // Process pairs of nodes
            for i in (0..current_nodes.len()).step_by(2) {
                if i + 1 < current_nodes.len() {
                    // Hash the pair of nodes
                    let mut combined = Vec::with_capacity(64);
                    combined.extend_from_slice(&current_nodes[i]);
                    combined.extend_from_slice(&current_nodes[i + 1]);
                    next_level.push(hash_data(&combined));
                } else {
                    // Odd number of nodes: duplicate the last one
                    next_level.push(current_nodes[i]);
                }
            }

            nodes.push(next_level);
            current_level += 1;
        }

        // The root is the only node at the top level
        let root = nodes[current_level][0];

        Self { root, nodes }
    }

    /// Generates a proof that a transaction is included in the tree
    pub fn generate_proof(&self, transaction_index: usize) -> Option<MerkleProof> {
        if transaction_index >= self.nodes[0].len() {
            return None; // Index out of bounds
        }

        let mut proof = Vec::new();
        let mut index = transaction_index;

        // Ascend the tree, collecting sibling nodes
        for level in 0..(self.nodes.len() - 1) {
            let is_right = index % 2 == 1;
            let sibling_index = if is_right { index - 1 } else { index + 1 };

            if sibling_index < self.nodes[level].len() {
                proof.push(ProofElement {
                    hash: self.nodes[level][sibling_index],
                    is_right: !is_right, // The position of the sibling relative to our path
                });
            }

            // Move to the parent
            index /= 2;
        }

        Some(MerkleProof {
            leaf_hash: self.nodes[0][transaction_index],
            proof_elements: proof,
        })
    }
}

/// A single element in a Merkle proof
pub struct ProofElement {
    /// The hash of the sibling node
    pub hash: [u8; 32],
    /// Whether this element should be appended (true) or prepended (false)
    pub is_right: bool,
}

/// A proof that a transaction is included in a Merkle tree
pub struct MerkleProof {
    /// The hash of the transaction we're proving
    pub leaf_hash: [u8; 32],
    /// The elements of the proof
    pub proof_elements: Vec<ProofElement>,
}

impl MerkleProof {
    /// Verifies this proof against a known Merkle root
    pub fn verify(&self, merkle_root: &[u8; 32]) -> bool {
        let mut current_hash = self.leaf_hash;

        // Reconstruct the path to the root
        for element in &self.proof_elements {
            let mut combined = Vec::with_capacity(64);

            if element.is_right {
                combined.extend_from_slice(&current_hash);
                combined.extend_from_slice(&element.hash);
            } else {
                combined.extend_from_slice(&element.hash);
                combined.extend_from_slice(&current_hash);
            }

            current_hash = hash_data(&combined);
        }

        // Check if we've reconstructed the correct root
        current_hash == *merkle_root
    }
}
```

### Address Generation

In blockchain systems, addresses serve as identifiers for participants and are derived from public keys. For RustChain, we'll use a simplified scheme similar to Bitcoin's:

```rust
/// Generates a blockchain address from a public key
pub fn generate_address(public_key: &[u8; 32]) -> String {
    // Step 1: Hash the public key with SHA-256
    let hash1 = hash_data(public_key);

    // Step 2: Apply RIPEMD-160 to the SHA-256 hash
    let mut ripemd = ripemd160::Ripemd160::new();
    ripemd.update(&hash1);
    let hash2 = ripemd.finalize();

    // Step 3: Add version byte (0x00 for main network)
    let mut address_bytes = vec![0u8];
    address_bytes.extend_from_slice(&hash2);

    // Step 4: Calculate checksum (first 4 bytes of double SHA-256)
    let checksum_hash1 = hash_data(&address_bytes);
    let checksum_hash2 = hash_data(&checksum_hash1);
    let checksum = &checksum_hash2[0..4];

    // Step 5: Append checksum to version + hash
    address_bytes.extend_from_slice(checksum);

    // Step 6: Base58 encode the result
    bs58::encode(address_bytes).into_string()
}
```

### Secure Random Number Generation

Many blockchain operations require secure random numbers, especially for key generation. We'll use Rust's `rand` crate with the system's cryptographically secure random number generator:

```rust
use rand::{rngs::OsRng, RngCore};

/// Generates a secure random 32-byte value
pub fn generate_random_bytes() -> [u8; 32] {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    bytes
}
```

These cryptographic primitives form the foundation of our blockchain's security model. In the next section, we'll build on these to implement the core data structures for our blockchain.

## Core Blockchain Data Structures

With our cryptographic primitives in place, we can now implement the core data structures that form our blockchain: transactions, blocks, and the blockchain itself.

### Transactions

Transactions are the fundamental units of data in a blockchain. In our RustChain implementation, we'll support several transaction types:

1. **Coin transfers**: Moving currency from one address to another
2. **Smart contract creation**: Deploying new smart contracts
3. **Smart contract execution**: Interacting with deployed contracts

Let's start with the basic transaction structure:

```rust
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};
use std::collections::HashMap;

/// The type of a transaction
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TransactionType {
    /// Transfer coins between addresses
    Transfer,
    /// Deploy a new smart contract
    ContractCreation,
    /// Execute a method on an existing smart contract
    ContractExecution,
}

/// A single transaction in the blockchain
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    /// Unique identifier (hash) of the transaction
    pub id: [u8; 32],
    /// Type of transaction
    pub transaction_type: TransactionType,
    /// Sender's address
    pub from: String,
    /// Recipient's address (or contract address)
    pub to: Option<String>,
    /// Amount of coins to transfer (0 for some contract operations)
    pub amount: u64,
    /// Fee paid to miners for processing this transaction
    pub fee: u64,
    /// Arbitrary data (used for contract code or method calls)
    pub data: Vec<u8>,
    /// Timestamp when the transaction was created
    pub timestamp: DateTime<Utc>,
    /// Transaction nonce (prevents replay attacks)
    pub nonce: u64,
    /// Sender's signature
    pub signature: [u8; 64],
}

impl Transaction {
    /// Creates a new unsigned transaction
    pub fn new(
        transaction_type: TransactionType,
        from: String,
        to: Option<String>,
        amount: u64,
        fee: u64,
        data: Vec<u8>,
        nonce: u64,
    ) -> Self {
        let timestamp = Utc::now();

        // Initialize with empty signature and ID
        let mut tx = Self {
            id: [0u8; 32],
            transaction_type,
            from,
            to,
            amount,
            fee,
            data,
            timestamp,
            nonce,
            signature: [0u8; 64],
        };

        // Compute ID (hash of the transaction without signature)
        tx.id = tx.compute_hash();

        tx
    }

    /// Signs the transaction with the given wallet
    pub fn sign(&mut self, wallet: &CryptoWallet) -> Result<(), &'static str> {
        // Verify the sender's address matches the wallet
        let wallet_address = generate_address(&wallet.public_key());
        if self.from != wallet_address {
            return Err("Transaction sender doesn't match wallet address");
        }

        // Sign the transaction hash
        self.signature = wallet.sign(&self.id);

        Ok(())
    }

    /// Verifies the transaction's signature
    pub fn verify_signature(&self) -> bool {
        // Extract the public key from the sender's address
        // Note: In a real implementation, we would need to store
        // public keys in a separate database or extract them from
        // previous transactions
        let public_key = match extract_public_key_from_address(&self.from) {
            Some(pk) => pk,
            None => return false,
        };

        verify_signature(&public_key, &self.id, &self.signature)
    }

    /// Computes the hash of this transaction (excluding the signature)
    fn compute_hash(&self) -> [u8; 32] {
        // Create a temporary copy with empty signature
        let mut copy = self.clone();
        copy.signature = [0u8; 64];

        // Serialize and hash
        let serialized = bincode::serialize(&copy).unwrap_or_default();
        hash_data(&serialized)
    }
}

/// Extracts a public key from an address (simplified implementation)
fn extract_public_key_from_address(address: &str) -> Option<[u8; 32]> {
    // In a real implementation, this would look up the public key
    // associated with this address in a database or derive it
    // from previous transactions

    // For this example, we return a dummy key
    // This is a placeholder - do not use in production!
    Some([0u8; 32])
}
```

### Transaction Validation

Before adding transactions to a block, we need to validate them. Here's a transaction validation module:

```rust
/// Validates a transaction before adding it to the mempool or a block
pub fn validate_transaction(
    tx: &Transaction,
    blockchain_state: &BlockchainState
) -> Result<(), TransactionValidationError> {
    // Check if the transaction has a valid signature
    if !tx.verify_signature() {
        return Err(TransactionValidationError::InvalidSignature);
    }

    // Verify the sender has sufficient balance
    let sender_balance = blockchain_state.get_balance(&tx.from);
    let total_cost = tx.amount + tx.fee;

    if sender_balance < total_cost {
        return Err(TransactionValidationError::InsufficientFunds);
    }

    // Verify the nonce is correct to prevent replay attacks
    let expected_nonce = blockchain_state.get_nonce(&tx.from);
    if tx.nonce != expected_nonce {
        return Err(TransactionValidationError::InvalidNonce);
    }

    // Additional validations based on transaction type
    match tx.transaction_type {
        TransactionType::Transfer => {
            // Ensure there's a recipient for transfers
            if tx.to.is_none() {
                return Err(TransactionValidationError::MissingRecipient);
            }
        },
        TransactionType::ContractCreation => {
            // Validate contract code
            if tx.data.is_empty() {
                return Err(TransactionValidationError::EmptyContractCode);
            }

            // More contract validation logic would go here
        },
        TransactionType::ContractExecution => {
            // Ensure the contract exists
            if let Some(contract_addr) = &tx.to {
                if !blockchain_state.contract_exists(contract_addr) {
                    return Err(TransactionValidationError::ContractNotFound);
                }
            } else {
                return Err(TransactionValidationError::MissingContractAddress);
            }

            // Validate contract method call
            // More validation logic would go here
        }
    }

    Ok(())
}

/// Errors that can occur during transaction validation
#[derive(Debug, thiserror::Error)]
pub enum TransactionValidationError {
    #[error("Transaction has an invalid signature")]
    InvalidSignature,

    #[error("Sender has insufficient funds")]
    InsufficientFunds,

    #[error("Transaction nonce is invalid")]
    InvalidNonce,

    #[error("Transfer transaction missing recipient")]
    MissingRecipient,

    #[error("Contract creation with empty code")]
    EmptyContractCode,

    #[error("Contract not found at the specified address")]
    ContractNotFound,

    #[error("Contract execution missing contract address")]
    MissingContractAddress,
}
```

### Blocks

Blocks are containers for transactions, and they're linked together to form the blockchain. Each block references its predecessor, creating an immutable chain:

```rust
/// A block in the blockchain
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block {
    /// Block header contains metadata and security properties
    pub header: BlockHeader,
    /// Transactions included in this block
    pub transactions: Vec<Transaction>,
}

/// Header of a block containing metadata and security properties
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockHeader {
    /// Block version (for protocol upgrades)
    pub version: u32,
    /// Hash of the previous block in the chain
    pub previous_hash: [u8; 32],
    /// Root of the Merkle tree of transactions
    pub merkle_root: [u8; 32],
    /// Timestamp when the block was created
    pub timestamp: DateTime<Utc>,
    /// Block height (number of blocks from genesis)
    pub height: u64,
    /// Difficulty target for proof-of-work
    pub difficulty: u32,
    /// Nonce used for proof-of-work
    pub nonce: u64,
}

impl Block {
    /// Creates a new block (without proof-of-work)
    pub fn new(
        previous_hash: [u8; 32],
        height: u64,
        difficulty: u32,
        transactions: Vec<Transaction>,
    ) -> Self {
        let timestamp = Utc::now();

        // Calculate Merkle root from transactions
        let tx_hashes: Vec<[u8; 32]> = transactions
            .iter()
            .map(|tx| tx.id)
            .collect();

        let merkle_tree = MerkleTree::new(tx_hashes);

        let header = BlockHeader {
            version: 1,  // Initial version
            previous_hash,
            merkle_root: merkle_tree.root,
            timestamp,
            height,
            difficulty,
            nonce: 0,    // Will be set during mining
        };

        Self {
            header,
            transactions,
        }
    }

    /// Calculates the hash of this block's header
    pub fn hash(&self) -> [u8; 32] {
        let serialized = bincode::serialize(&self.header).unwrap_or_default();
        hash_data(&serialized)
    }

    /// Verifies the block's proof-of-work
    pub fn verify_proof_of_work(&self) -> bool {
        let hash = self.hash();

        // Check if the hash meets the difficulty requirement
        // The first `difficulty` bits of the hash must be zeros
        let target_zeros = self.header.difficulty as usize / 8;
        let remainder_bits = self.header.difficulty as usize % 8;

        // Check full bytes of zeros
        for i in 0..target_zeros {
            if hash[i] != 0 {
                return false;
            }
        }

        // Check partial byte
        if remainder_bits > 0 && target_zeros < 32 {
            let mask = 0xFF >> remainder_bits;
            if (hash[target_zeros] & !mask) != 0 {
                return false;
            }
        }

        true
    }

    /// Mines this block by finding a valid nonce
    pub fn mine(&mut self) {
        let mut nonce: u64 = 0;

        loop {
            self.header.nonce = nonce;

            if self.verify_proof_of_work() {
                break;
            }

            nonce += 1;
        }
    }
}
```

### The Blockchain

Finally, let's implement the blockchain itself, which manages the entire chain of blocks and maintains the current state:

````rust
/// Represents the entire blockchain
#[derive(Debug)]
pub struct Blockchain {
    /// All blocks in the chain, from genesis to latest
    blocks: Vec<Block>,
    /// Current state of the blockchain (balances, contracts, etc.)
    state: BlockchainState,
    /// Pending transactions (mempool)
    pending_transactions: Vec<Transaction>,
    /// Current mining difficulty
    current_difficulty: u32,
}

/// The current state of the blockchain
#[derive(Debug, Clone)]
pub struct BlockchainState {
    /// Address balances
    balances: HashMap<String, u64>,
    /// Address nonces (for preventing replay attacks)
    nonces: HashMap<String, u64>,
    /// Smart contracts deployed on the blockchain
    contracts: HashMap<String, SmartContract>,
}

impl BlockchainState {
    /// Creates a new, empty blockchain state
    pub fn new() -> Self {
        Self {
            balances: HashMap::new(),
            nonces: HashMap::new(),
            contracts: HashMap::new(),
        }
    }

    /// Gets an address balance
    pub fn get_balance(&self, address: &str) -> u64 {
        *self.balances.get(address).unwrap_or(&0)
    }

    /// Sets an address balance
    pub fn set_balance(&mut self, address: &str, balance: u64) {
        self.balances.insert(address.to_string(), balance);
    }

    /// Gets an address nonce
    pub fn get_nonce(&self, address: &str) -> u64 {
        *self.nonces.get(address).unwrap_or(&0)
    }

    /// Increments an address nonce
    pub fn increment_nonce(&mut self, address: &str) {
        let current = self.get_nonce(address);
        self.nonces.insert(address.to_string(), current + 1);
    }

    /// Checks if a contract exists at an address
    pub fn contract_exists(&self, address: &str) -> bool {
        self.contracts.contains_key(address)
    }

    /// Gets a smart contract by address
    pub fn get_contract(&self, address: &str) -> Option<&SmartContract> {
        self.contracts.get(address)
    }

    /// Adds a smart contract to the state
    pub fn add_contract(&mut self, address: &str, contract: SmartContract) {
        self.contracts.insert(address.to_string(), contract);
    }

    /// Applies a transaction to the state
    pub fn apply_transaction(&mut self, tx: &Transaction) -> Result<(), &'static str> {
        match tx.transaction_type {
            TransactionType::Transfer => self.apply_transfer(tx),
            TransactionType::ContractCreation => self.apply_contract_creation(tx),
            TransactionType::ContractExecution => self.apply_contract_execution(tx),
        }
    }

    /// Applies a transfer transaction to the state
    fn apply_transfer(&mut self, tx: &Transaction) -> Result<(), &'static str> {
        let from_balance = self.get_balance(&tx.from);
        let to_address = tx.to.as_ref().ok_or("Missing recipient")?;
        let to_balance = self.get_balance(to_address);

        // Ensure sufficient balance
        if from_balance < tx.amount + tx.fee {
            return Err("Insufficient balance");
        }

        // Update balances
        self.set_balance(&tx.from, from_balance - tx.amount - tx.fee);
        self.set_balance(to_address, to_balance + tx.amount);

        // Update nonce
        self.increment_nonce(&tx.from);

        Ok(())
    }

    /// Applies a contract creation transaction
    fn apply_contract_creation(&mut self, tx: &Transaction) -> Result<(), &'static str> {
        let from_balance = self.get_balance(&tx.from);

        // Ensure sufficient balance
        if from_balance < tx.fee {
            return Err("Insufficient balance");
        }

        // Generate contract address (hash of sender + nonce)
        let mut address_data = Vec::new();
        address_data.extend_from_slice(tx.from.as_bytes());
        address_data.extend_from_slice(&tx.nonce.to_le_bytes());
        let contract_hash = hash_data(&address_data);
        let contract_address = hash_to_hex(&contract_hash);

        // Create a new contract
        let contract = SmartContract {
            code: tx.data.clone(),
            storage: HashMap::new(),
        };

        // Add contract to state
        self.add_contract(&contract_address, contract);

        // Update balance and nonce
        self.set_balance(&tx.from, from_balance - tx.fee);
        self.increment_nonce(&tx.from);

        Ok(())
    }

    /// Applies a contract execution transaction
    fn apply_contract_execution(&mut self, tx: &Transaction) -> Result<(), &'static str> {
        let from_balance = self.get_balance(&tx.from);
        let contract_address = tx.to.as_ref().ok_or("Missing contract address")?;

        // Ensure sufficient balance
        if from_balance < tx.amount + tx.fee {
            return Err("Insufficient balance");
        }

        // Get the contract
        let contract = match self.get_contract(contract_address) {
            Some(c) => c,
            None => return Err("Contract not found"),
        };

        // Clone contract storage for execution
        let storage = contract.storage.iter()
            .map(|(k, v)| {
                let value = match v {
                    // Convert stored bytes to VM values
                    // This is a simplification; real systems would need
                    // more sophisticated serialization
                    [1, rest @ ..] => Value::Int(i64::from_le_bytes([rest[0], rest[1], rest[2], rest[3], rest[4], rest[5], rest[6], rest[7]])),
                    [2, rest @ ..] => Value::Bool(rest[0] != 0),
                    [3, rest @ ..] => Value::Address(String::from_utf8_lossy(rest).to_string()),
                    _ => Value::Bytes(v.clone()),
                }
                (k.clone(), value)
            })
            .collect();

        // Create dummy block header for execution context
        // In a real implementation, we would use the actual current block
        let block_header = BlockHeader {
            version: 1,
            previous_hash: [0; 32],
            merkle_root: [0; 32],
            timestamp: Utc::now(),
            height: 0,
            difficulty: 0,
            nonce: 0,
        };

        // Create and execute VM
        let mut vm = VirtualMachine::new(
            contract.code.clone(),
            storage,
            tx.clone(),
            block_header,
            100000, // Gas limit
        );

        // Execute the contract
        let result = match vm.execute() {
            Ok(_) => {
                // Update contract storage
                let mut new_storage = HashMap::new();
                for (k, v) in vm.context.storage {
                    // Serialize VM values to bytes for storage
                    // This is a simplification; real systems would need
                    // more sophisticated serialization
                    let bytes = match v {
                        Value::Int(i) => {
                            let mut b = vec![1];
                            b.extend_from_slice(&i.to_le_bytes());
                            b
                        },
                        Value::Bool(b) => {
                            vec![2, if b { 1 } else { 0 }]
                        },
                        Value::Address(a) => {
                            let mut b = vec![3];
                            b.extend_from_slice(a.as_bytes());
                            b
                        },
                        Value::Bytes(b) => b,
                    };
                    new_storage.insert(k, bytes);
                }

                // Update contract
                let mut new_contract = contract.clone();
                new_contract.storage = new_storage;
                self.add_contract(contract_address, new_contract);

                Ok(())
            },
            Err(e) => Err(match e {
                ContractError::OutOfGas => "Out of gas",
                _ => "Contract execution failed",
            }),
        };

        // Always update sender's balance for the fee, regardless of execution success
        self.set_balance(&tx.from, from_balance - tx.fee);

        // If execution was successful, transfer the amount
        if result.is_ok() && tx.amount > 0 {
            // Transfer amount to contract
            self.set_balance(&tx.from, from_balance - tx.amount - tx.fee);
            let contract_balance = self.get_balance(contract_address);
            self.set_balance(contract_address, contract_balance + tx.amount);
        }

        // Update nonce
        self.increment_nonce(&tx.from);

        result
    }
}

/// A smart contract in the blockchain
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartContract {
    /// Contract bytecode
    pub code: Vec<u8>,
    /// Contract state storage
    pub storage: HashMap<String, Vec<u8>>,
}

impl Blockchain {
    /// Creates a new blockchain with the genesis block
    pub fn new() -> Self {
        let mut state = BlockchainState::new();

        // Create the genesis block
        let genesis_block = Self::create_genesis_block(&mut state);

        Self {
            blocks: vec![genesis_block],
            state,
            pending_transactions: Vec::new(),
            current_difficulty: 24,  // Initial difficulty (adjust as needed)
        }
    }

    /// Creates the genesis block with initial state setup
    fn create_genesis_block(state: &mut BlockchainState) -> Block {
        // Create a wallet for the genesis block reward
        let genesis_wallet = CryptoWallet::new();
        let genesis_address = generate_address(&genesis_wallet.public_key());

        // Allocate initial coins to the genesis address
        state.set_balance(&genesis_address, 1_000_000_000);  // 1 billion initial coins

        // Create an empty block with no previous hash
        Block::new([0u8; 32], 0, 24, Vec::new())
    }

    /// Gets the latest block in the chain
    pub fn latest_block(&self) -> &Block {
        &self.blocks[self.blocks.len() - 1]
    }

    /// Gets a block by height
    pub fn get_block_by_height(&self, height: u64) -> Option<&Block> {
        if height < self.blocks.len() as u64 {
            Some(&self.blocks[height as usize])
        } else {
            None
        }
    }

    /// Gets a block by hash
    pub fn get_block_by_hash(&self, hash: &[u8; 32]) -> Option<&Block> {
        self.blocks.iter().find(|block| block.hash() == *hash)
    }

    /// Adds a transaction to the pending pool
    pub fn add_transaction(&mut self, tx: Transaction) -> Result<(), TransactionValidationError> {
        // Validate the transaction
        validate_transaction(&tx, &self.state)?;

        // Add to pending transactions
        self.pending_transactions.push(tx);

        Ok(())
    }

    /// Mines a new block with pending transactions
    pub fn mine_block(&mut self, miner_address: &str) -> Block {
        // Select transactions from the pending pool
        // (in a real implementation, we would prioritize by fee)
        let mut block_transactions = Vec::new();

        // Take up to 100 transactions
        for _ in 0..100 {
            if let Some(tx) = self.pending_transactions.pop() {
                block_transactions.push(tx);
            } else {
                break;
            }
        }

        // Add mining reward transaction
        let reward_tx = Transaction::new(
            TransactionType::Transfer,
            "system".to_string(),  // Special sender for rewards
            Some(miner_address.to_string()),
            50,  // Block reward (would decrease over time in real implementation)
            0,   // No fee for reward transaction
            Vec::new(),
            0,   // Nonce doesn't matter for system transactions
        );

        block_transactions.push(reward_tx);

        // Create a new block
        let latest = self.latest_block();
        let height = latest.header.height + 1;
        let previous_hash = latest.hash();

        let mut new_block = Block::new(
            previous_hash,
            height,
            self.current_difficulty,
            block_transactions,
        );

        // Mine the block (find proof-of-work)
        new_block.mine();

        // Add to blockchain and update state
        self.add_block(new_block.clone());

        new_block
    }

    /// Adds a block to the blockchain
    pub fn add_block(&mut self, block: Block) -> Result<(), &'static str> {
        // Verify the block connects to our chain
        if block.header.previous_hash != self.latest_block().hash() {
            return Err("Block does not connect to the latest block");
        }

        // Verify proof-of-work
        if !block.verify_proof_of_work() {
            return Err("Invalid proof-of-work");
        }

        // Apply all transactions to the state
        let mut new_state = self.state.clone();

        for tx in &block.transactions {
            if let Err(e) = new_state.apply_transaction(tx) {
                return Err(e);
            }
        }

        // Update state and add block
        self.state = new_state;
        self.blocks.push(block);

        // Adjust difficulty every 10 blocks
        if self.blocks.len() % 10 == 0 {
            self.adjust_difficulty();
        }

        Ok(())
    }

    /// Adjusts the mining difficulty based on recent block times
    fn adjust_difficulty(&mut self) {
        // Get the timestamps of the last 10 blocks
        if self.blocks.len() < 11 {
            return;  // Not enough blocks to adjust
        }

        let len = self.blocks.len();
        let first_time = self.blocks[len - 10].header.timestamp.timestamp();
        let last_time = self.blocks[len - 1].header.timestamp.timestamp();

        let time_diff = (last_time - first_time) as u32;
        let target_time = 600;  // Target 60 seconds per block, 600 for 10 blocks

        // Adjust difficulty to try to maintain 1 block per minute
        if time_diff < target_time / 2 {
            // Blocks are too fast, increase difficulty
            self.current_difficulty = self.current_difficulty.saturating_add(1);
        } else if time_diff > target_time * 2 {
            // Blocks are too slow, decrease difficulty
            self.current_difficulty = self.current_difficulty.saturating_sub(1);
        }
    }
}

### Serialization and Persistence

To persist our blockchain to disk, we'll need serialization and deserialization capabilities:

```rust
/// Saves the blockchain to disk
pub fn save_blockchain(blockchain: &Blockchain, path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let file = std::fs::File::create(path)?;
    let writer = std::io::BufWriter::new(file);

    // Serialize and save
    bincode::serialize_into(writer, &blockchain.blocks)?;

    Ok(())
}

/// Loads a blockchain from disk
pub fn load_blockchain(path: &str) -> Result<Blockchain, Box<dyn std::error::Error>> {
    let file = std::fs::File::open(path)?;
    let reader = std::io::BufReader::new(file);

    // Deserialize blocks
    let blocks: Vec<Block> = bincode::deserialize_from(reader)?;

    if blocks.is_empty() {
        return Err("Empty blockchain file".into());
    }

    // Reconstruct the state by replaying all transactions
    let mut blockchain = Blockchain::new();
    blockchain.blocks = Vec::new();  // Clear the genesis block

    // Replay all blocks to reconstruct state
    for block in blocks {
        blockchain.add_block(block)?;
    }

    Ok(blockchain)
}
````

With these core data structures, we have the foundation of our blockchain. This includes transactions, blocks, the blockchain itself, and state management. In the next section, we'll implement the consensus mechanism that allows nodes in the network to agree on the state of the blockchain.

## Peer-to-Peer Networking

A fundamental aspect of blockchain technology is its distributed nature. Multiple nodes run the blockchain software independently, collectively maintaining the network. These nodes need to communicate to:

1. Discover other peers
2. Propagate new transactions
3. Broadcast newly mined blocks
4. Synchronize their blockchain with other nodes

In this section, we'll implement a peer-to-peer (P2P) network for our RustChain application using Rust's asynchronous programming capabilities with Tokio.

### Network Protocol Design

Our P2P protocol will be message-based, with a simple binary format for efficiency. Each message will consist of:

1. A message type identifier
2. Message length
3. The actual payload data

Here are the key message types we'll implement:

- `Handshake`: Initial connection establishment
- `Ping`/`Pong`: Connection heartbeat
- `GetPeers`/`Peers`: Peer discovery
- `NewTransaction`: Propagating a new transaction
- `NewBlock`: Broadcasting a newly mined block
- `GetBlocks`/`Blocks`: Blockchain synchronization

### Message Definitions

Let's start by defining our message structures:

```rust
use serde::{Serialize, Deserialize};
use std::net::SocketAddr;

/// Types of messages in our P2P protocol
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessageType {
    Handshake,
    Ping,
    Pong,
    GetPeers,
    Peers,
    NewTransaction,
    GetBlocks,
    Blocks,
    NewBlock,
}

/// A message in our P2P protocol
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    /// Type of message
    pub message_type: MessageType,
    /// Message payload
    pub payload: Vec<u8>,
}

impl Message {
    /// Creates a new message
    pub fn new(message_type: MessageType, payload: Vec<u8>) -> Self {
        Self {
            message_type,
            payload,
        }
    }

    /// Creates a handshake message
    pub fn handshake(node_id: &str, version: u32) -> Self {
        let payload = HandshakePayload {
            node_id: node_id.to_string(),
            version,
            timestamp: Utc::now(),
        };

        Self::new(
            MessageType::Handshake,
            bincode::serialize(&payload).unwrap_or_default(),
        )
    }

    /// Creates a new transaction message
    pub fn new_transaction(transaction: &Transaction) -> Self {
        Self::new(
            MessageType::NewTransaction,
            bincode::serialize(transaction).unwrap_or_default(),
        )
    }

    /// Creates a new block message
    pub fn new_block(block: &Block) -> Self {
        Self::new(
            MessageType::NewBlock,
            bincode::serialize(block).unwrap_or_default(),
        )
    }

    /// Creates a get blocks message
    pub fn get_blocks(start_height: u64, end_height: u64) -> Self {
        let payload = GetBlocksPayload {
            start_height,
            end_height,
        };

        Self::new(
            MessageType::GetBlocks,
            bincode::serialize(&payload).unwrap_or_default(),
        )
    }

    /// Creates a blocks message
    pub fn blocks(blocks: &[Block]) -> Self {
        Self::new(
            MessageType::Blocks,
            bincode::serialize(blocks).unwrap_or_default(),
        )
    }

    /// Creates a get peers message
    pub fn get_peers() -> Self {
        Self::new(MessageType::GetPeers, Vec::new())
    }

    /// Creates a peers message
    pub fn peers(peers: &[SocketAddr]) -> Self {
        Self::new(
            MessageType::Peers,
            bincode::serialize(peers).unwrap_or_default(),
        )
    }

    /// Creates a ping message
    pub fn ping() -> Self {
        Self::new(MessageType::Ping, Vec::new())
    }

    /// Creates a pong message
    pub fn pong() -> Self {
        Self::new(MessageType::Pong, Vec::new())
    }
}

/// Payload for handshake messages
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HandshakePayload {
    /// Unique ID of the node
    pub node_id: String,
    /// Protocol version
    pub version: u32,
    /// Current timestamp
    pub timestamp: DateTime<Utc>,
}

/// Payload for get blocks messages
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetBlocksPayload {
    /// Start block height
    pub start_height: u64,
    /// End block height
    pub end_height: u64,
}
```

### Network Layer Implementation

Next, let's implement the core network layer that manages connections and message handling:

```rust
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc::{self, Receiver, Sender};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::time::{self, Duration};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

/// Events that can occur in the P2P network
#[derive(Debug, Clone)]
pub enum NetworkEvent {
    /// New transaction received
    NewTransaction(Transaction),
    /// New block received
    NewBlock(Block),
    /// Blocks received during synchronization
    BlocksReceived(Vec<Block>),
    /// New peer connected
    PeerConnected(String, SocketAddr),
    /// Peer disconnected
    PeerDisconnected(String),
}

/// A peer connection in the P2P network
struct Peer {
    /// Unique ID of the peer
    id: String,
    /// Address of the peer
    addr: SocketAddr,
    /// Sender for outgoing messages
    sender: Sender<Message>,
    /// Last time we received a message from this peer
    last_seen: DateTime<Utc>,
}

/// The P2P network manager
pub struct Network {
    /// Unique ID for this node
    node_id: String,
    /// Protocol version
    version: u32,
    /// Connected peers
    peers: Arc<Mutex<HashMap<String, Peer>>>,
    /// Local blockchain
    blockchain: Arc<Mutex<Blockchain>>,
    /// Sender for network events
    event_sender: Sender<NetworkEvent>,
}

impl Network {
    /// Creates a new network manager
    pub fn new(blockchain: Blockchain) -> (Self, Receiver<NetworkEvent>) {
        let (event_sender, event_receiver) = mpsc::channel(100);

        let network = Self {
            node_id: Uuid::new_v4().to_string(),
            version: 1,  // Initial protocol version
            peers: Arc::new(Mutex::new(HashMap::new())),
            blockchain: Arc::new(Mutex::new(blockchain)),
            event_sender,
        };

        (network, event_receiver)
    }

    /// Starts the network server
    pub async fn start_server(&self, addr: &str) -> Result<(), Box<dyn std::error::Error>> {
        let listener = TcpListener::bind(addr).await?;
        println!("P2P server listening on {}", addr);

        loop {
            let (socket, peer_addr) = listener.accept().await?;
            println!("New connection from {}", peer_addr);

            // Clone necessary data for the connection handler
            let peers = self.peers.clone();
            let blockchain = self.blockchain.clone();
            let event_sender = self.event_sender.clone();
            let node_id = self.node_id.clone();
            let version = self.version;

            // Handle connection in a separate task
            tokio::spawn(async move {
                if let Err(e) = Self::handle_connection(
                    socket,
                    peer_addr,
                    peers,
                    blockchain,
                    event_sender,
                    node_id,
                    version,
                ).await {
                    println!("Connection error: {}", e);
                }
            });
        }
    }

    /// Connects to a peer
    pub async fn connect_to_peer(&self, addr: &str) -> Result<(), Box<dyn std::error::Error>> {
        let socket_addr: SocketAddr = addr.parse()?;
        let socket = TcpStream::connect(socket_addr).await?;
        println!("Connected to peer {}", addr);

        // Clone necessary data for the connection handler
        let peers = self.peers.clone();
        let blockchain = self.blockchain.clone();
        let event_sender = self.event_sender.clone();
        let node_id = self.node_id.clone();
        let version = self.version;

        // Handle connection in a separate task
        tokio::spawn(async move {
            if let Err(e) = Self::handle_connection(
                socket,
                socket_addr,
                peers,
                blockchain,
                event_sender,
                node_id,
                version,
            ).await {
                println!("Connection error: {}", e);
            }
        });

        Ok(())
    }

    /// Broadcasts a message to all connected peers
    pub fn broadcast(&self, message: Message) {
        let peers = self.peers.lock().unwrap();

        for peer in peers.values() {
            let sender = peer.sender.clone();
            let message = message.clone();

            tokio::spawn(async move {
                if let Err(e) = sender.send(message).await {
                    println!("Failed to send message: {}", e);
                }
            });
        }
    }

    /// Broadcasts a new transaction to all peers
    pub fn broadcast_transaction(&self, transaction: Transaction) {
        let message = Message::new_transaction(&transaction);
        self.broadcast(message);
    }

    /// Broadcasts a new block to all peers
    pub fn broadcast_block(&self, block: Block) {
        let message = Message::new_block(&block);
        self.broadcast(message);
    }

    /// Handles a new peer connection
    async fn handle_connection(
        mut socket: TcpStream,
        peer_addr: SocketAddr,
        peers: Arc<Mutex<HashMap<String, Peer>>>,
        blockchain: Arc<Mutex<Blockchain>>,
        event_sender: Sender<NetworkEvent>,
        node_id: String,
        version: u32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Create channel for outgoing messages
        let (tx, mut rx) = mpsc::channel::<Message>(100);

        // Split socket for concurrent reading and writing
        let (mut reader, mut writer) = socket.split();

        // Send handshake message
        let handshake = Message::handshake(&node_id, version);
        Self::send_message(&mut writer, &handshake).await?;

        // Wait for handshake response
        let response = Self::receive_message(&mut reader).await?;

        let peer_id = if let MessageType::Handshake = response.message_type {
            let payload: HandshakePayload = bincode::deserialize(&response.payload)?;

            // Register peer
            let peer = Peer {
                id: payload.node_id.clone(),
                addr: peer_addr,
                sender: tx.clone(),
                last_seen: Utc::now(),
            };

            peers.lock().unwrap().insert(payload.node_id.clone(), peer);

            // Notify about new peer
            event_sender.send(NetworkEvent::PeerConnected(
                payload.node_id.clone(),
                peer_addr,
            )).await?;

            payload.node_id
        } else {
            return Err("Expected handshake message".into());
        };

        // Send writer task to handle outgoing messages
        let writer_task = tokio::spawn(async move {
            while let Some(message) = rx.recv().await {
                if let Err(e) = Self::send_message(&mut writer, &message).await {
                    println!("Error sending message: {}", e);
                    break;
                }
            }
        });

        // Start ping task to keep the connection alive
        let tx_clone = tx.clone();
        let ping_task = tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_secs(30));

            loop {
                interval.tick().await;
                if tx_clone.send(Message::ping()).await.is_err() {
                    break;
                }
            }
        });

        // Handle incoming messages
        loop {
            match Self::receive_message(&mut reader).await {
                Ok(message) => {
                    // Update last seen timestamp
                    if let Some(peer) = peers.lock().unwrap().get_mut(&peer_id) {
                        peer.last_seen = Utc::now();
                    }

                    // Process the message
                    match message.message_type {
                        MessageType::Ping => {
                            tx.send(Message::pong()).await?;
                        },
                        MessageType::GetPeers => {
                            let peer_addrs: Vec<SocketAddr> = peers
                                .lock()
                                .unwrap()
                                .values()
                                .map(|p| p.addr)
                                .collect();

                            tx.send(Message::peers(&peer_addrs)).await?;
                        },
                        MessageType::Peers => {
                            let received_peers: Vec<SocketAddr> = bincode::deserialize(&message.payload)?;
                            // In a real implementation, we would attempt to connect to these peers
                            println!("Received {} peers", received_peers.len());
                        },
                        MessageType::NewTransaction => {
                            let transaction: Transaction = bincode::deserialize(&message.payload)?;

                            // Notify about new transaction
                            event_sender.send(NetworkEvent::NewTransaction(transaction)).await?;
                        },
                        MessageType::NewBlock => {
                            let block: Block = bincode::deserialize(&message.payload)?;

                            // Notify about new block
                            event_sender.send(NetworkEvent::NewBlock(block)).await?;
                        },
                        MessageType::GetBlocks => {
                            let payload: GetBlocksPayload = bincode::deserialize(&message.payload)?;
                            let blockchain_guard = blockchain.lock().unwrap();

                            let mut blocks = Vec::new();
                            for height in payload.start_height..=payload.end_height {
                                if let Some(block) = blockchain_guard.get_block_by_height(height) {
                                    blocks.push(block.clone());
                                } else {
                                    break;
                                }
                            }

                            tx.send(Message::blocks(&blocks)).await?;
                        },
                        MessageType::Blocks => {
                            let blocks: Vec<Block> = bincode::deserialize(&message.payload)?;

                            // Notify about received blocks
                            event_sender.send(NetworkEvent::BlocksReceived(blocks)).await?;
                        },
                        _ => {
                            // Ignore other message types for now
                        }
                    }
                },
                Err(e) => {
                    println!("Error receiving message: {}", e);
                    break;
                }
            }
        }

        // Clean up
        ping_task.abort();
        writer_task.abort();

        // Remove peer
        peers.lock().unwrap().remove(&peer_id);

        // Notify about disconnection
        event_sender.send(NetworkEvent::PeerDisconnected(peer_id)).await?;

        Ok(())
    }

    /// Sends a message over a TCP stream
    async fn send_message(writer: &mut tokio::io::WriteHalf<TcpStream>, message: &Message) -> Result<(), Box<dyn std::error::Error>> {
        // Serialize the message
        let data = bincode::serialize(message)?;

        // Send message type (1 byte)
        writer.write_u8(message.message_type as u8).await?;

        // Send message length (4 bytes)
        writer.write_u32(data.len() as u32).await?;

        // Send message data
        writer.write_all(&data).await?;
        writer.flush().await?;

        Ok(())
    }

    /// Receives a message from a TCP stream
    async fn receive_message(reader: &mut tokio::io::ReadHalf<TcpStream>) -> Result<Message, Box<dyn std::error::Error>> {
        // Read message type (1 byte)
        let message_type_byte = reader.read_u8().await?;

        // Convert to MessageType enum
        let message_type = match message_type_byte {
            0 => MessageType::Handshake,
            1 => MessageType::Ping,
            2 => MessageType::Pong,
            3 => MessageType::GetPeers,
            4 => MessageType::Peers,
            5 => MessageType::NewTransaction,
            6 => MessageType::GetBlocks,
            7 => MessageType::Blocks,
            8 => MessageType::NewBlock,
            _ => return Err("Unknown message type".into()),
        };

        // Read message length (4 bytes)
        let length = reader.read_u32().await? as usize;

        // Read message data
        let mut data = vec![0u8; length];
        reader.read_exact(&mut data).await?;

        Ok(Message {
            message_type,
            payload: data,
        })
    }
}
```

### Node Synchronization

When a new node joins the network or a node reconnects after being offline, it needs to synchronize its blockchain with the rest of the network. Let's implement this functionality:

```rust
/// Handles blockchain synchronization with peers
pub struct Synchronizer {
    /// Local blockchain
    blockchain: Arc<Mutex<Blockchain>>,
    /// Network manager
    network: Arc<Network>,
}

impl Synchronizer {
    /// Creates a new synchronizer
    pub fn new(blockchain: Arc<Mutex<Blockchain>>, network: Arc<Network>) -> Self {
        Self {
            blockchain,
            network,
        }
    }

    /// Starts the synchronization process
    pub async fn start(&self, mut event_receiver: Receiver<NetworkEvent>) -> Result<(), Box<dyn std::error::Error>> {
        // Initial synchronization
        self.sync_with_network().await?;

        // Continue processing network events
        while let Some(event) = event_receiver.recv().await {
            match event {
                NetworkEvent::NewTransaction(transaction) => {
                    // Add transaction to the mempool
                    let mut blockchain = self.blockchain.lock().unwrap();

                    if let Err(e) = blockchain.add_transaction(transaction.clone()) {
                        println!("Invalid transaction: {:?}", e);
                    } else {
                        println!("Added new transaction: {}", hash_to_hex(&transaction.id));
                    }
                },
                NetworkEvent::NewBlock(block) => {
                    // Validate and add the block
                    let mut blockchain = self.blockchain.lock().unwrap();

                    if let Err(e) = blockchain.add_block(block.clone()) {
                        println!("Invalid block: {}", e);
                    } else {
                        println!("Added new block at height {}", block.header.height);
                    }
                },
                NetworkEvent::BlocksReceived(blocks) => {
                    // Process received blocks during synchronization
                    println!("Received {} blocks during sync", blocks.len());

                    let mut blockchain = self.blockchain.lock().unwrap();

                    for block in blocks {
                        if let Err(e) = blockchain.add_block(block.clone()) {
                            println!("Error adding block during sync: {}", e);
                            // In a real implementation, we might need to handle
                            // more complex synchronization issues
                            break;
                        }
                    }
                },
                NetworkEvent::PeerConnected(peer_id, _) => {
                    println!("Peer connected: {}", peer_id);
                    // We might initiate sync with this peer
                },
                NetworkEvent::PeerDisconnected(peer_id) => {
                    println!("Peer disconnected: {}", peer_id);
                },
            }
        }

        Ok(())
    }

    /// Synchronizes with the network by requesting blocks
    async fn sync_with_network(&self) -> Result<(), Box<dyn std::error::Error>> {
        let current_height = {
            let blockchain = self.blockchain.lock().unwrap();
            blockchain.latest_block().header.height
        };

        // Request the next batch of blocks
        // In a real implementation, we would select the best peer to sync from
        self.network.broadcast(Message::get_blocks(
            current_height + 1,
            current_height + 100, // Request up to 100 blocks at a time
        ));

        // The actual processing of received blocks happens in the event loop

        Ok(())
    }
}
```

### Discovery Service

To help nodes find each other, we'll implement a simple discovery service:

```rust
/// Manages peer discovery
pub struct DiscoveryService {
    /// Network manager
    network: Arc<Network>,
    /// Known peer addresses
    known_peers: Vec<String>,
}

impl DiscoveryService {
    /// Creates a new discovery service
    pub fn new(network: Arc<Network>, seed_peers: Vec<String>) -> Self {
        Self {
            network,
            known_peers: seed_peers,
        }
    }

    /// Starts the discovery service
    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        // First, connect to seed peers
        for peer in &self.known_peers {
            if let Err(e) = self.network.connect_to_peer(peer).await {
                println!("Failed to connect to seed peer {}: {}", peer, e);
            }
        }

        // Periodically ask peers for more peers
        let network = self.network.clone();
        tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_secs(300)); // Every 5 minutes

            loop {
                interval.tick().await;
                network.broadcast(Message::get_peers());
            }
        });

        Ok(())
    }
}
```

### Running a Complete Node

Finally, let's put it all together to run a complete blockchain node:

```rust
/// Runs a full blockchain node
pub async fn run_node(
    listen_addr: &str,
    seed_peers: Vec<String>,
    data_dir: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    // Create or load the blockchain
    let blockchain_path = format!("{}/blockchain.dat", data_dir);
    let blockchain = if std::path::Path::new(&blockchain_path).exists() {
        println!("Loading existing blockchain...");
        load_blockchain(&blockchain_path)?
    } else {
        println!("Creating new blockchain...");
        Blockchain::new()
    };

    // Create the network layer
    let (network, event_receiver) = Network::new(blockchain);
    let network = Arc::new(network);

    // Create synchronizer
    let blockchain_arc = Arc::new(Mutex::new(blockchain));
    let synchronizer = Synchronizer::new(blockchain_arc.clone(), network.clone());

    // Create discovery service
    let discovery = DiscoveryService::new(network.clone(), seed_peers);

    // Start services
    let network_handle = {
        let network = network.clone();
        let listen_addr = listen_addr.to_string();
        tokio::spawn(async move {
            if let Err(e) = network.start_server(&listen_addr).await {
                eprintln!("Network error: {}", e);
            }
        })
    };

    let sync_handle = tokio::spawn(async move {
        if let Err(e) = synchronizer.start(event_receiver).await {
            eprintln!("Synchronizer error: {}", e);
        }
    });

    let discovery_handle = tokio::spawn(async move {
        if let Err(e) = discovery.start().await {
            eprintln!("Discovery error: {}", e);
        }
    });

    // Save blockchain periodically
    let save_handle = {
        let blockchain = blockchain_arc.clone();
        let path = blockchain_path.clone();
        tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_secs(300)); // Every 5 minutes

            loop {
                interval.tick().await;

                let blockchain_guard = blockchain.lock().unwrap();
                if let Err(e) = save_blockchain(&blockchain_guard, &path) {
                    eprintln!("Error saving blockchain: {}", e);
                } else {
                    println!("Blockchain saved successfully");
                }
            }
        })
    };

    // Mining loop (in a real application, this would be configurable)
    let miner_handle = {
        let blockchain = blockchain_arc;
        let network = network;
        let miner_address = "YOUR_MINER_ADDRESS_HERE".to_string(); // Replace with actual address

        tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_secs(60)); // Try to mine a block every minute

            loop {
                interval.tick().await;

                // Mine a new block
                let new_block = {
                    let mut blockchain_guard = blockchain.lock().unwrap();
                    blockchain_guard.mine_block(&miner_address)
                };

                println!("Mined new block at height {}", new_block.header.height);

                // Broadcast the new block
                network.broadcast_block(new_block);
            }
        })
    };

    // Wait for all tasks to complete (they should run indefinitely)
    tokio::try_join!(
        network_handle,
        sync_handle,
        discovery_handle,
        save_handle,
        miner_handle
    )?;

    Ok(())
}
```

The peer-to-peer networking implementation enables our blockchain to function as a distributed system. Nodes can discover each other, exchange transactions and blocks, and maintain consistent state across the network.

In the next section, we'll implement the smart contract functionality that will allow our blockchain to execute programmable logic.

## Smart Contract System

Smart contracts are self-executing agreements with the terms directly written into code. They're one of the most powerful features of modern blockchains, enabling complex decentralized applications. For RustChain, we'll implement a simple but functional smart contract system.

### Virtual Machine Design

Our smart contract system will be based on a stack-based virtual machine (VM) that executes bytecode. This approach is similar to the Ethereum Virtual Machine (EVM) but simplified for educational purposes.

Let's define the VM's instruction set and architecture:

```rust
/// Operation codes for our VM
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OpCode {
    // Stack operations
    PUSH = 0x01,    // Push value onto stack
    POP = 0x02,     // Pop value from stack
    DUP = 0x03,     // Duplicate top stack item
    SWAP = 0x04,    // Swap top two stack items

    // Arithmetic operations
    ADD = 0x10,     // Addition
    SUB = 0x11,     // Subtraction
    MUL = 0x12,     // Multiplication
    DIV = 0x13,     // Division
    MOD = 0x14,     // Modulo

    // Comparison operations
    EQ = 0x20,      // Equal
    LT = 0x21,      // Less than
    GT = 0x22,      // Greater than

    // Logical operations
    AND = 0x30,     // Logical AND
    OR = 0x31,      // Logical OR
    NOT = 0x32,     // Logical NOT

    // Control flow
    JUMP = 0x40,    // Unconditional jump
    JUMPI = 0x41,   // Conditional jump

    // Storage operations
    LOAD = 0x50,    // Load from storage
    STORE = 0x51,   // Store to storage

    // Contract operations
    CALL = 0x60,    // Call another contract
    RETURN = 0x70,  // Return from execution
    STOP = 0x00,    // Stop execution
}

/// Values in our VM
#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Int(i64),
    Bool(bool),
    Address(String),
    Bytes(Vec<u8>),
}

impl Value {
    /// Converts value to integer, with default for non-convertible types
    pub fn as_int(&self) -> i64 {
        match self {
            Value::Int(i) => *i,
            Value::Bool(b) => if *b { 1 } else { 0 },
            _ => 0,
        }
    }

    /// Converts value to boolean
    pub fn as_bool(&self) -> bool {
        match self {
            Value::Bool(b) => *b,
            Value::Int(i) => *i != 0,
            _ => false,
        }
    }
}

/// Execution context for contract execution
pub struct ExecutionContext {
    /// Contract storage
    storage: HashMap<String, Value>,
    /// Transaction that triggered this execution
    transaction: Transaction,
    /// Current block information
    block: BlockHeader,
}

/// The virtual machine for executing contract code
pub struct VirtualMachine {
    /// Program counter
    pc: usize,
    /// Execution stack
    stack: Vec<Value>,
    /// Contract code
    code: Vec<u8>,
    /// Execution context
    context: ExecutionContext,
    /// Gas remaining
    gas_remaining: u64,
}

impl VirtualMachine {
    /// Creates a new VM instance
    pub fn new(
        code: Vec<u8>,
        storage: HashMap<String, Value>,
        transaction: Transaction,
        block: BlockHeader,
        gas_limit: u64,
    ) -> Self {
        Self {
            pc: 0,
            stack: Vec::new(),
            code,
            context: ExecutionContext {
                storage,
                transaction,
                block,
            },
            gas_remaining: gas_limit,
        }
    }

    /// Executes the contract code
    pub fn execute(&mut self) -> Result<Option<Value>, ContractError> {
        while self.pc < self.code.len() && self.gas_remaining > 0 {
            // Fetch the next opcode
            let opcode = self.fetch_opcode()?;

            // Execute the instruction
            match opcode {
                OpCode::PUSH => {
                    // Next byte is the value to push
                    let value = self.fetch_byte()? as i64;
                    self.stack.push(Value::Int(value));
                    self.gas_remaining = self.gas_remaining.saturating_sub(1);
                },

                OpCode::POP => {
                    self.stack.pop().ok_or(ContractError::StackUnderflow)?;
                    self.gas_remaining = self.gas_remaining.saturating_sub(1);
                },

                OpCode::DUP => {
                    let value = self.stack.last()
                        .ok_or(ContractError::StackUnderflow)?
                        .clone();
                    self.stack.push(value);
                    self.gas_remaining = self.gas_remaining.saturating_sub(1);
                },

                OpCode::SWAP => {
                    let len = self.stack.len();
                    if len < 2 {
                        return Err(ContractError::StackUnderflow);
                    }
                    self.stack.swap(len - 1, len - 2);
                    self.gas_remaining = self.gas_remaining.saturating_sub(1);
                },

                OpCode::ADD => {
                    let b = self.stack.pop().ok_or(ContractError::StackUnderflow)?;
                    let a = self.stack.pop().ok_or(ContractError::StackUnderflow)?;
                    let result = Value::Int(a.as_int() + b.as_int());
                    self.stack.push(result);
                    self.gas_remaining = self.gas_remaining.saturating_sub(3);
                },

                OpCode::SUB => {
                    let b = self.stack.pop().ok_or(ContractError::StackUnderflow)?;
                    let a = self.stack.pop().ok_or(ContractError::StackUnderflow)?;
                    let result = Value::Int(a.as_int() - b.as_int());
                    self.stack.push(result);
                    self.gas_remaining = self.gas_remaining.saturating_sub(3);
                },

                OpCode::MUL => {
                    let b = self.stack.pop().ok_or(ContractError::StackUnderflow)?;
                    let a = self.stack.pop().ok_or(ContractError::StackUnderflow)?;
                    let result = Value::Int(a.as_int() * b.as_int());
                    self.stack.push(result);
                    self.gas_remaining = self.gas_remaining.saturating_sub(5);
                },

                OpCode::DIV => {
                    let b = self.stack.pop().ok_or(ContractError::StackUnderflow)?;
                    let a = self.stack.pop().ok_or(ContractError::StackUnderflow)?;
                    let b_int = b.as_int();
                    if b_int == 0 {
                        return Err(ContractError::DivisionByZero);
                    }
                    let result = Value::Int(a.as_int() / b_int);
                    self.stack.push(result);
                    self.gas_remaining = self.gas_remaining.saturating_sub(5);
                },

                OpCode::EQ => {
                    let b = self.stack.pop().ok_or(ContractError::StackUnderflow)?;
                    let a = self.stack.pop().ok_or(ContractError::StackUnderflow)?;
                    let result = Value::Bool(a == b);
                    self.stack.push(result);
                    self.gas_remaining = self.gas_remaining.saturating_sub(3);
                },

                OpCode::JUMP => {
                    let target = self.stack.pop().ok_or(ContractError::StackUnderflow)?;
                    self.pc = target.as_int() as usize;
                    self.gas_remaining = self.gas_remaining.saturating_sub(8);
                    continue; // Skip pc increment
                },

                OpCode::JUMPI => {
                    let target = self.stack.pop().ok_or(ContractError::StackUnderflow)?;
                    let condition = self.stack.pop().ok_or(ContractError::StackUnderflow)?;

                    if condition.as_bool() {
                        self.pc = target.as_int() as usize;
                        self.gas_remaining = self.gas_remaining.saturating_sub(10);
                        continue; // Skip pc increment
                    }

                    self.gas_remaining = self.gas_remaining.saturating_sub(5);
                },

                OpCode::LOAD => {
                    let key = self.stack.pop().ok_or(ContractError::StackUnderflow)?;
                    let key_str = format!("{:?}", key);
                    let value = self.context.storage.get(&key_str)
                        .cloned()
                        .unwrap_or(Value::Int(0));

                    self.stack.push(value);
                    self.gas_remaining = self.gas_remaining.saturating_sub(20);
                },

                OpCode::STORE => {
                    let key = self.stack.pop().ok_or(ContractError::StackUnderflow)?;
                    let value = self.stack.pop().ok_or(ContractError::StackUnderflow)?;
                    let key_str = format!("{:?}", key);

                    self.context.storage.insert(key_str, value);
                    self.gas_remaining = self.gas_remaining.saturating_sub(100);
                },

                OpCode::RETURN => {
                    let value = self.stack.pop().ok_or(ContractError::StackUnderflow)?;
                    return Ok(Some(value));
                },

                OpCode::STOP => {
                    return Ok(None);
                },

                // Other opcodes would be implemented here
                _ => return Err(ContractError::InvalidOpcode(opcode as u8)),
            }

            // Move to next instruction
            self.pc += 1;
        }

        // If we ran out of gas
        if self.gas_remaining == 0 && self.pc < self.code.len() {
            return Err(ContractError::OutOfGas);
        }

        // Reached end of code without RETURN or STOP
        Ok(None)
    }

    /// Fetches the next opcode
    fn fetch_opcode(&self) -> Result<OpCode, ContractError> {
        if self.pc >= self.code.len() {
            return Err(ContractError::InvalidProgramCounter);
        }

        let byte = self.code[self.pc];
        match byte {
            0x00 => Ok(OpCode::STOP),
            0x01 => Ok(OpCode::PUSH),
            0x02 => Ok(OpCode::POP),
            0x03 => Ok(OpCode::DUP),
            0x04 => Ok(OpCode::SWAP),
            0x10 => Ok(OpCode::ADD),
            0x11 => Ok(OpCode::SUB),
            0x12 => Ok(OpCode::MUL),
            0x13 => Ok(OpCode::DIV),
            0x14 => Ok(OpCode::MOD),
            0x20 => Ok(OpCode::EQ),
            0x21 => Ok(OpCode::LT),
            0x22 => Ok(OpCode::GT),
            0x30 => Ok(OpCode::AND),
            0x31 => Ok(OpCode::OR),
            0x32 => Ok(OpCode::NOT),
            0x40 => Ok(OpCode::JUMP),
            0x41 => Ok(OpCode::JUMPI),
            0x50 => Ok(OpCode::LOAD),
            0x51 => Ok(OpCode::STORE),
            0x60 => Ok(OpCode::CALL),
            0x70 => Ok(OpCode::RETURN),
            _ => Err(ContractError::InvalidOpcode(byte)),
        }
    }

    /// Fetches the next byte as a value
    fn fetch_byte(&mut self) -> Result<u8, ContractError> {
        self.pc += 1;
        if self.pc >= self.code.len() {
            return Err(ContractError::InvalidProgramCounter);
        }

        Ok(self.code[self.pc])
    }
}

/// Errors that can occur during contract execution
#[derive(Debug, thiserror::Error)]
pub enum ContractError {
    #[error("Stack underflow")]
    StackUnderflow,

    #[error("Invalid opcode: {0}")]
    InvalidOpcode(u8),

    #[error("Invalid program counter")]
    InvalidProgramCounter,

    #[error("Division by zero")]
    DivisionByZero,

    #[error("Out of gas")]
    OutOfGas,

    #[error("Contract execution error: {0}")]
    Other(String),
}
```

### Contract Deployment and Execution

Now, let's integrate our VM with the blockchain by adding support for deploying and executing contracts:

```rust
impl BlockchainState {
    // Add to existing BlockchainState implementation

    /// Applies a contract creation transaction
    fn apply_contract_creation(&mut self, tx: &Transaction) -> Result<(), &'static str> {
        let from_balance = self.get_balance(&tx.from);

        // Ensure sufficient balance
        if from_balance < tx.fee {
            return Err("Insufficient balance");
        }

        // Generate contract address (hash of sender + nonce)
        let mut address_data = Vec::new();
        address_data.extend_from_slice(tx.from.as_bytes());
        address_data.extend_from_slice(&tx.nonce.to_le_bytes());
        let contract_hash = hash_data(&address_data);
        let contract_address = hash_to_hex(&contract_hash);

        // Create a new contract
        let contract = SmartContract {
            code: tx.data.clone(),
            storage: HashMap::new(),
        };

        // Add contract to state
        self.add_contract(&contract_address, contract);

        // Update balance and nonce
        self.set_balance(&tx.from, from_balance - tx.fee);
        self.increment_nonce(&tx.from);

        Ok(())
    }

    /// Applies a contract execution transaction
    fn apply_contract_execution(&mut self, tx: &Transaction) -> Result<(), &'static str> {
        let from_balance = self.get_balance(&tx.from);
        let contract_address = tx.to.as_ref().ok_or("Missing contract address")?;

        // Ensure sufficient balance
        if from_balance < tx.amount + tx.fee {
            return Err("Insufficient balance");
        }

        // Get the contract
        let contract = match self.get_contract(contract_address) {
            Some(c) => c,
            None => return Err("Contract not found"),
        };

        // Clone contract storage for execution
        let storage = contract.storage.iter()
            .map(|(k, v)| {
                let value = match v {
                    // Convert stored bytes to VM values
                    // This is a simplification; real systems would need
                    // more sophisticated serialization
                    [1, rest @ ..] => Value::Int(i64::from_le_bytes([rest[0], rest[1], rest[2], rest[3], rest[4], rest[5], rest[6], rest[7]])),
                    [2, rest @ ..] => Value::Bool(rest[0] != 0),
                    [3, rest @ ..] => Value::Address(String::from_utf8_lossy(rest).to_string()),
                    _ => Value::Bytes(v.clone()),
                }
                (k.clone(), value)
            })
            .collect();

        // Create dummy block header for execution context
        // In a real implementation, we would use the actual current block
        let block_header = BlockHeader {
            version: 1,
            previous_hash: [0; 32],
            merkle_root: [0; 32],
            timestamp: Utc::now(),
            height: 0,
            difficulty: 0,
            nonce: 0,
        };

        // Create and execute VM
        let mut vm = VirtualMachine::new(
            contract.code.clone(),
            storage,
            tx.clone(),
            block_header,
            100000, // Gas limit
        );

        // Execute the contract
        let result = match vm.execute() {
            Ok(_) => {
                // Update contract storage
                let mut new_storage = HashMap::new();
                for (k, v) in vm.context.storage {
                    // Serialize VM values to bytes for storage
                    // This is a simplification; real systems would need
                    // more sophisticated serialization
                    let bytes = match v {
                        Value::Int(i) => {
                            let mut b = vec![1];
                            b.extend_from_slice(&i.to_le_bytes());
                            b
                        },
                        Value::Bool(b) => {
                            vec![2, if b { 1 } else { 0 }]
                        },
                        Value::Address(a) => {
                            let mut b = vec![3];
                            b.extend_from_slice(a.as_bytes());
                            b
                        },
                        Value::Bytes(b) => b,
                    };
                    new_storage.insert(k, bytes);
                }

                // Update contract
                let mut new_contract = contract.clone();
                new_contract.storage = new_storage;
                self.add_contract(contract_address, new_contract);

                Ok(())
            },
            Err(e) => Err(match e {
                ContractError::OutOfGas => "Out of gas",
                _ => "Contract execution failed",
            }),
        };

        // Always update sender's balance for the fee, regardless of execution success
        self.set_balance(&tx.from, from_balance - tx.fee);

        // If execution was successful, transfer the amount
        if result.is_ok() && tx.amount > 0 {
            // Transfer amount to contract
            self.set_balance(&tx.from, from_balance - tx.amount - tx.fee);
            let contract_balance = self.get_balance(contract_address);
            self.set_balance(contract_address, contract_balance + tx.amount);
        }

        // Update nonce
        self.increment_nonce(&tx.from);

        result
    }
}
```

### Simple Contract Example

Let's see how we can write and deploy a simple token contract using our VM:

```rust
/// Assembles a simple token contract
pub fn create_token_contract(initial_supply: u64, owner_address: &str) -> Vec<u8> {
    // This is a very simplified token contract that supports:
    // - Checking the total supply
    // - Checking an address's balance
    // - Transferring tokens

    // The first byte in the call data determines the function:
    // 0x01: totalSupply() -> returns the total supply
    // 0x02: balanceOf(address) -> returns the balance of an address
    // 0x03: transfer(address, amount) -> transfers tokens

    let mut code = Vec::new();

    // Initialize storage:
    // key 0x00: total supply
    // key 0x01: owner's address
    // keys 0x02...: balances (address -> amount)

    // Store total supply
    code.extend_from_slice(&[
        OpCode::PUSH as u8, (initial_supply & 0xFF) as u8,
        OpCode::PUSH as u8, 0x00, // key for total supply
        OpCode::STORE as u8,
    ]);

    // Store owner's initial balance
    code.extend_from_slice(&[
        OpCode::PUSH as u8, (initial_supply & 0xFF) as u8,
        OpCode::PUSH as u8, 0x02, // key prefix for balances
        // In a real implementation, we would properly hash the address
        OpCode::STORE as u8,
    ]);

    // Jump to the function selector
    code.extend_from_slice(&[
        OpCode::PUSH as u8, 0x20, // Destination
        OpCode::JUMP as u8,
    ]);

    // Function selector (at position 0x20)
    code.extend_from_slice(&[
        // Load the first byte of call data to determine function
        OpCode::PUSH as u8, 0x00,
        OpCode::LOAD as u8,

        // Compare with each function ID
        OpCode::DUP as u8,
        OpCode::PUSH as u8, 0x01, // totalSupply
        OpCode::EQ as u8,
        OpCode::PUSH as u8, 0x30, // Jump to totalSupply if match
        OpCode::JUMPI as u8,

        OpCode::DUP as u8,
        OpCode::PUSH as u8, 0x02, // balanceOf
        OpCode::EQ as u8,
        OpCode::PUSH as u8, 0x40, // Jump to balanceOf if match
        OpCode::JUMPI as u8,

        OpCode::DUP as u8,
        OpCode::PUSH as u8, 0x03, // transfer
        OpCode::EQ as u8,
        OpCode::PUSH as u8, 0x50, // Jump to transfer if match
        OpCode::JUMPI as u8,

        // Invalid function, return 0
        OpCode::PUSH as u8, 0x00,
        OpCode::RETURN as u8,
    ]);

    // totalSupply function (at position 0x30)
    code.extend_from_slice(&[
        OpCode::PUSH as u8, 0x00, // key for total supply
        OpCode::LOAD as u8,
        OpCode::RETURN as u8,
    ]);

    // balanceOf function (at position 0x40)
    code.extend_from_slice(&[
        OpCode::PUSH as u8, 0x01, // Get address parameter from call data
        OpCode::LOAD as u8,
        OpCode::PUSH as u8, 0x02, // key prefix for balances
        OpCode::ADD as u8, // Combine to get storage key
        OpCode::LOAD as u8,
        OpCode::RETURN as u8,
    ]);

    // transfer function (at position 0x50)
    code.extend_from_slice(&[
        // Load sender address from transaction context
        OpCode::PUSH as u8, 0xFF, // Special key for sender
        OpCode::LOAD as u8,

        // Load sender's balance
        OpCode::PUSH as u8, 0x02, // key prefix for balances
        OpCode::ADD as u8,
        OpCode::LOAD as u8,

        // Load transfer amount from call data
        OpCode::PUSH as u8, 0x02,
        OpCode::LOAD as u8,

        // Check if sender has enough balance
        OpCode::DUP as u8,
        OpCode::DUP as u8,
        OpCode::LT as u8,
        OpCode::PUSH as u8, 0x90, // Jump to failure if insufficient
        OpCode::JUMPI as u8,

        // Subtract amount from sender's balance
        OpCode::SUB as u8,

        // Store updated sender balance
        OpCode::DUP as u8,
        OpCode::PUSH as u8, 0xFF, // Get sender again
        OpCode::LOAD as u8,
        OpCode::PUSH as u8, 0x02, // key prefix for balances
        OpCode::ADD as u8,
        OpCode::SWAP as u8,
        OpCode::STORE as u8,

        // Add amount to recipient's balance
        OpCode::PUSH as u8, 0x01, // Get recipient from call data
        OpCode::LOAD as u8,
        OpCode::PUSH as u8, 0x02, // key prefix for balances
        OpCode::ADD as u8,
        OpCode::DUP as u8,
        OpCode::LOAD as u8, // Current recipient balance
        OpCode::PUSH as u8, 0x02, // Get amount again
        OpCode::LOAD as u8,
        OpCode::ADD as u8, // Add to recipient balance
        OpCode::SWAP as u8,
        OpCode::STORE as u8,

        // Success
        OpCode::PUSH as u8, 0x01,
        OpCode::RETURN as u8,

        // Failure (at position 0x90)
        OpCode::PUSH as u8, 0x00,
        OpCode::RETURN as u8,
    ]);

    code
}
```

### User Interface for Contracts

Finally, let's create a simple interface for users to interact with contracts:

```rust
/// Creates a new token contract with the given parameters
pub fn deploy_token_contract(
    blockchain: &mut Blockchain,
    wallet: &CryptoWallet,
    initial_supply: u64,
    gas_price: u64,
) -> Result<String, Box<dyn std::error::Error>> {
    // Generate contract bytecode
    let wallet_address = generate_address(&wallet.public_key());
    let bytecode = create_token_contract(initial_supply, &wallet_address);

    // Create a transaction to deploy the contract
    let nonce = blockchain.state.get_nonce(&wallet_address);
    let mut tx = Transaction::new(
        TransactionType::ContractCreation,
        wallet_address.clone(),
        None, // No recipient for contract creation
        0,    // No value transfer
        gas_price,
        bytecode,
        nonce,
    );

    // Sign the transaction
    tx.sign(wallet)?;

    // Add to blockchain
    blockchain.add_transaction(tx)?;

    // Generate contract address
    let mut address_data = Vec::new();
    address_data.extend_from_slice(wallet_address.as_bytes());
    address_data.extend_from_slice(&nonce.to_le_bytes());
    let contract_hash = hash_data(&address_data);
    let contract_address = hash_to_hex(&contract_hash);

    Ok(contract_address)
}

/// Calls a method on a token contract
pub fn call_token_contract(
    blockchain: &mut Blockchain,
    wallet: &CryptoWallet,
    contract_address: &str,
    method: &str,
    params: &[Value],
    amount: u64,
    gas_price: u64,
) -> Result<(), Box<dyn std::error::Error>> {
    // Encode the method call
    let mut call_data = Vec::new();

    match method {
        "totalSupply" => {
            call_data.push(0x01); // Function ID
        },
        "balanceOf" => {
            call_data.push(0x02); // Function ID

            // Encode address parameter
            if let Some(Value::Address(addr)) = params.get(0) {
                call_data.extend_from_slice(addr.as_bytes());
            } else {
                return Err("Invalid parameters for balanceOf".into());
            }
        },
        "transfer" => {
            call_data.push(0x03); // Function ID

            // Encode recipient address
            if let Some(Value::Address(addr)) = params.get(0) {
                call_data.extend_from_slice(addr.as_bytes());
            } else {
                return Err("Invalid recipient for transfer".into());
            }

            // Encode amount
            if let Some(Value::Int(amount)) = params.get(1) {
                call_data.extend_from_slice(&amount.to_le_bytes());
            } else {
                return Err("Invalid amount for transfer".into());
            }
        },
        _ => return Err(format!("Unknown method: {}", method).into()),
    }

    // Create the transaction
    let wallet_address = generate_address(&wallet.public_key());
    let nonce = blockchain.state.get_nonce(&wallet_address);

    let mut tx = Transaction::new(
        TransactionType::ContractExecution,
        wallet_address,
        Some(contract_address.to_string()),
        amount,
        gas_price,
        call_data,
        nonce,
    );

    // Sign the transaction
    tx.sign(wallet)?;

    // Add to blockchain
    blockchain.add_transaction(tx)?;

    Ok(())
}
```

Our smart contract system provides a foundation for building decentralized applications on RustChain. While simplified compared to production systems like Ethereum, it demonstrates the core concepts of smart contract deployment and execution.

In the next section, we'll build a command-line interface and web API to make it easy for users to interact with our blockchain.

## User Interfaces

A blockchain is only as useful as its interfaces. Let's implement both a command-line interface (CLI) and a RESTful API to make our blockchain accessible to users and applications.

### Command-Line Interface

We'll use the `clap` crate to build a robust CLI:

```rust
use clap::{Parser, Subcommand};
use std::path::PathBuf;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    /// Data directory for blockchain storage
    #[arg(short, long, value_name = "DIR", default_value = "./blockchain_data")]
    data_dir: PathBuf,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Start a blockchain node
    Node {
        /// Address to listen on
        #[arg(short, long, default_value = "127.0.0.1:8000")]
        listen: String,

        /// Seed peers to connect to
        #[arg(short, long)]
        peers: Vec<String>,
    },

    /// Generate a new wallet
    Wallet {
        /// Path to save the wallet
        #[arg(short, long)]
        output: Option<PathBuf>,
    },

    /// Get wallet information
    WalletInfo {
        /// Path to the wallet file
        #[arg(short, long)]
        wallet: PathBuf,
    },

    /// Send tokens to an address
    Send {
        /// Path to sender's wallet file
        #[arg(short, long)]
        from: PathBuf,

        /// Recipient's address
        #[arg(short, long)]
        to: String,

        /// Amount to send
        #[arg(short, long)]
        amount: u64,

        /// Transaction fee
        #[arg(short, long, default_value_t = 1)]
        fee: u64,
    },

    /// Deploy a smart contract
    DeployContract {
        /// Path to deployer's wallet file
        #[arg(short, long)]
        wallet: PathBuf,

        /// Path to contract bytecode file
        #[arg(short, long)]
        bytecode: PathBuf,

        /// Transaction fee
        #[arg(short, long, default_value_t = 10)]
        fee: u64,
    },

    /// Call a smart contract method
    CallContract {
        /// Path to caller's wallet file
        #[arg(short, long)]
        wallet: PathBuf,

        /// Contract address
        #[arg(short, long)]
        contract: String,

        /// Method to call
        #[arg(short, long)]
        method: String,

        /// Method parameters (JSON formatted)
        #[arg(short, long)]
        params: Option<String>,

        /// Amount to send with the call
        #[arg(short, long, default_value_t = 0)]
        amount: u64,

        /// Transaction fee
        #[arg(short, long, default_value_t = 5)]
        fee: u64,
    },

    /// Query blockchain state
    Query {
        #[command(subcommand)]
        query_type: QueryCommands,
    },
}

#[derive(Subcommand)]
enum QueryCommands {
    /// Get balance of an address
    Balance {
        /// Address to query
        address: String,
    },

    /// Get block by height or hash
    Block {
        /// Block height or hash
        identifier: String,
    },

    /// Get transaction details
    Transaction {
        /// Transaction ID
        id: String,
    },

    /// List latest blocks
    LatestBlocks {
        /// Number of blocks to return
        #[arg(short, long, default_value_t = 10)]
        limit: usize,
    },

    /// List pending transactions
    PendingTransactions {
        /// Number of transactions to return
        #[arg(short, long, default_value_t = 10)]
        limit: usize,
    },
}

/// Main entry point for the CLI application
pub fn run_cli() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    // Create data directory if it doesn't exist
    std::fs::create_dir_all(&cli.data_dir)?;

    match &cli.command {
        Commands::Node { listen, peers } => {
            println!("Starting blockchain node on {}", listen);

            // Initialize blockchain
            let blockchain_path = cli.data_dir.join("blockchain.dat");
            let blockchain = if blockchain_path.exists() {
                println!("Loading existing blockchain...");
                load_blockchain(blockchain_path.to_str().unwrap())?
            } else {
                println!("Creating new blockchain...");
                Blockchain::new()
            };

            // Start the node
            let runtime = tokio::runtime::Runtime::new()?;
            runtime.block_on(async {
                run_node(listen, peers.clone(), cli.data_dir.to_str().unwrap()).await
            })?;
        },

        Commands::Wallet { output } => {
            // Generate a new wallet
            let wallet = CryptoWallet::new();
            let address = generate_address(&wallet.public_key());

            // Serialize the wallet
            let secret_key = wallet.keypair.secret.as_bytes();

            // Save or display the wallet
            let output_path = output.clone().unwrap_or_else(|| {
                cli.data_dir.join(format!("wallet_{}.key", &address[0..8]))
            });

            std::fs::write(&output_path, secret_key)?;

            println!("Created new wallet:");
            println!("Address: {}", address);
            println!("Private key saved to: {}", output_path.display());
        },

        Commands::WalletInfo { wallet } => {
            // Load the wallet
            let key_data = std::fs::read(wallet)?;
            let wallet = CryptoWallet::from_secret(&key_data)?;
            let address = generate_address(&wallet.public_key());

            println!("Wallet information:");
            println!("Address: {}", address);
            println!("Public key: {}", hex::encode(wallet.public_key()));
        },

        Commands::Send { from, to, amount, fee } => {
            // Load wallet and blockchain
            let key_data = std::fs::read(from)?;
            let wallet = CryptoWallet::from_secret(&key_data)?;
            let from_address = generate_address(&wallet.public_key());

            let blockchain_path = cli.data_dir.join("blockchain.dat");
            let mut blockchain = load_blockchain(blockchain_path.to_str().unwrap())?;

            // Create and sign transaction
            let nonce = blockchain.state.get_nonce(&from_address);
            let mut tx = Transaction::new(
                TransactionType::Transfer,
                from_address,
                Some(to.clone()),
                *amount,
                *fee,
                Vec::new(), // No data for simple transfers
                nonce,
            );

            tx.sign(&wallet)?;

            // Add to blockchain
            blockchain.add_transaction(tx)?;

            // Save blockchain
            save_blockchain(&blockchain, blockchain_path.to_str().unwrap())?;

            println!("Transaction sent successfully!");
            println!("From: {}", from_address);
            println!("To: {}", to);
            println!("Amount: {}", amount);
            println!("Fee: {}", fee);
        },

        Commands::DeployContract { wallet, bytecode, fee } => {
            // Load wallet, contract bytecode, and blockchain
            let key_data = std::fs::read(wallet)?;
            let wallet = CryptoWallet::from_secret(&key_data)?;
            let from_address = generate_address(&wallet.public_key());

            let contract_code = std::fs::read(bytecode)?;

            let blockchain_path = cli.data_dir.join("blockchain.dat");
            let mut blockchain = load_blockchain(blockchain_path.to_str().unwrap())?;

            // Deploy contract
            let contract_address = deploy_token_contract(
                &mut blockchain,
                &wallet,
                100000, // Initial supply (simplified example)
                *fee,
            )?;

            // Save blockchain
            save_blockchain(&blockchain, blockchain_path.to_str().unwrap())?;

            println!("Contract deployed successfully!");
            println!("Contract address: {}", contract_address);
        },

        Commands::CallContract { wallet, contract, method, params, amount, fee } => {
            // Load wallet and blockchain
            let key_data = std::fs::read(wallet)?;
            let wallet = CryptoWallet::from_secret(&key_data)?;

            let blockchain_path = cli.data_dir.join("blockchain.dat");
            let mut blockchain = load_blockchain(blockchain_path.to_str().unwrap())?;

            // Parse parameters
            let call_params = match params {
                Some(json_params) => {
                    // Parse JSON params (simplified)
                    vec![Value::Int(0)] // Placeholder
                },
                None => Vec::new(),
            };

            // Call contract
            call_token_contract(
                &mut blockchain,
                &wallet,
                contract,
                method,
                &call_params,
                *amount,
                *fee,
            )?;

            // Save blockchain
            save_blockchain(&blockchain, blockchain_path.to_str().unwrap())?;

            println!("Contract method called successfully!");
        },

        Commands::Query { query_type } => {
            // Load blockchain
            let blockchain_path = cli.data_dir.join("blockchain.dat");
            let blockchain = load_blockchain(blockchain_path.to_str().unwrap())?;

            match query_type {
                QueryCommands::Balance { address } => {
                    let balance = blockchain.state.get_balance(address);
                    println!("Balance of {}: {} coins", address, balance);
                },

                QueryCommands::Block { identifier } => {
                    // Check if identifier is a height or hash
                    if let Ok(height) = identifier.parse::<u64>() {
                        if let Some(block) = blockchain.get_block_by_height(height) {
                            println!("Block #{}: {}", height, hash_to_hex(&block.hash()));
                            println!("Timestamp: {}", block.header.timestamp);
                            println!("Transactions: {}", block.transactions.len());
                        } else {
                            println!("Block not found at height {}", height);
                        }
                    } else {
                        // Try to parse as hash
                        // This is a simplified example, real implementation would parse hex
                        println!("Block lookup by hash not implemented in this example");
                    }
                },

                QueryCommands::Transaction { id } => {
                    println!("Transaction lookup not implemented in this example");
                },

                QueryCommands::LatestBlocks { limit } => {
                    let chain_height = blockchain.latest_block().header.height;

                    println!("Latest blocks:");
                    for h in (0..=chain_height).rev().take(*limit) {
                        if let Some(block) = blockchain.get_block_by_height(h) {
                            println!("#{}: {} (txs: {})",
                                h,
                                hash_to_hex(&block.hash())[0..10].to_string(),
                                block.transactions.len()
                            );
                        }
                    }
                },

                QueryCommands::PendingTransactions { limit } => {
                    println!("Pending transaction query not implemented in this example");
                }
            }
        }
    }

    Ok(())
}
```

### RESTful API

For applications that need to interact with our blockchain programmatically, we'll implement a RESTful API using the Actix Web framework:

```rust
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use serde::{Serialize, Deserialize};
use std::sync::{Arc, Mutex};

/// Request to send tokens
#[derive(Deserialize)]
struct SendRequest {
    from_key: String,
    to_address: String,
    amount: u64,
    fee: u64,
}

/// Request to deploy a contract
#[derive(Deserialize)]
struct DeployContractRequest {
    from_key: String,
    bytecode: String,
    initial_supply: u64,
    fee: u64,
}

/// Request to call a contract
#[derive(Deserialize)]
struct CallContractRequest {
    from_key: String,
    contract_address: String,
    method: String,
    params: Vec<serde_json::Value>,
    amount: u64,
    fee: u64,
}

/// Response with transaction information
#[derive(Serialize)]
struct TransactionResponse {
    id: String,
    status: String,
}

/// Runs the blockchain API server
pub async fn run_api_server(
    blockchain: Blockchain,
    bind_address: &str,
) -> std::io::Result<()> {
    // Wrap blockchain in Arc<Mutex<>> for thread safety
    let blockchain = Arc::new(Mutex::new(blockchain));

    println!("Starting API server on {}", bind_address);

    HttpServer::new(move || {
        let blockchain = blockchain.clone();

        App::new()
            .app_data(web::Data::new(blockchain.clone()))

            // Query endpoints
            .route("/blocks/latest", web::get().to(get_latest_block))
            .route("/blocks/{id}", web::get().to(get_block))
            .route("/transactions/{id}", web::get().to(get_transaction))
            .route("/address/{address}/balance", web::get().to(get_balance))

            // Action endpoints
            .route("/transactions/send", web::post().to(send_transaction))
            .route("/contracts/deploy", web::post().to(deploy_contract))
            .route("/contracts/call", web::post().to(call_contract))
    })
    .bind(bind_address)?
    .run()
    .await
}

/// Gets the latest block
async fn get_latest_block(
    blockchain: web::Data<Arc<Mutex<Blockchain>>>,
) -> impl Responder {
    let blockchain = blockchain.lock().unwrap();
    let block = blockchain.latest_block().clone();

    // Convert block to JSON response
    HttpResponse::Ok().json(block)
}

/// Gets a block by ID (height or hash)
async fn get_block(
    blockchain: web::Data<Arc<Mutex<Blockchain>>>,
    path: web::Path<String>,
) -> impl Responder {
    let id = path.into_inner();
    let blockchain = blockchain.lock().unwrap();

    // Try parsing as height first
    if let Ok(height) = id.parse::<u64>() {
        if let Some(block) = blockchain.get_block_by_height(height) {
            return HttpResponse::Ok().json(block.clone());
        }
    }

    // Otherwise try as hash (simplified)
    HttpResponse::NotFound().body("Block not found")
}

/// Gets a transaction by ID
async fn get_transaction(
    blockchain: web::Data<Arc<Mutex<Blockchain>>>,
    path: web::Path<String>,
) -> impl Responder {
    // In a real implementation, we would search the blockchain for the transaction
    HttpResponse::NotFound().body("Transaction lookup not implemented in this example")
}

/// Gets the balance of an address
async fn get_balance(
    blockchain: web::Data<Arc<Mutex<Blockchain>>>,
    path: web::Path<String>,
) -> impl Responder {
    let address = path.into_inner();
    let blockchain = blockchain.lock().unwrap();

    let balance = blockchain.state.get_balance(&address);

    HttpResponse::Ok().json(balance)
}

/// Sends a transaction
async fn send_transaction(
    blockchain: web::Data<Arc<Mutex<Blockchain>>>,
    req: web::Json<SendRequest>,
) -> impl Responder {
    // Parse private key
    let key_data = match hex::decode(&req.from_key) {
        Ok(data) => data,
        Err(_) => return HttpResponse::BadRequest().body("Invalid private key format"),
    };

    // Create wallet
    let wallet = match CryptoWallet::from_secret(&key_data) {
        Ok(wallet) => wallet,
        Err(e) => return HttpResponse::BadRequest().body(format!("Invalid private key: {}", e)),
    };

    let from_address = generate_address(&wallet.public_key());

    // Create transaction
    let mut blockchain_guard = blockchain.lock().unwrap();
    let nonce = blockchain_guard.state.get_nonce(&from_address);

    let mut tx = Transaction::new(
        TransactionType::Transfer,
        from_address,
        Some(req.to_address.clone()),
        req.amount,
        req.fee,
        Vec::new(),
        nonce,
    );

    // Sign transaction
    if let Err(e) = tx.sign(&wallet) {
        return HttpResponse::InternalServerError().body(format!("Signing error: {}", e));
    }

    // Add to blockchain
    if let Err(e) = blockchain_guard.add_transaction(tx.clone()) {
        return HttpResponse::BadRequest().body(format!("Transaction error: {:?}", e));
    }

    // Return success response
    let response = TransactionResponse {
        id: hash_to_hex(&tx.id),
        status: "pending".to_string(),
    };

    HttpResponse::Ok().json(response)
}

/// Deploys a smart contract
async fn deploy_contract(
    blockchain: web::Data<Arc<Mutex<Blockchain>>>,
    req: web::Json<DeployContractRequest>,
) -> impl Responder {
    // Parse private key
    let key_data = match hex::decode(&req.from_key) {
        Ok(data) => data,
        Err(_) => return HttpResponse::BadRequest().body("Invalid private key format"),
    };

    // Create wallet
    let wallet = match CryptoWallet::from_secret(&key_data) {
        Ok(wallet) => wallet,
        Err(e) => return HttpResponse::BadRequest().body(format!("Invalid private key: {}", e)),
    };

    // Parse bytecode
    let bytecode = match hex::decode(&req.bytecode) {
        Ok(data) => data,
        Err(_) => return HttpResponse::BadRequest().body("Invalid bytecode format"),
    };

    // Deploy contract
    let mut blockchain_guard = blockchain.lock().unwrap();
    let from_address = generate_address(&wallet.public_key());
    let nonce = blockchain_guard.state.get_nonce(&from_address);

    // Create contract deployment transaction
    let mut tx = Transaction::new(
        TransactionType::ContractCreation,
        from_address,
        None,
        0,
        req.fee,
        bytecode,
        nonce,
    );

    // Sign transaction
    if let Err(e) = tx.sign(&wallet) {
        return HttpResponse::InternalServerError().body(format!("Signing error: {}", e));
    }

    // Add to blockchain
    if let Err(e) = blockchain_guard.add_transaction(tx.clone()) {
        return HttpResponse::BadRequest().body(format!("Transaction error: {:?}", e));
    }

    // Generate contract address
    let mut address_data = Vec::new();
    address_data.extend_from_slice(from_address.as_bytes());
    address_data.extend_from_slice(&nonce.to_le_bytes());
    let contract_hash = hash_data(&address_data);
    let contract_address = hash_to_hex(&contract_hash);

    // Return success response with contract address
    let response = serde_json::json!({
        "transaction_id": hash_to_hex(&tx.id),
        "contract_address": contract_address,
        "status": "pending"
    });

    HttpResponse::Ok().json(response)
}

/// Calls a smart contract method
async fn call_contract(
    blockchain: web::Data<Arc<Mutex<Blockchain>>>,
    req: web::Json<CallContractRequest>,
) -> impl Responder {
    // Parse private key
    let key_data = match hex::decode(&req.from_key) {
        Ok(data) => data,
        Err(_) => return HttpResponse::BadRequest().body("Invalid private key format"),
    };

    // Create wallet
    let wallet = match CryptoWallet::from_secret(&key_data) {
        Ok(wallet) => wallet,
        Err(e) => return HttpResponse::BadRequest().body(format!("Invalid private key: {}", e)),
    };

    // Convert parameters (simplified)
    let call_params: Vec<Value> = Vec::new(); // Placeholder

    // Encode method call
    let mut call_data = Vec::new();
    match req.method.as_str() {
        "totalSupply" => {
            call_data.push(0x01);
        },
        "balanceOf" => {
            call_data.push(0x02);
            // In a real implementation, we would encode the parameters
        },
        "transfer" => {
            call_data.push(0x03);
            // In a real implementation, we would encode the parameters
        },
        _ => return HttpResponse::BadRequest().body(format!("Unknown method: {}", req.method)),
    }

    // Create transaction
    let mut blockchain_guard = blockchain.lock().unwrap();
    let from_address = generate_address(&wallet.public_key());
    let nonce = blockchain_guard.state.get_nonce(&from_address);

    let mut tx = Transaction::new(
        TransactionType::ContractExecution,
        from_address,
        Some(req.contract_address.clone()),
        req.amount,
        req.fee,
        call_data,
        nonce,
    );

    // Sign transaction
    if let Err(e) = tx.sign(&wallet) {
        return HttpResponse::InternalServerError().body(format!("Signing error: {}", e));
    }

    // Add to blockchain
    if let Err(e) = blockchain_guard.add_transaction(tx.clone()) {
        return HttpResponse::BadRequest().body(format!("Transaction error: {:?}", e));
    }

    // Return success response
    let response = TransactionResponse {
        id: hash_to_hex(&tx.id),
        status: "pending".to_string(),
    };

    HttpResponse::Ok().json(response)
}
```

## Conclusion

In this chapter, we've built a complete blockchain application from scratch using Rust. Our RustChain implementation includes all the essential components of a modern blockchain:

1. **Cryptographic primitives**: Secure hashing, digital signatures, and Merkle trees
2. **Core data structures**: Transactions, blocks, and the blockchain itself
3. **Consensus mechanism**: A proof-of-work system for securing the network
4. **Peer-to-peer networking**: Node discovery, transaction propagation, and blockchain synchronization
5. **Smart contract system**: A virtual machine for executing programmable logic
6. **User interfaces**: Both a command-line interface and RESTful API

While our implementation is simplified compared to production blockchains like Bitcoin and Ethereum, it demonstrates all the core concepts and provides a solid foundation for understanding blockchain technology.

### Further Exploration

To continue your blockchain journey, consider exploring these advanced topics:

1. **Alternative consensus mechanisms**: Proof-of-stake, delegated proof-of-stake, and practical Byzantine fault tolerance
2. **Layer 2 scaling solutions**: Payment channels, sidechains, and rollups
3. **Privacy-preserving techniques**: Zero-knowledge proofs, ring signatures, and confidential transactions
4. **Cross-chain interoperability**: Atomic swaps, wrapped tokens, and bridges
5. **Governance mechanisms**: On-chain voting, proposal systems, and treasury management

By building a blockchain from scratch, you've gained valuable insights into the internals of this transformative technology. Whether you're interested in contributing to existing blockchain projects or creating your own, the knowledge and skills you've acquired in this chapter will serve as a strong foundation for your future endeavors in the blockchain space.
