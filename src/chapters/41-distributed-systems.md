# Chapter 41: Distributed Systems

## Introduction

Distributed systems represent one of the most challenging and rewarding areas of software development. These systems consist of multiple components running on different networked computers that coordinate their actions to appear as a single coherent system to end users. In the modern computing landscape, distributed systems have become increasingly important as applications scale to meet global demands.

Rust, with its emphasis on performance, reliability, and safety, is particularly well-suited for building distributed systems. Its ownership model helps prevent many common bugs that plague concurrent and distributed applications, while its performance characteristics make it ideal for resource-intensive distributed workloads.

In this chapter, we'll explore the fundamental concepts of distributed systems and how to implement them using Rust. We'll examine the challenges inherent in distributed computing—such as network partitions, consistency issues, and partial failures—and explore how Rust's features can help address these challenges.

By the end of this chapter, you'll understand the key principles of distributed systems and have practical experience implementing distributed algorithms and patterns in Rust. Whether you're building a distributed database, a microservice architecture, or a decentralized application, the concepts and techniques covered here will provide a solid foundation.

## Distributed Systems Fundamentals

Before diving into Rust-specific implementations, let's establish a foundation in distributed systems concepts.

### What Makes a System "Distributed"?

A distributed system is a collection of independent computers that appears to its users as a single coherent system. These systems are characterized by:

1. **Multiple Nodes**: Independent computers or processes that communicate with each other
2. **Communication Over a Network**: Nodes exchange messages rather than sharing memory
3. **Coordination**: Nodes work together to achieve common goals
4. **No Global Clock**: Each node operates with its own clock, making time synchronization a challenge
5. **Independent Failures**: Components can fail independently without causing the entire system to fail

### Key Challenges in Distributed Systems

Distributed systems introduce several fundamental challenges:

#### 1. Network Unreliability

Networks are inherently unreliable. Messages can be:

- Lost
- Delayed
- Duplicated
- Reordered
- Corrupted

```rust
// Example: Handling network unreliability with retries
async fn send_with_retry<T: Serialize>(
    client: &reqwest::Client,
    url: &str,
    data: &T,
    max_retries: usize,
) -> Result<reqwest::Response, reqwest::Error> {
    let mut attempts = 0;
    let mut delay = Duration::from_millis(100);

    loop {
        match client.post(url).json(data).send().await {
            Ok(response) => return Ok(response),
            Err(err) if attempts < max_retries => {
                println!("Request failed: {}, retrying in {:?}", err, delay);
                tokio::time::sleep(delay).await;
                attempts += 1;
                delay *= 2; // Exponential backoff
            }
            Err(err) => return Err(err),
        }
    }
}
```

#### 2. Partial Failures

In a distributed system, some components might fail while others continue operating. This partial failure scenario is particularly challenging because:

- It's difficult to determine whether a non-responding node has failed or is just slow
- The system must continue operating despite the failure of some components
- Failed components may recover and need to re-integrate into the system

#### 3. Consistency vs. Availability

The CAP theorem states that a distributed system cannot simultaneously provide all three of:

- **Consistency**: All nodes see the same data at the same time
- **Availability**: Every request receives a response
- **Partition Tolerance**: The system continues to operate despite network partitions

In practice, since network partitions are unavoidable, system designers must choose between consistency and availability when partitions occur.

#### 4. Latency and Performance

Network communication introduces significant latency compared to local operations. Distributed algorithms must be designed with this latency in mind.

### Distributed System Models

Several models help us reason about distributed systems:

#### Synchronous vs. Asynchronous Models

- **Synchronous Model**: Assumes bounded message delivery time, bounded processing time, and bounded clock drift
- **Asynchronous Model**: Makes no assumptions about timing, which is more realistic but harder to reason about

#### Failure Models

- **Crash-Stop Failures**: Nodes either function correctly or fail completely
- **Crash-Recovery Failures**: Nodes can fail and later recover
- **Byzantine Failures**: Nodes can behave arbitrarily, including maliciously

#### Communication Models

- **Point-to-Point**: Direct communication between nodes
- **Multicast**: One-to-many communication
- **Publish-Subscribe**: Many-to-many communication through topics

### Distributed Time and Order

In distributed systems, establishing a notion of time and event ordering is challenging:

#### Logical Clocks

**Lamport Clocks** provide a partial ordering of events in a distributed system:

```rust
struct Process {
    id: usize,
    lamport_clock: u64,
}

impl Process {
    fn new(id: usize) -> Self {
        Self {
            id,
            lamport_clock: 0,
        }
    }

    fn send_message(&mut self) -> Message {
        self.lamport_clock += 1;
        Message {
            sender_id: self.id,
            timestamp: self.lamport_clock,
            // other message fields...
        }
    }

    fn receive_message(&mut self, message: Message) {
        // Update local clock to be greater than both
        // the local clock and the message timestamp
        self.lamport_clock = std::cmp::max(self.lamport_clock, message.timestamp) + 1;

        // Process the message...
    }
}

struct Message {
    sender_id: usize,
    timestamp: u64,
    // other message fields...
}
```

**Vector Clocks** extend this idea to track causality more precisely:

```rust
struct VectorProcess {
    id: usize,
    vector_clock: Vec<u64>, // One entry per process in the system
}

impl VectorProcess {
    fn new(id: usize, num_processes: usize) -> Self {
        Self {
            id,
            vector_clock: vec![0; num_processes],
        }
    }

    fn send_message(&mut self) -> VectorMessage {
        // Increment own position in vector clock
        self.vector_clock[self.id] += 1;

        VectorMessage {
            sender_id: self.id,
            vector_timestamp: self.vector_clock.clone(),
            // other message fields...
        }
    }

    fn receive_message(&mut self, message: VectorMessage) {
        // Update vector clock by taking the maximum of each element
        for i in 0..self.vector_clock.len() {
            self.vector_clock[i] = std::cmp::max(
                self.vector_clock[i],
                message.vector_timestamp[i]
            );
        }

        // Increment own position
        self.vector_clock[self.id] += 1;

        // Process the message...
    }
}

struct VectorMessage {
    sender_id: usize,
    vector_timestamp: Vec<u64>,
    // other message fields...
}
```

#### Physical Time Synchronization

For cases where physical time is necessary, protocols like NTP (Network Time Protocol) can be used to synchronize clocks across nodes, though perfect synchronization is impossible.

Now that we've covered the fundamental concepts of distributed systems, let's explore how to implement these ideas in Rust, starting with communication patterns in the next section.

## Communication Patterns in Distributed Systems

Effective communication is the foundation of any distributed system. In this section, we'll explore different communication patterns and how to implement them in Rust.

### Request-Response Pattern

The request-response pattern is the simplest form of communication between nodes:

```rust
use tokio::net::{TcpListener, TcpStream};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct Request {
    id: u64,
    resource: String,
    operation: String,
}

#[derive(Serialize, Deserialize)]
struct Response {
    request_id: u64,
    status: u16,
    data: Vec<u8>,
}

// Server side implementation
async fn run_server() -> Result<(), Box<dyn std::error::Error>> {
    let listener = TcpListener::bind("127.0.0.1:8080").await?;

    loop {
        let (mut socket, _) = listener.accept().await?;

        tokio::spawn(async move {
            let mut buffer = vec![0; 1024];

            match socket.read(&mut buffer).await {
                Ok(n) => {
                    let request: Request = serde_json::from_slice(&buffer[..n]).unwrap();

                    // Process the request
                    let response = Response {
                        request_id: request.id,
                        status: 200,
                        data: format!("Processed {}", request.resource).into_bytes(),
                    };

                    let response_bytes = serde_json::to_vec(&response).unwrap();
                    socket.write_all(&response_bytes).await.unwrap();
                }
                Err(e) => println!("Failed to read from socket: {}", e),
            }
        });
    }
}

// Client side implementation
async fn make_request(resource: &str, operation: &str) -> Result<Response, Box<dyn std::error::Error>> {
    let mut socket = TcpStream::connect("127.0.0.1:8080").await?;

    let request = Request {
        id: 1, // In practice, use a unique ID generator
        resource: resource.to_string(),
        operation: operation.to_string(),
    };

    let request_bytes = serde_json::to_vec(&request)?;
    socket.write_all(&request_bytes).await?;

    let mut buffer = vec![0; 1024];
    let n = socket.read(&mut buffer).await?;

    let response: Response = serde_json::from_slice(&buffer[..n])?;
    Ok(response)
}
```

This basic pattern can be enhanced with:

- Timeouts to handle unresponsive servers
- Retries for transient failures
- Circuit breakers to prevent cascading failures

### Publish-Subscribe Pattern

The publish-subscribe pattern allows for decoupled, one-to-many communication:

```rust
use std::sync::{Arc, Mutex};
use std::collections::{HashMap, HashSet};
use tokio::sync::broadcast;
use serde::{Serialize, Deserialize};

#[derive(Clone, Serialize, Deserialize)]
struct Message {
    topic: String,
    payload: Vec<u8>,
}

struct PubSubBroker {
    // Map of topic to sender channel
    topics: HashMap<String, broadcast::Sender<Message>>,
}

impl PubSubBroker {
    fn new() -> Self {
        Self {
            topics: HashMap::new(),
        }
    }

    // Get or create a channel for a topic
    fn get_topic_channel(&mut self, topic: &str) -> broadcast::Sender<Message> {
        if !self.topics.contains_key(topic) {
            // Create a new channel with capacity for 100 messages
            let (tx, _) = broadcast::channel(100);
            self.topics.insert(topic.to_string(), tx);
        }

        self.topics.get(topic).unwrap().clone()
    }

    // Publish a message to a topic
    fn publish(&mut self, topic: &str, payload: Vec<u8>) {
        let tx = self.get_topic_channel(topic);
        let message = Message {
            topic: topic.to_string(),
            payload,
        };

        // It's okay if there are no subscribers
        let _ = tx.send(message);
    }

    // Subscribe to a topic
    fn subscribe(&mut self, topic: &str) -> broadcast::Receiver<Message> {
        let tx = self.get_topic_channel(topic);
        tx.subscribe()
    }
}

// Example usage
async fn pubsub_example() {
    let broker = Arc::new(Mutex::new(PubSubBroker::new()));

    // Create two subscribers
    let subscriber1_broker = Arc::clone(&broker);
    let subscriber2_broker = Arc::clone(&broker);

    // Subscriber 1
    let mut rx1 = {
        let mut broker = subscriber1_broker.lock().unwrap();
        broker.subscribe("updates")
    };

    // Subscriber 2
    let mut rx2 = {
        let mut broker = subscriber2_broker.lock().unwrap();
        broker.subscribe("updates")
    };

    // Start subscriber tasks
    let handle1 = tokio::spawn(async move {
        while let Ok(msg) = rx1.recv().await {
            println!("Subscriber 1 received: {:?}", msg.payload);
        }
    });

    let handle2 = tokio::spawn(async move {
        while let Ok(msg) = rx2.recv().await {
            println!("Subscriber 2 received: {:?}", msg.payload);
        }
    });

    // Publisher
    let publisher_broker = Arc::clone(&broker);
    let handle_pub = tokio::spawn(async move {
        for i in 0..5 {
            let mut broker = publisher_broker.lock().unwrap();
            broker.publish("updates", format!("Update {}", i).into_bytes());
            drop(broker); // Release lock
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }
    });

    // Wait for publisher to finish
    handle_pub.await.unwrap();

    // In a real application, we would clean up the subscribers as well
}
```

### Message Queues

Message queues provide asynchronous, reliable communication between components:

```rust
use tokio::sync::mpsc;
use tokio::time::{sleep, Duration};
use serde::{Serialize, Deserialize};
use std::sync::{Arc, Mutex};
use std::collections::VecDeque;

#[derive(Clone, Serialize, Deserialize)]
struct QueuedMessage {
    id: String,
    payload: Vec<u8>,
    created_at: u64, // Unix timestamp
}

struct MessageQueue {
    messages: VecDeque<QueuedMessage>,
    max_size: usize,
}

impl MessageQueue {
    fn new(max_size: usize) -> Self {
        Self {
            messages: VecDeque::with_capacity(max_size),
            max_size,
        }
    }

    fn enqueue(&mut self, payload: Vec<u8>) -> Result<String, &'static str> {
        if self.messages.len() >= self.max_size {
            return Err("Queue is full");
        }

        let id = uuid::Uuid::new_v4().to_string();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let message = QueuedMessage {
            id: id.clone(),
            payload,
            created_at: now,
        };

        self.messages.push_back(message);
        Ok(id)
    }

    fn dequeue(&mut self) -> Option<QueuedMessage> {
        self.messages.pop_front()
    }

    fn size(&self) -> usize {
        self.messages.len()
    }
}

// Example producer and consumer with the queue
async fn queue_example() {
    let queue = Arc::new(Mutex::new(MessageQueue::new(100)));

    // Producer
    let producer_queue = Arc::clone(&queue);
    let producer = tokio::spawn(async move {
        for i in 0..10 {
            let payload = format!("Message {}", i).into_bytes();
            {
                let mut q = producer_queue.lock().unwrap();
                match q.enqueue(payload) {
                    Ok(id) => println!("Produced message with ID: {}", id),
                    Err(e) => println!("Failed to produce message: {}", e),
                }
            }
            sleep(Duration::from_millis(500)).await;
        }
    });

    // Consumer
    let consumer_queue = Arc::clone(&queue);
    let consumer = tokio::spawn(async move {
        loop {
            let message = {
                let mut q = consumer_queue.lock().unwrap();
                q.dequeue()
            };

            match message {
                Some(msg) => {
                    println!("Consumed message: {}", String::from_utf8_lossy(&msg.payload));
                    // In a real system, process the message and acknowledge
                }
                None => {
                    println!("No messages to consume");
                    sleep(Duration::from_secs(1)).await;
                }
            }

            // Check if the queue is empty and producer is done
            {
                let q = consumer_queue.lock().unwrap();
                if q.size() == 0 {
                    // In a real system, we would have a way to know if producers are done
                    // For this example, we'll just exit after consuming all messages
                    break;
                }
            }
        }
    });

    // Wait for producer to finish
    producer.await.unwrap();
    // Wait for consumer to process all messages
    consumer.await.unwrap();
}
```

### Remote Procedure Call (RPC)

RPC allows nodes to invoke procedures on other nodes as if they were local:

```rust
use tonic::{transport::Server, Request, Response, Status};
use serde::{Serialize, Deserialize};

// Define the service in protobuf-like syntax (actual implementation would use .proto files)
#[derive(Serialize, Deserialize)]
pub struct CalculatorRequest {
    a: i32,
    b: i32,
}

#[derive(Serialize, Deserialize)]
pub struct CalculatorResponse {
    result: i32,
}

// Service trait and implementation
#[tonic::async_trait]
trait Calculator {
    async fn add(&self, request: Request<CalculatorRequest>) -> Result<Response<CalculatorResponse>, Status>;
    async fn subtract(&self, request: Request<CalculatorRequest>) -> Result<Response<CalculatorResponse>, Status>;
}

struct CalculatorService;

#[tonic::async_trait]
impl Calculator for CalculatorService {
    async fn add(&self, request: Request<CalculatorRequest>) -> Result<Response<CalculatorResponse>, Status> {
        let req = request.into_inner();
        let result = req.a + req.b;

        Ok(Response::new(CalculatorResponse { result }))
    }

    async fn subtract(&self, request: Request<CalculatorRequest>) -> Result<Response<CalculatorResponse>, Status> {
        let req = request.into_inner();
        let result = req.a - req.b;

        Ok(Response::new(CalculatorResponse { result }))
    }
}

// Server and client implementations would typically be generated from .proto files
// This is a simplified example of what the server would look like
async fn run_grpc_server() -> Result<(), Box<dyn std::error::Error>> {
    let addr = "[::1]:50051".parse()?;
    let calculator_service = CalculatorService;

    println!("Calculator server listening on {}", addr);

    // In a real implementation, Server::builder() would take the generated service
    // Server::builder()
    //     .add_service(calculator_service)
    //     .serve(addr)
    //     .await?;

    Ok(())
}

// Client example
async fn calculate_sum(a: i32, b: i32) -> Result<i32, Box<dyn std::error::Error>> {
    // In a real implementation, we would use the generated client
    // let mut client = CalculatorClient::connect("http://[::1]:50051").await?;
    // let request = Request::new(CalculatorRequest { a, b });
    // let response = client.add(request).await?;
    // Ok(response.into_inner().result)

    // For this example, we'll just return the result directly
    Ok(a + b)
}
```

In practice, you would use a crate like `tonic` for gRPC or `tarpc` for custom RPC implementations.

### Streaming Data

Many distributed systems need to handle continuous streams of data:

```rust
use tokio::net::{TcpListener, TcpStream};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;

struct StreamServer {
    clients: Arc<Mutex<HashMap<String, mpsc::Sender<Vec<u8>>>>>,
}

impl StreamServer {
    fn new() -> Self {
        Self {
            clients: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    async fn run(&self, address: &str) -> Result<(), Box<dyn std::error::Error>> {
        let listener = TcpListener::bind(address).await?;
        println!("Stream server listening on {}", address);

        loop {
            let (socket, addr) = listener.accept().await?;
            println!("New client connected: {}", addr);

            let clients = Arc::clone(&self.clients);
            tokio::spawn(async move {
                Self::handle_client(socket, addr.to_string(), clients).await;
            });
        }
    }

    async fn handle_client(
        mut socket: TcpStream,
        client_id: String,
        clients: Arc<Mutex<HashMap<String, mpsc::Sender<Vec<u8>>>>>
    ) {
        // Create a channel for sending data to this client
        let (tx, mut rx) = mpsc::channel(100);

        // Register the client
        {
            let mut clients_map = clients.lock().unwrap();
            clients_map.insert(client_id.clone(), tx);
        }

        let (mut reader, mut writer) = socket.split();

        // Task to read from the socket (client -> server)
        let read_task = tokio::spawn(async move {
            let mut buffer = vec![0; 1024];

            loop {
                match reader.read(&mut buffer).await {
                    Ok(0) => {
                        // Connection closed
                        break;
                    }
                    Ok(n) => {
                        println!("Received {} bytes from client {}", n, client_id);
                        // Process incoming data
                        // In a real application, you might:
                        // - Parse commands
                        // - Broadcast to other clients
                        // - Store data
                    }
                    Err(e) => {
                        eprintln!("Error reading from client {}: {}", client_id, e);
                        break;
                    }
                }
            }
        });

        // Task to write to the socket (server -> client)
        let write_task = tokio::spawn(async move {
            while let Some(data) = rx.recv().await {
                if let Err(e) = writer.write_all(&data).await {
                    eprintln!("Error writing to client: {}", e);
                    break;
                }
            }
        });

        // Wait for either task to finish
        tokio::select! {
            _ = read_task => {},
            _ = write_task => {},
        }

        // Unregister the client
        {
            let mut clients_map = clients.lock().unwrap();
            clients_map.remove(&client_id);
        }

        println!("Client {} disconnected", client_id);
    }

    async fn broadcast(&self, data: Vec<u8>) {
        let clients = self.clients.lock().unwrap();

        for (client_id, tx) in clients.iter() {
            match tx.send(data.clone()).await {
                Ok(_) => {},
                Err(_) => {
                    println!("Failed to send to client {}, they may have disconnected", client_id);
                }
            }
        }
    }
}

// Example usage
async fn run_stream_server() -> Result<(), Box<dyn std::error::Error>> {
    let server = StreamServer::new();
    let server_handle = tokio::spawn(async move {
        server.run("127.0.0.1:8081").await.unwrap();
    });

    // In a real application, we'd have a way to gracefully shut down
    server_handle.await?;
    Ok(())
}
```

These communication patterns form the foundation of distributed systems. In the next section, we'll explore service discovery mechanisms that allow system components to find and communicate with each other.

## Service Discovery

In a distributed system, services need to be able to find and communicate with each other. Service discovery is the process of automatically detecting and locating services and their endpoints within a network.

### Why Service Discovery?

Service discovery solves several critical problems in distributed systems:

1. **Dynamic Environments**: Instances are created and destroyed frequently, especially in cloud environments
2. **Scale**: Manual configuration becomes impractical as the number of services grows
3. **Resilience**: The system needs to adapt when instances fail or are replaced
4. **Load Balancing**: Requests should be distributed across available instances

### Service Discovery Patterns

There are two main approaches to service discovery:

#### 1. Client-Side Discovery

In this pattern, clients query a service registry and then directly contact the selected service instance:

```rust
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use rand::seq::SliceRandom;
use std::time::{Duration, Instant};

#[derive(Clone, Debug)]
struct ServiceInstance {
    id: String,
    host: String,
    port: u16,
    health_status: bool,
    last_heartbeat: Instant,
}

struct ServiceRegistry {
    services: HashMap<String, Vec<ServiceInstance>>,
    heartbeat_timeout: Duration,
}

impl ServiceRegistry {
    fn new(heartbeat_timeout: Duration) -> Self {
        Self {
            services: HashMap::new(),
            heartbeat_timeout,
        }
    }

    fn register(&mut self, service_name: &str, instance: ServiceInstance) {
        let instances = self.services.entry(service_name.to_string())
            .or_insert_with(Vec::new);

        // Remove any instance with the same ID if it exists
        instances.retain(|i| i.id != instance.id);
        instances.push(instance);
    }

    fn deregister(&mut self, service_name: &str, instance_id: &str) {
        if let Some(instances) = self.services.get_mut(service_name) {
            instances.retain(|i| i.id != instance_id);
        }
    }

    fn get_instances(&mut self, service_name: &str) -> Vec<ServiceInstance> {
        let now = Instant::now();

        if let Some(instances) = self.services.get_mut(service_name) {
            // Mark instances as unhealthy if they haven't sent a heartbeat
            for instance in instances.iter_mut() {
                if now.duration_since(instance.last_heartbeat) > self.heartbeat_timeout {
                    instance.health_status = false;
                }
            }

            // Return only healthy instances
            instances.iter()
                .filter(|i| i.health_status)
                .cloned()
                .collect()
        } else {
            Vec::new()
        }
    }

    fn heartbeat(&mut self, service_name: &str, instance_id: &str) -> bool {
        if let Some(instances) = self.services.get_mut(service_name) {
            if let Some(instance) = instances.iter_mut().find(|i| i.id == instance_id) {
                instance.last_heartbeat = Instant::now();
                instance.health_status = true;
                return true;
            }
        }
        false
    }
}

// Client for service discovery
struct ServiceDiscoveryClient {
    registry: Arc<Mutex<ServiceRegistry>>,
}

impl ServiceDiscoveryClient {
    fn new(registry: Arc<Mutex<ServiceRegistry>>) -> Self {
        Self { registry }
    }

    fn discover(&self, service_name: &str) -> Option<ServiceInstance> {
        let mut registry = self.registry.lock().unwrap();
        let instances = registry.get_instances(service_name);

        if instances.is_empty() {
            return None;
        }

        // Simple random load balancing
        let mut rng = rand::thread_rng();
        instances.choose(&mut rng).cloned()
    }

    async fn call_service<T>(&self, service_name: &str, path: &str) -> Result<T, reqwest::Error>
    where T: serde::de::DeserializeOwned {
        let instance = self.discover(service_name)
            .ok_or_else(|| {
                reqwest::Error::from(std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    format!("No instances found for service: {}", service_name)
                ))
            })?;

        let url = format!("http://{}:{}{}", instance.host, instance.port, path);
        let client = reqwest::Client::new();
        client.get(&url).send().await?.json::<T>().await
    }
}

// Service instance that registers itself
struct ServiceInstance {
    id: String,
    service_name: String,
    host: String,
    port: u16,
    registry: Arc<Mutex<ServiceRegistry>>,
}

impl ServiceInstance {
    fn new(
        service_name: &str,
        host: &str,
        port: u16,
        registry: Arc<Mutex<ServiceRegistry>>,
    ) -> Self {
        let id = uuid::Uuid::new_v4().to_string();

        Self {
            id,
            service_name: service_name.to_string(),
            host: host.to_string(),
            port,
            registry,
        }
    }

    fn register(&self) {
        let instance = ServiceInstance {
            id: self.id.clone(),
            host: self.host.clone(),
            port: self.port,
            health_status: true,
            last_heartbeat: Instant::now(),
        };

        let mut registry = self.registry.lock().unwrap();
        registry.register(&self.service_name, instance);
    }

    fn deregister(&self) {
        let mut registry = self.registry.lock().unwrap();
        registry.deregister(&self.service_name, &self.id);
    }

    async fn start_heartbeat(&self, interval: Duration) {
        loop {
            {
                let mut registry = self.registry.lock().unwrap();
                registry.heartbeat(&self.service_name, &self.id);
            }
            tokio::time::sleep(interval).await;
        }
    }
}

impl Drop for ServiceInstance {
    fn drop(&mut self) {
        self.deregister();
    }
}
```

#### 2. Server-Side Discovery

In this pattern, clients send requests to a load balancer, which forwards them to the appropriate service instance:

```rust
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tokio::net::{TcpListener, TcpStream};
use tokio::io::{AsyncReadExt, AsyncWriteExt};

struct LoadBalancer {
    routes: HashMap<String, Vec<String>>, // service name -> endpoints
    strategy: LoadBalancingStrategy,
}

enum LoadBalancingStrategy {
    RoundRobin,
    Random,
    LeastConnections,
}

impl LoadBalancer {
    fn new(strategy: LoadBalancingStrategy) -> Self {
        Self {
            routes: HashMap::new(),
            strategy,
        }
    }

    fn add_route(&mut self, service: &str, endpoint: &str) {
        let endpoints = self.routes.entry(service.to_string())
            .or_insert_with(Vec::new);

        if !endpoints.contains(&endpoint.to_string()) {
            endpoints.push(endpoint.to_string());
        }
    }

    fn remove_route(&mut self, service: &str, endpoint: &str) {
        if let Some(endpoints) = self.routes.get_mut(service) {
            endpoints.retain(|e| e != endpoint);
        }
    }

    fn get_endpoint(&self, service: &str) -> Option<String> {
        let endpoints = self.routes.get(service)?;
        if endpoints.is_empty() {
            return None;
        }

        match self.strategy {
            LoadBalancingStrategy::RoundRobin => {
                // In a real implementation, we'd track the last used index
                Some(endpoints[0].clone())
            }
            LoadBalancingStrategy::Random => {
                use rand::seq::SliceRandom;
                let mut rng = rand::thread_rng();
                endpoints.choose(&mut rng).cloned()
            }
            LoadBalancingStrategy::LeastConnections => {
                // In a real implementation, we'd track connections per endpoint
                Some(endpoints[0].clone())
            }
        }
    }
}

async fn run_load_balancer(address: &str) -> Result<(), Box<dyn std::error::Error>> {
    let lb = Arc::new(Mutex::new(LoadBalancer::new(LoadBalancingStrategy::Random)));

    // Add some example routes
    {
        let mut balancer = lb.lock().unwrap();
        balancer.add_route("user-service", "http://user-service-1:8080");
        balancer.add_route("user-service", "http://user-service-2:8080");
        balancer.add_route("order-service", "http://order-service-1:8080");
    }

    let listener = TcpListener::bind(address).await?;
    println!("Load balancer listening on {}", address);

    loop {
        let (mut socket, _) = listener.accept().await?;
        let lb = Arc::clone(&lb);

        tokio::spawn(async move {
            let mut buffer = vec![0; 1024];

            // Read the request (in a real implementation, we'd parse HTTP headers)
            match socket.read(&mut buffer).await {
                Ok(n) if n > 0 => {
                    // Extract service name from request
                    // In a real implementation, this would come from the URL path
                    let request = String::from_utf8_lossy(&buffer[..n]);
                    let service_name = if request.contains("/users") {
                        "user-service"
                    } else if request.contains("/orders") {
                        "order-service"
                    } else {
                        "unknown"
                    };

                    // Get endpoint for the service
                    let endpoint = {
                        let balancer = lb.lock().unwrap();
                        balancer.get_endpoint(service_name)
                    };

                    match endpoint {
                        Some(endpoint) => {
                            // Forward the request to the endpoint
                            // In a real implementation, we'd make an HTTP request
                            let response = format!("Forwarded to {}", endpoint).into_bytes();
                            socket.write_all(&response).await.unwrap();
                        }
                        None => {
                            // Service not found
                            let response = b"Service not found";
                            socket.write_all(response).await.unwrap();
                        }
                    }
                }
                _ => {
                    // Connection closed or error
                }
            }
        });
    }
}
```

### DNS-Based Service Discovery

DNS is a simple, widely supported service discovery mechanism:

```rust
use trust_dns_resolver::config::{ResolverConfig, ResolverOpts};
use trust_dns_resolver::Resolver;
use rand::seq::SliceRandom;

async fn dns_service_discovery(service_name: &str) -> Result<String, Box<dyn std::error::Error>> {
    // Create a new resolver
    let resolver = Resolver::new(ResolverConfig::default(), ResolverOpts::default())?;

    // Assuming service names follow the pattern: service-name.namespace.svc.cluster.local
    let dns_name = format!("{}.default.svc.cluster.local", service_name);

    // Resolve the service name to IP addresses
    let response = resolver.lookup_ip(dns_name)?;

    // Get all addresses
    let addresses: Vec<std::net::IpAddr> = response.iter().collect();

    if addresses.is_empty() {
        return Err("No addresses found for service".into());
    }

    // Choose a random address for simple load balancing
    let mut rng = rand::thread_rng();
    let chosen = addresses.choose(&mut rng)
        .ok_or("Failed to choose address")?;

    // Assuming the service runs on port 8080
    Ok(format!("http://{}:8080", chosen))
}
```

### Service Discovery with External Tools

In production systems, you often use dedicated service discovery tools:

#### Consul

```rust
use serde::{Deserialize, Serialize};
use reqwest::Client;

#[derive(Serialize)]
struct ConsulRegistration {
    id: String,
    name: String,
    address: String,
    port: u16,
    check: ConsulCheck,
}

#[derive(Serialize)]
struct ConsulCheck {
    http: String,
    interval: String,
}

#[derive(Deserialize, Debug)]
struct ConsulService {
    service_id: String,
    service_name: String,
    service_address: String,
    service_port: u16,
}

#[derive(Deserialize, Debug)]
struct ConsulServiceResponse {
    #[serde(rename = "Service")]
    service: ConsulService,
}

struct ConsulClient {
    http_client: Client,
    consul_url: String,
}

impl ConsulClient {
    fn new(consul_url: &str) -> Self {
        Self {
            http_client: Client::new(),
            consul_url: consul_url.to_string(),
        }
    }

    async fn register_service(&self,
                             id: &str,
                             name: &str,
                             address: &str,
                             port: u16) -> Result<(), reqwest::Error> {
        let registration = ConsulRegistration {
            id: id.to_string(),
            name: name.to_string(),
            address: address.to_string(),
            port,
            check: ConsulCheck {
                http: format!("http://{}:{}/health", address, port),
                interval: "10s".to_string(),
            },
        };

        self.http_client
            .put(&format!("{}/v1/agent/service/register", self.consul_url))
            .json(&registration)
            .send()
            .await?;

        Ok(())
    }

    async fn deregister_service(&self, id: &str) -> Result<(), reqwest::Error> {
        self.http_client
            .put(&format!("{}/v1/agent/service/deregister/{}", self.consul_url, id))
            .send()
            .await?;

        Ok(())
    }

    async fn discover_service(&self, name: &str) -> Result<Vec<ConsulServiceResponse>, reqwest::Error> {
        let response = self.http_client
            .get(&format!("{}/v1/health/service/{}", self.consul_url, name))
            .query(&[("passing", "true")])
            .send()
            .await?
            .json::<Vec<ConsulServiceResponse>>()
            .await?;

        Ok(response)
    }
}
```

#### etcd

```rust
use etcd_client::{Client, PutOptions, GetOptions};

async fn etcd_service_discovery() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to etcd
    let mut client = Client::connect(["localhost:2379"], None).await?;

    // Register a service
    let service_key = "/services/my-service/instance-1";
    let service_value = "http://10.0.0.1:8080";

    client.put(service_key, service_value, None).await?;

    // Discover services
    let services = client.get("/services/my-service", None).await?;

    for kv in services.kvs() {
        println!("Found service: {:?} -> {:?}",
                 String::from_utf8_lossy(kv.key()),
                 String::from_utf8_lossy(kv.value()));
    }

    // Watch for changes to services
    let mut watcher = client.watch("/services", None).await?;

    tokio::spawn(async move {
        while let Some(resp) = watcher.message().await.unwrap() {
            for event in resp.events() {
                match event.event_type() {
                    etcd_client::EventType::Put => {
                        println!("Service added: {:?}",
                                 String::from_utf8_lossy(event.kv().unwrap().value()));
                    }
                    etcd_client::EventType::Delete => {
                        println!("Service removed: {:?}",
                                 String::from_utf8_lossy(event.kv().unwrap().key()));
                    }
                }
            }
        }
    });

    Ok(())
}
```

### Service Discovery in Kubernetes

Kubernetes provides built-in service discovery through its Service resource:

```rust
use k8s_openapi::api::core::v1::Service;
use kube::{api::{Api, ListParams}, Client};

async fn kubernetes_service_discovery() -> Result<(), Box<dyn std::error::Error>> {
    // Create kubernetes client
    let client = Client::try_default().await?;

    // Get services in the default namespace
    let services: Api<Service> = Api::namespaced(client, "default");
    let service_list = services.list(&ListParams::default()).await?;

    for service in service_list {
        let name = service.metadata.name.unwrap_or_default();
        let cluster_ip = service.spec.and_then(|s| s.cluster_ip).unwrap_or_default();
        let ports = service.spec
            .and_then(|s| s.ports)
            .unwrap_or_default();

        println!("Service: {} at {}", name, cluster_ip);
        for port in ports {
            println!("  Port: {} -> {}", port.port, port.target_port.unwrap_or_default());
        }
    }

    Ok(())
}
```

### Service Mesh for Service Discovery

Service meshes like Linkerd, Istio, and Consul Connect provide advanced service discovery capabilities:

```rust
// Using Linkerd for service discovery is typically transparent to your code
// The following would be a typical client making a request through Linkerd

async fn call_service_via_mesh(service_name: &str, path: &str) -> Result<String, reqwest::Error> {
    // In a Linkerd-enabled cluster, DNS resolution uses the service name
    // Linkerd handles the actual routing and load balancing
    let url = format!("http://{}{}", service_name, path);

    let client = reqwest::Client::new();
    let response = client.get(&url)
        // Linkerd uses these headers for routing
        .header("l5d-dst-override", format!("{}.default.svc.cluster.local:80", service_name))
        .send()
        .await?
        .text()
        .await?;

    Ok(response)
}
```

Service discovery is a critical component of distributed systems, allowing services to locate and communicate with each other in a dynamic environment. In the next section, we'll explore distributed consensus algorithms, which enable coordination and agreement in distributed systems.

## Distributed Consensus

Distributed consensus is the process by which multiple nodes in a distributed system agree on a single value or state. This is a fundamental problem in distributed systems, as it underpins many critical operations such as leader election, atomic broadcast, and distributed transactions.

### The Consensus Problem

The consensus problem can be stated as follows:

1. **Agreement**: All correct nodes must agree on the same value.
2. **Validity**: If all nodes propose the same value, then all correct nodes decide on that value.
3. **Termination**: All correct nodes eventually decide on some value.

These properties must be satisfied even in the presence of failures or network partitions, making consensus challenging.

### Consensus Algorithms

Several algorithms have been developed to solve the consensus problem:

#### Paxos

Paxos is one of the oldest and most well-known consensus algorithms:

```rust
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;
use tokio::time::{sleep, timeout, Duration};
use serde::{Serialize, Deserialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
enum PaxosMessage {
    Prepare { proposal_number: u64 },
    Promise {
        proposal_number: u64,
        accepted_proposal: Option<(u64, String)>,
        node_id: String,
    },
    Accept { proposal_number: u64, value: String },
    Accepted {
        proposal_number: u64,
        node_id: String,
    },
}

struct PaxosNode {
    id: String,
    nodes: Vec<String>,
    promised_proposal: u64,
    accepted_proposal: Option<(u64, String)>,
    learnt_value: Option<String>,
    channels: HashMap<String, mpsc::Sender<PaxosMessage>>,
}

impl PaxosNode {
    fn new(id: String, nodes: Vec<String>) -> Self {
        Self {
            id,
            nodes,
            promised_proposal: 0,
            accepted_proposal: None,
            learnt_value: None,
            channels: HashMap::new(),
        }
    }

    fn register_channel(&mut self, node_id: String, channel: mpsc::Sender<PaxosMessage>) {
        self.channels.insert(node_id, channel);
    }

    async fn broadcast(&self, message: PaxosMessage) {
        for (node_id, channel) in &self.channels {
            if node_id != &self.id {
                let msg = message.clone();
                if let Err(e) = channel.send(msg).await {
                    println!("Failed to send to {}: {}", node_id, e);
                }
            }
        }
    }

    async fn send(&self, node_id: &str, message: PaxosMessage) -> Result<(), mpsc::error::SendError<PaxosMessage>> {
        if let Some(channel) = self.channels.get(node_id) {
            channel.send(message).await
        } else {
            Err(mpsc::error::SendError(message))
        }
    }

    async fn handle_message(&mut self, message: PaxosMessage) {
        match message {
            PaxosMessage::Prepare { proposal_number } => {
                if proposal_number > self.promised_proposal {
                    self.promised_proposal = proposal_number;
                    let promise = PaxosMessage::Promise {
                        proposal_number,
                        accepted_proposal: self.accepted_proposal.clone(),
                        node_id: self.id.clone(),
                    };
                    // Send promise back to proposer
                    // In a real implementation, we'd need to know which node is the proposer
                }
            }
            PaxosMessage::Promise {
                proposal_number,
                accepted_proposal,
                node_id,
            } => {
                // Handle promise message in proposer role
                // Collect promises and determine if we have a majority
                // Then send Accept messages
            }
            PaxosMessage::Accept { proposal_number, value } => {
                if proposal_number >= self.promised_proposal {
                    self.promised_proposal = proposal_number;
                    self.accepted_proposal = Some((proposal_number, value));
                    let accepted = PaxosMessage::Accepted {
                        proposal_number,
                        node_id: self.id.clone(),
                    };
                    // Send accepted back to proposer
                }
            }
            PaxosMessage::Accepted {
                proposal_number,
                node_id,
            } => {
                // Handle accepted message in proposer role
                // Collect accepted messages and determine if we have a majority
                // Then consider the value as chosen
            }
        }
    }

    async fn propose(&mut self, value: String) -> Result<String, &'static str> {
        // Simplified implementation of the proposer role
        let proposal_number = self.promised_proposal + 1;

        // Phase 1: Prepare
        let prepare = PaxosMessage::Prepare { proposal_number };
        self.broadcast(prepare).await;

        // In a real implementation, we'd collect promises and handle responses

        // Phase 2: Accept
        let accept = PaxosMessage::Accept {
            proposal_number,
            value: value.clone(),
        };
        self.broadcast(accept).await;

        // In a real implementation, we'd collect accepted messages and confirm consensus

        Ok(value)
    }
}

// Example of setting up a simple Paxos cluster
async fn setup_paxos_cluster() {
    let node_ids = vec!["node1".to_string(), "node2".to_string(), "node3".to_string()];
    let mut nodes = Vec::new();
    let mut channels = HashMap::new();

    // Create channels
    for id in &node_ids {
        let (tx, _rx) = mpsc::channel(100);
        channels.insert(id.clone(), tx);
    }

    // Create nodes
    for id in &node_ids {
        let mut node = PaxosNode::new(id.clone(), node_ids.clone());
        for (node_id, tx) in &channels {
            node.register_channel(node_id.clone(), tx.clone());
        }
        nodes.push(node);
    }

    // At this point, we would start each node in its own task
    // and implement the message handling logic
}
```

#### Raft

Raft is a more modern consensus algorithm designed to be more understandable than Paxos:

```rust
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;
use tokio::time::{sleep, timeout, Duration};
use serde::{Serialize, Deserialize};
use rand::Rng;

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum NodeState {
    Follower,
    Candidate,
    Leader,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
enum RaftMessage {
    RequestVote {
        term: u64,
        candidate_id: String,
        last_log_index: u64,
        last_log_term: u64,
    },
    VoteResponse {
        term: u64,
        vote_granted: bool,
    },
    AppendEntries {
        term: u64,
        leader_id: String,
        prev_log_index: u64,
        prev_log_term: u64,
        entries: Vec<LogEntry>,
        leader_commit: u64,
    },
    AppendEntriesResponse {
        term: u64,
        success: bool,
    },
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct LogEntry {
    term: u64,
    command: String,
}

struct RaftNode {
    id: String,
    nodes: Vec<String>,
    state: NodeState,
    current_term: u64,
    voted_for: Option<String>,
    log: Vec<LogEntry>,
    commit_index: u64,
    last_applied: u64,
    next_index: HashMap<String, u64>,
    match_index: HashMap<String, u64>,
    channels: HashMap<String, mpsc::Sender<RaftMessage>>,
    election_timeout: Duration,
    heartbeat_interval: Duration,
}

impl RaftNode {
    fn new(id: String, nodes: Vec<String>) -> Self {
        let mut rng = rand::thread_rng();
        // Randomized election timeout between 150-300ms
        let election_timeout = Duration::from_millis(rng.gen_range(150..300));

        Self {
            id,
            nodes,
            state: NodeState::Follower,
            current_term: 0,
            voted_for: None,
            log: Vec::new(),
            commit_index: 0,
            last_applied: 0,
            next_index: HashMap::new(),
            match_index: HashMap::new(),
            channels: HashMap::new(),
            election_timeout,
            heartbeat_interval: Duration::from_millis(50),
        }
    }

    fn register_channel(&mut self, node_id: String, channel: mpsc::Sender<RaftMessage>) {
        self.channels.insert(node_id, channel);
    }

    async fn broadcast(&self, message: RaftMessage) {
        for (node_id, channel) in &self.channels {
            if node_id != &self.id {
                let msg = message.clone();
                if let Err(e) = channel.send(msg).await {
                    println!("Failed to send to {}: {}", node_id, e);
                }
            }
        }
    }

    async fn send(&self, node_id: &str, message: RaftMessage) -> Result<(), mpsc::error::SendError<RaftMessage>> {
        if let Some(channel) = self.channels.get(node_id) {
            channel.send(message).await
        } else {
            Err(mpsc::error::SendError(message))
        }
    }

    async fn start(&mut self) {
        // Start election timer
        self.reset_election_timer().await;
    }

    async fn reset_election_timer(&mut self) {
        // In a real implementation, this would set up a timer to trigger an election
        // if we don't hear from a leader
    }

    async fn become_candidate(&mut self) {
        self.state = NodeState::Candidate;
        self.current_term += 1;
        self.voted_for = Some(self.id.clone());

        // Request votes from all other nodes
        let request_vote = RaftMessage::RequestVote {
            term: self.current_term,
            candidate_id: self.id.clone(),
            last_log_index: self.log.len() as u64,
            last_log_term: self.log.last().map_or(0, |entry| entry.term),
        };

        self.broadcast(request_vote).await;

        // In a real implementation, we'd set a timer to start a new election
        // if we don't get a majority of votes
    }

    async fn become_leader(&mut self) {
        if self.state == NodeState::Candidate {
            self.state = NodeState::Leader;

            // Initialize nextIndex and matchIndex for each node
            for node_id in &self.nodes {
                if node_id != &self.id {
                    self.next_index.insert(node_id.clone(), self.log.len() as u64 + 1);
                    self.match_index.insert(node_id.clone(), 0);
                }
            }

            // Send initial heartbeat
            self.send_heartbeat().await;

            // Start heartbeat timer
            self.start_heartbeat_timer().await;
        }
    }

    async fn start_heartbeat_timer(&mut self) {
        // In a real implementation, this would set up a timer to trigger heartbeats
    }

    async fn send_heartbeat(&mut self) {
        for node_id in &self.nodes {
            if node_id != &self.id {
                let next_idx = self.next_index.get(node_id).cloned().unwrap_or(1);
                let prev_log_index = next_idx - 1;
                let prev_log_term = if prev_log_index == 0 {
                    0
                } else if prev_log_index as usize <= self.log.len() {
                    self.log[(prev_log_index - 1) as usize].term
                } else {
                    0
                };

                let append_entries = RaftMessage::AppendEntries {
                    term: self.current_term,
                    leader_id: self.id.clone(),
                    prev_log_index,
                    prev_log_term,
                    entries: Vec::new(), // Heartbeat has no entries
                    leader_commit: self.commit_index,
                };

                self.send(node_id, append_entries).await.ok();
            }
        }
    }

    async fn handle_message(&mut self, message: RaftMessage) {
        match message {
            RaftMessage::RequestVote { term, candidate_id, last_log_index, last_log_term } => {
                // Handle RequestVote RPC
                let mut vote_granted = false;

                // Update term if necessary
                if term > self.current_term {
                    self.current_term = term;
                    self.state = NodeState::Follower;
                    self.voted_for = None;
                }

                // Decide whether to grant vote
                if term >= self.current_term &&
                   (self.voted_for.is_none() || self.voted_for.as_ref() == Some(&candidate_id)) {
                    // Check that candidate's log is at least as up-to-date as ours
                    let last_log_term_local = self.log.last().map_or(0, |entry| entry.term);
                    let last_log_index_local = self.log.len() as u64;

                    if last_log_term > last_log_term_local ||
                       (last_log_term == last_log_term_local && last_log_index >= last_log_index_local) {
                        vote_granted = true;
                        self.voted_for = Some(candidate_id.clone());
                        self.reset_election_timer().await;
                    }
                }

                // Send response
                let response = RaftMessage::VoteResponse {
                    term: self.current_term,
                    vote_granted,
                };

                self.send(&candidate_id, response).await.ok();
            }
            RaftMessage::VoteResponse { term, vote_granted } => {
                // Handle VoteResponse
                if self.state == NodeState::Candidate && term == self.current_term && vote_granted {
                    // Count votes and become leader if we have a majority
                    // In a real implementation, we'd keep track of votes received
                }

                if term > self.current_term {
                    self.current_term = term;
                    self.state = NodeState::Follower;
                    self.voted_for = None;
                    self.reset_election_timer().await;
                }
            }
            RaftMessage::AppendEntries {
                term, leader_id, prev_log_index, prev_log_term, entries, leader_commit
            } => {
                // Handle AppendEntries RPC
                let mut success = false;

                // Update term if necessary
                if term > self.current_term {
                    self.current_term = term;
                    self.state = NodeState::Follower;
                    self.voted_for = None;
                }

                // Reset election timer if message is from current leader
                if term >= self.current_term {
                    self.reset_election_timer().await;

                    // Check if log contains an entry at prev_log_index with term prev_log_term
                    let log_ok = if prev_log_index == 0 {
                        true
                    } else if prev_log_index as usize <= self.log.len() {
                        self.log[(prev_log_index - 1) as usize].term == prev_log_term
                    } else {
                        false
                    };

                    if log_ok {
                        success = true;

                        // Append new entries, removing conflicting entries
                        if !entries.is_empty() {
                            // In a real implementation, we'd handle log consistency here
                        }

                        // Update commit index
                        if leader_commit > self.commit_index {
                            self.commit_index = std::cmp::min(leader_commit, self.log.len() as u64);
                            // Apply committed entries
                            // In a real implementation, we'd apply commands to the state machine
                        }
                    }
                }

                // Send response
                let response = RaftMessage::AppendEntriesResponse {
                    term: self.current_term,
                    success,
                };

                self.send(&leader_id, response).await.ok();
            }
            RaftMessage::AppendEntriesResponse { term, success } => {
                // Handle AppendEntriesResponse
                if self.state == NodeState::Leader && term == self.current_term {
                    if success {
                        // Update nextIndex and matchIndex for the follower
                        // In a real implementation, we'd track which node sent this response
                    } else {
                        // Decrement nextIndex and retry
                        // In a real implementation, we'd track which node sent this response
                    }
                }

                if term > self.current_term {
                    self.current_term = term;
                    self.state = NodeState::Follower;
                    self.voted_for = None;
                    self.reset_election_timer().await;
                }
            }
        }
    }
}
```

#### Other Consensus Algorithms

There are several other consensus algorithms:

- **ZAB (Zookeeper Atomic Broadcast)**: Used in Apache Zookeeper
- **Viewstamped Replication**: An earlier consensus protocol that influenced Raft
- **Byzantine Fault Tolerance (BFT)** algorithms: Handle malicious nodes in addition to crashes

### Building a Raft Implementation in Rust

Several Rust crates provide Raft implementations:

- **raft-rs**: A high-performance Raft implementation used by TiKV
- **async-raft**: An async/await-based Raft implementation

Here's how you might use the async-raft crate:

```rust
use async_raft::{Config, Raft, RaftNetwork, RaftStorage};
use async_raft::NodeId;
use serde::{Serialize, Deserialize};
use std::sync::Arc;

// Define our state machine command
#[derive(Serialize, Deserialize, Debug, Clone)]
struct Command {
    key: String,
    value: String,
}

// Implement a storage layer (simplified)
struct MemStore {
    // Storage implementation would go here
}

// Implement a network layer (simplified)
struct Network {
    // Network implementation would go here
}

async fn run_raft_node() {
    // Create a configuration
    let config = Config::build("node-1".into())
        .heartbeat_interval(Duration::from_millis(100))
        .election_timeout_min(Duration::from_millis(300))
        .election_timeout_max(Duration::from_millis(600))
        .validate()
        .expect("Failed to build Raft config");

    // Create storage and network layers
    let storage = Arc::new(MemStore {});
    let network = Arc::new(Network {});

    // Create the Raft node
    let raft = Raft::new(config, network, storage);

    // Start the Raft node
    raft.initialize(vec!["node-1".into(), "node-2".into(), "node-3".into()]).await
        .expect("Failed to initialize Raft node");

    // Submit a command to the Raft node
    let cmd = Command {
        key: "foo".into(),
        value: "bar".into(),
    };

    raft.client_write(cmd).await
        .expect("Failed to write command");
}
```

### Practical Considerations for Consensus

When implementing consensus in real systems, consider:

1. **Performance**: Consensus adds latency and requires multiple round-trips
2. **Availability**: A quorum of nodes must be available to make progress
3. **Durability**: Log entries should be persisted to stable storage
4. **Membership Changes**: The set of nodes in the cluster may change over time
5. **Fault Tolerance**: The system should handle various failure scenarios

Distributed consensus is a fundamental building block for many distributed systems, enabling reliable coordination among nodes despite failures and network issues. In the next section, we'll explore patterns for building resilient distributed systems.

## Distributed Data Patterns

In distributed systems, data management is a critical concern. Let's explore some common patterns for managing data across multiple nodes.

### Data Partitioning

Partitioning (or sharding) is the process of dividing data across multiple nodes:

```rust
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::sync::{Arc, Mutex};
use consistent_hash_ring::{HashRing, Node};

// A simple key-value store node
struct KVStoreNode {
    id: String,
    data: HashMap<String, String>,
}

impl KVStoreNode {
    fn new(id: &str) -> Self {
        Self {
            id: id.to_string(),
            data: HashMap::new(),
        }
    }

    fn put(&mut self, key: &str, value: &str) {
        self.data.insert(key.to_string(), value.to_string());
    }

    fn get(&self, key: &str) -> Option<String> {
        self.data.get(key).cloned()
    }
}

// Simple consistent hashing implementation
struct ConsistentHashShardManager {
    nodes: Vec<Arc<Mutex<KVStoreNode>>>,
    ring: HashRing<String>,
}

impl ConsistentHashShardManager {
    fn new() -> Self {
        Self {
            nodes: Vec::new(),
            ring: HashRing::new(),
        }
    }

    fn add_node(&mut self, node_id: &str) -> Arc<Mutex<KVStoreNode>> {
        let node = Arc::new(Mutex::new(KVStoreNode::new(node_id)));
        self.nodes.push(Arc::clone(&node));
        self.ring.add(node_id.to_string());
        node
    }

    fn get_node_for_key(&self, key: &str) -> Option<Arc<Mutex<KVStoreNode>>> {
        self.ring.get(key).and_then(|node_id| {
            self.nodes.iter()
                .find(|n| n.lock().unwrap().id == *node_id)
                .cloned()
        })
    }

    fn put(&self, key: &str, value: &str) -> Result<(), String> {
        if let Some(node) = self.get_node_for_key(key) {
            let mut node = node.lock().unwrap();
            node.put(key, value);
            Ok(())
        } else {
            Err("No node available for key".to_string())
        }
    }

    fn get(&self, key: &str) -> Option<String> {
        self.get_node_for_key(key)
            .and_then(|node| node.lock().unwrap().get(key))
    }
}

// Example usage
fn distributed_kv_example() {
    let mut shard_manager = ConsistentHashShardManager::new();

    // Add nodes
    shard_manager.add_node("node1");
    shard_manager.add_node("node2");
    shard_manager.add_node("node3");

    // Store data
    shard_manager.put("user:1001", "Alice").unwrap();
    shard_manager.put("user:1002", "Bob").unwrap();
    shard_manager.put("user:1003", "Charlie").unwrap();

    // Retrieve data
    println!("User 1001: {:?}", shard_manager.get("user:1001"));
    println!("User 1002: {:?}", shard_manager.get("user:1002"));
    println!("User 1003: {:?}", shard_manager.get("user:1003"));
}
```

### Replication

Replication involves maintaining copies of data across multiple nodes:

```rust
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::time::sleep;

struct ReplicatedKVStore {
    primary: KVStoreNode,
    replicas: Vec<Arc<Mutex<KVStoreNode>>>,
    replication_mode: ReplicationMode,
}

enum ReplicationMode {
    Synchronous,
    Asynchronous,
}

impl ReplicatedKVStore {
    fn new(primary_id: &str, replica_ids: Vec<&str>, mode: ReplicationMode) -> Self {
        let primary = KVStoreNode::new(primary_id);
        let replicas = replica_ids.into_iter()
            .map(|id| Arc::new(Mutex::new(KVStoreNode::new(id))))
            .collect();

        Self {
            primary,
            replicas,
            replication_mode: mode,
        }
    }

    async fn put(&mut self, key: &str, value: &str) -> Result<(), String> {
        // Write to primary
        self.primary.put(key, value);

        match self.replication_mode {
            ReplicationMode::Synchronous => {
                // Write to all replicas and wait for completion
                for replica in &self.replicas {
                    let mut replica = replica.lock().unwrap();
                    replica.put(key, value);
                }
                Ok(())
            }
            ReplicationMode::Asynchronous => {
                // Write to replicas in the background
                let key = key.to_string();
                let value = value.to_string();
                let replicas = self.replicas.clone();

                tokio::spawn(async move {
                    for replica in &replicas {
                        let mut replica = replica.lock().unwrap();
                        replica.put(&key, &value);
                    }
                });

                Ok(())
            }
        }
    }

    fn get(&self, key: &str) -> Option<String> {
        // Read from primary for strong consistency
        self.primary.get(key)
    }

    fn get_from_any(&self, key: &str) -> Option<String> {
        // First try primary
        if let Some(value) = self.primary.get(key) {
            return Some(value);
        }

        // Then try replicas (for eventual consistency)
        for replica in &self.replicas {
            let replica = replica.lock().unwrap();
            if let Some(value) = replica.get(key) {
                return Some(value);
            }
        }

        None
    }
}

// Example usage
async fn replicated_kv_example() {
    let mut store = ReplicatedKVStore::new(
        "primary",
        vec!["replica1", "replica2"],
        ReplicationMode::Asynchronous,
    );

    // Write data
    store.put("key1", "value1").await.unwrap();

    // For async replication, give some time for replication to complete
    sleep(Duration::from_millis(100)).await;

    // Read data
    println!("Key1 from primary: {:?}", store.get("key1"));
    println!("Key1 from any: {:?}", store.get_from_any("key1"));
}
```

### Distributed Caching

Caching is essential for performance in distributed systems:

```rust
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

struct CacheEntry {
    value: String,
    expiry: Instant,
}

struct DistributedCache {
    local_cache: HashMap<String, CacheEntry>,
    remote_nodes: Vec<Arc<Mutex<HashMap<String, CacheEntry>>>>,
    ttl: Duration,
}

impl DistributedCache {
    fn new(ttl: Duration) -> Self {
        Self {
            local_cache: HashMap::new(),
            remote_nodes: Vec::new(),
            ttl,
        }
    }

    fn add_node(&mut self) -> Arc<Mutex<HashMap<String, CacheEntry>>> {
        let node = Arc::new(Mutex::new(HashMap::new()));
        self.remote_nodes.push(Arc::clone(&node));
        node
    }

    fn get(&mut self, key: &str) -> Option<String> {
        // Check local cache first
        self.clean_expired();
        if let Some(entry) = self.local_cache.get(key) {
            return Some(entry.value.clone());
        }

        // Then check remote nodes
        for node in &self.remote_nodes {
            let node = node.lock().unwrap();
            if let Some(entry) = node.get(key) {
                if entry.expiry > Instant::now() {
                    // Cache in local node
                    self.local_cache.insert(key.to_string(), CacheEntry {
                        value: entry.value.clone(),
                        expiry: entry.expiry,
                    });
                    return Some(entry.value.clone());
                }
            }
        }

        None
    }

    fn put(&mut self, key: &str, value: &str) {
        let expiry = Instant::now() + self.ttl;
        let entry = CacheEntry {
            value: value.to_string(),
            expiry,
        };

        // Update local cache
        self.local_cache.insert(key.to_string(), entry.clone());

        // Update one remote node (based on key hash)
        if !self.remote_nodes.is_empty() {
            let index = key.bytes().fold(0, |acc, b| acc + b as usize) % self.remote_nodes.len();
            let node = &self.remote_nodes[index];
            let mut node = node.lock().unwrap();
            node.insert(key.to_string(), entry);
        }
    }

    fn clean_expired(&mut self) {
        let now = Instant::now();
        self.local_cache.retain(|_, entry| entry.expiry > now);
    }

    fn invalidate(&mut self, key: &str) {
        // Remove from local cache
        self.local_cache.remove(key);

        // Remove from all remote nodes
        for node in &self.remote_nodes {
            let mut node = node.lock().unwrap();
            node.remove(key);
        }
    }
}

// Example usage
fn distributed_cache_example() {
    let mut cache = DistributedCache::new(Duration::from_secs(60));

    // Add cache nodes
    cache.add_node();
    cache.add_node();

    // Cache data
    cache.put("user:1001", "Alice");

    // Retrieve from cache
    println!("User 1001: {:?}", cache.get("user:1001"));

    // Invalidate cache
    cache.invalidate("user:1001");
    println!("User 1001 after invalidation: {:?}", cache.get("user:1001"));
}
```

### Conflict Resolution

In distributed systems, conflicts can arise when multiple nodes update the same data:

```rust
use std::collections::HashMap;
use std::cmp::max;
use std::time::{SystemTime, UNIX_EPOCH};

// Vector clock for tracking causality
#[derive(Clone, Debug, PartialEq, Eq)]
struct VectorClock {
    clocks: HashMap<String, u64>,
}

impl VectorClock {
    fn new() -> Self {
        Self {
            clocks: HashMap::new(),
        }
    }

    fn increment(&mut self, node_id: &str) {
        let count = self.clocks.entry(node_id.to_string()).or_insert(0);
        *count += 1;
    }

    fn merge(&mut self, other: &VectorClock) {
        for (node, &timestamp) in &other.clocks {
            let entry = self.clocks.entry(node.clone()).or_insert(0);
            *entry = max(*entry, timestamp);
        }
    }

    fn happens_before(&self, other: &VectorClock) -> bool {
        // True if self happens before other
        let mut less_than_or_equal = true;
        let mut strictly_less_than = false;

        for (node, &self_time) in &self.clocks {
            match other.clocks.get(node) {
                Some(&other_time) => {
                    if self_time > other_time {
                        less_than_or_equal = false;
                    }
                    if self_time < other_time {
                        strictly_less_than = true;
                    }
                }
                None => {
                    // If other doesn't have this clock, self is not before other
                    less_than_or_equal = false;
                }
            }
        }

        // Check if other has clocks that self doesn't
        for node in other.clocks.keys() {
            if !self.clocks.contains_key(node) {
                strictly_less_than = true;
            }
        }

        less_than_or_equal && strictly_less_than
    }

    fn concurrent(&self, other: &VectorClock) -> bool {
        !self.happens_before(other) && !other.happens_before(self)
    }
}

// Value with vector clock for conflict detection
#[derive(Clone, Debug)]
struct VersionedValue {
    value: String,
    vector_clock: VectorClock,
    timestamp: u64, // For last-write-wins fallback
}

impl VersionedValue {
    fn new(value: &str, node_id: &str) -> Self {
        let mut vector_clock = VectorClock::new();
        vector_clock.increment(node_id);

        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        Self {
            value: value.to_string(),
            vector_clock,
            timestamp,
        }
    }

    fn update(&mut self, new_value: &str, node_id: &str) {
        self.value = new_value.to_string();
        self.vector_clock.increment(node_id);
        self.timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
    }
}

// Storage node with conflict resolution
struct ConflictAwareNode {
    id: String,
    data: HashMap<String, VersionedValue>,
}

impl ConflictAwareNode {
    fn new(id: &str) -> Self {
        Self {
            id: id.to_string(),
            data: HashMap::new(),
        }
    }

    fn put(&mut self, key: &str, value: &str) {
        if let Some(existing) = self.data.get_mut(key) {
            existing.update(value, &self.id);
        } else {
            let versioned = VersionedValue::new(value, &self.id);
            self.data.insert(key.to_string(), versioned);
        }
    }

    fn get(&self, key: &str) -> Option<String> {
        self.data.get(key).map(|v| v.value.clone())
    }

    fn merge(&mut self, other_node: &ConflictAwareNode) {
        for (key, other_value) in &other_node.data {
            match self.data.get(key) {
                Some(self_value) => {
                    // Check if values conflict
                    if other_value.vector_clock.concurrent(&self_value.vector_clock) {
                        // Conflict! Resolve using timestamp (last-write-wins)
                        if other_value.timestamp > self_value.timestamp {
                            self.data.insert(key.clone(), other_value.clone());
                        }
                    } else if other_value.vector_clock.happens_before(&self_value.vector_clock) {
                        // Other is older, keep our version
                    } else {
                        // Our version is older or this is a new key
                        self.data.insert(key.clone(), other_value.clone());
                    }
                }
                None => {
                    // We don't have this key, simply add it
                    self.data.insert(key.clone(), other_value.clone());
                }
            }
        }
    }
}

// Example usage
fn conflict_resolution_example() {
    let mut node1 = ConflictAwareNode::new("node1");
    let mut node2 = ConflictAwareNode::new("node2");

    // Initial writes
    node1.put("key1", "value1-from-node1");
    node2.put("key2", "value2-from-node2");

    // Sync nodes
    node1.merge(&node2);
    node2.merge(&node1);

    // Both nodes should have both keys
    println!("Node1 - key1: {:?}, key2: {:?}", node1.get("key1"), node1.get("key2"));
    println!("Node2 - key1: {:?}, key2: {:?}", node2.get("key1"), node2.get("key2"));

    // Concurrent updates to same key
    node1.put("key3", "value3-from-node1");
    node2.put("key3", "value3-from-node2");

    // Merge again - will use timestamp to resolve
    node1.merge(&node2);
    node2.merge(&node1);

    // Both should converge to the same value
    println!("Node1 - key3: {:?}", node1.get("key3"));
    println!("Node2 - key3: {:?}", node2.get("key3"));
}
```

These distributed data patterns provide the foundation for building scalable and resilient distributed systems. In the next section, we'll explore how to handle failures and build fault-tolerant systems.

## Fault Tolerance in Distributed Systems

A key aspect of distributed systems is their ability to handle failures gracefully. In this section, we'll explore patterns and techniques for building fault-tolerant systems.

### Circuit Breakers

The circuit breaker pattern helps prevent cascading failures when a dependency is experiencing issues:

```rust
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::time::sleep;

enum CircuitState {
    Closed,
    Open,
    HalfOpen,
}

struct CircuitBreaker {
    state: CircuitState,
    failure_threshold: u32,
    reset_timeout: Duration,
    failure_count: u32,
    last_failure_time: Option<Instant>,
}

impl CircuitBreaker {
    fn new(failure_threshold: u32, reset_timeout: Duration) -> Self {
        Self {
            state: CircuitState::Closed,
            failure_threshold,
            reset_timeout,
            failure_count: 0,
            last_failure_time: None,
        }
    }

    fn record_success(&mut self) {
        match self.state {
            CircuitState::HalfOpen => {
                // On success in half-open state, we close the circuit
                self.state = CircuitState::Closed;
                self.failure_count = 0;
            }
            CircuitState::Closed => {
                // Reset failure count on success
                self.failure_count = 0;
            }
            CircuitState::Open => {
                // Should not happen - we don't execute in open state
            }
        }
    }

    fn record_failure(&mut self) {
        self.last_failure_time = Some(Instant::now());

        match self.state {
            CircuitState::Closed => {
                self.failure_count += 1;
                if self.failure_count >= self.failure_threshold {
                    self.state = CircuitState::Open;
                }
            }
            CircuitState::HalfOpen => {
                // On failure in half-open state, we reopen the circuit
                self.state = CircuitState::Open;
            }
            CircuitState::Open => {
                // Should not happen - we don't execute in open state
            }
        }
    }

    fn is_closed(&mut self) -> bool {
        match self.state {
            CircuitState::Closed => true,
            CircuitState::Open => {
                // Check if enough time has passed to try again
                if let Some(failure_time) = self.last_failure_time {
                    if failure_time.elapsed() >= self.reset_timeout {
                        // Transition to half-open
                        self.state = CircuitState::HalfOpen;
                        true
                    } else {
                        false
                    }
                } else {
                    // This shouldn't happen, but if it does, allow execution
                    true
                }
            }
            CircuitState::HalfOpen => true,
        }
    }

    async fn execute<F, T, E>(&mut self, operation: F) -> Result<T, E>
    where
        F: FnOnce() -> Result<T, E>,
        E: std::fmt::Debug,
    {
        if !self.is_closed() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                "Circuit is open",
            ).into());
        }

        match operation() {
            Ok(result) => {
                self.record_success();
                Ok(result)
            }
            Err(err) => {
                self.record_failure();
                Err(err)
            }
        }
    }

    async fn execute_async<F, Fut, T, E>(&mut self, operation: F) -> Result<T, E>
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<T, E>>,
        E: std::fmt::Debug,
    {
        if !self.is_closed() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                "Circuit is open",
            ).into());
        }

        match operation().await {
            Ok(result) => {
                self.record_success();
                Ok(result)
            }
            Err(err) => {
                self.record_failure();
                Err(err)
            }
        }
    }
}

// Example usage
async fn circuit_breaker_example() {
    let breaker = Arc::new(Mutex::new(CircuitBreaker::new(
        3, // Fail after 3 consecutive errors
        Duration::from_secs(5), // Try again after 5 seconds
    )));

    // Simulate some calls
    for i in 0..10 {
        let breaker_clone = Arc::clone(&breaker);

        let result = {
            let mut breaker = breaker_clone.lock().unwrap();
            breaker.execute_async(|| async {
                // Simulate an operation that sometimes fails
                if i % 4 == 0 || i % 4 == 1 {
                    println!("Call {} succeeded", i);
                    Ok(format!("Result {}", i))
                } else {
                    println!("Call {} failed", i);
                    Err(std::io::Error::new(std::io::ErrorKind::Other, "Simulated failure"))
                }
            }).await
        };

        match result {
            Ok(val) => println!("Got result: {}", val),
            Err(e) => println!("Got error: {:?}", e),
        }

        sleep(Duration::from_millis(500)).await;
    }
}
```

### Bulkheads

The bulkhead pattern isolates components to prevent failures from affecting the entire system:

```rust
use std::sync::Arc;
use tokio::sync::{Semaphore, SemaphorePermit};

struct Bulkhead {
    semaphore: Arc<Semaphore>,
}

impl Bulkhead {
    fn new(max_concurrent_calls: usize) -> Self {
        Self {
            semaphore: Arc::new(Semaphore::new(max_concurrent_calls)),
        }
    }

    async fn acquire(&self) -> Result<SemaphorePermit<'_>, tokio::sync::AcquireError> {
        self.semaphore.acquire().await
    }

    async fn execute<F, Fut, T>(&self, operation: F) -> Result<T, Box<dyn std::error::Error>>
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<T, Box<dyn std::error::Error>>>,
    {
        // Try to acquire a permit
        match self.semaphore.acquire().await {
            Ok(permit) => {
                // Execute the operation and release the permit when done
                let result = operation().await;
                drop(permit);
                result
            }
            Err(e) => {
                // Return an error if we can't acquire a permit
                Err(Box::new(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("Bulkhead is full: {:?}", e),
                )))
            }
        }
    }
}

// Example usage with different bulkheads for different services
async fn bulkhead_example() {
    let database_bulkhead = Arc::new(Bulkhead::new(5)); // Max 5 concurrent DB calls
    let api_bulkhead = Arc::new(Bulkhead::new(20));     // Max 20 concurrent API calls

    // Simulate a request that needs both database and API access
    async fn handle_request(
        db_bulkhead: Arc<Bulkhead>,
        api_bulkhead: Arc<Bulkhead>,
        request_id: u32,
    ) -> Result<String, Box<dyn std::error::Error>> {
        println!("Request {} started", request_id);

        // Access database with bulkhead protection
        let db_result = db_bulkhead.execute(|| async {
            println!("Request {} accessing database", request_id);
            // Simulate database work
            sleep(Duration::from_millis(100)).await;
            Ok::<_, Box<dyn std::error::Error>>("DB result")
        }).await?;

        // Access API with bulkhead protection
        let api_result = api_bulkhead.execute(|| async {
            println!("Request {} calling API", request_id);
            // Simulate API call
            sleep(Duration::from_millis(200)).await;
            Ok::<_, Box<dyn std::error::Error>>("API result")
        }).await?;

        println!("Request {} completed", request_id);
        Ok(format!("Combined result: {} and {}", db_result, api_result))
    }

    // Process multiple concurrent requests
    let mut handles = vec![];
    for i in 0..50 {
        let db_bulkhead = Arc::clone(&database_bulkhead);
        let api_bulkhead = Arc::clone(&api_bulkhead);

        handles.push(tokio::spawn(async move {
            match handle_request(db_bulkhead, api_bulkhead, i).await {
                Ok(result) => println!("Request {}: {}", i, result),
                Err(e) => println!("Request {} failed: {}", i, e),
            }
        }));
    }

    // Wait for all requests to complete
    for handle in handles {
        handle.await.unwrap();
    }
}
```

### Retries with Backoff

Implementing retry logic with exponential backoff can help recover from transient failures:

```rust
use std::future::Future;
use std::time::Duration;
use tokio::time::sleep;
use rand::Rng;

async fn retry_with_backoff<F, Fut, T, E>(
    operation: F,
    retries: u32,
    initial_backoff: Duration,
    max_backoff: Duration,
    jitter: bool,
) -> Result<T, E>
where
    F: Fn() -> Fut,
    Fut: Future<Output = Result<T, E>>,
    E: std::fmt::Debug,
{
    let mut backoff = initial_backoff;
    let mut attempts = 0;

    loop {
        match operation().await {
            Ok(result) => return Ok(result),
            Err(err) => {
                attempts += 1;

                if attempts > retries {
                    return Err(err);
                }

                println!("Operation failed, retrying in {:?} (attempt {}/{}): {:?}",
                         backoff, attempts, retries, err);

                // Add jitter to prevent thundering herd
                let sleep_duration = if jitter {
                    let mut rng = rand::thread_rng();
                    let jitter_factor = rng.gen_range(0.8..1.2);
                    Duration::from_millis((backoff.as_millis() as f64 * jitter_factor) as u64)
                } else {
                    backoff
                };

                sleep(sleep_duration).await;

                // Exponential backoff with cap
                backoff = std::cmp::min(backoff * 2, max_backoff);
            }
        }
    }
}

// Example usage
async fn retry_example() {
    let result = retry_with_backoff(
        || async {
            // Simulate an operation that fails a few times then succeeds
            static mut ATTEMPTS: u32 = 0;
            unsafe {
                ATTEMPTS += 1;
                if ATTEMPTS <= 3 {
                    println!("Attempt {} failed", ATTEMPTS);
                    Err("Transient error")
                } else {
                    println!("Attempt {} succeeded", ATTEMPTS);
                    Ok::<_, &str>("Success!")
                }
            }
        },
        5,                                // Max 5 retries
        Duration::from_millis(100),       // Start with 100ms backoff
        Duration::from_secs(5),           // Max 5s backoff
        true,                             // Use jitter
    ).await;

    println!("Final result: {:?}", result);
}
```

### Timeouts

Implementing timeouts prevents operations from hanging indefinitely:

```rust
use tokio::time::{timeout, Duration};

async fn with_timeout<F, T, E>(
    duration: Duration,
    operation: F,
) -> Result<T, Box<dyn std::error::Error>>
where
    F: Future<Output = Result<T, E>>,
    E: std::error::Error + 'static,
{
    match timeout(duration, operation).await {
        Ok(result) => result.map_err(|e| Box::new(e) as Box<dyn std::error::Error>),
        Err(_) => Err(Box::new(std::io::Error::new(
            std::io::ErrorKind::TimedOut,
            "Operation timed out",
        ))),
    }
}

// Example usage
async fn timeout_example() {
    // A function that completes quickly
    let fast_result = with_timeout(
        Duration::from_secs(1),
        async {
            sleep(Duration::from_millis(500)).await;
            Ok::<_, std::io::Error>("Fast operation completed")
        },
    ).await;

    println!("Fast operation result: {:?}", fast_result);

    // A function that takes too long
    let slow_result = with_timeout(
        Duration::from_secs(1),
        async {
            sleep(Duration::from_secs(2)).await;
            Ok::<_, std::io::Error>("Slow operation completed")
        },
    ).await;

    println!("Slow operation result: {:?}", slow_result);
}
```

### Health Checks and Self-Healing

Implementing health checks helps detect issues early:

```rust
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::time::sleep;

enum HealthStatus {
    Healthy,
    Degraded(String),
    Unhealthy(String),
}

struct HealthCheck {
    name: String,
    check_fn: Box<dyn Fn() -> HealthStatus + Send + Sync>,
    interval: Duration,
    last_check: Option<Instant>,
    last_status: HealthStatus,
}

impl HealthCheck {
    fn new<F>(name: &str, interval: Duration, check_fn: F) -> Self
    where
        F: Fn() -> HealthStatus + Send + Sync + 'static,
    {
        Self {
            name: name.to_string(),
            check_fn: Box::new(check_fn),
            interval,
            last_check: None,
            last_status: HealthStatus::Healthy,
        }
    }

    fn check(&mut self) -> &HealthStatus {
        let now = Instant::now();

        // Only check if interval has elapsed
        if self.last_check.is_none() || now.duration_since(self.last_check.unwrap()) >= self.interval {
            self.last_status = (self.check_fn)();
            self.last_check = Some(now);
        }

        &self.last_status
    }
}

struct HealthMonitor {
    checks: Vec<HealthCheck>,
    remediation_actions: Vec<Box<dyn Fn(String, &HealthStatus) + Send + Sync>>,
}

impl HealthMonitor {
    fn new() -> Self {
        Self {
            checks: Vec::new(),
            remediation_actions: Vec::new(),
        }
    }

    fn add_check(&mut self, check: HealthCheck) {
        self.checks.push(check);
    }

    fn add_remediation<F>(&mut self, action: F)
    where
        F: Fn(String, &HealthStatus) + Send + Sync + 'static,
    {
        self.remediation_actions.push(Box::new(action));
    }

    fn check_all(&mut self) -> bool {
        let mut all_healthy = true;

        for check in &mut self.checks {
            let status = check.check();

            match status {
                HealthStatus::Healthy => {
                    println!("Check {} is healthy", check.name);
                }
                HealthStatus::Degraded(msg) => {
                    println!("Check {} is degraded: {}", check.name, msg);
                    all_healthy = false;

                    // Run remediation actions
                    for action in &self.remediation_actions {
                        action(check.name.clone(), status);
                    }
                }
                HealthStatus::Unhealthy(msg) => {
                    println!("Check {} is unhealthy: {}", check.name, msg);
                    all_healthy = false;

                    // Run remediation actions
                    for action in &self.remediation_actions {
                        action(check.name.clone(), status);
                    }
                }
            }
        }

        all_healthy
    }

    async fn monitor(&mut self, interval: Duration) {
        loop {
            self.check_all();
            sleep(interval).await;
        }
    }
}

// Example usage
async fn health_monitor_example() {
    let mut monitor = HealthMonitor::new();

    // Add some health checks
    monitor.add_check(HealthCheck::new("database", Duration::from_secs(5), || {
        // Simulate a database check
        if rand::thread_rng().gen_bool(0.8) {
            HealthStatus::Healthy
        } else {
            HealthStatus::Unhealthy("Database connection failed".to_string())
        }
    }));

    monitor.add_check(HealthCheck::new("api", Duration::from_secs(10), || {
        // Simulate an API check
        if rand::thread_rng().gen_bool(0.9) {
            HealthStatus::Healthy
        } else {
            HealthStatus::Degraded("API response time degraded".to_string())
        }
    }));

    // Add a remediation action
    monitor.add_remediation(|check_name, status| {
        match status {
            HealthStatus::Degraded(_) => {
                println!("REMEDIATION: Taking corrective action for degraded check {}", check_name);
                // In a real system, this might restart a service, scale up resources, etc.
            }
            HealthStatus::Unhealthy(_) => {
                println!("REMEDIATION: Taking corrective action for unhealthy check {}", check_name);
                // In a real system, this might restart a service, fail over to backup, etc.
            }
            _ => {}
        }
    });

    // Start monitoring
    tokio::spawn(async move {
        monitor.monitor(Duration::from_secs(1)).await;
    });

    // Run for a while
    sleep(Duration::from_secs(30)).await;
}
```

By implementing these fault tolerance patterns, you can build distributed systems that are resilient to various types of failures. In the next section, we'll explore a complete distributed system example that combines many of the concepts we've covered.

## Project: Building a Distributed Key-Value Store

Let's build a simple distributed key-value store that incorporates many of the concepts we've discussed in this chapter.

### Project Requirements

Our distributed key-value store should have the following features:

1. Multiple storage nodes that can be added or removed dynamically
2. Data partitioning across nodes using consistent hashing
3. Replication for fault tolerance
4. Simple REST API for interacting with the system
5. Basic fault tolerance mechanisms

### Implementation

First, let's define the core data structures:

```rust
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use warp::Filter;
use serde::{Serialize, Deserialize};

// Basic key-value store
struct KVStore {
    data: HashMap<String, String>,
}

impl KVStore {
    fn new() -> Self {
        Self {
            data: HashMap::new(),
        }
    }

    fn get(&self, key: &str) -> Option<String> {
        self.data.get(key).cloned()
    }

    fn put(&mut self, key: &str, value: &str) {
        self.data.insert(key.to_string(), value.to_string());
    }

    fn delete(&mut self, key: &str) -> bool {
        self.data.remove(key).is_some()
    }
}

// Node information
#[derive(Clone, Debug, Serialize, Deserialize)]
struct NodeInfo {
    id: String,
    host: String,
    port: u16,
    status: NodeStatus,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
enum NodeStatus {
    Active,
    Inactive,
}

// Message types for inter-node communication
#[derive(Clone, Debug, Serialize, Deserialize)]
enum Message {
    Put { key: String, value: String },
    Get { key: String },
    Delete { key: String },
    Replicate { key: String, value: String },
    JoinCluster { node: NodeInfo },
    LeaveCluster { node_id: String },
    Heartbeat { node_id: String },
    Response { success: bool, data: Option<String> },
}

// Storage node
struct StorageNode {
    info: NodeInfo,
    store: Arc<Mutex<KVStore>>,
    cluster: Arc<Mutex<Vec<NodeInfo>>>,
    partitioner: Arc<Mutex<ConsistentHashRing>>,
    replication_factor: usize,
}

// Consistent hash ring for data partitioning
struct ConsistentHashRing {
    nodes: Vec<NodeInfo>,
    virtual_nodes: usize,
}

impl ConsistentHashRing {
    fn new(virtual_nodes: usize) -> Self {
        Self {
            nodes: Vec::new(),
            virtual_nodes,
        }
    }

    fn add_node(&mut self, node: NodeInfo) {
        if !self.nodes.iter().any(|n| n.id == node.id) {
            self.nodes.push(node);
        }
    }

    fn remove_node(&mut self, node_id: &str) {
        self.nodes.retain(|n| n.id != node_id);
    }

    fn get_node_for_key(&self, key: &str) -> Option<NodeInfo> {
        if self.nodes.is_empty() {
            return None;
        }

        // Simple hash-based partitioning (in a real system, use consistent hashing)
        let hash = self.hash(key);
        let index = hash % self.nodes.len();
        Some(self.nodes[index].clone())
    }

    fn get_replicas(&self, primary_node_id: &str, count: usize) -> Vec<NodeInfo> {
        let mut replicas = Vec::new();
        let active_nodes: Vec<_> = self.nodes.iter()
            .filter(|n| n.id != primary_node_id && n.status == NodeStatus::Active)
            .collect();

        if active_nodes.is_empty() {
            return replicas;
        }

        let mut primary_index = 0;
        for (i, node) in self.nodes.iter().enumerate() {
            if node.id == primary_node_id {
                primary_index = i;
                break;
            }
        }

        // Take 'count' nodes after the primary in the ring
        let mut i = (primary_index + 1) % self.nodes.len();
        while replicas.len() < count && replicas.len() < active_nodes.len() {
            if self.nodes[i].id != primary_node_id && self.nodes[i].status == NodeStatus::Active {
                replicas.push(self.nodes[i].clone());
            }
            i = (i + 1) % self.nodes.len();
            if i == primary_index {
                break; // We've gone all the way around
            }
        }

        replicas
    }

    fn hash(&self, key: &str) -> usize {
        // Simple hash function (use a better one in production)
        let mut hash = 0;
        for byte in key.bytes() {
            hash = (hash * 31 + byte as usize) % 997; // A prime number
        }
        hash
    }
}

impl StorageNode {
    fn new(id: &str, host: &str, port: u16, replication_factor: usize) -> Self {
        let node_info = NodeInfo {
            id: id.to_string(),
            host: host.to_string(),
            port,
            status: NodeStatus::Active,
        };

        Self {
            info: node_info.clone(),
            store: Arc::new(Mutex::new(KVStore::new())),
            cluster: Arc::new(Mutex::new(vec![node_info])),
            partitioner: Arc::new(Mutex::new(ConsistentHashRing::new(10))),
            replication_factor,
        }
    }

    async fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        // Initialize the node
        {
            let mut partitioner = self.partitioner.lock().unwrap();
            partitioner.add_node(self.info.clone());
        }

        // Start the API server
        let store = Arc::clone(&self.store);
        let cluster = Arc::clone(&self.cluster);
        let partitioner = Arc::clone(&self.partitioner);
        let node_info = self.info.clone();
        let replication_factor = self.replication_factor;

        // Define the API routes
        let get_route = warp::path!("kv" / String)
            .and(warp::get())
            .and(with_store(store.clone()))
            .and(with_partitioner(partitioner.clone()))
            .and_then(move |key, store, partitioner| {
                handle_get(key, store, partitioner)
            });

        let put_route = warp::path!("kv" / String)
            .and(warp::put())
            .and(warp::body::json())
            .and(with_store(store.clone()))
            .and(with_partitioner(partitioner.clone()))
            .and(with_cluster(cluster.clone()))
            .and(with_node_info(node_info.clone()))
            .and(with_replication_factor(replication_factor))
            .and_then(move |key, value: serde_json::Value, store, partitioner, cluster, node_info, replication_factor| {
                handle_put(key, value.to_string(), store, partitioner, cluster, node_info, replication_factor)
            });

        let delete_route = warp::path!("kv" / String)
            .and(warp::delete())
            .and(with_store(store.clone()))
            .and(with_partitioner(partitioner.clone()))
            .and(with_cluster(cluster.clone()))
            .and(with_node_info(node_info.clone()))
            .and(with_replication_factor(replication_factor))
            .and_then(move |key, store, partitioner, cluster, node_info, replication_factor| {
                handle_delete(key, store, partitioner, cluster, node_info, replication_factor)
            });

        let routes = get_route.or(put_route).or(delete_route);

        // Start the server
        println!("Starting node {} on {}:{}", self.info.id, self.info.host, self.info.port);
        warp::serve(routes)
            .run(([127, 0, 0, 1], self.info.port))
            .await;

        Ok(())
    }
}

// Helper functions for dependency injection in routes
fn with_store(store: Arc<Mutex<KVStore>>) -> impl Filter<Extract = (Arc<Mutex<KVStore>>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || store.clone())
}

fn with_partitioner(partitioner: Arc<Mutex<ConsistentHashRing>>) -> impl Filter<Extract = (Arc<Mutex<ConsistentHashRing>>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || partitioner.clone())
}

fn with_cluster(cluster: Arc<Mutex<Vec<NodeInfo>>>) -> impl Filter<Extract = (Arc<Mutex<Vec<NodeInfo>>>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || cluster.clone())
}

fn with_node_info(node_info: NodeInfo) -> impl Filter<Extract = (NodeInfo,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || node_info.clone())
}

fn with_replication_factor(replication_factor: usize) -> impl Filter<Extract = (usize,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || replication_factor)
}

// API handler functions
async fn handle_get(
    key: String,
    store: Arc<Mutex<KVStore>>,
    partitioner: Arc<Mutex<ConsistentHashRing>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    // Check if this node is responsible for the key
    let responsible_node = {
        let partitioner = partitioner.lock().unwrap();
        partitioner.get_node_for_key(&key)
    };

    match responsible_node {
        Some(node) => {
            let store = store.lock().unwrap();
            match store.get(&key) {
                Some(value) => Ok(warp::reply::json(&serde_json::json!({ "value": value }))),
                None => Ok(warp::reply::json(&serde_json::json!({ "error": "Key not found" }))),
            }
        }
        None => Ok(warp::reply::json(&serde_json::json!({ "error": "No node available for key" }))),
    }
}

async fn handle_put(
    key: String,
    value: String,
    store: Arc<Mutex<KVStore>>,
    partitioner: Arc<Mutex<ConsistentHashRing>>,
    cluster: Arc<Mutex<Vec<NodeInfo>>>,
    node_info: NodeInfo,
    replication_factor: usize,
) -> Result<impl warp::Reply, warp::Rejection> {
    // Check if this node is responsible for the key
    let (responsible_node, replicas) = {
        let partitioner = partitioner.lock().unwrap();
        let node = partitioner.get_node_for_key(&key);
        let replicas = if let Some(ref node) = node {
            partitioner.get_replicas(&node.id, replication_factor)
        } else {
            Vec::new()
        };
        (node, replicas)
    };

    match responsible_node {
        Some(node) => {
            // Store locally
            {
                let mut store = store.lock().unwrap();
                store.put(&key, &value);
            }

            // Replicate to other nodes
            for replica in replicas {
                // In a real system, we'd send the replication message to the replica
                println!("Replicating key {} to node {}", key, replica.id);
            }

            Ok(warp::reply::json(&serde_json::json!({ "success": true })))
        }
        None => Ok(warp::reply::json(&serde_json::json!({ "error": "No node available for key" }))),
    }
}

async fn handle_delete(
    key: String,
    store: Arc<Mutex<KVStore>>,
    partitioner: Arc<Mutex<ConsistentHashRing>>,
    cluster: Arc<Mutex<Vec<NodeInfo>>>,
    node_info: NodeInfo,
    replication_factor: usize,
) -> Result<impl warp::Reply, warp::Rejection> {
    // Check if this node is responsible for the key
    let (responsible_node, replicas) = {
        let partitioner = partitioner.lock().unwrap();
        let node = partitioner.get_node_for_key(&key);
        let replicas = if let Some(ref node) = node {
            partitioner.get_replicas(&node.id, replication_factor)
        } else {
            Vec::new()
        };
        (node, replicas)
    };

    match responsible_node {
        Some(node) => {
            // Delete locally
            let success = {
                let mut store = store.lock().unwrap();
                store.delete(&key)
            };

            // Propagate delete to replicas
            for replica in replicas {
                // In a real system, we'd send the delete message to the replica
                println!("Propagating delete of key {} to node {}", key, replica.id);
            }

            Ok(warp::reply::json(&serde_json::json!({ "success": success })))
        }
        None => Ok(warp::reply::json(&serde_json::json!({ "error": "No node available for key" }))),
    }
}

// Start the distributed key-value store
async fn run_distributed_kv_store() {
    // Create a cluster of nodes
    let node1 = StorageNode::new("node1", "127.0.0.1", 3001, 2);
    let node2 = StorageNode::new("node2", "127.0.0.1", 3002, 2);
    let node3 = StorageNode::new("node3", "127.0.0.1", 3003, 2);

    // Start each node in its own task
    tokio::spawn(async move {
        node1.start().await.unwrap();
    });

    tokio::spawn(async move {
        node2.start().await.unwrap();
    });

    tokio::spawn(async move {
        node3.start().await.unwrap();
    });

    // In a real application, we would:
    // 1. Have a discovery mechanism for nodes to find each other
    // 2. Implement proper inter-node communication
    // 3. Add mechanisms for data migration when nodes join/leave
    // 4. Implement proper consistent hashing
    // 5. Add monitoring and self-healing capabilities
}
```

### Using the Distributed Key-Value Store

Once running, you can interact with the system using HTTP requests:

```bash
# Store a value
curl -X PUT http://localhost:3001/kv/mykey -H "Content-Type: application/json" -d '"myvalue"'

# Retrieve a value
curl -X GET http://localhost:3001/kv/mykey

# Delete a value
curl -X DELETE http://localhost:3001/kv/mykey
```

The system will handle routing the request to the appropriate node based on the key.

### Extending the Project

This is a simplified example. In a production system, you would want to add:

1. **Better Consistent Hashing**: Implement a more robust consistent hashing algorithm with virtual nodes
2. **Data Rebalancing**: When nodes join or leave, redistribute data
3. **Stronger Consistency**: Add mechanisms like quorum reads/writes or leader election
4. **Failure Detection**: Implement heartbeats and health checks
5. **Anti-Entropy Mechanisms**: Add periodic data synchronization to handle inconsistencies
6. **Metrics and Monitoring**: Track system performance and health
7. **Authentication and Authorization**: Secure the API

## Summary

In this chapter, we've explored the fundamental concepts and patterns for building distributed systems with Rust. We've covered:

1. **Distributed Systems Fundamentals**: Understanding the key challenges like network unreliability, partial failures, and the CAP theorem.

2. **Communication Patterns**: Implementing request-response, publish-subscribe, message queues, RPC, and streaming communication.

3. **Service Discovery**: Building mechanisms for nodes to find each other, including client-side and server-side discovery.

4. **Distributed Consensus**: Implementing algorithms like Paxos and Raft to achieve agreement in a distributed environment.

5. **Distributed Data Patterns**: Managing data across multiple nodes with partitioning, replication, caching, and conflict resolution.

6. **Fault Tolerance**: Building resilient systems with circuit breakers, bulkheads, retries, timeouts, and health checks.

7. **A Complete Example**: Putting it all together with a distributed key-value store.

Rust's performance, safety, and concurrency features make it an excellent choice for distributed systems. While building production-grade distributed systems requires careful consideration of many factors, the concepts and patterns we've explored provide a solid foundation.

## Exercises

1. Enhance the distributed key-value store example with a proper consistent hashing implementation using virtual nodes.

2. Implement a leader election algorithm using the Raft consensus protocol.

3. Add a gossip protocol to the key-value store for cluster membership management.

4. Implement a distributed counter with eventual consistency.

5. Build a simple distributed task queue with work stealing.

6. Create a distributed rate limiter that coordinates across multiple nodes.

7. Implement a distributed lock service.

8. Add proper data rebalancing when nodes join or leave the cluster.

9. Create a distributed cache with time-to-live (TTL) for entries.

10. Implement a conflict-free replicated data type (CRDT) to handle concurrent updates.
