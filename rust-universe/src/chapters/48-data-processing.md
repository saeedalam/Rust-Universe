# Chapter 48: Real-Time Data Processing System

## Introduction

In today's data-driven world, the ability to process and analyze information in real-time has become a critical competitive advantage across industries. From financial services monitoring market changes to e-commerce platforms tracking user behavior, or IoT networks processing sensor data—real-time data processing enables organizations to make faster, more informed decisions.

In this chapter, we'll build a complete real-time data processing system in Rust, leveraging the language's performance, safety, and concurrency features. Our system, which we'll call "RustStream," will demonstrate how to collect, process, analyze, and visualize streaming data with minimal latency.

By the end of this chapter, you'll understand:

1. The architecture of modern streaming data systems
2. How to implement event sourcing and stream processing patterns
3. Techniques for building robust, fault-tolerant data pipelines
4. Methods for real-time analytics and alerting
5. Approaches to visualizing live data
6. Strategies for deploying and scaling streaming applications

Real-time data processing presents unique challenges compared to batch processing. Data arrives continuously, often at unpredictable rates, and must be processed with strict latency requirements. Our implementation will address these challenges while maintaining the reliability and correctness that Rust encourages.

### Prerequisites

This chapter builds upon concepts covered throughout this book, particularly:

- Asynchronous programming (Chapter 25)
- Concurrency fundamentals (Chapter 24)
- Error handling patterns (Chapter 21)
- Network programming (Chapter 32)
- Performance optimization (Chapter 36)

While not strictly necessary, familiarity with distributed systems concepts (Chapter 41) will be helpful.

### System Overview

Our RustStream system will comprise several key components:

1. **Event Collection**: Ingesting data from various sources through multiple protocols
2. **Stream Processing Engine**: Transforming, filtering, and enriching data in real-time
3. **State Management**: Maintaining queryable views of processed data
4. **Analytics Engine**: Performing calculations and detecting patterns on streaming data
5. **Alerting System**: Monitoring streams for conditions and notifying users
6. **Dashboard**: Visualizing real-time metrics and insights
7. **Cluster Management**: Coordinating distributed nodes for scalability and fault tolerance

Let's begin by exploring the fundamental concepts of event sourcing and stream processing, which form the theoretical foundation of our system.

## Fundamentals of Real-Time Data Processing

Before diving into implementation, let's establish a solid understanding of the key concepts and architectural patterns in real-time data processing.

### Event Sourcing

Event sourcing is a pattern where changes to application state are stored as a sequence of events. Instead of just storing the current state, we record each change as an immutable fact. This approach offers several advantages:

1. **Complete Audit Trail**: Every change is recorded, providing a comprehensive history
2. **Temporal Queries**: The ability to determine the state at any point in time
3. **Event Replay**: Systems can be rebuilt by replaying events from any point
4. **Decoupled Systems**: Events can be consumed by multiple systems independently

In event sourcing, events are:

- **Immutable**: Once recorded, events never change
- **Chronological**: Events have a clear temporal ordering
- **Self-contained**: Events contain all necessary information about what happened

### Stream Processing

Stream processing is the practice of performing computations on data continuously as it arrives, rather than in batches. Key concepts include:

1. **Streams**: Unbounded sequences of events ordered by time
2. **Operators**: Functions that transform one stream into another
3. **Windowing**: Grouping events within time boundaries for aggregation
4. **Stateful Processing**: Maintaining and updating state based on streaming events
5. **Backpressure**: Mechanisms to handle scenarios where data arrives faster than it can be processed

### Data Flow Architecture

Our system will follow a data flow architecture, where:

1. **Sources** produce events (e.g., sensors, user actions, system logs)
2. **Processors** transform, filter, or enrich those events
3. **Sinks** consume processed events (e.g., databases, notification systems, dashboards)

This architecture enables a composable, modular system where components can be developed and scaled independently.

### Consistency and Reliability Models

Real-time systems must make trade-offs between:

1. **Latency**: How quickly events are processed
2. **Throughput**: How many events can be processed per time unit
3. **Consistency**: Guarantees about event ordering and processing
4. **Durability**: Persistence of events against failures

Our implementation will support multiple processing semantics:

- **At-most-once**: Events might be lost but never processed twice
- **At-least-once**: Events are never lost but might be processed multiple times
- **Exactly-once**: Events are processed once and only once (the most challenging to implement)

With these fundamental concepts in mind, let's begin building our RustStream system, starting with the core event data model and processing engine.

## Event Model and Core Components

Let's start by designing the core data model for our stream processing system. In Rust, we'll define flexible, efficient structures that can represent a wide variety of event types while maintaining strong typing where possible.

### Event Data Model

First, let's define our event structure:

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// Represents a single event in our system
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Event {
    /// Unique identifier for the event
    pub id: Uuid,
    /// Type of event (domain-specific)
    pub event_type: String,
    /// Source that produced the event
    pub source: String,
    /// When the event occurred
    pub timestamp: DateTime<Utc>,
    /// Event payload
    pub data: EventData,
    /// Additional metadata
    pub metadata: HashMap<String, String>,
}

/// Flexible data payload for events
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum EventData {
    /// Null value
    Null,
    /// Boolean value
    Bool(bool),
    /// Numeric value
    Number(f64),
    /// String value
    String(String),
    /// Array of values
    Array(Vec<EventData>),
    /// Object with string keys
    Object(HashMap<String, EventData>),
}

impl Event {
    /// Creates a new event
    pub fn new(event_type: &str, source: &str, data: EventData) -> Self {
        Self {
            id: Uuid::new_v4(),
            event_type: event_type.to_string(),
            source: source.to_string(),
            timestamp: Utc::now(),
            data,
            metadata: HashMap::new(),
        }
    }

    /// Adds metadata to the event
    pub fn with_metadata(mut self, key: &str, value: &str) -> Self {
        self.metadata.insert(key.to_string(), value.to_string());
        self
    }
}
```

This flexible event model allows us to represent diverse data types while maintaining serialization compatibility. Next, let's define the interfaces for event sources and sinks:

```rust
use async_trait::async_trait;
use thiserror::Error;

/// Errors that can occur in the event processing system
#[derive(Debug, Error)]
pub enum EventError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(String),

    #[error("Connection error: {0}")]
    Connection(String),

    #[error("Processing error: {0}")]
    Processing(String),

    #[error("Timeout error")]
    Timeout,
}

/// Result type for event operations
pub type EventResult<T> = Result<T, EventError>;

/// Source of events in the system
#[async_trait]
pub trait EventSource: Send + Sync {
    /// Returns the name of this event source
    fn name(&self) -> &str;

    /// Asynchronously reads the next event
    async fn next(&mut self) -> EventResult<Option<Event>>;

    /// Commits progress (if supported by the source)
    async fn commit(&mut self) -> EventResult<()>;
}

/// Sink for events in the system
#[async_trait]
pub trait EventSink: Send + Sync {
    /// Returns the name of this event sink
    fn name(&self) -> &str;

    /// Asynchronously writes an event
    async fn write(&mut self, event: &Event) -> EventResult<()>;

    /// Flushes any buffered events
    async fn flush(&mut self) -> EventResult<()>;
}
```

### Stream Processing Engine

Now let's build the core stream processing engine that will orchestrate data flow through our system:

```rust
use futures::stream::{self, Stream, StreamExt};
use std::pin::Pin;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{mpsc, Mutex};
use tokio::time;

/// Type alias for a boxed stream of events
pub type EventStream = Pin<Box<dyn Stream<Item = EventResult<Event>> + Send>>;

/// Represents an operation on an event stream
#[async_trait]
pub trait Operator: Send + Sync {
    /// Returns the name of this operator
    fn name(&self) -> &str;

    /// Applies this operator to an input stream, producing an output stream
    async fn apply(&self, input: EventStream) -> EventStream;
}

/// The core stream processing engine
pub struct StreamEngine {
    /// Name of this engine instance
    name: String,
    /// Registered event sources
    sources: Vec<Arc<Mutex<dyn EventSource>>>,
    /// Processing operators
    operators: Vec<Arc<dyn Operator>>,
    /// Event sinks
    sinks: Vec<Arc<Mutex<dyn EventSink>>>,
}

impl StreamEngine {
    /// Creates a new stream engine
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
            sources: Vec::new(),
            operators: Vec::new(),
            sinks: Vec::new(),
        }
    }

    /// Adds an event source to the engine
    pub fn add_source<S>(&mut self, source: S) -> &mut Self
    where
        S: EventSource + 'static,
    {
        self.sources.push(Arc::new(Mutex::new(source)));
        self
    }

    /// Adds an operator to the processing pipeline
    pub fn add_operator<O>(&mut self, operator: O) -> &mut Self
    where
        O: Operator + 'static,
    {
        self.operators.push(Arc::new(operator));
        self
    }

    /// Adds an event sink to the engine
    pub fn add_sink<S>(&mut self, sink: S) -> &mut Self
    where
        S: EventSink + 'static,
    {
        self.sinks.push(Arc::new(Mutex::new(sink)));
        self
    }

    /// Runs the stream processing pipeline
    pub async fn run(&self) -> EventResult<()> {
        // Create input streams from all sources
        let mut source_streams = Vec::new();

        for source in &self.sources {
            let source_clone = source.clone();

            // Create a stream from this source
            let stream = stream::unfold(source_clone, |source_ref| async move {
                let mut source = source_ref.lock().await;
                match source.next().await {
                    Ok(Some(event)) => {
                        // Successfully got an event
                        Some((Ok(event), source_ref))
                    }
                    Ok(None) => {
                        // Source is exhausted
                        None
                    }
                    Err(e) => {
                        // Error occurred
                        Some((Err(e), source_ref))
                    }
                }
            });

            source_streams.push(Box::pin(stream) as EventStream);
        }

        // Merge all source streams
        let mut merged_stream: EventStream = if source_streams.is_empty() {
            // Empty stream if no sources
            Box::pin(stream::empty())
        } else if source_streams.len() == 1 {
            // Just use the single stream
            source_streams.pop().unwrap()
        } else {
            // Merge multiple streams
            Box::pin(stream::select_all(source_streams))
        };

        // Apply all operators in sequence
        for operator in &self.operators {
            merged_stream = operator.apply(merged_stream).await;
        }

        // Create channels for each sink
        let (tx, mut rx) = mpsc::channel(1000); // Buffer size of 1000 events

        // Task to process events and send to sinks
        let sinks = self.sinks.clone();
        tokio::spawn(async move {
            while let Some(result) = rx.recv().await {
                match result {
                    Ok(event) => {
                        // Send to all sinks
                        for sink in &sinks {
                            let mut sink = sink.lock().await;
                            if let Err(e) = sink.write(&event).await {
                                eprintln!("Error writing to sink {}: {}", sink.name(), e);
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Error in stream processing: {}", e);
                    }
                }
            }

            // Flush all sinks when the channel closes
            for sink in &sinks {
                let mut sink = sink.lock().await;
                if let Err(e) = sink.flush().await {
                    eprintln!("Error flushing sink {}: {}", sink.name(), e);
                }
            }
        });

        // Process the stream
        tokio::spawn(async move {
            merged_stream
                .for_each(|result| async {
                    if tx.send(result).await.is_err() {
                        // Channel closed, stop processing
                        return;
                    }
                })
                .await;
        });

        // Keep the engine running
        loop {
            time::sleep(Duration::from_secs(1)).await;
            // In a real implementation, we would have proper shutdown handling
        }
    }
}
```

### Common Stream Operators

Let's implement some common stream operators that form the building blocks of our processing pipelines:

```rust
/// Filters events based on a predicate
pub struct FilterOperator<F> {
    name: String,
    predicate: F,
}

impl<F> FilterOperator<F>
where
    F: Fn(&Event) -> bool + Send + Sync + 'static,
{
    pub fn new(name: &str, predicate: F) -> Self {
        Self {
            name: name.to_string(),
            predicate,
        }
    }
}

#[async_trait]
impl<F> Operator for FilterOperator<F>
where
    F: Fn(&Event) -> bool + Send + Sync + 'static,
{
    fn name(&self) -> &str {
        &self.name
    }

    async fn apply(&self, input: EventStream) -> EventStream {
        let predicate = self.predicate.clone();
        Box::pin(input.filter(move |result| {
            let keep = match result {
                Ok(event) => predicate(event),
                Err(_) => true, // Pass through errors
            };
            futures::future::ready(keep)
        }))
    }
}

/// Maps events using a transformation function
pub struct MapOperator<F> {
    name: String,
    mapper: F,
}

impl<F> MapOperator<F>
where
    F: Fn(Event) -> Event + Send + Sync + 'static,
{
    pub fn new(name: &str, mapper: F) -> Self {
        Self {
            name: name.to_string(),
            mapper,
        }
    }
}

#[async_trait]
impl<F> Operator for MapOperator<F>
where
    F: Fn(Event) -> Event + Send + Sync + 'static,
{
    fn name(&self) -> &str {
        &self.name
    }

    async fn apply(&self, input: EventStream) -> EventStream {
        let mapper = self.mapper.clone();
        Box::pin(input.map(move |result| match result {
            Ok(event) => Ok(mapper(event)),
            Err(e) => Err(e),
        }))
    }
}

/// Windowing operator that groups events by time
pub struct WindowOperator {
    name: String,
    window_duration: Duration,
}

impl WindowOperator {
    pub fn new(name: &str, window_duration: Duration) -> Self {
        Self {
            name: name.to_string(),
            window_duration,
        }
    }
}

#[async_trait]
impl Operator for WindowOperator {
    fn name(&self) -> &str {
        &self.name
    }

    async fn apply(&self, input: EventStream) -> EventStream {
        let duration = self.window_duration;

        // Create a channel for windowed events
        let (tx, rx) = mpsc::channel(1000);

        // Spawn a task to handle windowing
        tokio::spawn(async move {
            let mut window = Vec::new();
            let mut window_end = None;

            input
                .for_each(|result| async {
                    match result {
                        Ok(event) => {
                            // Initialize window end if this is the first event
                            if window_end.is_none() {
                                window_end = Some(event.timestamp + chrono::Duration::from_std(duration).unwrap());
                            }

                            // Check if this event belongs to the current window
                            if let Some(end) = window_end {
                                if event.timestamp < end {
                                    // Event belongs to current window
                                    window.push(event);
                                } else {
                                    // Close current window and emit events
                                    let events_to_emit = std::mem::take(&mut window);

                                    // Create a window event containing all events
                                    if !events_to_emit.is_empty() {
                                        let window_event = Event::new(
                                            "window",
                                            "stream_engine",
                                            EventData::Array(
                                                events_to_emit
                                                    .into_iter()
                                                    .map(|e| EventData::Object({
                                                        let mut map = HashMap::new();
                                                        map.insert("event".to_string(), EventData::Object({
                                                            let mut inner_map = HashMap::new();
                                                            inner_map.insert("id".to_string(), EventData::String(e.id.to_string()));
                                                            inner_map.insert("type".to_string(), EventData::String(e.event_type));
                                                            inner_map.insert("source".to_string(), EventData::String(e.source));
                                                            inner_map.insert("timestamp".to_string(), EventData::String(e.timestamp.to_rfc3339()));
                                                            inner_map.insert("data".to_string(), e.data);
                                                            inner_map
                                                        }));
                                                        map
                                                    }))
                                                    .collect(),
                                            ),
                                        );

                                        if tx.send(Ok(window_event)).await.is_err() {
                                            return;
                                        }
                                    }

                                    // Start a new window
                                    window.push(event);
                                    window_end = Some(event.timestamp + chrono::Duration::from_std(duration).unwrap());
                                }
                            }
                        }
                        Err(e) => {
                            // Pass through errors
                            if tx.send(Err(e)).await.is_err() {
                                return;
                            }
                        }
                    }
                })
                .await;

            // Emit any remaining events in the window
            if !window.is_empty() {
                let window_event = Event::new(
                    "window",
                    "stream_engine",
                    EventData::Array(
                        window
                            .into_iter()
                            .map(|e| EventData::Object({
                                let mut map = HashMap::new();
                                map.insert("event".to_string(), EventData::Object({
                                    let mut inner_map = HashMap::new();
                                    inner_map.insert("id".to_string(), EventData::String(e.id.to_string()));
                                    inner_map.insert("type".to_string(), EventData::String(e.event_type));
                                    inner_map.insert("source".to_string(), EventData::String(e.source));
                                    inner_map.insert("timestamp".to_string(), EventData::String(e.timestamp.to_rfc3339()));
                                    inner_map.insert("data".to_string(), e.data);
                                    inner_map
                                }));
                                map
                            }))
                            .collect(),
                    ),
                );

                let _ = tx.send(Ok(window_event)).await;
            }
        });

        // Convert receiver to a stream
        Box::pin(tokio_stream::wrappers::ReceiverStream::new(rx))
    }
}
```

With these core components in place, we have the foundation of our stream processing system. Let's now implement some concrete event sources and sinks that will allow our system to connect to the outside world.

## Event Sources and Sinks

Now that we have our core stream processing engine, let's implement concrete source and sink adapters to connect our system to the outside world.

### File-based Sources and Sinks

Let's start with file-based implementations that are useful for testing and development:

```rust
use std::fs::{File, OpenOptions};
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::path::Path;

/// A source that reads events from a file
pub struct FileSource {
    name: String,
    reader: BufReader<File>,
    path: String,
}

impl FileSource {
    /// Creates a new file source
    pub fn new(name: &str, path: impl AsRef<Path>) -> EventResult<Self> {
        let path_str = path.as_ref().to_string_lossy().to_string();
        let file = File::open(path.as_ref())?;
        let reader = BufReader::new(file);

        Ok(Self {
            name: name.to_string(),
            reader,
            path: path_str,
        })
    }
}

#[async_trait]
impl EventSource for FileSource {
    fn name(&self) -> &str {
        &self.name
    }

    async fn next(&mut self) -> EventResult<Option<Event>> {
        // Use tokio::task::spawn_blocking for file I/O
        let mut line = String::new();

        match tokio::task::spawn_blocking(move || {
            let mut temp_reader = &self.reader;
            let bytes_read = temp_reader.read_line(&mut line)?;

            if bytes_read == 0 {
                // End of file
                Ok(None)
            } else {
                // Remove trailing newline
                if line.ends_with('\n') {
                    line.pop();
                    if line.ends_with('\r') {
                        line.pop();
                    }
                }

                // Parse JSON
                let event: Event = serde_json::from_str(&line)
                    .map_err(|e| EventError::Serialization(e.to_string()))?;

                Ok(Some(event))
            }
        }).await {
            Ok(result) => result,
            Err(e) => Err(EventError::Processing(e.to_string())),
        }
    }

    async fn commit(&mut self) -> EventResult<()> {
        // File source doesn't support commit
        Ok(())
    }
}

/// A sink that writes events to a file
pub struct FileSink {
    name: String,
    writer: BufWriter<File>,
    path: String,
}

impl FileSink {
    /// Creates a new file sink
    pub fn new(name: &str, path: impl AsRef<Path>, append: bool) -> EventResult<Self> {
        let path_str = path.as_ref().to_string_lossy().to_string();

        let file = OpenOptions::new()
            .write(true)
            .create(true)
            .append(append)
            .truncate(!append)
            .open(path.as_ref())?;

        let writer = BufWriter::new(file);

        Ok(Self {
            name: name.to_string(),
            writer,
            path: path_str,
        })
    }
}

#[async_trait]
impl EventSink for FileSink {
    fn name(&self) -> &str {
        &self.name
    }

    async fn write(&mut self, event: &Event) -> EventResult<()> {
        // Serialize event to JSON
        let json = serde_json::to_string(event)
            .map_err(|e| EventError::Serialization(e.to_string()))?;

        // Use tokio::task::spawn_blocking for file I/O
        let mut writer = &mut self.writer;
        let result = tokio::task::spawn_blocking(move || {
            writeln!(writer, "{}", json)?;
            Ok(())
        }).await;

        match result {
            Ok(inner) => inner,
            Err(e) => Err(EventError::Processing(e.to_string())),
        }
    }

    async fn flush(&mut self) -> EventResult<()> {
        let mut writer = &mut self.writer;
        let result = tokio::task::spawn_blocking(move || {
            writer.flush()?;
            Ok(())
        }).await;

        match result {
            Ok(inner) => inner,
            Err(e) => Err(EventError::Processing(e.to_string())),
        }
    }
}
```

### Network Sources and Sinks

Let's implement TCP-based sources and sinks for network communication:

```rust
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader as TokioBufReader};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use std::net::SocketAddr;

/// A source that accepts events over TCP
pub struct TcpSource {
    name: String,
    rx: mpsc::Receiver<EventResult<Event>>,
    addr: SocketAddr,
}

impl TcpSource {
    /// Creates a new TCP source
    pub async fn new(name: &str, addr: impl AsRef<str>) -> EventResult<Self> {
        let socket_addr: SocketAddr = addr
            .as_ref()
            .parse()
            .map_err(|e| EventError::Connection(format!("Invalid address: {}", e)))?;

        let listener = TcpListener::bind(socket_addr)
            .await
            .map_err(|e| EventError::Connection(format!("Failed to bind: {}", e)))?;

        println!("TCP source listening on {}", socket_addr);

        // Channel for events
        let (tx, rx) = mpsc::channel(1000);

        // Spawn a task to accept connections
        tokio::spawn(async move {
            loop {
                match listener.accept().await {
                    Ok((socket, peer_addr)) => {
                        println!("New connection from {}", peer_addr);
                        let tx = tx.clone();

                        // Handle this connection
                        tokio::spawn(async move {
                            Self::handle_connection(socket, tx).await;
                        });
                    }
                    Err(e) => {
                        eprintln!("Error accepting connection: {}", e);
                    }
                }
            }
        });

        Ok(Self {
            name: name.to_string(),
            rx,
            addr: socket_addr,
        })
    }

    /// Handles a single client connection
    async fn handle_connection(socket: TcpStream, tx: mpsc::Sender<EventResult<Event>>) {
        let mut reader = TokioBufReader::new(socket);
        let mut line = String::new();

        loop {
            line.clear();

            match reader.read_line(&mut line).await {
                Ok(0) => {
                    // Connection closed
                    break;
                }
                Ok(_) => {
                    // Parse JSON
                    match serde_json::from_str::<Event>(&line) {
                        Ok(event) => {
                            if tx.send(Ok(event)).await.is_err() {
                                // Channel closed
                                break;
                            }
                        }
                        Err(e) => {
                            // Report parsing error
                            let err = EventError::Serialization(e.to_string());
                            if tx.send(Err(err)).await.is_err() {
                                // Channel closed
                                break;
                            }
                        }
                    }
                }
                Err(e) => {
                    // I/O error
                    let err = EventError::Io(e);
                    let _ = tx.send(Err(err)).await;
                    break;
                }
            }
        }
    }
}

#[async_trait]
impl EventSource for TcpSource {
    fn name(&self) -> &str {
        &self.name
    }

    async fn next(&mut self) -> EventResult<Option<Event>> {
        match self.rx.recv().await {
            Some(result) => result.map(Some),
            None => Ok(None), // Channel closed
        }
    }

    async fn commit(&mut self) -> EventResult<()> {
        // TCP source doesn't support commit
        Ok(())
    }
}

/// A sink that sends events over TCP
pub struct TcpSink {
    name: String,
    stream: TcpStream,
    addr: SocketAddr,
}

impl TcpSink {
    /// Creates a new TCP sink
    pub async fn new(name: &str, addr: impl AsRef<str>) -> EventResult<Self> {
        let socket_addr: SocketAddr = addr
            .as_ref()
            .parse()
            .map_err(|e| EventError::Connection(format!("Invalid address: {}", e)))?;

        let stream = TcpStream::connect(socket_addr)
            .await
            .map_err(|e| EventError::Connection(format!("Failed to connect: {}", e)))?;

        println!("Connected to TCP server at {}", socket_addr);

        Ok(Self {
            name: name.to_string(),
            stream,
            addr: socket_addr,
        })
    }
}

#[async_trait]
impl EventSink for TcpSink {
    fn name(&self) -> &str {
        &self.name
    }

    async fn write(&mut self, event: &Event) -> EventResult<()> {
        // Serialize event to JSON
        let mut json = serde_json::to_string(event)
            .map_err(|e| EventError::Serialization(e.to_string()))?;

        // Add newline
        json.push('\n');

        // Write to socket
        self.stream.write_all(json.as_bytes()).await?;

        Ok(())
    }

    async fn flush(&mut self) -> EventResult<()> {
        self.stream.flush().await?;
        Ok(())
    }
}
```

### Kafka Integration

For production systems, Apache Kafka is a popular choice for event streaming. Let's implement Kafka source and sink adapters:

```rust
use rdkafka::config::ClientConfig;
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::message::Message;
use rdkafka::producer::{FutureProducer, FutureRecord};
use std::time::Duration;

/// A source that consumes events from Kafka
pub struct KafkaSource {
    name: String,
    consumer: StreamConsumer,
    topic: String,
}

impl KafkaSource {
    /// Creates a new Kafka source
    pub fn new(
        name: &str,
        brokers: &str,
        topic: &str,
        group_id: &str,
    ) -> EventResult<Self> {
        let consumer: StreamConsumer = ClientConfig::new()
            .set("bootstrap.servers", brokers)
            .set("group.id", group_id)
            .set("enable.auto.commit", "true")
            .set("auto.offset.reset", "earliest")
            .create()
            .map_err(|e| EventError::Connection(format!("Kafka consumer error: {}", e)))?;

        consumer
            .subscribe(&[topic])
            .map_err(|e| EventError::Connection(format!("Kafka subscription error: {}", e)))?;

        println!("Subscribed to Kafka topic: {}", topic);

        Ok(Self {
            name: name.to_string(),
            consumer,
            topic: topic.to_string(),
        })
    }
}

#[async_trait]
impl EventSource for KafkaSource {
    fn name(&self) -> &str {
        &self.name
    }

    async fn next(&mut self) -> EventResult<Option<Event>> {
        // Wait for the next message
        match self.consumer.recv().await {
            Ok(msg) => {
                // Extract payload
                if let Some(payload) = msg.payload() {
                    // Parse as JSON
                    let event: Event = serde_json::from_slice(payload)
                        .map_err(|e| EventError::Serialization(format!("Kafka message parse error: {}", e)))?;

                    Ok(Some(event))
                } else {
                    Err(EventError::Processing("Empty Kafka message".to_string()))
                }
            }
            Err(e) => Err(EventError::Processing(format!("Kafka consumer error: {}", e))),
        }
    }

    async fn commit(&mut self) -> EventResult<()> {
        // Auto-commit is enabled
        Ok(())
    }
}

/// A sink that produces events to Kafka
pub struct KafkaSink {
    name: String,
    producer: FutureProducer,
    topic: String,
}

impl KafkaSink {
    /// Creates a new Kafka sink
    pub fn new(name: &str, brokers: &str, topic: &str) -> EventResult<Self> {
        let producer: FutureProducer = ClientConfig::new()
            .set("bootstrap.servers", brokers)
            .set("message.timeout.ms", "5000")
            .create()
            .map_err(|e| EventError::Connection(format!("Kafka producer error: {}", e)))?;

        println!("Connected to Kafka for topic: {}", topic);

        Ok(Self {
            name: name.to_string(),
            producer,
            topic: topic.to_string(),
        })
    }
}

#[async_trait]
impl EventSink for KafkaSink {
    fn name(&self) -> &str {
        &self.name
    }

    async fn write(&mut self, event: &Event) -> EventResult<()> {
        // Serialize event to JSON
        let payload = serde_json::to_vec(event)
            .map_err(|e| EventError::Serialization(e.to_string()))?;

        // Use event ID as key
        let key = event.id.to_string();

        // Send to Kafka
        let record = FutureRecord::to(&self.topic)
            .key(&key)
            .payload(&payload);

        let result = self.producer.send(record, Duration::from_secs(5)).await;

        match result {
            Ok(_) => Ok(()),
            Err((e, _)) => Err(EventError::Processing(format!("Kafka send error: {}", e))),
        }
    }

    async fn flush(&mut self) -> EventResult<()> {
        // Flush is implicit with FutureProducer
        Ok(())
    }
}
```

### HTTP Webhook Sink

Let's also implement an HTTP webhook sink for sending events to web services:

```rust
use reqwest::{Client, StatusCode};

/// A sink that sends events to an HTTP endpoint
pub struct WebhookSink {
    name: String,
    client: Client,
    url: String,
    headers: HashMap<String, String>,
}

impl WebhookSink {
    /// Creates a new webhook sink
    pub fn new(name: &str, url: &str) -> EventResult<Self> {
        let client = Client::new();

        Ok(Self {
            name: name.to_string(),
            client,
            url: url.to_string(),
            headers: HashMap::new(),
        })
    }

    /// Adds a header to the HTTP request
    pub fn with_header(mut self, key: &str, value: &str) -> Self {
        self.headers.insert(key.to_string(), value.to_string());
        self
    }
}

#[async_trait]
impl EventSink for WebhookSink {
    fn name(&self) -> &str {
        &self.name
    }

    async fn write(&mut self, event: &Event) -> EventResult<()> {
        // Build request
        let mut request = self.client.post(&self.url);

        // Add headers
        for (key, value) in &self.headers {
            request = request.header(key, value);
        }

        // Send event as JSON
        let response = request
            .json(event)
            .send()
            .await
            .map_err(|e| EventError::Connection(format!("HTTP request failed: {}", e)))?;

        // Check status
        let status = response.status();
        if status != StatusCode::OK && status != StatusCode::CREATED && status != StatusCode::ACCEPTED {
            return Err(EventError::Processing(format!(
                "HTTP request returned non-success status: {}", status
            )));
        }

        Ok(())
    }

    async fn flush(&mut self) -> EventResult<()> {
        // No buffering in webhook sink
        Ok(())
    }
}
```

With these sources and sinks, our RustStream system can connect to various external systems, making it useful in real-world scenarios. In the next section, we'll build the analytics engine that will process the streaming data to derive insights.

## Analytics Engine

With our core stream processing engine and adapters in place, let's build a real-time analytics engine that can derive insights from streaming data. This will include metrics calculation, anomaly detection, and pattern recognition.

### Metrics and Aggregations

First, let's create a framework for calculating metrics over streaming data:

```rust
use std::collections::{HashMap, VecDeque};
use std::fmt;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

/// A metric value
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum MetricValue {
    /// Count value
    Count(u64),
    /// Gauge value
    Gauge(f64),
    /// Timer value (in milliseconds)
    Timer(f64),
}

impl fmt::Display for MetricValue {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MetricValue::Count(v) => write!(f, "{}", v),
            MetricValue::Gauge(v) => write!(f, "{:.2}", v),
            MetricValue::Timer(v) => write!(f, "{:.2}ms", v),
        }
    }
}

/// A named metric with metadata
#[derive(Debug, Clone)]
pub struct Metric {
    /// Metric name
    pub name: String,
    /// Current value
    pub value: MetricValue,
    /// Tags for this metric
    pub tags: HashMap<String, String>,
    /// Last update time
    pub updated_at: Instant,
}

impl Metric {
    /// Creates a new metric
    pub fn new(name: &str, value: MetricValue) -> Self {
        Self {
            name: name.to_string(),
            value,
            tags: HashMap::new(),
            updated_at: Instant::now(),
        }
    }

    /// Adds a tag to the metric
    pub fn with_tag(mut self, key: &str, value: &str) -> Self {
        self.tags.insert(key.to_string(), value.to_string());
        self
    }
}

/// Repository for storing and querying metrics
pub struct MetricsRepository {
    /// Current metrics
    metrics: HashMap<String, Metric>,
    /// Historical values (time series)
    history: HashMap<String, VecDeque<(Instant, MetricValue)>>,
    /// Maximum history length
    max_history: usize,
}

impl MetricsRepository {
    /// Creates a new metrics repository
    pub fn new(max_history: usize) -> Self {
        Self {
            metrics: HashMap::new(),
            history: HashMap::new(),
            max_history,
        }
    }

    /// Updates a metric
    pub fn update(&mut self, metric: Metric) {
        // Update current value
        let key = Self::metric_key(&metric);
        self.metrics.insert(key.clone(), metric.clone());

        // Update history
        let history = self.history.entry(key).or_insert_with(VecDeque::new);
        history.push_back((metric.updated_at, metric.value));

        // Trim history if needed
        while history.len() > self.max_history {
            history.pop_front();
        }
    }

    /// Gets a metric by name and tags
    pub fn get(&self, name: &str, tags: &HashMap<String, String>) -> Option<&Metric> {
        let key = Self::key(name, tags);
        self.metrics.get(&key)
    }

    /// Gets the history of a metric
    pub fn get_history(
        &self,
        name: &str,
        tags: &HashMap<String, String>,
    ) -> Option<&VecDeque<(Instant, MetricValue)>> {
        let key = Self::key(name, tags);
        self.history.get(&key)
    }

    /// Gets all metrics
    pub fn get_all(&self) -> impl Iterator<Item = &Metric> {
        self.metrics.values()
    }

    /// Generates a unique key for a metric
    fn metric_key(metric: &Metric) -> String {
        Self::key(&metric.name, &metric.tags)
    }

    /// Generates a unique key from name and tags
    fn key(name: &str, tags: &HashMap<String, String>) -> String {
        let mut parts = vec![name.to_string()];

        let mut tag_pairs: Vec<_> = tags.iter().collect();
        tag_pairs.sort_by_key(|k| k.0);

        for (k, v) in tag_pairs {
            parts.push(format!("{}={}", k, v));
        }

        parts.join(";")
    }
}

/// Shared metrics repository that can be accessed from multiple threads
pub type SharedMetricsRepository = Arc<RwLock<MetricsRepository>>;

/// Creates a new shared metrics repository
pub fn create_metrics_repository(max_history: usize) -> SharedMetricsRepository {
    Arc::new(RwLock::new(MetricsRepository::new(max_history)))
}

/// Operator that calculates metrics from events
pub struct MetricsOperator {
    name: String,
    repository: SharedMetricsRepository,
    calculators: Vec<Box<dyn MetricCalculator>>,
}

/// Trait for calculating metrics from events
#[async_trait]
pub trait MetricCalculator: Send + Sync {
    /// Calculates metrics from an event
    async fn calculate(&self, event: &Event) -> Vec<Metric>;
}

impl MetricsOperator {
    /// Creates a new metrics operator
    pub fn new(name: &str, repository: SharedMetricsRepository) -> Self {
        Self {
            name: name.to_string(),
            repository,
            calculators: Vec::new(),
        }
    }

    /// Adds a metric calculator
    pub fn add_calculator<C>(&mut self, calculator: C) -> &mut Self
    where
        C: MetricCalculator + 'static,
    {
        self.calculators.push(Box::new(calculator));
        self
    }
}

#[async_trait]
impl Operator for MetricsOperator {
    fn name(&self) -> &str {
        &self.name
    }

    async fn apply(&self, input: EventStream) -> EventStream {
        let repository = self.repository.clone();
        let calculators = self.calculators.clone();

        Box::pin(input.then(move |result| {
            let repository = repository.clone();
            let calculators = calculators.clone();

            async move {
                if let Ok(event) = &result {
                    // Calculate metrics
                    for calculator in &calculators {
                        let metrics = calculator.calculate(event).await;

                        // Update repository
                        let mut repo = repository.write().await;
                        for metric in metrics {
                            repo.update(metric);
                        }
                    }
                }

                // Pass the event through unchanged
                result
            }
        }))
    }
}

/// Calculator for count metrics
pub struct CountMetricCalculator {
    name: String,
    filter: Box<dyn Fn(&Event) -> bool + Send + Sync>,
    dimensions: Vec<String>,
}

impl CountMetricCalculator {
    /// Creates a new count metric calculator
    pub fn new<F>(name: &str, filter: F) -> Self
    where
        F: Fn(&Event) -> bool + Send + Sync + 'static,
    {
        Self {
            name: name.to_string(),
            filter: Box::new(filter),
            dimensions: Vec::new(),
        }
    }

    /// Adds a dimension for grouping
    pub fn with_dimension(mut self, dimension: &str) -> Self {
        self.dimensions.push(dimension.to_string());
        self
    }
}

#[async_trait]
impl MetricCalculator for CountMetricCalculator {
    async fn calculate(&self, event: &Event) -> Vec<Metric> {
        if !(self.filter)(event) {
            return Vec::new();
        }

        // Extract dimension values
        let mut tags = HashMap::new();
        for dim in &self.dimensions {
            if let Some(value) = Self::extract_dimension(event, dim) {
                tags.insert(dim.clone(), value);
            }
        }

        // Create metric
        vec![Metric::new(&self.name, MetricValue::Count(1))
            .with_tag("event_type", &event.event_type)]
    }
}

impl CountMetricCalculator {
    /// Extracts a dimension value from an event
    fn extract_dimension(event: &Event, dimension: &str) -> Option<String> {
        // Try to extract from metadata
        if let Some(value) = event.metadata.get(dimension) {
            return Some(value.clone());
        }

        // Try to extract from event type
        if dimension == "event_type" {
            return Some(event.event_type.clone());
        }

        // Try to extract from event source
        if dimension == "source" {
            return Some(event.source.clone());
        }

        // Try to extract from data
        match &event.data {
            EventData::Object(obj) => {
                if let Some(value) = obj.get(dimension) {
                    return match value {
                        EventData::String(s) => Some(s.clone()),
                        EventData::Number(n) => Some(n.to_string()),
                        EventData::Bool(b) => Some(b.to_string()),
                        _ => None,
                    };
                }
            }
            _ => {}
        }

        None
    }
}

/// Calculator for gauge metrics
pub struct GaugeMetricCalculator {
    name: String,
    extractor: Box<dyn Fn(&Event) -> Option<f64> + Send + Sync>,
    dimensions: Vec<String>,
}

impl GaugeMetricCalculator {
    /// Creates a new gauge metric calculator
    pub fn new<F>(name: &str, extractor: F) -> Self
    where
        F: Fn(&Event) -> Option<f64> + Send + Sync + 'static,
    {
        Self {
            name: name.to_string(),
            extractor: Box::new(extractor),
            dimensions: Vec::new(),
        }
    }

    /// Adds a dimension for grouping
    pub fn with_dimension(mut self, dimension: &str) -> Self {
        self.dimensions.push(dimension.to_string());
        self
    }
}

#[async_trait]
impl MetricCalculator for GaugeMetricCalculator {
    async fn calculate(&self, event: &Event) -> Vec<Metric> {
        if let Some(value) = (self.extractor)(event) {
            // Extract dimension values
            let mut tags = HashMap::new();
            for dim in &self.dimensions {
                if let Some(dim_value) = CountMetricCalculator::extract_dimension(event, dim) {
                    tags.insert(dim.clone(), dim_value);
                }
            }

            // Create metric
            vec![Metric::new(&self.name, MetricValue::Gauge(value))
                .with_tag("event_type", &event.event_type)]
        } else {
            Vec::new()
        }
    }
}
```

### Anomaly Detection

Now let's implement an anomaly detection system that can identify unusual patterns in the data stream:

```rust
/// Types of anomaly detection algorithms
pub enum AnomalyDetectionAlgorithm {
    /// Z-score detection (based on standard deviation)
    ZScore { threshold: f64 },
    /// Moving average with tolerance
    MovingAverage { window_size: usize, tolerance: f64 },
    /// Rate of change detection
    RateOfChange { max_rate: f64 },
}

/// Anomaly detector for a specific metric
pub struct AnomalyDetector {
    name: String,
    metric_name: String,
    metric_tags: HashMap<String, String>,
    algorithm: AnomalyDetectionAlgorithm,
    repository: SharedMetricsRepository,
}

impl AnomalyDetector {
    /// Creates a new anomaly detector
    pub fn new(
        name: &str,
        metric_name: &str,
        repository: SharedMetricsRepository,
        algorithm: AnomalyDetectionAlgorithm,
    ) -> Self {
        Self {
            name: name.to_string(),
            metric_name: metric_name.to_string(),
            metric_tags: HashMap::new(),
            algorithm,
            repository,
        }
    }

    /// Adds a tag filter
    pub fn with_tag(mut self, key: &str, value: &str) -> Self {
        self.metric_tags.insert(key.to_string(), value.to_string());
        self
    }

    /// Checks for anomalies
    pub async fn check(&self) -> Option<AnomalyEvent> {
        let repo = self.repository.read().await;

        // Get metric history
        let history = match repo.get_history(&self.metric_name, &self.metric_tags) {
            Some(h) => h,
            None => return None,
        };

        // Need at least two points for most algorithms
        if history.len() < 2 {
            return None;
        }

        // Extract values
        let values: Vec<f64> = history
            .iter()
            .filter_map(|(_, v)| match v {
                MetricValue::Gauge(f) => Some(*f),
                MetricValue::Count(c) => Some(*c as f64),
                MetricValue::Timer(t) => Some(*t),
            })
            .collect();

        // Current value
        let current = *values.last().unwrap();

        // Check for anomaly based on algorithm
        let is_anomaly = match &self.algorithm {
            AnomalyDetectionAlgorithm::ZScore { threshold } => {
                // Calculate mean and standard deviation
                let mean = values.iter().sum::<f64>() / values.len() as f64;
                let variance = values
                    .iter()
                    .map(|x| (*x - mean).powi(2))
                    .sum::<f64>()
                    / values.len() as f64;
                let std_dev = variance.sqrt();

                // Z-score
                if std_dev > 0.0 {
                    let z_score = (current - mean) / std_dev;
                    z_score.abs() > *threshold
                } else {
                    false
                }
            }
            AnomalyDetectionAlgorithm::MovingAverage {
                window_size,
                tolerance,
            } => {
                // Calculate moving average
                let window = values.len().min(*window_size);
                let moving_avg = values[values.len() - window..].iter().sum::<f64>() / window as f64;

                // Check if current value deviates from moving average
                (current - moving_avg).abs() > *tolerance
            }
            AnomalyDetectionAlgorithm::RateOfChange { max_rate } => {
                // Calculate rate of change
                let previous = values[values.len() - 2];
                if previous != 0.0 {
                    let rate = (current - previous).abs() / previous;
                    rate > *max_rate
                } else {
                    false
                }
            }
        };

        if is_anomaly {
            // Create anomaly event
            Some(AnomalyEvent {
                detector_name: self.name.clone(),
                metric_name: self.metric_name.clone(),
                metric_tags: self.metric_tags.clone(),
                current_value: current,
                timestamp: Instant::now(),
            })
        } else {
            None
        }
    }
}

/// An anomaly detected in the metrics
#[derive(Debug, Clone)]
pub struct AnomalyEvent {
    /// Name of the detector that found this anomaly
    pub detector_name: String,
    /// Name of the metric with the anomaly
    pub metric_name: String,
    /// Tags of the metric with the anomaly
    pub metric_tags: HashMap<String, String>,
    /// Current value that triggered the anomaly
    pub current_value: f64,
    /// When the anomaly was detected
    pub timestamp: Instant,
}

/// Service that manages anomaly detectors
pub struct AnomalyDetectionService {
    detectors: Vec<AnomalyDetector>,
    check_interval: Duration,
    alert_sink: Option<Box<dyn AlertSink>>,
}

impl AnomalyDetectionService {
    /// Creates a new anomaly detection service
    pub fn new(check_interval: Duration) -> Self {
        Self {
            detectors: Vec::new(),
            check_interval,
            alert_sink: None,
        }
    }

    /// Adds an anomaly detector
    pub fn add_detector(&mut self, detector: AnomalyDetector) -> &mut Self {
        self.detectors.push(detector);
        self
    }

    /// Sets the alert sink
    pub fn set_alert_sink<S>(&mut self, sink: S) -> &mut Self
    where
        S: AlertSink + 'static,
    {
        self.alert_sink = Some(Box::new(sink));
        self
    }

    /// Starts the anomaly detection service
    pub async fn start(&self) -> EventResult<()> {
        let detectors = self.detectors.clone();
        let check_interval = self.check_interval;
        let alert_sink = self.alert_sink.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(check_interval);

            loop {
                interval.tick().await;

                // Check all detectors
                for detector in &detectors {
                    if let Some(anomaly) = detector.check().await {
                        println!("Anomaly detected: {:?}", anomaly);

                        // Send alert if sink is configured
                        if let Some(sink) = &alert_sink {
                            if let Err(e) = sink.send_alert(&anomaly).await {
                                eprintln!("Error sending alert: {}", e);
                            }
                        }
                    }
                }
            }
        });

        Ok(())
    }
}

/// Sink for anomaly alerts
#[async_trait]
pub trait AlertSink: Send + Sync {
    /// Sends an alert for an anomaly
    async fn send_alert(&self, anomaly: &AnomalyEvent) -> EventResult<()>;
}
```

### Pattern Recognition

Finally, let's implement a simple pattern recognition system using the Complex Event Processing (CEP) approach:

```rust
/// A pattern to match in the event stream
pub struct Pattern {
    /// Name of this pattern
    name: String,
    /// Sequence of event conditions to match
    conditions: Vec<Box<dyn EventCondition>>,
    /// Maximum time window for matching the pattern
    window: Duration,
}

/// Condition that an event must satisfy
#[async_trait]
pub trait EventCondition: Send + Sync {
    /// Checks if an event satisfies this condition
    async fn matches(&self, event: &Event) -> bool;
}

/// Condition based on event type
pub struct EventTypeCondition {
    /// Expected event type
    event_type: String,
}

impl EventTypeCondition {
    /// Creates a new event type condition
    pub fn new(event_type: &str) -> Self {
        Self {
            event_type: event_type.to_string(),
        }
    }
}

#[async_trait]
impl EventCondition for EventTypeCondition {
    async fn matches(&self, event: &Event) -> bool {
        event.event_type == self.event_type
    }
}

/// Condition based on event data
pub struct EventDataCondition<F> {
    /// Predicate function
    predicate: F,
}

impl<F> EventDataCondition<F>
where
    F: Fn(&EventData) -> bool + Send + Sync + 'static,
{
    /// Creates a new event data condition
    pub fn new(predicate: F) -> Self {
        Self { predicate }
    }
}

#[async_trait]
impl<F> EventCondition for EventDataCondition<F>
where
    F: Fn(&EventData) -> bool + Send + Sync + 'static,
{
    async fn matches(&self, event: &Event) -> bool {
        (self.predicate)(&event.data)
    }
}

impl Pattern {
    /// Creates a new pattern
    pub fn new(name: &str, window: Duration) -> Self {
        Self {
            name: name.to_string(),
            conditions: Vec::new(),
            window,
        }
    }

    /// Adds a condition to the pattern
    pub fn add_condition<C>(&mut self, condition: C) -> &mut Self
    where
        C: EventCondition + 'static,
    {
        self.conditions.push(Box::new(condition));
        self
    }
}

/// Pattern matching engine
pub struct PatternMatcher {
    name: String,
    patterns: Vec<Pattern>,
    partial_matches: Vec<PartialMatch>,
}

/// A partial match of a pattern
struct PartialMatch {
    /// Pattern being matched
    pattern: Pattern,
    /// Matched events so far
    events: Vec<Event>,
    /// When the first event was matched
    start_time: Instant,
    /// Index of the next condition to match
    next_index: usize,
}

/// Result of a completed pattern match
#[derive(Debug, Clone)]
pub struct PatternMatch {
    /// Name of the matched pattern
    pub pattern_name: String,
    /// Events that matched the pattern
    pub events: Vec<Event>,
    /// When the pattern started matching
    pub start_time: Instant,
    /// When the pattern completed matching
    pub end_time: Instant,
}

impl PatternMatcher {
    /// Creates a new pattern matcher
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
            patterns: Vec::new(),
            partial_matches: Vec::new(),
        }
    }

    /// Adds a pattern to match
    pub fn add_pattern(&mut self, pattern: Pattern) -> &mut Self {
        self.patterns.push(pattern);
        self
    }

    /// Processes an event and returns any completed pattern matches
    pub async fn process(&mut self, event: &Event) -> Vec<PatternMatch> {
        let mut completed_matches = Vec::new();

        // Check for expired partial matches
        let now = Instant::now();
        self.partial_matches.retain(|m| {
            now.duration_since(m.start_time) <= m.pattern.window
        });

        // Check if this event continues any partial matches
        for i in (0..self.partial_matches.len()).rev() {
            let partial = &mut self.partial_matches[i];

            if partial.next_index < partial.pattern.conditions.len() {
                let condition = &partial.pattern.conditions[partial.next_index];

                if condition.matches(event).await {
                    // This event matches the next condition
                    partial.events.push(event.clone());
                    partial.next_index += 1;

                    // Check if pattern is complete
                    if partial.next_index >= partial.pattern.conditions.len() {
                        // Complete match
                        completed_matches.push(PatternMatch {
                            pattern_name: partial.pattern.name.clone(),
                            events: partial.events.clone(),
                            start_time: partial.start_time,
                            end_time: now,
                        });

                        // Remove the completed match
                        self.partial_matches.swap_remove(i);
                    }
                }
            }
        }

        // Check if this event starts any new patterns
        for pattern in &self.patterns {
            if !pattern.conditions.is_empty() {
                let first_condition = &pattern.conditions[0];

                if first_condition.matches(event).await {
                    // Start a new partial match
                    let partial = PartialMatch {
                        pattern: pattern.clone(),
                        events: vec![event.clone()],
                        start_time: now,
                        next_index: 1,
                    };

                    // Check if pattern is already complete (single condition)
                    if partial.next_index >= partial.pattern.conditions.len() {
                        // Complete match
                        completed_matches.push(PatternMatch {
                            pattern_name: partial.pattern.name.clone(),
                            events: partial.events.clone(),
                            start_time: partial.start_time,
                            end_time: now,
                        });
                    } else {
                        // Partial match
                        self.partial_matches.push(partial);
                    }
                }
            }
        }

        completed_matches
    }
}

/// Operator that matches patterns in the event stream
pub struct PatternMatchingOperator {
    name: String,
    matcher: Arc<Mutex<PatternMatcher>>,
}

impl PatternMatchingOperator {
    /// Creates a new pattern matching operator
    pub fn new(name: &str, matcher: PatternMatcher) -> Self {
        Self {
            name: name.to_string(),
            matcher: Arc::new(Mutex::new(matcher)),
        }
    }
}

#[async_trait]
impl Operator for PatternMatchingOperator {
    fn name(&self) -> &str {
        &self.name
    }

    async fn apply(&self, input: EventStream) -> EventStream {
        let matcher = self.matcher.clone();

        Box::pin(input.then(move |result| {
            let matcher = matcher.clone();

            async move {
                if let Ok(event) = &result {
                    // Process event
                    let mut matcher_guard = matcher.lock().await;
                    let matches = matcher_guard.process(event).await;

                    // Emit a pattern match event for each match
                    if !matches.is_empty() {
                        // In a real implementation, we would emit these as new events
                        for m in &matches {
                            println!("Pattern matched: {} with {} events", m.pattern_name, m.events.len());
                        }
                    }
                }

                // Pass the original event through
                result
            }
        }))
    }
}
```

With these components, our analytics engine can calculate metrics, detect anomalies, and recognize patterns in real-time data streams. This provides the foundation for deriving actionable insights from the data flowing through our system.

In the next section, we'll build an alerting system to notify users when important conditions are detected.

## Alerting System

Now that our system can detect anomalies and recognize patterns, we need a way to alert users when significant events occur. Let's build a flexible alerting system that can integrate with various notification channels.

### Alert Model

First, let's define our alert data model:

```rust
use std::fmt;

/// Alert severity levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum AlertSeverity {
    /// Informational alert
    Info,
    /// Warning alert
    Warning,
    /// Error alert
    Error,
    /// Critical alert
    Critical,
}

impl fmt::Display for AlertSeverity {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AlertSeverity::Info => write!(f, "INFO"),
            AlertSeverity::Warning => write!(f, "WARNING"),
            AlertSeverity::Error => write!(f, "ERROR"),
            AlertSeverity::Critical => write!(f, "CRITICAL"),
        }
    }
}

/// An alert generated by the system
#[derive(Debug, Clone)]
pub struct Alert {
    /// Unique identifier
    pub id: Uuid,
    /// Alert title
    pub title: String,
    /// Alert description
    pub description: String,
    /// Alert severity
    pub severity: AlertSeverity,
    /// When the alert was generated
    pub timestamp: DateTime<Utc>,
    /// Source of the alert
    pub source: String,
    /// Additional tags
    pub tags: HashMap<String, String>,
    /// Related events
    pub events: Vec<Event>,
}

impl Alert {
    /// Creates a new alert
    pub fn new(title: &str, description: &str, severity: AlertSeverity, source: &str) -> Self {
        Self {
            id: Uuid::new_v4(),
            title: title.to_string(),
            description: description.to_string(),
            severity,
            timestamp: Utc::now(),
            source: source.to_string(),
            tags: HashMap::new(),
            events: Vec::new(),
        }
    }

    /// Adds a tag to the alert
    pub fn with_tag(mut self, key: &str, value: &str) -> Self {
        self.tags.insert(key.to_string(), value.to_string());
        self
    }

    /// Adds an event to the alert
    pub fn with_event(mut self, event: Event) -> Self {
        self.events.push(event);
        self
    }
}
```

### Alert Manager

Next, let's create an alert manager to handle alert routing, deduplication, and throttling:

```rust
/// Routes alerts to notification channels
pub struct AlertManager {
    /// Name of this alert manager
    name: String,
    /// Notification channels
    channels: Vec<Box<dyn NotificationChannel>>,
    /// Alert history (for deduplication)
    history: HashMap<String, Vec<(DateTime<Utc>, Uuid)>>,
    /// Maximum history size per alert key
    max_history: usize,
    /// Minimum interval between similar alerts
    throttle_interval: Option<Duration>,
}

/// A channel for sending notifications
#[async_trait]
pub trait NotificationChannel: Send + Sync {
    /// Returns the name of this channel
    fn name(&self) -> &str;

    /// Sends an alert notification
    async fn send(&self, alert: &Alert) -> EventResult<()>;
}

impl AlertManager {
    /// Creates a new alert manager
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
            channels: Vec::new(),
            history: HashMap::new(),
            max_history: 100,
            throttle_interval: None,
        }
    }

    /// Adds a notification channel
    pub fn add_channel<C>(&mut self, channel: C) -> &mut Self
    where
        C: NotificationChannel + 'static,
    {
        self.channels.push(Box::new(channel));
        self
    }

    /// Sets the throttle interval
    pub fn with_throttle(mut self, interval: Duration) -> Self {
        self.throttle_interval = Some(interval);
        self
    }

    /// Sends an alert through all channels
    pub async fn send_alert(&mut self, alert: Alert) -> EventResult<()> {
        // Create alert key for deduplication
        let key = self.alert_key(&alert);

        // Check for duplicate/throttled alerts
        if let Some(interval) = self.throttle_interval {
            if let Some(history) = self.history.get(&key) {
                if !history.is_empty() {
                    let (last_time, _) = history.last().unwrap();
                    let now = Utc::now();
                    let elapsed = now.signed_duration_since(*last_time);

                    if elapsed < chrono::Duration::from_std(interval).unwrap() {
                        // Skip this alert (throttled)
                        return Ok(());
                    }
                }
            }
        }

        // Add to history
        let entry = self.history.entry(key).or_insert_with(Vec::new);
        entry.push((alert.timestamp, alert.id));

        // Trim history if needed
        while entry.len() > self.max_history {
            entry.remove(0);
        }

        // Send to all channels
        for channel in &self.channels {
            if let Err(e) = channel.send(&alert).await {
                eprintln!("Error sending alert to channel {}: {}", channel.name(), e);
            }
        }

        Ok(())
    }

    /// Generates a key for alert deduplication
    fn alert_key(&self, alert: &Alert) -> String {
        format!("{}:{}", alert.source, alert.title)
    }
}

/// Implementation of AlertSink for the anomaly detection service
pub struct AnomalyAlertSink {
    alert_manager: Arc<Mutex<AlertManager>>,
}

impl AnomalyAlertSink {
    /// Creates a new anomaly alert sink
    pub fn new(alert_manager: Arc<Mutex<AlertManager>>) -> Self {
        Self { alert_manager }
    }
}

#[async_trait]
impl AlertSink for AnomalyAlertSink {
    async fn send_alert(&self, anomaly: &AnomalyEvent) -> EventResult<()> {
        // Create an alert from the anomaly
        let alert = Alert::new(
            &format!("Anomaly detected in metric '{}'", anomaly.metric_name),
            &format!(
                "The metric '{}' has an anomalous value of {}",
                anomaly.metric_name, anomaly.current_value
            ),
            AlertSeverity::Warning,
            "anomaly_detector",
        );

        // Send the alert
        let mut manager = self.alert_manager.lock().await;
        manager.send_alert(alert).await
    }
}
```

### Notification Channels

Let's implement several notification channels for different delivery methods:

```rust
/// Sends email notifications
pub struct EmailChannel {
    name: String,
    smtp_server: String,
    smtp_port: u16,
    username: String,
    password: String,
    from_address: String,
    to_addresses: Vec<String>,
}

impl EmailChannel {
    /// Creates a new email channel
    pub fn new(
        name: &str,
        smtp_server: &str,
        smtp_port: u16,
        username: &str,
        password: &str,
        from_address: &str,
    ) -> Self {
        Self {
            name: name.to_string(),
            smtp_server: smtp_server.to_string(),
            smtp_port,
            username: username.to_string(),
            password: password.to_string(),
            from_address: from_address.to_string(),
            to_addresses: Vec::new(),
        }
    }

    /// Adds a recipient email address
    pub fn add_recipient(mut self, email: &str) -> Self {
        self.to_addresses.push(email.to_string());
        self
    }
}

#[async_trait]
impl NotificationChannel for EmailChannel {
    fn name(&self) -> &str {
        &self.name
    }

    async fn send(&self, alert: &Alert) -> EventResult<()> {
        // In a real implementation, we would use an SMTP client
        // This is a simplified example
        println!(
            "Sending email alert '{}' to {} recipients",
            alert.title,
            self.to_addresses.len()
        );

        // Create email content
        let subject = format!("[{}] {}", alert.severity, alert.title);
        let body = format!(
            "Alert: {}\nSeverity: {}\nTime: {}\nSource: {}\n\n{}",
            alert.title, alert.severity, alert.timestamp, alert.source, alert.description
        );

        // Simulate sending
        tokio::time::sleep(Duration::from_millis(100)).await;

        Ok(())
    }
}

/// Sends Slack notifications
pub struct SlackChannel {
    name: String,
    webhook_url: String,
}

impl SlackChannel {
    /// Creates a new Slack channel
    pub fn new(name: &str, webhook_url: &str) -> Self {
        Self {
            name: name.to_string(),
            webhook_url: webhook_url.to_string(),
        }
    }
}

#[async_trait]
impl NotificationChannel for SlackChannel {
    fn name(&self) -> &str {
        &self.name
    }

    async fn send(&self, alert: &Alert) -> EventResult<()> {
        // In a real implementation, we would use the Slack API
        // This is a simplified example
        println!("Sending Slack alert: {}", alert.title);

        // Create Slack message
        let emoji = match alert.severity {
            AlertSeverity::Info => ":information_source:",
            AlertSeverity::Warning => ":warning:",
            AlertSeverity::Error => ":x:",
            AlertSeverity::Critical => ":rotating_light:",
        };

        let message = json!({
            "text": format!("{} *{}*", emoji, alert.title),
            "attachments": [{
                "color": match alert.severity {
                    AlertSeverity::Info => "#36a64f",
                    AlertSeverity::Warning => "#ffcc00",
                    AlertSeverity::Error => "#ff9900",
                    AlertSeverity::Critical => "#ff0000",
                },
                "fields": [
                    {
                        "title": "Description",
                        "value": alert.description,
                        "short": false
                    },
                    {
                        "title": "Severity",
                        "value": alert.severity.to_string(),
                        "short": true
                    },
                    {
                        "title": "Source",
                        "value": alert.source,
                        "short": true
                    },
                    {
                        "title": "Time",
                        "value": alert.timestamp.to_rfc3339(),
                        "short": true
                    }
                ]
            }]
        });

        // Simulate sending
        tokio::time::sleep(Duration::from_millis(100)).await;

        Ok(())
    }
}

/// Logs alerts to a file
pub struct LogFileChannel {
    name: String,
    file_path: String,
}

impl LogFileChannel {
    /// Creates a new log file channel
    pub fn new(name: &str, file_path: &str) -> Self {
        Self {
            name: name.to_string(),
            file_path: file_path.to_string(),
        }
    }
}

#[async_trait]
impl NotificationChannel for LogFileChannel {
    fn name(&self) -> &str {
        &self.name
    }

    async fn send(&self, alert: &Alert) -> EventResult<()> {
        // Format the log entry
        let log_entry = format!(
            "[{}] [{}] {}: {}\n",
            alert.timestamp.to_rfc3339(),
            alert.severity,
            alert.source,
            alert.title
        );

        // Write to the log file
        tokio::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .append(true)
            .open(&self.file_path)
            .await?
            .write_all(log_entry.as_bytes())
            .await?;

        Ok(())
    }
}
```

### Alert Rules

Finally, let's create a rule-based system to generate alerts from events and metrics:

```rust
/// A rule that generates alerts based on conditions
pub struct AlertRule {
    name: String,
    condition: Box<dyn AlertCondition>,
    alert_template: AlertTemplate,
}

/// Template for generating alerts
pub struct AlertTemplate {
    title: String,
    description: String,
    severity: AlertSeverity,
    source: String,
    tags: HashMap<String, String>,
}

/// Condition that triggers an alert
#[async_trait]
pub trait AlertCondition: Send + Sync {
    /// Checks if an event should trigger an alert
    async fn check(&self, event: &Event) -> bool;
}

impl AlertRule {
    /// Creates a new alert rule
    pub fn new(
        name: &str,
        condition: impl AlertCondition + 'static,
        template: AlertTemplate,
    ) -> Self {
        Self {
            name: name.to_string(),
            condition: Box::new(condition),
            alert_template: template,
        }
    }

    /// Checks if an event should trigger an alert
    pub async fn check(&self, event: &Event) -> Option<Alert> {
        if self.condition.check(event).await {
            // Generate alert from template
            let mut alert = Alert::new(
                &self.alert_template.title,
                &self.alert_template.description,
                self.alert_template.severity,
                &self.alert_template.source,
            );

            // Add template tags
            for (k, v) in &self.alert_template.tags {
                alert = alert.with_tag(k, v);
            }

            // Add the triggering event
            alert = alert.with_event(event.clone());

            Some(alert)
        } else {
            None
        }
    }
}

impl AlertTemplate {
    /// Creates a new alert template
    pub fn new(
        title: &str,
        description: &str,
        severity: AlertSeverity,
        source: &str,
    ) -> Self {
        Self {
            title: title.to_string(),
            description: description.to_string(),
            severity,
            source: source.to_string(),
            tags: HashMap::new(),
        }
    }

    /// Adds a tag to the alert template
    pub fn with_tag(mut self, key: &str, value: &str) -> Self {
        self.tags.insert(key.to_string(), value.to_string());
        self
    }
}

/// Condition based on event type
pub struct EventTypeAlertCondition {
    event_type: String,
}

impl EventTypeAlertCondition {
    /// Creates a new event type condition
    pub fn new(event_type: &str) -> Self {
        Self {
            event_type: event_type.to_string(),
        }
    }
}

#[async_trait]
impl AlertCondition for EventTypeAlertCondition {
    async fn check(&self, event: &Event) -> bool {
        event.event_type == self.event_type
    }
}

/// Condition based on a predicate function
pub struct PredicateAlertCondition<F> {
    predicate: F,
}

impl<F> PredicateAlertCondition<F>
where
    F: Fn(&Event) -> bool + Send + Sync + 'static,
{
    /// Creates a new predicate condition
    pub fn new(predicate: F) -> Self {
        Self { predicate }
    }
}

#[async_trait]
impl<F> AlertCondition for PredicateAlertCondition<F>
where
    F: Fn(&Event) -> bool + Send + Sync + 'static,
{
    async fn check(&self, event: &Event) -> bool {
        (self.predicate)(event)
    }
}

/// Operator that applies alert rules to events
pub struct AlertRuleOperator {
    name: String,
    rules: Vec<AlertRule>,
    alert_manager: Arc<Mutex<AlertManager>>,
}

impl AlertRuleOperator {
    /// Creates a new alert rule operator
    pub fn new(name: &str, alert_manager: Arc<Mutex<AlertManager>>) -> Self {
        Self {
            name: name.to_string(),
            rules: Vec::new(),
            alert_manager,
        }
    }

    /// Adds an alert rule
    pub fn add_rule(&mut self, rule: AlertRule) -> &mut Self {
        self.rules.push(rule);
        self
    }
}

#[async_trait]
impl Operator for AlertRuleOperator {
    fn name(&self) -> &str {
        &self.name
    }

    async fn apply(&self, input: EventStream) -> EventStream {
        let rules = self.rules.clone();
        let alert_manager = self.alert_manager.clone();

        Box::pin(input.then(move |result| {
            let rules = rules.clone();
            let alert_manager = alert_manager.clone();

            async move {
                if let Ok(event) = &result {
                    // Check all rules
                    for rule in &rules {
                        if let Some(alert) = rule.check(event).await {
                            // Send the alert
                            let mut manager = alert_manager.lock().await;
                            if let Err(e) = manager.send_alert(alert).await {
                                eprintln!("Error sending alert: {}", e);
                            }
                        }
                    }
                }

                // Pass the event through
                result
            }
        }))
    }
}
```

With this alerting system, our RustStream platform can notify users through various channels when important conditions are detected in the data stream. The rule-based approach allows for flexible alert definitions, while the alert manager provides deduplication and throttling to prevent alert fatigue.

In the next section, we'll build a dashboard to visualize the real-time data and analytics.

## Dashboard and Visualization

To make our real-time data processing system complete, we need a way to visualize the data and insights. Let's create a web-based dashboard that provides real-time visualizations of metrics, alerts, and events.

### Web API

First, let's build a RESTful API that exposes our system's data:

```rust
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use actix_web::middleware::Logger;
use serde::Serialize;

/// Shared application state
pub struct AppState {
    /// Metrics repository
    metrics_repository: SharedMetricsRepository,
    /// Alert history
    alert_history: Arc<RwLock<Vec<Alert>>>,
    /// Event buffer (recent events)
    event_buffer: Arc<RwLock<VecDeque<Event>>>,
}

/// API response for metrics
#[derive(Serialize)]
struct MetricsResponse {
    metrics: Vec<MetricDto>,
}

/// DTO for metrics
#[derive(Serialize)]
struct MetricDto {
    name: String,
    value: String,
    tags: HashMap<String, String>,
    updated_at: String,
}

/// API response for alerts
#[derive(Serialize)]
struct AlertsResponse {
    alerts: Vec<AlertDto>,
}

/// DTO for alerts
#[derive(Serialize)]
struct AlertDto {
    id: String,
    title: String,
    description: String,
    severity: String,
    timestamp: String,
    source: String,
    tags: HashMap<String, String>,
}

/// Starts the dashboard API server
pub async fn start_dashboard_api(
    metrics_repository: SharedMetricsRepository,
    alert_history: Arc<RwLock<Vec<Alert>>>,
    event_buffer: Arc<RwLock<VecDeque<Event>>>,
    bind_address: &str,
) -> std::io::Result<()> {
    let app_state = web::Data::new(AppState {
        metrics_repository,
        alert_history,
        event_buffer,
    });

    HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone())
            .wrap(Logger::default())
            // API routes
            .route("/api/metrics", web::get().to(get_metrics))
            .route("/api/metrics/{name}", web::get().to(get_metric_by_name))
            .route("/api/alerts", web::get().to(get_alerts))
            .route("/api/events", web::get().to(get_events))
            // Static files for the dashboard frontend
            .service(actix_files::Files::new("/", "./dashboard/dist").index_file("index.html"))
    })
    .bind(bind_address)?
    .run()
    .await
}

/// Gets all metrics
async fn get_metrics(state: web::Data<AppState>) -> impl Responder {
    let repo = state.metrics_repository.read().await;

    let metrics: Vec<MetricDto> = repo.get_all()
        .map(|m| MetricDto {
            name: m.name.clone(),
            value: m.value.to_string(),
            tags: m.tags.clone(),
            updated_at: format!("{:?}", m.updated_at.elapsed()),
        })
        .collect();

    HttpResponse::Ok().json(MetricsResponse { metrics })
}

/// Gets a metric by name
async fn get_metric_by_name(
    state: web::Data<AppState>,
    path: web::Path<String>,
) -> impl Responder {
    let name = path.into_inner();
    let repo = state.metrics_repository.read().await;

    // Find metrics with matching name
    let metrics: Vec<MetricDto> = repo.get_all()
        .filter(|m| m.name == name)
        .map(|m| MetricDto {
            name: m.name.clone(),
            value: m.value.to_string(),
            tags: m.tags.clone(),
            updated_at: format!("{:?}", m.updated_at.elapsed()),
        })
        .collect();

    if metrics.is_empty() {
        HttpResponse::NotFound().finish()
    } else {
        HttpResponse::Ok().json(MetricsResponse { metrics })
    }
}

/// Gets recent alerts
async fn get_alerts(state: web::Data<AppState>) -> impl Responder {
    let alerts = state.alert_history.read().await;

    let alert_dtos: Vec<AlertDto> = alerts.iter()
        .map(|a| AlertDto {
            id: a.id.to_string(),
            title: a.title.clone(),
            description: a.description.clone(),
            severity: a.severity.to_string(),
            timestamp: a.timestamp.to_rfc3339(),
            source: a.source.clone(),
            tags: a.tags.clone(),
        })
        .collect();

    HttpResponse::Ok().json(AlertsResponse { alerts: alert_dtos })
}

/// Gets recent events
async fn get_events(state: web::Data<AppState>) -> impl Responder {
    let events = state.event_buffer.read().await;
    let events_vec: Vec<&Event> = events.iter().collect();

    HttpResponse::Ok().json(events_vec)
}
```

### WebSocket Support

To provide real-time updates to the dashboard, let's add WebSocket support:

```rust
use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_web_actors::ws;
use actix::{Actor, ActorContext, AsyncContext, StreamHandler};
use std::time::{Duration, Instant};

/// Interval for sending ping messages
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
/// How long before lack of client response causes a timeout
const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

/// WebSocket connection actor
struct DashboardWebSocket {
    /// Client ID
    id: usize,
    /// Client must send ping at least once per 10 seconds
    hb: Instant,
    /// Shared application state
    app_state: web::Data<AppState>,
}

impl Actor for DashboardWebSocket {
    type Context = ws::WebsocketContext<Self>;

    /// Method called on actor start
    fn started(&mut self, ctx: &mut Self::Context) {
        // Start the heartbeat process
        self.hb(ctx);

        // Set up subscription to updates
        let metrics_repo = self.app_state.metrics_repository.clone();
        let alerts = self.app_state.alert_history.clone();
        let events = self.app_state.event_buffer.clone();

        // Send initial data
        ctx.spawn(Box::pin(async move {
            // Send metrics
            let metrics = {
                let repo = metrics_repo.read().await;
                repo.get_all()
                    .map(|m| MetricDto {
                        name: m.name.clone(),
                        value: m.value.to_string(),
                        tags: m.tags.clone(),
                        updated_at: format!("{:?}", m.updated_at.elapsed()),
                    })
                    .collect::<Vec<_>>()
            };

            // Return initial data
            (metrics, alerts, events)
        }.then(move |(metrics, alerts, events)| {
            async move {
                // Send initial metrics
                ctx.text(serde_json::to_string(&MetricsResponse { metrics }).unwrap());

                // TODO: Send alerts and events
            }
        })));
    }
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for DashboardWebSocket {
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
                // Handle text messages from client
                if let Ok(command) = serde_json::from_str::<DashboardCommand>(&text) {
                    match command {
                        DashboardCommand::Subscribe { topic } => {
                            // Handle subscription request
                            ctx.text(format!("Subscribed to {}", topic));
                        }
                        DashboardCommand::Unsubscribe { topic } => {
                            // Handle unsubscription request
                            ctx.text(format!("Unsubscribed from {}", topic));
                        }
                    }
                }
            }
            Ok(ws::Message::Binary(_)) => {
                // We don't handle binary messages
            }
            Ok(ws::Message::Close(reason)) => {
                // Handle WebSocket close
                ctx.close(reason);
                ctx.stop();
            }
            _ => ctx.stop(),
        }
    }
}

impl DashboardWebSocket {
    /// Sends ping to client and checks for client timeout
    fn hb(&self, ctx: &mut ws::WebsocketContext<Self>) {
        ctx.run_interval(HEARTBEAT_INTERVAL, |act, ctx| {
            // Check client heartbeat
            if Instant::now().duration_since(act.hb) > CLIENT_TIMEOUT {
                // Client timed out
                ctx.stop();
                return;
            }

            // Send ping
            ctx.ping(b"");
        });
    }
}

/// Command sent from the dashboard client
#[derive(Deserialize)]
#[serde(tag = "type")]
enum DashboardCommand {
    /// Subscribe to a topic
    Subscribe {
        /// Topic to subscribe to
        topic: String,
    },
    /// Unsubscribe from a topic
    Unsubscribe {
        /// Topic to unsubscribe from
        topic: String,
    },
}

/// WebSocket handler
async fn ws_dashboard(
    req: HttpRequest,
    stream: web::Payload,
    app_state: web::Data<AppState>,
) -> Result<HttpResponse, Error> {
    // Create WebSocket actor
    let ws = DashboardWebSocket {
        id: 0, // We would generate a unique ID in a real app
        hb: Instant::now(),
        app_state,
    };

    // Start WebSocket connection
    let resp = ws::start(ws, &req, stream)?;
    Ok(resp)
}
```

### Frontend Dashboard

For the dashboard frontend, we'll use a modern JavaScript framework. Here's a simplified React-based dashboard component:

```jsx
// Dashboard.jsx
import React, { useState, useEffect } from "react";
import { LineChart, BarChart, PieChart } from "./Charts";
import { MetricsTable, AlertsTable, EventsTable } from "./Tables";

// Dashboard component
export function Dashboard() {
  const [metrics, setMetrics] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [events, setEvents] = useState([]);
  const [ws, setWs] = useState(null);

  // Initialize WebSocket
  useEffect(() => {
    const socket = new WebSocket(`ws://${window.location.host}/ws`);

    socket.onopen = () => {
      console.log("WebSocket connected");
      // Subscribe to updates
      socket.send(JSON.stringify({ type: "Subscribe", topic: "metrics" }));
      socket.send(JSON.stringify({ type: "Subscribe", topic: "alerts" }));
      socket.send(JSON.stringify({ type: "Subscribe", topic: "events" }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.metrics) {
        setMetrics(data.metrics);
      } else if (data.alerts) {
        setAlerts(data.alerts);
      } else if (data.events) {
        setEvents(data.events);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    setWs(socket);

    // Cleanup on unmount
    return () => {
      socket.close();
    };
  }, []);

  // Fetch initial data
  useEffect(() => {
    // Fetch metrics
    fetch("/api/metrics")
      .then((res) => res.json())
      .then((data) => setMetrics(data.metrics))
      .catch((err) => console.error("Error fetching metrics:", err));

    // Fetch alerts
    fetch("/api/alerts")
      .then((res) => res.json())
      .then((data) => setAlerts(data.alerts))
      .catch((err) => console.error("Error fetching alerts:", err));

    // Fetch events
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch((err) => console.error("Error fetching events:", err));
  }, []);

  return (
    <div className="dashboard">
      <header>
        <h1>RustStream Dashboard</h1>
      </header>

      <div className="dashboard-grid">
        {/* Metrics section */}
        <div className="dashboard-panel">
          <h2>Key Metrics</h2>
          <div className="charts-container">
            <LineChart
              data={metrics.filter((m) => m.name === "events_per_second")}
              title="Events Per Second"
            />
            <BarChart
              data={metrics.filter((m) => m.name === "events_by_type")}
              title="Events by Type"
            />
          </div>
          <MetricsTable metrics={metrics} />
        </div>

        {/* Alerts section */}
        <div className="dashboard-panel">
          <h2>Recent Alerts</h2>
          <AlertsTable alerts={alerts} />
        </div>

        {/* Events section */}
        <div className="dashboard-panel">
          <h2>Recent Events</h2>
          <EventsTable events={events} />
        </div>
      </div>
    </div>
  );
}
```

### Putting It All Together

Finally, let's create a dashboard manager that connects our web API to the real-time processing system:

```rust
/// Manages the dashboard components
pub struct DashboardManager {
    /// Metrics repository
    metrics_repository: SharedMetricsRepository,
    /// Alert history
    alert_history: Arc<RwLock<Vec<Alert>>>,
    /// Event buffer
    event_buffer: Arc<RwLock<VecDeque<Event>>>,
    /// Maximum events to keep in buffer
    max_events: usize,
    /// Maximum alerts to keep in history
    max_alerts: usize,
}

impl DashboardManager {
    /// Creates a new dashboard manager
    pub fn new(
        metrics_repository: SharedMetricsRepository,
        max_events: usize,
        max_alerts: usize,
    ) -> Self {
        Self {
            metrics_repository,
            alert_history: Arc::new(RwLock::new(Vec::new())),
            event_buffer: Arc::new(RwLock::new(VecDeque::with_capacity(max_events))),
            max_events,
            max_alerts,
        }
    }

    /// Starts the dashboard
    pub async fn start(&self, bind_address: &str) -> std::io::Result<()> {
        // Start the dashboard API server
        start_dashboard_api(
            self.metrics_repository.clone(),
            self.alert_history.clone(),
            self.event_buffer.clone(),
            bind_address,
        ).await
    }

    /// Records an event in the buffer
    pub async fn record_event(&self, event: Event) {
        let mut buffer = self.event_buffer.write().await;

        // Add event to buffer
        buffer.push_back(event);

        // Trim buffer if needed
        while buffer.len() > self.max_events {
            buffer.pop_front();
        }
    }

    /// Records an alert in the history
    pub async fn record_alert(&self, alert: Alert) {
        let mut history = self.alert_history.write().await;

        // Add alert to history
        history.push(alert);

        // Sort by timestamp (newest first)
        history.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

        // Trim history if needed
        if history.len() > self.max_alerts {
            history.truncate(self.max_alerts);
        }
    }
}

/// Creates an event sink that records events for the dashboard
pub fn create_dashboard_event_sink(
    dashboard_manager: Arc<DashboardManager>,
) -> impl EventSink {
    DashboardEventSink { dashboard_manager }
}

/// Event sink that records events for the dashboard
struct DashboardEventSink {
    dashboard_manager: Arc<DashboardManager>,
}

#[async_trait]
impl EventSink for DashboardEventSink {
    fn name(&self) -> &str {
        "dashboard_event_sink"
    }

    async fn write(&mut self, event: &Event) -> EventResult<()> {
        self.dashboard_manager.record_event(event.clone()).await;
        Ok(())
    }

    async fn flush(&mut self) -> EventResult<()> {
        // No buffering in this sink
        Ok(())
    }
}

/// Creates an alert sink that records alerts for the dashboard
pub fn create_dashboard_alert_sink(
    dashboard_manager: Arc<DashboardManager>,
) -> impl AlertSink {
    DashboardAlertSink { dashboard_manager }
}

/// Alert sink that records alerts for the dashboard
struct DashboardAlertSink {
    dashboard_manager: Arc<DashboardManager>,
}

#[async_trait]
impl AlertSink for DashboardAlertSink {
    async fn send_alert(&self, anomaly: &AnomalyEvent) -> EventResult<()> {
        // Create an alert from the anomaly
        let alert = Alert::new(
            &format!("Anomaly detected in metric '{}'", anomaly.metric_name),
            &format!(
                "The metric '{}' has an anomalous value of {}",
                anomaly.metric_name, anomaly.current_value
            ),
            AlertSeverity::Warning,
            "anomaly_detector",
        );

        // Record the alert
        self.dashboard_manager.record_alert(alert).await;

        Ok(())
    }
}
```

With these components, we've created a complete web-based dashboard for our RustStream system. The dashboard provides real-time visualizations of metrics, alerts, and events, allowing users to monitor and understand the data flowing through the system.

In the next section, we'll implement high availability and fault tolerance features to ensure our system remains reliable in production environments.

## High Availability and Fault Tolerance

Real-time data processing systems must be highly available and resilient to failures. Let's implement strategies to ensure our RustStream system can operate reliably in production environments.

### Distributed Cluster Management

To support multiple nodes working together, we'll implement a simple cluster management system:

```rust
use tokio::sync::mpsc;
use tokio::time::{self, Duration};
use std::collections::HashMap;

/// Status of a cluster node
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum NodeStatus {
    /// Node is starting up
    Starting,
    /// Node is active and processing data
    Active,
    /// Node is shutting down
    ShuttingDown,
    /// Node has failed
    Failed,
}

/// Information about a cluster node
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeInfo {
    /// Node ID
    pub id: String,
    /// Node address
    pub address: String,
    /// Node status
    pub status: NodeStatus,
    /// When the node was last seen
    pub last_heartbeat: DateTime<Utc>,
    /// Node capabilities and roles
    pub roles: Vec<String>,
}

/// Event related to cluster membership
#[derive(Debug, Clone)]
pub enum ClusterEvent {
    /// Node joined the cluster
    NodeJoined(NodeInfo),
    /// Node left the cluster
    NodeLeft(String),
    /// Node failed
    NodeFailed(String),
    /// Node status changed
    NodeStatusChanged(String, NodeStatus),
}

/// Manages a cluster of stream processing nodes
pub struct ClusterManager {
    /// Node ID for this node
    node_id: String,
    /// Information about this node
    node_info: NodeInfo,
    /// Known cluster nodes
    nodes: HashMap<String, NodeInfo>,
    /// Cluster event subscribers
    subscribers: Vec<mpsc::Sender<ClusterEvent>>,
    /// Leader election service
    leader_election: Option<Box<dyn LeaderElection>>,
}

/// Service for leader election
#[async_trait]
pub trait LeaderElection: Send + Sync {
    /// Attempts to become the leader
    async fn try_become_leader(&self) -> bool;

    /// Checks if this node is the leader
    async fn is_leader(&self) -> bool;

    /// Relinquishes leadership
    async fn resign_leadership(&self) -> Result<(), &'static str>;
}

impl ClusterManager {
    /// Creates a new cluster manager
    pub fn new(
        node_id: &str,
        address: &str,
        roles: Vec<String>,
    ) -> Self {
        let node_info = NodeInfo {
            id: node_id.to_string(),
            address: address.to_string(),
            status: NodeStatus::Starting,
            last_heartbeat: Utc::now(),
            roles,
        };

        let mut nodes = HashMap::new();
        nodes.insert(node_id.to_string(), node_info.clone());

        Self {
            node_id: node_id.to_string(),
            node_info,
            nodes,
            subscribers: Vec::new(),
            leader_election: None,
        }
    }

    /// Sets the leader election service
    pub fn with_leader_election<L>(&mut self, leader_election: L) -> &mut Self
    where
        L: LeaderElection + 'static,
    {
        self.leader_election = Some(Box::new(leader_election));
        self
    }

    /// Starts the cluster manager
    pub async fn start(&mut self) -> EventResult<mpsc::Receiver<ClusterEvent>> {
        // Create channel for cluster events
        let (tx, rx) = mpsc::channel(100);
        self.subscribers.push(tx);

        // Set node as active
        self.node_info.status = NodeStatus::Active;
        self.notify_status_change().await;

        // Start heartbeat task
        let node_id = self.node_id.clone();
        let nodes = self.nodes.clone();
        let subscribers = self.subscribers.clone();

        tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_secs(5));

            loop {
                interval.tick().await;

                // Update own heartbeat
                if let Some(node) = nodes.get_mut(&node_id) {
                    node.last_heartbeat = Utc::now();
                }

                // Check for failed nodes
                let now = Utc::now();
                let failed_nodes: Vec<_> = nodes.iter()
                    .filter(|(id, node)| {
                        id != &node_id &&
                        node.status == NodeStatus::Active &&
                        now.signed_duration_since(node.last_heartbeat).num_seconds() > 15
                    })
                    .map(|(id, _)| id.clone())
                    .collect();

                // Notify about failed nodes
                for id in failed_nodes {
                    if let Some(node) = nodes.get_mut(&id) {
                        node.status = NodeStatus::Failed;

                        // Notify subscribers
                        let event = ClusterEvent::NodeFailed(id.clone());
                        for sub in &subscribers {
                            let _ = sub.send(event.clone()).await;
                        }
                    }
                }
            }
        });

        Ok(rx)
    }

    /// Adds a node to the cluster
    pub async fn add_node(&mut self, node: NodeInfo) -> Result<(), &'static str> {
        // Check if node already exists
        if let Some(existing) = self.nodes.get(&node.id) {
            if existing.status != NodeStatus::Failed {
                return Err("Node already exists in the cluster");
            }
        }

        // Add node
        self.nodes.insert(node.id.clone(), node.clone());

        // Notify subscribers
        let event = ClusterEvent::NodeJoined(node);
        for sub in &self.subscribers {
            let _ = sub.send(event.clone()).await;
        }

        Ok(())
    }

    /// Removes a node from the cluster
    pub async fn remove_node(&mut self, node_id: &str) -> Result<(), &'static str> {
        // Check if node exists
        if !self.nodes.contains_key(node_id) {
            return Err("Node not found in the cluster");
        }

        // Remove node
        self.nodes.remove(node_id);

        // Notify subscribers
        let event = ClusterEvent::NodeLeft(node_id.to_string());
        for sub in &self.subscribers {
            let _ = sub.send(event.clone()).await;
        }

        Ok(())
    }

    /// Updates node status
    pub async fn update_status(&mut self, status: NodeStatus) -> Result<(), &'static str> {
        // Update status
        self.node_info.status = status;

        if let Some(node) = self.nodes.get_mut(&self.node_id) {
            node.status = status;
        }

        // Notify subscribers
        self.notify_status_change().await;

        Ok(())
    }

    /// Notifies subscribers about a status change
    async fn notify_status_change(&self) {
        let event = ClusterEvent::NodeStatusChanged(
            self.node_id.clone(),
            self.node_info.status.clone(),
        );

        for sub in &self.subscribers {
            let _ = sub.send(event.clone()).await;
        }
    }

    /// Checks if this node is the leader
    pub async fn is_leader(&self) -> bool {
        if let Some(ref leader_election) = self.leader_election {
            leader_election.is_leader().await
        } else {
            // Default to true if no leader election service
            true
        }
    }

    /// Attempts to become the leader
    pub async fn try_become_leader(&self) -> bool {
        if let Some(ref leader_election) = self.leader_election {
            leader_election.try_become_leader().await
        } else {
            // Default to true if no leader election service
            true
        }
    }
}
```

### State Replication

For fault tolerance, we need to replicate state between nodes:

```rust
/// Replicates state between nodes
pub struct StateReplicator<T> {
    /// State to replicate
    state: Arc<RwLock<T>>,
    /// Cluster manager
    cluster_manager: Arc<RwLock<ClusterManager>>,
    /// Replication topic
    topic: String,
}

impl<T> StateReplicator<T>
where
    T: Clone + Send + Sync + Serialize + for<'de> Deserialize<'de> + 'static,
{
    /// Creates a new state replicator
    pub fn new(
        state: Arc<RwLock<T>>,
        cluster_manager: Arc<RwLock<ClusterManager>>,
        topic: &str,
    ) -> Self {
        Self {
            state,
            cluster_manager,
            topic: topic.to_string(),
        }
    }

    /// Starts the state replicator
    pub async fn start(&self, kafka_brokers: &str) -> EventResult<()> {
        // Producer for sending state updates
        let producer: FutureProducer = ClientConfig::new()
            .set("bootstrap.servers", kafka_brokers)
            .set("message.timeout.ms", "5000")
            .create()
            .map_err(|e| EventError::Connection(format!("Kafka producer error: {}", e)))?;

        // Consumer for receiving state updates
        let consumer: StreamConsumer = ClientConfig::new()
            .set("bootstrap.servers", kafka_brokers)
            .set("group.id", "state_replicator")
            .set("enable.auto.commit", "true")
            .set("auto.offset.reset", "latest")
            .create()
            .map_err(|e| EventError::Connection(format!("Kafka consumer error: {}", e)))?;

        consumer
            .subscribe(&[&self.topic])
            .map_err(|e| EventError::Connection(format!("Kafka subscription error: {}", e)))?;

        // Start consumer task
        let state = self.state.clone();
        let cluster_manager = self.cluster_manager.clone();

        tokio::spawn(async move {
            loop {
                match consumer.recv().await {
                    Ok(msg) => {
                        // Process message
                        if let Some(payload) = msg.payload() {
                            // Deserialize state
                            if let Ok(new_state) = serde_json::from_slice::<T>(payload) {
                                // Only update if this node is not the leader
                                let is_leader = {
                                    let cm = cluster_manager.read().await;
                                    cm.is_leader().await
                                };

                                if !is_leader {
                                    // Update state
                                    let mut state_guard = state.write().await;
                                    *state_guard = new_state;
                                }
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Error receiving state update: {}", e);
                    }
                }
            }
        });

        // Start producer task for leader
        let state = self.state.clone();
        let cluster_manager = self.cluster_manager.clone();
        let topic = self.topic.clone();
        let producer_clone = producer.clone();

        tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_secs(5));

            loop {
                interval.tick().await;

                // Only replicate if this node is the leader
                let is_leader = {
                    let cm = cluster_manager.read().await;
                    cm.is_leader().await
                };

                if is_leader {
                    // Replicate state
                    let current_state = {
                        let state_guard = state.read().await;
                        state_guard.clone()
                    };

                    // Serialize state
                    if let Ok(payload) = serde_json::to_vec(&current_state) {
                        // Send to Kafka
                        let record = FutureRecord::to(&topic)
                            .payload(&payload);

                        if let Err((e, _)) = producer_clone.send(record, Duration::from_secs(5)).await {
                            eprintln!("Error replicating state: {}", e);
                        }
                    }
                }
            }
        });

        Ok(())
    }
}
```

### Checkpointing and Recovery

To enable recovery from failures, let's implement checkpointing:

```rust
/// Manages checkpoints for recovery
pub struct CheckpointManager {
    /// Path to checkpoint directory
    checkpoint_dir: String,
    /// Checkpoint interval
    interval: Duration,
    /// Services to checkpoint
    services: Vec<Box<dyn Checkpointable>>,
}

/// Service that can be checkpointed
#[async_trait]
pub trait Checkpointable: Send + Sync {
    /// Returns the service name
    fn name(&self) -> &str;

    /// Creates a checkpoint
    async fn create_checkpoint(&self) -> Result<Vec<u8>, &'static str>;

    /// Restores from a checkpoint
    async fn restore_checkpoint(&mut self, data: &[u8]) -> Result<(), &'static str>;
}

impl CheckpointManager {
    /// Creates a new checkpoint manager
    pub fn new(checkpoint_dir: &str, interval: Duration) -> Self {
        Self {
            checkpoint_dir: checkpoint_dir.to_string(),
            interval,
            services: Vec::new(),
        }
    }

    /// Adds a service to checkpoint
    pub fn add_service<S>(&mut self, service: S) -> &mut Self
    where
        S: Checkpointable + 'static,
    {
        self.services.push(Box::new(service));
        self
    }

    /// Starts the checkpoint manager
    pub async fn start(&self) -> std::io::Result<()> {
        // Create checkpoint directory if it doesn't exist
        tokio::fs::create_dir_all(&self.checkpoint_dir).await?;

        // Start checkpoint task
        let services = self.services.clone();
        let checkpoint_dir = self.checkpoint_dir.clone();
        let interval = self.interval;

        tokio::spawn(async move {
            let mut checkpoint_interval = time::interval(interval);

            loop {
                checkpoint_interval.tick().await;

                // Create checkpoint for each service
                for service in &services {
                    let name = service.name();

                    match service.create_checkpoint().await {
                        Ok(data) => {
                            // Write checkpoint to file
                            let path = format!("{}/{}.checkpoint", checkpoint_dir, name);
                            if let Err(e) = tokio::fs::write(&path, &data).await {
                                eprintln!("Error writing checkpoint for {}: {}", name, e);
                            }
                        }
                        Err(e) => {
                            eprintln!("Error creating checkpoint for {}: {}", name, e);
                        }
                    }
                }
            }
        });

        Ok(())
    }

    /// Restores services from checkpoints
    pub async fn restore_services(&mut self) -> std::io::Result<()> {
        for service in &mut self.services {
            let name = service.name();
            let path = format!("{}/{}.checkpoint", self.checkpoint_dir, name);

            // Check if checkpoint exists
            if tokio::fs::metadata(&path).await.is_ok() {
                // Read checkpoint
                let data = tokio::fs::read(&path).await?;

                // Restore service
                if let Err(e) = service.restore_checkpoint(&data).await {
                    eprintln!("Error restoring checkpoint for {}: {}", name, e);
                } else {
                    println!("Restored checkpoint for {}", name);
                }
            }
        }

        Ok(())
    }
}

/// Implementation of Checkpointable for MetricsRepository
impl Checkpointable for MetricsRepository {
    fn name(&self) -> &str {
        "metrics_repository"
    }

    async fn create_checkpoint(&self) -> Result<Vec<u8>, &'static str> {
        // Serialize metrics
        let metrics: Vec<_> = self.get_all().collect();
        serde_json::to_vec(&metrics)
            .map_err(|_| "Failed to serialize metrics")
    }

    async fn restore_checkpoint(&mut self, data: &[u8]) -> Result<(), &'static str> {
        // Deserialize metrics
        let metrics: Vec<Metric> = serde_json::from_slice(data)
            .map_err(|_| "Failed to deserialize metrics")?;

        // Restore metrics
        for metric in metrics {
            self.update(metric);
        }

        Ok(())
    }
}
```

With these components, our RustStream system is now fault-tolerant and can continue operating even if individual nodes fail. The leader election ensures that critical operations have a single coordinator, while state replication and checkpointing allow the system to recover from failures.

## Deployment and Performance Tuning

Now that we've built a complete real-time data processing system, let's discuss how to deploy it in production and optimize its performance.

### Docker Containerization

For easy deployment, let's containerize our application:

```dockerfile
# Dockerfile
FROM rust:1.59 as builder

# Create app directory
WORKDIR /usr/src/app

# Copy manifests
COPY Cargo.toml Cargo.toml
COPY Cargo.lock Cargo.lock

# Copy source code
COPY src/ src/

# Build the application
RUN cargo build --release

# Runtime stage
FROM debian:bullseye-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy the binary
COPY --from=builder /usr/src/app/target/release/ruststream /usr/local/bin/

# Create data directory
RUN mkdir -p /data/checkpoints

# Set environment variables
ENV RUST_LOG=info

# Expose ports
EXPOSE 8080 8081

# Run the application
CMD ["ruststream"]
```

### Kubernetes Deployment

For production environments, Kubernetes provides robust orchestration:

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ruststream
  labels:
    app: ruststream
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ruststream
  serviceName: ruststream
  template:
    metadata:
      labels:
        app: ruststream
    spec:
      containers:
        - name: ruststream
          image: ruststream:latest
          ports:
            - containerPort: 8080
              name: http
            - containerPort: 8081
              name: metrics
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: KAFKA_BROKERS
              value: "kafka-0.kafka-headless:9092,kafka-1.kafka-headless:9092"
            - name: CHECKPOINT_DIR
              value: "/data/checkpoints"
          volumeMounts:
            - name: data
              mountPath: /data
          resources:
            limits:
              cpu: "1"
              memory: "1Gi"
            requests:
              cpu: "500m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

### Performance Tuning

To optimize our system's performance, we should focus on these areas:

1. **Memory Management**

   - Use appropriate buffer sizes for channels and queues
   - Implement backpressure mechanisms to handle load spikes
   - Monitor and tune garbage collection

2. **Concurrency Optimization**

   - Adjust thread pool sizes based on workload and hardware
   - Use work-stealing schedulers for balanced load distribution
   - Minimize lock contention with fine-grained locking

3. **Network Efficiency**

   - Batch messages to reduce overhead
   - Use connection pooling for external services
   - Implement compression for large payloads

4. **Serialization Performance**

   - Use efficient binary formats (e.g., Protocol Buffers, FlatBuffers)
   - Implement zero-copy deserialization where possible
   - Cache parsed objects to avoid repeated parsing

5. **Database Tuning**

   - Optimize queries and indexes
   - Use connection pooling
   - Implement caching layers

6. **Monitoring and Profiling**
   - Use continuous profiling to identify bottlenecks
   - Implement detailed metrics for all components
   - Set up alerts for performance degradation

By applying these optimization techniques, we can ensure that our RustStream system delivers the low-latency, high-throughput performance required for real-time data processing applications.

## Conclusion

In this chapter, we've built a comprehensive real-time data processing system from the ground up using Rust. Our RustStream platform demonstrates how to collect, process, analyze, and visualize streaming data with minimal latency while maintaining reliability and fault tolerance.

We've implemented several key components:

1. **Event Model and Core Processing Engine**: A flexible, composable stream processing framework
2. **Event Sources and Sinks**: Adapters for connecting to various external systems
3. **Analytics Engine**: Real-time metrics calculation, anomaly detection, and pattern recognition
4. **Alerting System**: Flexible rules-based alerting with multiple notification channels
5. **Dashboard**: Web-based visualization of real-time data and insights
6. **High Availability Features**: Clustering, state replication, and fault recovery

The RustStream system we've created is not only educational but also practical. The patterns and components we've developed can be applied to real-world streaming use cases such as:

- Real-time analytics for web applications
- IoT sensor data processing
- Financial market data analysis
- Network monitoring and security
- User behavior tracking
- Operational metrics and alerting

Rust's combination of performance, safety, and expressive type system makes it an excellent choice for building such systems. The language allows us to create efficient, concurrent code without sacrificing reliability—a critical requirement for production data processing applications.

As you continue your journey with Rust and real-time systems, consider exploring these advanced topics:

- Stream processing with machine learning for predictive analytics
- Advanced state management techniques like event sourcing
- Geo-distributed stream processing for global applications
- Custom DSLs for stream processing operations
- Specialized hardware acceleration for stream processing

The skills you've developed in this chapter provide a solid foundation for tackling these and other challenges in the rapidly evolving field of real-time data processing.
