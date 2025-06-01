## Appendix G: Debugging and Troubleshooting Guide

This appendix provides techniques and tools for debugging Rust programs, understanding common errors, and solving problems efficiently.

### Compilation Errors

Rust's compiler provides detailed error messages to help fix issues:

#### Understanding Error Messages

```
error[E0308]: mismatched types
  --> src/main.rs:4:8
   |
 4 |     let x: i32 = "hello";
   |            ^^^   ^^^^^^^ expected `i32`, found `&str`
   |            |
   |            expected due to this
```

The key parts are:

- Error code (`E0308`)
- Location (file and line/column)
- Expected vs. found types
- Additional context

#### Common Compilation Errors

| Error Code | Description                              | Common Causes                             |
| ---------- | ---------------------------------------- | ----------------------------------------- |
| E0308      | Type mismatch                            | Assigning incompatible types              |
| E0382      | Use of moved value                       | Using a value after it's been moved       |
| E0106      | Missing lifetime specifier               | Returning references without lifetimes    |
| E0507      | Cannot move out of borrowed content      | Trying to take ownership from a reference |
| E0597      | Borrowed value does not live long enough | Reference outlives the referenced value   |

#### The `rustc --explain` Command

For detailed explanations of error codes:

```
rustc --explain E0308
```

### Runtime Debugging

#### Println Debugging

The simplest debugging technique:

```rust
fn process_data(data: &[i32]) -> i32 {
    println!("Processing data: {:?}", data);
    let result = data.iter().sum();
    println!("Result: {}", result);
    result
}
```

#### Using `dbg!` Macro

The `dbg!` macro is more powerful than `println!`:

- Prints file and line number
- Shows expression and its value
- Returns the value (unlike println!)

```rust
fn calculate(a: i32, b: i32) -> i32 {
    let intermediate = dbg!(a * 2);
    dbg!(intermediate + b)
}
```

#### Debug and Display Traits

Implement these traits for better debug output:

```rust
#[derive(Debug)]
struct Person {
    name: String,
    age: u32,
}

impl std::fmt::Display for Person {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{} ({})", self.name, self.age)
    }
}
```

#### Using a Debugger

GDB and LLDB can be used with Rust:

1. Compile with debug symbols: `cargo build`
2. Run the debugger: `gdb target/debug/my_program`
3. Common commands:
   - `break src/main.rs:10` - Set breakpoint at line 10
   - `run` - Start execution
   - `print variable` - Show variable value
   - `next` - Execute next line
   - `step` - Step into function
   - `continue` - Continue execution

#### Rust-Specific Debugger Extensions

- GDB with [rust-gdb](https://github.com/rust-lang/rust/blob/master/src/etc/rust-gdb)
- LLDB with [rust-lldb](https://github.com/rust-lang/rust/blob/master/src/etc/rust-lldb)

### Common Runtime Issues

#### Panics

When your program panics, you'll see a message and backtrace:

```
thread 'main' panicked at 'index out of bounds: the len is 3 but the index is 5', src/main.rs:4:5
stack backtrace:
   0: std::panicking::begin_panic
   ...
```

Common causes:

- Index out of bounds
- Division by zero
- Unwrapping `None` or `Err`
- Explicit `panic!()` calls

#### Stack Overflow

Typically caused by infinite recursion:

```rust
fn recursive_function() {
    recursive_function();  // Will cause stack overflow
}
```

#### Memory Leaks

Find memory leaks with tools like `valgrind` or memory profilers.

#### Deadlocks

When threads wait for each other indefinitely:

```rust
let mutex1 = Arc::new(Mutex::new(()));
let mutex2 = Arc::new(Mutex::new(()));

// Thread 1
let _lock1 = mutex1.lock().unwrap();
let _lock2 = mutex2.lock().unwrap();

// Thread 2
let _lock2 = mutex2.lock().unwrap();
let _lock1 = mutex1.lock().unwrap();
```

### Advanced Debugging Techniques

#### Tracing

Use the `tracing` crate for structured logging:

```rust
use tracing::{info, span, Level};

fn process_request(user_id: u64) {
    let span = span!(Level::INFO, "process_request", user_id = user_id);
    let _enter = span.enter();

    info!("Starting request processing");
    // Process request
    info!("Request processing completed");
}
```

#### Assertions

Use assertions to catch logical errors:

```rust
fn divide(a: i32, b: i32) -> i32 {
    assert!(b != 0, "Division by zero");
    a / b
}
```

#### Feature Flags for Debugging

Use Cargo features to enable debug code only when needed:

```toml
# Cargo.toml
[features]
debug_assertions = []
```

```rust
fn complex_calculation() -> f64 {
    let result = /* calculation */;

    #[cfg(feature = "debug_assertions")]
    {
        println!("Calculation result: {}", result);
        assert!(result >= 0.0, "Expected non-negative result");
    }

    result
}
```

#### Logging

Use the `log` crate for flexible logging:

```rust
use log::{info, warn, error};

fn process_data(data: &[u8]) -> Result<(), Error> {
    info!("Processing {} bytes of data", data.len());

    if data.is_empty() {
        warn!("Empty data provided");
        return Ok(());
    }

    match process_chunk(data) {
        Ok(result) => {
            info!("Processing successful: {:?}", result);
            Ok(())
        }
        Err(e) => {
            error!("Processing failed: {}", e);
            Err(e)
        }
    }
}
```

### Troubleshooting Tools

- **Clippy**: Catches common mistakes with `cargo clippy`
- **MIRI**: Interprets Rust MIR to find undefined behavior
- **Valgrind**: Detects memory management issues
- **Flamegraph**: Visualizes performance hotspots
- **Sanitizers**: Address Sanitizer (ASan), Thread Sanitizer (TSan)

## Appendix H: Performance Optimization Cookbook
