# Chapter 3: Getting Started with the Rust Toolchain

## Introduction

The Rust toolchain provides a powerful, integrated set of tools that makes developing Rust applications efficient and enjoyable. This chapter will introduce you to the essential components of the Rust development environment and guide you through setting up your workspace for productive coding.

By the end of this chapter, you'll understand:

- How to install and configure Rust on your system
- How to set up a professional development environment with IDE support
- The structure of Rust projects and how to use Cargo effectively
- Essential Cargo commands for building, testing, and managing your code
- How to create and structure a new Rust project from scratch
- How to navigate and utilize the excellent Rust documentation
- How to find and manage external dependencies from crates.io
- The typical workflow for Rust development
- How to build a simple command-line calculator application

## Installing Rust and the Toolchain (rustup)

Rust provides a comprehensive toolchain managed by `rustup`, which handles installation, updates, and multiple versions of the Rust compiler and tools.

### Installing rustup

The recommended way to install Rust is through `rustup`, which works on all major platforms:

#### For Unix-based systems (macOS, Linux):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### For Windows:

Download and run the rustup-init.exe from [https://rustup.rs](https://rustup.rs)

After installation, restart your terminal and verify your installation:

```bash
rustc --version
cargo --version
rustup --version
```

You should see output similar to:

```
rustc 1.73.0 (cc66ad468 2023-10-03)
cargo 1.73.0 (9c4383fb3 2023-08-26)
rustup 1.26.0 (5af9b9484 2023-04-05)
```

### Core Components

The installation provides you with several key tools:

- **rustc**: The Rust compiler that transforms your code into executable binaries
- **cargo**: Rust's package manager and build system
- **rustup**: The toolchain manager itself, used to update Rust and add components

### Managing Multiple Rust Versions

One of `rustup`'s key features is the ability to manage multiple Rust versions:

```bash
# List available toolchains
rustup toolchain list

# Install a specific version
rustup install 1.68.0

# Set a default toolchain
rustup default stable

# Use a specific version for just one project
cd my_project
rustup override set 1.68.0

# Use nightly for experimental features
rustup install nightly
rustup run nightly cargo build
```

### Adding Components

You can extend your Rust installation with additional components:

```bash
# View available and installed components
rustup component list

# Add the code formatter
rustup component add rustfmt

# Add the linter
rustup component add clippy

# Add the language server for IDE integration
rustup component add rust-analyzer

# Add the Rust source code (useful for documentation)
rustup component add rust-src
```

### Understanding Rust Editions

Rust uses "editions" to introduce new language features while maintaining backward compatibility:

```toml
# In Cargo.toml, you specify the edition
[package]
name = "my_project"
version = "0.1.0"
edition = "2021"  # Current is 2021, previous were 2018 and 2015
```

The edition system allows Rust to evolve without breaking existing code.

## Setting up your Development Environment

A good development environment significantly improves productivity. Let's explore the most popular options for Rust development.

### Visual Studio Code

VS Code with the rust-analyzer extension provides an excellent experience:

1. Install [Visual Studio Code](https://code.visualstudio.com/)
2. Install the [rust-analyzer extension](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
3. Recommended additional extensions:
   - Better TOML: For Cargo.toml editing
   - CodeLLDB: For debugging Rust code
   - Error Lens: For inline error display
   - crates: For managing dependencies

Configure VS Code settings for optimal Rust development (settings.json):

```json
{
  "rust-analyzer.checkOnSave.command": "clippy",
  "rust-analyzer.inlayHints.enable": true,
  "editor.formatOnSave": true
}
```

### IntelliJ IDEA / CLion

JetBrains IDEs provide robust Rust support:

1. Install [IntelliJ IDEA](https://www.jetbrains.com/idea/) or [CLion](https://www.jetbrains.com/clion/)
2. Install the [Rust plugin](https://plugins.jetbrains.com/plugin/8182-rust)
3. Configure the toolchain in Settings/Preferences → Languages & Frameworks → Rust

### Other Editors

- **Vim/Neovim**: Use [coc.nvim](https://github.com/neoclide/coc.nvim) with the rust-analyzer extension
- **Emacs**: Use [rustic](https://github.com/rustic-rs/rustic) for a complete environment
- **Sublime Text**: Install the [Rust Enhanced](https://packagecontrol.io/packages/Rust%20Enhanced) package

### Features to Look For in Your IDE

A good Rust development environment should provide:

- Code completion and intelligent suggestions
- Go to definition and find references
- Inline error messages with suggestions
- Automatic formatting with rustfmt
- Linting with clippy
- Debugging support
- Cargo integration for building and testing

## Understanding Cargo and Project Structure

Cargo is Rust's build system and package manager, designed to make Rust development as smooth as possible.

### Basic Cargo Commands

```bash
# Create a new binary application
cargo new my_app

# Create a new library
cargo new --lib my_library

# Build your project in development mode
cargo build

# Run your project
cargo run

# Build with optimizations for release
cargo build --release

# Check for errors without building
cargo check

# Run tests
cargo test

# Format your code
cargo fmt

# Run the linter
cargo clippy

# Generate documentation
cargo doc --open
```

### Project Structure

A typical Rust project created with `cargo new` has the following structure:

```
my_project/
├── Cargo.toml      # Project configuration and dependencies
├── Cargo.lock      # Exact dependency versions (generated)
├── .gitignore      # Default Git ignore file
└── src/
    └── main.rs     # Entry point for binaries
    # OR
    └── lib.rs      # Entry point for libraries
```

As your project grows, you might expand to this structure:

```
my_project/
├── Cargo.toml
├── Cargo.lock
├── src/
│   ├── main.rs     # Binary entry point
│   ├── lib.rs      # Library code
│   ├── bin/        # Additional binaries
│   │   └── tool.rs # Creates executable 'tool'
│   └── module1/    # Code organization using modules
│       ├── mod.rs
│       └── submodule.rs
├── tests/          # Integration tests
│   └── integration_test.rs
├── examples/       # Example code
│   └── example1.rs
├── benches/        # Benchmarks
│   └── benchmark.rs
└── build.rs        # Build script (optional)
```

### Understanding Cargo.toml

The `Cargo.toml` file defines your project and its dependencies:

```toml
[package]
name = "my_project"          # Project name
version = "0.1.0"            # Version using semantic versioning
edition = "2021"             # Rust edition
authors = ["Your Name <your.email@example.com>"]
description = "A brief description of the project"
license = "MIT OR Apache-2.0"
repository = "https://github.com/yourusername/my_project"

[dependencies]
serde = { version = "1.0", features = ["derive"] }  # With features
tokio = "1.28"                                      # Simple dependency
log = "0.4"                                         # Simple dependency

[dev-dependencies]        # Only used for tests and examples
criterion = "0.5"
mockall = "0.11"

[build-dependencies]      # Only used during build
cc = "1.0"

[profile.release]         # Customize the release build
opt-level = 3             # Maximum optimization
lto = true                # Link-time optimization
codegen-units = 1         # Prioritize optimization over compile time
panic = "abort"           # Smaller binaries by removing unwind code
```

### Cargo.lock File

The `Cargo.lock` file ensures reproducible builds by locking exact dependency versions:

- For applications: Commit this file to version control
- For libraries: Don't commit it (let consumers choose compatible versions)

## Creating a New Project from Scratch

Let's walk through creating a simple Rust project from the beginning:

```bash
# Create a new project
cargo new hello_rust
cd hello_rust
```

This generates:

```
hello_rust/
├── Cargo.toml
├── .git/
├── .gitignore
└── src/
    └── main.rs
```

The generated `main.rs` contains:

```rust
fn main() {
    println!("Hello, world!");
}
```

Let's modify it to try out the toolchain:

```rust
// src/main.rs
fn main() {
    println!("Hello, Rust Universe!");

    // A vector of programming languages
    let languages = vec!["Rust", "C++", "Python", "JavaScript"];

    // Basic iteration
    for lang in languages.iter() {
        println!("I know {}", lang);
    }

    // Using functional programming features
    let favorite_langs: Vec<_> = languages
        .iter()
        .filter(|&lang| *lang == "Rust" || *lang == "Python")
        .collect();

    println!("My favorite languages are:");
    for lang in favorite_langs {
        println!("- {}", lang);
    }
}
```

Build and run the project:

```bash
cargo run
```

You should see output like:

```
Hello, Rust Universe!
I know Rust
I know C++
I know Python
I know JavaScript
My favorite languages are:
- Rust
- Python
```

## Tour of the Standard Library Documentation

The Rust documentation is exceptional and should be one of your primary learning resources.

### Accessing Documentation

```bash
# Open local documentation for all installed crates
rustup doc

# Open standard library documentation
rustup doc --std

# Generate and open documentation for your project and dependencies
cargo doc --open
```

### Documentation Structure

The standard library (`std`) is organized into modules:

- `std::collections`: Data structures like Vec, HashMap, etc.
- `std::fs`: File system operations
- `std::io`: Input/output functionality
- `std::net`: Networking
- `std::path`: File path manipulation
- `std::sync`: Synchronization primitives
- `std::thread`: Threading support
- `std::time`: Time-related functions

### What Makes Rust Documentation Special

Rust documentation includes:

1. **Detailed explanations** of types and functions
2. **Runnable examples** that double as tests
3. **Cross-references** to related items
4. **Implementation notes** explaining design decisions
5. **Version information** showing when features were added

Example from the `Vec` documentation:

```rust
// Creating a vector
let mut vec = Vec::new();
vec.push(1);
vec.push(2);

// Indexing
assert_eq!(vec[0], 1);

// Iterating
for x in &vec {
    println!("{}", x);
}
```

### Using Documentation Effectively

1. Use the search function to find types and functions
2. Look at the examples for practical usage
3. Check the "Trait Implementations" section to see available methods
4. Use module documentation to understand how components relate

## Managing Dependencies and crates.io

Rust's package ecosystem centers around crates.io, the community's package registry.

### Finding Packages

Browse [crates.io](https://crates.io) to find packages, or use:

- [lib.rs](https://lib.rs): Alternative crate index with more metadata
- Search from the command line: `cargo search keywords`

```bash
cargo search http client
```

### Adding Dependencies

Add dependencies in two ways:

```bash
# Using Cargo command
cargo add serde --features derive
cargo add tokio --features full
cargo add rand@0.8.5  # Specific version
```

Or manually edit `Cargo.toml`:

```toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
rand = "0.8.5"
```

### Dependency Version Syntax

Cargo uses semantic versioning with smart defaults:

- `1.0.0`: Exactly version 1.0.0
- `"1"` or `"1.0"` or `"^1.0.0"`: Compatible with 1.0.0 up to 2.0.0
- `"~1.0.0"`: Minor updates only (1.0.0 up to 1.1.0)
- `">=1.0.0, <2.0.0"`: Explicit version range
- `"*"`: Latest version (not recommended)

### Updating Dependencies

```bash
# Update all dependencies within version constraints
cargo update

# Update a specific dependency
cargo update -p rand

# Check outdated dependencies
cargo outdated  # Requires cargo-outdated: cargo install cargo-outdated
```

## Common Development Workflow in Rust

A typical Rust development workflow involves these steps:

### 1. Setup and Planning

```bash
# Create new project
cargo new my_project
cd my_project

# Add initial dependencies
cargo add serde --features derive
```

### 2. Development Cycle

```bash
# Quick error check (faster than building)
cargo check

# Format your code
cargo fmt

# Run the linter for best practices
cargo clippy

# Run tests
cargo test

# Run your application
cargo run
```

### 3. Optimization

```bash
# Build with optimizations
cargo build --release

# Run benchmarks (if you have them)
cargo bench
```

### 4. Documentation

```bash
# Generate documentation
cargo doc --open

# Test documentation examples
cargo test --doc
```

### 5. Publishing (for libraries)

```bash
# Verify package can be published
cargo publish --dry-run

# Publish to crates.io
cargo publish
```

### Continuous Integration Practices

A common CI workflow for Rust might include:

```yaml
# Example CI workflow
steps:
  - uses: actions/checkout@v3
  - uses: dtolnay/rust-toolchain@stable
    with:
      components: rustfmt, clippy
  - run: cargo fmt --all -- --check
  - run: cargo clippy -- -D warnings
  - run: cargo test
  - run: cargo build --release
```

## 🔨 Project: Command-line Calculator

Let's build a simple command-line calculator to apply what we've learned about the Rust toolchain.

### Project Requirements

1. Accept mathematical expressions from the command line
2. Support basic operations: +, -, \*, /, and parentheses
3. Print results with proper formatting
4. Handle errors gracefully

### Step 1: Create the Project

```bash
cargo new rust_calculator
cd rust_calculator
```

### Step 2: Add Dependencies

We'll use a parsing library to handle the expressions:

```bash
cargo add rust_decimal  # For precise decimal arithmetic
cargo add logos         # For lexical analysis
```

### Step 3: Implement the Calculator

Edit `src/main.rs`:

```rust
use logos::Logos;
use rust_decimal::Decimal;
use std::env;
use std::io::{self, Write};
use std::collections::HashMap;
use std::str::FromStr;

#[derive(Logos, Debug, PartialEq)]
enum Token {
    #[regex(r"[0-9]+(\.[0-9]+)?", |lex| Decimal::from_str(lex.slice()).ok())]
    Number(Decimal),

    #[token("+")]
    Plus,

    #[token("-")]
    Minus,

    #[token("*")]
    Multiply,

    #[token("/")]
    Divide,

    #[token("(")]
    LeftParen,

    #[token(")")]
    RightParen,

    #[regex(r"[a-zA-Z][a-zA-Z0-9_]*", |lex| lex.slice().to_string())]
    Identifier(String),

    #[regex(r"[ \t\n\f]+", logos::skip)]
    Whitespace,
}

struct Calculator {
    variables: HashMap<String, Decimal>,
}

impl Calculator {
    fn new() -> Self {
        let mut calc = Calculator {
            variables: HashMap::new(),
        };

        // Add some constants
        calc.variables.insert("pi".to_string(), Decimal::from_str("3.14159265359").unwrap());
        calc.variables.insert("e".to_string(), Decimal::from_str("2.71828182846").unwrap());

        calc
    }

    fn evaluate(&mut self, expr: &str) -> Result<Decimal, String> {
        let mut lexer = Token::lexer(expr);
        let mut tokens = Vec::new();

        while let Some(token) = lexer.next() {
            match token {
                Ok(token) => tokens.push(token),
                Err(_) => return Err(format!("Invalid token at position {}", lexer.span().start)),
            }
        }

        self.parse_expression(&tokens)
    }

    fn parse_expression(&self, tokens: &[Token]) -> Result<Decimal, String> {
        // This is a simplified parser for demonstration
        // A real calculator would implement a proper parser

        if tokens.is_empty() {
            return Err("Empty expression".to_string());
        }

        // Handle simple number case
        if tokens.len() == 1 {
            match &tokens[0] {
                Token::Number(n) => return Ok(*n),
                Token::Identifier(name) => {
                    return self.variables.get(name)
                        .copied()
                        .ok_or_else(|| format!("Unknown variable: {}", name));
                }
                _ => return Err("Invalid expression".to_string()),
            }
        }

        // Handle basic operations (very simplified)
        if tokens.len() == 3 {
            let left = match &tokens[0] {
                Token::Number(n) => *n,
                Token::Identifier(name) => {
                    self.variables.get(name)
                        .copied()
                        .ok_or_else(|| format!("Unknown variable: {}", name))?
                }
                _ => return Err("Expected number or variable".to_string()),
            };

            let right = match &tokens[2] {
                Token::Number(n) => *n,
                Token::Identifier(name) => {
                    self.variables.get(name)
                        .copied()
                        .ok_or_else(|| format!("Unknown variable: {}", name))?
                }
                _ => return Err("Expected number or variable".to_string()),
            };

            match &tokens[1] {
                Token::Plus => Ok(left + right),
                Token::Minus => Ok(left - right),
                Token::Multiply => Ok(left * right),
                Token::Divide => {
                    if right.is_zero() {
                        Err("Division by zero".to_string())
                    } else {
                        Ok(left / right)
                    }
                }
                _ => Err("Expected operator".to_string()),
            }
        } else {
            Err("Complex expressions not yet supported".to_string())
        }
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let mut calculator = Calculator::new();

    // Interactive mode or command-line mode
    if args.len() <= 1 {
        println!("Rust Calculator");
        println!("Type 'exit' to quit");
        println!("Available variables: pi, e");

        loop {
            print!("> ");
            io::stdout().flush().unwrap();

            let mut input = String::new();
            io::stdin().read_line(&mut input).unwrap();

            let input = input.trim();
            if input == "exit" {
                break;
            }

            match calculator.evaluate(input) {
                Ok(result) => println!("{}", result),
                Err(err) => println!("Error: {}", err),
            }
        }
    } else {
        // Use the expression from command line
        let expression = &args[1];
        match calculator.evaluate(expression) {
            Ok(result) => println!("{}", result),
            Err(err) => {
                eprintln!("Error: {}", err);
                std::process::exit(1);
            }
        }
    }
}
```

### Step 4: Build and Run the Calculator

```bash
# Interactive mode
cargo run

# Command line mode
cargo run "5 + 3"     # Output: 8
cargo run "pi * 2"    # Output: 6.2831853072
```

### Step 5: Analyze What We've Learned

Through this project, we've applied several concepts:

1. Creating a new Rust project with Cargo
2. Adding and using external dependencies
3. Implementing a lexer and basic parser
4. Using Rust's Result type for error handling
5. Building both an interactive and command-line interface
6. Using Rust's type system for safety and clarity

### Step 6: Extending the Project

This simple calculator can be extended in several ways:

1. Add support for more complex expressions and operator precedence
2. Implement functions like sin, cos, sqrt, etc.
3. Allow defining custom variables and functions
4. Add a history feature to recall previous calculations
5. Support different number formats (binary, hex, scientific notation)

## Summary

In this chapter, we've explored the Rust toolchain and set up a professional development environment. We've covered:

- Installing Rust with rustup and managing Rust versions
- Setting up integrated development environments for Rust
- Understanding Cargo and project organization
- Essential Cargo commands for common development tasks
- Creating and structuring new Rust projects
- Navigating Rust's documentation system
- Managing dependencies with crates.io
- The typical Rust development workflow
- Building a practical command-line calculator

With these tools and practices, you now have a solid foundation for Rust development. The toolchain is designed to help you write better code by providing immediate feedback, comprehensive documentation, and streamlined workflows.

## Exercises

1. **Environment Setup**: Install Rust and configure an IDE with Rust support. Create a simple "Hello, World!" program and run it.

2. **Cargo Exploration**: Create a new project and experiment with different Cargo commands: `check`, `build`, `test`, `run`, `doc`, `clippy`, and `fmt`.

3. **Documentation Practice**: Navigate the standard library documentation to find three different collection types. Create examples of how to use each one.

4. **Dependency Management**: Create a project that uses at least two external dependencies. Try updating them and observe the changes in Cargo.lock.

5. **Calculator Extensions**: Extend the calculator project with at least two of the suggested improvements from Step 6.

6. **CI/CD Setup**: If you have a GitHub account, create a simple Rust project with a GitHub Actions workflow that builds and tests your code on each push.

## Further Reading

- [The Rust Programming Language: Getting Started](https://doc.rust-lang.org/book/ch01-00-getting-started.html)
- [The Cargo Book](https://doc.rust-lang.org/cargo/)
- [Rustup Documentation](https://rust-lang.github.io/rustup/)
- [rust-analyzer Manual](https://rust-analyzer.github.io/manual.html)
- [Rust by Example: Hello Cargo](https://doc.rust-lang.org/rust-by-example/hello/print.html)
- [The rustdoc Book](https://doc.rust-lang.org/rustdoc/)
