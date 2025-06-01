# Chapter 16: Traits and Polymorphism

## Introduction

In the previous chapter, we explored generics as a way to write code that works with different types. Generics provide compile-time polymorphism, but they're only part of Rust's type system story. In this chapter, we'll delve into traits, which are Rust's primary mechanism for defining shared behavior across different types.

Traits are similar to interfaces or abstract classes in other languages, but with some important differences. They allow us to define a set of methods that types must implement, enabling us to write code that works with any type that satisfies the trait's requirements. This approach gives us a powerful way to build abstractions while maintaining Rust's performance and safety guarantees.

In this chapter, we'll explore:

- Understanding polymorphism in programming
- Defining and implementing traits
- Using trait bounds with generic types
- Combining multiple trait bounds
- Creating default implementations
- Trait inheritance through supertraits
- Working with trait objects and dynamic dispatch
- Comparing static and dynamic dispatch
- Understanding object safety
- Implementing traits for external types
- The `Sized` trait and its significance
- Overview of standard library traits

By the end of this chapter, you'll understand how to use traits to write flexible, reusable code that works with a variety of types.

## Understanding Polymorphism

Polymorphism is a core concept in programming that allows code to work with values of different types in a uniform way. The term comes from Greek words meaning "many forms."

### Types of Polymorphism

In programming languages, there are several forms of polymorphism:

1. **Ad-hoc polymorphism**: Function or operator overloading, where the same function name can have different implementations depending on the types of arguments.

2. **Parametric polymorphism**: Using generic types to write code that can work with any type (what we covered in the previous chapter).

3. **Subtype polymorphism**: Common in object-oriented languages, where a subclass can be used anywhere its parent class is expected.

4. **Bounded polymorphism**: Using constraints to restrict the types that can be used with generics (what we'll explore with trait bounds).

Rust primarily uses parametric polymorphism (through generics) and bounded polymorphism (through traits). It does not use subtype polymorphism like traditional object-oriented languages, but instead uses traits and trait objects to achieve similar goals in a more controlled way.

### Why Polymorphism Matters

Polymorphism is essential for writing reusable, modular code. It allows us to:

- Write functions that work with many different types
- Build abstractions that hide implementation details
- Create extensible systems where new types can be added without modifying existing code
- Express relationships between different types

Let's see how Rust's trait system enables these capabilities.

## Defining and Implementing Traits

A trait defines functionality a particular type has and can share with other types. Think of traits as defining a contract that types can fulfill.

### Defining Traits

Let's start by defining a simple trait:

```rust
trait Summary {
    fn summarize(&self) -> String;
}
```

This trait has one method, `summarize`, which returns a `String`. Any type that implements this trait must provide an implementation for this method.

### Implementing Traits for Types

Now let's implement this trait for some types:

```rust
struct NewsArticle {
    headline: String,
    location: String,
    author: String,
    content: String,
}

impl Summary for NewsArticle {
    fn summarize(&self) -> String {
        format!("{}, by {} ({})", self.headline, self.author, self.location)
    }
}

struct Tweet {
    username: String,
    content: String,
    reply: bool,
    retweet: bool,
}

impl Summary for Tweet {
    fn summarize(&self) -> String {
        format!("{}: {}", self.username, self.content)
    }
}
```

Now we can call the `summarize` method on instances of both `NewsArticle` and `Tweet`:

```rust
let article = NewsArticle {
    headline: String::from("Penguins win the Stanley Cup Championship!"),
    location: String::from("Pittsburgh, PA, USA"),
    author: String::from("Iceburgh"),
    content: String::from("The Pittsburgh Penguins once again are the best hockey team in the NHL."),
};

let tweet = Tweet {
    username: String::from("horse_ebooks"),
    content: String::from("of course, as you probably already know, people"),
    reply: false,
    retweet: false,
};

println!("New article summary: {}", article.summarize());
println!("New tweet: {}", tweet.summarize());
```

This demonstrates how different types can implement the same trait, each with its own specific behavior, while sharing a common interface.

## Trait Bounds

Trait bounds allow us to restrict generic types to only those that implement specific traits. This is a form of bounded polymorphism.

### Basic Trait Bounds

Let's define a function that uses trait bounds:

```rust
pub fn notify<T: Summary>(item: &T) {
    println!("Breaking news! {}", item.summarize());
}
```

This function can be called with any type that implements the `Summary` trait:

```rust
notify(&article);
notify(&tweet);
```

The compiler will ensure that only types implementing `Summary` can be passed to `notify`.

### Trait Bounds with Impl Keyword

We can also use trait bounds with `impl` blocks to conditionally implement methods only for types that meet certain constraints:

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

// Only implement cmp_display if T implements Display and PartialOrd
impl<T: Display + PartialOrd> Pair<T> {
    fn cmp_display(&self) {
        if self.x >= self.y {
            println!("The largest member is x = {}", self.x);
        } else {
            println!("The largest member is y = {}", self.y);
        }
    }
}
```

In this example, the `cmp_display` method is only available for `Pair<T>` instances where `T` implements both `Display` and `PartialOrd`.

### Returning Types that Implement Traits

We can use traits to specify return types:

```rust
fn returns_summarizable() -> impl Summary {
    Tweet {
        username: String::from("horse_ebooks"),
        content: String::from("of course, as you probably already know, people"),
        reply: false,
        retweet: false,
    }
}
```

This is particularly useful when returning iterator adaptors or closures, which have complex types that would be difficult to write explicitly.

## Multiple Trait Bounds

We can require a type to implement multiple traits by using the `+` syntax:

```rust
use std::fmt::Display;

pub fn notify<T: Summary + Display>(item: &T) {
    println!("Breaking news! {}", item.summarize());
    println!("Display: {}", item);
}
```

### Where Clauses

For functions with many generic type parameters and trait bounds, we can use `where` clauses for better readability:

```rust
use std::fmt::{Display, Debug};

fn some_function<T, U>(t: &T, u: &U) -> i32
    where T: Display + Clone,
          U: Clone + Debug
{
    // Function body
    42
}
```

Where clauses are especially useful when you have complex trait bounds or multiple generic parameters.

## Default Implementations

Traits can provide default implementations for some or all of their methods:

```rust
trait Summary {
    fn summarize_author(&self) -> String;

    fn summarize(&self) -> String {
        format!("(Read more from {}...)", self.summarize_author())
    }
}
```

Now, when implementing this trait, we only need to provide an implementation for `summarize_author`:

```rust
impl Summary for Tweet {
    fn summarize_author(&self) -> String {
        format!("@{}", self.username)
    }
}
```

And we'll automatically get the default implementation for `summarize`. However, we can also override the default if needed:

```rust
impl Summary for NewsArticle {
    fn summarize_author(&self) -> String {
        format!("{}", self.author)
    }

    fn summarize(&self) -> String {
        format!("{}, by {} ({})", self.headline, self.author, self.location)
    }
}
```

Default implementations can call other methods in the same trait, even if those methods don't have default implementations themselves.

## Trait Inheritance

Traits can inherit from other traits using what Rust calls "supertraits." This means that if a type implements a trait, it must also implement the supertrait.

### Using Supertraits

Here's an example of a trait that requires another trait:

```rust
use std::fmt::Display;

trait OutputPrettify: Display {
    fn prettify(&self) -> String {
        let output = self.to_string();
        format!("✨ {} ✨", output)
    }
}
```

To implement `OutputPrettify`, a type must also implement `Display`:

```rust
struct Point {
    x: i32,
    y: i32,
}

// First implement Display
impl Display for Point {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

// Now we can implement OutputPrettify
impl OutputPrettify for Point {}

fn main() {
    let p = Point { x: 1, y: 2 };
    println!("{}", p.prettify()); // Prints: ✨ (1, 2) ✨
}
```

Trait inheritance is useful for building trait hierarchies and expressing relationships between different behaviors.

## Trait Objects and Dynamic Dispatch

So far, we've been using generics with trait bounds for static dispatch. This means the compiler generates specialized code for each concrete type at compile time. But what if we want to store different types that implement the same trait in a collection?

### Trait Objects

A trait object is a value that holds an instance of a type that implements a specific trait, along with a table used to look up trait methods on that type at runtime. We create a trait object by specifying the `dyn` keyword with a trait name:

```rust
pub trait Draw {
    fn draw(&self);
}

pub struct Screen {
    pub components: Vec<Box<dyn Draw>>,
}

impl Screen {
    pub fn run(&self) {
        for component in &self.components {
            component.draw();
        }
    }
}
```

The `Vec<Box<dyn Draw>>` contains multiple values of different types, as long as each type implements the `Draw` trait.

### Implementing Draw for Different Types

```rust
pub struct Button {
    pub width: u32,
    pub height: u32,
    pub label: String,
}

impl Draw for Button {
    fn draw(&self) {
        // Draw the button
        println!("Drawing a button: {}", self.label);
    }
}

pub struct SelectBox {
    pub width: u32,
    pub height: u32,
    pub options: Vec<String>,
}

impl Draw for SelectBox {
    fn draw(&self) {
        // Draw the select box
        println!("Drawing a select box with options: {:?}", self.options);
    }
}
```

Now we can create a `Screen` with components of different types:

```rust
fn main() {
    let screen = Screen {
        components: vec![
            Box::new(Button {
                width: 50,
                height: 20,
                label: String::from("OK"),
            }),
            Box::new(SelectBox {
                width: 100,
                height: 30,
                options: vec![
                    String::from("Yes"),
                    String::from("No"),
                    String::from("Maybe"),
                ],
            }),
        ],
    };

    screen.run();
}
```

This code demonstrates heterogeneous collections, where we can store different types in the same collection as long as they implement a common trait.

## Static vs Dynamic Dispatch

Rust provides two main ways to use polymorphism: static dispatch and dynamic dispatch.

### Static Dispatch

Static dispatch is what happens when you use generics with trait bounds:

```rust
fn process<T: Summary>(item: &T) {
    println!("Summary: {}", item.summarize());
}
```

With static dispatch:

- The compiler generates specialized code for each type at compile time
- There's no runtime overhead for method calls
- The binary may be larger due to code duplication (monomorphization)
- The compiler can often inline and optimize the specialized code

### Dynamic Dispatch

Dynamic dispatch is what happens when you use trait objects:

```rust
fn process(item: &dyn Summary) {
    println!("Summary: {}", item.summarize());
}
```

With dynamic dispatch:

- The correct implementation is looked up at runtime
- There's a small runtime overhead for method calls
- The binary can be smaller since there's no code duplication
- Some compiler optimizations aren't possible

### When to Use Each

- Use **static dispatch** (generics) when:

  - Performance is critical
  - You have a small number of types that will be used
  - The types are known at compile time

- Use **dynamic dispatch** (trait objects) when:
  - You need to store different types in the same collection
  - You want to reduce binary size
  - The exact types aren't known at compile time

## Object Safety

Not all traits can be used to create trait objects. For a trait to be "object safe," it must meet certain requirements:

1. The return type isn't `Self`
2. There are no generic methods
3. All methods are object safe

### Non-Object-Safe Traits

Here's an example of a trait that isn't object safe:

```rust
trait Clone {
    fn clone(&self) -> Self;
}
```

The problem is that `clone` returns `Self`, which could be any type that implements `Clone`. With a trait object, the concrete type is erased, so the compiler doesn't know what type to return.

### Working Around Object Safety

If you need to use a non-object-safe trait, you have a few options:

1. Redesign the trait to be object safe
2. Use static dispatch instead of dynamic dispatch
3. Create a wrapper trait that is object safe

Here's an example of a wrapper trait:

```rust
trait CloneableBox {
    fn clone_box(&self) -> Box<dyn CloneableBox>;
}

impl<T: Clone + 'static> CloneableBox for T {
    fn clone_box(&self) -> Box<dyn CloneableBox> {
        Box::new(self.clone())
    }
}
```

This approach allows you to use dynamic dispatch with types that implement `Clone`, even though `Clone` itself isn't object safe.

## Implementing External Traits

In Rust, you can implement a trait for a type as long as either the trait or the type is local to your crate. This is known as the "orphan rule" and it helps prevent conflicts between different crates.

### Implementing Standard Library Traits

You can implement standard library traits for your own types:

```rust
use std::fmt::Display;

struct Point {
    x: i32,
    y: i32,
}

impl Display for Point {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}
```

### The Newtype Pattern

To implement an external trait for an external type, you can use the "newtype" pattern by creating a wrapper type:

```rust
use std::fmt;

// Vec<T> and Display are both external
struct Wrapper(Vec<String>);

impl fmt::Display for Wrapper {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "[{}]", self.0.join(", "))
    }
}

fn main() {
    let w = Wrapper(vec![String::from("hello"), String::from("world")]);
    println!("w = {}", w);
}
```

This pattern allows you to work around the orphan rule while adding new functionality to existing types.

## The Sized Trait

The `Sized` trait is a marker trait that indicates that a type's size is known at compile time. Most types in Rust are `Sized` by default.

### Unsized Types

Some types in Rust are "unsized," meaning their size isn't known at compile time:

- Trait objects (`dyn Trait`)
- Slices (`[T]`)
- Strings (`str`)

Unsized types can only be used behind a pointer, such as `&[T]`, `&str`, or `Box<dyn Trait>`.

### The ?Sized Bound

By default, type parameters have a `Sized` bound. To opt out of this, you can use the special `?Sized` bound:

```rust
fn process<T: ?Sized + Debug>(item: &T) {
    println!("{:?}", item);
}
```

This function can accept references to both sized and unsized types, as long as they implement `Debug`.

## Standard Library Traits Overview

The Rust standard library includes many useful traits. Here's an overview of some of the most important ones:

### Common Traits

- **Debug**: Enables formatting with `{:?}`
- **Display**: Enables formatting with `{}`
- **Clone**: Provides a method to create a deep copy
- **Copy**: Marker trait indicating that a type can be copied bit-by-bit
- **PartialEq and Eq**: Enable equality comparisons
- **PartialOrd and Ord**: Enable ordering comparisons
- **Hash**: Enables hashing
- **Default**: Provides a default value for a type
- **Iterator**: Enables iteration over a sequence of values
- **IntoIterator**: Converts a type into an iterator
- **From and Into**: Enable type conversions
- **AsRef and AsMut**: Enable reference conversions
- **Deref and DerefMut**: Enable smart pointer behavior
- **Drop**: Customizes what happens when a value goes out of scope

### Examples

Here's how to implement some of these traits:

```rust
#[derive(Debug, Clone, PartialEq)]
struct Point {
    x: i32,
    y: i32,
}

impl Default for Point {
    fn default() -> Self {
        Point { x: 0, y: 0 }
    }
}

impl From<(i32, i32)> for Point {
    fn from(pair: (i32, i32)) -> Self {
        Point {
            x: pair.0,
            y: pair.1,
        }
    }
}

fn main() {
    let p1 = Point { x: 1, y: 2 };
    let p2 = p1.clone();
    let p3 = Point::default();
    let p4 = Point::from((3, 4));

    println!("{:?}", p1);
    println!("p1 == p2: {}", p1 == p2);
    println!("Default point: {:?}", p3);
    println!("Point from tuple: {:?}", p4);
}
```

Understanding these standard library traits will help you write more idiomatic Rust code and make better use of the ecosystem.

## Project: Serialization Framework

Let's put our knowledge of traits and polymorphism to use by creating a simple serialization framework. This project will demonstrate how to use traits to create a flexible system that can serialize different types to various formats.

### Defining the Core Traits

First, let's define the core traits for our serialization framework:

```rust
// Trait for types that can be serialized
pub trait Serialize {
    fn serialize(&self) -> String;
}

// Trait for serializer implementations
pub trait Serializer {
    fn serialize<T: Serialize>(&self, value: &T) -> String;
}
```

### Implementing Serialize for Various Types

Now, let's implement `Serialize` for some common types:

```rust
// Implement Serialize for primitive types
impl Serialize for i32 {
    fn serialize(&self) -> String {
        self.to_string()
    }
}

impl Serialize for f64 {
    fn serialize(&self) -> String {
        self.to_string()
    }
}

impl Serialize for bool {
    fn serialize(&self) -> String {
        self.to_string()
    }
}

impl Serialize for String {
    fn serialize(&self) -> String {
        format!("\"{}\"", self)
    }
}

impl<T: Serialize> Serialize for Vec<T> {
    fn serialize(&self) -> String {
        let mut result = String::from("[");
        for (i, item) in self.iter().enumerate() {
            if i > 0 {
                result.push_str(", ");
            }
            result.push_str(&item.serialize());
        }
        result.push(']');
        result
    }
}

// User-defined type
struct Person {
    name: String,
    age: i32,
    is_student: bool,
}

impl Serialize for Person {
    fn serialize(&self) -> String {
        format!(
            "{{ \"name\": {}, \"age\": {}, \"is_student\": {} }}",
            self.name.serialize(),
            self.age.serialize(),
            self.is_student.serialize()
        )
    }
}
```

### Creating Different Serializers

Next, let's create some different serializer implementations:

```rust
// JSON Serializer
struct JsonSerializer;

impl Serializer for JsonSerializer {
    fn serialize<T: Serialize>(&self, value: &T) -> String {
        value.serialize()
    }
}

// XML Serializer (simplified)
struct XmlSerializer;

impl Serializer for XmlSerializer {
    fn serialize<T: Serialize>(&self, value: &T) -> String {
        // This is a very simplified XML serialization
        format!("<value>{}</value>", value.serialize())
    }
}

// YAML Serializer (simplified)
struct YamlSerializer;

impl Serializer for YamlSerializer {
    fn serialize<T: Serialize>(&self, value: &T) -> String {
        // This is a very simplified YAML serialization
        format!("value: {}", value.serialize())
    }
}
```

### Using Dynamic Dispatch for Serialization

Now, let's create a function that can serialize any value using any serializer:

```rust
fn serialize_value<T: Serialize>(value: &T, serializer: &dyn Serializer) -> String {
    serializer.serialize(value)
}
```

### Putting It All Together

Let's use our serialization framework:

```rust
fn main() {
    // Create a person
    let person = Person {
        name: String::from("Alice"),
        age: 30,
        is_student: false,
    };

    // Create serializers
    let json_serializer = JsonSerializer;
    let xml_serializer = XmlSerializer;
    let yaml_serializer = YamlSerializer;

    // Create a vector of serializers using dynamic dispatch
    let serializers: Vec<&dyn Serializer> = vec![
        &json_serializer,
        &xml_serializer,
        &yaml_serializer,
    ];

    // Serialize with each serializer
    for (i, serializer) in serializers.iter().enumerate() {
        let format_name = match i {
            0 => "JSON",
            1 => "XML",
            2 => "YAML",
            _ => "Unknown",
        };

        println!("{} output:", format_name);
        println!("{}", serialize_value(&person, *serializer));
        println!();
    }

    // Serialize different types
    let values: Vec<Box<dyn Serialize>> = vec![
        Box::new(42),
        Box::new(3.14),
        Box::new(true),
        Box::new(String::from("Hello")),
        Box::new(vec![1, 2, 3]),
        Box::new(person),
    ];

    println!("JSON serialization of different types:");
    for value in &values {
        println!("{}", serialize_value(value.as_ref(), &json_serializer));
    }
}
```

This project demonstrates:

- How to define traits for a common interface
- Implementing traits for different types
- Using trait bounds for generic functions
- Creating a heterogeneous collection with trait objects
- Dynamic dispatch with trait objects
- Extending functionality without modifying existing code

By using traits and polymorphism, we've created a flexible serialization framework that can handle different types and formats. This is a simple example, but it illustrates how powerful traits can be for building extensible systems.

## Summary

In this chapter, we've explored traits and polymorphism in Rust:

- We learned that polymorphism allows code to work with values of different types in a unified way
- We defined traits as Rust's mechanism for shared behavior across types
- We implemented traits for different types, including default implementations
- We used trait bounds to constrain generic types
- We combined multiple trait bounds to express complex requirements
- We explored trait inheritance through supertraits
- We learned about trait objects and dynamic dispatch
- We compared static and dynamic dispatch, understanding their trade-offs
- We discussed object safety and its implications
- We learned how to implement traits for external types
- We explored the `Sized` trait and its role in Rust's type system
- We surveyed important traits in the standard library
- We built a serialization framework showcasing traits and polymorphism

Traits are a fundamental feature of Rust that enable powerful abstractions while maintaining safety and performance. By understanding traits and how to use them effectively, you'll be able to write more flexible, reusable, and expressive code.

## Exercises

1. Implement a `Shape` trait with methods for calculating area and perimeter, then implement it for `Circle`, `Rectangle`, and `Triangle` structs.

2. Create a `Sort` trait with a method for sorting, then implement different sorting algorithms (e.g., bubble sort, quick sort) as types that implement this trait.

3. Design a `Logger` trait with methods for logging messages at different levels, then implement it for console logging, file logging, and network logging.

4. Implement the `Iterator` trait for a custom collection type, like a binary tree or a graph.

5. Create a trait for parsing text into custom types, then implement it for different formats (e.g., CSV, JSON).

6. Extend the serialization framework project to handle more complex types, like nested structures and optional values.

7. Implement the `Display` and `Debug` traits for a custom data structure, exploring the differences between them.

8. Create a trait for validating data, then implement it for different validation rules and compose them together.

## Further Reading

- [Rust Book: Traits](https://doc.rust-lang.org/book/ch10-02-traits.html)
- [Rust By Example: Traits](https://doc.rust-lang.org/rust-by-example/trait.html)
- [Rust Reference: Traits](https://doc.rust-lang.org/reference/items/traits.html)
- [Rust Standard Library Traits](https://doc.rust-lang.org/std/index.html#traits)
- [Rustonomicon: Subtyping and Variance](https://doc.rust-lang.org/nomicon/subtyping.html)
- [Trait Objects vs. Generic Parameters](https://brson.github.io/rust-anthology/1/traits-and-trait-objects.html)
- [Effective Rust: Understanding Traits and Trait Objects](https://github.com/pretzelhammer/rust-blog/blob/master/posts/tour-of-rusts-standard-library-traits.md)
- [Type-Driven API Design in Rust](https://www.youtube.com/watch?v=bnnacleqg6k)
