# Chapter 26: Macros and Metaprogramming

## Introduction

In the previous chapters, we've explored a wide range of Rust's features, from basic syntax to advanced concepts like asynchronous programming. Throughout this journey, you may have noticed code like `println!()`, `vec![]`, or `assert_eq!()` with an exclamation mark. These are _macros_, one of Rust's most powerful metaprogramming features.

Metaprogramming is the practice of writing code that manipulates or generates other code. In Rust, macros provide a way to extend the language by enabling code generation at compile time. While functions and traits offer powerful abstractions, macros take this a step further by allowing you to define new syntax and idioms that would otherwise be impossible within the constraints of the language.

Think of macros as sophisticated code templates or mini-compilers. When you invoke a macro, the Rust compiler expands it into more complex code before proceeding with the regular compilation process. This expansion happens during compile time, not at runtime, which means macros have zero runtime overhead—the expanded code is what actually gets compiled.

Rust offers several types of macros, each with different capabilities and use cases:

1. **Declarative macros** (`macro_rules!`): Pattern-matching macros that operate like sophisticated find-and-replace functions
2. **Procedural macros**: Code that operates on Rust's abstract syntax tree, including:
   - **Derive macros**: Add implementations to structs and enums
   - **Attribute macros**: Create custom attributes for code
   - **Function-like procedural macros**: Look like function calls but operate on tokens

In this chapter, we'll explore each type of macro, understand when to use them, learn the principles of macro hygiene, and develop practical skills for creating and debugging macros. By the end, you'll have added a powerful tool to your Rust programming toolkit that enables you to reduce boilerplate, create elegant domain-specific languages, and extend the language in ways that fit your specific needs.

Let's begin by understanding what macros are and how they differ from functions.

## What Are Macros?

Macros are a way to write code that writes other code, which is then compiled along with the rest of your program. Unlike functions, which are called at runtime, macros are expanded at compile time. This fundamental difference gives macros unique capabilities that can't be achieved with regular functions.

### Macros vs. Functions

To understand macros, it's helpful to compare them with functions:

| Characteristic  | Functions        | Macros                         |
| --------------- | ---------------- | ------------------------------ |
| Execution time  | Runtime          | Compile time                   |
| Type checking   | Before execution | After expansion                |
| Arguments       | Fixed number     | Variable number                |
| Overloading     | Not supported    | Supported via pattern matching |
| Return values   | Single value     | Can generate multiple items    |
| Scope awareness | Limited          | Can manipulate scope           |

Let's explore these differences with examples:

#### 1. Variable Number of Arguments

Functions in Rust require a fixed number of arguments with specific types:

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b
}

// Can only call with exactly 2 arguments
let sum = add(1, 2);
```

Macros, however, can accept a variable number of arguments:

```rust
// The println! macro can take any number of arguments
println!("Hello");
println!("Hello, {}", name);
println!("Hello, {}, {}, and {}", a, b, c);
```

#### 2. Generating Multiple Items

Functions must return a single value (even if it's a tuple or other container):

```rust
fn create_point() -> (i32, i32) {
    (0, 0)
}
```

Macros can generate multiple independent items:

```rust
macro_rules! create_functions {
    ($($name:ident),*) => {
        $(
            fn $name() {
                println!("Called function {}", stringify!($name));
            }
        )*
    }
}

// Generates three separate function definitions
create_functions!(foo, bar, baz);

fn main() {
    foo(); // Prints: Called function foo
    bar(); // Prints: Called function bar
    baz(); // Prints: Called function baz
}
```

#### 3. Type Flexibility

Functions have strict type requirements:

```rust
fn first<T>(list: &[T]) -> Option<&T> {
    if list.is_empty() {
        None
    } else {
        Some(&list[0])
    }
}
```

Macros can operate on different types without generic parameters:

```rust
macro_rules! first {
    ($arr:expr) => {
        if $arr.len() > 0 {
            Some(&$arr[0])
        } else {
            None
        }
    };
}

// Works with any type that has .len() and supports indexing
first!([1, 2, 3]);       // Some(&1)
first!(vec!["a", "b"]);  // Some(&"a")
```

#### 4. Compile-Time Code Generation

Functions cannot generate new code structures:

```rust
// This is not possible with functions
fn create_struct(name: &str) {
    // Can't generate a struct definition at runtime
}
```

Macros can generate entire code structures:

```rust
macro_rules! create_struct {
    ($name:ident, $($field:ident: $ty:ty),*) => {
        struct $name {
            $($field: $ty),*
        }
    }
}

// Generates a struct definition
create_struct!(Point, x: f64, y: f64);

fn main() {
    let p = Point { x: 1.0, y: 2.0 };
}
```

### When to Use Macros

Given their power, you might wonder why we don't use macros for everything. The answer lies in the trade-offs:

#### Advantages of Macros

1. **Reduce repetition**: Generate similar code patterns without duplication
2. **Create domain-specific languages**: Design syntax tailored to specific problems
3. **Conditional compilation**: Include or exclude code based on compile-time factors
4. **Interface with the type system**: Generate implementations based on type information
5. **Extend the language**: Add features that feel like part of Rust itself

#### Disadvantages of Macros

1. **Complexity**: Macros are harder to write, read, and debug than regular code
2. **Error messages**: Errors in generated code can be confusing to trace back to the macro
3. **Limited tooling**: IDE support for macros is less mature than for regular Rust code
4. **Cognitive overhead**: Macros require understanding both the macro itself and its expansion

As a rule of thumb:

> Use a function when you can, use a macro when you must.

Macros are most appropriate when:

- You need to reduce significant boilerplate that can't be abstracted with functions/traits
- You're working with compile-time metaprogramming
- You need to create custom syntax or domain-specific languages
- You want to provide a more ergonomic API that reduces cognitive overhead

### Built-in Macros in Rust

Rust provides several built-in macros that you likely use regularly:

#### Format Macros

```rust
// Print to standard output
println!("Hello, {}!", "world");

// Print to standard error
eprintln!("Error: {}", "something went wrong");

// Format into a String
let s = format!("Value: {}", 42);

// Write to a buffer
use std::io::Write;
let mut buf = Vec::new();
write!(&mut buf, "Data: {}", "bytes").unwrap();
```

#### Collection Macros

```rust
// Create a vector
let v = vec![1, 2, 3];

// Create a hash map
use std::collections::HashMap;
let map = HashMap::from([
    ("key1", "value1"),
    ("key2", "value2"),
]);
```

#### Assertion Macros

```rust
// Assert equality
assert_eq!(2 + 2, 4);

// Assert inequality
assert_ne!(10, 5);

// General assertion with custom message
assert!(value > 0, "Value must be positive, got {}", value);
```

#### Debug Macros

```rust
// Print debug representation
dbg!(value);

// Print and capture for inspection
let result = dbg!(complex_expression());
```

#### Other Common Macros

```rust
// Include file contents as a &str
let config = include_str!("config.json");

// Include file contents as a byte array
let image = include_bytes!("image.png");

// Compile-time string concatenation
let path = concat!("/home/", "user", "/config");

// Get environment variable at compile time
let version = env!("VERSION");

// Optional environment variable
let debug = option_env!("DEBUG").unwrap_or("false");

// Current file, line, and column
println!("Error at {}:{}:{}", file!(), line!(), column!());
```

### Understanding Macro Expansion

To truly understand macros, it's helpful to see what they expand to. The Rust Playground or the `cargo expand` command (from the `cargo-expand` crate) can show you the expanded code.

For example, this macro invocation:

```rust
let numbers = vec![1, 2, 3];
```

Expands to something like:

```rust
let numbers = {
    let mut v = Vec::new();
    v.push(1);
    v.push(2);
    v.push(3);
    v
};
```

This reveals how the `vec!` macro creates temporary variables and multiple statements—something a function couldn't do.

In the next section, we'll dive deeper into declarative macros and learn how to create our own using the `macro_rules!` system.

## Declarative Macros (`macro_rules!`)

Declarative macros, created with the `macro_rules!` syntax, are the most common type of macro in Rust. They provide a pattern-matching system that lets you transform input code into output code based on syntax patterns.

### Basic Syntax

The general syntax for defining a declarative macro is:

```rust
macro_rules! macro_name {
    (pattern1) => {
        // Expansion code for pattern1
    };
    (pattern2) => {
        // Expansion code for pattern2
    };
    // More patterns...
}
```

Each pattern represents a possible way to invoke the macro, and the corresponding expansion is the code that will replace the macro invocation. Let's start with a simple example:

```rust
macro_rules! say_hello {
    () => {
        println!("Hello, World!");
    };
}

fn main() {
    say_hello!();  // Expands to: println!("Hello, World!");
}
```

In this case, we have a simple macro with a single pattern that matches when the macro is called with no arguments. When matched, it expands to a `println!` statement.

### Pattern Matching and Metavariables

Declarative macros become powerful when you start using pattern matching and metavariables. Metavariables capture parts of the input pattern to use in the output.

Here's the syntax for a metavariable:

```
$name:type
```

Where:

- `$name` is the name of the metavariable
- `type` is the designator specifying what kind of syntax element it matches

Let's see an example with metavariables:

```rust
macro_rules! say_hello {
    // Pattern with a single identifier
    ($name:ident) => {
        println!("Hello, {}!", stringify!($name));
    };
}

fn main() {
    say_hello!(World);  // Expands to: println!("Hello, {}!", "World");
}
```

Here, `$name:ident` captures an identifier in the macro call and uses it in the expansion. The `stringify!` macro converts the identifier to a string literal.

### Common Designators

Rust provides several designators to match different kinds of syntax elements:

| Designator | Matches                                                     |
| ---------- | ----------------------------------------------------------- |
| `ident`    | Identifiers (`foo`, `bar`)                                  |
| `expr`     | Expressions (`2 + 2`, `foo()`, `&value`)                    |
| `block`    | Block expressions (`{ ... }`)                               |
| `path`     | Paths (`std::collections::HashMap`)                         |
| `tt`       | Token tree (a single token or balanced `()`, `[]`, or `{}`) |
| `item`     | Items (functions, structs, modules, etc.)                   |
| `ty`       | Types (`i32`, `String`, `Vec<u8>`)                          |
| `pat`      | Patterns (as used in `match` arms)                          |
| `stmt`     | Statements                                                  |
| `meta`     | Meta items (attributes)                                     |
| `literal`  | Literals (`42`, `"hello"`)                                  |
| `vis`      | Visibility qualifiers (`pub`, `pub(crate)`)                 |
| `lifetime` | Lifetime annotations (`'a`, `'static`)                      |

Let's see examples of some common designators:

```rust
macro_rules! examples {
    // Match an expression
    (expr: $e:expr) => {
        println!("Expression: {}", $e);
    };

    // Match an identifier
    (ident: $i:ident) => {
        println!("Identifier: {}", stringify!($i));
    };

    // Match a type
    (type: $t:ty) => {
        println!("Type: {}", stringify!($t));
    };

    // Match a block
    (block: $b:block) => {
        println!("About to execute block");
        $b
        println!("Block executed");
    };
}

fn main() {
    examples!(expr: 2 + 2);           // Expression: 4
    examples!(ident: hello);          // Identifier: hello
    examples!(type: Vec<String>);     // Type: Vec<String>
    examples!(block: {                // About to execute block
        println!("Inside block");     // Inside block
    });                               // Block executed
}
```

### Repetition with Fragments

One of the most powerful features of declarative macros is the ability to repeat patterns using the `$(...)` syntax with a separator and a repetition operator:

```
$(...),*      // Repeat with comma separator (0 or more times)
$(...);*      // Repeat with semicolon separator (0 or more times)
$(...)+       // Repeat 1 or more times
$(...)?       // Optional (0 or 1 times)
```

Here's an example that creates a vector with a variable number of elements:

```rust
macro_rules! make_vec {
    ($($element:expr),*) => {
        {
            let mut v = Vec::new();
            $(
                v.push($element);
            )*
            v
        }
    };
}

fn main() {
    let v1 = make_vec!();             // Creates an empty vector
    let v2 = make_vec!(1);            // Creates a vector with one element
    let v3 = make_vec!(1, 2, 3, 4);   // Creates a vector with multiple elements

    println!("{:?}", v3);  // [1, 2, 3, 4]
}
```

Let's break down how this works:

1. `$($element:expr),*` matches zero or more expressions separated by commas
2. Each matched expression is bound to the `$element` metavariable
3. In the expansion, we create a new vector and then repeat `v.push($element);` for each captured expression

### Matching Multiple Patterns

Macros can have multiple patterns to handle different invocation styles:

```rust
macro_rules! print_result {
    // Pattern 1: Single expression
    ($expression:expr) => {
        println!("{} = {}", stringify!($expression), $expression);
    };

    // Pattern 2: Expression with a custom message
    ($expression:expr, $message:expr) => {
        println!("{}: {}", $message, $expression);
    };
}

fn main() {
    print_result!(10 * 10);           // 10 * 10 = 100
    print_result!(10 * 10, "Result"); // Result: 100
}
```

The compiler tries each pattern in order and uses the first one that matches.

### Recursive Macros

Macros can call themselves recursively, which is useful for processing nested structures:

```rust
macro_rules! calculate {
    // Base case: single value
    ($value:expr) => {
        $value
    };

    // Recursive case: addition
    ($first:expr, + $($rest:tt)+) => {
        $first + calculate!($($rest)+)
    };

    // Recursive case: subtraction
    ($first:expr, - $($rest:tt)+) => {
        $first - calculate!($($rest)+)
    };
}

fn main() {
    let result = calculate!(10, + 20, - 5, + 7);
    println!("Result: {}", result);  // Result: 32
}
```

This macro processes a series of operations from left to right. The patterns use the token tree (`tt`) designator to capture the remaining tokens for recursive processing.

### Advanced Techniques

Let's explore some advanced techniques with declarative macros:

#### Internal Rules with `@`

You can define internal rules that aren't directly exposed to users by using patterns that start with `@`:

```rust
macro_rules! complex {
    // Public interface
    ($($element:expr),*) => {
        complex!(@internal, Vec::new(), $($element),*)
    };

    // Internal implementation
    (@internal, $vec:expr, $($element:expr),*) => {
        {
            let mut v = $vec;
            $(
                v.push($element);
            )*
            v
        }
    };
}

fn main() {
    let v = complex!(1, 2, 3);
    println!("{:?}", v);  // [1, 2, 3]
}
```

#### Matching Different Delimiters

Macros can match different types of delimiters:

```rust
macro_rules! with_delimiters {
    // Match parentheses
    (($($inner:tt)*)) => {
        println!("Parentheses: {}", stringify!($($inner)*));
    };

    // Match square brackets
    ([$($inner:tt)*]) => {
        println!("Square brackets: {}", stringify!($($inner)*));
    };

    // Match curly braces
    ({$($inner:tt)*}) => {
        println!("Curly braces: {}", stringify!($($inner)*));
    };
}

fn main() {
    with_delimiters!((a b c));    // Parentheses: a b c
    with_delimiters!([x y z]);    // Square brackets: x y z
    with_delimiters!({foo bar});  // Curly braces: foo bar
}
```

#### Counting in Macros

Counting at compile time can be useful, but it requires recursive patterns:

```rust
macro_rules! count_exprs {
    () => (0);
    ($e:expr) => (1);
    ($e:expr, $($rest:expr),+) => (1 + count_exprs!($($rest),+));
}

fn main() {
    let count = count_exprs!(1, 2, 3, 4);
    println!("Count: {}", count);  // Count: 4
}
```

#### Conditional Expansion

You can use different expansion patterns based on input:

```rust
macro_rules! check_condition {
    ($condition:expr, $true_case:expr, $false_case:expr) => {
        if $condition {
            $true_case
        } else {
            $false_case
        }
    };
}

fn main() {
    let value = 42;
    let result = check_condition!(value > 50, "Greater than 50", "Less than or equal to 50");
    println!("Result: {}", result);  // Result: Less than or equal to 50
}
```

### Debugging Declarative Macros

Debugging macros can be challenging. Here are some techniques:

#### Using `trace_macros!`

The `trace_macros!` feature (available only in nightly Rust) shows the expansion of macros as they happen:

```rust
#![feature(trace_macros)]

trace_macros!(true);
make_vec!(1, 2, 3);
trace_macros!(false);
```

#### Using `log_syntax!`

The `log_syntax!` macro (also nightly-only) logs the tokens it receives:

```rust
#![feature(log_syntax)]

macro_rules! debug_macro {
    ($($tokens:tt)*) => {
        log_syntax!($($tokens)*);
    }
}
```

#### Using `cargo expand`

For stable Rust, the `cargo-expand` tool is invaluable:

```bash
cargo install cargo-expand
cargo expand
```

This shows the expanded code after macro expansion.

### Limitations of Declarative Macros

While powerful, declarative macros have limitations:

1. **Limited parsing capabilities**: They can only match against predefined patterns
2. **Cryptic error messages**: When macros fail to match, the error messages can be confusing
3. **No semantic understanding**: They operate purely on syntax without understanding of types or meanings
4. **Limited recursion**: The compiler limits recursion depth to prevent infinite expansion
5. **Debugging difficulty**: Errors in expanded code can be hard to trace back to the macro

Despite these limitations, declarative macros are an essential tool in many Rust libraries and applications. For more complex metaprogramming needs, procedural macros offer even more power, which we'll explore in the next section.

### Practical Example: Building a SQL-like DSL

Let's conclude this section with a practical example that combines many of the techniques we've discussed. We'll create a simple SQL-like domain-specific language for querying data:

```rust
macro_rules! sql {
    // SELECT clause
    (SELECT $($column:ident),* FROM $table:ident) => {
        sql!(SELECT $($column),* FROM $table WHERE true)
    };

    // SELECT with WHERE clause
    (SELECT $($column:ident),* FROM $table:ident WHERE $condition:expr) => {
        {
            println!("Executing query on table: {}", stringify!($table));

            // This would actually query a database in a real implementation
            let results = vec![
                // Simulate some results
                $(stringify!($column)),*
            ];

            // Apply the WHERE condition (simplified)
            if $condition {
                results
            } else {
                Vec::new()
            }
        }
    };
}

fn main() {
    // Simple query
    let columns = sql!(SELECT id, name, age FROM users);
    println!("Columns: {:?}", columns);

    // Query with condition
    let filtered = sql!(SELECT id, email FROM users WHERE true);
    println!("Filtered: {:?}", filtered);
}
```

This simple DSL allows us to write code that looks like SQL queries, demonstrating how macros can create domain-specific languages in Rust.

In the next section, we'll explore procedural macros, which offer even more powerful metaprogramming capabilities by operating directly on Rust's syntax tree.

## Procedural Macros

While declarative macros are powerful, they have limitations. Procedural macros take metaprogramming in Rust to the next level. Unlike declarative macros, which use pattern matching, procedural macros are actual Rust functions that operate on raw tokens or abstract syntax trees.

Procedural macros enable more complex code generation and manipulation, making them ideal for generating implementations, creating domain-specific languages, and providing custom syntax extensions.

### Setting Up a Procedural Macro Crate

Procedural macros must be defined in their own crate with a special configuration. Here's how to set up a basic procedural macro crate:

1. Create a new library crate:

   ```bash
   cargo new --lib my_proc_macro
   ```

2. Configure `Cargo.toml`:

   ```toml
   [lib]
   proc-macro = true

   [dependencies]
   syn = "2.0"
   quote = "1.0"
   proc-macro2 = "1.0"
   ```

The three dependencies are standard for procedural macros:

- `syn`: Parses Rust code into a data structure for manipulation
- `quote`: Turns Rust syntax tree data structures back into code
- `proc-macro2`: A wrapper around the compiler's proc-macro API with better error handling

### Types of Procedural Macros

Rust offers three types of procedural macros:

1. **Derive macros**: Add implementations to structs and enums with `#[derive(MacroName)]`
2. **Attribute macros**: Create custom attributes with `#[my_attribute]`
3. **Function-like macros**: Look like function calls but operate on tokens with `my_macro!()`

Let's explore each type in detail.

### Derive Macros

Derive macros allow you to automatically implement traits for structs and enums using the `#[derive(MacroName)]` syntax. They're perfect for reducing boilerplate when implementing traits across many types.

#### Basic Structure of a Derive Macro

Here's the basic structure of a derive macro:

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput};

#[proc_macro_derive(MyTrait)]
pub fn my_trait_derive(input: TokenStream) -> TokenStream {
    // Parse the input tokens into a syntax tree
    let input = parse_macro_input!(input as DeriveInput);

    // Build the implementation
    let name = input.ident;
    let expanded = quote! {
        impl MyTrait for #name {
            fn my_method(&self) {
                println!("Hello from {}", stringify!(#name));
            }
        }
    };

    // Return the generated implementation
    TokenStream::from(expanded)
}
```

#### Example: Implementing a Simple Debug Clone

Let's create a macro that implements a simplified version of `Debug`:

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, Data, DeriveInput, Fields};

#[proc_macro_derive(SimpleDebug)]
pub fn simple_debug_derive(input: TokenStream) -> TokenStream {
    // Parse the input tokens
    let input = parse_macro_input!(input as DeriveInput);
    let name = input.ident;

    // Generate implementation based on struct or enum
    let implementation = match input.data {
        Data::Struct(data_struct) => {
            // Get fields for a struct
            match data_struct.fields {
                Fields::Named(fields) => {
                    let field_names = fields.named.iter().map(|field| &field.ident);

                    quote! {
                        impl std::fmt::Debug for #name {
                            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                                f.debug_struct(stringify!(#name))
                                    #( .field(stringify!(#field_names), &self.#field_names) )*
                                    .finish()
                            }
                        }
                    }
                },
                Fields::Unnamed(_) => {
                    quote! {
                        impl std::fmt::Debug for #name {
                            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                                f.debug_tuple(stringify!(#name))
                                    // Handle tuple fields here
                                    .finish()
                            }
                        }
                    }
                },
                Fields::Unit => {
                    quote! {
                        impl std::fmt::Debug for #name {
                            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                                f.write_str(stringify!(#name))
                            }
                        }
                    }
                },
            }
        },
        Data::Enum(_) => {
            // Implementation for enums would go here
            quote! {
                impl std::fmt::Debug for #name {
                    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                        write!(f, "Enum {}", stringify!(#name))
                    }
                }
            }
        },
        Data::Union(_) => {
            // Implementation for unions would go here
            quote! {
                impl std::fmt::Debug for #name {
                    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                        write!(f, "Union {}", stringify!(#name))
                    }
                }
            }
        },
    };

    TokenStream::from(implementation)
}
```

#### Using the Derive Macro

In the consumer crate, you would use the macro like this:

```rust
use my_proc_macro::SimpleDebug;

#[derive(SimpleDebug)]
struct Person {
    name: String,
    age: u32,
}

fn main() {
    let person = Person {
        name: "Alice".to_string(),
        age: 30,
    };

    println!("{:?}", person);
}
```

#### Derive Macros with Custom Attributes

You can also add custom attributes to your derive macros using the `#[proc_macro_derive(Name, attributes(attr_name))]` syntax:

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput, Attribute, Meta, NestedMeta};

#[proc_macro_derive(Builder, attributes(builder))]
pub fn builder_derive(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = input.ident;
    let builder_name = syn::Ident::new(&format!("{}Builder", name), name.span());

    // Implementation details would go here

    TokenStream::from(quote! {
        // Generated builder implementation
    })
}
```

### Attribute Macros

Attribute macros define new attributes that can be applied to items like functions, structs, or modules. They're useful for adding behavior or transformations to existing code.

#### Basic Structure of an Attribute Macro

Here's the basic structure of an attribute macro:

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

#[proc_macro_attribute]
pub fn my_attribute(attr: TokenStream, item: TokenStream) -> TokenStream {
    // Parse attribute arguments
    let attr_args = parse_macro_input!(attr as syn::AttributeArgs);

    // Parse the item the attribute is applied to
    let input = parse_macro_input!(item as ItemFn);

    // Transform the item
    let name = &input.sig.ident;
    let inputs = &input.sig.inputs;
    let output = &input.sig.output;
    let body = &input.block;

    let result = quote! {
        fn #name(#inputs) #output {
            println!("Entering function {}", stringify!(#name));
            let result = #body;
            println!("Exiting function {}", stringify!(#name));
            result
        }
    };

    TokenStream::from(result)
}
```

#### Example: Timing Function Execution

Let's create an attribute macro that times how long a function takes to execute:

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

#[proc_macro_attribute]
pub fn timed(_attr: TokenStream, item: TokenStream) -> TokenStream {
    // Parse the function
    let input = parse_macro_input!(item as ItemFn);

    // Extract function details
    let name = &input.sig.ident;
    let inputs = &input.sig.inputs;
    let output = &input.sig.output;
    let block = &input.block;

    // Generate the new function with timing
    let expanded = quote! {
        fn #name(#inputs) #output {
            let start = std::time::Instant::now();
            let result = #block;
            let duration = start.elapsed();
            println!("Function '{}' took {:?}", stringify!(#name), duration);
            result
        }
    };

    TokenStream::from(expanded)
}
```

#### Using the Attribute Macro

In the consumer crate, you would use the macro like this:

```rust
use my_proc_macro::timed;

#[timed]
fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn main() {
    let result = fibonacci(20);
    println!("Result: {}", result);
}
```

#### Attribute Macros with Arguments

Attribute macros can also accept arguments:

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn, parse::Parse, parse::ParseStream, LitStr};

// Define a struct to parse attribute arguments
struct LogArgs {
    message: LitStr,
}

impl Parse for LogArgs {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let message = input.parse()?;
        Ok(LogArgs { message })
    }
}

#[proc_macro_attribute]
pub fn log(attr: TokenStream, item: TokenStream) -> TokenStream {
    // Parse attribute arguments
    let args = parse_macro_input!(attr as LogArgs);
    let message = &args.message;

    // Parse the function
    let input = parse_macro_input!(item as ItemFn);
    let name = &input.sig.ident;
    let inputs = &input.sig.inputs;
    let output = &input.sig.output;
    let block = &input.block;

    // Generate the modified function
    let expanded = quote! {
        fn #name(#inputs) #output {
            println!("{}: Entering function {}", #message, stringify!(#name));
            let result = #block;
            println!("{}: Exiting function {}", #message, stringify!(#name));
            result
        }
    };

    TokenStream::from(expanded)
}
```

This would be used like:

```rust
#[log("DEBUG")]
fn process_data() {
    // Function implementation
}
```

### Function-Like Procedural Macros

Function-like procedural macros look like function calls in your code but operate on token streams at compile time. They're useful for creating domain-specific languages and complex code generation.

#### Basic Structure of a Function-Like Macro

Here's the basic structure of a function-like procedural macro:

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::parse_macro_input;

#[proc_macro]
pub fn my_macro(input: TokenStream) -> TokenStream {
    // Parse the input tokens
    let parsed = parse_macro_input!(input as MyMacroInput);

    // Generate the output code
    let expanded = quote! {
        // Generated code
    };

    TokenStream::from(expanded)
}

// Define a struct for parsing the macro input
struct MyMacroInput {
    // Fields to store parsed input
}

impl syn::parse::Parse for MyMacroInput {
    fn parse(input: syn::parse::ParseStream) -> syn::Result<Self> {
        // Parse the input stream into the struct
        // ...
        Ok(MyMacroInput { /* ... */ })
    }
}
```

#### Example: SQL Query Builder

Let's create a function-like macro that generates code for building SQL queries:

```rust
use proc_macro::TokenStream;
use quote::{quote, format_ident};
use syn::{parse_macro_input, LitStr, Token, Ident, parse::{Parse, ParseStream}};

// Input parser for the sql_query macro
struct SqlQueryInput {
    query_string: LitStr,
    args: Vec<Ident>,
}

impl Parse for SqlQueryInput {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let query_string = input.parse()?;

        let mut args = Vec::new();
        while !input.is_empty() {
            input.parse::<Token![,]>()?;
            let arg: Ident = input.parse()?;
            args.push(arg);
        }

        Ok(SqlQueryInput { query_string, args })
    }
}

#[proc_macro]
pub fn sql_query(input: TokenStream) -> TokenStream {
    let SqlQueryInput { query_string, args } = parse_macro_input!(input as SqlQueryInput);

    let query_text = query_string.value();
    let placeholders: Vec<_> = (0..args.len()).map(|i| format!("${}", i+1)).collect();

    let function_name = format_ident!("execute_query");

    let expanded = quote! {
        fn #function_name(conn: &mut postgres::Client) -> Result<Vec<Row>, postgres::Error> {
            let query = #query_text;
            let rows = conn.query(query, &[#(&&#args),*])?;
            Ok(rows)
        }
    };

    TokenStream::from(expanded)
}
```

#### Using the Function-Like Macro

In the consumer crate, you would use the macro like this:

```rust
use my_proc_macro::sql_query;

fn main() -> Result<(), postgres::Error> {
    let mut client = postgres::Client::connect("postgres://user:password@localhost", postgres::NoTls)?;

    let user_id = 42;
    let status = "active";

    // This generates a function that executes the SQL query
    sql_query!("SELECT * FROM users WHERE id = $1 AND status = $2", user_id, status);

    let rows = execute_query(&mut client)?;

    for row in rows {
        println!("User: {:?}", row);
    }

    Ok(())
}
```

### Working with Syntax Trees

When writing procedural macros, you'll often need to traverse and manipulate Rust's syntax tree. The `syn` crate provides tools for this:

#### Parsing Different Item Types

Different attributes might be applied to different types of items. `syn` provides specific parsers for each:

```rust
// Parse a function
let input = parse_macro_input!(item as syn::ItemFn);

// Parse a struct
let input = parse_macro_input!(item as syn::ItemStruct);

// Parse an enum
let input = parse_macro_input!(item as syn::ItemEnum);

// Parse a module
let input = parse_macro_input!(item as syn::ItemMod);
```

#### Visiting and Modifying Syntax Trees

For more complex transformations, you might need to traverse and modify parts of the syntax tree:

```rust
use syn::visit_mut::{self, VisitMut};

struct MyVisitor;

impl VisitMut for MyVisitor {
    fn visit_expr_mut(&mut self, expr: &mut syn::Expr) {
        // Transform expressions here
        visit_mut::visit_expr_mut(self, expr);
    }

    fn visit_item_fn_mut(&mut self, func: &mut syn::ItemFn) {
        // Transform functions here
        visit_mut::visit_item_fn_mut(self, func);
    }
}

// Use the visitor
let mut visitor = MyVisitor;
visitor.visit_item_fn_mut(&mut input);
```

### Debugging Procedural Macros

Debugging procedural macros can be challenging. Here are some techniques:

#### Printing During Compilation

You can use `eprintln!` in your macro code to print during compilation:

```rust
#[proc_macro_derive(MyTrait)]
pub fn my_trait_derive(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);

    eprintln!("Deriving MyTrait for {}", input.ident);

    // Rest of the implementation...
}
```

These messages will appear in the terminal during compilation.

#### Using `cargo-expand`

The `cargo-expand` tool is invaluable for debugging procedural macros:

```bash
cargo install cargo-expand
cargo expand
```

This shows the expanded code after all macros are processed.

#### Pretty-Printing Syntax Trees

You can pretty-print syntax trees for easier debugging:

```rust
#[proc_macro_derive(MyTrait)]
pub fn my_trait_derive(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);

    // Pretty-print the parsed input
    eprintln!("{:#?}", input);

    // Rest of the implementation...
}
```

### Best Practices for Procedural Macros

When writing procedural macros, follow these best practices:

1. **Provide clear error messages**: Use `syn::Error` and its spanning features to provide clear error messages tied to specific tokens.

2. **Document expected usage**: Clearly document how your macro should be used, including required attributes and limitations.

3. **Test thoroughly**: Write tests that cover various ways your macro might be used.

4. **Keep dependencies minimal**: Procedural macros are compiled separately, so keep dependencies minimal to reduce compile times.

5. **Handle edge cases**: Consider how your macro will handle edge cases like generics, visibility modifiers, and attributes.

6. **Respect hygiene**: Ensure your generated code doesn't introduce unexpected name conflicts.

7. **Make expansion deterministic**: The expansion should be deterministic to avoid confusing compilation issues.

In the next section, we'll explore macro hygiene and advanced metaprogramming techniques in more detail.

## Macro Hygiene

When writing macros, one of the most important concepts to understand is "hygiene." Macro hygiene refers to how macros handle name resolution and prevents unintended name conflicts between variables in the macro definition and the macro's expansion context.

### Understanding Hygiene

In unhygienic macro systems (like C preprocessor macros), variables defined in a macro can easily conflict with variables in the code where the macro is used. Rust's macro system is partially hygienic, providing some protection against these conflicts.

Let's look at an example of hygiene in action:

```rust
macro_rules! create_function {
    ($func_name:ident) => {
        fn $func_name() {
            let x = 42;
            println!("Value: {}", x);
        }
    };
}

fn main() {
    let x = 10;

    create_function!(my_func);

    my_func();  // Prints "Value: 42", not "Value: 10"

    println!("Outside value: {}", x);  // Prints "Outside value: 10"
}
```

In this example, the `x` inside the macro doesn't interfere with the `x` in `main()`. This is hygiene at work.

### Hygiene in Declarative Macros

In declarative macros, identifiers created by the macro generally don't clash with identifiers in the calling code. However, there are exceptions and nuances:

#### Variables Introduced by Macros

Variables introduced in a macro expansion are hygienic and won't conflict with variables in the calling context:

```rust
macro_rules! hygiene_example {
    () => {
        let value = 100;
        println!("Inside macro: {}", value);
    };
}

fn main() {
    let value = 42;

    hygiene_example!();  // Prints "Inside macro: 100"

    println!("In main: {}", value);  // Prints "In main: 42"
}
```

#### Variables Captured from the Calling Context

When a macro uses variables from the calling context, it uses the variables that are in scope where the macro is called:

```rust
macro_rules! use_value {
    () => {
        println!("Value: {}", value);
    };
}

fn main() {
    let value = 42;
    use_value!();  // Prints "Value: 42"

    {
        let value = 100;
        use_value!();  // Prints "Value: 100"
    }
}
```

#### Escaping Hygiene with `ident_name`

For cases where you need to break hygiene (carefully!), you can use the `$crate` special identifier and the `paste` crate:

```rust
// Using $crate to refer to items in the current crate
macro_rules! create_helper {
    () => {
        fn helper() {
            println!("Helper function");
        }
    };
}

macro_rules! use_helper {
    () => {
        $crate::helper()
    };
}
```

The `paste` crate allows joining identifiers:

```rust
use paste::paste;

macro_rules! create_function {
    ($name:ident) => {
        paste! {
            fn [<get_ $name>]() -> String {
                stringify!($name).to_string()
            }
        }
    };
}

create_function!(user);  // Creates fn get_user() -> String
```

### Hygiene in Procedural Macros

Procedural macros have more control over hygiene because they're directly generating Rust code:

#### Avoiding Name Collisions

When generating variable names in procedural macros, use strategies to avoid conflicts:

```rust
// Bad: potential name collision
let temp = calculate_something();

// Better: use a name unlikely to conflict
let __my_macro_temp_1234 = calculate_something();

// Best: use gensym from proc-macro2 to generate unique identifiers
let temp_name = format_ident!("__temp_{}", proc_macro2::Span::call_site().start().line);
```

#### Using Fully Qualified Paths

To avoid name conflicts with imported items, use fully qualified paths:

```rust
// Instead of:
let result = Option::Some(value);

// Use:
let result = ::std::option::Option::Some(value);
```

#### The `quote!` Macro and Hygiene

The `quote!` macro used in procedural macros has hygiene features:

```rust
let name = format_ident!("my_function");
let expanded = quote! {
    fn #name() {
        let value = 42;
        println!("Value: {}", value);
    }
};
```

#### Span Information

The `Span` type in procedural macros carries hygiene information:

```rust
let span = proc_macro2::Span::call_site();
let ident = syn::Ident::new("value", span);
```

Different spans can create different hygiene contexts.

### Common Hygiene Issues and Solutions

#### Issue 1: Macro-Generated Items Not Visible

Problem: Items defined in a macro aren't visible outside:

```rust
macro_rules! create_type {
    () => {
        struct MyType {
            value: i32,
        }
    };
}

create_type!();

// Error: can't find type `MyType`
let instance: MyType = MyType { value: 42 };
```

Solution: Export the type or use the macro in the scope where it's needed:

```rust
macro_rules! with_type {
    ($body:expr) => {
        {
            struct MyType {
                value: i32,
            }

            $body
        }
    };
}

with_type!({
    let instance = MyType { value: 42 };
    println!("Value: {}", instance.value);
});
```

#### Issue 2: Temporary Variable Conflicts

Problem: Temporary variables in macros might conflict:

```rust
macro_rules! calculate {
    ($a:expr, $b:expr) => {
        let temp = $a;
        temp + $b
    };
}

let temp = 10;
let result = calculate!(5, temp);  // Might cause issues
```

Solution: Use more unique names or block expressions:

```rust
macro_rules! calculate {
    ($a:expr, $b:expr) => {
        {
            let __temp = $a;
            __temp + $b
        }
    };
}
```

#### Issue 3: Multiple Macro Expansions

Problem: Using the same macro multiple times might redefine items:

```rust
macro_rules! define_helper {
    () => {
        fn helper() {
            println!("Helper");
        }
    };
}

define_helper!();
define_helper!();  // Error: helper already defined
```

Solution: Use modules or check if items exist:

```rust
macro_rules! define_helper {
    () => {
        #[allow(dead_code)]
        mod helpers {
            pub fn helper() {
                println!("Helper");
            }
        }
    };
}

define_helper!();
define_helper!();  // Now OK
```

### Best Practices for Hygienic Macros

1. **Be minimal**: Capture only what you need from the caller's context
2. **Use blocks**: Wrap macro expansions in blocks to isolate temporary variables
3. **Use unique names**: For variables that must escape hygiene, use distinctive names
4. **Use `$crate`**: For referring to items in the same crate as the macro
5. **Test thoroughly**: Check macro behavior in different scopes and contexts
6. **Document behavior**: Clearly document which names a macro introduces

By understanding and respecting hygiene, you can create macros that are safer and more predictable for users of your code.

## Practical Project: Custom Derive Macro for Data Validation

To consolidate our understanding of macros, let's build a practical project: a custom derive macro for validating data structures. This will demonstrate how to create a powerful, user-friendly macro that implements real-world functionality.

### Project Overview

We'll create a `Validate` trait with a `validate` method that returns a `Result<(), ValidationError>`. Our derive macro will automatically implement this trait for structs based on field attributes.

### Step 1: Set Up the Project Structure

First, we need to create our project structure:

```bash
# Create a workspace
mkdir validator
cd validator
touch Cargo.toml

# Create the macro crate
mkdir validator-derive
cd validator-derive
cargo init --lib
cd ..

# Create the main crate
mkdir validator-core
cd validator-core
cargo init --lib
cd ..
```

Configure the workspace `Cargo.toml`:

```toml
[workspace]
members = [
    "validator-core",
    "validator-derive",
]
```

### Step 2: Define the Core Traits and Types

In `validator-core/src/lib.rs`, define the validation infrastructure:

```rust
//! Core validation traits and error types

use std::fmt;
use std::collections::HashMap;

/// Validation error containing all validation failures
#[derive(Debug, Clone)]
pub struct ValidationError {
    /// Map of field name to error messages
    pub errors: HashMap<String, Vec<String>>,
}

impl ValidationError {
    /// Create a new, empty validation error
    pub fn new() -> Self {
        ValidationError {
            errors: HashMap::new(),
        }
    }

    /// Add a validation error for a field
    pub fn add(&mut self, field: &str, message: &str) {
        self.errors
            .entry(field.to_string())
            .or_insert_with(Vec::new)
            .push(message.to_string());
    }

    /// Check if there are any validation errors
    pub fn is_empty(&self) -> bool {
        self.errors.is_empty()
    }
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "Validation failed:")?;
        for (field, errors) in &self.errors {
            for error in errors {
                writeln!(f, "  {}: {}", field, error)?;
            }
        }
        Ok(())
    }
}

impl std::error::Error for ValidationError {}

/// Trait for types that can be validated
pub trait Validate {
    /// Validate the value and return errors if validation fails
    fn validate(&self) -> Result<(), ValidationError>;
}

/// Built-in validation functions
pub mod validators {
    /// Check if a string is not empty
    pub fn not_empty(value: &str) -> bool {
        !value.is_empty()
    }

    /// Check if a number is in a range
    pub fn in_range<T: PartialOrd>(value: &T, min: &T, max: &T) -> bool {
        value >= min && value <= max
    }

    /// Check if a string matches a regex pattern
    pub fn matches_regex(value: &str, pattern: &str) -> bool {
        regex::Regex::new(pattern)
            .map(|re| re.is_match(value))
            .unwrap_or(false)
    }

    /// Check if a string is a valid email
    pub fn is_email(value: &str) -> bool {
        matches_regex(value, r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    }
}

// Re-export the derive macro
#[cfg(feature = "derive")]
pub use validator_derive::Validate;
```

### Step 3: Configure the Derive Macro Crate

Update `validator-derive/Cargo.toml`:

```toml
[package]
name = "validator-derive"
version = "0.1.0"
edition = "2021"

[lib]
proc-macro = true

[dependencies]
syn = { version = "2.0", features = ["full", "extra-traits"] }
quote = "1.0"
proc-macro2 = "1.0"
validator-core = { path = "../validator-core" }
```

### Step 4: Implement the Derive Macro

In `validator-derive/src/lib.rs`, implement the derive macro:

```rust
use proc_macro::TokenStream;
use quote::{quote, format_ident};
use syn::{parse_macro_input, DeriveInput, Data, Fields, Meta, NestedMeta, Lit};

/// Derives the `Validate` trait for a struct
#[proc_macro_derive(Validate, attributes(validate))]
pub fn validate_derive(input: TokenStream) -> TokenStream {
    // Parse the input tokens into a syntax tree
    let input = parse_macro_input!(input as DeriveInput);
    let name = &input.ident;

    // Only handle structs
    let fields = match &input.data {
        Data::Struct(data) => match &data.fields {
            Fields::Named(fields) => &fields.named,
            _ => {
                return TokenStream::from(quote! {
                    compile_error!("Validate can only be derived for structs with named fields");
                });
            }
        },
        _ => {
            return TokenStream::from(quote! {
                compile_error!("Validate can only be derived for structs");
            });
        }
    };

    // Generate validations for each field
    let validations = fields.iter().filter_map(|field| {
        let field_name = field.ident.as_ref()?;
        let field_name_str = field_name.to_string();

        let mut field_validations = Vec::new();

        // Look for validation attributes
        for attr in &field.attrs {
            if attr.path().is_ident("validate") {
                if let Ok(Meta::List(meta_list)) = attr.parse_meta() {
                    for nested in meta_list.nested.iter() {
                        if let NestedMeta::Meta(Meta::NameValue(name_value)) = nested {
                            let ident = name_value.path.get_ident().unwrap().to_string();

                            match ident.as_str() {
                                "not_empty" => {
                                    field_validations.push(quote! {
                                        if !validator_core::validators::not_empty(&self.#field_name) {
                                            errors.add(#field_name_str, "must not be empty");
                                        }
                                    });
                                },
                                "email" => {
                                    field_validations.push(quote! {
                                        if !validator_core::validators::is_email(&self.#field_name) {
                                            errors.add(#field_name_str, "must be a valid email");
                                        }
                                    });
                                },
                                "min_length" => {
                                    if let Lit::Int(int_lit) = &name_value.lit {
                                        let min_length = int_lit.base10_parse::<usize>().unwrap();
                                        field_validations.push(quote! {
                                            if self.#field_name.len() < #min_length {
                                                errors.add(#field_name_str, &format!("must be at least {} characters", #min_length));
                                            }
                                        });
                                    }
                                },
                                "max_length" => {
                                    if let Lit::Int(int_lit) = &name_value.lit {
                                        let max_length = int_lit.base10_parse::<usize>().unwrap();
                                        field_validations.push(quote! {
                                            if self.#field_name.len() > #max_length {
                                                errors.add(#field_name_str, &format!("must be at most {} characters", #max_length));
                                            }
                                        });
                                    }
                                },
                                "regex" => {
                                    if let Lit::Str(str_lit) = &name_value.lit {
                                        let pattern = str_lit.value();
                                        field_validations.push(quote! {
                                            if !validator_core::validators::matches_regex(&self.#field_name, #pattern) {
                                                errors.add(#field_name_str, &format!("must match pattern: {}", #pattern));
                                            }
                                        });
                                    }
                                },
                                _ => {
                                    // Unknown validator
                                }
                            }
                        }
                    }
                }
            }
        }

        if field_validations.is_empty() {
            None
        } else {
            Some(quote! {
                #(#field_validations)*
            })
        }
    }).collect::<Vec<_>>();

    // Generate the implementation
    let expanded = quote! {
        impl validator_core::Validate for #name {
            fn validate(&self) -> Result<(), validator_core::ValidationError> {
                let mut errors = validator_core::ValidationError::new();

                #(#validations)*

                if errors.is_empty() {
                    Ok(())
                } else {
                    Err(errors)
                }
            }
        }
    };

    TokenStream::from(expanded)
}
```

### Step 5: Update Core Crate Dependencies

Update `validator-core/Cargo.toml`:

```toml
[package]
name = "validator-core"
version = "0.1.0"
edition = "2021"

[dependencies]
regex = "1.10.2"
validator-derive = { path = "../validator-derive", optional = true }

[features]
default = ["derive"]
derive = ["validator-derive"]
```

### Step 6: Create a Usage Example

Create a new example to test our validation macro:

```bash
mkdir -p examples
touch examples/validate_user.rs
```

In `examples/validate_user.rs`:

```rust
use validator_core::Validate;

#[derive(Validate, Debug)]
struct User {
    #[validate(not_empty = true)]
    name: String,

    #[validate(email = true)]
    email: String,

    #[validate(min_length = 8, max_length = 64)]
    password: String,

    #[validate(regex = r"^\d{3}-\d{3}-\d{4}$")]
    phone: String,
}

fn main() {
    // Valid user
    let valid_user = User {
        name: "John Doe".to_string(),
        email: "john@example.com".to_string(),
        password: "secure_password123".to_string(),
        phone: "123-456-7890".to_string(),
    };

    match valid_user.validate() {
        Ok(()) => println!("Valid user: {:?}", valid_user),
        Err(err) => println!("Validation failed: {}", err),
    }

    // Invalid user
    let invalid_user = User {
        name: "".to_string(),
        email: "not-an-email".to_string(),
        password: "short".to_string(),
        phone: "invalid".to_string(),
    };

    match invalid_user.validate() {
        Ok(()) => println!("Valid user: {:?}", invalid_user),
        Err(err) => println!("Validation failed: {}", err),
    }
}
```

### Step 7: Running the Example

To run the example:

```bash
cargo run --example validate_user
```

### What We've Learned

Through this practical project, we've learned:

1. **Creating a multi-crate structure** for macros and their supporting code
2. **Parsing attributes** from struct fields
3. **Generating custom validation code** based on attribute parameters
4. **Creating a user-friendly API** that feels like a native Rust feature
5. **Implementing error handling** for validation failures

Our derive macro demonstrates how procedural macros can dramatically reduce boilerplate and provide elegant, declarative APIs for complex functionality.

## Summary

In this chapter, we've explored Rust's powerful metaprogramming capabilities through macros. We've learned:

1. **Macro types and their capabilities**:

   - Declarative macros for pattern-based code generation
   - Derive macros for implementing traits automatically
   - Attribute macros for transforming existing code
   - Function-like procedural macros for custom syntax

2. **Key concepts**:

   - Macro hygiene and preventing name conflicts
   - Token-based vs. AST-based macros
   - Pattern matching with metavariables
   - Code generation with quoting and interpolation

3. **Best practices**:

   - When to use macros vs. other abstractions
   - Debugging and error handling in macros
   - Maintaining readability and maintainability
   - Creating user-friendly APIs

4. **Practical applications**:
   - Domain-specific languages
   - Code generation
   - Compile-time validation
   - Reducing boilerplate

Macros are one of Rust's most powerful features, enabling you to extend the language in ways that would otherwise be impossible. By mastering macros, you gain the ability to create more expressive, concise, and maintainable code, as well as libraries that provide elegant APIs for complex functionality.

## Exercises

1. **Declarative Macro Practice**:

   - Create a `hashmap!` macro that allows creating `HashMap`s with a syntax similar to the `vec!` macro
   - Extend the `println!` macro to support a `#[debug]` flag that includes file and line information

2. **Derive Macro Extensions**:

   - Extend our `Validate` derive macro to support nested validation of struct fields
   - Create a `Builder` derive macro that generates a builder pattern for structs

3. **Attribute Macro Challenges**:

   - Create a `#[benchmark]` attribute that automatically times function execution and logs results
   - Implement a `#[cached]` attribute that adds memoization to functions

4. **Function-Like Macro Projects**:

   - Build a simple testing framework using function-like procedural macros
   - Create a type-safe SQL query builder that validates queries at compile time

5. **Advanced Challenges**:
   - Implement a compile-time state machine DSL using macros
   - Create a macro that generates serialization/deserialization code based on a schema definition

By working through these exercises, you'll deepen your understanding of Rust's metaprogramming capabilities and be better prepared to leverage macros in your own projects.
