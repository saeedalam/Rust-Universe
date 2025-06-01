# Chapter 9: Working with Strings and Slices

## Introduction

In this chapter, we'll explore one of Rust's most foundational concepts: working with strings and slices. Understanding how Rust handles text and collections is crucial for writing efficient and correct programs.

Rust's approach to string handling differs from many other programming languages. Where languages like Python, JavaScript, or Java abstract away the details of text encoding and memory management, Rust exposes these details explicitly. This approach gives you more control but also requires a deeper understanding of how strings work.

By the end of this chapter, you'll understand:

- The differences between `String` and `&str`
- How Rust handles UTF-8 text
- String manipulation and formatting
- Array types and slices
- Common string processing patterns

This knowledge forms a critical foundation for nearly every Rust program you'll write.

## String vs str and When to Use Each

Rust has two primary string types:

1. `String`: A growable, heap-allocated string type
2. `&str`: A string slice that references a sequence of UTF-8 bytes

This duality can be confusing for newcomers, but each type serves specific purposes in Rust's memory model.

### Understanding the String Type

A `String` is:

- Owned: The variable that holds a `String` owns the data
- Mutable: Can be modified if declared as mutable
- Heap-allocated: The content lives on the heap
- Growable: Its size can change during execution

```rust
fn main() {
    // Creating a new empty String
    let mut s1 = String::new();

    // Creating a String with initial content
    let s2 = String::from("Hello");

    // Creating a String from a string literal
    let s3 = "World".to_string();

    // Modifying a String
    s1.push_str("Hello, ");
    s1.push_str("world!");

    println!("s1: {}", s1);
    println!("s2: {}", s2);
    println!("s3: {}", s3);
}
```

### Understanding the str Type

A string slice (`&str`) is:

- Borrowed: It doesn't own the data it refers to
- Immutable: Cannot be modified
- Fixed size: Its size is determined at compile time or when created
- A view: It's a reference to a sequence of UTF-8 bytes

```rust
fn main() {
    // String literal - these are &'static str
    let hello = "Hello, world!";

    // String slice from a String
    let s = String::from("Hello, world!");
    let hello_slice = &s[0..5]; // "Hello"

    println!("String literal: {}", hello);
    println!("String slice: {}", hello_slice);
}
```

### When to Use Each Type

The choice between `String` and `&str` depends on your specific needs:

**Use `String` when:**

- You need to own and modify the string data
- You're building or manipulating strings
- The size of the string will change
- You need to store strings in a data structure

**Use `&str` when:**

- You only need to read the data
- You want to accept both string literals and `String` values
- You're passing string data without transferring ownership
- You need to reference a substring

```rust
// This function accepts both String and &str
fn process_string(s: &str) {
    println!("Processing: {}", s);
}

fn main() {
    let s1 = "Hello"; // &str
    let s2 = String::from("World"); // String

    // Both work because &String can be coerced to &str
    process_string(s1);
    process_string(&s2);
}
```

### String Coercion and Deref

Rust allows a `&String` to be automatically converted to a `&str` when needed. This is thanks to the `Deref` trait implementation:

```rust
fn main() {
    let owned = String::from("Hello");

    // These are equivalent:
    let slice1: &str = &owned[..];
    let slice2: &str = &owned;

    println!("slice1: {}", slice1);
    println!("slice2: {}", slice2);
}
```

This coercion is why it's often best to accept `&str` parameters in functions—they can accept both string literals and `String` references, making your API more flexible.

## Why Strings are Complex Data Types

Strings in Rust are more complex than in many other languages for several important reasons:

### 1. UTF-8 Encoding

Rust strings are always valid UTF-8, which is more complex than simple ASCII or fixed-width encoding:

```rust
fn main() {
    let hello = "Hello"; // Each character is 1 byte in UTF-8
    let hello_len = hello.len();

    let hindi = "नमस्ते"; // Each character takes multiple bytes in UTF-8
    let hindi_len = hindi.len();

    println!("'{}' length in bytes: {}", hello, hello_len); // 5
    println!("'{}' length in bytes: {}", hindi, hindi_len); // 18
    println!("'{}' length in chars: {}", hindi, hindi.chars().count()); // 6
}
```

### 2. Memory Safety

Rust ensures all string operations maintain memory safety, preventing buffer overflows, use-after-free, and other common string-related vulnerabilities:

```rust
fn main() {
    let s = String::from("hello");

    // This would cause a compile error:
    // let c = s[0]; // Error: cannot index a String

    // Instead, we use safe methods:
    if let Some(first_char) = s.chars().next() {
        println!("First character: {}", first_char);
    }
}
```

### 3. Ownership and Borrowing

Strings follow Rust's ownership rules, which ensures memory safety without garbage collection:

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1; // Ownership is moved from s1 to s2

    // This would cause a compile error:
    // println!("{}", s1); // Error: s1 has been moved

    // This works because we borrow, not move:
    let s3 = String::from("world");
    let s4 = &s3; // Borrowing s3

    println!("s3: {}", s3); // Still valid because we only borrowed
    println!("s4: {}", s4);
}
```

These complexities make Rust strings more challenging to work with initially, but they provide important guarantees that prevent many common bugs in other languages.

## Creating and Modifying Strings

Rust provides several ways to create and modify strings:

### Creating Strings

```rust
fn main() {
    // Creating an empty String
    let empty = String::new();

    // Creating with capacity hint (for efficiency)
    let with_capacity = String::with_capacity(20);

    // From a string literal
    let from_literal = String::from("Hello, world!");
    let also_from_literal = "Hello, world!".to_string();

    // From other types
    let from_integer = 42.to_string();
    let from_float = 3.14159.to_string();
    let from_bool = true.to_string();

    // From character array
    let from_chars = String::from_iter(['H', 'e', 'l', 'l', 'o']);

    // From bytes (must be valid UTF-8)
    let from_bytes = String::from_utf8(vec![72, 101, 108, 108, 111]).unwrap(); // "Hello"

    println!("From integer: {}", from_integer);
    println!("From float: {}", from_float);
    println!("From chars: {}", from_chars);
    println!("From bytes: {}", from_bytes);
}
```

### Modifying Strings

When you have a mutable `String`, you can modify it in several ways:

```rust
fn main() {
    let mut s = String::from("Hello");

    // Appending
    s.push_str(", world"); // Append a string slice
    s.push('!');           // Append a single character

    println!("After appending: {}", s);

    // Inserting
    s.insert(5, ',');      // Insert a character at position 5
    s.insert_str(6, " dear"); // Insert a string at position 6

    println!("After inserting: {}", s);

    // Replacing
    let replaced = s.replace("dear", "wonderful");
    println!("After replacing: {}", replaced);

    // Removing
    s.truncate(12);        // Keep only the first 12 bytes
    println!("After truncating: {}", s);

    let removed = s.remove(5); // Remove and return character at index 5
    println!("Removed character: {}", removed);
    println!("After removing: {}", s);

    // Clearing
    s.clear();             // Remove all content
    println!("After clearing: '{}'", s);
}
```

### Capacity Management

String capacity can be managed explicitly for better performance:

```rust
fn main() {
    // Create with initial capacity
    let mut s = String::with_capacity(20);

    println!("Length: {}, Capacity: {}", s.len(), s.capacity());

    // Add some content
    s.push_str("Hello, world!");

    println!("Length: {}, Capacity: {}", s.len(), s.capacity());

    // Reserve more space
    s.reserve(20);
    println!("After reserve - Length: {}, Capacity: {}", s.len(), s.capacity());

    // Shrink to fit
    s.shrink_to_fit();
    println!("After shrink - Length: {}, Capacity: {}", s.len(), s.capacity());
}
```

Managing capacity can be important for performance when you're doing many string operations.

## String Operations and Methods

Rust provides a rich set of methods for working with strings:

### Basic Operations

```rust
fn main() {
    let s = String::from("Hello, world!");

    // Length and capacity
    println!("Length: {}", s.len());
    println!("Is empty: {}", s.is_empty());

    // Checking content
    println!("Contains 'world': {}", s.contains("world"));
    println!("Starts with 'He': {}", s.starts_with("He"));
    println!("Ends with '!': {}", s.ends_with("!"));

    // Searching
    if let Some(pos) = s.find("world") {
        println!("'world' found at position: {}", pos);
    }

    if let Some(pos) = s.rfind('o') {
        println!("Last 'o' found at position: {}", pos);
    }

    // Splitting
    let parts: Vec<&str> = s.split(',').collect();
    println!("Split parts: {:?}", parts);

    // Trimming
    let s2 = "   Hello, world!   ";
    println!("Original: '{}'", s2);
    println!("Trimmed: '{}'", s2.trim());
    println!("Trim start: '{}'", s2.trim_start());
    println!("Trim end: '{}'", s2.trim_end());
}
```

### Transformation Methods

```rust
fn main() {
    let s = String::from("Hello, world!");

    // Case conversion
    println!("Uppercase: {}", s.to_uppercase());
    println!("Lowercase: {}", s.to_lowercase());

    // Repetition
    let repeated = "abc".repeat(3);
    println!("Repeated: {}", repeated);

    // Replacing
    let replaced = s.replace("world", "Rust");
    println!("Replaced: {}", replaced);

    // Replace first N occurrences
    let text = "one two one three one four";
    let replaced_n = text.replacen("one", "ONE", 2);
    println!("Replaced first 2: {}", replaced_n);

    // Replace with pattern
    let replaced_pattern = text.replace("one", "1");
    println!("Replaced pattern: {}", replaced_pattern);
}
```

### Iteration Methods

```rust
fn main() {
    let text = "Hello, 世界!";

    // Iterate over characters
    println!("Characters:");
    for c in text.chars() {
        print!("'{}' ", c);
    }
    println!();

    // Iterate over bytes
    println!("Bytes:");
    for b in text.bytes() {
        print!("{} ", b);
    }
    println!();

    // Character count
    println!("Character count: {}", text.chars().count());

    // Byte count
    println!("Byte count: {}", text.len());
}
```

## Working with String Data

### Concatenation

There are several ways to concatenate strings in Rust:

```rust
fn main() {
    // Using the + operator
    let s1 = String::from("Hello, ");
    let s2 = String::from("world!");
    let s3 = s1 + &s2; // Note: s1 is moved and can't be used anymore

    // Using format! macro (preferred for multiple pieces)
    let s4 = String::from("Hello");
    let s5 = String::from("world");
    let s6 = format!("{}, {}!", s4, s5); // Doesn't take ownership

    println!("s3: {}", s3);
    println!("s6: {}", s6);

    // We can still use s4 and s5
    println!("s4 and s5 still available: {} {}", s4, s5);

    // Using String methods
    let mut s7 = String::from("Hello");
    s7.push_str(", ");
    s7.push_str("world!");
    println!("s7: {}", s7);
}
```

### Slicing

String slicing must respect UTF-8 character boundaries:

```rust
fn main() {
    let s = String::from("Hello, world!");

    // Basic slicing
    let hello = &s[0..5];
    let world = &s[7..12];

    println!("{} {}", hello, world);

    // Alternative slice syntax
    let hello_alt = &s[..5];      // From start to index 5
    let world_alt = &s[7..];      // From index 7 to end
    let entire = &s[..];          // Entire string

    println!("{} {} {}", hello_alt, world_alt, entire);

    // Caution with UTF-8:
    let hindi = "नमस्ते";

    // This would panic - not a character boundary:
    // let first_byte = &hindi[0..1];

    // Safe ways to slice
    let char_indices: Vec<(usize, char)> = hindi.char_indices().collect();
    if char_indices.len() >= 2 {
        let start = char_indices[0].0;
        let end = char_indices[1].0;
        let first_char = &hindi[start..end];
        println!("First character: {}", first_char);
    }
}
```

### Common String Processing Tasks

```rust
fn main() {
    // Counting words
    let text = "The quick brown fox jumps over the lazy dog";
    let word_count = text.split_whitespace().count();
    println!("Word count: {}", word_count);

    // Reversing a string (by characters, not bytes)
    let original = "Hello, 世界!";
    let reversed: String = original.chars().rev().collect();
    println!("Original: {}", original);
    println!("Reversed: {}", reversed);

    // Word frequency
    let text = "apple banana apple cherry banana apple";
    let mut word_counts = std::collections::HashMap::new();

    for word in text.split_whitespace() {
        let count = word_counts.entry(word).or_insert(0);
        *count += 1;
    }

    println!("Word frequencies: {:?}", word_counts);
}
```

## UTF-8 Handling and Unicode Support

Rust's strings are always valid UTF-8, which provides first-class support for international text.

### Character Encoding Basics

```rust
fn main() {
    // A string with various scripts
    let text = "Hello, 世界! Привет! नमस्ते! 👋";

    // Character count vs byte count
    println!("Text: {}", text);
    println!("Character count: {}", text.chars().count());
    println!("Byte count: {}", text.len());

    // Iterating through characters
    println!("\nCharacters:");
    for (i, c) in text.chars().enumerate() {
        println!("Character {}: '{}' (bytes: {})", i, c, c.len_utf8());
    }

    // Unicode code points
    println!("\nUnicode code points:");
    for c in text.chars() {
        println!("'{}': U+{:04X}", c, c as u32);
    }
}
```

### Handling International Text

```rust
fn main() {
    // Some examples of international text
    let english = "Hello";
    let russian = "Привет";
    let japanese = "こんにちは";
    let hindi = "नमस्ते";
    let emoji = "👋 🌍";

    println!("Languages and their byte sizes:");
    println!("English ({}): {} bytes", english, english.len());
    println!("Russian ({}): {} bytes", russian, russian.len());
    println!("Japanese ({}): {} bytes", japanese, japanese.len());
    println!("Hindi ({}): {} bytes", hindi, hindi.len());
    println!("Emoji ({}): {} bytes", emoji, emoji.len());

    // Comparing character count vs byte count
    let text = "नमस्ते";
    println!("\nText: {}", text);
    println!("Bytes: {} (length)", text.len());
    println!("Chars: {} (count)", text.chars().count());

    // Printing bytes
    println!("\nBytes in '{}':", text);
    for b in text.bytes() {
        print!("{:02X} ", b);
    }
    println!();
}
```

### Grapheme Clusters

Some Unicode characters are composed of multiple code points that should be treated as a single visual unit:

```rust
fn main() {
    // Basic example - family emoji is multiple code points
    let family = "👨‍👩‍👧‍👦";

    println!("Family emoji: {}", family);
    println!("Bytes: {}", family.len());
    println!("Characters: {}", family.chars().count());

    // To properly handle grapheme clusters, you'd typically use the unicode-segmentation crate
    // This is just an example of the issue
    println!("Individual code points:");
    for c in family.chars() {
        println!("  {}", c);
    }

    // Another example - accented characters
    let accented = "é"; // Can be represented as 'e' + combining accent
    let combined = "e\u{0301}"; // Same visual character, different representation

    println!("\nAccented 'é': {} (bytes: {})", accented, accented.len());
    println!("Combined 'e + ´': {} (bytes: {})", combined, combined.len());
    println!("They look the same but are different in UTF-8!");
}
```

For proper grapheme handling, you would typically use the `unicode-segmentation` crate.

### Validating and Converting UTF-8

```rust
fn main() {
    // Valid UTF-8 bytes
    let valid_utf8 = vec![72, 101, 108, 108, 111]; // "Hello"

    // Converting from bytes to String
    match String::from_utf8(valid_utf8) {
        Ok(s) => println!("Valid UTF-8: {}", s),
        Err(e) => println!("Invalid UTF-8: {}", e),
    }

    // Invalid UTF-8 bytes
    let invalid_utf8 = vec![72, 101, 108, 108, 111, 0xFF];

    // This will fail
    match String::from_utf8(invalid_utf8.clone()) {
        Ok(s) => println!("Valid UTF-8: {}", s),
        Err(e) => println!("Invalid UTF-8: {}", e),
    }

    // Using lossy conversion
    let lossy_result = String::from_utf8_lossy(&invalid_utf8);
    println!("Lossy result: {}", lossy_result);
}
```

## Array Types and Fixed-Size Arrays

Arrays in Rust are fixed-size collections of elements of the same type, stored in contiguous memory.

### Defining Arrays

```rust
fn main() {
    // Defining an array with explicit type [type; size]
    let numbers: [i32; 5] = [1, 2, 3, 4, 5];

    // Defining an array with type inference
    let colors = ["red", "green", "blue", "yellow", "purple"];

    // Creating an array with repeated values
    let zeros = [0; 10]; // Creates [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

    println!("Numbers: {:?}", numbers);
    println!("Colors: {:?}", colors);
    println!("Zeros: {:?}", zeros);
}
```

### Accessing Array Elements

Arrays use zero-based indexing, like most programming languages:

```rust
fn main() {
    let days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    // Accessing by index
    let first_day = days[0];
    let weekend = [days[5], days[6]];

    println!("First day: {}", first_day);
    println!("Weekend: {:?}", weekend);

    // Getting array length
    println!("Number of days: {}", days.len());

    // Safely accessing elements
    let index = 10;
    match days.get(index) {
        Some(day) => println!("Day at index {}: {}", index, day),
        None => println!("No day at index {}", index),
    }

    // This would panic at runtime:
    // let invalid = days[10]; // index out of bounds
}
```

### Arrays in Memory

Arrays have a fixed size known at compile time and are stored on the stack:

```rust
fn main() {
    // A small array is stored on the stack
    let numbers = [1, 2, 3, 4, 5];

    // Size of the array in bytes
    let size = std::mem::size_of_val(&numbers);
    println!("Size of numbers array: {} bytes", size);

    // For large arrays, consider using a vector or Box<[T]>
    // let large = [0; 1_000_000]; // This might cause a stack overflow

    // Better alternatives for large arrays:
    let large_vec = vec![0; 1_000_000]; // On the heap
    let large_boxed = Box::new([0; 1_000]); // On the heap

    println!("Large vector length: {}", large_vec.len());
    println!("Large boxed array length: {}", large_boxed.len());
}
```

### Iterating Over Arrays

There are several ways to iterate over arrays:

```rust
fn main() {
    let numbers = [1, 2, 3, 4, 5];

    // Using a for loop (preferred)
    println!("For loop:");
    for number in numbers {
        print!("{} ", number);
    }
    println!();

    // Using a for loop with references
    println!("For loop with references:");
    for number in &numbers {
        print!("{} ", number);
    }
    println!();

    // Using iterator methods
    println!("Iterator:");
    numbers.iter().for_each(|number| print!("{} ", number));
    println!();

    // With indices
    println!("With indices:");
    for (i, number) in numbers.iter().enumerate() {
        println!("numbers[{}] = {}", i, number);
    }
}
```

### Multidimensional Arrays

Rust supports multidimensional arrays:

```rust
fn main() {
    // 2D array: 3 rows, 4 columns
    let grid = [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12],
    ];

    // Accessing elements
    println!("Element at row 1, column 2: {}", grid[1][2]);

    // Iterating over a 2D array
    for row in &grid {
        for cell in row {
            print!("{:4}", cell); // Print with padding
        }
        println!();
    }
}
```

## Slice Types and Dynamic Size

Slices are a view into a contiguous sequence of elements in a collection. Unlike arrays, slices have a dynamic size determined at runtime.

### Creating Slices

```rust
fn main() {
    // Create an array
    let numbers = [1, 2, 3, 4, 5];

    // Create slices from the array
    let all: &[i32] = &numbers[..]; // Slice of the entire array
    let first_three: &[i32] = &numbers[0..3]; // Slice from index 0 to 2
    let last_two: &[i32] = &numbers[3..5]; // Slice from index 3 to 4

    println!("All: {:?}", all);
    println!("First three: {:?}", first_three);
    println!("Last two: {:?}", last_two);

    // Alternative syntax
    let first_three_alt = &numbers[..3]; // From start to index 2
    let last_two_alt = &numbers[3..]; // From index 3 to end

    println!("First three (alt): {:?}", first_three_alt);
    println!("Last two (alt): {:?}", last_two_alt);
}
```

### Slice Type Signature

Slices have the type `&[T]` for some type `T`:

```rust
fn main() {
    // Array
    let numbers = [1, 2, 3, 4, 5];

    // Various ways to create slices
    let slice1: &[i32] = &numbers;
    let slice2: &[i32] = &numbers[1..4];

    // The len() method returns the slice length
    println!("Slice 1 length: {}", slice1.len());
    println!("Slice 2 length: {}", slice2.len());

    // Slices implement Debug
    println!("Slice 1: {:?}", slice1);
    println!("Slice 2: {:?}", slice2);
}
```

### Using Slices in Functions

Slices are a flexible way to pass arrays or parts of arrays to functions:

```rust
// This function takes a slice, so it can accept:
// - A whole array reference
// - A slice of an array
// - A slice of a vector
fn sum(numbers: &[i32]) -> i32 {
    let mut total = 0;
    for number in numbers {
        total += number;
    }
    total
}

fn main() {
    let array = [1, 2, 3, 4, 5];
    let vector = vec![6, 7, 8, 9, 10];

    // Using the whole array
    println!("Sum of array: {}", sum(&array));

    // Using a slice of the array
    println!("Sum of first 3 elements: {}", sum(&array[0..3]));

    // Using a vector
    println!("Sum of vector: {}", sum(&vector));

    // Using a slice of the vector
    println!("Sum of last 2 elements: {}", sum(&vector[3..]));
}
```

### Mutable Slices

Slices can be mutable, allowing you to modify the original data:

```rust
fn double_elements(numbers: &mut [i32]) {
    for number in numbers {
        *number *= 2;
    }
}

fn main() {
    let mut array = [1, 2, 3, 4, 5];

    println!("Before: {:?}", array);

    // Double all elements
    double_elements(&mut array);
    println!("After doubling all: {:?}", array);

    // Double just a slice
    double_elements(&mut array[1..4]);
    println!("After doubling middle: {:?}", array);
}
```

### String Slices

String slices (`&str`) are a specific kind of slice that must contain valid UTF-8:

```rust
fn main() {
    let message = String::from("Hello, world!");

    // Creating string slices
    let hello: &str = &message[0..5];
    let world: &str = &message[7..12];

    println!("{} {}", hello, world);

    // String literals are already &str
    let greeting: &str = "Hello, world!";

    // Functions that accept &str
    print_message(hello);
    print_message(world);
    print_message(greeting);
    print_message(&message); // String coerces to &str
}

fn print_message(message: &str) {
    println!("Message: {}", message);
}
```

### Slices vs References

It's important to understand the difference between slices and simple references:

```rust
fn main() {
    let array = [1, 2, 3, 4, 5];

    // Reference to the whole array (type: &[i32; 5])
    let array_ref: &[i32; 5] = &array;

    // Slice of the whole array (type: &[i32])
    let slice: &[i32] = &array[..];

    println!("Array reference: {:?}", array_ref);
    println!("Slice: {:?}", slice);

    // Key differences:
    // 1. The reference knows the exact size (5)
    // 2. The slice has a dynamic size

    // This works
    process_slice(slice);

    // This also works - array ref coerces to slice
    process_slice(array_ref);

    // But the reverse isn't true:
    // let array_ref_2: &[i32; 5] = slice; // Error: expected reference, found slice
}

fn process_slice(slice: &[i32]) {
    println!("Processing {} elements", slice.len());
}
```

## String Interpolation and Formatting

Rust provides powerful string formatting capabilities through the `format!` macro and related macros.

### Basic String Formatting

The simplest form of string formatting uses `{}` placeholders:

```rust
fn main() {
    let name = "Alice";
    let age = 30;

    // Basic interpolation
    let message = format!("Hello, my name is {} and I am {} years old.", name, age);
    println!("{}", message);

    // Multiple values
    println!("Name: {}, Age: {}, Year: {}", name, age, 2023);
}
```

### Positional Arguments

You can reference arguments by position:

```rust
fn main() {
    let x = 10;
    let y = 20;

    // Using positional arguments
    println!("Default order: {}, {}", x, y);
    println!("Reversed order: {1}, {0}", x, y);

    // Reusing arguments
    println!("First: {0}, second: {1}, first again: {0}", x, y);

    // Mixed numbered and unnumbered
    println!("Mixed: {0}, {}, {}, {0}", x, y);
}
```

### Named Arguments

For more readable formatting, you can use named arguments:

```rust
fn main() {
    let name = "Bob";
    let score = 95.6;

    // Using named arguments
    println!("{name} scored {score}%");
    println!("{person} achieved {result}%", person = name, result = score);

    // Mixing named and positional
    println!("{0}: {score}, {1}: {percent}%",
             "Score", "Percentage", score = score, percent = score);
}
```

### Formatting Specifiers

Rust provides many formatting options:

```rust
fn main() {
    // Integer formatting
    println!("Default: {}", 42);
    println!("Binary: {:b}", 42);
    println!("Octal: {:o}", 42);
    println!("Hexadecimal: {:x}", 42);
    println!("Hexadecimal (uppercase): {:X}", 42);

    // Floating point formatting
    let pi = 3.14159265359;
    println!("Default: {}", pi);
    println!("Two decimal places: {:.2}", pi);
    println!("Scientific notation: {:e}", pi);
    println!("Width of 10, 3 decimals: {:10.3}", pi);

    // Padding and alignment
    println!("Right-aligned: {:>10}", "text");  // "      text"
    println!("Left-aligned: {:<10}", "text");   // "text      "
    println!("Centered: {:^10}", "text");       // "   text   "

    // Custom padding character
    println!("Zero-padded: {:0>5}", "42");      // "00042"
    println!("Hash-padded: {:#>5}", "42");      // "###42"

    // Sign control
    println!("Always show sign: {:+}", 42);     // "+42"
    println!("Negative numbers only: {:-}", 42); // "42"
    println!("Space for positive: {: }", 42);   // " 42"
}
```

### Debug Formatting

The `Debug` trait provides formatting for debugging:

```rust
fn main() {
    // Basic types
    println!("Debug format: {:?}", "hello");

    // Collections
    let numbers = vec![1, 2, 3];
    println!("Vector: {:?}", numbers);

    // Pretty printing
    let complex = vec![vec![1, 2], vec![3, 4]];
    println!("Regular debug: {:?}", complex);
    println!("Pretty debug: {:#?}", complex);

    // Custom structs
    #[derive(Debug)]
    struct Person {
        name: String,
        age: u32,
    }

    let person = Person {
        name: String::from("Charlie"),
        age: 25,
    };

    println!("Person: {:?}", person);
    println!("Person (pretty): {:#?}", person);
}
```

### Display vs Debug

Rust separates user-facing formatting (`Display`) from debugging output (`Debug`):

```rust
use std::fmt;

struct Point {
    x: i32,
    y: i32,
}

// Implement Display for user-friendly output
impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

// Implement Debug for detailed output
impl fmt::Debug for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "Point {{ x: {}, y: {} }}", self.x, self.y)
    }
}

fn main() {
    let point = Point { x: 10, y: 20 };

    // Display format (user-friendly)
    println!("Display: {}", point);

    // Debug format (programmer-friendly)
    println!("Debug: {:?}", point);
}
```

### Formatting to String

Use `format!` to create strings without printing them:

```rust
fn main() {
    let name = "Dave";
    let age = 35;
    let city = "New York";

    // Create a formatted string
    let profile = format!(
        "Name: {}\nAge: {}\nCity: {}",
        name, age, city
    );

    println!("Profile:\n{}", profile);

    // Create URLs or other structured strings
    let base_url = "https://example.com";
    let endpoint = "users";
    let id = 42;

    let url = format!("{}/{}/{}", base_url, endpoint, id);
    println!("URL: {}", url);
}
```

## Common String Manipulation Patterns

Let's explore some common patterns and techniques for working with strings in Rust.

### Splitting and Joining Strings

Rust provides powerful methods for splitting and joining strings:

```rust
fn main() {
    // Splitting by delimiter
    let csv = "apple,banana,cherry,date";
    let fruits: Vec<&str> = csv.split(',').collect();
    println!("Fruits: {:?}", fruits);

    // Splitting with multiple delimiters
    let text = "apple,banana;cherry.date";
    let fruits: Vec<&str> = text.split(&[',', ';', '.'][..]).collect();
    println!("Fruits with multiple delimiters: {:?}", fruits);

    // Splitting whitespace
    let sentence = "The quick brown fox";
    let words: Vec<&str> = sentence.split_whitespace().collect();
    println!("Words: {:?}", words);

    // Splitting lines
    let multiline = "Line 1\nLine 2\nLine 3";
    let lines: Vec<&str> = multiline.lines().collect();
    println!("Lines: {:?}", lines);

    // Joining with a delimiter
    let words = ["Hello", "world", "from", "Rust"];
    let sentence = words.join(" ");
    println!("Joined: {}", sentence);

    // Joining with iterator
    let numbers = [1, 2, 3, 4, 5];
    let joined: String = numbers.iter()
        .map(|n| n.to_string())
        .collect::<Vec<String>>()
        .join("-");
    println!("Joined numbers: {}", joined);
}
```

### Finding and Replacing

Rust offers various ways to find and replace content within strings:

```rust
fn main() {
    let text = "Rust is a systems programming language";

    // Finding substrings
    if let Some(pos) = text.find("systems") {
        println!("'systems' found at position: {}", pos);
    }

    // Finding with predicate
    if let Some(pos) = text.find(|c: char| c.is_uppercase()) {
        println!("First uppercase letter at position: {}", pos);
    }

    // Finding last occurrence
    if let Some(pos) = text.rfind('a') {
        println!("Last 'a' found at position: {}", pos);
    }

    // Simple replacement
    let replaced = text.replace("systems", "modern systems");
    println!("After replace: {}", replaced);

    // Replace all occurrences
    let text = "Rust is fast, Rust is safe, Rust is productive";
    let replaced_all = text.replace("Rust", "Rust 🦀");
    println!("After replacing all: {}", replaced_all);

    // Replace with pattern and limit
    let replaced_pattern = text.replacen("Rust", "Rust 🦀", 2); // Replace only first 2
    println!("After replacing pattern: {}", replaced_pattern);

    // Replace with closures (using regex)
    // For more complex replacements, the regex crate is recommended
    // Example: text.replace(regex, |caps| format!("{}", caps[1].to_uppercase()))
}
```

### Transforming Case

Case conversion is a common operation:

```rust
fn main() {
    let mixed_case = "Hello World";

    // Case conversion
    println!("Uppercase: {}", mixed_case.to_uppercase());
    println!("Lowercase: {}", mixed_case.to_lowercase());

    // Checking case
    let uppercase = "HELLO";
    let lowercase = "hello";
    let mixed = "Hello";

    println!("Is 'HELLO' all uppercase? {}", uppercase.chars().all(|c| c.is_uppercase() || !c.is_alphabetic()));
    println!("Is 'hello' all lowercase? {}", lowercase.chars().all(|c| c.is_lowercase() || !c.is_alphabetic()));

    // Custom title case (capitalize first letter of each word)
    let title_case: String = mixed_case
        .split_whitespace()
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
            }
        })
        .collect::<Vec<String>>()
        .join(" ");

    println!("Title case: {}", title_case);
}
```

### Trimming and Padding

Removing whitespace and adjusting string length:

```rust
fn main() {
    // Trimming
    let padded = "   Hello, world!   ";
    println!("Original: '{}'", padded);
    println!("Trimmed: '{}'", padded.trim());
    println!("Trim start: '{}'", padded.trim_start());
    println!("Trim end: '{}'", padded.trim_end());

    // Trimming specific characters
    let text = "###Hello, world!***";
    println!("Trimmed specific chars: '{}'", text.trim_matches(|c| c == '#' || c == '*'));

    // Padding a string to a minimum length
    let short = "Hello";
    println!("Right-padded: '{}'", format!("{:10}", short));  // Pad with spaces to width 10
    println!("Left-padded: '{}'", format!("{:>10}", short));  // Right-aligned

    // Custom padding
    println!("Zero-padded: '{}'", format!("{:0>8}", "42"));   // Pad with zeros to width 8
}
```

### Parsing Strings to Other Types

Converting strings to other data types is a common operation:

```rust
fn main() {
    // Parsing basic types
    let num_str = "42";
    let num: i32 = num_str.parse().unwrap();
    println!("Parsed number: {} ({})", num, num + 1);

    // With explicit type annotation
    let float_str = "3.14159";
    let pi: f64 = float_str.parse().unwrap();
    println!("π ≈ {}", pi);

    // With error handling
    let not_a_num = "hello";
    match not_a_num.parse::<i32>() {
        Ok(n) => println!("Parsed number: {}", n),
        Err(e) => println!("Error parsing: {}", e),
    }

    // Using the try_from pattern (requires a specific import)
    let hex_str = "FF";
    let hex_value = u8::from_str_radix(hex_str, 16).unwrap();
    println!("Hex FF as decimal: {}", hex_value);

    // Parsing complex types
    let point_str = "(10,20)";
    let coords: (i32, i32) = {
        // A simple parser for demonstration
        let inner = point_str.trim_matches(|c| c == '(' || c == ')');
        let parts: Vec<&str> = inner.split(',').collect();
        if parts.len() == 2 {
            (parts[0].parse().unwrap(), parts[1].parse().unwrap())
        } else {
            panic!("Invalid format")
        }
    };
    println!("Parsed point: {:?}", coords);
}
```

### Working with Unicode

Proper handling of Unicode is essential for international text:

```rust
fn main() {
    // Counting characters vs bytes
    let text = "Здравствуйте"; // Russian greeting
    println!("Text: {}", text);
    println!("Bytes: {}", text.len());
    println!("Characters: {}", text.chars().count());

    // Iterating through Unicode characters
    println!("Characters in '{}':", text);
    for (i, c) in text.chars().enumerate() {
        println!("{}: '{}' (byte size: {})", i, c, c.len_utf8());
    }

    // Normalizing Unicode (conceptual example)
    // For real applications, use the 'unicode-normalization' crate
    let cafe1 = "café"; // Single code point 'é'
    let cafe2 = "cafe\u{0301}"; // 'e' + combining accent

    println!("café (composed): {} ({} bytes)", cafe1, cafe1.len());
    println!("café (decomposed): {} ({} bytes)", cafe2, cafe2.len());

    // Validating UTF-8
    let valid_bytes = [72, 101, 108, 108, 111]; // "Hello"
    let is_valid = std::str::from_utf8(&valid_bytes).is_ok();
    println!("Is valid UTF-8? {}", is_valid);
}
```

### Filtering and Mapping Characters

Transforming strings at the character level:

```rust
fn main() {
    let text = "H3llo, W0rld! 123";

    // Filter only alphabetic characters
    let letters: String = text.chars()
        .filter(|c| c.is_alphabetic())
        .collect();
    println!("Letters only: {}", letters);

    // Filter and transform
    let doubled: String = text.chars()
        .filter(|c| c.is_alphanumeric())
        .map(|c| if c.is_numeric() { 'X' } else { c })
        .collect();
    println!("Transformed: {}", doubled);

    // Count specific characters
    let digit_count = text.chars().filter(|c| c.is_numeric()).count();
    println!("Number of digits: {}", digit_count);

    // Remove spaces
    let no_spaces = text.chars().filter(|c| !c.is_whitespace()).collect::<String>();
    println!("Without spaces: {}", no_spaces);
}
```

### Handling Common Patterns

Some practical examples for everyday string tasks:

```rust
fn main() {
    // Check if string starts or ends with specific text
    let filename = "document.pdf";
    println!("Is PDF? {}", filename.ends_with(".pdf"));
    println!("Is document? {}", filename.starts_with("document"));

    // Counting occurrences
    let text = "She sells seashells by the seashore";
    let count = text.matches("se").count();
    println!("Occurrences of 'se': {}", count);

    // Checking if string contains only specific characters
    let numeric = "12345";
    let is_numeric = numeric.chars().all(|c| c.is_numeric());
    println!("Is numeric? {}", is_numeric);

    // Reversing words in a sentence
    let sentence = "The quick brown fox";
    let reversed_words: String = sentence
        .split_whitespace()
        .rev()
        .collect::<Vec<&str>>()
        .join(" ");
    println!("Reversed words: {}", reversed_words);

    // Creating an acronym
    let phrase = "Portable Network Graphics";
    let acronym: String = phrase
        .split_whitespace()
        .map(|word| word.chars().next().unwrap().to_uppercase().to_string())
        .collect();
    println!("Acronym: {}", acronym);
}
```

### Working with String Builders

For building strings incrementally with good performance:

```rust
fn main() {
    // Pre-allocate capacity for better performance
    let mut builder = String::with_capacity(100);

    // Add content incrementally
    builder.push_str("Hello");
    builder.push_str(", ");
    builder.push_str("world");
    builder.push('!');

    println!("Built string: {}", builder);
    println!("Length: {}, Capacity: {}", builder.len(), builder.capacity());

    // Using with a loop
    let items = ["apple", "banana", "cherry", "date"];
    let mut list = String::with_capacity(100);

    for (i, item) in items.iter().enumerate() {
        if i > 0 {
            list.push_str(", ");
        }
        list.push_str(item);
    }

    println!("Item list: {}", list);
}
```

## 🔨 Project: String Manipulation Library

Let's create a useful string manipulation library that showcases many of the techniques we've learned in this chapter. Our library will provide a collection of functions for common text processing tasks.

### Project Requirements

1. Create a set of reusable string manipulation utilities
2. Handle UTF-8 text correctly, including international characters
3. Provide efficient implementations with good performance
4. Include thorough documentation and tests
5. Create a simple demo application to showcase the library

### Step 1: Setting Up the Project

Let's start by creating a new Rust project:

```bash
cargo new string_utils --lib
cd string_utils
```

### Step 2: Core String Utilities

Let's implement our core library functions in `src/lib.rs`:

````rust
//! # String Utils
//!
//! A collection of utilities for string manipulation in Rust.
//! This library provides functions for common text processing tasks
//! with proper UTF-8 handling.

/// Counts words in a string, respecting Unicode word boundaries.
///
/// # Examples
///
/// ```
/// let count = string_utils::count_words("Hello, world!");
/// assert_eq!(count, 2);
/// ```
pub fn count_words(text: &str) -> usize {
    text.split_whitespace().count()
}

/// Reverses a string, preserving UTF-8 character boundaries.
///
/// # Examples
///
/// ```
/// let reversed = string_utils::reverse_string("Hello");
/// assert_eq!(reversed, "olleH");
/// ```
pub fn reverse_string(text: &str) -> String {
    text.chars().rev().collect()
}

/// Capitalizes the first letter of each word.
///
/// # Examples
///
/// ```
/// let title_case = string_utils::title_case("hello world");
/// assert_eq!(title_case, "Hello World");
/// ```
pub fn title_case(text: &str) -> String {
    let mut result = String::with_capacity(text.len());
    let mut capitalize_next = true;

    for c in text.chars() {
        if c.is_whitespace() || c.is_punctuation() {
            capitalize_next = true;
            result.push(c);
        } else if capitalize_next {
            result.push(c.to_uppercase().next().unwrap_or(c));
            capitalize_next = false;
        } else {
            result.push(c);
        }
    }

    result
}

/// Truncates a string to a maximum length, respecting UTF-8 character boundaries.
/// Adds an ellipsis (...) if truncated.
///
/// # Examples
///
/// ```
/// let truncated = string_utils::truncate("Hello, world!", 5);
/// assert_eq!(truncated, "Hello...");
/// ```
pub fn truncate(text: &str, max_length: usize) -> String {
    if text.chars().count() <= max_length {
        return text.to_string();
    }

    let mut result = String::new();
    let mut char_count = 0;

    for c in text.chars() {
        if char_count < max_length {
            result.push(c);
            char_count += 1;
        } else {
            break;
        }
    }

    result.push_str("...");
    result
}

/// Removes extra whitespace, including leading, trailing, and duplicate spaces.
///
/// # Examples
///
/// ```
/// let cleaned = string_utils::normalize_whitespace("  Hello   world  ");
/// assert_eq!(cleaned, "Hello world");
/// ```
pub fn normalize_whitespace(text: &str) -> String {
    let mut result = String::with_capacity(text.len());
    let mut last_was_space = false;

    for c in text.trim().chars() {
        if c.is_whitespace() {
            if !last_was_space {
                result.push(' ');
                last_was_space = true;
            }
        } else {
            result.push(c);
            last_was_space = false;
        }
    }

    result
}

/// Checks if text is a palindrome, ignoring case, punctuation, and whitespace.
///
/// # Examples
///
/// ```
/// assert!(string_utils::is_palindrome("A man, a plan, a canal: Panama"));
/// assert!(!string_utils::is_palindrome("hello"));
/// ```
pub fn is_palindrome(text: &str) -> bool {
    let filtered: Vec<char> = text
        .chars()
        .filter(|c| c.is_alphanumeric())
        .map(|c| c.to_lowercase().next().unwrap())
        .collect();

    let half_len = filtered.len() / 2;

    for i in 0..half_len {
        if filtered[i] != filtered[filtered.len() - 1 - i] {
            return false;
        }
    }

    true
}

/// Extracts all email addresses from a text.
///
/// # Examples
///
/// ```
/// let emails = string_utils::extract_emails("Contact us at info@example.com or support@example.org");
/// assert_eq!(emails, vec!["info@example.com", "support@example.org"]);
/// ```
pub fn extract_emails(text: &str) -> Vec<String> {
    // A simple regex-free email extractor for demonstration
    // A production version would use a proper regex
    let mut emails = Vec::new();
    let mut word_start = 0;
    let mut in_word = false;

    for (i, c) in text.char_indices() {
        if c.is_alphanumeric() || c == '.' || c == '@' || c == '_' || c == '-' {
            if !in_word {
                word_start = i;
                in_word = true;
            }
        } else {
            if in_word {
                let word = &text[word_start..i];
                if word.contains('@') {
                    // Simple validation - contains @ and at least one . after @
                    let parts: Vec<&str> = word.split('@').collect();
                    if parts.len() == 2 && !parts[0].is_empty() && parts[1].contains('.') {
                        emails.push(word.to_string());
                    }
                }
                in_word = false;
            }
        }
    }

    // Check the last word
    if in_word {
        let word = &text[word_start..];
        if word.contains('@') {
            let parts: Vec<&str> = word.split('@').collect();
            if parts.len() == 2 && !parts[0].is_empty() && parts[1].contains('.') {
                emails.push(word.to_string());
            }
        }
    }

    emails
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_count_words() {
        assert_eq!(count_words("Hello, world!"), 2);
        assert_eq!(count_words("One two three four"), 4);
        assert_eq!(count_words(""), 0);
        assert_eq!(count_words("    "), 0);
        assert_eq!(count_words("Hello   multiple   spaces"), 3);
    }

    #[test]
    fn test_reverse_string() {
        assert_eq!(reverse_string("hello"), "olleh");
        assert_eq!(reverse_string("Привет"), "тевирП");
        assert_eq!(reverse_string(""), "");
        assert_eq!(reverse_string("a"), "a");
    }

    #[test]
    fn test_title_case() {
        assert_eq!(title_case("hello world"), "Hello World");
        assert_eq!(title_case("the quick brown fox"), "The Quick Brown Fox");
        assert_eq!(title_case(""), "");
        assert_eq!(title_case("hello-world"), "Hello-World");
    }

    #[test]
    fn test_truncate() {
        assert_eq!(truncate("Hello, world!", 5), "Hello...");
        assert_eq!(truncate("Hello", 10), "Hello");
        assert_eq!(truncate("", 5), "");
        assert_eq!(truncate("Привет", 3), "При...");
    }

    #[test]
    fn test_normalize_whitespace() {
        assert_eq!(normalize_whitespace("  Hello   world  "), "Hello world");
        assert_eq!(normalize_whitespace("No  duplicate    spaces"), "No duplicate spaces");
        assert_eq!(normalize_whitespace(""), "");
        assert_eq!(normalize_whitespace("   "), "");
    }

    #[test]
    fn test_is_palindrome() {
        assert!(is_palindrome("A man, a plan, a canal: Panama"));
        assert!(is_palindrome("racecar"));
        assert!(is_palindrome("Madam, I'm Adam"));
        assert!(!is_palindrome("hello"));
        assert!(is_palindrome(""));
        assert!(is_palindrome("a"));
    }

    #[test]
    fn test_extract_emails() {
        assert_eq!(
            extract_emails("Contact us at info@example.com"),
            vec!["info@example.com"]
        );
        assert_eq!(
            extract_emails("Multiple emails: one@example.com and two@example.org"),
            vec!["one@example.com", "two@example.org"]
        );
        assert_eq!(extract_emails("No emails here"), Vec::<String>::new());
    }
}
````

### Step 3: Advanced Text Analysis Functions

Let's add some more advanced functionality:

````rust
use std::collections::{HashMap, HashSet};

/// Calculates the Jaccard similarity between two strings.
///
/// The Jaccard similarity measures the similarity of two sets
/// by looking at the ratio of their intersection size to their union size.
///
/// # Examples
///
/// ```
/// let similarity = string_utils::jaccard_similarity(
///     "rust programming language",
///     "the rust programming environment"
/// );
/// assert!(similarity > 0.0 && similarity < 1.0);
/// ```
pub fn jaccard_similarity(text1: &str, text2: &str) -> f64 {
    // Convert to sets of words
    let words1: HashSet<&str> = text1.split_whitespace().collect();
    let words2: HashSet<&str> = text2.split_whitespace().collect();

    if words1.is_empty() && words2.is_empty() {
        return 1.0; // Both empty means identical
    }

    // Calculate intersection and union sizes
    let intersection_size = words1.intersection(&words2).count();
    let union_size = words1.union(&words2).count();

    // Jaccard similarity coefficient
    intersection_size as f64 / union_size as f64
}

/// Finds the longest common substring between two strings.
///
/// # Examples
///
/// ```
/// let common = string_utils::longest_common_substring("hello world", "hello rust");
/// assert_eq!(common, "hello ");
/// ```
pub fn longest_common_substring<'a>(text1: &'a str, text2: &'a str) -> &'a str {
    if text1.is_empty() || text2.is_empty() {
        return "";
    }

    let mut longest_start = 0;
    let mut longest_length = 0;

    // Simple implementation - not the most efficient but easy to understand
    for i in 0..text1.len() {
        for j in 0..text2.len() {
            let mut length = 0;

            while i + length < text1.len() &&
                  j + length < text2.len() &&
                  text1.as_bytes()[i + length] == text2.as_bytes()[j + length] {
                length += 1;
            }

            if length > longest_length {
                longest_length = length;
                longest_start = i;
            }
        }
    }

    if longest_length == 0 {
        return "";
    }

    &text1[longest_start..longest_start + longest_length]
}
````

### Step 4: Creating a Demo Application

Now let's create a simple application to demonstrate our library. In `src/main.rs`:

```rust
use string_utils::{count_words, reverse_string, title_case, truncate};
use std::io::{self, Write};

fn main() {
    println!("🦀 String Utilities Demo 🦀");
    println!("Enter text to process (or 'quit' to exit):");

    loop {
        print!("> ");
        io::stdout().flush().unwrap();

        let mut input = String::new();
        io::stdin().read_line(&mut input).unwrap();

        let input = input.trim();
        if input.eq_ignore_ascii_case("quit") {
            break;
        }

        if input.is_empty() {
            continue;
        }

        process_command(input);
    }

    println!("Goodbye!");
}

fn process_command(input: &str) {
    if input.is_empty() {
        return;
    }

    let parts: Vec<&str> = input.splitn(2, ' ').collect();
    if parts.len() < 2 {
        println!("Invalid command. Type 'help' for assistance.");
        return;
    }

    let command = parts[0].to_lowercase();
    let args = parts[1];

    match command.as_str() {
        "analyze" => analyze_text(args),
        "reverse" => println!("Reversed: {}", reverse_string(args)),
        "titlecase" => println!("Title case: {}", title_case(args)),
        "truncate" => {
            let trunc_parts: Vec<&str> = args.splitn(2, ' ').collect();
            if trunc_parts.len() == 2 {
                if let Ok(len) = trunc_parts[1].parse::<usize>() {
                    println!("Truncated: {}", truncate(trunc_parts[0], len));
                } else {
                    println!("Invalid length. Please enter a valid number.");
                }
            } else {
                println!("Usage: truncate <text> <length>");
            }
        },
        "normalize" => println!("Normalized: '{}'", normalize_whitespace(args)),
        "palindrome" => {
            if is_palindrome(args) {
                println!("'{}' is a palindrome!", args);
            } else {
                println!("'{}' is NOT a palindrome.", args);
            }
        },
        "emails" => {
            let emails = extract_emails(args);
            if emails.is_empty() {
                println!("No email addresses found.");
            } else {
                println!("Found {} email(s):", emails.len());
                for (i, email) in emails.iter().enumerate() {
                    println!("  {}. {}", i + 1, email);
                }
            }
        },
        "help" => print_help(),
        "quit" => break,
        _ => println!("Unknown command. Type 'help' for assistance."),
    }
}

fn print_help() {
    println!("\nAvailable commands:");
    println!("  analyze <text>          - Show basic text analysis");
    println!("  reverse <text>          - Reverse a string");
    println!("  titlecase <text>        - Convert text to title case");
    println!("  truncate <text> <len>   - Truncate text to specified length");
    println!("  normalize <text>        - Normalize whitespace");
    println!("  palindrome <text>       - Check if text is a palindrome");
    println!("  emails <text>           - Extract email addresses");
    println!("  help                    - Show this help");
    println!("  quit                    - Exit the program");
    println!();
}

fn analyze_text(text: &str) {
    println!("\nAnalysis of: '{}'", text);
    println!("Length: {} bytes, {} characters", text.len(), text.chars().count());
    println!("Word count: {}", count_words(text));
    println!("Line count: {}", text.lines().count());

    let frequencies = word_frequencies(text);
    if !frequencies.is_empty() {
        println!("Top words:");

        // Sort by frequency
        let mut word_counts: Vec<(&String, &usize)> = frequencies.iter().collect();
        word_counts.sort_by(|a, b| b.1.cmp(a.1));

        // Print top 5 or fewer
        for (i, (word, count)) in word_counts.iter().take(5).enumerate() {
            println!("  {}. '{}': {} time(s)", i + 1, word, count);
        }
    }

    // Check if palindrome
    if is_palindrome(text) {
        println!("This text is a palindrome.");
    }

    // Show character distribution
    let mut char_types = HashMap::new();
    char_types.insert("letters", 0);
    char_types.insert("digits", 0);
    char_types.insert("spaces", 0);
    char_types.insert("punctuation", 0);
    char_types.insert("other", 0);

    for c in text.chars() {
        let category = if c.is_alphabetic() {
            "letters"
        } else if c.is_numeric() {
            "digits"
        } else if c.is_whitespace() {
            "spaces"
        } else if c.is_ascii_punctuation() {
            "punctuation"
        } else {
            "other"
        };

        *char_types.entry(category).or_insert(0) += 1;
    }

    println!("Character types:");
    for (category, count) in char_types.iter() {
        if *count > 0 {
            println!("  {}: {}", category, count);
        }
    }
}
```

### Step 5: Building and Running the Project

```bash
cargo build
cargo run
```

Our demo application provides a command-line interface to test the various string utilities. You can try commands like:

```
analyze The quick brown fox jumps over the lazy dog
palindrome A man, a plan, a canal: Panama
compare Rust is amazing | Rust is fantastic
```

### Extending the Library

Here are some ideas for further expanding this string utilities library:

1. **Add Unicode normalization**: Implement functions to normalize Unicode text (NFC, NFD, etc.)
2. **Create specialized text processors**: Add parsers for specific formats like CSV, JSON, etc.
3. **Improve performance**: Optimize key functions for large text processing
4. **Add localization support**: Functions for specific language requirements
5. **Implement full-text search**: Simple search algorithms with relevance ranking

## Summary

In this chapter, we've explored Rust's approach to strings and slices, which is more complex but also more powerful than many other programming languages. We've covered:

- The differences between `String` and `&str` and when to use each
- Why strings are complex, especially regarding UTF-8 encoding
- Creating, modifying, and manipulating strings
- Common string operations and methods
- Working with string data through concatenation and slicing
- Handling UTF-8 and Unicode correctly
- Array types and fixed-size arrays
- Slice types and dynamic sizing
- String formatting and interpolation
- Common string manipulation patterns

The project we built demonstrates how to create a practical string manipulation library that can be reused across multiple applications. By implementing proper UTF-8 handling, we ensured our library works correctly with text in any language.

Understanding strings and slices is crucial for Rust programming because text processing is fundamental to so many applications. The patterns and techniques we've explored in this chapter will serve as a solid foundation for working with textual data in your Rust projects.

## Exercises

1. Implement a function that counts characters by Unicode category (letters, numbers, symbols, etc.)
2. Create a function that validates if a string is a valid email address
3. Implement a simple text templating system that replaces placeholders with values
4. Write a function that encodes and decodes text using Caesar cipher
5. Create a utility that can split text into sentences, respecting punctuation rules
6. Implement a function that detects the language of a given text
7. Write a program that generates random pronounceable passwords
8. Create a function that converts numbers to their written form (e.g., 42 → "forty-two")

## Further Reading

- [The Rust Programming Language: Strings](https://doc.rust-lang.org/book/ch08-02-strings.html)
- [The Rust Standard Library: str](https://doc.rust-lang.org/std/primitive.str.html)
- [The Rust Standard Library: String](https://doc.rust-lang.org/std/string/struct.String.html)
- [Understanding Ownership in Rust](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)
- [Unicode Book](http://www.unicode.org/versions/latest/)
- [Rust By Example: Strings](https://doc.rust-lang.org/rust-by-example/std/str.html)
- [The unicode-segmentation Crate](https://crates.io/crates/unicode-segmentation)
