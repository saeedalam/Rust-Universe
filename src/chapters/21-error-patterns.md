# Chapter 21: Error Handling Patterns and Libraries

## Introduction

In the previous chapter, we explored the foundations of Rust's error handling system using `Result` and `Option` types. We learned how to propagate errors, transform them, and build robust error handling flows. While these fundamentals are powerful on their own, real-world applications often require more sophisticated error handling patterns and tooling.

This chapter takes our error handling skills to the next level by exploring advanced patterns, ecosystem libraries, and best practices for managing errors in complex applications. We'll learn how to create rich, domain-specific error types, add context to errors for better diagnostics, handle errors in asynchronous code, and design user-friendly error reporting systems.

By the end of this chapter, you'll have a comprehensive toolkit for handling errors in even the most demanding Rust applications. You'll understand when to use different error handling approaches, how to leverage popular error handling libraries, and how to design error systems that scale with your application's complexity.

## Creating Custom Error Types

In the previous chapter, we created basic custom error types. Now, let's explore more advanced patterns for designing error types that scale with your application's complexity.

### Domain-Specific Error Types

As your application grows, it's beneficial to create domain-specific error types that express the precise failure modes of each subsystem:

```rust
// Authentication domain errors
#[derive(Debug)]
pub enum AuthError {
    InvalidCredentials,
    ExpiredToken { expired_at: DateTime<Utc> },
    InsufficientPermissions { required: Vec<Permission>, actual: Vec<Permission> },
    RateLimited { retry_after: Duration },
    ServiceUnavailable,
}

// Database domain errors
#[derive(Debug)]
pub enum DbError {
    ConnectionFailed { url: String, cause: Box<dyn Error + Send + Sync> },
    QueryFailed { query: String, cause: Box<dyn Error + Send + Sync> },
    TransactionFailed { cause: Box<dyn Error + Send + Sync> },
    RecordNotFound { entity: String, id: String },
    UniqueConstraintViolation { field: String, value: String },
    // Other database-specific errors...
}
```

This approach allows consumers of your API to handle specific error conditions precisely while still having a clear categorization of errors.

### Composing Error Types

For larger applications, you'll often want to combine multiple domain-specific error types into a unified application error. There are several patterns for this:

#### Enum Variants Pattern

```rust
#[derive(Debug)]
pub enum AppError {
    Auth(AuthError),
    Database(DbError),
    Api(ApiError),
    Validation(ValidationError),
    // Other subsystem errors...
}

// Implementing From for each error type
impl From<AuthError> for AppError {
    fn from(error: AuthError) -> Self {
        AppError::Auth(error)
    }
}

impl From<DbError> for AppError {
    fn from(error: DbError) -> Self {
        AppError::Database(error)
    }
}

// And so on for other error types...
```

This pattern is explicit but requires updating the enum when adding new error types.

#### Error Box Pattern

For more flexibility, especially in library code:

```rust
pub struct AppError {
    source: Box<dyn Error + Send + Sync>,
    context: Option<String>,
    // You can add more metadata like error codes, severity, etc.
}

impl AppError {
    pub fn new<E>(error: E) -> Self
    where
        E: Error + Send + Sync + 'static
    {
        Self {
            source: Box::new(error),
            context: None,
        }
    }

    pub fn with_context<E, S>(error: E, context: S) -> Self
    where
        E: Error + Send + Sync + 'static,
        S: Into<String>
    {
        Self {
            source: Box::new(error),
            context: Some(context.into()),
        }
    }
}

// Then you can wrap any error
let app_error = AppError::new(DbError::ConnectionFailed {
    url: "postgres://...".to_string(),
    cause: Box::new(std::io::Error::new(std::io::ErrorKind::ConnectionRefused, "Connection refused"))
});
```

This pattern is more flexible but loses some type information.

### Error Type Design Principles

When designing custom error types, follow these principles:

1. **Expressiveness**: Error types should clearly communicate what went wrong.
2. **Context**: Include enough information to diagnose and potentially fix the error.
3. **Privacy**: Be careful not to leak sensitive information in error messages.
4. **Ergonomics**: Make error types easy to create, transform, and handle.
5. **Stability**: Consider the impact on your API when evolving error types.

Here's an example that balances these principles:

```rust
#[derive(Debug, Clone)]
pub enum PaymentError {
    InsufficientFunds {
        account_id: String,
        available: Money,
        required: Money,
    },
    CardDeclined {
        code: String,
        message: String,
        retry_possible: bool,
    },
    // Redact sensitive data
    InvalidCardDetails {
        // Don't include the actual card details in the error!
        field: String, // e.g., "expiration_date", "cvv"
    },
    PaymentProviderError {
        provider: String,
        status_code: u16,
        // Store full error for logging but don't expose in Display
        #[doc(hidden)]
        raw_error: String,
    },
    // ...
}

// User-facing error messages
impl std::fmt::Display for PaymentError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InsufficientFunds { available, required, .. } => {
                write!(f, "Insufficient funds. Available: {}, Required: {}", available, required)
            }
            Self::CardDeclined { message, retry_possible, .. } => {
                if *retry_possible {
                    write!(f, "Card declined: {}. Please try again.", message)
                } else {
                    write!(f, "Card declined: {}. Please use a different payment method.", message)
                }
            }
            Self::InvalidCardDetails { field } => {
                write!(f, "Invalid card details: {}", field)
            }
            Self::PaymentProviderError { provider, status_code, .. } => {
                write!(f, "Payment service error: {} returned status {}", provider, status_code)
            }
        }
    }
}
```

Notice how this design provides detailed information for debugging while presenting appropriate messages to end users.

## Using thiserror and anyhow Crates

While Rust's standard library provides the basic building blocks for error handling, the ecosystem offers several libraries that make error handling more ergonomic. Two of the most popular are `thiserror` and `anyhow`.

### The thiserror Crate

The `thiserror` crate simplifies implementing the `Error` trait and related functionality through derive macros. It's ideal for libraries or applications with well-defined error types.

To use it, add to your `Cargo.toml`:

```toml
[dependencies]
thiserror = "1.0"
```

#### Basic Usage

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DataStoreError {
    #[error("data store disconnected")]
    Disconnect(#[from] std::io::Error),

    #[error("the data for key `{0}` is not available")]
    Redaction(String),

    #[error("invalid header (expected {expected:?}, found {found:?})")]
    InvalidHeader {
        expected: String,
        found: String,
    },

    #[error("unknown data store error")]
    Unknown,
}
```

The `#[error("...")]` attribute defines the `Display` implementation, and the `#[from]` attribute generates `From` implementations for automatic error conversion.

#### Advanced thiserror Features

`thiserror` supports several advanced features:

1. **Source errors**: Use the `#[source]` attribute to indicate the underlying cause:

```rust
#[derive(Error, Debug)]
pub enum ApiError {
    #[error("request failed")]
    RequestFailed {
        #[source]
        source: reqwest::Error,
        url: String,
    },
}
```

2. **Format specifiers**: Use format specifiers in error messages:

```rust
#[derive(Error, Debug)]
pub enum ValidationError {
    #[error("invalid value for field {field}: {message}")]
    InvalidField {
        field: String,
        message: String,
    },

    #[error("missing required fields: {0:?}")]
    MissingFields(Vec<String>),
}
```

3. **Transparent errors**: Pass through an inner error's `Display` and `source` implementations:

```rust
#[derive(Error, Debug)]
pub enum DatabaseError {
    #[error(transparent)]
    Sql(#[from] sqlx::Error),

    // Other database errors...
}
```

### The anyhow Crate

While `thiserror` is ideal for library code with well-defined error types, `anyhow` provides a simpler approach for application code where you care more about context and error messages than the specific error types.

To use it, add to your `Cargo.toml`:

```toml
[dependencies]
anyhow = "1.0"
```

#### Basic Usage

```rust
use anyhow::{Result, Context, anyhow};

fn read_config(path: &str) -> Result<Config> {
    // anyhow::Result<T> is a type alias for Result<T, anyhow::Error>
    let content = std::fs::read_to_string(path)
        .context(format!("Failed to read config file: {}", path))?;

    let config = serde_json::from_str(&content)
        .context("Failed to parse config file as JSON")?;

    Ok(config)
}

fn main() -> Result<()> {
    let config = read_config("config.json")?;

    // Create errors directly with the anyhow! macro
    if !config.is_valid() {
        return Err(anyhow!("Invalid configuration"));
    }

    Ok(())
}
```

The key feature of `anyhow` is the ability to add context to errors with the `.context()` method, which wraps the error and adds a message that explains what was happening when the error occurred.

#### Advanced anyhow Features

1. **Backtrace capture**: `anyhow` can capture backtraces for errors:

```rust
use anyhow::Result;

// Enable backtraces with RUST_BACKTRACE=1 or RUST_LIB_BACKTRACE=1
fn main() -> Result<()> {
    // This will include a backtrace when printed
    Err(anyhow::anyhow!("Something went wrong"))
}
```

2. **Downcast errors**: Recover the original error type when needed:

```rust
use anyhow::{Result, anyhow};
use std::io;

fn may_fail() -> Result<()> {
    Err(io::Error::new(io::ErrorKind::NotFound, "File not found").into())
}

fn main() -> Result<()> {
    let err = may_fail().unwrap_err();

    // Downcast to the original error type
    if let Some(io_err) = err.downcast_ref::<io::Error>() {
        if io_err.kind() == io::ErrorKind::NotFound {
            println!("File not found, creating default");
            return Ok(());
        }
    }

    // Re-throw the error if it wasn't handled
    Err(err)
}
```

3. **Custom error reporting**: Format errors for different audiences:

```rust
use anyhow::{Result, Context};

fn process_data() -> Result<()> {
    // Processing logic...
    Err(anyhow::anyhow!("Processing failed"))
        .context("Failed to process user data")
}

fn main() {
    match process_data() {
        Ok(()) => println!("Success!"),
        Err(e) => {
            // For end users
            println!("Error: {}", e);

            // For developers (with full chain)
            eprintln!("Error details: {:#}", e);

            // With backtrace if available
            eprintln!("Full error: {:?}", e);
        }
    }
}
```

### Combining thiserror and anyhow

A common pattern is to use `thiserror` for your library's public error types and `anyhow` for internal error handling:

```rust
// In your library code
use thiserror::Error;

#[derive(Error, Debug)]
pub enum LibraryError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Configuration error: {0}")]
    Config(String),

    // Other error variants...
}

// In your application code
use anyhow::Result;

fn use_library() -> Result<()> {
    // Use anyhow within your application
    my_library::do_something()
        .context("Failed while using my_library")?;

    Ok(())
}
```

This approach gives you the best of both worlds: well-defined error types for your public API and flexible error handling with rich context for your application code.

## Context for Errors

Adding context to errors is essential for creating meaningful, actionable error messages. Let's explore strategies for enriching errors with context.

### Why Context Matters

Error context helps answer questions like:

1. What operation was being attempted when the error occurred?
2. What inputs or resources were involved?
3. Where in the code did the error originate?
4. What might the user do to fix the problem?

### Adding Context with anyhow

The `anyhow` crate provides a simple way to add context:

```rust
use anyhow::{Context, Result};
use std::fs;
use std::path::Path;

fn read_config(path: &Path) -> Result<Config> {
    let content = fs::read_to_string(path)
        .with_context(|| format!("Failed to read config file at {}", path.display()))?;

    let config = serde_json::from_str(&content)
        .with_context(|| format!("Failed to parse config file at {}", path.display()))?;

    Ok(config)
}
```

The `.with_context()` method accepts a closure that only gets evaluated if an error occurs, which is more efficient than constructing the context string every time.

### Custom Context with thiserror

With `thiserror`, you can build context into your error types:

```rust
use thiserror::Error;
use std::path::PathBuf;

#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("Failed to read config file at {path}")]
    ReadError {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("Failed to parse config file at {path}")]
    ParseError {
        path: PathBuf,
        #[source]
        source: serde_json::Error,
    },
}

fn read_config(path: &Path) -> Result<Config, ConfigError> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| ConfigError::ReadError {
            path: path.to_path_buf(),
            source: e
        })?;

    let config = serde_json::from_str(&content)
        .map_err(|e| ConfigError::ParseError {
            path: path.to_path_buf(),
            source: e
        })?;

    Ok(config)
}
```

### Context Chains

For deeper context chains, combine multiple layers of context:

```rust
use anyhow::{Context, Result};

fn main() -> Result<()> {
    process_data()
        .context("Failed to process user data")?;
    Ok(())
}

fn process_data() -> Result<()> {
    read_user_file()
        .context("Error while reading user data")?;
    Ok(())
}

fn read_user_file() -> Result<String> {
    std::fs::read_to_string("users.json")
        .context("Could not read users.json file")
}
```

When an error occurs, the resulting error message would include the full context chain:

```
Failed to process user data: Error while reading user data: Could not read users.json file: No such file or directory (os error 2)
```

### Contextual Error Builder Pattern

For more complex cases, a builder pattern can help construct rich error contexts:

```rust
use std::error::Error;
use std::fmt;

pub struct ErrorContext {
    message: String,
    source: Option<Box<dyn Error + Send + Sync>>,
    user_id: Option<String>,
    request_id: Option<String>,
    operation: Option<String>,
    severity: Severity,
}

#[derive(Debug, Clone, Copy)]
pub enum Severity {
    Info,
    Warning,
    Error,
    Critical,
}

impl ErrorContext {
    pub fn new<S: Into<String>>(message: S) -> Self {
        Self {
            message: message.into(),
            source: None,
            user_id: None,
            request_id: None,
            operation: None,
            severity: Severity::Error,
        }
    }

    pub fn with_source<E: Error + Send + Sync + 'static>(mut self, source: E) -> Self {
        self.source = Some(Box::new(source));
        self
    }

    pub fn with_user_id<S: Into<String>>(mut self, user_id: S) -> Self {
        self.user_id = Some(user_id.into());
        self
    }

    pub fn with_request_id<S: Into<String>>(mut self, request_id: S) -> Self {
        self.request_id = Some(request_id.into());
        self
    }

    pub fn with_operation<S: Into<String>>(mut self, operation: S) -> Self {
        self.operation = Some(operation.into());
        self
    }

    pub fn with_severity(mut self, severity: Severity) -> Self {
        self.severity = severity;
        self
    }
}

impl fmt::Display for ErrorContext {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)?;

        if let Some(op) = &self.operation {
            write!(f, " [operation: {}]", op)?;
        }

        if let Some(req_id) = &self.request_id {
            write!(f, " [request-id: {}]", req_id)?;
        }

        Ok(())
    }
}

impl fmt::Debug for ErrorContext {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let mut debug = f.debug_struct("ErrorContext");

        debug.field("message", &self.message);
        debug.field("severity", &self.severity);

        if let Some(source) = &self.source {
            debug.field("source", source);
        }

        if let Some(user_id) = &self.user_id {
            debug.field("user_id", user_id);
        }

        if let Some(request_id) = &self.request_id {
            debug.field("request_id", request_id);
        }

        if let Some(operation) = &self.operation {
            debug.field("operation", operation);
        }

        debug.finish()
    }
}

impl Error for ErrorContext {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        self.source.as_ref().map(|s| s.as_ref() as &(dyn Error + 'static))
    }
}

// Usage
fn process_request(request_id: &str, user_id: &str) -> Result<(), ErrorContext> {
    let result = std::fs::read_to_string("config.json");

    if let Err(e) = result {
        return Err(ErrorContext::new("Failed to process request")
            .with_source(e)
            .with_request_id(request_id)
            .with_user_id(user_id)
            .with_operation("read_config")
            .with_severity(Severity::Error));
    }

    Ok(())
}
```

This pattern allows you to build rich, structured error contexts that can be used for both user-facing messages and detailed logging.

## Error Hierarchies

As applications grow in complexity, error types often naturally form hierarchies. Managing these hierarchies effectively can significantly improve your error handling.

### Nested Error Types

One approach is to organize errors into nested types that reflect your application's structure:

```rust
// Top-level application error
#[derive(Debug, Error)]
pub enum AppError {
    #[error("API error: {0}")]
    Api(#[from] ApiError),

    #[error("Database error: {0}")]
    Database(#[from] DbError),

    #[error("Authentication error: {0}")]
    Auth(#[from] AuthError),

    #[error("Unexpected error: {0}")]
    Other(String),
}

// API subsystem errors
#[derive(Debug, Error)]
pub enum ApiError {
    #[error("Rate limit exceeded, retry after {retry_after} seconds")]
    RateLimited { retry_after: u64 },

    #[error("Resource not found: {resource}")]
    NotFound { resource: String },

    #[error("Invalid request: {0}")]
    InvalidRequest(#[from] ValidationError),

    #[error("Network error: {0}")]
    Network(#[from] NetworkError),
}

// Validation errors
#[derive(Debug, Error)]
pub enum ValidationError {
    #[error("Missing required field: {0}")]
    MissingField(String),

    #[error("Invalid value for {field}: {message}")]
    InvalidValue { field: String, message: String },

    #[error("Conflicting values between {field1} and {field2}")]
    ConflictingValues { field1: String, field2: String },
}

// And so on for other error types...
```

With this structure, errors naturally flow up the hierarchy while preserving their specific details.

### Error Categories and Error Codes

Another approach is to categorize errors and assign error codes:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorCategory {
    Validation,
    Authentication,
    Authorization,
    NotFound,
    Conflict,
    RateLimit,
    Internal,
    Dependency,
}

#[derive(Debug, Error)]
pub struct AppError {
    #[source]
    source: Option<Box<dyn Error + Send + Sync>>,
    message: String,
    category: ErrorCategory,
    code: String,
    user_fixable: bool,
}

impl AppError {
    pub fn new<S: Into<String>>(
        message: S,
        category: ErrorCategory,
        code: &str,
        user_fixable: bool,
    ) -> Self {
        Self {
            source: None,
            message: message.into(),
            category,
            code: code.to_string(),
            user_fixable,
        }
    }

    pub fn with_source<E: Error + Send + Sync + 'static>(mut self, source: E) -> Self {
        self.source = Some(Box::new(source));
        self
    }

    pub fn category(&self) -> ErrorCategory {
        self.category
    }

    pub fn code(&self) -> &str {
        &self.code
    }

    pub fn is_user_fixable(&self) -> bool {
        self.user_fixable
    }
}

impl Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)
    }
}

// Helper functions to create specific errors
impl AppError {
    pub fn validation<S: Into<String>>(message: S, code: &str) -> Self {
        Self::new(message, ErrorCategory::Validation, code, true)
    }

    pub fn authentication<S: Into<String>>(message: S, code: &str) -> Self {
        Self::new(message, ErrorCategory::Authentication, code, true)
    }

    pub fn not_found<S: Into<String>>(message: S, code: &str) -> Self {
        Self::new(message, ErrorCategory::NotFound, code, false)
    }

    // More helper methods...
}

// Usage
fn validate_user(user: &User) -> Result<(), AppError> {
    if user.name.is_empty() {
        return Err(AppError::validation(
            "User name cannot be empty",
            "VAL001",
        ));
    }

    if user.email.is_empty() {
        return Err(AppError::validation(
            "User email cannot be empty",
            "VAL002",
        ));
    }

    Ok(())
}
```

This approach allows for consistent error reporting and makes it easier to document error codes for API consumers.

### Error Type Conversion in Hierarchies

As errors travel up through your application layers, you often need to convert between error types. Here are some patterns for handling this:

#### Using the From Trait

The most common approach is to implement `From` for conversions:

```rust
impl From<reqwest::Error> for ApiError {
    fn from(error: reqwest::Error) -> Self {
        if error.is_timeout() {
            ApiError::Network(NetworkError::Timeout {
                duration: std::time::Duration::from_secs(30),
            })
        } else if error.is_connect() {
            ApiError::Network(NetworkError::ConnectionFailed {
                url: error.url().map(|u| u.to_string()),
            })
        } else {
            ApiError::Network(NetworkError::Other(error.to_string()))
        }
    }
}

impl From<ApiError> for AppError {
    fn from(error: ApiError) -> Self {
        AppError::Api(error)
    }
}
```

#### Using Error Mapping Functions

For more control over error conversion, define mapping functions:

```rust
fn map_io_error(error: std::io::Error, path: &Path) -> ConfigError {
    match error.kind() {
        std::io::ErrorKind::NotFound => ConfigError::FileNotFound {
            path: path.to_path_buf(),
        },
        std::io::ErrorKind::PermissionDenied => ConfigError::AccessDenied {
            path: path.to_path_buf(),
        },
        _ => ConfigError::IoError {
            path: path.to_path_buf(),
            source: error,
        },
    }
}

fn read_config(path: &Path) -> Result<Config, ConfigError> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| map_io_error(e, path))?;

    // Continue processing...
    Ok(Config::default())
}
```

### Interface-Based Error Hierarchies

For more flexible error hierarchies, especially in large applications, you can use traits to define error interfaces:

```rust
pub trait AppErrorTrait: Error + Send + Sync + 'static {
    fn error_code(&self) -> &str;
    fn http_status(&self) -> u16;
    fn is_retriable(&self) -> bool;
    // Other error properties...
}

// Implement for specific error types
impl AppErrorTrait for ValidationError {
    fn error_code(&self) -> &str {
        match self {
            Self::MissingField(_) => "VAL001",
            Self::InvalidValue { .. } => "VAL002",
            Self::ConflictingValues { .. } => "VAL003",
        }
    }

    fn http_status(&self) -> u16 {
        400 // Bad Request
    }

    fn is_retriable(&self) -> bool {
        false // Validation errors can't be resolved by retrying
    }
}

// Use trait objects for flexibility
type BoxedAppError = Box<dyn AppErrorTrait>;

fn process_request() -> Result<(), BoxedAppError> {
    // Processing...
    Err(Box::new(ValidationError::MissingField("name".to_string())))
}

// Handle errors based on their traits
fn handle_error(error: &dyn AppErrorTrait) {
    println!("Error code: {}", error.error_code());
    println!("HTTP status: {}", error.http_status());
    println!("Can retry: {}", error.is_retriable());
}
```

This approach provides a uniform interface for errors while allowing for a diverse set of concrete error types.

## Fallible Iterators

When working with collections, it's common to encounter operations that might fail for some elements. Rust provides several patterns for handling fallible operations on iterators.

### Collecting Results

The simplest approach is to collect results into a `Vec<Result<T, E>>`:

```rust
fn process_items<T>(items: &[T]) -> Vec<Result<ProcessedItem, ProcessError>>
where
    T: Process,
{
    items.iter().map(|item| item.process()).collect()
}
```

This preserves all results, both successes and failures.

### Filtering Successful Results

If you only care about successful results, you can filter out errors:

```rust
fn process_successful_items<T>(items: &[T]) -> Vec<ProcessedItem>
where
    T: Process,
{
    items
        .iter()
        .filter_map(|item| item.process().ok())
        .collect()
}
```

The `filter_map` method combines mapping and filtering, keeping only the `Some` values.

### Early Return on First Error

If you want to fail if any item fails, you can use `collect` with `Result`:

```rust
fn process_all_items<T>(items: &[T]) -> Result<Vec<ProcessedItem>, ProcessError>
where
    T: Process,
{
    items.iter().map(|item| item.process()).collect()
}
```

This works because `Result` implements `FromIterator<Result<T, E>>` in a way that returns `Ok(Vec<T>)` if all items are `Ok`, or the first `Err` encountered.

### Partition Results

If you need to separate successes and failures, use `partition`:

```rust
fn partition_results<T>(items: &[T]) -> (Vec<ProcessedItem>, Vec<ProcessError>)
where
    T: Process,
{
    let results: Vec<Result<ProcessedItem, ProcessError>> =
        items.iter().map(|item| item.process()).collect();

    let (successes, failures): (Vec<_>, Vec<_>) = results.into_iter().partition(Result::is_ok);

    let successes = successes.into_iter().map(Result::unwrap).collect();
    let failures = failures.into_iter().map(Result::unwrap_err).collect();

    (successes, failures)
}
```

### Using Specialized Crates

Several crates provide more powerful fallible iterator tools:

#### The `fallible-iterator` Crate

The `fallible-iterator` crate provides a trait for iterators where the iteration itself might fail:

```rust
use fallible_iterator::{FallibleIterator, convert};

fn process_items<T>(items: &[T]) -> Result<Vec<ProcessedItem>, ProcessError>
where
    T: Process,
{
    // Convert regular iterator to fallible iterator
    let iter = convert(items.iter().map(|item| item.process()));

    // Collect all results, returning an error if any operation fails
    iter.collect()
}
```

#### The `itertools` Crate

The `itertools` crate provides additional utilities for working with iterators:

```rust
use itertools::Itertools;

fn summarize_results<T>(items: &[T]) -> Result<Summary, ProcessError>
where
    T: Process,
{
    // Process all items
    let results: Result<Vec<_>, _> = items
        .iter()
        .map(|item| item.process())
        .collect();

    // If successful, create a summary
    results.map(|processed| {
        let total = processed.len();
        let valid = processed.iter().filter(|p| p.is_valid()).count();

        Summary {
            total,
            valid,
            invalid: total - valid,
        }
    })
}
```

### Custom Fallible Iterator Implementation

For more complex cases, you might want to implement your own fallible iterator:

```rust
pub struct FallibleProcess<I, T, E>
where
    I: Iterator<Item = T>,
{
    inner: I,
    max_errors: usize,
    errors: Vec<E>,
}

impl<I, T, E> FallibleProcess<I, T, E>
where
    I: Iterator<Item = T>,
{
    pub fn new(iter: I, max_errors: usize) -> Self {
        Self {
            inner: iter,
            max_errors,
            errors: Vec::new(),
        }
    }

    pub fn process<F, R>(mut self, f: F) -> Result<Vec<R>, Vec<E>>
    where
        F: Fn(T) -> Result<R, E>,
    {
        let mut results = Vec::new();

        for item in self.inner {
            match f(item) {
                Ok(result) => results.push(result),
                Err(error) => {
                    self.errors.push(error);
                    if self.errors.len() >= self.max_errors {
                        return Err(self.errors);
                    }
                }
            }
        }

        if self.errors.is_empty() {
            Ok(results)
        } else {
            Err(self.errors)
        }
    }
}

// Usage
fn process_with_tolerance<T>(items: &[T], max_errors: usize) -> Result<Vec<ProcessedItem>, Vec<ProcessError>>
where
    T: Process,
{
    FallibleProcess::new(items.iter(), max_errors)
        .process(|item| item.process())
}
```

This custom implementation allows for a configurable error tolerance, collecting results until a maximum number of errors is reached.

## Collecting Multiple Errors

In many cases, especially with validation, you want to collect multiple errors rather than stopping at the first one. Let's explore patterns for collecting and reporting multiple errors.

### Using Vec<Error> for Multiple Errors

The simplest approach is to return a vector of errors:

```rust
fn validate_user(user: &User) -> Result<(), Vec<ValidationError>> {
    let mut errors = Vec::new();

    if user.name.is_empty() {
        errors.push(ValidationError::MissingField("name".to_string()));
    }

    if user.email.is_empty() {
        errors.push(ValidationError::MissingField("email".to_string()));
    } else if !is_valid_email(&user.email) {
        errors.push(ValidationError::InvalidValue {
            field: "email".to_string(),
            message: "Invalid email format".to_string(),
        });
    }

    if user.age < 18 {
        errors.push(ValidationError::InvalidValue {
            field: "age".to_string(),
            message: "Must be at least 18 years old".to_string(),
        });
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}
```

### Using Dedicated Error Collection Types

For more structured error collection, create a dedicated error collection type:

```rust
#[derive(Debug, Default)]
pub struct ValidationErrors {
    errors: HashMap<String, Vec<String>>,
}

impl ValidationErrors {
    pub fn new() -> Self {
        Self {
            errors: HashMap::new(),
        }
    }

    pub fn add<F, M>(&mut self, field: F, message: M)
    where
        F: Into<String>,
        M: Into<String>,
    {
        self.errors
            .entry(field.into())
            .or_insert_with(Vec::new)
            .push(message.into());
    }

    pub fn is_empty(&self) -> bool {
        self.errors.is_empty()
    }

    pub fn has_errors_for(&self, field: &str) -> bool {
        self.errors.get(field).map_or(false, |e| !e.is_empty())
    }

    pub fn errors_for(&self, field: &str) -> Option<&[String]> {
        self.errors.get(field).map(|e| e.as_slice())
    }
}

impl Error for ValidationErrors {}

impl fmt::Display for ValidationErrors {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "Validation errors:")?;

        for (field, errors) in &self.errors {
            for error in errors {
                writeln!(f, "  {}: {}", field, error)?;
            }
        }

        Ok(())
    }
}

// Usage
fn validate_user(user: &User) -> Result<(), ValidationErrors> {
    let mut errors = ValidationErrors::new();

    if user.name.is_empty() {
        errors.add("name", "Name cannot be empty");
    }

    if user.email.is_empty() {
        errors.add("email", "Email cannot be empty");
    } else if !is_valid_email(&user.email) {
        errors.add("email", "Invalid email format");
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}
```

### Using the `validator` Crate

The `validator` crate provides a robust framework for validating structs and collecting errors:

```rust
use validator::{Validate, ValidationError};

#[derive(Validate)]
struct User {
    #[validate(length(min = 1, message = "Name cannot be empty"))]
    name: String,

    #[validate(email(message = "Invalid email format"))]
    email: String,

    #[validate(range(min = 18, message = "Must be at least 18 years old"))]
    age: u8,
}

fn validate_user(user: &User) -> Result<(), validator::ValidationErrors> {
    user.validate()
}
```

### Error Aggregation Patterns

For more complex validation scenarios, you might want to aggregate errors from multiple sources:

```rust
#[derive(Debug, Default)]
pub struct AggregateError {
    errors: Vec<Box<dyn Error + Send + Sync>>,
}

impl AggregateError {
    pub fn new() -> Self {
        Self { errors: Vec::new() }
    }

    pub fn add<E>(&mut self, error: E)
    where
        E: Error + Send + Sync + 'static,
    {
        self.errors.push(Box::new(error));
    }

    pub fn extend<E>(&mut self, errors: Vec<E>)
    where
        E: Error + Send + Sync + 'static,
    {
        self.errors.extend(errors.into_iter().map(Box::new));
    }

    pub fn is_empty(&self) -> bool {
        self.errors.is_empty()
    }

    pub fn error_count(&self) -> usize {
        self.errors.len()
    }
}

impl Error for AggregateError {}

impl fmt::Display for AggregateError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "{} error(s) occurred:", self.errors.len())?;

        for (i, error) in self.errors.iter().enumerate() {
            writeln!(f, "Error {}: {}", i + 1, error)?;
        }

        Ok(())
    }
}

// Usage
fn validate_complex_data(data: &ComplexData) -> Result<(), AggregateError> {
    let mut aggregate = AggregateError::new();

    // Validate user information
    if let Err(errors) = validate_user(&data.user) {
        aggregate.add(errors);
    }

    // Validate payment information
    if let Err(errors) = validate_payment(&data.payment) {
        aggregate.add(errors);
    }

    // Validate all items in an order
    for (i, item) in data.items.iter().enumerate() {
        if let Err(errors) = validate_item(item) {
            let mut prefixed_errors = ValidationErrors::new();

            for (field, messages) in errors.errors {
                for message in messages {
                    prefixed_errors.add(format!("items[{}].{}", i, field), message);
                }
            }

            aggregate.add(prefixed_errors);
        }
    }

    if aggregate.is_empty() {
        Ok(())
    } else {
        Err(aggregate)
    }
}
```

This pattern allows you to collect errors from different validation steps and present them in a unified way.

## Error Logging and Reporting

Effective error handling isn't just about managing errors in your code—it's also about communicating those errors to users, operators, and developers. Let's explore patterns for logging and reporting errors in different contexts.

### Structured Error Logging

For effective troubleshooting, errors should be logged with structured data:

```rust
use log::{error, warn, info};
use serde_json::json;
use uuid::Uuid;

fn log_error(err: &dyn Error, request_id: &str) {
    // Create structured log entry
    let log_data = json!({
        "request_id": request_id,
        "error_type": std::any::type_name_of_val(err),
        "message": err.to_string(),
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "source_chain": build_error_chain(err),
    });

    error!("{}", serde_json::to_string(&log_data).unwrap());
}

fn build_error_chain(err: &dyn Error) -> Vec<String> {
    let mut chain = vec![err.to_string()];
    let mut source = err.source();

    while let Some(err) = source {
        chain.push(err.to_string());
        source = err.source();
    }

    chain
}
```

When combined with a structured logging system like `slog` or `tracing`, this approach provides rich error information that can be analyzed and searched.

### Different Levels of Error Detail

Different audiences need different levels of error detail:

```rust
enum ErrorAudience {
    EndUser,
    Administrator,
    Developer,
}

fn format_error_for_audience(err: &AppError, audience: ErrorAudience) -> String {
    match audience {
        // End users get simplified, actionable messages
        ErrorAudience::EndUser => match err {
            AppError::Auth(_) => "Authentication failed. Please check your credentials and try again.".into(),
            AppError::Database(_) => "A system error occurred. Please try again later.".into(),
            AppError::Validation(v) => format!("Invalid input: {}", v),
            _ => "An unexpected error occurred. Please try again later.".into(),
        },

        // Administrators get more operational details
        ErrorAudience::Administrator => {
            let mut message = format!("[{}] {}", err.error_code(), err);

            if let Some(retry_after) = err.retry_after() {
                message.push_str(&format!(" (retry after {} seconds)", retry_after.as_secs()));
            }

            message
        },

        // Developers get full technical details
        ErrorAudience::Developer => {
            let mut message = format!("{:#?}", err);

            if let Some(source) = err.source() {
                message.push_str("\n\nCaused by:\n");
                message.push_str(&format_error_chain(source));
            }

            message
        },
    }
}

fn format_error_chain(err: &dyn Error) -> String {
    let mut message = format!("- {}", err);
    let mut source = err.source();
    let mut indent = 2;

    while let Some(err) = source {
        message.push_str(&format!("\n{:indent$}- {}", "", err, indent = indent));
        source = err.source();
        indent += 2;
    }

    message
}
```

### Contextual Error Information

Errors are more useful when they include context about what was happening when they occurred:

```rust
struct RequestContext {
    request_id: String,
    user_id: Option<String>,
    ip_address: String,
    start_time: std::time::Instant,
    trace_id: String,
}

fn handle_request(req: Request, ctx: &RequestContext) -> Result<Response, AppError> {
    // Process request...
    let result = process_user_data(&req.user_id).map_err(|e| {
        // Log detailed error with context
        log_error_with_context(&e, ctx);

        // Return appropriate error to caller
        AppError::from(e)
    })?;

    Ok(Response::ok(result))
}

fn log_error_with_context(err: &dyn Error, ctx: &RequestContext) {
    let elapsed = ctx.start_time.elapsed();

    let log_entry = json!({
        "error": err.to_string(),
        "error_type": std::any::type_name_of_val(err),
        "request_id": ctx.request_id,
        "trace_id": ctx.trace_id,
        "user_id": ctx.user_id,
        "ip_address": ctx.ip_address,
        "elapsed_ms": elapsed.as_millis(),
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });

    error!("{}", serde_json::to_string(&log_entry).unwrap());
}
```

### Distributed Tracing

For microservice architectures, distributed tracing is essential for tracking errors across service boundaries:

```rust
use opentelemetry::{global, trace::{Span, Tracer}};
use opentelemetry_jaeger::new_pipeline;

fn init_tracer() -> Result<(), Box<dyn Error>> {
    let exporter = new_pipeline()
        .with_service_name("my-service")
        .install_simple()?;

    global::set_tracer_provider(exporter);
    Ok(())
}

fn process_with_tracing() -> Result<(), AppError> {
    let tracer = global::tracer("my-service");
    let mut span = tracer.start("process_data");

    // Record information in the span
    span.set_attribute(opentelemetry::Key::new("user.id").string("user-123"));

    match process_data() {
        Ok(result) => {
            span.set_attribute(opentelemetry::Key::new("result.size").i64(result.len() as i64));
            span.end();
            Ok(())
        }
        Err(e) => {
            // Record error in the span
            span.record_error(&e);
            span.set_status(opentelemetry::trace::Status::error(e.to_string()));
            span.end();
            Err(e)
        }
    }
}
```

### Error Reporting Services

For production applications, integrating with error reporting services like Sentry can provide valuable insights:

```rust
use sentry::{capture_error, configure_scope};

fn main() -> Result<(), Box<dyn Error>> {
    let _guard = sentry::init(("https://your-sentry-dsn", sentry::ClientOptions {
        release: sentry::release_name!(),
        ..Default::default()
    }));

    if let Err(e) = run() {
        // Capture error in Sentry
        with_error_context(&e, |e| {
            capture_error(e);
        });

        // Also log locally
        eprintln!("Error: {}", e);
        return Err(e.into());
    }

    Ok(())
}

fn with_error_context<E: Error, F>(error: &E, f: F)
where
    F: FnOnce(&E),
{
    configure_scope(|scope| {
        // Add contextual information
        scope.set_tag("environment", std::env::var("ENVIRONMENT").unwrap_or_else(|_| "development".into()));
        scope.set_user(Some(sentry::User {
            id: Some(get_current_user_id().unwrap_or_else(|| "anonymous".into())),
            ..Default::default()
        }));
    });

    f(error);
}
```

### Error Metrics and Monitoring

Track error rates and patterns with metrics:

```rust
use prometheus::{register_int_counter_vec, IntCounterVec};
use lazy_static::lazy_static;

lazy_static! {
    static ref ERROR_COUNTER: IntCounterVec = register_int_counter_vec!(
        "app_errors_total",
        "Total number of errors by type and code",
        &["error_type", "error_code"]
    )
    .unwrap();
}

fn track_error(err: &AppError) {
    // Increment error counter with labels
    ERROR_COUNTER
        .with_label_values(&[
            std::any::type_name_of_val(err),
            err.error_code(),
        ])
        .inc();
}

fn handle_request(req: Request) -> Result<Response, AppError> {
    match process_request(req) {
        Ok(response) => Ok(response),
        Err(e) => {
            // Track error metrics
            track_error(&e);

            // Log error
            log_error(&e);

            Err(e)
        }
    }
}
```

### Error Rate Limiting

For high-volume systems, implement error rate limiting to prevent overwhelming logs and reporting systems:

```rust
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

struct ErrorRateLimiter {
    // Maps error type to last reported time and count
    last_reported: HashMap<String, (Instant, u64)>,
    // Minimum time between full error reports for the same error type
    min_interval: Duration,
    // Maximum errors to report in full detail during the interval
    max_per_interval: u64,
}

impl ErrorRateLimiter {
    fn new(min_interval: Duration, max_per_interval: u64) -> Self {
        Self {
            last_reported: HashMap::new(),
            min_interval,
            max_per_interval,
        }
    }

    fn should_report_fully(&mut self, error_type: &str) -> bool {
        let now = Instant::now();
        let entry = self.last_reported.entry(error_type.to_string())
            .or_insert((now, 0));

        if now.duration_since(entry.0) > self.min_interval {
            // Reset if interval has passed
            *entry = (now, 1);
            true
        } else {
            // Increment counter
            entry.1 += 1;
            // Only report fully if under threshold
            entry.1 <= self.max_per_interval
        }
    }
}

// Usage
fn log_error_with_rate_limiting(err: &dyn Error, limiter: &mut ErrorRateLimiter) {
    let error_type = std::any::type_name_of_val(err);

    if limiter.should_report_fully(error_type) {
        // Log full error details
        error!("Error: {}\n{:?}", err, err);
    } else {
        // Log minimal information
        warn!("Error rate limit exceeded for type: {}", error_type);
    }
}
```

### Customizing Error Display for Different Formats

Different output formats require different error representations:

```rust
trait ErrorFormatter {
    fn format_error(&self, error: &dyn Error) -> String;
}

struct HtmlErrorFormatter;
impl ErrorFormatter for HtmlErrorFormatter {
    fn format_error(&self, error: &dyn Error) -> String {
        let mut html = String::from("<div class=\"error\">\n");
        html.push_str(&format!("  <div class=\"error-message\">{}</div>\n", html_escape(error.to_string())));

        if let Some(source) = error.source() {
            html.push_str("  <div class=\"error-cause\">\n");
            html.push_str("    <div class=\"error-cause-label\">Caused by:</div>\n");
            html.push_str(&format!("    <div class=\"error-cause-message\">{}</div>\n", html_escape(source.to_string())));
            html.push_str("  </div>\n");
        }

        html.push_str("</div>");
        html
    }
}

struct JsonErrorFormatter;
impl ErrorFormatter for JsonErrorFormatter {
    fn format_error(&self, error: &dyn Error) -> String {
        let mut causes = Vec::new();
        let mut current = error.source();

        while let Some(err) = current {
            causes.push(err.to_string());
            current = err.source();
        }

        let error_json = json!({
            "message": error.to_string(),
            "type": std::any::type_name_of_val(error),
            "causes": causes,
        });

        serde_json::to_string_pretty(&error_json).unwrap()
    }
}

// Usage
fn render_error_page(err: &dyn Error, formatter: &dyn ErrorFormatter) -> String {
    let mut page = String::from("<!DOCTYPE html>\n<html>\n<head>\n");
    page.push_str("  <title>Error</title>\n");
    page.push_str("</head>\n<body>\n");
    page.push_str("  <h1>An error occurred</h1>\n");
    page.push_str(&formatter.format_error(err));
    page.push_str("\n</body>\n</html>");
    page
}

fn html_escape(s: String) -> String {
    s.replace("&", "&amp;")
     .replace("<", "&lt;")
     .replace(">", "&gt;")
     .replace("\"", "&quot;")
     .replace("'", "&#39;")
}
```

### Error Translation for Internationalization

For applications with international users, error messages should be translatable:

```rust
use fluent::{FluentBundle, FluentResource};
use unic_langid::LanguageIdentifier;

struct I18nErrorFormatter {
    bundles: HashMap<LanguageIdentifier, FluentBundle<FluentResource>>,
}

impl I18nErrorFormatter {
    fn new() -> Self {
        // Initialize with language bundles
        let mut bundles = HashMap::new();

        // English bundle
        let en_us: LanguageIdentifier = "en-US".parse().unwrap();
        let en_resource = FluentResource::try_new(String::from(r#"
            error-not-found = {$entity} not found.
            error-permission-denied = You don't have permission to access {$resource}.
            error-validation = Invalid value for {$field}: {$message}.
            error-generic = An error occurred. Please try again later.
        "#)).unwrap();

        let mut en_bundle = FluentBundle::new(vec![en_us.clone()]);
        en_bundle.add_resource(en_resource).unwrap();
        bundles.insert(en_us, en_bundle);

        // Add more languages as needed...

        Self { bundles }
    }

    fn format_error(&self, error: &AppError, lang_id: &LanguageIdentifier) -> String {
        let bundle = self.bundles.get(lang_id)
            .unwrap_or_else(|| self.bundles.get(&"en-US".parse().unwrap()).unwrap());

        match error {
            AppError::NotFound { entity, id } => {
                let mut args = HashMap::new();
                args.insert("entity", entity.as_str());
                args.insert("id", id.as_str());

                let msg = bundle.get_message("error-not-found").unwrap();
                let pattern = msg.value().unwrap();

                bundle.format_pattern(pattern, Some(&args), &mut vec![]).unwrap().to_string()
            },
            // Handle other error types...
            _ => bundle.format_pattern(
                bundle.get_message("error-generic").unwrap().value().unwrap(),
                None,
                &mut vec![]
            ).unwrap().to_string(),
        }
    }
}
```

This approach separates error logic from the presentation, making it easier to provide localized error messages.

## Error Handling in Async Code

Asynchronous code introduces additional complexity to error handling. Let's explore patterns for managing errors in async Rust.

### Propagating Errors in Async Functions

Just like synchronous code, async functions can use the `?` operator to propagate errors:

```rust
use tokio::fs;
use anyhow::Result;

async fn read_and_process_file(path: &str) -> Result<String> {
    let contents = fs::read_to_string(path).await?;
    let processed = process_contents(&contents)?;
    Ok(processed)
}
```

The `?` operator works similarly in async functions, but the error propagation happens when the future is polled.

### Handling Timeout Errors

One common source of errors in async code is timeouts:

```rust
use tokio::time::{timeout, Duration};
use thiserror::Error;

#[derive(Error, Debug)]
enum ApiError {
    #[error("request timed out after {0:?}")]
    Timeout(Duration),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("invalid response: {0}")]
    InvalidResponse(String),
}

async fn fetch_with_timeout(url: &str, timeout_duration: Duration) -> Result<String, ApiError> {
    let future = reqwest::get(url);

    match timeout(timeout_duration, future).await {
        Ok(response) => {
            let response = response.map_err(ApiError::Http)?;
            let text = response.text().await.map_err(ApiError::Http)?;

            if text.is_empty() {
                return Err(ApiError::InvalidResponse("Empty response".to_string()));
            }

            Ok(text)
        }
        Err(_) => Err(ApiError::Timeout(timeout_duration)),
    }
}
```

### Managing Concurrent Errors

When executing multiple async operations concurrently, there are different strategies for handling errors:

#### Wait for All Results

```rust
use futures::future::{join_all, try_join_all};
use anyhow::Result;

async fn process_all_items(items: Vec<Item>) -> Result<Vec<ProcessedItem>> {
    // Process all items concurrently, fail if any fail
    let futures = items.into_iter().map(|item| async move {
        process_item(item).await
    });

    // try_join_all returns an error if any future returns an error
    try_join_all(futures).await
}

async fn process_with_partial_results(items: Vec<Item>) -> Vec<Result<ProcessedItem>> {
    // Process all items concurrently, collect all results
    let futures = items.into_iter().map(|item| async move {
        process_item(item).await
    });

    // join_all collects all futures regardless of success/failure
    join_all(futures).await
}
```

#### Fail Fast on First Error

```rust
use futures::future::select_ok;
use thiserror::Error;

#[derive(Error, Debug)]
#[error("all attempts failed: {0}")]
struct AllFailedError(String);

async fn try_multiple_endpoints(endpoints: Vec<String>) -> Result<String, AllFailedError> {
    let futures = endpoints.into_iter().map(|endpoint| async move {
        fetch_endpoint(&endpoint).await
    });

    // select_ok returns the first successful result
    select_ok(futures).await
        .map(|(result, _)| result)
        .map_err(|e| AllFailedError(format!("all endpoints failed: {}", e)))
}
```

### Backoff and Retry for Transient Errors

For handling transient errors, implement retry logic with exponential backoff:

```rust
use tokio::time::{sleep, Duration};
use rand::Rng;

async fn with_retry<F, Fut, T, E>(
    operation: F,
    max_retries: usize,
    base_delay: Duration,
) -> Result<T, E>
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = Result<T, E>>,
    E: std::fmt::Display,
{
    let mut rng = rand::thread_rng();
    let mut attempt = 0;
    let mut delay = base_delay;

    loop {
        match operation().await {
            Ok(value) => return Ok(value),
            Err(err) => {
                attempt += 1;

                if attempt > max_retries {
                    return Err(err);
                }

                // Log retry attempt
                log::warn!(
                    "Operation failed (attempt {}/{}): {}. Retrying in {:?}...",
                    attempt,
                    max_retries,
                    err,
                    delay
                );

                // Add jitter to prevent thundering herd
                let jitter = Duration::from_millis(rng.gen_range(0..100));
                sleep(delay + jitter).await;

                // Exponential backoff
                delay *= 2;
            }
        }
    }
}

// Usage
async fn fetch_data_with_retry(url: &str) -> Result<String, reqwest::Error> {
    with_retry(
        || async { reqwest::get(url).await?.text().await },
        3,
        Duration::from_millis(100),
    )
    .await
}
```

### Error Boundaries in Async Applications

In larger async applications, establish error boundaries to prevent error propagation across critical subsystems:

```rust
struct ErrorBoundary<T> {
    inner: T,
    name: &'static str,
}

impl<T> ErrorBoundary<T> {
    fn new(inner: T, name: &'static str) -> Self {
        Self { inner, name }
    }

    async fn run<F, Fut, R>(&self, operation: F) -> R
    where
        F: FnOnce(&T) -> Fut,
        Fut: std::future::Future<Output = Result<R, anyhow::Error>>,
        R: Default,
    {
        match operation(&self.inner).await {
            Ok(result) => result,
            Err(error) => {
                log::error!("Error in boundary {}: {}", self.name, error);

                // Report to monitoring system
                metrics::increment_counter!("error_boundary_failure", "boundary" => self.name);

                // Return default value for the result type
                R::default()
            }
        }
    }
}

// Usage
async fn run_subsystem() {
    let db = Database::connect().await.expect("Failed to connect to database");
    let api_client = ApiClient::new();

    let db_boundary = ErrorBoundary::new(db, "database");
    let api_boundary = ErrorBoundary::new(api_client, "api");

    // Even if this fails, it won't crash the application
    let users = db_boundary.run(|db| async {
        db.fetch_users().await.context("Failed to fetch users")
    }).await;

    // This runs regardless of whether the previous operation succeeded
    let products = api_boundary.run(|api| async {
        api.fetch_products().await.context("Failed to fetch products")
    }).await;

    // Continue with application logic...
}
```

## Practical Error Handling Example

Let's tie everything together with a comprehensive example of error handling in a real-world application. We'll create a file processing utility that demonstrates proper error handling throughout the application.

### Project Structure

```
file-processor/
├── Cargo.toml
├── src/
│   ├── main.rs
│   ├── error.rs
│   ├── processor.rs
│   ├── storage.rs
│   └── config.rs
```

### Error Module

First, let's define our error types in `error.rs`:

```rust
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("I/O error: {source}")]
    Io {
        #[source]
        source: std::io::Error,
        path: Option<PathBuf>,
    },

    #[error("Configuration error: {0}")]
    Config(#[from] ConfigError),

    #[error("Processing error: {0}")]
    Processing(#[from] ProcessingError),

    #[error("Storage error: {0}")]
    Storage(#[from] StorageError),
}

// Convert io::Error to AppError with path context
impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        Self::Io {
            source: error,
            path: None,
        }
    }
}

// Helper to add path context to io errors
pub fn with_path<T>(result: std::io::Result<T>, path: impl Into<PathBuf>) -> Result<T, AppError> {
    result.map_err(|err| AppError::Io {
        source: err,
        path: Some(path.into()),
    })
}

#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("Missing required config value: {0}")]
    MissingValue(String),

    #[error("Invalid config value for {key}: {message}")]
    InvalidValue {
        key: String,
        message: String,
    },

    #[error("Failed to parse config file: {0}")]
    ParseError(#[source] serde_json::Error),
}

#[derive(Error, Debug)]
pub enum ProcessingError {
    #[error("Unsupported file format: {0}")]
    UnsupportedFormat(String),

    #[error("Processing timeout after {0:?}")]
    Timeout(std::time::Duration),

    #[error("Failed to process line {line}: {message}")]
    LineError {
        line: usize,
        message: String,
    },
}

#[derive(Error, Debug)]
pub enum StorageError {
    #[error("Failed to connect to storage: {0}")]
    ConnectionFailed(String),

    #[error("Item not found: {0}")]
    NotFound(String),

    #[error("Permission denied for operation on {resource}")]
    PermissionDenied {
        resource: String,
        #[source]
        source: Option<std::io::Error>,
    },
}

// Type alias for common result type
pub type Result<T> = std::result::Result<T, AppError>;
```

### Config Module

Now, let's implement the configuration handling in `config.rs`:

```rust
use crate::error::{ConfigError, Result, with_path};
use serde::Deserialize;
use std::path::Path;
use std::fs;

#[derive(Debug, Deserialize)]
pub struct Config {
    pub input_dir: String,
    pub output_dir: String,
    pub backup_dir: Option<String>,
    pub processing: ProcessingConfig,
}

#[derive(Debug, Deserialize)]
pub struct ProcessingConfig {
    pub max_concurrent_files: usize,
    pub timeout_seconds: u64,
    pub supported_formats: Vec<String>,
}

impl Config {
    pub fn from_file(path: impl AsRef<Path>) -> Result<Self> {
        let path = path.as_ref();
        let content = with_path(fs::read_to_string(path), path)?;

        let config: Config = serde_json::from_str(&content)
            .map_err(ConfigError::ParseError)?;

        config.validate()?;

        Ok(config)
    }

    fn validate(&self) -> std::result::Result<(), ConfigError> {
        if self.input_dir.is_empty() {
            return Err(ConfigError::MissingValue("input_dir".to_string()));
        }

        if self.output_dir.is_empty() {
            return Err(ConfigError::MissingValue("output_dir".to_string()));
        }

        if self.processing.max_concurrent_files == 0 {
            return Err(ConfigError::InvalidValue {
                key: "processing.max_concurrent_files".to_string(),
                message: "Must be greater than 0".to_string(),
            });
        }

        if self.processing.supported_formats.is_empty() {
            return Err(ConfigError::InvalidValue {
                key: "processing.supported_formats".to_string(),
                message: "At least one format must be specified".to_string(),
            });
        }

        Ok(())
    }
}
```

### Processor Module

Now, let's implement the file processing logic in `processor.rs`:

```rust
use crate::config::Config;
use crate::error::{ProcessingError, Result, with_path};
use crate::storage::Storage;
use std::path::{Path, PathBuf};
use std::fs;
use tokio::time::{timeout, Duration};
use futures::future::join_all;
use std::sync::Arc;
use tokio::sync::Semaphore;

pub struct Processor {
    config: Config,
    storage: Arc<dyn Storage>,
}

impl Processor {
    pub fn new(config: Config, storage: Arc<dyn Storage>) -> Self {
        Self { config, storage }
    }

    pub async fn process_directory(&self, dir: impl AsRef<Path>) -> Result<ProcessingSummary> {
        let dir = dir.as_ref();
        let entries = with_path(fs::read_dir(dir), dir)?;

        let mut files = Vec::new();
        for entry in entries {
            let entry = entry?;
            let path = entry.path();

            if path.is_file() && self.is_supported_format(&path) {
                files.push(path);
            }
        }

        log::info!("Found {} files to process in {}", files.len(), dir.display());

        if files.is_empty() {
            return Ok(ProcessingSummary::default());
        }

        // Process files concurrently with a limit
        let semaphore = Arc::new(Semaphore::new(self.config.max_concurrent_files));
        let timeout_duration = Duration::from_secs(self.config.timeout_seconds);

        let futures = files.into_iter().map(|file| {
            let semaphore = Arc::clone(&semaphore);
            let storage = Arc::clone(&self.storage);

            async move {
                let _permit = semaphore.acquire().await.unwrap();
                self.process_file(&file, &storage, timeout_duration).await
            }
        });

        let results = join_all(futures).await;

        // Aggregate results
        let mut summary = ProcessingSummary::default();
        let mut errors = Vec::new();

        for (i, result) in results.into_iter().enumerate() {
            match result {
                Ok(file_result) => {
                    summary.processed_files += 1;
                    summary.processed_lines += file_result.processed_lines;
                }
                Err(e) => {
                    summary.failed_files += 1;
                    errors.push(format!("File {}: {}", i, e));
                }
            }
        }

        if !errors.is_empty() {
            log::warn!("Encountered errors while processing:\n{}", errors.join("\n"));
        }

        Ok(summary)
    }

    async fn process_file(
        &self,
        path: &Path,
        storage: &Arc<dyn Storage>,
        timeout_duration: Duration,
    ) -> Result<FileResult> {
        log::info!("Processing file: {}", path.display());

        // Apply timeout to the whole operation
        match timeout(timeout_duration, self.do_process_file(path, storage)).await {
            Ok(result) => result,
            Err(_) => Err(ProcessingError::Timeout(timeout_duration).into()),
        }
    }

    async fn do_process_file(&self, path: &Path, storage: &Arc<dyn Storage>) -> Result<FileResult> {
        let content = with_path(fs::read_to_string(path), path)?;
        let lines: Vec<&str> = content.lines().collect();

        let mut result = FileResult::default();

        for (i, line) in lines.iter().enumerate() {
            let line_num = i + 1;

            if line.trim().is_empty() {
                continue;
            }

            match self.process_line(line, line_num)? {
                Some(processed) => {
                    storage.store(&processed).await?;
                    result.processed_lines += 1;
                }
                None => continue,
            }
        }

        // Move to backup directory if specified
        if let Some(ref backup_dir) = self.config.backup_dir {
            let file_name = path.file_name().unwrap();
            let backup_path = Path::new(backup_dir).join(file_name);
            with_path(fs::rename(path, &backup_path), path)?;
        }

        Ok(result)
    }

    fn process_line(&self, line: &str, line_num: usize) -> Result<Option<String>> {
        // Skip comments
        if line.starts_with('#') {
            return Ok(None);
        }

        // Simple processing: uppercase non-comment lines
        let processed = line.to_uppercase();

        // Simulate validation
        if processed.contains("ERROR") {
            return Err(ProcessingError::LineError {
                line: line_num,
                message: "Line contains error marker".to_string(),
            }
            .into());
        }

        Ok(Some(processed))
    }

    fn is_supported_format(&self, path: &Path) -> bool {
        if let Some(ext) = path.extension() {
            if let Some(ext_str) = ext.to_str() {
                return self.config.processing.supported_formats.contains(
                    &ext_str.to_lowercase()
                );
            }
        }
        false
    }
}

#[derive(Debug, Default)]
pub struct ProcessingSummary {
    pub processed_files: usize,
    pub failed_files: usize,
    pub processed_lines: usize,
}

#[derive(Debug, Default)]
struct FileResult {
    processed_lines: usize,
}
```

### Storage Module

Next, let's implement the storage interface in `storage.rs`:

```rust
use async_trait::async_trait;
use crate::error::{StorageError, Result};
use std::path::Path;
use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};

#[async_trait]
pub trait Storage: Send + Sync {
    async fn store(&self, data: &str) -> Result<()>;
}

pub struct FileStorage {
    output_path: String,
}

impl FileStorage {
    pub fn new(output_path: String) -> Self {
        Self { output_path }
    }
}

#[async_trait]
impl Storage for FileStorage {
    async fn store(&self, data: &str) -> Result<()> {
        let path = Path::new(&self.output_path);

        // Ensure directory exists
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| StorageError::PermissionDenied {
                resource: parent.display().to_string(),
                source: Some(e),
            })?;
        }

        // Append to file
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .map_err(|e| StorageError::PermissionDenied {
                resource: path.display().to_string(),
                source: Some(e),
            })?;

        writeln!(file, "{}", data).map_err(|e| StorageError::PermissionDenied {
            resource: path.display().to_string(),
            source: Some(e),
        })?;

        Ok(())
    }
}

// Mock storage for testing
#[cfg(test)]
pub struct MockStorage {
    pub stored_items: std::sync::Mutex<Vec<String>>,
}

#[cfg(test)]
impl MockStorage {
    pub fn new() -> Self {
        Self {
            stored_items: std::sync::Mutex::new(Vec::new()),
        }
    }
}

#[cfg(test)]
#[async_trait]
impl Storage for MockStorage {
    async fn store(&self, data: &str) -> Result<()> {
        let mut items = self.stored_items.lock().unwrap();
        items.push(data.to_string());
        Ok(())
    }
}
```

### Main Application

Finally, let's implement the main application in `main.rs`:

```rust
mod config;
mod error;
mod processor;
mod storage;

use crate::config::Config;
use crate::error::Result;
use crate::processor::Processor;
use crate::storage::FileStorage;
use std::sync::Arc;
use std::path::Path;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    env_logger::init();

    // Load configuration
    let config_path = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "config.json".to_string());

    log::info!("Loading configuration from {}", config_path);
    let config = Config::from_file(config_path)?;

    // Initialize storage
    let storage = Arc::new(FileStorage::new(config.output_dir.clone()));

    // Create processor
    let processor = Processor::new(config.clone(), storage);

    // Process input directory
    log::info!("Starting processing of directory: {}", config.input_dir);
    let summary = processor.process_directory(&config.input_dir).await?;

    log::info!(
        "Processing complete. Processed {} files ({} failed) with {} lines.",
        summary.processed_files,
        summary.failed_files,
        summary.processed_lines
    );

    Ok(())
}
```

### Error Handling Strategies Demonstrated

This example demonstrates several error handling strategies:

1. **Domain-specific error types** - We define separate error enums for different parts of the application.
2. **Error context** - We add context like file paths to I/O errors.
3. **Error conversion** - We implement `From` traits to convert between error types.
4. **Functional error handling** - We use combinators like `map_err` to transform errors.
5. **Async error handling** - We handle errors in async code with timeouts and concurrency controls.
6. **Error aggregation** - We collect errors from multiple concurrent operations.
7. **Structured logging** - We log errors with context and severity levels.
8. **Error rate limiting** - We implement error rate limiting to prevent overwhelming logs and reporting systems.
9. **Custom error formatting** - We implement custom error formatting for different output formats.
10. **Error translation for internationalization** - We implement error translation for different languages.

## Summary

In this chapter, we've explored advanced error handling patterns and libraries in Rust. We've seen how to:

1. Create custom error types that express the specific failure modes of your application.
2. Use libraries like `thiserror` and `anyhow` to simplify error handling code.
3. Add rich context to errors to make them more actionable.
4. Build error hierarchies that scale with application complexity.
5. Work with collections and fallible operations on iterators.
6. Collect and aggregate multiple errors for validation scenarios.
7. Log and report errors in a structured way for different audiences.
8. Handle errors in asynchronous code with timeouts and retries.
9. Implement comprehensive error handling in a real-world application.

Error handling is a critical aspect of writing robust, maintainable Rust code. By applying the patterns and techniques from this chapter, you can create applications that handle errors gracefully, provide clear diagnostics, and degrade gracefully when things go wrong.

## Exercises

1. **Error Type Design**: Create a domain-specific error type for a web API client that handles different types of API errors (authentication, rate limiting, resource not found, etc.).

2. **Error Context**: Enhance a file processing function to add detailed context to I/O errors, such as operation type, file path, and user permissions.

3. **Error Reporting**: Implement a function that formats errors differently for three audiences: end users, system administrators, and developers.

4. **Fallible Collection Processing**: Write a function that processes a collection of items, collecting successful results and errors separately, with a configurable error tolerance.

5. **Async Error Handling**: Implement a function that fetches data from multiple sources concurrently, with timeouts and retries for transient errors.

6. **Error Aggregation**: Create a validation system that checks multiple conditions and collects all validation errors instead of stopping at the first one.

7. **Error Libraries Integration**: Refactor an existing error handling implementation to use `thiserror` and `anyhow` appropriately.

8. **Error Metrics**: Add error tracking and metrics collection to an application, counting different types of errors and their frequencies.

## Further Reading

- [Rust by Example: Error Handling](https://doc.rust-lang.org/rust-by-example/error.html)
- [The `thiserror` crate documentation](https://docs.rs/thiserror)
- [The `anyhow` crate documentation](https://docs.rs/anyhow)
- [The `snafu` crate for error handling](https://docs.rs/snafu)
- [Error Handling in Rust](https://blog.burntsushi.net/rust-error-handling/) by Andrew Gallant
- [Failure Modes in Distributed Systems](https://www.youtube.com/watch?v=iesXrssV9Gg) by Bryan Cantrill
- [Designing Error Types in Rust](https://www.youtube.com/watch?v=udHj4FCUU1E) by Jane Lusby
