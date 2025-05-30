# Chapter 4: Basic Syntax and Data Types

## Variables and Mutability

In Rust, variables are immutable by default, which means once a value is bound to a name, you cannot change that value. This default immutability helps you write code that's safer and more resistant to bugs, especially in concurrent contexts.

### Immutable Variables

```rust
fn main() {
    let x = 5;
    println!("The value of x is: {}", x);

    // This would cause a compile error:
    // x = 6; // error: cannot assign twice to immutable variable
}
```

### Mutable Variables

To make a variable mutable, we add `mut` before the variable name:

```rust
fn main() {
    let mut x = 5;
    println!("The value of x is: {}", x);

    x = 6; // This works because x is mutable
    println!("The value of x is now: {}", x);
}
```

### Differences from Other Languages

In many languages, variables are mutable by default. Rust's approach reverses this, encouraging you to think carefully about which values actually need to change.

```rust
// In JavaScript or Python:
// x = 5
// x = 6 // No problem

// In Rust:
let x = 5;
// x = 6; // Error!

// But you can do:
let mut x = 5;
x = 6; // Works fine
```

## Understanding Variable Shadowing

Rust allows variable shadowing, which means you can declare a new variable with the same name as a previous variable. This is different from making a variable mutable.

```rust
fn main() {
    let x = 5;

    let x = x + 1; // Shadows the first x

    {
        let x = x * 2; // Shadows within this scope
        println!("The value of x in the inner scope is: {}", x); // 12
    }

    println!("The value of x is: {}", x); // 6
}
```

### Shadowing vs. Mutation

Shadowing allows you to:

1. Reuse variable names, avoiding names like `x1`, `x2`, etc.
2. Perform transformations on a value while keeping immutability
3. Change the type of a value bound to a name

```rust
fn main() {
    // With shadowing, we can change types:
    let spaces = "   ";
    let spaces = spaces.len(); // Now spaces is a number (3)

    // With mut, we can't change types:
    let mut spaces = "   ";
    // spaces = spaces.len(); // Error: expected &str, found usize
}
```

## Basic Scalar Types

Rust has four primary scalar types: integers, floating-point numbers, booleans, and characters.

### Integer Types

Rust provides several integer types with explicit sizes:

| Length  | Signed  | Unsigned |
| ------- | ------- | -------- |
| 8-bit   | `i8`    | `u8`     |
| 16-bit  | `i16`   | `u16`    |
| 32-bit  | `i32`   | `u32`    |
| 64-bit  | `i64`   | `u64`    |
| 128-bit | `i128`  | `u128`   |
| arch    | `isize` | `usize`  |

The default integer type is `i32`, which is generally the fastest.

```rust
fn main() {
    let a: i32 = -42; // Signed 32-bit integer
    let b: u64 = 100; // Unsigned 64-bit integer
    let c = 1_000_000; // Default i32, underscores for readability
    let d: usize = 123; // Architecture-dependent size, used for indexing

    println!("a: {}, b: {}, c: {}, d: {}", a, b, c, d);
}
```

### Floating-Point Types

Rust has two floating-point types:

- `f32`: 32-bit float
- `f64`: 64-bit float (default)

```rust
fn main() {
    let x = 2.0; // f64 by default
    let y: f32 = 3.0; // f32 with explicit type annotation

    println!("x: {}, y: {}", x, y);
}
```

### Boolean Type

The boolean type in Rust is specified using `bool` and can be either `true` or `false`.

```rust
fn main() {
    let t = true;
    let f: bool = false; // with explicit type annotation

    // Booleans are commonly used in conditionals
    if t {
        println!("This will print!");
    }

    if f {
        println!("This won't print!");
    }
}
```

### Character Type

Rust's `char` type represents a Unicode Scalar Value, which means it can represent a lot more than just ASCII.

```rust
fn main() {
    let c = 'z';
    let z: char = 'ℤ'; // with explicit type annotation
    let heart_eyed_cat = '😻';

    println!("Characters: {}, {}, {}", c, z, heart_eyed_cat);
}
```

## Type Suffixes and Literals

Rust supports various literals with optional type suffixes.

### Integer Literals

```rust
fn main() {
    let decimal = 98_222; // Decimal
    let hex = 0xff; // Hex
    let octal = 0o77; // Octal
    let binary = 0b1111_0000; // Binary
    let byte = b'A'; // Byte (u8 only)

    // With suffixes
    let x = 42u8; // u8
    let y = 1_000_000i64; // i64

    println!("{}, {}, {}, {}, {}, {}, {}",
             decimal, hex, octal, binary, byte, x, y);
}
```

### Floating-Point Literals

```rust
fn main() {
    let x = 2.0; // f64
    let y = 3.0f32; // f32 with suffix

    println!("{}, {}", x, y);
}
```

### Boolean and Character Literals

```rust
fn main() {
    // Boolean literals
    let t = true;
    let f = false;

    // Character literals
    let c = 'c';
    let heart = '❤';

    println!("{}, {}, {}, {}", t, f, c, heart);
}
```

## Compound Types

Rust has two primitive compound types: tuples and arrays.

### Tuples

A tuple is a collection of values of different types grouped together as a single compound value.

```rust
fn main() {
    // A tuple with a variety of types
    let tup: (i32, f64, char) = (500, 6.4, 'A');

    // Destructuring a tuple
    let (x, y, z) = tup;

    // Accessing tuple elements with dot notation
    let five_hundred = tup.0;
    let six_point_four = tup.1;
    let letter_a = tup.2;

    println!("x: {}, y: {}, z: {}", x, y, z);
    println!("Elements: {}, {}, {}", five_hundred, six_point_four, letter_a);

    // The unit tuple () is a special value with no data
    let unit = ();
}
```

### Arrays

An array is a collection of values of the same type with a fixed length.

```rust
fn main() {
    // An array of i32 values
    let a = [1, 2, 3, 4, 5];

    // Explicit type and size: [type; size]
    let b: [i32; 5] = [1, 2, 3, 4, 5];

    // Initialize with the same value
    let c = [3; 5]; // Equivalent to [3, 3, 3, 3, 3]

    // Accessing array elements
    let first = a[0];
    let second = a[1];

    println!("First: {}, Second: {}", first, second);

    // Arrays have a fixed size and are stored on the stack
    // Vectors are similar but can grow/shrink and are stored on the heap
}
```

#### Array Bounds Checking

Rust enforces array bounds checking at runtime:

```rust
fn main() {
    let a = [1, 2, 3, 4, 5];

    // This will compile but panic at runtime:
    // let element = a[10]; // index out of bounds: the length is 5 but the index is 10

    // Safe access with get, which returns an Option
    match a.get(10) {
        Some(value) => println!("Element at index 10: {}", value),
        None => println!("No element at index 10"),
    }
}
```

## Type Inference and Explicit Typing

Rust has a strong, static type system, but it can often infer types:

```rust
fn main() {
    // Type inferred as i32
    let x = 42;

    // Explicit type annotation
    let y: u32 = 100;

    // Sometimes Rust needs help with inference
    let guess: u32 = "42".parse().expect("Not a number!");

    println!("x: {}, y: {}, guess: {}", x, y, guess);
}
```

### When to Use Type Annotations

You should use explicit type annotations when:

1. Multiple valid types are possible, and you need to specify which one
2. The type cannot be inferred from context
3. You want to be explicit for clarity or documentation

```rust
fn main() {
    // Annotation needed here because parse can return many types
    let guess: u32 = "42".parse().expect("Not a number!");

    // Type inference works here
    let x = 5;

    // But being explicit doesn't hurt and can help documentation
    let y: i32 = 10;

    println!("guess: {}, x: {}, y: {}", guess, x, y);
}
```

## Type Conversion and Casting

Rust does not implicitly convert types. You must use explicit conversions.

### Numeric Conversions

```rust
fn main() {
    let x: i32 = 42;

    // Using the `as` keyword for casting
    let y: u8 = x as u8;

    // Be careful when casting, as you might lose information
    let large_number: i32 = 1000;
    let small_number: u8 = large_number as u8; // 1000 doesn't fit in u8, will result in 232

    println!("x: {}, y: {}, large: {}, small: {}",
             x, y, large_number, small_number);

    // Safer conversion methods
    let z = u8::try_from(x).unwrap_or(255);
    println!("z: {}", z);
}
```

### String Conversions

```rust
fn main() {
    // Converting between string types
    let s1: &str = "hello";
    let s2: String = s1.to_string();
    let s3: String = String::from(s1);
    let s4: &str = &s3; // Borrowing a String as &str

    // Converting numbers to strings
    let x = 42;
    let x_string = x.to_string();

    // Converting strings to numbers
    let y: u32 = "100".parse().expect("Not a number!");

    println!("{}, {}, {}, {}, {}, {}", s1, s2, s3, s4, x_string, y);
}
```

## Constants and Statics

Beyond variables, Rust has two types of unchanging values: constants and statics.

### Constants

Constants are values that are bound to a name and cannot change. They are evaluated at compile time.

```rust
// Constants are declared using the const keyword
// They must always have a type annotation
// By convention, constants are named in SCREAMING_SNAKE_CASE
const MAX_POINTS: u32 = 100_000;

fn main() {
    println!("The maximum points are: {}", MAX_POINTS);

    // Constants can be declared in any scope
    const LOCAL_CONSTANT: &str = "I'm a local constant";
    println!("{}", LOCAL_CONSTANT);
}
```

### Static Variables

Static variables are similar to constants but have a fixed memory location.

```rust
// Static variables use the static keyword
static LANGUAGE: &str = "Rust";

// Mutable static variables are unsafe
static mut COUNTER: u32 = 0;

fn main() {
    println!("The language is: {}", LANGUAGE);

    // Accessing mutable statics requires unsafe
    unsafe {
        COUNTER += 1;
        println!("COUNTER: {}", COUNTER);
    }
}
```

## Differences between let, const, and static

Understanding when to use each declaration type is important:

1. **`let`** - For variables that might change (with `mut`) or shadow
2. **`const`** - For values that never change and can be computed at compile time
3. **`static`** - For values with a fixed memory location and potentially global lifetime

```rust
fn main() {
    // let - variable binding
    let x = 5;
    let mut y = 10;

    // const - compile-time constant
    const MAX_SPEED: u32 = 300;

    // static - value with static lifetime
    static NAME: &str = "Rust Universe";

    y += 1; // Can change because it's mut
    // MAX_SPEED += 1; // Error: can't modify a constant

    println!("x: {}, y: {}, MAX_SPEED: {}, NAME: {}",
             x, y, MAX_SPEED, NAME);
}
```

## Comments and Documentation

Rust supports several types of comments and documentation.

### Regular Comments

```rust
fn main() {
    // This is a single-line comment

    /*
     * This is a
     * multi-line comment
     */

    let x = 5; // Inline comment
}
```

### Documentation Comments

Documentation comments support Markdown and are used to generate HTML documentation.

````rust
/// A function that adds two numbers.
///
/// # Examples
///
/// ```
/// let result = add(2, 3);
/// assert_eq!(result, 5);
/// ```
fn add(a: i32, b: i32) -> i32 {
    a + b
}

//! # My Library
//!
//! This is documentation for the library itself, not a specific item.

fn main() {
    let result = add(10, 20);
    println!("10 + 20 = {}", result);
}
````

### Doc Tests

The examples in your documentation can be run as tests:

```bash
cargo test --doc
```

This ensures that your documentation examples are accurate and up-to-date.

## Printing and Formatting with format! macros

Rust provides several macros for formatted output.

### println! and print!

```rust
fn main() {
    let name = "Rust";
    let year = 2015;

    // Basic printing
    println!("Hello, world!");

    // With placeholders
    println!("Hello, {}!", name);

    // Multiple values
    println!("{} was first released in {}", name, year);

    // Named parameters
    println!("{language} uses {paradigm} programming paradigm.",
             language = "Rust",
             paradigm = "multi-paradigm");

    // print! doesn't add a newline
    print!("This is on ");
    print!("the same line.");
    println!(); // Add a newline
}
```

### format! For String Creation

```rust
fn main() {
    let name = "Rust";
    let year = 2015;

    // Create a formatted string
    let message = format!("{} was released in {}", name, year);
    println!("{}", message);

    // Advanced formatting
    let formatted = format!("{:?}", vec![1, 2, 3]); // Debug formatting
    println!("{}", formatted);
}
```

### Formatting Options

```rust
fn main() {
    // Width and alignment
    println!("{:10}", "hello"); // Right-aligned with width 10
    println!("{:<10}", "hello"); // Left-aligned with width 10
    println!("{:^10}", "hello"); // Center-aligned with width 10

    // Number formatting
    println!("{:.2}", 3.1415926); // Precision
    println!("{:+}", 42); // Always show sign
    println!("{:08}", 42); // Zero-padding
    println!("{:#x}", 42); // Hex with 0x prefix

    // Debug and Display formatting
    println!("{:?}", vec![1, 2, 3]); // Debug
    println!("{:#?}", vec![1, 2, 3]); // Pretty debug
}
```

## Debugging with println! and dbg!

Rust provides debugging tools that can make development easier.

### Using println! for debugging

```rust
fn main() {
    let x = 5;
    let y = 10;

    println!("x = {}, y = {}", x, y);

    let sum = x + y;
    println!("x + y = {}", sum);
}
```

### The dbg! macro

The `dbg!` macro is specifically designed for debugging:

```rust
fn main() {
    let x = 5;
    let y = dbg!(x * 2) + 1;

    // dbg! takes ownership, evaluates, and returns the value
    // It also prints the file, line, and expression with result

    dbg!(y); // Prints: [src/main.rs:5] y = 11

    // It works with more complex expressions
    dbg!(vec![1, 2, 3]);
}
```

The `dbg!` macro:

1. Prints to stderr (not stdout like println!)
2. Shows the file and line number of the debug call
3. Shows the expression being debugged
4. Returns the value (unlike println!)

## 🔨 Project: Unit Converter

Let's create a unit converter that demonstrates the concepts we've learned in this chapter.

### Project Requirements

1. Convert between different units of measurement
2. Support multiple categories (length, weight, temperature)
3. Handle user input and validate it
4. Display formatted results

### Step 1: Create the Project

```bash
cargo new unit_converter
cd unit_converter
```

### Step 2: Implement the Converter

Edit `src/main.rs`:

```rust
use std::io::{self, Write};

// Constants for conversion factors
const CM_TO_INCH: f64 = 0.393701;
const INCH_TO_CM: f64 = 2.54;
const KG_TO_LB: f64 = 2.20462;
const LB_TO_KG: f64 = 0.453592;

// Define our unit types
#[derive(Debug, Clone, Copy)]
enum LengthUnit {
    Centimeter,
    Inch,
}

#[derive(Debug, Clone, Copy)]
enum WeightUnit {
    Kilogram,
    Pound,
}

#[derive(Debug, Clone, Copy)]
enum TemperatureUnit {
    Celsius,
    Fahrenheit,
}

#[derive(Debug, Clone, Copy)]
enum Category {
    Length,
    Weight,
    Temperature,
}

fn main() {
    println!("Unit Converter");
    println!("--------------");

    // Choose a category
    let category = select_category();
    println!();

    match category {
        Category::Length => handle_length_conversion(),
        Category::Weight => handle_weight_conversion(),
        Category::Temperature => handle_temperature_conversion(),
    }
}

fn select_category() -> Category {
    println!("Select conversion category:");
    println!("1. Length (cm/inch)");
    println!("2. Weight (kg/lb)");
    println!("3. Temperature (°C/°F)");

    loop {
        print!("Enter your choice (1-3): ");
        io::stdout().flush().unwrap();

        let mut input = String::new();
        io::stdin().read_line(&mut input).expect("Failed to read input");

        match input.trim() {
            "1" => return Category::Length,
            "2" => return Category::Weight,
            "3" => return Category::Temperature,
            _ => println!("Invalid choice, please try again."),
        }
    }
}

fn get_float_input(prompt: &str) -> f64 {
    loop {
        print!("{}", prompt);
        io::stdout().flush().unwrap();

        let mut input = String::new();
        io::stdin().read_line(&mut input).expect("Failed to read input");

        match input.trim().parse::<f64>() {
            Ok(value) => return value,
            Err(_) => println!("Invalid number, please try again."),
        }
    }
}

fn handle_length_conversion() {
    println!("Length Conversion");
    println!("1. Centimeter to Inch");
    println!("2. Inch to Centimeter");

    loop {
        print!("Enter your choice (1-2): ");
        io::stdout().flush().unwrap();

        let mut input = String::new();
        io::stdin().read_line(&mut input).expect("Failed to read input");

        match input.trim() {
            "1" => {
                let cm = get_float_input("Enter length in centimeters: ");
                let inches = convert_length(cm, LengthUnit::Centimeter, LengthUnit::Inch);
                println!("{:.2} cm = {:.2} inches", cm, inches);
                break;
            },
            "2" => {
                let inches = get_float_input("Enter length in inches: ");
                let cm = convert_length(inches, LengthUnit::Inch, LengthUnit::Centimeter);
                println!("{:.2} inches = {:.2} cm", inches, cm);
                break;
            },
            _ => println!("Invalid choice, please try again."),
        }
    }
}

fn handle_weight_conversion() {
    println!("Weight Conversion");
    println!("1. Kilogram to Pound");
    println!("2. Pound to Kilogram");

    loop {
        print!("Enter your choice (1-2): ");
        io::stdout().flush().unwrap();

        let mut input = String::new();
        io::stdin().read_line(&mut input).expect("Failed to read input");

        match input.trim() {
            "1" => {
                let kg = get_float_input("Enter weight in kilograms: ");
                let lb = convert_weight(kg, WeightUnit::Kilogram, WeightUnit::Pound);
                println!("{:.2} kg = {:.2} lb", kg, lb);
                break;
            },
            "2" => {
                let lb = get_float_input("Enter weight in pounds: ");
                let kg = convert_weight(lb, WeightUnit::Pound, WeightUnit::Kilogram);
                println!("{:.2} lb = {:.2} kg", lb, kg);
                break;
            },
            _ => println!("Invalid choice, please try again."),
        }
    }
}

fn handle_temperature_conversion() {
    println!("Temperature Conversion");
    println!("1. Celsius to Fahrenheit");
    println!("2. Fahrenheit to Celsius");

    loop {
        print!("Enter your choice (1-2): ");
        io::stdout().flush().unwrap();

        let mut input = String::new();
        io::stdin().read_line(&mut input).expect("Failed to read input");

        match input.trim() {
            "1" => {
                let celsius = get_float_input("Enter temperature in Celsius: ");
                let fahrenheit = convert_temperature(
                    celsius, TemperatureUnit::Celsius, TemperatureUnit::Fahrenheit
                );
                println!("{:.2} °C = {:.2} °F", celsius, fahrenheit);
                break;
            },
            "2" => {
                let fahrenheit = get_float_input("Enter temperature in Fahrenheit: ");
                let celsius = convert_temperature(
                    fahrenheit, TemperatureUnit::Fahrenheit, TemperatureUnit::Celsius
                );
                println!("{:.2} °F = {:.2} °C", fahrenheit, celsius);
                break;
            },
            _ => println!("Invalid choice, please try again."),
        }
    }
}

fn convert_length(value: f64, from: LengthUnit, to: LengthUnit) -> f64 {
    match (from, to) {
        (LengthUnit::Centimeter, LengthUnit::Inch) => value * CM_TO_INCH,
        (LengthUnit::Inch, LengthUnit::Centimeter) => value * INCH_TO_CM,
        _ => value, // Same unit, no conversion needed
    }
}

fn convert_weight(value: f64, from: WeightUnit, to: WeightUnit) -> f64 {
    match (from, to) {
        (WeightUnit::Kilogram, WeightUnit::Pound) => value * KG_TO_LB,
        (WeightUnit::Pound, WeightUnit::Kilogram) => value * LB_TO_KG,
        _ => value, // Same unit, no conversion needed
    }
}

fn convert_temperature(value: f64, from: TemperatureUnit, to: TemperatureUnit) -> f64 {
    match (from, to) {
        (TemperatureUnit::Celsius, TemperatureUnit::Fahrenheit) => (value * 9.0 / 5.0) + 32.0,
        (TemperatureUnit::Fahrenheit, TemperatureUnit::Celsius) => (value - 32.0) * 5.0 / 9.0,
        _ => value, // Same unit, no conversion needed
    }
}
```

### Step 3: Build and Run the Project

```bash
cargo run
```

### Step 4: Enhancing the Project

Here are some ways to extend the unit converter:

1. Add more unit categories (volume, area, time, etc.)
2. Implement bidirectional conversions in a single step
3. Create a history of conversions
4. Add the ability to save conversion results to a file
5. Create a configuration file for custom conversion factors

## Looking Ahead

In this chapter, we've explored Rust's basic syntax and data types. We've learned about variables, mutability, shadowing, scalar and compound types, type inference, and conversion. We've also created a practical unit converter application that demonstrates these concepts.

In the next chapter, we'll dive into Rust's control flow constructs, exploring how to use expressions, conditions, and loops to control the flow of our programs. We'll learn how Rust's approach to control flow differs from other languages and how to write more expressive and powerful Rust code.

As you continue your Rust journey, remember that understanding these fundamental concepts will be crucial for mastering more advanced topics. The type system and variable behavior in Rust might initially seem strict, but they're designed to help you write safer, more reliable code.

Now that you understand Rust's basic syntax and data types, you're ready to tackle more complex control flow and build increasingly sophisticated Rust applications.
