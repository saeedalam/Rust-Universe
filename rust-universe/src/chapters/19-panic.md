# Chapter 19: Panic and Unrecoverable Errors

## Introduction

In real-world applications, error handling is an essential aspect of creating robust, maintainable software. Rust's approach to error handling is unique among programming languages, emphasizing compile-time detection of potential failures and providing distinct mechanisms for different error scenarios.

This chapter focuses on panic—Rust's mechanism for handling unrecoverable errors. While Rust encourages using the `Result` type for most error situations (which we'll explore in the next chapter), there are cases where a program cannot reasonably continue execution. In these scenarios, Rust provides the panic system to immediately halt execution, unwind the stack, and provide diagnostic information about what went wrong.

By the end of this chapter, you'll understand when and how to use panics, how Rust's panic mechanism works under the hood, and techniques for making your code resilient even in the face of unrecoverable errors.

## Error Handling Philosophies

Before diving into panic specifically, let's examine different approaches to error handling across programming languages and the philosophy that guides Rust's design.

### Approaches Across Languages

Different programming languages handle errors in various ways:

- **Exceptions** (Java, Python, C++, JavaScript): Use try/catch blocks to capture and handle runtime errors, allowing error handling code to be separated from the main logic.

- **Return Codes** (C): Functions return special values (like -1 or NULL) to indicate errors, requiring manual checking of return values.

- **Option Types** (Haskell, OCaml): Use algebraic data types to represent the presence or absence of a value, forcing explicit handling.

- **Multiple Return Values** (Go): Functions can return both a result and an error value, encouraging immediate error checking.

### Rust's Two-Pronged Approach

Rust takes a unique approach that distinguishes between two kinds of errors:

1. **Recoverable Errors**: Represented with the `Result<T, E>` type, these are conditions where it makes sense for the program to handle the error and continue execution. Examples include file-not-found errors or parsing failures.

2. **Unrecoverable Errors**: Handled with the `panic!` mechanism, these are conditions where the program cannot reasonably continue execution. Examples include accessing an array beyond its bounds or critical assertion failures.

This separation allows Rust to provide appropriate tools for each situation: a clean, functional approach for expected errors and a fail-fast approach for programming mistakes or unrecoverable states.

### Fail Fast vs. Resilience

Rust's error handling philosophy can be summarized as:

- **For expected failure conditions**: Be explicit with `Result` and make errors part of your function signatures.
- **For unexpected failures or invariant violations**: Panic to prevent further damage.

This approach is similar to the "fail fast" philosophy in system design: the sooner you detect a problem, the less damage it can cause and the easier it is to diagnose.

As Tony Hoare, the inventor of null references, famously said:

> "There are two ways of constructing a software design: One way is to make it so simple that there are obviously no deficiencies, and the other way is to make it so complicated that there are no obvious deficiencies."

Rust chooses the former approach by making errors explicit and providing compile-time guarantees about when they need to be handled.

## When to Panic

Understanding when to use panic versus `Result` is critical for writing idiomatic Rust code. Here are guidelines for when panicking is appropriate.

### Examples and Bad States

Panic is suitable in the following scenarios:

1. **Example Code**: In demonstrations, tutorials, or prototypes where error handling would distract from the main concept.

2. **Tests**: When a test condition isn't met, using `assert!` (which causes a panic) is clearer than returning a `Result`.

3. **Bad States That Should Never Happen**: When your code encounters a state that should be impossible if your invariants are maintained.

4. **When You Have No Way to Recover**: If there's genuinely no reasonable way for your application to continue.

5. **Corrupted State**: When memory might be corrupted or safety guarantees violated.

```rust
fn process_config_file(path: &str) -> Config {
    let config_str = std::fs::read_to_string(path)
        .expect("Configuration file must exist and be readable");

    // If parsing fails, we can't proceed with an invalid configuration
    parse_config(&config_str).expect("Configuration file has invalid format")
}
```

### User Input vs. Programming Errors

A key distinction is between:

- **User Input Errors**: These should be expected and handled with `Result` or `Option`. Users make mistakes, and your program should gracefully guide them to correct input.

- **Programming Errors**: These are bugs in your code (or code that calls your API incorrectly) and often warrant a panic. If an API requires certain preconditions, it's reasonable to panic when they're violated.

```rust
// Handle user input with Result
fn get_positive_number(input: &str) -> Result<u32, String> {
    match input.parse::<u32>() {
        Ok(n) if n > 0 => Ok(n),
        Ok(_) => Err("Number must be positive".to_string()),
        Err(_) => Err("Please enter a valid number".to_string()),
    }
}

// For programming errors, panic is appropriate
fn calculate_average(numbers: &[f64]) -> f64 {
    if numbers.is_empty() {
        panic!("Cannot calculate average of empty slice");
    }

    numbers.iter().sum::<f64>() / numbers.len() as f64
}
```

### Contracts and Preconditions

An API may have contracts or preconditions that must be satisfied for it to work correctly. When these are violated, panicking makes sense:

```rust
/// Returns the element at the given index.
///
/// # Panics
///
/// Panics if `index` is out of bounds.
fn get_element(array: &[i32], index: usize) -> i32 {
    // This will panic if index is out of bounds
    array[index]
}
```

For public APIs, clearly document when a function might panic so that users know what to expect.

## panic! and expect

Rust provides two main macros for explicitly causing a panic: `panic!` and `expect`.

### Using the panic! Macro

The `panic!` macro is the most direct way to cause a program to halt with an error message:

```rust
fn main() {
    panic!("This is a deliberate panic");
}
```

When executed, this program terminates with output similar to:

```
thread 'main' panicked at 'This is a deliberate panic', src/main.rs:2:5
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace
```

The output includes:

- The thread where the panic occurred
- The panic message
- The file and line number where `panic!` was called
- A note about how to view a backtrace

### Using expect for Better Context

The `expect` method available on `Result` and `Option` types causes a panic when the value is `Err` or `None`, but allows you to provide a more specific error message:

```rust
fn main() {
    let file = std::fs::File::open("config.txt").expect("Failed to open config.txt");
    // If the file doesn't exist, this will panic with:
    // thread 'main' panicked at 'Failed to open config.txt: No such file or directory...'
}
```

Using `expect` instead of `unwrap` (which we'll discuss next) makes your code more maintainable because it explains why the operation should succeed and what went wrong if it didn't.

### Formatting Panic Messages

Both `panic!` and `expect` support format strings similar to `println!`:

```rust
fn get_value(map: &std::collections::HashMap<String, i32>, key: &str) -> i32 {
    *map.get(key).unwrap_or_else(|| {
        panic!("Key '{}' not found in configuration map", key)
    })
}
```

Providing detailed error messages helps with debugging and makes code more maintainable.

## Unwrapping and Expecting

Rust provides several shorthand methods for extracting values from `Result` and `Option` types, potentially causing panics if the values aren't present.

### unwrap and its Implications

The `unwrap` method extracts the value from a `Result` or `Option`, causing a panic if it's `Err` or `None`:

```rust
fn main() {
    let x: Result<i32, &str> = Ok(5);
    let y: Result<i32, &str> = Err("Error occurred");

    println!("{}", x.unwrap()); // Prints: 5
    println!("{}", y.unwrap()); // Panics: thread 'main' panicked at 'called `Result::unwrap()` on an `Err` value: "Error occurred"'
}
```

`unwrap` is concise but provides minimal context when it panics, making it less ideal for production code.

### When Unwrapping is Reasonable

Despite its potential for causing panics, `unwrap` can be appropriate in certain contexts:

1. **Prototyping**: When you're rapidly developing a proof of concept.

2. **Tests**: Where simplicity and readability outweigh robust error handling.

3. **Cases Where You've Already Checked**: If you've verified that a `Result` is `Ok` or an `Option` is `Some`.

4. **When a Failure Truly Is Impossible**: If you can prove that an error case cannot occur (though this is rare).

```rust
// Using unwrap after checking is reasonable
fn process_positive_number(text: &str) {
    if let Ok(num) = text.parse::<i32>() {
        if num > 0 {
            // We've already verified that parsing succeeded and num is positive
            let result = calculate_with_positive(num.abs().try_into().unwrap());
            println!("Result: {}", result);
        }
    }
}
```

### expect vs. unwrap

The `expect` method is similar to `unwrap` but allows you to specify a custom error message:

```rust
fn read_config() -> String {
    std::fs::read_to_string("config.txt")
        .expect("Critical configuration file missing")
}
```

When reviewing code, `expect` makes it clearer why the developer believed the operation would succeed and what went wrong if it didn't.

### unwrap_or and Other Alternatives

Rust provides safer alternatives to `unwrap` that don't panic:

- `unwrap_or(default)`: Returns the contained value or a default.
- `unwrap_or_else(|| compute_default())`: Returns the contained value or computes a default.
- `unwrap_or_default()`: Returns the contained value or the default value for that type.

```rust
fn get_config_value(key: &str) -> i32 {
    let config = load_config();
    // Return the value if present, or 0 as a default
    config.get(key).copied().unwrap_or(0)
}
```

These methods allow you to handle the absence of a value gracefully instead of panicking.

## The Panic Handler

When a panic occurs, Rust executes what's known as the panic handler. Understanding how this handler works gives you insight into Rust's error handling mechanisms and allows you to customize panic behavior when needed.

### Default Panic Behavior

By default, when a panic occurs, Rust:

1. Prints the panic message to standard error
2. Unwinds the stack, running destructors for all in-scope variables
3. Aborts the thread where the panic occurred

If the panic happens on the main thread, the entire program will terminate. This behavior protects your program from continuing in an invalid state.

### Stack Unwinding

Stack unwinding is the process of walking back up the call stack when a panic occurs:

```rust
fn inner() {
    panic!("Inner function panicked");
}

fn middle() {
    let _resource = SomeResource::new(); // Has a destructor
    inner();
    // This code is never reached
}

fn outer() {
    middle();
    // This code is never reached
}

fn main() {
    outer();
    // This code is never reached
}
```

When `inner()` panics:

1. Rust starts unwinding from `inner()`
2. It executes the destructor for `_resource` in `middle()`
3. It continues unwinding through `outer()` and `main()`
4. Finally, it terminates the program

This unwinding ensures that all resources are properly cleaned up, preventing memory leaks and other resource management issues.

### Customizing the Panic Handler

Since Rust 1.30, you can replace the default panic handler with your own implementation using the `std::panic::set_hook` function:

```rust
use std::panic;

fn main() {
    // Set a custom panic hook
    panic::set_hook(Box::new(|panic_info| {
        if let Some(location) = panic_info.location() {
            println!("Panic occurred in file '{}' at line {}",
                     location.file(), location.line());
        } else {
            println!("Panic occurred but location information is unavailable");
        }

        if let Some(message) = panic_info.payload().downcast_ref::<&str>() {
            println!("Panic message: {}", message);
        } else {
            println!("Panic payload not available or not a string");
        }

        // You could log to a file, send a notification, etc.
    }));

    // This will trigger our custom handler
    panic!("This is a test panic");
}
```

Custom panic hooks are useful for:

- Logging panics to a file
- Sending alerts or notifications
- Gathering additional diagnostic information
- Providing user-friendly error messages in GUI applications

### Panic Payload Information

The `PanicInfo` struct provided to panic hooks contains several useful pieces of information:

- **Location**: The file and line where the panic occurred (if available)
- **Payload**: The value passed to `panic!` (typically a string message)
- **Can Unwind**: Whether the panic supports unwinding

You can extract this information to provide more detailed error reports.

## Backtrace Analysis

A backtrace is a list of all the function calls that were active when a panic occurred. It's an invaluable tool for diagnosing the cause of a panic.

### Enabling Backtraces

By default, Rust doesn't display a full backtrace when a panic occurs. To enable backtraces, set the `RUST_BACKTRACE` environment variable:

```bash
# On Unix-like systems
RUST_BACKTRACE=1 cargo run

# On Windows (PowerShell)
$env:RUST_BACKTRACE=1; cargo run
```

You can also set it programmatically in your Rust code:

```rust
fn main() {
    std::env::set_var("RUST_BACKTRACE", "1");
    // Now any panics will include a backtrace

    // Example function that will panic
    let v = vec![1, 2, 3];
    v[99]; // This will panic with an index out of bounds error
}
```

### Reading a Backtrace

When a backtrace is enabled, the output looks something like this:

```
thread 'main' panicked at 'index out of bounds: the len is 3 but the index is 99', src/main.rs:7:5
stack backtrace:
   0: std::panicking::begin_panic_handler
   1: core::panicking::panic_fmt
   2: core::panicking::panic_bounds_check
   3: <alloc::vec::Vec<T,A> as core::ops::index::Index<I>>::index
   4: rust_playground::main
   5: core::ops::function::FnOnce::call_once
   ...
```

Reading a backtrace from top to bottom:

1. First, you see the panic message and location
2. Then the stack trace starts with low-level panic handling functions
3. As you read down, you get closer to your code
4. Line 4 shows where the panic occurred in your own code
5. The remaining lines show the context in which your function was called

Focus on the frames that reference your own code, as these will likely indicate where the problem originated.

### Symbols and Debug Information

To get the most useful backtraces:

1. Compile with debug symbols (the default for `cargo build` without `--release`)
2. If using an optimized build, consider using `cargo build --release --debug`
3. For distributed applications, consider using separate symbol files or tools like `symbolicate` to make sense of release backtraces

### Using Backtraces Effectively

When analyzing a backtrace:

1. **Start with your code**: Look for the highest entry in the backtrace that references your code.
2. **Check the panic message**: Understand what invariant was violated.
3. **Trace execution path**: Work backward from the panic to understand how you reached that point.
4. **Examine variable state**: Add print statements or use a debugger to inspect variable values leading up to the panic.

```rust
fn process_data(data: &[i32]) -> i32 {
    // Add debugging to help understand future panics
    println!("process_data called with data length: {}", data.len());

    // This will panic if data is empty
    let first = data[0];

    // More processing...
    first * 2
}
```

## panic vs abort

Rust offers two different ways to handle panics: the default unwinding behavior and a more drastic "abort" strategy. Each has its use cases and performance implications.

### Stack Unwinding (Default)

By default, when a panic occurs, Rust unwinds the stack, which means:

1. It walks back up the call stack
2. It runs the destructors for all live objects
3. It frees all allocated memory properly

This behavior ensures resources are properly cleaned up but requires additional code in your binary to manage the unwinding process.

### Abort on Panic

Alternatively, you can configure Rust to immediately abort the process when a panic occurs, without unwinding. This is done by adding the following to your `Cargo.toml`:

```toml
[profile.release]
panic = "abort"
```

Or by using the `-C panic=abort` compiler flag:

```bash
rustc -C panic=abort main.rs
```

When configured to abort:

1. The process terminates immediately upon panic
2. No destructors are run
3. Resource cleanup is left to the operating system
4. The resulting binary is smaller because it doesn't include unwinding code

### Performance Considerations

The choice between unwinding and aborting affects both runtime performance and binary size:

**Unwinding (Default)**:

- **Pros**: Ensures resources are properly freed, more predictable cleanup
- **Cons**: Increases binary size, slight performance cost even when no panics occur

**Abort**:

- **Pros**: Smaller binary size, no unwinding overhead, faster compilation
- **Cons**: Resources may not be properly cleaned up, less suitable for libraries

### Choosing the Right Strategy

Consider these guidelines when deciding between unwinding and aborting:

- **For applications**: Abort can be appropriate, especially in memory-constrained environments.
- **For libraries**: Unwinding is generally better, as libraries should be good citizens and clean up their resources.
- **For embedded systems**: Abort is often preferable due to size constraints.
- **For safety-critical systems**: Either carefully manage unwinding or use abort with a watchdog to restart the system.

### Hybrid Approaches

You can also implement a hybrid approach:

```rust
fn main() {
    // Set a panic hook that logs the error and then aborts
    std::panic::set_hook(Box::new(|panic_info| {
        // Log the panic information to a file
        log_panic_to_file(panic_info);

        // Then abort the process
        std::process::abort();
    }));

    // Your program logic...
}
```

This approach gives you the benefits of collecting diagnostic information while still having deterministic termination behavior.

## Catching Panics with catch_unwind

While Rust's panic mechanism is designed for unrecoverable errors, there are limited situations where you might want to catch a panic and prevent it from unwinding beyond a certain point. The `std::panic::catch_unwind` function provides this capability.

### Basic Usage of catch_unwind

The `catch_unwind` function executes a closure and returns a `Result`:

- `Ok` containing the closure's return value if no panic occurred
- `Err` containing the panic payload if a panic occurred

```rust
use std::panic;

fn main() {
    let result = panic::catch_unwind(|| {
        println!("Inside the closure");
        // This will panic
        panic!("Oh no!");
    });

    match result {
        Ok(_) => println!("The closure executed without panicking"),
        Err(_) => println!("The closure panicked, but we caught it"),
    }

    println!("This code still runs because we caught the panic");
}
```

### Appropriate Use Cases

`catch_unwind` should be used sparingly and only in specific scenarios:

1. **FFI boundaries**: When calling Rust from other languages, you might want to prevent panics from crossing the language boundary.

2. **Thread isolation**: To prevent a panic in one thread from bringing down the entire process.

3. **Testing frameworks**: To continue running tests even if some tests panic.

4. **Plugin systems**: To isolate failures in plugins from the main application.

```rust
// Example: Plugin system that catches panics in plugins
fn execute_plugin(plugin: &dyn Plugin, input: &str) -> Result<String, String> {
    let result = std::panic::catch_unwind(|| {
        plugin.process(input)
    });

    match result {
        Ok(output) => Ok(output),
        Err(e) => {
            if let Some(msg) = e.downcast_ref::<&str>() {
                Err(format!("Plugin panicked: {}", msg))
            } else {
                Err("Plugin panicked with unknown error".to_string())
            }
        }
    }
}
```

### Limitations of catch_unwind

There are important limitations to be aware of:

1. **Only works with UnwindSafe types**: The closure and all variables it captures must implement the `UnwindSafe` trait.

2. **Not guaranteed to catch all panics**: If compiled with `-C panic=abort`, `catch_unwind` won't work at all.

3. **Not for normal error handling**: Using `catch_unwind` for regular error handling is discouraged—use `Result` instead.

4. **Performance cost**: There's a runtime cost associated with setting up panic catching.

```rust
use std::panic::{self, AssertUnwindSafe};

// A type that doesn't implement UnwindSafe by default
struct Database { /* ... */ }

impl Database {
    fn query(&self) -> String {
        // Potentially panicking operation
        "result".to_string()
    }
}

fn main() {
    let db = Database { /* ... */ };

    // This won't compile:
    // let result = panic::catch_unwind(|| db.query());

    // But this will, with the AssertUnwindSafe wrapper:
    let result = panic::catch_unwind(AssertUnwindSafe(|| db.query()));

    match result {
        Ok(data) => println!("Query result: {}", data),
        Err(_) => println!("Database query panicked"),
    }
}
```

### resume_unwind

If you need to catch a panic temporarily but want it to continue unwinding later, you can use `resume_unwind`:

```rust
use std::panic;

fn main() {
    let result = panic::catch_unwind(|| {
        println!("About to panic");
        panic!("Original panic");
    });

    // Do some cleanup work...
    println!("Doing cleanup before re-panicking");

    // Re-panic with the original panic payload
    if let Err(panic) = result {
        panic::resume_unwind(panic);
    }
}
```

This is useful when you need to perform cleanup operations before allowing the panic to continue.

## Testing with should_panic

Rust's testing framework provides special support for testing code that's expected to panic, allowing you to verify that your code correctly detects and handles invalid states.

### Basic should_panic Attribute

The `#[should_panic]` attribute tells the test runner that a test is expected to panic:

```rust
#[test]
#[should_panic]
fn test_divide_by_zero() {
    let result = divide(10, 0);
    println!("Result: {}", result);
}

fn divide(a: i32, b: i32) -> i32 {
    if b == 0 {
        panic!("Cannot divide by zero");
    }
    a / b
}
```

If `divide` didn't panic when given a zero divisor, the test would fail.

### Checking Panic Messages

For more precise testing, you can check that the panic message contains specific text:

```rust
#[test]
#[should_panic(expected = "Cannot divide by zero")]
fn test_divide_by_zero_message() {
    let result = divide(10, 0);
    println!("Result: {}", result);
}
```

This test will only pass if the function panics AND the panic message contains the expected text. This helps ensure that the right panic is occurring for the right reason.

### should_panic with Result

When using the `Result` pattern for tests, you can combine it with the `should_panic` attribute:

```rust
#[test]
#[should_panic]
fn test_result_with_panic() -> Result<(), String> {
    // This function returns a Result but also might panic
    validate_positive_number(-5)?;
    Ok(())
}

fn validate_positive_number(n: i32) -> Result<(), String> {
    if n <= 0 {
        panic!("Number must be positive");
    }
    Ok(())
}
```

### Testing Boundary Conditions

The `should_panic` attribute is particularly useful for testing boundary conditions and error cases:

```rust
#[test]
#[should_panic(expected = "index out of bounds")]
fn test_out_of_bounds_access() {
    let v = vec![1, 2, 3];
    let _value = v[10]; // This should panic
}
```

This approach helps ensure that your code correctly handles error conditions rather than continuing with invalid data.

## Writing Panic-Safe Code

Writing code that handles panics gracefully is important for building reliable systems. This section covers techniques for making your code resilient even in the face of panics.

### Understanding Panic Safety

A function or type is "panic safe" if it maintains its invariants and doesn't leak resources even if a panic occurs during its execution. This is especially important for code that manages resources or maintains complex data structures.

### The RAII Pattern

Rust's Resource Acquisition Is Initialization (RAII) pattern helps make code panic-safe automatically:

```rust
struct ResourceGuard {
    resource: Resource,
}

impl ResourceGuard {
    fn new() -> Self {
        ResourceGuard {
            resource: Resource::acquire(),
        }
    }

    fn use_resource(&self) {
        // Use the resource...
        // This might panic!
    }
}

impl Drop for ResourceGuard {
    fn drop(&mut self) {
        // This will be called even if a panic occurs
        self.resource.release();
    }
}

fn do_work() {
    let guard = ResourceGuard::new();
    guard.use_resource(); // Even if this panics, the resource will be released
}
```

### The Drop Guard Pattern

When you need more complex cleanup logic, you can use an explicit drop guard:

```rust
struct DropGuard<F: FnMut()> {
    cleanup: F,
}

impl<F: FnMut()> Drop for DropGuard<F> {
    fn drop(&mut self) {
        (self.cleanup)();
    }
}

fn with_lock<F, R>(mutex: &std::sync::Mutex<R>, f: F) -> R
where
    F: FnOnce(&mut R) -> R,
{
    let mut guard = mutex.lock().unwrap();

    // Create a guard that will unlock the mutex even if we panic
    let _unlock_guard = DropGuard {
        cleanup: || { /* The mutex guard will be dropped automatically */ },
    };

    // If this panics, the _unlock_guard will still ensure the mutex is unlocked
    f(&mut guard)
}
```

### Avoiding Partial Initialization

Be careful with code that could leave data structures partially initialized if a panic occurs:

```rust
// Potentially panic-unsafe:
fn add_items(&mut self, items: &[Item]) {
    for item in items {
        self.size += item.size; // If we panic after this line but before adding the item...
        self.items.push(item.clone()); // ...the size will be incorrect
    }
}

// More panic-safe:
fn add_items(&mut self, items: &[Item]) {
    let new_size = self.size + items.iter().map(|i| i.size).sum::<usize>();
    for item in items {
        self.items.push(item.clone());
    }
    self.size = new_size; // Update the size only after all items have been added
}
```

### Using Atomic Operations

For data structures that might be accessed from multiple threads, use atomic operations to maintain consistency even if panics occur:

```rust
use std::sync::atomic::{AtomicUsize, Ordering};

struct Counter {
    count: AtomicUsize,
}

impl Counter {
    fn increment(&self) {
        self.count.fetch_add(1, Ordering::SeqCst);
    }

    fn decrement(&self) {
        // This will remain consistent even if another thread panics
        self.count.fetch_sub(1, Ordering::SeqCst);
    }
}
```

### The Panic Boundary Pattern

In complex systems, establish clear "panic boundaries" where panics are caught and handled:

```rust
fn process_request(request: Request) -> Response {
    match std::panic::catch_unwind(|| {
        // Process the request, which might panic
        process_request_inner(request)
    }) {
        Ok(response) => response,
        Err(_) => {
            // Log the error and return a fallback response
            log_error("Request processing panicked");
            Response::internal_server_error()
        }
    }
}
```

This pattern helps contain failures and prevent them from cascading through the entire system.

## Setting Panic Hooks

We've briefly covered panic hooks earlier, but they deserve a more detailed exploration as they're an essential tool for customizing panic behavior.

### Global Panic Hooks

The global panic hook affects all panics in your program:

```rust
use std::panic;
use std::fs::OpenOptions;
use std::io::Write;

fn main() {
    // Set a custom panic hook that logs to a file
    panic::set_hook(Box::new(|panic_info| {
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open("panic.log")
            .unwrap();

        let timestamp = chrono::Local::now().to_rfc3339();
        let backtrace = std::backtrace::Backtrace::capture();

        let _ = writeln!(file, "===== Panic at {} =====", timestamp);
        let _ = writeln!(file, "Info: {:?}", panic_info);
        let _ = writeln!(file, "Backtrace: {:?}", backtrace);
        let _ = writeln!(file, "============================\n");

        // Also print to stderr
        eprintln!("Application panicked! See panic.log for details.");
    }));

    // Your application code...
}
```

### Taking and Restoring Hooks

For libraries or specific sections of code, you can temporarily replace the panic hook:

```rust
use std::panic;

fn run_with_custom_panic_handling<F, R>(f: F) -> R
where
    F: FnOnce() -> R + panic::UnwindSafe,
{
    // Save the current hook
    let old_hook = panic::take_hook();

    // Set a new hook for this scope
    panic::set_hook(Box::new(|panic_info| {
        println!("Special panic handler: {:?}", panic_info);
    }));

    // Run the function with the special hook
    let result = std::panic::catch_unwind(f);

    // Restore the original hook
    panic::set_hook(old_hook);

    // Return the result or re-panic
    match result {
        Ok(r) => r,
        Err(e) => panic::resume_unwind(e),
    }
}
```

### Structured Logging in Panic Hooks

In production systems, structured logging in panic hooks can be invaluable:

```rust
use std::panic;
use serde_json::json;

fn setup_panic_logging() {
    panic::set_hook(Box::new(|panic_info| {
        let location = panic_info.location()
            .map(|loc| json!({
                "file": loc.file(),
                "line": loc.line(),
                "column": loc.column(),
            }))
            .unwrap_or_else(|| json!(null));

        let message = match panic_info.payload().downcast_ref::<&str>() {
            Some(s) => *s,
            None => match panic_info.payload().downcast_ref::<String>() {
                Some(s) => &s[..],
                None => "Unknown panic payload",
            },
        };

        let log_entry = json!({
            "level": "FATAL",
            "timestamp": chrono::Local::now().to_rfc3339(),
            "message": message,
            "location": location,
            "type": "panic",
        });

        // Log the structured data
        println!("{}", log_entry);
    }));
}
```

## Debug vs Release Panic Behavior

Panic behavior can differ between debug and release builds, which is important to understand when developing production software.

### Default Differences

By default:

- **Debug builds** (`cargo build`): Includes additional debug information, full backtraces, and detailed panic messages.
- **Release builds** (`cargo build --release`): Optimized for performance, with fewer debug symbols and potentially less detailed error information.

### Conditional Compilation

You can use conditional compilation to customize panic behavior based on the build profile:

```rust
fn check_invariant(value: i32) {
    #[cfg(debug_assertions)]
    {
        // Extensive checking in debug mode
        if value < 0 {
            panic!("Value must be non-negative, got {}", value);
        }
        if value > 1000 {
            panic!("Value must be at most 1000, got {}", value);
        }
    }

    #[cfg(not(debug_assertions))]
    {
        // Minimal checking in release mode
        if value < 0 || value > 1000 {
            panic!("Value out of allowed range");
        }
    }
}
```

### Debug Assertions

The `debug_assert!` macro only checks its condition in debug builds:

```rust
fn calculate_average(values: &[f64]) -> f64 {
    debug_assert!(!values.is_empty(), "Cannot calculate average of empty slice");

    // In release mode, this might cause division by zero if values is empty
    values.iter().sum::<f64>() / values.len() as f64
}
```

For production code, you should use regular `assert!` for critical invariants.

### Controlling Panic Output

You can control the verbosity of panic output with environment variables:

- `RUST_BACKTRACE=1`: Enables backtraces (more verbose)
- `RUST_BACKTRACE=full`: Enables full backtraces (most verbose)
- `RUST_LIB_BACKTRACE=0`: Disables backtraces from dependencies

For release builds, you might want to disable verbose output but log it to a file:

```rust
fn main() {
    // In release mode, disable console backtrace but log to file
    #[cfg(not(debug_assertions))]
    {
        std::env::set_var("RUST_BACKTRACE", "0");
        set_panic_hook_with_file_logging();
    }

    // Your application logic...
}
```

### Handling Critical Errors in Production

In production environments, you might want to implement more robust error handling:

```rust
#[cfg(not(debug_assertions))]
fn handle_critical_error() {
    // Log detailed information
    log_detailed_error_info();

    // Notify monitoring systems
    send_alert_to_monitoring();

    // Attempt graceful shutdown
    begin_graceful_shutdown();
}

#[cfg(debug_assertions)]
fn handle_critical_error() {
    // In debug mode, just panic with detailed information
    panic!("Critical error occurred - see log for details");
}
```

## 🔨 Project: Robust CLI Tool

Let's build a command-line tool that demonstrates proper panic handling and error recovery. This tool will process text files, performing various transformations while ensuring it handles errors gracefully.

### Project Goals

1. Build a text processing CLI tool
2. Implement proper error handling for different scenarios
3. Add custom panic hooks for detailed logging
4. Ensure resources are properly cleaned up even in panic situations
5. Implement panic boundaries to contain failures

### Step 1: Project Setup

```bash
cargo new text_processor
cd text_processor
```

Add the following dependencies to your `Cargo.toml`:

```toml
[dependencies]
clap = "3.0"
anyhow = "1.0"
chrono = "0.4"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

### Step 2: Implement Basic CLI

First, let's set up a basic CLI structure:

```rust
// src/main.rs
use clap::{App, Arg, SubCommand};
use std::fs::File;
use std::io::{self, BufRead, BufReader, Write};
use std::path::Path;
use std::panic;
use std::process;
use chrono::Local;

fn main() {
    // Set up custom panic handling
    setup_panic_handler();

    let matches = App::new("Text Processor")
        .version("1.0")
        .author("Your Name")
        .about("Processes text files with robust error handling")
        .arg(
            Arg::new("verbose")
                .short('v')
                .long("verbose")
                .help("Enable verbose output"),
        )
        .subcommand(
            SubCommand::with_name("count")
                .about("Count lines, words, and characters in a file")
                .arg(
                    Arg::new("file")
                        .help("Input file")
                        .required(true)
                        .index(1),
                ),
        )
        .subcommand(
            SubCommand::with_name("transform")
                .about("Transform text in various ways")
                .arg(
                    Arg::new("file")
                        .help("Input file")
                        .required(true)
                        .index(1),
                )
                .arg(
                    Arg::new("output")
                        .short('o')
                        .long("output")
                        .help("Output file (default: stdout)")
                        .takes_value(true),
                )
                .arg(
                    Arg::new("uppercase")
                        .long("uppercase")
                        .help("Convert text to uppercase"),
                )
                .arg(
                    Arg::new("lowercase")
                        .long("lowercase")
                        .help("Convert text to lowercase"),
                )
                .arg(
                    Arg::new("reverse")
                        .long("reverse")
                        .help("Reverse each line"),
                ),
        )
        .get_matches();

    let verbose = matches.is_present("verbose");

    match matches.subcommand() {
        Some(("count", sub_m)) => {
            let file_path = sub_m.value_of("file").unwrap();
            if let Err(e) = count_file(file_path, verbose) {
                eprintln!("Error: {}", e);
                process::exit(1);
            }
        }
        Some(("transform", sub_m)) => {
            let file_path = sub_m.value_of("file").unwrap();
            let output_path = sub_m.value_of("output");
            let uppercase = sub_m.is_present("uppercase");
            let lowercase = sub_m.is_present("lowercase");
            let reverse = sub_m.is_present("reverse");

            if let Err(e) = transform_file(file_path, output_path, uppercase, lowercase, reverse, verbose) {
                eprintln!("Error: {}", e);
                process::exit(1);
            }
        }
        _ => {
            eprintln!("No subcommand provided. Use --help for usage information.");
            process::exit(1);
        }
    }
}
```

### Step 3: Implement Custom Panic Handler

Next, let's add a robust panic handler that logs detailed information:

```rust
// src/main.rs (continued)

fn setup_panic_handler() {
    panic::set_hook(Box::new(|panic_info| {
        let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

        let mut error_log = File::options()
            .create(true)
            .append(true)
            .open("error.log")
            .unwrap_or_else(|_| {
                eprintln!("Warning: Could not open error log file");
                process::exit(1);
            });

        let backtrace = std::backtrace::Backtrace::capture();
        let location = panic_info.location()
            .map(|loc| format!("{}:{}", loc.file(), loc.line()))
            .unwrap_or_else(|| "unknown".to_string());

        let payload = match panic_info.payload().downcast_ref::<&str>() {
            Some(s) => *s,
            None => match panic_info.payload().downcast_ref::<String>() {
                Some(s) => s.as_str(),
                None => "Unknown panic payload",
            },
        };

        // Format the panic information
        let log_message = format!(
            "[{}] PANIC: {}\nLocation: {}\nBacktrace:\n{:?}\n\n",
            timestamp, payload, location, backtrace
        );

        // Write to the log file
        let _ = error_log.write_all(log_message.as_bytes());

        // Print a user-friendly message to stderr
        eprintln!("The application encountered an unexpected error and must terminate.");
        eprintln!("The error has been logged to error.log");
        eprintln!("Error details: {} at {}", payload, location);
    }));
}
```

### Step 4: Implement File Processing Functions

Now, let's implement the file processing functions with proper error handling:

```rust
// src/main.rs (continued)

fn count_file(file_path: &str, verbose: bool) -> Result<(), String> {
    if verbose {
        println!("Counting elements in file: {}", file_path);
    }

    // Safely catch panics in this function
    let result = panic::catch_unwind(|| -> Result<(), String> {
        let file = File::open(file_path).map_err(|e| format!("Failed to open file: {}", e))?;
        let reader = BufReader::new(file);

        let mut line_count = 0;
        let mut word_count = 0;
        let mut char_count = 0;

        for line_result in reader.lines() {
            let line = line_result.map_err(|e| format!("Error reading line: {}", e))?;
            line_count += 1;
            word_count += line.split_whitespace().count();
            char_count += line.chars().count();
        }

        println!("File: {}", file_path);
        println!("  Lines: {}", line_count);
        println!("  Words: {}", word_count);
        println!("  Characters: {}", char_count);

        Ok(())
    });

    // Handle any panics that occurred
    match result {
        Ok(result) => result,
        Err(_) => Err("A critical error occurred while processing the file".to_string()),
    }
}

fn transform_file(
    file_path: &str,
    output_path: Option<&str>,
    uppercase: bool,
    lowercase: bool,
    reverse: bool,
    verbose: bool,
) -> Result<(), String> {
    if verbose {
        println!("Transforming file: {}", file_path);
        if let Some(output) = output_path {
            println!("Output file: {}", output);
        }
        println!("Transformations: {}",
            [
                if uppercase { "uppercase" } else { "" },
                if lowercase { "lowercase" } else { "" },
                if reverse { "reverse" } else { "" },
            ].iter()
            .filter(|&s| !s.is_empty())
            .collect::<Vec<_>>()
            .join(", ")
        );
    }

    // Conflict check
    if uppercase && lowercase {
        return Err("Cannot specify both uppercase and lowercase transformations".to_string());
    }

    // Safely catch panics
    let result = panic::catch_unwind(|| -> Result<(), String> {
        let file = File::open(file_path).map_err(|e| format!("Failed to open input file: {}", e))?;
        let reader = BufReader::new(file);

        // Set up the output writer
        let output: Box<dyn Write> = match output_path {
            Some(path) => {
                let output_file = File::create(path)
                    .map_err(|e| format!("Failed to create output file: {}", e))?;
                Box::new(output_file)
            },
            None => Box::new(io::stdout()),
        };

        process_lines(reader, output, uppercase, lowercase, reverse)?;
        Ok(())
    });

    // Handle any panics
    match result {
        Ok(result) => result,
        Err(_) => Err("A critical error occurred during file transformation".to_string()),
    }
}

fn process_lines(
    reader: BufReader<File>,
    mut writer: Box<dyn Write>,
    uppercase: bool,
    lowercase: bool,
    reverse: bool,
) -> Result<(), String> {
    // Resource guard to ensure writer is flushed even if we panic
    struct WriteGuard<'a> {
        writer: &'a mut Box<dyn Write>,
    }

    impl<'a> Drop for WriteGuard<'a> {
        fn drop(&mut self) {
            let _ = self.writer.flush();
        }
    }

    let _guard = WriteGuard { writer: &mut writer };

    for line_result in reader.lines() {
        let mut line = line_result.map_err(|e| format!("Error reading line: {}", e))?;

        // Apply transformations
        if uppercase {
            line = line.to_uppercase();
        } else if lowercase {
            line = line.to_lowercase();
        }

        if reverse {
            line = line.chars().rev().collect();
        }

        // Write the transformed line
        writeln!(writer, "{}", line).map_err(|e| format!("Error writing output: {}", e))?;
    }

    Ok(())
}
```

### Step 5: Add Input Validation with Assertions

Let's add some validation that uses assertions to ensure program invariants:

```rust
// src/main.rs (continued)

fn validate_file_path(path: &str) -> Result<(), String> {
    let path = Path::new(path);

    // Check if the file exists
    if !path.exists() {
        return Err(format!("File does not exist: {}", path.display()));
    }

    // Check if it's actually a file
    if !path.is_file() {
        return Err(format!("Not a file: {}", path.display()));
    }

    // Check if we can read it
    match File::open(path) {
        Ok(_) => {},
        Err(e) => return Err(format!("Cannot read file {}: {}", path.display(), e)),
    }

    Ok(())
}

// Update the count_file function to use this validation
fn count_file(file_path: &str, verbose: bool) -> Result<(), String> {
    if verbose {
        println!("Counting elements in file: {}", file_path);
    }

    // Validate the file first
    validate_file_path(file_path)?;

    // Rest of the function remains the same...
```

### Step 6: Run and Test the Application

After implementing all these components, you can run and test your application:

```bash
cargo build

# Test the count functionality
./target/debug/text_processor count src/main.rs

# Test the transform functionality
./target/debug/text_processor transform src/main.rs --uppercase

# Test error handling with a non-existent file
./target/debug/text_processor count nonexistent.txt

# Test panic handling by adding a deliberate panic
# (You'd add this temporarily to one of your functions)
panic!("Test panic");
```

### Step 7: Improving Error Reporting

Finally, let's improve our error reporting with structured JSON logs:

```rust
// src/main.rs (continued)

use serde::Serialize;

#[derive(Serialize)]
struct ErrorLog {
    timestamp: String,
    level: String,
    message: String,
    location: Option<String>,
    backtrace: Option<String>,
    context: serde_json::Value,
}

fn log_error(message: &str, context: serde_json::Value) {
    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let log_entry = ErrorLog {
        timestamp,
        level: "ERROR".to_string(),
        message: message.to_string(),
        location: None,
        backtrace: None,
        context,
    };

    let json = serde_json::to_string_pretty(&log_entry).unwrap_or_else(|_| {
        format!("{{ \"message\": \"Failed to serialize error log\", \"original_error\": \"{}\" }}",
                message)
    });

    let mut log_file = File::options()
        .create(true)
        .append(true)
        .open("error.log")
        .unwrap_or_else(|_| {
            eprintln!("Warning: Could not open error log file");
            process::exit(1);
        });

    let _ = writeln!(log_file, "{}", json);
}
```

This project demonstrates:

1. Proper panic handling with custom hooks
2. Resource cleanup with RAII and drop guards
3. Containment of panics with `catch_unwind`
4. Detailed error logging and reporting
5. Clear separation between recoverable and unrecoverable errors

By following these patterns, you can build robust Rust applications that gracefully handle errors and maintain system integrity even when unexpected conditions occur.

## Summary

In this chapter, we've explored Rust's panic mechanism for handling unrecoverable errors. We've learned:

- Rust's two-pronged approach to error handling with `Result` for recoverable errors and `panic!` for unrecoverable ones
- When panicking is appropriate versus returning a `Result`
- How to use `panic!`, `expect`, and various unwrapping methods
- The details of the panic handler and stack unwinding process
- How to analyze backtraces to diagnose the cause of panics
- The differences between unwinding and aborting on panic
- How to catch panics with `catch_unwind` for specific use cases
- Techniques for testing code that should panic
- How to write panic-safe code that maintains invariants
- How to customize panic behavior with hooks
- The differences in panic behavior between debug and release builds

Understanding when and how to use panics is crucial for writing robust Rust code. While Rust encourages explicit error handling with `Result` for most situations, the panic mechanism provides a safety net for truly exceptional conditions where continuing execution would be unsafe or meaningless.

## Exercises

1. **Modify the Text Processor Project**: Add a new subcommand that processes a file with a more complex transformation, handling errors appropriately.

2. **Panic Hook Explorer**: Write a program that demonstrates different ways to customize the panic hook, including logging to different outputs and formats.

3. **Panic Safety Analysis**: Take an existing Rust library and analyze its code for panic safety. Identify potential improvements and implement them.

4. **Custom Assert Macro**: Implement a custom assertion macro that provides more detailed information when it fails than the standard `assert!`.

5. **Recovery System**: Build a simple service that intentionally panics under certain conditions but uses a supervisor to restart it, demonstrating resilience to failures.

## Further Reading

- [The Rust Error Handling Chapter](https://doc.rust-lang.org/book/ch09-00-error-handling.html) - Official Rust documentation on error handling
- [The Rustonomicon](https://doc.rust-lang.org/nomicon/unwinding.html) - Details on unwinding and panic mechanics
- [Unwinding Unwound](https://blog.rust-lang.org/2022/09/22/const-eval-2022.html) - Advanced details on Rust's unwinding implementation
- [Error Handling in Rust](https://blog.burntsushi.net/rust-error-handling/) - A comprehensive guide by Andrew Gallant
- [Fault-tolerant Systems in Rust](https://ferd.ca/the-zen-of-erlang.html) - Inspired by Erlang's "Let It Crash" philosophy
- [Panic Safety in Rust](https://www.snoyman.com/blog/2018/10/rust-crash-course-7-handling-errors/) - Techniques for ensuring code behaves well even during panics
