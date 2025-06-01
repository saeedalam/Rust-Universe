# Chapter 45: Building a Search Engine

## Introduction

Search engines are fundamental tools in our digital lives, enabling us to navigate the vast expanse of information available on the internet. Behind their seemingly simple interfaces lies sophisticated software that crawls, indexes, and retrieves information with remarkable speed and accuracy.

In this chapter, we'll build a production-quality search engine in Rust, leveraging the language's performance, safety, and concurrency features. We'll explore the core components of a search engine: web crawling, text processing, indexing, query processing, and result ranking. Along the way, we'll apply clean code principles, solid architecture design, and efficient algorithms to create a scalable and maintainable system.

By the end of this chapter, you'll have a deep understanding of search engine fundamentals and a working implementation that demonstrates Rust's strengths in building high-performance systems.

## Search Engine Fundamentals

Before diving into implementation, let's understand the key components and concepts behind search engines.

### Search Engine Architecture

A typical search engine consists of several core components:

1. **Crawler**: Systematically visits web pages, extracts their content, and follows links to discover new pages.
2. **Parser**: Processes the crawled content, extracting text, metadata, and links.
3. **Indexer**: Builds an inverted index that maps terms to the documents containing them.
4. **Query Processor**: Interprets user queries and transforms them into a form suitable for searching the index.
5. **Ranker**: Determines the relevance of documents to a query, sorting results accordingly.
6. **User Interface**: Presents search results to users and accepts their queries.

### Inverted Index

The inverted index is the central data structure in a search engine:

```
Term1 -> [Document1, Document3, Document7]
Term2 -> [Document2, Document5]
Term3 -> [Document1, Document4, Document6]
```

For each term (word), the index stores a list of documents containing that term. This allows the search engine to quickly find documents containing specific terms without scanning through all documents.

### Relevance Ranking

When a user searches for "rust programming language," they expect documents about Rust (the programming language) to appear before documents about rust (the chemical process). Ranking algorithms determine this relevance, typically using factors like:

- Term frequency (TF): How often a term appears in a document
- Inverse document frequency (IDF): How rare a term is across all documents
- Document quality or importance (often determined by link analysis)
- Proximity of search terms in the document

## Design Principles

We'll apply several key design principles throughout our implementation:

### Clean Architecture

Our search engine will follow the Clean Architecture pattern, with clear separation between:

1. **Domain Layer**: Core entities and business rules
2. **Use Case Layer**: Application-specific business rules
3. **Interface Adapters**: Gateways, controllers, and presenters
4. **Frameworks & Drivers**: External tools and frameworks

This separation ensures our code is maintainable, testable, and adaptable to changing requirements.

### SOLID Principles

We'll adhere to the SOLID principles:

- **Single Responsibility**: Each component does exactly one thing
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Derived types must be substitutable for their base types
- **Interface Segregation**: Many specific interfaces are better than one general-purpose interface
- **Dependency Inversion**: Depend on abstractions, not concretions

### Concurrency Patterns

Search engines are inherently concurrent systems. We'll use Rust's concurrency features to implement patterns like:

- **Worker Pool**: For parallel crawling and indexing
- **Producer-Consumer**: For processing crawled documents
- **MapReduce**: For distributed indexing tasks

## Project Setup

Let's start by setting up our project structure:

```bash
cargo new rusty_search --lib
cd rusty_search
```

Our project structure will follow a domain-driven design approach:

```
rusty_search/
├── Cargo.toml
├── src/
│   ├── main.rs             # CLI entry point
│   ├── lib.rs              # Library entry point
│   ├── domain/             # Domain models and business rules
│   │   ├── mod.rs
│   │   ├── document.rs
│   │   ├── term.rs
│   │   └── index.rs
│   ├── crawler/            # Web crawling module
│   │   ├── mod.rs
│   │   ├── spider.rs
│   │   ├── robots.rs
│   │   └── url_frontier.rs
│   ├── indexer/            # Indexing module
│   │   ├── mod.rs
│   │   ├── tokenizer.rs
│   │   ├── inverted_index.rs
│   │   └── storage.rs
│   ├── query/              # Query processing module
│   │   ├── mod.rs
│   │   ├── parser.rs
│   │   ├── search.rs
│   │   └── ranking.rs
│   ├── api/                # API and interface module
│   │   ├── mod.rs
│   │   ├── rest.rs
│   │   └── cli.rs
│   └── utils/              # Shared utilities
│       ├── mod.rs
│       ├── concurrency.rs
│       └── metrics.rs
└── tests/                  # Integration tests
    ├── crawler_tests.rs
    ├── indexer_tests.rs
    └── query_tests.rs
```

Let's set up our `Cargo.toml` with the required dependencies:

```toml
[package]
name = "rusty_search"
version = "0.1.0"
edition = "2021"
authors = ["Your Name <your.email@example.com>"]
description = "A production-ready search engine built in Rust"

[dependencies]
# HTTP and networking
reqwest = { version = "0.11", features = ["json", "stream", "gzip"] }
url = "2.3"
robotstxt = "0.3"

# HTML parsing
html5ever = "0.26"
markup5ever = "0.11"
scraper = "0.16"

# Text processing
unicode-segmentation = "1.10"
unicode-normalization = "0.1"
rust-stemmers = "1.2"
stopwords = "0.1"

# Data structures
tantivy = "0.19"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
bincode = "1.3"

# Concurrency and async
tokio = { version = "1.28", features = ["full"] }
futures = "0.3"
async-trait = "0.1"
rayon = "1.7"

# Web framework
axum = "0.6"
tower = "0.4"
tower-http = { version = "0.4", features = ["trace", "cors"] }

# Logging and metrics
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
metrics = "0.20"
metrics-exporter-prometheus = "0.11"

# CLI
clap = { version = "4.2", features = ["derive"] }

# Testing
criterion = "0.5"
mockall = "0.11"
fake = "2.5"

[dev-dependencies]
tokio-test = "0.4"
wiremock = "0.5"

[[bench]]
name = "indexing"
harness = false

[[bench]]
name = "searching"
harness = false
```

## Domain Models

Let's start by implementing the core domain models. Following the Domain-Driven Design (DDD) approach, we'll create models that reflect the essential concepts in search engine development.

### Document Model

First, let's define our `Document` entity, representing a web page or other searchable content:

```rust
// src/domain/document.rs
use std::collections::HashMap;
use url::Url;
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Document {
    /// Unique identifier for the document
    id: Uuid,

    /// URL where the document was found
    url: Url,

    /// Document title
    title: String,

    /// Main content of the document
    content: String,

    /// Metadata key-value pairs
    metadata: HashMap<String, String>,

    /// When the document was first discovered
    created_at: DateTime<Utc>,

    /// When the document was last updated
    updated_at: DateTime<Utc>,

    /// Document language
    language: Option<String>,
}

impl Document {
    /// Create a new document
    pub fn new(url: Url, title: String, content: String) -> Self {
        let now = Utc::now();

        Self {
            id: Uuid::new_v4(),
            url,
            title,
            content,
            metadata: HashMap::new(),
            created_at: now,
            updated_at: now,
            language: None,
        }
    }

    /// Get document ID
    pub fn id(&self) -> &Uuid {
        &self.id
    }

    /// Get document URL
    pub fn url(&self) -> &Url {
        &self.url
    }

    /// Get document title
    pub fn title(&self) -> &str {
        &self.title
    }

    /// Get document content
    pub fn content(&self) -> &str {
        &self.content
    }

    /// Set document content
    pub fn set_content(&mut self, content: String) {
        self.content = content;
        self.updated_at = Utc::now();
    }

    /// Add metadata key-value pair
    pub fn add_metadata(&mut self, key: String, value: String) {
        self.metadata.insert(key, value);
        self.updated_at = Utc::now();
    }

    /// Get metadata value by key
    pub fn get_metadata(&self, key: &str) -> Option<&String> {
        self.metadata.get(key)
    }

    /// Set document language
    pub fn set_language(&mut self, language: String) {
        self.language = Some(language);
        self.updated_at = Utc::now();
    }

    /// Get document language
    pub fn language(&self) -> Option<&String> {
        self.language.as_ref()
    }

    /// Get document creation time
    pub fn created_at(&self) -> &DateTime<Utc> {
        &self.created_at
    }

    /// Get document update time
    pub fn updated_at(&self) -> &DateTime<Utc> {
        &self.updated_at
    }
}

impl PartialOrd for Document {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.id.cmp(&other.id))
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DocumentSummary {
    id: Uuid,
    url: Url,
    title: String,
    snippet: String,
}

impl From<&Document> for DocumentSummary {
    fn from(doc: &Document) -> Self {
        // Create a snippet from the first 150 characters of content
        let snippet = if doc.content.len() > 150 {
            format!("{}...", &doc.content[..147])
        } else {
            doc.content.clone()
        };

        Self {
            id: *doc.id(),
            url: doc.url().clone(),
            title: doc.title().to_string(),
            snippet,
        }
    }
}
```

### Term Model

Next, let's define the `Term` entity, representing words or phrases that can be searched:

```rust
// src/domain/term.rs
use std::hash::{Hash, Hasher};
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize, Eq)]
pub struct Term {
    /// The actual text of the term
    text: String,

    /// Whether the term is a stemmed form
    is_stemmed: bool,

    /// Position within a document (optional)
    position: Option<usize>,
}

impl Term {
    /// Create a new term
    pub fn new(text: String) -> Self {
        Self {
            text,
            is_stemmed: false,
            position: None,
        }
    }

    /// Create a new stemmed term
    pub fn new_stemmed(text: String) -> Self {
        Self {
            text,
            is_stemmed: true,
            position: None,
        }
    }

    /// Create a new term with position information
    pub fn with_position(text: String, position: usize) -> Self {
        Self {
            text,
            is_stemmed: false,
            position: Some(position),
        }
    }

    /// Get the term text
    pub fn text(&self) -> &str {
        &self.text
    }

    /// Check if the term is stemmed
    pub fn is_stemmed(&self) -> bool {
        self.is_stemmed
    }

    /// Get the term position
    pub fn position(&self) -> Option<usize> {
        self.position
    }

    /// Set the term position
    pub fn set_position(&mut self, position: usize) {
        self.position = Some(position);
    }
}

impl PartialEq for Term {
    fn eq(&self, other: &Self) -> bool {
        self.text == other.text
    }
}

impl Hash for Term {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.text.hash(state);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TermFrequency {
    /// The term
    term: Term,

    /// Number of occurrences in a document
    frequency: usize,

    /// Positions where the term occurs in the document
    positions: Vec<usize>,
}

impl TermFrequency {
    /// Create a new term frequency
    pub fn new(term: Term) -> Self {
        let positions = if let Some(pos) = term.position() {
            vec![pos]
        } else {
            Vec::new()
        };

        Self {
            term,
            frequency: 1,
            positions,
        }
    }

    /// Increment the frequency and add a position
    pub fn increment(&mut self, position: Option<usize>) {
        self.frequency += 1;
        if let Some(pos) = position {
            self.positions.push(pos);
        }
    }

    /// Get the term
    pub fn term(&self) -> &Term {
        &self.term
    }

    /// Get the frequency
    pub fn frequency(&self) -> usize {
        self.frequency
    }

    /// Get the positions
    pub fn positions(&self) -> &[usize] {
        &self.positions
    }
}
```

### Index Model

Now, let's define the `IndexEntry` and related types for our inverted index:

```rust
// src/domain/index.rs
use std::collections::HashMap;
use uuid::Uuid;
use serde::{Serialize, Deserialize};
use super::term::Term;

/// Posting represents a document and positions where a term appears
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Posting {
    /// Document identifier
    doc_id: Uuid,

    /// Positions of the term in the document
    positions: Vec<usize>,
}

impl Posting {
    /// Create a new posting
    pub fn new(doc_id: Uuid) -> Self {
        Self {
            doc_id,
            positions: Vec::new(),
        }
    }

    /// Create a new posting with positions
    pub fn with_positions(doc_id: Uuid, positions: Vec<usize>) -> Self {
        Self {
            doc_id,
            positions,
        }
    }

    /// Add a position to the posting
    pub fn add_position(&mut self, position: usize) {
        self.positions.push(position);
    }

    /// Get the document ID
    pub fn doc_id(&self) -> &Uuid {
        &self.doc_id
    }

    /// Get the positions
    pub fn positions(&self) -> &[usize] {
        &self.positions
    }

    /// Get the term frequency in this document
    pub fn term_frequency(&self) -> usize {
        self.positions.len()
    }
}

/// IndexEntry represents a term and all documents where it appears
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct IndexEntry {
    /// The term
    term: Term,

    /// List of postings for this term
    postings: Vec<Posting>,
}

impl IndexEntry {
    /// Create a new index entry
    pub fn new(term: Term) -> Self {
        Self {
            term,
            postings: Vec::new(),
        }
    }

    /// Add a posting to this entry
    pub fn add_posting(&mut self, posting: Posting) {
        self.postings.push(posting);
    }

    /// Add a document to this entry
    pub fn add_document(&mut self, doc_id: Uuid, position: Option<usize>) {
        // Check if document already exists in postings
        for posting in &mut self.postings {
            if posting.doc_id == doc_id {
                if let Some(pos) = position {
                    posting.add_position(pos);
                }
                return;
            }
        }

        // Document not found, create new posting
        let mut new_posting = Posting::new(doc_id);
        if let Some(pos) = position {
            new_posting.add_position(pos);
        }
        self.postings.push(new_posting);
    }

    /// Get the term
    pub fn term(&self) -> &Term {
        &self.term
    }

    /// Get all postings
    pub fn postings(&self) -> &[Posting] {
        &self.postings
    }

    /// Get document frequency (number of documents containing this term)
    pub fn document_frequency(&self) -> usize {
        self.postings.len()
    }
}

/// SearchQuery represents a user's search query
#[derive(Debug, Clone, PartialEq)]
pub enum SearchQuery {
    /// Single term query
    Term(Term),

    /// Multiple terms with AND logic
    And(Vec<SearchQuery>),

    /// Multiple terms with OR logic
    Or(Vec<SearchQuery>),

    /// Phrase query (exact sequence of terms)
    Phrase(Vec<Term>),

    /// NOT query (exclude documents with this term)
    Not(Box<SearchQuery>),
}

/// SearchResult represents a single result from a search
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SearchResult {
    /// Document ID
    doc_id: Uuid,

    /// Relevance score (higher is more relevant)
    score: f64,

    /// Highlighted snippets showing query terms in context
    highlights: Vec<String>,
}

impl SearchResult {
    /// Create a new search result
    pub fn new(doc_id: Uuid, score: f64) -> Self {
        Self {
            doc_id,
            score,
            highlights: Vec::new(),
        }
    }

    /// Add a highlight
    pub fn add_highlight(&mut self, highlight: String) {
        self.highlights.push(highlight);
    }

    /// Get document ID
    pub fn doc_id(&self) -> &Uuid {
        &self.doc_id
    }

    /// Get score
    pub fn score(&self) -> f64 {
        self.score
    }

    /// Get highlights
    pub fn highlights(&self) -> &[String] {
        &self.highlights
    }
}

impl PartialOrd for SearchResult {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        self.score.partial_cmp(&other.score)
    }
}
```

### Repository Interfaces

Following the Dependency Inversion Principle, let's define interfaces for our repositories:

```rust
// src/domain/repository.rs
use async_trait::async_trait;
use uuid::Uuid;
use url::Url;
use std::error::Error;

use super::document::Document;
use super::index::{IndexEntry, SearchQuery, SearchResult};
use super::term::Term;

/// Error type for repository operations
#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("Entity not found: {0}")]
    NotFound(String),

    #[error("Storage error: {0}")]
    StorageError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Invalid operation: {0}")]
    InvalidOperation(String),
}

/// Repository for document storage and retrieval
#[async_trait]
pub trait DocumentRepository: Send + Sync {
    /// Store a document
    async fn store(&self, document: Document) -> Result<(), RepositoryError>;

    /// Get a document by ID
    async fn get_by_id(&self, id: &Uuid) -> Result<Document, RepositoryError>;

    /// Get a document by URL
    async fn get_by_url(&self, url: &Url) -> Result<Document, RepositoryError>;

    /// Delete a document
    async fn delete(&self, id: &Uuid) -> Result<(), RepositoryError>;

    /// Check if a document exists by URL
    async fn exists_by_url(&self, url: &Url) -> Result<bool, RepositoryError>;

    /// Get all documents (with optional pagination)
    async fn get_all(&self, offset: usize, limit: Option<usize>) -> Result<Vec<Document>, RepositoryError>;
}

/// Repository for index storage and retrieval
#[async_trait]
pub trait IndexRepository: Send + Sync {
    /// Store an index entry
    async fn store_entry(&self, entry: IndexEntry) -> Result<(), RepositoryError>;

    /// Get an index entry by term
    async fn get_entry(&self, term: &Term) -> Result<IndexEntry, RepositoryError>;

    /// Delete an index entry
    async fn delete_entry(&self, term: &Term) -> Result<(), RepositoryError>;

    /// Delete all entries for a document
    async fn delete_document(&self, doc_id: &Uuid) -> Result<(), RepositoryError>;

    /// Search the index with a query
    async fn search(&self, query: &SearchQuery, limit: usize) -> Result<Vec<SearchResult>, RepositoryError>;
}
```

This domain model establishes a clean, well-defined foundation for our search engine. By explicitly defining the core entities and repository interfaces, we've created a flexible architecture that allows for different implementations of the storage and retrieval mechanisms.

In the next sections, we'll implement the crawler, indexer, and query processing components that will work with these domain models.

## Web Crawler Implementation

The web crawler is responsible for discovering and fetching web pages. Let's implement it following SOLID principles and using Rust's concurrency features.

### URL Frontier

First, we'll implement the URL frontier, which maintains the list of URLs to be crawled:

```rust
// src/crawler/url_frontier.rs
use std::collections::{HashSet, VecDeque};
use std::sync::Arc;
use tokio::sync::Mutex;
use url::Url;
use async_trait::async_trait;

/// Error type for URL frontier operations
#[derive(Debug, thiserror::Error)]
pub enum FrontierError {
    #[error("URL parsing error: {0}")]
    UrlParseError(String),

    #[error("Invalid URL: {0}")]
    InvalidUrl(String),
}

/// Priority levels for URLs
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Priority {
    High = 0,
    Normal = 1,
    Low = 2,
}

/// URL with metadata and priority
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UrlEntry {
    url: Url,
    priority: Priority,
    depth: usize,
}

impl UrlEntry {
    pub fn new(url: Url, priority: Priority, depth: usize) -> Self {
        Self {
            url,
            priority,
            depth,
        }
    }

    pub fn url(&self) -> &Url {
        &self.url
    }

    pub fn priority(&self) -> Priority {
        self.priority
    }

    pub fn depth(&self) -> usize {
        self.depth
    }
}

/// Interface for URL frontier implementations
#[async_trait]
pub trait UrlFrontier: Send + Sync {
    /// Add a URL to the frontier
    async fn add(&self, entry: UrlEntry) -> Result<(), FrontierError>;

    /// Add multiple URLs to the frontier
    async fn add_batch(&self, entries: Vec<UrlEntry>) -> Result<(), FrontierError>;

    /// Get the next URL to crawl
    async fn next(&self) -> Option<UrlEntry>;

    /// Check if the frontier is empty
    async fn is_empty(&self) -> bool;

    /// Get the number of URLs in the frontier
    async fn size(&self) -> usize;

    /// Check if a URL has been seen before
    async fn has_seen(&self, url: &Url) -> bool;
}

/// In-memory implementation of the URL frontier
pub struct MemoryUrlFrontier {
    /// Queue of URLs to be crawled, organized by priority
    queues: Arc<Mutex<Vec<VecDeque<UrlEntry>>>>,

    /// Set of URLs that have been seen
    seen_urls: Arc<Mutex<HashSet<String>>>,

    /// Maximum depth to crawl
    max_depth: usize,
}

impl MemoryUrlFrontier {
    pub fn new(max_depth: usize) -> Self {
        // Create a queue for each priority level
        let mut queues = Vec::new();
        for _ in 0..=Priority::Low as usize {
            queues.push(VecDeque::new());
        }

        Self {
            queues: Arc::new(Mutex::new(queues)),
            seen_urls: Arc::new(Mutex::new(HashSet::new())),
            max_depth,
        }
    }

    /// Normalize a URL for consistent comparison
    fn normalize_url(url: &Url) -> String {
        let mut normalized = url.clone();

        // Remove fragment
        normalized.set_fragment(None);

        // Ensure a trailing slash on paths
        if normalized.path().is_empty() || !normalized.path().ends_with('/') {
            let mut path = normalized.path().to_string();
            path.push('/');
            normalized.set_path(&path);
        }

        normalized.to_string()
    }
}

#[async_trait]
impl UrlFrontier for MemoryUrlFrontier {
    async fn add(&self, entry: UrlEntry) -> Result<(), FrontierError> {
        // Skip if URL is beyond max depth
        if entry.depth > self.max_depth {
            return Ok(());
        }

        let normalized_url = Self::normalize_url(&entry.url);

        // Check if we've seen this URL before
        let mut seen_urls = self.seen_urls.lock().await;
        if seen_urls.contains(&normalized_url) {
            return Ok(());
        }

        // Mark URL as seen
        seen_urls.insert(normalized_url);
        drop(seen_urls);

        // Add to appropriate priority queue
        let mut queues = self.queues.lock().await;
        let priority_idx = entry.priority as usize;
        queues[priority_idx].push_back(entry);

        Ok(())
    }

    async fn add_batch(&self, entries: Vec<UrlEntry>) -> Result<(), FrontierError> {
        for entry in entries {
            self.add(entry).await?;
        }
        Ok(())
    }

    async fn next(&self) -> Option<UrlEntry> {
        let mut queues = self.queues.lock().await;

        // Try to get a URL from each priority queue in order
        for queue in queues.iter_mut() {
            if let Some(entry) = queue.pop_front() {
                return Some(entry);
            }
        }

        None
    }

    async fn is_empty(&self) -> bool {
        let queues = self.queues.lock().await;
        queues.iter().all(|queue| queue.is_empty())
    }

    async fn size(&self) -> usize {
        let queues = self.queues.lock().await;
        queues.iter().map(|queue| queue.len()).sum()
    }

    async fn has_seen(&self, url: &Url) -> bool {
        let normalized_url = Self::normalize_url(url);
        let seen_urls = self.seen_urls.lock().await;
        seen_urls.contains(&normalized_url)
    }
}
```

### Robots.txt Parser

Next, let's implement a parser for the Robots Exclusion Protocol:

```rust
// src/crawler/robots.rs
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use reqwest::Client;
use robotstxt::RobotFileParser;
use tokio::sync::Mutex;
use url::Url;
use tracing::{debug, warn};

/// Cache for robots.txt files
pub struct RobotsCache {
    /// HTTP client for fetching robots.txt
    client: Client,

    /// Map of host to robots.txt parser
    parsers: Arc<Mutex<HashMap<String, (RobotFileParser, Instant)>>>,

    /// Refresh interval for robots.txt
    refresh_interval: Duration,

    /// User agent to use for robots.txt
    user_agent: String,
}

impl RobotsCache {
    pub fn new(client: Client, user_agent: String, refresh_interval: Duration) -> Self {
        Self {
            client,
            parsers: Arc::new(Mutex::new(HashMap::new())),
            refresh_interval,
            user_agent,
        }
    }

    /// Get robots.txt URL for a given URL
    fn get_robots_url(url: &Url) -> Result<Url, url::ParseError> {
        let host = url.host_str().unwrap_or_default();
        let scheme = url.scheme();
        let port = url.port();

        let robots_url = format!(
            "{}://{}{}/robots.txt",
            scheme,
            host,
            if let Some(p) = port { format!(":{}", p) } else { String::new() }
        );

        Url::parse(&robots_url)
    }

    /// Check if a URL is allowed to be crawled
    pub async fn is_allowed(&self, url: &Url) -> bool {
        let host = match url.host_str() {
            Some(h) => h.to_string(),
            None => {
                warn!("URL has no host: {}", url);
                return false;
            }
        };

        let parser = self.get_parser(&host, url).await;
        parser.can_fetch(&self.user_agent, url.as_str())
    }

    /// Get the crawl delay specified in robots.txt
    pub async fn crawl_delay(&self, url: &Url) -> Option<Duration> {
        let host = match url.host_str() {
            Some(h) => h.to_string(),
            None => return None,
        };

        let parser = self.get_parser(&host, url).await;
        parser.crawl_delay(&self.user_agent).map(Duration::from_secs_f32)
    }

    /// Get or create a parser for the given host
    async fn get_parser(&self, host: &str, url: &Url) -> RobotFileParser {
        let mut parsers = self.parsers.lock().await;

        // Check if we have a fresh parser for this host
        if let Some((parser, timestamp)) = parsers.get(host) {
            if timestamp.elapsed() < self.refresh_interval {
                return parser.clone();
            }
        }

        // Need to fetch or refresh robots.txt
        let robots_url = match Self::get_robots_url(url) {
            Ok(u) => u,
            Err(e) => {
                warn!("Failed to parse robots.txt URL for {}: {}", url, e);
                // Create an empty parser that allows everything
                let parser = RobotFileParser::new("");
                parsers.insert(host.to_string(), (parser.clone(), Instant::now()));
                return parser;
            }
        };

        debug!("Fetching robots.txt from {}", robots_url);

        // Create a new parser
        let parser = match self.fetch_robots_txt(&robots_url).await {
            Ok(content) => {
                let mut parser = RobotFileParser::new(robots_url.as_str());
                parser.parse(&content);
                parser
            }
            Err(e) => {
                warn!("Failed to fetch robots.txt from {}: {}", robots_url, e);
                // Create an empty parser that allows everything
                RobotFileParser::new("")
            }
        };

        // Store the parser in the cache
        parsers.insert(host.to_string(), (parser.clone(), Instant::now()));

        parser
    }

    /// Fetch robots.txt content
    async fn fetch_robots_txt(&self, url: &Url) -> Result<String, reqwest::Error> {
        let response = self.client.get(url.as_str())
            .header("User-Agent", &self.user_agent)
            .timeout(Duration::from_secs(10))
            .send()
            .await?;

        response.text().await
    }
}
```

### HTML Parser

Let's implement a parser for HTML documents that extracts links and content:

```rust
// src/crawler/html_parser.rs
use scraper::{Html, Selector};
use url::Url;
use tracing::warn;

use crate::domain::document::Document;
use crate::crawler::url_frontier::{UrlEntry, Priority};

/// Result of parsing an HTML document
pub struct ParseResult {
    /// The parsed document
    pub document: Document,

    /// URLs extracted from the document
    pub urls: Vec<UrlEntry>,
}

/// HTML parser
pub struct HtmlParser {
    /// Maximum depth to extract links
    max_depth: usize,

    /// Whether to follow external links
    follow_external: bool,
}

impl HtmlParser {
    pub fn new(max_depth: usize, follow_external: bool) -> Self {
        Self {
            max_depth,
            follow_external,
        }
    }

    /// Parse an HTML document
    pub fn parse(&self, url: &Url, html: &str, depth: usize) -> ParseResult {
        let document = Html::parse_document(html);

        // Extract title
        let title = self.extract_title(&document)
            .unwrap_or_else(|| url.path().to_string());

        // Extract content
        let content = self.extract_content(&document);

        // Create document
        let doc = Document::new(url.clone(), title, content);

        // Extract links if we're not at max depth
        let urls = if depth < self.max_depth {
            self.extract_links(&document, url, depth)
        } else {
            Vec::new()
        };

        ParseResult {
            document: doc,
            urls,
        }
    }

    /// Extract the title from an HTML document
    fn extract_title(&self, document: &Html) -> Option<String> {
        let title_selector = Selector::parse("title").ok()?;
        let title_element = document.select(&title_selector).next()?;

        Some(title_element.text().collect::<Vec<_>>().join(" ").trim().to_string())
    }

    /// Extract the main content from an HTML document
    fn extract_content(&self, document: &Html) -> String {
        // Try to find main content elements
        let content_selectors = [
            "article", "main", "#content", ".content",
            "[role=main]", "[itemprop=articleBody]"
        ];

        for selector_str in content_selectors {
            if let Ok(selector) = Selector::parse(selector_str) {
                if let Some(element) = document.select(&selector).next() {
                    // Get text from the element
                    let text = element.text().collect::<Vec<_>>().join(" ");
                    if !text.trim().is_empty() {
                        return text.trim().to_string();
                    }
                }
            }
        }

        // Fall back to body text
        if let Ok(body_selector) = Selector::parse("body") {
            if let Some(body) = document.select(&body_selector).next() {
                return body.text().collect::<Vec<_>>().join(" ").trim().to_string();
            }
        }

        // Last resort: get all text
        document.root_element()
            .text()
            .collect::<Vec<_>>()
            .join(" ")
            .trim()
            .to_string()
    }

    /// Extract links from an HTML document
    fn extract_links(&self, document: &Html, base_url: &Url, depth: usize) -> Vec<UrlEntry> {
        let mut urls = Vec::new();

        // Extract links from a, link, and area elements
        if let Ok(link_selector) = Selector::parse("a[href], link[href], area[href]") {
            for element in document.select(&link_selector) {
                if let Some(href) = element.value().attr("href") {
                    // Resolve relative URLs
                    match base_url.join(href) {
                        Ok(url) => {
                            // Only accept HTTP and HTTPS URLs
                            if url.scheme() != "http" && url.scheme() != "https" {
                                continue;
                            }

                            // Check if we should follow external links
                            if !self.follow_external && url.host_str() != base_url.host_str() {
                                continue;
                            }

                            // Determine priority based on whether it's on the same domain
                            let priority = if url.host_str() == base_url.host_str() {
                                Priority::High
                            } else {
                                Priority::Low
                            };

                            urls.push(UrlEntry::new(url, priority, depth + 1));
                        }
                        Err(e) => {
                            warn!("Failed to parse URL {}: {}", href, e);
                        }
                    }
                }
            }
        }

        urls
    }
}
```

### Web Crawler

Now, let's implement the main crawler that coordinates everything:

```rust
// src/crawler/spider.rs
use std::sync::Arc;
use std::time::Duration;
use reqwest::Client;
use tokio::sync::Semaphore;
use tokio::time::sleep;
use url::Url;
use tracing::{debug, error, info, warn};
use async_trait::async_trait;

use crate::crawler::url_frontier::{UrlFrontier, UrlEntry, Priority};
use crate::crawler::robots::RobotsCache;
use crate::crawler::html_parser::{HtmlParser, ParseResult};
use crate::domain::document::Document;
use crate::domain::repository::{DocumentRepository, RepositoryError};

/// Configuration for the web crawler
#[derive(Debug, Clone)]
pub struct CrawlerConfig {
    /// User agent string to identify the crawler
    pub user_agent: String,

    /// Maximum number of concurrent requests
    pub max_concurrent_requests: usize,

    /// Delay between requests to the same host
    pub politeness_delay: Duration,

    /// Timeout for HTTP requests
    pub request_timeout: Duration,

    /// Maximum depth to crawl
    pub max_depth: usize,

    /// Whether to follow external links
    pub follow_external_links: bool,

    /// Refresh interval for robots.txt
    pub robots_refresh_interval: Duration,
}

impl Default for CrawlerConfig {
    fn default() -> Self {
        Self {
            user_agent: "RustySearch/0.1 (+https://example.com/bot)".to_string(),
            max_concurrent_requests: 10,
            politeness_delay: Duration::from_millis(500),
            request_timeout: Duration::from_secs(30),
            max_depth: 3,
            follow_external_links: false,
            robots_refresh_interval: Duration::from_secs(3600), // 1 hour
        }
    }
}

/// Interface for web crawlers
#[async_trait]
pub trait WebCrawler: Send + Sync {
    /// Start crawling from seed URLs
    async fn crawl(&self, seeds: Vec<Url>) -> Result<(), RepositoryError>;

    /// Crawl a single URL
    async fn crawl_url(&self, url: Url, depth: usize) -> Result<Option<Document>, RepositoryError>;

    /// Stop the crawler
    async fn stop(&self);

    /// Check if the crawler is running
    async fn is_running(&self) -> bool;
}

/// Implementation of a web crawler
pub struct Spider<F, D>
where
    F: UrlFrontier,
    D: DocumentRepository,
{
    /// HTTP client
    client: Client,

    /// URL frontier
    frontier: Arc<F>,

    /// Document repository
    repository: Arc<D>,

    /// Robots.txt cache
    robots_cache: Arc<RobotsCache>,

    /// HTML parser
    parser: Arc<HtmlParser>,

    /// Configuration
    config: CrawlerConfig,

    /// Semaphore to limit concurrent requests
    concurrency_limiter: Arc<Semaphore>,

    /// Flag to indicate if the crawler is running
    running: Arc<tokio::sync::RwLock<bool>>,
}

impl<F, D> Spider<F, D>
where
    F: UrlFrontier + 'static,
    D: DocumentRepository + 'static,
{
    pub fn new(
        frontier: Arc<F>,
        repository: Arc<D>,
        config: CrawlerConfig,
    ) -> Self {
        // Create HTTP client
        let client = Client::builder()
            .user_agent(&config.user_agent)
            .timeout(config.request_timeout)
            .build()
            .expect("Failed to create HTTP client");

        // Create robots.txt cache
        let robots_cache = Arc::new(RobotsCache::new(
            client.clone(),
            config.user_agent.clone(),
            config.robots_refresh_interval,
        ));

        // Create HTML parser
        let parser = Arc::new(HtmlParser::new(
            config.max_depth,
            config.follow_external_links,
        ));

        // Create concurrency limiter
        let concurrency_limiter = Arc::new(Semaphore::new(config.max_concurrent_requests));

        Self {
            client,
            frontier,
            repository,
            robots_cache,
            parser,
            config,
            concurrency_limiter,
            running: Arc::new(tokio::sync::RwLock::new(false)),
        }
    }

    /// Process a parsed document
    async fn process_document(&self, result: ParseResult, depth: usize) -> Result<(), RepositoryError> {
        // Store the document
        self.repository.store(result.document).await?;

        // Add extracted URLs to frontier
        if let Err(e) = self.frontier.add_batch(result.urls).await {
            warn!("Failed to add URLs to frontier: {}", e);
        }

        Ok(())
    }
}

#[async_trait]
impl<F, D> WebCrawler for Spider<F, D>
where
    F: UrlFrontier + 'static,
    D: DocumentRepository + 'static,
{
    async fn crawl(&self, seeds: Vec<Url>) -> Result<(), RepositoryError> {
        // Set running flag
        let mut running = self.running.write().await;
        if *running {
            warn!("Crawler is already running");
            return Ok(());
        }
        *running = true;
        drop(running);

        // Add seed URLs to frontier
        let seed_entries: Vec<UrlEntry> = seeds.into_iter()
            .map(|url| UrlEntry::new(url, Priority::High, 0))
            .collect();

        if let Err(e) = self.frontier.add_batch(seed_entries).await {
            error!("Failed to add seed URLs to frontier: {}", e);
            return Err(RepositoryError::InvalidOperation(e.to_string()));
        }

        info!("Starting crawler with {} URLs in frontier", self.frontier.size().await);

        // Process URLs until frontier is empty or crawler is stopped
        while !self.frontier.is_empty().await {
            // Check if we should stop
            if !*self.running.read().await {
                info!("Crawler stopped");
                break;
            }

            // Get next URL to crawl
            if let Some(entry) = self.frontier.next().await {
                // Acquire permit from semaphore
                let permit = self.concurrency_limiter.clone()
                    .acquire_owned()
                    .await
                    .expect("Failed to acquire permit");

                // Clone references for the task
                let url = entry.url().clone();
                let depth = entry.depth();
                let self_clone = self.clone();

                // Spawn a task to crawl the URL
                tokio::spawn(async move {
                    // Ensure permit is dropped when task completes
                    let _permit = permit;

                    if let Err(e) = self_clone.crawl_url(url.clone(), depth).await {
                        error!("Failed to crawl {}: {}", url, e);
                    }
                });
            }
        }

        // Clear running flag
        let mut running = self.running.write().await;
        *running = false;

        info!("Crawler finished");
        Ok(())
    }

    async fn crawl_url(&self, url: Url, depth: usize) -> Result<Option<Document>, RepositoryError> {
        debug!("Crawling {} (depth {})", url, depth);

        // Check robots.txt
        if !self.robots_cache.is_allowed(&url).await {
            info!("URL disallowed by robots.txt: {}", url);
            return Ok(None);
        }

        // Check if we need to wait (politeness)
        if let Some(delay) = self.robots_cache.crawl_delay(&url).await {
            sleep(delay).await;
        } else {
            sleep(self.config.politeness_delay).await;
        }

        // Check if document already exists
        if self.repository.exists_by_url(&url).await? {
            debug!("URL already crawled: {}", url);
            return Ok(None);
        }

        // Fetch the page
        let response = match self.client.get(url.as_str())
            .header("User-Agent", &self.config.user_agent)
            .send()
            .await {
            Ok(r) => r,
            Err(e) => {
                warn!("Failed to fetch {}: {}", url, e);
                return Ok(None);
            }
        };

        // Check status code
        if !response.status().is_success() {
            warn!("Non-success status code for {}: {}", url, response.status());
            return Ok(None);
        }

        // Get content type
        let content_type = response.headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or_default();

        // Only process HTML documents
        if !content_type.contains("text/html") {
            debug!("Skipping non-HTML content: {} ({})", url, content_type);
            return Ok(None);
        }

        // Get HTML content
        let html = match response.text().await {
            Ok(h) => h,
            Err(e) => {
                warn!("Failed to get HTML from {}: {}", url, e);
                return Ok(None);
            }
        };

        // Parse the HTML
        let result = self.parser.parse(&url, &html, depth);

        // Process the document
        self.process_document(result.clone(), depth).await?;

        Ok(Some(result.document))
    }

    async fn stop(&self) {
        let mut running = self.running.write().await;
        *running = false;
        info!("Crawler stop requested");
    }

    async fn is_running(&self) -> bool {
        *self.running.read().await
    }
}

impl<F, D> Clone for Spider<F, D>
where
    F: UrlFrontier,
    D: DocumentRepository,
{
    fn clone(&self) -> Self {
        Self {
            client: self.client.clone(),
            frontier: self.frontier.clone(),
            repository: self.repository.clone(),
            robots_cache: self.robots_cache.clone(),
            parser: self.parser.clone(),
            config: self.config.clone(),
            concurrency_limiter: self.concurrency_limiter.clone(),
            running: self.running.clone(),
        }
    }
}
```

Our crawler implementation demonstrates several key design principles:

1. **Interface Segregation**: We defined clear interfaces for `UrlFrontier` and `WebCrawler`, allowing for different implementations.

2. **Dependency Inversion**: The `Spider` class depends on abstractions (interfaces) rather than concrete implementations.

3. **Single Responsibility**: Each component has a single responsibility:

   - `UrlFrontier` manages the queue of URLs to crawl
   - `RobotsCache` handles robots.txt parsing and caching
   - `HtmlParser` extracts content and links from HTML
   - `Spider` coordinates the crawling process

4. **Concurrency**: We use Rust's async/await and tokio to implement concurrent crawling with:

   - A semaphore to limit the number of concurrent requests
   - Tokio tasks for parallel processing
   - Proper synchronization with Mutex and RwLock

5. **Error Handling**: We use proper error types and propagation with the `thiserror` crate.

This implementation is scalable, maintainable, and follows web crawling best practices like respecting robots.txt and implementing politeness delays.

## Indexer Implementation

The indexer processes documents from the crawler, extracting terms and building an inverted index. This is a critical component that determines the search engine's performance and capabilities.

### Text Processing

First, let's implement text processing utilities to normalize and analyze text:

```rust
// src/indexer/text_processing.rs
use std::collections::HashSet;
use unicode_segmentation::UnicodeSegmentation;
use unicode_normalization::UnicodeNormalization;
use rust_stemmers::{Algorithm, Stemmer};
use lazy_static::lazy_static;

lazy_static! {
    /// Common English stopwords
    static ref ENGLISH_STOPWORDS: HashSet<String> = {
        let words = vec![
            "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "if",
            "in", "into", "is", "it", "no", "not", "of", "on", "or", "such",
            "that", "the", "their", "then", "there", "these", "they", "this",
            "to", "was", "will", "with"
        ];
        words.into_iter().map(String::from).collect()
    };
}

/// Text processor for normalizing and analyzing text
pub struct TextProcessor {
    /// Stemmer for reducing words to their root form
    stemmer: Stemmer,

    /// Whether to remove stopwords
    remove_stopwords: bool,

    /// Whether to apply stemming
    apply_stemming: bool,

    /// Maximum length of terms to index
    max_term_length: usize,
}

impl TextProcessor {
    /// Create a new text processor
    pub fn new(
        language: Algorithm,
        remove_stopwords: bool,
        apply_stemming: bool,
        max_term_length: usize,
    ) -> Self {
        Self {
            stemmer: Stemmer::create(language),
            remove_stopwords,
            apply_stemming,
            max_term_length,
        }
    }

    /// Create a new English text processor with default settings
    pub fn new_english() -> Self {
        Self::new(
            Algorithm::English,
            true,
            true,
            50,
        )
    }

    /// Normalize text (lowercase, Unicode normalization)
    pub fn normalize(&self, text: &str) -> String {
        text.to_lowercase()
            .nfc()
            .collect::<String>()
    }

    /// Tokenize text into words
    pub fn tokenize(&self, text: &str) -> Vec<String> {
        // Normalize the text first
        let normalized = self.normalize(text);

        // Split by word boundaries
        normalized
            .unicode_words()
            .filter(|word| {
                // Apply length filter
                word.len() <= self.max_term_length
            })
            .map(String::from)
            .collect()
    }

    /// Process text into terms (tokenize, remove stopwords, stem)
    pub fn process(&self, text: &str) -> Vec<String> {
        // Tokenize the text
        let tokens = self.tokenize(text);

        tokens
            .into_iter()
            .filter(|token| {
                // Apply stopword filter if enabled
                !self.remove_stopwords || !self.is_stopword(token)
            })
            .map(|token| {
                // Apply stemming if enabled
                if self.apply_stemming {
                    self.stemmer.stem(&token).to_string()
                } else {
                    token
                }
            })
            .collect()
    }

    /// Process text and keep position information
    pub fn process_with_positions(&self, text: &str) -> Vec<(String, usize)> {
        // Tokenize the text
        let tokens = self.tokenize(text);

        tokens
            .into_iter()
            .enumerate()
            .filter(|(_, token)| {
                // Apply stopword filter if enabled
                !self.remove_stopwords || !self.is_stopword(token)
            })
            .map(|(position, token)| {
                // Apply stemming if enabled
                let processed = if self.apply_stemming {
                    self.stemmer.stem(&token).to_string()
                } else {
                    token
                };

                (processed, position)
            })
            .collect()
    }

    /// Check if a word is a stopword
    pub fn is_stopword(&self, word: &str) -> bool {
        ENGLISH_STOPWORDS.contains(word)
    }
}

/// Language detector to identify the language of a document
pub struct LanguageDetector {
    // We could use a more sophisticated language detection library,
    // but for simplicity we'll implement a basic version here
    language_profiles: HashMap<String, HashMap<String, f64>>,
}

impl LanguageDetector {
    /// Create a new language detector with pre-trained profiles
    pub fn new() -> Self {
        let mut detector = Self {
            language_profiles: HashMap::new(),
        };

        // Initialize with some basic language profiles
        // (In a real implementation, we'd load these from trained models)
        detector.add_language_profile("en", Self::english_profile());

        detector
    }

    /// Add a language profile
    pub fn add_language_profile(&mut self, language: &str, profile: HashMap<String, f64>) {
        self.language_profiles.insert(language.to_string(), profile);
    }

    /// Create a basic English language profile
    fn english_profile() -> HashMap<String, f64> {
        // This is a very simplified profile with common English n-grams
        let mut profile = HashMap::new();

        // Common English trigrams and their frequencies
        profile.insert("the".to_string(), 0.98);
        profile.insert("and".to_string(), 0.95);
        profile.insert("ing".to_string(), 0.93);
        profile.insert("ion".to_string(), 0.90);
        profile.insert("ent".to_string(), 0.88);
        profile.insert("her".to_string(), 0.87);

        profile
    }

    /// Detect the language of a text
    pub fn detect(&self, text: &str) -> Option<String> {
        if text.trim().is_empty() {
            return None;
        }

        // Create n-grams from the text
        let ngrams = self.create_ngrams(text, 3);

        // Calculate scores for each language
        let mut scores = HashMap::new();

        for (language, profile) in &self.language_profiles {
            let mut score = 0.0;

            for (ngram, _) in &ngrams {
                if let Some(frequency) = profile.get(ngram) {
                    score += frequency;
                }
            }

            scores.insert(language.clone(), score);
        }

        // Find the language with the highest score
        scores.into_iter()
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(language, _)| language)
    }

    /// Create n-grams from text
    fn create_ngrams(&self, text: &str, n: usize) -> HashMap<String, usize> {
        let text = text.to_lowercase();
        let chars: Vec<char> = text.chars().collect();
        let mut ngrams = HashMap::new();

        for i in 0..chars.len() {
            if i + n <= chars.len() {
                let ngram: String = chars[i..i+n].iter().collect();
                *ngrams.entry(ngram).or_insert(0) += 1;
            }
        }

        ngrams
    }
}
```

### Tokenizer

Now, let's implement the tokenizer that will extract terms from documents:

```rust
// src/indexer/tokenizer.rs
use std::collections::HashMap;
use uuid::Uuid;
use tracing::debug;

use crate::domain::document::Document;
use crate::domain::term::{Term, TermFrequency};
use crate::indexer::text_processing::TextProcessor;

/// Result of tokenizing a document
pub struct TokenizationResult {
    /// Document ID
    pub doc_id: Uuid,

    /// Map of term to term frequency
    pub term_frequencies: HashMap<String, TermFrequency>,
}

/// Tokenizer for extracting terms from documents
pub struct Tokenizer {
    /// Text processor
    processor: TextProcessor,
}

impl Tokenizer {
    /// Create a new tokenizer
    pub fn new(processor: TextProcessor) -> Self {
        Self {
            processor,
        }
    }

    /// Tokenize a document
    pub fn tokenize(&self, document: &Document) -> TokenizationResult {
        debug!("Tokenizing document: {}", document.id());

        // Process title with higher weight
        let title_terms = self.processor.process_with_positions(document.title());

        // Process content
        let content_terms = self.processor.process_with_positions(document.content());

        // Combine terms and calculate frequencies
        let mut term_frequencies = HashMap::new();

        // Process title terms (with 3x weight)
        for (term_text, position) in title_terms {
            let term = Term::with_position(term_text.clone(), position);

            if let Some(tf) = term_frequencies.get_mut(&term_text) {
                tf.increment(Some(position));
                tf.increment(None); // Additional weight for title terms
                tf.increment(None);
            } else {
                let mut tf = TermFrequency::new(term);
                tf.increment(None); // Additional weight for title terms
                tf.increment(None);
                term_frequencies.insert(term_text, tf);
            }
        }

        // Process content terms
        for (term_text, position) in content_terms {
            if let Some(tf) = term_frequencies.get_mut(&term_text) {
                tf.increment(Some(position));
            } else {
                let term = Term::with_position(term_text.clone(), position);
                term_frequencies.insert(term_text, TermFrequency::new(term));
            }
        }

        TokenizationResult {
            doc_id: *document.id(),
            term_frequencies,
        }
    }
}
```

These components form the foundation of our indexing pipeline. The `TextProcessor` handles text normalization, stopword removal, and stemming, while the `Tokenizer` uses the processor to extract terms from documents and calculate their frequencies.

### Inverted Index

Now, let's implement the core of our search engine: the inverted index.

```rust
// src/indexer/inverted_index.rs
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use tracing::{info, debug};

use crate::domain::document::Document;
use crate::domain::index::{IndexEntry, Posting, SearchQuery, SearchResult};
use crate::domain::term::Term;
use crate::domain::repository::{IndexRepository, RepositoryError};
use crate::indexer::tokenizer::{Tokenizer, TokenizationResult};
use crate::indexer::storage::IndexStorage;

/// In-memory implementation of the inverted index
pub struct InvertedIndex<S>
where
    S: IndexStorage,
{
    /// Map of term text to index entry
    index: Arc<RwLock<HashMap<String, IndexEntry>>>,

    /// Tokenizer for processing documents
    tokenizer: Arc<Tokenizer>,

    /// Storage backend for persistence
    storage: Arc<S>,

    /// Total number of documents in the index
    doc_count: Arc<RwLock<usize>>,
}

impl<S> InvertedIndex<S>
where
    S: IndexStorage,
{
    /// Create a new inverted index
    pub fn new(tokenizer: Arc<Tokenizer>, storage: Arc<S>) -> Self {
        Self {
            index: Arc::new(RwLock::new(HashMap::new())),
            tokenizer,
            storage,
            doc_count: Arc::new(RwLock::new(0)),
        }
    }

    /// Add a document to the index
    pub async fn add_document(&self, document: &Document) -> Result<(), RepositoryError> {
        debug!("Adding document to index: {}", document.id());

        // Tokenize the document
        let tokenization = self.tokenizer.tokenize(document);

        // Update the index with the tokenization result
        self.update_index(tokenization).await?;

        // Increment document count
        let mut doc_count = self.doc_count.write().await;
        *doc_count += 1;

        Ok(())
    }

    /// Update the index with tokenization results
    async fn update_index(&self, tokenization: TokenizationResult) -> Result<(), RepositoryError> {
        let mut index = self.index.write().await;

        for (term_text, term_freq) in tokenization.term_frequencies {
            let entry = index.entry(term_text.clone()).or_insert_with(|| {
                IndexEntry::new(Term::new(term_text))
            });

            // Add document to this term's postings
            entry.add_document(
                tokenization.doc_id,
                term_freq.positions().first().copied(),
            );

            // Add all positions
            for &pos in term_freq.positions().iter().skip(1) {
                entry.add_document(tokenization.doc_id, Some(pos));
            }
        }

        Ok(())
    }

    /// Remove a document from the index
    pub async fn remove_document(&self, doc_id: &Uuid) -> Result<(), RepositoryError> {
        debug!("Removing document from index: {}", doc_id);

        // Remove the document from all postings
        let mut index = self.index.write().await;

        // Filter out postings for this document
        for entry in index.values_mut() {
            let postings = entry.postings().to_vec();
            let filtered_postings = postings.into_iter()
                .filter(|posting| posting.doc_id() != doc_id)
                .collect::<Vec<_>>();

            // Create a new entry with filtered postings
            let mut new_entry = IndexEntry::new(entry.term().clone());
            for posting in filtered_postings {
                new_entry.add_posting(posting);
            }

            // Replace the entry
            *entry = new_entry;
        }

        // Remove empty entries
        index.retain(|_, entry| entry.document_frequency() > 0);

        // Decrement document count if we found and removed the document
        let mut doc_count = self.doc_count.write().await;
        if *doc_count > 0 {
            *doc_count -= 1;
        }

        Ok(())
    }

    /// Save the index to storage
    pub async fn save(&self) -> Result<(), RepositoryError> {
        info!("Saving index to storage");

        let index = self.index.read().await;
        let entries: Vec<IndexEntry> = index.values().cloned().collect();

        self.storage.save_entries(&entries).await
            .map_err(|e| RepositoryError::StorageError(e.to_string()))
    }

    /// Load the index from storage
    pub async fn load(&self) -> Result<(), RepositoryError> {
        info!("Loading index from storage");

        let entries = self.storage.load_entries().await
            .map_err(|e| RepositoryError::StorageError(e.to_string()))?;

        let mut index = self.index.write().await;
        index.clear();

        let mut doc_count_set = std::collections::HashSet::new();

        for entry in entries {
            // Add to doc count set for counting unique documents
            for posting in entry.postings() {
                doc_count_set.insert(*posting.doc_id());
            }

            // Add to index
            index.insert(entry.term().text().to_string(), entry);
        }

        // Update document count
        let mut doc_count = self.doc_count.write().await;
        *doc_count = doc_count_set.len();

        info!("Loaded index with {} terms and {} documents", index.len(), *doc_count);

        Ok(())
    }

    /// Get stats about the index
    pub async fn get_stats(&self) -> IndexStats {
        let index = self.index.read().await;
        let doc_count = *self.doc_count.read().await;

        IndexStats {
            term_count: index.len(),
            document_count: doc_count,
        }
    }
}

#[async_trait::async_trait]
impl<S> IndexRepository for InvertedIndex<S>
where
    S: IndexStorage + Send + Sync,
{
    async fn store_entry(&self, entry: IndexEntry) -> Result<(), RepositoryError> {
        let mut index = self.index.write().await;
        index.insert(entry.term().text().to_string(), entry);
        Ok(())
    }

    async fn get_entry(&self, term: &Term) -> Result<IndexEntry, RepositoryError> {
        let index = self.index.read().await;

        index.get(term.text())
            .cloned()
            .ok_or_else(|| RepositoryError::NotFound(format!("Term not found: {}", term.text())))
    }

    async fn delete_entry(&self, term: &Term) -> Result<(), RepositoryError> {
        let mut index = self.index.write().await;

        index.remove(term.text())
            .ok_or_else(|| RepositoryError::NotFound(format!("Term not found: {}", term.text())))?;

        Ok(())
    }

    async fn delete_document(&self, doc_id: &Uuid) -> Result<(), RepositoryError> {
        self.remove_document(doc_id).await
    }

    async fn search(&self, query: &SearchQuery, limit: usize) -> Result<Vec<SearchResult>, RepositoryError> {
        // Implement search using the TF-IDF algorithm
        match query {
            SearchQuery::Term(term) => {
                self.search_term(term, limit).await
            },
            SearchQuery::And(queries) => {
                self.search_and(queries, limit).await
            },
            SearchQuery::Or(queries) => {
                self.search_or(queries, limit).await
            },
            SearchQuery::Phrase(terms) => {
                self.search_phrase(terms, limit).await
            },
            SearchQuery::Not(query) => {
                self.search_not(query, limit).await
            },
        }
    }
}

impl<S> InvertedIndex<S>
where
    S: IndexStorage + Send + Sync,
{
    /// Search for a single term
    async fn search_term(&self, term: &Term, limit: usize) -> Result<Vec<SearchResult>, RepositoryError> {
        let index = self.index.read().await;
        let doc_count = *self.doc_count.read().await;

        // If no documents in index, return empty result
        if doc_count == 0 {
            return Ok(Vec::new());
        }

        // Get the entry for this term
        let entry = match index.get(term.text()) {
            Some(e) => e,
            None => return Ok(Vec::new()), // Term not found
        };

        // Calculate IDF for this term
        let idf = (doc_count as f64 / entry.document_frequency() as f64).ln();

        // Calculate TF-IDF score for each document
        let mut results = Vec::new();

        for posting in entry.postings() {
            // Term frequency normalized by document length (approximate)
            let tf = posting.term_frequency() as f64 / 100.0; // Assume average doc length of 100 terms

            // TF-IDF score
            let score = tf * idf;

            results.push(SearchResult::new(*posting.doc_id(), score));
        }

        // Sort by score (descending)
        results.sort_by(|a, b| b.score().partial_cmp(&a.score()).unwrap_or(std::cmp::Ordering::Equal));

        // Limit results
        let results = results.into_iter().take(limit).collect();

        Ok(results)
    }

    /// Search for multiple terms with AND logic
    async fn search_and(&self, queries: &[SearchQuery], limit: usize) -> Result<Vec<SearchResult>, RepositoryError> {
        if queries.is_empty() {
            return Ok(Vec::new());
        }

        // Get results for the first query
        let mut results = self.search(&queries[0], usize::MAX).await?;

        // Intersect with results from other queries
        for query in &queries[1..] {
            let query_results = self.search(query, usize::MAX).await?;

            // Keep only documents that appear in both result sets
            results.retain(|result| {
                query_results.iter().any(|qr| qr.doc_id() == result.doc_id())
            });

            // Update scores by adding
            for result in &mut results {
                if let Some(qr) = query_results.iter().find(|qr| qr.doc_id() == result.doc_id()) {
                    *result = SearchResult::new(*result.doc_id(), result.score() + qr.score());
                }
            }
        }

        // Sort by score (descending)
        results.sort_by(|a, b| b.score().partial_cmp(&a.score()).unwrap_or(std::cmp::Ordering::Equal));

        // Limit results
        let results = results.into_iter().take(limit).collect();

        Ok(results)
    }

    /// Search for multiple terms with OR logic
    async fn search_or(&self, queries: &[SearchQuery], limit: usize) -> Result<Vec<SearchResult>, RepositoryError> {
        if queries.is_empty() {
            return Ok(Vec::new());
        }

        // Map to store combined results, keyed by document ID
        let mut result_map = HashMap::new();

        // Process each query
        for query in queries {
            let query_results = self.search(query, usize::MAX).await?;

            // Add to combined results
            for result in query_results {
                result_map
                    .entry(*result.doc_id())
                    .and_modify(|e: &mut SearchResult| {
                        *e = SearchResult::new(*e.doc_id(), e.score() + result.score());
                    })
                    .or_insert(result);
            }
        }

        // Convert map to vector
        let mut results: Vec<SearchResult> = result_map.into_values().collect();

        // Sort by score (descending)
        results.sort_by(|a, b| b.score().partial_cmp(&a.score()).unwrap_or(std::cmp::Ordering::Equal));

        // Limit results
        let results = results.into_iter().take(limit).collect();

        Ok(results)
    }

    /// Search for a phrase (exact sequence of terms)
    async fn search_phrase(&self, terms: &[Term], limit: usize) -> Result<Vec<SearchResult>, RepositoryError> {
        if terms.is_empty() {
            return Ok(Vec::new());
        }

        let index = self.index.read().await;

        // Get postings for all terms
        let mut term_postings = Vec::new();

        for term in terms {
            let entry = match index.get(term.text()) {
                Some(e) => e,
                None => return Ok(Vec::new()), // If any term is missing, no results
            };

            term_postings.push(entry.postings().to_vec());
        }

        // Find documents containing all terms
        let mut candidate_docs = std::collections::HashSet::new();

        for posting in &term_postings[0] {
            let doc_id = posting.doc_id();
            let mut contains_all = true;

            for postings in &term_postings[1..] {
                if !postings.iter().any(|p| p.doc_id() == doc_id) {
                    contains_all = false;
                    break;
                }
            }

            if contains_all {
                candidate_docs.insert(*doc_id);
            }
        }

        // For each candidate document, check if terms appear in sequence
        let mut results = Vec::new();

        for doc_id in candidate_docs {
            // Extract positions for each term in this document
            let mut term_positions = Vec::new();

            for postings in &term_postings {
                let positions = postings.iter()
                    .filter(|p| p.doc_id() == &doc_id)
                    .flat_map(|p| p.positions().to_vec())
                    .collect::<Vec<_>>();

                term_positions.push(positions);
            }

            // Check for sequential positions
            let mut phrase_found = false;

            for &pos in &term_positions[0] {
                let mut found_sequence = true;

                for (i, positions) in term_positions.iter().skip(1).enumerate() {
                    let expected_pos = pos + i + 1;
                    if !positions.contains(&expected_pos) {
                        found_sequence = false;
                        break;
                    }
                }

                if found_sequence {
                    phrase_found = true;
                    break;
                }
            }

            if phrase_found {
                // Calculate a score based on term frequency and document frequency
                let score = 1.0; // Simple score for phrase matches
                results.push(SearchResult::new(doc_id, score));
            }
        }

        // Sort by score (descending)
        results.sort_by(|a, b| b.score().partial_cmp(&a.score()).unwrap_or(std::cmp::Ordering::Equal));

        // Limit results
        let results = results.into_iter().take(limit).collect();

        Ok(results)
    }

    /// Search for documents NOT matching a query
    async fn search_not(&self, query: &Box<SearchQuery>, limit: usize) -> Result<Vec<SearchResult>, RepositoryError> {
        let doc_count = *self.doc_count.read().await;

        // If no documents in index, return empty result
        if doc_count == 0 {
            return Ok(Vec::new());
        }

        // Get all document IDs from the index
        let all_doc_ids = self.get_all_doc_ids().await;

        // Get documents matching the query
        let matching_results = self.search(query, usize::MAX).await?;
        let matching_doc_ids: std::collections::HashSet<_> = matching_results.iter()
            .map(|r| *r.doc_id())
            .collect();

        // Keep documents not in the matching set
        let mut results = Vec::new();

        for doc_id in all_doc_ids {
            if !matching_doc_ids.contains(&doc_id) {
                results.push(SearchResult::new(doc_id, 1.0)); // Simple score for NOT matches
            }
        }

        // Limit results
        let results = results.into_iter().take(limit).collect();

        Ok(results)
    }

    /// Get all document IDs in the index
    async fn get_all_doc_ids(&self) -> Vec<Uuid> {
        let index = self.index.read().await;
        let mut doc_ids = std::collections::HashSet::new();

        for entry in index.values() {
            for posting in entry.postings() {
                doc_ids.insert(*posting.doc_id());
            }
        }

        doc_ids.into_iter().collect()
    }
}

/// Statistics about the index
#[derive(Debug, Clone, Copy)]
pub struct IndexStats {
    /// Number of unique terms in the index
    pub term_count: usize,

    /// Number of documents in the index
    pub document_count: usize,
}
```

### Storage Backend

Now, let's implement a simple storage backend for our index:

```rust
// src/indexer/storage.rs
use std::path::Path;
use tokio::fs::{File, create_dir_all};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use serde::{Serialize, Deserialize};
use bincode;
use async_trait::async_trait;
use tracing::{info, error};

use crate::domain::index::IndexEntry;

/// Error type for index storage operations
#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    SerializationError(String),
}

/// Interface for index storage
#[async_trait]
pub trait IndexStorage: Send + Sync {
    /// Save index entries to storage
    async fn save_entries(&self, entries: &[IndexEntry]) -> Result<(), StorageError>;

    /// Load index entries from storage
    async fn load_entries(&self) -> Result<Vec<IndexEntry>, StorageError>;
}

/// File-based implementation of index storage
pub struct FileIndexStorage {
    /// Directory to store index files
    dir_path: String,
}

impl FileIndexStorage {
    /// Create a new file-based storage
    pub fn new(dir_path: &str) -> Self {
        Self {
            dir_path: dir_path.to_string(),
        }
    }
}

#[async_trait]
impl IndexStorage for FileIndexStorage {
    async fn save_entries(&self, entries: &[IndexEntry]) -> Result<(), StorageError> {
        // Create directory if it doesn't exist
        let dir = Path::new(&self.dir_path);
        create_dir_all(dir).await?;

        // Serialize entries
        let serialized = bincode::serialize(entries)
            .map_err(|e| StorageError::SerializationError(e.to_string()))?;

        // Write to file
        let path = dir.join("index.bin");
        let mut file = File::create(path).await?;
        file.write_all(&serialized).await?;

        info!("Saved {} index entries to {}", entries.len(), self.dir_path);

        Ok(())
    }

    async fn load_entries(&self) -> Result<Vec<IndexEntry>, StorageError> {
        let path = Path::new(&self.dir_path).join("index.bin");

        // Check if file exists
        if !path.exists() {
            info!("Index file not found at {}, returning empty index", path.display());
            return Ok(Vec::new());
        }

        // Read file
        let mut file = File::open(&path).await?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).await?;

        // Deserialize
        let entries: Vec<IndexEntry> = bincode::deserialize(&buffer)
            .map_err(|e| {
                error!("Failed to deserialize index: {}", e);
                StorageError::SerializationError(e.to_string())
            })?;

        info!("Loaded {} index entries from {}", entries.len(), path.display());

        Ok(entries)
    }
}
```

Our indexer implementation now has the complete pipeline from text processing to inverted index creation and storage. Key features include:

1. **Efficient Text Processing**: Normalization, tokenization, stopword removal, and stemming.

2. **Inverted Index**: Core data structure for fast term-based lookups.

3. **TF-IDF Scoring**: Industry-standard relevance ranking algorithm.

4. **Complex Query Support**: Term, phrase, AND, OR, and NOT queries.

5. **Persistence**: Serialization and storage of the index.

The implementation demonstrates several design patterns:

- **Repository Pattern**: Abstracting data access through interfaces.
- **Strategy Pattern**: Pluggable components like text processors and storage backends.
- **Builder Pattern**: Constructing complex objects step by step.
- **Concurrency Control**: Using Rust's async/await with RwLock for thread safety.

In the next section, we'll implement the query processing and search components that will allow users to interact with our search engine.

## Query Processing

The query processing module is responsible for transforming user queries into a format that can be used to search the index. It includes query parsing, expansion, and execution.

### Query Parser

First, let's implement a query parser that converts a text query into a structured search query:

```rust
// src/query/parser.rs
use std::iter::Peekable;
use std::str::Chars;
use tracing::{debug, warn};

use crate::domain::index::SearchQuery;
use crate::domain::term::Term;
use crate::indexer::text_processing::TextProcessor;

/// Error type for query parsing
#[derive(Debug, thiserror::Error)]
pub enum QueryParseError {
    #[error("Syntax error: {0}")]
    SyntaxError(String),

    #[error("Empty query")]
    EmptyQuery,
}

/// Parser for search queries
pub struct QueryParser {
    /// Text processor for normalizing query terms
    processor: TextProcessor,
}

impl QueryParser {
    /// Create a new query parser
    pub fn new(processor: TextProcessor) -> Self {
        Self {
            processor,
        }
    }

    /// Parse a query string into a structured query
    pub fn parse(&self, query: &str) -> Result<SearchQuery, QueryParseError> {
        if query.trim().is_empty() {
            return Err(QueryParseError::EmptyQuery);
        }

        let mut chars = query.chars().peekable();
        self.parse_expression(&mut chars)
    }

    /// Parse an expression (top-level or parenthesized)
    fn parse_expression(&self, chars: &mut Peekable<Chars>) -> Result<SearchQuery, QueryParseError> {
        // Parse the first term/phrase
        let mut terms = Vec::new();

        match self.parse_term_or_phrase(chars)? {
            Some(term_or_phrase) => terms.push(term_or_phrase),
            None => return Err(QueryParseError::EmptyQuery),
        }

        // Look for operators
        while let Some(c) = chars.peek() {
            match c {
                ' ' => {
                    // Skip whitespace
                    chars.next();
                }
                '&' => {
                    // AND operator
                    chars.next();
                    if chars.peek() == Some(&'&') {
                        chars.next();
                    }

                    // Skip whitespace
                    while let Some(' ') = chars.peek() {
                        chars.next();
                    }

                    // Parse the next term
                    if let Some(next_term) = self.parse_term_or_phrase(chars)? {
                        terms.push(next_term);
                    }
                }
                '|' => {
                    // OR operator
                    chars.next();
                    if chars.peek() == Some(&'|') {
                        chars.next();
                    }

                    // Create OR query with what we have so far
                    let left = if terms.len() == 1 {
                        terms.remove(0)
                    } else {
                        SearchQuery::And(terms)
                    };

                    // Skip whitespace
                    while let Some(' ') = chars.peek() {
                        chars.next();
                    }

                    // Parse the right side
                    let right = self.parse_expression(chars)?;

                    return Ok(SearchQuery::Or(vec![left, right]));
                }
                ')' => {
                    // End of parenthesized expression
                    break;
                }
                _ => {
                    // Implicit AND
                    if let Some(next_term) = self.parse_term_or_phrase(chars)? {
                        terms.push(next_term);
                    }
                }
            }
        }

        // Return appropriate query based on number of terms
        if terms.len() == 1 {
            Ok(terms.remove(0))
        } else {
            Ok(SearchQuery::And(terms))
        }
    }

    /// Parse a term, phrase, or parenthesized expression
    fn parse_term_or_phrase(&self, chars: &mut Peekable<Chars>) -> Result<Option<SearchQuery>, QueryParseError> {
        // Skip whitespace
        while let Some(' ') = chars.peek() {
            chars.next();
        }

        // Check for end of input or closing parenthesis
        if chars.peek().is_none() || chars.peek() == Some(&')') {
            return Ok(None);
        }

        match chars.peek() {
            Some(&'"') => {
                // Parse quoted phrase
                chars.next(); // Consume opening quote

                let mut phrase_text = String::new();

                while let Some(c) = chars.next() {
                    if c == '"' {
                        break;
                    }
                    phrase_text.push(c);
                }

                // Process the phrase
                let terms: Vec<Term> = self.processor.process(&phrase_text)
                    .into_iter()
                    .map(Term::new)
                    .collect();

                if terms.is_empty() {
                    return Ok(None);
                }

                Ok(Some(SearchQuery::Phrase(terms)))
            }
            Some(&'(') => {
                // Parse parenthesized expression
                chars.next(); // Consume opening parenthesis

                let expr = self.parse_expression(chars)?;

                // Expect closing parenthesis
                if chars.next() != Some(')') {
                    return Err(QueryParseError::SyntaxError("Missing closing parenthesis".to_string()));
                }

                Ok(Some(expr))
            }
            Some(&'-') => {
                // Parse NOT expression
                chars.next(); // Consume minus

                // Skip whitespace
                while let Some(' ') = chars.peek() {
                    chars.next();
                }

                // Parse the term to negate
                let term = self.parse_term_or_phrase(chars)?
                    .ok_or_else(|| QueryParseError::SyntaxError("Expected term after NOT operator".to_string()))?;

                Ok(Some(SearchQuery::Not(Box::new(term))))
            }
            Some(_) => {
                // Parse single term
                let mut term_text = String::new();

                while let Some(&c) = chars.peek() {
                    if c.is_whitespace() || c == '(' || c == ')' || c == '"' || c == '&' || c == '|' || c == '-' {
                        break;
                    }
                    term_text.push(c);
                    chars.next();
                }

                // Process the term
                let processed_terms = self.processor.process(&term_text);

                if processed_terms.is_empty() {
                    return Ok(None);
                }

                // If multiple terms after processing, treat as AND
                if processed_terms.len() == 1 {
                    Ok(Some(SearchQuery::Term(Term::new(processed_terms[0].clone()))))
                } else {
                    let terms = processed_terms.into_iter()
                        .map(|t| SearchQuery::Term(Term::new(t)))
                        .collect();

                    Ok(Some(SearchQuery::And(terms)))
                }
            }
        }
    }
}
```

### Query Expansion

Next, let's implement query expansion to improve search results:

```rust
// src/query/expansion.rs
use std::collections::HashMap;
use tracing::debug;

use crate::domain::index::SearchQuery;
use crate::domain::term::Term;

/// Query expander interface
pub trait QueryExpander: Send + Sync {
    /// Expand a query with additional terms
    fn expand(&self, query: &SearchQuery) -> SearchQuery;
}

/// Synonym-based query expander
pub struct SynonymExpander {
    /// Map of terms to synonyms
    synonyms: HashMap<String, Vec<String>>,
}

impl SynonymExpander {
    /// Create a new synonym expander
    pub fn new() -> Self {
        Self {
            synonyms: HashMap::new(),
        }
    }

    /// Add a synonym mapping
    pub fn add_synonym(&mut self, term: &str, synonym: &str) {
        self.synonyms
            .entry(term.to_string())
            .or_insert_with(Vec::new)
            .push(synonym.to_string());
    }

    /// Load synonyms from a dictionary
    pub fn load_synonyms(&mut self, synonyms: HashMap<String, Vec<String>>) {
        self.synonyms = synonyms;
    }

    /// Get synonyms for a term
    fn get_synonyms(&self, term: &str) -> Vec<String> {
        self.synonyms
            .get(term)
            .cloned()
            .unwrap_or_default()
    }
}

impl QueryExpander for SynonymExpander {
    fn expand(&self, query: &SearchQuery) -> SearchQuery {
        match query {
            SearchQuery::Term(term) => {
                let synonyms = self.get_synonyms(term.text());

                if synonyms.is_empty() {
                    return query.clone();
                }

                debug!("Expanding term '{}' with synonyms: {:?}", term.text(), synonyms);

                // Create OR query with original term and synonyms
                let mut or_terms = vec![SearchQuery::Term(term.clone())];

                for synonym in synonyms {
                    or_terms.push(SearchQuery::Term(Term::new(synonym)));
                }

                SearchQuery::Or(or_terms)
            }
            SearchQuery::And(queries) => {
                // Expand each subquery
                let expanded = queries.iter()
                    .map(|q| self.expand(q))
                    .collect();

                SearchQuery::And(expanded)
            }
            SearchQuery::Or(queries) => {
                // Expand each subquery
                let expanded = queries.iter()
                    .map(|q| self.expand(q))
                    .collect();

                SearchQuery::Or(expanded)
            }
            SearchQuery::Phrase(terms) => {
                // Don't expand phrases to preserve exact meaning
                query.clone()
            }
            SearchQuery::Not(subquery) => {
                // Expand the subquery
                let expanded = self.expand(subquery);
                SearchQuery::Not(Box::new(expanded))
            }
        }
    }
}
```

### Search Service

Now, let's implement the search service that ties everything together:

```rust
// src/query/search.rs
use std::sync::Arc;
use uuid::Uuid;
use tracing::{info, debug, warn};

use crate::domain::document::{Document, DocumentSummary};
use crate::domain::index::{SearchQuery, SearchResult};
use crate::domain::repository::{DocumentRepository, IndexRepository, RepositoryError};
use crate::query::parser::{QueryParser, QueryParseError};
use crate::query::expansion::QueryExpander;

/// Result of a search operation
pub struct SearchResponse {
    /// List of document summaries
    pub results: Vec<DocumentSummary>,

    /// Total number of results (may be more than returned)
    pub total_count: usize,

    /// Query execution time in milliseconds
    pub execution_time_ms: u64,
}

/// Search service
pub struct SearchService<D, I, E>
where
    D: DocumentRepository,
    I: IndexRepository,
    E: QueryExpander,
{
    /// Document repository
    doc_repository: Arc<D>,

    /// Index repository
    index_repository: Arc<I>,

    /// Query parser
    parser: Arc<QueryParser>,

    /// Query expander
    expander: Arc<E>,
}

impl<D, I, E> SearchService<D, I, E>
where
    D: DocumentRepository,
    I: IndexRepository,
    E: QueryExpander,
{
    /// Create a new search service
    pub fn new(
        doc_repository: Arc<D>,
        index_repository: Arc<I>,
        parser: Arc<QueryParser>,
        expander: Arc<E>,
    ) -> Self {
        Self {
            doc_repository,
            index_repository,
            parser,
            expander,
        }
    }

    /// Search for documents matching a query string
    pub async fn search(
        &self,
        query_str: &str,
        limit: usize,
        expand_query: bool,
    ) -> Result<SearchResponse, SearchError> {
        let start_time = std::time::Instant::now();

        debug!("Searching for: {}", query_str);

        // Parse the query
        let query = self.parser.parse(query_str)
            .map_err(SearchError::QueryParseError)?;

        // Expand the query if requested
        let query = if expand_query {
            self.expander.expand(&query)
        } else {
            query
        };

        debug!("Parsed query: {:?}", query);

        // Execute the search
        let search_results = self.index_repository.search(&query, limit)
            .await
            .map_err(SearchError::RepositoryError)?;

        let total_count = search_results.len();

        // Fetch document details
        let mut documents = Vec::new();

        for result in search_results {
            match self.doc_repository.get_by_id(result.doc_id()).await {
                Ok(doc) => {
                    documents.push(DocumentSummary::from(&doc));
                }
                Err(e) => {
                    warn!("Failed to fetch document {}: {}", result.doc_id(), e);
                }
            }
        }

        let execution_time_ms = start_time.elapsed().as_millis() as u64;

        info!("Search completed in {}ms, found {} results", execution_time_ms, total_count);

        Ok(SearchResponse {
            results: documents,
            total_count,
            execution_time_ms,
        })
    }

    /// Get a document by ID
    pub async fn get_document(&self, id: &Uuid) -> Result<Document, RepositoryError> {
        self.doc_repository.get_by_id(id).await
    }
}

/// Error type for search operations
#[derive(Debug, thiserror::Error)]
pub enum SearchError {
    #[error("Query parse error: {0}")]
    QueryParseError(#[from] QueryParseError),

    #[error("Repository error: {0}")]
    RepositoryError(#[from] RepositoryError),
}
```

### Search API

Finally, let's implement a simple REST API for our search engine:

```rust
// src/api/rest.rs
use std::sync::Arc;
use std::net::SocketAddr;
use axum::{
    Router,
    routing::{get, post},
    extract::{State, Path, Query},
    response::{Json, IntoResponse},
    http::StatusCode,
};
use serde::{Serialize, Deserialize};
use tracing::info;
use uuid::Uuid;

use crate::domain::document::DocumentSummary;
use crate::query::search::{SearchService, SearchError, SearchResponse};

/// State shared across API handlers
struct AppState<S> {
    search_service: Arc<S>,
}

/// Search query parameters
#[derive(Debug, Deserialize)]
struct SearchQuery {
    q: String,
    limit: Option<usize>,
    expand: Option<bool>,
}

/// API response for search
#[derive(Debug, Serialize)]
struct SearchApiResponse {
    results: Vec<DocumentSummary>,
    total_count: usize,
    execution_time_ms: u64,
}

/// API response for errors
#[derive(Debug, Serialize)]
struct ErrorResponse {
    error: String,
}

/// API server
pub struct ApiServer<S> {
    search_service: Arc<S>,
    address: SocketAddr,
}

impl<S> ApiServer<S>
where
    S: SearchService<D, I, E> + Send + Sync + 'static,
    D: DocumentRepository + Send + Sync + 'static,
    I: IndexRepository + Send + Sync + 'static,
    E: QueryExpander + Send + Sync + 'static,
{
    /// Create a new API server
    pub fn new(search_service: Arc<S>, address: SocketAddr) -> Self {
        Self {
            search_service,
            address,
        }
    }

    /// Start the API server
    pub async fn run(&self) -> Result<(), std::io::Error> {
        let app_state = Arc::new(AppState {
            search_service: self.search_service.clone(),
        });

        let app = Router::new()
            .route("/search", get(Self::search))
            .route("/documents/:id", get(Self::get_document))
            .with_state(app_state);

        info!("Starting API server on {}", self.address);

        axum::Server::bind(&self.address)
            .serve(app.into_make_service())
            .await
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
    }

    /// Handler for search endpoint
    async fn search(
        State(state): State<Arc<AppState<S>>>,
        Query(query): Query<SearchQuery>,
    ) -> impl IntoResponse {
        let limit = query.limit.unwrap_or(10);
        let expand = query.expand.unwrap_or(true);

        match state.search_service.search(&query.q, limit, expand).await {
            Ok(response) => {
                let api_response = SearchApiResponse {
                    results: response.results,
                    total_count: response.total_count,
                    execution_time_ms: response.execution_time_ms,
                };

                (StatusCode::OK, Json(api_response))
            }
            Err(e) => {
                let status = match e {
                    SearchError::QueryParseError(_) => StatusCode::BAD_REQUEST,
                    SearchError::RepositoryError(_) => StatusCode::INTERNAL_SERVER_ERROR,
                };

                let error_response = ErrorResponse {
                    error: e.to_string(),
                };

                (status, Json(error_response))
            }
        }
    }

    /// Handler for document retrieval endpoint
    async fn get_document(
        State(state): State<Arc<AppState<S>>>,
        Path(id): Path<Uuid>,
    ) -> impl IntoResponse {
        match state.search_service.get_document(&id).await {
            Ok(document) => {
                (StatusCode::OK, Json(document))
            }
            Err(e) => {
                let status = match e {
                    RepositoryError::NotFound(_) => StatusCode::NOT_FOUND,
                    _ => StatusCode::INTERNAL_SERVER_ERROR,
                };

                let error_response = ErrorResponse {
                    error: e.to_string(),
                };

                (status, Json(error_response))
            }
        }
    }
}
```

Our query processing implementation completes the search engine with these key components:

1. **Query Parser**: Transforms user-friendly search queries into structured queries.

2. **Query Expansion**: Enhances queries with synonyms to improve recall.

3. **Search Service**: Coordinates query execution and result retrieval.

4. **REST API**: Exposes search functionality through a web interface.

The implementation features:

- **Flexible Query Syntax**: Support for terms, phrases, AND, OR, and NOT operators.
- **Modular Architecture**: Separating parsing, expansion, and execution concerns.
- **Error Handling**: Comprehensive error types and status codes.
- **Documentation**: Clear comments explaining the purpose of each component.

This completes our search engine implementation, demonstrating a well-structured, maintainable, and efficient design.

## Practical Project: Building a Code Search Engine

Let's apply what we've learned to create a specialized search engine for searching through code repositories. This practical project will demonstrate how our search engine architecture can be adapted for specific use cases.

### Project Requirements

Our code search engine should:

1. Index Rust source code files
2. Support searching by function names, module names, and code snippets
3. Provide code-aware search features like type-aware matching
4. Display search results with syntax highlighting
5. Support filtering by file type, module, and other metadata

### Code-Specific Tokenizer

First, let's create a specialized tokenizer for Rust code:

```rust
// src/indexer/code_tokenizer.rs
use std::collections::HashMap;
use uuid::Uuid;
use tracing::debug;

use crate::domain::document::Document;
use crate::domain::term::{Term, TermFrequency};
use crate::indexer::tokenizer::TokenizationResult;

/// Tokenizer for Rust code
pub struct RustCodeTokenizer {
    /// Base tokenizer
    base_tokenizer: Tokenizer,

    /// Keywords to highlight
    rust_keywords: Vec<String>,
}

impl RustCodeTokenizer {
    /// Create a new Rust code tokenizer
    pub fn new(processor: TextProcessor) -> Self {
        let rust_keywords = vec![
            "as", "break", "const", "continue", "crate", "else", "enum", "extern",
            "false", "fn", "for", "if", "impl", "in", "let", "loop", "match", "mod",
            "move", "mut", "pub", "ref", "return", "self", "Self", "static", "struct",
            "super", "trait", "true", "type", "unsafe", "use", "where", "while",
            "async", "await", "dyn", "abstract", "become", "box", "do", "final",
            "macro", "override", "priv", "typeof", "unsized", "virtual", "yield",
        ].into_iter().map(String::from).collect();

        Self {
            base_tokenizer: Tokenizer::new(processor),
            rust_keywords,
        }
    }

    /// Tokenize a Rust source code document
    pub fn tokenize(&self, document: &Document) -> TokenizationResult {
        debug!("Tokenizing Rust code document: {}", document.id());

        // Start with base tokenization
        let base_result = self.base_tokenizer.tokenize(document);

        // Extract additional Rust-specific tokens
        let mut term_frequencies = base_result.term_frequencies;

        // Extract function definitions
        if let Some(functions) = self.extract_functions(document) {
            for (fn_name, positions) in functions {
                let term = Term::with_position(format!("fn:{}", fn_name), positions[0]);

                if let Some(tf) = term_frequencies.get_mut(&term.text().to_string()) {
                    for pos in positions {
                        tf.increment(Some(pos));
                    }
                } else {
                    let mut tf = TermFrequency::new(term);
                    for pos in positions.iter().skip(1) {
                        tf.increment(Some(*pos));
                    }
                    term_frequencies.insert(term.text().to_string(), tf);
                }
            }
        }

        // Extract module declarations
        if let Some(modules) = self.extract_modules(document) {
            for (mod_name, positions) in modules {
                let term = Term::with_position(format!("mod:{}", mod_name), positions[0]);

                if let Some(tf) = term_frequencies.get_mut(&term.text().to_string()) {
                    for pos in positions {
                        tf.increment(Some(pos));
                    }
                } else {
                    let mut tf = TermFrequency::new(term);
                    for pos in positions.iter().skip(1) {
                        tf.increment(Some(*pos));
                    }
                    term_frequencies.insert(term.text().to_string(), tf);
                }
            }
        }

        // Extract struct and enum declarations
        if let Some(types) = self.extract_types(document) {
            for (type_name, type_kind, positions) in types {
                let term = Term::with_position(format!("{}:{}", type_kind, type_name), positions[0]);

                if let Some(tf) = term_frequencies.get_mut(&term.text().to_string()) {
                    for pos in positions {
                        tf.increment(Some(pos));
                    }
                } else {
                    let mut tf = TermFrequency::new(term);
                    for pos in positions.iter().skip(1) {
                        tf.increment(Some(*pos));
                    }
                    term_frequencies.insert(term.text().to_string(), tf);
                }
            }
        }

        TokenizationResult {
            doc_id: base_result.doc_id,
            term_frequencies,
        }
    }

    /// Extract function definitions from code
    fn extract_functions(&self, document: &Document) -> Option<HashMap<String, Vec<usize>>> {
        let content = document.content();

        // Simple regex-based extraction (in a real implementation, we'd use a proper parser)
        let fn_regex = regex::Regex::new(r"fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(").ok()?;

        let mut functions = HashMap::new();

        for capture in fn_regex.captures_iter(content) {
            if let Some(fn_match) = capture.get(1) {
                let fn_name = fn_match.as_str().to_string();
                let position = fn_match.start();

                functions.entry(fn_name)
                    .or_insert_with(Vec::new)
                    .push(position);
            }
        }

        Some(functions)
    }

    /// Extract module declarations from code
    fn extract_modules(&self, document: &Document) -> Option<HashMap<String, Vec<usize>>> {
        let content = document.content();

        let mod_regex = regex::Regex::new(r"mod\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;").ok()?;

        let mut modules = HashMap::new();

        for capture in mod_regex.captures_iter(content) {
            if let Some(mod_match) = capture.get(1) {
                let mod_name = mod_match.as_str().to_string();
                let position = mod_match.start();

                modules.entry(mod_name)
                    .or_insert_with(Vec::new)
                    .push(position);
            }
        }

        Some(modules)
    }

    /// Extract struct and enum declarations from code
    fn extract_types(&self, document: &Document) -> Option<Vec<(String, String, Vec<usize>)>> {
        let content = document.content();

        let struct_regex = regex::Regex::new(r"struct\s+([a-zA-Z_][a-zA-Z0-9_]*)").ok()?;
        let enum_regex = regex::Regex::new(r"enum\s+([a-zA-Z_][a-zA-Z0-9_]*)").ok()?;

        let mut types = Vec::new();

        for capture in struct_regex.captures_iter(content) {
            if let Some(type_match) = capture.get(1) {
                let type_name = type_match.as_str().to_string();
                let position = type_match.start();

                types.push((type_name, "struct".to_string(), vec![position]));
            }
        }

        for capture in enum_regex.captures_iter(content) {
            if let Some(type_match) = capture.get(1) {
                let type_name = type_match.as_str().to_string();
                let position = type_match.start();

                types.push((type_name, "enum".to_string(), vec![position]));
            }
        }

        Some(types)
    }
}
```

### Code Repository Crawler

Now, let's create a crawler that can navigate a code repository:

```rust
// src/crawler/code_crawler.rs
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::fs::{self, File};
use tokio::io::AsyncReadExt;
use uuid::Uuid;
use url::Url;
use tracing::{info, debug, warn};
use async_trait::async_trait;

use crate::domain::document::Document;
use crate::domain::repository::{DocumentRepository, RepositoryError};
use crate::crawler::spider::WebCrawler;

/// Configuration for code crawler
#[derive(Debug, Clone)]
pub struct CodeCrawlerConfig {
    /// Root directory to crawl
    pub root_dir: PathBuf,

    /// File extensions to include
    pub include_extensions: Vec<String>,

    /// Directories to exclude
    pub exclude_dirs: Vec<String>,

    /// Maximum file size to process (in bytes)
    pub max_file_size: u64,
}

/// Implementation of a code repository crawler
pub struct CodeCrawler<D>
where
    D: DocumentRepository,
{
    /// Document repository
    repository: Arc<D>,

    /// Configuration
    config: CodeCrawlerConfig,

    /// Flag to indicate if the crawler is running
    running: Arc<tokio::sync::RwLock<bool>>,
}

impl<D> CodeCrawler<D>
where
    D: DocumentRepository,
{
    /// Create a new code crawler
    pub fn new(repository: Arc<D>, config: CodeCrawlerConfig) -> Self {
        Self {
            repository,
            config,
            running: Arc::new(tokio::sync::RwLock::new(false)),
        }
    }

    /// Check if a file should be included based on extension
    fn should_include_file(&self, path: &Path) -> bool {
        if let Some(ext) = path.extension() {
            if let Some(ext_str) = ext.to_str() {
                return self.config.include_extensions.iter()
                    .any(|included_ext| included_ext == ext_str);
            }
        }
        false
    }

    /// Check if a directory should be excluded
    fn should_exclude_dir(&self, path: &Path) -> bool {
        if let Some(dir_name) = path.file_name() {
            if let Some(dir_str) = dir_name.to_str() {
                return self.config.exclude_dirs.iter()
                    .any(|excluded_dir| excluded_dir == dir_str);
            }
        }
        false
    }

    /// Process a file and create a document
    async fn process_file(&self, path: &Path) -> Result<Document, std::io::Error> {
        // Open the file
        let mut file = File::open(path).await?;

        // Check file size
        let metadata = file.metadata().await?;
        if metadata.len() > self.config.max_file_size {
            return Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("File too large: {} bytes", metadata.len())
            ));
        }

        // Read the file content
        let mut content = String::new();
        file.read_to_string(&mut content).await?;

        // Create a URL from the file path
        let file_url = Url::from_file_path(path)
            .map_err(|_| std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Failed to convert path to URL: {:?}", path)
            ))?;

        // Get the file name as title
        let title = path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("Unknown")
            .to_string();

        // Create document
        let document = Document::new(file_url, title, content);

        Ok(document)
    }

    /// Crawl a directory recursively
    async fn crawl_directory(&self, dir_path: &Path) -> Result<Vec<Document>, std::io::Error> {
        let mut documents = Vec::new();

        let mut entries = fs::read_dir(dir_path).await?;

        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();

            // Check if we should stop
            if !*self.running.read().await {
                break;
            }

            if path.is_dir() {
                // Skip excluded directories
                if self.should_exclude_dir(&path) {
                    debug!("Skipping excluded directory: {:?}", path);
                    continue;
                }

                // Recursively crawl subdirectory
                match self.crawl_directory(&path).await {
                    Ok(mut sub_docs) => documents.append(&mut sub_docs),
                    Err(e) => warn!("Error crawling directory {:?}: {}", path, e),
                }
            } else if path.is_file() && self.should_include_file(&path) {
                // Process file
                match self.process_file(&path).await {
                    Ok(doc) => documents.push(doc),
                    Err(e) => warn!("Error processing file {:?}: {}", path, e),
                }
            }
        }

        Ok(documents)
    }
}

#[async_trait]
impl<D> WebCrawler for CodeCrawler<D>
where
    D: DocumentRepository + Send + Sync + 'static,
{
    async fn crawl(&self, _seeds: Vec<Url>) -> Result<(), RepositoryError> {
        // Set running flag
        let mut running = self.running.write().await;
        if *running {
            warn!("Crawler is already running");
            return Ok(());
        }
        *running = true;
        drop(running);

        info!("Starting code crawler at: {:?}", self.config.root_dir);

        // Crawl the root directory
        let documents = match self.crawl_directory(&self.config.root_dir).await {
            Ok(docs) => docs,
            Err(e) => {
                error!("Failed to crawl directory: {}", e);
                let mut running = self.running.write().await;
                *running = false;
                return Err(RepositoryError::StorageError(e.to_string()));
            }
        };

        info!("Found {} documents", documents.len());

        // Store documents
        for document in documents {
            if let Err(e) = self.repository.store(document).await {
                warn!("Failed to store document: {}", e);
            }
        }

        // Clear running flag
        let mut running = self.running.write().await;
        *running = false;

        info!("Code crawler finished");
        Ok(())
    }

    async fn crawl_url(&self, url: Url, _depth: usize) -> Result<Option<Document>, RepositoryError> {
        // Convert URL to file path
        let path = match url.to_file_path() {
            Ok(p) => p,
            Err(_) => return Err(RepositoryError::InvalidOperation(
                format!("URL is not a file path: {}", url)
            )),
        };

        // Process the file
        match self.process_file(&path).await {
            Ok(doc) => {
                // Store the document
                self.repository.store(doc.clone()).await?;
                Ok(Some(doc))
            }
            Err(e) => Err(RepositoryError::StorageError(e.to_string())),
        }
    }

    async fn stop(&self) {
        let mut running = self.running.write().await;
        *running = false;
        info!("Code crawler stop requested");
    }

    async fn is_running(&self) -> bool {
        *self.running.read().await
    }
}
```

### Putting It All Together

Now, let's create a CLI application that uses our code search engine:

```rust
// src/main.rs
use std::path::PathBuf;
use std::sync::Arc;
use clap::{Parser, Subcommand};
use tokio;
use tracing::{info, error, Level};
use tracing_subscriber::FmtSubscriber;

use rusty_search::domain::repository::{DocumentRepository, IndexRepository};
use rusty_search::crawler::code_crawler::{CodeCrawler, CodeCrawlerConfig};
use rusty_search::indexer::text_processing::TextProcessor;
use rusty_search::indexer::code_tokenizer::RustCodeTokenizer;
use rusty_search::indexer::inverted_index::InvertedIndex;
use rusty_search::indexer::storage::FileIndexStorage;
use rusty_search::query::parser::QueryParser;
use rusty_search::query::expansion::SynonymExpander;
use rusty_search::query::search::SearchService;
use rusty_search::api::rest::ApiServer;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Index a code repository
    Index {
        /// Path to the repository
        #[arg(short, long)]
        path: PathBuf,

        /// Extensions to include (comma-separated)
        #[arg(short, long, default_value = "rs")]
        extensions: String,

        /// Directories to exclude (comma-separated)
        #[arg(short, long, default_value = "target,.git")]
        exclude: String,
    },
    /// Start the search API server
    Serve {
        /// Host to bind to
        #[arg(short, long, default_value = "127.0.0.1")]
        host: String,

        /// Port to bind to
        #[arg(short, long, default_value_t = 8080)]
        port: u16,
    },
    /// Perform a search from the command line
    Search {
        /// Search query
        #[arg(required = true)]
        query: String,

        /// Maximum number of results
        #[arg(short, long, default_value_t = 10)]
        limit: usize,
    },
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Set up logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    // Parse command line arguments
    let cli = Cli::parse();

    // Set up common components
    let data_dir = PathBuf::from("./data");
    std::fs::create_dir_all(&data_dir)?;

    let doc_repository = Arc::new(MemoryDocumentRepository::new());
    let storage = Arc::new(FileIndexStorage::new(data_dir.join("index").to_str().unwrap()));

    let text_processor = TextProcessor::new_english();
    let tokenizer = Arc::new(RustCodeTokenizer::new(text_processor.clone()));
    let index = Arc::new(InvertedIndex::new(tokenizer, storage));

    // Load index if it exists
    if let Err(e) = index.load().await {
        error!("Failed to load index: {}", e);
    }

    // Set up query components
    let parser = Arc::new(QueryParser::new(text_processor));
    let expander = Arc::new(SynonymExpander::new());

    // Set up search service
    let search_service = Arc::new(SearchService::new(
        doc_repository.clone(),
        index.clone(),
        parser,
        expander,
    ));

    // Handle commands
    match cli.command {
        Commands::Index { path, extensions, exclude } {
            // Parse extensions and exclude directories
            let exts: Vec<String> = extensions.split(',')
                .map(|s| s.trim().to_string())
                .collect();

            let excludes: Vec<String> = exclude.split(',')
                .map(|s| s.trim().to_string())
                .collect();

            // Configure crawler
            let config = CodeCrawlerConfig {
                root_dir: path,
                include_extensions: exts,
                exclude_dirs: excludes,
                max_file_size: 1024 * 1024, // 1MB
            };

            // Create and run crawler
            let crawler = CodeCrawler::new(doc_repository.clone(), config);

            info!("Starting indexing...");
            crawler.crawl(Vec::new()).await?;

            // Save index
            info!("Saving index...");
            index.save().await?;

            info!("Indexing complete!");
        }
        Commands::Serve { host, port } => {
            // Set up API server
            let addr = format!("{}:{}", host, port).parse()?;
            let server = ApiServer::new(search_service, addr);

            info!("Starting server on {}:{}", host, port);
            server.run().await?;
        }
        Commands::Search { query, limit } => {
            // Perform search
            info!("Searching for: {}", query);

            match search_service.search(&query, limit, true).await {
                Ok(response) => {
                    println!("Found {} results in {}ms:",
                        response.total_count,
                        response.execution_time_ms
                    );

                    for (i, result) in response.results.iter().enumerate() {
                        println!("{}. {}", i + 1, result.title());
                        println!("   {}", result.url());
                        println!("   {}", result.snippet());
                        println!();
                    }
                }
                Err(e) => {
                    error!("Search failed: {}", e);
                }
            }
        }
    }

    Ok(())
}
```

This implementation demonstrates how our generic search engine architecture can be specialized for code search. The code-specific tokenizer extracts programming language constructs like functions, modules, and types, while the code crawler efficiently navigates repository structures.

## Conclusion

In this chapter, we've built a comprehensive search engine from the ground up using Rust. We've covered all the essential components of a search engine:

1. **Web Crawler**: A scalable, concurrent crawler that respects robots.txt and crawling best practices.

2. **Document Processing**: Tokenization, text normalization, and language detection.

3. **Inverted Index**: The core data structure that enables efficient searching.

4. **Query Processing**: Parsing, expansion, and execution of search queries.

5. **Search API**: A clean REST interface for interacting with the search engine.

Throughout the implementation, we've applied several key design principles:

- **Clean Architecture**: Separating concerns into distinct layers with well-defined interfaces.
- **SOLID Principles**: Creating modular, extensible components.
- **Concurrency**: Leveraging Rust's async/await for efficient parallel processing.
- **Error Handling**: Comprehensive error types and propagation.
- **Testing**: Structure that facilitates unit and integration testing.

The resulting search engine is not just a toy example but a solid foundation for building real-world search applications. We've demonstrated its flexibility by adapting it for code search, but the same architecture could be specialized for other domains like e-commerce, document management, or media search.

## Exercises

1. Implement a document repository backed by a SQL database like PostgreSQL.
2. Add support for faceted search (filtering by metadata).
3. Implement a more sophisticated ranking algorithm like Okapi BM25.
4. Add spell checking and "Did you mean?" suggestions.
5. Implement search result highlighting that shows query terms in context.
6. Create a web crawler that can handle JavaScript-rendered content.
7. Add support for image search using image feature extraction.
8. Implement a distributed inverted index using a technique like sharding.
9. Create a web interface for the search engine using a Rust web framework like Yew.
10. Add authentication and per-user search history.

By completing these exercises, you'll gain a deeper understanding of search engine technology and further enhance your Rust programming skills.
