# Chapter 13: Modules and Organizing Code

## Introduction

As your Rust projects grow, organizing your code becomes increasingly important. Well-structured code enhances maintainability, readability, and collaboration. Rust provides a robust module system that allows you to organize code in a logical hierarchy, control access to implementation details, and create clear interfaces for others to use.

In this chapter, we'll explore:

- Why code organization matters
- Creating modules to group related code
- Building module hierarchies
- Controlling visibility with public and private interfaces
- The details of Rust's module system
- Working with paths and imports
- Reexporting items with `pub use`
- Managing external dependencies
- Organizing large projects
- Using workspaces for multi-package projects
- Publishing and versioning crates

By the end of this chapter, you'll understand how to structure Rust code effectively and create a library with a clean, user-friendly API.

## Why Code Organization Matters

Good code organization offers several key benefits:

### Maintainability

Well-organized code is easier to maintain. When related functionality is grouped together, you can make changes with confidence, understanding the scope and impact of your modifications.

```rust
// Without organization - all functions in one file
fn validate_user(user: &User) -> bool { /* ... */ }
fn format_report(data: &[ReportData]) -> String { /* ... */ }
fn calculate_statistics(values: &[f64]) -> Stats { /* ... */ }
fn send_email(to: &str, body: &str) -> Result<(), Error> { /* ... */ }

// With organization - functions grouped by domain
mod users {
    pub fn validate_user(user: &User) -> bool { /* ... */ }
}

mod reporting {
    pub fn format_report(data: &[ReportData]) -> String { /* ... */ }
    pub fn calculate_statistics(values: &[f64]) -> Stats { /* ... */ }
}

mod communication {
    pub fn send_email(to: &str, body: &str) -> Result<(), Error> { /* ... */ }
}
```

### Readability

Properly organized code is easier to understand. New team members can quickly grasp the project structure and find the components they need to work with.

### Reusability

Good organization facilitates code reuse. When functionality is properly encapsulated in modules, it becomes easier to reuse that code in different parts of your application or even in different projects.

### Encapsulation

The module system allows you to hide implementation details while exposing only the necessary interfaces. This reduces the surface area for bugs and makes your code more robust to changes.

### Scalability

As projects grow, organization becomes crucial. A well-structured project can scale smoothly from a small utility to a large application with multiple components.

## Creating Modules

Modules in Rust are containers for related items like functions, structs, enums, traits, and even other modules. They help organize code and control the privacy of items.

### Basic Module Syntax

You create a module using the `mod` keyword:

```rust
// Define a module named 'networking'
mod networking {
    // Functions, structs, etc. go here
    pub fn connect(address: &str) -> Result<Connection, Error> {
        // Implementation
    }

    fn internal_helper() {
        // This function is private to the module
    }
}

// Using an item from the module
fn main() {
    networking::connect("example.com:8080");
}
```

### Module Privacy Rules

By default, everything in Rust is private. To make an item accessible outside its module, you must use the `pub` keyword:

```rust
mod math {
    // Public function - can be called from outside the module
    pub fn add(a: i32, b: i32) -> i32 {
        a + b
    }

    // Private function - only accessible within this module
    fn complex_algorithm(x: i32) -> i32 {
        // Implementation
        x * 2
    }
}

fn main() {
    // This works because add is public
    let sum = math::add(5, 10);

    // This would fail because complex_algorithm is private
    // let result = math::complex_algorithm(5);
}
```

### Module Files and Directories

Modules can be defined in three ways:

1. **Inline in a file**:

```rust
// src/main.rs or src/lib.rs
mod config {
    pub struct Settings { /* ... */ }
}
```

2. **In a separate file**:

```rust
// src/main.rs or src/lib.rs
mod config; // Tells Rust to look for either src/config.rs or src/config/mod.rs

// src/config.rs
pub struct Settings { /* ... */ }
```

3. **In a directory with a mod.rs file**:

```rust
// src/main.rs or src/lib.rs
mod config;

// src/config/mod.rs
pub struct Settings { /* ... */ }
pub mod logging; // Nested module defined in src/config/logging.rs

// src/config/logging.rs
pub fn init() { /* ... */ }
```

## Module Hierarchies

Modules can be nested to create hierarchies, allowing for even better code organization.

### Nesting Modules

You can define modules inside other modules:

```rust
mod networking {
    pub mod http {
        pub fn get(url: &str) -> Result<String, Error> {
            // Implementation
        }

        pub fn post(url: &str, data: &str) -> Result<String, Error> {
            // Implementation
        }
    }

    pub mod tcp {
        pub fn connect(address: &str) -> Result<Connection, Error> {
            // Implementation
        }
    }

    // Private module - only accessible within networking
    mod internal {
        pub fn log_connection(address: &str) {
            // Even though this function is public, the module is private
            // so this function can only be accessed from within the networking module
        }
    }
}

fn main() {
    // Using nested modules
    networking::http::get("https://example.com");
    networking::tcp::connect("example.com:8080");
}
```

### Module Trees

The module structure creates a tree, similar to a filesystem. The crate root (usually `src/main.rs` or `src/lib.rs`) forms the base of this tree:

```
crate
 ├── networking
 │    ├── http
 │    │    ├── get
 │    │    └── post
 │    ├── tcp
 │    │    └── connect
 │    └── internal
 │         └── log_connection
 └── other_module
      └── ...
```

### Organizing by Feature

A common approach is to organize code by feature or domain:

```rust
mod users {
    pub mod authentication {
        pub fn login(username: &str, password: &str) -> Result<User, AuthError> {
            // Implementation
        }

        pub fn logout(user: &User) {
            // Implementation
        }
    }

    pub mod profile {
        pub fn update(user: &mut User, data: ProfileData) -> Result<(), ProfileError> {
            // Implementation
        }
    }
}

mod products {
    pub mod catalog {
        pub fn search(query: &str) -> Vec<Product> {
            // Implementation
        }
    }

    pub mod inventory {
        pub fn check_availability(product_id: u64) -> u32 {
            // Implementation
        }
    }
}
```

This approach makes it easy to understand where to find specific functionality and helps maintain clear boundaries between different parts of your application.

## Public vs Private Interfaces

One of Rust's key strengths is its ability to strictly control what is exposed to users of your code. This allows you to maintain a stable public API while keeping the freedom to change implementation details.

### Privacy Rules

Rust follows these privacy rules:

1. All items (functions, types, modules, etc.) are **private by default**
2. Items can be made public with the `pub` keyword
3. Public items in private modules are not accessible
4. Child modules can access private items in parent modules
5. Parent modules cannot access private items in child modules

### Controlling Access to Structs and Enums

For structs, both the struct itself and its fields have their own visibility:

```rust
// A public struct with both public and private fields
pub struct User {
    pub username: String,
    pub email: String,
    password_hash: String,  // Private field
}

impl User {
    pub fn new(username: String, email: String, password: String) -> User {
        User {
            username,
            email,
            password_hash: hash_password(password),
        }
    }

    pub fn verify_password(&self, password: &str) -> bool {
        // Implementation can access private fields
        self.password_hash == hash_password(password)
    }
}

fn main() {
    let user = User::new(
        "alice".to_string(),
        "alice@example.com".to_string(),
        "secret123".to_string()
    );

    // Public fields are accessible
    println!("Username: {}", user.username);

    // This would fail because password_hash is private
    // println!("Password hash: {}", user.password_hash);

    // But we can use the public method that internally accesses it
    if user.verify_password("secret123") {
        println!("Password verified!");
    }
}
```

For enums, making the enum public makes all its variants public:

```rust
pub enum ConnectionState {
    Connected,
    Disconnected,
    Connecting,
    Failed(String),
}
```

### Advanced Visibility Modifiers

Rust also provides finer-grained control over visibility:

```rust
// Visible only within the current crate
pub(crate) fn crate_visible_function() { /* ... */ }

// Visible only to a specific parent module and its descendants
pub(in crate::parent_module) fn parent_visible_function() { /* ... */ }

// Visible only to the immediate parent module
pub(super) fn super_visible_function() { /* ... */ }

// Visible only within the current module
pub(self) fn self_visible_function() { /* ... */ } // Same as just omitting `pub`
```

### Designing Good Interfaces

When designing public interfaces, follow these principles:

1. **Minimal API surface**: Expose only what users need
2. **Information hiding**: Keep implementation details private
3. **Invariant protection**: Use privacy to enforce data constraints
4. **Evolution flexibility**: Private implementation can change without breaking users
5. **Clear documentation**: Document the public interface thoroughly

```rust
// A well-designed module with minimal public interface
pub mod database {
    use std::collections::HashMap;

    // Public types that form the interface
    pub struct Database {
        // Implementation details hidden
        connections: ConnectionPool,
        cache: Cache,
    }

    pub struct QueryResult {
        pub rows: Vec<Row>,
    }

    pub struct Row {
        data: HashMap<String, Value>,
    }

    pub enum Value {
        Integer(i64),
        Float(f64),
        Text(String),
        Boolean(bool),
        Null,
    }

    // Public methods forming the API
    impl Database {
        pub fn connect(url: &str) -> Result<Database, ConnectionError> {
            // Implementation
        }

        pub fn query(&self, sql: &str) -> Result<QueryResult, QueryError> {
            // Implementation using private helper functions
        }
    }

    impl Row {
        pub fn get(&self, column: &str) -> Option<&Value> {
            self.data.get(column)
        }
    }

    // Private implementation details
    struct ConnectionPool {
        // Details
    }

    struct Cache {
        // Details
    }

    // Private helper functions
    fn parse_query(sql: &str) -> Result<ParsedQuery, ParseError> {
        // Implementation
    }
}
```

## The Module System in Detail

Rust's module system consists of several interconnected concepts that work together to organize code.

### Packages and Crates

A **package** is a bundle of one or more crates that provides a set of functionality. A package contains a `Cargo.toml` file that describes how to build those crates.

A **crate** is a compilation unit in Rust. It can be a binary crate or a library crate:

- **Binary crate**: Produces an executable (has a `main` function)
- **Library crate**: Produces a library for others to use (has no `main` function)

```toml
# Cargo.toml defining a package
[package]
name = "my_package"
version = "0.1.0"
edition = "2021"

# Optional dependencies
[dependencies]
serde = "1.0"
```

A package can contain:

- At most one library crate (`src/lib.rs`)
- Any number of binary crates (`src/main.rs` or files in `src/bin/`)

### Module Resolution

When you declare a module, Rust needs to know where to find the module's code. It follows these rules:

1. First, it looks for the code inline after the `mod` declaration
2. If not found inline, it looks for a file named after the module
3. For a module named `foo`, it checks:
   - `src/foo.rs`
   - `src/foo/mod.rs`

For nested modules like `foo::bar`, it checks:

- `src/foo/bar.rs`
- `src/foo/bar/mod.rs`

### The `use` Keyword

The `use` keyword brings items into scope, allowing you to refer to them with shorter paths:

```rust
mod deeply {
    pub mod nested {
        pub mod module {
            pub fn function() {
                // Implementation
            }
        }
    }
}

// Without use
fn function1() {
    deeply::nested::module::function();
}

// With use
use deeply::nested::module;

fn function2() {
    module::function();
}

// Or directly bring the function into scope
use deeply::nested::module::function;

fn function3() {
    function();
}
```

## Paths and Imports

Paths allow you to refer to items within the module hierarchy, while imports (via the `use` keyword) bring those items into the current scope for easier access.

### Absolute and Relative Paths

Rust supports both absolute and relative paths:

```rust
// Absolute path (starts from crate root)
crate::module::function();

// Relative path (starts from current module)
module::function();

// Relative path using super (parent module)
super::module::function();

// Relative path using self (current module)
self::function();
```

### Import Patterns and Best Practices

Rust has established conventions for how to import different types of items:

```rust
// For functions: import the parent module
use std::io;
io::Write::flush(&mut file)?;

// For types (structs, enums): import the type directly
use std::collections::HashMap;
let map = HashMap::new();

// For traits: import the trait directly
use std::io::Write;
file.flush()?;

// For macros in Rust 2018+: import the macro directly
use std::vec;
let v = vec![1, 2, 3];
```

### Import Grouping and Nesting

You can group imports to reduce repetition:

```rust
// Instead of:
use std::io;
use std::io::Write;
use std::collections::HashMap;
use std::collections::HashSet;

// You can write:
use std::io::{self, Write};
use std::collections::{HashMap, HashSet};
```

### Renaming with `as`

If you need to import items with the same name from different modules, you can rename them:

```rust
use std::io::Result as IoResult;
use std::fmt::Result as FmtResult;

fn function1() -> IoResult<()> {
    // IO operation
    Ok(())
}

fn function2() -> FmtResult {
    // Formatting operation
    Ok(())
}
```

## External Packages and Dependencies

Rust's ecosystem is rich with external packages (called "crates") that you can use in your projects. To use an external crate, you need to:

1. Add it to your `Cargo.toml` file
2. Import it using the `use` keyword

```toml
# Cargo.toml
[dependencies]
serde = "1.0.130"
serde_json = "1.0"
tokio = { version = "1.12", features = ["full"] }
```

```rust
// In your code
use serde::{Serialize, Deserialize};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

#[derive(Serialize, Deserialize, Debug)]
struct User {
    name: String,
    email: String,
    active: bool,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let user = User {
        name: "Alice".to_string(),
        email: "alice@example.com".to_string(),
        active: true,
    };

    // Serialize the user to JSON
    let json = serde_json::to_string(&user)?;
    println!("Serialized: {}", json);

    // Deserialize the JSON back to a User
    let deserialized: User = serde_json::from_str(&json)?;
    println!("Deserialized: {:?}", deserialized);

    Ok(())
}
```

### Managing Dependencies

Cargo, Rust's package manager, handles dependencies for you. It downloads, compiles, and links them automatically.

#### Dependency Versions

You can specify dependency versions in several ways:

```toml
[dependencies]
# Exact version
regex = "1.5.4"

# Caret requirement (compatible with)
serde = "^1.0.0"  # same as "1.0.0"

# Compatible with at least version
tokio = ">= 1.0, < 2.0"

# Wildcard
log = "0.4.*"

# Git repository
custom_lib = { git = "https://github.com/user/repo" }

# Local path
local_lib = { path = "../local_lib" }
```

#### Features

Many Rust crates use "features" to enable optional functionality:

```toml
[dependencies]
tokio = { version = "1.12", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
```

## Reexporting with pub use

The `pub use` syntax allows you to re-export items from one module through another. This is powerful for creating clean, user-friendly interfaces that hide the internal structure of your crate.

### Why Use pub use?

1. **API design**: Create a clean, logical API regardless of internal structure
2. **Deprecation path**: Move items internally while maintaining backward compatibility
3. **Prelude pattern**: Group commonly used items for easy importing

### Example of pub use

```rust
// Internal structure
mod network {
    pub mod ipv4 {
        pub fn connect() { /* ... */ }
    }

    pub mod ipv6 {
        pub fn connect() { /* ... */ }
    }
}

// Re-exports for a cleaner API
pub use network::ipv4::connect as connect_ipv4;
pub use network::ipv6::connect as connect_ipv6;

// Users can now do:
// use my_crate::connect_ipv4;
// Instead of:
// use my_crate::network::ipv4::connect;
```

### The Prelude Pattern

Many Rust crates define a prelude module that re-exports the most commonly used items:

```rust
// lib.rs
pub mod parsing;
pub mod validation;
pub mod error;

// Create a prelude module that re-exports common items
pub mod prelude {
    pub use crate::parsing::{Parser, ParseResult};
    pub use crate::validation::Validator;
    pub use crate::error::{Error, Result};
}

// Users can now do:
// use my_crate::prelude::*;
// And get all the common items at once
```

## Organizing Large Projects

As your Rust projects grow, good organization becomes increasingly important. Here are strategies for managing larger codebases:

### Directory Structure

A well-organized Rust project might have a structure like this:

```
my_project/
├── Cargo.toml
├── Cargo.lock
├── src/
│   ├── main.rs          # Binary crate entry point
│   ├── lib.rs           # Library crate entry point
│   ├── bin/             # Additional binaries
│   │   ├── tool1.rs
│   │   └── tool2.rs
│   ├── models/          # Domain models
│   │   ├── mod.rs
│   │   ├── user.rs
│   │   └── product.rs
│   ├── services/        # Business logic
│   │   ├── mod.rs
│   │   ├── auth.rs
│   │   └── billing.rs
│   ├── utils/           # Utility functions
│   │   ├── mod.rs
│   │   └── helpers.rs
│   └── config.rs        # Configuration
├── tests/               # Integration tests
│   ├── integration_test.rs
│   └── api_test.rs
├── benches/             # Benchmarks
│   └── benchmark.rs
├── examples/            # Example code
│   └── example.rs
└── docs/                # Documentation
    └── api.md
```

### Module Organization Patterns

There are several common patterns for organizing modules in large projects:

#### Feature-Based Organization

Group code by features or domains:

```rust
// src/lib.rs
pub mod auth;
pub mod users;
pub mod products;
pub mod orders;
pub mod payments;
```

#### Layer-Based Organization

Group code by architectural layers:

```rust
// src/lib.rs
pub mod models;      // Data structures
pub mod repositories; // Data access
pub mod services;    // Business logic
pub mod controllers; // API endpoints
pub mod utils;       // Helper functions
```

#### Hybrid Approach

Combine both approaches for complex applications:

```rust
// src/lib.rs
pub mod users {
    pub mod models;
    pub mod repositories;
    pub mod services;
    pub mod controllers;
}

pub mod products {
    pub mod models;
    pub mod repositories;
    pub mod services;
    pub mod controllers;
}

pub mod common {
    pub mod utils;
    pub mod config;
    pub mod errors;
}
```

### Documentation and Tests

Well-organized projects include comprehensive documentation and tests:

````rust
/// Represents a user in the system
///
/// # Examples
///
/// ```
/// let user = User::new("alice", "password123");
/// assert!(user.authenticate("password123"));
/// ```
pub struct User {
    username: String,
    password_hash: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_authentication() {
        let user = User::new("alice", "password123");
        assert!(user.authenticate("password123"));
        assert!(!user.authenticate("wrong_password"));
    }
}
````

## Workspaces and Multi-Package Projects

For very large projects, Rust supports workspaces—a set of packages that share the same `Cargo.lock` and output directory.

### Creating a Workspace

Define a workspace in a `Cargo.toml` file at the root:

```toml
# Cargo.toml in the workspace root
[workspace]
members = [
    "app",
    "core",
    "api",
    "cli",
    "utils",
]
```

### Workspace Structure

A typical workspace might look like this:

```
my_workspace/
├── Cargo.toml       # Workspace definition
├── Cargo.lock       # Shared lock file
├── app/             # Package for the main application
│   ├── Cargo.toml
│   └── src/
│       └── main.rs
├── core/            # Package for core functionality
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs
├── api/             # Package for API handlers
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs
├── cli/             # Package for CLI tools
│   ├── Cargo.toml
│   └── src/
│       └── main.rs
└── utils/           # Package for shared utilities
    ├── Cargo.toml
    └── src/
        └── lib.rs
```

### Package Dependencies

In a workspace, packages can depend on each other:

```toml
# app/Cargo.toml
[package]
name = "app"
version = "0.1.0"
edition = "2021"

[dependencies]
core = { path = "../core" }
api = { path = "../api" }
utils = { path = "../utils" }
```

### Building and Testing Workspaces

Cargo can build or test all packages in a workspace:

```bash
# Build all packages
cargo build --workspace

# Test all packages
cargo test --workspace

# Build a specific package
cargo build -p app
```

## Publishing Crates

Once you've built a useful library, you might want to share it with the Rust community by publishing it to [crates.io](https://crates.io).

### Preparing Your Crate

Before publishing, ensure your crate:

1. Has a unique name (check on crates.io)
2. Includes a proper description, license, and documentation
3. Has useful examples and tests
4. Follows Rust API guidelines

Update your `Cargo.toml` with metadata:

```toml
[package]
name = "my_awesome_lib"
version = "0.1.0"
edition = "2021"
authors = ["Your Name <your.email@example.com>"]
description = "A library that does awesome things"
documentation = "https://docs.rs/my_awesome_lib"
repository = "https://github.com/yourusername/my_awesome_lib"
license = "MIT OR Apache-2.0"
keywords = ["awesome", "library", "rust"]
categories = ["development-tools"]
readme = "README.md"
```

### Publishing Process

To publish your crate:

1. Create an account on crates.io
2. Get an API token from crates.io
3. Login with Cargo: `cargo login <your-token>`
4. Publish: `cargo publish`

### Versioning

Rust crates follow Semantic Versioning (SemVer):

- **Major version** (1.0.0): Incompatible API changes
- **Minor version** (0.1.0): Add functionality in a backward-compatible manner
- **Patch version** (0.0.1): Backward-compatible bug fixes

```toml
# Incrementing the version for a new release
[package]
name = "my_awesome_lib"
version = "0.2.0"  # Bumped from 0.1.0 for new features
```

## Project: Mini Library Crate

Let's put our knowledge into practice by creating a small but useful library crate with a clear API. We'll build a simple text analysis library that provides various statistics and operations on text.

### Step 1: Create a New Library Crate

```bash
cargo new text_analysis --lib
cd text_analysis
```

### Step 2: Define the Project Structure

Our library will have the following structure:

```
text_analysis/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── stats.rs
│   ├── tokenize.rs
│   ├── sentiment.rs
│   └── utils.rs
├── tests/
│   └── integration_tests.rs
└── examples/
    └── basic_usage.rs
```

### Step 3: Set Up Cargo.toml

```toml
[package]
name = "text_analysis"
version = "0.1.0"
edition = "2021"
authors = ["Your Name <your.email@example.com>"]
description = "A library for analyzing text"
license = "MIT"

[dependencies]
unicode-segmentation = "1.8.0"  # For proper unicode handling
```

### Step 4: Implement the Library

First, let's set up the main library file:

```rust
// src/lib.rs
//! # Text Analysis
//!
//! `text_analysis` is a library for analyzing text content,
//! providing statistics, tokenization, and basic sentiment analysis.

// Define and re-export modules
pub mod stats;
pub mod tokenize;
pub mod sentiment;
mod utils;  // Private module

// Re-export most commonly used items for a clean API
pub use stats::{TextStats, count_words, count_sentences};
pub use tokenize::{tokenize_words, tokenize_sentences};
pub use sentiment::analyze_sentiment;

// Create a prelude module
pub mod prelude {
    pub use crate::stats::{TextStats, count_words, count_sentences};
    pub use crate::tokenize::{tokenize_words, tokenize_sentences};
    pub use crate::sentiment::analyze_sentiment;
}

// Provide a simple API facade
pub struct TextAnalyzer<'a> {
    text: &'a str,
}

impl<'a> TextAnalyzer<'a> {
    pub fn new(text: &'a str) -> Self {
        TextAnalyzer { text }
    }

    pub fn stats(&self) -> TextStats {
        stats::analyze(self.text)
    }

    pub fn words(&self) -> Vec<String> {
        tokenize::tokenize_words(self.text)
    }

    pub fn sentences(&self) -> Vec<String> {
        tokenize::tokenize_sentences(self.text)
    }

    pub fn sentiment(&self) -> f64 {
        sentiment::analyze_sentiment(self.text)
    }
}
```

Now, let's implement each module:

```rust
// src/stats.rs
//! Text statistics module
//!
//! Provides functions for calculating various statistics about text.

use crate::tokenize::{tokenize_words, tokenize_sentences};
use crate::utils::clean_text;

/// Represents statistics about a text
#[derive(Debug, Clone, PartialEq)]
pub struct TextStats {
    pub char_count: usize,
    pub word_count: usize,
    pub sentence_count: usize,
    pub avg_word_length: f64,
    pub avg_sentence_length: f64,
}

/// Analyzes text and returns comprehensive statistics
pub fn analyze(text: &str) -> TextStats {
    let clean = clean_text(text);
    let words = tokenize_words(&clean);
    let sentences = tokenize_sentences(&clean);

    let char_count = clean.chars().count();
    let word_count = words.len();
    let sentence_count = sentences.len();

    let total_word_length: usize = words.iter()
        .map(|w| w.chars().count())
        .sum();

    let avg_word_length = if word_count > 0 {
        total_word_length as f64 / word_count as f64
    } else {
        0.0
    };

    let avg_sentence_length = if sentence_count > 0 {
        word_count as f64 / sentence_count as f64
    } else {
        0.0
    };

    TextStats {
        char_count,
        word_count,
        sentence_count,
        avg_word_length,
        avg_sentence_length,
    }
}

/// Counts the number of words in text
pub fn count_words(text: &str) -> usize {
    tokenize_words(text).len()
}

/// Counts the number of sentences in text
pub fn count_sentences(text: &str) -> usize {
    tokenize_sentences(text).len()
}
```

```rust
// src/tokenize.rs
//! Text tokenization module
//!
//! Provides functions for splitting text into words and sentences.

use unicode_segmentation::UnicodeSegmentation;
use crate::utils::clean_text;

/// Splits text into words
pub fn tokenize_words(text: &str) -> Vec<String> {
    UnicodeSegmentation::unicode_words(text)
        .map(String::from)
        .collect()
}

/// Splits text into sentences
pub fn tokenize_sentences(text: &str) -> Vec<String> {
    // Simple sentence tokenization by splitting on .!?
    // A production library would use more sophisticated methods
    text.split(|c| c == '.' || c == '!' || c == '?')
        .filter(|s| !s.trim().is_empty())
        .map(|s| s.trim().to_string())
        .collect()
}
```

```rust
// src/sentiment.rs
//! Sentiment analysis module
//!
//! Provides basic sentiment analysis functionality.

use crate::tokenize::tokenize_words;

/// Analyzes the sentiment of text
/// Returns a value between -1.0 (negative) and 1.0 (positive)
pub fn analyze_sentiment(text: &str) -> f64 {
    let words = tokenize_words(text);

    // Very simplified sentiment analysis
    // In a real library, we would use a proper sentiment lexicon
    let positive_words = ["good", "great", "excellent", "happy", "positive"];
    let negative_words = ["bad", "terrible", "awful", "sad", "negative"];

    let mut score = 0.0;
    let mut count = 0;

    for word in words {
        let lowercase = word.to_lowercase();
        if positive_words.contains(&lowercase.as_str()) {
            score += 1.0;
            count += 1;
        } else if negative_words.contains(&lowercase.as_str()) {
            score -= 1.0;
            count += 1;
        }
    }

    if count > 0 {
        score / count as f64
    } else {
        0.0
    }
}
```

```rust
// src/utils.rs
// Private utility functions

/// Cleans text by removing extra whitespace
pub(crate) fn clean_text(text: &str) -> String {
    let mut result = String::with_capacity(text.len());
    let mut last_was_whitespace = false;

    for c in text.chars() {
        if c.is_whitespace() {
            if !last_was_whitespace {
                result.push(' ');
                last_was_whitespace = true;
            }
        } else {
            result.push(c);
            last_was_whitespace = false;
        }
    }

    result.trim().to_string()
}
```

### Step 5: Add Tests and Examples

```rust
// tests/integration_tests.rs
use text_analysis::prelude::*;
use text_analysis::TextAnalyzer;

#[test]
fn test_word_counting() {
    let text = "Hello world! This is a test.";
    assert_eq!(count_words(text), 6);

    let analyzer = TextAnalyzer::new(text);
    assert_eq!(analyzer.words().len(), 6);
}

#[test]
fn test_sentence_counting() {
    let text = "Hello world! This is a test. How are you?";
    assert_eq!(count_sentences(text), 3);

    let analyzer = TextAnalyzer::new(text);
    assert_eq!(analyzer.sentences().len(), 3);
}

#[test]
fn test_sentiment_analysis() {
    let positive = "This is good and excellent!";
    let negative = "This is bad and terrible!";
    let neutral = "This is a test.";

    assert!(analyze_sentiment(positive) > 0.0);
    assert!(analyze_sentiment(negative) < 0.0);
    assert_eq!(analyze_sentiment(neutral), 0.0);
}
```

```rust
// examples/basic_usage.rs
use text_analysis::prelude::*;
use text_analysis::TextAnalyzer;

fn main() {
    let text = "Hello world! This is a text analysis example. \
                It demonstrates the capabilities of our library. \
                The text is analyzed to extract various statistics. \
                This is a good and excellent example!";

    // Using the facade API
    let analyzer = TextAnalyzer::new(text);
    let stats = analyzer.stats();

    println!("Text Analysis Results:");
    println!("---------------------");
    println!("Character count: {}", stats.char_count);
    println!("Word count: {}", stats.word_count);
    println!("Sentence count: {}", stats.sentence_count);
    println!("Average word length: {:.2}", stats.avg_word_length);
    println!("Average sentence length: {:.2}", stats.avg_sentence_length);
    println!("Sentiment score: {:.2}", analyzer.sentiment());

    // Using individual functions
    println!("\nFirst 5 words:");
    for (i, word) in tokenize_words(text).iter().take(5).enumerate() {
        println!("  {}. {}", i + 1, word);
    }

    println!("\nSentences:");
    for (i, sentence) in tokenize_sentences(text).iter().enumerate() {
        println!("  {}. {}", i + 1, sentence);
    }
}
```

### Step 6: Document Your Library

Add documentation to help users understand how to use your library:

````rust
// Add to the top of src/lib.rs
//! # Text Analysis
//!
//! `text_analysis` is a library for analyzing text content.
//!
//! ## Features
//!
//! - Word and sentence tokenization
//! - Text statistics (counts, averages)
//! - Basic sentiment analysis
//!
//! ## Example
//!
//! ```
//! use text_analysis::TextAnalyzer;
//!
//! let text = "Hello world! This is an example.";
//! let analyzer = TextAnalyzer::new(text);
//!
//! println!("Word count: {}", analyzer.stats().word_count);
//! println!("Sentiment: {:.2}", analyzer.sentiment());
//! ```
````

### Step 7: Create a README.md

````markdown
# Text Analysis

A Rust library for analyzing text content.

## Features

- Word and sentence tokenization
- Text statistics (counts, averages)
- Basic sentiment analysis

## Installation

Add this to your `Cargo.toml`:

```toml
[dependencies]
text_analysis = "0.1.0"
```
````

## Usage

```rust
use text_analysis::TextAnalyzer;

fn main() {
    let text = "Hello world! This is an example.";
    let analyzer = TextAnalyzer::new(text);

    // Get text statistics
    let stats = analyzer.stats();
    println!("Word count: {}", stats.word_count);
    println!("Sentence count: {}", stats.sentence_count);

    // Get sentiment analysis
    println!("Sentiment: {:.2}", analyzer.sentiment());

    // Get tokenized words and sentences
    let words = analyzer.words();
    let sentences = analyzer.sentences();
}
```

## License

MIT

```

## Summary

In this chapter, we've explored Rust's module system and how to organize your code effectively:

- We learned why code organization matters for maintainability and collaboration
- We saw how to create modules to group related code
- We built hierarchical module structures
- We learned how to control visibility with public and private interfaces
- We explored the details of Rust's module system
- We used paths and imports to reference code
- We re-exported items with `pub use` to create clean APIs
- We managed external dependencies in our projects
- We discussed strategies for organizing large projects
- We set up workspaces for multi-package projects
- We learned how to publish and version crates
- We built a mini library crate with a clear API

The module system is one of Rust's most powerful features for creating well-structured, maintainable code. By applying the principles covered in this chapter, you'll be able to organize your Rust projects effectively, whether they're small utilities or large multi-crate applications.

## Exercises

1. Refactor an existing Rust program to use a better module structure.

2. Create a library crate that implements a data structure (like a priority queue or graph) with a clean, well-documented API.

3. Set up a workspace with at least three related crates that depend on each other.

4. Take an existing flat module and reorganize it into a hierarchical structure.

5. Design and implement a library with a prelude module that makes common operations available with a single import.

## Further Reading

- [Rust Book: Packages and Crates](https://doc.rust-lang.org/book/ch07-01-packages-and-crates.html)
- [Rust Book: Defining Modules to Control Scope and Privacy](https://doc.rust-lang.org/book/ch07-02-defining-modules-to-control-scope-and-privacy.html)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [Publishing on crates.io](https://doc.rust-lang.org/cargo/reference/publishing.html)
- [Cargo Workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html)
- [The Edition Guide: Path and Module System Changes](https://doc.rust-lang.org/edition-guide/rust-2018/module-system/path-clarity.html)
```
