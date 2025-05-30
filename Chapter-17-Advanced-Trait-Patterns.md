# Chapter 17: Advanced Trait Patterns

## Introduction

In the previous chapter, we explored the fundamentals of traits and how they enable polymorphism in Rust. Now, we'll delve deeper into more advanced trait patterns that allow us to build sophisticated abstractions while maintaining Rust's guarantees of safety and performance.

Advanced trait patterns are essential for creating flexible, reusable, and efficient code in Rust. These patterns leverage Rust's type system to solve complex design problems that arise in larger codebases and libraries.

In this chapter, we'll explore:

- Associated types and their role in trait design
- Generic associated types (GATs) and their use cases
- Operator overloading through traits
- Marker traits and auto traits
- Conditional trait implementations
- Supertraits and trait inheritance
- Trait objects with multiple traits
- Implementing the Iterator trait
- Building composable abstractions with traits
- Advanced trait design patterns

By the end of this chapter, you'll have a deeper understanding of Rust's trait system and be able to leverage these advanced patterns to write more expressive, flexible, and maintainable code.

## Associated Types vs. Generic Parameters

We introduced associated types in the previous chapter. Now, let's explore them in more depth and compare them with generic parameters.

### When to Use Associated Types

Associated types provide a way to define abstract type members within traits:

```rust
trait Iterator {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;
}
```

Generic parameters, on the other hand, allow for multiple implementations of a trait for the same type:

```rust
trait Container<T> {
    fn insert(&mut self, item: T);
    fn get(&self, id: usize) -> Option<&T>;
}
```

#### Associated Types

Use associated types when:

- Each implementing type has a single natural implementation of the trait
- You want to enforce that there's only one implementation for a given type
- You want to simplify type annotations

```rust
struct Counter {
    count: usize,
    max: usize,
}

impl Iterator for Counter {
    type Item = usize;

    fn next(&mut self) -> Option<Self::Item> {
        if self.count < self.max {
            let current = self.count;
            self.count += 1;
            Some(current)
        } else {
            None
        }
    }
}
```

#### Generic Parameters

Use generic parameters when:

- A type might implement the trait in multiple ways
- Each implementation depends on different types
- The type parameter appears multiple times in the trait's methods

```rust
struct MultiContainer {
    items_a: Vec<String>,
    items_b: Vec<i32>,
}

impl Container<String> for MultiContainer {
    fn insert(&mut self, item: String) {
        self.items_a.push(item);
    }

    fn get(&self, id: usize) -> Option<&String> {
        self.items_a.get(id)
    }
}

impl Container<i32> for MultiContainer {
    fn insert(&mut self, item: i32) {
        self.items_b.push(item);
    }

    fn get(&self, id: usize) -> Option<&i32> {
        self.items_b.get(id)
    }
}
```

## Generic Associated Types (GATs)

Generic Associated Types (GATs) are a relatively new feature in Rust that allow associated types to have generic parameters of their own. This enables more powerful abstractions, especially for traits that deal with lifetimes or containers.

### Basic GAT Example

```rust
#![feature(generic_associated_types)]

trait Container {
    type Item<'a> where Self: 'a;

    fn get(&self, index: usize) -> Option<Self::Item<'_>>;
}

impl<T> Container for Vec<T> {
    type Item<'a> where Self: 'a = &'a T;

    fn get(&self, index: usize) -> Option<Self::Item<'_>> {
        self.as_slice().get(index)
    }
}
```

In this example, `Item` is an associated type that takes a lifetime parameter. This allows the `Container` trait to abstract over different types of references or owned values.

### Use Cases for GATs

GATs are particularly useful when:

1. You need associated types that can refer to lifetimes
2. You want to create generic iterators or streams
3. You're working with higher-ranked trait bounds

Here's an example of using GATs to create a trait for streaming data:

```rust
#![feature(generic_associated_types)]

trait StreamingIterator {
    type Item<'a> where Self: 'a;

    fn next(&mut self) -> Option<Self::Item<'_>>;
}

struct WindowsIterator<'a, T> {
    slice: &'a [T],
    window_size: usize,
    position: usize,
}

impl<'a, T> StreamingIterator for WindowsIterator<'a, T> {
    type Item<'b> where Self: 'b = &'b [T];

    fn next(&mut self) -> Option<Self::Item<'_>> {
        if self.position + self.window_size <= self.slice.len() {
            let window = &self.slice[self.position..self.position + self.window_size];
            self.position += 1;
            Some(window)
        } else {
            None
        }
    }
}
```

## Operator Overloading

Rust allows you to overload operators by implementing specific traits. This makes your custom types work with standard operators, leading to more intuitive and readable code.

### Common Operator Traits

| Operator | Trait      | Method      |
| -------- | ---------- | ----------- |
| +        | Add        | add         |
| -        | Sub        | sub         |
| \*       | Mul        | mul         |
| /        | Div        | div         |
| %        | Rem        | rem         |
| ==       | PartialEq  | eq          |
| <        | PartialOrd | partial_cmp |
| []       | Index      | index       |
| []       | IndexMut   | index_mut   |
| !        | Not        | not         |

### Implementing Addition for a Complex Number

```rust
use std::ops::Add;

#[derive(Debug, Clone, Copy)]
struct Complex {
    real: f64,
    imag: f64,
}

impl Add for Complex {
    type Output = Complex;

    fn add(self, other: Complex) -> Complex {
        Complex {
            real: self.real + other.real,
            imag: self.imag + other.imag,
        }
    }
}

fn main() {
    let a = Complex { real: 1.0, imag: 2.0 };
    let b = Complex { real: 3.0, imag: 4.0 };
    let c = a + b;
    println!("{:?}", c); // Complex { real: 4.0, imag: 6.0 }
}
```

### Adding Different Types

You can also implement operators for different types using generics:

```rust
use std::ops::Add;

impl Add<f64> for Complex {
    type Output = Complex;

    fn add(self, rhs: f64) -> Complex {
        Complex {
            real: self.real + rhs,
            imag: self.imag,
        }
    }
}

// This enables:
let a = Complex { real: 1.0, imag: 2.0 };
let c = a + 3.0;
```

### Considerations for Operator Overloading

When implementing operators, follow these principles:

1. **Respect mathematical laws**: If you implement `Add`, the operation should be commutative and associative if possible.
2. **Be consistent**: If `a + b` works, `b + a` should also work if mathematically appropriate.
3. **Use appropriate return types**: The `Output` associated type lets you return a different type if needed.
4. **Implement assignment operators**: For convenience, also implement `AddAssign` if you implement `Add`.

## Marker Traits and Auto Traits

Marker traits are traits with no methods or associated types. They are used to mark types as having certain properties that the compiler can enforce.

### Common Marker Traits

The Rust standard library includes several important marker traits:

#### Send and Sync

- `Send`: Types that can be safely transferred between threads
- `Sync`: Types that can be safely shared between threads

```rust
// Safe to send between threads
#[derive(Debug)]
struct ThreadSafeStruct {
    data: i32,
}

// Not safe to send between threads
#[derive(Debug)]
struct NotThreadSafe {
    data: *mut i32,
}

// Explicitly mark as !Send
impl !Send for NotThreadSafe {}
```

#### Sized

The `Sized` trait indicates that a type's size is known at compile time. Most types in Rust are `Sized` by default, but you can work with unsized types using the `?Sized` bound:

```rust
// T must be Sized
fn process<T>(t: T) {
    // ...
}

// T can be unsized
fn process_unsized<T: ?Sized>(t: &T) {
    // ...
}
```

### Auto Traits

Auto traits are traits that are automatically implemented for types that satisfy certain conditions. The most common auto traits are `Send`, `Sync`, and `Unpin`.

A type implements an auto trait if all its components implement that trait. For example, a struct is `Send` if all its fields are `Send`.

```rust
struct AutoSend {
    // i32 is Send, so AutoSend will automatically implement Send
    x: i32,
}

struct NotAutoSend {
    // *const i32 is not Send, so NotAutoSend will not be Send
    ptr: *const i32,
}
```

### Creating Custom Marker Traits

You can create your own marker traits for domain-specific properties:

```rust
trait Serializable {}

trait Validated {}

struct User {
    name: String,
    email: String,
}

impl Serializable for User {}

// Only implement Validated after validating the user data
impl Validated for User {}

// This function only accepts validated users
fn process_user<T: Validated + Serializable>(user: T) {
    // Safe to process the user...
}
```

## Conditional Trait Implementations

Rust allows you to implement traits conditionally based on the properties of the types involved. This is done using trait bounds in the `impl` block.

### Basic Conditional Implementation

```rust
use std::fmt::Display;

struct Wrapper<T>(T);

// Implement Display for Wrapper<T> only if T implements Display
impl<T: Display> Display for Wrapper<T> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Wrapper({})", self.0)
    }
}
```

In this example, `Wrapper<T>` implements `Display` only if `T` itself implements `Display`.

### Blanket Implementations

Blanket implementations allow you to implement a trait for all types that satisfy certain constraints:

```rust
// Implement Serialize for any type that implements Display
impl<T: Display> Serialize for T {
    fn serialize(&self) -> String {
        self.to_string()
    }
}
```

This implements `Serialize` for all types that implement `Display`, without having to write specific implementations for each type.

### Specialization (Unstable)

Rust has an experimental feature called specialization that allows for more flexible conditional implementations:

```rust
#![feature(specialization)]

trait MyTrait {
    fn process(&self) -> String;
}

// Default implementation for all types
impl<T> MyTrait for T {
    default fn process(&self) -> String {
        "generic".to_string()
    }
}

// Specialized implementation for strings
impl MyTrait for String {
    fn process(&self) -> String {
        format!("string: {}", self)
    }
}
```

With specialization, you can provide a default implementation and then override it for specific types.

### Negative Trait Bounds (Unstable)

Negative trait bounds, though not yet stable in Rust, would allow you to implement traits only for types that do _not_ implement another trait:

```rust
// Not yet stable syntax
impl<T: !Display> MyTrait for T {
    fn process(&self) -> String {
        "non-displayable".to_string()
    }
}
```

### Practical Example: JSON Serialization

```rust
trait Serialize {
    fn serialize(&self) -> String;
}

// Implement for numeric types
impl<T: std::fmt::Display + Copy> Serialize for T
where
    T: std::ops::Add<Output = T> + From<u8>,
{
    fn serialize(&self) -> String {
        self.to_string()
    }
}

// Different implementation for string types
impl Serialize for String {
    fn serialize(&self) -> String {
        format!("\"{}\"", self)
    }
}

impl Serialize for &str {
    fn serialize(&self) -> String {
        format!("\"{}\"", self)
    }
}

// Implementation for vectors, conditional on their elements being serializable
impl<T: Serialize> Serialize for Vec<T> {
    fn serialize(&self) -> String {
        let elements: Vec<String> = self.iter()
            .map(|e| e.serialize())
            .collect();
        format!("[{}]", elements.join(", "))
    }
}
```

## Supertraits and Trait Inheritance

Supertraits allow you to specify that a trait depends on another trait. This is the closest concept to inheritance in Rust's trait system.

### Basic Supertrait Example

```rust
// Display is a supertrait of PrettyPrint
trait PrettyPrint: Display {
    fn pretty_print(&self) {
        let output = self.to_string();
        println!("┌{}┐", "─".repeat(output.len() + 2));
        println!("│ {} │", output);
        println!("└{}┘", "─".repeat(output.len() + 2));
    }
}

// Any type implementing PrettyPrint must also implement Display
impl PrettyPrint for String {}

fn main() {
    let s = String::from("Hello");
    s.pretty_print();
}
```

In this example, `PrettyPrint` requires that any implementing type also implements `Display`. This allows the `pretty_print` method to call `to_string()`, which comes from the `Display` trait.

### Multiple Supertraits

A trait can have multiple supertraits:

```rust
trait FullyComparable: PartialEq + Eq + PartialOrd + Ord {
    fn compare_and_display(&self, other: &Self) {
        match self.cmp(other) {
            std::cmp::Ordering::Less => println!("Less than"),
            std::cmp::Ordering::Equal => println!("Equal"),
            std::cmp::Ordering::Greater => println!("Greater than"),
        }
    }
}

impl FullyComparable for i32 {}
```

### Extending Traits with Default Implementations

Supertraits allow you to build hierarchies of traits with increasingly specialized behavior:

```rust
trait Animal {
    fn name(&self) -> &str;
    fn noise(&self) -> &str;

    fn talk(&self) {
        println!("{} says {}", self.name(), self.noise());
    }
}

trait Pet: Animal {
    fn owner(&self) -> &str;

    fn talk(&self) {
        println!("{} belongs to {} and says {}",
            self.name(), self.owner(), self.noise());
    }
}

struct Cat {
    name: String,
    owner: String,
}

impl Animal for Cat {
    fn name(&self) -> &str {
        &self.name
    }

    fn noise(&self) -> &str {
        "meow"
    }
}

impl Pet for Cat {
    fn owner(&self) -> &str {
        &self.owner
    }
}
```

### Implementing Supertraits

When implementing a trait with supertraits, you must ensure all supertrait requirements are met:

```rust
struct Circle {
    radius: f64,
}

// First implement the supertrait
impl std::fmt::Display for Circle {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Circle with radius {}", self.radius)
    }
}

// Then implement the trait that requires the supertrait
impl PrettyPrint for Circle {}
```

## Trait Objects with Multiple Traits

In Rust, you can create trait objects that combine multiple traits using the `+` syntax.

### Basic Syntax

```rust
trait Drawable {
    fn draw(&self);
}

trait Clickable {
    fn click(&self);
}

// A function that accepts objects implementing both traits
fn handle_ui_element(element: &(dyn Drawable + Clickable)) {
    element.draw();
    element.click();
}
```

### Implementing Multiple Traits

```rust
struct Button {
    label: String,
    position: (i32, i32),
    dimensions: (i32, i32),
}

impl Drawable for Button {
    fn draw(&self) {
        println!("Drawing button '{}' at {:?} with size {:?}",
            self.label, self.position, self.dimensions);
    }
}

impl Clickable for Button {
    fn click(&self) {
        println!("Button '{}' clicked!", self.label);
    }
}

fn main() {
    let button = Button {
        label: String::from("OK"),
        position: (100, 100),
        dimensions: (50, 20),
    };

    handle_ui_element(&button);
}
```

### Storing Multiple Trait Objects

```rust
struct UiElement {
    elements: Vec<Box<dyn Drawable + Clickable>>,
}

impl UiElement {
    fn new() -> Self {
        UiElement { elements: Vec::new() }
    }

    fn add_element(&mut self, element: Box<dyn Drawable + Clickable>) {
        self.elements.push(element);
    }

    fn draw_all(&self) {
        for element in &self.elements {
            element.draw();
        }
    }

    fn handle_click(&self, x: i32, y: i32) {
        // In a real implementation, we would check if the click
        // is within each element's bounds
        for element in &self.elements {
            element.click();
        }
    }
}
```

### Object Safety Considerations

For a trait to be used in a trait object, it must be "object safe." When combining multiple traits, all traits must be object safe. A trait is object safe if:

1. It doesn't require `Self: Sized`
2. All methods are object safe:
   - No generic methods
   - No `Self` in the return type
   - No static methods

```rust
// This trait is not object safe because of the Self return type
trait Clone {
    fn clone(&self) -> Self;
}

// This trait is object safe
trait Drawable {
    fn draw(&self);
}

// You can't create this trait object
// let obj: Box<dyn Clone> = Box::new(String::from("hello"));

// But you can create this one
let obj: Box<dyn Drawable> = Box::new(Button { /* ... */ });
```

When using trait objects with multiple traits, all combined traits must be object safe.

## Implementing the Iterator Trait

The `Iterator` trait is one of the most widely used traits in Rust. It provides a unified interface for iterating over collections and enables many functional programming patterns.

### Basic Iterator Implementation

To implement the `Iterator` trait, you need to define an associated type `Item` and implement the `next` method:

```rust
struct Counter {
    count: usize,
    max: usize,
}

impl Iterator for Counter {
    type Item = usize;

    fn next(&mut self) -> Option<Self::Item> {
        if self.count < self.max {
            let current = self.count;
            self.count += 1;
            Some(current)
        } else {
            None
        }
    }
}

fn main() {
    let counter = Counter { count: 0, max: 5 };

    // Use the iterator
    for i in counter {
        println!("{}", i);
    }
}
```

### Iterator Adapters

Once you've implemented the `Iterator` trait, your type automatically gets access to all the iterator adapters provided by the standard library:

```rust
let counter = Counter { count: 0, max: 10 };

// Use adapter methods
let sum: usize = counter
    .filter(|&x| x % 2 == 0)  // Keep only even numbers
    .map(|x| x * x)           // Square each number
    .take(3)                  // Take only the first 3 results
    .sum();                   // Sum them up

println!("Sum: {}", sum);  // Outputs: 20 (0² + 2² + 4²)
```

### Advanced Iterator Implementations

Let's implement a more complex iterator for binary tree traversal:

```rust
enum BinaryTree<T> {
    Empty,
    NonEmpty(Box<TreeNode<T>>),
}

struct TreeNode<T> {
    value: T,
    left: BinaryTree<T>,
    right: BinaryTree<T>,
}

// Iterator for in-order traversal
struct InOrderIterator<'a, T> {
    stack: Vec<&'a TreeNode<T>>,
    current: Option<&'a TreeNode<T>>,
}

impl<T> BinaryTree<T> {
    fn in_order_iter(&self) -> InOrderIterator<T> {
        let mut iter = InOrderIterator {
            stack: Vec::new(),
            current: match self {
                BinaryTree::Empty => None,
                BinaryTree::NonEmpty(node) => Some(node),
            },
        };

        // Initialize the stack with leftmost path
        iter.push_left_edge();
        iter
    }
}

impl<'a, T> InOrderIterator<'a, T> {
    fn push_left_edge(&mut self) {
        while let Some(node) = self.current {
            self.stack.push(node);
            match &node.left {
                BinaryTree::Empty => break,
                BinaryTree::NonEmpty(left) => self.current = Some(left),
            }
        }
        self.current = None;
    }
}

impl<'a, T> Iterator for InOrderIterator<'a, T> {
    type Item = &'a T;

    fn next(&mut self) -> Option<Self::Item> {
        // If the stack is empty, we're done
        let node = self.stack.pop()?;

        // Prepare for the next call by setting up the right subtree
        self.current = match &node.right {
            BinaryTree::Empty => None,
            BinaryTree::NonEmpty(right) => Some(right),
        };
        self.push_left_edge();

        // Return the current node's value
        Some(&node.value)
    }
}
```

### Creating Custom Iterator Adapters

You can also create your own iterator adapters by implementing the `Iterator` trait for wrapper types:

```rust
struct StepBy<I> {
    iter: I,
    step: usize,
    first: bool,
}

impl<I> Iterator for StepBy<I>
where
    I: Iterator,
{
    type Item = I::Item;

    fn next(&mut self) -> Option<Self::Item> {
        // Always return the first element
        if self.first {
            self.first = false;
            return self.iter.next();
        }

        // Skip step-1 elements
        for _ in 1..self.step {
            self.iter.next();
        }

        // Return the next element
        self.iter.next()
    }
}

// Extension trait to add our adapter to all iterators
trait StepByExt: Iterator {
    fn step_by_custom(self, step: usize) -> StepBy<Self>
    where
        Self: Sized,
    {
        assert!(step > 0);
        StepBy {
            iter: self,
            step,
            first: true,
        }
    }
}

// Implement for all iterators
impl<T: Iterator> StepByExt for T {}

fn main() {
    let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // Use our custom adapter
    for i in numbers.iter().step_by_custom(3) {
        println!("{}", i);  // Prints 1, 4, 7, 10
    }
}
```

### IntoIterator Trait

While `Iterator` defines how to iterate, `IntoIterator` defines how to create an iterator from a value:

```rust
impl<T> IntoIterator for Counter {
    type Item = usize;
    type IntoIter = Self;

    fn into_iter(self) -> Self::IntoIter {
        self
    }
}

// Now you can use it directly in a for loop
for i in Counter { count: 0, max: 5 } {
    println!("{}", i);
}
```

## Building Composable Abstractions with Traits

One of the most powerful aspects of Rust's trait system is its ability to build composable abstractions. By designing traits that work together, you can create flexible and reusable components.

### Composition vs. Inheritance

Unlike object-oriented languages that rely on inheritance for code reuse, Rust encourages composition. Instead of creating deep inheritance hierarchies, you can compose behavior using multiple traits:

```rust
trait Drawable {
    fn draw(&self);
}

trait Movable {
    fn move_to(&mut self, x: i32, y: i32);
}

trait Resizable {
    fn resize(&mut self, width: i32, height: i32);
}

// Compose multiple traits for complex behavior
struct Rectangle {
    x: i32,
    y: i32,
    width: i32,
    height: i32,
}

impl Drawable for Rectangle {
    fn draw(&self) {
        println!("Drawing rectangle at ({}, {}) with dimensions {}x{}",
            self.x, self.y, self.width, self.height);
    }
}

impl Movable for Rectangle {
    fn move_to(&mut self, x: i32, y: i32) {
        self.x = x;
        self.y = y;
    }
}

impl Resizable for Rectangle {
    fn resize(&mut self, width: i32, height: i32) {
        self.width = width;
        self.height = height;
    }
}

// Use dynamic dispatch to handle different UI elements
fn process_ui_element(element: &mut (dyn Drawable + Movable + Resizable)) {
    element.draw();
    element.move_to(100, 100);
    element.resize(200, 50);
    element.draw();
}
```

### The Adapter Pattern

The adapter pattern allows you to transform one interface into another. This is particularly useful when you want to reuse code that expects a specific interface:

```rust
trait Read {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize>;
}

trait Write {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize>;
    fn flush(&mut self) -> std::io::Result<()>;
}

// An adapter that turns a reader into a writer
struct ReaderToWriter<R> {
    reader: R,
    buffer: Vec<u8>,
}

impl<R: Read> Write for ReaderToWriter<R> {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        // In a real implementation, we would do something with the data
        // For demonstration, we'll just read from our reader into our buffer
        let mut temp = vec![0; buf.len()];
        let bytes_read = self.reader.read(&mut temp)?;
        self.buffer.extend_from_slice(&temp[..bytes_read]);
        Ok(buf.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}
```

### The Decorator Pattern

The decorator pattern allows you to add behavior to objects dynamically:

```rust
trait Logger {
    fn log(&self, message: &str);
}

struct ConsoleLogger;

impl Logger for ConsoleLogger {
    fn log(&self, message: &str) {
        println!("{}", message);
    }
}

struct TimestampDecorator<L: Logger> {
    logger: L,
}

impl<L: Logger> Logger for TimestampDecorator<L> {
    fn log(&self, message: &str) {
        use std::time::{SystemTime, UNIX_EPOCH};
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        self.logger.log(&format!("[{}] {}", timestamp, message));
    }
}

struct LevelDecorator<L: Logger> {
    logger: L,
    level: String,
}

impl<L: Logger> Logger for LevelDecorator<L> {
    fn log(&self, message: &str) {
        self.logger.log(&format!("[{}] {}", self.level, message));
    }
}

fn main() {
    // Create a base logger
    let logger = ConsoleLogger;

    // Decorate it with a timestamp
    let logger = TimestampDecorator { logger };

    // Further decorate it with a level
    let logger = LevelDecorator {
        logger,
        level: "INFO".to_string()
    };

    // Use the decorated logger
    logger.log("Application started");
    // Output: [1627984567] [INFO] Application started
}
```

### The Strategy Pattern

The strategy pattern lets you define a family of algorithms, encapsulate them, and make them interchangeable:

```rust
trait SortStrategy<T> {
    fn sort(&self, data: &mut [T]);
}

struct QuickSort;
impl<T: Ord> SortStrategy<T> for QuickSort {
    fn sort(&self, data: &mut [T]) {
        data.sort();
    }
}

struct BubbleSort;
impl<T: Ord> SortStrategy<T> for BubbleSort {
    fn sort(&self, data: &mut [T]) {
        // Bubble sort implementation
        let len = data.len();
        for i in 0..len {
            for j in 0..len - 1 - i {
                if data[j] > data[j + 1] {
                    data.swap(j, j + 1);
                }
            }
        }
    }
}

struct Sorter<T, S: SortStrategy<T>> {
    strategy: S,
    _marker: std::marker::PhantomData<T>,
}

impl<T, S: SortStrategy<T>> Sorter<T, S> {
    fn new(strategy: S) -> Self {
        Sorter {
            strategy,
            _marker: std::marker::PhantomData,
        }
    }

    fn sort(&self, data: &mut [T]) {
        self.strategy.sort(data);
    }
}

fn main() {
    let mut data = vec![3, 1, 5, 2, 4];

    // Use quick sort
    let sorter = Sorter::new(QuickSort);
    sorter.sort(&mut data);
    println!("{:?}", data);

    // Use bubble sort
    let mut data = vec![3, 1, 5, 2, 4];
    let sorter = Sorter::new(BubbleSort);
    sorter.sort(&mut data);
    println!("{:?}", data);
}
```

### The Observer Pattern

The observer pattern is a behavioral pattern where objects (observers) are notified of changes in another object (the subject):

```rust
trait Observer {
    fn update(&self, message: &str);
}

struct Subject {
    observers: Vec<Box<dyn Observer>>,
    state: String,
}

impl Subject {
    fn new() -> Self {
        Subject {
            observers: Vec::new(),
            state: String::new(),
        }
    }

    fn attach(&mut self, observer: Box<dyn Observer>) {
        self.observers.push(observer);
    }

    fn set_state(&mut self, state: String) {
        self.state = state;
        self.notify();
    }

    fn notify(&self) {
        for observer in &self.observers {
            observer.update(&self.state);
        }
    }
}

struct ConcreteObserver {
    name: String,
}

impl Observer for ConcreteObserver {
    fn update(&self, message: &str) {
        println!("Observer {} received message: {}", self.name, message);
    }
}

fn main() {
    let mut subject = Subject::new();

    subject.attach(Box::new(ConcreteObserver {
        name: "Observer 1".to_string()
    }));
    subject.attach(Box::new(ConcreteObserver {
        name: "Observer 2".to_string()
    }));

    subject.set_state("New state!".to_string());
}
```

## Advanced Trait Design Patterns

We've seen several design patterns that leverage Rust's trait system. Here are a few more advanced patterns that are particularly well-suited to Rust:

### The Newtype Pattern

The newtype pattern creates a new type that wraps an existing type. This is useful for:

1. Adding type safety
2. Implementing traits for external types (working around the orphan rule)
3. Hiding implementation details

```rust
// A type-safe user ID that can't be confused with other IDs
struct UserId(u64);

// A type-safe product ID
struct ProductId(u64);

// Now you can't accidentally use a ProductId as a UserId
fn get_user(id: UserId) -> Option<User> {
    // Implementation
    None
}

// This won't compile:
// let product_id = ProductId(123);
// let user = get_user(product_id);  // Type error!
```

### Type-Level State Machines

Rust's type system can encode state transitions at compile time:

```rust
// State traits
trait Sealed {}
trait Draft: Sealed {}
trait PendingReview: Sealed {}
trait Published: Sealed {}

// Empty state structs
struct DraftState;
struct PendingReviewState;
struct PublishedState;

// Implement state traits
impl Sealed for DraftState {}
impl Draft for DraftState {}

impl Sealed for PendingReviewState {}
impl PendingReview for PendingReviewState {}

impl Sealed for PublishedState {}
impl Published for PublishedState {}

// Document with type-level state
struct Document<S: Sealed> {
    content: String,
    state: std::marker::PhantomData<S>,
}

// Methods available in all states
impl<S: Sealed> Document<S> {
    fn content(&self) -> &str {
        &self.content
    }
}

// Methods only available in Draft state
impl Document<DraftState> {
    fn new(content: String) -> Self {
        Document {
            content,
            state: std::marker::PhantomData,
        }
    }

    fn add_text(&mut self, text: &str) {
        self.content.push_str(text);
    }

    fn request_review(self) -> Document<PendingReviewState> {
        Document {
            content: self.content,
            state: std::marker::PhantomData,
        }
    }
}

// Methods only available in PendingReview state
impl Document<PendingReviewState> {
    fn approve(self) -> Document<PublishedState> {
        Document {
            content: self.content,
            state: std::marker::PhantomData,
        }
    }

    fn reject(self) -> Document<DraftState> {
        Document {
            content: self.content,
            state: std::marker::PhantomData,
        }
    }
}

// Methods only available in Published state
impl Document<PublishedState> {
    fn get_published_date(&self) -> String {
        "2023-07-28".to_string() // Simplified for example
    }
}
```

## Project: Custom Iterator Implementation

Let's put our knowledge of advanced trait patterns to work by implementing a complex iterator. We'll create a flexible pagination iterator that can be used with any collection and supports configurable page sizes and pagination behavior.

```rust
use std::marker::PhantomData;

/// A trait for types that can be paginated
pub trait Pageable<T> {
    /// Returns the total number of items
    fn total_items(&self) -> usize;

    /// Returns a slice of items for the given page
    fn get_page(&self, page: usize, page_size: usize) -> Vec<T>;
}

/// Pagination configuration
pub struct PaginationConfig {
    /// Number of items per page
    pub page_size: usize,
    /// Whether to include the last page even if it's not full
    pub include_partial_last_page: bool,
}

impl Default for PaginationConfig {
    fn default() -> Self {
        PaginationConfig {
            page_size: 10,
            include_partial_last_page: true,
        }
    }
}

/// An iterator that yields pages of items
pub struct Paginator<'a, T, P>
where
    P: Pageable<T>,
    T: Clone,
{
    pageable: &'a P,
    config: PaginationConfig,
    current_page: usize,
    total_pages: usize,
    _marker: PhantomData<T>,
}

impl<'a, T, P> Paginator<'a, T, P>
where
    P: Pageable<T>,
    T: Clone,
{
    /// Creates a new paginator with the given configuration
    pub fn new(pageable: &'a P, config: PaginationConfig) -> Self {
        let total_items = pageable.total_items();
        let full_pages = total_items / config.page_size;
        let has_partial_page = total_items % config.page_size > 0;

        let total_pages = if has_partial_page && config.include_partial_last_page {
            full_pages + 1
        } else {
            full_pages
        };

        Paginator {
            pageable,
            config,
            current_page: 0,
            total_pages,
            _marker: PhantomData,
        }
    }

    /// Returns the total number of pages
    pub fn total_pages(&self) -> usize {
        self.total_pages
    }
}

impl<'a, T, P> Iterator for Paginator<'a, T, P>
where
    P: Pageable<T>,
    T: Clone,
{
    type Item = Vec<T>;

    fn next(&mut self) -> Option<Self::Item> {
        if self.current_page >= self.total_pages {
            return None;
        }

        let page = self.pageable.get_page(
            self.current_page,
            self.config.page_size,
        );

        self.current_page += 1;

        Some(page)
    }
}

// Implement Pageable for Vec
impl<T: Clone> Pageable<T> for Vec<T> {
    fn total_items(&self) -> usize {
        self.len()
    }

    fn get_page(&self, page: usize, page_size: usize) -> Vec<T> {
        let start = page * page_size;
        let end = std::cmp::min(start + page_size, self.len());

        if start >= end {
            return Vec::new();
        }

        self[start..end].to_vec()
    }
}

// Extension trait to add pagination to any collection that implements Pageable
pub trait PaginationExt<T: Clone> {
    fn paginate(&self, config: PaginationConfig) -> Paginator<T, Self>
    where
        Self: Pageable<T> + Sized;

    fn paginate_default(&self) -> Paginator<T, Self>
    where
        Self: Pageable<T> + Sized;
}

impl<C, T: Clone> PaginationExt<T> for C
where
    C: Pageable<T>,
{
    fn paginate(&self, config: PaginationConfig) -> Paginator<T, Self> {
        Paginator::new(self, config)
    }

    fn paginate_default(&self) -> Paginator<T, Self> {
        Paginator::new(self, PaginationConfig::default())
    }
}

// Example usage
fn main() {
    let items: Vec<i32> = (1..=100).collect();

    // Use the default configuration (page size = 10)
    let paginator = items.paginate_default();

    println!("Total pages: {}", paginator.total_pages());

    // Iterate over each page
    for (i, page) in paginator.enumerate() {
        println!("Page {}: {:?}", i + 1, page);
    }

    // Custom configuration
    let config = PaginationConfig {
        page_size: 15,
        include_partial_last_page: true,
    };

    let paginator = items.paginate(config);

    println!("Total pages with custom config: {}", paginator.total_pages());

    // Process pages in parallel using rayon
    // paginator.collect::<Vec<_>>().par_iter().for_each(|page| {
    //     // Process each page in parallel
    //     process_page(page);
    // });
}

// Implementing for a custom collection
struct Database {
    items: Vec<String>,
}

impl Pageable<String> for Database {
    fn total_items(&self) -> usize {
        self.items.len()
    }

    fn get_page(&self, page: usize, page_size: usize) -> Vec<String> {
        let start = page * page_size;
        let end = std::cmp::min(start + page_size, self.items.len());

        if start >= end {
            return Vec::new();
        }

        self.items[start..end].to_vec()
    }
}

// Now we can paginate our custom database
fn database_example() {
    let db = Database {
        items: (1..=100).map(|i| format!("Item {}", i)).collect(),
    };

    for page in db.paginate_default() {
        // Process each page
        println!("Processing page with {} items", page.len());
    }
}
```

This implementation showcases several advanced trait patterns:

1. **Associated types**: The `Iterator` trait has an associated type `Item`
2. **Extension traits**: `PaginationExt` adds methods to any type that implements `Pageable`
3. **Marker types**: `PhantomData` is used to track the item type
4. **Trait bounds**: The implementation uses complex trait bounds to ensure type safety
5. **Default implementations**: `PaginationConfig` has a default implementation
6. **Generic implementations**: `Pageable` is implemented for `Vec<T>` for any `T: Clone`

The paginator is flexible and can be used with any collection that implements the `Pageable` trait. It can be configured with different page sizes and behaviors, making it a powerful and reusable component.

## Summary

In this chapter, we've explored advanced trait patterns in Rust. We've learned:

- How to use associated types and when to prefer them over generic parameters
- The new generic associated types (GATs) feature and its applications
- How to overload operators using traits
- The role of marker traits and auto traits in Rust's type system
- How to implement traits conditionally using trait bounds
- How supertraits enable trait inheritance and extension
- Working with trait objects that combine multiple traits
- Implementing the Iterator trait and creating custom iterators
- Building composable abstractions with traits
- Advanced design patterns enabled by Rust's trait system

By mastering these advanced trait patterns, you'll be able to create more flexible, reusable, and type-safe abstractions in your Rust code. Traits are the cornerstone of Rust's approach to polymorphism and code organization, and understanding how to use them effectively will make you a more productive Rust programmer.

## Exercises

1. Implement a generic `Observable` trait that allows objects to register listeners and notify them of changes.

2. Create a type-safe state machine using traits and phantom types to model a workflow with at least three states and different allowed transitions.

3. Implement a custom iterator that lazily computes the Fibonacci sequence up to a specified limit.

4. Design a plugin system using traits that allows dynamically loading and unloading components.

5. Create a `Builder` trait with associated types that can be used to implement the builder pattern for different struct types.

6. Implement the visitor pattern using traits to process different node types in a tree structure.

7. Create a custom operator trait that implements the spaceship operator (`<=>`) for comparing values with a three-way comparison.

8. Implement a trait for string formatting that uses generic associated types to handle different output formats.

## Further Reading

- [The Rustonomicon: Subtyping and Variance](https://doc.rust-lang.org/nomicon/subtyping.html)
- [The Rust Reference: Traits](https://doc.rust-lang.org/reference/items/traits.html)
- [Rust Design Patterns](https://rust-unofficial.github.io/patterns/)
- [Zero-Cost Abstractions in Rust](https://carette.xyz/posts/zero_cost_abstraction/)
- [Type-Driven API Design in Rust](https://www.youtube.com/watch?v=bnnacleqg6k)
- [Advanced Type-Level Programming in Rust](https://willcrichton.net/rust-api-type-patterns/)
- [Generic Associated Types Initiative](https://blog.rust-lang.org/inside-rust/2021/08/16/GATs-initiative.html)
- [Effectively Using Iterator in Rust](https://blog.logrocket.com/effectively-using-iterators-rust/)
- [Interior Mutability in Rust: Understanding Cell and RefCell](https://ricardomartins.cc/2016/06/08/interior-mutability)
- [The Embedded Rust Book: Concurrency](https://docs.rust-embedded.org/book/concurrency/)
