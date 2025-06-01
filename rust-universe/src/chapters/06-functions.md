# Chapter 6: Functions and Procedures

## Introduction

Functions are the fundamental building blocks of code organization in any programming language. In Rust, functions play a critical role in creating maintainable, reusable, and well-structured programs. This chapter will explore how to define and use functions effectively in Rust.

By the end of this chapter, you'll understand:

- How to define and call functions in Rust
- Working with parameters and return values
- Different ways to pass arguments to functions
- How Rust's expression-based nature affects functions
- Using closures for inline functionality
- Creating and using higher-order functions
- Function organization best practices
- Debugging function calls
- Building a practical application using functions

## Defining and Calling Functions

In Rust, functions are defined using the `fn` keyword, followed by the function name, a pair of parentheses, and a block containing the function body.

### Basic Function Syntax

```rust
// Function definition
fn say_hello() {
    println!("Hello, world!");
}

fn main() {
    // Function call
    say_hello();
}
```

Every Rust program begins with the `main` function, which serves as the entry point. This function doesn't accept any parameters and doesn't return a value. As your programs grow, you'll organize your code by creating additional functions.

### Function Naming Conventions

Rust uses `snake_case` for function names, which means all letters are lowercase with words separated by underscores:

```rust
fn calculate_total() {
    // Function body
}

// Not following Rust conventions:
// fn CalculateTotal() { ... }  // PascalCase
// fn calculateTotal() { ... }  // camelCase
```

Following these naming conventions makes your code more idiomatic and easier for other Rust developers to read and understand.

### Functions with Multiple Statements

A function body typically contains multiple statements:

```rust
fn process_data() {
    let data = [1, 2, 3, 4, 5];
    let sum = calculate_sum(&data);
    println!("The sum is: {}", sum);

    // More statements...
}
```

Each statement in the function body executes in sequence when the function is called.

## Parameters and Return Values

Functions become more powerful when they can accept input and produce output.

### Function Parameters

Parameters are specified in the function signature inside the parentheses:

```rust
fn greet(name: &str) {
    println!("Hello, {}!", name);
}

fn main() {
    greet("Alice");
    greet("Bob");
}
```

Multiple parameters are separated by commas:

```rust
fn print_sum(a: i32, b: i32) {
    println!("{} + {} = {}", a, b, a + b);
}

fn main() {
    print_sum(5, 7);
}
```

In Rust, parameters must have explicit type annotations. This helps the compiler enforce type safety and makes your code more self-documenting.

### Return Values

Functions can return values using the `->` syntax, followed by the return type:

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b // No semicolon means this is an expression that returns a + b
}

fn main() {
    let sum = add(5, 7);
    println!("The sum is: {}", sum);
}
```

Rust has an important distinction between expressions and statements. Expressions return values, while statements don't. The last expression in a function is implicitly returned, without needing the `return` keyword.

You can also use the `return` keyword for explicit returns, especially for early returns:

```rust
fn is_positive(number: i32) -> bool {
    if number < 0 {
        return false; // Early return
    }

    // Last expression is returned implicitly
    number > 0
}
```

### Returning Multiple Values

Rust doesn't support multiple return values directly, but we can use tuples to achieve the same effect:

```rust
fn get_statistics(numbers: &[i32]) -> (i32, i32, i32) {
    let sum: i32 = numbers.iter().sum();
    let min = *numbers.iter().min().unwrap_or(&0);
    let max = *numbers.iter().max().unwrap_or(&0);

    (sum, min, max) // Returns a tuple containing sum, min, and max
}

fn main() {
    let numbers = [1, 5, 10, 2, 15];
    let (sum, min, max) = get_statistics(&numbers);

    println!("Sum: {}, Min: {}, Max: {}", sum, min, max);
}
```

The tuple can be destructured immediately when calling the function, making it clean and straightforward to work with multiple return values.

## Return Type Inference and the Unit Type

Let's explore how Rust handles function return types, including the special case of functions that don't return a value.

### The Unit Type

If a function doesn't return a value, it implicitly returns the unit type, written as `()`. This is similar to `void` in other languages:

```rust
// These two function definitions are equivalent
fn do_something() {
    println!("Doing something...");
}

fn do_something_explicit() -> () {
    println!("Doing something...");
}
```

The unit type is Rust's way of saying "nothing" or "no meaningful value." It's the type of expressions that don't evaluate to a value.

### Type Inference in Function Returns

While Rust can sometimes infer the return type of a function, it's considered good practice to always specify it for better readability and to avoid confusion:

```rust
// Not recommended - relies on type inference
fn inferred_return() {
    42 // Returns i32
}

// Recommended - explicitly state the return type
fn explicit_return() -> i32 {
    42
}
```

Explicit return types make your code's intentions clearer and help prevent subtle bugs that might occur if the compiler infers a different type than you intended.

## Passing Arguments by Value vs Reference

Understanding how arguments are passed to functions is crucial in Rust because it directly affects ownership of values.

### Passing by Value

When you pass an argument by value, ownership of the value is transferred to the function:

```rust
fn take_ownership(s: String) {
    println!("{}", s);
} // s goes out of scope and is dropped here

fn main() {
    let s = String::from("hello");
    take_ownership(s);

    // s is no longer valid here because its ownership was moved
    // println!("{}", s); // This would cause a compile error
}
```

This behavior is a direct consequence of Rust's ownership rules, which we'll explore in depth in Chapter 7. For now, understand that when a value is moved to a function, you can no longer use it in the calling function.

### Passing by Reference

To avoid transferring ownership, you can pass a reference to the value using the `&` symbol:

```rust
fn borrow(s: &String) {
    println!("{}", s);
} // s goes out of scope, but the underlying data is not dropped

fn main() {
    let s = String::from("hello");
    borrow(&s);
    println!("{}", s); // This is valid because s still owns the data
}
```

When you pass a reference, the function can access the value but doesn't take ownership of it.

### Mutable References

If a function needs to modify a parameter, you can pass a mutable reference with `&mut`:

```rust
fn change(s: &mut String) {
    s.push_str(", world");
}

fn main() {
    let mut s = String::from("hello");
    change(&mut s);
    println!("{}", s); // Prints: hello, world
}
```

Mutable references allow the function to modify the value they refer to.

### Slices for Partial Access

Slices allow you to reference a part of a collection without taking ownership:

```rust
fn first_word(s: &str) -> &str {
    let bytes = s.as_bytes();

    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' {
            return &s[0..i];
        }
    }

    &s[..]
}

fn main() {
    let my_string = String::from("hello world");
    let word = first_word(&my_string);
    println!("First word: {}", word);
}
```

Slices are a powerful way to work with parts of strings, arrays, and other collections. We'll explore them more thoroughly in Chapter 9.

### Visual Representation of References

Here's a visual representation of how references work in memory:

```
By Value:
┌─────────────┐            ┌─────────────┐
│ Variable s  │            │ Parameter s │
│ in main()   │──(Move)───▶│ in function │
└─────────────┘            └─────────────┘

By Reference:
┌─────────────┐            ┌─────────────┐
│ Variable s  │◄───────────│ Parameter &s│
│ in main()   │──(Borrow)──▶│ in function │
└─────────────┘            └─────────────┘
```

Understanding these patterns is essential for effective Rust programming.

## Function Expressions and Statements

As we learned in Chapter 5, Rust is an expression-based language. This affects how we write functions and influences function return values.

### Expressions vs Statements in Functions

In Rust, statements don't return values, while expressions do:

```rust
fn main() {
    // This is a statement (doesn't return a value)
    let x = 5;

    // This is an expression (returns a value)
    let y = {
        let a = 3;
        a + 1 // No semicolon, so this is an expression
    };

    println!("y: {}", y); // Prints: y: 4
}
```

### Functions as Expressions

The entire function definition is a statement, but the function body can contain expressions that determine the return value:

```rust
fn absolute_value(x: i32) -> i32 {
    if x >= 0 { x } else { -x }
}
```

Here, the `if` expression evaluates to either `x` or `-x`, and this value is returned from the function.

### Expression Blocks in Functions

You can use a block expression to compute complex values:

```rust
fn complex_calculation(x: i32, y: i32) -> i32 {
    let result = {
        let sum = x + y;
        let product = x * y;
        sum + product // This value is assigned to result
    };

    result * 2 // This is the return value of the function
}
```

### Implicit Returns vs Explicit Returns

An implicit return happens when the last expression in a function isn't terminated with a semicolon:

```rust
fn square(x: i32) -> i32 {
    x * x // Implicit return
}
```

An explicit return uses the `return` keyword:

```rust
fn square_explicit(x: i32) -> i32 {
    return x * x; // Explicit return
}
```

The explicit form is typically used for early returns or when clarity is more important than conciseness:

```rust
fn process_positive_number(x: i32) -> i32 {
    if x <= 0 {
        return 0; // Early return for invalid input
    }

    // Continue processing
    x * 2
}
```

Understanding this expression-based nature of Rust is key to writing idiomatic and effective code.

## Introduction to Closures

Closures are anonymous functions that can capture their environment—essentially functions without names that can use variables from the scope where they're defined.

### Basic Closure Syntax

```rust
fn main() {
    // A simple closure that takes one parameter
    let add_one = |x| x + 1;

    // Using the closure
    let five = add_one(4);
    println!("4 + 1 = {}", five); // Prints: 4 + 1 = 5

    // A closure with explicit type annotations
    let add_two: fn(i32) -> i32 = |x| x + 2;
    println!("4 + 2 = {}", add_two(4)); // Prints: 4 + 2 = 6
}
```

Closures can be defined with:

- Less verbosity than functions, often with type inference
- Parameters enclosed in `|` pipes rather than parentheses
- No requirement for type annotations unless needed for clarity

### Capturing the Environment

A key feature of closures is their ability to capture variables from their surrounding scope:

```rust
fn main() {
    let multiplier = 3;

    // This closure captures 'multiplier' from its environment
    let multiply = |x| x * multiplier;

    println!("5 * 3 = {}", multiply(5)); // Prints: 5 * 3 = 15
}
```

The closure `multiply` uses the variable `multiplier` that's defined outside the closure. This is called "capturing" the environment.

### Types of Capture

Closures can capture variables in three ways:

1. **By reference** (`&T`): Borrows values
2. **By mutable reference** (`&mut T`): Borrows values with ability to change them
3. **By value** (`T`): Takes ownership of values

```rust
fn main() {
    let text = String::from("Hello");
    let print = || println!("{}", text);  // Captures by reference

    let mut count = 0;
    let mut increment = || {
        count += 1;  // Captures by mutable reference
        println!("Count: {}", count);
    };

    let owned_text = String::from("mine");
    let take_ownership = move || {
        println!("I own: {}", owned_text);  // Captures by value with 'move'
    };

    print();
    increment();
    increment();
    take_ownership();

    // text and count are still accessible here
    println!("Text: {}, Count: {}", text, count);

    // owned_text is no longer accessible
    // println!("{}", owned_text);  // This would cause a compile error
}
```

The `move` keyword forces a closure to take ownership of the values it uses from its environment, which is especially important for concurrency, which we'll explore in later chapters.

### Using Closures as Function Arguments

Functions can take closures as arguments, which enables powerful programming patterns:

```rust
fn run_function<F>(f: F) -> i32
where
    F: Fn() -> i32,
{
    f()
}

fn main() {
    let answer = run_function(|| 42);
    println!("The answer is: {}", answer); // Prints: The answer is: 42
}
```

The generic type parameter `F` and the `Fn` trait constraint allow the function to accept any closure that takes no arguments and returns an `i32`.

## Basic Higher-Order Functions

Higher-order functions either take functions as arguments or return functions as results. They're a cornerstone of functional programming in Rust.

### Map, Filter, and Fold

The standard library provides several higher-order functions for collections:

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    // Using map to transform each element
    let doubled: Vec<i32> = numbers.iter().map(|x| x * 2).collect();
    println!("Doubled: {:?}", doubled); // [2, 4, 6, 8, 10]

    // Using filter to keep only elements that satisfy a condition
    let even: Vec<&i32> = numbers.iter().filter(|&&x| x % 2 == 0).collect();
    println!("Even numbers: {:?}", even); // [2, 4]

    // Using fold to accumulate a result
    let sum: i32 = numbers.iter().fold(0, |acc, x| acc + x);
    println!("Sum: {}", sum); // 15
}
```

These functions demonstrate the power of closures and higher-order functions for data processing:

- `map` applies a function to each element, creating a new collection
- `filter` keeps only elements that match a predicate
- `fold` (also known as reduce) combines elements into a single result

### Chaining Iterator Methods

Higher-order functions can be chained together to create complex data transformations:

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    let result: i32 = numbers.iter()
        .filter(|&&x| x % 2 == 0)  // Keep even numbers
        .map(|&x| x * x)           // Square each number
        .sum();                    // Sum the results

    println!("Sum of squares of even numbers: {}", result); // 220
}
```

This approach is:

- Declarative: You describe what you want, not how to do it
- Composable: Operations can be combined in flexible ways
- Readable: The data transformation is expressed as a pipeline

### Custom Higher-Order Functions

You can create your own higher-order functions:

```rust
fn apply_twice<F>(f: F, x: i32) -> i32
where
    F: Fn(i32) -> i32,
{
    f(f(x))
}

fn main() {
    let add_one = |x| x + 1;
    let result = apply_twice(add_one, 5);
    println!("apply_twice(add_one, 5) = {}", result); // 7 (5+1+1)

    let multiply_by_2 = |x| x * 2;
    let result = apply_twice(multiply_by_2, 5);
    println!("apply_twice(multiply_by_2, 5) = {}", result); // 20 (5*2*2)
}
```

The function `apply_twice` is generic over any function `F` that takes an `i32` and returns an `i32`.

### Common Traits for Function Types

Rust defines several traits for function types:

- `Fn`: Closures that capture by reference
- `FnMut`: Closures that capture by mutable reference
- `FnOnce`: Closures that capture by value

These traits provide fine-grained control over closure behavior:

```rust
fn call_once<F>(f: F)
where
    F: FnOnce() -> String,
{
    println!("{}", f());
}

fn call_mut<F>(mut f: F)
where
    F: FnMut() -> i32,
{
    println!("Result: {}", f());
    println!("Result again: {}", f());
}

fn main() {
    let s = String::from("hello");

    // FnOnce - can only be called once because it consumes s
    call_once(|| s + " world");
    // s is moved now, can't use it anymore

    let mut counter = 0;

    // FnMut - can modify its environment
    call_mut(|| {
        counter += 1;
        counter
    });

    println!("Final counter: {}", counter); // 2
}
```

We'll explore these traits in more depth in Chapter 23 on closures.

## Function Overloading (or lack thereof)

Unlike some other languages like C++ or Java, Rust does not support function overloading—defining multiple functions with the same name but different parameter types. Instead, Rust offers several alternative approaches to achieve similar functionality.

### Why No Function Overloading?

The lack of function overloading in Rust is a deliberate design decision that:

- Simplifies the language and compiler
- Makes code more explicit and easier to understand
- Avoids ambiguity in function resolution
- Works better with Rust's trait system

### Alternatives to Function Overloading

#### Trait Methods

Different traits can define methods with the same name:

```rust
trait Speak {
    fn speak(&self);
}

trait Greet {
    fn speak(&self); // Same name as in Speak trait
}

struct Person {
    name: String,
}

impl Speak for Person {
    fn speak(&self) {
        println!("{} is speaking.", self.name);
    }
}

impl Greet for Person {
    fn speak(&self) {
        println!("Hello, I'm {}.", self.name);
    }
}

fn main() {
    let person = Person { name: String::from("Alice") };

    // Need to specify which implementation to use
    Speak::speak(&person); // Alice is speaking.
    Greet::speak(&person); // Hello, I'm Alice.
}
```

#### Generic Functions

Generic functions can often replace the need for overloading:

```rust
// Instead of separate functions for different numeric types:
// fn add_i32(a: i32, b: i32) -> i32 { a + b }
// fn add_f64(a: f64, b: f64) -> f64 { a + b }

// Use a generic function:
fn add<T: std::ops::Add<Output = T>>(a: T, b: T) -> T {
    a + b
}

fn main() {
    println!("5 + 10 = {}", add(5, 10));            // Works with integers
    println!("3.14 + 2.71 = {}", add(3.14, 2.71));  // Works with floats
}
```

The generic function works with any type that implements the `Add` trait with itself.

#### Enum Parameters

For a small, fixed set of types, you can use an enum:

```rust
enum Number {
    Integer(i32),
    Float(f64),
}

fn print_number(num: Number) {
    match num {
        Number::Integer(i) => println!("Integer: {}", i),
        Number::Float(f) => println!("Float: {}", f),
    }
}

fn main() {
    print_number(Number::Integer(42));
    print_number(Number::Float(3.14));
}
```

#### Optional Parameters

Rust doesn't have default parameters, but you can simulate them with `Option` types:

```rust
fn greet(name: &str, prefix: Option<&str>) {
    match prefix {
        Some(p) => println!("{} {}", p, name),
        None => println!("Hello, {}", name),
    }
}

fn main() {
    greet("Alice", Some("Ms."));  // Ms. Alice
    greet("Bob", None);           // Hello, Bob
}
```

This pattern allows you to make parameters optional without creating multiple function versions.

#### Builder Pattern

For functions with many optional parameters, consider the Builder pattern:

```rust
struct GreetingBuilder {
    name: String,
    prefix: Option<String>,
    suffix: Option<String>,
    formal: bool,
}

impl GreetingBuilder {
    fn new(name: &str) -> Self {
        GreetingBuilder {
            name: name.to_string(),
            prefix: None,
            suffix: None,
            formal: false,
        }
    }

    fn with_prefix(mut self, prefix: &str) -> Self {
        self.prefix = Some(prefix.to_string());
        self
    }

    fn with_suffix(mut self, suffix: &str) -> Self {
        self.suffix = Some(suffix.to_string());
        self
    }

    fn formal(mut self) -> Self {
        self.formal = true;
        self
    }

    fn build(self) -> String {
        let mut result = String::new();

        if let Some(p) = self.prefix {
            result.push_str(&p);
            result.push(' ');
        }

        if self.formal {
            result.push_str("Dear ");
        }

        result.push_str(&self.name);

        if let Some(s) = self.suffix {
            result.push(' ');
            result.push_str(&s);
        }

        result
    }
}

fn main() {
    // Basic greeting
    let greeting = GreetingBuilder::new("Alice").build();
    println!("{}", greeting);  // Alice

    // Formal greeting with prefix and suffix
    let formal_greeting = GreetingBuilder::new("Mr. Smith")
        .formal()
        .with_suffix("Esq.")
        .build();
    println!("{}", formal_greeting);  // Dear Mr. Smith Esq.
}
```

This pattern allows for highly customizable function calls with clear semantics.

## Organizing Code with Functions

Well-organized code improves readability and maintainability. Functions play a key role in this organization.

### Function Grouping

Group related functions together in modules or files:

```rust
// File: math_utils.rs
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

pub fn subtract(a: i32, b: i32) -> i32 {
    a - b
}

pub fn multiply(a: i32, b: i32) -> i32 {
    a * b
}

pub fn divide(a: i32, b: i32) -> Option<i32> {
    if b == 0 {
        None
    } else {
        Some(a / b)
    }
}
```

This organization makes it easier to find related functionality and keeps your codebase clean.

### Private Helper Functions

Use private functions for internal implementation details:

```rust
pub fn process_data(data: &[i32]) -> i32 {
    // Public interface
    let clean_data = clean_input(data);
    calculate_result(&clean_data)
}

// Private helper functions (not accessible outside this module)
fn clean_input(data: &[i32]) -> Vec<i32> {
    data.iter().filter(|&&x| x >= 0).cloned().collect()
}

fn calculate_result(data: &[i32]) -> i32 {
    data.iter().sum()
}
```

This approach provides a clean public API while hiding implementation details.

### Single Responsibility Principle

Each function should have a single, well-defined purpose:

```rust
// Bad: function does too many things
fn process_and_print_user_data(user_id: u32) {
    let user = fetch_user(user_id);
    let orders = get_user_orders(user_id);
    let total = calculate_total(&orders);
    println!("User: {}", user.name);
    println!("Total orders: ${:.2}", total);
}

// Better: split into focused functions
fn get_user_report(user_id: u32) -> UserReport {
    let user = fetch_user(user_id);
    let orders = get_user_orders(user_id);
    let total = calculate_total(&orders);
    UserReport { user, orders, total }
}

fn print_user_report(report: &UserReport) {
    println!("User: {}", report.user.name);
    println!("Total orders: ${:.2}", report.total);
}
```

Functions that adhere to the Single Responsibility Principle are:

- Easier to understand
- Easier to test
- More reusable
- Easier to maintain

### Function Length

Keep functions short and focused:

```rust
// Too long and complex
fn process_data(data: &[i32]) -> Vec<i32> {
    let mut result = Vec::new();

    for &item in data {
        if item > 0 {
            if item % 2 == 0 {
                result.push(item * 2);
            } else {
                result.push(item + 1);
            }
        } else if item < 0 {
            result.push(-item);
        }
    }

    result
}

// Better: broken down into smaller functions
fn process_data(data: &[i32]) -> Vec<i32> {
    data.iter()
        .filter(|&&x| x != 0)
        .map(|&x| transform_item(x))
        .collect()
}

fn transform_item(item: i32) -> i32 {
    if item > 0 {
        transform_positive(item)
    } else {
        transform_negative(item)
    }
}

fn transform_positive(item: i32) -> i32 {
    if item % 2 == 0 {
        item * 2
    } else {
        item + 1
    }
}

fn transform_negative(item: i32) -> i32 {
    -item
}
```

Shorter functions are generally easier to understand, test, and maintain.

## Debugging Function Calls

Effective debugging is essential for development. Rust provides several tools to help debug function calls.

### Tracing Function Execution

Add print statements to trace function execution:

```rust
fn factorial(n: u32) -> u32 {
    println!("factorial({}) called", n);

    if n <= 1 {
        println!("factorial({}) returning 1", n);
        1
    } else {
        let result = n * factorial(n - 1);
        println!("factorial({}) returning {}", n, result);
        result
    }
}

fn main() {
    println!("Calculating factorial(5)");
    let result = factorial(5);
    println!("Final result: {}", result);
}
```

This approach can help you understand the flow of function calls, especially in recursive functions.

### Using the dbg! Macro

The `dbg!` macro is perfect for quick debugging:

```rust
fn calculate_values(a: i32, b: i32) -> (i32, i32, i32) {
    let sum = dbg!(a + b);
    let product = dbg!(a * b);
    let difference = dbg!(a - b);

    dbg!((sum, product, difference))
}

fn main() {
    let result = calculate_values(5, 7);
    println!("Result: {:?}", result);
}
```

The `dbg!` macro prints the expression, file, and line number, and then returns the value. It's perfect for quick checks during development.

### Function Call Stack

When a panic occurs, Rust shows the function call stack:

```rust
fn a() {
    b();
}

fn b() {
    c(42);
}

fn c(value: i32) {
    if value == 42 {
        panic!("Found the answer!");
    }
}

fn main() {
    a();
}
```

Running this program will show a stack trace like:

```
thread 'main' panicked at 'Found the answer!', src/main.rs:10:9
stack backtrace:
   0: ...
   1: rust_out::c
   2: rust_out::b
   3: rust_out::a
   4: rust_out::main
   ...
```

This helps you trace the sequence of function calls that led to the panic.

### Adding Debug Information

For complex functions, add more detailed debugging:

```rust
fn process_item(item: &str) -> Result<i32, String> {
    println!("Processing item: {}", item);

    let parsed = match item.parse::<i32>() {
        Ok(n) => {
            println!("Successfully parsed {} as {}", item, n);
            n
        },
        Err(e) => {
            println!("Error parsing {}: {}", item, e);
            return Err(format!("Parse error: {}", e));
        }
    };

    let result = parsed * 2;
    println!("Calculated result: {}", result);

    Ok(result)
}
```

This approach provides more context about what's happening during function execution.

## 🔨 Project: Command-line Task Manager

Let's build a simple command-line task manager to practice everything we've learned about functions. This project will help you solidify your understanding of functions, function parameters, return values, and code organization.

### Project Requirements

1. Add, list, complete, and delete tasks
2. Save tasks to a file for persistence
3. Load tasks from a file when starting the program
4. Organize code with well-structured functions
5. Handle errors gracefully

### Step 1: Create the Project

First, let's create a new Rust project:

```bash
cargo new task_manager
cd task_manager
```

### Step 2: Add Dependencies

Edit your `Cargo.toml` file to add the dependencies we'll need:

```toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
chrono = "0.4"
```

We're using:

- `serde` and `serde_json` for serializing and deserializing our task data
- `chrono` for working with dates and times

### Step 3: Define the Task Structure

Now, let's create the main program in `src/main.rs`:

```rust
use std::fs;
use std::io::{self, Write};
use std::path::Path;
use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};

// Define the Task struct to represent a single task
#[derive(Debug, Serialize, Deserialize)]
struct Task {
    id: usize,
    description: String,
    completed: bool,
    created_at: DateTime<Local>,
}

impl Task {
    // Constructor function to create a new task
    fn new(id: usize, description: String) -> Self {
        Task {
            id,
            description,
            completed: false,
            created_at: Local::now(),
        }
    }

    // Method to display a task
    fn display(&self) {
        let status = if self.completed { "✓" } else { "☐" };
        println!(
            "{}. [{}] {} (created: {})",
            self.id,
            status,
            self.description,
            self.created_at.format("%Y-%m-%d %H:%M")
        );
    }
}

// TaskList to manage a collection of tasks
#[derive(Debug, Serialize, Deserialize)]
struct TaskList {
    tasks: Vec<Task>,
    next_id: usize,
}

impl TaskList {
    // Constructor for an empty task list
    fn new() -> Self {
        TaskList {
            tasks: Vec::new(),
            next_id: 1,
        }
    }
}

fn main() {
    // Load existing tasks or create a new task list
    let mut task_list = load_tasks().unwrap_or_else(|_| {
        println!("No existing tasks found. Starting with an empty list.");
        TaskList::new()
    });

    println!("Welcome to Task Manager!");
    print_help();

    // Main program loop
    loop {
        let command = get_user_input("Enter command (or 'help' for commands): ");

        match command.trim() {
            "add" => add_task(&mut task_list),
            "list" => list_tasks(&task_list),
            "complete" => complete_task(&mut task_list),
            "delete" => delete_task(&mut task_list),
            "help" => print_help(),
            "quit" | "exit" => break,
            _ => println!("Unknown command. Type 'help' for available commands."),
        }

        // Save after each change
        if let Err(e) = save_tasks(&task_list) {
            println!("Error saving tasks: {}", e);
        }
    }

    println!("Goodbye!");
}

// Function to display available commands
fn print_help() {
    println!("\nAvailable commands:");
    println!("  add       - Add a new task");
    println!("  list      - List all tasks");
    println!("  complete  - Mark a task as completed");
    println!("  delete    - Delete a task");
    println!("  help      - Show this help message");
    println!("  quit      - Exit the program");
}

// Function to get user input with a prompt
fn get_user_input(prompt: &str) -> String {
    print!("{}", prompt);
    io::stdout().flush().unwrap();

    let mut input = String::new();
    io::stdin().read_line(&mut input).expect("Failed to read input");
    input
}

// Function to add a new task
fn add_task(task_list: &mut TaskList) {
    let description = get_user_input("Enter task description: ");
    let description = description.trim().to_string();

    if description.is_empty() {
        println!("Task description cannot be empty!");
        return;
    }

    let task = Task::new(task_list.next_id, description);
    task_list.next_id += 1;
    task_list.tasks.push(task);

    println!("Task added successfully!");
}

// Function to list all tasks
fn list_tasks(task_list: &TaskList) {
    if task_list.tasks.is_empty() {
        println!("No tasks found.");
        return;
    }

    println!("\nYour tasks:");
    for task in &task_list.tasks {
        task.display();
    }
}

// Function to mark a task as completed
fn complete_task(task_list: &mut TaskList) {
    list_tasks(task_list);

    if task_list.tasks.is_empty() {
        return;
    }

    let input = get_user_input("Enter task ID to mark as completed: ");

    match input.trim().parse::<usize>() {
        Ok(id) => {
            if let Some(task) = task_list.tasks.iter_mut().find(|t| t.id == id) {
                task.completed = true;
                println!("Task marked as completed!");
            } else {
                println!("Task with ID {} not found!", id);
            }
        },
        Err(_) => println!("Invalid task ID!"),
    }
}

// Function to delete a task
fn delete_task(task_list: &mut TaskList) {
    list_tasks(task_list);

    if task_list.tasks.is_empty() {
        return;
    }

    let input = get_user_input("Enter task ID to delete: ");

    match input.trim().parse::<usize>() {
        Ok(id) => {
            let initial_len = task_list.tasks.len();
            task_list.tasks.retain(|t| t.id != id);

            if task_list.tasks.len() < initial_len {
                println!("Task deleted successfully!");
            } else {
                println!("Task with ID {} not found!", id);
            }
        },
        Err(_) => println!("Invalid task ID!"),
    }
}

// Function to save tasks to a file
fn save_tasks(task_list: &TaskList) -> io::Result<()> {
    let json = serde_json::to_string_pretty(task_list)?;
    fs::write("tasks.json", json)?;
    Ok(())
}

// Function to load tasks from a file
fn load_tasks() -> io::Result<TaskList> {
    // Check if file exists
    if !Path::new("tasks.json").exists() {
        return Err(io::Error::new(io::ErrorKind::NotFound, "Tasks file not found"));
    }

    let json = fs::read_to_string("tasks.json")?;
    let tasks = serde_json::from_str(&json)?;
    Ok(tasks)
}
```

### Step 4: Build and Run the Task Manager

```bash
cargo run
```

When you run the program, you'll see a welcome message and the available commands. You can add tasks, list them, mark them as completed, and delete them. Your tasks will be saved to a file and loaded the next time you run the program.

### Step 5: Understanding the Code Organization

This task manager demonstrates several key concepts about functions:

1. **Single Responsibility**: Each function has a clear, specific purpose. For example, `add_task` only adds a task, and `delete_task` only deletes a task.

2. **Error Handling**: Functions like `save_tasks` and `load_tasks` return `Result` types to handle potential errors.

3. **Helper Functions**: `get_user_input` encapsulates common functionality that's used by multiple other functions.

4. **Methods vs Functions**: Task-specific behaviors are methods on structs (like `Task::new` and `Task::display`), while operations on the overall program are standalone functions.

5. **Function Composition**: The main program flow uses function composition to build a complete application from smaller, focused functions.

6. **Parameter Passing**: Different functions demonstrate various ways to pass parameters:
   - `list_tasks` takes an immutable reference (`&TaskList`)
   - `add_task` takes a mutable reference (`&mut TaskList`)
   - `Task::new` takes ownership of the `description` parameter

### Step 6: Extending the Project

Here are some ways you could extend the task manager to practice more advanced function concepts:

1. **Add due dates to tasks**: Implement a new field for due dates and functions to sort or filter tasks by due date.

2. **Implement task priorities**: Add a priority level to tasks and create functions to sort tasks by priority.

3. **Add filtering and sorting options**: Create functions that return filtered subsets of tasks or sort tasks in different ways.

4. **Create project categories for tasks**: Implement a category system for tasks and functions to filter tasks by category.

5. **Add task notes or descriptions**: Allow users to add detailed notes to tasks and implement functions to display or search notes.

6. **Implement search functionality**: Create a function that searches tasks by keywords in their descriptions.

7. **Add undo functionality**: Implement functions to undo the last operation.

Each of these extensions would give you more practice with function design, parameter passing, and organizing code effectively.

## Summary

In this chapter, we've explored functions and procedures in Rust, learning how they serve as the fundamental building blocks for organizing and structuring your code. We've covered:

- Defining and calling functions with the `fn` keyword
- Working with parameters and return values
- The distinction between expressions and statements in function bodies
- Different ways to pass arguments: by value and by reference
- Rust's lack of function overloading and alternatives like generics
- Closures as anonymous functions that can capture their environment
- Higher-order functions that take functions as arguments or return them
- Best practices for organizing code with functions
- Debugging techniques for function calls
- Building a practical command-line task manager application

Functions are at the heart of Rust programming. They allow you to break down complex problems into smaller, manageable pieces, promote code reuse, and create clear abstractions. By mastering functions, you've taken a significant step toward becoming a proficient Rust programmer.

As you continue your Rust journey, you'll build on this foundation to explore more advanced topics like ownership (coming up in the next chapter), borrowing, traits, and generics. The function concepts you've learned here will serve as essential building blocks for these more advanced features.

## Exercises

1. **Function Signature Exploration**: Write a function that takes multiple parameters of different types and returns a tuple with multiple values. Experiment with different parameter and return types.

2. **Reference Parameter Practice**: Create a function that modifies a string in place using a mutable reference. Then create another function that only reads from a string using an immutable reference.

3. **Closure Experiment**: Write a program that creates closures capturing variables in different ways (by reference, by mutable reference, and by value with `move`). Observe how this affects the accessibility of the captured variables after the closure is used.

4. **Higher-Order Function Implementation**: Create your own higher-order function that takes a function as a parameter and applies it to each element of a collection, similar to `map`. Test it with different closures.

5. **Function Organization Challenge**: Take an existing program with a long, complex function and refactor it into multiple smaller functions, each with a single responsibility.

6. **Advanced Task Manager**: Extend the task manager project with at least two of the suggested extensions from Step 6.

7. **Generic Function Practice**: Write a generic function that works with multiple types that implement a specific trait, similar to the `add` function example.

8. **Builder Pattern Implementation**: Create a complex data structure and implement the Builder pattern to construct it with various optional parameters.

## Further Reading

- [The Rust Programming Language: Functions](https://doc.rust-lang.org/book/ch03-03-how-functions-work.html)
- [The Rust Programming Language: Closures](https://doc.rust-lang.org/book/ch13-01-closures.html)
- [Rust By Example: Functions](https://doc.rust-lang.org/rust-by-example/fn.html)
- [Rust By Example: Closures](https://doc.rust-lang.org/rust-by-example/fn/closures.html)
- [Rust Design Patterns: Builder Pattern](https://rust-unofficial.github.io/patterns/patterns/creational/builder.html)
- [Rust Cookbook: Algorithms](https://rust-lang-nursery.github.io/rust-cookbook/algorithms.html) - For examples of higher-order functions
- [Rust API Guidelines: Function Design](https://rust-lang.github.io/api-guidelines/flexibility.html)
- [Common Rust Function Patterns](https://davidkoloski.me/blog/function-parameters-in-rust/) - Blog about function parameter patterns in Rust
