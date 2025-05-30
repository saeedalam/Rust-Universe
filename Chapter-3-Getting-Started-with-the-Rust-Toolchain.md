# Chapter 3: Getting Started with the Rust Toolchain

## Installing Rust and the Toolchain

Rust provides a comprehensive and powerful toolchain that makes development a pleasant experience. At the center of this ecosystem is `rustup`, the Rust toolchain installer and version manager.

### Installing Rust with rustup

The recommended way to install Rust is through `rustup`, which manages Rust installations including different versions of the Rust compiler. It works on all major platforms (Windows, macOS, and Linux).

#### For Unix-based systems (macOS, Linux):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### For Windows:

Download and run the rustup-init.exe from [https://rustup.rs](https://rustup.rs)

After installation, you'll have access to:

- `rustc`: The Rust compiler
- `cargo`: Rust's package manager and build system
- `rustup`: The toolchain manager itself

To verify your installation, open a new terminal window and run:

```bash
rustc --version
cargo --version
```

You should see output similar to:

```
rustc 1.73.0 (cc66ad468 2023-10-03)
cargo 1.73.0 (9c4383fb3 2023-08-26)
```

### Managing Rust Versions

`rustup` makes it easy to manage multiple Rust versions:

```bash
# List installed toolchains
rustup toolchain list

# Install a specific version
rustup install 1.68.0

# Use a specific version globally
rustup default 1.68.0

# Use a specific version for a project
rustup override set 1.68.0

# Update all components
rustup update
```

### Rust Components

Beyond the compiler, rustup can manage various components:

```bash
# List available components
rustup component list

# Add components (e.g., the formatter)
rustup component add rustfmt

# Add the Rust Language Server for IDE integration
rustup component add rust-analyzer

# Add the Rust source code (useful for documentation)
rustup component add rust-src
```

### Understanding Rust Editions

Rust uses "editions" to introduce new features while maintaining backward compatibility:

```bash
# Check current default edition
rustup show

# Install and use nightly for testing new features
rustup install nightly
rustup default nightly
```

## Setting Up Your Development Environment

A good development environment significantly improves productivity. Let's explore popular setups for Rust development.

### Visual Studio Code

VS Code with the rust-analyzer extension provides an excellent Rust development experience.

1. Install [Visual Studio Code](https://code.visualstudio.com/)
2. Install the [rust-analyzer extension](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
3. Recommended additional extensions:
   - Better TOML: For Cargo.toml editing
   - CodeLLDB: For debugging
   - Error Lens: For inline error display
   - crates: For managing dependencies

Configure VS Code settings for Rust (settings.json):

```json
{
  "rust-analyzer.checkOnSave.command": "clippy",
  "rust-analyzer.procMacro.enable": true,
  "editor.formatOnSave": true
}
```

### IntelliJ IDEA / CLion with Rust Plugin

JetBrains IDEs provide robust Rust support through their Rust plugin:

1. Install [IntelliJ IDEA](https://www.jetbrains.com/idea/) or [CLion](https://www.jetbrains.com/clion/)
2. Install the [Rust plugin](https://plugins.jetbrains.com/plugin/8182-rust)
3. Configure the plugin to use rust-analyzer

### Other Editors

- **Vim/Neovim**: Use plugins like coc.nvim with rust-analyzer
- **Emacs**: Use rust-mode and rustic
- **Sublime Text**: Use the Rust Enhanced package

### Configuring rust-analyzer

For the best experience, make sure rust-analyzer is properly configured in your editor. It provides features like:

- Code completion
- Go to definition
- Find references
- Inline errors and warnings
- Code actions and quick fixes
- Inlay hints for types

## Understanding Cargo and Project Structure

Cargo is Rust's build system and package manager. It handles tasks like:

- Creating new projects
- Building your code
- Running tests
- Managing dependencies
- Publishing libraries

### Basic Cargo Commands

```bash
# Create a new binary project
cargo new hello_world

# Create a new library project
cargo new --lib my_library

# Build your project
cargo build

# Build with optimizations for release
cargo build --release

# Run your project
cargo run

# Run with arguments
cargo run -- arg1 arg2

# Check for errors without building
cargo check

# Update dependencies
cargo update

# Clean build artifacts
cargo clean
```

### Project Structure

A typical Rust project created with `cargo new` has the following structure:

```
my_project/
├── Cargo.toml      # Project configuration and dependencies
├── Cargo.lock      # Exact versions of dependencies (generated)
├── .gitignore      # Default Git ignore file
└── src/
    └── main.rs     # Source code (for binaries)
    └── lib.rs      # Source code (for libraries)
```

For more complex projects, you might add:

```
my_project/
├── src/
│   ├── bin/        # Additional binaries
│   ├── lib.rs      # Library root
│   └── modules/    # Code organization
├── tests/          # Integration tests
├── benches/        # Benchmarks
├── examples/       # Example code
└── docs/           # Documentation
```

### The Cargo.toml File

The `Cargo.toml` file defines your project and its dependencies:

```toml
[package]
name = "my_project"
version = "0.1.0"
edition = "2021"
authors = ["Your Name <your.email@example.com>"]
description = "A brief description of the project"
license = "MIT OR Apache-2.0"
repository = "https://github.com/yourusername/my_project"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }

[dev-dependencies]
criterion = "0.5"

[build-dependencies]
cc = "1.0"

[profile.release]
opt-level = 3
lto = true
```

## Creating a New Project from Scratch

Let's walk through creating a new Rust project from scratch:

```bash
# Create a new binary project
cargo new rust_toolchain_demo
cd rust_toolchain_demo
```

This generates:

```
rust_toolchain_demo/
├── Cargo.toml
├── .git/
├── .gitignore
└── src/
    └── main.rs
```

The default `main.rs` contains:

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

    // Try out some Rust features
    let languages = vec!["Rust", "C++", "Python", "JavaScript"];

    for lang in languages.iter() {
        println!("I know {}", lang);
    }

    // Using a closure
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

Now run your project:

```bash
cargo run
```

## Tour of the Standard Library Documentation

Rust's standard library documentation is comprehensive and includes excellent examples. It's one of your most valuable resources.

### Accessing Documentation

```bash
# Open documentation for installed crates
rustup doc

# Search documentation
rustup doc --std search_term

# Generate and open documentation for your project
cargo doc --open
```

### Standard Library Organization

The standard library (`std`) is organized into modules:

- `std::collections`: Data structures like Vec, HashMap
- `std::fs`: File system operations
- `std::io`: Input/output operations
- `std::net`: Networking
- `std::path`: File path manipulation
- `std::sync`: Synchronization primitives
- `std::thread`: Threading
- `std::time`: Time-related functions

### Using Documentation Effectively

Documentation in Rust includes:

- Type and function signatures
- Descriptions of behavior
- Examples that are actually compiled and tested
- Links to related items
- Implementation details when relevant

Example from the documentation:

```rust
// Example from Vec documentation
let mut vec = Vec::new();
vec.push(1);
vec.push(2);

assert_eq!(vec.len(), 2);
assert_eq!(vec[0], 1);

// Iterate over vector
for x in &vec {
    println!("{}", x);
}
```

## Managing Dependencies and crates.io

Rust packages, called "crates," are shared on [crates.io](https://crates.io), Rust's package registry.

### Adding Dependencies

To add a dependency:

```bash
# Using Cargo command
cargo add serde

# With features
cargo add tokio --features full

# With specific version
cargo add rand@0.8.5
```

Or edit `Cargo.toml` directly:

```toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
rand = "0.8.5"
```

### Understanding Semantic Versioning

Cargo uses semantic versioning (SemVer):

- `0.1.0`: Exact version
- `^1.0.0` or `1.0`: Any compatible version (1.0.0 up to 2.0.0)
- `~1.0.0`: Minor updates only (1.0.0 up to 1.1.0)
- `>=1.0.0, <2.0.0`: Range of versions
- `*`: Latest version (not recommended)

### Updating Dependencies

```bash
# Update all dependencies
cargo update

# Update specific dependency
cargo update -p rand
```

### Exploring Available Crates

Browse [crates.io](https://crates.io) to find packages, or use tools like:

- [lib.rs](https://lib.rs): Alternative crate index with more metadata
- `cargo search`: Search from the command line

```bash
cargo search http client
```

## Common Development Workflow in Rust

Let's explore a typical Rust development workflow:

### 1. Project Setup

```bash
# Create new project
cargo new my_project
cd my_project

# Add dependencies
cargo add serde --features derive
cargo add reqwest --features json
```

### 2. Development Cycle

```bash
# Quick check for errors (fast)
cargo check

# Run your application
cargo run

# Format your code
cargo fmt

# Run linter
cargo clippy

# Run tests
cargo test
```

### 3. Documentation

```bash
# Generate and view documentation
cargo doc --open

# Run documentation tests
cargo test --doc
```

### 4. Optimization and Profiling

```bash
# Build with optimizations
cargo build --release

# Run benchmarks (requires nightly)
cargo bench
```

### 5. Creating a Distributable

```bash
# Build release binary
cargo build --release

# The binary is located at
# target/release/my_project
```

### Continuous Integration Workflow

A common CI workflow might include:

```yaml
# Example CI workflow
- cargo fmt -- --check
- cargo clippy -- -D warnings
- cargo test
- cargo build --release
```

## 🔨 Project: Command-line Calculator

Let's build a practical command-line calculator to apply what we've learned.

### Project Requirements

1. Accept mathematical expressions from the command line
2. Support basic operations: +, -, \*, /, and parentheses
3. Support variables and function calls
4. Display results formatted cleanly

### Step 1: Create the Project

```bash
cargo new rust_calculator
cd rust_calculator
```

### Step 2: Add Dependencies

```bash
cargo add rust_decimal
cargo add rust_decimal_macros
cargo add logos
```

### Step 3: Implement the Calculator

Edit `src/main.rs`:

```rust
use logos::Logos;
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use std::collections::HashMap;
use std::env;
use std::io::{self, Write};

#[derive(Logos, Debug, PartialEq)]
enum Token {
    #[regex(r"[0-9]+(\.[0-9]+)?", |lex| lex.slice().parse())]
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
        calc.variables.insert("pi".to_string(), dec!(3.14159265359));
        calc.variables.insert("e".to_string(), dec!(2.71828182846));

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
                    if right == dec!(0) {
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
cargo run
# Interactive mode

cargo run "5 + 3"
# Result: 8

cargo run "pi * 2"
# Result: 6.28318530718
```

### Step 5: Extending the Project

This simple calculator can be extended in many ways:

1. Implement a proper expression parser (using a parsing library like `pest` or `nom`)
2. Add more operations and functions (sin, cos, log, etc.)
3. Allow defining custom functions and variables
4. Add memory features (storing previous results)
5. Improve error messages and input validation

## Looking Ahead

In this chapter, we've explored the Rust toolchain and set up a professional development environment. We've learned about Cargo, dependencies, documentation, and created a practical project to apply these concepts.

In the next chapter, we'll dive deeper into Rust's syntax and data types, building a foundation for more complex Rust programs. We'll explore variables, basic and compound types, type conversion, and best practices for working with Rust's type system.

As you continue your Rust journey, remember that the toolchain is designed to help you write better code. The compiler errors, documentation, and tooling are there to guide you, not block you. Embrace them as part of the learning process, and you'll become productive with Rust much faster.

Now that you have your development environment set up, you're ready to tackle more complex Rust projects and explore the language's powerful features.
