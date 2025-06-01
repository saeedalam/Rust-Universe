# Chapter 32: Network Programming

## Introduction

Network programming is a critical skill for modern software development. As applications increasingly operate across distributed systems, communicate with web services, and process data from remote sources, understanding how to effectively utilize networking capabilities becomes essential. Rust's emphasis on safety, performance, and control makes it an excellent language for network programming, whether you're building high-performance web servers, reliable microservices, or low-level protocol implementations.

In this chapter, we'll explore network programming in Rust from the ground up. We'll start with fundamental networking concepts and TCP/IP basics, then progress through various levels of abstraction: from low-level socket programming to high-level HTTP clients and servers. Along the way, we'll examine how Rust's unique features—such as its ownership model, type system, and async capabilities—can be leveraged to build robust and efficient networked applications.

Rust's ecosystem offers a rich variety of networking libraries, from the standard library's basic TCP and UDP implementations to sophisticated frameworks like Tokio, Hyper, and Actix. We'll explore these tools and learn how to choose the right approach for different networking tasks.

By the end of this chapter, you'll have a comprehensive understanding of network programming in Rust and the practical skills to implement secure, performant, and reliable networked applications.

## Network Programming Concepts

Before diving into Rust-specific implementations, let's establish a foundation of core networking concepts that will inform our approach.

### The OSI Model and Network Layers

The Open Systems Interconnection (OSI) model provides a conceptual framework for understanding network communications. It divides networking into seven layers, each with distinct responsibilities:

1. **Physical Layer**: The hardware and physical medium (cables, radio waves)
2. **Data Link Layer**: Direct node-to-node communication and media access
3. **Network Layer**: Routing and addressing (IP)
4. **Transport Layer**: End-to-end communication and flow control (TCP, UDP)
5. **Session Layer**: Session establishment, management, and termination
6. **Presentation Layer**: Data translation, encryption, and compression
7. **Application Layer**: User-facing applications and protocols (HTTP, FTP, SMTP)

As Rust programmers, we typically work at layers 4-7, though some specialized applications may involve lower layers.

### Client-Server Architecture

Most networked applications follow a client-server model:

- **Servers** provide services and resources
- **Clients** request and consume these resources
- Communication occurs through well-defined protocols

Rust can be used to implement both clients and servers, and we'll explore both approaches in this chapter.

### Blocking vs. Non-Blocking I/O

Network operations can be implemented using different I/O models:

- **Blocking I/O**: Operations block the executing thread until complete
- **Non-Blocking I/O**: Operations return immediately, requiring polling
- **Asynchronous I/O**: Operations initiate and notify completion via callbacks or futures

Rust supports all three models, with an increasing emphasis on asynchronous I/O through async/await syntax and libraries like Tokio.

### Connectionless vs. Connection-Oriented Communication

Network protocols can be categorized by how they manage connections:

- **Connection-Oriented (TCP)**: Establishes a reliable connection before data exchange
- **Connectionless (UDP)**: Sends data without establishing a connection

Each approach has different trade-offs:

| Aspect      | TCP                       | UDP                     |
| ----------- | ------------------------- | ----------------------- |
| Connection  | Required (handshake)      | Not required            |
| Reliability | Guaranteed delivery       | Best-effort delivery    |
| Order       | Maintains message order   | No ordering guarantees  |
| Speed       | Overhead from guarantees  | Lower latency           |
| Use Cases   | Web, email, file transfer | Streaming, gaming, VoIP |

### Protocol Design Considerations

When designing or implementing network protocols, consider:

1. **Serialization Format**: How data is encoded (JSON, Protocol Buffers, custom binary)
2. **Error Handling**: How to detect and recover from network failures
3. **Security**: Authentication, encryption, and protection against attacks
4. **Efficiency**: Bandwidth usage, latency, and processing overhead
5. **Versioning**: How the protocol can evolve while maintaining compatibility

### Addressing and Ports

Network communication requires addressing mechanisms:

- **IP Addresses**: Identify machines on a network (IPv4 or IPv6)
- **Ports**: Identify specific services on a machine (0-65535)
- **Sockets**: The combination of IP address and port that uniquely identifies a communication endpoint

In Rust, these are typically represented using types like `IpAddr`, `SocketAddr`, and `SocketAddrV4`/`SocketAddrV6` from the standard library.

### Networking Challenges

Network programming introduces unique challenges:

- **Unreliability**: Networks can fail in various ways
- **Latency**: Operations take time, affecting application design
- **Security**: Data in transit can be intercepted or tampered with
- **Scalability**: Systems must handle varying loads efficiently
- **Heterogeneity**: Different systems with different capabilities must interoperate

Rust's strong type system and explicit error handling help address many of these challenges by forcing developers to consider failure cases and handle them appropriately.

## TCP/IP Fundamentals

TCP/IP (Transmission Control Protocol/Internet Protocol) is the foundational protocol suite that powers the internet and most modern networked applications. Understanding its core principles is essential for effective network programming in Rust.

### The Internet Protocol (IP)

IP provides addressing and routing for packets across networks:

- **IPv4**: 32-bit addresses (e.g., `192.168.1.1`), increasingly scarce
- **IPv6**: 128-bit addresses (e.g., `2001:0db8:85a3:0000:0000:8a2e:0370:7334`), designed for the future internet

In Rust, IP addresses are represented using the `std::net::IpAddr` enum, which can be either `IpAddr::V4(Ipv4Addr)` or `IpAddr::V6(Ipv6Addr)`.

```rust
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

// Creating IP addresses
let localhost_v4 = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1));
let localhost_v6 = IpAddr::V6(Ipv6Addr::new(0, 0, 0, 0, 0, 0, 0, 1));

// Parsing from strings
let addr: IpAddr = "192.168.1.1".parse().expect("Invalid IP address");
```

### Transmission Control Protocol (TCP)

TCP is a connection-oriented protocol that provides reliable, ordered, and error-checked delivery of data. Key features include:

1. **Connection Establishment**: Three-way handshake (SYN, SYN-ACK, ACK)
2. **Flow Control**: Prevents overwhelming receivers with too much data
3. **Congestion Control**: Adapts to network congestion
4. **Error Detection and Recovery**: Retransmits lost packets
5. **Ordered Delivery**: Ensures data arrives in the order it was sent

### User Datagram Protocol (UDP)

UDP is a connectionless protocol that provides a simple, unreliable datagram service. Key characteristics:

1. **No Connection Setup**: Sends data immediately without handshaking
2. **No Guaranteed Delivery**: Packets may be lost
3. **No Ordering Guarantees**: Packets may arrive out of order
4. **Minimal Overhead**: Faster than TCP for many applications
5. **Broadcast and Multicast**: Can send to multiple recipients

### Socket Programming in Rust

Sockets are the fundamental building blocks of network programming. Rust's standard library provides implementations for TCP and UDP sockets.

#### TCP Sockets

Let's start with a simple TCP client and server example:

```rust
// TCP Client
use std::io::{Read, Write};
use std::net::TcpStream;

fn run_client() -> std::io::Result<()> {
    // Connect to a server
    let mut stream = TcpStream::connect("127.0.0.1:8080")?;

    // Send a message
    stream.write_all(b"Hello, server!")?;

    // Read the response
    let mut response = [0; 128];
    let n = stream.read(&mut response)?;

    println!("Received: {}", String::from_utf8_lossy(&response[0..n]));

    Ok(())
}
```

```rust
// TCP Server
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::thread;

fn handle_client(mut stream: TcpStream) -> std::io::Result<()> {
    let mut buffer = [0; 128];

    // Read from the client
    let n = stream.read(&mut buffer)?;

    // Process the request (echo it back in this case)
    let message = &buffer[0..n];
    println!("Received: {}", String::from_utf8_lossy(message));

    // Send a response
    stream.write_all(message)?;

    Ok(())
}

fn run_server() -> std::io::Result<()> {
    // Bind to an address and port
    let listener = TcpListener::bind("127.0.0.1:8080")?;
    println!("Server listening on port 8080");

    // Accept connections in a loop
    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                // Handle each client in a new thread
                thread::spawn(move || {
                    handle_client(stream)
                        .unwrap_or_else(|error| eprintln!("Error: {}", error));
                });
            }
            Err(e) => {
                eprintln!("Connection failed: {}", e);
            }
        }
    }

    Ok(())
}
```

This example demonstrates several key aspects of TCP socket programming:

1. **Connection Establishment**: Client connects to a specific address and port
2. **Data Transfer**: Reading and writing bytes over the connection
3. **Concurrency**: Server handles multiple clients using threads
4. **Error Handling**: Rust's `Result` type for managing potential failures

#### UDP Sockets

Now let's look at UDP client and server implementations:

```rust
// UDP Client
use std::net::UdpSocket;

fn run_udp_client() -> std::io::Result<()> {
    // Create a UDP socket
    let socket = UdpSocket::bind("0.0.0.0:0")?;

    // Send a message to the server
    let message = b"Hello, UDP server!";
    socket.send_to(message, "127.0.0.1:8081")?;

    // Receive a response
    let mut buffer = [0; 128];
    let (size, _) = socket.recv_from(&mut buffer)?;

    println!("Received: {}", String::from_utf8_lossy(&buffer[0..size]));

    Ok(())
}
```

```rust
// UDP Server
use std::net::UdpSocket;

fn run_udp_server() -> std::io::Result<()> {
    // Bind to an address and port
    let socket = UdpSocket::bind("127.0.0.1:8081")?;
    println!("UDP server listening on port 8081");

    let mut buffer = [0; 128];

    loop {
        // Receive data and the sender's address
        let (size, client_addr) = socket.recv_from(&mut buffer)?;

        println!("Received {} bytes from {}", size, client_addr);
        println!("Message: {}", String::from_utf8_lossy(&buffer[0..size]));

        // Echo the data back to the client
        socket.send_to(&buffer[0..size], client_addr)?;
    }
}
```

Key differences from TCP:

1. **No Connection**: UDP doesn't establish or maintain connections
2. **Message-Based**: Data is sent in discrete datagrams
3. **Source Address**: Each receive operation returns the sender's address
4. **No Ordering**: Messages may arrive out of order or not at all

### Socket Options and Configuration

Both TCP and UDP sockets can be configured with various options to control their behavior:

```rust
use std::net::{TcpListener, TcpStream};
use std::time::Duration;

fn configure_tcp_socket() -> std::io::Result<()> {
    // Create and configure a TCP client socket
    let stream = TcpStream::connect("example.com:80")?;

    // Set read timeout
    stream.set_read_timeout(Some(Duration::from_secs(10)))?;

    // Enable keep-alive
    stream.set_keepalive(Some(Duration::from_secs(60)))?;

    // Set TCP_NODELAY (disable Nagle's algorithm)
    stream.set_nodelay(true)?;

    // Create and configure a TCP server socket
    let listener = TcpListener::bind("127.0.0.1:8080")?;

    // Set TTL (Time-To-Live)
    listener.set_ttl(64)?;

    Ok(())
}
```

### Working with IP and Socket Addresses

Rust's standard library provides types for working with network addresses:

```rust
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr, SocketAddrV4, SocketAddrV6};

fn work_with_addresses() {
    // Creating IP addresses
    let localhost_v4 = Ipv4Addr::new(127, 0, 0, 1);
    let localhost_v6 = Ipv6Addr::new(0, 0, 0, 0, 0, 0, 0, 1);

    // Creating socket addresses (IP + port)
    let socket_v4 = SocketAddrV4::new(localhost_v4, 8080);
    let socket_v6 = SocketAddrV6::new(localhost_v6, 8080, 0, 0);

    // Using the enum variants
    let socket_addr1: SocketAddr = SocketAddr::V4(socket_v4);
    let socket_addr2: SocketAddr = SocketAddr::V6(socket_v6);

    // Parsing from strings
    let addr: SocketAddr = "192.168.1.1:8080".parse().expect("Invalid socket address");
    let addr_v6: SocketAddr = "[2001:db8::1]:8080".parse().expect("Invalid IPv6 socket address");

    // Extracting components
    println!("IP: {}, Port: {}", addr.ip(), addr.port());

    // Checking address properties
    if addr.ip().is_loopback() {
        println!("This is a loopback address");
    }

    if addr.ip().is_ipv4() {
        println!("This is an IPv4 address");
    }
}
```

### Handling Network Errors

Network operations are inherently prone to failures. Rust's error handling system helps manage these issues gracefully:

```rust
use std::io::{self, ErrorKind};
use std::net::TcpStream;
use std::time::Duration;

fn connect_with_retry(addr: &str, max_retries: usize) -> io::Result<TcpStream> {
    let mut retries = 0;
    let mut last_error = None;

    while retries < max_retries {
        match TcpStream::connect(addr) {
            Ok(stream) => return Ok(stream),
            Err(e) => {
                last_error = Some(e);

                // Only retry for certain error types
                match last_error.as_ref().unwrap().kind() {
                    ErrorKind::ConnectionRefused |
                    ErrorKind::ConnectionReset |
                    ErrorKind::ConnectionAborted |
                    ErrorKind::TimedOut => {
                        retries += 1;
                        println!("Connection failed (attempt {}): {:?}", retries, last_error);
                        std::thread::sleep(Duration::from_secs(1));
                    },
                    _ => break, // Don't retry for other errors
                }
            }
        }
    }

    Err(last_error.unwrap_or_else(|| io::Error::new(ErrorKind::Other, "Unknown error")))
}
```

This resilient connection function demonstrates how to handle common network errors and implement retry logic.

In the next sections, we'll build on these fundamentals to explore higher-level networking abstractions in Rust, starting with asynchronous networking using Tokio.

## Asynchronous Networking with Tokio

Asynchronous programming allows network applications to handle many concurrent connections efficiently without spawning a thread for each one. Tokio is Rust's most popular async runtime and provides powerful tools for network programming.

### Why Async for Networking?

Traditional network programming with threads has limitations:

1. **Resource Consumption**: Each thread requires memory for its stack (often several MB)
2. **Context Switching Overhead**: OS must switch between threads
3. **Scalability Ceiling**: Most systems struggle with thousands of threads

Asynchronous programming addresses these issues by:

1. **Multiplexing I/O Operations**: Multiple operations share a small number of threads
2. **Non-Blocking Execution**: Tasks yield control while waiting for I/O
3. **Event-Driven Architecture**: Resuming tasks when data is available

This approach enables applications to handle tens of thousands of concurrent connections efficiently.

### Getting Started with Tokio

To use Tokio, add it to your `Cargo.toml`:

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
```

For a minimal setup, you can select specific features:

```toml
[dependencies]
tokio = { version = "1", features = ["rt", "rt-multi-thread", "net", "io-util", "macros"] }
```

### Async TCP Client with Tokio

Here's a basic async TCP client:

```rust
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to a server
    let mut stream = TcpStream::connect("127.0.0.1:8080").await?;
    println!("Connected to server");

    // Send a message
    stream.write_all(b"Hello from async client!").await?;

    // Read the response
    let mut buffer = [0; 128];
    let n = stream.read(&mut buffer).await?;
    println!("Received: {}", String::from_utf8_lossy(&buffer[0..n]));

    Ok(())
}
```

Key async features:

- `#[tokio::main]` macro sets up the runtime
- `async fn` defines asynchronous functions
- `.await` suspends execution until an operation completes
- `AsyncReadExt` and `AsyncWriteExt` provide async I/O methods

### Async TCP Server with Tokio

Now let's implement an async TCP server:

```rust
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

async fn handle_connection(mut socket: TcpStream) {
    let mut buffer = [0; 1024];

    // Read data from the client
    match socket.read(&mut buffer).await {
        Ok(n) => {
            if n == 0 {
                // Connection closed normally
                return;
            }

            println!("Received: {}", String::from_utf8_lossy(&buffer[0..n]));

            // Echo the data back
            if let Err(e) = socket.write_all(&buffer[0..n]).await {
                eprintln!("Failed to write to socket: {}", e);
            }
        }
        Err(e) => {
            eprintln!("Failed to read from socket: {}", e);
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Bind to an address
    let listener = TcpListener::bind("127.0.0.1:8080").await?;
    println!("Server listening on port 8080");

    // Accept connections
    loop {
        let (socket, addr) = listener.accept().await?;
        println!("New connection from: {}", addr);

        // Spawn a new task for each connection
        tokio::spawn(async move {
            handle_connection(socket).await;
        });
    }
}
```

This server can handle thousands of concurrent connections because it:

1. Doesn't block the main task while waiting for client connections
2. Spawns lightweight async tasks instead of threads
3. Uses non-blocking I/O operations

### Async UDP with Tokio

Tokio also supports UDP for connectionless communication:

```rust
use tokio::net::UdpSocket;
use std::io;

#[tokio::main]
async fn main() -> io::Result<()> {
    // UDP server
    let socket = UdpSocket::bind("127.0.0.1:8081").await?;
    let mut buf = [0; 1024];

    println!("UDP server listening on 127.0.0.1:8081");

    loop {
        // Receive data
        let (len, addr) = socket.recv_from(&mut buf).await?;
        println!("Received {} bytes from {}", len, addr);

        // Echo back the data
        socket.send_to(&buf[0..len], addr).await?;
    }
}
```

### Working with Multiple Connections

Tokio provides tools for managing multiple connections and operations:

```rust
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use tokio::time::{sleep, Duration};
use std::sync::Arc;
use std::collections::HashMap;
use std::sync::Mutex;

// Message types for our channel
enum Message {
    NewClient { id: usize, socket: TcpStream },
    ClientDisconnected { id: usize },
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Channel for communication between tasks
    let (tx, mut rx) = mpsc::channel::<Message>(100);

    // Shared state for active connections
    let clients = Arc::new(Mutex::new(HashMap::new()));

    // Spawn a task to accept new connections
    let server_tx = tx.clone();
    let acceptor = tokio::spawn(async move {
        let listener = TcpListener::bind("127.0.0.1:8080").await.unwrap();
        println!("Server listening on port 8080");

        let mut next_id = 1;

        loop {
            match listener.accept().await {
                Ok((socket, addr)) => {
                    println!("New connection from: {}", addr);

                    // Notify about the new client
                    if let Err(e) = server_tx.send(Message::NewClient {
                        id: next_id,
                        socket
                    }).await {
                        eprintln!("Failed to send new client message: {}", e);
                    }

                    next_id += 1;
                }
                Err(e) => {
                    eprintln!("Error accepting connection: {}", e);
                }
            }
        }
    });

    // Spawn a task to handle broadcasting or other operations
    let broadcaster = tokio::spawn(async move {
        // Periodically send a message to all clients
        loop {
            sleep(Duration::from_secs(10)).await;

            // Acquire lock and broadcast
            let clients_guard = clients.lock().unwrap();
            for (&id, _) in clients_guard.iter() {
                println!("Would broadcast to client {}", id);
                // In a real app, you'd send data to the client here
            }
        }
    });

    // Main task processes messages from the channel
    while let Some(msg) = rx.recv().await {
        match msg {
            Message::NewClient { id, socket } => {
                // Add client to our map
                clients.lock().unwrap().insert(id, socket);
                println!("Client {} registered, total clients: {}",
                         id, clients.lock().unwrap().len());
            }
            Message::ClientDisconnected { id } => {
                // Remove client from our map
                clients.lock().unwrap().remove(&id);
                println!("Client {} disconnected, remaining clients: {}",
                         id, clients.lock().unwrap().len());
            }
        }
    }

    // Wait for tasks to complete (they won't in this example)
    let _ = tokio::join!(acceptor, broadcaster);

    Ok(())
}
```

This example demonstrates several advanced Tokio features:

1. **Channels** (`mpsc::channel`): For communication between tasks
2. **Shared State**: Using `Arc<Mutex<_>>` for thread-safe access
3. **Task Spawning**: Running concurrent operations with `tokio::spawn`
4. **Timeouts**: Using `sleep` for timed operations

### Timeouts and Cancellation

Network operations often need timeouts to handle unresponsive peers:

```rust
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::time::{timeout, Duration};

async fn connect_with_timeout(addr: &str, timeout_secs: u64) -> Result<TcpStream, Box<dyn std::error::Error>> {
    // Wrap the connection in a timeout
    match timeout(Duration::from_secs(timeout_secs), TcpStream::connect(addr)).await {
        Ok(result) => {
            let stream = result?;
            Ok(stream)
        }
        Err(_) => {
            Err("Connection timed out".into())
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Try to connect with a 5-second timeout
    match connect_with_timeout("slow.example.com:80", 5).await {
        Ok(mut stream) => {
            println!("Connected successfully");

            // Read with timeout
            let mut buffer = [0; 1024];
            match timeout(Duration::from_secs(3), stream.read(&mut buffer)).await {
                Ok(Ok(n)) => {
                    println!("Read {} bytes", n);
                }
                Ok(Err(e)) => {
                    println!("Read error: {}", e);
                }
                Err(_) => {
                    println!("Read timed out");
                }
            }
        }
        Err(e) => {
            println!("Connection failed: {}", e);
        }
    }

    Ok(())
}
```

### Resource Pooling with Tokio

For applications that need to manage multiple connections to the same service (like a database), connection pooling is essential:

```rust
use std::sync::Arc;
use tokio::net::TcpStream;
use tokio::sync::{Mutex, Semaphore};
use tokio::time::{sleep, Duration};

struct ConnectionPool {
    connections: Vec<Mutex<TcpStream>>,
    available: Arc<Semaphore>,
}

impl ConnectionPool {
    async fn new(addr: &str, size: usize) -> Result<Arc<Self>, Box<dyn std::error::Error>> {
        let mut connections = Vec::with_capacity(size);

        // Create connections
        for _ in 0..size {
            let stream = TcpStream::connect(addr).await?;
            connections.push(Mutex::new(stream));
        }

        let pool = Arc::new(ConnectionPool {
            connections,
            available: Arc::new(Semaphore::new(size)),
        });

        Ok(pool)
    }

    async fn get_connection(&self) -> Result<PooledConnection, Box<dyn std::error::Error>> {
        // Wait for a permit
        let permit = self.available.acquire().await?;

        // Find an available connection
        for (idx, conn) in self.connections.iter().enumerate() {
            // Try to lock non-blocking
            if let Ok(stream) = conn.try_lock() {
                return Ok(PooledConnection {
                    pool: self,
                    stream: Some(stream),
                    index: idx,
                    permit: Some(permit),
                });
            }
        }

        // Should never reach here if semaphore is working correctly
        panic!("Failed to acquire connection despite having a permit");
    }
}

struct PooledConnection<'a> {
    pool: &'a ConnectionPool,
    stream: Option<tokio::sync::MutexGuard<'a, TcpStream>>,
    index: usize,
    permit: Option<tokio::sync::SemaphorePermit>,
}

impl<'a> Drop for PooledConnection<'a> {
    fn drop(&mut self) {
        // Release the permit when the connection is dropped
        self.permit.take();
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create a pool of 5 connections
    let pool = ConnectionPool::new("example.com:80", 5).await?;

    // Spawn 10 tasks that use connections from the pool
    for i in 0..10 {
        let pool = Arc::clone(&pool);

        tokio::spawn(async move {
            // Get a connection from the pool (will wait if none available)
            let conn = pool.get_connection().await.unwrap();

            println!("Task {} got connection {}", i, conn.index);

            // Simulate doing work with the connection
            sleep(Duration::from_secs(1)).await;

            println!("Task {} releasing connection {}", i, conn.index);
            // Connection automatically returned to pool when dropped
        });
    }

    // Wait for tasks to complete
    sleep(Duration::from_secs(3)).await;

    Ok(())
}
```

This connection pool example shows:

1. **Resource Management**: Limiting the number of concurrent connections
2. **Synchronization Primitives**: Using `Semaphore` for access control
3. **RAII Pattern**: Automatic resource cleanup with Rust's drop mechanism

### Best Practices for Tokio Networking

1. **Spawn Tasks Carefully**: Don't create too many tasks or too few
2. **Avoid Blocking Operations**: Use `tokio::task::spawn_blocking` for CPU-intensive work
3. **Use Timeouts**: Always set timeouts for network operations
4. **Handle Backpressure**: Use bounded channels and throttling
5. **Monitor Resource Usage**: Watch memory and file descriptor usage
6. **Error Handling**: Properly propagate and log errors
7. **Graceful Shutdown**: Implement clean shutdown procedures

Asynchronous networking with Tokio provides a powerful foundation for building high-performance network applications in Rust. In the next section, we'll explore HTTP clients and servers, which build on these async networking capabilities.

## HTTP Clients

HTTP is the foundation of web communication, and Rust offers several excellent libraries for making HTTP requests. In this section, we'll explore two popular HTTP client libraries: reqwest for asynchronous HTTP requests and ureq for synchronous requests.

### Overview of Rust HTTP Client Libraries

Rust has several options for HTTP clients, each with different strengths:

1. **reqwest**: Feature-rich async HTTP client based on hyper
2. **ureq**: Simple, synchronous HTTP client with no async runtime dependency
3. **hyper**: Low-level HTTP implementation (often used via higher-level wrappers)
4. **surf**: HTTP client with a consistent interface across multiple backends
5. **isahc**: HTTP client based on the curl library

We'll focus on reqwest and ureq as they represent the most common use cases.

### Asynchronous HTTP with reqwest

reqwest is a high-level HTTP client that supports async/await and offers a clean, ergonomic API.

#### Setting Up reqwest

Add reqwest to your `Cargo.toml`:

```toml
[dependencies]
reqwest = { version = "0.11", features = ["json"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

The `json` feature enables JSON serialization/deserialization, which is commonly needed for API requests.

#### Basic GET Request

Let's start with a simple GET request:

```rust
use reqwest::Error;

#[tokio::main]
async fn main() -> Result<(), Error> {
    // Make a GET request
    let response = reqwest::get("https://api.github.com/repos/rust-lang/rust").await?;

    // Check if the request was successful
    if response.status().is_success() {
        // Get the response body as text
        let body = response.text().await?;
        println!("Response body: {}", body);
    } else {
        println!("Request failed with status: {}", response.status());
    }

    Ok(())
}
```

#### Working with Headers

HTTP headers are important for many API requests:

```rust
use reqwest::header::{HeaderMap, HeaderValue, USER_AGENT};
use reqwest::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create a custom client with headers
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, HeaderValue::from_static("Rust-Learning-Client/1.0"));

    let client = Client::builder()
        .default_headers(headers)
        .build()?;

    // Make a request with the client
    let response = client.get("https://api.github.com/repos/rust-lang/rust")
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await?;

    println!("Status: {}", response.status());

    for (name, value) in response.headers() {
        println!("{}: {}", name, value.to_str().unwrap_or("<non-displayable>"));
    }

    Ok(())
}
```

#### JSON Requests and Responses

Many modern APIs use JSON for data exchange:

```rust
use serde::{Deserialize, Serialize};
use reqwest::Client;

#[derive(Serialize)]
struct CreatePost {
    title: String,
    body: String,
    user_id: i32,
}

#[derive(Deserialize, Debug)]
struct Post {
    id: i32,
    title: String,
    body: String,
    user_id: i32,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();

    // Create a new post via POST request with JSON body
    let new_post = CreatePost {
        title: String::from("Rust HTTP Clients"),
        body: String::from("reqwest is a powerful HTTP client for Rust"),
        user_id: 1,
    };

    // POST request with JSON
    let response = client.post("https://jsonplaceholder.typicode.com/posts")
        .json(&new_post)
        .send()
        .await?;

    // Parse the JSON response
    let created_post: Post = response.json().await?;
    println!("Created post: {:?}", created_post);

    // GET request with JSON response
    let response = client.get(format!("https://jsonplaceholder.typicode.com/posts/{}", created_post.id))
        .send()
        .await?;

    let post: Post = response.json().await?;
    println!("Retrieved post: {:?}", post);

    Ok(())
}
```

#### Handling Authentication

Many APIs require authentication:

```rust
use reqwest::{Client, Error};

#[tokio::main]
async fn main() -> Result<(), Error> {
    let client = Client::new();

    // Basic authentication
    let response = client.get("https://api.example.com/protected")
        .basic_auth("username", Some("password"))
        .send()
        .await?;

    println!("Basic Auth Status: {}", response.status());

    // Bearer token authentication
    let token = "your_token_here";
    let response = client.get("https://api.example.com/protected")
        .bearer_auth(token)
        .send()
        .await?;

    println!("Bearer Auth Status: {}", response.status());

    // Custom authentication header
    let response = client.get("https://api.example.com/protected")
        .header("X-API-Key", "your_api_key_here")
        .send()
        .await?;

    println!("Custom Auth Status: {}", response.status());

    Ok(())
}
```

#### Handling Timeouts and Retries

Network requests can fail or time out, so it's important to handle these cases:

```rust
use reqwest::{Client, Error};
use tokio::time::{sleep, Duration};
use std::time::Instant;

async fn fetch_with_retry(url: &str, max_retries: usize) -> Result<String, Error> {
    let client = Client::builder()
        .timeout(Duration::from_secs(5))
        .build()?;

    let mut retries = 0;

    loop {
        let start = Instant::now();

        match client.get(url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    return Ok(response.text().await?);
                } else if response.status().is_server_error() && retries < max_retries {
                    retries += 1;
                    println!("Server error ({}), retrying ({}/{})",
                             response.status(), retries, max_retries);
                } else {
                    // Client error or too many retries
                    return Err(Error::status(response.status()));
                }
            }
            Err(e) => {
                if e.is_timeout() && retries < max_retries {
                    retries += 1;
                    println!("Request timed out, retrying ({}/{})", retries, max_retries);
                } else if e.is_connect() && retries < max_retries {
                    retries += 1;
                    println!("Connection error, retrying ({}/{})", retries, max_retries);
                } else {
                    return Err(e);
                }
            }
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, etc.
        let backoff = Duration::from_secs(2u64.pow(retries as u32 - 1));
        println!("Waiting for {:?} before retry", backoff);
        sleep(backoff).await;
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    match fetch_with_retry("https://httpbin.org/status/503", 3).await {
        Ok(body) => println!("Success: {}", body),
        Err(e) => println!("Final error: {}", e),
    }

    Ok(())
}
```

#### Concurrent Requests

reqwest makes it easy to perform concurrent HTTP requests:

```rust
use futures::future::join_all;
use reqwest::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();

    // Create a list of URLs to fetch
    let urls = vec![
        "https://httpbin.org/get",
        "https://httpbin.org/ip",
        "https://httpbin.org/user-agent",
        "https://httpbin.org/headers",
    ];

    // Create a future for each request
    let requests = urls.iter().map(|&url| {
        let client = &client;
        async move {
            let resp = client.get(url).send().await?;
            let body = resp.text().await?;
            Result::<(String, String), reqwest::Error>::Ok((url.to_string(), body))
        }
    });

    // Execute all requests concurrently
    let results = join_all(requests).await;

    // Process the results
    for result in results {
        match result {
            Ok((url, body)) => {
                println!("URL: {}", url);
                println!("First 100 chars: {}", body.chars().take(100).collect::<String>());
                println!("---");
            }
            Err(e) => println!("Error: {}", e),
        }
    }

    Ok(())
}
```

### Synchronous HTTP with ureq

While async is often preferred for network operations, sometimes a simple synchronous API is more appropriate, especially for CLI tools or simple applications. ureq provides a clean, synchronous HTTP client without dependencies on an async runtime.

#### Setting Up ureq

Add ureq to your `Cargo.toml`:

```toml
[dependencies]
ureq = { version = "2.6", features = ["json"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

#### Basic Requests with ureq

Here's a simple GET request with ureq:

```rust
use ureq;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Make a GET request
    let response = ureq::get("https://httpbin.org/get")
        .set("User-Agent", "ureq-example")
        .call()?;

    println!("Status: {}", response.status());

    // Read the response body
    let body = response.into_string()?;
    println!("Response: {}", body);

    Ok(())
}
```

#### JSON with ureq

ureq also supports JSON serialization and deserialization:

```rust
use serde::{Deserialize, Serialize};
use ureq;

#[derive(Serialize)]
struct CreatePost {
    title: String,
    body: String,
    user_id: i32,
}

#[derive(Deserialize, Debug)]
struct Post {
    id: i32,
    title: String,
    body: String,
    user_id: i32,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create a new post
    let new_post = CreatePost {
        title: String::from("Rust HTTP Clients"),
        body: String::from("ureq is a simple synchronous HTTP client"),
        user_id: 1,
    };

    // POST with JSON
    let response = ureq::post("https://jsonplaceholder.typicode.com/posts")
        .set("Content-Type", "application/json")
        .send_json(ureq::json!(new_post))?;

    // Parse JSON response
    let created_post: Post = response.into_json()?;
    println!("Created post: {:?}", created_post);

    Ok(())
}
```

#### Timeouts and Error Handling

ureq has built-in support for timeouts and comprehensive error handling:

```rust
use std::time::Duration;
use ureq::{Agent, AgentBuilder, Error};

fn main() {
    // Create a custom agent with timeouts
    let agent: Agent = AgentBuilder::new()
        .timeout_connect(Duration::from_secs(5))
        .timeout_read(Duration::from_secs(10))
        .build();

    // Make a request with the agent
    match agent.get("https://httpbin.org/delay/15").call() {
        Ok(response) => {
            println!("Success: {}", response.status());
        }
        Err(Error::Status(code, response)) => {
            // Server returned an error status code
            println!("Server error {}: {}", code, response.into_string().unwrap());
        }
        Err(Error::Transport(transport)) => {
            // Connection/timeout error
            match transport.kind() {
                ureq::ErrorKind::Io => println!("I/O error"),
                ureq::ErrorKind::TimedOut => println!("Timeout error"),
                _ => println!("Other transport error: {}", transport),
            }
        }
    }
}
```

### Choosing Between reqwest and ureq

| Factor            | reqwest                             | ureq                              |
| ----------------- | ----------------------------------- | --------------------------------- |
| Concurrency Model | Asynchronous (async/await)          | Synchronous (blocking)            |
| Dependencies      | Tokio runtime                       | Minimal (no async runtime)        |
| Performance       | Better for many concurrent requests | Better for simple serial requests |
| Memory Usage      | Lower per concurrent request        | Higher for concurrent threads     |
| Ease of Use       | Requires async context              | Works in any context              |
| Features          | More comprehensive                  | Simpler but sufficient            |

Choose reqwest when:

- You need to make many concurrent requests
- You're already using Tokio or async Rust
- You need advanced features like connection pooling

Choose ureq when:

- You need a simple, synchronous API
- You want minimal dependencies
- You're building a CLI tool or simple application
- You want to avoid async complexity

### HTTP Client Best Practices

Regardless of which library you choose, follow these best practices:

1. **Set Timeouts**: Always set timeouts for requests to prevent hanging
2. **Handle Retries**: Implement retry logic with backoff for transient failures
3. **Respect Rate Limits**: Add delays or use tokens to avoid being blocked
4. **Connection Pooling**: Reuse connections when making multiple requests to the same host
5. **Proper Error Handling**: Distinguish between different types of failures
6. **User-Agent**: Set a descriptive User-Agent header
7. **Compression**: Enable compression to reduce bandwidth usage
8. **Streaming**: Use streaming for large responses instead of loading everything into memory

In the next section, we'll explore HTTP servers, which allow your Rust applications to respond to HTTP requests rather than making them.

## HTTP Servers

Building HTTP servers is a common requirement for modern applications, from RESTful APIs to full-stack web applications. Rust offers several excellent frameworks for building HTTP servers with different approaches and trade-offs. In this section, we'll explore how to build HTTP servers using Actix Web, a high-performance, feature-rich web framework.

### Web Framework Landscape in Rust

Rust has several web frameworks to choose from:

1. **Actix Web**: High-performance framework with a full-featured middleware system
2. **Axum**: Modern, minimal framework built on Tokio and hyper
3. **Rocket**: Ergonomic framework with a focus on ease of use and type safety
4. **warp**: Lightweight, composable web server library
5. **tide**: Minimal, friendly web application framework

We'll focus on Actix Web as it's one of the most mature and widely-used options, but the concepts apply broadly to other frameworks as well.

### Getting Started with Actix Web

Let's start by setting up Actix Web:

```toml
# Cargo.toml
[dependencies]
actix-web = "4"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

Here's a simple Hello World server:

```rust
use actix_web::{web, App, HttpServer, HttpResponse, Responder};

// Handler function for GET requests to "/"
async fn hello() -> impl Responder {
    HttpResponse::Ok().body("Hello, world!")
}

// Handler function for GET requests to "/echo/{name}"
async fn echo(path: web::Path<String>) -> impl Responder {
    let name = path.into_inner();
    HttpResponse::Ok().body(format!("Echo: {}", name))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Starting server at http://127.0.0.1:8080");

    // Create and start the HTTP server
    HttpServer::new(|| {
        App::new()
            .route("/", web::get().to(hello))
            .route("/echo/{name}", web::get().to(echo))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

This example demonstrates several key concepts:

1. **Handler Functions**: Asynchronous functions that process requests
2. **Routing**: Mapping URL patterns to handler functions
3. **Path Parameters**: Extracting dynamic values from the URL
4. **Responses**: Returning HTTP responses with status codes and bodies

### Request Handling and Extractors

Actix Web provides "extractors" to obtain data from requests:

```rust
use actix_web::{web, App, HttpServer, HttpResponse, Responder};
use serde::{Deserialize, Serialize};

// Define a struct for query parameters
#[derive(Deserialize)]
struct InfoQuery {
    name: Option<String>,
    age: Option<u32>,
}

// Define a struct for JSON body
#[derive(Deserialize)]
struct CreateUser {
    name: String,
    email: String,
    age: u32,
}

// Response model
#[derive(Serialize)]
struct User {
    id: u32,
    name: String,
    email: String,
    age: u32,
}

// Query parameter extractor
async fn info(query: web::Query<InfoQuery>) -> impl Responder {
    let name = query.name.as_deref().unwrap_or("Anonymous");
    let age = query.age.unwrap_or(0);

    HttpResponse::Ok().body(format!("Hello, {}! You are {} years old.", name, age))
}

// JSON body extractor
async fn create_user(user: web::Json<CreateUser>) -> impl Responder {
    // In a real app, we would save to a database
    let new_user = User {
        id: 42, // Generated ID
        name: user.name.clone(),
        email: user.email.clone(),
        age: user.age,
    };

    // Return the created user as JSON
    HttpResponse::Created().json(new_user)
}

// Path, headers, and body extractors combined
async fn complex_handler(
    path: web::Path<(u32,)>,
    headers: web::HttpRequest,
    body: web::Bytes,
) -> impl Responder {
    let user_id = path.0;
    let auth_header = headers.headers().get("Authorization")
        .map(|h| h.to_str().unwrap_or(""))
        .unwrap_or("");

    let body_text = String::from_utf8_lossy(&body);

    HttpResponse::Ok().body(format!(
        "User ID: {}, Auth: {}, Body: {}",
        user_id, auth_header, body_text
    ))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/info", web::get().to(info))
            .route("/users", web::post().to(create_user))
            .route("/users/{id}", web::put().to(complex_handler))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

This example demonstrates different types of extractors:

1. **Query Extractors**: `web::Query<T>` for URL query parameters
2. **JSON Extractors**: `web::Json<T>` for JSON request bodies
3. **Path Extractors**: `web::Path<T>` for URL path segments
4. **Raw Request**: `web::HttpRequest` for access to headers and other request data
5. **Body Extractors**: `web::Bytes` for raw request body data

### Response Types

Actix Web provides flexibility in how you return responses:

```rust
use actix_web::{web, App, HttpServer, HttpResponse, Responder, http::StatusCode};
use serde::Serialize;

// Simple string response
async fn string_response() -> impl Responder {
    "Hello, world!"
}

// HttpResponse for full control
async fn http_response() -> impl Responder {
    HttpResponse::Ok()
        .content_type("text/html")
        .append_header(("X-Custom-Header", "value"))
        .body("<h1>Hello, world!</h1>")
}

// JSON response
#[derive(Serialize)]
struct ApiResponse {
    status: String,
    message: String,
    code: u32,
}

async fn json_response() -> impl Responder {
    let response = ApiResponse {
        status: "success".to_string(),
        message: "Data retrieved successfully".to_string(),
        code: 200,
    };

    // Method 1: Using HttpResponse::Ok().json()
    HttpResponse::Ok().json(response)

    // Method 2: Using web::Json directly
    // web::Json(response)
}

// Custom response with status code
async fn not_found() -> impl Responder {
    HttpResponse::NotFound().body("Resource not found")
}

// Stream response for large data
async fn stream_response() -> impl Responder {
    use futures::stream::once;
    use futures::StreamExt;
    use std::time::Duration;
    use actix_web::web::Bytes;

    let stream = once(async {
        tokio::time::sleep(Duration::from_secs(1)).await;
        Bytes::from_static(b"Hello from stream!")
    });

    HttpResponse::Ok()
        .content_type("text/plain")
        .streaming(stream)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/string", web::get().to(string_response))
            .route("/http", web::get().to(http_response))
            .route("/json", web::get().to(json_response))
            .route("/notfound", web::get().to(not_found))
            .route("/stream", web::get().to(stream_response))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

### Middleware in Actix Web

Middleware allows you to process requests and responses before and after handler execution:

```rust
use actix_web::{
    dev::{Service, ServiceRequest, ServiceResponse, Transform},
    web, App, Error, HttpResponse, HttpServer,
};
use futures::future::{ok, Ready};
use futures::Future;
use std::pin::Pin;
use std::task::{Context, Poll};
use std::time::Instant;

// Logger middleware
struct Logger;

impl<S, B> Transform<S, ServiceRequest> for Logger
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = LoggerMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(LoggerMiddleware { service })
    }
}

struct LoggerMiddleware<S> {
    service: S,
}

impl<S, B> Service<ServiceRequest> for LoggerMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>>>>;

    fn poll_ready(&self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        println!("Request: {} {}", req.method(), req.path());
        let start = Instant::now();

        let fut = self.service.call(req);

        Box::pin(async move {
            let res = fut.await?;
            let duration = start.elapsed();
            println!("Response: {} - took {:?}", res.status(), duration);
            Ok(res)
        })
    }
}

// Handler
async fn index() -> HttpResponse {
    HttpResponse::Ok().body("Hello, middleware world!")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .wrap(Logger) // Apply middleware globally
            .route("/", web::get().to(index))
    })
    .bind("127.0.0.1:8080")?
    .workers(4) // Number of worker threads
    .run()
    .await
}
```

Actix Web also comes with several built-in middleware components:

```rust
use actix_web::{
    middleware::{Logger, Compress, DefaultHeaders},
    web, App, HttpResponse, HttpServer,
};

async fn index() -> HttpResponse {
    HttpResponse::Ok().body("Hello, world!")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    HttpServer::new(|| {
        App::new()
            // Logger middleware with custom format
            .wrap(Logger::new("%a %r %s %b %D"))
            // Response compression
            .wrap(Compress::default())
            // Add default headers to all responses
            .wrap(
                DefaultHeaders::new()
                    .add(("X-Version", "1.0.0"))
                    .add(("X-Server", "Rust-Actix"))
            )
            .route("/", web::get().to(index))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

### Error Handling

Proper error handling is crucial for robust web applications:

```rust
use actix_web::{
    error, get, middleware, web, App, HttpResponse, HttpServer, Result,
    http::{header::ContentType, StatusCode},
};
use derive_more::{Display, Error};
use serde::{Deserialize, Serialize};

// Custom error type
#[derive(Debug, Display, Error)]
enum MyError {
    #[display(fmt = "Internal Server Error")]
    InternalError,

    #[display(fmt = "Bad Request: {}", _0)]
    BadRequest(String),

    #[display(fmt = "Not Found")]
    NotFound,
}

// Implement ResponseError for custom error handling
impl error::ResponseError for MyError {
    fn error_response(&self) -> HttpResponse {
        let mut response = HttpResponse::new(self.status_code());
        response.insert_header(ContentType::html());

        // Create a simple HTML error page
        let body = format!(
            r#"<!DOCTYPE html>
            <html>
                <head><title>Error</title></head>
                <body>
                    <h1>Error: {}</h1>
                    <p>Status: {}</p>
                </body>
            </html>"#,
            self, self.status_code()
        );

        response.set_body(body)
    }

    fn status_code(&self) -> StatusCode {
        match *self {
            MyError::InternalError => StatusCode::INTERNAL_SERVER_ERROR,
            MyError::BadRequest(_) => StatusCode::BAD_REQUEST,
            MyError::NotFound => StatusCode::NOT_FOUND,
        }
    }
}

// JSON response type
#[derive(Serialize)]
struct SuccessResponse {
    id: u64,
    name: String,
}

// Handlers
#[get("/success")]
async fn success() -> Result<HttpResponse> {
    let response = SuccessResponse {
        id: 1,
        name: "Alice".to_string(),
    };
    Ok(HttpResponse::Ok().json(response))
}

#[get("/error/internal")]
async fn internal_error() -> Result<HttpResponse, MyError> {
    Err(MyError::InternalError)
}

#[get("/error/badrequest")]
async fn bad_request() -> Result<HttpResponse, MyError> {
    Err(MyError::BadRequest("Invalid parameters".into()))
}

#[get("/error/notfound")]
async fn not_found() -> Result<HttpResponse, MyError> {
    Err(MyError::NotFound)
}

#[get("/users/{id}")]
async fn get_user(path: web::Path<(u64,)>, data: web::Data<AppState>) -> Result<HttpResponse, MyError> {
    let user_id = path.0;

    // Simulate looking up a user
    if user_id == 42 {
        let response = SuccessResponse {
            id: user_id,
            name: "Douglas Adams".to_string(),
        };
        Ok(HttpResponse::Ok().json(response))
    } else {
        Err(MyError::NotFound)
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .wrap(middleware::Logger::default())
            .service(success)
            .service(internal_error)
            .service(bad_request)
            .service(not_found)
            .service(get_user)
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

### State Management

Actix Web allows you to share state between handlers:

```rust
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::collections::HashMap;

// App state
struct AppState {
    user_counter: Mutex<u32>,
    users: Mutex<HashMap<u32, User>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct User {
    id: u32,
    name: String,
    email: String,
}

// Handlers
async fn get_count(data: web::Data<AppState>) -> impl Responder {
    let counter = data.user_counter.lock().unwrap();
    HttpResponse::Ok().body(format!("User count: {}", *counter))
}

async fn add_user(
    data: web::Data<AppState>,
    user_data: web::Json<User>,
) -> impl Responder {
    let mut counter = data.user_counter.lock().unwrap();
    let mut users = data.users.lock().unwrap();

    // Create new user with auto-incremented ID
    let id = *counter + 1;
    *counter = id;

    let new_user = User {
        id,
        name: user_data.name.clone(),
        email: user_data.email.clone(),
    };

    // Store user
    users.insert(id, new_user.clone());

    HttpResponse::Created().json(new_user)
}

async fn get_user(
    data: web::Data<AppState>,
    path: web::Path<(u32,)>,
) -> impl Responder {
    let user_id = path.0;
    let users = data.users.lock().unwrap();

    match users.get(&user_id) {
        Some(user) => HttpResponse::Ok().json(user),
        None => HttpResponse::NotFound().body(format!("User {} not found", user_id)),
    }
}

async fn get_all_users(data: web::Data<AppState>) -> impl Responder {
    let users = data.users.lock().unwrap();
    let users_vec: Vec<User> = users.values().cloned().collect();

    HttpResponse::Ok().json(users_vec)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize app state
    let app_state = web::Data::new(AppState {
        user_counter: Mutex::new(0),
        users: Mutex::new(HashMap::new()),
    });

    HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone())
            .route("/count", web::get().to(get_count))
            .route("/users", web::post().to(add_user))
            .route("/users", web::get().to(get_all_users))
            .route("/users/{id}", web::get().to(get_user))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

For more complex applications, you would typically use an external database instead of in-memory state.

### Async Database Integration

Let's see how to integrate a database (SQLite in this case) with an async web server:

```rust
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use serde::{Deserialize, Serialize};

// Database connection pool
struct AppState {
    db: SqlitePool,
}

// Models
#[derive(Debug, Serialize, Deserialize)]
struct Task {
    id: Option<i64>,
    title: String,
    completed: bool,
}

// Handlers
async fn get_tasks(data: web::Data<AppState>) -> impl Responder {
    match sqlx::query_as!(
        Task,
        "SELECT id, title, completed FROM tasks ORDER BY id"
    )
    .fetch_all(&data.db)
    .await
    {
        Ok(tasks) => HttpResponse::Ok().json(tasks),
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().body("Database error")
        }
    }
}

async fn create_task(
    data: web::Data<AppState>,
    task: web::Json<Task>,
) -> impl Responder {
    match sqlx::query!(
        "INSERT INTO tasks (title, completed) VALUES (?, ?)",
        task.title,
        task.completed
    )
    .execute(&data.db)
    .await
    {
        Ok(result) => {
            let id = result.last_insert_rowid();
            let new_task = Task {
                id: Some(id),
                title: task.title.clone(),
                completed: task.completed,
            };
            HttpResponse::Created().json(new_task)
        }
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().body("Database error")
        }
    }
}

async fn get_task(
    data: web::Data<AppState>,
    path: web::Path<(i64,)>,
) -> impl Responder {
    let task_id = path.0;

    match sqlx::query_as!(
        Task,
        "SELECT id, title, completed FROM tasks WHERE id = ?",
        task_id
    )
    .fetch_optional(&data.db)
    .await
    {
        Ok(Some(task)) => HttpResponse::Ok().json(task),
        Ok(None) => HttpResponse::NotFound().body(format!("Task {} not found", task_id)),
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().body("Database error")
        }
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Set up database connection pool
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect("sqlite:tasks.db")
        .await
        .expect("Failed to connect to SQLite");

    // Create table if it doesn't exist
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT 0
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create table");

    // Create app state
    let app_state = web::Data::new(AppState { db: pool });

    // Start HTTP server
    HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone())
            .route("/tasks", web::get().to(get_tasks))
            .route("/tasks", web::post().to(create_task))
            .route("/tasks/{id}", web::get().to(get_task))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

### Static Files and Templates

For full-stack applications, you often need to serve static files and render templates:

```rust
use actix_web::{web, App, HttpServer, Result};
use actix_files::Files;
use tera::{Tera, Context};
use serde::Serialize;

struct AppState {
    templates: Tera,
}

#[derive(Serialize)]
struct TemplateData {
    title: String,
    items: Vec<String>,
}

async fn index(
    data: web::Data<AppState>,
) -> Result<actix_web::HttpResponse> {
    let mut context = Context::new();

    let template_data = TemplateData {
        title: "Rust Web Server".to_string(),
        items: vec![
            "Item 1".to_string(),
            "Item 2".to_string(),
            "Item 3".to_string(),
        ],
    };

    context.insert("data", &template_data);

    let rendered = data.templates.render("index.html", &context)
        .map_err(|e| {
            eprintln!("Template error: {}", e);
            actix_web::error::ErrorInternalServerError("Template error")
        })?;

    Ok(actix_web::HttpResponse::Ok().content_type("text/html").body(rendered))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Set up templates
    let templates = Tera::new("templates/**/*").expect("Failed to initialize templates");

    // Create app state
    let app_state = web::Data::new(AppState {
        templates,
    });

    // Start HTTP server
    HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone())
            .service(
                Files::new("/static", "static")
                    .show_files_listing()
                    .use_last_modified(true)
            )
            .route("/", web::get().to(index))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

### WebSockets

Actix Web supports WebSockets for real-time communication:

```rust
use actix::{Actor, StreamHandler};
use actix_web::{web, App, Error, HttpRequest, HttpResponse, HttpServer};
use actix_web_actors::ws;
use std::time::{Duration, Instant};

// WebSocket actor
struct MyWebSocket {
    hb: Instant,
}

impl Actor for MyWebSocket {
    type Context = ws::WebsocketContext<Self>;

    // Start the heartbeat process on actor start
    fn started(&mut self, ctx: &mut Self::Context) {
        self.heartbeat(ctx);
    }
}

// Handler for WebSocket messages
impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for MyWebSocket {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Ping(msg)) => {
                self.hb = Instant::now();
                ctx.pong(&msg);
            }
            Ok(ws::Message::Pong(_)) => {
                self.hb = Instant::now();
            }
            Ok(ws::Message::Text(text)) => {
                println!("Received text: {:?}", text);
                // Echo the message back
                ctx.text(format!("Echo: {}", text));
            }
            Ok(ws::Message::Binary(bin)) => {
                println!("Received binary: {:?} bytes", bin.len());
                // Echo the binary data back
                ctx.binary(bin);
            }
            Ok(ws::Message::Close(reason)) => {
                println!("WebSocket closed: {:?}", reason);
                ctx.close(reason);
            }
            _ => (),
        }
    }
}

impl MyWebSocket {
    fn new() -> Self {
        Self { hb: Instant::now() }
    }

    // Heartbeat to check for client timeouts
    fn heartbeat(&self, ctx: &mut ws::WebsocketContext<Self>) {
        ctx.run_interval(Duration::from_secs(5), |act, ctx| {
            // Check client heartbeat
            if Instant::now().duration_since(act.hb) > Duration::from_secs(10) {
                println!("WebSocket Client heartbeat failed, disconnecting!");
                ctx.stop();
                return;
            }

            ctx.ping(b"");
        });
    }
}

// WebSocket connection handler
async fn websocket(req: HttpRequest, stream: web::Payload) -> Result<HttpResponse, Error> {
    ws::start(MyWebSocket::new(), &req, stream)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/ws", web::get().to(websocket))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

### Performance Considerations

Actix Web is known for its high performance. Here are some tips to optimize your web server:

1. **Connection Pooling**: Use connection pools for databases and external services
2. **Async I/O**: Use asynchronous operations for I/O-bound tasks
3. **Worker Threads**: Configure an appropriate number of worker threads (typically CPU cores)
4. **Response Streaming**: Stream large responses instead of loading them into memory
5. **Caching**: Implement caching for frequently accessed resources
6. **Compression**: Enable response compression for bandwidth reduction
7. **Keep-Alive**: Configure appropriate keep-alive settings for persistent connections
8. **Middleware Order**: Place frequently used middleware first in the chain

### Web Server Best Practices

When building production-ready web servers in Rust, follow these best practices:

1. **Input Validation**: Validate all input data before processing
2. **Error Handling**: Implement comprehensive error handling and logging
3. **Rate Limiting**: Protect endpoints from abuse with rate limiting
4. **CORS**: Configure Cross-Origin Resource Sharing appropriately
5. **Security Headers**: Set security headers like Content-Security-Policy
6. **Authentication/Authorization**: Implement proper auth systems
7. **Logging**: Use structured logging for better observability
8. **Health Checks**: Provide health check endpoints for monitoring
9. **Graceful Shutdown**: Handle shutdown signals properly
10. **Documentation**: Document your API using OpenAPI/Swagger

In the next section, we'll explore protocol implementations with gRPC and Protocol Buffers, which provide an alternative to REST APIs for service-to-service communication.

## gRPC and Protocol Buffers

While REST APIs over HTTP are widely used for service-to-service communication, they have limitations in terms of performance, type safety, and contract definition. gRPC is a high-performance RPC (Remote Procedure Call) framework that addresses these limitations by using Protocol Buffers for service definitions and binary serialization.

### What is gRPC?

gRPC is a modern, open-source RPC framework initially developed by Google. Key features include:

1. **High Performance**: Uses HTTP/2 for transport, enabling multiplexing and header compression
2. **Language Agnostic**: Supports multiple programming languages (including Rust)
3. **Strongly Typed**: Uses Protocol Buffers for interface definition and serialization
4. **Bidirectional Streaming**: Supports client, server, and bidirectional streaming
5. **Authentication**: Built-in support for various authentication mechanisms

### Protocol Buffers

Protocol Buffers (protobuf) is a language-neutral, platform-neutral, extensible mechanism for serializing structured data. It provides:

1. **Compact Binary Format**: More efficient than JSON or XML
2. **Schema Definition Language**: Define message types and services
3. **Code Generation**: Automatically generate code for multiple languages
4. **Strong Typing**: Type-safe interfaces between services
5. **Backward Compatibility**: Schema evolution with versioning support

### Setting Up gRPC in Rust

Let's set up a simple gRPC service in Rust:

```toml
# Cargo.toml
[dependencies]
tonic = "0.8"
prost = "0.11"
tokio = { version = "1", features = ["full"] }
futures = "0.3"

[build-dependencies]
tonic-build = "0.8"
```

Create a Proto file to define our service:

```protobuf
// src/proto/hello.proto
syntax = "proto3";
package hello;

// The greeting service definition
service Greeter {
  // Sends a greeting
  rpc SayHello (HelloRequest) returns (HelloResponse);

  // Server streaming example
  rpc SayHelloStream (HelloRequest) returns (stream HelloResponse);
}

// The request message containing the user's name
message HelloRequest {
  string name = 1;
}

// The response message containing the greeting
message HelloResponse {
  string message = 1;
  int32 greet_count = 2;
}
```

Create a build script to compile the proto file:

```rust
// build.rs
fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::compile_protos(&["src/proto/hello.proto"], &["src/proto"])?;
    Ok(())
}
```

### Implementing a gRPC Server

Now, let's implement the gRPC server:

```rust
use tonic::{transport::Server, Request, Response, Status};
use futures::Stream;
use std::pin::Pin;
use std::time::Duration;
use tokio::sync::mpsc;
use tokio_stream::{wrappers::ReceiverStream, StreamExt};

// Import the generated code
pub mod hello {
    tonic::include_proto!("hello");
}

use hello::{
    greeter_server::{Greeter, GreeterServer},
    HelloRequest, HelloResponse,
};

// Server implementation
#[derive(Debug, Default)]
pub struct MyGreeter {
    greet_count: std::sync::atomic::AtomicI32,
}

#[tonic::async_trait]
impl Greeter for MyGreeter {
    // Unary RPC
    async fn say_hello(
        &self,
        request: Request<HelloRequest>,
    ) -> Result<Response<HelloResponse>, Status> {
        let name = request.into_inner().name;
        let count = self.greet_count.fetch_add(1, std::sync::atomic::Ordering::Relaxed) + 1;

        println!("Got a request from: {}", name);

        let reply = HelloResponse {
            message: format!("Hello, {}!", name),
            greet_count: count,
        };

        Ok(Response::new(reply))
    }

    // Server streaming RPC
    type SayHelloStreamStream = Pin<Box<dyn Stream<Item = Result<HelloResponse, Status>> + Send>>;

    async fn say_hello_stream(
        &self,
        request: Request<HelloRequest>,
    ) -> Result<Response<Self::SayHelloStreamStream>, Status> {
        let name = request.into_inner().name;

        // Create a channel for streaming responses
        let (tx, rx) = mpsc::channel(10);

        // Spawn a task to generate responses
        tokio::spawn(async move {
            for i in 1..=5 {
                // Simulate some work
                tokio::time::sleep(Duration::from_secs(1)).await;

                let response = HelloResponse {
                    message: format!("Hello {}, response #{}", name, i),
                    greet_count: i,
                };

                if tx.send(Ok(response)).await.is_err() {
                    // Client disconnected
                    break;
                }
            }
        });

        // Return the receiver as a stream
        let stream = ReceiverStream::new(rx);
        Ok(Response::new(Box::pin(stream) as Self::SayHelloStreamStream))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = "[::1]:50051".parse()?;
    let greeter = MyGreeter::default();

    println!("gRPC server listening on {}", addr);

    Server::builder()
        .add_service(GreeterServer::new(greeter))
        .serve(addr)
        .await?;

    Ok(())
}
```

### Implementing a gRPC Client

Now, let's implement a client to connect to our gRPC service:

```rust
use hello::{greeter_client::GreeterClient, HelloRequest};

pub mod hello {
    tonic::include_proto!("hello");
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to the server
    let mut client = GreeterClient::connect("http://[::1]:50051").await?;

    // Unary call
    let request = HelloRequest {
        name: "Tonic".to_string(),
    };

    let response = client.say_hello(request).await?;
    println!("Response: {:?}", response);

    // Server streaming call
    let request = HelloRequest {
        name: "Streaming Client".to_string(),
    };

    let mut stream = client.say_hello_stream(request).await?.into_inner();

    while let Some(response) = stream.message().await? {
        println!("Stream response: {:?}", response);
    }

    Ok(())
}
```

### Advanced gRPC Features

gRPC offers several advanced features that make it powerful for service-to-service communication:

#### Client Streaming

Client streaming allows the client to send multiple messages to the server:

```protobuf
// Client streaming RPC
rpc RecordRoute(stream Point) returns (RouteSummary);
```

```rust
async fn record_route(
    &self,
    request: Request<tonic::Streaming<Point>>,
) -> Result<Response<RouteSummary>, Status> {
    let mut stream = request.into_inner();
    let mut summary = RouteSummary::default();

    while let Some(point) = stream.message().await? {
        // Process each point
        summary.point_count += 1;
        // ... other processing
    }

    Ok(Response::new(summary))
}
```

#### Bidirectional Streaming

Bidirectional streaming allows both client and server to send multiple messages:

```protobuf
// Bidirectional streaming RPC
rpc RouteChat(stream RouteNote) returns (stream RouteNote);
```

```rust
type RouteChatStream = Pin<Box<dyn Stream<Item = Result<RouteNote, Status>> + Send>>;

async fn route_chat(
    &self,
    request: Request<tonic::Streaming<RouteNote>>,
) -> Result<Response<Self::RouteChatStream>, Status> {
    let mut stream = request.into_inner();
    let (tx, rx) = mpsc::channel(10);

    tokio::spawn(async move {
        while let Some(note) = stream.message().await.unwrap() {
            // Process incoming note
            let response = RouteNote {
                location: note.location,
                message: format!("Received: {}", note.message),
            };

            tx.send(Ok(response)).await.unwrap();
        }
    });

    Ok(Response::new(Box::pin(ReceiverStream::new(rx))))
}
```

#### Authentication and TLS

For secure communication, gRPC supports TLS and various authentication mechanisms:

```rust
// Server with TLS
use tonic::transport::{Identity, ServerTlsConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cert = tokio::fs::read("server.pem").await?;
    let key = tokio::fs::read("server.key").await?;
    let identity = Identity::from_pem(cert, key);

    let addr = "[::1]:50051".parse()?;
    let greeter = MyGreeter::default();

    Server::builder()
        .tls_config(ServerTlsConfig::new().identity(identity))?
        .add_service(GreeterServer::new(greeter))
        .serve(addr)
        .await?;

    Ok(())
}

// Client with TLS
use tonic::transport::{Certificate, ClientTlsConfig, Channel};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let ca_cert = tokio::fs::read("ca.pem").await?;
    let ca = Certificate::from_pem(ca_cert);

    let tls = ClientTlsConfig::new()
        .ca_certificate(ca)
        .domain_name("example.com");

    let channel = Channel::from_static("https://[::1]:50051")
        .tls_config(tls)?
        .connect()
        .await?;

    let mut client = GreeterClient::new(channel);
    // Use client as before

    Ok(())
}
```

#### Metadata and Headers

gRPC allows sending metadata (similar to HTTP headers) with requests and responses:

```rust
// Client sending metadata
use tonic::metadata::{MetadataMap, MetadataValue};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = GreeterClient::connect("http://[::1]:50051").await?;

    let mut request = Request::new(HelloRequest {
        name: "Metadata Example".to_string(),
    });

    // Add metadata to request
    let metadata = request.metadata_mut();
    metadata.insert("x-api-key", "secret-token".parse()?);

    let response = client.say_hello(request).await?;

    // Get metadata from response
    let headers = response.metadata();
    if let Some(server_version) = headers.get("x-server-version") {
        println!("Server version: {:?}", server_version);
    }

    Ok(())
}

// Server handling metadata
async fn say_hello(
    &self,
    request: Request<HelloRequest>,
) -> Result<Response<HelloResponse>, Status> {
    // Extract metadata from request
    let metadata = request.metadata();
    if let Some(api_key) = metadata.get("x-api-key") {
        if api_key != "secret-token" {
            return Err(Status::unauthenticated("Invalid API key"));
        }
    } else {
        return Err(Status::unauthenticated("Missing API key"));
    }

    // Create response
    let mut response = Response::new(HelloResponse {
        message: format!("Hello, {}!", request.into_inner().name),
        greet_count: 1,
    });

    // Add metadata to response
    let headers = response.metadata_mut();
    headers.insert("x-server-version", "1.0.0".parse()?);

    Ok(response)
}
```

### Protocol Buffers for Data Serialization

Protocol Buffers can also be used independently of gRPC for efficient data serialization:

```toml
# Cargo.toml
[dependencies]
prost = "0.11"
bytes = "1.0"

[build-dependencies]
prost-build = "0.11"
```

```protobuf
// src/proto/user.proto
syntax = "proto3";
package user;

message User {
  int32 id = 1;
  string name = 2;
  string email = 3;

  enum Role {
    MEMBER = 0;
    ADMIN = 1;
    OWNER = 2;
  }

  Role role = 4;
  repeated string tags = 5;

  message Address {
    string street = 1;
    string city = 2;
    string country = 3;
  }

  Address address = 6;
}
```

```rust
// build.rs
fn main() -> Result<(), Box<dyn std::error::Error>> {
    prost_build::compile_protos(&["src/proto/user.proto"], &["src/proto"])?;
    Ok(())
}
```

```rust
use bytes::{Buf, BufMut, Bytes, BytesMut};
use prost::Message;

// Include the generated code
pub mod user {
    include!(concat!(env!("OUT_DIR"), "/user.rs"));
}

use user::{User, user::Role};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create a user
    let mut user = User {
        id: 42,
        name: "Alice".to_string(),
        email: "alice@example.com".to_string(),
        role: Role::Admin as i32,
        tags: vec!["rust".to_string(), "programming".to_string()],
        address: Some(user::User_Address {
            street: "123 Main St".to_string(),
            city: "Techville".to_string(),
            country: "Rustland".to_string(),
        }),
    };

    // Serialize to bytes
    let mut buf = BytesMut::with_capacity(user.encoded_len());
    user.encode(&mut buf)?;
    let encoded = buf.freeze();

    println!("Encoded size: {} bytes", encoded.len());

    // Deserialize from bytes
    let decoded = User::decode(encoded)?;

    println!("Decoded user: {}", decoded.name);
    println!("Email: {}", decoded.email);

    if let Some(address) = decoded.address {
        println!("Address: {}, {}, {}", address.street, address.city, address.country);
    }

    Ok(())
}
```

### Comparing gRPC and REST

| Feature             | gRPC                                 | REST                                    |
| ------------------- | ------------------------------------ | --------------------------------------- |
| Protocol            | HTTP/2                               | HTTP/1.1 or HTTP/2                      |
| Contract Definition | Protocol Buffers                     | OpenAPI (optional)                      |
| Payload Format      | Binary (Protocol Buffers)            | Typically JSON                          |
| Code Generation     | Yes, from .proto files               | Optional with OpenAPI                   |
| Streaming           | Client, server, bidirectional        | Limited (SSE, WebSockets for streaming) |
| Browser Support     | Limited (requires gRPC-Web)          | Native                                  |
| Learning Curve      | Steeper                              | Familiar to most developers             |
| Performance         | Higher throughput, lower latency     | Moderate                                |
| Use Cases           | Microservices, high-performance APIs | Web APIs, public APIs                   |

Choose gRPC when:

- Performance is critical
- Service contracts need to be strictly defined
- You need streaming capabilities
- You're building internal microservices

Choose REST when:

- Browser compatibility is required
- You need maximum developer familiarity
- You're building public-facing APIs
- Simpler tooling is preferred

### Best Practices for gRPC in Rust

1. **Service Design**: Design fine-grained services with clear responsibilities
2. **Error Handling**: Use appropriate status codes and error details
3. **Timeouts**: Set appropriate timeouts for all RPC calls
4. **Connection Management**: Reuse client connections when possible
5. **Load Balancing**: Implement proper load balancing for production systems
6. **Monitoring**: Add metrics and tracing to gRPC services
7. **Testing**: Test with integration tests and mocked services
8. **Documentation**: Document service methods and message fields
9. **Versioning**: Plan for API evolution with backward compatibility
10. **Security**: Implement proper authentication and authorization

In the next section, we'll explore serialization with serde, a versatile framework for serializing and deserializing data in Rust.

## Serialization with Serde

Serialization and deserialization are crucial operations in network programming. They allow you to convert in-memory data structures to formats that can be transmitted over the network and vice versa. Rust's Serde framework provides a flexible and efficient approach to serialization, supporting multiple formats with a unified API.

### Introduction to Serde

Serde (SERialization/DEserialization) is a framework for serializing and deserializing Rust data structures efficiently and generically. Key features include:

1. **Format Agnostic**: Works with JSON, YAML, TOML, MessagePack, and more
2. **Zero-Copy Parsing**: Minimizes memory allocations and copies
3. **Custom Derive**: Automatic implementation of serialization traits
4. **Powerful Customization**: Fine-grained control over serialization behavior
5. **High Performance**: Optimized for speed and memory usage

### Setting Up Serde

To use Serde, add it to your `Cargo.toml`:

```toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

For different formats, you can add the corresponding libraries:

```toml
[dependencies]
serde_yaml = "0.9"
toml = "0.7"
rmp-serde = "1.1"  # MessagePack
bincode = "1.3"    # Binary format
```

### Basic Serialization and Deserialization

Let's start with a simple example:

```rust
use serde::{Serialize, Deserialize};
use std::collections::HashMap;

// Define a data structure
#[derive(Serialize, Deserialize, Debug)]
struct User {
    id: u64,
    name: String,
    email: Option<String>,
    active: bool,
    roles: Vec<String>,
    metadata: HashMap<String, String>,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create a data structure
    let mut metadata = HashMap::new();
    metadata.insert("last_login".to_string(), "2023-05-01T10:30:00Z".to_string());
    metadata.insert("theme".to_string(), "dark".to_string());

    let user = User {
        id: 42,
        name: "Alice".to_string(),
        email: Some("alice@example.com".to_string()),
        active: true,
        roles: vec!["admin".to_string(), "user".to_string()],
        metadata,
    };

    // Serialize to JSON
    let json = serde_json::to_string_pretty(&user)?;
    println!("JSON:\n{}", json);

    // Deserialize from JSON
    let deserialized_user: User = serde_json::from_str(&json)?;
    println!("Deserialized: {:?}", deserialized_user);

    Ok(())
}
```

### Working with Different Formats

Serde makes it easy to switch between different serialization formats:

```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
struct Config {
    server: ServerConfig,
    database: DatabaseConfig,
    logging: LoggingConfig,
}

#[derive(Serialize, Deserialize, Debug)]
struct ServerConfig {
    host: String,
    port: u16,
    threads: usize,
}

#[derive(Serialize, Deserialize, Debug)]
struct DatabaseConfig {
    url: String,
    max_connections: usize,
    timeout_seconds: u64,
}

#[derive(Serialize, Deserialize, Debug)]
struct LoggingConfig {
    level: String,
    file: Option<String>,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create a configuration
    let config = Config {
        server: ServerConfig {
            host: "127.0.0.1".to_string(),
            port: 8080,
            threads: 4,
        },
        database: DatabaseConfig {
            url: "postgres://user:pass@localhost/db".to_string(),
            max_connections: 10,
            timeout_seconds: 30,
        },
        logging: LoggingConfig {
            level: "info".to_string(),
            file: Some("app.log".to_string()),
        },
    };

    // JSON format
    let json = serde_json::to_string_pretty(&config)?;
    println!("JSON:\n{}", json);

    // YAML format
    let yaml = serde_yaml::to_string(&config)?;
    println!("\nYAML:\n{}", yaml);

    // TOML format
    let toml = toml::to_string(&config)?;
    println!("\nTOML:\n{}", toml);

    // Binary format (MessagePack)
    let mp = rmp_serde::to_vec(&config)?;
    println!("\nMessagePack: {} bytes", mp.len());

    // Binary format (Bincode)
    let bin = bincode::serialize(&config)?;
    println!("Bincode: {} bytes", bin.len());

    // Deserialize from different formats
    let from_json: Config = serde_json::from_str(&json)?;
    let from_yaml: Config = serde_yaml::from_str(&yaml)?;
    let from_toml: Config = toml::from_str(&toml)?;
    let from_mp: Config = rmp_serde::from_slice(&mp)?;
    let from_bin: Config = bincode::deserialize(&bin)?;

    assert_eq!(from_json.server.port, 8080);
    assert_eq!(from_yaml.database.max_connections, 10);
    assert_eq!(from_toml.logging.level, "info");

    Ok(())
}
```

### Customizing Serialization Behavior

Serde provides attributes to customize serialization behavior:

```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
struct User {
    id: u64,

    #[serde(rename = "userName")]
    name: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    email: Option<String>,

    #[serde(default)]
    active: bool,

    #[serde(rename_all = "UPPERCASE")]
    roles: Vec<Role>,

    #[serde(skip)]
    temporary_token: String,
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
enum Role {
    Admin,
    Moderator,
    User,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let user = User {
        id: 42,
        name: "Alice".to_string(),
        email: None,  // Will be skipped in serialization
        active: true,
        roles: vec![Role::Admin, Role::User],
        temporary_token: "secret".to_string(),  // Will be skipped
    };

    let json = serde_json::to_string_pretty(&user)?;
    println!("JSON:\n{}", json);

    // Note that the email field is omitted and roles are uppercase

    // Deserialize with default values
    let json_without_active = r#"{
        "id": 42,
        "userName": "Bob",
        "roles": ["ADMIN"]
    }"#;

    let user2: User = serde_json::from_str(json_without_active)?;

    // The 'active' field defaults to false
    println!("User with defaults: {:?}", user2);

    Ok(())
}
```

### Handling Complex Types

Serde can handle complex types like enums with different variants:

```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type", content = "data")]
enum Message {
    Text(TextMessage),
    Image(ImageMessage),
    File(FileMessage),
}

#[derive(Serialize, Deserialize, Debug)]
struct TextMessage {
    content: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct ImageMessage {
    url: String,
    width: u32,
    height: u32,
}

#[derive(Serialize, Deserialize, Debug)]
struct FileMessage {
    url: String,
    size: u64,
    name: String,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let messages = vec![
        Message::Text(TextMessage {
            content: "Hello, world!".to_string(),
        }),
        Message::Image(ImageMessage {
            url: "https://example.com/image.jpg".to_string(),
            width: 800,
            height: 600,
        }),
        Message::File(FileMessage {
            url: "https://example.com/document.pdf".to_string(),
            size: 1024 * 1024,
            name: "Document.pdf".to_string(),
        }),
    ];

    let json = serde_json::to_string_pretty(&messages)?;
    println!("JSON:\n{}", json);

    let deserialized: Vec<Message> = serde_json::from_str(&json)?;
    println!("Deserialized: {:?}", deserialized);

    Ok(())
}
```

### Custom Serialization Logic

For complex cases, you can implement custom serialization logic:

```rust
use serde::{Serialize, Deserialize, Serializer, Deserializer};
use serde::de::{self, Visitor};
use std::fmt;
use std::str::FromStr;

// A wrapper for an IP address
#[derive(Debug, PartialEq)]
struct IpAddr(std::net::IpAddr);

// Custom serialization
impl Serialize for IpAddr {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        // Serialize as a string
        serializer.serialize_str(&self.0.to_string())
    }
}

// Custom deserialization
impl<'de> Deserialize<'de> for IpAddr {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        // Define a visitor to parse the IP address
        struct IpAddrVisitor;

        impl<'de> Visitor<'de> for IpAddrVisitor {
            type Value = IpAddr;

            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str("a valid IP address string")
            }

            fn visit_str<E>(self, value: &str) -> Result<IpAddr, E>
            where
                E: de::Error,
            {
                std::net::IpAddr::from_str(value)
                    .map(IpAddr)
                    .map_err(|_| E::custom(format!("invalid IP address: {}", value)))
            }
        }

        deserializer.deserialize_str(IpAddrVisitor)
    }
}

// A structure using our custom type
#[derive(Serialize, Deserialize, Debug)]
struct Server {
    name: String,
    ip: IpAddr,
    ports: Vec<u16>,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let server = Server {
        name: "web-server".to_string(),
        ip: IpAddr(std::net::IpAddr::from_str("192.168.1.10")?),
        ports: vec![80, 443],
    };

    let json = serde_json::to_string_pretty(&server)?;
    println!("JSON:\n{}", json);

    let deserialized: Server = serde_json::from_str(&json)?;
    println!("Deserialized: {:?}", deserialized);

    assert_eq!(server.ip, deserialized.ip);

    Ok(())
}
```

### Working with Network Data

In network programming, you often need to serialize and deserialize data for transmission. Here's an example of a simple protocol using Serde:

```rust
use serde::{Serialize, Deserialize};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
enum Message {
    Connect {
        client_id: String,
        version: String,
    },
    Ping {
        sequence: u32,
    },
    Pong {
        sequence: u32,
    },
    Data {
        payload: Vec<u8>,
    },
    Disconnect {
        reason: String,
    },
}

async fn handle_client(mut stream: TcpStream) -> Result<(), Box<dyn std::error::Error>> {
    // Read message length (4 bytes)
    let mut len_bytes = [0u8; 4];
    stream.read_exact(&mut len_bytes).await?;
    let len = u32::from_be_bytes(len_bytes) as usize;

    // Read message data
    let mut buffer = vec![0u8; len];
    stream.read_exact(&mut buffer).await?;

    // Deserialize the message
    let message: Message = serde_json::from_slice(&buffer)?;
    println!("Received: {:?}", message);

    // Create a response
    let response = match message {
        Message::Connect { client_id, .. } => Message::Connect {
            client_id,
            version: "1.0".to_string(),
        },
        Message::Ping { sequence } => Message::Pong { sequence },
        Message::Data { .. } => Message::Data {
            payload: vec![1, 2, 3, 4],
        },
        _ => Message::Disconnect {
            reason: "Unknown message type".to_string(),
        },
    };

    // Serialize the response
    let response_data = serde_json::to_vec(&response)?;
    let response_len = response_data.len() as u32;

    // Send response length followed by data
    stream.write_all(&response_len.to_be_bytes()).await?;
    stream.write_all(&response_data).await?;

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let listener = TcpListener::bind("127.0.0.1:8080").await?;
    println!("Server listening on 127.0.0.1:8080");

    while let Ok((stream, _)) = listener.accept().await {
        tokio::spawn(async move {
            if let Err(e) = handle_client(stream).await {
                eprintln!("Error handling client: {}", e);
            }
        });
    }

    Ok(())
}
```

A client for this protocol:

```rust
use serde::{Serialize, Deserialize};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
enum Message {
    Connect {
        client_id: String,
        version: String,
    },
    Ping {
        sequence: u32,
    },
    Pong {
        sequence: u32,
    },
    Data {
        payload: Vec<u8>,
    },
    Disconnect {
        reason: String,
    },
}

async fn send_receive(
    stream: &mut TcpStream,
    message: &Message,
) -> Result<Message, Box<dyn std::error::Error>> {
    // Serialize the message
    let data = serde_json::to_vec(message)?;
    let len = data.len() as u32;

    // Send message length followed by data
    stream.write_all(&len.to_be_bytes()).await?;
    stream.write_all(&data).await?;

    // Read response length
    let mut len_bytes = [0u8; 4];
    stream.read_exact(&mut len_bytes).await?;
    let len = u32::from_be_bytes(len_bytes) as usize;

    // Read response data
    let mut buffer = vec![0u8; len];
    stream.read_exact(&mut buffer).await?;

    // Deserialize the response
    let response: Message = serde_json::from_slice(&buffer)?;

    Ok(response)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to server
    let mut stream = TcpStream::connect("127.0.0.1:8080").await?;

    // Send Connect message
    let connect_msg = Message::Connect {
        client_id: "client-123".to_string(),
        version: "1.0".to_string(),
    };

    let response = send_receive(&mut stream, &connect_msg).await?;
    println!("Connect response: {:?}", response);

    // Send Ping message
    let ping_msg = Message::Ping { sequence: 1 };
    let response = send_receive(&mut stream, &ping_msg).await?;
    println!("Ping response: {:?}", response);

    // Send Data message
    let data_msg = Message::Data {
        payload: vec![5, 6, 7, 8],
    };
    let response = send_receive(&mut stream, &data_msg).await?;
    println!("Data response: {:?}", response);

    // Send Disconnect message
    let disconnect_msg = Message::Disconnect {
        reason: "Client shutting down".to_string(),
    };
    let response = send_receive(&mut stream, &disconnect_msg).await?;
    println!("Disconnect response: {:?}", response);

    Ok(())
}
```

### Serde and WebAssembly

When targeting WebAssembly, Serde is particularly useful for serializing data between JavaScript and Rust:

```rust
use serde::{Serialize, Deserialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
struct InputData {
    values: Vec<f64>,
    operation: String,
}

#[derive(Serialize, Deserialize)]
struct OutputData {
    result: f64,
    operation: String,
    input_count: usize,
}

#[wasm_bindgen]
pub fn process_data(json_input: &str) -> String {
    let input: InputData = serde_json::from_str(json_input).unwrap();

    let result = match input.operation.as_str() {
        "sum" => input.values.iter().sum(),
        "avg" => input.values.iter().sum::<f64>() / input.values.len() as f64,
        "max" => input.values.iter().fold(f64::NEG_INFINITY, |a, &b| a.max(b)),
        "min" => input.values.iter().fold(f64::INFINITY, |a, &b| a.min(b)),
        _ => 0.0,
    };

    let output = OutputData {
        result,
        operation: input.operation,
        input_count: input.values.len(),
    };

    serde_json::to_string(&output).unwrap()
}
```

### Serde Best Practices

1. **Choose the Right Format**: JSON for human readability, Bincode/MessagePack for efficiency
2. **Use Strong Types**: Leverage Rust's type system for safer serialization
3. **Error Handling**: Provide meaningful error messages for parsing failures
4. **Versioning**: Design for backward compatibility as data structures evolve
5. **Validation**: Validate deserialized data before using it
6. **Performance**: Use zero-copy parsing when possible
7. **Security**: Be cautious with deserializing untrusted input
8. **Custom Implementations**: Implement custom serialization for complex types
9. **Testing**: Test serialization and deserialization with various inputs
10. **Documentation**: Document serialization behavior, especially customizations

Serde is a powerful tool for network programming in Rust, enabling efficient and type-safe serialization across a wide range of formats. In the next section, we'll explore network security principles and practices to ensure your networked applications are secure.

## Network Security

Security is a critical aspect of network programming. Networked applications are exposed to a wide range of threats, from passive eavesdropping to active attacks. In this section, we'll explore essential security concepts and techniques for building secure networked applications in Rust.

### Threat Model

Before implementing security measures, it's important to understand the threats your application faces. Common threats include:

1. **Eavesdropping**: Attackers intercepting network traffic
2. **Tampering**: Modifying data in transit
3. **Impersonation**: Pretending to be a legitimate user or server
4. **Denial of Service**: Overwhelming a system with traffic
5. **Injection Attacks**: Inserting malicious code or commands
6. **Data Exfiltration**: Unauthorized access to sensitive data

Your threat model should consider:

- What assets are you protecting?
- Who are the potential attackers?
- What are their capabilities and motivations?
- What are the consequences of a successful attack?

### Transport Layer Security (TLS)

TLS is the foundation of secure communication over the internet. It provides:

1. **Confidentiality**: Encrypting data to prevent eavesdropping
2. **Integrity**: Ensuring data isn't modified in transit
3. **Authentication**: Verifying the identity of servers and optionally clients

In Rust, several libraries support TLS:

#### Rustls

Rustls is a modern TLS library implemented in Rust:

```toml
[dependencies]
rustls = "0.21"
rustls-pemfile = "1.0"
tokio-rustls = "0.24"  # For async TLS with Tokio
webpki-roots = "0.25"  # For trust anchors
```

Here's an example of a TLS client using Rustls and Tokio:

```rust
use std::sync::Arc;
use tokio::net::TcpStream;
use tokio_rustls::{client::TlsStream, TlsConnector};
use rustls::{ClientConfig, RootCertStore};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

async fn connect_tls() -> Result<TlsStream<TcpStream>, Box<dyn std::error::Error>> {
    // Set up TLS configuration
    let mut root_store = RootCertStore::empty();
    root_store.add_server_trust_anchors(webpki_roots::TLS_SERVER_ROOTS.0.iter().map(|ta| {
        rustls::OwnedTrustAnchor::from_subject_spki_name_constraints(
            ta.subject, ta.spki, ta.name_constraints,
        )
    }));

    let config = ClientConfig::builder()
        .with_safe_defaults()
        .with_root_certificates(root_store)
        .with_no_client_auth();

    let connector = TlsConnector::from(Arc::new(config));

    // Connect to server
    let server_name = "example.com".try_into()?;
    let stream = TcpStream::connect("example.com:443").await?;
    let stream = connector.connect(server_name, stream).await?;

    Ok(stream)
}

async fn make_https_request() -> Result<(), Box<dyn std::error::Error>> {
    let mut stream = connect_tls().await?;

    // Send HTTP request
    let request = "GET / HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\n\r\n";
    stream.write_all(request.as_bytes()).await?;

    // Read response
    let mut buffer = Vec::new();
    stream.read_to_end(&mut buffer).await?;

    println!("Response: {}", String::from_utf8_lossy(&buffer));

    Ok(())
}
```

And a TLS server:

```rust
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio_rustls::TlsAcceptor;
use rustls::{Certificate, PrivateKey, ServerConfig};
use rustls_pemfile::{certs, pkcs8_private_keys};
use std::fs::File;
use std::io::BufReader;

async fn run_tls_server() -> Result<(), Box<dyn std::error::Error>> {
    // Load certificates and private key
    let cert_file = File::open("server.crt")?;
    let key_file = File::open("server.key")?;

    let certs = certs(&mut BufReader::new(cert_file))?
        .into_iter()
        .map(Certificate)
        .collect();

    let keys = pkcs8_private_keys(&mut BufReader::new(key_file))?
        .into_iter()
        .map(PrivateKey)
        .collect::<Vec<_>>();

    let key = keys.first().ok_or("No private key found")?;

    // Create TLS configuration
    let config = ServerConfig::builder()
        .with_safe_defaults()
        .with_no_client_auth()
        .with_single_cert(certs, key.clone())?;

    let acceptor = TlsAcceptor::from(Arc::new(config));

    // Start listening
    let listener = TcpListener::bind("0.0.0.0:8443").await?;
    println!("TLS server listening on 0.0.0.0:8443");

    while let Ok((stream, addr)) = listener.accept().await {
        let acceptor = acceptor.clone();

        tokio::spawn(async move {
            println!("New connection from {}", addr);

            match acceptor.accept(stream).await {
                Ok(mut stream) => {
                    // Handle the TLS connection
                    let mut buf = [0; 1024];
                    match stream.read(&mut buf).await {
                        Ok(n) => {
                            println!("Read {} bytes", n);
                            if n > 0 {
                                stream.write_all(&buf[0..n]).await.unwrap();
                            }
                        }
                        Err(e) => {
                            eprintln!("Error reading from connection: {}", e);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("TLS error: {}", e);
                }
            }
        });
    }

    Ok(())
}
```

#### Native-TLS

For integration with platform-specific TLS implementations:

```toml
[dependencies]
native-tls = "0.2"
tokio-native-tls = "0.3"  # For async TLS with Tokio
```

```rust
use native_tls::{TlsConnector, TlsAcceptor, Identity};
use tokio::net::TcpStream;
use tokio_native_tls::{TlsConnector as TokioTlsConnector, TlsStream};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

async fn connect_native_tls() -> Result<TlsStream<TcpStream>, Box<dyn std::error::Error>> {
    let connector = TlsConnector::builder().build()?;
    let connector = TokioTlsConnector::from(connector);

    let stream = TcpStream::connect("example.com:443").await?;
    let stream = connector.connect("example.com", stream).await?;

    Ok(stream)
}

// Load PKCS#12 certificate and key for server
fn create_tls_acceptor() -> Result<TlsAcceptor, Box<dyn std::error::Error>> {
    let der = std::fs::read("identity.pfx")?;
    let identity = Identity::from_pkcs12(&der, "password")?;

    let acceptor = TlsAcceptor::new(identity)?;
    Ok(acceptor)
}
```

### Authentication and Authorization

Authentication verifies who a user is, while authorization determines what they're allowed to do.

#### API Key Authentication

Simple API key authentication:

```rust
use actix_web::{web, App, HttpServer, HttpResponse, Error};
use actix_web::dev::ServiceRequest;
use actix_web_httpauth::extractors::bearer::{BearerAuth, Config};
use actix_web_httpauth::middleware::HttpAuthentication;

async fn validator(req: ServiceRequest, credentials: BearerAuth) -> Result<ServiceRequest, Error> {
    // In a real application, you would validate against a database
    // and use secure comparison methods
    if credentials.token() == "secret-api-key" {
        Ok(req)
    } else {
        Err(actix_web::error::ErrorUnauthorized("Invalid API key"))
    }
}

async fn protected_resource() -> HttpResponse {
    HttpResponse::Ok().body("Secret data")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let auth = HttpAuthentication::bearer(validator);

    HttpServer::new(move || {
        App::new()
            .service(
                web::scope("/api")
                    .wrap(auth.clone())
                    .route("/protected", web::get().to(protected_resource))
            )
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

#### JWT Authentication

JSON Web Tokens (JWT) provide a more flexible authentication mechanism:

```rust
use actix_web::{web, App, HttpServer, HttpResponse, Error};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation, Algorithm};
use serde::{Serialize, Deserialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,  // Subject (user ID)
    exp: u64,     // Expiration time
    iat: u64,     // Issued at
    role: String, // User role
}

async fn login(user_id: web::Path<String>) -> Result<HttpResponse, Error> {
    let expiration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() + 3600; // Token valid for 1 hour

    let issued_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let claims = Claims {
        sub: user_id.to_string(),
        exp: expiration,
        iat: issued_at,
        role: "user".to_string(),
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret("secret_key".as_bytes()),
    )
    .map_err(|_| actix_web::error::ErrorInternalServerError("Token creation failed"))?;

    Ok(HttpResponse::Ok().json(web::Json(token)))
}

async fn validate_token(token: &str) -> Result<Claims, Error> {
    let validation = Validation::new(Algorithm::HS256);

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret("secret_key".as_bytes()),
        &validation,
    )
    .map_err(|_| actix_web::error::ErrorUnauthorized("Invalid token"))?;

    Ok(token_data.claims)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/login/{user_id}", web::get().to(login))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

### Input Validation

Always validate user input to prevent injection attacks:

```rust
use serde::{Deserialize, Serialize};
use validator::{Validate, ValidationError};
use actix_web::{web, App, HttpServer, HttpResponse, Result};

#[derive(Debug, Serialize, Deserialize, Validate)]
struct User {
    #[validate(length(min = 3, max = 50, message = "Name must be between 3 and 50 characters"))]
    name: String,

    #[validate(email(message = "Invalid email format"))]
    email: String,

    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    #[validate(custom = "validate_password")]
    password: String,

    #[validate(range(min = 18, max = 120, message = "Age must be between 18 and 120"))]
    age: u8,
}

fn validate_password(password: &str) -> Result<(), ValidationError> {
    if !password.chars().any(|c| c.is_digit(10)) {
        return Err(ValidationError::new("Password must contain at least one digit"));
    }

    if !password.chars().any(|c| c.is_ascii_punctuation()) {
        return Err(ValidationError::new("Password must contain at least one special character"));
    }

    Ok(())
}

async fn create_user(user: web::Json<User>) -> Result<HttpResponse> {
    // Validate the user data
    user.validate().map_err(|e| {
        actix_web::error::ErrorBadRequest(format!("Validation error: {:?}", e))
    })?;

    // Process validated user data
    Ok(HttpResponse::Created().json(user.0))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/users", web::post().to(create_user))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

### Protection Against Common Attacks

#### Cross-Site Request Forgery (CSRF)

For web applications, protect against CSRF attacks:

```rust
use actix_web::{web, App, HttpServer, HttpResponse, Error};
use actix_identity::{CookieIdentityPolicy, IdentityService};
use actix_csrf::{CsrfMiddleware, CsrfToken};
use time::Duration;

async fn index(csrf_token: CsrfToken) -> HttpResponse {
    HttpResponse::Ok()
        .content_type("text/html")
        .body(format!(
            r#"
            <form action="/submit" method="post">
                <input type="hidden" name="csrf_token" value="{}" />
                <input type="text" name="data" />
                <button type="submit">Submit</button>
            </form>
            "#,
            csrf_token.token()
        ))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .wrap(IdentityService::new(
                CookieIdentityPolicy::new(&[0; 32]) // Use a proper secret key
                    .name("auth")
                    .max_age(Duration::days(1))
                    .secure(false), // Set to true in production with HTTPS
            ))
            .wrap(CsrfMiddleware::new().set_cookie_name("csrf"))
            .route("/", web::get().to(index))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

#### Rate Limiting

Protect against brute force and DoS attacks:

```rust
use std::time::{Duration, Instant};
use std::collections::HashMap;
use std::sync::Mutex;
use actix_web::{web, App, HttpServer, HttpResponse, HttpRequest, Error};

struct RateLimiter {
    // Map of IP addresses to (request count, last reset time)
    clients: Mutex<HashMap<String, (u32, Instant)>>,
    max_requests: u32,
    window: Duration,
}

impl RateLimiter {
    fn new(max_requests: u32, window: Duration) -> Self {
        Self {
            clients: Mutex::new(HashMap::new()),
            max_requests,
            window,
        }
    }

    fn is_allowed(&self, ip: &str) -> bool {
        let mut clients = self.clients.lock().unwrap();
        let now = Instant::now();

        let entry = clients.entry(ip.to_string()).or_insert((0, now));

        // Reset counter if window has passed
        if now.duration_since(entry.1) > self.window {
            *entry = (1, now);
            return true;
        }

        // Increment counter and check limit
        entry.0 += 1;
        entry.0 <= self.max_requests
    }
}

async fn rate_limited_endpoint(
    req: HttpRequest,
    limiter: web::Data<RateLimiter>,
) -> Result<HttpResponse, Error> {
    // Get client IP (in production, consider X-Forwarded-For with caution)
    let ip = req
        .connection_info()
        .peer_addr()
        .unwrap_or("unknown")
        .to_string();

    if limiter.is_allowed(&ip) {
        Ok(HttpResponse::Ok().body("Request allowed"))
    } else {
        Ok(HttpResponse::TooManyRequests().body("Rate limit exceeded"))
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Allow 5 requests per minute
    let limiter = web::Data::new(RateLimiter::new(5, Duration::from_secs(60)));

    HttpServer::new(move || {
        App::new()
            .app_data(limiter.clone())
            .route("/api", web::get().to(rate_limited_endpoint))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

### Secure Configuration and Secrets Management

Never hardcode secrets in your code. Instead:

1. **Environment Variables**: Use environment variables for configuration:

```rust
use std::env;

fn get_database_url() -> String {
    env::var("DATABASE_URL").expect("DATABASE_URL must be set")
}

fn get_api_key() -> String {
    env::var("API_KEY").expect("API_KEY must be set")
}
```

2. **Configuration Files**: Use configuration files with proper permissions:

```rust
use config::{Config, ConfigError, File};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct Settings {
    server: ServerSettings,
    database: DatabaseSettings,
    api_keys: ApiKeys,
}

#[derive(Debug, Deserialize)]
struct ServerSettings {
    port: u16,
    workers: usize,
}

#[derive(Debug, Deserialize)]
struct DatabaseSettings {
    url: String,
    max_connections: u32,
}

#[derive(Debug, Deserialize)]
struct ApiKeys {
    primary: String,
    secondary: String,
}

fn load_config() -> Result<Settings, ConfigError> {
    let config = Config::builder()
        .add_source(File::with_name("config/default"))
        .add_source(File::with_name("config/local").required(false))
        .build()?;

    config.try_deserialize()
}
```

3. **Secret Management Services**: In production, consider using services like HashiCorp Vault or AWS Secrets Manager.

### Secure Logging

Be careful not to log sensitive information:

```rust
use log::{info, warn, error};

fn process_payment(
    user_id: &str,
    amount: f64,
    credit_card: &str,
) -> Result<(), String> {
    // Log without sensitive data
    info!("Processing payment for user {} of amount {}", user_id, amount);

    // Mask sensitive data
    let masked_card = format!(
        "XXXX-XXXX-XXXX-{}",
        credit_card.chars().skip(15).collect::<String>()
    );

    // Use masked data in logs
    info!("Using payment method {}", masked_card);

    // Process payment...

    Ok(())
}
```

### Network Security Best Practices

1. **Use TLS**: Always encrypt data in transit with TLS.
2. **Input Validation**: Validate all user input.
3. **Authentication**: Implement proper authentication mechanisms.
4. **Authorization**: Check permissions for every sensitive operation.
5. **Rate Limiting**: Protect against brute force and DoS attacks.
6. **Secure Headers**: Set security headers for web applications.
7. **Keep Dependencies Updated**: Regularly update dependencies to patch security vulnerabilities.
8. **Principle of Least Privilege**: Limit access to only what's necessary.
9. **Defense in Depth**: Implement multiple layers of security.
10. **Security Testing**: Regularly test your application for vulnerabilities.

In the next section, we'll bring together the concepts we've learned to build a complete network protocol implementation.

## Project: Building a Custom Network Protocol

In this project, we'll bring together the concepts covered in this chapter to build a simple yet complete custom network protocol. We'll implement a chat server and client that support basic messaging, presence detection, and file transfers.

### Protocol Design

Our protocol will use a simple message format with JSON serialization:

1. Each message starts with a 4-byte length prefix (big-endian)
2. Followed by a JSON payload with a type field to indicate the message type
3. Various message types for different operations

### Message Types

```rust
use serde::{Serialize, Deserialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type")]
enum Message {
    // Authentication
    Login {
        username: String,
        password: String,
    },
    LoginResponse {
        success: bool,
        message: String,
        token: Option<String>,
    },

    // Chat
    ChatMessage {
        from: String,
        content: String,
        timestamp: u64,
    },

    // Presence
    UserJoined {
        username: String,
    },
    UserLeft {
        username: String,
    },
    UserList {
        users: Vec<String>,
    },

    // File transfer
    FileTransferRequest {
        filename: String,
        size: u64,
        from: String,
    },
    FileTransferResponse {
        accept: bool,
        transfer_id: Option<String>,
    },
    FileChunk {
        transfer_id: String,
        chunk_id: u32,
        data: Vec<u8>,
    },
    FileTransferComplete {
        transfer_id: String,
        success: bool,
    },

    // System
    Ping,
    Pong,
    Error {
        code: u32,
        message: String,
    },
}
```

### Server Implementation

```rust
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, Mutex};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use serde_json;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use std::error::Error;

// Shared state for the chat server
struct ChatServer {
    // Map of username to client sender channel
    clients: Mutex<HashMap<String, mpsc::Sender<Message>>>,
    // Active file transfers
    transfers: Mutex<HashMap<String, FileTransfer>>,
}

struct FileTransfer {
    filename: String,
    size: u64,
    from: String,
    to: String,
}

impl ChatServer {
    fn new() -> Self {
        Self {
            clients: Mutex::new(HashMap::new()),
            transfers: Mutex::new(HashMap::new()),
        }
    }

    // Broadcast a message to all clients
    async fn broadcast(&self, msg: Message, except: Option<&str>) {
        let clients = self.clients.lock().await;

        for (username, sender) in clients.iter() {
            if let Some(except_user) = except {
                if username == except_user {
                    continue;
                }
            }

            // We don't care if sending fails (client might have disconnected)
            let _ = sender.send(msg.clone()).await;
        }
    }

    // Register a new client
    async fn register_client(&self, username: String, sender: mpsc::Sender<Message>) -> bool {
        let mut clients = self.clients.lock().await;

        if clients.contains_key(&username) {
            return false;
        }

        clients.insert(username, sender);
        true
    }

    // Remove a client
    async fn remove_client(&self, username: &str) {
        let mut clients = self.clients.lock().await;
        clients.remove(username);
    }

    // Get the list of active users
    async fn get_user_list(&self) -> Vec<String> {
        let clients = self.clients.lock().await;
        clients.keys().cloned().collect()
    }
}

// Handle a client connection
async fn handle_client(stream: TcpStream, server: Arc<ChatServer>) {
    // Split the socket into reader and writer
    let (mut reader, mut writer) = stream.into_split();

    // Channel for sending messages to the client
    let (tx, mut rx) = mpsc::channel::<Message>(32);

    // Username for this connection (set after login)
    let mut username = None;

    // Process incoming messages
    loop {
        tokio::select! {
            // Handle incoming messages from the network
            result = read_message(&mut reader) => {
                match result {
                    Ok(message) => {
                        if !handle_message(message, &server, &mut username, &tx, &mut writer).await {
                            break;
                        }
                    }
                    Err(_) => break, // Connection closed or error
                }
            }

            // Handle outgoing messages to the client
            Some(message) = rx.recv() => {
                if let Err(_) = write_message(&mut writer, &message).await {
                    break; // Failed to write, connection probably closed
                }
            }
        }
    }

    // Clean up when client disconnects
    if let Some(user) = username {
        server.remove_client(&user).await;

        // Notify other users
        let left_msg = Message::UserLeft { username: user.clone() };
        server.broadcast(left_msg, None).await;

        println!("User disconnected: {}", user);
    }
}

// Read a message from the stream
async fn read_message(reader: &mut tokio::net::tcp::OwnedReadHalf) -> Result<Message, Box<dyn Error>> {
    // Read message length (4 bytes)
    let mut len_bytes = [0u8; 4];
    reader.read_exact(&mut len_bytes).await?;
    let len = u32::from_be_bytes(len_bytes) as usize;

    // Read message data
    let mut buffer = vec![0u8; len];
    reader.read_exact(&mut buffer).await?;

    // Deserialize message
    let message: Message = serde_json::from_slice(&buffer)?;

    Ok(message)
}

// Write a message to the stream
async fn write_message(
    writer: &mut tokio::net::tcp::OwnedWriteHalf,
    message: &Message,
) -> Result<(), Box<dyn Error>> {
    // Serialize message
    let data = serde_json::to_vec(message)?;
    let len = data.len() as u32;

    // Write length prefix and data
    writer.write_all(&len.to_be_bytes()).await?;
    writer.write_all(&data).await?;

    Ok(())
}

// Handle an incoming message
async fn handle_message(
    message: Message,
    server: &Arc<ChatServer>,
    username: &mut Option<String>,
    tx: &mpsc::Sender<Message>,
    writer: &mut tokio::net::tcp::OwnedWriteHalf,
) -> bool {
    match message {
        Message::Login { username: name, password } => {
            // Simplified authentication (in a real app, validate against a database)
            let success = password == "password"; // Never do this in production!

            if success {
                // Check if username is already taken
                let register_success = server.register_client(name.clone(), tx.clone()).await;

                if register_success {
                    *username = Some(name.clone());

                    // Send login response
                    let resp = Message::LoginResponse {
                        success: true,
                        message: "Login successful".to_string(),
                        token: Some("dummy-token".to_string()),
                    };
                    write_message(writer, &resp).await.unwrap();

                    // Notify other users
                    let join_msg = Message::UserJoined { username: name.clone() };
                    server.broadcast(join_msg, Some(&name)).await;

                    // Send user list to the new client
                    let users = server.get_user_list().await;
                    let user_list_msg = Message::UserList { users };
                    write_message(writer, &user_list_msg).await.unwrap();

                    println!("User logged in: {}", name);
                    true
                } else {
                    // Username already taken
                    let resp = Message::LoginResponse {
                        success: false,
                        message: "Username already taken".to_string(),
                        token: None,
                    };
                    write_message(writer, &resp).await.unwrap();
                    true
                }
            } else {
                // Authentication failed
                let resp = Message::LoginResponse {
                    success: false,
                    message: "Invalid credentials".to_string(),
                    token: None,
                };
                write_message(writer, &resp).await.unwrap();
                true
            }
        }

        Message::ChatMessage { content, .. } => {
            // Client must be logged in to send messages
            if let Some(ref user) = *username {
                // Create a properly attributed message
                let timestamp = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs();

                let message = Message::ChatMessage {
                    from: user.clone(),
                    content,
                    timestamp,
                };

                // Broadcast to all clients
                server.broadcast(message, None).await;
                true
            } else {
                // Not logged in
                let error = Message::Error {
                    code: 401,
                    message: "Not authenticated".to_string(),
                };
                write_message(writer, &error).await.unwrap();
                false
            }
        }

        Message::Ping => {
            // Respond with Pong
            write_message(writer, &Message::Pong).await.unwrap();
            true
        }

        // Add handlers for other message types here

        _ => {
            // Unhandled message type
            println!("Unhandled message: {:?}", message);
            true
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Create the shared server state
    let server = Arc::new(ChatServer::new());

    // Bind to address
    let listener = TcpListener::bind("127.0.0.1:8080").await?;
    println!("Chat server listening on 127.0.0.1:8080");

    // Accept connections
    while let Ok((stream, addr)) = listener.accept().await {
        println!("New connection from: {}", addr);

        // Spawn a new task for each client
        let server_clone = Arc::clone(&server);
        tokio::spawn(async move {
            if let Err(e) = handle_client(stream, server_clone).await {
                eprintln!("Error handling client: {}", e);
            }
        });
    }

    Ok(())
}
```

### Client Implementation

```rust
use tokio::net::TcpStream;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::mpsc;
use std::error::Error;
use std::io::{self, Write};
use std::sync::Arc;
use tokio::sync::Mutex;

// Shared state for the client
struct ChatClient {
    username: String,
    logged_in: bool,
    users: Vec<String>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Connect to server
    let stream = TcpStream::connect("127.0.0.1:8080").await?;
    println!("Connected to server");

    let (mut reader, mut writer) = stream.into_split();

    // Create shared state
    let client = Arc::new(Mutex::new(ChatClient {
        username: String::new(),
        logged_in: false,
        users: Vec::new(),
    }));

    // Channel for sending messages from user input to network
    let (tx, mut rx) = mpsc::channel::<Message>(32);

    // Spawn task to handle user input
    let client_clone = Arc::clone(&client);
    let tx_clone = tx.clone();
    tokio::spawn(async move {
        handle_user_input(client_clone, tx_clone).await;
    });

    // Spawn task to handle incoming messages
    let client_clone = Arc::clone(&client);
    tokio::spawn(async move {
        while let Ok(message) = read_message(&mut reader).await {
            handle_server_message(message, &client_clone, &tx).await;
        }
        println!("Server disconnected");
        std::process::exit(0);
    });

    // Main task sends messages to the server
    while let Some(message) = rx.recv().await {
        if let Err(e) = write_message(&mut writer, &message).await {
            eprintln!("Error sending message: {}", e);
            break;
        }
    }

    Ok(())
}

// Handle user input from stdin
async fn handle_user_input(
    client: Arc<Mutex<ChatClient>>,
    tx: mpsc::Sender<Message>,
) {
    // Buffer for user input
    let mut input = String::new();

    // First, log in
    print!("Enter username: ");
    io::stdout().flush().unwrap();
    io::stdin().read_line(&mut input).unwrap();
    let username = input.trim().to_string();

    input.clear();
    print!("Enter password: ");
    io::stdout().flush().unwrap();
    io::stdin().read_line(&mut input).unwrap();
    let password = input.trim().to_string();

    // Send login message
    let login_msg = Message::Login {
        username: username.clone(),
        password,
    };
    tx.send(login_msg).await.unwrap();

    // Set username in client state
    client.lock().await.username = username;

    // Main input loop
    loop {
        input.clear();
        io::stdin().read_line(&mut input).unwrap();
        let input = input.trim();

        if input.is_empty() {
            continue;
        }

        // Parse commands
        if input.starts_with("/") {
            let parts: Vec<&str> = input.splitn(2, ' ').collect();
            let cmd = parts[0];

            match cmd {
                "/quit" => {
                    println!("Goodbye!");
                    std::process::exit(0);
                }
                "/users" => {
                    let users = client.lock().await.users.clone();
                    println!("Online users: {}", users.join(", "));
                }
                // Add more commands here
                _ => {
                    println!("Unknown command: {}", cmd);
                }
            }
        } else {
            // Regular chat message
            let msg = Message::ChatMessage {
                from: String::new(), // Server will fill this
                content: input.to_string(),
                timestamp: 0, // Server will fill this
            };
            tx.send(msg).await.unwrap();
        }
    }
}

// Handle messages from the server
async fn handle_server_message(
    message: Message,
    client: &Arc<Mutex<ChatClient>>,
    tx: &mpsc::Sender<Message>,
) {
    match message {
        Message::LoginResponse { success, message, .. } => {
            if success {
                println!("Login successful");
                client.lock().await.logged_in = true;
            } else {
                println!("Login failed: {}", message);
                std::process::exit(1);
            }
        }

        Message::ChatMessage { from, content, timestamp } => {
            // Format timestamp
            let dt = chrono::DateTime::<chrono::Utc>::from_timestamp(timestamp as i64, 0)
                .unwrap()
                .format("%H:%M:%S");

            println!("[{}] {}: {}", dt, from, content);
        }

        Message::UserJoined { username } => {
            println!("User joined: {}", username);
            client.lock().await.users.push(username);
        }

        Message::UserLeft { username } => {
            println!("User left: {}", username);
            let mut client = client.lock().await;
            if let Some(pos) = client.users.iter().position(|u| u == &username) {
                client.users.remove(pos);
            }
        }

        Message::UserList { users } => {
            client.lock().await.users = users.clone();
            println!("Online users: {}", users.join(", "));
        }

        Message::Ping => {
            // Respond with Pong
            tx.send(Message::Pong).await.unwrap();
        }

        Message::Error { code, message } => {
            println!("Error {}: {}", code, message);
        }

        // Handle other message types

        _ => {
            println!("Received unhandled message: {:?}", message);
        }
    }
}

// Read a message from the stream (same as server implementation)
// [Implementation omitted for brevity]

// Write a message to the stream (same as server implementation)
// [Implementation omitted for brevity]
```

### Extensions and Improvements

This basic implementation can be extended in many ways:

1. **Secure Authentication**: Implement proper authentication with password hashing
2. **TLS Encryption**: Add TLS for secure communication
3. **Persistent Storage**: Store messages and user data in a database
4. **Channel Support**: Allow users to create and join different chat channels
5. **Direct Messaging**: Support private messages between users
6. **File Transfer Resume**: Add support for resuming interrupted file transfers
7. **Protocol Versioning**: Add version negotiation for backward compatibility
8. **Compression**: Compress messages to reduce bandwidth usage
9. **Rate Limiting**: Prevent spam and abuse
10. **Presence Updates**: Add support for user status (online, away, busy)

### Conclusion

In this project, we've built a functional custom network protocol using the concepts covered throughout this chapter. This demonstrates how Rust's safety features, performance, and async capabilities make it an excellent choice for network programming.

By working through this project, you've gained hands-on experience with:

- Socket programming
- Asynchronous I/O with Tokio
- Message serialization with serde
- Protocol design
- Error handling in networked applications
- Concurrent connections management

These skills form a strong foundation for building more complex networked applications in Rust, from web services to distributed systems.

## Summary

In this chapter, we've explored network programming in Rust from fundamental concepts to practical implementation. We've covered:

1. **Core Networking Concepts**: TCP/IP fundamentals, client-server architecture, and socket programming
2. **Asynchronous Networking**: Using Tokio for efficient concurrent connections
3. **HTTP Clients and Servers**: Building web services with reqwest, ureq, and Actix Web
4. **Protocol Implementation**: Using gRPC and Protocol Buffers for service communication
5. **Serialization**: Converting data structures to network formats with serde
6. **Network Security**: Protecting applications from common threats
7. **Custom Protocol Design**: Building a complete networked application

Rust's emphasis on safety, performance, and control makes it an excellent language for network programming, where reliability and efficiency are crucial. The ecosystem continues to evolve, with libraries like Tokio, hyper, and Actix Web providing powerful tools for building modern networked applications.

As you continue your Rust journey, the concepts and patterns from this chapter will serve as a foundation for building everything from simple network utilities to complex distributed systems.

## Exercises

1. **TCP Echo Server**: Implement a simple TCP echo server and client using standard library networking.

2. **Async Chat Client**: Extend the chat client from the project to add features like file transfers and typing indicators.

3. **HTTP API Client**: Build a command-line client for a public REST API using reqwest.

4. **WebSocket Application**: Create a real-time application using WebSockets with Actix Web.

5. **Custom Protocol Parser**: Implement a binary protocol parser for a standard protocol like DNS or MQTT.

6. **gRPC Service**: Design and implement a gRPC service with bidirectional streaming.

7. **TLS Implementation**: Add TLS support to a TCP server and client.

8. **Load Testing Tool**: Build a tool to benchmark HTTP servers under load.

9. **Proxy Server**: Create a simple HTTP proxy server that forwards requests.

10. **Distributed System**: Implement a simple distributed system with multiple nodes communicating over a custom protocol.
