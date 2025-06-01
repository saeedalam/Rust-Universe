# Chapter 11: Structs and Custom Types

## Introduction

In the previous chapters, we've worked with Rust's built-in types like integers, booleans, and strings. Now, it's time to explore how Rust allows you to create your own custom types to model the specific concepts in your programs.

Structs are the primary way to create custom data types in Rust. They let you package multiple related values into a meaningful unit, giving your code more organization and clarity. When you need to represent real-world entities like users, products, or geometric shapes in your code, structs provide the ideal mechanism to do so.

In this chapter, we'll explore:

- Defining and instantiating structs
- Field initialization shorthand
- Struct update syntax
- Tuple structs and unit structs
- Methods and associated functions
- The self parameter
- Builder patterns for complex initialization
- Memory layout of structs
- Struct composition and code reuse
- Debug and display formatting for structs

By the end of this chapter, you'll be able to design and implement custom types that accurately model your problem domain and provide a solid foundation for your Rust applications.

## Defining and Instantiating Structs

A struct is a custom data type that lets you name and package multiple related values. Each piece of data in a struct is called a _field_.

### Basic Struct Definition

```rust
struct User {
    username: String,
    email: String,
    sign_in_count: u64,
    active: bool,
}
```

This defines a `User` struct with four fields: `username`, `email`, `sign_in_count`, and `active`. Each field has a name and a type, allowing Rust to know what data will be stored in each field.

### Creating Struct Instances

To use a struct, we create an _instance_ of it by specifying concrete values for each field:

```rust
fn main() {
    let user1 = User {
        email: String::from("someone@example.com"),
        username: String::from("someusername123"),
        active: true,
        sign_in_count: 1,
    };

    // Access a field using dot notation
    println!("Username: {}", user1.username);

    // Create a mutable struct instance to modify fields
    let mut user2 = User {
        email: String::from("another@example.com"),
        username: String::from("anotherusername567"),
        active: true,
        sign_in_count: 3,
    };

    // Change a field's value
    user2.email = String::from("newemail@example.com");
    println!("New email: {}", user2.email);
}
```

When creating an instance, you must provide values for all fields. The fields can be specified in any order, regardless of how they were defined in the struct.

### Field Access and Mutability

You can access a struct's fields using dot notation: `instance.field_name`. Just like with other variables in Rust, struct instances are immutable by default. To modify fields, you need to create a mutable instance using the `mut` keyword.

It's important to note that Rust doesn't allow marking only certain fields as mutable – mutability applies to the entire instance.

## Field Init Shorthand

When variable names and struct field names are exactly the same, you can use the _field init shorthand_ syntax to make your code more concise:

```rust
fn build_user(email: String, username: String) -> User {
    User {
        email,      // Instead of email: email,
        username,   // Instead of username: username,
        active: true,
        sign_in_count: 1,
    }
}

fn main() {
    let user = build_user(
        String::from("user@example.com"),
        String::from("user123"),
    );

    println!("New user: {} ({})", user.username, user.email);
}
```

This shorthand is particularly useful in functions that take parameters and use them to create struct instances, making your code cleaner and more readable.

## Struct Update Syntax

The struct update syntax allows you to create a new struct instance that uses most of an old instance's values but changes some:

```rust
fn main() {
    let user1 = User {
        email: String::from("someone@example.com"),
        username: String::from("someusername123"),
        active: true,
        sign_in_count: 1,
    };

    // Create user2 from user1, but with a different email
    let user2 = User {
        email: String::from("another@example.com"),
        ..user1  // Copy the remaining fields from user1
    };

    println!("user2 active: {}", user2.active);
    println!("user2 sign-in count: {}", user2.sign_in_count);
}
```

The `..user1` syntax is called _struct update syntax_ and specifies that the remaining fields should have the same values as the corresponding fields in `user1`. This syntax must come last in the struct initialization to specify that any remaining fields should get their values from the corresponding fields in the given instance.

### Ownership Considerations

The struct update syntax follows Rust's ownership rules. For fields that implement the `Copy` trait (like integers), the values are copied. For fields that don't implement `Copy` (like `String`), ownership is moved:

```rust
fn main() {
    let user1 = User {
        email: String::from("someone@example.com"),
        username: String::from("someusername123"),
        active: true,
        sign_in_count: 1,
    };

    let user2 = User {
        email: String::from("another@example.com"),
        ..user1  // Copy the remaining fields from user1
    };

    // Error: user1.username has been moved to user2
    // println!("user1's username: {}", user1.username);

    // This is fine - active is a bool which implements Copy
    println!("user1's active status: {}", user1.active);
}
```

In this example, `user1.username` is moved to `user2`, so `user1` can no longer access its `username` field after creating `user2`. However, `user1` can still access its `active` and `sign_in_count` fields because they implement the `Copy` trait.

## Tuple Structs and Unit Structs

Rust offers a few variations of structs for different situations:

### Tuple Structs

Tuple structs are named tuples that have a name for the type but don't name their fields. They're useful when you want to give a tuple a distinct type name and make it different from other tuples with the same field types:

```rust
struct Color(i32, i32, i32);
struct Point(i32, i32, i32);

fn main() {
    let black = Color(0, 0, 0);
    let origin = Point(0, 0, 0);

    // Access fields using tuple indexing
    println!("Black's blue component: {}", black.2);
    println!("Origin's y-coordinate: {}", origin.1);

    // black and origin are different types, even though they have the same structure
    // The following would cause a type error:
    // let color_point: Color = origin;
}
```

Even though `Color` and `Point` have the same structure (three `i32` values), they are different types. This is useful when you want type safety for conceptually different values.

Tuple structs are particularly helpful in these situations:

- When naming each field would be verbose or redundant
- When you need the tuple to have its own type
- When you're implementing a trait on the tuple

### Unit Structs

Unit structs are structs without any fields. They're useful for implementing traits on some type without storing any data:

```rust
struct AlwaysEqual;

fn main() {
    let subject = AlwaysEqual;

    // You might implement traits on this type:
    // impl SomeTrait for AlwaysEqual { ... }
}
```

Unit structs are rare but can be useful in these situations:

- When you need a type to implement a trait but don't need to store any data
- When you want to create a type for type-checking purposes
- When you're using the type as a marker

## Memory Layout of Structs

Understanding how structs are laid out in memory can help you write more efficient code and is especially important when interfacing with other languages or hardware.

### Basic Memory Layout

By default, Rust structs are laid out in memory with their fields in the order they are declared, with potential padding between fields for alignment:

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    let rect = Rectangle {
        width: 30,
        height: 50,
    };

    println!("Rectangle size: {} bytes", std::mem::size_of::<Rectangle>());
    println!("u32 size: {} bytes", std::mem::size_of::<u32>());
}
```

This will print:

```
Rectangle size: 8 bytes
u32 size: 4 bytes
```

The size of the `Rectangle` struct is 8 bytes because it contains two `u32` fields, each taking 4 bytes.

### Field Alignment and Padding

Rust aligns fields to optimize memory access, which might introduce padding between fields:

```rust
struct Aligned {
    a: u8,    // 1 byte
    b: u32,   // 4 bytes
    c: u16,   // 2 bytes
}

struct Optimized {
    a: u32,   // 4 bytes
    c: u16,   // 2 bytes
    b: u8,    // 1 byte
}

fn main() {
    println!("Aligned size: {} bytes", std::mem::size_of::<Aligned>());
    println!("Optimized size: {} bytes", std::mem::size_of::<Optimized>());
}
```

The `Aligned` struct will likely be larger than the sum of its fields due to padding, while the `Optimized` struct minimizes padding by ordering fields from largest to smallest.

### Controlling Memory Layout

Rust provides attributes to control struct memory layout:

```rust
// Force C-compatible memory layout
#[repr(C)]
struct CCompatible {
    a: u8,
    b: u32,
}

// Pack fields without padding
#[repr(packed)]
struct Packed {
    a: u8,
    b: u32,
}

fn main() {
    println!("CCompatible size: {} bytes", std::mem::size_of::<CCompatible>());
    println!("Packed size: {} bytes", std::mem::size_of::<Packed>());
}
```

The `#[repr(C)]` attribute ensures the struct has the same layout as a C struct would have, which is important for FFI (Foreign Function Interface). The `#[repr(packed)]` attribute eliminates padding, which can save memory but may reduce access speed on some architectures.

### Memory Layout Considerations

When designing structs, consider these memory-related factors:

1. **Field ordering**: Arranging fields from largest to smallest can reduce padding
2. **Cache locality**: Fields accessed together should be placed close to each other
3. **Alignment requirements**: Some hardware requires aligned access for optimal performance
4. **Memory usage**: For large collections of structs, minimizing size can be important

## Methods and Associated Functions

Now that we can create custom data types with structs, let's add behavior to them using methods and associated functions.

### Defining Methods

Methods are similar to functions but are defined within the context of a struct (or enum, or trait). Their first parameter is always `self`, which represents the instance of the struct the method is being called on:

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    // Method that calculates the area of a rectangle
    fn area(&self) -> u32 {
        self.width * self.height
    }

    // Method that checks if this rectangle can contain another
    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }
}

fn main() {
    let rect1 = Rectangle {
        width: 30,
        height: 50,
    };

    println!("Area: {}", rect1.area());

    let rect2 = Rectangle {
        width: 10,
        height: 40,
    };

    println!("Can rect1 hold rect2? {}", rect1.can_hold(&rect2));
}
```

The `impl` (implementation) block contains all the methods for the specified type. Methods are called using dot notation: `instance.method()`.

### Method Benefits

Methods offer several advantages over standalone functions:

1. **Organization**: Methods are grouped with the type they operate on
2. **Namespace management**: Methods are scoped to their type, reducing global namespace pollution
3. **Ergonomics**: When calling methods, Rust handles borrowing and dereferencing automatically
4. **Encapsulation**: Methods can access private fields of their struct
5. **Polymorphism**: Different types can implement methods with the same name (which we'll explore with traits in later chapters)

### Multiple `impl` Blocks

You can have multiple `impl` blocks for a single struct, which can help organize related methods:

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

// Basic geometric methods
impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }

    fn perimeter(&self) -> u32 {
        2 * (self.width + self.height)
    }
}

// Comparison methods
impl Rectangle {
    fn is_square(&self) -> bool {
        self.width == self.height
    }

    fn is_larger_than(&self, other: &Rectangle) -> bool {
        self.area() > other.area()
    }
}

fn main() {
    let rect = Rectangle {
        width: 30,
        height: 30,
    };

    println!("Area: {}", rect.area());
    println!("Perimeter: {}", rect.perimeter());
    println!("Is square? {}", rect.is_square());
}
```

This separation can be useful for organizing your code, particularly when implementing traits or working on large codebases with many methods.

## Associated Functions

Associated functions are functions defined within an `impl` block that don't take `self` as a parameter. They're associated with the type rather than with instances of the type.

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    // Associated function that creates a square
    fn square(size: u32) -> Rectangle {
        Rectangle {
            width: size,
            height: size,
        }
    }

    // Instance method
    fn area(&self) -> u32 {
        self.width * self.height
    }
}

fn main() {
    // Call an associated function using ::
    let square = Rectangle::square(25);

    // Call a method using .
    println!("Square area: {}", square.area());
}
```

Associated functions are called with the struct name and the `::` syntax, rather than with an instance and the `.` syntax.

### Constructor Pattern

Associated functions are commonly used to create "constructor" functions that return new instances of the type:

```rust
struct Point {
    x: f64,
    y: f64,
}

impl Point {
    // Constructor for the origin point
    fn origin() -> Self {
        Point { x: 0.0, y: 0.0 }
    }

    // Constructor with coordinates
    fn new(x: f64, y: f64) -> Self {
        Point { x, y }
    }

    // Constructor for a point on the x-axis
    fn on_x_axis(x: f64) -> Self {
        Point { x, y: 0.0 }
    }

    // Constructor for a point on the y-axis
    fn on_y_axis(y: f64) -> Self {
        Point { x: 0.0, y }
    }
}

fn main() {
    let origin = Point::origin();
    let point1 = Point::new(5.0, 10.0);
    let point2 = Point::on_x_axis(15.0);
    let point3 = Point::on_y_axis(7.5);

    println!("Origin: ({}, {})", origin.x, origin.y);
    println!("Point 1: ({}, {})", point1.x, point1.y);
    println!("Point 2: ({}, {})", point2.x, point2.y);
    println!("Point 3: ({}, {})", point3.x, point3.y);
}
```

This pattern provides a clear and consistent way to create instances of your types, especially when there are multiple ways to initialize a struct.

## The Self Parameter

When defining methods, you can use different variations of `self`:

- `&self`: Borrows the instance immutably
- `&mut self`: Borrows the instance mutably
- `self`: Takes ownership of the instance
- `Self`: Refers to the type, not an instance (used in return types and associated functions)

```rust
struct Counter {
    value: u32,
}

impl Counter {
    // Constructor (associated function)
    fn new() -> Self {
        Counter { value: 0 }
    }

    // Immutable borrow - read-only access
    fn get(&self) -> u32 {
        self.value
    }

    // Mutable borrow - can modify the instance
    fn increment(&mut self) {
        self.value += 1;
    }

    // Takes ownership and returns a new Counter
    fn reset(self) -> Self {
        Counter { value: 0 }
    }

    // Takes ownership and consumes the Counter
    fn destroy(self) {
        println!("Counter with value {} destroyed", self.value);
    }
}

fn main() {
    let mut counter = Counter::new();

    counter.increment();
    counter.increment();
    println!("Value: {}", counter.get());

    // Reset returns a new Counter
    counter = counter.reset();
    println!("Value after reset: {}", counter.get());

    // Destroy consumes the Counter
    counter.destroy();

    // Error: counter has been moved
    // println!("Value: {}", counter.get());
}
```

### Choosing the Right Self Parameter

Selecting the appropriate `self` parameter depends on what your method needs to do:

1. **`&self` (immutable reference)**: Use when you only need to read values from the instance. This is the most common form and allows multiple references to the instance simultaneously.

2. **`&mut self` (mutable reference)**: Use when you need to modify the instance without taking ownership. This allows modifying the instance while still leaving it valid for further use.

3. **`self` (owned value)**: Use when the method consumes the instance, either transforming it into something else or performing cleanup. After calling such a method, the original instance is no longer available.

4. **`Self` (type name)**: Use in return types or associated functions to refer to the type itself rather than an instance.

### Method Chaining

Using the right `self` parameter enables method chaining, a common pattern in Rust:

```rust
struct StringBuilder {
    content: String,
}

impl StringBuilder {
    fn new() -> Self {
        StringBuilder {
            content: String::new(),
        }
    }

    // Returns self to enable chaining
    fn append(mut self, text: &str) -> Self {
        self.content.push_str(text);
        self
    }

    fn append_line(mut self, text: &str) -> Self {
        self.content.push_str(text);
        self.content.push('\n');
        self
    }

    fn build(self) -> String {
        self.content
    }
}

fn main() {
    let text = StringBuilder::new()
        .append("Hello, ")
        .append("world")
        .append_line("!")
        .append("Welcome to ")
        .append("Rust")
        .build();

    println!("{}", text);
}
```

This pattern creates a fluent interface that makes code more readable and expressive. The key is that each method returns `self` to allow the next method call in the chain.

## Builder Patterns for Complex Initialization

When structs have many fields, especially optional ones, creating instances directly can become unwieldy. The Builder pattern provides a more flexible and readable approach to complex object construction.

### The Problem with Complex Initialization

Consider a struct with many fields, some of which might be optional:

```rust
struct Server {
    host: String,
    port: u16,
    workers: u32,
    timeout: u32,
    connection_retries: u32,
    tls_enabled: bool,
    max_connections: Option<u32>,
    database_url: Option<String>,
}

fn main() {
    // Direct initialization is verbose and error-prone
    let server = Server {
        host: String::from("example.com"),
        port: 8080,
        workers: 4,
        timeout: 30,
        connection_retries: 3,
        tls_enabled: true,
        max_connections: Some(1000),
        database_url: None,
    };
}
```

This approach has several drawbacks:

- It's error-prone (easy to mix up parameter order)
- Hard to tell which parameters are required vs. optional
- Difficult to provide default values
- Doesn't allow for input validation during construction

### Implementing the Builder Pattern

The Builder pattern addresses these issues by providing a step-by-step construction process:

```rust
#[derive(Debug)]
struct Server {
    host: String,
    port: u16,
    workers: u32,
    timeout: u32,
    connection_retries: u32,
    tls_enabled: bool,
    max_connections: Option<u32>,
    database_url: Option<String>,
}

impl Server {
    fn builder() -> ServerBuilder {
        ServerBuilder::default()
    }
}

#[derive(Default)]
struct ServerBuilder {
    host: Option<String>,
    port: Option<u16>,
    workers: Option<u32>,
    timeout: Option<u32>,
    connection_retries: Option<u32>,
    tls_enabled: Option<bool>,
    max_connections: Option<u32>,
    database_url: Option<String>,
}

impl ServerBuilder {
    fn host(mut self, host: impl Into<String>) -> Self {
        self.host = Some(host.into());
        self
    }

    fn port(mut self, port: u16) -> Self {
        self.port = Some(port);
        self
    }

    fn workers(mut self, workers: u32) -> Self {
        self.workers = Some(workers);
        self
    }

    fn timeout(mut self, timeout: u32) -> Self {
        self.timeout = Some(timeout);
        self
    }

    fn connection_retries(mut self, retries: u32) -> Self {
        self.connection_retries = Some(retries);
        self
    }

    fn tls_enabled(mut self, enabled: bool) -> Self {
        self.tls_enabled = Some(enabled);
        self
    }

    fn max_connections(mut self, max: u32) -> Self {
        self.max_connections = Some(max);
        self
    }

    fn database_url(mut self, url: impl Into<String>) -> Self {
        self.database_url = Some(url.into());
        self
    }

    fn build(self) -> Result<Server, String> {
        // Required fields
        let host = self.host.ok_or("Host is required")?;

        // Fields with default values
        let port = self.port.unwrap_or(80);
        let workers = self.workers.unwrap_or(4);
        let timeout = self.timeout.unwrap_or(30);
        let connection_retries = self.connection_retries.unwrap_or(3);
        let tls_enabled = self.tls_enabled.unwrap_or(false);

        // Optional fields
        let max_connections = self.max_connections;
        let database_url = self.database_url;

        // Validation logic
        if workers == 0 {
            return Err("Workers must be greater than 0".into());
        }

        Ok(Server {
            host,
            port,
            workers,
            timeout,
            connection_retries,
            tls_enabled,
            max_connections,
            database_url,
        })
    }
}

fn main() {
    // Using the builder pattern for flexible construction
    let server = Server::builder()
        .host("example.com")
        .port(8080)
        .workers(8)
        .tls_enabled(true)
        .max_connections(1000)
        .build()
        .expect("Failed to build server");

    println!("Server: {:?}", server);

    // Default values are used for timeout and connection_retries
    let simple_server = Server::builder()
        .host("simple.example.com")
        .build()
        .expect("Failed to build server");

    println!("Simple server: {:?}", simple_server);
}
```

### Benefits of the Builder Pattern

The Builder pattern provides several advantages:

1. **Readability**: Makes complex object creation more readable with named methods
2. **Flexible construction**: Only specify the parameters you care about
3. **Default values**: Automatically use sensible defaults for unspecified fields
4. **Validation**: Check inputs and ensure invariants before creating the object
5. **Immutability**: Create immutable objects after construction
6. **Fluent interface**: Enable method chaining for a more expressive API
7. **Separation of concerns**: Keep construction logic separate from the object itself

### When to Use the Builder Pattern

Consider using the Builder pattern when:

- Your struct has many fields (especially optional ones)
- You need to enforce validation rules during construction
- You want to provide sensible defaults for most parameters
- You need a clear, readable API for object construction

## Struct Composition and Code Reuse

Rust doesn't have inheritance like object-oriented languages, but it provides powerful composition mechanisms for code reuse and modeling complex domains.

### Basic Composition

The simplest form of composition is including one struct as a field in another:

```rust
struct Point {
    x: f64,
    y: f64,
}

struct Circle {
    center: Point,
    radius: f64,
}

struct Rectangle {
    top_left: Point,
    bottom_right: Point,
}

fn main() {
    let circle = Circle {
        center: Point { x: 0.0, y: 0.0 },
        radius: 5.0,
    };

    let rectangle = Rectangle {
        top_left: Point { x: -3.0, y: 2.0 },
        bottom_right: Point { x: 3.0, y: -2.0 },
    };

    println!("Circle center: ({}, {}), radius: {}",
             circle.center.x, circle.center.y, circle.radius);

    println!("Rectangle corners: ({}, {}), ({}, {})",
             rectangle.top_left.x, rectangle.top_left.y,
             rectangle.bottom_right.x, rectangle.bottom_right.y);
}
```

### Delegation Methods

You can implement methods that delegate to the composed structs:

```rust
struct Point {
    x: f64,
    y: f64,
}

impl Point {
    fn new(x: f64, y: f64) -> Self {
        Point { x, y }
    }

    fn distance_to(&self, other: &Point) -> f64 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        (dx * dx + dy * dy).sqrt()
    }
}

struct Circle {
    center: Point,
    radius: f64,
}

impl Circle {
    fn new(x: f64, y: f64, radius: f64) -> Self {
        Circle {
            center: Point::new(x, y),
            radius,
        }
    }

    fn area(&self) -> f64 {
        std::f64::consts::PI * self.radius * self.radius
    }

    // Delegating to Point's method
    fn distance_to_point(&self, point: &Point) -> f64 {
        self.center.distance_to(point)
    }

    fn contains_point(&self, point: &Point) -> bool {
        self.distance_to_point(point) <= self.radius
    }
}

fn main() {
    let circle = Circle::new(0.0, 0.0, 5.0);
    let point1 = Point::new(3.0, 4.0);
    let point2 = Point::new(10.0, 10.0);

    println!("Circle area: {:.2}", circle.area());
    println!("Point1 distance to circle center: {:.2}",
             circle.distance_to_point(&point1));

    println!("Circle contains point1: {}", circle.contains_point(&point1));
    println!("Circle contains point2: {}", circle.contains_point(&point2));
}
```

### Component-Based Design

For more complex systems, you can use a component-based approach where a main struct contains optional components:

```rust
struct Position {
    x: f32,
    y: f32,
}

struct Velocity {
    dx: f32,
    dy: f32,
}

struct Renderable {
    sprite_id: u32,
    visible: bool,
}

struct Collider {
    width: f32,
    height: f32,
    solid: bool,
}

struct GameObject {
    id: u32,
    position: Position,
    velocity: Option<Velocity>,
    renderable: Option<Renderable>,
    collider: Option<Collider>,
}

impl GameObject {
    fn new(id: u32, x: f32, y: f32) -> Self {
        GameObject {
            id,
            position: Position { x, y },
            velocity: None,
            renderable: None,
            collider: None,
        }
    }

    fn with_velocity(mut self, dx: f32, dy: f32) -> Self {
        self.velocity = Some(Velocity { dx, dy });
        self
    }

    fn with_renderable(mut self, sprite_id: u32) -> Self {
        self.renderable = Some(Renderable {
            sprite_id,
            visible: true,
        });
        self
    }

    fn with_collider(mut self, width: f32, height: f32, solid: bool) -> Self {
        self.collider = Some(Collider {
            width,
            height,
            solid,
        });
        self
    }

    fn update(&mut self) {
        // Update position based on velocity if it exists
        if let Some(velocity) = &self.velocity {
            self.position.x += velocity.dx;
            self.position.y += velocity.dy;
        }
    }
}

fn main() {
    // Create different types of game objects with varying components
    let mut player = GameObject::new(1, 10.0, 10.0)
        .with_velocity(0.5, 0.0)
        .with_renderable(100)
        .with_collider(1.0, 2.0, true);

    let mut obstacle = GameObject::new(2, 20.0, 10.0)
        .with_renderable(200)
        .with_collider(3.0, 3.0, true);

    let mut pickup = GameObject::new(3, 15.0, 15.0)
        .with_renderable(300)
        .with_collider(0.5, 0.5, false);

    // Update all objects
    player.update();
    obstacle.update();
    pickup.update();

    println!("Player position: ({}, {})", player.position.x, player.position.y);
}
```

This approach is flexible and allows you to:

- Create entities with only the components they need
- Add or remove components at runtime
- Process entities based on which components they have

### Benefits of Composition

Composition offers several advantages over inheritance:

1. **Flexibility**: Mix and match components as needed
2. **Clarity**: Explicit relationships between types
3. **Testability**: Easier to test individual components
4. **Evolution**: Easier to change implementations without breaking code
5. **Performance**: Only include what you need, no overhead

## Debug and Display Formatting for Structs

When working with custom types, you'll often want to display them in a readable format for debugging or user output.

### Debug Formatting with #[derive(Debug)]

The simplest way to make a struct printable for debugging is to derive the `Debug` trait:

```rust
#[derive(Debug)]
struct Person {
    name: String,
    age: u32,
}

fn main() {
    let person = Person {
        name: String::from("Alice"),
        age: 30,
    };

    // Print using Debug formatting
    println!("Person: {:?}", person);

    // Pretty-print with {:#?}
    println!("Person (pretty):\n{:#?}", person);
}
```

This produces output like:

```
Person: Person { name: "Alice", age: 30 }
Person (pretty):
Person {
    name: "Alice",
    age: 30,
}
```

The `Debug` trait is essential for:

- Development and debugging
- Testing (when comparing expected and actual values)
- Logging and error reporting

### Custom Debug Implementation

If you need more control over the debug output, you can implement `Debug` manually:

```rust
use std::fmt;

struct ComplexNumber {
    real: f64,
    imaginary: f64,
}

impl fmt::Debug for ComplexNumber {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if f.alternate() {
            // Pretty format with #
            write!(f, "ComplexNumber {{\n    real: {},\n    imaginary: {}\n}}",
                   self.real, self.imaginary)
        } else {
            // Compact format
            write!(f, "{}{}{}i",
                   self.real,
                   if self.imaginary >= 0.0 { "+" } else { "" },
                   self.imaginary)
        }
    }
}

fn main() {
    let complex = ComplexNumber { real: 3.0, imaginary: -4.5 };

    println!("Complex number: {:?}", complex);  // Prints: 3+-4.5i
    println!("Complex number: {:#?}", complex); // Prints prettier multi-line format
}
```

### Display Formatting

While `Debug` is meant for developers, the `Display` trait is designed for end-user output:

```rust
use std::fmt;

struct Point {
    x: i32,
    y: i32,
}

impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

fn main() {
    let point = Point { x: 10, y: 20 };

    // Using Display format
    println!("Point: {}", point);  // Prints: Point: (10, 20)
}
```

### Combining Debug and Display

Most types should implement both traits for different use cases:

```rust
use std::fmt;

#[derive(Debug)]
struct Rectangle {
    width: u32,
    height: u32,
}

impl fmt::Display for Rectangle {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}×{} rectangle", self.width, self.height)
    }
}

fn main() {
    let rect = Rectangle { width: 30, height: 50 };

    // Debug formatting (for developers)
    println!("Debug: {:?}", rect);

    // Display formatting (for users)
    println!("Display: {}", rect);
}
```

This prints:

```
Debug: Rectangle { width: 30, height: 50 }
Display: 30×50 rectangle
```

### Formatting Special Cases

For special types like collections or complex structures, consider what makes sense for your users:

```rust
use std::fmt;

struct Cart {
    items: Vec<String>,
    total: f64,
}

impl fmt::Display for Cart {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "Shopping Cart:")?;

        if self.items.is_empty() {
            writeln!(f, "  (empty)")?;
        } else {
            for item in &self.items {
                writeln!(f, "  - {}", item)?;
            }
        }

        writeln!(f, "Total: ${:.2}", self.total)
    }
}

fn main() {
    let cart = Cart {
        items: vec![
            "Apple".to_string(),
            "Banana".to_string(),
            "Orange".to_string(),
        ],
        total: 12.75,
    };

    println!("{}", cart);
}
```

### Using toString() and to_string()

Types that implement `Display` automatically get a `to_string()` method:

```rust
#[derive(Debug)]
struct Temperature {
    degrees: f64,
    scale: char,  // 'C' for Celsius, 'F' for Fahrenheit
}

impl fmt::Display for Temperature {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:.1}°{}", self.degrees, self.scale)
    }
}

fn main() {
    let temp = Temperature { degrees: 22.5, scale: 'C' };

    // Using to_string() for string conversion
    let temp_string = temp.to_string();
    println!("Temperature string: {}", temp_string);

    // Using with functions that expect strings
    let message = format!("Current temperature is {}", temp);
    println!("{}", message);
}
```

## 🔨 Project: Library Management System

Let's apply what we've learned to build a simple library management system. This project demonstrates how to use structs, methods, and composition to model books and users.

```rust
use std::fmt;
use std::collections::HashMap;

// Book struct to represent library books
#[derive(Debug, Clone)]
struct Book {
    title: String,
    author: String,
    isbn: String,
    available: bool,
}

// User struct to represent library members
#[derive(Debug)]
struct User {
    name: String,
    id: u32,
    borrowed_books: Vec<String>, // ISBNs of borrowed books
}

// Library struct to manage books and users
struct Library {
    books: HashMap<String, Book>,
    users: HashMap<u32, User>,
    next_user_id: u32,
}

// Implement methods for the Book struct
impl Book {
    fn new(title: String, author: String, isbn: String) -> Self {
        Book {
            title,
            author,
            isbn,
            available: true,
        }
    }
}

// Implement Display for Book
impl fmt::Display for Book {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "\"{}\" by {}", self.title, self.author)?;
        if !self.available {
            write!(f, " (Checked Out)")?;
        }
        Ok(())
    }
}

// Implement methods for the User struct
impl User {
    fn new(name: String, id: u32) -> Self {
        User {
            name,
            id,
            borrowed_books: Vec::new(),
        }
    }

    fn borrow_book(&mut self, isbn: String) {
        self.borrowed_books.push(isbn);
    }

    fn return_book(&mut self, isbn: &str) -> Result<(), String> {
        if let Some(index) = self.borrowed_books.iter().position(|book_isbn| book_isbn == isbn) {
            self.borrowed_books.remove(index);
            Ok(())
        } else {
            Err(format!("User {} has not borrowed book with ISBN {}", self.name, isbn))
        }
    }
}

// Implement methods for the Library struct
impl Library {
    fn new() -> Self {
        Library {
            books: HashMap::new(),
            users: HashMap::new(),
            next_user_id: 1,
        }
    }

    fn add_book(&mut self, book: Book) {
        self.books.insert(book.isbn.clone(), book);
    }

    fn register_user(&mut self, name: String) -> u32 {
        let id = self.next_user_id;
        let user = User::new(name, id);
        self.users.insert(id, user);
        self.next_user_id += 1;
        id
    }

    fn checkout_book(&mut self, user_id: u32, isbn: &str) -> Result<(), String> {
        // Check if the book exists and is available
        let book = self.books.get_mut(isbn)
            .ok_or(format!("Book with ISBN {} not found", isbn))?;

        if !book.available {
            return Err(format!("Book \"{}\" is already checked out", book.title));
        }

        // Check if the user exists
        let user = self.users.get_mut(&user_id)
            .ok_or(format!("User with ID {} not found", user_id))?;

        // Update the book and user
        book.available = false;
        user.borrow_book(isbn.to_string());

        Ok(())
    }

    fn return_book(&mut self, user_id: u32, isbn: &str) -> Result<(), String> {
        // Check if the user exists
        let user = self.users.get_mut(&user_id)
            .ok_or(format!("User with ID {} not found", user_id))?;

        // Try to return the book
        user.return_book(isbn)?;

        // Update the book's availability
        let book = self.books.get_mut(isbn)
            .ok_or(format!("Book with ISBN {} not found", isbn))?;

        book.available = true;

        Ok(())
    }

    fn list_available_books(&self) -> Vec<&Book> {
        self.books.values()
            .filter(|book| book.available)
            .collect()
    }

    fn list_user_books(&self, user_id: u32) -> Result<Vec<&Book>, String> {
        let user = self.users.get(&user_id)
            .ok_or(format!("User with ID {} not found", user_id))?;

        let borrowed_books = user.borrowed_books.iter()
            .filter_map(|isbn| self.books.get(isbn))
            .collect();

        Ok(borrowed_books)
    }
}

fn main() {
    // Create a new library
    let mut library = Library::new();

    // Add some books
    library.add_book(Book::new(
        "The Rust Programming Language".to_string(),
        "Steve Klabnik and Carol Nichols".to_string(),
        "978-1593278281".to_string()
    ));

    library.add_book(Book::new(
        "Programming Rust".to_string(),
        "Jim Blandy and Jason Orendorff".to_string(),
        "978-1491927281".to_string()
    ));

    library.add_book(Book::new(
        "Rust in Action".to_string(),
        "Tim McNamara".to_string(),
        "978-1617294556".to_string()
    ));

    // Register some users
    let alice_id = library.register_user("Alice".to_string());
    let bob_id = library.register_user("Bob".to_string());

    // List available books
    println!("Available books:");
    for book in library.list_available_books() {
        println!("  {}", book);
    }

    // Alice checks out a book
    println!("\nAlice checks out 'The Rust Programming Language'");
    match library.checkout_book(alice_id, "978-1593278281") {
        Ok(_) => println!("Checkout successful"),
        Err(e) => println!("Error: {}", e),
    }

    // Bob tries to check out the same book
    println!("\nBob tries to check out 'The Rust Programming Language'");
    match library.checkout_book(bob_id, "978-1593278281") {
        Ok(_) => println!("Checkout successful"),
        Err(e) => println!("Error: {}", e),
    }

    // Bob checks out another book
    println!("\nBob checks out 'Programming Rust'");
    match library.checkout_book(bob_id, "978-1491927281") {
        Ok(_) => println!("Checkout successful"),
        Err(e) => println!("Error: {}", e),
    }

    // List Alice's books
    println!("\nAlice's borrowed books:");
    match library.list_user_books(alice_id) {
        Ok(books) => {
            for book in books {
                println!("  {}", book);
            }
        },
        Err(e) => println!("Error: {}", e),
    }

    // List Bob's books
    println!("\nBob's borrowed books:");
    match library.list_user_books(bob_id) {
        Ok(books) => {
            for book in books {
                println!("  {}", book);
            }
        },
        Err(e) => println!("Error: {}", e),
    }

    // Alice returns her book
    println!("\nAlice returns 'The Rust Programming Language'");
    match library.return_book(alice_id, "978-1593278281") {
        Ok(_) => println!("Return successful"),
        Err(e) => println!("Error: {}", e),
    }

    // List available books again
    println!("\nAvailable books after returns:");
    for book in library.list_available_books() {
        println!("  {}", book);
    }
}
```

This project demonstrates several key concepts from this chapter:

1. **Struct Definitions**: We created three custom types (`Book`, `User`, and `Library`) to model our domain
2. **Methods**: Each struct has methods that define its behavior
3. **Error Handling**: We return `Result` types for operations that might fail
4. **Trait Implementation**: We implemented `Display` for the `Book` type
5. **Composition**: The `Library` struct contains collections of `Book` and `User` instances
6. **Data Organization**: We used appropriate collections (HashMap, Vec) to store and retrieve data efficiently

You could expand this project by:

- Adding book categories or genres
- Implementing due dates and late fees
- Adding a search function by title or author
- Creating different membership levels with varying borrowing limits

## Summary

In this chapter, we've explored Rust's structs and custom types, essential tools for modeling domain-specific concepts in your programs. We've covered:

- Defining and instantiating structs to create custom data types
- Field initialization shorthand for cleaner, more concise code
- Struct update syntax for creating new instances based on existing ones
- Tuple structs and unit structs for specialized use cases
- Memory layout considerations for performance optimization
- Methods and associated functions to add behavior to types
- The different variants of the `self` parameter and when to use each
- Builder patterns for clean and flexible object creation
- Struct composition for code reuse and complex modeling
- Debug and Display formatting for user-friendly output

Structs are one of Rust's most powerful features, allowing you to create custom types that precisely model your problem domain. When combined with methods, they enable you to write clean, maintainable, and expressive code that clearly communicates your intent.

In the next chapter, we'll explore enums and pattern matching, which complement structs by allowing you to define types that can be one of several variants, along with powerful ways to extract and work with those variants.

## Exercises

1. Create a `Point3D` struct with `x`, `y`, and `z` fields, and implement methods to calculate distance to another point and to the origin.

2. Design a `Rectangle` struct with methods to calculate area, perimeter, and to check if it contains a given point.

3. Implement a `Temperature` struct that can convert between Celsius, Fahrenheit, and Kelvin scales.

4. Create a `ShoppingCart` struct with methods to add items, remove items, and calculate the total price.

5. Design a `Matrix` struct for 2x2 matrices with methods for addition, subtraction, multiplication, and determinant calculation.

6. Implement the builder pattern for a `NetworkConnection` struct with various configuration options.

7. Enhance the library management system project by adding:
   - A method to search for books by title or author
   - A book reservation system
   - A fine system for overdue books
   - Reports on most popular books

## Further Reading

- [The Rust Book: Structs](https://doc.rust-lang.org/book/ch05-00-structs.html)
- [The Rust Book: Method Syntax](https://doc.rust-lang.org/book/ch05-03-method-syntax.html)
- [Rust By Example: Structs](https://doc.rust-lang.org/rust-by-example/custom_types/structs.html)
- [Rust Design Patterns: Builder Pattern](https://rust-unofficial.github.io/patterns/patterns/creational/builder.html)
- [The Rust Performance Book: Data Layout](https://nnethercote.github.io/perf-book/data-structures.html)
