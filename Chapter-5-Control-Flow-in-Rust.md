# Chapter 5: Control Flow in Rust

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

    // The expression 3 * 4 evaluates to 12
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

## Loops

Rust provides three kinds of loops: `loop`, `while`, and `for`.

### The Loop Expression

The `loop` keyword gives us an infinite loop that continues until explicitly broken.

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

## How Rust's Loops Differ from Other Languages

Rust's loops might look familiar, but they have some important differences:

1. **Expression-oriented**: All loops can be expressions that return values
2. **Explicit iteration**: No C-style for loops with initialization, condition, and increment
3. **Safety**: No out-of-bounds access in for loops
4. **Iterators**: The for loop uses Rust's iterator system, which is very powerful

### Comparison with C/C++ Style For Loops

In C/C++/Java/JavaScript, you might write:

```c
// C-style loop
for (int i = 0; i < 10; i++) {
    printf("%d\n", i);
}
```

In Rust, you would use a range:

```rust
// Rust loop
for i in 0..10 {
    println!("{}", i);
}
```

The Rust approach is cleaner, safer (no risk of an off-by-one error), and works with Rust's iterator system.

## Range Expressions

Ranges in Rust are a concise way to express a sequence of values:

```rust
fn main() {
    // Range expressions
    let range1 = 1..5;    // Includes 1, 2, 3, 4
    let range2 = 1..=5;   // Includes 1, 2, 3, 4, 5

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
}
```

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

### Break and Continue

As we've seen, `break` exits a loop, while `continue` skips to the next iteration:

```rust
fn main() {
    let mut count = 0;

    'counting_up: loop {
        println!("count = {}", count);

        let mut remaining = 10;

        loop {
            println!("remaining = {}", remaining);

            if remaining == 9 {
                break; // Break from the inner loop
            }

            if count == 2 {
                break 'counting_up; // Break from the outer loop
            }

            remaining -= 1;
        }

        count += 1;
    }

    println!("End count = {}", count);
}
```

## Loop Labels

As shown in the previous example, Rust allows you to label loops and break or continue specific loops in nested scenarios:

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
}
```

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

### Step 6: Extending the Game

Here are some ways to extend the game:

1. Add difficulty levels with different number ranges
2. Implement a time limit for each guess
3. Create a two-player mode
4. Add a graphical interface with a Rust GUI framework
5. Save high scores to a file

## Looking Ahead

In this chapter, we've explored Rust's control flow constructs, understanding how expressions differ from statements and how they affect Rust's programming style. We've learned about conditional expressions, different types of loops, pattern matching, and early returns.

In the next chapter, we'll dive into functions and procedures, exploring how to organize code into reusable units. We'll learn about parameters, return values, and how functions in Rust build upon the expression-based nature of the language.

The expression-oriented approach you've learned in this chapter forms the foundation for much of Rust's syntax. As you continue your Rust journey, you'll find that thinking in terms of expressions makes your code more concise and often more readable. The pattern matching capabilities of `match` will become increasingly powerful as we explore more complex data structures in later chapters.
