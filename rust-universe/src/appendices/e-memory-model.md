## Appendix E: Rust's Memory Model In-Depth

Understanding Rust's memory model is essential for writing efficient and correct code. This appendix provides a deeper exploration of how Rust manages memory.

### Memory Layout in Rust

#### Types and Memory Representation

Every type in Rust has a specific memory layout:

- **Primitive types**: Fixed size (e.g., `i32` is 4 bytes, `bool` is 1 byte)
- **Structs**: Fields laid out sequentially, with potential padding for alignment
- **Enums**: Size depends on the largest variant plus a discriminant
- **Trait objects**: Fat pointers (data pointer + vtable pointer)
- **References**: Single pointers (or fat pointers for slices/trait objects)
- **Raw pointers**: Same as references but without borrow checking

```rust
// Simple struct with predictable layout
struct Point {
    x: i32,  // 4 bytes
    y: i32,  // 4 bytes
}  // Total: 8 bytes

// Enum with variable size variants
enum Message {
    Quit,                       // 1 byte (discriminant)
    Move { x: i32, y: i32 },    // 9 bytes (discriminant + 8 bytes data)
    Write(String),              // 25 bytes (discriminant + 24 bytes for String)
}  // Total size: 25 bytes (largest variant)
```

### Memory Alignment

Rust ensures that types are properly aligned in memory:

- Types must be stored at memory addresses that are multiples of their alignment requirements
- Alignment ensures efficient memory access on hardware
- Padding may be inserted between struct fields to maintain alignment

```rust
struct Aligned {
    a: u8,    // 1 byte
    // 3 bytes padding
    b: u32,   // 4 bytes
    c: u8,    // 1 byte
    // 3 bytes padding
}  // Total: 12 bytes (not 6 bytes!)
```

### The Stack and the Heap

Rust, like many languages, uses both stack and heap memory:

- **Stack**: Fast, fixed-size memory that follows function call hierarchy

  - Stores function parameters, local variables, return addresses
  - Allocation and deallocation are automatic and extremely fast
  - Size must be known at compile time
  - Limited by stack size (often a few MB)

- **Heap**: Flexible memory pool for dynamic allocation
  - Allocated via `Box`, `Vec`, `String`, etc.
  - Size can be determined at runtime
  - Manual allocation and deallocation (handled by ownership in Rust)
  - Slower than stack, but much larger capacity

```rust
fn stack_and_heap() {
    let x = 42;                  // Stack allocated
    let y = Box::new(84);        // Heap allocated, box pointer on stack
    let z = vec![1, 2, 3, 4];    // Heap allocated, vector metadata on stack
}  // x, y, and z all cleaned up here
```

### Memory Allocation Details

#### Box<T>

`Box<T>` is Rust's simplest heap allocation type:

- Stores a single value of type T on the heap
- The box itself is a pointer-sized value on the stack
- Useful for recursive data structures, trait objects, or large values

```rust
// A recursive data structure needs Box
enum List<T> {
    Cons(T, Box<List<T>>),
    Nil,
}
```

#### Vec<T>

`Vec<T>` is a dynamic array:

- Contains three words on the stack: pointer to heap data, length, and capacity
- Contiguous memory on the heap for elements
- Grows by reallocating and copying when capacity is reached

```rust
let mut v = Vec::with_capacity(10);  // Allocates space for 10 elements
v.push(1);  // No reallocation needed until capacity exceeded
```

#### String

`String` is similar to `Vec<u8>` but guarantees UTF-8 encoding:

- Contains pointer, length, and capacity (like Vec)
- Heap-allocated bytes must be valid UTF-8

### Custom Allocators

Rust allows for custom memory allocators through the `alloc` trait:

```rust
use std::alloc::{GlobalAlloc, Layout, System};

struct MyAllocator;

unsafe impl GlobalAlloc for MyAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        // Custom allocation logic
        System.alloc(layout)
    }

    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        // Custom deallocation logic
        System.dealloc(ptr, layout)
    }
}

#[global_allocator]
static ALLOCATOR: MyAllocator = MyAllocator;
```

### Zero-Cost Abstractions in Memory Management

Rust's compiler optimizes memory operations:

- References have zero runtime cost compared to raw pointers
- Smart pointers compile to efficient machine code
- Ownership checking happens at compile time
- Move semantics avoid unnecessary copying

### Memory Ordering and Atomics

For concurrent code, Rust provides atomic types with specific memory ordering guarantees:

```rust
use std::sync::atomic::{AtomicUsize, Ordering};

let counter = AtomicUsize::new(0);

// Relaxed ordering - no synchronization
counter.fetch_add(1, Ordering::Relaxed);

// Acquire-Release ordering - synchronizes with other threads
counter.fetch_add(1, Ordering::AcqRel);

// Sequential consistency - strongest ordering guarantee
counter.fetch_add(1, Ordering::SeqCst);
```

### Memory Leaks

While Rust prevents memory safety issues, it doesn't guarantee prevention of memory leaks:

- Reference cycles with `Rc` or `Arc` can cause leaks
- `std::mem::forget` intentionally leaks memory
- Infinite loops prevent resource cleanup

```rust
use std::rc::Rc;
use std::cell::RefCell;

// Create a reference cycle
fn create_cycle() {
    type Link = Rc<RefCell<Option<Link>>>;

    let a: Link = Rc::new(RefCell::new(None));
    let b: Link = Rc::new(RefCell::new(None));

    // Create a cycle
    *a.borrow_mut() = Some(b.clone());
    *b.borrow_mut() = Some(a.clone());

    // Both a and b will never be freed
}
```

### Visualizing Memory

Understanding memory layout can be aided by tools:

- `std::mem::size_of` shows type sizes
- `std::mem::align_of` shows alignment requirements
- `#[repr(C)]` makes struct layout match C conventions
- Tools like `memmap` can help visualize actual memory

## Appendix F: Community Resources and Contribution Guide
