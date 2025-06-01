# Chapter 44: Production-Ready Rust

## Introduction

Building robust, reliable software is one thing; preparing it for production environments is another challenge entirely. Production environments introduce a host of considerations beyond functional correctness: performance under load, handling failures gracefully, monitoring system health, securing against attacks, and scaling to meet demand.

Rust's focus on reliability, performance, and safety makes it an excellent choice for production systems. However, taking a Rust application from development to production requires understanding both Rust-specific considerations and general production best practices.

In this chapter, we'll explore the journey of deploying Rust applications to production environments. We'll cover containerization, orchestration, monitoring, security, and more. By the end, you'll have a comprehensive understanding of what it takes to make your Rust applications production-ready.

## Deployment Strategies

Before diving into specific technologies, let's discuss deployment strategies. The way you deploy your application can significantly impact its reliability, performance, and maintainability.

### Traditional Deployment

Traditional deployment involves installing your application directly on servers:

```bash
# Build the release binary
cargo build --release

# Copy to server
scp target/release/my_app user@server:/usr/local/bin/

# Set up systemd service
cat > /etc/systemd/system/my_app.service << EOF
[Unit]
Description=My Rust Application
After=network.target

[Service]
ExecStart=/usr/local/bin/my_app
Restart=on-failure
User=appuser
Environment=RUST_LOG=info

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl enable my_app
systemctl start my_app
```

**Advantages:**

- Simple setup
- Direct access to system resources
- No containerization overhead

**Disadvantages:**

- Environment consistency challenges
- Harder to scale
- Manual dependency management

### Blue-Green Deployment

Blue-green deployment maintains two identical environments (blue and green). At any time, one environment is live and serving production traffic, while the other is idle:

1. Deploy the new version to the idle environment
2. Test the new deployment
3. Switch traffic from the active environment to the idle one
4. The previously active environment becomes idle for the next deployment

**Advantages:**

- Minimal downtime
- Easy rollback
- Testing in a production-like environment

**Disadvantages:**

- Requires twice the resources
- More complex setup

### Canary Deployment

Canary deployment gradually shifts traffic from the old version to the new version:

1. Deploy the new version alongside the old version
2. Route a small percentage of traffic to the new version
3. Monitor for issues
4. Gradually increase traffic to the new version
5. Once confident, route all traffic to the new version

**Advantages:**

- Reduced risk
- Early detection of issues
- Fine-grained control over the rollout

**Disadvantages:**

- More complex traffic routing
- Requires sophisticated monitoring

### Implementing Deployment Strategies in Rust

Regardless of the deployment strategy you choose, your Rust application should be designed to support it. Here are some considerations:

#### Configuration Management

Your application should load configuration from the environment or configuration files, making it easy to deploy the same binary to different environments:

```rust
use config::{Config, ConfigError, Environment, File};
use serde::Deserialize;
use std::env;

#[derive(Debug, Deserialize)]
struct Settings {
    debug: bool,
    database_url: String,
    port: u16,
}

impl Settings {
    pub fn new() -> Result<Self, ConfigError> {
        let run_mode = env::var("RUN_MODE").unwrap_or_else(|_| "development".into());

        let s = Config::builder()
            // Start with default values
            .set_default("debug", false)?
            .set_default("port", 8080)?
            // Add configuration from file
            .add_source(File::with_name("config/default"))
            .add_source(File::with_name(&format!("config/{}", run_mode)).required(false))
            // Add environment variables with prefix "APP_"
            .add_source(Environment::with_prefix("APP").separator("_"))
            .build()?;

        // Deserialize the configuration
        s.try_deserialize()
    }
}
```

#### Health Checks

Implement health checks to allow deployment tools to verify your application is running correctly:

```rust
use warp::{Filter, Rejection, Reply};

async fn health_check() -> Result<impl Reply, Rejection> {
    // Verify database connection, external services, etc.
    // Return appropriate status code based on health status
    Ok("OK")
}

#[tokio::main]
async fn main() {
    // Set up routes
    let health_route = warp::path("health")
        .and(warp::get())
        .and_then(health_check);

    // Start the server
    warp::serve(health_route)
        .run(([0, 0, 0, 0], 8080))
        .await;
}
```

#### Graceful Shutdown

Ensure your application can shut down gracefully, completing in-progress work:

```rust
use tokio::signal;
use std::sync::Arc;
use tokio::sync::Notify;

#[tokio::main]
async fn main() {
    // Create a shutdown signal
    let shutdown = Arc::new(Notify::new());
    let shutdown_clone = shutdown.clone();

    // Spawn a task to listen for Ctrl+C
    tokio::spawn(async move {
        signal::ctrl_c().await.expect("Failed to listen for ctrl+c");
        println!("Shutdown signal received, initiating graceful shutdown");
        shutdown_clone.notify_one();
    });

    // Start your server with a handle to shutdown
    let server_handle = tokio::spawn(run_server(shutdown.clone()));

    // Wait for shutdown signal
    shutdown.notified().await;

    // Wait for server to shut down
    server_handle.await.expect("Server task failed");
    println!("Server shut down gracefully");
}

async fn run_server(shutdown: Arc<Notify>) {
    // Your server logic here
    // When shutdown.notified().await is triggered, gracefully shut down
    // For example, stop accepting new connections but finish existing ones
}
```

#### Feature Flags

Use Cargo's feature flags to build different versions of your application for different environments:

```toml
# Cargo.toml
[features]
default = ["json_logs"]
json_logs = ["dep:serde_json"]
metrics = ["dep:prometheus"]
```

```rust
#[cfg(feature = "json_logs")]
fn setup_logging() {
    // Setup JSON logging
}

#[cfg(not(feature = "json_logs"))]
fn setup_logging() {
    // Setup plain text logging
}
```

By designing your application with these considerations in mind, you'll be well-equipped to implement any deployment strategy that fits your needs.

## Containerization with Docker

Containers have revolutionized deployment by packaging applications with their dependencies in a consistent, isolated environment. Docker is the most popular containerization platform, and it works exceptionally well with Rust applications.

### Creating a Dockerfile for Rust

A Dockerfile is a script of instructions for building a Docker image. Here's a multi-stage Dockerfile for a Rust application:

```dockerfile
# Builder stage
FROM rust:1.70 as builder
WORKDIR /usr/src/app
COPY Cargo.toml Cargo.lock ./
# Create a dummy main.rs to cache dependencies
RUN mkdir -p src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
# Now build the actual application
COPY . .
RUN touch src/main.rs && cargo build --release

# Runtime stage
FROM debian:bullseye-slim
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/src/app/target/release/my_app /usr/local/bin/my_app
ENV RUST_LOG=info
EXPOSE 8080
CMD ["my_app"]
```

This Dockerfile uses a multi-stage build to:

1. Build the application in the `builder` stage
2. Copy only the compiled binary to a slim runtime image
3. Configure runtime environment variables and expose ports

### Optimizing Docker Images for Rust

Rust's static binaries make it a perfect candidate for creating minimal Docker images:

```dockerfile
FROM rust:1.70 as builder
WORKDIR /usr/src/app
COPY . .
RUN cargo build --release

# Use a minimal image for the runtime
FROM scratch
COPY --from=builder /usr/src/app/target/release/my_app /my_app
EXPOSE 8080
CMD ["/my_app"]
```

The `scratch` image is completely empty, resulting in a Docker image that only contains your Rust binary. However, there are some caveats:

- Your binary must be statically linked (no dynamic libraries)
- You won't have access to any system utilities or libraries
- SSL certificates and timezone data won't be available

A more practical minimal image is Alpine Linux:

```dockerfile
FROM rust:1.70-alpine as builder
WORKDIR /usr/src/app
# Install build dependencies
RUN apk add --no-cache musl-dev
COPY . .
RUN cargo build --release

FROM alpine:3.18
RUN apk add --no-cache ca-certificates
COPY --from=builder /usr/src/app/target/release/my_app /usr/local/bin/my_app
EXPOSE 8080
CMD ["my_app"]
```

Alpine Linux uses musl libc, which is compatible with Rust's standard library. The resulting image is typically around 10-20MB.

### Docker Compose for Local Development

Docker Compose is a tool for defining and running multi-container Docker applications. It's particularly useful for local development with dependencies like databases:

```yaml
# docker-compose.yml
version: "3"
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://postgres:password@db:5432/mydb
      - RUST_LOG=debug
    depends_on:
      - db

  db:
    image: postgres:14
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_USER=postgres
      - POSTGRES_DB=mydb
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

To use this setup:

```bash
# Start the entire stack
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop everything
docker-compose down
```

### Building Efficient Docker Images for Rust

Here are some best practices for Rust Docker images:

1. **Use build caching effectively**: Structure your Dockerfile to maximize caching of dependency compilation
2. **Multi-stage builds**: Use separate stages for building and running
3. **Minimize image size**: Only include what's necessary in the final image
4. **Consider distroless images**: Images like `gcr.io/distroless/cc` provide minimal runtime dependencies
5. **Pin exact versions**: Use specific versions of base images to avoid surprises

#### Example: Optimized Rust Dockerfile with Cargo Chef

[Cargo Chef](https://github.com/LukeMathWalker/cargo-chef) is a tool for optimizing Rust Docker builds:

```dockerfile
FROM lukemathwalker/cargo-chef:latest-rust-1.70 as chef
WORKDIR /app
RUN apt update && apt install lld clang -y

FROM chef as planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef as builder
COPY --from=planner /app/recipe.json recipe.json
# Build dependencies - this is the caching layer
RUN cargo chef cook --release --recipe-path recipe.json
# Build application
COPY . .
RUN cargo build --release --bin my_app

FROM debian:bullseye-slim AS runtime
WORKDIR /app
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends ca-certificates \
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/my_app my_app
EXPOSE 8080
ENTRYPOINT ["./my_app"]
```

This setup:

1. Uses cargo-chef to separate dependency compilation from application compilation
2. Greatly improves build times for iterative development
3. Produces a minimal runtime image

## Orchestration with Kubernetes

While Docker provides containerization, Kubernetes offers container orchestration—automating deployment, scaling, and management of containerized applications. Kubernetes is particularly valuable for production Rust applications that need to scale horizontally or have complex deployment requirements.

### Kubernetes Basics

Kubernetes organizes containers into Pods, which are the smallest deployable units. Pods are managed by Controllers like Deployments, which ensure the desired number of Pod replicas are running.

Here's a simple Kubernetes Deployment for a Rust application:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rust-app
  labels:
    app: rust-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rust-app
  template:
    metadata:
      labels:
        app: rust-app
    spec:
      containers:
        - name: rust-app
          image: myregistry/rust-app:v1.0.0
          ports:
            - containerPort: 8080
          env:
            - name: RUST_LOG
              value: "info"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
          resources:
            limits:
              cpu: "1"
              memory: "512Mi"
            requests:
              cpu: "500m"
              memory: "256Mi"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
```

This configuration:

1. Creates three replicas of the application
2. Sets environment variables, including a secret for the database URL
3. Defines resource requirements
4. Configures health checks to determine if the container is alive and ready to serve traffic

To expose the application, you'd also create a Service:

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: rust-app
spec:
  selector:
    app: rust-app
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

### Implementing Kubernetes Patterns for Rust Applications

#### Init Containers

Init containers run before your application container and can be useful for database migrations or other setup tasks:

```yaml
spec:
  initContainers:
    - name: run-migrations
      image: myregistry/rust-migrations:v1.0.0
      env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
      command: ["./run-migrations"]
  containers:
    - name: rust-app
      # ...
```

You could implement the migrations container with Rust:

```rust
// migrations/src/main.rs
use sqlx::postgres::PgPoolOptions;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    println!("Migrations completed successfully");
    Ok(())
}
```

#### Resource Management

Rust applications are known for their efficiency, but proper resource configuration is still important. Start by benchmarking your application to understand its resource needs, then set appropriate requests and limits:

```yaml
resources:
  limits:
    cpu: "1"
    memory: "512Mi"
  requests:
    cpu: "500m"
    memory: "256Mi"
```

#### Graceful Shutdown

Kubernetes sends SIGTERM to containers before shutting them down, followed by SIGKILL if they don't terminate within the grace period. Your Rust application should handle SIGTERM to shut down gracefully:

```rust
use tokio::signal;

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    println!("Shutdown signal received, starting graceful shutdown");
}
```

### Helm Charts for Rust Applications

[Helm](https://helm.sh/) is a package manager for Kubernetes that simplifies deployment. A Helm chart bundles all the Kubernetes resources your application needs:

```
my-rust-app/
├── Chart.yaml
├── values.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── configmap.yaml
    └── secrets.yaml
```

The templates use variables from `values.yaml`, making it easy to deploy the same application to different environments:

```yaml
# values.yaml
replicaCount: 3

image:
  repository: myregistry/rust-app
  tag: v1.0.0
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

resources:
  limits:
    cpu: 1
    memory: 512Mi
  requests:
    cpu: 500m
    memory: 256Mi

environment:
  RUST_LOG: info
```

### Implementing Kubernetes Operators in Rust

Kubernetes Operators extend Kubernetes to manage application-specific operations. You can write operators in Rust using the [kube-rs](https://github.com/kube-rs/kube-rs) library:

```rust
use kube::{
    api::{Api, ListParams, Patch, PatchParams},
    Client, CustomResource,
};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use k8s_openapi::api::apps::v1::Deployment;
use futures::StreamExt;
use std::sync::Arc;

#[derive(CustomResource, Serialize, Deserialize, Debug, Clone, JsonSchema)]
#[kube(
    group = "example.com",
    version = "v1",
    kind = "MyApp",
    plural = "myapps",
    namespaced
)]
struct MyAppSpec {
    replicas: i32,
    image: String,
    version: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize the Kubernetes client
    let client = Client::try_default().await?;

    // Get a namespace-specific MyApp API
    let myapps: Api<MyApp> = Api::namespaced(client.clone(), "default");

    // Watch for changes to MyApp resources
    let watcher = myapps.watch(&ListParams::default(), "0").await?;
    let mut stream = watcher.boxed();

    while let Some(event) = stream.next().await {
        match event {
            Ok(event) => {
                // Process the event (created, modified, deleted)
                // ...
            }
            Err(e) => {
                eprintln!("Error watching MyApp: {}", e);
            }
        }
    }

    Ok(())
}
```

## Monitoring and Observability

Monitoring is essential for understanding the health and performance of your application in production. Observability goes a step further, providing insights into the internal state of your application through external outputs.

### Metrics Collection

Metrics provide quantitative information about your application's performance and behavior. In Rust, you can use libraries like `prometheus` to collect and expose metrics:

```rust
use prometheus::{Encoder, Registry, TextEncoder};
use prometheus::{Counter, Gauge, Histogram, HistogramOpts, Opts};
use warp::{Filter, Rejection, Reply};

fn metrics_endpoint(registry: Registry) -> impl Filter<Extract = impl Reply, Error = Rejection> + Clone {
    warp::path("metrics").map(move || {
        let encoder = TextEncoder::new();
        let metric_families = registry.gather();
        let mut buffer = vec![];
        encoder.encode(&metric_families, &mut buffer).unwrap();
        String::from_utf8(buffer).unwrap()
    })
}

fn main() {
    // Create a registry to store metrics
    let registry = Registry::new();

    // Create metrics
    let request_counter = Counter::with_opts(Opts::new(
        "http_requests_total",
        "Total number of HTTP requests",
    )).unwrap();

    let response_time = Histogram::with_opts(HistogramOpts::new(
        "http_response_time_seconds",
        "HTTP response time in seconds",
    )).unwrap();

    let active_connections = Gauge::with_opts(Opts::new(
        "http_active_connections",
        "Number of active HTTP connections",
    )).unwrap();

    // Register metrics with the registry
    registry.register(Box::new(request_counter.clone())).unwrap();
    registry.register(Box::new(response_time.clone())).unwrap();
    registry.register(Box::new(active_connections.clone())).unwrap();

    // Set up routes
    let metrics_route = metrics_endpoint(registry);

    // Start the server
    warp::serve(metrics_route)
        .run(([0, 0, 0, 0], 8080));
}
```

### Logging Best Practices

Effective logging provides visibility into your application's behavior. Here are some best practices for logging in Rust:

1. **Use Structured Logging**: Use structured logs to make them machine-parseable

```rust
use slog::{debug, error, info, o, Drain, Logger};

fn setup_logger() -> Logger {
    let decorator = slog_term::TermDecorator::new().build();
    let drain = slog_term::FullFormat::new(decorator).build().fuse();
    let drain = slog_async::Async::new(drain).build().fuse();

    slog::Logger::root(drain, o!(
        "version" => env!("CARGO_PKG_VERSION"),
        "environment" => std::env::var("ENVIRONMENT").unwrap_or_else(|_| "development".into())
    ))
}

fn main() {
    let logger = setup_logger();

    info!(logger, "Application starting";
          "database_url" => std::env::var("DATABASE_URL").unwrap_or_default());

    // Later in the code
    debug!(logger, "Processing request";
           "request_id" => "abc123", "user_id" => 42);

    // Error handling
    if let Err(e) = some_operation() {
        error!(logger, "Operation failed";
               "error" => %e, "context" => "during startup");
    }
}
```

2. **Use Log Levels Appropriately**: Choose the right log level for each message

```rust
// ERROR: Something has gone wrong that requires immediate attention
error!(logger, "Failed to connect to database"; "error" => %e);

// WARN: Something unexpected happened but doesn't require immediate action
warn!(logger, "Retrying database connection"; "attempt" => 3);

// INFO: Normal operational messages useful for regular monitoring
info!(logger, "Processing batch complete"; "items" => 100);

// DEBUG: Detailed information useful for debugging
debug!(logger, "Query execution plan"; "plan" => ?plan);

// TRACE: Very detailed information, usually only enabled during development
trace!(logger, "Variable values"; "x" => x, "y" => y);
```

3. **Include Context in Logs**: Add relevant context to make logs useful

```rust
fn process_request(req: Request, logger: &Logger) -> Result<Response, Error> {
    // Create a child logger with request-specific context
    let req_logger = logger.new(o!(
        "request_id" => req.id().to_string(),
        "user_id" => req.user_id(),
        "endpoint" => req.path().to_string()
    ));

    info!(req_logger, "Processing request");

    // Rest of the function
    match do_something(&req) {
        Ok(result) => {
            info!(req_logger, "Request processed successfully";
                  "response_time_ms" => 42);
            Ok(Response::new(result))
        },
        Err(e) => {
            error!(req_logger, "Request processing failed";
                   "error" => %e);
            Err(e)
        }
    }
}
```

## Advanced Monitoring and Observability Patterns

Beyond basic monitoring and logging, advanced patterns can provide deeper insights into your application's behavior and health.

### Red-Black Deployments with Metrics Validation

Implement automated canary analysis in your deployment process:

```rust
use prometheus::Counter;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::time::sleep;

// A simplified canary analysis service
struct CanaryAnalysis {
    success_counter: Counter,
    error_counter: Counter,
    latency_p95: Arc<tokio::sync::Mutex<Vec<Duration>>>,
    baseline_error_rate: f64,
    baseline_latency_p95: Duration,
}

impl CanaryAnalysis {
    fn new(
        success_counter: Counter,
        error_counter: Counter,
        baseline_error_rate: f64,
        baseline_latency_p95: Duration,
    ) -> Self {
        Self {
            success_counter,
            error_counter,
            latency_p95: Arc::new(tokio::sync::Mutex::new(Vec::new())),
            baseline_error_rate,
            baseline_latency_p95,
        }
    }

    // Record a request latency
    async fn record_latency(&self, duration: Duration) {
        let mut latencies = self.latency_p95.lock().await;
        latencies.push(duration);
    }

    // Analyze if the canary is healthy
    async fn is_healthy(&self) -> bool {
        let total_requests = self.success_counter.get() + self.error_counter.get();

        if total_requests < 100.0 {
            // Not enough data yet
            return true;
        }

        // Calculate error rate
        let error_rate = self.error_counter.get() / total_requests;

        // Calculate p95 latency
        let latencies = self.latency_p95.lock().await;
        let mut latency_values = latencies.clone();
        latency_values.sort();

        let p95_index = (latency_values.len() as f64 * 0.95) as usize;
        let current_p95 = latency_values.get(p95_index).unwrap_or(&Duration::from_millis(0)).clone();

        // Check if metrics are within acceptable ranges
        let error_rate_ok = error_rate <= self.baseline_error_rate * 1.1; // Allow 10% increase
        let latency_ok = current_p95 <= self.baseline_latency_p95 * 1.2; // Allow 20% increase

        error_rate_ok && latency_ok
    }
}

// Example usage in a deployment controller
async fn canary_deployment() {
    let success_counter = Counter::new("requests_success", "Successful requests").unwrap();
    let error_counter = Counter::new("requests_error", "Failed requests").unwrap();

    let canary = CanaryAnalysis::new(
        success_counter,
        error_counter,
        0.01, // 1% baseline error rate
        Duration::from_millis(200), // 200ms baseline p95 latency
    );

    // Deploy canary
    println!("Deploying canary version...");

    // Monitor for 10 minutes
    let start = Instant::now();
    let monitoring_period = Duration::from_secs(600);

    while start.elapsed() < monitoring_period {
        if !canary.is_healthy().await {
            println!("Canary is unhealthy! Rolling back...");
            // Rollback logic would go here
            return;
        }

        sleep(Duration::from_secs(30)).await;
    }

    println!("Canary is healthy! Proceeding with full deployment...");
    // Complete deployment logic would go here
}
```

### SLO Monitoring and Error Budgeting

Implement Service Level Objective (SLO) monitoring to track your service's reliability:

```rust
use prometheus::{Counter, Registry};
use std::sync::Arc;
use std::time::{Duration, SystemTime};
use tokio::sync::Mutex;

struct SLOMonitor {
    success_counter: Counter,
    failure_counter: Counter,
    error_budget: Arc<Mutex<f64>>,
    target_reliability: f64,
    window_size: Duration,
    registry: Registry,
}

impl SLOMonitor {
    fn new(service_name: &str, target_reliability: f64, window_size: Duration) -> Self {
        let registry = Registry::new();

        let success_counter = Counter::new(
            format!("{}_requests_success", service_name),
            format!("Successful requests for {}", service_name),
        ).unwrap();

        let failure_counter = Counter::new(
            format!("{}_requests_failure", service_name),
            format!("Failed requests for {}", service_name),
        ).unwrap();

        registry.register(Box::new(success_counter.clone())).unwrap();
        registry.register(Box::new(failure_counter.clone())).unwrap();

        // Calculate initial error budget
        let error_budget = 1.0 - target_reliability;

        Self {
            success_counter,
            failure_counter,
            error_budget: Arc::new(Mutex::new(error_budget)),
            target_reliability,
            window_size,
            registry,
        }
    }

    fn record_success(&self) {
        self.success_counter.inc();
    }

    fn record_failure(&self) {
        self.failure_counter.inc();
    }

    async fn get_current_reliability(&self) -> f64 {
        let total = self.success_counter.get() + self.failure_counter.get();
        if total == 0.0 {
            return 1.0;
        }

        self.success_counter.get() / total
    }

    async fn get_remaining_error_budget(&self) -> f64 {
        let current_reliability = self.get_current_reliability().await;
        let used_budget = self.target_reliability - current_reliability;

        let mut error_budget = self.error_budget.lock().await;
        *error_budget - used_budget
    }

    async fn can_deploy(&self) -> bool {
        self.get_remaining_error_budget().await > 0.0
    }
}

// Example middleware for an HTTP server
async fn slo_middleware(
    req: Request,
    slo_monitor: Arc<SLOMonitor>,
    next: Next,
) -> Result<Response, Error> {
    let start = Instant::now();

    let result = next.run(req).await;

    let duration = start.elapsed();
    detector.record(duration).await;

    // Check for anomalies
    if detector.check_for_anomalies().await {
        println!("Anomaly detected in response time: {:?}", duration);
        // In a real system, you might log this or send an alert
    }

    result
}
```

### Distributed Tracing Implementation

Distributed tracing provides visibility into request flows across services. Here's how to implement it in Rust using OpenTelemetry:

```rust
use opentelemetry::global;
use opentelemetry::trace::{Span, SpanKind, Status, Tracer};
use opentelemetry::KeyValue;
use opentelemetry_jaeger::new_pipeline;
use std::error::Error;

fn init_tracer() -> Result<opentelemetry::sdk::trace::Tracer, Box<dyn Error>> {
    global::set_text_map_propagator(opentelemetry_jaeger::Propagator::new());

    let tracer = new_pipeline()
        .with_service_name("my-rust-service")
        .install_simple()?;

    Ok(tracer)
}

async fn handle_request(tracer: &opentelemetry::sdk::trace::Tracer, req: Request) -> Result<Response, Error> {
    // Start a new span for this request
    let mut span = tracer
        .span_builder(format!("{} {}", req.method(), req.uri().path()))
        .with_kind(SpanKind::Server)
        .with_attributes(vec![
            KeyValue::new("http.method", req.method().to_string()),
            KeyValue::new("http.route", req.uri().path().to_string()),
            KeyValue::new("http.user_agent", req.headers().get("user-agent").map_or("", |h| h.to_str().unwrap_or(""))),
        ])
        .start(tracer);

    // Process the request within the span context
    let result = opentelemetry::trace::with_span(span.clone(), async {
        // Extract any parent span context from request headers
        let parent_context = global::get_text_map_propagator().extract(&HeaderExtractor(req.headers()));
        let _guard = parent_context.attach();

        // Call to database
        let db_result = with_database_span(tracer, async {
            query_database(&req).await
        }).await;

        // Call to another service
        let service_result = with_service_span(tracer, async {
            call_external_service(&req).await
        }).await;

        // Create response
        combine_results(db_result, service_result)
    }).await;

    // Record the result in the span
    match &result {
        Ok(response) => {
            span.set_attribute(KeyValue::new("http.status_code", response.status().as_u16() as i64));
            span.set_status(Status::Ok);
        },
        Err(e) => {
            span.set_attribute(KeyValue::new("error", e.to_string()));
            span.set_status(Status::Error);
        }
    };

    span.end();
    result
}

async fn with_database_span<F, T>(tracer: &opentelemetry::sdk::trace::Tracer, f: F) -> T
where
    F: Future<Output = T>,
{
    let mut span = tracer
        .span_builder("database.query")
        .with_kind(SpanKind::Client)
        .start(tracer);

    let result = opentelemetry::trace::with_span(span.clone(), f).await;

    span.end();
    result
}

// Example of propagating context to another service
async fn call_external_service(req: &Request) -> Result<ExternalData, Error> {
    let client = reqwest::Client::new();

    let mut req_builder = client
        .get("https://api.example.com/data")
        .header("Content-Type", "application/json");

    // Inject trace context into outgoing request
    global::get_text_map_propagator().inject_context(
        &opentelemetry::Context::current(),
        &mut HeaderInjector(req_builder.headers_mut()),
    );

    let response = req_builder.send().await?;
    // Process response
    // ...
}
```

### Log Aggregation and Analysis

Implementing effective log aggregation and analysis in a Rust application:

```rust
use slog::{debug, error, info, o, Drain, Logger};
use slog_json::Json;
use std::sync::Mutex;

// Set up structured JSON logging that can be ingested by log aggregation systems
fn setup_production_logger() -> Logger {
    let drain = Json::new(std::io::stdout())
        .add_default_keys()
        .build()
        .fuse();

    let drain = Mutex::new(drain).fuse();
    let drain = slog_async::Async::new(drain).build().fuse();

    slog::Logger::root(drain, o!(
        "version" => env!("CARGO_PKG_VERSION"),
        "service" => "my-rust-service",
        "environment" => std::env::var("ENVIRONMENT").unwrap_or_else(|_| "production".into())
    ))
}

// Add correlation IDs to tie together related logs
fn with_correlation_id(logger: &Logger, correlation_id: &str) -> Logger {
    logger.new(o!("correlation_id" => correlation_id.to_string()))
}

// Example request handler with rich logging
async fn handle_request(req: Request, logger: &Logger) -> Result<Response, Error> {
    // Extract or generate correlation ID
    let correlation_id = req
        .headers()
        .get("X-Correlation-ID")
        .map(|h| h.to_str().unwrap_or(""))
        .unwrap_or("")
        .to_string();

    let correlation_id = if correlation_id.is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        correlation_id
    };

    let request_logger = with_correlation_id(logger, &correlation_id);

    // Log request details
    info!(request_logger, "Request received";
          "method" => req.method().to_string(),
          "path" => req.uri().path(),
          "client_ip" => req.remote_addr().to_string());

    let start_time = std::time::Instant::now();

    // Process request
    let result = process_request(req, &request_logger).await;

    let elapsed = start_time.elapsed();

    // Log result
    match &result {
        Ok(response) => {
            info!(request_logger, "Request completed successfully";
                  "status" => response.status().as_u16(),
                  "duration_ms" => elapsed.as_millis() as u64);
        },
        Err(e) => {
            error!(request_logger, "Request failed";
                   "error" => %e,
                   "duration_ms" => elapsed.as_millis() as u64);
        }
    }

    // Add correlation ID to response headers
    let mut response = result?;
    response.headers_mut().insert(
        "X-Correlation-ID",
        correlation_id.parse().unwrap(),
    );

    Ok(response)
}
```

### Anomaly Detection Strategies

Implementing anomaly detection to identify unusual patterns in your application:

```rust
use prometheus::{Histogram, HistogramOpts, Registry};
use std::collections::VecDeque;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;
use tokio::time::interval;

// A simple anomaly detector for response times
struct ResponseTimeAnomalyDetector {
    history: Arc<Mutex<VecDeque<Duration>>>,
    window_size: usize,
    threshold_z_score: f64,
    histogram: Histogram,
    alert_count: Arc<Mutex<u64>>,
}

impl ResponseTimeAnomalyDetector {
    fn new(service_name: &str, window_size: usize, threshold_z_score: f64, registry: &Registry) -> Self {
        let histogram = Histogram::with_opts(HistogramOpts::new(
            format!("{}_response_time", service_name),
            format!("Response time for {}", service_name),
        )).unwrap();

        registry.register(Box::new(histogram.clone())).unwrap();

        Self {
            history: Arc::new(Mutex::new(VecDeque::with_capacity(window_size))),
            window_size,
            threshold_z_score,
            histogram,
            alert_count: Arc::new(Mutex::new(0)),
        }
    }

    async fn record(&self, duration: Duration) {
        self.histogram.observe(duration.as_secs_f64());

        let mut history = self.history.lock().await;

        if history.len() >= self.window_size {
            history.pop_front();
        }

        history.push_back(duration);
    }

    async fn check_for_anomalies(&self) -> bool {
        let history = self.history.lock().await;

        if history.len() < self.window_size / 2 {
            // Not enough data yet
            return false;
        }

        // Calculate mean and standard deviation
        let total_millis: u128 = history.iter().map(|d| d.as_millis()).sum();
        let mean = total_millis as f64 / history.len() as f64;

        let variance = history.iter()
            .map(|d| {
                let diff = d.as_millis() as f64 - mean;
                diff * diff
            })
            .sum::<f64>() / history.len() as f64;

        let std_dev = variance.sqrt();

        // Get the most recent value
        if let Some(latest) = history.back() {
            let latest_millis = latest.as_millis() as f64;
            let z_score = (latest_millis - mean) / std_dev;

            if z_score.abs() > self.threshold_z_score {
                // Anomaly detected!
                let mut alert_count = self.alert_count.lock().await;
                *alert_count += 1;
                return true;
            }
        }

        false
    }

    async fn start_anomaly_detection(&self) {
        let history = self.history.clone();
        let threshold = self.threshold_z_score;
        let alert_count = self.alert_count.clone();

        tokio::spawn(async move {
            let mut check_interval = interval(Duration::from_secs(60));

            loop {
                check_interval.tick().await;

                let history_guard = history.lock().await;

                if history_guard.len() < 10 {
                    // Not enough data yet
                    continue;
                }

                // Calculate mean and standard deviation
                let total_millis: u128 = history_guard.iter().map(|d| d.as_millis()).sum();
                let mean = total_millis as f64 / history_guard.len() as f64;

                let variance = history_guard.iter()
                    .map(|d| {
                        let diff = d.as_millis() as f64 - mean;
                        diff * diff
                    })
                    .sum::<f64>() / history_guard.len() as f64;

                let std_dev = variance.sqrt();

                // Check for outliers
                let outliers: Vec<_> = history_guard.iter().enumerate()
                    .filter(|(_, d)| {
                        let d_millis = d.as_millis() as f64;
                        let z_score = (d_millis - mean) / std_dev;
                        z_score.abs() > threshold
                    })
                    .collect();

                if !outliers.is_empty() {
                    let mut alert_count_guard = alert_count.lock().await;
                    *alert_count_guard += outliers.len() as u64;

                    println!("Anomaly detected! {} outliers found", outliers.len());
                    // In a real system, you would send alerts here
                }

                // Drop the guard to release the lock
                drop(history_guard);
            }
        });
    }
}

// Example usage in a middleware
async fn response_time_middleware(
    req: Request,
    detector: Arc<ResponseTimeAnomalyDetector>,
    next: Next,
) -> Result<Response, Error> {
    let start = Instant::now();

    let result = next.run(req).await;

    let duration = start.elapsed();
    detector.record(duration).await;

    // Check for anomalies
    if detector.check_for_anomalies().await {
        println!("Anomaly detected in response time: {:?}", duration);
        // In a real system, you might log this or send an alert
    }

    result
}
```

## Security

Security is a critical aspect of production applications. Rust's memory safety guarantees help eliminate entire classes of vulnerabilities, but you still need to consider many security aspects.

### Secure Coding Practices

Even with Rust's safety guarantees, some practices are essential for secure code:

1. **Minimize `unsafe` code**: Every line of `unsafe` code should be scrutinized, documented, and isolated behind a safe API.

2. **Handle untrusted input carefully**: Always validate and sanitize input from users, network, or files.

```rust
fn validate_username(username: &str) -> Result<(), ValidationError> {
    if username.len() < 3 || username.len() > 20 {
        return Err(ValidationError::InvalidLength);
    }

    if !username.chars().all(|c| c.is_alphanumeric() || c == '_') {
        return Err(ValidationError::InvalidCharacters);
    }

    Ok(())
}
```

3. **Use latest dependencies**: Keep dependencies updated to incorporate security patches.

```bash
# Update dependencies in Cargo.toml
cargo update

# Audit dependencies for security vulnerabilities
cargo audit
```

4. **Handle errors properly**: Ensure errors don't leak sensitive information.

```rust
fn authenticate_user(username: &str, password: &str) -> Result<User, AuthError> {
    let user = match db.find_user(username) {
        Ok(user) => user,
        Err(_) => return Err(AuthError::InvalidCredentials), // Don't reveal if user exists
    };

    if !verify_password(password, &user.password_hash) {
        return Err(AuthError::InvalidCredentials); // Same error for invalid password
    }

    Ok(user)
}
```

### Authentication and Authorization

Implementing proper authentication and authorization is crucial:

```rust
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,        // Subject (user ID)
    exp: usize,         // Expiration time
    iat: usize,         // Issued at
    roles: Vec<String>, // User roles for authorization
}

fn generate_token(user_id: &str, roles: Vec<String>) -> Result<String, jsonwebtoken::errors::Error> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs() as usize;

    let claims = Claims {
        sub: user_id.to_string(),
        exp: now + 3600, // Token valid for 1 hour
        iat: now,
        roles,
    };

    let secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes()))
}

fn verify_token(token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let validation = Validation::default();

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )?;

    Ok(token_data.claims)
}

// Middleware to check authorization
async fn authorize(
    roles: Vec<String>,
    token: String,
) -> Result<Claims, AuthError> {
    let claims = verify_token(&token).map_err(|_| AuthError::InvalidToken)?;

    // Check if any required role is in the user's roles
    let has_role = roles.iter().any(|role| claims.roles.contains(role));

    if !has_role {
        return Err(AuthError::InsufficientPermissions);
    }

    Ok(claims)
}
```

### Secrets Management

Never hardcode secrets in your application. Instead, use environment variables, secret management services, or specialized tools:

```rust
use aws_sdk_secretsmanager::{Client, Error};

async fn get_secret(secret_name: &str) -> Result<String, Error> {
    let config = aws_config::load_from_env().await;
    let client = Client::new(&config);

    let response = client
        .get_secret_value()
        .secret_id(secret_name)
        .send()
        .await?;

    Ok(response.secret_string().unwrap_or_default().to_string())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Get database credentials from AWS Secrets Manager
    let db_credentials = get_secret("prod/my-app/db").await?;

    // Use the credentials to connect to the database
    // ...

    Ok(())
}
```

### Data Protection

Protect sensitive data at rest and in transit:

1. **Encryption at rest**:

```rust
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::{rngs::OsRng, RngCore};

fn encrypt_data(data: &[u8], key: &[u8; 32]) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    // Create a new AES-GCM cipher with the provided key
    let cipher = Aes256Gcm::new_from_slice(key)?;

    // Generate a random 12-byte nonce
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // Encrypt the data
    let ciphertext = cipher.encrypt(nonce, data)?;

    // Prepend the nonce to the ciphertext
    let mut result = Vec::with_capacity(nonce_bytes.len() + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    Ok(result)
}

fn decrypt_data(encrypted_data: &[u8], key: &[u8; 32]) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    if encrypted_data.len() < 12 {
        return Err("Encrypted data too short".into());
    }

    // Split the data into nonce and ciphertext
    let nonce = Nonce::from_slice(&encrypted_data[..12]);
    let ciphertext = &encrypted_data[12..];

    // Create a new AES-GCM cipher with the provided key
    let cipher = Aes256Gcm::new_from_slice(key)?;

    // Decrypt the data
    let plaintext = cipher.decrypt(nonce, ciphertext)?;

    Ok(plaintext)
}
```

2. **TLS for data in transit**:

```rust
use rustls::{ServerConfig, Certificate, PrivateKey};
use tokio_rustls::TlsAcceptor;
use std::fs::File;
use std::io::BufReader;
use rustls_pemfile::{certs, rsa_private_keys};

async fn configure_tls() -> Result<ServerConfig, Box<dyn std::error::Error>> {
    // Load certificates
    let cert_file = File::open("server.crt")?;
    let mut cert_reader = BufReader::new(cert_file);
    let cert_chain = certs(&mut cert_reader)?
        .into_iter()
        .map(Certificate)
        .collect();

    // Load private key
    let key_file = File::open("server.key")?;
    let mut key_reader = BufReader::new(key_file);
    let mut keys = rsa_private_keys(&mut key_reader)?;
    if keys.is_empty() {
        return Err("No private keys found".into());
    }

    let config = ServerConfig::builder()
        .with_safe_defaults()
        .with_no_client_auth()
        .with_single_cert(cert_chain, PrivateKey(keys.remove(0)))?;

    Ok(config)
}

async fn run_server() -> Result<(), Box<dyn std::error::Error>> {
    let tls_config = configure_tls().await?;
    let acceptor = TlsAcceptor::from(std::sync::Arc::new(tls_config));

    // Set up TCP listener
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8443").await?;

    while let Ok((stream, _)) = listener.accept().await {
        let acceptor = acceptor.clone();

        tokio::spawn(async move {
            // Perform TLS handshake
            let tls_stream = match acceptor.accept(stream).await {
                Ok(tls_stream) => tls_stream,
                Err(e) => {
                    eprintln!("Failed to accept TLS connection: {}", e);
                    return;
                }
            };

            // Handle the secure connection
            handle_connection(tls_stream).await;
        });
    }

    Ok(())
}

async fn handle_connection(stream: tokio_rustls::server::TlsStream<tokio::net::TcpStream>) {
    // Handle the TLS-secured connection
}
```

### Vulnerability Scanning

Regularly scan your codebase and dependencies for vulnerabilities:

1. **Dependency scanning**:

```bash
# Install cargo-audit
cargo install cargo-audit

# Scan dependencies for known vulnerabilities
cargo audit
```

2. **Container scanning**:

```bash
# Scan a Docker image with Trivy
trivy image myregistry/rust-app:v1.0.0
```

3. **Static Analysis**:

```bash
# Install clippy for static analysis
rustup component add clippy

# Run clippy with all lints
cargo clippy -- -D warnings
```

### Security Headers and CORS

Configure proper security headers and CORS policies:

```rust
use warp::{Filter, http::header::{HeaderMap, HeaderValue}};

fn with_security_headers() -> impl Filter<Extract = (), Error = std::convert::Infallible> + Clone {
    warp::reply::with::header("Content-Security-Policy", "default-src 'self'")
        .and(warp::reply::with::header("X-Frame-Options", "DENY"))
        .and(warp::reply::with::header("X-Content-Type-Options", "nosniff"))
        .and(warp::reply::with::header("Referrer-Policy", "strict-origin-when-cross-origin"))
        .and(warp::reply::with::header("Permissions-Policy", "geolocation=(), microphone=()"))
}

fn with_cors() -> impl Filter<Extract = (), Error = std::convert::Infallible> + Clone {
    let cors = warp::cors()
        .allow_origins(vec!["https://example.com", "https://www.example.com"])
        .allow_methods(vec!["GET", "POST", "PUT", "DELETE"])
        .allow_headers(vec!["Content-Type", "Authorization"])
        .max_age(3600);

    cors
}

#[tokio::main]
async fn main() {
    let routes = warp::any()
        .and(with_cors())
        .and(with_security_headers())
        .and(your_routes_here());

    warp::serve(routes)
        .run(([0, 0, 0, 0], 8080))
        .await;
}
```

### Rate Limiting and DDoS Protection

Protect your application from abuse with rate limiting:

```rust
use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use warp::{Filter, Rejection, Reply};

struct RateLimiter {
    // Map of IP addresses to (request count, start time)
    requests: HashMap<IpAddr, (u32, Instant)>,
    // Maximum requests per window
    max_requests: u32,
    // Time window in seconds
    window_secs: u64,
}

impl RateLimiter {
    fn new(max_requests: u32, window_secs: u64) -> Self {
        RateLimiter {
            requests: HashMap::new(),
            max_requests,
            window_secs,
        }
    }

    fn check(&mut self, ip: IpAddr) -> bool {
        let now = Instant::now();
        let window = Duration::from_secs(self.window_secs);

        // Clean up old entries
        self.requests.retain(|_, (_, time)| now.duration_since(*time) < window);

        // Get or insert entry for this IP
        let entry = self.requests.entry(ip).or_insert((0, now));

        // Check if we need to reset the window
        if now.duration_since(entry.1) >= window {
            *entry = (1, now);
            return true;
        }

        // Increment request count
        entry.0 += 1;

        // Allow if under limit
        entry.0 <= self.max_requests
    }
}

#[derive(Debug)]
struct RateLimitExceeded;
impl warp::reject::Reject for RateLimitExceeded {}

fn with_rate_limiting(
    limiter: Arc<Mutex<RateLimiter>>,
) -> impl Filter<Extract = (), Error = Rejection> + Clone {
    warp::filters::addr::remote()
        .and_then(move |addr: Option<SocketAddr>| {
            let limiter = limiter.clone();
            async move {
                if let Some(addr) = addr {
                    let ip = addr.ip();
                    let allowed = limiter.lock().unwrap().check(ip);
                    if allowed {
                        Ok(())
                    } else {
                        Err(warp::reject::custom(RateLimitExceeded))
                    }
                } else {
                    // No IP address available, allow the request
                    Ok(())
                }
            }
        })
}

#[tokio::main]
async fn main() {
    // Create a rate limiter: 100 requests per minute
    let rate_limiter = Arc::new(Mutex::new(RateLimiter::new(100, 60)));

    let routes = warp::any()
        .and(with_rate_limiting(rate_limiter))
        .and(your_routes_here());

    warp::serve(routes)
        .run(([0, 0, 0, 0], 8080))
        .await;
}
```

## Security Best Practices

Security is a critical concern for production applications. Rust provides memory safety by default, but there are still many security considerations to keep in mind:

- **Keep Dependencies Updated**: Regularly update your dependencies to get security fixes
- **Minimize Unsafe Code**: Avoid `unsafe` blocks when possible, and carefully audit them when necessary
- **Use Secure Defaults**: Implement security by default, requiring explicit opt-out for less secure options
- **Input Validation**: Validate all user input before processing
- **Proper Error Handling**: Don't expose internal errors to users
- **Secure Configuration**: Keep sensitive configuration (like API keys) out of your code
- **Authentication and Authorization**: Implement proper authentication and authorization checks
- **HTTPS Everywhere**: Use HTTPS for all external communications
- **Rate Limiting**: Protect against brute force and denial of service attacks
- **Logging Security Events**: Log security-relevant events for auditing

Here's an example of implementing rate limiting with the `governor` crate:

```rust
use governor::{Quota, RateLimiter};
use std::num::NonZeroU32;
use std::sync::Arc;
use std::time::Duration;
use warp::{Filter, Rejection, Reply};

// Create a rate limiter that allows 5 requests per minute
let rate_limiter = Arc::new(RateLimiter::direct(Quota::per_minute(NonZeroU32::new(5).unwrap())));

// Define a route with rate limiting
let limited_route = warp::path("api")
    .and(warp::any().map(move || rate_limiter.clone()))
    .and_then(|limiter: Arc<RateLimiter<_, _, _>>| async move {
        if let Err(negative) = limiter.check() {
            // Request was rate limited
            let wait_time = negative.wait_time_from(std::time::Instant::now());
            Err(warp::reject::custom(RateLimited(wait_time)))
        } else {
            // Request was allowed
            Ok(())
        }
    })
    .and(warp::path::end())
    .map(|| warp::reply::html("API endpoint"));
```

## Advanced Security Auditing Techniques

While Rust helps prevent many security issues at compile time, production applications still need comprehensive security auditing. Here are advanced techniques to ensure your Rust applications remain secure:

### Code Security Auditing

A thorough security audit of Rust code should include:

#### Manual Auditing Strategies

Manual code reviews focusing on security concerns should look for:

1. **Unsafe Block Analysis**: Every `unsafe` block should be scrutinized carefully

   ```rust
   // Pattern to look for: Unsafe blocks with complex logic
   unsafe {
       let raw_ptr = some_pointer as *mut T;
       // Complex logic here increases risk
       *raw_ptr = compute_value(); // Potential memory safety issue
   }
   ```

2. **Trust Boundary Violations**: Identify where untrusted data crosses into trusted contexts

   ```rust
   // Pattern to watch for: User input flowing into sensitive operations
   let user_input = request.params.get("filename").unwrap_or_default();
   let file_path = format!("/data/{}", user_input); // Potential path traversal
   let contents = std::fs::read_to_string(file_path)?;
   ```

3. **Cryptography Misuse**: Look for weak cryptographic practices

   ```rust
   // Anti-pattern: Hard-coded encryption keys
   let key = b"supersecretkey12"; // Never hard-code keys
   let cipher = Aes128Gcm::new(key.into());
   ```

4. **Input Validation Gaps**: Check for places where input validation is bypassed

   ```rust
   // Anti-pattern: Bypassing validation in certain conditions
   fn process_input(input: &str, admin: bool) {
       if admin {
           // Bypassing validation for admin users is risky
           process_raw(input);
       } else {
           validate_and_process(input);
       }
   }
   ```

5. **Permission and Authorization Checks**: Look for missing or inconsistent checks

   ```rust
   // Anti-pattern: Inconsistent authorization
   fn update_resource(resource_id: u64, user_id: u64, data: &str) -> Result<(), Error> {
       let resource = db.get_resource(resource_id)?;

       // Authorization check is present but...
       if resource.owner_id == user_id {
           // ...might be bypassed in certain code paths
           return Ok(db.update_resource(resource_id, data)?);
       }

       if is_admin(user_id) {
           // Separate code path might have different checks
           return Ok(db.update_resource(resource_id, data)?);
       }

       Err(Error::Unauthorized)
   }
   ```

#### Fuzz Testing

Fuzz testing is particularly effective for Rust applications due to Rust's strong memory safety guarantees. When a fuzz test triggers a panic, it often indicates a serious issue:

```rust
use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;

#[derive(Arbitrary, Debug)]
struct FuzzInput {
    value1: String,
    value2: Vec<u8>,
    value3: i32,
}

fuzz_target!(|input: FuzzInput| {
    // Call your application code with the fuzzed input
    let _ = my_app::process_input(&input.value1, &input.value2, input.value3);
});
```

You can run fuzz testing with cargo-fuzz:

```bash
cargo install cargo-fuzz
cargo fuzz init
cargo fuzz add target_name
cargo fuzz run target_name
```

#### Threat Modeling

Implementing a formal threat modeling process for Rust applications:

1. **Define Security Boundaries**: Identify where data crosses trust boundaries
2. **Map Data Flows**: Document how data moves through your application
3. **Identify Threats**: Use the STRIDE model (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege)
4. **Determine Mitigations**: Develop countermeasures for each threat

Example threat modeling document for a Rust web service:

```
Component: Authentication Service
Data Flow: Client → API Gateway → Auth Service → Database
Threats:
  - Spoofing: Attacker impersonates a legitimate user
    Mitigation: Use strong authentication with JWT + proper signature validation

  - Information Disclosure: Password hash exposure
    Mitigation: Use Argon2id with proper parameters for password hashing

  - Denial of Service: Password hashing computation
    Mitigation: Implement rate limiting at API gateway
```

### Automated Security Scanning Tools for Rust

Several tools can help automate security scanning for Rust codebases:

#### Cargo Audit

Cargo-audit scans your dependencies for known vulnerabilities:

```bash
cargo install cargo-audit
cargo audit
```

Output example:

```
Scanning Cargo.lock for vulnerabilities (advisory database fetch date: 2023-08-01)
Vulnerability: RUSTSEC-2021-0078
Title: Integer overflow in serde_cbor leads to panic
Date: 2021-08-05
Package: serde_cbor
Dependency tree:
serde_cbor 0.11.1
└── my-app 0.1.0

Remediation: Upgrade to >=0.11.2
```

#### Cargo Geiger

Cargo-geiger scans your code for unsafe usage:

```bash
cargo install cargo-geiger
cargo geiger
```

Output example:

```
Metric output format: x/y
    x = unsafe code used by the build
    y = total unsafe code found in the crate

Symbols:
    🔒 = No `unsafe` usage found, declares #![forbid(unsafe_code)]
    ❓ = No `unsafe` usage found, missing #![forbid(unsafe_code)]
    ☢️ = `unsafe` usage found

Functions  Expressions  Impls  Traits  Methods  Dependency

0/0        0/0          0/0    0/0     0/0      🔒 my-app 0.1.0
0/0        0/0          0/0    0/0     0/0      ├── 🔒 log 0.4.14
2/2        7/7          0/0    0/0     0/0      ├── ☢️ memchr 2.4.1
```

#### Clippy Security Lints

Clippy includes security-focused lints that can catch potential issues:

```bash
cargo clippy --all-targets --all-features -- -D warnings -W clippy::all -W clippy::pedantic -W clippy::cargo
```

Specific security-relevant lints include:

- `clippy::mem_forget`: Warns about `mem::forget` usage which can cause resource leaks
- `clippy::missing_safety_doc`: Ensures unsafe functions are properly documented
- `clippy::unwrap_used`: Prevents potential panics in production code
- `clippy::expect_used`: Similar to unwrap_used

#### Custom Security Lints

You can develop custom lints for project-specific security rules using the `dylint` or `clippy-lints` frameworks:

```rust
// Example of a custom security lint
use rustc_lint::{LateContext, LateLintPass};
use rustc_session::declare_lint;

declare_lint! {
    pub INSECURE_RANDOM,
    Warn,
    "usage of potentially insecure random number generators"
}

pub struct InsecureRandomCheck;

impl LateLintPass for InsecureRandomCheck {
    fn check_expr(&mut self, cx: &LateContext, expr: &Expr) {
        if let ExprKind::Call(func, _) = &expr.kind {
            if self.is_rand_function(cx, func) {
                cx.struct_span_lint(INSECURE_RANDOM, expr.span, "using potentially insecure random generator").emit();
            }
        }
    }
}
```

#### Integration with CI/CD

Integrating security scanning tools into your CI/CD pipeline ensures consistent security checks:

```yaml
# GitHub Actions example
name: Security Audit

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 0 * * 0"

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          profile: minimal
          toolchain: stable

      - name: Install cargo-audit
        run: cargo install cargo-audit

      - name: Run cargo-audit
        run: cargo audit

      - name: Run Clippy
        run: cargo clippy --all-targets --all-features -- -D warnings
```

### Supply Chain Security

Supply chain attacks have become increasingly common. Here's how to secure your Rust application's supply chain:

#### Dependency Management Best Practices

1. **Dependency Minimization**: Regularly audit and minimize dependencies

   ```bash
   # Use cargo-udeps to find unused dependencies
   cargo install cargo-udeps
   cargo udeps
   ```

2. **Vendoring Dependencies**: For critical applications, vendor dependencies to prevent supply chain attacks

   ```bash
   # Use cargo-vendor to vendor dependencies
   cargo install cargo-vendor
   cargo vendor

   # Update .cargo/config.toml to use vendored dependencies
   cat > .cargo/config.toml << EOF
   [source.crates-io]
   replace-with = "vendored-sources"

   [source.vendored-sources]
   directory = "vendor"
   EOF
   ```

3. **Dependency Verification**: Use cargo-crev to verify the trustworthiness of dependencies

   ```bash
   cargo install cargo-crev
   cargo crev verify
   ```

4. **Package Pinning**: Pin exact versions of critical dependencies

   ```toml
   # Cargo.toml
   [dependencies]
   # Prefer exact versions for security-critical dependencies
   tokio = "=1.21.2" # Exact version pinning with =
   serde = "1.0.147" # Without =, this allows compatible updates
   ```

#### Reproducible Builds

Ensuring reproducible builds adds another layer of supply chain security:

```toml
# Cargo.toml
[package]
# ...
[profile.release]
strip = "symbols"
lto = true
codegen-units = 1
```

Using Docker for reproducible builds:

```dockerfile
FROM rust:1.70 as builder
WORKDIR /usr/src/app
COPY . .
RUN cargo build --release

# Use a minimal image for the runtime
FROM scratch
COPY --from=builder /usr/src/app/target/release/my_app /my_app
EXPOSE 8080
CMD ["/my_app"]
```

#### Auditing Build Scripts

Build scripts in dependencies can execute arbitrary code during compilation. Regularly audit them:

```bash
# List all build scripts in your dependencies
cargo metadata --format-version=1 | jq '.packages[] | select(.build != null) | {name, version, build}'
```

#### Provenance and Signing

Implement provenance verification for your builds:

```bash
# Generate a key for signing
gpg --gen-key

# Sign your release
gpg --detach-sign --armor target/release/my_app

# Verify a signature
gpg --verify my_app.asc my_app
```

Implementing a Rust-based verification system:

```rust
use std::process::Command;

fn verify_signature(binary_path: &str, signature_path: &str) -> Result<bool, std::io::Error> {
    let output = Command::new("gpg")
        .arg("--verify")
        .arg(signature_path)
        .arg(binary_path)
        .output()?;

    Ok(output.status.success())
}
```

## Conclusion

In this chapter, we've explored the key aspects of making Rust applications production-ready. We've covered deployment strategies, containerization with Docker, orchestration with Kubernetes, monitoring and observability, security, and scaling. We've also built a complete, production-ready microservice that demonstrates these concepts.

Rust's focus on safety, performance, and reliability makes it an excellent choice for production systems. By following the best practices outlined in this chapter, you can leverage Rust's strengths while addressing the challenges of running applications in production.

Remember that making an application production-ready is an ongoing process. Continuously monitor your application, gather feedback, and iterate on your implementation to ensure it meets the evolving needs of your users and your organization.

## Exercises

1. Add authentication and authorization to the product service using JWT tokens.
2. Implement rate limiting to protect the API from abuse.
3. Add database migrations using SQLx migrations or another migration tool.
4. Implement a caching layer using Redis to improve performance.
5. Add integration tests for the API endpoints.
6. Set up a CI/CD pipeline for the product service.
7. Implement a circuit breaker pattern for external service calls.
8. Add support for distributed tracing using OpenTelemetry and Jaeger.
9. Implement automated canary deployments using a service mesh like Istio.
10. Create a feature flag system for the product service.
