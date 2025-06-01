# Chapter 38: Building a Database

## Introduction

Database systems form the backbone of modern computing, providing reliable, efficient storage and retrieval mechanisms for applications ranging from simple mobile apps to complex distributed systems. While most developers use existing database solutions, understanding how databases work internally provides invaluable insights that can improve database usage, guide system architecture decisions, and reveal opportunities for performance optimization.

In this chapter, we'll explore the art and science of building a database from first principles using Rust. We'll examine key database components—storage engines, query processors, transaction managers, and more—while applying clean code practices, SOLID principles, and effective design patterns. Rust's focus on safety, performance, and fine-grained control makes it particularly well-suited for database implementation, where reliability and efficiency are paramount.

Our exploration will progress from fundamental database concepts to the implementation of a complete embedded key-value store with persistence, ACID compliance, and concurrent access capabilities. Along the way, we'll address the challenges that database developers face and demonstrate how Rust's features help overcome them.

By the end of this chapter, you'll have a deeper understanding of database internals and the skills to implement specialized storage solutions tailored to specific application needs. Whether you're building performance-critical systems, specialized embedded databases, or simply want to understand how the databases you use every day actually work, this chapter will provide the foundation you need.

## Database System Concepts

Before diving into implementation, let's explore the core concepts that underpin all database systems. Understanding these principles will guide our design decisions and help us build a robust database.

### Types of Database Systems

Database systems can be categorized in various ways:

1. **Relational Databases**: Store data in tables with relationships between them (PostgreSQL, MySQL)
2. **Key-Value Stores**: Simple mapping from keys to values (Redis, LevelDB)
3. **Document Databases**: Store semi-structured documents, typically in JSON-like formats (MongoDB, CouchDB)
4. **Column-Family Stores**: Store data in column families optimized for analytics (Cassandra, HBase)
5. **Graph Databases**: Specialize in representing and querying graph structures (Neo4j, ArangoDB)
6. **Time-Series Databases**: Optimized for time-stamped or time-series data (InfluxDB, TimescaleDB)
7. **Object Databases**: Store data as objects, similar to their representation in object-oriented programming

For our implementation, we'll focus on a key-value store, which provides a solid foundation for understanding database internals while remaining manageable in scope.

### Core Database Components

Regardless of type, most databases share these fundamental components:

1. **Storage Engine**: Responsible for persisting data to disk and managing how data is organized in memory and on storage devices
2. **Query Processor**: Parses and executes queries, often involving optimization to improve execution efficiency
3. **Transaction Manager**: Ensures that operations maintain database consistency, even during failures
4. **Buffer Manager**: Manages memory used for caching data pages to reduce disk I/O
5. **Recovery Manager**: Handles database recovery after crashes or failures
6. **Concurrency Control**: Manages concurrent access to ensure consistency when multiple clients interact with the database

### The ACID Properties

ACID properties are a set of guarantees that ensure database transactions are processed reliably:

- **Atomicity**: A transaction is treated as a single, indivisible unit that either succeeds completely or fails completely
- **Consistency**: A transaction can only bring the database from one valid state to another, maintaining all defined rules and constraints
- **Isolation**: Concurrent transactions execute as if they were running sequentially, preventing interference between them
- **Durability**: Once a transaction is committed, its changes persist even in the event of system failures

Implementing these properties involves careful design of transaction processing, logging, and recovery mechanisms.

### Database Storage Structures

Different database systems employ various data structures to organize and index data:

1. **B-Trees and B+Trees**: Balanced tree structures that maintain sorted data and allow efficient searches, insertions, and deletions
2. **LSM Trees (Log-Structured Merge Trees)**: Optimize write operations by batching them together, commonly used in key-value stores
3. **Hash Tables**: Provide O(1) lookup times for exact-match queries but don't support range queries efficiently
4. **Skip Lists**: Probabilistic data structures that offer balanced tree-like performance with simpler implementation
5. **Inverted Indexes**: Map content to locations, essential for text search functionality

The choice of storage structure significantly impacts database performance characteristics and supported operations.

### Design Principles for Our Database

In building our database, we'll adhere to these principles:

1. **Single Responsibility Principle**: Each component should have a single responsibility, making the system easier to maintain and extend
2. **Open/Closed Principle**: Components should be open for extension but closed for modification, allowing us to add features without changing existing code
3. **Liskov Substitution Principle**: Subtypes should be substitutable for their base types, ensuring that our abstractions are sound
4. **Interface Segregation Principle**: Clients should not depend on interfaces they don't use, leading to more focused and cohesive components
5. **Dependency Inversion Principle**: High-level modules should not depend on low-level modules; both should depend on abstractions

These SOLID principles will guide our architecture, resulting in a more maintainable and adaptable codebase.

### Applying Design Patterns

Throughout our implementation, we'll apply relevant design patterns:

1. **Repository Pattern**: To abstract data access and provide a collection-like interface
2. **Strategy Pattern**: For pluggable components like storage engines or concurrency control mechanisms
3. **Factory Pattern**: To create complex objects like transaction contexts
4. **Observer Pattern**: For event notification when data changes
5. **Command Pattern**: To encapsulate operations that can be logged and replayed for recovery
6. **Decorator Pattern**: To add features like caching or compression to storage engines

By explicitly identifying and applying these patterns, we'll create a codebase that's not only functional but also exemplifies good design practices.

Let's now explore each major component of our database system in detail before bringing them together in our project.

## Storage Engines and Data Structures

The storage engine is the heart of any database system. It determines how data is organized, stored, and retrieved, directly affecting performance, reliability, and functionality. Let's explore the design and implementation of a storage engine for our key-value database.

### Storage Engine Architecture

A well-designed storage engine separates concerns into distinct layers:

1. **Interface Layer**: Defines the contract for storage operations through traits
2. **Implementation Layer**: Provides concrete implementations of storage strategies
3. **Persistence Layer**: Handles the actual reading and writing of data to persistent storage
4. **Cache Layer**: Manages in-memory caching to reduce disk I/O

Following the Single Responsibility Principle, we'll design each layer to have a clear, focused purpose.

### Designing a Storage Engine Interface

Let's start by defining the interface for our storage engine using Rust traits:

```rust
use std::error::Error;
use std::fmt::Debug;

/// Key type for our key-value store
pub type Key = Vec<u8>;

/// Value type for our key-value store
pub type Value = Vec<u8>;

/// Result type for storage operations
pub type StorageResult<T> = Result<T, Box<dyn Error + Send + Sync>>;

/// Core trait defining the operations supported by all storage engines
pub trait StorageEngine: Send + Sync + Debug {
    /// Retrieve a value by key
    fn get(&self, key: &Key) -> StorageResult<Option<Value>>;

    /// Store a key-value pair
    fn put(&mut self, key: Key, value: Value) -> StorageResult<()>;

    /// Remove a key-value pair
    fn delete(&mut self, key: &Key) -> StorageResult<()>;

    /// Check if a key exists
    fn contains(&self, key: &Key) -> StorageResult<bool>;

    /// Iterate over all key-value pairs
    fn scan(&self) -> StorageResult<Box<dyn Iterator<Item = (Key, Value)> + '_>>;

    /// Flush any pending changes to persistent storage
    fn flush(&mut self) -> StorageResult<()>;
}
```

This interface follows the Interface Segregation Principle by including only essential methods that all storage engines must implement. It's also generic enough to accommodate different storage strategies.

### Memory-Based Storage Implementation

Let's implement an in-memory storage engine using a `BTreeMap`. This will serve as a simple starting point:

```rust
use std::collections::BTreeMap;
use std::fmt;

/// A simple in-memory storage engine using BTreeMap
#[derive(Default)]
pub struct MemoryStorage {
    data: BTreeMap<Key, Value>,
}

impl MemoryStorage {
    /// Create a new empty memory storage
    pub fn new() -> Self {
        Self {
            data: BTreeMap::new(),
        }
    }
}

impl fmt::Debug for MemoryStorage {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("MemoryStorage")
            .field("entries", &self.data.len())
            .finish()
    }
}

impl StorageEngine for MemoryStorage {
    fn get(&self, key: &Key) -> StorageResult<Option<Value>> {
        Ok(self.data.get(key).cloned())
    }

    fn put(&mut self, key: Key, value: Value) -> StorageResult<()> {
        self.data.insert(key, value);
        Ok(())
    }

    fn delete(&mut self, key: &Key) -> StorageResult<()> {
        self.data.remove(key);
        Ok(())
    }

    fn contains(&self, key: &Key) -> StorageResult<bool> {
        Ok(self.data.contains_key(key))
    }

    fn scan(&self) -> StorageResult<Box<dyn Iterator<Item = (Key, Value)> + '_>> {
        let iter = self.data.clone().into_iter();
        Ok(Box::new(iter))
    }

    fn flush(&mut self) -> StorageResult<()> {
        // No-op for memory storage
        Ok(())
    }
}
```

This implementation follows the Strategy Pattern, providing a concrete strategy for in-memory storage.

### Persistent Storage with Log-Structured Merge Trees

For persistent storage, we'll implement a Log-Structured Merge (LSM) Tree, a data structure optimized for write-heavy workloads. LSM trees batch writes in memory and periodically merge them to disk, providing a good balance of read and write performance.

The key components of our LSM-based storage engine will include:

1. **MemTable**: An in-memory sorted structure (like a B-Tree) for recent writes
2. **Write-Ahead Log (WAL)**: A sequential log recording all operations for durability
3. **SSTable (Sorted String Table)**: Immutable files storing sorted key-value pairs on disk
4. **Compaction Process**: Background merging of SSTables to reclaim space and improve read performance

Here's a simplified implementation of an LSM storage engine:

```rust
use std::fs::{File, OpenOptions};
use std::io::{self, BufReader, BufWriter, Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};
use std::fmt;

/// Entry in the write-ahead log
#[derive(Debug, Clone)]
enum LogEntry {
    Put(Key, Value),
    Delete(Key),
}

/// LSM-based persistent storage engine
pub struct LsmStorage {
    // In-memory table for recent writes
    memtable: RwLock<BTreeMap<Key, Option<Value>>>,

    // Path for persistent storage
    data_path: PathBuf,

    // Write-ahead log file
    wal: Arc<Mutex<BufWriter<File>>>,

    // Immutable disk tables
    sstables: RwLock<Vec<SSTable>>,
}

/// Sorted String Table - immutable sorted key-value pairs on disk
struct SSTable {
    file_path: PathBuf,
    // Index mapping keys to file positions (would be a more sophisticated structure in practice)
    index: BTreeMap<Key, u64>,
}

impl LsmStorage {
    /// Create a new LSM storage at the specified path
    pub fn new<P: AsRef<Path>>(path: P) -> StorageResult<Self> {
        let data_path = path.as_ref().to_path_buf();

        // Create directory if it doesn't exist
        std::fs::create_dir_all(&data_path)?;

        // Create or open write-ahead log
        let wal_path = data_path.join("wal.log");
        let wal_file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&wal_path)?;

        let wal = Arc::new(Mutex::new(BufWriter::new(wal_file)));

        // Initialize empty memtable and sstables
        let storage = Self {
            memtable: RwLock::new(BTreeMap::new()),
            data_path,
            wal,
            sstables: RwLock::new(Vec::new()),
        };

        // Recover from existing WAL if any
        storage.recover_from_wal()?;

        Ok(storage)
    }

    /// Recover the memtable state from the write-ahead log
    fn recover_from_wal(&self) -> StorageResult<()> {
        let wal_path = self.data_path.join("wal.log");

        if !wal_path.exists() {
            return Ok(());
        }

        let file = File::open(&wal_path)?;
        let mut reader = BufReader::new(file);
        let mut buffer = Vec::new();

        // Read the entire WAL file
        reader.read_to_end(&mut buffer)?;

        // If empty, nothing to recover
        if buffer.is_empty() {
            return Ok(());
        }

        // Parse entries and apply to memtable
        // This is a simplified version; a real implementation would use a proper serialization format
        let mut memtable = self.memtable.write().map_err(|_| io::Error::new(
            io::ErrorKind::Other,
            "Failed to acquire write lock on memtable",
        ))?;

        // In a real implementation, we would deserialize the log entries here
        // and apply them to the memtable

        Ok(())
    }

    /// Flush the memtable to disk as a new SSTable
    fn flush_memtable_to_disk(&self) -> StorageResult<()> {
        let mut memtable = self.memtable.write().map_err(|_| io::Error::new(
            io::ErrorKind::Other,
            "Failed to acquire write lock on memtable",
        ))?;

        if memtable.is_empty() {
            return Ok(());
        }

        // Create a new SSTable file
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)?
            .as_secs();

        let sstable_path = self.data_path.join(format!("sstable_{}.db", timestamp));
        let mut sstable_file = BufWriter::new(File::create(&sstable_path)?);

        // Build index while writing data
        let mut index = BTreeMap::new();

        for (key, value_opt) in memtable.iter() {
            if let Some(value) = value_opt {
                // Record position in file
                let pos = sstable_file.seek(SeekFrom::Current(0))?;
                index.insert(key.clone(), pos);

                // Write key length, key, value length, value
                // This is a simplified format; real implementations would use more efficient encodings
                sstable_file.write_all(&(key.len() as u32).to_le_bytes())?;
                sstable_file.write_all(key)?;
                sstable_file.write_all(&(value.len() as u32).to_le_bytes())?;
                sstable_file.write_all(value)?;
            }
        }

        sstable_file.flush()?;

        // Add the new SSTable to our list
        let sstable = SSTable {
            file_path: sstable_path,
            index,
        };

        let mut sstables = self.sstables.write().map_err(|_| io::Error::new(
            io::ErrorKind::Other,
            "Failed to acquire write lock on sstables",
        ))?;

        sstables.push(sstable);

        // Clear the memtable and WAL
        memtable.clear();

        // Truncate WAL file
        let wal_path = self.data_path.join("wal.log");
        let wal_file = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(&wal_path)?;

        *self.wal.lock().map_err(|_| io::Error::new(
            io::ErrorKind::Other,
            "Failed to acquire lock on WAL",
        ))? = BufWriter::new(wal_file);

        Ok(())
    }

    /// Write an entry to the WAL
    fn write_to_wal(&self, entry: &LogEntry) -> StorageResult<()> {
        let mut wal = self.wal.lock().map_err(|_| io::Error::new(
            io::ErrorKind::Other,
            "Failed to acquire lock on WAL",
        ))?;

        // In a real implementation, we would serialize the entry properly
        // This is a simplified placeholder
        match entry {
            LogEntry::Put(key, value) => {
                wal.write_all(b"PUT")?;
                wal.write_all(&(key.len() as u32).to_le_bytes())?;
                wal.write_all(key)?;
                wal.write_all(&(value.len() as u32).to_le_bytes())?;
                wal.write_all(value)?;
            }
            LogEntry::Delete(key) => {
                wal.write_all(b"DEL")?;
                wal.write_all(&(key.len() as u32).to_le_bytes())?;
                wal.write_all(key)?;
            }
        }

        wal.flush()?;
        Ok(())
    }
}

impl fmt::Debug for LsmStorage {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("LsmStorage")
            .field("data_path", &self.data_path)
            .finish()
    }
}

impl StorageEngine for LsmStorage {
    fn get(&self, key: &Key) -> StorageResult<Option<Value>> {
        // First check the memtable
        let memtable = self.memtable.read().map_err(|_| io::Error::new(
            io::ErrorKind::Other,
            "Failed to acquire read lock on memtable",
        ))?;

        if let Some(value_opt) = memtable.get(key) {
            return Ok(value_opt.clone());
        }

        // Then check SSTables in reverse chronological order (newest first)
        let sstables = self.sstables.read().map_err(|_| io::Error::new(
            io::ErrorKind::Other,
            "Failed to acquire read lock on sstables",
        ))?;

        for sstable in sstables.iter().rev() {
            if let Some(&pos) = sstable.index.get(key) {
                let mut file = BufReader::new(File::open(&sstable.file_path)?);
                file.seek(SeekFrom::Start(pos))?;

                // Read key length and skip the key
                let mut len_buf = [0u8; 4];
                file.read_exact(&mut len_buf)?;
                let key_len = u32::from_le_bytes(len_buf) as usize;
                file.seek(SeekFrom::Current(key_len as i64))?;

                // Read value length and value
                file.read_exact(&mut len_buf)?;
                let value_len = u32::from_le_bytes(len_buf) as usize;

                let mut value = vec![0; value_len];
                file.read_exact(&mut value)?;

                return Ok(Some(value));
            }
        }

        // Key not found
        Ok(None)
    }

    fn put(&mut self, key: Key, value: Value) -> StorageResult<()> {
        // Log the operation
        self.write_to_wal(&LogEntry::Put(key.clone(), value.clone()))?;

        // Update memtable
        let mut memtable = self.memtable.write().map_err(|_| io::Error::new(
            io::ErrorKind::Other,
            "Failed to acquire write lock on memtable",
        ))?;

        memtable.insert(key, Some(value));

        // Check if memtable size exceeds threshold and flush if needed
        // This is a simplified check; real implementations would use byte size
        if memtable.len() > 1000 {
            drop(memtable); // Release lock before flushing
            self.flush_memtable_to_disk()?;
        }

        Ok(())
    }

    fn delete(&mut self, key: &Key) -> StorageResult<()> {
        // Log the operation
        self.write_to_wal(&LogEntry::Delete(key.clone()))?;

        // Update memtable with a tombstone (None value)
        let mut memtable = self.memtable.write().map_err(|_| io::Error::new(
            io::ErrorKind::Other,
            "Failed to acquire write lock on memtable",
        ))?;

        memtable.insert(key.clone(), None);

        Ok(())
    }

    fn contains(&self, key: &Key) -> StorageResult<bool> {
        Ok(self.get(key)?.is_some())
    }

    fn scan(&self) -> StorageResult<Box<dyn Iterator<Item = (Key, Value)> + '_>> {
        // This is a simplified implementation that only scans the memtable
        // A real implementation would merge iterators from memtable and SSTables
        let memtable = self.memtable.read().map_err(|_| io::Error::new(
            io::ErrorKind::Other,
            "Failed to acquire read lock on memtable",
        ))?;

        let iter = memtable
            .clone()
            .into_iter()
            .filter_map(|(k, v_opt)| v_opt.map(|v| (k, v)));

        Ok(Box::new(iter))
    }

    fn flush(&mut self) -> StorageResult<()> {
        self.flush_memtable_to_disk()
    }
}
```

This implementation applies several design patterns:

1. **Strategy Pattern**: Different storage engine implementations (memory vs. LSM) can be used interchangeably
2. **Repository Pattern**: The storage engine provides a collection-like interface for key-value pairs
3. **Decorator Pattern**: Could be extended with decorators for features like compression or encryption

### B-Tree Based Storage

Another common approach is to use B-Trees or B+Trees for storage. These balanced tree structures maintain sorted data and support efficient searches, insertions, and deletions.

The key difference from LSM trees is that B-Trees update data in-place rather than using the log-structured approach. This can provide faster reads but potentially slower writes, especially in write-heavy workloads.

A simplified B-Tree storage engine would include:

1. **B-Tree Structure**: A balanced tree where each node contains multiple keys and values
2. **Paging System**: Managing fixed-size pages on disk
3. **Cache Manager**: Keeping frequently accessed pages in memory
4. **Transaction Log**: Ensuring durability of operations

The Factory Pattern would be ideal for creating different storage engines based on configuration:

```rust
/// Factory for creating storage engines
pub struct StorageEngineFactory;

impl StorageEngineFactory {
    /// Create a storage engine based on type and configuration
    pub fn create(engine_type: &str, config: &StorageConfig) -> StorageResult<Box<dyn StorageEngine>> {
        match engine_type {
            "memory" => Ok(Box::new(MemoryStorage::new())),
            "lsm" => Ok(Box::new(LsmStorage::new(&config.data_path)?)),
            "btree" => Ok(Box::new(BTreeStorage::new(&config.data_path)?)),
            _ => Err(format!("Unknown storage engine type: {}", engine_type).into()),
        }
    }
}

/// Configuration for storage engines
pub struct StorageConfig {
    pub data_path: PathBuf,
    pub cache_size_mb: usize,
    pub flush_threshold: usize,
    // Other configuration options...
}
```

This factory adheres to the Open/Closed Principle by allowing new storage engine types to be added without modifying client code.

### Comparing Storage Strategies

Different storage strategies offer different performance characteristics:

| Strategy   | Read Performance | Write Performance | Space Efficiency | Implementation Complexity |
| ---------- | ---------------- | ----------------- | ---------------- | ------------------------- |
| Hash Table | O(1) average     | O(1) average      | Medium           | Low                       |
| B-Tree     | O(log n)         | O(log n)          | High for reads   | Medium                    |
| LSM Tree   | O(log n)         | O(1) amortized    | High for writes  | High                      |
| Skip List  | O(log n) average | O(log n) average  | Medium           | Low                       |

The choice depends on your specific requirements:

- For read-heavy workloads, B-Trees often perform better
- For write-heavy workloads, LSM trees typically excel
- For simplicity and moderate performance, skip lists are worth considering
- For in-memory databases with exact-match queries, hash tables are often optimal

By implementing our storage engine as a trait, we gain the flexibility to swap implementations based on workload characteristics—an excellent example of the Strategy Pattern in action.

## Query Processing and Optimization

In a database system, query processing transforms user requests into efficient execution plans that retrieve or manipulate data. For our key-value database, query processing is relatively straightforward compared to relational databases, but we still need to design a clean, extensible system that can efficiently handle different types of operations.

### Query Interface Design

Let's define a query interface that abstracts operations on our key-value store. We'll use the Command Pattern to encapsulate different query types:

```rust
/// Represents a query result
pub type QueryResult = Result<QueryResponse, QueryError>;

/// Possible query responses
#[derive(Debug, Clone)]
pub enum QueryResponse {
    /// Response to a Get query
    Value(Option<Value>),

    /// Response to a Put query
    Inserted,

    /// Response to a Delete query
    Deleted,

    /// Response to a Scan query
    KeyValues(Vec<(Key, Value)>),

    /// Generic success response
    Success,
}

/// Query error types
#[derive(Debug, thiserror::Error)]
pub enum QueryError {
    #[error("Storage error: {0}")]
    Storage(String),

    #[error("Invalid query: {0}")]
    InvalidQuery(String),

    #[error("Query execution error: {0}")]
    Execution(String),

    #[error("Transaction error: {0}")]
    Transaction(String),
}

impl From<Box<dyn Error + Send + Sync>> for QueryError {
    fn from(err: Box<dyn Error + Send + Sync>) -> Self {
        QueryError::Storage(err.to_string())
    }
}

/// Trait representing a database query
pub trait Query: Send + Sync + Debug {
    /// Execute the query against a storage engine
    fn execute(&self, storage: &mut dyn StorageEngine) -> QueryResult;

    /// Get a query identifier for logging and monitoring
    fn id(&self) -> &str;

    /// Estimate the cost of executing this query (for optimization)
    fn estimate_cost(&self) -> usize {
        // Default implementation returns a high cost
        1000
    }
}

/// Get query
#[derive(Debug)]
pub struct GetQuery {
    id: String,
    key: Key,
}

impl GetQuery {
    pub fn new(key: Key) -> Self {
        Self {
            id: format!("get-{}", uuid::Uuid::new_v4()),
            key,
        }
    }
}

impl Query for GetQuery {
    fn execute(&self, storage: &mut dyn StorageEngine) -> QueryResult {
        let result = storage.get(&self.key)?;
        Ok(QueryResponse::Value(result))
    }

    fn id(&self) -> &str {
        &self.id
    }

    fn estimate_cost(&self) -> usize {
        // Get queries are usually fast
        10
    }
}

/// Put query
#[derive(Debug)]
pub struct PutQuery {
    id: String,
    key: Key,
    value: Value,
}

impl PutQuery {
    pub fn new(key: Key, value: Value) -> Self {
        Self {
            id: format!("put-{}", uuid::Uuid::new_v4()),
            key,
            value,
        }
    }
}

impl Query for PutQuery {
    fn execute(&self, storage: &mut dyn StorageEngine) -> QueryResult {
        storage.put(self.key.clone(), self.value.clone())?;
        Ok(QueryResponse::Inserted)
    }

    fn id(&self) -> &str {
        &self.id
    }

    fn estimate_cost(&self) -> usize {
        // Put operations typically involve disk I/O
        50
    }
}

/// Delete query
#[derive(Debug)]
pub struct DeleteQuery {
    id: String,
    key: Key,
}

impl DeleteQuery {
    pub fn new(key: Key) -> Self {
        Self {
            id: format!("delete-{}", uuid::Uuid::new_v4()),
            key,
        }
    }
}

impl Query for DeleteQuery {
    fn execute(&self, storage: &mut dyn StorageEngine) -> QueryResult {
        storage.delete(&self.key)?;
        Ok(QueryResponse::Deleted)
    }

    fn id(&self) -> &str {
        &self.id
    }

    fn estimate_cost(&self) -> usize {
        // Delete operations are similar to puts
        50
    }
}

/// Scan query with optional range
#[derive(Debug)]
pub struct ScanQuery {
    id: String,
    start_key: Option<Key>,
    end_key: Option<Key>,
    limit: Option<usize>,
}

impl ScanQuery {
    pub fn new() -> Self {
        Self {
            id: format!("scan-{}", uuid::Uuid::new_v4()),
            start_key: None,
            end_key: None,
            limit: None,
        }
    }

    pub fn with_start(mut self, start_key: Key) -> Self {
        self.start_key = Some(start_key);
        self
    }

    pub fn with_end(mut self, end_key: Key) -> Self {
        self.end_key = Some(end_key);
        self
    }

    pub fn with_limit(mut self, limit: usize) -> Self {
        self.limit = Some(limit);
        self
    }
}

impl Query for ScanQuery {
    fn execute(&self, storage: &mut dyn StorageEngine) -> QueryResult {
        let mut results = Vec::new();
        let mut iter = storage.scan()?;

        // Apply start key filter if provided
        if let Some(ref start_key) = self.start_key {
            iter = Box::new(iter.filter(move |(k, _)| k >= start_key));
        }

        // Apply end key filter if provided
        if let Some(ref end_key) = self.end_key {
            iter = Box::new(iter.filter(move |(k, _)| k <= end_key));
        }

        // Collect results, applying limit if needed
        if let Some(limit) = self.limit {
            for (k, v) in iter.take(limit) {
                results.push((k, v));
            }
        } else {
            for (k, v) in iter {
                results.push((k, v));
            }
        }

        Ok(QueryResponse::KeyValues(results))
    }

    fn id(&self) -> &str {
        &self.id
    }

    fn estimate_cost(&self) -> usize {
        // Scans can be expensive, especially without limits
        match self.limit {
            Some(limit) if limit < 100 => 100,
            Some(_) => 500,
            None => 1000,
        }
    }
}
```

The Command Pattern used here provides several benefits:

1. **Encapsulation**: Each query type encapsulates its execution logic
2. **Extensibility**: New query types can be added without modifying existing code
3. **Logging and Metrics**: Query execution can be easily traced and measured
4. **Transaction Support**: Queries can be batched and executed as part of a transaction

### Query Processor

The query processor orchestrates query execution, applying optimizations, handling errors, and managing resources. It serves as a facade for the storage engine:

```rust
/// Processes database queries
pub struct QueryProcessor {
    storage_engine: Box<dyn StorageEngine>,
    stats: QueryStats,
}

/// Statistics for query execution
#[derive(Debug, Default)]
struct QueryStats {
    queries_executed: AtomicUsize,
    query_errors: AtomicUsize,
    total_execution_time: AtomicU64,
}

impl QueryProcessor {
    /// Create a new query processor with the given storage engine
    pub fn new(storage_engine: Box<dyn StorageEngine>) -> Self {
        Self {
            storage_engine,
            stats: QueryStats::default(),
        }
    }

    /// Execute a single query
    pub fn execute_query(&mut self, query: &dyn Query) -> QueryResult {
        let start = Instant::now();
        self.stats.queries_executed.fetch_add(1, Ordering::Relaxed);

        // Log query start
        log::debug!("Executing query: {}", query.id());

        // Execute the query
        let result = match query.execute(&mut *self.storage_engine) {
            Ok(response) => {
                let duration = start.elapsed();
                log::debug!("Query {} completed in {:?}", query.id(), duration);
                self.stats.total_execution_time.fetch_add(
                    duration.as_micros() as u64,
                    Ordering::Relaxed
                );
                Ok(response)
            }
            Err(err) => {
                log::error!("Query {} failed: {:?}", query.id(), err);
                self.stats.query_errors.fetch_add(1, Ordering::Relaxed);
                Err(err)
            }
        };

        result
    }

    /// Execute multiple queries in a batch
    pub fn execute_batch(&mut self, queries: Vec<Box<dyn Query>>) -> Vec<QueryResult> {
        queries.iter().map(|q| self.execute_query(q.as_ref())).collect()
    }

    /// Get query execution statistics
    pub fn get_stats(&self) -> QueryProcessorStats {
        QueryProcessorStats {
            queries_executed: self.stats.queries_executed.load(Ordering::Relaxed),
            query_errors: self.stats.query_errors.load(Ordering::Relaxed),
            avg_execution_time_micros: if self.stats.queries_executed.load(Ordering::Relaxed) > 0 {
                self.stats.total_execution_time.load(Ordering::Relaxed) /
                self.stats.queries_executed.load(Ordering::Relaxed) as u64
            } else {
                0
            },
        }
    }
}

/// Public stats for query processor
#[derive(Debug, Clone, Copy)]
pub struct QueryProcessorStats {
    pub queries_executed: usize,
    pub query_errors: usize,
    pub avg_execution_time_micros: u64,
}
```

This implementation adheres to the Single Responsibility Principle by focusing solely on query execution and monitoring.

### Query Optimization

Although our key-value store has simpler queries than a relational database, we can still apply optimization techniques:

1. **Read Amplification Reduction**: Minimize the number of disk reads needed
2. **Write Batching**: Group multiple writes together for better throughput
3. **Caching**: Keep frequently accessed data in memory
4. **Query Reordering**: Execute independent queries in an optimal order

Let's implement a simple query optimizer:

```rust
/// Optimizes query execution
pub struct QueryOptimizer;

impl QueryOptimizer {
    /// Optimize a batch of queries
    pub fn optimize_batch(queries: Vec<Box<dyn Query>>) -> Vec<Box<dyn Query>> {
        // Group queries by type
        let mut gets = Vec::new();
        let mut puts = Vec::new();
        let mut deletes = Vec::new();
        let mut scans = Vec::new();

        for query in queries {
            match query.as_ref() {
                q if q.id().starts_with("get-") => gets.push(query),
                q if q.id().starts_with("put-") => puts.push(query),
                q if q.id().starts_with("delete-") => deletes.push(query),
                q if q.id().starts_with("scan-") => scans.push(query),
                _ => scans.push(query), // Default case
            }
        }

        // Prioritize gets (usually fastest)
        let mut optimized = Vec::new();
        optimized.extend(gets);

        // Then execute scans (potentially expensive but read-only)
        optimized.extend(scans);

        // Finally, execute writes
        optimized.extend(puts);
        optimized.extend(deletes);

        optimized
    }

    /// Optimize a single query (could add index recommendations, etc.)
    pub fn optimize_query(query: Box<dyn Query>) -> Box<dyn Query> {
        // For now, just return the original query
        // In a more advanced implementation, we might transform the query
        query
    }
}
```

This simple optimizer focuses on query reordering. In a more sophisticated implementation, we might also:

1. **Range Optimization**: If scanning a range, use index statistics to estimate selectivity
2. **Bloom Filter Checks**: For LSM storage, check Bloom filters before disk access
3. **Adaptive Execution**: Adjust query plans based on runtime statistics

### Query Parser

To make our database more user-friendly, let's implement a simple query parser that converts text commands into query objects:

```rust
/// Parses textual queries into query objects
pub struct QueryParser;

impl QueryParser {
    /// Parse a query string into a Query object
    pub fn parse(query_str: &str) -> Result<Box<dyn Query>, QueryError> {
        let parts: Vec<&str> = query_str.trim().split_whitespace().collect();

        if parts.is_empty() {
            return Err(QueryError::InvalidQuery("Empty query".to_string()));
        }

        match parts[0].to_uppercase().as_str() {
            "GET" => {
                if parts.len() < 2 {
                    return Err(QueryError::InvalidQuery("GET requires a key".to_string()));
                }

                Ok(Box::new(GetQuery::new(parts[1].as_bytes().to_vec())))
            }
            "PUT" => {
                if parts.len() < 3 {
                    return Err(QueryError::InvalidQuery("PUT requires a key and value".to_string()));
                }

                Ok(Box::new(PutQuery::new(
                    parts[1].as_bytes().to_vec(),
                    parts[2..].join(" ").as_bytes().to_vec()
                )))
            }
            "DELETE" => {
                if parts.len() < 2 {
                    return Err(QueryError::InvalidQuery("DELETE requires a key".to_string()));
                }

                Ok(Box::new(DeleteQuery::new(parts[1].as_bytes().to_vec())))
            }
            "SCAN" => {
                let mut scan = ScanQuery::new();

                let mut i = 1;
                while i < parts.len() {
                    match parts[i].to_uppercase().as_str() {
                        "START" => {
                            if i + 1 < parts.len() {
                                scan = scan.with_start(parts[i + 1].as_bytes().to_vec());
                                i += 2;
                            } else {
                                return Err(QueryError::InvalidQuery("START requires a key".to_string()));
                            }
                        }
                        "END" => {
                            if i + 1 < parts.len() {
                                scan = scan.with_end(parts[i + 1].as_bytes().to_vec());
                                i += 2;
                            } else {
                                return Err(QueryError::InvalidQuery("END requires a key".to_string()));
                            }
                        }
                        "LIMIT" => {
                            if i + 1 < parts.len() {
                                if let Ok(limit) = parts[i + 1].parse::<usize>() {
                                    scan = scan.with_limit(limit);
                                    i += 2;
                                } else {
                                    return Err(QueryError::InvalidQuery("LIMIT requires a number".to_string()));
                                }
                            } else {
                                return Err(QueryError::InvalidQuery("LIMIT requires a value".to_string()));
                            }
                        }
                        _ => {
                            i += 1;
                        }
                    }
                }

                Ok(Box::new(scan))
            }
            _ => Err(QueryError::InvalidQuery(format!("Unknown command: {}", parts[0])))
        }
    }
}
```

This parser implements a simple command language for our key-value store, demonstrating the Interpreter Pattern for handling user queries.

### Query Execution Pipeline

Putting it all together, we can create a query execution pipeline that processes queries from parsing to execution:

```rust
/// Manages the complete query pipeline from parsing to execution
pub struct QueryEngine {
    processor: QueryProcessor,
}

impl QueryEngine {
    /// Create a new query engine with the given storage engine
    pub fn new(storage_engine: Box<dyn StorageEngine>) -> Self {
        Self {
            processor: QueryProcessor::new(storage_engine),
        }
    }

    /// Execute a query from a string
    pub fn execute(&mut self, query_str: &str) -> QueryResult {
        // Parse the query
        let query = QueryParser::parse(query_str)?;

        // Optimize the query
        let optimized_query = QueryOptimizer::optimize_query(query);

        // Execute the optimized query
        self.processor.execute_query(optimized_query.as_ref())
    }

    /// Execute multiple queries
    pub fn execute_batch(&mut self, query_strings: &[&str]) -> Vec<QueryResult> {
        // Parse all queries
        let queries: Result<Vec<_>, _> = query_strings
            .iter()
            .map(|q| QueryParser::parse(q))
            .collect();

        match queries {
            Ok(queries) => {
                // Optimize the batch
                let optimized = QueryOptimizer::optimize_batch(queries);

                // Execute the optimized batch
                self.processor.execute_batch(optimized)
            }
            Err(err) => vec![Err(err)],
        }
    }

    /// Get statistics about query execution
    pub fn get_stats(&self) -> QueryProcessorStats {
        self.processor.get_stats()
    }
}
```

This query engine demonstrates several design patterns:

1. **Facade Pattern**: Provides a simplified interface to the complex subsystems
2. **Chain of Responsibility**: Queries flow through multiple processing stages
3. **Strategy Pattern**: Different components handle different aspects of query processing
4. **Interpreter Pattern**: The query parser interprets text commands into executable objects
5. **Facade Pattern**: The query engine provides a simplified interface to the complex subsystems

These patterns help create a clean, maintainable architecture that separates concerns and can be extended with new query types and optimizations as needed.

By designing our query system with SOLID principles in mind, we've created a foundation that can evolve to support more complex query types and optimization strategies in the future.

### Testing the Query System

Let's create tests for our query system to ensure it works correctly:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    // Helper function to create a test database
    fn create_test_db() -> QueryEngine {
        let storage = Box::new(MemoryStorage::new());
        QueryEngine::new(storage)
    }

    #[test]
    fn test_basic_operations() {
        let mut db = create_test_db();

        // Put a value
        let result = db.execute("PUT test-key test-value");
        assert!(matches!(result, Ok(QueryResponse::Inserted)));

        // Get the value back
        let result = db.execute("GET test-key");
        assert!(matches!(result, Ok(QueryResponse::Value(Some(_)))));

        if let Ok(QueryResponse::Value(Some(value))) = result {
            assert_eq!(value, "test-value".as_bytes().to_vec());
        }

        // Delete the value
        let result = db.execute("DELETE test-key");
        assert!(matches!(result, Ok(QueryResponse::Deleted)));

        // Verify it's gone
        let result = db.execute("GET test-key");
        assert!(matches!(result, Ok(QueryResponse::Value(None))));
    }

    #[test]
    fn test_scan_operations() {
        let mut db = create_test_db();

        // Insert some test data
        let batch = vec![
            "PUT key1 value1",
            "PUT key2 value2",
            "PUT key3 value3",
            "PUT key4 value4",
            "PUT key5 value5",
        ];

        let results = db.execute_batch(&batch);
        for result in &results {
            assert!(matches!(result, Ok(QueryResponse::Inserted)));
        }

        // Test full scan
        let result = db.execute("SCAN");
        assert!(matches!(result, Ok(QueryResponse::KeyValues(_))));

        if let Ok(QueryResponse::KeyValues(items)) = result {
            assert_eq!(items.len(), 5);
        }

        // Test limited scan
        let result = db.execute("SCAN LIMIT 2");
        if let Ok(QueryResponse::KeyValues(items)) = result {
            assert_eq!(items.len(), 2);
        }

        // Test range scan
        let result = db.execute("SCAN START key2 END key4");
        if let Ok(QueryResponse::KeyValues(items)) = result {
            assert_eq!(items.len(), 3);

            // Verify the keys are in the correct range
            for (key, _) in &items {
                let key_str = String::from_utf8_lossy(key);
                assert!(key_str >= "key2" && key_str <= "key4");
            }
        }
    }
}
```

These tests verify the basic functionality of our query system while demonstrating how clients would interact with it.

### Query System Design Patterns

Our query system implementation demonstrates several important design patterns:

1. **Command Pattern**: Each query type encapsulates an operation on the database
2. **Chain of Responsibility**: Queries flow through multiple processing stages
3. **Strategy Pattern**: Different query types implement different execution strategies
4. **Interpreter Pattern**: The query parser interprets text commands into executable objects
5. **Facade Pattern**: The query engine provides a simplified interface to the complex subsystems

These patterns help create a clean, maintainable architecture that separates concerns and can be extended with new query types and optimizations as needed.

By designing our query system with SOLID principles in mind, we've created a foundation that can evolve to support more complex query types and optimization strategies in the future.

## Implementing ACID Properties

ACID properties—Atomicity, Consistency, Isolation, and Durability—are fundamental guarantees that database transactions must provide. In this section, we'll explore how to implement these properties in our key-value database.

### Atomicity: All or Nothing

Atomicity ensures that each transaction is treated as a single, indivisible unit that either completes entirely or has no effect at all. If any part of a transaction fails, the entire transaction fails, and the database state is left unchanged.

Let's implement a transaction log that enables atomic operations:

```rust
use std::fs::{File, OpenOptions};
use std::io::{self, BufReader, BufWriter, Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

/// Entry in the transaction log
#[derive(Debug, Clone, Serialize, Deserialize)]
enum TransactionLogEntry {
    Begin { tx_id: u64 },
    Write { tx_id: u64, key: Key, value: Option<Value> },
    Commit { tx_id: u64 },
    Abort { tx_id: u64 },
}

/// Transaction log for ensuring atomicity and durability
pub struct TransactionLog {
    // Path to the log file
    log_path: PathBuf,

    // Current log file writer
    writer: Mutex<BufWriter<File>>,

    // Current log file position
    position: AtomicU64,
}

impl TransactionLog {
    /// Create a new transaction log
    pub fn new<P: AsRef<Path>>(path: P) -> io::Result<Self> {
        let log_path = path.as_ref().to_path_buf();

        // Create directory if it doesn't exist
        if let Some(parent) = log_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        // Open or create the log file
        let file = OpenOptions::new()
            .create(true)
            .read(true)
            .write(true)
            .append(true)
            .open(&log_path)?;

        // Get current file length
        let position = file.metadata()?.len();

        Ok(Self {
            log_path,
            writer: Mutex::new(BufWriter::new(file)),
            position: AtomicU64::new(position),
        })
    }

    /// Append an entry to the log
    pub fn append(&self, entry: TransactionLogEntry) -> io::Result<u64> {
        let serialized = bincode::serialize(&entry)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;

        let entry_len = serialized.len() as u32;

        let mut writer = self.writer.lock().unwrap();

        // Write entry length first
        writer.write_all(&entry_len.to_le_bytes())?;

        // Write serialized entry
        writer.write_all(&serialized)?;

        // Flush to ensure durability
        writer.flush()?;

        // Update position and return the entry's position
        let pos = self.position.fetch_add((4 + entry_len as u64), Ordering::SeqCst);

        Ok(pos)
    }

    /// Log a transaction begin
    pub fn log_begin(&self, tx_id: u64) -> io::Result<u64> {
        self.append(TransactionLogEntry::Begin { tx_id })
    }

    /// Log a write operation
    pub fn log_write(&self, tx_id: u64, key: Key, value: Option<Value>) -> io::Result<u64> {
        self.append(TransactionLogEntry::Write { tx_id, key, value })
    }

    /// Log a transaction commit
    pub fn log_commit(&self, tx_id: u64) -> io::Result<u64> {
        self.append(TransactionLogEntry::Commit { tx_id })
    }

    /// Log a transaction abort
    pub fn log_abort(&self, tx_id: u64) -> io::Result<u64> {
        self.append(TransactionLogEntry::Abort { tx_id })
    }

    /// Iterate through log entries
    pub fn iter(&self) -> io::Result<TransactionLogIterator> {
        let file = File::open(&self.log_path)?;
        let reader = BufReader::new(file);

        Ok(TransactionLogIterator {
            reader,
            position: 0,
        })
    }
}

/// Iterator over transaction log entries
pub struct TransactionLogIterator {
    reader: BufReader<File>,
    position: u64,
}

impl Iterator for TransactionLogIterator {
    type Item = io::Result<(u64, TransactionLogEntry)>;

    fn next(&mut self) -> Option<Self::Item> {
        // Read entry length
        let mut len_buf = [0u8; 4];
        match self.reader.read_exact(&mut len_buf) {
            Ok(()) => {},
            Err(e) if e.kind() == io::ErrorKind::UnexpectedEof => return None,
            Err(e) => return Some(Err(e)),
        }

        let entry_len = u32::from_le_bytes(len_buf) as usize;
        let entry_pos = self.position;

        // Read entry data
        let mut entry_data = vec![0u8; entry_len];
        if let Err(e) = self.reader.read_exact(&mut entry_data) {
            return Some(Err(e));
        }

        // Deserialize entry
        let entry = match bincode::deserialize(&entry_data) {
            Ok(entry) => entry,
            Err(e) => return Some(Err(io::Error::new(io::ErrorKind::InvalidData, e))),
        };

        // Update position
        self.position += 4 + entry_len as u64;

        Some(Ok((entry_pos, entry)))
    }
}
```

With this transaction log, we can ensure atomicity by:

1. Logging the beginning of a transaction
2. Logging each write operation before applying it
3. Logging a commit or abort marker
4. During recovery, rolling back any incomplete transactions

### Consistency: Valid State Transitions

Consistency ensures that a transaction can only bring the database from one valid state to another. In our key-value database, we can implement consistency through:

1. **Schema Validation**: Ensuring keys and values conform to expected formats
2. **Constraints**: Enforcing rules on data values
3. **Invariants**: Maintaining relationships between data items

Let's implement a constraint system:

```rust
/// Types of constraints in our database
pub enum Constraint {
    KeyFormat(Regex),
    ValueFormat(Regex),
    ValueLength { min: Option<usize>, max: Option<usize> },
    Custom(Arc<dyn Fn(&Key, &Option<Value>) -> bool + Send + Sync>),
}

/// Constraint validator
pub struct ConstraintValidator {
    constraints: Vec<(String, Constraint)>,
}

impl ConstraintValidator {
    /// Create a new constraint validator
    pub fn new() -> Self {
        Self {
            constraints: Vec::new(),
        }
    }

    /// Add a constraint
    pub fn add_constraint(&mut self, name: String, constraint: Constraint) {
        self.constraints.push((name, constraint));
    }

    /// Validate a key-value pair against all constraints
    pub fn validate(&self, key: &Key, value: &Option<Value>) -> Result<(), String> {
        for (name, constraint) in &self.constraints {
            match constraint {
                Constraint::KeyFormat(regex) => {
                    let key_str = match std::str::from_utf8(key) {
                        Ok(s) => s,
                        Err(_) => return Err(format!("Key is not valid UTF-8 (constraint: {})", name)),
                    };

                    if !regex.is_match(key_str) {
                        return Err(format!("Key format constraint violated: {}", name));
                    }
                },
                Constraint::ValueFormat(regex) => {
                    if let Some(value) = value {
                        let value_str = match std::str::from_utf8(value) {
                            Ok(s) => s,
                            Err(_) => return Err(format!("Value is not valid UTF-8 (constraint: {})", name)),
                        };

                        if !regex.is_match(value_str) {
                            return Err(format!("Value format constraint violated: {}", name));
                        }
                    }
                },
                Constraint::ValueLength { min, max } => {
                    if let Some(value) = value {
                        if let Some(min_len) = min {
                            if value.len() < *min_len {
                                return Err(format!("Value length too short (constraint: {})", name));
                            }
                        }

                        if let Some(max_len) = max {
                            if value.len() > *max_len {
                                return Err(format!("Value length too long (constraint: {})", name));
                            }
                        }
                    }
                },
                Constraint::Custom(func) => {
                    if !func(key, value) {
                        return Err(format!("Custom constraint violated: {}", name));
                    }
                },
            }
        }

        Ok(())
    }
}
```

To ensure consistency, we integrate constraint validation into our transaction system:

```rust
/// Extended transaction with constraint validation
pub struct ValidatedTransaction {
    inner: Transaction,
    validator: Arc<ConstraintValidator>,
}

impl ValidatedTransaction {
    /// Create a new validated transaction
    pub fn new(
        transaction: Transaction,
        validator: Arc<ConstraintValidator>,
    ) -> Self {
        Self {
            inner: transaction,
            validator,
        }
    }

    /// Get a value with the same semantics as the inner transaction
    pub fn get(&mut self, key: &Key) -> Result<Option<Value>, TransactionError> {
        self.inner.get(key)
    }

    /// Put a value, validating constraints first
    pub fn put(&mut self, key: Key, value: Value) -> Result<(), TransactionError> {
        // Validate constraints
        if let Err(constraint_err) = self.validator.validate(&key, &Some(value.clone())) {
            return Err(TransactionError::Constraint(constraint_err));
        }

        // If validation passes, delegate to inner transaction
        self.inner.put(key, value)
    }

    /// Delete a value
    pub fn delete(&mut self, key: &Key) -> Result<(), TransactionError> {
        // Validate deletion (some constraints might prevent deletion)
        if let Err(constraint_err) = self.validator.validate(key, &None) {
            return Err(TransactionError::Constraint(constraint_err));
        }

        // If validation passes, delegate to inner transaction
        self.inner.delete(key)
    }

    /// Commit the transaction
    pub fn commit(self) -> Result<(), TransactionError> {
        self.inner.commit()
    }

    /// Abort the transaction
    pub fn abort(self) {
        self.inner.abort()
    }
}
```

This approach uses the Decorator Pattern to add constraint validation to our transaction system, ensuring consistency.

### Isolation: Concurrent Transaction Protection

Isolation ensures that the execution of transactions concurrently produces the same results as if they were executed sequentially. We've already implemented several concurrency control mechanisms in the previous section, including lock-based, optimistic, and MVCC approaches.

To complete our isolation implementation, let's add support for different isolation levels in our MVCC system:

```rust
/// Implementation of concurrency control using MVCC
pub struct MvccConcurrencyControl {
    mvcc_manager: MvccManager,
    transaction_log: Arc<TransactionLog>,
}

impl MvccConcurrencyControl {
    /// Create a new MVCC-based concurrency control
    pub fn new(
        max_versions_per_key: usize,
        cleanup_interval: Duration,
        transaction_log: Arc<TransactionLog>,
    ) -> Self {
        Self {
            mvcc_manager: MvccManager::new(max_versions_per_key, cleanup_interval),
            transaction_log,
        }
    }
}

impl ConcurrencyControl for MvccConcurrencyControl {
    fn begin_transaction(&self, isolation_level: IsolationLevel) -> (u64, u64) {
        // Start an MVCC transaction
        let (tx_id, version) = self.mvcc_manager.begin_transaction();

        // Log transaction start
        if let Err(e) = self.transaction_log.log_begin(tx_id) {
            log::error!("Failed to log transaction begin: {:?}", e);
        }

        (tx_id, version)
    }

    fn read(&self, tx_id: u64, key: &Key) -> Result<Option<Value>, TransactionError> {
        // Read using MVCC
        Ok(self.mvcc_manager.read(key, tx_id))
    }

    fn write(&self, tx_id: u64, key: &Key, value: Option<Value>) -> Result<(), TransactionError> {
        // Log the write operation
        if let Err(e) = self.transaction_log.log_write(tx_id, key.clone(), value.clone()) {
            log::error!("Failed to log write: {:?}", e);
            return Err(TransactionError::Storage(e.to_string()));
        }

        // Perform the write in MVCC
        self.mvcc_manager.write(key, value, tx_id)
            .map_err(|_| TransactionError::Conflict)
    }

    fn commit(&self, tx_id: u64) -> Result<u64, TransactionError> {
        // Log the commit
        if let Err(e) = self.transaction_log.log_commit(tx_id) {
            log::error!("Failed to log commit: {:?}", e);
            return Err(TransactionError::Storage(e.to_string()));
        }

        // Commit the MVCC transaction
        Ok(self.mvcc_manager.commit_transaction(tx_id))
    }

    fn abort(&self, tx_id: u64) {
        // Log the abort
        if let Err(e) = self.transaction_log.log_abort(tx_id) {
            log::error!("Failed to log abort: {:?}", e);
        }

        // Abort the MVCC transaction
        self.mvcc_manager.abort_transaction(tx_id);
    }
}
```

This implementation combines MVCC with our transaction log to provide both isolation and durability.

### Durability: Persisting Committed Changes

Durability ensures that once a transaction is committed, its changes persist even in the event of system failures. We implement durability through a combination of transaction logging and careful write ordering:

```rust
/// Write-ahead logging for durability
pub struct WALManager {
    transaction_log: Arc<TransactionLog>,
    storage: Arc<dyn StorageEngine>,
}

impl WALManager {
    /// Create a new WAL manager
    pub fn new(transaction_log: Arc<TransactionLog>, storage: Arc<dyn StorageEngine>) -> Self {
        Self {
            transaction_log,
            storage,
        }
    }

    /// Recover the database from the transaction log
    pub fn recover(&self) -> io::Result<()> {
        // Track the state of each transaction
        let mut tx_states = HashMap::new();

        // Track pending writes for each transaction
        let mut pending_writes = HashMap::new();

        // Iterate through the log
        for entry_result in self.transaction_log.iter()? {
            let (_, entry) = entry_result?;

            match entry {
                TransactionLogEntry::Begin { tx_id } => {
                    tx_states.insert(tx_id, false); // Not committed yet
                    pending_writes.insert(tx_id, Vec::new());
                },
                TransactionLogEntry::Write { tx_id, key, value } => {
                    if let Some(writes) = pending_writes.get_mut(&tx_id) {
                        writes.push((key, value));
                    }
                },
                TransactionLogEntry::Commit { tx_id } => {
                    tx_states.insert(tx_id, true); // Committed
                },
                TransactionLogEntry::Abort { tx_id } => {
                    // Remove aborted transaction
                    tx_states.remove(&tx_id);
                    pending_writes.remove(&tx_id);
                },
            }
        }

        // Apply all writes from committed transactions
        for (tx_id, committed) in tx_states {
            if committed {
                if let Some(writes) = pending_writes.get(&tx_id) {
                    for (key, value) in writes {
                        match value {
                            Some(value) => {
                                if let Err(e) = self.storage.put(key.clone(), value.clone()) {
                                    log::error!("Recovery error applying write: {:?}", e);
                                }
                            },
                            None => {
                                if let Err(e) = self.storage.delete(key) {
                                    log::error!("Recovery error applying delete: {:?}", e);
                                }
                            },
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// Checkpoint the database
    pub fn checkpoint(&self) -> io::Result<()> {
        // Flush storage to ensure all data is persisted
        self.storage.flush()?;

        // Create a new transaction log file
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let log_path = self.transaction_log.log_path.with_file_name(
            format!("txn-{}.log", timestamp)
        );

        // Rename the current log file
        std::fs::rename(&self.transaction_log.log_path, log_path)?;

        // Create a new empty log file
        let file = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(&self.transaction_log.log_path)?;

        // Update the transaction log writer
        let mut writer = self.transaction_log.writer.lock().unwrap();
        *writer = BufWriter::new(file);

        // Reset position
        self.transaction_log.position.store(0, Ordering::SeqCst);

        Ok(())
    }
}
```

This WAL (Write-Ahead Logging) implementation ensures durability by:

1. Writing all changes to the transaction log before modifying the actual data
2. During recovery, replaying committed transactions
3. Periodically checkpointing to reduce recovery time

### Bringing ACID Together

To integrate all ACID properties into our database, we need to combine our implementations into a cohesive system:

```rust
/// Database engine with ACID guarantees
pub struct AcidDatabase {
    storage: Arc<dyn StorageEngine>,
    transaction_manager: Arc<TransactionManager>,
    wal_manager: Arc<WALManager>,
    constraint_validator: Arc<ConstraintValidator>,
}

impl AcidDatabase {
    /// Create a new ACID-compliant database
    pub fn new<P: AsRef<Path>>(
        data_path: P,
        engine_type: &str,
        config: StorageConfig,
    ) -> Result<Self, Box<dyn Error + Send + Sync>> {
        // Create storage engine
        let storage = Arc::new(
            StorageEngineFactory::create(engine_type, &config)?
        );

        // Create transaction log
        let log_path = data_path.as_ref().join("transaction.log");
        let transaction_log = Arc::new(TransactionLog::new(log_path)?);

        // Create WAL manager
        let wal_manager = Arc::new(WALManager::new(
            Arc::clone(&transaction_log),
            Arc::clone(&storage),
        ));

        // Create MVCC concurrency control
        let concurrency_control = Arc::new(MvccConcurrencyControl::new(
            10, // max versions per key
            Duration::from_secs(60), // cleanup interval
            Arc::clone(&transaction_log),
        ));

        // Create transaction manager
        let transaction_manager = Arc::new(TransactionManager::new(
            Arc::clone(&storage),
            concurrency_control,
        ));

        // Create constraint validator
        let constraint_validator = Arc::new(ConstraintValidator::new());

        // Recover from any previous crash
        wal_manager.recover()?;

        Ok(Self {
            storage,
            transaction_manager,
            wal_manager,
            constraint_validator,
        })
    }

    /// Begin a new transaction
    pub fn begin_transaction(&self, isolation_level: IsolationLevel) -> ValidatedTransaction {
        let tx = self.transaction_manager.begin_transaction(isolation_level);
        ValidatedTransaction::new(tx, Arc::clone(&self.constraint_validator))
    }

    /// Add a constraint to the database
    pub fn add_constraint(&self, name: String, constraint: Constraint) {
        let mut validator = Arc::get_mut(&mut Arc::clone(&self.constraint_validator)).unwrap();
        validator.add_constraint(name, constraint);
    }

    /// Checkpoint the database
    pub fn checkpoint(&self) -> io::Result<()> {
        self.wal_manager.checkpoint()
    }

    /// Get the number of active transactions
    pub fn active_transaction_count(&self) -> usize {
        self.transaction_manager.active_transaction_count()
    }
}
```

This implementation uses several design patterns:

1. **Facade Pattern**: `AcidDatabase` provides a simplified interface to the complex ACID components
2. **Decorator Pattern**: `ValidatedTransaction` adds constraint validation to transactions
3. **Strategy Pattern**: Different storage engines and concurrency control mechanisms can be swapped
4. **Observer Pattern**: Transaction events are logged and can trigger recovery actions

### Testing ACID Properties

To ensure our ACID implementation works correctly, let's create a comprehensive test suite:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;

    // Set up a test database
    fn setup_test_db() -> AcidDatabase {
        let temp_dir = tempfile::tempdir().unwrap();
        let config = StorageConfig {
            data_path: temp_dir.path().to_path_buf(),
            cache_size_mb: 10,
            flush_threshold: 100,
        };

        AcidDatabase::new(temp_dir.path(), "memory", config).unwrap()
    }

    #[test]
    fn test_atomicity() {
        let db = setup_test_db();

        // Start a transaction
        let mut tx = db.begin_transaction(IsolationLevel::Serializable);

        // Make multiple changes
        tx.put(b"key1".to_vec(), b"value1".to_vec()).unwrap();
        tx.put(b"key2".to_vec(), b"value2".to_vec()).unwrap();

        // Commit the transaction
        tx.commit().unwrap();

        // Start another transaction but abort it
        let mut tx = db.begin_transaction(IsolationLevel::Serializable);
        tx.put(b"key3".to_vec(), b"value3".to_vec()).unwrap();
        tx.abort();

        // Verify results
        let mut tx = db.begin_transaction(IsolationLevel::Serializable);
        assert_eq!(tx.get(&b"key1".to_vec()).unwrap(), Some(b"value1".to_vec()));
        assert_eq!(tx.get(&b"key2".to_vec()).unwrap(), Some(b"value2".to_vec()));
        assert_eq!(tx.get(&b"key3".to_vec()).unwrap(), None); // Aborted, shouldn't exist
    }

    #[test]
    fn test_consistency() {
        let db = setup_test_db();

        // Add a constraint: keys must be alphanumeric
        db.add_constraint(
            "alphanumeric_keys".to_string(),
            Constraint::KeyFormat(regex::Regex::new(r"^[a-zA-Z0-9]+$").unwrap()),
        );

        // Valid transaction
        let mut tx = db.begin_transaction(IsolationLevel::Serializable);
        tx.put(b"validkey".to_vec(), b"value".to_vec()).unwrap();
        tx.commit().unwrap();

        // Invalid transaction
        let mut tx = db.begin_transaction(IsolationLevel::Serializable);
        let result = tx.put(b"invalid-key".to_vec(), b"value".to_vec());

        // Should fail due to constraint violation
        assert!(matches!(result, Err(TransactionError::Constraint(_))));
    }

    #[test]
    fn test_isolation() {
        let db = Arc::new(setup_test_db());

        // Initial data
        let mut tx = db.begin_transaction(IsolationLevel::Serializable);
        tx.put(b"key".to_vec(), b"initial".to_vec()).unwrap();
        tx.commit().unwrap();

        // Start a long-running transaction
        let db_clone = Arc::clone(&db);
        let t1 = thread::spawn(move || {
            let mut tx = db_clone.begin_transaction(IsolationLevel::Serializable);

            // Read initial value
            let value1 = tx.get(&b"key".to_vec()).unwrap();

            // Sleep to simulate long transaction
            thread::sleep(Duration::from_millis(100));

            // Read again - should be the same in serializable isolation
            let value2 = tx.get(&b"key".to_vec()).unwrap();

            // Commit
            tx.commit().unwrap();

            (value1, value2)
        });

        // Concurrent transaction
        let db_clone = Arc::clone(&db);
        let t2 = thread::spawn(move || {
            // Sleep briefly to ensure t1 starts first
            thread::sleep(Duration::from_millis(10));

            let mut tx = db_clone.begin_transaction(IsolationLevel::Serializable);
            tx.put(b"key".to_vec(), b"updated".to_vec()).unwrap();
            tx.commit().unwrap();
        });

        // Wait for both threads
        let (value1, value2) = t1.join().unwrap();
        t2.join().unwrap();

        // Both reads should see the initial value due to serializable isolation
        assert_eq!(value1, Some(b"initial".to_vec()));
        assert_eq!(value2, Some(b"initial".to_vec()));

        // After both transactions, value should be updated
        let mut tx = db.begin_transaction(IsolationLevel::Serializable);
        assert_eq!(tx.get(&b"key".to_vec()).unwrap(), Some(b"updated".to_vec()));
    }

    #[test]
    fn test_durability() {
        // Create database in a persistent location
        let temp_dir = tempfile::tempdir().unwrap();
        let db_path = temp_dir.path();

        let config = StorageConfig {
            data_path: db_path.to_path_buf(),
            cache_size_mb: 10,
            flush_threshold: 100,
        };

        // Write data
        {
            let db = AcidDatabase::new(db_path, "lsm", config.clone()).unwrap();

            let mut tx = db.begin_transaction(IsolationLevel::Serializable);
            tx.put(b"durable".to_vec(), b"value".to_vec()).unwrap();
            tx.commit().unwrap();

            // Checkpoint to ensure durability
            db.checkpoint().unwrap();
        }

        // Reopen database and verify data
        {
            let db = AcidDatabase::new(db_path, "lsm", config).unwrap();

            let mut tx = db.begin_transaction(IsolationLevel::Serializable);
            assert_eq!(tx.get(&b"durable".to_vec()).unwrap(), Some(b"value".to_vec()));
        }
    }
}
```

These tests verify that our database correctly implements all ACID properties.

### ACID Tradeoffs and Configuration

Different applications have different ACID requirements. Some need strict consistency guarantees, while others prioritize performance. Our implementation allows for configuration of these tradeoffs:

1. **Isolation Level**: Configurable from Read Uncommitted to Serializable
2. **Durability Settings**: Control when data is synced to disk
3. **Consistency Constraints**: Add or remove constraints based on application needs
4. **Concurrency Control Mechanism**: Choose between locking, OCC, or MVCC

By applying design patterns like Strategy and Factory, our database can be adapted to different workload requirements without changing its core structure.

Our ACID implementation demonstrates several key principles:

1. **Separation of Concerns**: Each ACID property is handled by specialized components
2. **Defense in Depth**: Multiple mechanisms work together to ensure data integrity
3. **Clear Interfaces**: Well-defined boundaries between components
4. **Configurability**: Tunable parameters for different requirements

These principles align with SOLID design, creating a database system that is both robust and flexible.

## Buffer Management

In database systems, buffer management is responsible for efficiently handling the transfer of data between disk and memory. A well-designed buffer manager minimizes disk I/O, which is typically the most significant performance bottleneck in database operations.

### The Buffer Pool

The core component of buffer management is the buffer pool, which caches recently accessed data pages in memory:

```rust
use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, Mutex, RwLock};

/// A page identifier, consisting of file ID and page number
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct PageId {
    file_id: u32,
    page_num: u32,
}

/// A fixed-size page of data
#[derive(Debug, Clone)]
pub struct Page {
    id: PageId,
    data: Vec<u8>,
    dirty: bool,
}

/// Buffer pool for caching pages in memory
pub struct BufferPool {
    // Fixed size of each page in bytes
    page_size: usize,

    // Maximum number of pages in the pool
    capacity: usize,

    // Current pages in the pool, keyed by PageId
    pages: RwLock<HashMap<PageId, Arc<RwLock<Page>>>>,

    // LRU queue for eviction policy
    lru_queue: Mutex<VecDeque<PageId>>,

    // Storage backend for reading/writing pages
    storage: Arc<dyn Storage>,
}

/// Storage interface for reading and writing pages
pub trait Storage: Send + Sync {
    fn read_page(&self, page_id: PageId) -> io::Result<Vec<u8>>;
    fn write_page(&self, page_id: PageId, data: &[u8]) -> io::Result<()>;
    fn sync(&self) -> io::Result<()>;
}

impl BufferPool {
    /// Create a new buffer pool
    pub fn new(
        capacity: usize,
        page_size: usize,
        storage: Arc<dyn Storage>,
    ) -> Self {
        Self {
            page_size,
            capacity,
            pages: RwLock::new(HashMap::with_capacity(capacity)),
            lru_queue: Mutex::new(VecDeque::with_capacity(capacity)),
            storage,
        }
    }

    /// Get a page from the buffer pool, loading it from disk if necessary
    pub fn get_page(&self, page_id: PageId) -> io::Result<Arc<RwLock<Page>>> {
        // First check if page is in memory
        {
            let pages = self.pages.read().unwrap();
            if let Some(page) = pages.get(&page_id) {
                // Update LRU queue
                let mut lru = self.lru_queue.lock().unwrap();
                if let Some(pos) = lru.iter().position(|&id| id == page_id) {
                    lru.remove(pos);
                }
                lru.push_back(page_id);

                return Ok(Arc::clone(page));
            }
        }

        // Page not in memory, load it from disk
        let page_data = self.storage.read_page(page_id)?;

        // Create new page
        let page = Arc::new(RwLock::new(Page {
            id: page_id,
            data: page_data,
            dirty: false,
        }));

        // Add to buffer pool and LRU queue
        {
            let mut pages = self.pages.write().unwrap();
            let mut lru = self.lru_queue.lock().unwrap();

            // If at capacity, evict a page
            if pages.len() >= self.capacity {
                if let Some(evict_id) = lru.pop_front() {
                    if let Some(evict_page) = pages.remove(&evict_id) {
                        // If dirty, write back to disk
                        let evict_page = evict_page.read().unwrap();
                        if evict_page.dirty {
                            self.storage.write_page(evict_id, &evict_page.data)?;
                        }
                    }
                }
            }

            // Add new page
            pages.insert(page_id, Arc::clone(&page));
            lru.push_back(page_id);
        }

        Ok(page)
    }

    /// Mark a page as dirty, indicating it needs to be written back to disk
    pub fn mark_dirty(&self, page_id: PageId) -> io::Result<()> {
        let pages = self.pages.read().unwrap();
        if let Some(page) = pages.get(&page_id) {
            let mut page = page.write().unwrap();
            page.dirty = true;
        }
        Ok(())
    }

    /// Flush all dirty pages to disk
    pub fn flush_all(&self) -> io::Result<()> {
        let pages = self.pages.read().unwrap();

        for (_, page) in pages.iter() {
            let page_guard = page.read().unwrap();
            if page_guard.dirty {
                self.storage.write_page(page_guard.id, &page_guard.data)?;

                // Mark as clean
                drop(page_guard);
                let mut page = page.write().unwrap();
                page.dirty = false;
            }
        }

        // Sync storage to ensure durability
        self.storage.sync()?;

        Ok(())
    }
}
```

This buffer pool implementation demonstrates several important design patterns:

1. **LRU Replacement Policy**: Evicts the least recently used pages when the pool is full
2. **Write-Back Caching**: Marks pages as dirty and only writes them to disk when necessary
3. **Double-Buffering**: Uses RwLock to allow concurrent reads but exclusive writes

### Page Management

On top of the buffer pool, we need a page manager that handles the allocation and tracking of pages:

```rust
/// Manages pages and their allocation
pub struct PageManager {
    buffer_pool: Arc<BufferPool>,
    free_list: Mutex<Vec<PageId>>,
    metadata_page_id: PageId,
}

impl PageManager {
    /// Create a new page manager
    pub fn new(buffer_pool: Arc<BufferPool>) -> io::Result<Self> {
        // Special page ID for metadata
        let metadata_page_id = PageId {
            file_id: 0,
            page_num: 0,
        };

        // Create or load metadata page
        let metadata_page = buffer_pool.get_page(metadata_page_id)?;

        // Read free list from metadata
        let free_list = {
            let page = metadata_page.read().unwrap();
            if page.data.is_empty() {
                // New database, initialize metadata
                Vec::new()
            } else {
                // Parse free list from metadata page
                deserialize_free_list(&page.data)
            }
        };

        Ok(Self {
            buffer_pool,
            free_list: Mutex::new(free_list),
            metadata_page_id,
        })
    }

    /// Allocate a new page
    pub fn allocate_page(&self) -> io::Result<PageId> {
        let mut free_list = self.free_list.lock().unwrap();

        if let Some(page_id) = free_list.pop() {
            // Reuse a page from the free list
            Ok(page_id)
        } else {
            // Allocate a new page
            // In a real implementation, we would need to track the next available page ID
            let page_id = PageId {
                file_id: 0,
                page_num: generate_next_page_num(),
            };

            // Initialize the page
            let page = self.buffer_pool.get_page(page_id)?;
            {
                let mut page = page.write().unwrap();
                page.data.clear();
                page.data.resize(self.buffer_pool.page_size, 0);
                page.dirty = true;
            }

            // Update metadata
            self.update_metadata()?;

            Ok(page_id)
        }
    }

    /// Free a page, returning it to the free list
    pub fn free_page(&self, page_id: PageId) -> io::Result<()> {
        let mut free_list = self.free_list.lock().unwrap();

        // Add to free list
        free_list.push(page_id);

        // Update metadata
        self.update_metadata()?;

        Ok(())
    }

    /// Update metadata page with current free list
    fn update_metadata(&self) -> io::Result<()> {
        let free_list = self.free_list.lock().unwrap();

        let metadata_page = self.buffer_pool.get_page(self.metadata_page_id)?;
        {
            let mut page = metadata_page.write().unwrap();

            // Serialize free list to page data
            page.data = serialize_free_list(&free_list);
            page.dirty = true;
        }

        Ok(())
    }
}

// Helper functions for serialization/deserialization
fn serialize_free_list(free_list: &[PageId]) -> Vec<u8> {
    // Implementation details omitted for brevity
    vec![]
}

fn deserialize_free_list(data: &[u8]) -> Vec<PageId> {
    // Implementation details omitted for brevity
    vec![]
}

fn generate_next_page_num() -> u32 {
    // Implementation details omitted for brevity
    0
}
```

This page manager implements the Factory Pattern, creating and tracking pages as needed.

### Buffer Management Design Patterns

Our buffer management system demonstrates several important design patterns:

1. **Cache Pattern**: The buffer pool caches frequently accessed pages to improve performance
2. **Factory Pattern**: The page manager creates and manages page objects
3. **Proxy Pattern**: The buffer pool acts as a proxy for the underlying storage
4. **Resource Pool Pattern**: Managing a limited set of resources (memory buffers)

These patterns help create an efficient buffer management system that balances memory usage and disk I/O.

By carefully designing our buffer management system with these patterns, we create a foundation for efficient database operations, minimizing the performance impact of disk access while maintaining data integrity.

## Next Sections

In the next sections, we'll explore index structures for efficient data retrieval, transaction management for ensuring consistency, and recovery mechanisms for handling failures. Finally, we'll build a complete key-value store that integrates all these components.

For now, let's move on to implementing index structures, which are crucial for efficient data access.

## 🔨 Project: Key-value Store - Build a Persistent Key-value Database

In this project, we'll bring together all the concepts we've explored to build RustKV, a persistent key-value database with ACID properties, concurrent access capabilities, and a clean, modular architecture. Our database will follow SOLID principles and use design patterns to create a maintainable, extensible system.

### Project Goals

We aim to build a key-value store with the following features:

1. **Persistence**: Data survives system restarts
2. **ACID Transactions**: Guarantees for atomicity, consistency, isolation, and durability
3. **Concurrent Access**: Multiple clients can use the database simultaneously
4. **Simple API**: Clean, intuitive interface for database operations
5. **Configurability**: Different storage engines and configuration options
6. **Clean Architecture**: Well-structured code following SOLID principles

### Project Structure

Our project will be organized into modules, each with a clear responsibility:

```
rustkv/
├── Cargo.toml
├── src/
│   ├── main.rs            # Command-line interface
│   ├── lib.rs             # Public API
│   ├── storage/           # Storage engines
│   │   ├── mod.rs
│   │   ├── memory.rs      # In-memory storage
│   │   ├── lsm.rs         # Log-structured merge tree
│   │   └── btree.rs       # B-tree storage
│   ├── buffer/            # Buffer management
│   │   ├── mod.rs
│   │   ├── buffer_pool.rs
│   │   └── page.rs
│   ├── concurrency/       # Concurrency control
│   │   ├── mod.rs
│   │   ├── lock.rs        # Lock-based concurrency
│   │   ├── mvcc.rs        # Multi-version concurrency
│   │   └── transaction.rs # Transaction management
│   ├── query/             # Query processing
│   │   ├── mod.rs
│   │   ├── parser.rs      # Query parsing
│   │   ├── optimizer.rs   # Query optimization
│   │   └── executor.rs    # Query execution
│   ├── recovery/          # Recovery mechanisms
│   │   ├── mod.rs
│   │   └── wal.rs         # Write-ahead logging
│   └── config.rs          # Configuration
```

### Step 1: Setting Up the Project

First, let's set up our project with the necessary dependencies:

```bash
cargo new rustkv
cd rustkv
```

Update `Cargo.toml`:

```toml
[package]
name = "rustkv"
version = "0.1.0"
edition = "2021"

[dependencies]
# Core functionality
thiserror = "1.0"
bincode = "1.3"
serde = { version = "1.0", features = ["derive"] }
log = "0.4"
env_logger = "0.9"

# Concurrency
parking_lot = "0.12"
crossbeam = "0.8"
tokio = { version = "1.19", features = ["full"] }

# CLI interface
clap = { version = "3.1", features = ["derive"] }

# Utilities
uuid = { version = "1.0", features = ["v4"] }
regex = "1.5"
rand = "0.8"

[dev-dependencies]
tempfile = "3.3"
criterion = "0.3"
```

### Step 2: Defining Core Types and Interfaces

Let's define our core types and interfaces in `lib.rs`:

```rust
//! RustKV: A persistent key-value database with ACID properties.

use std::error::Error;
use std::fmt::Debug;
use std::path::Path;
use std::sync::Arc;

pub mod storage;
pub mod buffer;
pub mod concurrency;
pub mod query;
pub mod recovery;
pub mod config;

/// Key type for the key-value store
pub type Key = Vec<u8>;

/// Value type for the key-value store
pub type Value = Vec<u8>;

/// Result type for database operations
pub type Result<T> = std::result::Result<T, DatabaseError>;

/// Database error types
#[derive(Debug, thiserror::Error)]
pub enum DatabaseError {
    #[error("Storage error: {0}")]
    Storage(String),

    #[error("Transaction error: {0}")]
    Transaction(String),

    #[error("Query error: {0}")]
    Query(String),

    #[error("Constraint violation: {0}")]
    Constraint(String),

    #[error("Concurrency error: {0}")]
    Concurrency(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Configuration error: {0}")]
    Config(String),
}

/// Database configuration
#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    /// Path to database files
    pub data_path: String,

    /// Storage engine type
    pub storage_engine: String,

    /// Maximum cache size in MB
    pub cache_size_mb: usize,

    /// Default isolation level
    pub default_isolation_level: concurrency::IsolationLevel,
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        Self {
            data_path: "data".to_string(),
            storage_engine: "lsm".to_string(),
            cache_size_mb: 64,
            default_isolation_level: concurrency::IsolationLevel::Serializable,
        }
    }
}

/// Primary database interface
pub struct Database {
    engine: Arc<dyn storage::StorageEngine>,
    transaction_manager: Arc<concurrency::TransactionManager>,
    buffer_pool: Arc<buffer::BufferPool>,
    wal_manager: Arc<recovery::WALManager>,
    config: DatabaseConfig,
}

impl Database {
    /// Open a database with the given configuration
    pub fn open(config: DatabaseConfig) -> Result<Self> {
        // Create data directory if it doesn't exist
        std::fs::create_dir_all(&config.data_path)
            .map_err(|e| DatabaseError::Io(e))?;

        // Create buffer pool
        let buffer_pool = Arc::new(buffer::BufferPool::new(
            config.cache_size_mb * 1024 * 1024 / buffer::PAGE_SIZE,
            buffer::PAGE_SIZE,
            Arc::new(storage::FileStorage::new(&config.data_path)?),
        ));

        // Create WAL manager
        let wal_path = Path::new(&config.data_path).join("wal");
        let wal_manager = Arc::new(recovery::WALManager::new(&wal_path)?);

        // Create storage engine based on configuration
        let engine = match config.storage_engine.as_str() {
            "memory" => Arc::new(storage::MemoryStorage::new()) as Arc<dyn storage::StorageEngine>,
            "lsm" => {
                let lsm_path = Path::new(&config.data_path).join("lsm");
                Arc::new(storage::LsmStorage::new(lsm_path, wal_manager.clone())?) as Arc<dyn storage::StorageEngine>
            },
            "btree" => {
                let btree_path = Path::new(&config.data_path).join("btree");
                Arc::new(storage::BTreeStorage::new(
                    btree_path,
                    buffer_pool.clone(),
                )?) as Arc<dyn storage::StorageEngine>
            },
            _ => return Err(DatabaseError::Config(format!("Unknown storage engine: {}", config.storage_engine))),
        };

        // Create transaction manager
        let transaction_manager = Arc::new(concurrency::TransactionManager::new(
            engine.clone(),
            wal_manager.clone(),
        ));

        // Recover database from WAL if needed
        wal_manager.recover(engine.clone())?;

        Ok(Self {
            engine,
            transaction_manager,
            buffer_pool,
            wal_manager,
            config,
        })
    }

    /// Begin a new transaction
    pub fn begin_transaction(&self) -> Result<Transaction> {
        self.begin_transaction_with_isolation(self.config.default_isolation_level)
    }

    /// Begin a new transaction with the specified isolation level
    pub fn begin_transaction_with_isolation(
        &self,
        isolation_level: concurrency::IsolationLevel,
    ) -> Result<Transaction> {
        let tx_id = self.transaction_manager.begin_transaction(isolation_level)
            .map_err(|e| DatabaseError::Transaction(e.to_string()))?;

        Ok(Transaction {
            id: tx_id,
            isolation_level,
            transaction_manager: self.transaction_manager.clone(),
            committed: false,
        })
    }

    /// Flush all pending changes to disk
    pub fn flush(&self) -> Result<()> {
        self.engine.flush().map_err(|e| DatabaseError::Storage(e.to_string()))?;
        self.buffer_pool.flush_all().map_err(DatabaseError::Io)?;
        Ok(())
    }

    /// Close the database
    pub fn close(self) -> Result<()> {
        // Flush any pending changes
        self.flush()?;

        // Create a checkpoint for faster recovery
        self.wal_manager.checkpoint()?;

        Ok(())
    }
}

/// A database transaction
pub struct Transaction {
    id: u64,
    isolation_level: concurrency::IsolationLevel,
    transaction_manager: Arc<concurrency::TransactionManager>,
    committed: bool,
}

impl Transaction {
    /// Get a value by key
    pub fn get(&self, key: &[u8]) -> Result<Option<Value>> {
        self.transaction_manager
            .get(self.id, key)
            .map_err(|e| DatabaseError::Transaction(e.to_string()))
    }

    /// Put a key-value pair
    pub fn put(&self, key: &[u8], value: &[u8]) -> Result<()> {
        self.transaction_manager
            .put(self.id, key, value)
            .map_err(|e| DatabaseError::Transaction(e.to_string()))
    }

    /// Delete a key-value pair
    pub fn delete(&self, key: &[u8]) -> Result<()> {
        self.transaction_manager
            .delete(self.id, key)
            .map_err(|e| DatabaseError::Transaction(e.to_string()))
    }

    /// Commit the transaction
    pub fn commit(mut self) -> Result<()> {
        if self.committed {
            return Err(DatabaseError::Transaction("Transaction already committed".to_string()));
        }

        self.transaction_manager
            .commit(self.id)
            .map_err(|e| DatabaseError::Transaction(e.to_string()))?;

        self.committed = true;
        Ok(())
    }
}

impl Drop for Transaction {
    fn drop(&mut self) {
        if !self.committed {
            // Abort transaction if not committed
            if let Err(e) = self.transaction_manager.abort(self.id) {
                log::error!("Error aborting transaction {}: {}", self.id, e);
            }
        }
    }
}
```

### Step 3: Implementing the Storage Module

Next, let's implement the storage module in `storage/mod.rs`:

```rust
//! Storage engines for the database.

use crate::{Key, Value, Result, DatabaseError};
use std::path::Path;
use std::sync::Arc;

mod memory;
mod lsm;
mod btree;

pub use memory::MemoryStorage;
pub use lsm::LsmStorage;
pub use btree::BTreeStorage;

/// File storage for reading and writing pages
pub struct FileStorage {
    base_path: std::path::PathBuf,
}

impl FileStorage {
    /// Create a new file storage
    pub fn new<P: AsRef<Path>>(base_path: P) -> std::io::Result<Self> {
        let path = base_path.as_ref().to_path_buf();
        std::fs::create_dir_all(&path)?;
        Ok(Self { base_path: path })
    }

    // Implementation details omitted for brevity
}

/// Core interface for storage engines
pub trait StorageEngine: Send + Sync + std::fmt::Debug {
    /// Get a value by key
    fn get(&self, key: &[u8]) -> Result<Option<Value>>;

    /// Put a key-value pair
    fn put(&self, key: &[u8], value: &[u8]) -> Result<()>;

    /// Delete a key-value pair
    fn delete(&self, key: &[u8]) -> Result<()>;

    /// Check if a key exists
    fn contains(&self, key: &[u8]) -> Result<bool>;

    /// Scan all key-value pairs
    fn scan(&self, start: Option<&[u8]>, end: Option<&[u8]>) -> Result<ScanIterator>;

    /// Flush pending changes to disk
    fn flush(&self) -> Result<()>;
}

/// Iterator over key-value pairs
pub struct ScanIterator {
    inner: Box<dyn Iterator<Item = Result<(Key, Value)>> + Send>,
}

impl Iterator for ScanIterator {
    type Item = Result<(Key, Value)>;

    fn next(&mut self) -> Option<Self::Item> {
        self.inner.next()
    }
}
```

### Step 4: Implementing the Command-Line Interface

Finally, let's implement a simple command-line interface in `main.rs`:

```rust
//! Command-line interface for RustKV.

use rustkv::{Database, DatabaseConfig, DatabaseError, Result};
use clap::{Parser, Subcommand};
use std::io::{self, Write};
use std::path::PathBuf;

#[derive(Parser)]
#[clap(author, version, about)]
struct Cli {
    /// Path to database files
    #[clap(short, long, default_value = "data")]
    path: String,

    /// Storage engine to use
    #[clap(short, long, default_value = "lsm")]
    engine: String,

    /// Subcommand to execute
    #[clap(subcommand)]
    command: Option<Command>,
}

#[derive(Subcommand)]
enum Command {
    /// Start an interactive shell
    Shell,

    /// Get a value by key
    Get {
        /// Key to retrieve
        key: String,
    },

    /// Put a key-value pair
    Put {
        /// Key to store
        key: String,

        /// Value to store
        value: String,
    },

    /// Delete a key-value pair
    Delete {
        /// Key to delete
        key: String,
    },
}

fn main() -> Result<()> {
    // Initialize logger
    env_logger::init();

    // Parse command-line arguments
    let cli = Cli::parse();

    // Configure the database
    let config = DatabaseConfig {
        data_path: cli.path.clone(),
        storage_engine: cli.engine.clone(),
        ..Default::default()
    };

    // Open the database
    let db = Database::open(config)?;

    // Process command
    match cli.command {
        Some(Command::Shell) => run_shell(db),
        Some(Command::Get { key }) => {
            let tx = db.begin_transaction()?;
            match tx.get(key.as_bytes())? {
                Some(value) => println!("{}", String::from_utf8_lossy(&value)),
                None => println!("Key not found"),
            }
            tx.commit()?;
            Ok(())
        },
        Some(Command::Put { key, value }) => {
            let tx = db.begin_transaction()?;
            tx.put(key.as_bytes(), value.as_bytes())?;
            tx.commit()?;
            println!("Value stored");
            Ok(())
        },
        Some(Command::Delete { key }) => {
            let tx = db.begin_transaction()?;
            tx.delete(key.as_bytes())?;
            tx.commit()?;
            println!("Key deleted");
            Ok(())
        },
        None => run_shell(db),
    }
}

/// Run an interactive shell
fn run_shell(db: Database) -> Result<()> {
    println!("RustKV shell. Type 'help' for commands, 'exit' to quit.");

    let mut buffer = String::new();
    let stdin = io::stdin();
    let mut stdout = io::stdout();

    loop {
        buffer.clear();

        print!("rustkv> ");
        stdout.flush()?;

        stdin.read_line(&mut buffer)?;
        let input = buffer.trim();

        if input.is_empty() {
            continue;
        }

        let parts: Vec<&str> = input.split_whitespace().collect();
        let command = parts[0].to_lowercase();

        match command.as_str() {
            "exit" | "quit" => break,
            "help" => {
                println!("Commands:");
                println!("  get <key> - Get value for key");
                println!("  put <key> <value> - Store key-value pair");
                println!("  delete <key> - Delete key-value pair");
                println!("  exit - Exit the shell");
                println!("  help - Show this help");
            },
            "get" => {
                if parts.len() < 2 {
                    println!("Usage: get <key>");
                    continue;
                }

                let key = parts[1];
                let tx = db.begin_transaction()?;

                match tx.get(key.as_bytes())? {
                    Some(value) => println!("{}", String::from_utf8_lossy(&value)),
                    None => println!("Key not found"),
                }

                tx.commit()?;
            },
            "put" => {
                if parts.len() < 3 {
                    println!("Usage: put <key> <value>");
                    continue;
                }

                let key = parts[1];
                let value = parts[2..].join(" ");

                let tx = db.begin_transaction()?;
                tx.put(key.as_bytes(), value.as_bytes())?;
                tx.commit()?;

                println!("Value stored");
            },
            "delete" => {
                if parts.len() < 2 {
                    println!("Usage: delete <key>");
                    continue;
                }

                let key = parts[1];
                let tx = db.begin_transaction()?;
                tx.delete(key.as_bytes())?;
                tx.commit()?;

                println!("Key deleted");
            },
            _ => println!("Unknown command: {}. Type 'help' for available commands.", command),
        }
    }

    // Close the database
    db.close()?;

    Ok(())
}
```

### Step 5: Testing the Key-Value Store

Let's create comprehensive tests for our key-value store:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    // Helper function to create a test database
    fn create_test_db() -> Database {
        let temp_dir = tempdir().unwrap();
        let config = DatabaseConfig {
            data_path: temp_dir.path().to_str().unwrap().to_string(),
            storage_engine: "memory".to_string(),
            ..Default::default()
        };

        Database::open(config).unwrap()
    }

    #[test]
    fn test_basic_operations() {
        let db = create_test_db();

        // Put
        let tx = db.begin_transaction().unwrap();
        tx.put(b"key1", b"value1").unwrap();
        tx.commit().unwrap();

        // Get
        let tx = db.begin_transaction().unwrap();
        let value = tx.get(b"key1").unwrap();
        assert_eq!(value, Some(b"value1".to_vec()));
        tx.commit().unwrap();

        // Delete
        let tx = db.begin_transaction().unwrap();
        tx.delete(b"key1").unwrap();
        tx.commit().unwrap();

        // Verify deletion
        let tx = db.begin_transaction().unwrap();
        let value = tx.get(b"key1").unwrap();
        assert_eq!(value, None);
        tx.commit().unwrap();
    }

    #[test]
    fn test_transaction_isolation() {
        let db = create_test_db();

        // Initialize data
        let tx = db.begin_transaction().unwrap();
        tx.put(b"key", b"initial").unwrap();
        tx.commit().unwrap();

        // Start two transactions
        let tx1 = db.begin_transaction().unwrap();
        let tx2 = db.begin_transaction().unwrap();

        // T1 reads key
        let v1 = tx1.get(b"key").unwrap();
        assert_eq!(v1, Some(b"initial".to_vec()));

        // T2 updates key
        tx2.put(b"key", b"updated").unwrap();
        tx2.commit().unwrap();

        // T1 reads key again (should see initial value due to snapshot isolation)
        let v1_again = tx1.get(b"key").unwrap();
        assert_eq!(v1_again, Some(b"initial".to_vec()));

        // T1 commits
        tx1.commit().unwrap();

        // New transaction should see updated value
        let tx3 = db.begin_transaction().unwrap();
        let v3 = tx3.get(b"key").unwrap();
        assert_eq!(v3, Some(b"updated".to_vec()));
        tx3.commit().unwrap();
    }

    #[test]
    fn test_transaction_abort() {
        let db = create_test_db();

        // Put initial value
        let tx = db.begin_transaction().unwrap();
        tx.put(b"key", b"initial").unwrap();
        tx.commit().unwrap();

        // Start a transaction and make changes
        let tx = db.begin_transaction().unwrap();
        tx.put(b"key", b"updated").unwrap();
        tx.put(b"new_key", b"new_value").unwrap();

        // Abort the transaction (explicitly drop without commit)
        drop(tx);

        // Verify changes were not applied
        let tx = db.begin_transaction().unwrap();
        assert_eq!(tx.get(b"key").unwrap(), Some(b"initial".to_vec()));
        assert_eq!(tx.get(b"new_key").unwrap(), None);
        tx.commit().unwrap();
    }

    #[test]
    fn test_persistence() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().to_str().unwrap().to_string();

        // Create and populate database
        {
            let config = DatabaseConfig {
                data_path: db_path.clone(),
                storage_engine: "lsm".to_string(),
                ..Default::default()
            };

            let db = Database::open(config).unwrap();
            let tx = db.begin_transaction().unwrap();
            tx.put(b"persistent", b"value").unwrap();
            tx.commit().unwrap();

            db.close().unwrap();
        }

        // Reopen database and verify data
        {
            let config = DatabaseConfig {
                data_path: db_path,
                storage_engine: "lsm".to_string(),
                ..Default::default()
            };

            let db = Database::open(config).unwrap();
            let tx = db.begin_transaction().unwrap();
            let value = tx.get(b"persistent").unwrap();
            assert_eq!(value, Some(b"value".to_vec()));
            tx.commit().unwrap();
        }
    }
}
```

### Design Patterns in Our Key-Value Store

Our key-value store implementation demonstrates several important design patterns:

1. **Factory Method**: Creating different storage engines based on configuration
2. **Builder Pattern**: Configuring the database with DatabaseConfig
3. **Facade Pattern**: Database class providing a simplified interface
4. **Strategy Pattern**: Swappable storage engines and concurrency control mechanisms
5. **Command Pattern**: Transactions encapsulating operations
6. **Repository Pattern**: Storage engine providing a collection-like interface
7. **Proxy Pattern**: Transaction managing access to the storage engine
8. **Singleton Pattern**: Single instance of components like buffer pool and WAL manager
9. **Decorator Pattern**: Adding validation, logging, and metrics to core components

These patterns help create a clean, maintainable architecture that follows SOLID principles.

### SOLID Principles in Our Implementation

Our implementation follows SOLID principles:

1. **Single Responsibility**: Each module has a clear, focused responsibility
2. **Open/Closed**: New storage engines can be added without modifying existing code
3. **Liskov Substitution**: Storage engines are interchangeable
4. **Interface Segregation**: Clean, focused interfaces for each component
5. **Dependency Inversion**: High-level modules depend on abstractions

### Extending the Key-Value Store

Our key-value store can be extended in several ways:

1. **Performance Optimizations**: Bloom filters, compression, and caching
2. **Additional Features**: TTL (time-to-live), versioning, and replication
3. **Monitoring and Metrics**: Performance monitoring and troubleshooting tools
4. **Client Libraries**: Language-specific client libraries
5. **Distribution**: Distributed consensus and sharding

By following clean architecture principles, we've created a solid foundation that can evolve to meet changing requirements.

## Summary

In this chapter, we've explored the fundamental concepts and components of database systems, focusing on key-value stores. We've learned about storage engines, query processing, concurrency control, ACID properties, buffer management, and more. We've implemented a complete key-value database that demonstrates these concepts while following SOLID principles and using appropriate design patterns.

Key takeaways from this chapter include:

1. **Storage Engine Design**: Different approaches to data storage, including in-memory, LSM trees, and B-trees
2. **Query Processing**: Transforming user requests into efficient execution plans
3. **Concurrency Control**: Ensuring data consistency with multiple clients
4. **ACID Properties**: Implementing atomicity, consistency, isolation, and durability
5. **Buffer Management**: Efficiently managing memory and disk I/O
6. **Clean Architecture**: Applying SOLID principles and design patterns

Building a database from scratch provides deep insights into how these systems work and the tradeoffs involved in their design. The knowledge gained from this exercise can help you make better decisions when using existing databases and potentially implement specialized storage solutions for specific application needs.

## Exercises

1. **Extended Queries**: Add support for range queries and aggregations (count, sum, etc.)
2. **Secondary Indexes**: Implement secondary indexes to speed up queries on non-key fields
3. **Replication**: Add primary-replica replication for high availability
4. **Benchmarking**: Create a benchmark suite to measure performance under different workloads
5. **Client Library**: Implement a client library for a language of your choice (Python, JavaScript, etc.)
6. **Monitoring**: Add monitoring capabilities for tracking performance and resource usage
7. **Compression**: Implement data compression to reduce storage requirements
8. **TTL Support**: Add time-to-live functionality for automatic key expiration
9. **Schema Support**: Extend the key-value store to support simple schemas and validation
10. **CLI Improvements**: Enhance the command-line interface with additional features

## Further Reading

- [Designing Data-Intensive Applications](https://dataintensive.net/) by Martin Kleppmann
- [Database Internals](https://www.databass.dev/) by Alex Petrov
- [The Art of PostgreSQL](https://theartofpostgresql.com/) by Dimitri Fontaine
- [Readings in Database Systems](http://www.redbook.io/) (the "Red Book")
- [Rust-Based Database Libraries and Projects](https://github.com/rust-unofficial/awesome-rust#database-1)
- [LevelDB Documentation](https://github.com/google/leveldb/blob/main/doc/index.md) (a popular LSM-based key-value store)
- [RocksDB Wiki](https://github.com/facebook/rocksdb/wiki) (Facebook's enhancement of LevelDB)
- [SQLite Documentation](https://www.sqlite.org/docs.html) (an embedded relational database)

By applying the principles and patterns learned in this chapter, you can build robust, efficient database systems that meet the needs of modern applications while maintaining clean, maintainable code.
