# Chapter 10: Advanced Ownership Patterns

## Introduction

In previous chapters, we explored Rust's fundamental ownership model, borrowing, and references. These core concepts provide memory safety without a garbage collector, but they can sometimes feel restrictive when building complex applications. In this chapter, we'll explore advanced ownership patterns that provide greater flexibility while maintaining Rust's safety guarantees.

Rust provides several mechanisms to handle situations where the basic ownership rules are too limiting, such as:

- Modifying data when multiple references exist
- Sharing data across thread boundaries
- Creating complex data structures with self-references
- Managing object lifetimes in sophisticated ways
- Implementing reference-counted or atomic resources

By the end of this chapter, you'll understand when and how to use these advanced patterns to build robust, safe, and flexible Rust applications.

## Interior Mutability Pattern

The interior mutability pattern allows you to mutate data even when there are immutable references to that data, which normally would violate Rust's borrowing rules.

### The Problem Interior Mutability Solves

In standard Rust code, you can't have both mutable and immutable references to the same data simultaneously:

```rust
fn main() {
    let x = 5;

    // This won't compile:
    let y = &x;
    let z = &mut x; // Error: cannot borrow `x` as mutable because it is also borrowed as immutable

    println!("{}", y);
}
```

This restriction helps prevent data races, but sometimes you need more flexibility. For example:

- Implementing a cache that appears immutable from the outside but needs to update internal state
- Modifying specific fields of a struct when only an immutable reference is available
- Building self-referential data structures where a part of the structure needs to change while other parts remain referenced

The interior mutability pattern solves these problems by moving the borrowing rules from compile-time to runtime, using safe abstractions.

## Cell, RefCell, and UnsafeCell

Rust provides several types in the standard library that implement interior mutability:

### Cell<T>: Simple Interior Mutability for Copy Types

`Cell<T>` provides a way to mutate values through shared references, but only for types that implement the `Copy` trait:

```rust
use std::cell::Cell;

fn main() {
    let counter = Cell::new(0);

    // Create multiple shared references
    let counter_ref1 = &counter;
    let counter_ref2 = &counter;

    // Modify the value through these references
    counter_ref1.set(counter_ref1.get() + 1);
    counter_ref2.set(counter_ref2.get() + 10);

    println!("Counter: {}", counter.get()); // Prints: Counter: 11
}
```

`Cell<T>` works by copying values in and out, making it efficient for small types like integers, booleans, and other `Copy` types. It provides methods like:

- `get()`: Returns a copy of the inner value (only for `Copy` types)
- `set()`: Replaces the inner value
- `replace()`: Replaces the inner value and returns the old value
- `into_inner()`: Consumes the `Cell` and returns the inner value

### RefCell<T>: Dynamic Borrowing for Any Type

`RefCell<T>` provides interior mutability for any type, not just `Copy` types, by checking borrowing rules at runtime:

```rust
use std::cell::RefCell;

fn main() {
    let data = RefCell::new(vec![1, 2, 3]);

    // Borrow mutably to modify the vector
    data.borrow_mut().push(4);

    // Borrow immutably to read the vector
    println!("Data: {:?}", data.borrow()); // Prints: Data: [1, 2, 3, 4]

    // Multiple immutable borrows are allowed
    let borrow1 = data.borrow();
    let borrow2 = data.borrow();
    println!("Length: {}, First element: {}", borrow1.len(), borrow2[0]);

    // This would panic at runtime:
    // let mut_borrow = data.borrow_mut(); // Error: already borrowed
}
```

`RefCell<T>` enforces Rust's borrowing rules at runtime:

- Multiple immutable borrows are allowed
- Only one mutable borrow is allowed
- No immutable borrows can exist when there's a mutable borrow

If these rules are violated, `RefCell` will panic.

The key methods provided by `RefCell<T>` are:

- `borrow()`: Returns an immutable reference (`Ref<T>`)
- `borrow_mut()`: Returns a mutable reference (`RefMut<T>`)
- `try_borrow()` and `try_borrow_mut()`: Non-panicking versions that return a `Result`

### UnsafeCell<T>: The Foundation of Interior Mutability

`UnsafeCell<T>` is the primitive type that powers all interior mutability in Rust. It's the only way in safe Rust to disable the compiler's compile-time borrowing checks:

```rust
use std::cell::UnsafeCell;

fn main() {
    let data = UnsafeCell::new(5);

    // Safe API to interact with UnsafeCell
    let value = unsafe { *data.get() };
    println!("Value: {}", value);

    // Modifying the value
    unsafe {
        *data.get() += 1;
    }

    let new_value = unsafe { *data.get() };
    println!("New value: {}", new_value); // Prints: New value: 6
}
```

`UnsafeCell` is rarely used directly and is primarily a building block for safer abstractions like `Cell` and `RefCell`. Using it requires `unsafe` code, as it provides no runtime checks for borrowing rules.

### When to Use Interior Mutability

Interior mutability should be used judiciously, as it moves checks from compile time to runtime. Good use cases include:

1. **Implementing methods that logically don't modify an object but need to update internal state:**

```rust
use std::cell::RefCell;

struct Logger {
    logs: RefCell<Vec<String>>,
}

impl Logger {
    fn new() -> Self {
        Logger {
            logs: RefCell::new(Vec::new()),
        }
    }

    // This method takes &self, not &mut self
    fn log(&self, message: &str) {
        self.logs.borrow_mut().push(message.to_string());
    }

    fn view_logs(&self) -> Vec<String> {
        self.logs.borrow().clone()
    }
}

fn main() {
    let logger = Logger::new();

    // Both references can modify the log
    let logger_ref1 = &logger;
    let logger_ref2 = &logger;

    logger_ref1.log("System started");
    logger_ref2.log("Processing data");

    for (i, entry) in logger.view_logs().iter().enumerate() {
        println!("{}: {}", i, entry);
    }
}
```

2. **Caching computation results:**

```rust
use std::cell::RefCell;
use std::collections::HashMap;

struct Fibonacci {
    cache: RefCell<HashMap<u64, u64>>,
}

impl Fibonacci {
    fn new() -> Self {
        let mut cache = HashMap::new();
        cache.insert(0, 0);
        cache.insert(1, 1);

        Fibonacci {
            cache: RefCell::new(cache),
        }
    }

    fn calculate(&self, n: u64) -> u64 {
        // Check if we've already calculated this value
        if let Some(&result) = self.cache.borrow().get(&n) {
            return result;
        }

        // Calculate the new value
        let result = self.calculate(n - 1) + self.calculate(n - 2);

        // Cache the result
        self.cache.borrow_mut().insert(n, result);

        result
    }
}

fn main() {
    let fib = Fibonacci::new();
    println!("Fibonacci(10) = {}", fib.calculate(10));
    println!("Fibonacci(20) = {}", fib.calculate(20));
}
```

3. **Observer patterns where callbacks need to modify state:**

```rust
use std::cell::RefCell;

struct Observer<F>
where
    F: FnMut(i32),
{
    callback: RefCell<F>,
}

impl<F> Observer<F>
where
    F: FnMut(i32),
{
    fn new(callback: F) -> Self {
        Observer {
            callback: RefCell::new(callback),
        }
    }

    fn notify(&self, value: i32) {
        let mut callback = self.callback.borrow_mut();
        callback(value);
    }
}

fn main() {
    let mut sum = 0;

    let observer = Observer::new(|value| {
        sum += value;
        println!("Received value: {}, Sum: {}", value, sum);
    });

    observer.notify(1);
    observer.notify(2);
    observer.notify(3);
}
```

## Mutex and RwLock for Thread Safety

Interior mutability types like `Cell` and `RefCell` are not thread-safe. For concurrent code, Rust provides thread-safe alternatives:

1. `Mutex<T>`: Mutual exclusion with exclusive access
2. `RwLock<T>`: Reader-writer lock allowing multiple readers or one writer

### Understanding Thread Safety

Thread safety refers to the ability to safely access and modify data from multiple threads without causing data races or undefined behavior. A data race occurs when:

1. Two or more threads access the same memory location concurrently
2. At least one of the accesses is a write
3. The threads are not using any synchronization mechanism

Rust's ownership system prevents these problems at compile time for most code, but interior mutability requires runtime checks. For thread-safe interior mutability, we need synchronization primitives.

### Mutex<T>: Mutual Exclusion

`Mutex<T>` (mutual exclusion) ensures that only one thread can access the contained data at a time:

```rust
use std::sync::Mutex;
use std::thread;

fn main() {
    // Create a mutex containing a counter
    let counter = Mutex::new(0);
    let mut handles = vec![];

    // Spawn 10 threads, each incrementing the counter 100 times
    for _ in 0..10 {
        let counter_ref = counter.clone();
        let handle = thread::spawn(move || {
            for _ in 0..100 {
                // Lock the mutex to get exclusive access
                let mut num = counter_ref.lock().unwrap();
                *num += 1;
                // The lock is automatically released when `num` goes out of scope
            }
        });
        handles.push(handle);
    }

    // Wait for all threads to complete
    for handle in handles {
        handle.join().unwrap();
    }

    println!("Final count: {}", *counter.lock().unwrap()); // Should print: Final count: 1000
}
```

Key aspects of `Mutex<T>`:

1. **Locking Mechanism**: To access the data, you must call `lock()`, which returns a `MutexGuard`
2. **RAII Guard**: The `MutexGuard` implements the `Drop` trait, automatically releasing the lock when it goes out of scope
3. **Poisoning**: If a thread panics while holding the lock, the mutex becomes "poisoned" and future `lock()` calls return an error
4. **Blocking**: If a thread tries to lock an already locked mutex, it will block (wait) until the lock is available

### RwLock<T>: Reader-Writer Lock

`RwLock<T>` (reader-writer lock) allows multiple readers or a single writer:

```rust
use std::sync::RwLock;
use std::thread;

fn main() {
    // Create a reader-writer lock containing data
    let data = RwLock::new(vec![1, 2, 3]);
    let mut handles = vec![];

    // Spawn reader threads
    for i in 0..3 {
        let data_ref = data.clone();
        let handle = thread::spawn(move || {
            // Multiple read locks can exist simultaneously
            let data_guard = data_ref.read().unwrap();
            println!("Reader {} sees: {:?}", i, *data_guard);
            // Lock is released when data_guard goes out of scope
        });
        handles.push(handle);
    }

    // Spawn a writer thread
    let data_ref = data.clone();
    let handle = thread::spawn(move || {
        // Only one write lock can exist, and no read locks can exist during a write
        let mut data_guard = data_ref.write().unwrap();
        data_guard.push(4);
        println!("Writer thread updated data: {:?}", *data_guard);
        // Lock is released when data_guard goes out of scope
    });
    handles.push(handle);

    // Wait for all threads to complete
    for handle in handles {
        handle.join().unwrap();
    }

    println!("Final data: {:?}", *data.read().unwrap());
}
```

Key aspects of `RwLock<T>`:

1. **Multiple Readers**: Many threads can have read access simultaneously
2. **Exclusive Writer**: Only one thread can have write access, and no readers can exist during a write
3. **Read/Write Methods**: Use `read()` for shared access and `write()` for exclusive access
4. **Performance Tradeoff**: More efficient than `Mutex` for read-heavy workloads, but with slightly higher overhead

### Atomic Types for Simple Cases

For simple types like integers and booleans, Rust provides atomic types that offer thread-safe operations without the need for locks:

```rust
use std::sync::atomic::{AtomicUsize, Ordering};
use std::thread;

fn main() {
    let counter = AtomicUsize::new(0);
    let mut handles = vec![];

    for _ in 0..10 {
        let counter_ref = &counter;
        let handle = thread::spawn(move || {
            for _ in 0..100 {
                // No locks needed, atomic operation
                counter_ref.fetch_add(1, Ordering::SeqCst);
            }
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Final count: {}", counter.load(Ordering::SeqCst));
}
```

Atomic types are more efficient than mutex-based solutions for simple operations but have limited functionality compared to mutex-protected values.

### Deadlocks and How to Prevent Them

When using locks, there's a risk of deadlock—a situation where two or more threads are blocked forever, each waiting for resources held by the others.

Common deadlock scenario:

```rust
use std::sync::{Mutex, MutexGuard};
use std::thread;
use std::time::Duration;

fn main() {
    let resource_a = Mutex::new(1);
    let resource_b = Mutex::new(2);

    // Thread 1: Tries to lock A, then B
    let thread1 = thread::spawn(move || {
        let _a = resource_a.lock().unwrap();
        println!("Thread 1: Locked resource A");

        // Sleep to increase chances of a deadlock
        thread::sleep(Duration::from_millis(100));

        let _b = resource_b.lock().unwrap();
        println!("Thread 1: Locked resource B");
    });

    // Thread 2: Tries to lock B, then A (opposite order)
    let thread2 = thread::spawn(move || {
        let _b = resource_b.lock().unwrap();
        println!("Thread 2: Locked resource B");

        // Sleep to increase chances of a deadlock
        thread::sleep(Duration::from_millis(100));

        let _a = resource_a.lock().unwrap();
        println!("Thread 2: Locked resource A");
    });

    thread1.join().unwrap();
    thread2.join().unwrap();
}
```

This code might deadlock because:

1. Thread 1 locks A and waits for B
2. Thread 2 locks B and waits for A
3. Neither thread can proceed

To prevent deadlocks:

1. **Lock Ordering**: Always acquire locks in a consistent order
2. **Minimal Critical Sections**: Hold locks for the shortest time possible
3. **Try-Lock Methods**: Use `try_lock()`, `try_read()`, and `try_write()` with timeout or retry logic
4. **Avoid Nested Locks**: Minimize the need to hold multiple locks simultaneously

Corrected example:

```rust
use std::sync::Mutex;
use std::thread;

fn main() {
    let resource_a = Mutex::new(1);
    let resource_b = Mutex::new(2);

    // Both threads lock resources in the same order: A then B
    let thread1 = thread::spawn(move || {
        let _a = resource_a.lock().unwrap();
        println!("Thread 1: Locked resource A");

        let _b = resource_b.lock().unwrap();
        println!("Thread 1: Locked resource B");
    });

    let thread2 = thread::spawn(move || {
        let _a = resource_a.lock().unwrap();
        println!("Thread 2: Locked resource A");

        let _b = resource_b.lock().unwrap();
        println!("Thread 2: Locked resource B");
    });

    thread1.join().unwrap();
    thread2.join().unwrap();
}
```

### Parking and Condition Variables

For more complex synchronization needs, Rust provides parking mechanisms and condition variables:

```rust
use std::sync::{Arc, Mutex, Condvar};
use std::thread;

fn main() {
    // Create a shared state
    let pair = Arc::new((Mutex::new(false), Condvar::new()));
    let pair_clone = Arc::clone(&pair);

    // Spawn a worker thread
    let handle = thread::spawn(move || {
        let (lock, cvar) = &*pair_clone;
        let mut started = lock.lock().unwrap();

        // Wait until the main thread signals us to start
        while !*started {
            started = cvar.wait(started).unwrap();
        }

        println!("Worker thread started!");
        // Do work...
    });

    // Main thread does some preparation...
    thread::sleep(std::time::Duration::from_secs(1));

    // Signal the worker thread to start
    let (lock, cvar) = &*pair;
    let mut started = lock.lock().unwrap();
    *started = true;
    cvar.notify_one();

    // Wait for the worker to finish
    handle.join().unwrap();
}
```

Condition variables are useful for thread coordination scenarios like producer-consumer patterns, thread pools, and synchronization barriers.

## Smart Pointers

Smart pointers are data structures that act like pointers but include additional metadata and capabilities. They implement the `Deref` and `Drop` traits to provide pointer-like behavior and automatic cleanup when they go out of scope.

Unlike raw pointers in languages like C and C++, Rust's smart pointers enforce memory safety rules while providing efficient memory management.

### Box<T>: Heap Allocation

`Box<T>` is the simplest smart pointer, providing heap allocation for data:

```rust
fn main() {
    // Stack-allocated integer
    let x = 5;
    println!("x is stored on the stack: {}", x);

    // Heap-allocated integer
    let y = Box::new(5);
    println!("y is stored on the heap: {}", *y);
}
```

`Box<T>` is useful for:

1. **Storing data on the heap**: When you need to store large data or when the size is unknown at compile time
2. **Transferring ownership**: Moving a large data structure without copying its contents
3. **Creating recursive types**: Making self-referential data structures with a known size
4. **Implementing trait objects**: Enabling polymorphism through dynamic dispatch

#### Using Box for Recursive Types

Rust needs to know the exact size of each type at compile time. This creates a challenge for recursive types like linked lists or trees. `Box` solves this by providing a fixed-size pointer to heap-allocated data:

```rust
// This won't compile without Box because Rust can't determine the size
// enum List {
//     Cons(i32, List),  // Error: recursive type has infinite size
//     Nil,
// }

// This works because Box has a fixed size
enum List {
    Cons(i32, Box<List>),
    Nil,
}

use List::{Cons, Nil};

fn main() {
    // Create a linked list: 1 -> 2 -> 3 -> Nil
    let list = Cons(1, Box::new(Cons(2, Box::new(Cons(3, Box::new(Nil))))));

    // Calculate the sum of all elements
    fn sum_list(list: &List) -> i32 {
        match list {
            Cons(value, next) => value + sum_list(next),
            Nil => 0,
        }
    }

    println!("Sum: {}", sum_list(&list)); // Prints: Sum: 6
}
```

#### Implementing the Deref Trait

The `Deref` trait allows a type to be treated like a reference, enabling the dereference operator (`*`):

```rust
use std::ops::Deref;

struct MyBox<T>(T);

impl<T> MyBox<T> {
    fn new(x: T) -> MyBox<T> {
        MyBox(x)
    }
}

impl<T> Deref for MyBox<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

fn main() {
    let x = 5;
    let y = MyBox::new(5);

    assert_eq!(5, x);
    assert_eq!(5, *y); // This works because of Deref
}
```

#### Deref Coercion

Rust automatically applies the `deref` method when passing a reference to a smart pointer to a function that expects a reference to the inner type:

```rust
fn hello(name: &str) {
    println!("Hello, {}!", name);
}

fn main() {
    let name = Box::new(String::from("Rust"));

    // Deref coercion: &Box<String> -> &String -> &str
    hello(&name);

    // Without deref coercion, we would need:
    // hello(&(*name)[..]);
}
```

### Rc<T>: Reference Counted Pointer

The `Rc<T>` (Reference Counted) smart pointer enables multiple ownership by keeping track of how many references exist to a value:

```rust
use std::rc::Rc;

fn main() {
    // Create a reference-counted string
    let text = Rc::new(String::from("Hello, world!"));
    println!("Initial reference count: {}", Rc::strong_count(&text)); // 1

    {
        // Create a clone (increases the reference count)
        let text2 = Rc::clone(&text);
        println!("Reference count after clone: {}", Rc::strong_count(&text)); // 2

        // Both can read the data
        println!("text: {}", text);
        println!("text2: {}", text2);
    } // text2 goes out of scope, reference count decreases

    println!("Reference count after scope: {}", Rc::strong_count(&text)); // 1
}
```

Key features of `Rc<T>`:

1. **Multiple Ownership**: Multiple variables can own the same data
2. **Reference Counting**: Keeps track of how many references exist to the data
3. **Immutable Access**: Only provides shared (immutable) access to the data
4. **Single-Threaded**: Not thread-safe, only for use within a single thread
5. **Clone is Cheap**: Cloning an `Rc` just increments a counter, not copying data

#### Common Use Cases for Rc

`Rc<T>` is useful for scenarios like:

1. **Graph-like data structures**: Where multiple nodes need to point to the same node
2. **Caches**: Where multiple parts of the code need access to the same cached data
3. **Object composition**: Where components need to share data

```rust
use std::rc::Rc;

struct Node {
    value: i32,
    children: Vec<Rc<Node>>,
}

fn main() {
    // Create shared nodes
    let leaf1 = Rc::new(Node {
        value: 3,
        children: vec![],
    });

    let leaf2 = Rc::new(Node {
        value: 5,
        children: vec![],
    });

    // Root node has two children, both pointing to shared nodes
    let root = Rc::new(Node {
        value: 10,
        children: vec![Rc::clone(&leaf1), Rc::clone(&leaf2)],
    });

    println!("Root value: {}", root.value);
    println!("Children values: {} and {}",
             root.children[0].value,
             root.children[1].value);

    println!("Leaf1 reference count: {}", Rc::strong_count(&leaf1)); // 2
    println!("Leaf2 reference count: {}", Rc::strong_count(&leaf2)); // 2
    println!("Root reference count: {}", Rc::strong_count(&root));   // 1
}
```

#### Combining Rc with RefCell for Interior Mutability

Since `Rc<T>` only provides immutable access to its data, we often combine it with `RefCell<T>` for mutable access:

```rust
use std::rc::Rc;
use std::cell::RefCell;

fn main() {
    // Create a reference-counted RefCell
    let data = Rc::new(RefCell::new(vec![1, 2, 3]));

    // Create a clone for shared ownership
    let data_clone = Rc::clone(&data);

    // Modify the data through one reference
    data.borrow_mut().push(4);

    // Modify the data through another reference
    data_clone.borrow_mut().push(5);

    // Both see the changes
    println!("Data: {:?}", data.borrow());         // [1, 2, 3, 4, 5]
    println!("Data clone: {:?}", data_clone.borrow()); // [1, 2, 3, 4, 5]
}
```

### Arc<T>: Atomic Reference Counted Pointer

`Arc<T>` (Atomic Reference Counted) is the thread-safe version of `Rc<T>`:

```rust
use std::sync::Arc;
use std::thread;

fn main() {
    // Create an atomic reference-counted vector
    let numbers = Arc::new(vec![1, 2, 3, 4, 5]);
    let mut handles = vec![];

    for i in 0..3 {
        // Clone the Arc for each thread
        let numbers_clone = Arc::clone(&numbers);

        let handle = thread::spawn(move || {
            println!("Thread {} sees: {:?}", i, *numbers_clone);
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Reference count at the end: {}", Arc::strong_count(&numbers));
}
```

Key differences between `Arc<T>` and `Rc<T>`:

1. **Thread Safety**: `Arc<T>` is safe to share across threads
2. **Performance**: `Arc<T>` has slightly higher overhead due to atomic operations
3. **Usage**: Same API as `Rc<T>`, but works with threads

#### Combining Arc with Mutex or RwLock

For mutable data shared across threads, combine `Arc<T>` with `Mutex<T>` or `RwLock<T>`:

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    // Create a thread-safe shared mutable vector
    let data = Arc::new(Mutex::new(vec![1, 2, 3]));
    let mut handles = vec![];

    for i in 0..3 {
        let data_clone = Arc::clone(&data);

        let handle = thread::spawn(move || {
            // Lock the mutex to modify the data
            let mut data_guard = data_clone.lock().unwrap();
            data_guard.push(i + 10);
            println!("Thread {} added {}", i, i + 10);
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    // Print the final data
    println!("Final data: {:?}", *data.lock().unwrap());
}
```

### Weak References and Cyclic References

Reference counting can lead to memory leaks if you create cycles. Weak references solve this problem:

```rust
use std::rc::{Rc, Weak};
use std::cell::RefCell;

struct Node {
    value: i32,
    // Strong reference to child nodes
    children: RefCell<Vec<Rc<Node>>>,
    // Weak reference to parent to avoid cycles
    parent: RefCell<Weak<Node>>,
}

fn main() {
    // Create a parent node
    let parent = Rc::new(Node {
        value: 1,
        children: RefCell::new(vec![]),
        parent: RefCell::new(Weak::new()),
    });

    // Create a child node
    let child = Rc::new(Node {
        value: 2,
        children: RefCell::new(vec![]),
        parent: RefCell::new(Weak::new()),
    });

    // Add child to parent (strong reference)
    parent.children.borrow_mut().push(Rc::clone(&child));

    // Set parent of child (weak reference)
    *child.parent.borrow_mut() = Rc::downgrade(&parent);

    println!("Parent value: {}", parent.value);
    println!("Child value: {}", child.value);

    // Access parent from child using weak reference
    println!("Child's parent: {}", child.parent.borrow().upgrade().unwrap().value);

    // No memory leak: when parent is dropped, child will be dropped too,
    // because the weak reference in child doesn't prevent parent from being deallocated
}
```

Key differences between strong and weak references:

1. **Strong References** (`Rc`, `Arc`):

   - Increase the reference count
   - Prevent the data from being dropped while the reference exists
   - Can cause memory leaks in cycles

2. **Weak References** (`Weak<T>`):
   - Don't increase the strong reference count
   - Don't prevent the data from being dropped
   - Must be upgraded to an `Rc` or `Arc` to access the data
   - Return `None` when upgraded if the data has been dropped

### Custom Smart Pointers

You can create your own smart pointers by implementing the `Deref` and `Drop` traits:

```rust
use std::ops::{Deref, DerefMut};
use std::fmt::Debug;

// A smart pointer that logs when it's created and dropped
struct LoggingBox<T: Debug> {
    data: Box<T>,
    name: String,
}

impl<T: Debug> LoggingBox<T> {
    fn new(data: T, name: &str) -> Self {
        println!("Creating LoggingBox '{}'", name);
        LoggingBox {
            data: Box::new(data),
            name: name.to_string(),
        }
    }
}

// Implement Deref for pointer-like behavior
impl<T: Debug> Deref for LoggingBox<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.data
    }
}

// Implement DerefMut for mutable access
impl<T: Debug> DerefMut for LoggingBox<T> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.data
    }
}

// Implement Drop for cleanup
impl<T: Debug> Drop for LoggingBox<T> {
    fn drop(&mut self) {
        println!("Dropping LoggingBox '{}' containing: {:?}", self.name, self.data);
    }
}

fn main() {
    let mut x = LoggingBox::new(42, "answer");
    println!("Value: {}", *x);

    // Modify through DerefMut
    *x += 1;
    println!("New value: {}", *x);

    // When main exits, the Drop implementation will be called
}
```

### When to Use Each Smart Pointer Type

Choosing the right smart pointer depends on your specific needs:

| Smart Pointer | Use Case                                                       | Thread Safe | Multiple Owners | Mutable |
| ------------- | -------------------------------------------------------------- | ----------- | --------------- | ------- |
| `Box<T>`      | Heap allocation, recursion                                     | No          | No              | Yes     |
| `Rc<T>`       | Shared ownership                                               | No          | Yes             | No      |
| `Arc<T>`      | Shared ownership across threads                                | Yes         | Yes             | No      |
| `Cell<T>`     | Interior mutability for `Copy` types                           | No          | No              | Yes     |
| `RefCell<T>`  | Interior mutability                                            | No          | No              | Yes     |
| `Mutex<T>`    | Thread-safe interior mutability                                | Yes         | No              | Yes     |
| `RwLock<T>`   | Thread-safe interior mutability with reader/writer distinction | Yes         | No              | Yes     |

Guidelines for choosing:

1. **Use `Box<T>` when:**

   - You need to store data on the heap
   - You're implementing a recursive type
   - You need to transfer ownership of large data without copying

2. **Use `Rc<T>` when:**

   - You need multiple owners of the same data
   - You're working in a single-threaded context
   - You need to share immutable data

3. **Use `Arc<T>` when:**

   - You need to share data between threads
   - You need multiple owners across thread boundaries

4. **Use `Cell<T>`/`RefCell<T>` when:**

   - You need interior mutability
   - You're working in a single-threaded context

5. **Use `Mutex<T>`/`RwLock<T>` when:**

   - You need interior mutability across thread boundaries

6. **Combine types when:**
   - You need shared ownership with mutability: `Rc<RefCell<T>>` or `Arc<Mutex<T>>`
   - You need to avoid reference cycles: Use weak references with `Weak<T>`

## Memory Leaks and How to Prevent Them

Even with Rust's memory safety guarantees, memory leaks are still possible, especially when using reference counting and interior mutability patterns.

### What Causes Memory Leaks in Rust?

Memory leaks can occur in safe Rust code for several reasons:

1. **Reference cycles**: When objects reference each other using `Rc` or `Arc`, creating a cycle
2. **Deliberately leaking memory**: Using `std::mem::forget` or `Box::leak`
3. **Global allocations**: Static collections that grow indefinitely
4. **FFI boundaries**: Leaks in C libraries that Rust calls
5. **Forgotten resources**: Not closing files, network connections, etc.

### Reference Cycles: The Most Common Cause

The most common cause of memory leaks in Rust is reference cycles with reference-counted types:

```rust
use std::rc::Rc;
use std::cell::RefCell;

struct Node {
    value: i32,
    next: Option<Rc<RefCell<Node>>>,
    prev: Option<Rc<RefCell<Node>>>,
}

fn main() {
    // Create two nodes
    let node1 = Rc::new(RefCell::new(Node {
        value: 1,
        next: None,
        prev: None,
    }));

    let node2 = Rc::new(RefCell::new(Node {
        value: 2,
        next: None,
        prev: None,
    }));

    // Create a cycle: node1 -> node2 -> node1
    node1.borrow_mut().next = Some(Rc::clone(&node2));
    node2.borrow_mut().prev = Some(Rc::clone(&node1));

    println!("node1 ref count: {}", Rc::strong_count(&node1)); // 2
    println!("node2 ref count: {}", Rc::strong_count(&node2)); // 2

    // Even when these variables go out of scope, the nodes won't be dropped
    // because they still reference each other in a cycle
}
```

In this example, neither `node1` nor `node2` will ever be deallocated because they hold strong references to each other, even after the original variables go out of scope.

### Preventing Reference Cycles with Weak References

The solution to reference cycles is to use weak references for one direction of the relationship:

```rust
use std::rc::{Rc, Weak};
use std::cell::RefCell;

struct Node {
    value: i32,
    next: Option<Rc<RefCell<Node>>>,
    prev: Option<Weak<RefCell<Node>>>, // Weak reference
}

fn main() {
    // Create two nodes
    let node1 = Rc::new(RefCell::new(Node {
        value: 1,
        next: None,
        prev: None,
    }));

    let node2 = Rc::new(RefCell::new(Node {
        value: 2,
        next: None,
        prev: None,
    }));

    // Create a relationship without a cycle: node1 -> node2 (strong) and node2 -> node1 (weak)
    node1.borrow_mut().next = Some(Rc::clone(&node2));
    node2.borrow_mut().prev = Some(Rc::downgrade(&node1)); // Weak reference

    println!("node1 ref count: {}", Rc::strong_count(&node1)); // 1
    println!("node2 ref count: {}", Rc::strong_count(&node2)); // 2

    // When these variables go out of scope, both nodes will be properly deallocated
}
```

By using a weak reference for the "prev" pointer, we break the strong reference cycle, allowing the nodes to be properly dropped when they're no longer needed.

### Deliberate Memory Leaks

Sometimes, you might intentionally leak memory using `std::mem::forget` or `Box::leak`:

```rust
fn main() {
    // Create a value
    let data = Box::new(42);

    // Leak it deliberately
    std::mem::forget(data);

    // Or use Box::leak to get a 'static reference
    let static_ref: &'static i32 = Box::leak(Box::new(100));
    println!("Static reference: {}", static_ref);
}
```

Intentional leaks can be useful for:

- Creating data that needs to live for the entire program duration
- Implementing custom memory management schemes
- Situations where cleanup is handled by the OS (like at program exit)

### Unbounded Caches and Collections

Another common source of memory leaks is unbounded caches or collections that grow indefinitely:

```rust
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

struct UnboundedCache {
    data: Arc<Mutex<HashMap<String, Vec<u8>>>>,
}

impl UnboundedCache {
    fn new() -> Self {
        UnboundedCache {
            data: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn insert(&self, key: String, value: Vec<u8>) {
        let mut cache = self.data.lock().unwrap();
        cache.insert(key, value);
        // No eviction policy - cache will grow indefinitely
    }
}
```

To prevent these leaks, consider:

- Implementing size-based eviction policies
- Using time-based expiration
- Implementing least-recently-used (LRU) caches

```rust
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

struct BoundedCache {
    data: Arc<Mutex<HashMap<String, (Vec<u8>, Instant)>>>,
    max_size: usize,
    ttl: Duration,
}

impl BoundedCache {
    fn new(max_size: usize, ttl_seconds: u64) -> Self {
        BoundedCache {
            data: Arc::new(Mutex::new(HashMap::new())),
            max_size,
            ttl: Duration::from_secs(ttl_seconds),
        }
    }

    fn insert(&self, key: String, value: Vec<u8>) {
        let mut cache = self.data.lock().unwrap();

        // Insert with current timestamp
        cache.insert(key, (value, Instant::now()));

        // Enforce size limit if needed
        if cache.len() > self.max_size {
            self.evict_oldest(&mut cache);
        }
    }

    fn evict_oldest(&self, cache: &mut HashMap<String, (Vec<u8>, Instant)>) {
        // Find and remove the oldest entry
        if let Some(oldest_key) = cache
            .iter()
            .min_by_key(|(_, (_, timestamp))| timestamp)
            .map(|(key, _)| key.clone())
        {
            cache.remove(&oldest_key);
        }
    }

    fn get(&self, key: &str) -> Option<Vec<u8>> {
        let mut cache = self.data.lock().unwrap();

        // Remove expired entries
        let now = Instant::now();
        let expired_keys: Vec<_> = cache
            .iter()
            .filter(|(_, (_, timestamp))| now.duration_since(*timestamp) > self.ttl)
            .map(|(key, _)| key.clone())
            .collect();

        for key in expired_keys {
            cache.remove(&key);
        }

        // Return the value if it exists
        cache.get(key).map(|(value, _)| value.clone())
    }
}
```

### Tools for Detecting Memory Leaks

Several tools can help identify memory leaks in Rust programs:

1. **LSAN (Leak Sanitizer)**: Part of the Address Sanitizer suite
2. **Valgrind**: Specifically its Memcheck tool
3. **Heaptrack**: For detailed heap memory profiling
4. **Custom instrumentation**: Using `Drop` trait and counters

#### Using LSAN with Rust

```rust
// Enable leak detection with LSAN
// Compile with: RUSTFLAGS="-Z sanitizer=leak" cargo run --target x86_64-unknown-linux-gnu

fn main() {
    // This will be detected as a leak
    let leaked = Box::into_raw(Box::new(42));

    // Use the value to prevent optimizations
    println!("Leaked value: {}", unsafe { *leaked });

    // No deallocation, this will be reported by LSAN
}
```

#### Custom Leak Detection

You can implement your own leak detection for specific types:

```rust
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

// Global counter for active instances
static COUNTER: AtomicUsize = AtomicUsize::new(0);

struct TrackedResource {
    id: usize,
    data: Vec<u8>,
}

impl TrackedResource {
    fn new(data: Vec<u8>) -> Self {
        let id = COUNTER.fetch_add(1, Ordering::SeqCst);
        println!("Creating resource #{}", id);
        TrackedResource { id, data }
    }
}

impl Drop for TrackedResource {
    fn drop(&mut self) {
        println!("Dropping resource #{}", self.id);
        COUNTER.fetch_sub(1, Ordering::SeqCst);
    }
}

fn main() {
    // Create resources
    let _r1 = TrackedResource::new(vec![1, 2, 3]);

    {
        let _r2 = TrackedResource::new(vec![4, 5, 6]);
        println!("Active resources: {}", COUNTER.load(Ordering::SeqCst));
    }

    // Leak a resource
    let leaked = Box::new(TrackedResource::new(vec![7, 8, 9]));
    let leaked_ptr = Box::into_raw(leaked);

    println!("Active resources at end: {}", COUNTER.load(Ordering::SeqCst));

    // If this doesn't match expectations, we have a leak
    assert_eq!(COUNTER.load(Ordering::SeqCst), 2);
}
```

## Debugging Complex Ownership Situations

Debugging ownership and borrowing issues can be challenging. Here are strategies to help understand and resolve complex ownership problems.

### Using Debug Print Statements

One of the simplest approaches is to add print statements that track reference counts:

```rust
use std::rc::Rc;
use std::cell::RefCell;

fn main() {
    let data = Rc::new(RefCell::new(vec![1, 2, 3]));
    println!("After creation: count = {}", Rc::strong_count(&data));

    {
        let data2 = Rc::clone(&data);
        println!("After clone: count = {}", Rc::strong_count(&data));

        data2.borrow_mut().push(4);
        println!("Current data: {:?}", data.borrow());
    }

    println!("After inner scope: count = {}", Rc::strong_count(&data));
}
```

For more complex scenarios, consider creating a tracking wrapper:

```rust
use std::rc::Rc;
use std::cell::RefCell;
use std::fmt::Debug;

struct Tracked<T: Debug> {
    name: String,
    value: T,
}

impl<T: Debug> Tracked<T> {
    fn new(name: &str, value: T) -> Self {
        println!("Creating '{}' with value: {:?}", name, value);
        Tracked {
            name: name.to_string(),
            value,
        }
    }
}

impl<T: Debug> Drop for Tracked<T> {
    fn drop(&mut self) {
        println!("Dropping '{}' with final value: {:?}", self.name, self.value);
    }
}

fn main() {
    let a = Rc::new(RefCell::new(Tracked::new("resource_a", vec![1, 2, 3])));

    {
        let b = Rc::clone(&a);
        println!("Reference count: {}", Rc::strong_count(&a));

        // Modify through b
        b.borrow_mut().value.push(4);
    }

    println!("After scope: count = {}", Rc::strong_count(&a));
}
```

### Visualizing Ownership Graphs

For complex ownership relationships, it can help to draw the ownership graph:

```rust
use std::rc::{Rc, Weak};
use std::cell::RefCell;

// Tree node with parent and children
struct Node {
    id: usize,
    children: RefCell<Vec<Rc<Node>>>,
    parent: RefCell<Weak<Node>>,
}

impl Node {
    fn new(id: usize) -> Rc<Node> {
        Rc::new(Node {
            id,
            children: RefCell::new(Vec::new()),
            parent: RefCell::new(Weak::new()),
        })
    }

    fn add_child(&self, child: &Rc<Node>) {
        self.children.borrow_mut().push(Rc::clone(child));
        *child.parent.borrow_mut() = Rc::downgrade(
            // Get an Rc<Node> from &self
            // This is only for demonstration, in real code you'd have an Rc already
            &Rc::clone(&child.parent.borrow().upgrade().unwrap_or(Node::new(999)))
        );
    }

    fn print_ownership_info(&self) {
        println!("Node {}:", self.id);
        println!("  Parent: {}",
            self.parent.borrow().upgrade()
                .map_or("None".to_string(), |p| p.id.to_string()));

        println!("  Children: [{}]",
            self.children.borrow().iter()
                .map(|c| c.id.to_string())
                .collect::<Vec<_>>()
                .join(", "));

        for child in self.children.borrow().iter() {
            println!("  Child {} ref count: {}", child.id, Rc::strong_count(child));
        }
    }
}

fn main() {
    let root = Node::new(1);
    let child1 = Node::new(2);
    let child2 = Node::new(3);

    root.add_child(&child1);
    root.add_child(&child2);

    root.print_ownership_info();
    child1.print_ownership_info();
    child2.print_ownership_info();
}
```

### Using Rust Analyzer and IDE Tools

Modern IDEs with Rust support (like VS Code with the Rust Analyzer extension) provide valuable insights:

1. **Hover information**: Showing types, reference kinds, and lifetimes
2. **Go to definition**: Following ownership chains
3. **Find references**: Seeing where values are used
4. **Inlay hints**: Displaying type information inline

### Common Debugging Patterns

When debugging ownership issues, look for these common patterns:

1. **Multiple mutable borrows**: Are you trying to borrow mutably more than once?
2. **Borrowing after move**: Has the value been moved before you're trying to use it?
3. **Lifetime mismatches**: Are you returning a reference to a value that goes out of scope?
4. **Self-referential structs**: Are you trying to store a reference to a struct inside itself?

### Using Clippy for Static Analysis

Clippy can catch many common ownership issues:

```bash
cargo clippy --all-features -- -W clippy::all
```

It can identify issues like:

- Unnecessary clones
- Redundant borrows
- Missing implementations of `Copy` or `Clone`
- Risky usage of `std::mem::forget`

### When to Use Unsafe Code

If you've exhausted all safe options and understand the consequences, unsafe code might be necessary:

```rust
fn main() {
    // Create two mutable references to the same data (unsafe!)
    let mut data = 10;

    let r1 = &mut data;

    // This would normally be illegal:
    // let r2 = &mut data;

    // Instead, we can use raw pointers (unsafe)
    let r2 = unsafe { &mut *(r1 as *mut _) };

    // Now we have two mutable references
    *r1 += 1;
    *r2 += 1;

    // This is a data race! Don't do this in real code!
    println!("data: {}", data);
}
```

Always document why unsafe code is necessary and ensure its correctness with thorough testing.

## 🔨 Project: Thread-Safe Counter

Let's apply what we've learned to build a thread-safe counter that can be accessed and modified from multiple threads. This project will demonstrate the use of smart pointers, interior mutability, and thread synchronization.

### Requirements

1. Create a counter that can be safely accessed from multiple threads
2. Support basic operations: increment, decrement, get, and reset
3. Allow registering callbacks for threshold events (e.g., notify when count reaches 10)
4. Implement proper cleanup when the counter is dropped
5. Ensure thread safety without excessive locking

### Step 1: Defining the Counter Interface

Let's start by defining the basic structure and interface of our thread-safe counter:

```rust
use std::sync::{Arc, Mutex, RwLock};
use std::collections::HashMap;

// A callback function type for threshold events
type ThresholdCallback = Box<dyn Fn(usize) + Send + Sync>;

pub struct ThreadSafeCounter {
    // The current count, protected by a mutex for exclusive access during updates
    count: Mutex<usize>,

    // Threshold callbacks, protected by a read-write lock
    // This allows multiple readers but exclusive writers
    callbacks: RwLock<HashMap<usize, Vec<ThresholdCallback>>>,
}

impl ThreadSafeCounter {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            count: Mutex::new(0),
            callbacks: RwLock::new(HashMap::new()),
        })
    }
}
```

We're using `Arc` to allow the counter to be shared across threads, `Mutex` to protect the count value, and `RwLock` for the callbacks map since we'll have more reads than writes.

### Step 2: Implementing Core Counter Operations

Next, let's implement the basic counter operations:

```rust
impl ThreadSafeCounter {
    // Previous code...

    pub fn increment(&self) -> usize {
        let mut count = self.count.lock().unwrap();
        *count += 1;
        let new_count = *count;

        // Release the lock before checking callbacks to avoid deadlocks
        drop(count);

        // Check if we've hit any thresholds
        self.check_thresholds(new_count);

        new_count
    }

    pub fn decrement(&self) -> usize {
        let mut count = self.count.lock().unwrap();
        if *count > 0 {
            *count -= 1;
        }
        let new_count = *count;

        // Release the lock before checking callbacks
        drop(count);

        // Check if we've hit any thresholds
        self.check_thresholds(new_count);

        new_count
    }

    pub fn get(&self) -> usize {
        *self.count.lock().unwrap()
    }

    pub fn reset(&self) -> usize {
        let mut count = self.count.lock().unwrap();
        *count = 0;
        0
    }
}
```

### Step 3: Implementing Threshold Callbacks

Now, let's add support for threshold callbacks:

```rust
impl ThreadSafeCounter {
    // Previous code...

    pub fn on_threshold(&self, threshold: usize, callback: impl Fn(usize) + Send + Sync + 'static) {
        let mut callbacks = self.callbacks.write().unwrap();
        let threshold_callbacks = callbacks.entry(threshold).or_insert_with(Vec::new);
        threshold_callbacks.push(Box::new(callback));
    }

    fn check_thresholds(&self, count: usize) {
        // Get a read lock on the callbacks
        let callbacks = self.callbacks.read().unwrap();

        // Check if there are callbacks for this count
        if let Some(threshold_callbacks) = callbacks.get(&count) {
            for callback in threshold_callbacks {
                callback(count);
            }
        }
    }
}
```

### Step 4: Adding Tests

Let's add tests to verify that our counter works correctly:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::thread;

    #[test]
    fn test_basic_operations() {
        let counter = ThreadSafeCounter::new();

        assert_eq!(counter.get(), 0);
        assert_eq!(counter.increment(), 1);
        assert_eq!(counter.increment(), 2);
        assert_eq!(counter.decrement(), 1);
        assert_eq!(counter.reset(), 0);
    }

    #[test]
    fn test_multithreaded_increment() {
        let counter = ThreadSafeCounter::new();
        let mut handles = vec![];

        for _ in 0..10 {
            let counter_clone = Arc::clone(&counter);
            let handle = thread::spawn(move || {
                for _ in 0..100 {
                    counter_clone.increment();
                }
            });
            handles.push(handle);
        }

        for handle in handles {
            handle.join().unwrap();
        }

        assert_eq!(counter.get(), 1000);
    }

    #[test]
    fn test_threshold_callback() {
        let counter = ThreadSafeCounter::new();
        let callback_counter = Arc::new(AtomicUsize::new(0));

        // Set up a callback for count = 5
        let callback_counter_clone = Arc::clone(&callback_counter);
        counter.on_threshold(5, move |count| {
            assert_eq!(count, 5);
            callback_counter_clone.fetch_add(1, Ordering::SeqCst);
        });

        // Increment to trigger the callback
        for _ in 0..5 {
            counter.increment();
        }

        assert_eq!(callback_counter.load(Ordering::SeqCst), 1);

        // Increment past 5, then decrement back to 5 to trigger again
        counter.increment();
        counter.decrement();

        assert_eq!(callback_counter.load(Ordering::SeqCst), 2);
    }
}
```

### Step 5: Creating a Demo Application

Finally, let's create a demo application that uses our thread-safe counter:

```rust
fn main() {
    use std::thread;
    use std::time::Duration;

    // Create a new thread-safe counter
    let counter = ThreadSafeCounter::new();

    // Set up threshold callbacks
    counter.on_threshold(10, |count| {
        println!("🎉 Threshold reached: {}", count);
    });

    counter.on_threshold(50, |count| {
        println!("🚀 Halfway there! Count: {}", count);
    });

    counter.on_threshold(100, |count| {
        println!("🏁 Finished! Final count: {}", count);
    });

    // Create worker threads that increment the counter
    let mut handles = vec![];

    for i in 0..5 {
        let worker_counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            println!("Worker {} started", i);

            for j in 0..25 {
                let current = worker_counter.increment();
                println!("Worker {} incremented counter to {}", i, current);

                // Simulate some work
                thread::sleep(Duration::from_millis(10 + (i as u64 * 5)));

                if j % 10 == 0 {
                    // Occasionally decrement
                    let current = worker_counter.decrement();
                    println!("Worker {} decremented counter to {}", i, current);
                }
            }

            println!("Worker {} finished", i);
        });

        handles.push(handle);
    }

    // Wait for all workers to complete
    for handle in handles {
        handle.join().unwrap();
    }

    // Final count
    println!("All workers finished. Final count: {}", counter.get());
}
```

### Running the Project

To create and run this project:

```bash
cargo new thread_safe_counter
cd thread_safe_counter
# Copy the code into src/lib.rs and src/main.rs
cargo run
```

### Project Breakdown

This project demonstrates several important concepts:

1. **Thread Safety**: Using `Arc`, `Mutex`, and `RwLock` to safely share data between threads
2. **Smart Pointers**: Using `Arc` for shared ownership across threads
3. **Interior Mutability**: Using `Mutex` and `RwLock` to allow mutation through shared references
4. **Callback System**: Storing and executing function pointers with trait objects
5. **Proper Lock Management**: Releasing locks before calling callbacks to avoid deadlocks

### Extending the Project

Here are some ways you could extend this project:

1. **Named Counters**: Support multiple named counters in a registry
2. **Atomic Counter**: Implement a version using atomic types instead of mutex
3. **History Tracking**: Keep a history of counter changes
4. **Advanced Thresholds**: Support more complex threshold conditions (e.g., reaching a value multiple times)
5. **Performance Metrics**: Track and report on counter usage statistics

## Summary

In this chapter, we've explored advanced ownership patterns in Rust that extend the basic ownership model. These patterns provide more flexibility while maintaining Rust's memory safety guarantees.

We covered:

- **Interior Mutability Pattern**: Using `Cell`, `RefCell`, and `UnsafeCell` to mutate data through shared references
- **Thread Synchronization**: Using `Mutex` and `RwLock` for safe concurrent access to shared data
- **Smart Pointers**: Working with `Box`, `Rc`, and `Arc` for heap allocation and reference counting
- **Weak References**: Breaking reference cycles to prevent memory leaks
- **Custom Smart Pointers**: Implementing your own smart pointers with `Deref` and `Drop`
- **Memory Leak Prevention**: Identifying and preventing memory leaks in Rust programs
- **Debugging Techniques**: Strategies for debugging complex ownership situations

We also applied these concepts to build a thread-safe counter that can be accessed from multiple threads, demonstrating how these patterns work together in a real-world application.

These advanced ownership patterns are essential tools for building complex, robust Rust applications, especially those involving shared state or concurrency. By understanding when and how to use each pattern, you can write code that is both flexible and safe.

In the next chapter, we'll explore structs and custom types, which form the foundation of data modeling in Rust programs. We'll learn how to define and use structs, implement methods, and create reusable abstractions.

## Exercises

1. Implement a thread-safe cache with expiration using `Arc<RwLock<_>>`.
2. Create a custom smart pointer that tracks allocation and deallocation statistics.
3. Implement a tree structure with parent-child relationships using `Rc` and `Weak`.
4. Build a resource pool that manages a fixed number of reusable resources.
5. Extend the thread-safe counter project to include rate limiting functionality.
6. Implement a simple actor system where actors communicate by passing messages.
7. Create a custom reference-counted type similar to `Rc<T>` but with additional features.
8. Build a thread-safe logging system that uses interior mutability.

## Further Reading

- [The Rust Programming Language: Smart Pointers](https://doc.rust-lang.org/book/ch15-00-smart-pointers.html)
- [The Rust Reference: Interior Mutability](https://doc.rust-lang.org/reference/interior-mutability.html)
- [Rust Nomicon: Ownership and Lifetimes](https://doc.rust-lang.org/nomicon/ownership.html)
- [Rust By Example: Smart Pointers](https://doc.rust-lang.org/rust-by-example/std/rc.html)
- [Tokio Documentation: Shared State](https://tokio.rs/tokio/tutorial/shared-state)
