# Chapter 5: Control Flow in Rust

## Introduction

Control flow is at the heart of any programming language, determining how a program executes based on conditions and iterations. Rust's approach to control flow combines familiar constructs with powerful, expression-based semantics that set it apart from many other languages.

By the end of this chapter, you'll understand:

- The critical distinction between expressions and statements in Rust
- How conditional logic works in Rust using `if` and `else`
- The various loop constructs available in Rust
- How Rust's loops differ from those in other programming languages
- Working with ranges to create sequences of values
- The powerful pattern matching capabilities of `match` expressions
- How to control program flow with `break`, `continue`, and early returns
- Using labeled loops for complex nested structures
- Applying control flow to handle errors effectively
- Building a complete number guessing game that combines these concepts

## Expressions vs Statements

One of the most distinctive features of Rust is its expression-based nature. Understanding the difference between expressions and statements is fundamental to thinking in Rust.

### What are Expressions and Statements?

- **Expressions** evaluate to a value
- **Statements** perform an action but don't return a value

In many programming languages, this distinction isn't emphasized, but in Rust, it's crucial. Most constructs in Rust are expressions, which allows for more concise and expressive code.

```rust
fn main() {
    // Statement: doesn't return a value
    let y = 6; // The whole let statement doesn't return a value

    // Expression: evaluates to a value
    let x = 5 + 5; // 5 + 5 is an expression that evaluates to 10

    // Block expressions evaluate to the last expression in the block
    let z = {
        let inner = 3;
        inner * 4 // Note: no semicolon here, making it an expression
    };
    println!("z: {}", z); // z: 12

    // Adding a semicolon turns an expression into a statement
    let w = {
        let inner = 3;
        inner * 4; // Semicolon added, now returns () (unit type)
        5 // This is the expression that's returned
    };
    println!("w: {}", w); // w: 5
}
```

The lack of a semicolon at the end of a block makes it an expression that evaluates to the value of its last line. This is an important pattern in Rust that we'll see frequently.

### Expressions in Function Returns

Expressions are particularly useful when returning values from functions:

```rust
// This function returns the value of the final expression
fn expression_return() -> i32 {
    let x = 5;
    x + 1 // No semicolon, so this expression's value is returned
}

// This function uses a return statement
fn statement_return() -> i32 {
    let x = 5;
    return x + 1; // Explicit return statement
}

fn main() {
    println!("expression_return: {}", expression_return()); // 6
    println!("statement_return: {}", statement_return());   // 6
}
```

### The Unit Type

In Rust, the unit type `()` is used to indicate "no value." It's similar to `void` in other languages, but it's an actual type:

```rust
fn main() {
    // Statements have type ()
    let x = (let y = 6); // Error: let statements don't return a value

    // Functions with no return value implicitly return ()
    fn print_hello() {
        println!("Hello");
    }

    let result = print_hello(); // result has type ()

    // Explicitly returning unit
    fn explicit_unit() -> () {
        return ();
    }
}
```

Understanding when you're working with expressions vs. statements will help you write more idiomatic Rust code.

## Conditional Expressions

In Rust, `if` is an expression, not just a statement. This means it can be used on the right side of a `let` statement to assign a value based on a condition.

### Basic If/Else Syntax

```rust
fn main() {
    let number = 6;

    if number % 4 == 0 {
        println!("number is divisible by 4");
    } else if number % 3 == 0 {
        println!("number is divisible by 3");
    } else if number % 2 == 0 {
        println!("number is divisible by 2");
    } else {
        println!("number is not divisible by 4, 3, or 2");
    }
}
```

### If as an Expression

Because `if` is an expression, it can return a value:

```rust
fn main() {
    let condition = true;

    // if is an expression, so it returns a value
    let number = if condition { 5 } else { 6 };

    println!("The value of number is: {}", number); // 5

    // Both branches must return the same type
    // This would not compile:
    // let number = if condition { 5 } else { "six" };
}
```

When using `if` as an expression, all branches must return the same type, and every possible condition must be covered. This is enforced by the compiler.

### Nested Conditions

You can nest conditions within each other:

```rust
fn main() {
    let num = 15;

    let description = if num < 10 {
        "less than 10"
    } else if num < 20 {
        if num % 2 == 0 {
            "between 10 and 20, even"
        } else {
            "between 10 and 20, odd"
        }
    } else {
        "20 or greater"
    };

    println!("Number is {}", description); // "between 10 and 20, odd"
}
```

### Ternary-like Expressions

Rust doesn't have a traditional ternary operator (`condition ? true_case : false_case`), but the `if-else` expression serves the same purpose:

```rust
fn main() {
    let age = 20;
    let status = if age >= 18 { "adult" } else { "minor" };

    println!("Status: {}", status); // "adult"
}
```

## Loops

Rust provides three kinds of loops: `loop`, `while`, and `for`. Each has its own use cases and advantages.

### The Loop Expression

The `loop` keyword gives us an infinite loop that continues until explicitly broken:

```rust
fn main() {
    let mut counter = 0;

    loop {
        counter += 1;

        if counter == 10 {
            break; // Exit the loop
        }

        if counter % 2 == 0 {
            continue; // Skip to the next iteration
        }

        println!("counter: {}", counter);
    }

    println!("After loop, counter: {}", counter);
}
```

### Loop as an Expression

Like `if`, `loop` is also an expression. You can return a value from a loop using `break`:

```rust
fn main() {
    let mut counter = 0;

    let result = loop {
        counter += 1;

        if counter == 10 {
            break counter * 2; // Return counter * 2 from the loop
        }
    };

    println!("Result: {}", result); // Result: 20
}
```

This is particularly useful for retry logic or when you need to compute a value through iteration.

### While Loops

`while` loops combine a condition with a loop, running until the condition is no longer true:

```rust
fn main() {
    let mut number = 3;

    while number != 0 {
        println!("{}!", number);
        number -= 1;
    }

    println!("LIFTOFF!!!");
}
```

While loops are ideal when you need to continue looping until a specific condition is met.

### For Loops

The `for` loop is the most commonly used loop in Rust. It's used to iterate over elements of a collection, like an array or range:

```rust
fn main() {
    // Iterating over a range
    for number in 1..4 {
        println!("{}!", number);
    }
    println!("LIFTOFF!!!");

    // Iterating over an array
    let a = [10, 20, 30, 40, 50];

    for element in a {
        println!("The value is: {}", element);
    }

    // Iterating with an index
    for (index, &value) in a.iter().enumerate() {
        println!("a[{}] = {}", index, value);
    }
}
```

For loops in Rust are safe and prevent common errors like off-by-one errors or accessing elements outside of array bounds.

## How Rust's Loops Differ from Other Languages

Rust's loops might look familiar, but they have several important differences from loops in other languages:

### 1. Expression-oriented

All loops can be expressions that return values:

```rust
let result = loop {
    if some_condition {
        break some_value;
    }
};
```

This expression-oriented approach allows for more concise code in many situations.

### 2. No C-style For Loops

Rust doesn't have the traditional C-style for loop with initialization, condition, and increment:

```c
// C-style loop - NOT AVAILABLE IN RUST
for (int i = 0; i < 10; i++) {
    printf("%d\n", i);
}
```

Instead, Rust uses ranges and iterators:

```rust
// Rust loop
for i in 0..10 {
    println!("{}", i);
}
```

### 3. Safety First

Rust's loops are designed to be safe. There's no risk of off-by-one errors or accessing elements outside of a collection's bounds.

### 4. Iterator-based

Rust's `for` loops are built on the iterator system, which provides a uniform interface for iterating over different types of collections. This makes them more powerful and flexible.

### 5. Ownership-aware

Loops respect Rust's ownership system. When you iterate over a collection, you can choose to take ownership of elements, borrow them, or use mutable references:

```rust
let v = vec![1, 2, 3];

// Borrow elements
for item in &v {
    println!("{}", item);
}

// Take ownership (v is moved into the for loop)
for item in v {
    println!("{}", item);
}
// v is no longer accessible here
```

## Range Expressions

Ranges in Rust are a concise way to express a sequence of values:

```rust
fn main() {
    // Range expressions
    let range1 = 1..5;    // Includes 1, 2, 3, 4 (exclusive upper bound)
    let range2 = 1..=5;   // Includes 1, 2, 3, 4, 5 (inclusive upper bound)

    // Using ranges in for loops
    for i in 1..5 {
        println!("{}", i);  // Prints 1 2 3 4
    }

    for i in 1..=5 {
        println!("{}", i);  // Prints 1 2 3 4 5
    }

    // Ranges with chars
    for c in 'a'..='e' {
        print!("{} ", c);  // Prints a b c d e
    }
    println!();

    // Using step_by to skip values
    for i in (0..10).step_by(2) {
        print!("{} ", i);  // Prints 0 2 4 6 8
    }
    println!();

    // Ranges can be used for slicing
    let numbers = [1, 2, 3, 4, 5];
    let slice = &numbers[1..4]; // [2, 3, 4]

    // Ranges can be unbounded
    let from_three = 3..;  // From 3 to infinity (conceptually)
    let up_to_five = ..5;  // From negative infinity to 5 (exclusive)
    let everything = ..;   // The entire range

    // Using ranges in pattern matching
    let x = 5;
    match x {
        1..=5 => println!("x is between 1 and 5"),
        _ => println!("x is something else"),
    }
}
```

Ranges are a powerful feature that make iterating over sequences concise and readable.

## Match Expressions Basics

The `match` expression is one of Rust's most powerful features. It's similar to a `switch` statement in other languages, but far more powerful.

### Basic Match Syntax

```rust
fn main() {
    let number = 13;

    match number {
        // Match a single value
        1 => println!("One!"),

        // Match multiple values
        2 | 3 | 5 | 7 | 11 | 13 => println!("This is a prime"),

        // Match a range
        6..=10 => println!("Six through ten"),

        // Default case
        _ => println!("Another number"),
    }
}
```

### Match as an Expression

Like `if` and `loop`, `match` is also an expression that returns a value:

```rust
fn main() {
    let number = 13;

    let message = match number {
        1 => "One!",
        2 | 3 | 5 | 7 | 11 | 13 => "This is a prime",
        6..=10 => "Six through ten",
        _ => "Another number",
    };

    println!("Message: {}", message); // "This is a prime"
}
```

### Exhaustiveness Checking

Rust's `match` must be exhaustive, meaning every possible value of the matched expression must be covered:

```rust
fn main() {
    let dice_roll = 9;

    match dice_roll {
        1 => println!("Critical failure!"),
        2..=5 => println!("Normal roll"),
        6 => println!("Critical success!"),
        // Without this catch-all case, the compiler would complain
        // since dice_roll could be any i32 value
        _ => println!("Invalid dice roll"),
    }
}
```

This requirement ensures that you've considered all possible cases, preventing subtle bugs.

## Pattern Matching Basics

Pattern matching goes beyond simple values in `match` expressions. It allows you to destructure complex data types.

### Matching with Tuples

```rust
fn main() {
    let point = (3, 5);

    match point {
        (0, 0) => println!("Origin"),
        (0, y) => println!("X-axis at y={}", y),
        (x, 0) => println!("Y-axis at x={}", x),
        (x, y) => println!("Point at ({}, {})", x, y),
    }
}
```

### Destructuring Structs

```rust
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p = Point { x: 0, y: 7 };

    match p {
        Point { x: 0, y } => println!("On the y-axis at y={}", y),
        Point { x, y: 0 } => println!("On the x-axis at x={}", x),
        Point { x, y } => println!("Point at ({}, {})", x, y),
    }
}
```

### Ignoring Values with \_

```rust
fn main() {
    let numbers = (2, 4, 8, 16, 32);

    match numbers {
        (first, _, third, _, fifth) => {
            println!("Some numbers: {}, {}, {}", first, third, fifth);
        }
    }
}
```

### Match Guards

You can add extra conditions to match arms with a `if` guard:

```rust
fn main() {
    let number = 4;

    match number {
        n if n < 0 => println!("Negative number"),
        n if n % 2 == 0 => println!("Even number"),
        n if n % 2 == 1 => println!("Odd number"),
        // This _ case would never execute because all cases are covered
        _ => unreachable!(),
    }
}
```

### Binding with @ Operator

The `@` operator lets you bind a value while also testing it:

```rust
fn main() {
    let x = 5;

    match x {
        n @ 1..=5 => println!("Got a small number: {}", n),
        n @ 6..=10 => println!("Got a medium number: {}", n),
        n => println!("Got a big number: {}", n),
    }
}
```

## Early Returns, Break, and Continue

Rust provides several ways to control the flow of execution within loops and functions.

### Early Returns in Functions

```rust
fn find_even(numbers: &[i32]) -> Option<i32> {
    for &num in numbers {
        if num % 2 == 0 {
            return Some(num); // Early return when we find an even number
        }
    }

    None // Return None if no even number is found
}

fn main() {
    let numbers = [1, 3, 5, 6, 9, 11];

    match find_even(&numbers) {
        Some(n) => println!("Found even number: {}", n),
        None => println!("No even numbers found"),
    }
}
```

Early returns are a clean way to handle special cases without deeply nested conditionals.

### Break and Continue

As we've seen, `break` exits a loop, while `continue` skips to the next iteration:

```rust
fn main() {
    for i in 0..10 {
        if i % 2 == 0 {
            continue; // Skip even numbers
        }

        if i > 7 {
            break; // Stop once we reach 8
        }

        println!("{}", i); // Prints 1, 3, 5, 7
    }
}
```

## Loop Labels

Rust allows you to label loops and break or continue specific loops in nested scenarios:

```rust
fn main() {
    'outer: for x in 0..5 {
        println!("x: {}", x);

        'inner: for y in 0..5 {
            println!("  y: {}", y);

            if y == 2 && x == 1 {
                break 'outer; // Break out of the outer loop
            }

            if y == 1 {
                continue 'inner; // Skip to the next iteration of the inner loop
            }
        }
    }
}
```

Loop labels are especially useful when you have nested loops and need to control which loop is affected by `break` or `continue`.

## Using Match Expressions for Error Handling

One common use of `match` is to handle possible error conditions with `Option` and `Result` types:

```rust
fn main() {
    let numbers = vec![1, 2, 3];

    // Using match with Option
    match numbers.get(5) {
        Some(value) => println!("Value at index 5: {}", value),
        None => println!("No value at index 5"),
    }

    // Using match with Result
    let parse_result = "42".parse::<i32>();
    match parse_result {
        Ok(number) => println!("Parsed number: {}", number),
        Err(error) => println!("Failed to parse: {}", error),
    }

    // Using if let for simpler matching
    if let Some(value) = numbers.get(1) {
        println!("Value at index 1: {}", value);
    }

    // Using while let for conditional loops
    let mut stack = Vec::new();
    stack.push(1);
    stack.push(2);
    stack.push(3);

    while let Some(value) = stack.pop() {
        println!("Popped: {}", value);
    }
}
```

This pattern-based approach to error handling is one of Rust's distinctive features, allowing for expressive and type-safe code.

## 🔨 Project: Number Guessing Game

Let's create a complete number guessing game to apply what we've learned about control flow in Rust.

### Project Requirements

1. Generate a random number for the player to guess
2. Allow the player to input guesses
3. Provide feedback on whether the guess is too high, too low, or correct
4. Track the number of guesses and offer hints after several attempts
5. Allow multiple rounds of play

### Step 1: Create the Project

```bash
cargo new guessing_game
cd guessing_game
```

### Step 2: Add Dependencies

Edit your `Cargo.toml` file to add the `rand` crate:

```toml
[dependencies]
rand = "0.8.5"
```

### Step 3: Implement the Game

Now, let's write the code in `src/main.rs`:

```rust
use rand::Rng;
use std::cmp::Ordering;
use std::io::{self, Write};

fn main() {
    println!("🎮 NUMBER GUESSING GAME 🎮");
    println!("I'm thinking of a number between 1 and 100...");

    let mut play_again = true;
    let mut total_games = 0;
    let mut best_score = usize::MAX;

    while play_again {
        let secret_number = rand::thread_rng().gen_range(1..=100);
        let mut guesses = 0;
        let mut has_hint = false;

        loop {
            // Get user input
            print!("Enter your guess: ");
            io::stdout().flush().unwrap(); // Ensure the prompt is displayed

            let mut guess = String::new();
            io::stdin()
                .read_line(&mut guess)
                .expect("Failed to read line");

            // Parse the guess
            let guess: u32 = match guess.trim().parse() {
                Ok(num) => num,
                Err(_) => {
                    println!("Please enter a valid number!");
                    continue;
                }
            };

            guesses += 1;

            // Compare the guess with the secret number
            match guess.cmp(&secret_number) {
                Ordering::Less => {
                    println!("Too small!");

                    // Provide a hint after 5 guesses
                    if guesses >= 5 && !has_hint {
                        has_hint = true;
                        let range = if secret_number <= 50 { "1-50" } else { "51-100" };
                        println!("Hint: The number is in the range {}", range);
                    }
                }
                Ordering::Greater => {
                    println!("Too big!");

                    // Provide a hint after 5 guesses
                    if guesses >= 5 && !has_hint {
                        has_hint = true;
                        let range = if secret_number <= 50 { "1-50" } else { "51-100" };
                        println!("Hint: The number is in the range {}", range);
                    }
                }
                Ordering::Equal => {
                    if guesses == 1 {
                        println!("🎉 You got it in 1 guess! Incredible!");
                    } else {
                        println!("🎉 You got it in {} guesses!", guesses);
                    }

                    // Update best score
                    if guesses < best_score {
                        best_score = guesses;
                        println!("That's a new best score!");
                    }

                    break;
                }
            }
        }

        total_games += 1;

        // Ask to play again
        loop {
            print!("Play again? (y/n): ");
            io::stdout().flush().unwrap();

            let mut response = String::new();
            io::stdin().read_line(&mut response).expect("Failed to read line");

            match response.trim().to_lowercase().as_str() {
                "y" | "yes" => {
                    println!("\nGreat! Let's play again!");
                    println!("I'm thinking of a new number between 1 and 100...");
                    break;
                }
                "n" | "no" => {
                    play_again = false;
                    break;
                }
                _ => println!("Please enter y or n."),
            }
        }
    }

    // Game summary
    println!("\n🏆 GAME SUMMARY 🏆");
    println!("Games played: {}", total_games);

    if best_score != usize::MAX {
        println!("Best score: {} guesses", best_score);

        let rating = match best_score {
            1 => "Psychic! 🔮",
            2..=4 => "Amazing! 🌟",
            5..=7 => "Good job! 👍",
            8..=10 => "Not bad! 😊",
            _ => "Keep practicing! 💪",
        };

        println!("Rating: {}", rating);
    }

    println!("\nThanks for playing!");
}
```

### Step 4: Run the Game

```bash
cargo run
```

### Step 5: Understanding the Code

This game demonstrates several control flow concepts:

1. **Loops**: Both `while` and `loop` for different purposes
2. **Match expressions**: For comparing guesses and handling user input
3. **Early returns with `continue`**: To skip invalid inputs
4. **If/else conditionals**: For providing hints and feedback
5. **Pattern matching with ranges**: In the final rating system
6. **Break statements**: To exit loops when a guess is correct
7. **Nested loops**: For the main game loop and the play-again prompt

### Step 6: Extending the Game

Here are some ways to extend the game:

1. Add difficulty levels with different number ranges
2. Implement a time limit for each guess
3. Create a two-player mode
4. Add a graphical interface with a Rust GUI framework
5. Save high scores to a file

## Summary

In this chapter, we've explored Rust's control flow constructs, understanding how expressions differ from statements and how they affect Rust's programming style. We've covered:

- How Rust's expression-based nature distinguishes it from other languages
- Working with conditional expressions using `if` and `else`
- The three types of loops: `loop`, `while`, and `for`
- How Rust's loops differ from loops in other languages
- Creating and using ranges for sequences of values
- Powerful pattern matching with `match` expressions
- Controlling execution flow with `break`, `continue`, and early returns
- Labeling loops for fine-grained control in nested loops
- Using match expressions for effective error handling
- Building a complete number guessing game application

These control flow mechanisms are the building blocks for more complex Rust programs. The expression-oriented approach you've learned forms the foundation for much of Rust's syntax. As you continue your Rust journey, you'll find that thinking in terms of expressions makes your code more concise and often more readable.

In the next chapter, we'll dive into functions and procedures, exploring how to organize code into reusable units. We'll learn about parameters, return values, and how functions in Rust build upon the expression-based nature of the language that we've explored here.

## Exercises

1. **Expression Practice**: Write a program that uses block expressions to calculate and assign values to variables. Experiment with adding semicolons to see how it changes the behavior.

2. **Control Flow Refactoring**: Take a program written in another language that uses imperative control flow and rewrite it using Rust's expression-based approach.

3. **Pattern Matching Challenge**: Create a program that matches different shapes (circles, rectangles, triangles) and calculates their areas using pattern matching.

4. **Loop Label Exercise**: Write a program with nested loops that uses labeled breaks and continues to generate a specific pattern.

5. **Error Handling**: Write a function that parses different types of input (numbers, dates, etc.) and uses match expressions to handle all possible error cases.

6. **Advanced Guessing Game**: Extend the number guessing game with one or more of the suggested enhancements from Step 6.

## Further Reading

- [The Rust Programming Language: Control Flow](https://doc.rust-lang.org/book/ch03-05-control-flow.html)
- [Rust By Example: Flow of Control](https://doc.rust-lang.org/rust-by-example/flow_control.html)
- [The Rust Reference: Expressions](https://doc.rust-lang.org/reference/expressions.html)
- [Pattern Matching in Rust](https://doc.rust-lang.org/book/ch18-00-patterns.html)
- [Error Handling in Rust](https://doc.rust-lang.org/book/ch09-00-error-handling.html)
