# Chapter 12: Enums and Pattern Matching

In the previous chapter, we explored structs for creating custom data types that group related values. Now, we'll dive into enums (short for "enumerations"), another powerful way to create custom types in Rust. While structs are about grouping related fields together, enums are about defining a type that can be one of several variants.

Combined with pattern matching, enums become an incredibly expressive tool for modeling domain concepts, handling errors, and writing concise, maintainable code.

## Defining and Using Enums

An enum allows you to define a type by enumerating its possible variants. Let's start with a simple example:

```rust
enum Direction {
    North,
    East,
    South,
    West,
}

fn main() {
    let heading = Direction::North;

    // Using a function that takes a Direction
    describe_direction(heading);
}

fn describe_direction(direction: Direction) {
    match direction {
        Direction::North => println!("Heading north!"),
        Direction::East => println!("Heading east!"),
        Direction::South => println!("Heading south!"),
        Direction::West => println!("Heading west!"),
    }
}
```

Here, `Direction` is an enum with four variants. We can create a value of the `Direction` type by specifying one of its variants using the `::` syntax.

### Enums with Associated Data

Unlike enums in some other languages, Rust's enums can contain data associated with each variant:

```rust
enum Message {
    Quit,                       // No data
    Move { x: i32, y: i32 },    // Named fields like a struct
    Write(String),              // A single string value
    ChangeColor(i32, i32, i32), // Three integers
}

fn main() {
    let messages = [
        Message::Quit,
        Message::Move { x: 10, y: 5 },
        Message::Write(String::from("Hello, Rust!")),
        Message::ChangeColor(255, 0, 0),
    ];

    for msg in &messages {
        process_message(msg);
    }
}

fn process_message(message: &Message) {
    match message {
        Message::Quit => println!("Quitting the application"),
        Message::Move { x, y } => println!("Moving to position ({}, {})", x, y),
        Message::Write(text) => println!("Text message: {}", text),
        Message::ChangeColor(r, g, b) => println!("Changing color to RGB({}, {}, {})", r, g, b),
    }
}
```

In this example, each variant of the `Message` enum can hold different types and amounts of data. This makes enums very flexible for representing different types of messages in a system.

### Enum Methods with impl

Like structs, enums can have methods implemented on them:

```rust
enum Shape {
    Circle(f64),               // Radius
    Rectangle(f64, f64),       // Width and height
    Triangle(f64, f64, f64),   // Three sides
}

impl Shape {
    fn area(&self) -> f64 {
        match self {
            Shape::Circle(radius) => std::f64::consts::PI * radius * radius,
            Shape::Rectangle(width, height) => width * height,
            Shape::Triangle(a, b, c) => {
                // Heron's formula
                let s = (a + b + c) / 2.0;
                (s * (s - a) * (s - b) * (s - c)).sqrt()
            }
        }
    }

    fn describe(&self) {
        match self {
            Shape::Circle(_) => println!("A circle with area {:.2}", self.area()),
            Shape::Rectangle(_, _) => println!("A rectangle with area {:.2}", self.area()),
            Shape::Triangle(_, _, _) => println!("A triangle with area {:.2}", self.area()),
        }
    }
}

fn main() {
    let shapes = [
        Shape::Circle(5.0),
        Shape::Rectangle(4.0, 6.0),
        Shape::Triangle(3.0, 4.0, 5.0),
    ];

    for shape in &shapes {
        shape.describe();
    }
}
```

Here, we've implemented methods on the `Shape` enum to calculate the area of different shapes and to describe them.

## The Option Enum

One of the most useful enums in Rust's standard library is `Option<T>`. It's used to express the possibility of absence, replacing `null` or `nil` that exist in many other languages.

`Option<T>` is defined as:

```rust
enum Option<T> {
    Some(T),
    None,
}
```

Where `T` is a generic type parameter. `Option<T>` can either be `Some` with a value of type `T`, or `None`, representing the absence of a value.

Here's how to use it:

```rust
fn main() {
    let some_number = Some(5);
    let absent_number: Option<i32> = None;

    println!("some_number: {:?}", some_number);
    println!("absent_number: {:?}", absent_number);

    // Using map to transform the value inside Some
    let doubled = some_number.map(|x| x * 2);
    println!("doubled: {:?}", doubled);

    // Using unwrap_or to provide a default value
    let value = absent_number.unwrap_or(0);
    println!("value with default: {}", value);
}
```

The `Option<T>` enum is so common that it's included in the prelude, meaning you don't need to explicitly import it. The variants `Some` and `None` are also imported automatically.

### Why Option<T> is Better Than null

Rust doesn't have a `null` value like many other languages. Instead, the concept of an optional value is represented using the `Option<T>` enum. This has several advantages:

1. It makes the possibility of absence explicit in the type system
2. It forces you to handle the possibility of absence before using a value
3. It eliminates an entire class of errors: null pointer exceptions

Consider this example:

```rust
fn find_user_by_id(id: u32) -> Option<String> {
    // Simulating a database lookup
    match id {
        1 => Some(String::from("Alice")),
        2 => Some(String::from("Bob")),
        _ => None,
    }
}

fn greet_user(id: u32) {
    match find_user_by_id(id) {
        Some(name) => println!("Hello, {}!", name),
        None => println!("User not found."),
    }
}

fn main() {
    greet_user(1); // Prints: Hello, Alice!
    greet_user(3); // Prints: User not found.

    // This won't compile:
    // let name = find_user_by_id(1);
    // println!("Length: {}", name.len());

    // We must handle the Option first:
    if let Some(name) = find_user_by_id(1) {
        println!("Length: {}", name.len());
    }
}
```

In this example, the `find_user_by_id` function returns an `Option<String>`, making it clear that the user might not be found. The caller must explicitly handle both the `Some` and `None` cases before using the value.

### Working with Option<T>

The `Option<T>` enum has many useful methods for working with optional values:

```rust
fn main() {
    let numbers = vec![Some(1), None, Some(3), None, Some(5)];

    // Filter out None values and unwrap the Some values
    let filtered: Vec<i32> = numbers.iter()
        .filter_map(|&x| x)
        .collect();

    println!("Filtered: {:?}", filtered);

    let maybe_value = Some(42);

    // is_some() checks if the Option is Some
    if maybe_value.is_some() {
        println!("We have a value!");
    }

    // is_none() checks if the Option is None
    if maybe_value.is_none() {
        println!("We don't have a value.");
    }

    // unwrap() extracts the value from Some, but panics on None
    let value = maybe_value.unwrap();
    println!("Value: {}", value);

    // unwrap_or() provides a default value for None
    let empty: Option<i32> = None;
    let default_value = empty.unwrap_or(0);
    println!("Default value: {}", default_value);

    // unwrap_or_else() uses a closure to generate a default value
    let computed_default = empty.unwrap_or_else(|| {
        println!("Computing default...");
        123
    });
    println!("Computed default: {}", computed_default);

    // map() transforms the value inside Some, leaving None untouched
    let squared = maybe_value.map(|x| x * x);
    println!("Squared: {:?}", squared);

    // and_then() chains operations that return Options
    let result = maybe_value
        .and_then(|x| if x > 0 { Some(x) } else { None })
        .and_then(|x| Some(x.to_string()));

    println!("Result: {:?}", result);
}
```

This example shows just some of the methods available on `Option<T>`. The standard library provides many more methods for working with optional values in a safe and expressive way.

## The Result Enum

While `Option<T>` handles the possibility of absence, `Result<T, E>` is used for operations that can fail. It's defined as:

```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

Where `T` is the type of the success value, and `E` is the type of the error value.

Here's a simple example:

```rust
use std::fs::File;
use std::io::Read;

fn read_file_contents(path: &str) -> Result<String, std::io::Error> {
    let mut file = match File::open(path) {
        Ok(file) => file,
        Err(error) => return Err(error),
    };

    let mut contents = String::new();
    match file.read_to_string(&mut contents) {
        Ok(_) => Ok(contents),
        Err(error) => Err(error),
    }
}

fn main() {
    match read_file_contents("hello.txt") {
        Ok(contents) => println!("File contents: {}", contents),
        Err(error) => println!("Error reading file: {}", error),
    }
}
```

In this example, `read_file_contents` returns a `Result<String, std::io::Error>`. If the file is successfully read, it returns `Ok(contents)` with the file contents. If there's an error, it returns `Err(error)` with the error details.

### The ? Operator

The `?` operator provides a concise way to handle errors with `Result` types. It unwraps the value if the operation succeeds or returns the error from the current function if it fails:

```rust
use std::fs::File;
use std::io::{self, Read};

fn read_file_contents(path: &str) -> Result<String, io::Error> {
    let mut file = File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

fn main() -> Result<(), io::Error> {
    let contents = read_file_contents("hello.txt")?;
    println!("File contents: {}", contents);
    Ok(())
}
```

The `?` operator significantly reduces boilerplate code when working with functions that return `Result` types.

### Working with Result

Like `Option<T>`, the `Result<T, E>` enum has many useful methods:

```rust
fn parse_port(s: &str) -> Result<u16, String> {
    match s.parse::<u16>() {
        Ok(port) => Ok(port),
        Err(_) => Err(format!("Invalid port number: {}", s)),
    }
}

fn main() {
    let inputs = ["80", "8080", "65536", "abc"];

    for input in &inputs {
        // Using is_ok() and is_err()
        let result = parse_port(input);
        println!("{} - is_ok: {}, is_err: {}", input, result.is_ok(), result.is_err());

        // Using unwrap_or
        let port = parse_port(input).unwrap_or(0);
        println!("Port (with default): {}", port);

        // Using map and unwrap_or_else
        let description = parse_port(input)
            .map(|p| format!("Valid port: {}", p))
            .unwrap_or_else(|e| e);

        println!("Description: {}", description);

        println!();
    }

    // Collecting results
    let parsed: Result<Vec<u16>, _> = inputs.iter()
        .map(|s| parse_port(s))
        .collect();

    println!("Collected results: {:?}", parsed);
}
```

The `Result<T, E>` type provides a rich API for handling errors in a safe and expressive way, encouraging robust error handling throughout your code.

## Pattern Matching with match

Pattern matching is a powerful feature in Rust, allowing you to destructure complex data types and conditionally execute code based on the structure of values. The `match` expression is the primary way to do pattern matching:

```rust
enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter(UsState),
}

#[derive(Debug)]
enum UsState {
    Alabama,
    Alaska,
    // ... other states
    Wyoming,
}

fn value_in_cents(coin: Coin) -> u8 {
    match coin {
        Coin::Penny => {
            println!("Lucky penny!");
            1
        }
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter(state) => {
            println!("Quarter from {:?}!", state);
            25
        }
    }
}

fn main() {
    let coin = Coin::Quarter(UsState::Alaska);
    println!("Value: {} cents", value_in_cents(coin));
}
```

In the `match` expression, each arm consists of a pattern and the code to run if the value matches that pattern. The patterns are checked in order, and the first matching pattern is executed.

### The \_ Placeholder

The `match` expression must be exhaustive, meaning it must handle all possible values of the type being matched. The `_` placeholder is a catchall pattern that matches any value not specifically handled:

```rust
fn main() {
    let dice_roll = 6;

    match dice_roll {
        1 => println!("You got a one!"),
        2 => println!("You got a two!"),
        3 => println!("You got a three!"),
        // Handle all other values
        _ => println!("You rolled something else: {}", dice_roll),
    }
}
```

Without the `_` pattern, the compiler would complain that the `match` doesn't handle all possible values of `dice_roll`.

### Match Guards

Match guards are additional `if` conditions specified after a pattern, allowing for more complex matching logic:

```rust
fn main() {
    let num = 5;

    match num {
        n if n < 0 => println!("{} is negative", n),
        n if n > 0 => println!("{} is positive", n),
        _ => println!("zero"),
    }

    let pair = (2, -2);

    match pair {
        (x, y) if x == y => println!("These are twins"),
        (x, y) if x + y == 0 => println!("These are opposites"),
        (x, y) if x % 2 == 0 && y % 2 == 0 => println!("Both are even"),
        _ => println!("No special property"),
    }
}
```

Match guards are useful when the pattern alone isn't enough to express your matching criteria.

### Binding with @ Operator

The `@` operator lets you create a variable that holds a value while also testing it against a pattern:

```rust
enum Message {
    Hello { id: i32 },
}

fn main() {
    let msg = Message::Hello { id: 5 };

    match msg {
        Message::Hello { id: id_var @ 3..=7 } => {
            println!("Found an id in range: {}", id_var)
        }
        Message::Hello { id: 10..=12 } => {
            println!("Found an id in another range")
        }
        Message::Hello { id } => {
            println!("Found some other id: {}", id)
        }
    }
}
```

In this example, `id_var @ 3..=7` matches any `id` between 3 and 7 (inclusive) and binds the actual value to `id_var`.

## if let Expressions

The `if let` syntax is a more concise way to handle values that match one pattern while ignoring the rest:

```rust
fn main() {
    let some_value = Some(3);

    // Using match
    match some_value {
        Some(3) => println!("three"),
        _ => (),
    }

    // Using if let (more concise)
    if let Some(3) = some_value {
        println!("three");
    }

    // if let with else
    let another_value = Some(5);

    if let Some(x) = another_value {
        println!("Got a value: {}", x);
    } else {
        println!("No value");
    }
}
```

The `if let` syntax is especially useful when you only care about one specific pattern and want to ignore all others. It's less verbose than using `match` when you only need to match against a single pattern.

## while let Expressions

Similar to `if let`, `while let` continues executing a block as long as a pattern matches:

```rust
fn main() {
    let mut stack = Vec::new();

    stack.push(1);
    stack.push(2);
    stack.push(3);

    // Pop values off the stack while it's not empty
    while let Some(top) = stack.pop() {
        println!("{}", top);
    }
}
```

This loop will run as long as `stack.pop()` returns `Some(value)`, automatically stopping when it returns `None` (when the stack is empty).

## let Destructuring

Pattern matching isn't just for enums; it's also used with other Rust constructs. For example, you can destructure tuples, arrays, and structs in `let` statements:

```rust
fn main() {
    // Destructuring a tuple
    let (x, y, z) = (1, 2, 3);
    println!("x: {}, y: {}, z: {}", x, y, z);

    // Destructuring an array
    let [first, second, third] = [1, 2, 3];
    println!("first: {}, second: {}, third: {}", first, second, third);

    // Destructuring a struct
    struct Point {
        x: i32,
        y: i32,
    }

    let point = Point { x: 10, y: 20 };
    let Point { x, y } = point;
    println!("x: {}, y: {}", x, y);

    // Destructuring with different variable names
    let Point { x: a, y: b } = point;
    println!("a: {}, b: {}", a, b);

    // Partial destructuring
    let ((a, b), c) = ((1, 2), 3);
    println!("a: {}, b: {}, c: {}", a, b, c);
}
```

Destructuring makes it easy to extract the parts of a complex value into separate variables.

## Function Parameters

Pattern matching works in function parameters too:

```rust
fn print_coordinates(&(x, y): &(i32, i32)) {
    println!("Current location: ({}, {})", x, y);
}

fn main() {
    let point = (3, 5);
    print_coordinates(&point);
}
```

Here, the function parameter directly destructures the tuple reference into its components.

## Creating Custom Errors with Enums

Enums are ideal for creating custom error types that can represent different error conditions:

```rust
#[derive(Debug)]
enum AppError {
    IoError(std::io::Error),
    ParseError(String),
    NetworkError { status_code: u16, message: String },
    Other,
}

impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        AppError::IoError(error)
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::IoError(err) => write!(f, "IO Error: {}", err),
            AppError::ParseError(msg) => write!(f, "Parse Error: {}", msg),
            AppError::NetworkError { status_code, message } => {
                write!(f, "Network Error ({}): {}", status_code, message)
            }
            AppError::Other => write!(f, "Unknown error"),
        }
    }
}

fn parse_config(filename: &str) -> Result<String, AppError> {
    use std::fs::File;
    use std::io::Read;

    // This could return an IoError
    let mut file = File::open(filename)?;  // ? automatically converts io::Error to AppError

    let mut contents = String::new();
    file.read_to_string(&mut contents)?;   // ? automatically converts io::Error to AppError

    // Check if the config is valid
    if contents.is_empty() {
        return Err(AppError::ParseError("Config file is empty".to_string()));
    }

    // Simulate a network validation (just for demonstration)
    if filename.contains("network") {
        return Err(AppError::NetworkError {
            status_code: 404,
            message: "Config source not found".to_string(),
        });
    }

    Ok(contents)
}

fn main() {
    let filenames = ["config.txt", "empty.txt", "network_config.txt"];

    for filename in &filenames {
        match parse_config(filename) {
            Ok(config) => println!("Config loaded: {} bytes", config.len()),
            Err(error) => println!("Failed to load config: {}", error),
        }
    }
}
```

This example shows how to create a custom error type using an enum, implement conversion from standard library errors, and implement the `Display` trait for user-friendly error messages.

## State Pattern with Enums

Enums are excellent for implementing the state pattern, where an object's behavior changes based on its internal state:

```rust
#[derive(Debug)]
enum State {
    Draft,
    PendingReview,
    Published,
}

struct Post {
    state: State,
    content: String,
    approvals: u32,
}

impl Post {
    fn new() -> Post {
        Post {
            state: State::Draft,
            content: String::new(),
            approvals: 0,
        }
    }

    fn add_content(&mut self, text: &str) {
        match self.state {
            State::Draft => {
                self.content.push_str(text);
            }
            _ => println!("Cannot add content in the current state: {:?}", self.state),
        }
    }

    fn submit_for_review(&mut self) {
        if let State::Draft = self.state {
            self.state = State::PendingReview;
        }
    }

    fn approve(&mut self) {
        if let State::PendingReview = self.state {
            self.approvals += 1;
            if self.approvals >= 2 {
                self.state = State::Published;
            }
        }
    }

    fn reject(&mut self) {
        if let State::PendingReview = self.state {
            self.state = State::Draft;
            self.approvals = 0;
        }
    }

    fn content(&self) -> &str {
        match self.state {
            State::Published => &self.content,
            _ => "",
        }
    }
}

fn main() {
    let mut post = Post::new();

    // Add content while in draft
    post.add_content("I've been learning Rust for a month now");
    println!("Draft content preview: '{}'", post.content());

    // Submit for review
    post.submit_for_review();
    println!("Pending review content preview: '{}'", post.content());

    // First approval
    post.approve();
    println!("After 1st approval content preview: '{}'", post.content());

    // Second approval -> Published
    post.approve();
    println!("Published content: '{}'", post.content());

    // Can't add more content after publishing
    post.add_content(" and I'm loving it!");
    println!("Final content: '{}'", post.content());
}
```

In this example, the `Post` struct uses the `State` enum to track its current state, and its behavior changes based on that state.

## 🔨 Project: Command Line Parser

Let's build a command-line argument parser that demonstrates the use of enums and pattern matching. This project will create a flexible, extensible framework for parsing command-line arguments.

### Step 1: Create the Project

```bash
cargo new cli_parser
cd cli_parser
```

### Step 2: Define the Core Types

Create `src/lib.rs`:

```rust
use std::collections::HashMap;
use std::fmt;
use std::str::FromStr;

#[derive(Debug, Clone, PartialEq)]
pub enum ArgValue {
    String(String),
    Integer(i64),
    Float(f64),
    Boolean(bool),
    List(Vec<ArgValue>),
}

impl fmt::Display for ArgValue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ArgValue::String(s) => write!(f, "{}", s),
            ArgValue::Integer(i) => write!(f, "{}", i),
            ArgValue::Float(fl) => write!(f, "{}", fl),
            ArgValue::Boolean(b) => write!(f, "{}", b),
            ArgValue::List(items) => {
                write!(f, "[")?;
                for (i, item) in items.iter().enumerate() {
                    if i > 0 {
                        write!(f, ", ")?;
                    }
                    write!(f, "{}", item)?;
                }
                write!(f, "]")
            }
        }
    }
}

#[derive(Debug)]
pub enum ArgParseError {
    MissingValue(String),
    InvalidFormat(String),
    UnknownArgument(String),
    TypeMismatch { arg: String, expected: String },
    Other(String),
}

impl fmt::Display for ArgParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ArgParseError::MissingValue(arg) => write!(f, "Missing value for argument: {}", arg),
            ArgParseError::InvalidFormat(msg) => write!(f, "Invalid format: {}", msg),
            ArgParseError::UnknownArgument(arg) => write!(f, "Unknown argument: {}", arg),
            ArgParseError::TypeMismatch { arg, expected } => {
                write!(f, "Type mismatch for {}: expected {}", arg, expected)
            }
            ArgParseError::Other(msg) => write!(f, "Error: {}", msg),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum ArgType {
    String,
    Integer,
    Float,
    Boolean,
    List(Box<ArgType>),
}

impl fmt::Display for ArgType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ArgType::String => write!(f, "string"),
            ArgType::Integer => write!(f, "integer"),
            ArgType::Float => write!(f, "float"),
            ArgType::Boolean => write!(f, "boolean"),
            ArgType::List(item_type) => write!(f, "list of {}", item_type),
        }
    }
}

#[derive(Debug)]
pub struct ArgDefinition {
    pub name: String,
    pub short: Option<char>,
    pub long: String,
    pub arg_type: ArgType,
    pub required: bool,
    pub help: String,
    pub default: Option<ArgValue>,
}

impl ArgDefinition {
    pub fn new(name: &str, arg_type: ArgType) -> Self {
        let long = format!("--{}", name.replace('_', "-"));
        ArgDefinition {
            name: name.to_string(),
            short: None,
            long,
            arg_type,
            required: false,
            help: String::new(),
            default: None,
        }
    }

    pub fn short(mut self, short: char) -> Self {
        self.short = Some(short);
        self
    }

    pub fn long(mut self, long: &str) -> Self {
        self.long = format!("--{}", long);
        self
    }

    pub fn required(mut self, required: bool) -> Self {
        self.required = required;
        self
    }

    pub fn help(mut self, help: &str) -> Self {
        self.help = help.to_string();
        self
    }

    pub fn default(mut self, value: ArgValue) -> Self {
        self.default = Some(value);
        self
    }
}

#[derive(Debug)]
pub struct ArgParser {
    program_name: String,
    program_description: String,
    definitions: Vec<ArgDefinition>,
}

impl ArgParser {
    pub fn new(program_name: &str) -> Self {
        ArgParser {
            program_name: program_name.to_string(),
            program_description: String::new(),
            definitions: Vec::new(),
        }
    }

    pub fn description(mut self, description: &str) -> Self {
        self.program_description = description.to_string();
        self
    }

    pub fn add_arg(mut self, definition: ArgDefinition) -> Self {
        self.definitions.push(definition);
        self
    }

    pub fn print_help(&self) {
        println!("{}", self.program_name);
        if !self.program_description.is_empty() {
            println!("{}", self.program_description);
        }
        println!("\nUSAGE:");
        println!("  {} [OPTIONS]", self.program_name);

        if !self.definitions.is_empty() {
            println!("\nOPTIONS:");
            for def in &self.definitions {
                let short_str = if let Some(short) = def.short {
                    format!("-{}, ", short)
                } else {
                    "    ".to_string()
                };

                let required_str = if def.required { " (required)" } else { "" };
                let default_str = if let Some(ref default) = def.default {
                    format!(" [default: {}]", default)
                } else {
                    String::new()
                };

                println!("  {}{} <{}>{}{}",
                         short_str,
                         def.long,
                         def.arg_type,
                         required_str,
                         default_str);

                if !def.help.is_empty() {
                    println!("      {}", def.help);
                }
            }
        }
    }

    pub fn parse<T>(&self, args: T) -> Result<HashMap<String, ArgValue>, ArgParseError>
    where
        T: IntoIterator,
        T::Item: AsRef<str>,
    {
        let mut result = HashMap::new();
        let mut args_iter = args.into_iter().peekable();

        // Skip the program name
        args_iter.next();

        while let Some(arg) = args_iter.next() {
            let arg = arg.as_ref();

            if arg == "--help" || arg == "-h" {
                self.print_help();
                return Ok(result);
            }

            // Find the matching definition
            let def = self.find_definition(arg)
                .ok_or_else(|| ArgParseError::UnknownArgument(arg.to_string()))?;

            let value = match def.arg_type {
                ArgType::Boolean => {
                    // Boolean flags don't need a value
                    ArgValue::Boolean(true)
                }
                _ => {
                    // All other types need a value
                    let value_str = args_iter.next()
                        .ok_or_else(|| ArgParseError::MissingValue(def.name.clone()))?;

                    self.parse_value(value_str.as_ref(), &def.arg_type)?
                }
            };

            result.insert(def.name.clone(), value);
        }

        // Check for required arguments
        for def in &self.definitions {
            if def.required && !result.contains_key(&def.name) {
                if let Some(default) = &def.default {
                    result.insert(def.name.clone(), default.clone());
                } else {
                    return Err(ArgParseError::MissingValue(def.name.clone()));
                }
            }
        }

        // Add defaults for missing optional arguments
        for def in &self.definitions {
            if !result.contains_key(&def.name) {
                if let Some(default) = &def.default {
                    result.insert(def.name.clone(), default.clone());
                }
            }
        }

        Ok(result)
    }

    fn find_definition(&self, arg: &str) -> Option<&ArgDefinition> {
        // Check for long form (--name)
        if arg.starts_with("--") {
            return self.definitions.iter().find(|def| def.long == arg);
        }

        // Check for short form (-n)
        if arg.starts_with('-') && arg.len() == 2 {
            let c = arg.chars().nth(1)?;
            return self.definitions.iter().find(|def| def.short == Some(c));
        }

        None
    }

    fn parse_value(&self, value_str: &str, arg_type: &ArgType) -> Result<ArgValue, ArgParseError> {
        match arg_type {
            ArgType::String => Ok(ArgValue::String(value_str.to_string())),

            ArgType::Integer => {
                i64::from_str(value_str)
                    .map(ArgValue::Integer)
                    .map_err(|_| ArgParseError::TypeMismatch {
                        arg: value_str.to_string(),
                        expected: "integer".to_string(),
                    })
            }

            ArgType::Float => {
                f64::from_str(value_str)
                    .map(ArgValue::Float)
                    .map_err(|_| ArgParseError::TypeMismatch {
                        arg: value_str.to_string(),
                        expected: "float".to_string(),
                    })
            }

            ArgType::Boolean => {
                match value_str.to_lowercase().as_str() {
                    "true" | "yes" | "1" => Ok(ArgValue::Boolean(true)),
                    "false" | "no" | "0" => Ok(ArgValue::Boolean(false)),
                    _ => Err(ArgParseError::TypeMismatch {
                        arg: value_str.to_string(),
                        expected: "boolean".to_string(),
                    }),
                }
            }

            ArgType::List(item_type) => {
                let items: Vec<&str> = value_str.split(',').collect();
                let mut result = Vec::new();

                for item in items {
                    let item = item.trim();
                    let value = self.parse_value(item, item_type)?;
                    result.push(value);
                }

                Ok(ArgValue::List(result))
            }
        }
    }
}

// Helper methods to get typed values from ArgValue
pub trait ArgValueExt {
    fn as_string(&self) -> Result<&String, ArgParseError>;
    fn as_integer(&self) -> Result<i64, ArgParseError>;
    fn as_float(&self) -> Result<f64, ArgParseError>;
    fn as_boolean(&self) -> Result<bool, ArgParseError>;
    fn as_list(&self) -> Result<&Vec<ArgValue>, ArgParseError>;
}

impl ArgValueExt for ArgValue {
    fn as_string(&self) -> Result<&String, ArgParseError> {
        match self {
            ArgValue::String(s) => Ok(s),
            _ => Err(ArgParseError::TypeMismatch {
                arg: format!("{:?}", self),
                expected: "string".to_string(),
            }),
        }
    }

    fn as_integer(&self) -> Result<i64, ArgParseError> {
        match self {
            ArgValue::Integer(i) => Ok(*i),
            _ => Err(ArgParseError::TypeMismatch {
                arg: format!("{:?}", self),
                expected: "integer".to_string(),
            }),
        }
    }

    fn as_float(&self) -> Result<f64, ArgParseError> {
        match self {
            ArgValue::Float(f) => Ok(*f),
            ArgValue::Integer(i) => Ok(*i as f64),
            _ => Err(ArgParseError::TypeMismatch {
                arg: format!("{:?}", self),
                expected: "float".to_string(),
            }),
        }
    }

    fn as_boolean(&self) -> Result<bool, ArgParseError> {
        match self {
            ArgValue::Boolean(b) => Ok(*b),
            _ => Err(ArgParseError::TypeMismatch {
                arg: format!("{:?}", self),
                expected: "boolean".to_string(),
            }),
        }
    }

    fn as_list(&self) -> Result<&Vec<ArgValue>, ArgParseError> {
        match self {
            ArgValue::List(l) => Ok(l),
            _ => Err(ArgParseError::TypeMismatch {
                arg: format!("{:?}", self),
                expected: "list".to_string(),
            }),
        }
    }
}
```

### Step 3: Create a Demo Application

Create `src/main.rs`:

```rust
use cli_parser::{ArgDefinition, ArgParser, ArgType, ArgValue, ArgValueExt};
use std::env;
use std::process;

fn main() {
    let parser = ArgParser::new("file_processor")
        .description("Process files with various options")
        .add_arg(
            ArgDefinition::new("input", ArgType::String)
                .short('i')
                .help("Input file to process")
                .required(true)
        )
        .add_arg(
            ArgDefinition::new("output", ArgType::String)
                .short('o')
                .help("Output file (defaults to stdout)")
        )
        .add_arg(
            ArgDefinition::new("verbose", ArgType::Boolean)
                .short('v')
                .help("Enable verbose output")
                .default(ArgValue::Boolean(false))
        )
        .add_arg(
            ArgDefinition::new("count", ArgType::Integer)
                .short('c')
                .help("Number of items to process")
                .default(ArgValue::Integer(10))
        )
        .add_arg(
            ArgDefinition::new("filters", ArgType::List(Box::new(ArgType::String)))
                .short('f')
                .help("Comma-separated list of filters to apply")
        )
        .add_arg(
            ArgDefinition::new("threshold", ArgType::Float)
                .short('t')
                .help("Threshold value for processing")
                .default(ArgValue::Float(0.5))
        );

    // Parse command line arguments
    let args: Vec<String> = env::args().collect();

    // If no arguments, show help
    if args.len() == 1 {
        parser.print_help();
        return;
    }

    let parsed_args = match parser.parse(args) {
        Ok(args) => args,
        Err(err) => {
            eprintln!("Error: {}", err);
            eprintln!("Try '--help' for more information.");
            process::exit(1);
        }
    };

    // Use the parsed arguments
    let input_file = parsed_args.get("input").unwrap().as_string().unwrap();
    println!("Processing file: {}", input_file);

    if let Some(output) = parsed_args.get("output") {
        println!("Output will be written to: {}", output.as_string().unwrap());
    } else {
        println!("Output will be written to stdout");
    }

    let verbose = parsed_args.get("verbose").unwrap().as_boolean().unwrap();
    if verbose {
        println!("Verbose mode enabled");
    }

    let count = parsed_args.get("count").unwrap().as_integer().unwrap();
    println!("Processing {} items", count);

    let threshold = parsed_args.get("threshold").unwrap().as_float().unwrap();
    println!("Using threshold: {}", threshold);

    if let Some(filters) = parsed_args.get("filters") {
        let filter_list = filters.as_list().unwrap();
        println!("Applying {} filters:", filter_list.len());
        for (i, filter) in filter_list.iter().enumerate() {
            println!("  {}. {}", i+1, filter.as_string().unwrap());
        }
    } else {
        println!("No filters applied");
    }
}
```

### Step 4: Run the Demo

```bash
# Show help
cargo run

# Process with minimum arguments
cargo run -- -i input.txt

# Process with all arguments
cargo run -- -i input.txt -o output.txt -v -c 20 -f "resize,crop,blur" -t 0.75
```

This CLI parser demonstrates several key concepts:

1. **Enum Variants with Data**: `ArgValue` and `ArgType` represent different kinds of values
2. **Pattern Matching**: Used extensively to process and validate arguments
3. **Error Handling**: Custom `ArgParseError` enum for different error scenarios
4. **Builder Pattern**: Fluent interfaces for creating parsers and argument definitions
5. **Traits**: `ArgValueExt` for safely extracting typed values

The parser is also extensible. You could add support for subcommands, positional arguments, or argument groups.

## Looking Ahead

In this chapter, we've explored Rust's powerful enum type and pattern matching capabilities. We've seen how enums enable us to model domain concepts that can be one of several variants, and how pattern matching allows us to elegantly handle these variants.

We've also explored the `Option<T>` and `Result<T, E>` enums, which form the foundation of Rust's approach to representing optional values and handling errors.

In the next chapter, we'll dive into collections, exploring Rust's standard collection types like vectors, strings, and hash maps, and learning how to use them effectively in your programs.
