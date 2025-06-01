# Chapter 23: Closures in Depth

## Introduction

Closures are one of Rust's most powerful features, enabling elegant and flexible programming patterns that blend functional and imperative approaches. While we've encountered closures in previous chapters—using them with iterators, error handling, and various standard library functions—this chapter will explore them in much greater depth.

At their core, closures are anonymous functions that can capture their environment. This seemingly simple capability unlocks remarkable expressiveness and enables patterns that would be cumbersome or impossible with regular functions. From event handlers to customization points, from lazy evaluation to function builders, closures are essential to idiomatic Rust code.

In this chapter, we'll dissect how closures work in Rust, exploring their unique traits, memory representations, and performance characteristics. We'll learn how to use closures effectively as function arguments and return values, and develop an understanding of closure type inference. We'll also examine practical patterns for working with closures and build a comprehensive event system that showcases their power in real-world code.

By the end of this chapter, you'll have a deep understanding of closures and the tools to use them confidently in your Rust projects.

## Understanding Closures

Before we dive into Rust's specific implementation of closures, let's establish what closures are conceptually and why they're valuable.

### What Are Closures?

A closure is an anonymous function that can capture values from its surrounding environment. This combination of functionality (the function) and environment (the captured values) creates a powerful abstraction that can be passed around and invoked like any other function.

Let's look at a simple example:

```rust
fn main() {
    let x = 10;

    // This is a closure that captures 'x' from its environment
    let add_x = |y| x + y;

    println!("Result: {}", add_x(5)); // Outputs: Result: 15
}
```

In this example, `add_x` is a closure that takes a parameter `y` and adds it to the captured value `x`. The closure "closes over" its environment, hence the name "closure."

### Closures vs. Functions

While closures and functions serve similar purposes, they have key differences:

1. **Syntax**: Closures use a more concise syntax with pipe characters (`|params| body`).
2. **Type inference**: Closures can often infer parameter and return types from context.
3. **Environment capture**: Closures can capture values from their enclosing scope.
4. **Traits**: Closures implement specific traits based on how they use captured values.

Here's a comparison:

```rust
// Regular function
fn add_five(x: i32) -> i32 {
    x + 5
}

fn main() {
    let y = 5;

    // Closure with explicit types (similar to function)
    let add_five_closure = |x: i32| -> i32 { x + 5 };

    // Closure with inferred types
    let add_five_inferred = |x| x + 5;

    // Closure capturing environment
    let add_y = |x| x + y;

    println!("Function: {}", add_five(10));          // 15
    println!("Explicit closure: {}", add_five_closure(10)); // 15
    println!("Inferred closure: {}", add_five_inferred(10)); // 15
    println!("Capturing closure: {}", add_y(10));    // 15
}
```

### Closure Syntax Variations

Rust closures support several syntax variations for different needs:

```rust
// Single expression (no braces needed)
let add_one = |x| x + 1;

// Multiple statements (requires braces)
let print_and_add_one = |x| {
    println!("Adding one to {}", x);
    x + 1
};

// No parameters
let say_hello = || println!("Hello!");

// Multiple parameters
let add = |x, y| x + y;

// Explicit type annotations
let typed_add = |x: i32, y: i32| -> i32 { x + y };
```

### When to Use Closures

Closures are particularly useful in scenarios like:

1. **Higher-order functions**: Functions that take other functions as arguments or return them
2. **Callbacks**: Providing code to be executed later in response to events
3. **Customization points**: Allowing users to customize behavior of a function or algorithm
4. **Lazy evaluation**: Delaying computation until it's needed
5. **Iterators and functional patterns**: Transforming data with operations like `map` and `filter`

Let's see an example using a higher-order function:

```rust
fn apply_operation<F>(x: i32, y: i32, operation: F) -> i32
where
    F: Fn(i32, i32) -> i32,
{
    operation(x, y)
}

fn main() {
    let sum = apply_operation(5, 3, |a, b| a + b);
    let product = apply_operation(5, 3, |a, b| a * b);

    println!("Sum: {}", sum);       // 8
    println!("Product: {}", product); // 15
}
```

This flexibility makes closures a cornerstone of expressive Rust code.

## Closure Environments and Captures

One of the most powerful aspects of closures is their ability to capture values from their environment. Let's explore how this works in Rust.

### How Closures Capture Their Environment

When a closure references a variable from its surrounding scope, it "captures" that variable. Rust offers three ways to capture variables:

1. **Borrowing immutably**: The closure gets a shared reference (`&T`)
2. **Borrowing mutably**: The closure gets a mutable reference (`&mut T`)
3. **Taking ownership**: The closure takes ownership of the value (with the `move` keyword)

Rust automatically determines the capture method based on how the closure uses the variables:

```rust
fn main() {
    let name = String::from("Rust");

    // Immutable borrow capture
    let greet = || println!("Hello, {}!", name);

    // We can still use 'name' here because the closure only borrowed it
    println!("Name: {}", name);

    greet(); // Prints: Hello, Rust!

    // -----------------------------------------

    let mut counter = 0;

    // Mutable borrow capture
    let mut increment = || {
        counter += 1;
        println!("Counter: {}", counter);
    };

    // Can't use 'counter' here because it's mutably borrowed by the closure
    // println!("Counter: {}", counter); // Error!

    increment(); // Prints: Counter: 1
    increment(); // Prints: Counter: 2

    // Now we can use 'counter' again
    println!("Final counter: {}", counter); // Prints: Final counter: 2
}
```

### Move Closures

Sometimes, you need a closure to take ownership of the values it captures, especially when the closure might outlive the current scope. This is where `move` closures come in:

```rust
fn main() {
    let name = String::from("Rust");

    // Regular closure - borrows 'name'
    let regular_closure = || println!("Hello, {}!", name);

    // Move closure - takes ownership of 'name'
    let move_closure = move || println!("Hello, {}!", name);

    // Can't use 'name' anymore after the move closure
    // println!("Name: {}", name); // Error! 'name' was moved

    regular_closure(); // Works fine
    move_closure();    // Also works fine
}
```

Move closures are particularly important when working with threads or async code, where the closure needs to outlive the current scope:

```rust
use std::thread;

fn main() {
    let name = String::from("Rust");

    // This closure must take ownership of 'name' because it will be used in another thread
    let handle = thread::spawn(move || {
        println!("Hello, {}! From another thread.", name);
    });

    // Wait for the thread to finish
    handle.join().unwrap();

    // Can't use 'name' here because it was moved into the closure
    // println!("Name: {}", name); // Error!
}
```

### Partial Moves in Closures

Rust's ownership system applies to closures as well. You can partially move values into a closure:

```rust
fn main() {
    let person = (String::from("Alice"), 30);

    // This closure moves the first element of the tuple but borrows the second
    let closure = move || {
        let name = person.0; // This moves 'person.0'
        println!("Name: {}, Age: {}", name, person.1);
    };

    // Can't use 'person.0' anymore, but can use 'person.1'
    // println!("Name: {}", person.0); // Error! 'person.0' was moved
    println!("Age: {}", person.1);    // Works fine

    closure();
}
```

### Capturing in Nested Closures

Closures can capture values from multiple outer scopes, including other closures:

```rust
fn main() {
    let x = 10;

    let outer = || {
        let y = 5;

        // Inner closure captures both 'x' from the main function
        // and 'y' from the outer closure
        let inner = || println!("x + y = {}", x + y);

        inner();
    };

    outer(); // Prints: x + y = 15
}
```

### Implementation Details of Captures

Under the hood, closures are implemented as anonymous structs that store the captured variables as fields. When a closure captures a variable:

1. Rust creates an anonymous struct with fields for each captured variable
2. The struct implements one or more function traits (`Fn`, `FnMut`, or `FnOnce`)
3. The closure becomes an instance of this struct

This implementation allows closures to have different sizes and memory layouts based on what they capture.

## FnOnce, FnMut, and Fn Traits

Rust's closure system is built on three traits that define how a closure interacts with its captured environment: `FnOnce`, `FnMut`, and `Fn`. Understanding these traits is crucial for working effectively with closures.

### The Three Closure Traits

1. **FnOnce**: Closures that can be called exactly once. These closures may consume (take ownership of) their captured values.

2. **FnMut**: Closures that can be called multiple times and can mutate their captured values. These closures borrow their captures mutably.

3. **Fn**: Closures that can be called multiple times without mutating their environment. These closures borrow their captures immutably.

These traits form a hierarchy: `Fn` is a subtrait of `FnMut`, which is a subtrait of `FnOnce`. This means:

- If a closure implements `Fn`, it also implements `FnMut` and `FnOnce`
- If a closure implements `FnMut`, it also implements `FnOnce`

### How Rust Chooses the Trait

Rust automatically determines which trait(s) a closure implements based on how it uses its captures:

```rust
fn main() {
    let name = String::from("Rust");

    // FnOnce - consumes 'name'
    let consume = || {
        // Takes ownership of 'name' and drops it
        drop(name);
    };
    consume(); // Can only call once
    // consume(); // Error! 'name' was already consumed

    // -----------------------------------------

    let mut counter = 0;

    // FnMut - mutates 'counter'
    let mut mutate = || {
        counter += 1;
        println!("Counter: {}", counter);
    };
    mutate(); // Counter: 1
    mutate(); // Counter: 2

    // -----------------------------------------

    let value = 10;

    // Fn - only reads 'value'
    let read_only = || {
        println!("Value: {}", value);
    };
    read_only(); // Value: 10
    read_only(); // Value: 10
}
```

### Using Closures with Different Traits

Understanding the trait hierarchy is important when writing functions that accept closures:

```rust
// Accepts any closure that implements FnOnce
fn consume_with_once<F>(f: F)
where
    F: FnOnce() -> String,
{
    // Can only call f once
    let result = f();
    println!("Result: {}", result);
}

// Accepts any closure that implements FnMut
fn consume_with_mut<F>(mut f: F)
where
    F: FnMut() -> String,
{
    // Can call f multiple times
    let result1 = f();
    let result2 = f();
    println!("Results: {}, {}", result1, result2);
}

// Accepts any closure that implements Fn
fn consume_with_fn<F>(f: F)
where
    F: Fn() -> String,
{
    // Can call f multiple times
    let result1 = f();
    let result2 = f();
    println!("Results: {}, {}", result1, result2);
}

fn main() {
    let name = String::from("Rust");

    // This closure implements Fn (it only reads name)
    let read_only = || format!("Hello, {}!", name);

    // Can use with any of the functions
    consume_with_once(read_only);
    consume_with_mut(read_only);
    consume_with_fn(read_only);

    // -----------------------------------------

    let mut counter = 0;

    // This closure implements FnMut (it mutates counter)
    let increment = || {
        counter += 1;
        format!("Counter: {}", counter)
    };

    // Can use with FnOnce and FnMut, but not Fn
    consume_with_once(increment);
    consume_with_mut(increment);
    // consume_with_fn(increment); // Error! Requires Fn but closure is FnMut

    // -----------------------------------------

    // This closure implements FnOnce (it moves name)
    let consume = || {
        let inner_name = name; // Moves 'name'
        format!("Consumed: {}", inner_name)
    };

    // Can only use with FnOnce
    consume_with_once(consume);
    // consume_with_mut(consume); // Error! Requires FnMut but closure is FnOnce
    // consume_with_fn(consume); // Error! Requires Fn but closure is FnOnce
}
```

### Trait Bounds in Generic Functions

When writing generic functions that accept closures, it's important to use the appropriate trait bound:

```rust
// This function can accept any closure that can be called once
fn apply_once<F, T, R>(input: T, f: F) -> R
where
    F: FnOnce(T) -> R,
{
    f(input)
}

// This function can accept any closure that can be called multiple times
// and potentially mutate its environment
fn apply_multiple<F, T, R>(input: T, mut f: F, times: usize) -> Vec<R>
where
    F: FnMut(T) -> R,
    T: Copy,
{
    let mut results = Vec::with_capacity(times);
    for _ in 0..times {
        results.push(f(input));
    }
    results
}

// This function can accept any closure that can be called multiple times
// without mutating its environment
fn apply_concurrent<F, T, R>(input: T, f: F, times: usize) -> Vec<R>
where
    F: Fn(T) -> R + Send + Sync + 'static,
    T: Copy + Send + 'static,
    R: Send + 'static,
{
    use std::thread;

    let mut handles = Vec::with_capacity(times);

    // Spawn threads to run the closure concurrently
    for _ in 0..times {
        let closure = f; // Each thread gets its own copy of the closure
        let value = input;
        handles.push(thread::spawn(move || closure(value)));
    }

    // Collect results
    handles.into_iter().map(|h| h.join().unwrap()).collect()
}
```

### The Underlying Representation

The three closure traits are defined roughly as follows:

```rust
pub trait FnOnce<Args> {
    type Output;
    fn call_once(self, args: Args) -> Self::Output;
}

pub trait FnMut<Args>: FnOnce<Args> {
    fn call_mut(&mut self, args: Args) -> Self::Output;
}

pub trait Fn<Args>: FnMut<Args> {
    fn call(&self, args: Args) -> Self::Output;
}
```

The key differences are in how `self` is taken:

- `FnOnce` takes `self` by value, consuming the closure
- `FnMut` takes `&mut self`, allowing for mutation
- `Fn` takes `&self`, allowing only immutable access

## Move Closures

We've briefly touched on `move` closures earlier, but they deserve a more detailed examination given their importance in Rust programming.

### When to Use Move Closures

Move closures are essential in several scenarios:

1. **Threads**: When a closure needs to be sent to another thread
2. **Async code**: When a closure needs to outlive its current scope
3. **Ownership transfer**: When you want to transfer ownership of values into a closure
4. **Escaping references**: When a closure might outlive the scope of its captured references

Let's explore these scenarios in more detail:

#### Threads and Move Closures

When spawning a thread, the closure passed to `thread::spawn` must be `'static`, meaning it can't contain any references to data owned by another scope:

```rust
use std::thread;

fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    // ERROR without 'move': closure may outlive borrowed value 'numbers'
    let handle = thread::spawn(move || {
        println!("Processing: {:?}", numbers);
        // Do something with numbers
        numbers.iter().sum::<i32>()
    });

    // Can't use 'numbers' here anymore
    // println!("Original: {:?}", numbers); // Error!

    let sum = handle.join().unwrap();
    println!("Sum: {}", sum); // Sum: 15
}
```

#### Returning Closures

When returning a closure that captures local variables, you'll often need to use `move`:

```rust
fn create_counter(start: i32) -> impl FnMut() -> i32 {
    let mut count = start;

    // Without 'move', count would be a reference to a local variable
    // that goes out of scope when the function returns
    move || {
        count += 1;
        count
    }
}

fn main() {
    let mut counter = create_counter(0);

    println!("{}", counter()); // 1
    println!("{}", counter()); // 2
    println!("{}", counter()); // 3
}
```

#### Closure Lifetimes

Move closures can help manage lifetimes in complex scenarios:

```rust
struct Cache<F>
where
    F: Fn(u32) -> u32,
{
    calculation: F,
    value: Option<u32>,
}

impl<F> Cache<F>
where
    F: Fn(u32) -> u32,
{
    fn new(calculation: F) -> Self {
        Cache {
            calculation,
            value: None,
        }
    }

    fn value(&mut self, arg: u32) -> u32 {
        match self.value {
            Some(v) => v,
            None => {
                let v = (self.calculation)(arg);
                self.value = Some(v);
                v
            }
        }
    }
}

fn main() {
    let expensive_calculation = |num| {
        println!("Calculating...");
        // Simulate expensive calculation
        std::thread::sleep(std::time::Duration::from_secs(1));
        num * 2
    };

    let mut cache = Cache::new(expensive_calculation);

    // First call will calculate
    println!("First call: {}", cache.value(42)); // Calculating... First call: 84

    // Second call will use cached value
    println!("Second call: {}", cache.value(42)); // Second call: 84
}
```

### Move Closure Performance

Using `move` can sometimes impact performance, as it may lead to more data being copied or moved than necessary. However, in many cases, the Rust compiler can optimize away unnecessary copies, especially for types that implement `Copy`.

For small, `Copy` types like integers, the performance impact is negligible. For larger types, consider the trade-offs between copying data and borrowing it.

## Closure Performance and Optimization

Closures in Rust are designed to be as efficient as possible, often compiling down to code that's as fast as equivalent hand-written functions. However, understanding their performance characteristics can help you make informed decisions.

### Zero-Cost Abstraction

Rust's closures are designed as a zero-cost abstraction, meaning they don't add runtime overhead compared to equivalent code without closures. The compiler implements several optimizations:

1. **Inlining**: The compiler often inlines simple closures, eliminating function call overhead
2. **Monomorphization**: Generic closures are specialized for each specific type they're used with
3. **Capture optimization**: The compiler only captures what's actually used by the closure

Let's look at a simple example:

```rust
fn main() {
    let x = 10;
    let y = 20;

    // This closure only captures x, not y
    let add_x = |z| z + x;

    println!("Result: {}", add_x(5)); // Result: 15
}
```

In this case, the compiled code will only capture `x`, not `y`, even though both are in scope.

### Closure Size and Layout

The size of a closure depends on what it captures:

```rust
use std::mem::size_of_val;

fn main() {
    // No captures
    let no_capture = || 42;

    // Captures a reference
    let x = 10;
    let ref_capture = || x + 1;

    // Captures by value
    let val_capture = move || x + 1;

    // Captures a String by reference
    let s = String::from("hello");
    let string_ref_capture = || s.len();

    // Captures a String by value
    let string_val_capture = move || s.len();

    println!("No captures: {} bytes", size_of_val(&no_capture));
    println!("Ref capture: {} bytes", size_of_val(&ref_capture));
    println!("Val capture: {} bytes", size_of_val(&val_capture));
    println!("String ref capture: {} bytes", size_of_val(&string_ref_capture));
    println!("String val capture: {} bytes", size_of_val(&string_val_capture));
}
```

The results might surprise you—closures are often quite small, especially when they capture by reference.

### Benchmarking Closures

To understand the performance impact of different closure patterns, it's helpful to benchmark them:

```rust
use std::time::{Duration, Instant};

// Function to benchmark a closure
fn benchmark<F, R>(name: &str, iterations: u32, mut f: F) -> R
where
    F: FnMut() -> R,
{
    let start = Instant::now();
    let result = f();
    let duration = start.elapsed();

    println!("{}: {:?} ({} iterations)", name, duration, iterations);

    result
}

fn main() {
    let data = vec![1, 2, 3, 4, 5];
    let multiplier = 2;

    // Benchmark different approaches

    // 1. Closure that captures by reference
    benchmark("Ref capture", 1_000_000, || {
        data.iter().map(|x| x * multiplier).sum::<i32>()
    });

    // 2. Closure that captures by value
    benchmark("Move capture", 1_000_000, move || {
        data.iter().map(|x| x * multiplier).sum::<i32>()
    });

    // 3. Explicit function with parameters
    fn map_and_sum(data: &[i32], multiplier: i32) -> i32 {
        data.iter().map(|x| x * multiplier).sum()
    }

    let data2 = vec![1, 2, 3, 4, 5];
    benchmark("Explicit function", 1_000_000, || {
        map_and_sum(&data2, multiplier)
    });
}
```

In many cases, you'll find that the performance difference between these approaches is minimal, especially in release mode.

### Closure Optimizations

The Rust compiler applies several optimizations to closures:

1. **Devirtualization**: When the specific closure type is known at compile time, the compiler can eliminate dynamic dispatch
2. **Capture elision**: The compiler only captures what's actually used
3. **Inlining**: Small closures are often inlined at their call sites
4. **Dead capture elimination**: Unused captured variables are eliminated

These optimizations make closures efficient even in performance-critical code.

## Closures as Function Arguments

One of the most common uses of closures is passing them as arguments to functions. This pattern enables flexible and reusable code by allowing customization of behavior.

### Basic Patterns

Let's examine some common patterns for functions that accept closures:

```rust
// Function that applies a transformation to each element
fn transform<T, U, F>(input: Vec<T>, f: F) -> Vec<U>
where
    F: Fn(T) -> U,
{
    input.into_iter().map(f).collect()
}

// Function that filters elements based on a predicate
fn keep_if<T, F>(input: Vec<T>, predicate: F) -> Vec<T>
where
    F: Fn(&T) -> bool,
{
    input.into_iter().filter(|item| predicate(item)).collect()
}

// Function that processes elements until a condition is met
fn process_until<T, F>(input: Vec<T>, mut process: F)
where
    F: FnMut(T) -> bool,
{
    for item in input {
        if process(item) {
            break;
        }
    }
}

fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    // Transform each number to its square
    let squares = transform(numbers.clone(), |x| x * x);
    println!("Squares: {:?}", squares); // [1, 4, 9, 16, 25]

    // Keep only even numbers
    let evens = keep_if(numbers.clone(), |x| x % 2 == 0);
    println!("Evens: {:?}", evens); // [2, 4]

    // Process until we find a number greater than 3
    let mut found = false;
    process_until(numbers, |x| {
        println!("Processing: {}", x);
        if x > 3 {
            found = true;
            return true;
        }
        false
    });
    println!("Found number > 3: {}", found); // true
}
```

### Callbacks and Event Handlers

Closures are excellent for callback-based APIs:

```rust
struct Button {
    id: String,
    click_handler: Option<Box<dyn FnMut()>>,
}

impl Button {
    fn new(id: &str) -> Self {
        Button {
            id: id.to_string(),
            click_handler: None,
        }
    }

    fn set_click_handler<F>(&mut self, handler: F)
    where
        F: FnMut() + 'static,
    {
        self.click_handler = Some(Box::new(handler));
    }

    fn click(&mut self) {
        if let Some(handler) = &mut self.click_handler {
            handler();
        }
    }
}

fn main() {
    let mut counter = 0;

    let mut button = Button::new("submit");

    // Set a click handler that captures counter
    button.set_click_handler(move || {
        counter += 1;
        println!("Button clicked! Counter: {}", counter);
    });

    // Simulate clicking the button
    button.click(); // Button clicked! Counter: 1
    button.click(); // Button clicked! Counter: 2
}
```

### Strategy Pattern with Closures

Closures enable elegant implementations of the strategy pattern:

```rust
struct SortableVector<T> {
    data: Vec<T>,
}

impl<T: Clone> SortableVector<T> {
    fn new(data: Vec<T>) -> Self {
        SortableVector { data }
    }

    fn sorted_by<F>(&self, compare: F) -> Vec<T>
    where
        F: Fn(&T, &T) -> std::cmp::Ordering,
    {
        let mut result = self.data.clone();
        result.sort_by(compare);
        result
    }
}

fn main() {
    let numbers = SortableVector::new(vec![3, 1, 4, 1, 5, 9, 2, 6]);

    // Sort in ascending order
    let ascending = numbers.sorted_by(|a, b| a.cmp(b));
    println!("Ascending: {:?}", ascending); // [1, 1, 2, 3, 4, 5, 6, 9]

    // Sort in descending order
    let descending = numbers.sorted_by(|a, b| b.cmp(a));
    println!("Descending: {:?}", descending); // [9, 6, 5, 4, 3, 2, 1, 1]

    // Sort by distance from 5
    let by_distance_from_5 = numbers.sorted_by(|a, b| {
        let a_dist = (*a as i32 - 5).abs();
        let b_dist = (*b as i32 - 5).abs();
        a_dist.cmp(&b_dist)
    });
    println!("By distance from 5: {:?}", by_distance_from_5);
}
```

### Multiple Closure Parameters

Functions can accept multiple closures for different purposes:

```rust
fn process_data<T, F, G, H>(
    data: Vec<T>,
    filter: F,
    transform: G,
    aggregate: H,
) -> Vec<T>
where
    F: Fn(&T) -> bool,
    G: Fn(T) -> T,
    H: Fn(Vec<T>) -> Vec<T>,
{
    let filtered = data.into_iter().filter(|item| filter(item)).collect::<Vec<_>>();
    let transformed = filtered.into_iter().map(transform).collect::<Vec<_>>();
    aggregate(transformed)
}

fn main() {
    let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    let result = process_data(
        numbers,
        |&x| x % 2 == 0,            // Keep even numbers
        |x| x * x,                  // Square each number
        |v| {                       // Sort in descending order
            let mut result = v;
            result.sort_by(|a, b| b.cmp(a));
            result
        },
    );

    println!("Result: {:?}", result); // [100, 64, 36, 16, 4]
}
```

### Closure Type Erasure

When you need to store closures of different types but with the same signature, you can use trait objects:

```rust
fn create_transformers() -> Vec<Box<dyn Fn(i32) -> i32>> {
    vec![
        Box::new(|x| x + 1),      // Add one
        Box::new(|x| x * 2),      // Double
        Box::new(|x| x * x),      // Square
        Box::new(|x| x.pow(3)),   // Cube
    ]
}

fn main() {
    let transformers = create_transformers();

    let input = 5;
    for (i, transform) in transformers.iter().enumerate() {
        println!("Transformer {}: {} -> {}", i, input, transform(input));
    }
}
```

This pattern is useful for plugins, command registries, and other scenarios where you need a collection of functions with the same signature but different implementations.

## Returning Closures

Returning closures from functions creates powerful abstractions, enabling factory patterns, customized behaviors, and dynamic function creation. Let's explore how to return closures and the patterns they enable.

### Basic Closure Return

To return a closure from a function, you need to use the `impl Trait` syntax or `Box<dyn Trait>`:

```rust
// Return a closure using impl Trait
fn create_adder(amount: i32) -> impl Fn(i32) -> i32 {
    move |x| x + amount
}

fn main() {
    let add_five = create_adder(5);
    let add_ten = create_adder(10);

    println!("5 + 3 = {}", add_five(3)); // 8
    println!("10 + 3 = {}", add_ten(3)); // 13
}
```

The `move` keyword is essential here because the closure needs to own the `amount` variable. Without it, the closure would try to reference a variable that no longer exists once the function returns.

### Boxing Returned Closures

When you need to return different closure types based on a condition, you can use a boxed trait object:

```rust
fn create_operation(op: &str) -> Box<dyn Fn(i32, i32) -> i32> {
    match op {
        "add" => Box::new(|a, b| a + b),
        "subtract" => Box::new(|a, b| a - b),
        "multiply" => Box::new(|a, b| a * b),
        "divide" => Box::new(|a, b| a / b),
        _ => Box::new(|a, b| a),
    }
}

fn main() {
    let operations = [
        create_operation("add"),
        create_operation("subtract"),
        create_operation("multiply"),
        create_operation("divide"),
    ];

    for op in &operations {
        println!("10 op 5 = {}", op(10, 5));
    }
}
```

Using a boxed closure has a small runtime cost due to dynamic dispatch, but it gives you greater flexibility.

### Function Factories

Closures are excellent for creating function factories:

```rust
fn create_logger<F>(prefix: String, log_fn: F) -> impl FnMut(String)
where
    F: Fn(String) + 'static,
{
    move |message| {
        let formatted = format!("[{}] {}", prefix, message);
        log_fn(formatted);
    }
}

fn main() {
    let mut error_logger = create_logger(
        String::from("ERROR"),
        |msg| eprintln!("{}", msg),
    );

    let mut info_logger = create_logger(
        String::from("INFO"),
        |msg| println!("{}", msg),
    );

    error_logger(String::from("Something went wrong"));   // [ERROR] Something went wrong
    info_logger(String::from("Operation successful"));    // [INFO] Operation successful
}
```

### Building Complex Function Chains

You can build complex function chains by returning closures that compose operations:

```rust
fn compose<F, G, T>(f: F, g: G) -> impl Fn(T) -> T
where
    F: Fn(T) -> T + 'static,
    G: Fn(T) -> T + 'static,
    T: 'static,
{
    move |x| f(g(x))
}

fn main() {
    let add_five = |x| x + 5;
    let multiply_by_three = |x| x * 3;

    // First multiply by 3, then add 5
    let multiply_then_add = compose(add_five, multiply_by_three);

    // First add 5, then multiply by 3
    let add_then_multiply = compose(multiply_by_three, add_five);

    println!("multiply_then_add(10) = {}", multiply_then_add(10)); // 10 * 3 + 5 = 35
    println!("add_then_multiply(10) = {}", add_then_multiply(10)); // (10 + 5) * 3 = 45
}
```

### Stateful Closures

Returning closures can encapsulate state, creating a form of object with private data:

```rust
fn create_counter(start: i32) -> impl FnMut() -> i32 {
    let mut count = start;
    move || {
        count += 1;
        count
    }
}

fn main() {
    let mut counter1 = create_counter(0);
    let mut counter2 = create_counter(10);

    println!("Counter 1: {}", counter1()); // 1
    println!("Counter 1: {}", counter1()); // 2
    println!("Counter 2: {}", counter2()); // 11
    println!("Counter 1: {}", counter1()); // 3
    println!("Counter 2: {}", counter2()); // 12
}
```

This pattern is powerful because it allows you to create functions with private state that can only be accessed through the function calls.

### Closures with Configurable Behavior

You can return closures that have been configured with specific behaviors:

```rust
fn create_validator<F>(validate: F) -> impl Fn(&str) -> Result<(), String>
where
    F: Fn(&str) -> bool + 'static,
{
    move |input| {
        if validate(input) {
            Ok(())
        } else {
            Err(format!("Validation failed for: {}", input))
        }
    }
}

fn main() {
    // Create validators with different rules
    let no_empty = create_validator(|s| !s.is_empty());
    let no_numbers = create_validator(|s| !s.chars().any(|c| c.is_digit(10)));
    let min_length = create_validator(|s| s.len() >= 8);

    let username = "alice_smith";

    // Apply each validator
    for (name, validator) in [
        ("no_empty", &no_empty),
        ("no_numbers", &no_numbers),
        ("min_length", &min_length),
    ] {
        match validator(username) {
            Ok(()) => println!("{} passed", name),
            Err(e) => println!("{} failed: {}", name, e),
        }
    }
}
```

### Return Type Challenges

One challenge with returning closures is specifying their type. The simplest approach is `impl Fn(...)`, but this has limitations:

1. **Different closure types**: You can't return different closure types from the same function without boxing.
2. **Recursion**: It's tricky to have closures that call themselves recursively.

For the recursion challenge, one solution is to use a `Rc` and a mutable reference:

```rust
use std::rc::Rc;
use std::cell::RefCell;

fn create_factorial_calculator() -> impl Fn(u64) -> u64 {
    // Create a reference-counted, mutable reference to the closure
    let factorial: Rc<RefCell<Option<Box<dyn Fn(u64) -> u64>>>> = Rc::new(RefCell::new(None));

    // Clone it for use inside the new closure
    let factorial_ref = factorial.clone();

    // Create the actual closure
    let calculate = move |n: u64| -> u64 {
        if n <= 1 {
            1
        } else {
            n * (*factorial_ref.borrow().as_ref().unwrap())(n - 1)
        }
    };

    // Store the boxed closure
    *factorial.borrow_mut() = Some(Box::new(calculate));

    // Return a wrapper that calls our boxed closure
    move |n| (*factorial.borrow().as_ref().unwrap())(n)
}

fn main() {
    let factorial = create_factorial_calculator();

    println!("5! = {}", factorial(5)); // 120
    println!("10! = {}", factorial(10)); // 3628800
}
```

This complex pattern allows a closure to refer to itself recursively.

## Closure Type Inference

One of the most convenient aspects of Rust's closures is type inference, which allows you to write concise code without explicitly specifying parameter and return types. However, it's important to understand how inference works and when you might need to provide type annotations.

### How Closure Type Inference Works

Rust infers the types of closure parameters and returns based on how the closure is used:

```rust
fn main() {
    // Type inference based on usage
    let numbers = vec![1, 2, 3, 4, 5];

    // Rust infers that `n` is &i32 based on the iterator type
    let sum: i32 = numbers.iter().map(|n| n * 2).sum();

    println!("Sum of doubled values: {}", sum);
}
```

In this example, Rust infers that `n` is of type `&i32` because `iter()` produces an iterator of references.

### Explicit Type Annotations

Sometimes you may want to provide explicit type annotations for clarity or to resolve ambiguities:

```rust
fn main() {
    // Explicit parameter type
    let square = |x: i32| x * x;

    // Explicit return type
    let to_string = |x: i32| -> String { x.to_string() };

    // Both parameter and return types
    let format_number = |x: i32| -> String { format!("Number: {}", x) };

    println!("Square: {}", square(5));
    println!("String: {}", to_string(42));
    println!("Formatted: {}", format_number(123));
}
```

### Type Inference Limitations

There are situations where Rust's type inference for closures has limitations:

```rust
fn main() {
    // Error: Cannot infer type
    // let get_something = || get_value();

    // Solution: Provide type annotation
    let get_something: fn() -> i32 = || 42;

    // Or use the closure in a way that allows inference
    let value = get_something();
    println!("Value: {}", value);
}

// This would cause an error without a type annotation
// fn get_value() -> i32 { 42 }
```

### Generic Closures and Type Inference

When working with generic closures, type inference becomes more complex:

```rust
fn apply_to_pair<T, U, F>(pair: (T, T), f: F) -> (U, U)
where
    F: Fn(T) -> U,
{
    (f(pair.0), f(pair.1))
}

fn main() {
    // Type inference works here
    let pair = (3, 5);
    let squared = apply_to_pair(pair, |x| x * x);
    println!("Squared: {:?}", squared); // (9, 25)

    // Type annotation needed here to disambiguate
    let to_str = apply_to_pair(pair, |x: i32| -> String { x.to_string() });
    println!("As strings: {:?}", to_str); // ("3", "5")
}
```

In the second example, without type annotations, Rust wouldn't know whether to call `to_string()` or another method that returns a string-like type.

### Closure Type Inference with Multiple Uses

Type inference for closures becomes tricky when the same closure is used in different contexts:

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    // This works - closure used in a single context
    let result: Vec<i32> = numbers.iter().map(|x| x * x).collect();

    // Reusing a closure in different contexts often requires type annotations
    let square = |x: &i32| x * x;
    let result1: Vec<i32> = numbers.iter().map(square).collect();
    let result2: Vec<i32> = numbers.iter().filter(|&x| x % 2 == 0).map(square).collect();

    println!("Result: {:?}", result); // [1, 4, 9, 16, 25]
    println!("Result 1: {:?}", result1); // [1, 4, 9, 16, 25]
    println!("Result 2: {:?}", result2); // [4, 16]
}
```

### Function Pointers vs. Closures

It's important to understand the difference between function pointers and closures when it comes to type inference:

```rust
fn add_one(x: i32) -> i32 {
    x + 1
}

fn main() {
    // Function pointer
    let f: fn(i32) -> i32 = add_one;

    // Closure with the same signature
    let c = |x: i32| x + 1;

    // Both can be used the same way
    println!("Function: {}", f(5)); // 6
    println!("Closure: {}", c(5));  // 6

    // But they have different types
    // This would error: let same: fn(i32) -> i32 = c;
}
```

A function pointer is a pointer to a function, while a closure is an anonymous struct that implements one of the closure traits. They have different types, even if their signatures are the same.

### Debugging Type Inference Issues

When you encounter type inference issues with closures, try these approaches:

1. **Add explicit type annotations** to resolve ambiguities
2. **Use turbofish syntax** when calling methods: `method::<Type>(...)`
3. **Create intermediate variables** with explicit types
4. **Use the compiler errors** to guide your annotations

```rust
fn main() {
    // Ambiguous without type annotation
    // let parse = |s| s.parse();

    // Solutions:

    // 1. Explicit type annotation
    let parse_i32 = |s: &str| s.parse::<i32>();

    // 2. Turbofish syntax
    let result = "42".parse::<i32>().unwrap();

    // 3. Intermediate variable with explicit type
    let parse_result: Result<i32, _> = "42".parse();
    let number = parse_result.unwrap();

    println!("Number: {}", number);
}
```

## Closure Debugging Techniques

Debugging closures can be challenging due to their anonymous nature. Let's explore techniques to make debugging closures easier.

### Printing Closure Contents

Since closures are anonymous types, you can't directly print them. However, you can print their captured values:

```rust
fn main() {
    let x = 10;
    let y = 20;

    let closure = move || {
        // Print captured values
        println!("Captured values: x = {}, y = {}", x, y);
        x + y
    };

    let result = closure();
    println!("Result: {}", result); // 30
}
```

### Tracing Closure Execution

Adding debug prints inside closures helps trace their execution:

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    let sum = numbers.iter()
        .map(|&n| {
            println!("Mapping: {} -> {}", n, n * 2);
            n * 2
        })
        .filter(|&n| {
            let keep = n > 5;
            println!("Filtering: {} (keep: {})", n, keep);
            keep
        })
        .fold(0, |acc, n| {
            println!("Folding: {} + {} = {}", acc, n, acc + n);
            acc + n
        });

    println!("Final sum: {}", sum);
}
```

### Using Debug Assertions

Debug assertions help verify assumptions about closure behavior:

```rust
fn main() {
    let threshold = 5;

    let filter = |x: i32| {
        // Assert that our filter logic is correct
        debug_assert!(x > threshold == (x > 5), "Filter logic mismatch for x = {}", x);
        x > threshold
    };

    let numbers = vec![1, 5, 6, 10];
    let filtered: Vec<_> = numbers.into_iter().filter(filter).collect();

    println!("Filtered: {:?}", filtered); // [6, 10]
}
```

### Function Extraction for Debugging

For complex closures, extracting them into named functions can make debugging easier:

```rust
fn is_prime(n: i32) -> bool {
    if n <= 1 {
        return false;
    }

    for i in 2..=(n as f64).sqrt() as i32 {
        if n % i == 0 {
            return false;
        }
    }

    true
}

fn main() {
    // Instead of an inline closure
    // let primes: Vec<_> = (1..100).filter(|&n| {
    //     // Complex logic here
    //     ...
    // }).collect();

    // Use a named function
    let primes: Vec<_> = (1..20).filter(|&n| is_prime(n)).collect();

    println!("Primes: {:?}", primes);
}
```

### Inspecting Closure Types

While you can't easily print a closure's type, you can use compiler errors to inspect it:

```rust
fn main() {
    let x = 10;
    let add_x = |y| x + y;

    // This will cause a compiler error that reveals the closure type
    // let _: () = add_x;

    // Instead, create a function that expects a specific closure type
    fn takes_specific_closure<F: Fn(i32) -> i32>(_: F) {}

    // Now pass your closure to check if it matches
    takes_specific_closure(add_x);

    println!("Closure works: {}", add_x(5));
}
```

The compiler errors or successful compilation will tell you if your understanding of the closure type is correct.

### Debugging Lifetime Issues

Closures that capture references often encounter lifetime issues. Here's how to debug them:

```rust
fn main() {
    // Scenario: Closure capturing a reference with too short a lifetime
    let result = {
        let value = String::from("temporary");

        // This would fail because value doesn't live long enough
        // let closure = || &value;

        // Solutions:
        // 1. Move the value into the closure
        let closure = move || value.clone();

        // 2. Return the computed result, not the closure
        closure()
    };

    println!("Result: {}", result);
}
```

Understanding lifetime issues with closures is crucial for correct code.

### Memory Layout Debugging

Sometimes you need to understand the memory layout of closures:

```rust
use std::mem::{size_of_val, align_of_val};

fn main() {
    // Various closures with different capture patterns
    let no_capture = || 42;

    let x = 10;
    let capture_ref = || x + 1;

    let s = String::from("hello");
    let capture_string_ref = || s.len();

    let move_closure = move || s.len();

    // Inspect memory characteristics
    println!("No capture - size: {}, align: {}",
             size_of_val(&no_capture), align_of_val(&no_capture));

    println!("Ref capture - size: {}, align: {}",
             size_of_val(&capture_ref), align_of_val(&capture_ref));

    println!("String ref - size: {}, align: {}",
             size_of_val(&capture_string_ref), align_of_val(&capture_string_ref));

    println!("Move closure - size: {}, align: {}",
             size_of_val(&move_closure), align_of_val(&move_closure));
}
```

This helps you understand the memory implications of different capture patterns.

## Ergonomic Closure Patterns

Rust's closures enable elegant and expressive programming patterns that make code more readable and maintainable. Let's explore some ergonomic patterns that leverage closures effectively.

### The Builder Pattern with Closures

Closures can enhance the builder pattern by allowing customization functions:

```rust
struct RequestBuilder {
    url: String,
    method: String,
    headers: Vec<(String, String)>,
    body: Option<String>,
}

impl RequestBuilder {
    fn new(url: &str) -> Self {
        RequestBuilder {
            url: url.to_string(),
            method: "GET".to_string(),
            headers: Vec::new(),
            body: None,
        }
    }

    fn method(mut self, method: &str) -> Self {
        self.method = method.to_string();
        self
    }

    fn header(mut self, key: &str, value: &str) -> Self {
        self.headers.push((key.to_string(), value.to_string()));
        self
    }

    fn body(mut self, body: &str) -> Self {
        self.body = Some(body.to_string());
        self
    }

    // Apply a custom transformation using a closure
    fn with<F>(mut self, f: F) -> Self
    where
        F: FnOnce(&mut Self),
    {
        f(&mut self);
        self
    }

    fn build(self) -> Request {
        Request {
            url: self.url,
            method: self.method,
            headers: self.headers,
            body: self.body,
        }
    }
}

struct Request {
    url: String,
    method: String,
    headers: Vec<(String, String)>,
    body: Option<String>,
}

fn main() {
    // Regular builder pattern
    let simple_request = RequestBuilder::new("https://api.example.com")
        .method("POST")
        .header("Content-Type", "application/json")
        .body(r#"{"key": "value"}"#)
        .build();

    // Using closure for complex customization
    let complex_request = RequestBuilder::new("https://api.example.com")
        .with(|req| {
            // Complex conditional logic
            if true {
                req.method = "PUT".to_string();
                req.headers.push(("Authorization".to_string(), "Bearer token".to_string()));
            }

            // Add multiple headers
            for i in 1..5 {
                req.headers.push((format!("X-Custom-{}", i), format!("Value-{}", i)));
            }
        })
        .build();

    println!("Simple request to: {}", simple_request.url);
    println!("Complex request has {} headers", complex_request.headers.len());
}
```

The `with` method takes a closure that allows arbitrary modifications to the builder, enabling complex customization logic.

### RAII Guards with Closures

Closures can implement the RAII (Resource Acquisition Is Initialization) pattern for automatic resource cleanup:

```rust
struct CleanupGuard<F: FnMut()> {
    cleanup_fn: F,
}

impl<F: FnMut()> CleanupGuard<F> {
    fn new(cleanup_fn: F) -> Self {
        CleanupGuard { cleanup_fn }
    }
}

impl<F: FnMut()> Drop for CleanupGuard<F> {
    fn drop(&mut self) {
        (self.cleanup_fn)();
    }
}

fn with_resource<F, G, R>(setup: F, operation: G) -> R
where
    F: FnOnce() -> R,
    G: FnOnce() -> (),
{
    let result = setup();
    let _guard = CleanupGuard::new(operation);
    result
}

fn main() {
    // Example: Temporary file that's automatically deleted
    let content = with_resource(
        || {
            println!("Creating temporary file...");
            "file content".to_string()
        },
        || {
            println!("Deleting temporary file...");
        },
    );

    println!("Working with content: {}", content);
    // Cleanup happens automatically when _guard goes out of scope
}
```

### Fluent Interfaces with Method Chaining

Closures enable expressive method chaining for data processing:

```rust
struct DataProcessor<T> {
    data: Vec<T>,
}

impl<T: Clone> DataProcessor<T> {
    fn new(data: Vec<T>) -> Self {
        DataProcessor { data }
    }

    fn filter<F>(mut self, predicate: F) -> Self
    where
        F: Fn(&T) -> bool,
    {
        self.data = self.data.into_iter().filter(|item| predicate(item)).collect();
        self
    }

    fn map<F, U>(self, f: F) -> DataProcessor<U>
    where
        F: Fn(T) -> U,
    {
        let new_data = self.data.into_iter().map(f).collect();
        DataProcessor { data: new_data }
    }

    fn for_each<F>(self, mut f: F) -> Self
    where
        F: FnMut(&T),
    {
        for item in &self.data {
            f(item);
        }
        self
    }

    fn result(self) -> Vec<T> {
        self.data
    }
}

fn main() {
    let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // Build and execute a data pipeline
    let result = DataProcessor::new(numbers)
        .filter(|&n| n % 2 == 0)     // Keep even numbers
        .map(|n| n * n)              // Square them
        .for_each(|&n| println!("Processing: {}", n))
        .result();

    println!("Final result: {:?}", result);
}
```

### Option and Result Combinators

Closures work elegantly with Rust's `Option` and `Result` combinators for expressive error handling:

```rust
fn main() {
    let numbers = vec!["42", "foo", "64", "bar", "256"];

    // Using map and filter_map with Option
    let sum: i32 = numbers.iter()
        .filter_map(|&s| {
            // Try to parse, returning None for errors
            s.parse::<i32>().ok()
        })
        .sum();

    println!("Sum: {}", sum); // 362

    // Using and_then, map_err with Result
    let parsed: Result<Vec<i32>, _> = numbers.iter()
        .map(|&s| {
            s.parse::<i32>()
                .map_err(|e| format!("Failed to parse '{}': {}", s, e))
        })
        .collect();

    match parsed {
        Ok(values) => println!("All values: {:?}", values),
        Err(e) => println!("Error: {}", e),
    }
}
```

### Lazy Evaluation with Closures

Closures enable lazy evaluation patterns for computing values only when needed:

```rust
struct Lazy<T, F: FnOnce() -> T> {
    calculation: Option<F>,
    value: Option<T>,
}

impl<T, F: FnOnce() -> T> Lazy<T, F> {
    fn new(calculation: F) -> Self {
        Lazy {
            calculation: Some(calculation),
            value: None,
        }
    }

    fn value(&mut self) -> &T {
        if self.value.is_none() {
            let calculation = self.calculation.take().unwrap();
            self.value = Some(calculation());
        }

        self.value.as_ref().unwrap()
    }
}

fn main() {
    let mut expensive_data = Lazy::new(|| {
        println!("Computing expensive value...");
        // Simulate expensive computation
        std::thread::sleep(std::time::Duration::from_secs(1));
        vec![1, 2, 3, 4, 5]
    });

    println!("Lazy value created, but not computed yet");

    // Value is computed only when needed
    println!("First access: {:?}", expensive_data.value());

    // Second access reuses the computed value
    println!("Second access: {:?}", expensive_data.value());
}
```

### Context Managers with Closures

Closures can implement a Python-like context manager pattern:

```rust
fn with_context<T, F>(context_fn: F) -> T
where
    F: FnOnce() -> T,
{
    println!("Setting up context");

    let result = context_fn();

    println!("Tearing down context");

    result
}

fn main() {
    let result = with_context(|| {
        println!("Working inside context");
        // Do work with the context
        42
    });

    println!("Result: {}", result);
}
```

### Currying and Partial Application

Closures make it easy to implement currying and partial application:

```rust
fn curry<A, B, C, F>(f: F) -> impl Fn(A) -> impl Fn(B) -> C
where
    F: Fn(A, B) -> C + Copy,
{
    move |a| move |b| f(a, b)
}

fn partial<A, B, C, F>(f: F, a: A) -> impl Fn(B) -> C
where
    F: Fn(A, B) -> C,
    A: Copy,
{
    move |b| f(a, b)
}

fn main() {
    let add = |a, b| a + b;

    // Currying
    let curried_add = curry(add);
    let add_5 = curried_add(5);

    println!("5 + 3 = {}", add_5(3)); // 8

    // Partial application
    let add_10 = partial(add, 10);

    println!("10 + 7 = {}", add_10(7)); // 17
}
```

## Building Composable Function Pipelines

One of the most powerful applications of closures is building composable function pipelines. This functional approach enables you to create reusable, modular components that can be combined in various ways.

### Function Composition

Function composition combines two or more functions to create a new function:

```rust
fn compose<F, G, T, U, V>(f: F, g: G) -> impl Fn(T) -> V
where
    F: Fn(U) -> V + 'static,
    G: Fn(T) -> U + 'static,
{
    move |x| f(g(x))
}

// Compose multiple functions
fn pipe<T>(initial: T) -> Pipe<T> {
    Pipe { value: initial }
}

struct Pipe<T> {
    value: T,
}

impl<T> Pipe<T> {
    fn then<F, U>(self, f: F) -> Pipe<U>
    where
        F: FnOnce(T) -> U,
    {
        Pipe { value: f(self.value) }
    }

    fn end(self) -> T {
        self.value
    }
}

fn main() {
    let add_one = |x: i32| x + 1;
    let multiply_by_two = |x: i32| x * 2;

    // Basic composition
    let add_then_multiply = compose(multiply_by_two, add_one);
    let multiply_then_add = compose(add_one, multiply_by_two);

    println!("add_then_multiply(5) = {}", add_then_multiply(5)); // (5+1)*2 = 12
    println!("multiply_then_add(5) = {}", multiply_then_add(5)); // 5*2+1 = 11

    // Pipeline composition
    let result = pipe(5)
        .then(|x| x + 1)         // 6
        .then(|x| x * 2)         // 12
        .then(|x| x.to_string()) // "12"
        .then(|x| x + "!")       // "12!"
        .end();

    println!("Pipeline result: {}", result);
}
```

### Data Processing Pipelines

Closures are excellent for creating data processing pipelines:

```rust
struct DataPipeline<T> {
    data: Vec<T>,
}

impl<T: Clone> DataPipeline<T> {
    fn new(data: Vec<T>) -> Self {
        DataPipeline { data }
    }

    fn transform<F, U>(self, transform_fn: F) -> DataPipeline<U>
    where
        F: Fn(Vec<T>) -> Vec<U>,
    {
        let new_data = transform_fn(self.data);
        DataPipeline { data: new_data }
    }

    fn result(self) -> Vec<T> {
        self.data
    }
}

// Pipeline components as reusable functions
fn filter_evens(numbers: Vec<i32>) -> Vec<i32> {
    numbers.into_iter().filter(|&n| n % 2 == 0).collect()
}

fn square_all(numbers: Vec<i32>) -> Vec<i32> {
    numbers.into_iter().map(|n| n * n).collect()
}

fn to_strings(numbers: Vec<i32>) -> Vec<String> {
    numbers.into_iter().map(|n| n.to_string()).collect()
}

fn main() {
    let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // Build and execute a data pipeline
    let result = DataPipeline::new(numbers)
        .transform(filter_evens)
        .transform(square_all)
        .transform(to_strings)
        .result();

    println!("Result: {:?}", result); // ["4", "16", "36", "64", "100"]
}
```

### Middleware Pattern with Closures

Closures can implement a middleware pattern similar to that used in web frameworks:

```rust
type Request = String;
type Response = String;
type Middleware = Box<dyn Fn(Request, Next) -> Response>;
type Next = Box<dyn Fn(Request) -> Response>;

fn create_middleware_chain(middlewares: Vec<Middleware>, final_handler: Box<dyn Fn(Request) -> Response>) -> impl Fn(Request) -> Response {
    move |initial_request: Request| {
        let mut chain = final_handler;

        // Build the chain from the end to the beginning
        for middleware in middlewares.iter().rev() {
            let next = chain.clone();
            chain = Box::new(move |req| middleware(req, next.clone()));
        }

        chain(initial_request)
    }
}

fn main() {
    // Define middlewares
    let logger: Middleware = Box::new(|req, next| {
        println!("Request: {}", req);
        let res = next(req);
        println!("Response: {}", res);
        res
    });

    let authenticator: Middleware = Box::new(|req, next| {
        println!("Authenticating request");
        // Could check auth headers here
        next(req)
    });

    let transformer: Middleware = Box::new(|req, next| {
        let modified_req = req + " (modified)";
        next(modified_req)
    });

    // Final handler
    let handler = Box::new(|req: Request| {
        format!("Handled: {}", req)
    });

    // Create middleware chain
    let app = create_middleware_chain(
        vec![logger, authenticator, transformer],
        handler
    );

    // Process a request
    let response = app("Hello".to_string());

    println!("Final response: {}", response);
}
```

### Composable Error Handling

Closures enable composable error handling with the `Result` type:

```rust
type Result<T> = std::result::Result<T, String>;

// Create a pipeline of fallible operations
fn pipe_results<T>(initial: T) -> ResultPipe<T> {
    ResultPipe { value: Ok(initial) }
}

struct ResultPipe<T> {
    value: Result<T>,
}

impl<T> ResultPipe<T> {
    fn then<F, U>(self, f: F) -> ResultPipe<U>
    where
        F: FnOnce(T) -> Result<U>,
    {
        let new_value = self.value.and_then(f);
        ResultPipe { value: new_value }
    }

    fn map<F, U>(self, f: F) -> ResultPipe<U>
    where
        F: FnOnce(T) -> U,
    {
        let new_value = self.value.map(f);
        ResultPipe { value: new_value }
    }

    fn or_else<F>(self, f: F) -> ResultPipe<T>
    where
        F: FnOnce(String) -> Result<T>,
    {
        let new_value = self.value.or_else(f);
        ResultPipe { value: new_value }
    }

    fn end(self) -> Result<T> {
        self.value
    }
}

fn main() {
    // Define some fallible operations
    let parse_number = |s: &str| -> Result<i32> {
        s.parse::<i32>().map_err(|e| e.to_string())
    };

    let double = |n: i32| -> Result<i32> {
        Ok(n * 2)
    };

    let might_fail = |n: i32| -> Result<i32> {
        if n > 100 {
            Err(format!("Number too large: {}", n))
        } else {
            Ok(n)
        }
    };

    // Compose them into a pipeline
    let result = pipe_results("42")
        .then(parse_number)   // Ok(42)
        .then(double)         // Ok(84)
        .then(might_fail)     // Ok(84)
        .map(|n| n.to_string()) // Ok("84")
        .end();

    match result {
        Ok(value) => println!("Success: {}", value),
        Err(e) => println!("Error: {}", e),
    }

    // A pipeline that fails
    let failed = pipe_results("999")
        .then(parse_number)   // Ok(999)
        .then(double)         // Ok(1998)
        .then(might_fail)     // Err("Number too large: 1998")
        .or_else(|e| {
            println!("Handling error: {}", e);
            Ok(100) // Provide a fallback value
        })
        .end();

    match failed {
        Ok(value) => println!("Success with fallback: {}", value),
        Err(e) => println!("Error: {}", e),
    }
}
```

## Common Closure Use Cases

Let's explore some common practical use cases for closures in Rust code.

### Customization Points

Closures serve as excellent customization points in library APIs:

```rust
struct SortOptions<F>
where
    F: Fn(&str, &str) -> std::cmp::Ordering,
{
    case_sensitive: bool,
    compare_fn: F,
}

fn sort_strings<F>(mut strings: Vec<String>, options: SortOptions<F>) -> Vec<String>
where
    F: Fn(&str, &str) -> std::cmp::Ordering,
{
    strings.sort_by(|a, b| {
        let a_str = if options.case_sensitive { a.as_str() } else { a.to_lowercase().as_str() };
        let b_str = if options.case_sensitive { b.as_str() } else { b.to_lowercase().as_str() };

        (options.compare_fn)(a_str, b_str)
    });

    strings
}

fn main() {
    let words = vec![
        "apple".to_string(),
        "Banana".to_string(),
        "cherry".to_string(),
        "Date".to_string(),
    ];

    // Default lexicographical ordering
    let default_options = SortOptions {
        case_sensitive: false,
        compare_fn: |a, b| a.cmp(b),
    };

    // Custom ordering by length then alphabetically
    let length_options = SortOptions {
        case_sensitive: true,
        compare_fn: |a, b| match a.len().cmp(&b.len()) {
            std::cmp::Ordering::Equal => a.cmp(b),
            other => other,
        },
    };

    let sorted1 = sort_strings(words.clone(), default_options);
    let sorted2 = sort_strings(words.clone(), length_options);

    println!("Default sort: {:?}", sorted1);
    println!("Length sort: {:?}", sorted2);
}
```

### Event Handling and Callbacks

Closures are perfect for event handling and callback systems:

```rust
struct EventEmitter {
    listeners: std::collections::HashMap<String, Vec<Box<dyn FnMut(&str)>>>,
}

impl EventEmitter {
    fn new() -> Self {
        EventEmitter {
            listeners: std::collections::HashMap::new(),
        }
    }

    fn on<F>(&mut self, event: &str, callback: F)
    where
        F: FnMut(&str) + 'static,
    {
        let listeners = self.listeners
            .entry(event.to_string())
            .or_insert_with(Vec::new);

        listeners.push(Box::new(callback));
    }

    fn emit(&mut self, event: &str, data: &str) {
        if let Some(listeners) = self.listeners.get_mut(event) {
            for listener in listeners.iter_mut() {
                listener(data);
            }
        }
    }
}

fn main() {
    let mut emitter = EventEmitter::new();

    // Add event listeners
    emitter.on("message", |data| {
        println!("Received message: {}", data);
    });

    let mut counter = 0;
    emitter.on("message", move |_| {
        counter += 1;
        println!("Message count: {}", counter);
    });

    emitter.on("error", |err| {
        eprintln!("Error occurred: {}", err);
    });

    // Emit events
    emitter.emit("message", "Hello, world!");
    emitter.emit("message", "Another message");
    emitter.emit("error", "Something went wrong");
}
```

### Memoization and Caching

Closures can implement memoization for expensive function calls:

```rust
use std::collections::HashMap;

fn memoize<A, R, F>(mut f: F) -> impl FnMut(A) -> R
where
    F: FnMut(A) -> R,
    A: Eq + std::hash::Hash + Clone,
    R: Clone,
{
    let mut cache = HashMap::new();

    move |arg: A| {
        if let Some(result) = cache.get(&arg) {
            result.clone()
        } else {
            let result = f(arg.clone());
            cache.insert(arg, result.clone());
            result
        }
    }
}

fn main() {
    // An expensive calculation
    let mut fibonacci = memoize(|n: u64| {
        println!("Computing fibonacci({})...", n);
        match n {
            0 => 0,
            1 => 1,
            n => {
                let mut a = 0;
                let mut b = 1;
                for _ in 2..=n {
                    let temp = a + b;
                    a = b;
                    b = temp;
                }
                b
            }
        }
    });

    println!("fibonacci(10) = {}", fibonacci(10)); // Computes
    println!("fibonacci(10) = {}", fibonacci(10)); // Uses cache
    println!("fibonacci(20) = {}", fibonacci(20)); // Computes
    println!("fibonacci(10) = {}", fibonacci(10)); // Uses cache
    println!("fibonacci(20) = {}", fibonacci(20)); // Uses cache
}
```

### Dependency Injection

Closures can implement a form of dependency injection:

```rust
struct Service<L> {
    logger: L,
}

impl<L> Service<L>
where
    L: Fn(&str),
{
    fn new(logger: L) -> Self {
        Service { logger }
    }

    fn perform_action(&self, action: &str) {
        (self.logger)(&format!("Performing action: {}", action));
        // Do something
        (self.logger)(&format!("Action completed: {}", action));
    }
}

fn main() {
    // Console logger implementation
    let console_logger = |message: &str| {
        println!("[CONSOLE] {}", message);
    };

    // File logger implementation (simulated)
    let file_logger = |message: &str| {
        println!("[FILE] {}", message);
    };

    // Create services with different loggers
    let service1 = Service::new(console_logger);
    let service2 = Service::new(file_logger);

    service1.perform_action("Save data");
    service2.perform_action("Load data");
}
```

### Command Pattern

Closures can implement the Command pattern:

```rust
struct Command<F> {
    execute: F,
    name: String,
}

impl<F> Command<F>
where
    F: FnMut(),
{
    fn new(name: &str, execute: F) -> Self {
        Command {
            execute,
            name: name.to_string(),
        }
    }

    fn execute(&mut self) {
        println!("Executing command: {}", self.name);
        (self.execute)();
    }
}

struct CommandRegistry {
    commands: std::collections::HashMap<String, Box<dyn FnMut()>>,
}

impl CommandRegistry {
    fn new() -> Self {
        CommandRegistry {
            commands: std::collections::HashMap::new(),
        }
    }

    fn register<F>(&mut self, name: &str, command: F)
    where
        F: FnMut() + 'static,
    {
        self.commands.insert(name.to_string(), Box::new(command));
    }

    fn execute(&mut self, name: &str) -> bool {
        if let Some(command) = self.commands.get_mut(name) {
            command();
            true
        } else {
            false
        }
    }
}

fn main() {
    let mut registry = CommandRegistry::new();

    // Register commands
    registry.register("save", || {
        println!("Saving data...");
    });

    let mut counter = 0;
    registry.register("increment", move || {
        counter += 1;
        println!("Counter: {}", counter);
    });

    // Execute commands
    registry.execute("save");
    registry.execute("increment");
    registry.execute("increment");

    // Unknown command
    if !registry.execute("unknown") {
        println!("Unknown command: unknown");
    }
}
```

### Lazy Initialization

Closures can implement lazy initialization patterns:

```rust
struct LazyInit<T, F: FnOnce() -> T> {
    init_fn: Option<F>,
    value: Option<T>,
}

impl<T, F: FnOnce() -> T> LazyInit<T, F> {
    fn new(init_fn: F) -> Self {
        LazyInit {
            init_fn: Some(init_fn),
            value: None,
        }
    }

    fn get(&mut self) -> &T {
        if self.value.is_none() {
            let init_fn = self.init_fn.take().unwrap();
            self.value = Some(init_fn());
        }

        self.value.as_ref().unwrap()
    }
}

fn main() {
    let mut config = LazyInit::new(|| {
        println!("Loading configuration...");
        // Simulate loading from a file
        std::thread::sleep(std::time::Duration::from_millis(500));
        vec!["setting1=value1", "setting2=value2"]
    });

    println!("Application started");

    // Configuration is loaded only when needed
    println!("First access, will initialize: {:?}", config.get());
    println!("Second access, already initialized: {:?}", config.get());
}
```

## Project: Event System with Closure Callbacks

Let's apply what we've learned to build a practical event system that uses closures for callbacks. Our system will include:

1. An event emitter that can register and trigger events
2. Support for different event types
3. The ability to pass data with events
4. Prioritization of event handlers
5. Cancellable events

### Step 1: Designing the Core Types

First, let's define our core types:

```rust
use std::any::{Any, TypeId};
use std::collections::{HashMap, BTreeMap};
use std::fmt::Debug;

// Event trait to mark types that can be used as events
pub trait Event: Any + Debug {
    fn name(&self) -> &'static str;
    fn cancellable(&self) -> bool {
        false // Most events aren't cancellable by default
    }
}

// Trait object to store any event implementation
type BoxedEvent = Box<dyn Event>;

// Event handler trait
pub trait EventHandler<E: Event>: Send + Sync {
    fn handle(&mut self, event: &E) -> EventResult;
}

// Result of event handling
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum EventResult {
    Continue,
    Cancel,
}

// Wrapper for type-erased event handlers
struct BoxedEventHandler {
    type_id: TypeId,
    priority: i32,
    handler: Box<dyn Any + Send + Sync>,
}

// Implement EventHandler for closures
impl<E: Event, F> EventHandler<E> for F
where
    F: FnMut(&E) -> EventResult + Send + Sync,
{
    fn handle(&mut self, event: &E) -> EventResult {
        self(event)
    }
}
```

### Step 2: Implementing the Event Dispatcher

Now, let's implement our event dispatcher:

```rust
// Main event dispatcher
pub struct EventDispatcher {
    handlers: HashMap<&'static str, Vec<BoxedEventHandler>>,
}

impl EventDispatcher {
    pub fn new() -> Self {
        EventDispatcher {
            handlers: HashMap::new(),
        }
    }

    // Register a handler for a specific event type
    pub fn register<E, H>(&mut self, handler: H, priority: i32)
    where
        E: Event,
        H: EventHandler<E> + 'static,
    {
        let type_id = TypeId::of::<E>();
        let event_name = E::name(&None);

        let boxed_handler = BoxedEventHandler {
            type_id,
            priority,
            handler: Box::new(handler),
        };

        let handlers = self.handlers
            .entry(event_name)
            .or_insert_with(Vec::new);

        handlers.push(boxed_handler);

        // Sort handlers by priority (higher first)
        handlers.sort_by(|a, b| b.priority.cmp(&a.priority));
    }

    // Register a closure as an event handler
    pub fn on<E, F>(&mut self, callback: F, priority: i32)
    where
        E: Event,
        F: FnMut(&E) -> EventResult + Send + Sync + 'static,
    {
        self.register::<E, F>(callback, priority);
    }

    // Dispatch an event to registered handlers
    pub fn dispatch<E: Event>(&mut self, event: E) -> bool {
        let event_name = event.name();
        let type_id = TypeId::of::<E>();
        let boxed_event = Box::new(event);

        self.dispatch_boxed(boxed_event, event_name, type_id)
    }

    // Internal method to dispatch a boxed event
    fn dispatch_boxed(&mut self, event: BoxedEvent, event_name: &'static str, type_id: TypeId) -> bool {
        // If no handlers are registered for this event, return early
        if !self.handlers.contains_key(event_name) {
            return true;
        }

        let handlers = self.handlers.get_mut(event_name).unwrap();
        let event_ref = event.as_ref();
        let is_cancellable = event_ref.cancellable();

        let mut cancelled = false;

        // Call each handler
        for handler in handlers {
            if handler.type_id != type_id {
                continue; // Skip handlers for different event types
            }

            // Cast the handler to the correct type and call it
            if let Some(handler) = handler.handler.downcast_mut::<Box<dyn EventHandler<dyn Event>>>() {
                let result = handler.handle(event_ref);

                if result == EventResult::Cancel && is_cancellable {
                    cancelled = true;
                    break;
                }
            }
        }

        !cancelled
    }
}
```

### Step 3: Creating Event Types

Let's define some example event types:

```rust
// Some example event types
#[derive(Debug)]
pub struct ClickEvent {
    pub x: i32,
    pub y: i32,
    pub button: MouseButton,
}

#[derive(Debug, Clone, Copy)]
pub enum MouseButton {
    Left,
    Right,
    Middle,
}

impl Event for ClickEvent {
    fn name(&self) -> &'static str {
        "click"
    }

    fn cancellable(&self) -> bool {
        true
    }
}

#[derive(Debug)]
pub struct KeyPressEvent {
    pub key: String,
    pub ctrl: bool,
    pub shift: bool,
    pub alt: bool,
}

impl Event for KeyPressEvent {
    fn name(&self) -> &'static str {
        "keypress"
    }
}

#[derive(Debug)]
pub struct WindowResizeEvent {
    pub width: u32,
    pub height: u32,
}

impl Event for WindowResizeEvent {
    fn name(&self) -> &'static str {
        "resize"
    }
}
```

### Step 4: Using the Event System

Now let's see how we can use our event system:

```rust
fn main() {
    let mut dispatcher = EventDispatcher::new();

    // Register event handlers with closures

    // Click handler with high priority
    dispatcher.on::<ClickEvent, _>(|event| {
        println!("High priority click at ({}, {}) with {:?}",
                 event.x, event.y, event.button);
        EventResult::Continue
    }, 100);

    // Click handler with normal priority
    dispatcher.on::<ClickEvent, _>(|event| {
        println!("Normal priority click at ({}, {})", event.x, event.y);

        // Cancel the event if right button is clicked
        if event.button == MouseButton::Right {
            println!("Cancelling right-click event");
            return EventResult::Cancel;
        }

        EventResult::Continue
    }, 0);

    // Key press handler
    let mut command_history = Vec::new();
    dispatcher.on::<KeyPressEvent, _>(move |event| {
        println!("Key pressed: {}", event.key);

        if event.ctrl && event.key == "s" {
            println!("Save command detected");
            command_history.push("save");
        }

        EventResult::Continue
    }, 0);

    // Window resize handler
    let mut resize_count = 0;
    dispatcher.on::<WindowResizeEvent, _>(move |event| {
        resize_count += 1;
        println!("Window resized to {}x{} (resize count: {})",
                 event.width, event.height, resize_count);
        EventResult::Continue
    }, 0);

    // Dispatch some events
    println!("\nDispatching left-click event:");
    let handled = dispatcher.dispatch(ClickEvent {
        x: 100,
        y: 200,
        button: MouseButton::Left,
    });
    println!("Event was handled: {}\n", handled);

    println!("Dispatching right-click event:");
    let handled = dispatcher.dispatch(ClickEvent {
        x: 300,
        y: 400,
        button: MouseButton::Right,
    });
    println!("Event was handled: {}\n", handled);

    println!("Dispatching key press events:");
    dispatcher.dispatch(KeyPressEvent {
        key: "a".into(),
        ctrl: false,
        shift: false,
        alt: false,
    });

    dispatcher.dispatch(KeyPressEvent {
        key: "s".into(),
        ctrl: true,
        shift: false,
        alt: false,
    });

    println!("\nDispatching resize event:");
    dispatcher.dispatch(WindowResizeEvent {
        width: 800,
        height: 600,
    });
}
```

### Step 5: Enhancing the Event System

Let's add some additional features to our event system:

```rust
// Add to EventDispatcher implementation

impl EventDispatcher {
    // Remove a specific handler by a token returned when registering
    pub fn remove_handler(&mut self, token: HandlerToken) -> bool {
        if let Some(handlers) = self.handlers.get_mut(token.event_name) {
            if token.index < handlers.len() {
                handlers.remove(token.index);
                return true;
            }
        }
        false
    }

    // Remove all handlers for a specific event type
    pub fn remove_all_handlers<E: Event>(&mut self) {
        let event_name = E::name(&None);
        self.handlers.remove(event_name);
    }

    // One-time event handler that removes itself after being called
    pub fn once<E, F>(&mut self, mut callback: F, priority: i32)
    where
        E: Event,
        F: FnMut(&E) -> EventResult + Send + Sync + 'static,
    {
        let mut called = false;
        self.on::<E, _>(move |event| {
            if called {
                return EventResult::Continue;
            }

            called = true;
            callback(event)
        }, priority);
    }
}

// Token to identify a registered handler for removal
pub struct HandlerToken {
    event_name: &'static str,
    index: usize,
}
```

### Step 6: Making the System More Flexible

Finally, let's add support for wildcard event handling and asynchronous event dispatching:

```rust
// Add to EventDispatcher implementation

impl EventDispatcher {
    // Register a wildcard handler that receives all events
    pub fn on_any<F>(&mut self, callback: F, priority: i32)
    where
        F: FnMut(&dyn Event) -> EventResult + Send + Sync + 'static,
    {
        // Implementation details would be complex, but the concept
        // is to have a special handler list for handlers that want
        // to receive all events
    }

    // Dispatch an event asynchronously
    pub fn dispatch_async<E: Event + Send + 'static>(&self, event: E) {
        let mut dispatcher = self.clone();
        std::thread::spawn(move || {
            dispatcher.dispatch(event);
        });
    }
}
```

This event system demonstrates how closures can be used to create a flexible, type-safe callback system. In a real application, you might extend this with:

1. Better error handling
2. More advanced event filtering
3. Event bubbling (like DOM events)
4. Improved thread safety
5. Integration with async/await

The key insight is how closures make it natural to register callbacks without having to define numerous tiny classes or function objects. The state captured by closures allows for concise and expressive event handlers.

## Summary

In this chapter, we've explored Rust's closures in depth. We've learned:

1. **Closure Fundamentals**: What closures are and how they capture their environment
2. **Closure Traits**: The `FnOnce`, `FnMut`, and `Fn` traits and how they determine closure behavior
3. **Move Closures**: When and how to use `move` closures for ownership transfer
4. **Closure Performance**: How closures are optimized and their memory layout
5. **Function Arguments**: Passing closures as arguments to functions for flexible APIs
6. **Returning Closures**: Creating functions that generate other functions
7. **Type Inference**: How Rust infers types for closures and when to provide type annotations
8. **Debugging Techniques**: Approaches for debugging closures effectively
9. **Ergonomic Patterns**: Using closures for builder patterns, RAII guards, and other idioms
10. **Function Pipelines**: Building composable function chains and data processing pipelines
11. **Common Use Cases**: Practical applications of closures in real-world code
12. **Event Systems**: Implementing callback-based architectures with closures

Closures are one of Rust's most powerful features, enabling elegant functional programming patterns while maintaining Rust's safety guarantees. By mastering closures, you can write more concise, expressive, and flexible code.

The combination of first-class functions, environment capture, and Rust's trait system makes closures a uniquely powerful tool. From simple transformations to complex event systems, closures provide a natural way to express computation that depends on both code and data.

## Exercises

1. **Basic Closure Transformations**: Write a function that takes a vector of strings and a closure, applies the closure to each string, and returns a new vector with the results.

2. **Closure Capture Analysis**: Create a program that demonstrates the three types of closure captures (immutable borrow, mutable borrow, and ownership). Print the memory size of each closure using `std::mem::size_of_val`.

3. **Function Composition**: Implement a function composition utility that can compose any number of functions, not just two. For example, `compose_many([f, g, h])` should create a function that applies `h`, then `g`, then `f`.

4. **Memoization**: Create a general-purpose memoization wrapper that works with any function or closure with a single argument.

5. **Builder with Closures**: Extend a builder pattern for a configuration object that allows both method chaining and a closure-based configuration approach.

6. **Event Handler System**: Implement a simplified version of the event system from our project, focusing on type safety for event handlers.

7. **Callback Registry**: Create a registry that can store callbacks with different signatures, using type erasure techniques.

8. **Command Pattern**: Implement the Command pattern using closures, with support for executing commands and undoing them.

9. **Iterator Adaptor**: Create a custom iterator adaptor that uses a closure to transform elements with state (like `enumerate` but customizable).

10. **Result Pipeline**: Build a pipeline for processing a sequence of fallible operations, using closures and the `Result` type.

## Further Reading

- [The Rust Programming Language - Closures](https://doc.rust-lang.org/book/ch13-01-closures.html)
- [Rust By Example - Closures](https://doc.rust-lang.org/rust-by-example/fn/closures.html)
- [Rustonomicon - Closures](https://doc.rust-lang.org/nomicon/closures.html)
- [Rust Reference - Closure Expressions](https://doc.rust-lang.org/reference/expressions/closure-expr.html)
- [Jon Gjengset - Crust of Rust: Closures](https://www.youtube.com/watch?v=dGUP05E0x6U)
- [Functional Programming in Rust](https://www.fpcomplete.com/blog/2018/10/rust-for-functional-programmers/)
- [The `itertools` Crate](https://docs.rs/itertools/) - Advanced iterator combinators built with closures
- [Closures: Magic Functions](https://huonw.github.io/blog/2015/05/finding-closure-in-rust/) by Huon Wilson
