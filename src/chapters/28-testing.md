# Chapter 28: Writing Tests in Rust

## Introduction

Testing is an essential practice in software development that helps ensure your code behaves as expected and continues to work correctly as it evolves. Rust takes testing seriously, with built-in support for various testing methodologies directly integrated into the language and its tooling.

Unlike many languages where testing is an afterthought, Rust's approach to testing is both comprehensive and ergonomic. The compiler, cargo, and standard library all work together to make writing and running tests straightforward and efficient. This first-class support reflects Rust's broader commitment to producing reliable, maintainable software.

In this chapter, we'll explore Rust's testing ecosystem in depth. We'll begin with basic unit testing and gradually progress to more advanced testing techniques. You'll learn how to structure tests, mock dependencies, perform property-based testing, and measure the performance of your code through benchmarking. By the end of this chapter, you'll have the knowledge and tools to build robust test suites that give you confidence in your Rust code.

Whether you're developing a small library or a complex application, the testing practices covered in this chapter will help you catch bugs early, document your code's behavior, and maintain a high standard of quality as your project grows.

## Testing Philosophy in Rust

Before diving into the technical aspects of testing in Rust, it's worth understanding the philosophy that shapes Rust's approach to testing.

### Safety Beyond the Compiler

Rust's compiler provides strong guarantees about memory safety and thread safety, eliminating entire classes of bugs at compile time. However, logical errors, incorrect business rules, and unexpected edge cases can still exist in perfectly valid Rust code. Testing complements the compiler's checks by verifying that your code's behavior matches your intentions.

### Testing as Documentation

Tests serve as executable documentation, demonstrating how code is meant to be used and what results to expect. This is particularly valuable in Rust, where strong type safety and ownership rules can make the correct usage patterns less immediately obvious to newcomers.

### The Testing Spectrum

Rust supports a spectrum of testing approaches:

1. **Unit Tests**: Verify that individual components work in isolation
2. **Integration Tests**: Ensure that components work together correctly
3. **Documentation Tests**: Validate code examples in documentation
4. **Property-Based Tests**: Check that properties of the code hold for many inputs
5. **Benchmarks**: Measure and optimize performance

Each approach has its place in a comprehensive testing strategy.

### The Rust Testing Mindset

The Rust community generally embraces several testing principles:

1. **Test-Driven Development (TDD)**: Many Rustaceans practice writing tests before implementing features.
2. **Fail Fast**: Tests should fail clearly and early when something goes wrong.
3. **Determinism**: Tests should produce the same results consistently.
4. **Isolation**: Tests should not depend on each other or external state.
5. **Completeness**: Aim for high test coverage, especially around error handling and edge cases.

### When to Test

In Rust, testing is integrated into the development workflow:

- **During Development**: Write tests alongside or before code to clarify requirements.
- **Before Refactoring**: Ensure you have tests in place before modifying existing code.
- **After Bug Fixes**: Add tests that reproduce bugs to prevent regressions.
- **When Publishing**: Verify that your crate works correctly before sharing it with others.

With this philosophy in mind, let's explore how Rust makes testing practical and effective.

## Unit Tests and the Test Module

Unit tests verify that individual components of your code work correctly in isolation. In Rust, unit tests are typically placed in the same file as the code they test, inside a special test module.

### Basic Unit Test Structure

Here's a simple example of a unit test in Rust:

```rust
// A function we want to test
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

// The test module
#[cfg(test)]
mod tests {
    // Import the parent module's items
    use super::*;

    // A test function
    #[test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);
        assert_eq!(add(-1, 1), 0);
        assert_eq!(add(0, 0), 0);
    }
}
```

Let's break down the key elements:

1. **`#[cfg(test)]`**: This attribute tells the compiler to only include this module when running tests, not when building your program for regular use.

2. **`mod tests`**: Convention is to name the test module `tests`, though you can use any name.

3. **`use super::*`**: This imports all items from the parent module, making the functions you want to test available within the test module.

4. **`#[test]`**: This attribute marks a function as a test. When you run `cargo test`, Rust will find and execute all functions marked with this attribute.

5. **`assert_eq!`**: A macro that checks if two values are equal. If they're not, the test fails with a helpful error message.

### Running Tests

To run your tests, use the `cargo test` command:

```bash
$ cargo test
   Compiling myproject v0.1.0 (/path/to/myproject)
    Finished test [unoptimized + debuginfo] target(s) in 0.57s
     Running unittests src/lib.rs (target/debug/deps/myproject-1a2b3c4d)

running 1 test
test tests::test_add ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.0s
```

This command compiles your code in test mode and runs all the test functions. The output shows which tests passed, which failed, and how long they took to run.

### Assertion Macros

Rust provides several assertion macros for different testing needs:

1. **`assert!`**: Checks that a boolean expression is true.

```rust
#[test]
fn test_positive() {
    let result = 42;
    assert!(result > 0);
}
```

2. **`assert_eq!`**: Checks that two expressions are equal.

```rust
#[test]
fn test_equality() {
    let result = add(2, 2);
    assert_eq!(result, 4);
}
```

3. **`assert_ne!`**: Checks that two expressions are not equal.

```rust
#[test]
fn test_inequality() {
    let result = add(2, 3);
    assert_ne!(result, 4);
}
```

4. **`debug_assert!`**, **`debug_assert_eq!`**, and **`debug_assert_ne!`**: These work the same as their non-debug counterparts but are only enabled in debug builds, not in release builds.

### Custom Error Messages

All assertion macros accept an optional format string and arguments to provide a custom error message when the assertion fails:

```rust
#[test]
fn test_with_message() {
    let a = 3;
    let b = 5;
    let expected = 8;
    let result = add(a, b);

    assert_eq!(
        result,
        expected,
        "Adding {} and {} should equal {}, but got {}",
        a, b, expected, result
    );
}
```

This helps make test failures more informative and easier to debug.

### Testing for Panics

Sometimes, you want to verify that your code panics under certain conditions. The `#[should_panic]` attribute lets you test this behavior:

```rust
pub fn divide(a: i32, b: i32) -> i32 {
    if b == 0 {
        panic!("Cannot divide by zero");
    }
    a / b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[should_panic]
    fn test_divide_by_zero() {
        divide(10, 0);
    }
}
```

For more specific testing, you can check that the panic message contains expected text:

```rust
#[test]
#[should_panic(expected = "Cannot divide by zero")]
fn test_divide_by_zero_message() {
    divide(10, 0);
}
```

This test will only pass if the function panics with a message containing the specified text.

### Result-Based Tests

Instead of using assertion macros, you can return a `Result<(), E>` from your test function. This allows for a more concise style, especially when testing functions that return `Result`:

```rust
fn parse_config(config: &str) -> Result<u32, String> {
    // Implementation
    if config.is_empty() {
        return Err("Empty configuration".to_string());
    }
    Ok(42)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_config() -> Result<(), String> {
        let config = "valid_setting=true";
        let result = parse_config(config)?;
        assert_eq!(result, 42);
        Ok(())
    }

    #[test]
    fn test_empty_config() -> Result<(), String> {
        let result = parse_config("");
        assert!(result.is_err());
        Ok(())
    }
}
```

In this style, the test passes if it returns `Ok(())` and fails if it returns an `Err` or panics.

### Ignoring Tests

Sometimes you might want to temporarily disable a test without removing it. The `#[ignore]` attribute lets you do this:

```rust
#[test]
#[ignore]
fn expensive_test() {
    // A test that takes a long time to run
}
```

To run only the ignored tests:

```bash
$ cargo test -- --ignored
```

To run all tests, including ignored ones:

```bash
$ cargo test -- --include-ignored
```

### Filtering Tests

You can run a subset of tests by providing a pattern to match against test names:

```bash
$ cargo test add  # Runs all tests with "add" in their name
```

For more complex filtering, you can use the `--exact` flag:

```bash
$ cargo test test_add -- --exact  # Runs only the test named "test_add"
```

### Private Functions

In Rust, you can test private functions directly from the test module, which is a child of the module containing the private functions:

```rust
// A private function
fn internal_add(a: i32, b: i32) -> i32 {
    a + b
}

// Public function that uses the private function
pub fn calculate(a: i32, b: i32) -> i32 {
    internal_add(a, b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_internal_add() {
        // Can access internal_add because tests is a child module
        assert_eq!(internal_add(3, 4), 7);
    }
}
```

This ability to test private functions directly is a distinctive feature of Rust's testing approach.

## Test Organization

As your codebase grows, organizing your tests becomes increasingly important. Well-structured tests are easier to maintain, faster to run, and provide clearer feedback when they fail. Let's explore various strategies for organizing tests in Rust.

### Test Modules and Files

For small to medium-sized projects, keeping tests in a `tests` module within each source file is usually sufficient. However, as the number of tests grows, you might want to split them into multiple modules or files.

#### Multiple Test Modules

You can organize related tests into separate modules within your test module:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    mod basic_operations {
        use super::*;

        #[test]
        fn test_add() {
            assert_eq!(add(2, 3), 5);
        }

        #[test]
        fn test_subtract() {
            assert_eq!(subtract(5, 2), 3);
        }
    }

    mod edge_cases {
        use super::*;

        #[test]
        fn test_zero() {
            assert_eq!(add(0, 0), 0);
        }

        #[test]
        fn test_negative() {
            assert_eq!(add(-1, 1), 0);
        }
    }
}
```

This approach keeps related tests together while providing logical separation.

#### Separate Test Files

For very large modules, you might want to move tests to separate files in the same directory:

```
src/
├── lib.rs
├── math.rs
└── math_tests.rs
```

In `math_tests.rs`:

```rust
#[cfg(test)]
mod math_tests {
    use crate::math::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);
    }

    // More tests...
}
```

This keeps your main code files cleaner but requires you to be careful about visibility and imports.

### Integration Tests

While unit tests focus on testing individual components in isolation, integration tests verify that different parts of your code work together correctly. In Rust, integration tests are placed in a separate `tests` directory at the root of your project:

```
my_project/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   └── math.rs
└── tests/
    ├── integration_test.rs
    └── utils/
        └── helpers.rs
```

Each file in the `tests` directory (except those in subdirectories) is compiled as a separate crate that depends on your main crate. This ensures that you're testing your code as if it were being used by an external consumer.

Here's an example integration test:

```rust
// tests/integration_test.rs

use my_project; // Import your crate

#[test]
fn test_math_operations() {
    let result = my_project::calculate_complex_result(10, 5);
    assert_eq!(result, 42);
}
```

Running `cargo test` will execute both unit tests and integration tests. To run only integration tests:

```bash
$ cargo test --test integration_test
```

#### Helper Modules in Integration Tests

Files in subdirectories of the `tests` directory are not treated as test crates, which makes them perfect for shared helper functions:

```rust
// tests/utils/helpers.rs

pub fn setup_test_data() -> Vec<i32> {
    vec![1, 2, 3, 4, 5]
}
```

You can use these helpers in your integration tests:

```rust
// tests/integration_test.rs

mod utils;

use my_project;
use utils::helpers::setup_test_data;

#[test]
fn test_with_helpers() {
    let data = setup_test_data();
    let result = my_project::process_data(&data);
    assert_eq!(result, 15);
}
```

### Test Conventions and Naming

Consistent naming and organization make your tests easier to understand and maintain:

1. **Test Function Names**: Name your test functions clearly and descriptively. Common patterns include:

   - `test_<function_name>`: For testing basic functionality
   - `test_<function_name>_<scenario>`: For testing specific scenarios
   - `test_<behavior_description>`: For testing more complex behaviors

2. **Arrange-Act-Assert Pattern**: Structure the content of your test functions using the AAA pattern:
   - **Arrange**: Set up the test data and environment
   - **Act**: Call the function or code being tested
   - **Assert**: Verify the results

```rust
#[test]
fn test_process_data_with_empty_input() {
    // Arrange
    let data = Vec::<i32>::new();

    // Act
    let result = process_data(&data);

    // Assert
    assert_eq!(result, 0);
}
```

3. **Group Related Tests**: Keep tests for related functionality together, either in the same module or using naming conventions.

### Test Data Management

Managing test data effectively is crucial for maintainable tests:

#### Constants and Shared Setup

For data used across multiple tests, consider defining constants or setup functions:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    // Shared test data
    const TEST_DATA: [i32; 5] = [1, 2, 3, 4, 5];

    fn setup_complex_data() -> Vec<String> {
        vec!["a".to_string(), "b".to_string(), "c".to_string()]
    }

    #[test]
    fn test_sum() {
        let result = sum(&TEST_DATA);
        assert_eq!(result, 15);
    }

    #[test]
    fn test_process_strings() {
        let data = setup_complex_data();
        let result = process_strings(&data);
        assert_eq!(result, "abc");
    }
}
```

#### Using Fixtures

For more complex test environments, you might need to create and tear down resources for each test. While Rust doesn't have built-in fixtures like some testing frameworks, you can implement similar patterns:

```rust
struct TestFixture {
    data: Vec<i32>,
    temp_file: std::path::PathBuf,
}

impl TestFixture {
    fn new() -> Self {
        let data = vec![1, 2, 3, 4, 5];
        let temp_file = std::env::temp_dir().join("test_file.txt");
        std::fs::write(&temp_file, "test data").unwrap();

        TestFixture { data, temp_file }
    }
}

impl Drop for TestFixture {
    fn drop(&mut self) {
        // Clean up resources
        let _ = std::fs::remove_file(&self.temp_file);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_with_fixture() {
        let fixture = TestFixture::new();
        let result = process_with_file(&fixture.data, &fixture.temp_file);
        assert!(result.is_ok());
        // Fixture will be automatically cleaned up when it goes out of scope
    }
}
```

### Conditional Compilation for Tests

Sometimes you might need to include code that is only used in tests. The `#[cfg(test)]` attribute can be used not just for test modules but also for individual items:

```rust
pub struct ComplexStruct {
    field1: i32,
    field2: String,
    #[cfg(test)]
    test_field: bool, // This field only exists in test builds
}

impl ComplexStruct {
    pub fn new(field1: i32, field2: String) -> Self {
        ComplexStruct {
            field1,
            field2,
            #[cfg(test)]
            test_field: false,
        }
    }

    #[cfg(test)]
    pub fn set_test_field(&mut self, value: bool) {
        self.test_field = value;
    }
}
```

This approach allows you to add testing-specific functionality without cluttering your production code.

### Running Tests in Parallel

By default, Rust runs tests in parallel to speed up execution. While this is generally beneficial, it can cause issues if tests depend on shared resources or state.

To run tests sequentially:

```bash
$ cargo test -- --test-threads=1
```

Alternatively, you can design your tests to be independent and run safely in parallel by:

1. Avoiding shared mutable state
2. Using unique resources (like file paths) for each test
3. Using thread-safe synchronization when necessary

## Documentation Tests

One of Rust's most innovative testing features is the ability to run code examples directly from documentation as tests. This ensures that your documentation stays accurate and up-to-date with your code.

### Writing Documentation Tests

Documentation tests are code blocks in your documentation comments that are executed when you run `cargo test`:

````rust
/// Adds two numbers together.
///
/// # Examples
///
/// ```
/// let result = my_crate::add(2, 3);
/// assert_eq!(result, 5);
/// ```
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
````

When you run `cargo test`, this example will be compiled and executed as a test. If the assertion fails, the test fails.

### Documentation Test Benefits

Documentation tests provide several benefits:

1. **Verified Examples**: Users can trust that the examples in your documentation actually work.
2. **Automatic Testing**: Documentation is tested alongside your code, not as an afterthought.
3. **Consistency**: Documentation and functionality stay in sync as your code evolves.
4. **Reduced Duplication**: You don't need separate tests for functionality already covered in documentation examples.

### Running Documentation Tests

Documentation tests are run automatically with `cargo test`. You can run only the documentation tests with:

```bash
$ cargo test --doc
```

### Hiding Code in Documentation Tests

Sometimes you need setup code in your examples that isn't relevant to the documentation. You can hide lines from the rendered documentation by adding a `#` at the start of the line:

````rust
/// Returns the square of a number.
///
/// # Examples
///
/// ```
/// # use my_crate::square;
/// let result = square(4);
/// assert_eq!(result, 16);
/// ```
pub fn square(n: i32) -> i32 {
    n * n
}
````

In the rendered documentation, users will only see:

```rust
let result = square(4);
assert_eq!(result, 16);
```

The import statement is hidden but still executed when testing.

### Testing Error Cases

You can also test error cases in documentation:

````rust
/// Divides two numbers.
///
/// # Examples
///
/// ```
/// let result = my_crate::divide(10, 2);
/// assert_eq!(result, Ok(5));
///
/// let error = my_crate::divide(10, 0);
/// assert!(error.is_err());
/// ```
///
/// # Errors
///
/// Returns an error if the divisor is zero.
pub fn divide(a: i32, b: i32) -> Result<i32, &'static str> {
    if b == 0 {
        Err("Cannot divide by zero")
    } else {
        Ok(a / b)
    }
}
````

### Testing Panicking Code

If your example is expected to panic, you can tell the documentation tester to expect it:

````rust
/// Returns the index of an element in a slice.
///
/// # Examples
///
/// ```
/// let v = vec![10, 20, 30];
/// assert_eq!(my_crate::get_index(&v, 1), 20);
/// ```
///
/// ```should_panic
/// let v = vec![10, 20, 30];
/// my_crate::get_index(&v, 5); // This will panic
/// ```
pub fn get_index(slice: &[i32], index: usize) -> i32 {
    slice[index]
}
````

### Ignoring Documentation Tests

If a code example isn't meant to be run as a test, you can mark it to be ignored:

````rust
/// This function does something complex.
///
/// ```ignore
/// // This code won't be tested
/// let result = complex_function(complex_input);
/// ```
pub fn complex_function(input: ComplexType) -> ComplexResult {
    // Implementation
}
````

Other options include:

- `no_run`: Compile but don't run the example
- `compile_fail`: Ensure the example fails to compile
- `edition2018`: Specify the Rust edition for the test

### Testing External Functionality

Documentation tests run in their own environment, so you need to import any external items you use:

````rust
/// Concatenates two strings.
///
/// # Examples
///
/// ```
/// use std::rc::Rc;
///
/// let s1 = Rc::new("Hello, ".to_string());
/// let s2 = "world!".to_string();
/// let result = my_crate::concat_string(s1, s2);
/// assert_eq!(result, "Hello, world!");
/// ```
pub fn concat_string(s1: std::rc::Rc<String>, s2: String) -> String {
    format!("{}{}", s1, s2)
}
````

### Using Documentation Tests Effectively

To get the most out of documentation tests:

1. **Provide a complete example**: Show initialization, usage, and verification.
2. **Keep examples simple**: Focus on the specific functionality you're documenting.
3. **Cover edge cases**: Demonstrate how your function handles errors or special inputs.
4. **Test complex interactions**: Show how different parts of your API work together.
5. **Structure examples as mini-tutorials**: Guide users through common use cases.

Here's an example of a comprehensive documentation test:

````rust
/// A simple key-value store with string keys.
///
/// # Examples
///
/// Creating a new store and adding values:
///
/// ```
/// use my_crate::KeyValueStore;
///
/// let mut store = KeyValueStore::new();
/// store.insert("key1", 42);
/// store.insert("key2", 100);
///
/// assert_eq!(store.get("key1"), Some(42));
/// ```
///
/// Handling missing keys:
///
/// ```
/// # use my_crate::KeyValueStore;
/// # let mut store = KeyValueStore::new();
/// assert_eq!(store.get("nonexistent"), None);
/// ```
///
/// Updating values:
///
/// ```
/// # use my_crate::KeyValueStore;
/// # let mut store = KeyValueStore::new();
/// # store.insert("key1", 42);
/// store.insert("key1", 100);  // Updates the existing value
/// assert_eq!(store.get("key1"), Some(100));
/// ```
pub struct KeyValueStore {
    // Implementation details
}

impl KeyValueStore {
    // Implementation methods
}
````

In the next section, we'll explore how to test code that depends on external systems or has complex dependencies using mocking and test doubles.

## Mocking and Test Doubles

When testing code with dependencies on external systems or complex components, you often need to substitute these dependencies with simplified versions to enable focused, reliable testing. In testing terminology, these substitutes are called "test doubles." Mocking is a specific form of test double that allows you to set expectations about how the double will be used.

### Types of Test Doubles

In Rust testing, you'll encounter several types of test doubles:

1. **Dummy Objects**: Placeholder objects passed to satisfy function signatures but never actually used.
2. **Fake Objects**: Simplified working implementations (like an in-memory database instead of a real one).
3. **Stubs**: Provide canned answers to specific calls during tests.
4. **Spies**: Record calls made during tests for later verification.
5. **Mocks**: Pre-programmed with expectations that form a specification of the calls they are expected to receive.

### Approaches to Test Doubles in Rust

Unlike some languages that use runtime reflection for mocking, Rust's static type system requires different approaches. Here are the main strategies:

#### 1. Trait-Based Mocking

The most common approach in Rust is to design your code around traits, then implement those traits with both real and test versions:

```rust
// The trait representing our dependency
pub trait Database {
    fn get_user(&self, id: u64) -> Option<User>;
    fn save_user(&self, user: &User) -> Result<(), String>;
}

// The real implementation
pub struct PostgresDatabase {
    // Implementation details...
}

impl Database for PostgresDatabase {
    fn get_user(&self, id: u64) -> Option<User> {
        // Real implementation that talks to Postgres
    }

    fn save_user(&self, user: &User) -> Result<(), String> {
        // Real implementation
    }
}

// A mock implementation for testing
#[cfg(test)]
pub struct MockDatabase {
    users: std::collections::HashMap<u64, User>,
}

#[cfg(test)]
impl MockDatabase {
    pub fn new() -> Self {
        MockDatabase {
            users: std::collections::HashMap::new(),
        }
    }

    pub fn with_user(mut self, user: User) -> Self {
        self.users.insert(user.id, user);
        self
    }
}

#[cfg(test)]
impl Database for MockDatabase {
    fn get_user(&self, id: u64) -> Option<User> {
        self.users.get(&id).cloned()
    }

    fn save_user(&self, user: &User) -> Result<(), String> {
        // Simplified implementation for testing
        Ok(())
    }
}
```

Now, your main code can accept any type that implements the `Database` trait:

```rust
pub struct UserService<D: Database> {
    database: D,
}

impl<D: Database> UserService<D> {
    pub fn new(database: D) -> Self {
        UserService { database }
    }

    pub fn get_user_name(&self, id: u64) -> Option<String> {
        self.database.get_user(id).map(|user| user.name)
    }
}
```

And your tests can use the mock implementation:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_user_name() {
        // Create a mock database with a test user
        let mock_db = MockDatabase::new()
            .with_user(User { id: 1, name: "Alice".to_string() });

        // Create the service with the mock
        let service = UserService::new(mock_db);

        // Test the service
        assert_eq!(service.get_user_name(1), Some("Alice".to_string()));
        assert_eq!(service.get_user_name(2), None);
    }
}
```

#### 2. Using Mocking Libraries

For more complex mocking needs, several libraries are available:

##### mockall

[mockall](https://crates.io/crates/mockall) is a popular mocking library for Rust that can automatically generate mock implementations for traits:

```rust
use mockall::predicate::*;
use mockall::*;

#[automock]
pub trait Database {
    fn get_user(&self, id: u64) -> Option<User>;
    fn save_user(&self, user: &User) -> Result<(), String>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_user() {
        let mut mock = MockDatabase::new();

        // Set up expectations
        mock.expect_get_user()
            .with(eq(1))
            .times(1)
            .returning(|_| Some(User { id: 1, name: "Alice".to_string() }));

        mock.expect_get_user()
            .with(eq(2))
            .times(1)
            .returning(|_| None);

        // Use the mock
        assert_eq!(mock.get_user(1), Some(User { id: 1, name: "Alice".to_string() }));
        assert_eq!(mock.get_user(2), None);
    }
}
```

##### mocktopus

[mocktopus](https://crates.io/crates/mocktopus) takes a different approach by allowing you to mock individual functions:

```rust
#[cfg_attr(test, mockable)]
pub fn get_user_from_database(id: u64) -> Option<User> {
    // Real implementation
}

#[cfg(test)]
mod tests {
    use super::*;
    use mocktopus::mocking::*;

    #[test]
    fn test_with_mocked_function() {
        // Mock the function
        get_user_from_database.mock_safe(|id| {
            if id == 1 {
                MockResult::Return(Some(User { id: 1, name: "Alice".to_string() }))
            } else {
                MockResult::Return(None)
            }
        });

        // Use the mocked function
        assert_eq!(get_user_from_database(1), Some(User { id: 1, name: "Alice".to_string() }));
        assert_eq!(get_user_from_database(2), None);
    }
}
```

#### 3. Manual Mocking with Closures

For simpler cases, you can use closures to create flexible test doubles:

```rust
struct UserService<F>
where
    F: Fn(u64) -> Option<User>,
{
    get_user: F,
}

impl<F> UserService<F>
where
    F: Fn(u64) -> Option<User>,
{
    fn new(get_user: F) -> Self {
        UserService { get_user }
    }

    fn get_user_name(&self, id: u64) -> Option<String> {
        (self.get_user)(id).map(|user| user.name)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_user_name_with_closure() {
        // Create a service with a closure that simulates the database
        let service = UserService::new(|id| {
            if id == 1 {
                Some(User { id: 1, name: "Alice".to_string() })
            } else {
                None
            }
        });

        // Test the service
        assert_eq!(service.get_user_name(1), Some("Alice".to_string()));
        assert_eq!(service.get_user_name(2), None);
    }
}
```

### Testing Asynchronous Code

Mocking becomes particularly important when testing asynchronous code. Here's how you can approach it:

```rust
#[async_trait]
pub trait AsyncDatabase {
    async fn get_user(&self, id: u64) -> Option<User>;
    async fn save_user(&self, user: &User) -> Result<(), String>;
}

struct MockAsyncDatabase {
    users: std::collections::HashMap<u64, User>,
}

#[async_trait]
impl AsyncDatabase for MockAsyncDatabase {
    async fn get_user(&self, id: u64) -> Option<User> {
        self.users.get(&id).cloned()
    }

    async fn save_user(&self, user: &User) -> Result<(), String> {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_async_function() {
        let mock_db = MockAsyncDatabase {
            users: {
                let mut map = std::collections::HashMap::new();
                map.insert(1, User { id: 1, name: "Alice".to_string() });
                map
            },
        };

        let service = AsyncUserService::new(mock_db);
        let result = service.get_user_name(1).await;

        assert_eq!(result, Some("Alice".to_string()));
    }
}
```

### Best Practices for Test Doubles

When using test doubles in Rust, follow these best practices:

1. **Design for Testability**: Structure your code around traits or other abstractions that can be easily mocked.

2. **Mock at the Right Level**: Mock at interface boundaries rather than trying to mock every component.

3. **Keep Mocks Simple**: Mocks should only implement the behavior needed for the specific test.

4. **Don't Over-Mock**: If a component is simple and has no side effects, consider using the real implementation.

5. **Use Dependency Injection**: Make it easy to substitute dependencies in tests by using constructors or builder patterns.

6. **Test the Contract**: Ensure that your real implementations and mocks follow the same contract.

7. **Consider Using Fakes for Complex Dependencies**: For databases or external APIs, consider writing a simplified in-memory implementation.

### Testing HTTP Clients and Servers

For testing HTTP clients and servers, specialized mocking tools are available:

#### HTTP Client Testing with mockito

[mockito](https://crates.io/crates/mockito) is a useful library for mocking HTTP servers:

```rust
use reqwest;

async fn fetch_user(id: u64) -> Result<String, reqwest::Error> {
    let url = format!("http://api.example.com/users/{}", id);
    let response = reqwest::get(&url).await?;
    let body = response.text().await?;
    Ok(body)
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockito;

    #[tokio::test]
    async fn test_fetch_user() {
        // Set up the mock server
        let mut server = mockito::Server::new();

        // Create a mock endpoint
        let mock = server.mock("GET", "/users/1")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{"id": 1, "name": "Alice"}"#)
            .create();

        // Override the API URL to use our mock server
        let url = format!("{}/users/1", server.url());

        // Test the function
        let body = fetch_user(1).await.unwrap();
        assert_eq!(body, r#"{"id": 1, "name": "Alice"}"#);

        // Verify that the endpoint was called
        mock.assert();
    }
}
```

#### HTTP Server Testing with reqwest

For testing HTTP servers, you can use `reqwest` to make requests to your server:

```rust
// Assuming you have an HTTP server implementation
async fn start_server() -> impl Future<Output = ()> {
    // Server implementation
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_server() {
        // Start the server in the background
        let server_handle = tokio::spawn(start_server());

        // Wait for the server to start
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        // Make a request to the server
        let response = reqwest::get("http://localhost:8080/users/1").await.unwrap();
        assert_eq!(response.status(), 200);

        let body = response.text().await.unwrap();
        assert_eq!(body, r#"{"id": 1, "name": "Alice"}"#);
    }
}
```

### Creating Specialized Test Environments

For more complex testing scenarios, you might need to create specialized test environments:

```rust
struct TestEnvironment {
    db: MockDatabase,
    api_client: MockApiClient,
    config: TestConfig,
    temp_dir: tempfile::TempDir,
}

impl TestEnvironment {
    fn new() -> Self {
        let temp_dir = tempfile::tempdir().unwrap();

        TestEnvironment {
            db: MockDatabase::new(),
            api_client: MockApiClient::new(),
            config: TestConfig {
                data_dir: temp_dir.path().to_path_buf(),
                // Other configuration...
            },
            temp_dir,
        }
    }

    fn with_user(mut self, user: User) -> Self {
        self.db = self.db.with_user(user);
        self
    }

    fn with_api_response(mut self, endpoint: &str, response: ApiResponse) -> Self {
        self.api_client = self.api_client.with_response(endpoint, response);
        self
    }

    fn create_service(&self) -> UserService<MockDatabase, MockApiClient> {
        UserService::new(self.db.clone(), self.api_client.clone(), self.config.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_complex_service() {
        let env = TestEnvironment::new()
            .with_user(User { id: 1, name: "Alice".to_string() })
            .with_api_response("/status", ApiResponse::Ok);

        let service = env.create_service();

        let result = service.process_user(1);
        assert!(result.is_ok());
    }
}
```

In the next section, we'll explore property-based testing, a powerful approach that can find edge cases you might not have thought of.

## Property-Based Testing with proptest

Traditional testing involves writing specific test cases with predefined inputs and expected outputs. While this approach is valuable, it can miss edge cases that you didn't think to test. Property-based testing takes a different approach: instead of testing specific examples, you define properties that should hold true for all inputs, and the testing framework automatically generates diverse test cases to verify these properties.

### The Concept of Property-Based Testing

The core idea of property-based testing is to:

1. Define properties your code should satisfy
2. Let the testing framework generate random inputs
3. Verify that the properties hold for all generated inputs
4. If a failing case is found, automatically reduce it to a minimal counterexample

This approach can find bugs that traditional testing might miss, particularly in edge cases or unusual input combinations.

### Getting Started with proptest

[proptest](https://crates.io/crates/proptest) is the most popular property-based testing framework for Rust. Let's see how to use it:

First, add it to your `Cargo.toml`:

```toml
[dev-dependencies]
proptest = "1.0"
```

Now, let's write a simple property test:

```rust
use proptest::prelude::*;

// Function we want to test
fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    proptest! {
        #[test]
        fn test_add_commutative(a in -1000..1000, b in -1000..1000) {
            // Property: addition should be commutative
            prop_assert_eq!(add(a, b), add(b, a));
        }
    }
}
```

This test verifies that addition is commutative (a + b = b + a) for integers in the range -1000 to 1000. proptest will generate hundreds of random test cases to verify this property.

### Defining Strategies

In property-based testing, a "strategy" defines how to generate random values for your tests. proptest provides strategies for many common types:

```rust
proptest! {
    // Integers within ranges
    #[test]
    fn test_with_integers(a in 0..100, b in -50..50) {
        // Test code using a and b
    }

    // Floating point numbers
    #[test]
    fn test_with_floats(x in 0.0..1.0f64) {
        // Test code using x
    }

    // Strings
    #[test]
    fn test_with_strings(s in "\\PC{1,10}") {
        // Test code using s (1-10 printable characters)
    }

    // Vectors
    #[test]
    fn test_with_vectors(v in prop::collection::vec(0..100, 0..10)) {
        // Test code using v (vector of 0-10 elements, each 0-100)
    }
}
```

You can also create custom strategies or combine existing ones:

```rust
#[derive(Debug, Clone)]
struct User {
    id: u64,
    name: String,
    age: u8,
}

proptest! {
    #[test]
    fn test_user_processing(
        // Generate a user with controlled random values
        user in (
            1..1000u64,  // id
            "\\PC{1,20}",  // name (1-20 printable chars)
            0..120u8,    // age
        ).prop_map(|(id, name, age)| User { id, name, age })
    ) {
        // Test code using the generated user
        let result = process_user(&user);

        // Properties that should hold
        prop_assert!(result.is_ok());
        if let Ok(processed) = result {
            prop_assert_eq!(processed.id, user.id);
            prop_assert!(processed.name.len() > 0);
        }
    }
}
```

### Testing Properties of Your Code

The power of property-based testing comes from defining meaningful properties. Here are some common types of properties:

#### 1. Invariants

Properties that should always be true regardless of input:

```rust
proptest! {
    #[test]
    fn absolute_value_is_non_negative(x in any::<i32>()) {
        let abs_x = x.abs();
        prop_assert!(abs_x >= 0);
    }
}
```

#### 2. Roundtrip Properties

If you convert data from one form to another and back, you should get the original data:

```rust
proptest! {
    #[test]
    fn parse_print_roundtrip(n in 0..10000i32) {
        let s = n.to_string();
        let parsed = s.parse::<i32>().unwrap();
        prop_assert_eq!(n, parsed);
    }
}
```

#### 3. Equivalence Properties

Different ways of computing the same thing should yield the same result:

```rust
proptest! {
    #[test]
    fn sum_is_same_as_fold(
        v in prop::collection::vec(0..100i32, 0..20)
    ) {
        let sum1: i32 = v.iter().sum();
        let sum2: i32 = v.iter().fold(0, |acc, &x| acc + x);
        prop_assert_eq!(sum1, sum2);
    }
}
```

#### 4. Model-Based Properties

Compare your implementation against a simpler, obviously correct (but perhaps less efficient) implementation:

```rust
// Efficient implementation
fn quick_sort<T: Ord + Clone>(mut v: Vec<T>) -> Vec<T> {
    // Implementation of quick sort
    // ...
    v // Placeholder for the actual implementation
}

proptest! {
    #[test]
    fn quick_sort_same_as_std_sort(
        v in prop::collection::vec(0..1000i32, 0..100)
    ) {
        let mut v_clone = v.clone();
        v_clone.sort();

        let quick_sorted = quick_sort(v);
        prop_assert_eq!(quick_sorted, v_clone);
    }
}
```

### Handling Test Failures

When proptest finds a failing case, it automatically tries to reduce it to a minimal counterexample. This process, called "shrinking," makes it much easier to understand and fix the issue:

```rust
// Buggy function that fails for negative numbers
fn buggy_abs(x: i32) -> i32 {
    if x < 0 {
        // Bug: returns negative instead of positive
        x
    } else {
        x
    }
}

proptest! {
    #[test]
    fn abs_is_non_negative(x in any::<i32>()) {
        let abs_x = buggy_abs(x);
        prop_assert!(abs_x >= 0);
    }
}
```

When this test runs, proptest will find a failing case and shrink it to the simplest counterexample (likely -1).

### Controlling Test Generation

You can control how proptest generates test cases:

#### Limiting Test Cases

By default, proptest runs 100 test cases for each property. You can adjust this:

```rust
use proptest::test_runner::Config;

proptest! {
    #![proptest_config(Config::with_cases(500))]
    #[test]
    fn more_thorough_test(x in any::<i32>()) {
        // This will run 500 test cases
        // ...
    }
}
```

#### Filtering Generated Values

You can filter the generated values to focus on cases you're interested in:

```rust
proptest! {
    #[test]
    fn test_even_numbers(x in any::<i32>().prop_filter(
        "x must be even", |x| x % 2 == 0
    )) {
        // x is guaranteed to be even
        prop_assert_eq!(x % 2, 0);
    }
}
```

However, be careful with filtering—if your filter is too restrictive, proptest may struggle to generate enough valid examples.

#### Deterministic Tests

For reproducible tests, you can specify a random seed:

```rust
proptest! {
    #![proptest_config(Config::with_cases(100).with_rng_seed(12345))]
    #[test]
    fn deterministic_test(x in any::<i32>()) {
        // This will always generate the same test cases
        // ...
    }
}
```

### Complex Property Testing Examples

Let's look at some more complex examples of property-based testing:

#### Testing a Sorting Algorithm

```rust
fn insertion_sort<T: Ord + Clone>(mut v: Vec<T>) -> Vec<T> {
    for i in 1..v.len() {
        let mut j = i;
        while j > 0 && v[j - 1] > v[j] {
            v.swap(j - 1, j);
            j -= 1;
        }
    }
    v
}

proptest! {
    #[test]
    fn sort_produces_ordered_result(
        v in prop::collection::vec(0..1000i32, 0..100)
    ) {
        let sorted = insertion_sort(v);

        // Property 1: Result should be ordered
        for i in 1..sorted.len() {
            prop_assert!(sorted[i-1] <= sorted[i]);
        }
    }

    #[test]
    fn sort_preserves_elements(
        v in prop::collection::vec(-100..100i32, 0..20)
    ) {
        let orig = v.clone();
        let sorted = insertion_sort(v);

        // Property 2: Sorting should preserve all elements
        prop_assert_eq!(orig.len(), sorted.len());

        let mut orig_counts = std::collections::HashMap::new();
        let mut sorted_counts = std::collections::HashMap::new();

        for &x in &orig {
            *orig_counts.entry(x).or_insert(0) += 1;
        }

        for &x in &sorted {
            *sorted_counts.entry(x).or_insert(0) += 1;
        }

        prop_assert_eq!(orig_counts, sorted_counts);
    }
}
```

#### Testing a Parser

```rust
enum JsonValue {
    Null,
    Bool(bool),
    Number(f64),
    String(String),
    Array(Vec<JsonValue>),
    Object(std::collections::HashMap<String, JsonValue>),
}

fn parse_json(input: &str) -> Result<JsonValue, String> {
    // Implementation of JSON parser
    // ...
    Err("Not implemented".to_string()) // Placeholder
}

fn stringify_json(value: &JsonValue) -> String {
    // Implementation of JSON stringifier
    // ...
    "".to_string() // Placeholder
}

proptest! {
    #[test]
    fn json_roundtrip(
        // Generate a simple JSON value
        value in prop_oneof![
            Just(JsonValue::Null),
            any::<bool>().prop_map(JsonValue::Bool),
            any::<f64>().prop_map(JsonValue::Number),
            "\\PC{0,20}".prop_map(JsonValue::String),
            prop::collection::vec(Just(JsonValue::Null), 0..5)
                .prop_map(JsonValue::Array)
        ]
    ) {
        let json_str = stringify_json(&value);
        let parsed = parse_json(&json_str)?;

        // Comparing complex structures directly can be tricky
        // Here's a simplified approach
        let round_trip_str = stringify_json(&parsed);
        prop_assert_eq!(json_str, round_trip_str);

        Ok(())
    }
}
```

### Combining proptest with Other Testing Approaches

Property-based testing complements, rather than replaces, other testing approaches. A comprehensive testing strategy might include:

1. **Unit tests** for specific cases and edge conditions
2. **Property tests** to find unexpected edge cases and validate broader properties
3. **Integration tests** to verify that components work together correctly
4. **Benchmarks** to ensure performance meets requirements

For example:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    // Traditional unit tests
    #[test]
    fn test_specific_cases() {
        assert_eq!(process_data(&[1, 2, 3]), Ok(6));
        assert_eq!(process_data(&[]), Ok(0));
        assert!(process_data(&[-1]).is_err());
    }

    // Property-based tests
    proptest! {
        #[test]
        fn process_data_properties(
            v in prop::collection::vec(0..100i32, 0..20)
        ) {
            let result = process_data(&v);

            // Should succeed for all non-negative inputs
            prop_assert!(result.is_ok());

            // Sum should be greater than or equal to largest element
            if let Ok(sum) = result {
                if let Some(&max) = v.iter().max() {
                    prop_assert!(sum >= max);
                }
            }
        }
    }
}
```

### Best Practices for Property-Based Testing

To get the most out of property-based testing:

1. **Focus on properties, not examples**: Think about what invariants, equivalences, or roundtrip properties your code should satisfy.

2. **Start simple**: Begin with basic properties and gradually add more complex ones.

3. **Combine with traditional tests**: Use traditional tests for known edge cases and property tests for exploring the space of possible inputs.

4. **Don't filter too aggressively**: If you're filtering out most generated values, consider restructuring your strategy instead.

5. **Pay attention to performance**: Property tests run many examples, so make sure your test code is efficient.

6. **Use shrinking effectively**: When a test fails, proptest will try to find the simplest failing case. Examine this case carefully to understand the root cause.

7. **Consider model-based testing**: Comparing against a simpler but correct implementation is a powerful approach to finding bugs.

In the next section, we'll explore benchmarking in Rust, which helps you measure and optimize the performance of your code.

## Benchmarking with criterion

Testing ensures your code works correctly, but it doesn't tell you how fast it runs. Benchmarking fills this gap by measuring your code's performance, helping you identify bottlenecks and validate optimizations.

### Introduction to Benchmarking in Rust

While Rust's standard library includes a benchmarking framework, it's only available in nightly Rust. For stable Rust, [criterion](https://crates.io/crates/criterion) is the most widely used benchmarking library. Criterion provides robust, statistically sound benchmarks with detailed analysis and pretty reports.

### Setting Up criterion

First, add criterion to your `Cargo.toml`:

```toml
[dev-dependencies]
criterion = "0.4"

[[bench]]
name = "my_benchmark"
harness = false
```

Next, create a benchmark file at `benches/my_benchmark.rs`:

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};

// Function we want to benchmark
fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        n => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn bench_fibonacci(c: &mut Criterion) {
    c.bench_function("fibonacci 20", |b| b.iter(|| fibonacci(black_box(20))));
}

criterion_group!(benches, bench_fibonacci);
criterion_main!(benches);
```

Now run your benchmark:

```bash
$ cargo bench
```

Criterion will run your benchmark, analyze the results, and generate a report showing how long your function took to execute.

### Understanding Criterion Output

Criterion produces detailed output with statistical analysis:

```
fibonacci 20             time:   [21.518 ms 21.612 ms 21.714 ms]
```

This shows the:

- Lower bound of the confidence interval (21.518 ms)
- Point estimate (21.612 ms)
- Upper bound of the confidence interval (21.714 ms)

Criterion also generates HTML reports with charts in the `target/criterion` directory, which you can open in a web browser for more detailed analysis.

### Writing Effective Benchmarks

Here are some patterns for effective benchmarking:

#### Benchmarking Functions with Input Parameters

```rust
fn bench_fibonacci(c: &mut Criterion) {
    let mut group = c.benchmark_group("fibonacci");
    for i in [5, 10, 15, 20].iter() {
        group.bench_with_input(format!("fibonacci {}", i), i, |b, &i| {
            b.iter(|| fibonacci(black_box(i)))
        });
    }
    group.finish();
}
```

This benchmarks `fibonacci` with different inputs, showing how performance scales with input size.

#### Benchmarking Multiple Implementations

```rust
// Recursive implementation
fn fibonacci_recursive(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        n => fibonacci_recursive(n - 1) + fibonacci_recursive(n - 2),
    }
}

// Iterative implementation
fn fibonacci_iterative(n: u64) -> u64 {
    let mut a = 0;
    let mut b = 1;
    for _ in 0..n {
        let c = a + b;
        a = b;
        b = c;
    }
    a
}

fn compare_fibonacci_implementations(c: &mut Criterion) {
    let mut group = c.benchmark_group("fibonacci");

    for i in [20, 25, 30].iter() {
        group.bench_with_input(format!("recursive {}", i), i, |b, &i| {
            b.iter(|| fibonacci_recursive(black_box(i)))
        });

        group.bench_with_input(format!("iterative {}", i), i, |b, &i| {
            b.iter(|| fibonacci_iterative(black_box(i)))
        });
    }

    group.finish();
}
```

This compares recursive and iterative implementations, helping you choose the more efficient approach.

#### Benchmarking Setup and Cleanup

Sometimes you need to prepare data before benchmarking or clean up afterward:

```rust
fn bench_sort(c: &mut Criterion) {
    let mut group = c.benchmark_group("sort");

    group.bench_function("sort 1000 elements", |b| {
        b.iter_batched(
            // Setup (executed before each iteration)
            || {
                let mut data: Vec<i32> = (0..1000).collect();
                data.shuffle(&mut rand::thread_rng());
                data
            },
            // Benchmark (executed during measurement)
            |mut data| {
                data.sort();
                data
            },
            // Batch size (how often to run setup)
            criterion::BatchSize::SmallInput,
        )
    });

    group.finish();
}
```

This approach ensures that setup and cleanup time doesn't affect your measurements.

### Advanced Benchmarking Techniques

#### Parameterized Benchmarks

You can use parameterized benchmarks to explore how performance varies with different inputs:

```rust
fn bench_sorting(c: &mut Criterion) {
    let sizes = [10, 100, 1000, 10000];
    let mut group = c.benchmark_group("sorting");

    for size in sizes.iter() {
        group.throughput(criterion::Throughput::Elements(*size as u64));

        group.bench_with_input(format!("sort {}", size), size, |b, &size| {
            b.iter_batched(
                || {
                    let mut data: Vec<i32> = (0..size).collect();
                    data.shuffle(&mut rand::thread_rng());
                    data
                },
                |mut data| {
                    data.sort();
                    data
                },
                criterion::BatchSize::SmallInput,
            )
        });
    }

    group.finish();
}
```

This measures not just time but throughput (elements sorted per second), which helps you understand scaling behavior.

#### Measuring Memory Usage

Criterion focuses on time measurements, but you might also want to measure memory usage. For this, you'd need additional tools like `heaptrack` or custom instrumentation:

```rust
fn memory_usage<F, T>(f: F) -> (T, usize)
where
    F: FnOnce() -> T,
{
    // Record memory before
    let before = std::mem::size_of::<usize>() * 8; // Simplified example

    // Run the function
    let result = f();

    // Record memory after
    let after = std::mem::size_of::<usize>() * 16; // Simplified example

    (result, after - before)
}

#[test]
fn test_vector_memory() {
    let (vec, bytes) = memory_usage(|| {
        let mut vec = Vec::new();
        for i in 0..1000 {
            vec.push(i);
        }
        vec
    });

    println!("Created vector of size {} using {} bytes", vec.len(), bytes);
}
```

This is a simplified example—real memory profiling typically requires OS-specific tools or libraries.

### Benchmarking Best Practices

To get reliable, useful benchmarks:

1. **Ensure Stable Environment**: Run benchmarks on a consistent, quiet system. Close other applications and disable power management features that might affect CPU speed.

2. **Use `black_box`**: This prevents the compiler from optimizing away your benchmark code.

3. **Benchmark Real-World Scenarios**: Test with realistic data sizes and patterns.

4. **Compare Like with Like**: When comparing implementations, ensure they solve exactly the same problem.

5. **Look Beyond Averages**: Pay attention to variance and outliers in your benchmark results.

6. **Avoid Microbenchmarking Pitfalls**: Very short functions might be dominated by measurement overhead.

7. **Profile Before Optimizing**: Use profiling tools to identify actual bottlenecks before benchmarking.

### Continuous Benchmarking

For long-term performance tracking, integrate benchmarking into your continuous integration:

1. **Store Benchmark Results**: Save results in a database or log file.

2. **Track Changes Over Time**: Plot performance metrics across versions.

3. **Set Performance Budgets**: Establish thresholds for acceptable performance.

4. **Automatic Regression Detection**: Configure CI to fail if performance degrades beyond a threshold.

Here's a simplified example using GitHub Actions:

```yaml
# .github/workflows/benchmark.yml
name: Benchmark

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          override: true
      - name: Run benchmarks
        run: cargo bench
      - name: Store benchmark results
        uses: actions/upload-artifact@v2
        with:
          name: benchmark-results
          path: target/criterion
```

### Benchmarking Async Code

Benchmarking asynchronous code requires special handling:

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use tokio::runtime::Runtime;

async fn async_function(n: u64) -> u64 {
    // Simulate some async work
    tokio::time::sleep(std::time::Duration::from_millis(1)).await;
    n * 2
}

fn bench_async(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    c.bench_function("async function", |b| {
        b.to_async(&rt).iter(|| async_function(black_box(42)))
    });
}

criterion_group!(benches, bench_async);
criterion_main!(benches);
```

This creates a Tokio runtime and uses criterion's async benchmarking support to measure async functions.

### Combining Testing and Benchmarking

A comprehensive approach combines testing and benchmarking:

1. **Write tests to verify correctness**
2. **Write benchmarks to measure performance**
3. **Use property tests to explore the behavior space**
4. **Use benchmarks to compare alternative implementations**

For example, when implementing a sorting algorithm:

```rust
// First, test correctness
#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    #[test]
    fn test_specific_cases() {
        assert_eq!(my_sort(&mut [3, 1, 2]), &mut [1, 2, 3]);
        assert_eq!(my_sort(&mut []), &mut []);
    }

    proptest! {
        #[test]
        fn test_sort_properties(mut v in prop::collection::vec(0..100i32, 0..100)) {
            let mut v_clone = v.clone();
            v_clone.sort();

            my_sort(&mut v);
            prop_assert_eq!(v, v_clone);
        }
    }
}

// Then, benchmark performance
fn bench_sorting(c: &mut Criterion) {
    let mut group = c.benchmark_group("sorting");

    group.bench_function("my_sort", |b| {
        b.iter_batched(
            || {
                let mut data: Vec<i32> = (0..1000).collect();
                data.shuffle(&mut rand::thread_rng());
                data
            },
            |mut data| {
                my_sort(&mut data);
                data
            },
            criterion::BatchSize::SmallInput,
        )
    });

    group.bench_function("std_sort", |b| {
        b.iter_batched(
            || {
                let mut data: Vec<i32> = (0..1000).collect();
                data.shuffle(&mut rand::thread_rng());
                data
            },
            |mut data| {
                data.sort();
                data
            },
            criterion::BatchSize::SmallInput,
        )
    });

    group.finish();
}
```

This approach ensures your implementation is both correct and efficient.

## Summary

In this chapter, we've explored Rust's comprehensive testing ecosystem, from basic unit tests to advanced property-based testing and benchmarking. We've learned:

- How to write unit tests using Rust's built-in testing framework
- Strategies for organizing tests in growing codebases
- How to write integration tests to verify that components work together
- The power of documentation tests to keep examples accurate and up-to-date
- Techniques for mocking dependencies in tests
- How property-based testing can find edge cases you might not have thought of
- Methods for benchmarking and measuring performance with criterion

Testing is a fundamental aspect of Rust development, and the language's first-class support for testing reflects its emphasis on reliability and correctness. By incorporating these testing practices into your workflow, you'll write more robust, maintainable Rust code with fewer bugs and better performance.

## Exercises

### Exercise 1: Unit Test Practice

Create a library crate with functions for basic operations on a `User` struct. Write comprehensive unit tests for each function, covering:

- Normal cases
- Edge cases
- Error handling

```rust
// Example structure to start with
pub struct User {
    id: u64,
    name: String,
    email: String,
    active: bool,
}

// Implement these functions with proper error handling
pub fn create_user(name: &str, email: &str) -> Result<User, String> {
    // Implementation
}

pub fn validate_email(email: &str) -> bool {
    // Implementation
}

pub fn deactivate_user(user: &mut User) {
    // Implementation
}

// Then write tests for each function
```

### Exercise 2: Integration Testing

Expand the library from Exercise 1 to include a `UserRepository` trait with two implementations:

1. An in-memory implementation for testing
2. A file-based implementation for real usage

Write integration tests that verify both implementations work correctly with the same test cases.

### Exercise 3: Property-Based Testing

Using proptest, write property-based tests for a function that parses and validates a configuration file format. Define properties such as:

- If a configuration is valid, serializing and deserializing it should give the same result
- Certain fields must be within specific ranges
- Required fields must be present

### Exercise 4: Benchmarking Different Algorithms

Implement two different algorithms for finding the nth Fibonacci number:

1. Recursive implementation
2. Iterative implementation

Write benchmarks using criterion to compare their performance with different input sizes. Create a nice visualization of the results.

### Exercise 5: Test-Driven Development Project

Using Test-Driven Development, build a simple command-line todo application. For each feature:

1. Write tests first
2. Implement the minimal code to pass the tests
3. Refactor while keeping tests passing

Features to implement:

- Adding items
- Marking items as complete
- Listing items (all, active, completed)
- Deleting items
- Saving and loading from a file

This exercise will help you experience the full TDD workflow while building a practical application.
