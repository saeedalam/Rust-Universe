# Chapter 15: Introduction to Generics

## Introduction

In programming, we often encounter situations where we need to write similar code for different types. For example, we might want to create a function that finds the largest element in a collection, regardless of whether that collection contains integers, floating-point numbers, or custom types. Without generics, we would need to write separate functions for each type, leading to code duplication and maintenance challenges.

Rust's generic programming features allow us to write flexible, reusable code that works with different types while maintaining type safety and performance. Unlike dynamic languages, Rust's generics are resolved at compile time, which means there's no runtime cost for using them.

In this chapter, we'll explore:

- What generics are and why we use them
- Generic data types in structs and enums
- Creating generic functions and methods
- Working with multiple generic parameters
- Adding constraints to generics
- Understanding how generics are compiled (monomorphization)
- Rust's zero-cost abstractions
- Implementing traits for generic types
- Using type aliases with generics
- Working with generic constants (const generics)
- Specialization patterns
- How Rust's generics compare to other languages
- Building a flexible generic data container

By the end of this chapter, you'll understand how to use generics to write code that is both flexible and efficient.

## What Are Generics and Why Use Them?

Generics are a way to write code that can work with multiple types. When we write generic code, we're essentially creating a template that can be filled in with specific types when the code is used.

### The Problem: Code Duplication

Consider a function that finds the largest number in a list of integers:

```rust
fn largest_i32(list: &[i32]) -> &i32 {
    let mut largest = &list[0];

    for item in list {
        if item > largest {
            largest = item;
        }
    }

    largest
}
```

Now, what if we also need a function to find the largest character in a list of characters? Without generics, we would have to write another very similar function:

```rust
fn largest_char(list: &[char]) -> &char {
    let mut largest = &list[0];

    for item in list {
        if item > largest {
            largest = item;
        }
    }

    largest
}
```

These functions are almost identical, with the only difference being the type they operate on. This duplication makes our code harder to maintain and more prone to errors.

### The Solution: Generics

With generics, we can write a single function that works with different types:

```rust
fn largest<T: std::cmp::PartialOrd>(list: &[T]) -> &T {
    let mut largest = &list[0];

    for item in list {
        if item > largest {
            largest = item;
        }
    }

    largest
}
```

In this function, `<T: std::cmp::PartialOrd>` declares a generic type parameter `T` that must implement the `PartialOrd` trait, which allows for comparison between values.

Now we can use the same function for both integers and characters:

```rust
fn main() {
    let number_list = vec![34, 50, 25, 100, 65];
    let result = largest(&number_list);
    println!("The largest number is {}", result);

    let char_list = vec!['y', 'm', 'a', 'q'];
    let result = largest(&char_list);
    println!("The largest char is {}", result);
}
```

### Benefits of Generics

Using generics offers several advantages:

1. **Code Reuse**: Write code once that works with many types
2. **Type Safety**: Maintain strong type checking at compile time
3. **Performance**: No runtime cost since generics are resolved at compile time
4. **Abstraction**: Express algorithms in their most general form
5. **API Design**: Create flexible interfaces that work with many types

## Generic Data Types

Let's explore how to use generics with structs, enums, and other data types.

### Generic Structs

We can define structs to use generic type parameters:

```rust
struct Point<T> {
    x: T,
    y: T,
}
```

This definition says that the `Point` struct is generic over some type `T`, and both `x` and `y` are of type `T`. This means that when we create an instance of `Point`, both `x` and `y` must be of the same type:

```rust
fn main() {
    let integer_point = Point { x: 5, y: 10 };
    let float_point = Point { x: 1.0, y: 4.0 };

    // This would not compile because x and y must be the same type
    // let mixed_point = Point { x: 5, y: 4.0 };
}
```

If we want to allow different types for `x` and `y`, we can use multiple generic parameters:

```rust
struct Point<T, U> {
    x: T,
    y: U,
}

fn main() {
    let mixed_point = Point { x: 5, y: 4.0 };
}
```

### Generic Enums

Enums can also be generic. In fact, two of the most common enums in the standard library, `Option<T>` and `Result<T, E>`, are generic:

```rust
enum Option<T> {
    Some(T),
    None,
}

enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

These enums are so useful precisely because they can work with any type. `Option<T>` represents a value that might be present (`Some(T)`) or absent (`None`), while `Result<T, E>` represents an operation that might succeed with a value of type `T` or fail with an error of type `E`.

Let's see how we might use these in practice:

```rust
fn find_user_by_id(id: u32) -> Option<User> {
    if id == 42 {
        Some(User { name: "Alice".to_string(), age: 30 })
    } else {
        None
    }
}

fn parse_age(s: &str) -> Result<u32, String> {
    match s.parse() {
        Ok(age) => Ok(age),
        Err(_) => Err("Failed to parse age".to_string()),
    }
}
```

### Custom Generic Types

We can create our own generic types for specific use cases. For example, let's create a generic `Pair` type that holds two values of the same type:

```rust
struct Pair<T> {
    first: T,
    second: T,
}

impl<T> Pair<T> {
    fn new(first: T, second: T) -> Self {
        Pair { first, second }
    }

    fn swap(&mut self) {
        std::mem::swap(&mut self.first, &mut self.second);
    }
}
```

This `Pair` type could be used with any type:

```rust
let number_pair = Pair::new(42, 24);
let string_pair = Pair::new("hello".to_string(), "world".to_string());
```

## Generic Functions and Methods

Let's explore how to use generics with functions and methods.

### Generic Functions

We've already seen a simple example of a generic function that finds the largest value in a slice:

```rust
fn largest<T: std::cmp::PartialOrd>(list: &[T]) -> &T {
    let mut largest = &list[0];

    for item in list {
        if item > largest {
            largest = item;
        }
    }

    largest
}
```

We can define more complex generic functions as well. Here's a function that takes two values of the same type and returns the second one:

```rust
fn return_second<T>(first: T, second: T) -> T {
    second
}

fn main() {
    let result = return_second(5, 10); // result is 10
    let result = return_second("hello", "world"); // result is "world"
}
```

### Generic Methods

We can define methods on generic types:

```rust
struct Point<T> {
    x: T,
    y: T,
}

impl<T> Point<T> {
    fn new(x: T, y: T) -> Self {
        Point { x, y }
    }

    fn get_x(&self) -> &T {
        &self.x
    }

    fn get_y(&self) -> &T {
        &self.y
    }
}

fn main() {
    let p = Point::new(5, 10);
    println!("p.x = {}", p.get_x());
    println!("p.y = {}", p.get_y());
}
```

### Type-Specific Method Implementations

We can also implement methods that are specific to certain types:

```rust
impl Point<f64> {
    fn distance_from_origin(&self) -> f64 {
        (self.x.powi(2) + self.y.powi(2)).sqrt()
    }
}

fn main() {
    let p = Point::new(3.0, 4.0);
    println!("Distance from origin: {}", p.distance_from_origin()); // 5.0

    // This would not compile because distance_from_origin is only available for Point<f64>
    // let p = Point::new(3, 4);
    // println!("Distance from origin: {}", p.distance_from_origin());
}
```

### Generic Methods with Different Types

We can also define generic methods on generic types, where the method's generic parameter might be different from the type's generic parameter:

```rust
struct Point<T> {
    x: T,
    y: T,
}

impl<T> Point<T> {
    fn mixup<U>(self, other: Point<U>) -> Point<T> {
        Point {
            x: self.x,
            y: other.y, // This wouldn't work because other.y is of type U, not T
        }
    }
}
```

Oops, that won't work! Let's fix it by using a different return type:

```rust
struct Point<T> {
    x: T,
    y: T,
}

impl<T> Point<T> {
    fn mixup<U>(self, other: Point<U>) -> Point<U> {
        Point {
            x: other.x,
            y: self.y, // This still won't work because self.y is of type T, not U
        }
    }
}
```

That's still not right. Let's create a new type that can hold both T and U:

```rust
struct Point<T> {
    x: T,
    y: T,
}

impl<T> Point<T> {
    fn mixup<U>(self, other: Point<U>) -> Point<(T, U)> {
        Point {
            x: (self.x, other.x),
            y: (self.y, other.y),
        }
    }
}
```

No, that's not ideal either. Let's use a different type for the return value:

```rust
struct Point<T, U> {
    x: T,
    y: U,
}

impl<T, U> Point<T, U> {
    fn mixup<V, W>(self, other: Point<V, W>) -> Point<T, W> {
        Point {
            x: self.x,
            y: other.y,
        }
    }
}

fn main() {
    let p1 = Point { x: 5, y: 10.4 };
    let p2 = Point { x: "Hello", y: 'c' };

    let p3 = p1.mixup(p2);

    println!("p3.x = {}, p3.y = {}", p3.x, p3.y); // p3.x = 5, p3.y = c
}
```

This works because we've made both `Point` and the `mixup` method generic, allowing us to combine values of different types.

## Multiple Generic Parameters

As we've seen, we can use multiple generic parameters in our type and function definitions.

### Multiple Type Parameters

Here's an example of a struct with multiple generic parameters:

```rust
struct KeyValue<K, V> {
    key: K,
    value: V,
}

impl<K, V> KeyValue<K, V> {
    fn new(key: K, value: V) -> Self {
        KeyValue { key, value }
    }

    fn get_key(&self) -> &K {
        &self.key
    }

    fn get_value(&self) -> &V {
        &self.value
    }
}

fn main() {
    let kv = KeyValue::new("name", "Alice");
    println!("Key: {}, Value: {}", kv.get_key(), kv.get_value());

    let kv2 = KeyValue::new(1, true);
    println!("Key: {}, Value: {}", kv2.get_key(), kv2.get_value());
}
```

### Complex Generic Functions

We can create functions with multiple generic parameters as well:

```rust
fn print_pair<T: std::fmt::Display, U: std::fmt::Display>(first: T, second: U) {
    println!("({}, {})", first, second);
}

fn main() {
    print_pair(5, "hello"); // (5, hello)
    print_pair(true, 3.14); // (true, 3.14)
}
```

### Tuple Structs with Multiple Generic Parameters

We can also create tuple structs with multiple generic parameters:

```rust
struct Pair<T, U>(T, U);

fn main() {
    let pair = Pair(5, "hello");
    println!("({}, {})", pair.0, pair.1); // (5, hello)
}
```

## Constraints on Generics

When using generics, we often need to specify what capabilities a type must have. This is where trait bounds come into play.

### Basic Trait Bounds

We can constrain generic types to those that implement specific traits:

```rust
fn print_item<T: std::fmt::Display>(item: T) {
    println!("Item: {}", item);
}

fn main() {
    print_item(5); // Works: i32 implements Display
    print_item("hello"); // Works: &str implements Display

    // This would not compile because Vec<i32> does not implement Display
    // print_item(vec![1, 2, 3]);
}
```

### Multiple Trait Bounds

We can specify that a type must implement multiple traits using the `+` syntax:

```rust
use std::fmt::Display;
use std::cmp::PartialOrd;

fn print_and_compare<T: Display + PartialOrd>(a: T, b: T) {
    println!("a = {}, b = {}", a, b);

    if a > b {
        println!("{} is greater than {}", a, b);
    } else if a < b {
        println!("{} is less than {}", a, b);
    } else {
        println!("{} is equal to {}", a, b);
    }
}

fn main() {
    print_and_compare(5, 10); // 5 is less than 10
    print_and_compare("hello", "world"); // hello is less than world
}
```

### Where Clauses

For more complex trait bounds, we can use `where` clauses for better readability:

```rust
use std::fmt::{Debug, Display};

fn some_function<T, U>(t: T, u: U) -> i32
    where T: Display + Clone,
          U: Clone + Debug
{
    println!("t = {}", t);
    println!("u = {:?}", u);
    42
}

fn main() {
    let result = some_function("hello", vec![1, 2, 3]);
    println!("Result: {}", result);
}
```

### Conditional Method Implementations

We can use trait bounds to conditionally implement methods that are only available when a type satisfies certain constraints:

```rust
struct Pair<T> {
    x: T,
    y: T,
}

impl<T> Pair<T> {
    fn new(x: T, y: T) -> Self {
        Pair { x, y }
    }
}

// This method is only available for Pair<T> where T: Display + PartialOrd
impl<T: Display + PartialOrd> Pair<T> {
    fn cmp_display(&self) {
        if self.x >= self.y {
            println!("The largest member is x = {}", self.x);
        } else {
            println!("The largest member is y = {}", self.y);
        }
    }
}

fn main() {
    let pair = Pair::new(5, 10);
    pair.cmp_display(); // The largest member is y = 10

    // This would compile because String implements Display + PartialOrd
    let pair = Pair::new("hello".to_string(), "world".to_string());
    pair.cmp_display(); // The largest member is y = world

    // This would not compile because Vec<i32> does not implement Display
    // let pair = Pair::new(vec![1, 2], vec![3, 4]);
    // pair.cmp_display();
}
```

### Blanket Implementations

Rust also allows for "blanket implementations," where we implement a trait for any type that satisfies certain constraints:

```rust
trait AsJson {
    fn as_json(&self) -> String;
}

// Implement AsJson for any type that implements Display
impl<T: Display> AsJson for T {
    fn as_json(&self) -> String {
        format!("\"{}\"", self)
    }
}

fn main() {
    let num = 42;
    println!("{}", num.as_json()); // "42"

    let message = "hello";
    println!("{}", message.as_json()); // "hello"
}
```

This is a powerful feature that allows us to extend the functionality of any type that meets certain criteria.

## Monomorphization and Performance

One of the great things about Rust's generics is that they have no runtime cost. This is achieved through a process called monomorphization.

### What is Monomorphization?

Monomorphization is the process of turning generic code into specific code by filling in the concrete types that are used when compiled. This means that when you use a generic function with specific types, Rust generates specialized versions of that function for those types.

For example, if you call `largest` with `i32` and `char` slices:

```rust
let integer_list = vec![1, 2, 3];
let largest_int = largest(&integer_list);

let char_list = vec!['a', 'b', 'c'];
let largest_char = largest(&char_list);
```

The Rust compiler will generate two functions, equivalent to:

```rust
fn largest_i32(list: &[i32]) -> &i32 {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}

fn largest_char(list: &[char]) -> &char {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}
```

This is done at compile time, so there's no runtime overhead for using generics.

### Performance Implications

This approach has several performance benefits:

1. **No Runtime Type Resolution**: Unlike dynamic languages, Rust doesn't need to determine types at runtime.

2. **Optimized Code**: Each monomorphized function can be optimized specifically for its concrete type.

3. **Inlining**: The compiler can inline specialized functions, further improving performance.

The trade-off is that monomorphization can lead to larger binary sizes, as the compiler generates multiple copies of the same function for different types. However, this is generally a worthwhile trade-off for the performance benefits.

## Zero-Cost Abstractions

Rust is built on the principle of "zero-cost abstractions," which means that abstractions should not impose a runtime penalty. Generics are a prime example of this principle.

### What Are Zero-Cost Abstractions?

The concept of zero-cost abstractions was articulated by Bjarne Stroustrup, the creator of C++, as:

> What you don't use, you don't pay for. And further: What you do use, you couldn't hand code any better.

In other words, using an abstraction should not be slower than writing the equivalent specialized code by hand.

### Examples in Rust

Rust's zero-cost abstractions include:

1. **Generics**: As we've seen, generics are resolved at compile time through monomorphization.

2. **Iterators**: Rust's iterators provide high-level abstractions that compile down to efficient code, often as fast as hand-written loops.

3. **Traits**: Trait implementations and dispatch mechanisms are designed to have minimal or no runtime cost.

Let's see an example of how Rust's iterators are zero-cost:

```rust
fn sum_with_for_loop(numbers: &[i32]) -> i32 {
    let mut sum = 0;
    for &n in numbers {
        sum += n;
    }
    sum
}

fn sum_with_iterator(numbers: &[i32]) -> i32 {
    numbers.iter().sum()
}
```

Both of these functions will compile to essentially the same machine code, but the iterator version is more concise and expressive.

## Generic Implementations

We can implement traits generically for a range of types, allowing us to provide shared functionality efficiently.

### Implementing Traits for Generic Types

Here's an example of implementing a trait for a generic type:

```rust
trait Printable {
    fn print(&self);
}

struct Wrapper<T> {
    value: T,
}

impl<T: Display> Printable for Wrapper<T> {
    fn print(&self) {
        println!("Wrapper containing: {}", self.value);
    }
}

fn main() {
    let w = Wrapper { value: 42 };
    w.print(); // Wrapper containing: 42

    let w = Wrapper { value: "hello" };
    w.print(); // Wrapper containing: hello
}
```

### Implementing Generic Traits for Specific Types

We can also implement generic traits for specific types:

```rust
trait Converter<T> {
    fn convert(&self) -> T;
}

impl Converter<String> for i32 {
    fn convert(&self) -> String {
        self.to_string()
    }
}

impl Converter<i32> for String {
    fn convert(&self) -> i32 {
        self.parse().unwrap_or(0)
    }
}

fn main() {
    let num = 42;
    let str = num.convert();
    println!("{}", str); // "42"

    let str = String::from("123");
    let num: i32 = str.convert();
    println!("{}", num); // 123
}
```

## Type Aliases with Generics

Type aliases allow us to create shorthand names for complex types, including generic types.

### Basic Type Aliases

Here's a simple example of a type alias:

```rust
type IntResult = Result<i32, String>;

fn parse_number(s: &str) -> IntResult {
    match s.parse::<i32>() {
        Ok(n) => Ok(n),
        Err(_) => Err(format!("Failed to parse: {}", s)),
    }
}

fn main() {
    let result: IntResult = parse_number("42");
    println!("{:?}", result); // Ok(42)
}
```

### Generic Type Aliases

We can also create generic type aliases:

```rust
type Result<T> = std::result::Result<T, String>;

fn parse<T: std::str::FromStr>(s: &str) -> Result<T> {
    match s.parse::<T>() {
        Ok(value) => Ok(value),
        Err(_) => Err(format!("Failed to parse: {}", s)),
    }
}

fn main() {
    let int_result: Result<i32> = parse("42");
    println!("{:?}", int_result); // Ok(42)

    let float_result: Result<f64> = parse("3.14");
    println!("{:?}", float_result); // Ok(3.14)
}
```

### Type Aliases for Complex Types

Type aliases are particularly useful for complex generic types:

```rust
type Map<K, V> = std::collections::HashMap<K, V>;
type StringMap<V> = Map<String, V>;
type Cache = StringMap<Vec<u8>>;

fn main() {
    let mut cache: Cache = Cache::new();
    cache.insert("key1".to_string(), vec![1, 2, 3]);
    println!("{:?}", cache.get("key1")); // Some([1, 2, 3])
}
```

## Generic Constants (Const Generics)

Const generics allow us to use constant values as generic parameters. This feature was stabilized in Rust 1.51 and provides a way to write code that is generic over constant values, not just types.

### Basic Const Generics

Here's an example of using const generics with arrays:

```rust
fn print_array<const N: usize>(arr: [i32; N]) {
    println!("Array of length {}: {:?}", N, arr);
}

fn main() {
    let arr1 = [1, 2, 3];
    let arr2 = [1, 2, 3, 4, 5];

    print_array(arr1); // Array of length 3: [1, 2, 3]
    print_array(arr2); // Array of length 5: [1, 2, 3, 4, 5]
}
```

### Implementing Traits for Arrays of Any Size

One powerful use of const generics is implementing traits for arrays of any size:

```rust
trait TransposeMatrix {
    type Output;
    fn transpose(self) -> Self::Output;
}

impl<T: Copy, const R: usize, const C: usize> TransposeMatrix for [[T; C]; R] {
    type Output = [[T; R]; C];

    fn transpose(self) -> Self::Output {
        let mut result: [[T; R]; C] = [[self[0][0]; R]; C];

        for r in 0..R {
            for c in 0..C {
                result[c][r] = self[r][c];
            }
        }

        result
    }
}

fn main() {
    let matrix = [
        [1, 2, 3],
        [4, 5, 6],
    ];

    let transposed = matrix.transpose();

    // Print the transposed matrix
    for row in &transposed {
        println!("{:?}", row);
    }
    // [1, 4]
    // [2, 5]
    // [3, 6]
}
```

### Custom Types with Const Generics

We can also create our own types that use const generics:

```rust
struct Matrix<T, const ROWS: usize, const COLS: usize> {
    data: [[T; COLS]; ROWS],
}

impl<T: Copy + Default, const R: usize, const C: usize> Matrix<T, R, C> {
    fn new() -> Self {
        let default_value = T::default();
        Matrix {
            data: [[default_value; C]; R],
        }
    }

    fn get(&self, row: usize, col: usize) -> Option<&T> {
        if row < R && col < C {
            Some(&self.data[row][col])
        } else {
            None
        }
    }

    fn set(&mut self, row: usize, col: usize, value: T) -> bool {
        if row < R && col < C {
            self.data[row][col] = value;
            true
        } else {
            false
        }
    }
}

fn main() {
    let mut matrix: Matrix<i32, 2, 3> = Matrix::new();

    matrix.set(0, 0, 1);
    matrix.set(0, 1, 2);
    matrix.set(0, 2, 3);
    matrix.set(1, 0, 4);
    matrix.set(1, 1, 5);
    matrix.set(1, 2, 6);

    // Print the matrix
    for r in 0..2 {
        for c in 0..3 {
            print!("{} ", matrix.get(r, c).unwrap());
        }
        println!();
    }
    // 1 2 3
    // 4 5 6
}
```

## Specialization Patterns

While full specialization is still an unstable feature in Rust, there are several patterns we can use to achieve similar effects.

### Type-Specific Implementations

As we've seen, we can implement methods for specific types:

```rust
struct Point<T> {
    x: T,
    y: T,
}

impl<T> Point<T> {
    fn new(x: T, y: T) -> Self {
        Point { x, y }
    }
}

impl Point<f64> {
    fn distance_from_origin(&self) -> f64 {
        (self.x.powi(2) + self.y.powi(2)).sqrt()
    }
}
```

### Trait-Based Specialization

We can use traits to achieve a form of specialization:

```rust
trait Numeric {
    fn zero() -> Self;
}

impl Numeric for i32 {
    fn zero() -> Self {
        0
    }
}

impl Numeric for f64 {
    fn zero() -> Self {
        0.0
    }
}

struct Point<T> {
    x: T,
    y: T,
}

impl<T> Point<T> {
    fn new(x: T, y: T) -> Self {
        Point { x, y }
    }
}

impl<T: Numeric> Point<T> {
    fn origin() -> Self {
        Point {
            x: T::zero(),
            y: T::zero(),
        }
    }
}

fn main() {
    let p1 = Point::<i32>::origin(); // Point { x: 0, y: 0 }
    let p2 = Point::<f64>::origin(); // Point { x: 0.0, y: 0.0 }
}
```

### Marker Traits

We can use marker traits for more complex specialization:

```rust
trait Marker {}

impl Marker for i32 {}
impl Marker for f64 {}

struct Data<T>(T);

impl<T> Data<T> {
    fn new(value: T) -> Self {
        Data(value)
    }

    fn get(&self) -> &T {
        &self.0
    }
}

impl<T: Marker> Data<T> {
    fn special_method(&self) -> String {
        format!("Special method for marked types: {}", self.0)
    }
}

fn main() {
    let d1 = Data::new(42);
    let d2 = Data::new("hello");

    println!("{}", d1.special_method()); // Works because i32 implements Marker
    // d2.special_method() would not compile because &str doesn't implement Marker
}
```

## Comparing to Other Languages' Generic Systems

Rust's generics are similar to those in other languages, but they have some important differences. Let's compare Rust's approach to generics with other common programming languages.

### Rust vs. C++

- **Similarities**:

  - Both use templates/generics for compile-time polymorphism
  - Both use monomorphization for generating specialized code
  - Both have zero runtime cost for generics

- **Differences**:
  - Rust generics are more constrained through trait bounds
  - Rust's trait system provides more structured abstraction
  - C++ templates are more flexible but can lead to less clear error messages

### Rust vs. Java/C#

- **Similarities**:

  - Both provide type safety for generic code
  - Both allow constraints on generic types

- **Differences**:
  - Java/C# use type erasure at runtime, while Rust uses monomorphization
  - Rust generics have no runtime cost, while Java/C# generics can have boxing overhead
  - Java/C# use inheritance for constraints, while Rust uses traits

### Rust vs. TypeScript

- **Similarities**:

  - Both provide strong type checking for generic code
  - Both allow multiple type parameters

- **Differences**:
  - TypeScript's generics are erased at runtime, while Rust's are monomorphized
  - Rust's trait bounds are more powerful than TypeScript's interfaces
  - TypeScript allows more dynamic patterns due to its JavaScript foundation

### Rust vs. Haskell

- **Similarities**:

  - Both have powerful type systems for generics
  - Both support type classes/traits for constraining types

- **Differences**:
  - Haskell uses type erasure, while Rust uses monomorphization
  - Haskell's higher-kinded types are more expressive than Rust's generics
  - Rust has more control over memory layout and performance

## Project: Generic Data Container

Let's put our knowledge of generics to use by building a flexible data container that works with any type. We'll create a generic `Container` that can store elements of any type, with various operations like adding, removing, and transforming elements.

```rust
use std::fmt::Debug;

// A generic container that can hold elements of any type
struct Container<T> {
    items: Vec<T>,
}

impl<T> Container<T> {
    // Create a new, empty container
    fn new() -> Self {
        Container { items: Vec::new() }
    }

    // Create a container with initial values
    fn with_items(items: Vec<T>) -> Self {
        Container { items }
    }

    // Add an item to the container
    fn add(&mut self, item: T) {
        self.items.push(item);
    }

    // Remove an item at a specific index
    fn remove(&mut self, index: usize) -> Option<T> {
        if index < self.items.len() {
            Some(self.items.remove(index))
        } else {
            None
        }
    }

    // Get a reference to an item at a specific index
    fn get(&self, index: usize) -> Option<&T> {
        self.items.get(index)
    }

    // Get the number of items in the container
    fn len(&self) -> usize {
        self.items.len()
    }

    // Check if the container is empty
    fn is_empty(&self) -> bool {
        self.items.is_empty()
    }

    // Iterate over the items (consuming the container)
    fn into_iter(self) -> std::vec::IntoIter<T> {
        self.items.into_iter()
    }

    // Get an iterator over references to the items
    fn iter(&self) -> std::slice::Iter<'_, T> {
        self.items.iter()
    }

    // Get an iterator over mutable references to the items
    fn iter_mut(&mut self) -> std::slice::IterMut<'_, T> {
        self.items.iter_mut()
    }

    // Map the container to a new container with a different type
    fn map<U, F>(&self, f: F) -> Container<U>
    where
        F: Fn(&T) -> U,
    {
        Container {
            items: self.items.iter().map(f).collect(),
        }
    }
}

// Add some convenient trait implementations for containers with elements that implement specific traits
impl<T: Debug> Debug for Container<T> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_list().entries(self.items.iter()).finish()
    }
}

impl<T: Clone> Clone for Container<T> {
    fn clone(&self) -> Self {
        Container {
            items: self.items.clone(),
        }
    }
}

impl<T: PartialEq> PartialEq for Container<T> {
    fn eq(&self, other: &Self) -> bool {
        self.items == other.items
    }
}

// An extension trait for containers with numeric elements
trait NumericContainer<T> {
    fn sum(&self) -> T;
    fn product(&self) -> T;
    fn average(&self) -> Option<f64>;
}

impl<T> NumericContainer<T> for Container<T>
where
    T: Copy + std::ops::Add<Output = T> + std::ops::Div<Output = T> + std::ops::Mul<Output = T> + Default + Into<f64>,
{
    fn sum(&self) -> T {
        let mut sum = T::default();
        for item in &self.items {
            sum = sum + *item;
        }
        sum
    }

    fn product(&self) -> T {
        if self.items.is_empty() {
            return T::default();
        }

        let mut product = self.items[0];
        for item in &self.items[1..] {
            product = product * *item;
        }
        product
    }

    fn average(&self) -> Option<f64> {
        if self.items.is_empty() {
            return None;
        }

        let sum: f64 = self.sum().into();
        Some(sum / self.len() as f64)
    }
}

// Let's use our container!
fn main() {
    // Container with integers
    let mut int_container = Container::new();
    int_container.add(1);
    int_container.add(2);
    int_container.add(3);
    int_container.add(4);
    int_container.add(5);

    println!("Integer container: {:?}", int_container); // [1, 2, 3, 4, 5]
    println!("Sum: {}", int_container.sum()); // 15
    println!("Product: {}", int_container.product()); // 120
    println!("Average: {:.2}", int_container.average().unwrap()); // 3.00

    // Container with strings
    let mut string_container = Container::new();
    string_container.add("hello".to_string());
    string_container.add("world".to_string());

    println!("String container: {:?}", string_container); // ["hello", "world"]

    // Using map to transform the container
    let uppercase_container = string_container.map(|s| s.to_uppercase());
    println!("Uppercase container: {:?}", uppercase_container); // ["HELLO", "WORLD"]

    // Container with custom types
    #[derive(Debug, Clone)]
    struct Point {
        x: i32,
        y: i32,
    }

    let mut point_container = Container::new();
    point_container.add(Point { x: 1, y: 2 });
    point_container.add(Point { x: 3, y: 4 });

    println!("Point container: {:?}", point_container); // [Point { x: 1, y: 2 }, Point { x: 3, y: 4 }]

    // Using map to extract a specific field
    let x_values = point_container.map(|p| p.x);
    println!("X values: {:?}", x_values); // [1, 3]
}
```

This project demonstrates many of the concepts we've covered in this chapter:

1. Generic types with `Container<T>`
2. Generic methods like `map`
3. Trait bounds for conditional implementations
4. Type-specific functionality through traits like `NumericContainer`
5. Working with iterators and ownership
6. Generic trait implementations

The `Container` type we've built is flexible enough to work with any type, while still providing specialized functionality for types that meet certain criteria.

## Summary

In this chapter, we've explored the world of generics in Rust:

- We've learned what generics are and why they're useful for writing reusable, type-safe code
- We've seen how to define generic data types, including structs and enums
- We've created generic functions and methods that work with multiple types
- We've used multiple generic parameters to create more flexible abstractions
- We've constrained generics with trait bounds to ensure types have necessary capabilities
- We've explored how Rust's monomorphization process works and why it leads to zero runtime cost
- We've seen how Rust provides zero-cost abstractions through its generic system
- We've implemented traits for generic types
- We've used type aliases to simplify complex generic types
- We've learned about const generics for working with values at the type level
- We've explored specialization patterns for providing type-specific functionality
- We've compared Rust's generics to similar features in other languages
- We've built a flexible generic container that works with any type

Generics are a cornerstone of Rust's type system, allowing us to write code that is both flexible and efficient. By leveraging generics effectively, you can create powerful abstractions without sacrificing performance.

## Exercises

1. Implement a generic `Stack<T>` data structure with `push`, `pop`, and `peek` methods.

2. Create a generic `Result<T, E>` type similar to Rust's standard library type.

3. Implement a generic `BinaryTree<T>` type with methods for inserting, finding, and traversing elements.

4. Write a generic function that converts between different collection types (e.g., from `Vec<T>` to `HashSet<T>`).

5. Create a generic `Either<L, R>` type that can hold either a value of type `L` or a value of type `R`.

6. Implement a generic `Cache<K, V>` type that can store key-value pairs with a maximum size and eviction policy.

7. Create a generic `Pipeline<T>` that can chain multiple transformations on a value.

8. Use const generics to implement a generic `Matrix<T, R, C>` type with matrix operations.

## Further Reading

- [The Rust Book: Generic Types, Traits, and Lifetimes](https://doc.rust-lang.org/book/ch10-00-generics.html)
- [The Rust Reference: Generics](https://doc.rust-lang.org/reference/generics.html)
- [The Rust Reference: Traits](https://doc.rust-lang.org/reference/items/traits.html)
- [Rust By Example: Generics](https://doc.rust-lang.org/rust-by-example/generics.html)
- [The Rustonomicon: Subtyping and Variance](https://doc.rust-lang.org/nomicon/subtyping.html)
- [Rust Blog: Const Generics MVP Hits Beta](https://blog.rust-lang.org/2021/02/26/const-generics-mvp-beta.html)
- [Zero Cost Abstractions](https://boats.gitlab.io/blog/post/zero-cost-abstractions/)
- [Comparing Rust and C++ Generics](https://blog.rust-lang.org/2021/06/17/introducing-rustc_codegen_gcc.html)
- [Generic Associated Types](https://blog.rust-lang.org/2021/08/03/GATs-stabilization-push.html)
- [Type Erasure in Rust](https://gabriellavalentin.com/blog/type-erasure-in-rust/)
