# Chapter 52: Rust Security Patterns and Auditing

## Introduction

Security is a fundamental concern in modern software development. As systems become more interconnected and cyber threats more sophisticated, the importance of building security into applications from the ground up has never been greater. Rust was designed with security as a core principle, making it an excellent choice for developing systems where security is critical.

This chapter explores the security advantages of Rust, common security patterns, auditing techniques, and best practices for building secure Rust applications. While Rust's type system and ownership model eliminate entire classes of vulnerabilities, writing secure software still requires deliberate attention to security principles and practices.

Rust provides strong guarantees against memory safety issues like buffer overflows, use-after-free vulnerabilities, and data races—problems that have plagued C and C++ codebases for decades and continue to account for a significant percentage of CVEs (Common Vulnerabilities and Exposures). However, memory safety is just one aspect of security. Issues like logic errors, authentication flaws, insecure defaults, and incorrect cryptographic usage can still affect Rust applications.

We'll begin by examining Rust's inherent security advantages, then move on to explore security patterns and anti-patterns specific to Rust. We'll look at techniques for auditing Rust code, both manually and with automated tools. We'll also cover secure coding practices for common tasks like handling user input, managing secrets, implementing cryptography, and secure network communication. Finally, we'll explore strategies for security testing and maintaining security throughout the software lifecycle.

Whether you're developing safety-critical systems, handling sensitive user data, or simply want to ensure your applications are resistant to common attacks, this chapter will provide you with the knowledge and techniques to leverage Rust's security strengths and avoid potential pitfalls.

## Rust's Security Foundations

Rust was designed with security in mind, and its core features provide a solid foundation for writing secure software. Let's explore these foundations and understand how they contribute to Rust's security posture.

### Memory Safety by Design

Memory safety vulnerabilities have historically been among the most common and dangerous security issues in software written in languages like C and C++. Rust's ownership system and borrowing rules eliminate these entire classes of vulnerabilities:

1. **Buffer Overflows**: Rust's bounds checking prevents reading or writing beyond the limits of arrays and other data structures.

   ```rust
   // This would compile but panic at runtime (safe failure)
   fn main() {
       let array = [1, 2, 3, 4, 5];
       // Will panic rather than access memory out of bounds
       let value = array[10]; // ← Panics with "index out of bounds"
   }
   ```

2. **Use-After-Free**: Rust's ownership system ensures that references cannot outlive the data they refer to.

   ```rust
   fn main() {
       let reference;
       {
           let value = String::from("hello");
           reference = &value;
           // value is dropped here, at the end of the scope
       }
       // This would be a use-after-free in C/C++
       // println!("{}", reference); // ← Compilation error in Rust
   }
   ```

3. **Double Free**: Rust's ownership system ensures each value is freed exactly once.

   ```rust
   fn main() {
       let s = String::from("hello");
       drop(s); // Explicitly drop the string
       // drop(s); // ← Compilation error: use of moved value
   }
   ```

4. **Null Pointer Dereference**: Rust's `Option<T>` type eliminates null references, requiring explicit handling of the absence of a value.

   ```rust
   fn main() {
       let maybe_value: Option<&str> = None;

       // Must explicitly handle the None case
       match maybe_value {
           Some(value) => println!("Got value: {}", value),
           None => println!("No value present"),
       }

       // Or using if let
       if let Some(value) = maybe_value {
           println!("Got value: {}", value);
       } else {
           println!("No value present");
       }
   }
   ```

5. **Data Races**: Rust's ownership system, combined with its concurrency model, prevents data races at compile time.

   ```rust
   use std::thread;

   fn main() {
       let mut data = vec![1, 2, 3];

       // This would cause a data race in other languages
       // thread::spawn(|| {
       //     data.push(4); // ← Compilation error: cannot move out of `data`
       // });

       // data.push(5);

       // Instead, we must be explicit about sharing:
       let handle = thread::spawn(move || {
           // Move ownership into the thread
           data.push(4);
       });

       // We can no longer access `data` here because ownership moved
       // data.push(5); // ← Compilation error

       handle.join().unwrap();
   }
   ```

### Type System Security

Rust's type system contributes significantly to security by enforcing correctness and preventing common mistakes:

1. **Strong Type Safety**: Rust's strong, static type system catches many errors at compile time rather than runtime.

   ```rust
   fn process_user_id(id: u64) {
       // Operations on user ID
   }

   fn main() {
       // This won't compile - type mismatch
       // process_user_id("user123"); // ← Compilation error

       // Must provide the correct type
       process_user_id(123);
   }
   ```

2. **Pattern Matching Exhaustiveness**: Rust requires handling all possible variants when pattern matching, preventing overlooked edge cases.

   ```rust
   enum UserRole {
       Admin,
       Moderator,
       User,
       Guest,
   }

   fn check_access(role: UserRole) -> bool {
       match role {
           UserRole::Admin => true,
           UserRole::Moderator => true,
           // If we forget to handle User and Guest, the compiler will error
           // Missing patterns: `User`, `Guest`
           // ↓ Compilation error if these are missing
           UserRole::User => false,
           UserRole::Guest => false,
       }
   }
   ```

3. **Immutability by Default**: All variables in Rust are immutable by default, reducing the risk of unintended state changes.

   ```rust
   fn main() {
       let user_id = 42;
       // user_id = 43; // ← Compilation error: cannot assign twice to immutable variable

       // Must be explicit about mutability
       let mut mutable_id = 42;
       mutable_id = 43; // This is allowed
   }
   ```

4. **No Implicit Conversions**: Rust requires explicit conversions between types, preventing subtle bugs and security issues.

   ```rust
   fn main() {
       let a: u32 = 300;
       // let b: u8 = a; // ← Compilation error: mismatched types

       // Must explicitly convert and handle potential overflow
       let b: u8 = a.try_into().unwrap_or(255); // Saturates at 255
   }
   ```

### Safe Abstractions

Rust's approach to abstraction also contributes to security:

1. **Safe Interfaces Over Unsafe Implementations**: Rust allows writing unsafe code but encourages wrapping it in safe interfaces.

   ```rust
   // A safe abstraction over raw pointer operations
   pub struct SafeBuffer {
       data: *mut u8,
       len: usize,
   }

   impl SafeBuffer {
       pub fn new(size: usize) -> Self {
           let layout = std::alloc::Layout::array::<u8>(size).unwrap();

           // Unsafe code is contained within the implementation
           let data = unsafe { std::alloc::alloc(layout) };
           if data.is_null() {
               std::alloc::handle_alloc_error(layout);
           }

           SafeBuffer { data, len: size }
       }

       // Provides a safe interface
       pub fn get(&self, index: usize) -> Option<u8> {
           if index >= self.len {
               None
           } else {
               // Unsafe code is contained and verified
               Some(unsafe { *self.data.add(index) })
           }
       }
   }

   impl Drop for SafeBuffer {
       fn drop(&mut self) {
           let layout = std::alloc::Layout::array::<u8>(self.len).unwrap();
           unsafe {
               std::alloc::dealloc(self.data, layout);
           }
       }
   }
   ```

2. **Controlled Mutability**: Rust's mutability controls and interior mutability patterns provide safe ways to handle mutable state.

   ```rust
   use std::cell::RefCell;

   struct User {
       id: u64,
       name: String,
       // Access count can be modified even when User is immutable
       access_count: RefCell<u32>,
   }

   impl User {
       fn new(id: u64, name: &str) -> Self {
           User {
               id,
               name: name.to_string(),
               access_count: RefCell::new(0),
           }
       }

       fn record_access(&self) {
           // Mutate through RefCell safely
           *self.access_count.borrow_mut() += 1;
       }

       fn access_count(&self) -> u32 {
           *self.access_count.borrow()
       }
   }

   fn main() {
       let user = User::new(1, "Alice");

       // We can modify access_count even though user is immutable
       user.record_access();
       user.record_access();

       println!("Access count: {}", user.access_count());
   }
   ```

3. **Trait System**: Rust's trait system enables defining clear contracts that implementations must fulfill.

   ```rust
   trait Authenticator {
       // Clear contract: implementations must verify credentials
       fn authenticate(&self, username: &str, password: &str) -> bool;
   }

   struct SimpleAuthenticator {
       // Username to password mapping
       credentials: std::collections::HashMap<String, String>,
   }

   impl Authenticator for SimpleAuthenticator {
       fn authenticate(&self, username: &str, password: &str) -> bool {
           match self.credentials.get(username) {
               Some(stored_password) => stored_password == password,
               None => false,
           }
       }
   }
   ```

### Error Handling

Rust's approach to error handling also enhances security:

1. **Result Type**: Rust's `Result<T, E>` type forces developers to explicitly handle errors or consciously ignore them.

   ```rust
   fn read_sensitive_file(path: &str) -> Result<String, std::io::Error> {
       std::fs::read_to_string(path)
   }

   fn main() {
       // Must handle the error case
       match read_sensitive_file("config.json") {
           Ok(contents) => println!("File contents: {}", contents),
           Err(error) => eprintln!("Failed to read file: {}", error),
       }

       // Or explicitly ignore it (discouraged for sensitive operations)
       if let Ok(contents) = read_sensitive_file("config.json") {
           println!("File contents: {}", contents);
       }

       // Or propagate it
       fn process_file() -> Result<(), std::io::Error> {
           let contents = read_sensitive_file("config.json")?;
           println!("File contents: {}", contents);
           Ok(())
       }
   }
   ```

2. **No Exceptions**: Rust doesn't have exceptions, which eliminates a common source of security vulnerabilities related to improper exception handling.

3. **Panic Safety**: Rust encourages writing code that is panic-safe, meaning that if a panic occurs, no memory safety violations happen during unwinding.

   ```rust
   struct ProtectedResource {
       data: Vec<u8>,
   }

   impl ProtectedResource {
       fn new() -> Self {
           ProtectedResource {
               data: vec![0; 1024],
           }
       }

       fn process(&mut self) {
           // Even if this panics, Drop will be called and resources cleaned up
           self.data[0] = 42;

           // If a panic occurs here...
           if self.data[0] == 42 {
               panic!("Demonstration panic");
           }

           // ...this code won't run, but no resources will be leaked
       }
   }

   impl Drop for ProtectedResource {
       fn drop(&mut self) {
           // Cleanup happens even if panic occurs
           println!("Cleaning up resource");
       }
   }

   fn main() {
       let mut resource = ProtectedResource::new();

       // This will panic, but no resources will be leaked
       let _ = std::panic::catch_unwind(move || {
           resource.process();
       });

       println!("Program continues after catching panic");
   }
   ```

These security foundations make Rust an excellent choice for security-critical applications. However, they're just the starting point for building secure software. In the following sections, we'll explore how to build on these foundations with security patterns and best practices.

## Secure Coding Patterns

Building on Rust's security foundations, let's explore patterns and techniques for writing secure Rust code. These patterns will help you avoid common security pitfalls and build robust, secure applications.

### Handling Untrusted Input

One of the most fundamental security principles is to never trust user input. Rust's type system helps enforce validation, but you still need to implement proper validation logic:

#### Input Validation Patterns

```rust
use regex::Regex;
use std::str::FromStr;

// Pattern 1: Parse and validate using FromStr
fn validate_username(input: &str) -> Result<String, &'static str> {
    // Criteria: 3-20 alphanumeric chars and underscores, must start with a letter
    if input.is_empty() {
        return Err("Username cannot be empty");
    }

    if input.len() > 20 {
        return Err("Username is too long (maximum 20 characters)");
    }

    if !input.chars().next().unwrap().is_alphabetic() {
        return Err("Username must start with a letter");
    }

    if !input.chars().all(|c| c.is_alphanumeric() || c == '_') {
        return Err("Username can only contain letters, numbers, and underscores");
    }

    Ok(input.to_string())
}

// Pattern 2: Newtype pattern with validation
struct Username(String);

impl FromStr for Username {
    type Err = &'static str;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match validate_username(s) {
            Ok(username) => Ok(Username(username)),
            Err(e) => Err(e),
        }
    }
}

// Pattern 3: Regex-based validation
fn validate_email(input: &str) -> Result<String, &'static str> {
    lazy_static::lazy_static! {
        static ref EMAIL_REGEX: Regex = Regex::new(
            r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$"
        ).unwrap();
    }

    if !EMAIL_REGEX.is_match(input) {
        return Err("Invalid email format");
    }

    Ok(input.to_string())
}

fn main() {
    // Using the validation functions
    match validate_username("alice_123") {
        Ok(username) => println!("Valid username: {}", username),
        Err(e) => eprintln!("Invalid username: {}", e),
    }

    // Using the newtype pattern
    match "bob_456".parse::<Username>() {
        Ok(username) => println!("Valid username: {}", username.0),
        Err(e) => eprintln!("Invalid username: {}", e),
    }

    match validate_email("user@example.com") {
        Ok(email) => println!("Valid email: {}", email),
        Err(e) => eprintln!("Invalid email: {}", e),
    }
}
```

#### Secure Deserialization

When deserializing data from untrusted sources, use techniques to limit risks:

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Pattern 1: Limit string sizes and collection lengths
#[derive(Deserialize)]
struct UserInput {
    #[serde(default)]
    #[serde(deserialize_with = "deserialize_limited_string")]
    name: String,

    #[serde(default)]
    #[serde(deserialize_with = "deserialize_limited_map")]
    attributes: HashMap<String, String>,
}

fn deserialize_limited_string<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s: String = String::deserialize(deserializer)?;

    // Limit string length to prevent DoS
    if s.len() > 1000 {
        return Err(serde::de::Error::custom("String too long"));
    }

    Ok(s)
}

fn deserialize_limited_map<'de, D>(deserializer: D) -> Result<HashMap<String, String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let map: HashMap<String, String> = HashMap::deserialize(deserializer)?;

    // Limit collection size to prevent DoS
    if map.len() > 100 {
        return Err(serde::de::Error::custom("Too many map entries"));
    }

    // Validate keys and values
    for (key, value) in &map {
        if key.len() > 50 {
            return Err(serde::de::Error::custom("Map key too long"));
        }

        if value.len() > 1000 {
            return Err(serde::de::Error::custom("Map value too long"));
        }
    }

    Ok(map)
}

// Pattern 2: Use serde's deny_unknown_fields to prevent attacker-controlled fields
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct StrictUserConfig {
    username: String,
    email: String,
    // Only these fields will be accepted
}

// Pattern 3: Enum tagging to prevent type confusion attacks
#[derive(Deserialize)]
#[serde(tag = "type")]
enum UserAction {
    Login { username: String, password: String },
    Logout { session_id: String },
    UpdateProfile { name: String, bio: String },
}
```

#### Sanitizing Outputs

Always sanitize data before using it in sensitive contexts:

```rust
// Pattern: Sanitize HTML output to prevent XSS
fn sanitize_html(input: &str) -> String {
    // Use a proper HTML sanitization library in production
    // This is a simplified example
    input
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
        .replace('&', "&amp;")
}

// Pattern: Sanitize SQL inputs to prevent SQL injection
fn sanitize_sql_identifier(identifier: &str) -> Result<String, &'static str> {
    // Check if identifier contains only allowed characters
    if !identifier.chars().all(|c| c.is_alphanumeric() || c == '_') {
        return Err("SQL identifier contains invalid characters");
    }

    // Don't allow numeric-only identifiers
    if identifier.chars().all(|c| c.is_numeric()) {
        return Err("SQL identifier cannot be numeric only");
    }

    Ok(identifier.to_string())
}

// Pattern: Sanitize command inputs to prevent command injection
fn escape_command_arg(arg: &str) -> String {
    // Use shell escaping
    // In a real application, consider using a library like shell-escape
    format!("'{}'", arg.replace('\'', "'\\''"))
}

fn main() {
    let user_input = "<script>alert('XSS')</script>";
    let sanitized = sanitize_html(user_input);
    println!("Sanitized HTML: {}", sanitized);

    match sanitize_sql_identifier("user_table") {
        Ok(identifier) => println!("Safe SQL identifier: {}", identifier),
        Err(e) => eprintln!("Invalid SQL identifier: {}", e),
    }

    let command_arg = "file; rm -rf /";
    let escaped = escape_command_arg(command_arg);
    println!("Escaped command argument: {}", escaped);
}
```

### Memory Safety Beyond the Compiler

While Rust's compiler prevents many memory safety issues, there are patterns to enhance security further:

#### Secure Memory Handling

```rust
use std::alloc::{alloc, dealloc, Layout};
use std::ptr;

// Pattern 1: Secure memory zeroing for sensitive data
struct SecureString {
    data: *mut u8,
    length: usize,
    capacity: usize,
}

impl SecureString {
    pub fn new() -> Self {
        SecureString {
            data: ptr::null_mut(),
            length: 0,
            capacity: 0,
        }
    }

    pub fn from_str(s: &str) -> Self {
        let mut secure = SecureString::with_capacity(s.len());

        unsafe {
            ptr::copy_nonoverlapping(s.as_ptr(), secure.data, s.len());
            secure.length = s.len();
        }

        secure
    }

    pub fn with_capacity(capacity: usize) -> Self {
        let layout = Layout::array::<u8>(capacity).unwrap();
        let data = unsafe { alloc(layout) };

        SecureString {
            data,
            length: 0,
            capacity,
        }
    }

    pub fn as_bytes(&self) -> &[u8] {
        unsafe { std::slice::from_raw_parts(self.data, self.length) }
    }
}

impl Drop for SecureString {
    fn drop(&mut self) {
        if !self.data.is_null() {
            // Zero out memory before freeing
            unsafe {
                ptr::write_bytes(self.data, 0, self.capacity);
                dealloc(self.data, Layout::array::<u8>(self.capacity).unwrap());
            }
            self.data = ptr::null_mut();
        }
    }
}

// Pattern 2: Prevent memory dumps by locking memory
#[cfg(unix)]
fn lock_memory() -> Result<(), &'static str> {
    #[cfg(target_os = "linux")]
    {
        use libc::{mlockall, MCL_CURRENT, MCL_FUTURE};

        if unsafe { mlockall(MCL_CURRENT | MCL_FUTURE) } != 0 {
            return Err("Failed to lock memory");
        }
    }

    Ok(())
}

// Pattern 3: Secure temporary files
fn create_secure_temp_file() -> std::io::Result<std::fs::File> {
    use std::fs::OpenOptions;
    use std::os::unix::fs::OpenOptionsExt;
    use uuid::Uuid;

    let temp_path = format!("/tmp/secure-{}.tmp", Uuid::new_v4());

    OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        // Set restrictive permissions (0600)
        .mode(0o600)
        .open(&temp_path)
}

fn main() {
    // Example usage of secure string
    let password = SecureString::from_str("supersecret");

    // Do operations with the password
    println!("Password length: {}", password.as_bytes().len());

    // Password will be securely zeroed when it goes out of scope
    drop(password);

    // Example of locking memory on Unix systems
    #[cfg(unix)]
    {
        if let Err(e) = lock_memory() {
            eprintln!("Warning: {}", e);
        } else {
            println!("Memory locked successfully");
        }
    }
}
```

#### Avoiding Time-Based Side Channels

```rust
// Pattern: Constant-time comparison for sensitive data
fn constant_time_compare(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }

    // Perform constant-time comparison to prevent timing attacks
    // XOR each byte and OR the result
    let mut result: u8 = 0;

    for i in 0..a.len() {
        result |= a[i] ^ b[i];
    }

    result == 0
}

// Application in a token verification function
fn verify_token(provided_token: &str, actual_token: &str) -> bool {
    constant_time_compare(
        provided_token.as_bytes(),
        actual_token.as_bytes()
    )
}
```

#### Mitigating Side-Channel Leaks

```rust
use std::time::{Duration, Instant};
use std::thread;

// Pattern: Add random delays to mask timing differences
fn verify_password_with_protection(input: &str, correct: &str) -> bool {
    // Measure the time taken
    let start = Instant::now();

    // Perform the actual verification
    let result = constant_time_compare(input.as_bytes(), correct.as_bytes());

    // Calculate how long the operation took
    let elapsed = start.elapsed();

    // Add a random delay to mask timing differences
    let min_time = Duration::from_millis(100);
    if elapsed < min_time {
        let additional_delay = min_time - elapsed;
        let jitter = Duration::from_millis(fastrand::u64(0..10));
        thread::sleep(additional_delay + jitter);
    }

    result
}

// Pattern: Preventing cache timing attacks
fn load_lookup_table_securely(table: &[u8], index: usize) -> u8 {
    // Instead of direct lookup which can leak information via cache timing,
    // touch all elements to prevent cache-based side channels
    let mut result = 0;

    for i in 0..table.len() {
        // This forces the CPU to access each element
        // The compiler won't optimize this away due to the OR operation
        let mask = if i == index { 0xFF } else { 0x00 };
        result |= table[i] & mask;
    }

    result
}
```

These patterns address critical aspects of secure coding beyond what Rust's compiler automatically provides. By following these practices, you can build applications that are resilient against various types of attacks and security vulnerabilities.

### Secure Resource Management

Resource management is critical for security, particularly for preventing denial of service attacks. Rust's ownership model helps, but additional patterns are necessary:

#### Resource Limiting

```rust
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

// Pattern 1: Global resource counter with automatic cleanup
struct ResourceCounter {
    count: AtomicUsize,
    limit: usize,
}

impl ResourceCounter {
    fn new(limit: usize) -> Self {
        ResourceCounter {
            count: AtomicUsize::new(0),
            limit,
        }
    }

    fn acquire(&self) -> Option<ResourceHandle> {
        let current = self.count.fetch_add(1, Ordering::SeqCst);

        if current >= self.limit {
            // Limit exceeded, release the resource
            self.count.fetch_sub(1, Ordering::SeqCst);
            return None;
        }

        Some(ResourceHandle {
            counter: self,
        })
    }

    fn release(&self) {
        self.count.fetch_sub(1, Ordering::SeqCst);
    }

    fn count(&self) -> usize {
        self.count.load(Ordering::SeqCst)
    }
}

// Handle that automatically releases the resource when dropped
struct ResourceHandle<'a> {
    counter: &'a ResourceCounter,
}

impl<'a> Drop for ResourceHandle<'a> {
    fn drop(&mut self) {
        self.counter.release();
    }
}

// Pattern 2: Request rate limiting
struct RateLimiter {
    tokens: AtomicUsize,
    max_tokens: usize,
    last_refill: std::sync::Mutex<Instant>,
    refill_rate: Duration,
    tokens_per_refill: usize,
}

impl RateLimiter {
    fn new(max_tokens: usize, refill_rate: Duration, tokens_per_refill: usize) -> Self {
        RateLimiter {
            tokens: AtomicUsize::new(max_tokens),
            max_tokens,
            last_refill: std::sync::Mutex::new(Instant::now()),
            refill_rate,
            tokens_per_refill,
        }
    }

    fn try_acquire(&self) -> bool {
        // Refill tokens if enough time has passed
        self.refill();

        // Try to take a token
        let current = self.tokens.load(Ordering::SeqCst);
        if current == 0 {
            return false;
        }

        // Use compare_exchange to handle concurrent access
        let result = self.tokens.compare_exchange(
            current,
            current - 1,
            Ordering::SeqCst,
            Ordering::SeqCst,
        );

        result.is_ok()
    }

    fn refill(&self) {
        let mut last_refill = self.last_refill.lock().unwrap();
        let now = Instant::now();
        let elapsed = now.duration_since(*last_refill);

        if elapsed >= self.refill_rate {
            // Calculate how many refills should occur
            let refills = elapsed.as_secs_f64() / self.refill_rate.as_secs_f64();
            let tokens_to_add = (refills as usize) * self.tokens_per_refill;

            if tokens_to_add > 0 {
                // Add tokens up to max
                let current = self.tokens.load(Ordering::SeqCst);
                let new_tokens = std::cmp::min(current + tokens_to_add, self.max_tokens);
                self.tokens.store(new_tokens, Ordering::SeqCst);

                // Update last refill time
                *last_refill = now;
            }
        }
    }
}

// Pattern 3: Timeout for operations
struct TimeoutGuard {
    deadline: Instant,
}

impl TimeoutGuard {
    fn new(timeout: Duration) -> Self {
        TimeoutGuard {
            deadline: Instant::now() + timeout,
        }
    }

    fn check_timeout(&self) -> Result<(), &'static str> {
        if Instant::now() > self.deadline {
            Err("Operation timed out")
        } else {
            Ok(())
        }
    }
}

fn main() {
    // Example usage of resource counter
    let counter = ResourceCounter::new(5);

    let handles: Vec<_> = (0..10)
        .map(|i| {
            match counter.acquire() {
                Some(handle) => {
                    println!("Acquired resource {}", i);
                    Some(handle)
                },
                None => {
                    println!("Failed to acquire resource {}", i);
                    None
                }
            }
        })
        .collect();

    println!("Active resources: {}", counter.count());

    // Resources will be automatically released when handles go out of scope
    drop(handles);

    println!("After dropping handles: {}", counter.count());

    // Example usage of rate limiter
    let limiter = Arc::new(RateLimiter::new(
        10,                             // Max tokens
        Duration::from_secs(1),         // Refill rate
        2,                              // Tokens per refill
    ));

    for i in 0..20 {
        if limiter.try_acquire() {
            println!("Request {} allowed", i);
        } else {
            println!("Request {} rate limited", i);
        }

        thread::sleep(Duration::from_millis(100));
    }

    // Example usage of timeout guard
    let guard = TimeoutGuard::new(Duration::from_secs(2));

    for i in 0..5 {
        match guard.check_timeout() {
            Ok(_) => {
                println!("Operation {} within timeout", i);
                thread::sleep(Duration::from_millis(500));
            },
            Err(e) => {
                println!("Operation {} failed: {}", i, e);
                break;
            }
        }
    }
}
```

## Cryptography Best Practices

Cryptography is essential for secure applications, but implementing it correctly can be challenging. Rust's ecosystem provides several excellent cryptography libraries that follow modern best practices. Let's explore how to use them correctly.

### Choosing Cryptographic Libraries

When selecting a cryptography library in Rust, consider the following:

1. **Maturity and maintenance**: Choose libraries that are actively maintained and have undergone security reviews.
2. **Correct implementations**: Prefer libraries that implement algorithms correctly and securely.
3. **Resistance to side-channel attacks**: Look for implementations that protect against timing attacks and other side channels.

Some recommended libraries include:

- **ring**: A safe and fast cryptographic library by the Rust Secure Code Working Group
- **RustCrypto**: A collection of cryptographic algorithms implemented in pure Rust
- **sodiumoxide**: Rust bindings to libsodium, a modern cryptographic library
- **openssl**: Bindings to the widely-used OpenSSL library (use with caution)

### Secure Key Management

Proper key management is critical for cryptographic security:

```rust
use ring::{aead, rand};
use std::sync::Arc;

// Pattern 1: Secure key generation
fn generate_encryption_key() -> aead::LessSafeKey {
    // Use a cryptographically secure random number generator
    let rng = rand::SystemRandom::new();

    // Generate a random key
    let key = aead::UnboundKey::new(&aead::AES_256_GCM, &rand::generate::<[u8; 32]>(&rng).unwrap().expose()).unwrap();

    // Wrap the key
    aead::LessSafeKey::new(key)
}

// Pattern 2: Key rotation and versioning
struct VersionedKeyManager {
    current_key_version: usize,
    keys: Vec<aead::LessSafeKey>,
}

impl VersionedKeyManager {
    fn new(initial_key: aead::LessSafeKey) -> Self {
        VersionedKeyManager {
            current_key_version: 0,
            keys: vec![initial_key],
        }
    }

    fn add_new_key(&mut self, key: aead::LessSafeKey) {
        self.keys.push(key);
        self.current_key_version = self.keys.len() - 1;
    }

    fn current_key(&self) -> (&aead::LessSafeKey, usize) {
        (&self.keys[self.current_key_version], self.current_key_version)
    }

    fn get_key_by_version(&self, version: usize) -> Option<&aead::LessSafeKey> {
        self.keys.get(version)
    }
}

// Pattern 3: Secure key storage (simplified)
#[cfg(target_os = "linux")]
fn store_key_securely(key_data: &[u8], key_id: &str) -> Result<(), &'static str> {
    // In a real implementation, you would use a secure key storage solution
    // like a hardware security module (HSM) or a key management service (KMS)

    // This is a simplified example using file system with proper permissions
    use std::fs::OpenOptions;
    use std::io::Write;
    use std::os::unix::fs::OpenOptionsExt;

    let key_path = format!("/etc/app/keys/{}.key", key_id);

    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .mode(0o600) // Only owner can read/write
        .open(key_path)
        .map_err(|_| "Failed to open key file")?;

    file.write_all(key_data)
        .map_err(|_| "Failed to write key data")?;

    Ok(())
}
```

### Encryption and Decryption

Here are patterns for secure encryption and decryption:

```rust
use ring::{aead, error, rand};
use std::convert::TryInto;

// Pattern 1: Authenticated encryption
fn encrypt(
    key: &aead::LessSafeKey,
    plaintext: &[u8],
    associated_data: &[u8],
) -> Result<Vec<u8>, error::Unspecified> {
    // Generate a random nonce
    let rng = rand::SystemRandom::new();
    let mut nonce_bytes = [0u8; 12]; // AES-GCM uses 96-bit nonces
    rand::fill(&rng, &mut nonce_bytes)?;
    let nonce = aead::Nonce::assume_unique_for_key(nonce_bytes);

    // Allocate space for the encrypted data
    let mut ciphertext = Vec::with_capacity(plaintext.len() + aead::MAX_TAG_LEN);
    ciphertext.extend_from_slice(plaintext);

    // Encrypt in place and append auth tag
    key.seal_in_place_append_tag(nonce, aead::Aad::from(associated_data), &mut ciphertext)?;

    // Prepend nonce to ciphertext
    let mut result = Vec::with_capacity(nonce_bytes.len() + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    Ok(result)
}

// Pattern 2: Authenticated decryption
fn decrypt(
    key: &aead::LessSafeKey,
    ciphertext: &[u8],
    associated_data: &[u8],
) -> Result<Vec<u8>, error::Unspecified> {
    if ciphertext.len() < 12 + aead::MAX_TAG_LEN {
        return Err(error::Unspecified);
    }

    // Extract the nonce
    let nonce_bytes: [u8; 12] = ciphertext[..12].try_into().unwrap();
    let nonce = aead::Nonce::assume_unique_for_key(nonce_bytes);

    // Extract the ciphertext + tag
    let mut ciphertext_and_tag = ciphertext[12..].to_vec();

    // Decrypt in place
    let plaintext = key.open_in_place(
        nonce,
        aead::Aad::from(associated_data),
        &mut ciphertext_and_tag,
    )?;

    Ok(plaintext.to_vec())
}

// Pattern 3: Encryption with versioning for key rotation
fn encrypt_with_versioning(
    key_manager: &VersionedKeyManager,
    plaintext: &[u8],
    associated_data: &[u8],
) -> Result<Vec<u8>, error::Unspecified> {
    let (current_key, version) = key_manager.current_key();

    let mut ciphertext = encrypt(current_key, plaintext, associated_data)?;

    // Prepend key version (as a single byte for simplicity)
    let mut result = Vec::with_capacity(1 + ciphertext.len());
    result.push(version as u8);
    result.extend_from_slice(&ciphertext);

    Ok(result)
}

fn decrypt_with_versioning(
    key_manager: &VersionedKeyManager,
    ciphertext: &[u8],
    associated_data: &[u8],
) -> Result<Vec<u8>, error::Unspecified> {
    if ciphertext.is_empty() {
        return Err(error::Unspecified);
    }

    // Extract key version
    let version = ciphertext[0] as usize;

    // Get the appropriate key
    let key = key_manager.get_key_by_version(version)
        .ok_or(error::Unspecified)?;

    // Decrypt using the specific key version
    decrypt(key, &ciphertext[1..], associated_data)
}
```

### Secure Password Handling

Securely handling passwords is crucial:

```rust
use argon2::{self, Config, ThreadMode, Variant, Version};
use rand::Rng;

// Pattern 1: Secure password hashing with Argon2
fn hash_password(password: &[u8]) -> Result<String, argon2::Error> {
    // Generate a random salt
    let mut salt = [0u8; 16];
    rand::thread_rng().fill(&mut salt);

    // Configure Argon2 parameters
    let config = Config {
        variant: Variant::Argon2id,
        version: Version::Version13,
        mem_cost: 65536, // 64 MB
        time_cost: 3,    // 3 iterations
        lanes: 4,        // 4 parallel lanes
        thread_mode: ThreadMode::Parallel,
        secret: &[],     // No secret key
        ad: &[],         // No additional data
        hash_length: 32, // 32-byte hash
    };

    // Hash the password
    argon2::hash_encoded(password, &salt, &config)
}

// Pattern 2: Password verification
fn verify_password(hash: &str, password: &[u8]) -> Result<bool, argon2::Error> {
    argon2::verify_encoded(hash, password)
}

// Pattern 3: Secure password reset
struct PasswordReset {
    token: String,
    user_id: u64,
    expiry: std::time::Instant,
}

impl PasswordReset {
    fn new(user_id: u64) -> Self {
        // Generate a cryptographically secure token
        let mut token_bytes = [0u8; 32];
        rand::thread_rng().fill(&mut token_bytes);

        let token = base64::encode(token_bytes);

        // Set expiry to 1 hour from now
        let expiry = std::time::Instant::now() + std::time::Duration::from_secs(3600);

        PasswordReset {
            token,
            user_id,
            expiry,
        }
    }

    fn is_valid(&self) -> bool {
        std::time::Instant::now() < self.expiry
    }
}
```

### TLS and Secure Communication

Secure communication is essential for protecting data in transit:

```rust
use rustls::{ClientConfig, ClientConnection, RootCertStore, ServerConfig, ServerConnection};
use std::sync::Arc;

// Pattern 1: Secure TLS client configuration
fn create_tls_client_config() -> Result<ClientConfig, Box<dyn std::error::Error>> {
    // Start with a default root certificate store
    let mut root_store = RootCertStore::empty();

    // Add system root certificates
    let roots = rustls_native_certs::load_native_certs()?;
    for root in roots {
        root_store.add(&rustls::Certificate(root.0))?;
    }

    // Configure client
    let config = ClientConfig::builder()
        .with_safe_defaults()
        .with_root_certificates(root_store)
        .with_no_client_auth(); // No client certificate

    Ok(config)
}

// Pattern 2: Secure TLS server configuration
fn create_tls_server_config(
    cert_file: &str,
    key_file: &str,
) -> Result<ServerConfig, Box<dyn std::error::Error>> {
    // Load certificate chain and private key
    let certs = load_certificates(cert_file)?;
    let key = load_private_key(key_file)?;

    // Configure server
    let config = ServerConfig::builder()
        .with_safe_defaults()
        .with_no_client_auth() // No client certificate required
        .with_single_cert(certs, key)?;

    Ok(config)
}

// Helper functions for loading TLS certificates and keys
fn load_certificates(filename: &str) -> Result<Vec<rustls::Certificate>, Box<dyn std::error::Error>> {
    let cert_file = std::fs::File::open(filename)?;
    let mut reader = std::io::BufReader::new(cert_file);

    let certs = rustls_pemfile::certs(&mut reader)?
        .into_iter()
        .map(rustls::Certificate)
        .collect();

    Ok(certs)
}

fn load_private_key(filename: &str) -> Result<rustls::PrivateKey, Box<dyn std::error::Error>> {
    let key_file = std::fs::File::open(filename)?;
    let mut reader = std::io::BufReader::new(key_file);

    // Try to read as a PKCS8 private key
    if let Some(key) = rustls_pemfile::pkcs8_private_keys(&mut reader)?.pop() {
        return Ok(rustls::PrivateKey(key));
    }

    // If that fails, try as an RSA key
    let key_file = std::fs::File::open(filename)?;
    let mut reader = std::io::BufReader::new(key_file);

    if let Some(key) = rustls_pemfile::rsa_private_keys(&mut reader)?.pop() {
        return Ok(rustls::PrivateKey(key));
    }

    Err("No private key found".into())
}

// Pattern 3: Certificate pinning
fn create_pinned_config(
    pinned_cert_der: &[u8],
) -> Result<ClientConfig, Box<dyn std::error::Error>> {
    let mut root_store = RootCertStore::empty();

    // Add only the specific pinned certificate
    root_store.add(&rustls::Certificate(pinned_cert_der.to_vec()))?;

    let config = ClientConfig::builder()
        .with_safe_defaults()
        .with_root_certificates(root_store)
        .with_no_client_auth();

    Ok(config)
}
```

### Random Number Generation

Secure random number generation is fundamental to many security operations:

```rust
use rand::{Rng, SeedableRng};
use rand::rngs::StdRng;

// Pattern 1: Secure random number generation
fn generate_secure_random_bytes(len: usize) -> Vec<u8> {
    let mut rng = rand::thread_rng();
    let mut bytes = vec![0u8; len];
    rng.fill(&mut bytes[..]);
    bytes
}

// Pattern 2: Secure token generation
fn generate_secure_token(len: usize) -> String {
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let mut rng = rand::thread_rng();

    (0..len)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

// Pattern 3: Avoiding predictable RNG for security-critical operations
fn secure_random_in_range(min: u32, max: u32) -> u32 {
    // Use thread_rng() which is cryptographically secure
    rand::thread_rng().gen_range(min..max)
}

fn insecure_random_for_non_security_critical() -> u32 {
    // Use a fast, deterministically seeded RNG for non-security operations
    let mut rng = StdRng::from_entropy();
    rng.gen()
}
```

These cryptography best practices provide a foundation for implementing secure cryptographic operations in your Rust applications. Remember that cryptography is complex, and it's often best to rely on well-vetted libraries and follow established patterns rather than implementing cryptographic algorithms yourself.

## Security Auditing Techniques

Security auditing is an essential process for identifying and mitigating security vulnerabilities in your Rust code. While Rust provides strong safety guarantees, careful auditing is still necessary to ensure that your code is secure.

### Code Review Practices

Effective security-focused code reviews are a crucial part of securing Rust applications:

#### Security-Focused Code Review Checklist

1. **Input validation**: Check that all inputs (especially those from untrusted sources) are properly validated
2. **Error handling**: Ensure errors are handled appropriately and don't leak sensitive information
3. **Authentication and authorization**: Verify that access controls are properly enforced
4. **Memory management**: Look for unsafe code blocks and ensure they're used correctly
5. **Secrets management**: Check that secrets aren't hardcoded or logged
6. **Cryptography usage**: Verify that cryptographic operations follow best practices
7. **Third-party dependencies**: Review the security of dependencies
8. **Concurrency**: Check for potential race conditions or deadlocks
9. **Resource management**: Look for potential resource leaks or denial of service vulnerabilities

#### Code Review Example

Consider this code with potential security issues:

```rust
// Before security review
fn process_user_data(input: &str) -> Result<String, String> {
    // Potential security issue: No input validation

    let conn = establish_database_connection()
        .map_err(|e| format!("Database error: {}", e))?;  // Leaks internal details

    // Potential SQL injection
    let query = format!("SELECT data FROM users WHERE id = {}", input);

    // Potential information leak through error messages
    let result = conn.execute(&query)
        .map_err(|e| format!("Query failed: {}", e))?;

    // Potential sensitive data leak
    println!("User data: {}", result);

    Ok(result)
}
```

After security review:

```rust
// After security review
fn process_user_data(input: &str) -> Result<String, &'static str> {
    // Input validation
    let user_id = input.parse::<u32>()
        .map_err(|_| "Invalid user ID format")?;

    let conn = establish_database_connection()
        .map_err(|_| "Database connection failed")?;  // Generic error

    // Parameterized query prevents SQL injection
    let query = "SELECT data FROM users WHERE id = ?";

    // Secure error handling without leaking details
    let result = conn.execute(query, params![user_id])
        .map_err(|_| "Data retrieval failed")?;

    // No logging of sensitive data
    log::debug!("Data retrieved for user ID: {}", user_id);

    Ok(result)
}
```

### Static Analysis Tools

Static analysis tools can help identify potential security issues in your code without executing it:

#### Security-Focused Static Analysis

1. **Cargo Audit**: Checks your dependencies for known vulnerabilities

```bash
cargo install cargo-audit
cargo audit
```

2. **Clippy**: Rust's linter can catch potential security issues

```bash
cargo clippy -- -W clippy::all -W clippy::pedantic -W clippy::nursery
```

3. **Cargo Geiger**: Detects and measures usage of unsafe code

```bash
cargo install cargo-geiger
cargo geiger
```

4. **Cargo Deny**: Helps enforce dependency and license policies

```bash
cargo install cargo-deny
cargo deny check
```

5. **Semgrep**: Customizable static analysis with security rules

```bash
pip install semgrep
semgrep --config=p/rust-security scan .
```

#### Custom Lints for Security

You can also create custom lints for your project's specific security requirements:

```rust
// In a separate crate, e.g., my_security_lints
#![feature(rustc_private)]

extern crate rustc_lint;
extern crate rustc_session;
extern crate rustc_hir;

use rustc_lint::{LateContext, LateLintPass, LintContext};
use rustc_session::{declare_lint, declare_lint_pass};
use rustc_hir::{Expr, ExprKind};

declare_lint! {
    pub INSECURE_RANDOM,
    Warn,
    "using potentially insecure random number generation"
}

declare_lint_pass!(InsecureRandomCheck => [INSECURE_RANDOM]);

impl<'tcx> LateLintPass<'tcx> for InsecureRandomCheck {
    fn check_expr(&mut self, cx: &LateContext<'tcx>, expr: &'tcx Expr<'_>) {
        if let ExprKind::Call(func, _) = &expr.kind {
            // Check for calls to rand::random or rand::thread_rng for
            // security-sensitive operations
            if let Some(def_id) = cx.typeck_results().type_dependent_def_id(func.hir_id) {
                let path_str = cx.tcx.def_path_str(def_id);

                if path_str == "rand::random" || path_str == "rand::thread_rng" {
                    // Check if we're in a security-sensitive context
                    if is_security_sensitive_context(cx, expr) {
                        cx.lint(
                            INSECURE_RANDOM,
                            expr.span,
                            "using rand::random in security-sensitive context, consider using ring::rand instead",
                        );
                    }
                }
            }
        }
    }
}

// Helper function to determine if we're in a security context
fn is_security_sensitive_context(cx: &LateContext<'_>, expr: &Expr<'_>) -> bool {
    // Implementation would check function names, module paths, etc.
    // This is a simplified example
    false
}
```

### Dynamic Analysis and Testing

Dynamic analysis and security testing are essential to find vulnerabilities that static analysis might miss:

#### Fuzzing

Fuzzing is a powerful technique for finding security vulnerabilities by providing random or unexpected inputs:

```rust
// Example: Using cargo-fuzz to find vulnerabilities
use arbitrary::Arbitrary;

#[derive(Arbitrary, Debug)]
struct FuzzInput {
    data: Vec<u8>,
    option: Option<String>,
    number: u32,
}

// Target function to be fuzzed
fn parse_and_process(input: &FuzzInput) -> Result<(), String> {
    // Process the data - vulnerabilities will be detected during fuzzing
    if input.data.len() > 1000 {
        return Err("Data too large".to_string());
    }

    if let Some(s) = &input.option {
        if s.contains("trigger") {
            // This might cause unexpected behavior with certain inputs
            let parts: Vec<&str> = s.split('/').collect();
            let _ = parts[input.number as usize % parts.len()]; // Potential panic
        }
    }

    Ok(())
}

// In fuzz/fuzz_targets/parse_target.rs
#[macro_use]
extern crate libfuzzer_sys;

fuzz_target!(|input: FuzzInput| {
    let _ = parse_and_process(&input);
});
```

Run the fuzzer with:

```bash
cargo install cargo-fuzz
cargo fuzz run parse_target
```

#### Property-Based Testing

Property-based testing generates random inputs to test properties that should always hold:

```rust
use proptest::prelude::*;

// Function to test
fn secure_token_validator(token: &str) -> bool {
    token.len() >= 8 && token.chars().any(|c| c.is_ascii_digit()) && token.chars().any(|c| c.is_ascii_uppercase())
}

proptest! {
    // This property test will verify that our validator enforces proper token rules
    #[test]
    fn test_token_validator(token in "[A-Za-z0-9]{0,20}") {
        // A token should be valid if and only if it:
        // 1. Is at least 8 characters long
        // 2. Contains at least one digit
        // 3. Contains at least one uppercase letter
        let expected = token.len() >= 8 &&
                        token.chars().any(|c| c.is_ascii_digit()) &&
                        token.chars().any(|c| c.is_ascii_uppercase());

        // Our validator should match this expected result
        prop_assert_eq!(secure_token_validator(&token), expected);
    }
}
```

#### Exploit Development and Testing

Creating proof-of-concept exploits can help verify vulnerabilities and test mitigations:

```rust
// A vulnerable function with a potential integer overflow
fn vulnerable_allocation(size: usize) -> Vec<u8> {
    let mut vec = Vec::with_capacity(size);
    unsafe {
        vec.set_len(size);
    }
    vec
}

// Proof-of-concept exploit test
#[test]
fn test_overflow_vulnerability() {
    // This will likely cause a crash or memory corruption
    let size = usize::MAX;
    let result = std::panic::catch_unwind(|| {
        vulnerable_allocation(size)
    });

    // The function should panic rather than allocate an impossible amount of memory
    assert!(result.is_err());
}

// Fixed version with exploit mitigation test
fn secure_allocation(size: usize) -> Result<Vec<u8>, &'static str> {
    // Check for reasonable size before allocation
    if size > 1_000_000_000 {
        return Err("Allocation too large");
    }

    let mut vec = Vec::with_capacity(size);
    unsafe {
        vec.set_len(size);
    }
    Ok(vec)
}

#[test]
fn test_overflow_mitigation() {
    let size = usize::MAX;
    let result = secure_allocation(size);

    // Should return an error rather than panicking
    assert!(result.is_err());
}
```

### Dependency Auditing

Third-party dependencies are often a source of security vulnerabilities:

#### Dependency Auditing Process

1. **Inventory Dependencies**: Maintain a list of all dependencies and their purposes

```rust
// Cargo.toml with explicit dependency versions and reasons
[dependencies]
# Core cryptography - audited 2023-05-15
ring = { version = "0.16.20", features = ["std"] }

# HTTP client - audited 2023-05-15
reqwest = { version = "0.11.18", default-features = false, features = ["rustls-tls"] }

# Serialization - audited 2023-05-15
serde = { version = "1.0.163", features = ["derive"] }
serde_json = "1.0.96"

# Access to native system functionality - SECURITY SENSITIVE
libc = "0.2.144"  # Required for low-level system access
```

2. **Minimize Dependencies**: Reduce attack surface by limiting dependencies

```rust
// Before minimization
[dependencies]
chrono = "0.4.24"  # Only using simple date formatting
regex = "1.8.1"    # Only using one simple pattern match
rand = "0.8.5"     # Only using random string generation

# After minimization
[dependencies]
# Replaced chrono with time (smaller, fewer deps)
time = { version = "0.3.21", features = ["formatting"] }

# Replaced regex with simple string operations for our case
# Removed - reducing attack surface

# Replaced full rand with getrandom for our limited use case
getrandom = "0.2.9"
```

3. **Vendoring Critical Dependencies**: For security-critical code, consider vendoring dependencies

```rust
# In .cargo/config.toml
[source.crates-io]
replace-with = "vendored-sources"

[source.vendored-sources]
directory = "vendor"
```

Then run:

```bash
cargo vendor
git add vendor/
```

4. **Regular Auditing**: Set up automated and manual processes for dependency auditing

```bash
# Add to CI pipeline
cargo audit
cargo deny check

# Generate a dependency tree for manual review
cargo tree --prefix-depth
```

### Security Audit Documentation

Documenting your security audit process and findings is crucial:

#### Audit Report Template

```markdown
# Security Audit Report: [Project Name]

## Executive Summary

Brief overview of the audit scope, methodology, and key findings.

## Scope

- Files/modules reviewed
- Audit timeframe
- Tools used

## Findings

### Critical Issues

1. **[Issue Title]**
   - **Location**: `src/module.rs:123`
   - **Description**: Detailed explanation
   - **Impact**: What could an attacker do?
   - **Recommendation**: How to fix it
   - **Status**: Fixed in PR #123

### High Issues

...

### Medium Issues

...

### Low Issues

...

## Methodology

Description of the audit approach, including:

- Static analysis tools used
- Dynamic testing performed
- Code review process
- Threat modeling approach

## Recommendations

General recommendations for improving the security posture.

## Follow-up

Plan for addressing findings and verification testing.
```

#### Security Audit Workflow

1. **Planning**: Define scope, methodology, and timeline
2. **Threat Modeling**: Identify assets, threats, and potential vulnerabilities
3. **Automated Analysis**: Run static analysis tools
4. **Manual Review**: Perform in-depth code review
5. **Dynamic Testing**: Test with fuzzing and other dynamic techniques
6. **Reporting**: Document findings and recommendations
7. **Remediation**: Fix identified issues
8. **Verification**: Verify that fixes are effective
9. **Follow-up**: Continuous monitoring and periodic re-auditing

By following these security auditing techniques, you can systematically identify and address security vulnerabilities in your Rust code, even those that Rust's safety features don't automatically prevent.

## Supply Chain Security

Supply chain security is increasingly important as modern applications often depend on dozens or hundreds of third-party dependencies. A vulnerability in any of these dependencies can compromise your entire application.

### Understanding Supply Chain Risks

The software supply chain includes all components that go into your application:

1. **Direct dependencies**: Libraries your code explicitly depends on
2. **Transitive dependencies**: Dependencies of your dependencies
3. **Development tools**: Compilers, build systems, CI/CD pipelines
4. **Runtime environment**: Operating system, containers, cloud infrastructure

Supply chain attacks can target any of these components:

- **Malicious packages**: Packages intentionally created or compromised to contain malware
- **Typosquatting**: Malicious packages with names similar to popular packages
- **Dependency confusion**: Exploiting differences between public and private package repositories
- **Abandoned packages**: Unmaintained dependencies that may contain vulnerabilities

### Dependency Management Strategies

Here are effective strategies for managing dependencies securely:

#### Dependency Pinning and Lockfiles

Always use Cargo.lock to pin exact versions of dependencies:

```toml
# Cargo.toml
[dependencies]
serde = "1.0.152"  # Specifies a semver-compatible version

# Cargo.lock (automatically generated)
# This pins the exact version and all transitive dependencies
# [[package]]
# name = "serde"
# version = "1.0.152"
# source = "registry+https://github.com/rust-lang/crates.io-index"
# checksum = "bb7d1f0d3021d347a83e556fc4683dea2ea09d87bccdf88ff5c12545d89d5efb"
```

Commit your Cargo.lock file to source control for applications (though not for libraries).

#### Minimal Dependency Set

Limit the number of dependencies you use:

```toml
# Before optimization
[dependencies]
serde = { version = "1.0", features = ["derive"] }  # Full serialization framework
serde_json = "1.0"  # JSON support
regex = "1.7"  # Regular expressions
chrono = { version = "0.4", features = ["serde"] }  # Date/time handling
tokio = { version = "1.25", features = ["full"] }  # Async runtime with ALL features
uuid = { version = "1.3", features = ["v4", "serde"] }  # UUID generation
log = "0.4"  # Logging facade
env_logger = "0.10"  # Logger implementation

# After optimization
[dependencies]
serde = { version = "1.0", features = ["derive"], default-features = false }  # Core only
serde_json = { version = "1.0", default-features = false }  # No std feature
# regex removed - using simple string operations instead
time = { version = "0.3", features = ["formatting", "serde"], default-features = false }  # Smaller alternative to chrono
tokio = { version = "1.25", features = ["rt", "macros", "io-util", "net"] }  # Only needed features
uuid = { version = "1.3", features = ["v4", "serde"], default-features = false }  # Minimal features
log = "0.4"  # Kept as is (small and essential)
# env_logger replaced with simpler implementation
simple_logger = { version = "4.0", default-features = false }
```

#### Dependency Verification

Use tools to verify the integrity of dependencies:

```rust
// In .cargo/config.toml
[registries.crates-io]
protocol = "sparse"  // More secure registry protocol

// If using cargo-crev for verification
[cargo-crev]
db_path = "~/.config/crev/proofs"
```

Then use cargo-crev to verify dependencies:

```bash
cargo install cargo-crev
cargo crev verify
```

### Continuous Monitoring

Set up continuous monitoring for vulnerabilities:

#### Automated Vulnerability Scanning

```bash
# In your CI/CD pipeline
cargo audit

# Or with GitHub Actions
name: Security audit
on:
  schedule:
    - cron: '0 0 * * *'  # Daily
  push:
    paths:
      - '**/Cargo.toml'
      - '**/Cargo.lock'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/audit-check@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

#### Dependency Update Strategy

Regularly update dependencies to incorporate security fixes:

```bash
# Check for outdated dependencies
cargo outdated

# Update dependencies
cargo update

# Selectively update a specific dependency
cargo update -p serde
```

Use tools like Renovate or Dependabot to automate this process.

### Build Infrastructure Security

Secure your build infrastructure to prevent supply chain attacks:

#### Reproducible Builds

Configure your project for reproducible builds:

```toml
# In Cargo.toml
[profile.release]
codegen-units = 1  # Improves reproducibility
incremental = false  # Disables incremental compilation for release builds
```

Verify build reproducibility:

```bash
# Build once
cargo build --release
cp target/release/my-app my-app-build1

# Clean and build again
cargo clean
cargo build --release
cp target/release/my-app my-app-build2

# Compare the binaries
cmp my-app-build1 my-app-build2
```

#### Secure CI/CD Pipeline

Secure your continuous integration and deployment pipelines:

```yaml
# .github/workflows/build.yml
name: Build and Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Pin action versions with SHA for security
      - uses: actions-rs/toolchain@88dc2356392166efad76775c878094f4e83ff746
        with:
          toolchain: stable
          override: true

      # Use lockfile for dependencies
      - uses: actions/cache@937d24475381cd9c75ae6db12cb4e79714b926ed
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            target
          key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}

      # Security checks
      - name: Security audit
        run: |
          cargo install cargo-audit
          cargo audit

      # Build with locked dependencies
      - name: Build
        run: cargo build --locked --release
```

### Secure Coding Practices for Dependencies

Follow these practices when using dependencies:

#### Safe Integration Patterns

```rust
// Pattern 1: Wrapper modules to isolate dependencies
mod http_client {
    use reqwest::{Client, Response, Error};

    // Expose only what's needed with additional safety checks
    pub async fn get(url: &str) -> Result<String, Error> {
        // Validate URL before passing to dependency
        if !url.starts_with("https://") {
            return Err(Error::from(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Only HTTPS URLs are supported",
            )));
        }

        let client = Client::new();
        let response = client.get(url).send().await?;
        response.text().await
    }
}

// Pattern 2: Feature-gated dependencies
#[cfg(feature = "fancy-ui")]
mod ui {
    use fancy_ui::Renderer;

    pub fn render() {
        // Only included when the "fancy-ui" feature is enabled
        let renderer = Renderer::new();
        renderer.render();
    }
}

#[cfg(not(feature = "fancy-ui"))]
mod ui {
    pub fn render() {
        // Simple fallback implementation
        println!("Rendering basic UI");
    }
}

// Pattern 3: Defensive usage
fn parse_json(input: &str) -> Result<serde_json::Value, &'static str> {
    // Limit input size to prevent DoS
    if input.len() > 1_000_000 {
        return Err("Input too large");
    }

    // Use from_str_with_limit if available (hypothetical API)
    // Otherwise handle manually
    match serde_json::from_str(input) {
        Ok(value) => {
            // Validate structure before using
            if value.as_object().map_or(0, |o| o.len()) > 1000 {
                return Err("Too many object fields");
            }
            Ok(value)
        },
        Err(_) => Err("Invalid JSON"),
    }
}
```

#### Dependency Sandboxing

For high-risk dependencies, consider sandboxing:

```rust
use std::process::{Command, Stdio};

// Run potentially risky image processing in a separate process
fn process_image(input_path: &str, output_path: &str) -> Result<(), String> {
    let status = Command::new("sandbox-runner")
        .arg("--memory-limit=100M")
        .arg("--time-limit=5s")
        .arg("--")
        .arg("./image_processor")  // Separate binary with limited permissions
        .arg(input_path)
        .arg(output_path)
        .stdin(Stdio::null())
        .status()
        .map_err(|e| format!("Failed to execute: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("Process failed with status: {}", status))
    }
}
```

By implementing these supply chain security practices, you can significantly reduce the risk of compromise through third-party dependencies and build a more resilient software supply chain.

## Security Hardening Techniques

Beyond the basics, there are additional techniques you can use to harden your Rust applications against attacks.

### Privilege Reduction

Reducing privileges helps contain potential security breaches:

```rust
#[cfg(unix)]
fn drop_privileges() -> Result<(), &'static str> {
    use nix::unistd::{setgid, setuid, Gid, Uid};

    // Create a non-privileged user/group if running as root
    if nix::unistd::geteuid().is_root() {
        // Switch to nobody user/group
        let nobody_uid = Uid::from_raw(65534);  // nobody
        let nobody_gid = Gid::from_raw(65534);  // nobody

        // First drop group privileges
        setgid(nobody_gid).map_err(|_| "Failed to drop group privileges")?;

        // Then drop user privileges
        setuid(nobody_uid).map_err(|_| "Failed to drop user privileges")?;

        println!("Dropped privileges to nobody");
    }

    Ok(())
}

// Call this early in your program
fn main() {
    // Initialize the program

    // Drop privileges if running as root
    #[cfg(unix)]
    if let Err(e) = drop_privileges() {
        eprintln!("Warning: {}", e);
    }

    // Continue with normal operation
}
```

### Seccomp Filters (Linux)

On Linux, seccomp filters can restrict system calls:

```rust
use seccompiler::{BpfProgram, SeccompAction, SeccompFilter};

fn apply_seccomp_filter() -> Result<(), Box<dyn std::error::Error>> {
    // Define allowed syscalls
    let filter = SeccompFilter::new(
        vec![
            // Allow basic I/O
            "read", "write", "open", "close",
            // Allow memory management
            "mmap", "munmap", "brk",
            // Allow thread operations
            "futex", "sched_yield",
            // Add other necessary syscalls...
        ]
        .into_iter()
        .map(String::from)
        .collect(),
        SeccompAction::Trap, // Kill the process on violation
        SeccompAction::Allow, // Allow matched syscalls
    )?;

    // Compile the filter
    let prog: BpfProgram = filter.try_into()?;

    // Apply the filter
    seccompiler::apply_filter(&prog)?;

    Ok(())
}
```

### Defensive Memory Handling

Implement additional defenses for sensitive memory:

```rust
use std::alloc::{alloc, dealloc, Layout};
use std::ptr;
use std::sync::atomic::{AtomicBool, Ordering};

struct SecretMemory {
    ptr: *mut u8,
    size: usize,
    layout: Layout,
    locked: AtomicBool,
}

impl SecretMemory {
    pub fn new(size: usize) -> Self {
        let layout = Layout::from_size_align(size, 64)
            .expect("Invalid memory layout");

        let ptr = unsafe { alloc(layout) };
        if ptr.is_null() {
            std::alloc::handle_alloc_error(layout);
        }

        // Zero the memory
        unsafe {
            ptr::write_bytes(ptr, 0, size);
        }

        // Lock memory to prevent swapping
        #[cfg(unix)]
        unsafe {
            libc::mlock(ptr as *const libc::c_void, size);
        }

        SecretMemory {
            ptr,
            size,
            layout,
            locked: AtomicBool::new(true),
        }
    }

    pub fn write(&mut self, data: &[u8]) {
        assert!(data.len() <= self.size, "Data too large for buffer");

        unsafe {
            ptr::copy_nonoverlapping(data.as_ptr(), self.ptr, data.len());
        }
    }

    pub fn read(&self, buf: &mut [u8]) {
        let len = std::cmp::min(buf.len(), self.size);

        unsafe {
            ptr::copy_nonoverlapping(self.ptr, buf.as_mut_ptr(), len);
        }
    }

    pub fn clear(&mut self) {
        unsafe {
            ptr::write_bytes(self.ptr, 0, self.size);
        }
    }
}

impl Drop for SecretMemory {
    fn drop(&mut self) {
        // Clear memory before freeing
        self.clear();

        // Unlock if locked
        if self.locked.load(Ordering::Acquire) {
            #[cfg(unix)]
            unsafe {
                libc::munlock(self.ptr as *const libc::c_void, self.size);
            }
        }

        // Free memory
        unsafe {
            dealloc(self.ptr, self.layout);
        }
    }
}
```

### Security Headers for Web Applications

When building web applications, use appropriate security headers:

```rust
use actix_web::{web, App, HttpServer, Responder, HttpResponse};
use actix_web::middleware::DefaultHeaders;

async fn index() -> impl Responder {
    HttpResponse::Ok().body("Secure application")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            // Add security headers
            .wrap(
                DefaultHeaders::new()
                    // Prevent XSS attacks
                    .add(("Content-Security-Policy", "default-src 'self'"))
                    // Prevent clickjacking
                    .add(("X-Frame-Options", "DENY"))
                    // Prevent MIME type sniffing
                    .add(("X-Content-Type-Options", "nosniff"))
                    // Enable browser XSS protection
                    .add(("X-XSS-Protection", "1; mode=block"))
                    // Enforce HTTPS
                    .add(("Strict-Transport-Security", "max-age=31536000; includeSubDomains"))
                    // Restrict referrer information
                    .add(("Referrer-Policy", "strict-origin-when-cross-origin"))
                    // Control permitted features
                    .add(("Permissions-Policy", "camera=(), microphone=(), geolocation=()"))
            )
            .service(web::resource("/").to(index))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

### Secure Default Configuration

Always provide secure defaults for your applications:

```rust
// Configuration with secure defaults
#[derive(Debug, Clone)]
struct SecurityConfig {
    // Authentication settings
    enable_auth: bool,
    min_password_length: usize,
    require_mfa: bool,

    // TLS settings
    tls_min_version: String,
    hsts_enabled: bool,

    // Request limits
    max_request_size: usize,
    request_timeout_ms: u64,

    // Other security settings
    enable_rate_limiting: bool,
    enable_csrf_protection: bool,
}

impl Default for SecurityConfig {
    fn default() -> Self {
        SecurityConfig {
            // Secure defaults for authentication
            enable_auth: true,
            min_password_length: 12,
            require_mfa: true,

            // Secure defaults for TLS
            tls_min_version: "TLSv1.3".to_string(),
            hsts_enabled: true,

            // Secure defaults for request limits
            max_request_size: 1024 * 1024, // 1 MB
            request_timeout_ms: 5000, // 5 seconds

            // Other secure defaults
            enable_rate_limiting: true,
            enable_csrf_protection: true,
        }
    }
}

// Usage:
fn main() {
    // Use secure defaults if no config is provided
    let config = SecurityConfig::default();

    // Initialize application with secure configuration
    initialize_app(config);
}

fn initialize_app(config: SecurityConfig) {
    // Application initialization using secure config
    println!("Initializing with security config: {:?}", config);
}
```

By implementing these hardening techniques, you can build Rust applications that are resilient against a wide range of attacks and security vulnerabilities.

## Conclusion

Throughout this chapter, we've explored how Rust's inherent security features provide a strong foundation for building secure applications. Rust's memory safety guarantees, ownership model, and type system eliminate entire classes of vulnerabilities that continue to plague applications written in other languages.

However, we've also seen that security requires more than just language features. Building truly secure applications demands deliberate attention to security at every stage of development, from design and implementation to testing and deployment.

The security patterns we've covered provide a toolkit for addressing various security concerns:

1. **Secure coding patterns**: Techniques for handling untrusted input, managing resources safely, and implementing secure defaults
2. **Cryptography best practices**: Guidelines for using cryptographic libraries correctly and managing keys securely
3. **Security auditing techniques**: Methods for reviewing code, using static and dynamic analysis tools, and documenting findings
4. **Supply chain security**: Strategies for managing dependencies securely and protecting against supply chain attacks
5. **Security hardening techniques**: Additional measures to strengthen your applications against attacks

Remember that security is not a one-time effort but a continuous process. Threats evolve, new vulnerabilities are discovered, and best practices change over time. Maintaining secure Rust applications requires ongoing vigilance, regular security reviews, and staying informed about developments in the security landscape.

By combining Rust's inherent security advantages with the patterns and practices we've discussed, you can build applications that not only perform well and reliably but also resist the increasingly sophisticated security threats faced by modern software.

## Exercises

1. **Input Validation**: Implement a validation module for a REST API that handles common input types (email addresses, usernames, etc.) using the newtype pattern for type safety.

2. **Secure Configuration**: Create a configuration system with secure defaults that allows overriding settings via environment variables or a configuration file, with validation to prevent insecure configurations.

3. **Cryptography**: Implement a module for securely storing user credentials, including password hashing with Argon2 and proper key management.

4. **Dependency Audit**: Audit the dependencies of an existing Rust project, identifying security issues and proposing remediation steps.

5. **Security Testing**: Set up a CI pipeline for a Rust project that includes automated security checks using cargo-audit, clippy, and cargo-geiger.

6. **Code Review**: Perform a security code review of a small Rust application, documenting findings and recommendations using the audit report template from this chapter.

7. **Secure API**: Design and implement a REST API with comprehensive security controls, including authentication, authorization, rate limiting, and input validation.

8. **Fuzzing**: Write a fuzzer for a parser or data processing function, and fix any issues discovered through fuzzing.

9. **Supply Chain Security**: Implement a dependency management strategy for a Rust project that includes pinning versions, minimizing dependencies, and continuous monitoring.

10. **Security Hardening**: Add security hardening to an existing Rust application, including secure headers, privilege reduction, and secure default configurations.

By completing these exercises, you'll gain practical experience applying the security patterns and principles covered in this chapter to real-world Rust applications.
