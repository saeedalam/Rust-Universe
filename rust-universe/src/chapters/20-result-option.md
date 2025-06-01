# Chapter 20: Result, Option, and Recoverable Errors

## Introduction

In the previous chapter, we explored Rust's panic mechanism for handling unrecoverable errors—situations where continuing execution would be unsafe or impossible. However, many error situations in real-world applications are recoverable. A file might not exist yet, a network connection might time out, or user input might be malformed. These are not programming errors but expected conditions that your program should handle gracefully.

Rust's approach to recoverable error handling centers around two core types: `Result<T, E>` and `Option<T>`. These types give you explicit, type-checked ways to handle errors and missing values without resorting to exceptions, null pointers, or other error-prone mechanisms found in many languages.

By the end of this chapter, you'll understand how to effectively use `Result` and `Option` to build robust, reliable software that gracefully handles failure conditions. You'll learn powerful patterns for error propagation, transformation, and aggregation, and you'll see how Rust's error handling encourages you to think about and address potential failure modes upfront.

## Error Handling Patterns

Before diving into the specifics of `Result` and `Option`, let's explore some common error handling patterns and philosophies that guide idiomatic Rust code.

### Types of Errors

In Rust, we typically categorize errors into several types:

1. **Input Validation Errors**: Errors that occur when user input doesn't meet expected criteria.
2. **Resource Access Errors**: Errors when accessing files, networks, or other resources.
3. **Business Logic Errors**: Errors specific to your application's domain.
4. **Operational Errors**: Errors from the environment, like out-of-memory conditions.
5. **Programming Errors**: Bugs in your code that should be fixed (often handled with panics).

Each type might warrant different handling strategies, but all can be represented with Rust's error types.

### Error Handling Strategies

Rust programs typically employ several strategies for handling errors:

1. **Propagate**: Pass the error up the call stack for the caller to handle.
2. **Retry**: Attempt the operation again, possibly with a delay or modified parameters.
3. **Provide a Default**: Continue with a reasonable default value when an operation fails.
4. **Partial Success**: Return what was accomplished before the error occurred.
5. **Log and Continue**: Record the error for later analysis but continue execution.
6. **Transform**: Convert one error type to another that's more appropriate for your API.

The strategy you choose depends on the specific requirements of your application and the nature of the error.

### Design Principles for Error Handling

When designing error handling in Rust, consider these principles:

1. **Be Explicit**: Make error cases visible in function signatures.
2. **Provide Context**: Include enough information to understand and potentially fix the error.
3. **Layer Appropriately**: Low-level libraries should return specific errors; high-level applications can provide more context.
4. **Match the Audience**: Design errors with the consumer of your API in mind.
5. **Preserve Details**: Don't discard potentially useful error information.

```rust
// Good: Explicit error type with context
fn read_config(path: &str) -> Result<Config, ConfigError> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| ConfigError::IoError { source: e, path: path.to_string() })?;

    parse_config(&content)
        .map_err(|e| ConfigError::ParseError { source: e, content: content.clone() })
}

// Less good: Generic error type with less context
fn read_config_simple(path: &str) -> Result<Config, Box<dyn std::error::Error>> {
    let content = std::fs::read_to_string(path)?;
    Ok(parse_config(&content)?)
}
```

### Error Handling vs. Exception Handling

If you're coming from languages with exceptions, Rust's approach might feel different. Key differences include:

1. **Explicit vs. Implicit**: Rust errors are part of function signatures, not hidden control flow.
2. **Value-Based vs. Control-Flow**: Errors are regular values to be processed, not special execution paths.
3. **Compile-Time vs. Runtime**: Rust checks error handling at compile time, not runtime.
4. **Granular Control**: You decide exactly how to handle each error, with no automatic unwinding.

```rust
// In a language with exceptions:
try {
    let config = readConfig("config.json");
    processConfig(config);
} catch (IOException e) {
    logError("IO error: " + e.getMessage());
} catch (ParseException e) {
    logError("Parse error: " + e.getMessage());
}

// In Rust:
match read_config("config.json") {
    Ok(config) => process_config(config),
    Err(ConfigError::IoError { source, path }) => {
        log_error(&format!("IO error for {}: {}", path, source));
    },
    Err(ConfigError::ParseError { source, content }) => {
        log_error(&format!("Parse error: {}\nContent: {}", source, content));
    }
}
```

This explicit approach might be more verbose in simple cases but scales better to complex applications and leads to more reliable, maintainable code.

## Working with Result<T, E>

The `Result<T, E>` type is Rust's primary mechanism for handling operations that can fail. It's an enum with two variants:

- `Ok(T)`: Contains the successful result of type `T`
- `Err(E)`: Contains the error of type `E`

### Basic Usage

Here's a simple example of returning and handling a `Result`:

```rust
use std::fs::File;
use std::io::{self, Read};

fn read_file_contents(path: &str) -> Result<String, io::Error> {
    let mut file = File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

fn main() {
    match read_file_contents("config.txt") {
        Ok(contents) => println!("File contents: {}", contents),
        Err(error) => println!("Error reading file: {}", error),
    }
}
```

### Pattern Matching on Result

The `match` expression provides complete control over handling both success and error cases:

```rust
fn process_file(path: &str) {
    match read_file_contents(path) {
        Ok(contents) if contents.is_empty() => {
            println!("File is empty");
        }
        Ok(contents) => {
            println!("File has {} bytes of content", contents.len());
        }
        Err(error) if error.kind() == io::ErrorKind::NotFound => {
            println!("File not found: {}", path);
        }
        Err(error) => {
            println!("Error reading file: {}", error);
        }
    }
}
```

### Working with Multiple Results

When you have multiple operations that return `Result`, you can handle them in several ways:

```rust
fn process_multiple_files() -> Result<(), io::Error> {
    // Using ? to propagate errors
    let config = read_file_contents("config.txt")?;
    let data = read_file_contents("data.txt")?;

    println!("Successfully read both files");
    println!("Config: {}", config);
    println!("Data: {}", data);

    Ok(())
}
```

For independent operations where you want to collect all errors:

```rust
fn process_files(paths: &[&str]) -> Vec<Result<String, io::Error>> {
    paths.iter()
         .map(|&path| read_file_contents(path))
         .collect()
}

// Or collect successful results only
fn read_all_files(paths: &[&str]) -> Result<Vec<String>, io::Error> {
    paths.iter()
         .map(|&path| read_file_contents(path))
         .collect() // This works because Result implements FromIterator!
}
```

### Useful Result Methods

The `Result` type provides many useful methods for handling different scenarios:

#### Transforming Results

```rust
// Transform the success value
let line_count = read_file_contents("data.txt")
    .map(|content| content.lines().count());

// Transform the error
let result = read_file_contents("data.txt")
    .map_err(|err| format!("Failed to read data.txt: {}", err));
```

#### Early Returns

```rust
// Return early with a default value if there's an error
let content = read_file_contents("config.txt").unwrap_or_else(|_| String::from("default=value"));

// Return early with a computed value if there's an error
let content = read_file_contents("config.txt").unwrap_or_else(|err| {
    eprintln!("Warning: couldn't read config: {}", err);
    String::from("default=value")
});
```

#### Combining Results

```rust
// and_then (flatMap in some languages) for chaining operations that return Result
fn process_content(content: String) -> Result<i32, String> {
    // Process the content...
    Ok(42)
}

let result = read_file_contents("data.txt")
    .map_err(|e| e.to_string()) // Convert io::Error to String
    .and_then(process_content);
```

#### Other Useful Methods

- `is_ok()` and `is_err()`: Check if a Result is Ok or Err
- `ok()`: Convert a Result<T, E> to Option<T>, discarding the error
- `err()`: Convert a Result<T, E> to Option<E>, discarding the success value
- `unwrap_or()`: Extract the value or use a default
- `expect()`: Extract the value or panic with a custom message

```rust
if result.is_ok() {
    println!("Operation succeeded");
}

// Get the success value as an Option (None if it was an Err)
let success_value: Option<String> = result.ok();

// Provide a default value if it's an error
let content = result.unwrap_or(String::from("default content"));
```

## Working with Option<T>

The `Option<T>` type represents a value that might be absent. It's an enum with two variants:

- `Some(T)`: Contains a value of type `T`
- `None`: Represents the absence of a value

### When to Use Option

`Option` is ideal for situations where a value might not exist, such as:

1. Functions that might not return a meaningful result
2. Fields that might be uninitialized
3. Looking up values in collections
4. Representing nullable values from other languages or APIs

Using `Option` instead of null pointers eliminates a whole class of bugs by forcing you to explicitly handle the case where a value is absent.

### Basic Usage

Here's a simple example of using `Option`:

```rust
fn find_user(id: u64) -> Option<User> {
    if id == 0 {
        return None; // No user with ID 0
    }

    // Look up user in database...
    Some(User { id, name: "Example User".to_string() })
}

fn main() {
    match find_user(42) {
        Some(user) => println!("Found user: {}", user.name),
        None => println!("User not found"),
    }
}
```

### Pattern Matching on Option

As with `Result`, you can use pattern matching for fine-grained control:

```rust
fn process_user(user_id: u64) {
    match find_user(user_id) {
        Some(user) if user.is_admin => {
            println!("Found admin user: {}", user.name);
        }
        Some(user) => {
            println!("Found regular user: {}", user.name);
        }
        None => {
            println!("No user with ID {}", user_id);
        }
    }
}
```

### If Let and While Let

For simpler cases where you only care about one pattern, you can use `if let` and `while let`:

```rust
// Using if let when you only care about the Some case
if let Some(user) = find_user(42) {
    println!("Found user: {}", user.name);
}

// Using while let for processing a series of Options
let mut users = vec![find_user(1), find_user(2), find_user(0), find_user(3)];
while let Some(Some(user)) = users.pop() {
    println!("Processing user: {}", user.name);
}
```

### Useful Option Methods

Like `Result`, `Option` comes with many useful methods:

#### Transforming Options

```rust
// Transform the inner value
let user_name = find_user(42).map(|user| user.name);

// Chain operations that return Option
let manager_name = find_user(42)
    .and_then(|user| user.manager_id)
    .and_then(|manager_id| find_user(manager_id))
    .map(|manager| manager.name);
```

#### Default Values

```rust
// Provide a default value if None
let user = find_user(42).unwrap_or(User::default());

// Compute a default value if None
let user = find_user(42).unwrap_or_else(|| {
    println!("Creating default user because ID 42 not found");
    User::default()
});
```

#### Combining Options

```rust
// Combine two Options - result is Some only if both are Some
let combined = Some(5).zip(Some("hello"));  // Some((5, "hello"))
let combined = Some(5).zip(None::<&str>);   // None

// Filter an Option based on a predicate
let adult_user = find_user(42).filter(|user| user.age >= 18);
```

#### Other Useful Methods

- `is_some()` and `is_none()`: Check if an Option is Some or None
- `as_ref()`: Convert an Option<T> to Option<&T>
- `as_mut()`: Convert an Option<T> to Option<&mut T>
- `take()`: Take the value from an Option, leaving None in its place
- `replace()`: Replace the value in an Option, returning the old value

```rust
if user_option.is_some() {
    println!("User exists");
}

// Using as_ref to avoid consuming the Option
if let Some(name) = user_option.as_ref().map(|user| &user.name) {
    println!("User name: {}", name);
}

// Using take to extract the value
let mut user_option = find_user(42);
if let Some(user) = user_option.take() {
    process_user(user);
    // user_option is now None
}
```

## Map, and_then, unwrap_or Operations

Both `Result` and `Option` types provide a set of functional-style combinators that allow you to transform and chain operations without excessive nesting or pattern matching. Let's explore these powerful methods in more detail.

### Map Operations

The `map` family of methods allows you to transform the success value inside a `Result` or `Option` without unwrapping it:

#### map

```rust
// Transform an Option<T> into an Option<U>
let maybe_name: Option<String> = Some("Alice".to_string());
let name_length: Option<usize> = maybe_name.map(|name| name.len());  // Some(5)

// Transform a Result<T, E> into a Result<U, E>
let file_result: Result<String, io::Error> = read_file_contents("data.txt");
let line_count: Result<usize, io::Error> = file_result.map(|content| content.lines().count());
```

#### map_err

For `Result`, you can also transform the error value while leaving the success value unchanged:

```rust
// Transform a Result<T, E> into a Result<T, F>
let file_result: Result<String, io::Error> = read_file_contents("data.txt");
let with_context: Result<String, String> = file_result.map_err(|err| {
    format!("Failed to read data.txt: {}", err)
});
```

#### map_or

This method applies a function to the contained value if it exists, or returns a default:

```rust
let maybe_name: Option<String> = Some("Alice".to_string());
let length: usize = maybe_name.map_or(0, |name| name.len());  // 5

let empty: Option<String> = None;
let length: usize = empty.map_or(0, |name| name.len());  // 0
```

#### map_or_else

Similar to `map_or`, but the default value is computed by a closure:

```rust
let maybe_user = find_user(42);
let greeting = maybe_user.map_or_else(
    || String::from("Hello, guest"),
    |user| format!("Hello, {}", user.name)
);
```

### And_then Operations (Monadic Binding)

The `and_then` family of methods allows you to chain operations that might fail:

#### and_then

This method is also known as "flatMap" or "bind" in other languages:

```rust
// Chain operations that return Option
fn find_department(user: &User) -> Option<Department> {
    // Implementation details...
    Some(Department { name: "Engineering".to_string() })
}

let department = find_user(42)
    .and_then(|user| find_department(&user));

// Chain operations that return Result
fn validate_config(content: String) -> Result<Config, ConfigError> {
    // Validation logic...
    Ok(Config { /* ... */ })
}

let config = read_file_contents("config.txt")
    .map_err(|e| ConfigError::IoError(e))
    .and_then(validate_config);
```

#### or_else

Provides an alternative if the value is `None` or `Err`:

```rust
// For Option
let user = find_user(42).or_else(|| find_user_by_email("default@example.com"));

// For Result
let content = read_file_contents("config.txt")
    .or_else(|_| read_file_contents("config.default.txt"));
```

### Unwrap Operations

These methods extract the value from an `Option` or `Result`, with different behaviors when the value is absent:

#### unwrap

Extracts the value, or panics if it's `None` or `Err`:

```rust
let user = find_user(42).unwrap();  // Panics if user not found
```

This should generally be avoided in production code, as we discussed in the previous chapter on panics.

#### unwrap_or

Returns the contained value or a default:

```rust
let user = find_user(42).unwrap_or(User::default());
```

#### unwrap_or_else

Returns the contained value or computes a default with a closure:

```rust
let user = find_user(42).unwrap_or_else(|| {
    log::warn!("User 42 not found, creating default user");
    User::default()
});
```

#### unwrap_or_default

Returns the contained value or the default value for the type:

```rust
let numbers: Option<Vec<i32>> = None;
let empty_vec = numbers.unwrap_or_default();  // Empty Vec<i32>
```

### Combining Results and Options

Sometimes you need to convert between `Result` and `Option` or combine them in various ways:

#### ok_or and ok_or_else

Convert an `Option<T>` to a `Result<T, E>`:

```rust
let user_option = find_user(42);
let user_result = user_option.ok_or("User not found");

// With a dynamic error message
let user_result = user_option.ok_or_else(|| format!("User {} not found", 42));
```

#### transpose

Flip a `Result<Option<T>, E>` to an `Option<Result<T, E>>`:

```rust
let result_of_option: Result<Option<i32>, Error> = Ok(Some(42));
let option_of_result: Option<Result<i32, Error>> = result_of_option.transpose();
// option_of_result is Some(Ok(42))
```

This is particularly useful when working with iterators that contain both `Option` and `Result` types.

### Real-World Examples

Let's see some more complex, real-world examples combining these operations:

```rust
// Processing a configuration file with fallbacks and validation
fn load_configuration() -> Result<Config, ConfigError> {
    // Try the user config first, fall back to default if not found
    let content = std::fs::read_to_string("user.config")
        .or_else(|_| std::fs::read_to_string("default.config"))
        .map_err(|e| ConfigError::IoError(e))?;

    // Parse and validate the config
    let raw_config = parse_config(&content)
        .map_err(|e| ConfigError::ParseError(e))?;

    // Apply defaults for missing values
    let config = Config {
        server: raw_config.server.unwrap_or_else(|| "localhost".to_string()),
        port: raw_config.port.unwrap_or(8080),
        timeout: raw_config.timeout.unwrap_or(30),
        debug: raw_config.debug.unwrap_or(false),
    };

    // Validate the config
    if config.port < 1024 && !is_user_admin() {
        return Err(ConfigError::ValidationError(
            "Non-admin users cannot use privileged ports (<1024)".to_string()
        ));
    }

    Ok(config)
}
```

This example shows how these combinators allow you to express complex logic in a readable, functional style.

## Chaining Operations

One of the most powerful aspects of Rust's error handling is the ability to chain operations together in a clean, readable way. Let's explore some patterns for chaining operations with `Result` and `Option`.

### Method Chaining

You can chain methods directly to transform and combine results:

```rust
let user_data = find_user(42)
    .map(|user| user.name)
    .unwrap_or_else(|| "Unknown User".to_string());

let line_count = std::fs::read_to_string("data.txt")
    .map(|content| content.lines().count())
    .unwrap_or(0);
```

### The ? Operator for Early Returns

The `?` operator provides a concise way to propagate errors. When applied to a `Result`, it returns the success value if `Ok`, or returns from the function with the error if `Err`:

```rust
fn process_file(path: &str) -> Result<Stats, io::Error> {
    let content = std::fs::read_to_string(path)?;
    let stats = compute_stats(&content)?;
    Ok(stats)
}
```

This is equivalent to:

```rust
fn process_file(path: &str) -> Result<Stats, io::Error> {
    let content = match std::fs::read_to_string(path) {
        Ok(content) => content,
        Err(e) => return Err(e),
    };

    let stats = match compute_stats(&content) {
        Ok(stats) => stats,
        Err(e) => return Err(e),
    };

    Ok(stats)
}
```

The `?` operator also works with `Option` types in functions that return `Option`:

```rust
fn find_user_department(user_id: u64) -> Option<Department> {
    let user = find_user(user_id)?;
    let department_id = user.department_id?;
    find_department(department_id)
}
```

### Collecting Results

When working with iterators that produce `Result` or `Option` types, you can use `collect()` to combine them:

```rust
// Collect into Result<Vec<T>, E> - succeeds only if all items succeed
fn read_all_files(paths: &[&str]) -> Result<Vec<String>, io::Error> {
    paths.iter()
         .map(|&path| std::fs::read_to_string(path))
         .collect()
}

// Collect into Vec<Result<T, E>> - keeps all results, successful or not
fn try_read_files(paths: &[&str]) -> Vec<Result<String, io::Error>> {
    paths.iter()
         .map(|&path| std::fs::read_to_string(path))
         .collect()
}

// Filter out errors, keeping only successes
fn read_available_files(paths: &[&str]) -> Vec<String> {
    paths.iter()
         .map(|&path| std::fs::read_to_string(path))
         .filter_map(Result::ok)
         .collect()
}
```

### The Try Trait and FromResidual

For more advanced cases, Rust provides the `Try` trait which powers the `?` operator. This allows types like `Result` and `Option` to work with `?` and enables you to define your own types that work with it.

The `Try` trait was stabilized in Rust 1.39 and has been evolving since. The modern version includes:

```rust
pub trait Try: FromResidual {
    type Output;
    type Residual;

    fn from_output(output: Self::Output) -> Self;
    fn branch(self) -> ControlFlow<Self::Residual, Self::Output>;
}
```

Most users won't need to implement this trait directly, but understanding it helps you see how the `?` operator works under the hood.

### Nested Results and Options

Sometimes you'll encounter nested `Result` or `Option` types. Here are patterns for working with them:

```rust
// Result<Result<T, E1>, E2> -> Result<T, E> where E can represent both E1 and E2
let nested_result: Result<Result<i32, ParseIntError>, io::Error> = Ok(Ok(42));
let flattened: Result<i32, Error> = nested_result
    .map_err(Error::IoError)
    .and_then(|inner| inner.map_err(Error::ParseError));

// Option<Option<T>> -> Option<T>
let nested_option: Option<Option<i32>> = Some(Some(42));
let flattened: Option<i32> = nested_option.flatten();
```

### Building Operation Chains

Let's put it all together with a more complex example that chains multiple operations:

```rust
fn process_user_data(user_id: u64) -> Result<Report, AppError> {
    // Find the user (returns Option<User>)
    let user = find_user(user_id)
        .ok_or_else(|| AppError::UserNotFound(user_id))?;

    // Check if user has necessary permissions
    if !user.has_permission("read_reports") {
        return Err(AppError::PermissionDenied {
            user_id,
            permission: "read_reports".to_string(),
        });
    }

    // Get the user's report file path
    let report_path = format!("reports/{}.json", user_id);

    // Read and parse the report file
    let report_data = std::fs::read_to_string(&report_path)
        .map_err(|e| AppError::IoError {
            source: e,
            path: report_path.clone(),
        })?;

    let report: Report = serde_json::from_str(&report_data)
        .map_err(|e| AppError::ParseError {
            source: e,
            content: report_data.clone(),
        })?;

    // Apply user-specific transformations
    let report = if user.is_admin {
        report.with_sensitive_data()
    } else {
        report.without_sensitive_data()
    };

    Ok(report)
}
```

This example demonstrates:

1. Converting between `Option` and `Result`
2. Adding context to errors
3. Using the `?` operator for clean error propagation
4. Conditional logic based on successful results
5. Building a chain of operations that might fail

## Propagating Errors with the ? Operator

We've seen the `?` operator briefly, but it deserves a deeper look as it's one of Rust's most powerful features for error handling.

### Basic Usage

The `?` operator can be used with both `Result` and `Option`:

```rust
// With Result
fn read_config() -> Result<Config, io::Error> {
    let content = std::fs::read_to_string("config.txt")?;
    let config = parse_config(&content)?;
    Ok(config)
}

// With Option
fn find_admin_user() -> Option<User> {
    let user_id = get_admin_id()?;
    let user = find_user(user_id)?;
    Some(user)
}
```

### How ? Works

When you use `?` on a `Result` or `Option`:

1. If it's `Ok(value)` or `Some(value)`, the value is extracted and execution continues
2. If it's `Err(e)` or `None`, the function immediately returns with that error or `None`

### Error Type Conversion

The `?` operator will automatically convert the error type if the destination type implements `From` for the source error type:

```rust
fn read_config() -> Result<Config, ConfigError> {
    // This works if ConfigError implements From<io::Error>
    let content = std::fs::read_to_string("config.txt")?;

    // This works if ConfigError implements From<ParseError>
    let config = parse_config(&content)?;

    Ok(config)
}

// The necessary From implementations
impl From<io::Error> for ConfigError {
    fn from(error: io::Error) -> Self {
        ConfigError::IoError { source: error }
    }
}

impl From<ParseError> for ConfigError {
    fn from(error: ParseError) -> Self {
        ConfigError::ParseError { source: error }
    }
}
```

This automatic conversion is what makes the `?` operator so powerful for building error handling chains.

### Where ? Can Be Used

The `?` operator can be used in:

1. Functions that return `Result<T, E>` when used with a `Result`
2. Functions that return `Option<T>` when used with an `Option`
3. Functions that return a type implementing the `Try` trait when used with a compatible type
4. The `main` function (which can return `Result<(), E>`)
5. Closures that return appropriate types

```rust
// In main
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = std::fs::read_to_string("config.txt")?;
    println!("Config: {}", config);
    Ok(())
}

// In closures
let reader = || -> Result<String, io::Error> {
    let content = std::fs::read_to_string("data.txt")?;
    Ok(content)
};
```

### Mixing Result and Option with ?

You can't directly mix `Result` and `Option` with the `?` operator in the same function unless you convert between them:

```rust
fn process_data() -> Result<i32, Error> {
    // Error: can't use ? on Option in a function that returns Result
    // let value = some_option?;

    // Instead, convert Option to Result first
    let value = some_option.ok_or(Error::ValueMissing)?;

    // Now continue with Result operations
    process_value(value)
}
```

### Error Context with ?

One limitation of the `?` operator is that it doesn't provide context about where the error occurred. You can address this by adding context before propagating:

```rust
fn read_config() -> Result<Config, ConfigError> {
    let content = std::fs::read_to_string("config.txt")
        .map_err(|e| ConfigError::IoError {
            source: e,
            file: "config.txt".to_string(),
            operation: "read".to_string(),
        })?;

    // Continue processing...
    Ok(Config::default())
}
```

Libraries like `anyhow` and `eyre` provide convenient ways to add context to errors.

### The try! Macro (Historical)

Before the `?` operator was introduced, Rust used the `try!` macro:

```rust
// Old way with try!
fn read_file() -> Result<String, io::Error> {
    let mut file = try!(File::open("data.txt"));
    let mut content = String::new();
    try!(file.read_to_string(&mut content));
    Ok(content)
}

// New way with ?
fn read_file() -> Result<String, io::Error> {
    let mut file = File::open("data.txt")?;
    let mut content = String::new();
    file.read_to_string(&mut content)?;
    Ok(content)
}
```

The `?` operator is more concise and expressive, and has completely replaced `try!` in modern Rust code.

### When Not to Use ?

While the `?` operator is very convenient, it's not always the best choice:

1. When you need different handling for different error types
2. When you want to provide specific context for each error
3. When you need to perform cleanup before propagating an error
4. When you're in a function that doesn't return a compatible type

In these cases, explicit `match` or `if let` expressions might be clearer:

```rust
fn process_file(path: &str) -> Result<(), Error> {
    let file = match File::open(path) {
        Ok(file) => file,
        Err(e) if e.kind() == io::ErrorKind::NotFound => {
            return Err(Error::FileNotFound { path: path.to_string() });
        }
        Err(e) if e.kind() == io::ErrorKind::PermissionDenied => {
            return Err(Error::AccessDenied { path: path.to_string() });
        }
        Err(e) => {
            return Err(Error::IoError { source: e });
        }
    };

    // Continue processing the file...
    Ok(())
}
```

## Combining Result and Option

Since `Result<T, E>` and `Option<T>` are both so common in Rust, you'll often need to convert between them or work with both in the same function. Let's explore some common patterns for this.

### Converting Between Result and Option

The standard library provides several methods for converting between these types:

#### From Option to Result

```rust
// Converting Option<T> to Result<T, E>
let opt: Option<i32> = Some(42);

// With a fixed error
let res: Result<i32, &str> = opt.ok_or("Value not present");

// With a computed error
let res: Result<i32, String> = opt.ok_or_else(|| format!("Missing value at timestamp: {}", now()));
```

#### From Result to Option

```rust
// Converting Result<T, E> to Option<T> (discarding the error)
let res: Result<i32, &str> = Ok(42);
let opt: Option<i32> = res.ok();

// Converting Result<T, E> to Option<E> (discarding the success value)
let res: Result<i32, &str> = Err("error");
let opt: Option<&str> = res.err();
```

### Handling Option Inside Result Functions

When working with a function that returns `Result` but you need to handle an `Option` internally:

```rust
fn process_item(id: u64) -> Result<ProcessedItem, ProcessError> {
    // find_item returns Option<Item>
    let item = find_item(id).ok_or(ProcessError::ItemNotFound(id))?;

    // Now we can work with the item, knowing it exists
    process(item)
}
```

### Handling Result Inside Option Functions

Similarly, when working with a function that returns `Option` but you need to handle a `Result` internally:

```rust
fn find_config_value(key: &str) -> Option<String> {
    // read_config returns Result<Config, ConfigError>
    let config = read_config().ok()?;

    // Get the value from the config if it exists
    config.get_value(key)
}
```

### Working with Complex Combinations

For more complex scenarios, you might encounter nested types like `Result<Option<T>, E>` or `Option<Result<T, E>>`:

```rust
// Working with Result<Option<T>, E>
fn find_user_by_email(email: &str) -> Result<Option<User>, DbError> {
    let connection = db_connect()?;

    // This query might succeed but find no user (Ok(None))
    // or it might fail (Err(DbError))
    connection.query_optional("SELECT * FROM users WHERE email = $1", &[&email])
}

// Using such a function
match find_user_by_email("alice@example.com") {
    Ok(Some(user)) => println!("Found user: {}", user.name),
    Ok(None) => println!("No user with that email"),
    Err(e) => println!("Database error: {}", e),
}
```

The `transpose` method can be useful for swapping the nesting order:

```rust
// Converting between Result<Option<T>, E> and Option<Result<T, E>>
let result_of_option: Result<Option<i32>, Error> = Ok(Some(42));
let option_of_result: Option<Result<i32, Error>> = result_of_option.transpose();

// Using transpose with iterators
let results: Vec<Result<Option<User>, DbError>> = emails
    .iter()
    .map(|email| find_user_by_email(email))
    .collect();

// Convert to Option<Result<User, DbError>> for each item
let options: Vec<Option<Result<User, DbError>>> = results
    .into_iter()
    .map(Result::transpose)
    .collect();

// Keep only the users that were found
let found_users_or_errors: Vec<Result<User, DbError>> = options
    .into_iter()
    .filter_map(|opt| opt)
    .collect();
```

### Using Combinators with Both Types

You can chain combinators for both types to create concise, expressive code:

```rust
fn process_data(input: &str) -> Result<i32, ProcessError> {
    // Parse the input as JSON
    let json = serde_json::from_str(input)
        .map_err(ProcessError::ParseError)?;

    // Extract the "user_id" field, which might not exist
    let user_id = json.get("user_id")
        .and_then(|v| v.as_u64())
        .ok_or(ProcessError::MissingField("user_id"))?;

    // Find the user, which might not exist
    let user = find_user(user_id)
        .ok_or(ProcessError::UserNotFound(user_id))?;

    // Check if the user has permission
    if !user.has_permission("process_data") {
        return Err(ProcessError::PermissionDenied {
            user_id,
            permission: "process_data".to_string(),
        });
    }

    // Process the data
    process_user_data(&user, &json)
}
```

This example shows how you can seamlessly transition between `Result` and `Option` using appropriate conversions and combinators.

## Type Conversions between Result and Option

Let's look more closely at the underlying mechanics of converting between `Result` and `Option`.

### The Relationship Between Result and Option

There's a formal relationship between `Result` and `Option`:

- `Option<T>` can be thought of as `Result<T, ()>` where the error type is unit (no additional information)
- `Result<T, E>` can be thought of as `Option<T>` with additional error information of type `E`

This relationship is why many of the methods have similar names and behaviors.

### Implementation Details

The conversions between these types are straightforward:

```rust
// Converting Option<T> to Result<T, E>
impl<T, E> From<Option<T>> for Result<T, E> where E: Default {
    fn from(option: Option<T>) -> Self {
        match option {
            Some(value) => Ok(value),
            None => Err(E::default()),
        }
    }
}

// There's no direct From implementation for Result -> Option
// because you would lose error information
```

### Using From Trait for Conversions

You can use the `From` trait for some conversions:

```rust
// Convert Option<T> to Result<T, E> where E: Default
let opt: Option<i32> = Some(42);
let res: Result<i32, String> = Result::from(opt);  // Ok(42)

let opt: Option<i32> = None;
let res: Result<i32, String> = Result::from(opt);  // Err(String::default())
```

### Custom Conversion Functions

For more control, you can write your own conversion functions:

```rust
fn option_to_result<T, E>(option: Option<T>, err: E) -> Result<T, E> {
    match option {
        Some(value) => Ok(value),
        None => Err(err),
    }
}

fn result_to_option<T, E>(result: Result<T, E>, handle_err: impl FnOnce(E)) -> Option<T> {
    match result {
        Ok(value) => Some(value),
        Err(e) => {
            handle_err(e);
            None
        }
    }
}

// Usage
let opt = Some(42);
let res = option_to_result(opt, "No value".to_string());

let res = Ok::<i32, String>(42);
let opt = result_to_option(res, |e| eprintln!("Error: {}", e));
```

### Practical Examples

Here's a real-world example combining both types in a web application context:

```rust
fn handle_user_request(req: Request) -> Response {
    // Extract the user ID from the request query string
    let user_id = req.query_param("user_id")
        // Convert Option<String> to Result<String, Error>
        .ok_or(Error::MissingParameter("user_id".to_string()))
        // Try to parse as u64, returning appropriate error
        .and_then(|id_str| id_str.parse::<u64>()
            .map_err(|_| Error::InvalidParameter("user_id must be a number".to_string()))
        );

    // Early return with error response if any of the above failed
    let user_id = match user_id {
        Ok(id) => id,
        Err(e) => return Response::error(e.to_string()),
    };

    // Try to find the user
    match find_user(user_id) {
        Some(user) => Response::json(user),
        None => Response::not_found(format!("User {} not found", user_id)),
    }
}
```

This example shows:

1. Converting from `Option` to `Result` to handle missing parameters
2. Chaining operations with `and_then` to transform the result
3. Converting back to explicit error handling with `match` to create responses
4. Using `Option` for the database lookup where "not found" is a normal case

## Custom Error Types

While the standard library provides many useful error types like `std::io::Error` and `std::fmt::Error`, for many applications you'll want to define your own custom error types. This allows you to provide rich, domain-specific error information.

### Defining a Basic Error Type

A common pattern is to define an enum with variants for different error categories:

```rust
#[derive(Debug)]
enum AppError {
    IoError(std::io::Error),
    ParseError(std::num::ParseIntError),
    ValidationError(String),
    NotFoundError { entity: String, id: String },
    DatabaseError { query: String, source: sqlx::Error },
}
```

### Implementing Error Traits

To make your error type work well with Rust's error handling ecosystem, implement the relevant traits:

```rust
use std::fmt;
use std::error::Error;

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::IoError(e) => write!(f, "I/O error: {}", e),
            AppError::ParseError(e) => write!(f, "Parse error: {}", e),
            AppError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            AppError::NotFoundError { entity, id } =>
                write!(f, "{} with ID {} not found", entity, id),
            AppError::DatabaseError { query, source } =>
                write!(f, "Database error in query '{}': {}", query, source),
        }
    }
}

impl Error for AppError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            AppError::IoError(e) => Some(e),
            AppError::ParseError(e) => Some(e),
            AppError::DatabaseError { source, .. } => Some(source),
            _ => None,
        }
    }
}
```

### Implementing From for Error Conversion

To make your error type work smoothly with the `?` operator, implement `From` for the error types you might need to convert:

```rust
impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        AppError::IoError(error)
    }
}

impl From<std::num::ParseIntError> for AppError {
    fn from(error: std::num::ParseIntError) -> Self {
        AppError::ParseError(error)
    }
}

impl From<sqlx::Error> for AppError {
    fn from(error: sqlx::Error) -> Self {
        AppError::DatabaseError {
            query: "unknown".to_string(),
            source: error,
        }
    }
}
```

With these implementations, you can now use the `?` operator with different error types:

```rust
fn process_config(path: &str) -> Result<Config, AppError> {
    let content = std::fs::read_to_string(path)?;  // IoError converts automatically
    let version = content.lines().next().unwrap().parse::<i32>()?;  // ParseError converts automatically

    if version < MIN_SUPPORTED_VERSION {
        return Err(AppError::ValidationError(format!(
            "Config version {} is not supported (min: {})",
            version, MIN_SUPPORTED_VERSION
        )));
    }

    // More processing...
    Ok(Config { /* ... */ })
}
```

### Contextual Errors

Sometimes you want to add context to errors without losing the original error information. A common pattern is to include both the context and the source error:

```rust
#[derive(Debug)]
enum AppError {
    // Other variants...

    FileReadError {
        path: String,
        source: std::io::Error,
    },

    ConfigParseError {
        content: String,
        source: serde_json::Error,
    },
}

// Using contextual errors
fn read_config(path: &str) -> Result<Config, AppError> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| AppError::FileReadError {
            path: path.to_string(),
            source: e,
        })?;

    serde_json::from_str(&content)
        .map_err(|e| AppError::ConfigParseError {
            content: content.clone(),
            source: e,
        })
}
```

### Error Enums vs. Trait Objects

For library crates where you don't know all possible errors upfront, or for applications where you want to minimize code duplication, you might use trait objects instead of enums:

```rust
// Using Box<dyn Error>
fn process_data() -> Result<(), Box<dyn Error + Send + Sync>> {
    // Can return any error type that implements Error
    let content = std::fs::read_to_string("data.txt")?;
    let value: i32 = content.trim().parse()?;

    if value < 0 {
        return Err(Box::new(ConfigError::new("Value cannot be negative")));
    }

    Ok(())
}
```

This is especially useful when you don't know all possible error types at compile time or when returning errors from plugins or dynamic code.

### Error Conversion with the Try Trait

At a lower level, the `Try` trait governs how the `?` operator works with error conversions. When you use `?` on a `Result<T, E1>` in a function returning `Result<U, E2>`, the error is converted using `From<E1> for E2`.

The implementation roughly looks like:

```rust
impl<T, E, U, F> Try for Result<T, E>
where
    E: From<F>,
{
    type Ok = T;
    type Error = F;

    fn into_result(self) -> Result<T, F> {
        self.map_err(Into::into)
    }

    fn from_error(e: F) -> Self {
        Err(e.into())
    }

    fn from_ok(v: T) -> Self {
        Ok(v)
    }
}
```

This is how the `?` operator seamlessly handles error type conversions.

## Error Trait and Error Conversion

The `std::error::Error` trait is the foundation of Rust's error handling ecosystem. Understanding this trait and how to convert between error types is essential for effective error handling.

### The Error Trait

The `Error` trait is defined in the standard library as:

```rust
pub trait Error: Debug + Display {
    fn source(&self) -> Option<&(dyn Error + 'static)> { ... }
    fn backtrace(&self) -> Option<&Backtrace> { ... }
    fn description(&self) -> &str { ... } // Deprecated
    fn cause(&self) -> Option<&dyn Error> { ... } // Deprecated
}
```

The main methods are:

1. `source()`: Returns the underlying cause of this error, if any
2. `backtrace()`: Returns a backtrace of where the error occurred (nightly feature)

The trait also requires implementations of `Debug` and `Display`.

### Implementing Error for Custom Types

Here's a complete implementation of the `Error` trait for a custom error type:

```rust
use std::error::Error;
use std::fmt::{self, Display, Formatter};

#[derive(Debug)]
struct ConfigError {
    message: String,
    source: Option<Box<dyn Error + 'static>>,
}

impl ConfigError {
    fn new(message: &str) -> Self {
        Self {
            message: message.to_string(),
            source: None,
        }
    }

    fn with_source<E: Error + 'static>(message: &str, source: E) -> Self {
        Self {
            message: message.to_string(),
            source: Some(Box::new(source)),
        }
    }
}

impl Display for ConfigError {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        write!(f, "Configuration error: {}", self.message)
    }
}

impl Error for ConfigError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        self.source.as_ref().map(|s| s.as_ref())
    }
}
```

### Error Type Conversion

There are several ways to convert between error types:

#### Using the From Trait

The most common approach is to implement the `From` trait:

```rust
impl From<std::io::Error> for ConfigError {
    fn from(error: std::io::Error) -> Self {
        ConfigError::with_source("I/O error while reading config", error)
    }
}

impl From<serde_json::Error> for ConfigError {
    fn from(error: serde_json::Error) -> Self {
        ConfigError::with_source("Failed to parse config JSON", error)
    }
}
```

With these implementations, you can use the `?` operator to automatically convert errors:

```rust
fn read_config(path: &str) -> Result<Config, ConfigError> {
    let content = std::fs::read_to_string(path)?;
    let config: Config = serde_json::from_str(&content)?;
    Ok(config)
}
```

#### Using map_err

For more control or when you can't implement `From`, use `map_err`:

```rust
fn read_config(path: &str) -> Result<Config, ConfigError> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| ConfigError::with_source(&format!("Failed to read config from {}", path), e))?;

    let config: Config = serde_json::from_str(&content)
        .map_err(|e| ConfigError::with_source("Failed to parse config JSON", e))?;

    Ok(config)
}
```

#### Context Pattern with Error Chains

A common pattern is building chains of errors that add context at each level:

```rust
fn load_user_config(user_id: u64) -> Result<UserConfig, ConfigError> {
    let path = format!("users/{}/config.json", user_id);

    // Each step adds more context to errors
    let content = std::fs::read_to_string(&path)
        .map_err(|e| ConfigError::with_source(
            &format!("Failed to read user {} config file", user_id), e
        ))?;

    let config: UserConfig = serde_json::from_str(&content)
        .map_err(|e| ConfigError::with_source(
            &format!("User {} has invalid config format", user_id), e
        ))?;

    if !config.is_valid() {
        return Err(ConfigError::new(
            &format!("User {} config validation failed", user_id)
        ));
    }

    Ok(config)
}
```

When reporting these errors, you can traverse the chain to provide detailed information:

```rust
fn report_error(err: &dyn Error) {
    // Print the main error
    eprintln!("Error: {}", err);

    // Print the chain of causes
    let mut source = err.source();
    while let Some(err) = source {
        eprintln!("Caused by: {}", err);
        source = err.source();
    }
}
```

### Dynamic Error Types with Box<dyn Error>

For flexibility, you can use trait objects with `Box<dyn Error>`:

```rust
fn process_data() -> Result<(), Box<dyn Error>> {
    // Can return any error type that implements Error
    let content = std::fs::read_to_string("data.txt")?;
    let value: i32 = content.trim().parse()?;

    if value < 0 {
        return Err(Box::new(ConfigError::new("Value cannot be negative")));
    }

    Ok(())
}
```

This is especially useful when you don't know all possible error types at compile time or when returning errors from plugins or dynamic code.

### Error Conversion with the Try Trait

At a lower level, the `Try` trait governs how the `?` operator works with error conversions. When you use `?` on a `Result<T, E1>` in a function returning `Result<U, E2>`, the error is converted using `From<E1> for E2`.

The implementation roughly looks like:

```rust
impl<T, E, U, F> Try for Result<T, E>
where
    E: From<F>,
{
    type Ok = T;
    type Error = F;

    fn into_result(self) -> Result<T, F> {
        self.map_err(Into::into)
    }

    fn from_error(e: F) -> Self {
        Err(e.into())
    }

    fn from_ok(v: T) -> Self {
        Ok(v)
    }
}
```

This is how the `?` operator seamlessly handles error type conversions.

## The Try Trait

The `Try` trait is an advanced feature of Rust's error handling system that powers the `?` operator. Understanding this trait helps you see how Rust's error handling works under the hood and allows you to create your own types that work with `?`.

### History and Evolution

The `Try` trait has evolved significantly since its introduction:

- In Rust 1.13, the `?` operator was introduced as syntactic sugar for the `try!` macro
- In Rust 1.39, the initial `Try` trait was stabilized
- In Rust 1.53, the trait was redesigned to be more general

The current version is designed to work not just with `Result` and `Option`, but with any type that represents a computation that might fail.

### Current Definition

As of Rust 1.53, the `Try` trait is defined as:

```rust
pub trait Try: FromResidual {
    type Output;
    type Residual;

    fn from_output(output: Self::Output) -> Self;
    fn branch(self) -> ControlFlow<Self::Residual, Self::Output>;
}

pub trait FromResidual<R = <Self as Try>::Residual> {
    fn from_residual(residual: R) -> Self;
}
```

Where:

- `Output` is the success type
- `Residual` is the error or "residual" type
- `from_output` creates a success value
- `branch` extracts either a success or failure
- `from_residual` converts a failure from another type

### How ? Uses Try

When you use the `?` operator on an expression of type `T` where `T: Try`, the compiler expands it to something like:

```rust
match Try::branch(expr) {
    ControlFlow::Continue(val) => val,
    ControlFlow::Break(residual) => return FromResidual::from_residual(residual),
}
```

This is how `?` works with both `Result` and `Option`.

### Implementing Try for Custom Types

While most users won't need to implement `Try` directly, here's an example of how you might do it for a custom result type:

```rust
enum MyResult<T, E> {
    Success(T),
    Failure(E),
}

impl<T, E> Try for MyResult<T, E> {
    type Output = T;
    type Residual = Result<Infallible, E>;

    fn from_output(output: Self::Output) -> Self {
        MyResult::Success(output)
    }

    fn branch(self) -> ControlFlow<Self::Residual, Self::Output> {
        match self {
            MyResult::Success(t) => ControlFlow::Continue(t),
            MyResult::Failure(e) => ControlFlow::Break(Result::Err(e)),
        }
    }
}

impl<T, E, F: From<E>> FromResidual<Result<Infallible, E>> for MyResult<T, F> {
    fn from_residual(residual: Result<Infallible, E>) -> Self {
        match residual {
            Err(e) => MyResult::Failure(From::from(e)),
            _ => unreachable!(),
        }
    }
}
```

With this implementation, you could use `?` with your custom result type.

## Error Reporting Best Practices

Effective error reporting is crucial for building maintainable applications. Here are some best practices for error handling and reporting in Rust.

### Designing Errors for Users

When designing error messages, consider who will be consuming them:

1. **End Users**: Need clear, actionable messages without technical details
2. **Developers**: Need detailed information to diagnose and fix issues
3. **Operations/SRE**: Need structured data for monitoring and alerting

```rust
impl Display for AppError {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        match self {
            AppError::FileNotFound { path } =>
                write!(f, "The file '{}' could not be found. Please check that the file exists and try again.", path),

            AppError::PermissionDenied { path } =>
                write!(f, "You don't have permission to access '{}'. Please check your file permissions.", path),

            // More variants...
        }
    }
}
```

### Contextual Errors

Always provide context in your errors:

```rust
fn process_config(path: &str) -> Result<Config, ConfigError> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| ConfigError::FileReadError {
            path: path.to_string(),
            operation: "read".to_string(),
            source: e,
        })?;

    // More processing...
    Ok(Config::default())
}
```

Libraries like `anyhow` provide convenient methods for this:

```rust
use anyhow::{Context, Result};

fn process_config(path: &str) -> Result<Config> {
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("Failed to read config file: {}", path))?;

    // More processing...
    Ok(Config::default())
}
```

### Structured Logging

For applications, combine error handling with structured logging:

```rust
use serde::Serialize;
use log::{error, info, warn};

#[derive(Serialize)]
struct ErrorLog {
    error_type: String,
    message: String,
    user_id: Option<String>,
    request_id: String,
    context: serde_json::Value,
}

fn log_error(err: &AppError, request_id: &str, user_id: Option<&str>) {
    let context = match err {
        AppError::FileNotFound { path } =>
            serde_json::json!({ "path": path }),

        AppError::DatabaseError { query, .. } =>
            serde_json::json!({ "query": query }),

        // More variants...
        _ => serde_json::json!({}),
    };

    let log = ErrorLog {
        error_type: format!("{:?}", err),
        message: err.to_string(),
        user_id: user_id.map(String::from),
        request_id: request_id.to_string(),
        context,
    };

    error!("{}", serde_json::to_string(&log).unwrap());
}
```

### Error Categorization

Categorize errors to help with handling them appropriately:

```rust
enum ErrorCategory {
    UserError,      // User did something wrong
    TransientError, // Temporary failure, can retry
    SystemError,    // System-level issue
    ProgramError,   // Bug in the program
}

impl AppError {
    fn category(&self) -> ErrorCategory {
        match self {
            AppError::InvalidInput { .. } => ErrorCategory::UserError,
            AppError::NetworkTimeout { .. } => ErrorCategory::TransientError,
            AppError::DiskFull { .. } => ErrorCategory::SystemError,
            AppError::InternalError { .. } => ErrorCategory::ProgramError,
            // More variants...
        }
    }

    fn is_retryable(&self) -> bool {
        matches!(self.category(), ErrorCategory::TransientError)
    }
}
```

### API Design for Errors

When designing APIs, make error handling easy for consumers:

1. Return rich error types that can be easily inspected
2. Document all possible error conditions
3. Provide helper methods for common error handling patterns

```rust
// Good API design with helper methods
impl Config {
    pub fn load(path: &str) -> Result<Self, ConfigError> {
        // Implementation...
    }

    // Helper that loads with defaults for missing fields
    pub fn load_with_defaults(path: &str) -> Result<Self, ConfigError> {
        Self::load(path).or_else(|e| {
            if let ConfigError::FileNotFound { .. } = e {
                Ok(Config::default())
            } else {
                Err(e)
            }
        })
    }

    // Helper for fallback configs
    pub fn load_with_fallback(primary: &str, fallback: &str) -> Result<Self, ConfigError> {
        Self::load(primary).or_else(|_| Self::load(fallback))
    }
}
```

### Error Documentation

Document your error types thoroughly:

````rust
/// Errors that can occur when working with configurations.
///
/// # Examples
///
/// ```
/// use myapp::ConfigError;
/// use std::fmt;
///
/// fn print_error(e: &ConfigError) {
///     println!("Configuration error: {}", e);
/// }
/// ```
#[derive(Debug)]
pub enum ConfigError {
    /// The configuration file could not be found.
    ///
    /// This error occurs when the specified path does not exist or is not accessible.
    FileNotFound {
        /// The path that was attempted to be read.
        path: String,
    },

    /// The configuration file could not be parsed.
    ///
    /// This error occurs when the file exists but its format is invalid.
    ParseError {
        /// The error returned by the parser.
        source: serde_json::Error,
        /// The content that failed to parse.
        content: String,
    },

    // More variants...
}
````

## 🔨 Project: File Processing Utility

Let's build a file processing utility that demonstrates comprehensive error handling using `Result` and `Option`. This project will process CSV files, performing various transformations and validations.

### Project Goals

1. Read and parse CSV files
2. Validate data according to configurable rules
3. Transform and process the data
4. Output results in various formats
5. Implement comprehensive error handling throughout

### Step 1: Project Setup

Create a new Rust project:

```bash
cargo new file_processor
cd file_processor
```

Add dependencies to `Cargo.toml`:

```toml
[dependencies]
csv = "1.1"
serde = { version = "1.0", features = ["derive"] }
thiserror = "1.0"
anyhow = "1.0"
chrono = "0.4"
clap = { version = "3.0", features = ["derive"] }
```

### Step 2: Define Error Types

First, let's define our error types:

```rust
// src/error.rs
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ProcessorError {
    #[error("I/O error: {source}")]
    IoError {
        #[from]
        source: std::io::Error,
        #[source]
        path: Option<PathBuf>,
    },

    #[error("CSV error: {source}")]
    CsvError {
        #[from]
        source: csv::Error,
    },

    #[error("Parse error: Could not parse {field} as {target_type} in row {row}")]
    ParseError {
        field: String,
        target_type: String,
        row: usize,
        value: String,
    },

    #[error("Validation error: {message} in row {row}")]
    ValidationError {
        message: String,
        row: usize,
    },

    #[error("Missing field: {field} in row {row}")]
    MissingField {
        field: String,
        row: usize,
    },

    #[error("No records found in the input file")]
    EmptyInput,

    #[error("Configuration error: {message}")]
    ConfigError {
        message: String,
    },
}

// Add context to IO errors
impl ProcessorError {
    pub fn with_path(mut self, path: impl Into<PathBuf>) -> Self {
        if let ProcessorError::IoError { ref mut path, .. } = self {
            *path = Some(path.into());
        }
        self
    }
}
```

### Step 3: Define Data Models

Next, let's define our data models:

```rust
// src/models.rs
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use crate::error::ProcessorError;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Record {
    pub id: String,
    pub name: Option<String>,
    pub value: Option<String>,
    pub date: Option<String>,
}

#[derive(Debug, Clone, Copy)]
pub enum FieldType {
    String,
    Integer,
    Float,
    Date,
}

impl FromStr for FieldType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "string" => Ok(FieldType::String),
            "integer" | "int" => Ok(FieldType::Integer),
            "float" | "decimal" | "number" => Ok(FieldType::Float),
            "date" => Ok(FieldType::Date),
            _ => Err(format!("Unknown field type: {}", s)),
        }
    }
}

#[derive(Debug, Clone)]
pub struct ValidationRule {
    pub field: String,
    pub field_type: FieldType,
    pub required: bool,
}

impl ValidationRule {
    pub fn new(field: &str, field_type: FieldType, required: bool) -> Self {
        Self {
            field: field.to_string(),
            field_type,
            required,
        }
    }

    pub fn validate(&self, record: &Record, row: usize) -> Result<(), ProcessorError> {
        let value = match self.field.as_str() {
            "id" => Some(&record.id),
            "name" => record.name.as_ref(),
            "value" => record.value.as_ref(),
            "date" => record.date.as_ref(),
            _ => return Err(ProcessorError::ConfigError {
                message: format!("Unknown field in validation rule: {}", self.field),
            }),
        };

        // Check if required field is missing
        if self.required && (value.is_none() || value.unwrap().is_empty()) {
            return Err(ProcessorError::MissingField {
                field: self.field.clone(),
                row,
            });
        }

        // If field is present but empty and not required, it's valid
        if let Some(value) = value {
            if value.is_empty() {
                return Ok(());
            }

            // Validate type
            match self.field_type {
                FieldType::String => Ok(()), // All strings are valid
                FieldType::Integer => {
                    value.parse::<i64>().map_err(|_| {
                        ProcessorError::ParseError {
                            field: self.field.clone(),
                            target_type: "integer".to_string(),
                            row,
                            value: value.to_string(),
                        }
                    })?;
                    Ok(())
                },
                FieldType::Float => {
                    value.parse::<f64>().map_err(|_| {
                        ProcessorError::ParseError {
                            field: self.field.clone(),
                            target_type: "float".to_string(),
                            row,
                            value: value.to_string(),
                        }
                    })?;
                    Ok(())
                },
                FieldType::Date => {
                    chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d").map_err(|_| {
                        ProcessorError::ParseError {
                            field: self.field.clone(),
                            target_type: "date (YYYY-MM-DD)".to_string(),
                            row,
                            value: value.to_string(),
                        }
                    })?;
                    Ok(())
                },
            }
        } else {
            // Field is not present but not required
            Ok(())
        }
    }
}
```

### Step 4: Implement the Processor

Now, let's implement the core processor:

```rust
// src/processor.rs
use std::path::Path;
use std::fs::File;
use crate::error::ProcessorError;
use crate::models::{Record, ValidationRule};
use anyhow::{Result, Context};
use csv::{Reader, Writer};

pub struct Processor {
    validation_rules: Vec<ValidationRule>,
}

impl Processor {
    pub fn new() -> Self {
        Self {
            validation_rules: Vec::new(),
        }
    }

    pub fn add_validation_rule(&mut self, rule: ValidationRule) {
        self.validation_rules.push(rule);
    }

    pub fn process_file<P: AsRef<Path>>(&self, input_path: P, output_path: Option<P>) -> Result<ProcessStats, ProcessorError> {
        // Open the input file
        let input_file = File::open(&input_path)
            .map_err(|e| ProcessorError::IoError { source: e, path: None })
            .map_err(|e| e.with_path(input_path.as_ref()))?;

        let mut reader = csv::Reader::from_reader(input_file);

        // Process records
        let mut processed_records = Vec::new();
        let mut error_count = 0;
        let mut success_count = 0;
        let mut current_row = 0;

        for result in reader.deserialize() {
            current_row += 1;

            // Parse record
            let record: Record = result.map_err(|e| ProcessorError::CsvError { source: e })?;

            // Validate record
            match self.validate_record(&record, current_row) {
                Ok(()) => {
                    // Process record (in a real application, we might transform it here)
                    processed_records.push(record);
                    success_count += 1;
                },
                Err(e) => {
                    // Log the error but continue processing
                    eprintln!("Error in row {}: {}", current_row, e);
                    error_count += 1;
                }
            }
        }

        // Check if we processed any records
        if processed_records.is_empty() {
            return Err(ProcessorError::EmptyInput);
        }

        // Write output if requested
        if let Some(output_path) = output_path {
            let output_file = File::create(&output_path)
                .map_err(|e| ProcessorError::IoError { source: e, path: None })
                .map_err(|e| e.with_path(output_path.as_ref()))?;

            let mut writer = Writer::from_writer(output_file);

            for record in &processed_records {
                writer.serialize(record)
                    .map_err(|e| ProcessorError::CsvError { source: e })?;
            }

            writer.flush()
                .map_err(|e| ProcessorError::IoError {
                    source: e,
                    path: Some(output_path.as_ref().to_path_buf())
                })?;
        }

        Ok(ProcessStats {
            total_records: current_row,
            successful_records: success_count,
            error_records: error_count,
        })
    }

    fn validate_record(&self, record: &Record, row: usize) -> Result<(), ProcessorError> {
        for rule in &self.validation_rules {
            rule.validate(record, row)?;
        }
        Ok(())
    }
}

#[derive(Debug)]
pub struct ProcessStats {
    pub total_records: usize,
    pub successful_records: usize,
    pub error_records: usize,
}
```

### Step 5: Create the CLI Interface

Let's create a command-line interface:

```rust
// src/main.rs
mod error;
mod models;
mod processor;

use clap::Parser;
use std::path::PathBuf;
use anyhow::{Result, Context};
use models::{FieldType, ValidationRule};
use processor::Processor;

#[derive(Parser, Debug)]
#[clap(name = "file_processor", about = "Process and validate CSV files")]
struct Args {
    /// Input CSV file to process
    #[clap(short, long)]
    input: PathBuf,

    /// Output CSV file (optional)
    #[clap(short, long)]
    output: Option<PathBuf>,

    /// Validate 'id' field as a string (required)
    #[clap(long)]
    validate_id: bool,

    /// Validate 'name' field as a string
    #[clap(long)]
    validate_name: bool,

    /// Validate 'value' field as a number
    #[clap(long)]
    validate_value: bool,

    /// Validate 'date' field as a date (YYYY-MM-DD)
    #[clap(long)]
    validate_date: bool,
}

fn main() -> Result<()> {
    let args = Args::parse();

    // Create processor with validation rules
    let mut processor = Processor::new();

    if args.validate_id {
        processor.add_validation_rule(ValidationRule::new("id", FieldType::String, true));
    }

    if args.validate_name {
        processor.add_validation_rule(ValidationRule::new("name", FieldType::String, false));
    }

    if args.validate_value {
        processor.add_validation_rule(ValidationRule::new("value", FieldType::Float, false));
    }

    if args.validate_date {
        processor.add_validation_rule(ValidationRule::new("date", FieldType::Date, false));
    }

    // Process the file
    match processor.process_file(&args.input, args.output.as_ref()) {
        Ok(stats) => {
            println!("Processing complete!");
            println!("Total records: {}", stats.total_records);
            println!("Successfully processed: {}", stats.successful_records);
            println!("Records with errors: {}", stats.error_records);
            Ok(())
        },
        Err(e) => {
            // Use anyhow to add context to our custom errors
            Err(e).context(format!("Failed to process file '{}'", args.input.display()))
        }
    }
}
```

### Step 6: Test the Processor

To test our processor, let's create a sample CSV file:

```bash
echo 'id,name,value,date
1,Alice,42.5,2022-01-15
2,Bob,invalid,2022-02-20
3,Charlie,,not-a-date
4,,100,2022-03-10
,Missing ID,50,2022-04-01' > sample.csv
```

Then run our processor:

```bash
cargo run -- --input sample.csv --output processed.csv --validate-id --validate-value --validate-date
```

You should see output like:

```
Error in row 2: Parse error: Could not parse value as float in row 2
Error in row 3: Parse error: Could not parse date as date (YYYY-MM-DD) in row 3
Error in row 5: Missing field: id in row 5
Processing complete!
Total records: 5
Successfully processed: 2
Records with errors: 3
```

### Step 7: Enhancing Error Reporting

Let's add more context to our errors:

```rust
// Add to src/processor.rs
pub fn process_file_with_context<P: AsRef<Path>>(&self, input_path: P, output_path: Option<P>) -> anyhow::Result<ProcessStats> {
    self.process_file(&input_path, output_path.as_ref())
        .with_context(|| format!("Failed to process file '{}'", input_path.as_ref().display()))
}
```

And update the main function:

```rust
// In main.rs
fn main() -> anyhow::Result<()> {
    // ...existing code...

    // Process the file with additional context
    match processor.process_file_with_context(&args.input, args.output.as_ref()) {
        Ok(stats) => {
            println!("Processing complete!");
            println!("Total records: {}", stats.total_records);
            println!("Successfully processed: {}", stats.successful_records);
            println!("Records with errors: {}", stats.error_records);
            Ok(())
        },
        Err(e) => {
            eprintln!("Error: {}", e);

            // Print the error chain
            let mut source = e.source();
            while let Some(cause) = source {
                eprintln!("Caused by: {}", cause);
                source = cause.source();
            }

            Err(e)
        }
    }
}
```

This example demonstrates:

1. Custom error types with `thiserror`
2. Adding context to errors
3. Converting between error types
4. Validation rules that return specific errors
5. Handling errors without stopping processing
6. Detailed error reporting with source chains
7. Using `anyhow` for additional context

The file processor showcases how Rust's error handling can be used to build robust, reliable applications that gracefully handle various error conditions.

## Summary

In this chapter, we've explored Rust's approach to recoverable error handling through the `Result<T, E>` and `Option<T>` types. We've learned:

- How to work with `Result` and `Option` to handle operations that might fail
- Functional-style combinators like `map`, `and_then`, and `unwrap_or` that transform and chain operations
- The powerful `?` operator for clean error propagation
- Techniques for converting between `Result` and `Option`
- How to design and implement custom error types
- The `Error` trait and error conversion mechanisms
- The `Try` trait that powers the `?` operator
- Best practices for error reporting and handling

By using these patterns, you can write code that gracefully handles errors, provides clear diagnostics, and maintains the reliability and safety guarantees that Rust is known for. Effective error handling is a critical aspect of robust software, and Rust's approach encourages you to think about and handle potential failures explicitly, leading to more reliable applications.

## Exercises

1. **Enhanced File Processor**: Extend the file processing utility to support different input and output formats (JSON, YAML, etc.).

2. **Custom Result Type**: Create your own `Result`-like type that includes additional context such as timestamps or call site information.

3. **Error Context Library**: Implement a small library for adding layered context to errors, similar to `anyhow` but with your own design.

4. **Result Collector**: Create a utility that collects results from multiple operations, categorizing them as successes or specific error types.

5. **Error Handling Benchmark**: Compare the performance of different error handling approaches (returning early, using combinators, using `?`, etc.).

## Further Reading

- [Rust By Example: Error Handling](https://doc.rust-lang.org/rust-by-example/error.html) - Practical examples of error handling in Rust
- [The Rust Programming Language: Error Handling](https://doc.rust-lang.org/book/ch09-00-error-handling.html) - Comprehensive guide to Rust's error handling
- [Rust RFC 3058: Try Trait v2](https://rust-lang.github.io/rfcs/3058-try-trait-v2.html) - The RFC for the redesigned Try trait
- [Error Handling in Rust](https://blog.burntsushi.net/rust-error-handling/) - A deep dive by Andrew Gallant
- [anyhow crate](https://docs.rs/anyhow/) - Flexible error handling with context
- [thiserror crate](https://docs.rs/thiserror/) - Derive macros for custom error types
- [Error Handling Patterns in Rust](https://nick.groenen.me/posts/rust-error-handling/) - Common patterns and practices
