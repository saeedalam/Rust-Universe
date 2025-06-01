# Chapter 30: Web Development with Rust

## Introduction

Web development has traditionally been dominated by languages like JavaScript, Python, and Ruby, which prioritize developer productivity and ecosystem maturity over raw performance. However, as web applications grow in complexity and scale, the need for efficient, reliable, and secure systems has never been greater. Rust, with its focus on performance, memory safety, and concurrency without runtime overhead, offers a compelling alternative for modern web development.

In this chapter, we'll explore the rapidly evolving landscape of web development in Rust. We'll see how Rust's core strengths—zero-cost abstractions, memory safety without garbage collection, and fearless concurrency—translate into web applications that are not only fast and resource-efficient but also robust and secure.

The Rust web ecosystem has matured significantly in recent years. While it may not yet match the breadth of options available in more established web development languages, it offers a growing collection of high-quality libraries and frameworks that cover most web development needs. From high-performance HTTP servers and expressive API frameworks to reactive frontend libraries powered by WebAssembly, Rust provides tools for building full-stack web applications.

We'll start by examining the web development landscape in Rust, understanding where it excels and what challenges remain. Then, we'll dive into backend development with popular frameworks like Actix Web, Rocket, and Axum, exploring their different approaches to building web services. We'll cover RESTful API design, database integration with SQLx, authentication, middleware, and more.

For frontend development, we'll explore how Rust, compiled to WebAssembly, is opening new possibilities for building fast, reliable web interfaces with frameworks like Yew and Leptos. We'll also look at GraphQL implementation with async-graphql, WebSockets for real-time communication, and deployment strategies for Rust web applications.

Whether you're building a high-performance API, a real-time web application, or a full-stack system, this chapter will provide you with the knowledge to leverage Rust's strengths for web development. By the end, you'll understand how to build web applications that are not just fast and efficient, but also benefit from Rust's guarantees of safety and reliability.

## Web Development Landscape in Rust

The Rust web development ecosystem is diverse and rapidly evolving, with different tools and frameworks catering to various development styles and requirements. Before diving into specific frameworks, let's understand the overall landscape and where Rust fits into web development.

### Rust's Strengths for Web Development

Rust brings several unique advantages to web development:

1. **Performance**: Rust applications typically offer performance comparable to C and C++, with predictable resource usage and minimal overhead. This makes Rust ideal for high-throughput APIs and services where response time is critical.

2. **Memory Safety**: Rust's ownership system eliminates entire classes of bugs like null pointer dereferencing, use-after-free, and data races—all without runtime overhead. For web applications handling sensitive data, this provides an additional layer of security.

3. **Concurrency**: With its "fearless concurrency" model, Rust allows developers to build highly concurrent systems without the traditional pitfalls. This is particularly valuable for web servers handling thousands of simultaneous connections.

4. **Type Safety**: Rust's strong type system catches many errors at compile time, reducing runtime surprises. This can be especially helpful when refactoring large codebases or evolving APIs.

5. **Cross-Platform**: Rust code can run on various platforms, from cloud servers to WebAssembly in browsers, enabling code reuse between frontend and backend.

### The Web Stack in Rust

The Rust web stack can be broadly divided into several layers:

#### Low-Level HTTP and Networking

At the foundation, Rust offers libraries for handling HTTP and network protocols:

- **hyper**: A fast, low-level HTTP implementation that powers many higher-level frameworks.
- **tokio**: An asynchronous runtime that provides the foundation for non-blocking I/O operations.
- **mio**: A low-level, cross-platform abstraction over OS network operations.

#### Web Frameworks

Built on top of these low-level components, several web frameworks offer different approaches to building web applications:

- **Actix Web**: A high-performance, actor-based framework inspired by Erlang's actor model.
- **Rocket**: Focuses on developer experience with a focus on type safety and productivity.
- **Axum**: A modular framework built on top of tokio, with a focus on ergonomics and composability.
- **warp**: A lightweight, composable framework built around the concept of filters.
- **tide**: A minimal, middleware-focused framework for building async services.

#### Database Connectivity

For data persistence, Rust offers several options:

- **SQLx**: A pure Rust SQL client with compile-time checked queries.
- **Diesel**: A powerful ORM and query builder for SQL databases.
- **rust-postgres**: A native PostgreSQL driver.
- **mongodb**: Official MongoDB driver for Rust.
- **redis-rs**: Redis client library.

#### Frontend Development

For client-side web development, Rust can compile to WebAssembly (Wasm):

- **Yew**: A framework for creating multi-threaded frontend applications with WebAssembly.
- **Leptos**: A fine-grained reactive framework for building web interfaces.
- **Dioxus**: A portable, performant framework for building cross-platform user interfaces.
- **Seed**: A frontend framework for creating web applications with an Elm-like architecture.

#### API Development

For building APIs, Rust offers specialized tools:

- **async-graphql**: A high-performance GraphQL server implementation.
- **juniper**: Another GraphQL server library for Rust.
- **tonic**: A gRPC implementation focused on high performance.

### Ecosystem Maturity and Challenges

While the Rust web ecosystem is growing quickly, it's important to understand its current state and challenges:

#### Strengths

1. **Performance and Resource Efficiency**: Rust web frameworks consistently rank among the fastest in industry benchmarks.
2. **Growing Community**: The community is active and passionate, with regular releases and improvements.
3. **Strong Foundations**: Core libraries like tokio and hyper are mature and battle-tested.
4. **Interoperability**: Good integration with existing systems through FFI and WebAssembly.

#### Challenges

1. **Learning Curve**: Rust itself has a steeper learning curve than many web development languages.
2. **Ecosystem Breadth**: While the core is solid, some specialized libraries may be less mature than equivalents in more established ecosystems.
3. **Compile Times**: Rust's compile times can be longer than interpreted languages, affecting the development cycle.
4. **Hiring**: Finding developers with Rust experience can be more challenging compared to more common web technologies.

### When to Choose Rust for Web Development

Rust is particularly well-suited for certain types of web applications:

1. **High-Performance Services**: APIs and services where throughput and latency are critical.
2. **Resource-Constrained Environments**: Applications that need to minimize memory usage or operate within strict resource limits.
3. **Security-Critical Applications**: Systems handling sensitive data where memory safety bugs could be catastrophic.
4. **WebAssembly Applications**: Web applications that need near-native performance in the browser.
5. **Long-Running Services**: Systems that need to run for extended periods without memory leaks or degradation.

Rust may not be the optimal choice for:

- Rapid prototyping where development speed is the primary concern
- Small, simple web applications where the overhead of learning Rust may not be justified
- Teams without the capacity to invest in learning a new language with a steep learning curve

In the following sections, we'll explore each part of the Rust web stack in detail, starting with backend frameworks.

## Backend Frameworks Overview

Rust offers several mature backend frameworks, each with its own philosophy and approach to building web services. In this section, we'll explore the three most popular options: Actix Web, Rocket, and Axum.

### Actix Web

Actix Web is one of the most established and high-performance web frameworks in the Rust ecosystem. Originally built on the actor model (via the actix actor framework), it has evolved into a standalone web framework that consistently ranks among the fastest in various benchmarks.

#### Key Features

- **Performance**: Actix Web is designed for high performance and low overhead, making it suitable for high-traffic applications.
- **Flexibility**: Provides both high-level and low-level APIs to accommodate different development needs.
- **Middleware System**: Robust middleware system for cross-cutting concerns like logging, authentication, and compression.
- **WebSocket Support**: Built-in support for WebSocket connections.
- **State Management**: Easy-to-use application state sharing between handlers.

#### Basic Example

Here's a simple "Hello, World!" application with Actix Web:

```rust
use actix_web::{web, App, HttpRequest, HttpServer, Responder};

async fn greet(req: HttpRequest) -> impl Responder {
    let name = req.match_info().get("name").unwrap_or("World");
    format!("Hello, {}!", name)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/", web::get().to(|| async { "Hello, World!" }))
            .route("/hello/{name}", web::get().to(greet))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

#### When to Choose Actix Web

Actix Web is well-suited for:

- Applications where performance is a primary concern
- Large-scale services that need fine-grained control over their behavior
- Teams with experience in Rust who value flexibility
- Projects that need WebSocket support or real-time communication

### Rocket

Rocket takes a different approach, prioritizing developer experience and type safety. It uses Rust's type system extensively to provide ergonomic APIs and catch errors at compile time rather than runtime.

#### Key Features

- **Type Safety**: Heavy use of Rust's type system to provide safety guarantees.
- **Request Guards**: Powerful abstraction for request validation and processing.
- **Form Validation**: Built-in form validation with custom error messages.
- **Template Support**: Integrated templating with multiple engines.
- **Configuration**: Environment-specific configuration with sensible defaults.

#### Basic Example

Here's a "Hello, World!" example with Rocket:

```rust
#[macro_use] extern crate rocket;

#[get("/")]
fn index() -> &'static str {
    "Hello, world!"
}

#[get("/hello/<name>")]
fn hello(name: &str) -> String {
    format!("Hello, {}!", name)
}

#[launch]
fn rocket() -> _ {
    rocket::build()
        .mount("/", routes![index, hello])
}
```

#### When to Choose Rocket

Rocket is particularly suitable for:

- Teams prioritizing developer experience and productivity
- Applications where compile-time safety is highly valued
- Projects where readability and maintainability are key concerns
- Developers new to Rust who want a gentler learning curve for web development

### Axum

Axum is a newer framework developed by the Tokio team, built on top of the tokio runtime and hyper HTTP implementation. It focuses on ergonomics, composability, and type safety.

#### Key Features

- **Tower Integration**: Built on top of the tower ecosystem for middleware composition.
- **Handler Composition**: Handlers can be composed using combinators.
- **Type-Safe Routing**: Routes are type-checked at compile time.
- **Extractor System**: Powerful extractors for processing request data.
- **Minimal Dependencies**: Lighter dependency footprint compared to some alternatives.

#### Basic Example

Here's a simple example using Axum:

```rust
use axum::{
    routing::get,
    Router,
    extract::Path,
};

async fn hello_world() -> &'static str {
    "Hello, World!"
}

async fn hello_name(Path(name): Path<String>) -> String {
    format!("Hello, {}!", name)
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(hello_world))
        .route("/hello/:name", get(hello_name));

    axum::Server::bind(&"0.0.0.0:3000".parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}
```

#### When to Choose Axum

Axum is well-suited for:

- Projects already using tokio and hyper
- Developers who appreciate functional programming patterns
- Applications that need a lightweight, composable framework
- Teams looking for a modern API design with minimal boilerplate

### Framework Comparison

To help you choose the right framework for your project, here's a comparison of the three frameworks:

| Feature        | Actix Web       | Rocket          | Axum       |
| -------------- | --------------- | --------------- | ---------- |
| Performance    | Excellent       | Good            | Very Good  |
| Learning Curve | Moderate        | Gentle          | Moderate   |
| API Style      | Object-oriented | Attribute-based | Functional |
| Type Safety    | Good            | Excellent       | Excellent  |
| Maturity       | High            | High            | Medium     |
| Ecosystem      | Large           | Medium          | Growing    |
| Async Model    | tokio           | tokio (v0.5+)   | tokio      |
| Middleware     | Rich            | Limited         | Composable |
| Community      | Active          | Active          | Active     |

The choice between these frameworks often comes down to your team's preferences, your project's requirements, and which programming style you find most natural. All three are capable options for building robust web services in Rust.

In the next section, we'll dive deeper into RESTful API design principles using these frameworks.

## RESTful API Design

Building well-designed RESTful APIs is a fundamental skill for backend web development. In this section, we'll explore how to design and implement RESTful APIs in Rust, focusing on best practices and patterns that leverage Rust's strengths.

### RESTful Principles in Rust

REST (Representational State Transfer) is an architectural style for designing networked applications. It relies on stateless, client-server communication, typically over HTTP, using standard operations like GET, POST, PUT, and DELETE.

Key principles of RESTful API design include:

1. **Resource-Based**: Structure your API around resources (nouns) rather than actions.
2. **Standard HTTP Methods**: Use HTTP methods appropriately for different operations.
3. **Stateless**: Each request contains all information needed to process it.
4. **Representation**: Resources can have different representations (JSON, XML, etc.).
5. **HATEOAS (Hypertext As The Engine Of Application State)**: Include links in responses to guide clients through the API.

### Designing Data Models and DTOs

When building APIs in Rust, you'll typically define two types of structures:

1. **Domain Models**: Represent your core business entities and are used internally.
2. **Data Transfer Objects (DTOs)**: Define the shape of data sent to and from your API.

Here's an example of how you might define these in a Rust API:

```rust
// Domain model
#[derive(Debug)]
struct User {
    id: Uuid,
    username: String,
    email: String,
    password_hash: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

// DTO for creating a new user
#[derive(Deserialize, Validate)]
struct CreateUserDto {
    #[validate(length(min = 3, max = 50))]
    username: String,

    #[validate(email)]
    email: String,

    #[validate(length(min = 8))]
    password: String,
}

// DTO for returning user data
#[derive(Serialize)]
struct UserResponseDto {
    id: String,
    username: String,
    email: String,
    created_at: String,
}

// Implementation to convert between model and DTO
impl From<User> for UserResponseDto {
    fn from(user: User) -> Self {
        Self {
            id: user.id.to_string(),
            username: user.username,
            email: user.email,
            created_at: user.created_at.to_rfc3339(),
        }
    }
}
```

This separation helps maintain a clear boundary between your internal representation and your API contract, making it easier to evolve your API without breaking changes to your internal code.

### Implementing CRUD Operations

Let's implement a basic CRUD (Create, Read, Update, Delete) API for a resource using Actix Web:

```rust
use actix_web::{web, HttpResponse, Responder};
use uuid::Uuid;

// Create a new user
async fn create_user(
    user_dto: web::Json<CreateUserDto>,
    data: web::Data<AppState>,
) -> impl Responder {
    // Validate the DTO
    if let Err(errors) = user_dto.validate() {
        return HttpResponse::BadRequest().json(errors);
    }

    // Map DTO to domain model and save
    let new_user = User::new(
        user_dto.username.clone(),
        user_dto.email.clone(),
        &user_dto.password,
    );

    match data.user_repository.save(&new_user).await {
        Ok(_) => {
            let response = UserResponseDto::from(new_user);
            HttpResponse::Created().json(response)
        },
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

// Get a user by ID
async fn get_user(
    path: web::Path<String>,
    data: web::Data<AppState>,
) -> impl Responder {
    let user_id = match Uuid::parse_str(&path.into_inner()) {
        Ok(id) => id,
        Err(_) => return HttpResponse::BadRequest().body("Invalid user ID"),
    };

    match data.user_repository.find_by_id(user_id).await {
        Ok(Some(user)) => {
            let response = UserResponseDto::from(user);
            HttpResponse::Ok().json(response)
        },
        Ok(None) => HttpResponse::NotFound().body("User not found"),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

// Update a user
async fn update_user(
    path: web::Path<String>,
    user_dto: web::Json<UpdateUserDto>,
    data: web::Data<AppState>,
) -> impl Responder {
    // Implementation similar to create and get...
    HttpResponse::Ok().json(user_response)
}

// Delete a user
async fn delete_user(
    path: web::Path<String>,
    data: web::Data<AppState>,
) -> impl Responder {
    // Implementation to delete the user...
    HttpResponse::NoContent().finish()
}

// Register routes
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/users")
            .route("", web::post().to(create_user))
            .route("/{id}", web::get().to(get_user))
            .route("/{id}", web::put().to(update_user))
            .route("/{id}", web::delete().to(delete_user))
    );
}
```

### Request Validation

Rust's type system provides a strong foundation for request validation. Libraries like `validator` can be used to add declarative validation to your DTOs:

```rust
use validator::{Validate, ValidationErrors};

#[derive(Deserialize, Validate)]
struct CreateUserDto {
    #[validate(length(min = 3, message = "Username must be at least 3 characters"))]
    username: String,

    #[validate(email(message = "Must provide a valid email address"))]
    email: String,

    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    password: String,
}
```

For more complex validation logic, you can implement custom validators:

```rust
impl Validate for CreateUserDto {
    fn validate(&self) -> Result<(), ValidationErrors> {
        // Call the derive-generated validation
        let mut errors = match self.validate_fields() {
            Ok(_) => ValidationErrors::new(),
            Err(e) => e,
        };

        // Custom validation logic
        if self.username.contains(&self.password) {
            errors.add("password", ValidationError::new("Password cannot contain username"));
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}
```

### Error Handling

Consistent error handling is crucial for a well-designed API. In Rust, you might create a custom error type that can be converted to appropriate HTTP responses:

```rust
#[derive(Debug, thiserror::Error)]
enum ApiError {
    #[error("Resource not found")]
    NotFound,

    #[error("Validation error: {0}")]
    ValidationError(#[from] ValidationErrors),

    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Internal server error: {0}")]
    InternalError(String),
}

impl ResponseError for ApiError {
    fn status_code(&self) -> StatusCode {
        match self {
            ApiError::NotFound => StatusCode::NOT_FOUND,
            ApiError::ValidationError(_) => StatusCode::BAD_REQUEST,
            ApiError::DatabaseError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            ApiError::Unauthorized => StatusCode::UNAUTHORIZED,
            ApiError::InternalError(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        let status = self.status_code();
        let error_message = self.to_string();

        HttpResponse::build(status)
            .json(json!({
                "error": {
                    "status": status.as_u16(),
                    "message": error_message
                }
            }))
    }
}
```

With this approach, your handler functions can return `Result<HttpResponse, ApiError>`, and the framework will automatically convert errors to appropriate HTTP responses.

### Content Negotiation

RESTful APIs should support different representation formats based on client preferences. In Rust frameworks, you can handle content negotiation with middleware or response formatters:

```rust
use actix_web::{http::header, HttpResponse, Responder};
use serde::Serialize;

enum ResponseFormat {
    Json,
    Xml,
}

impl ResponseFormat {
    fn from_accept_header(accept: Option<&header::HeaderValue>) -> Self {
        match accept {
            Some(value) if value.to_str().unwrap_or("").contains("application/xml") => Self::Xml,
            _ => Self::Json,
        }
    }
}

struct ApiResponse<T: Serialize> {
    data: T,
    format: ResponseFormat,
}

impl<T: Serialize> Responder for ApiResponse<T> {
    fn respond_to(self, req: &HttpRequest) -> HttpResponse {
        let format = ResponseFormat::from_accept_header(
            req.headers().get(header::ACCEPT)
        );

        match format {
            ResponseFormat::Json => HttpResponse::Ok()
                .content_type("application/json")
                .json(self.data),
            ResponseFormat::Xml => {
                // Convert to XML using a library like quick-xml
                let xml = quick_xml::se::to_string(&self.data).unwrap_or_default();
                HttpResponse::Ok()
                    .content_type("application/xml")
                    .body(xml)
            }
        }
    }
}
```

### Versioning Your API

API versioning helps you evolve your API without breaking existing clients. There are several common approaches:

1. **URL Versioning**: Include the version in the URL path (`/api/v1/users`).
2. **Query Parameter Versioning**: Use a query parameter (`/api/users?version=1`).
3. **Header Versioning**: Use a custom HTTP header (`API-Version: 1`).
4. **Content Type Versioning**: Include the version in the media type (`application/vnd.company.api.v1+json`).

Here's an example of URL versioning with Actix Web:

```rust
// Main app configuration
pub fn configure_app(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api")
            .service(web::scope("/v1").configure(v1::configure_routes))
            .service(web::scope("/v2").configure(v2::configure_routes))
    );
}

// Version 1 routes
mod v1 {
    pub fn configure_routes(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/users")
                .route("", web::post().to(create_user_v1))
                .route("/{id}", web::get().to(get_user_v1))
                // ...
        );
    }
}

// Version 2 routes
mod v2 {
    pub fn configure_routes(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/users")
                .route("", web::post().to(create_user_v2))
                .route("/{id}", web::get().to(get_user_v2))
                // ...
        );
    }
}
```

### Documentation with OpenAPI/Swagger

Documenting your API is essential for developer adoption. The `utoipa` crate provides OpenAPI/Swagger integration for Rust web frameworks:

```rust
use utoipa::{OpenApi, ToSchema};
use utoipa_swagger_ui::SwaggerUi;

#[derive(OpenApi)]
#[openapi(
    paths(
        create_user,
        get_user,
        update_user,
        delete_user
    ),
    components(
        schemas(CreateUserDto, UserResponseDto, ApiError)
    ),
    tags(
        (name = "users", description = "User management API")
    )
)]
struct ApiDoc;

#[utoipa::path(
    post,
    path = "/api/users",
    request_body = CreateUserDto,
    responses(
        (status = 201, description = "User created successfully", body = UserResponseDto),
        (status = 400, description = "Validation error", body = ApiError),
        (status = 500, description = "Internal server error", body = ApiError)
    ),
    tag = "users"
)]
async fn create_user(/* ... */) -> impl Responder {
    // Implementation...
}

// Add Swagger UI to your app
HttpServer::new(|| {
    App::new()
        .service(
            SwaggerUi::new("/swagger-ui/{_:.*}")
                .url("/api-docs/openapi.json", ApiDoc::openapi())
        )
        .configure(configure_app)
})
```

### Best Practices for RESTful APIs in Rust

1. **Use the Type System**: Leverage Rust's type system for validation and to prevent bugs.
2. **Apply the Repository Pattern**: Separate your data access logic from your API handlers.
3. **Implement Proper Error Handling**: Create a consistent error handling strategy.
4. **Use Middleware for Cross-Cutting Concerns**: Apply middleware for logging, authentication, etc.
5. **Embrace Async/Await**: Use Rust's async capabilities for non-blocking I/O operations.
6. **Test Your API**: Write unit and integration tests for your endpoints.
7. **Document Your API**: Provide clear documentation for your API consumers.
8. **Follow HTTP Semantics**: Use appropriate status codes and methods.
9. **Apply Rate Limiting**: Protect your API from abuse with rate limiting.
10. **Monitor Performance**: Use metrics and logging to track API performance.

In the next section, we'll explore how to integrate your Rust API with databases using SQLx.

## Database Integration with SQLx

A critical component of most web applications is the ability to store and retrieve data from a database. In Rust, SQLx has emerged as one of the most popular libraries for database interaction. SQLx is an async, pure Rust SQL crate featuring compile-time checked queries without a DSL.

### Introduction to SQLx

SQLx takes a unique approach to database interaction in Rust:

- **Compile-Time Checked Queries**: SQLx can verify your SQL queries at compile time against your actual database schema.
- **Async First**: Built with async/await support from the ground up.
- **Type-Safe**: Results are mapped to Rust types, leveraging Rust's type system.
- **Multiple Database Support**: Works with PostgreSQL, MySQL, SQLite, and Microsoft SQL Server.
- **No Runtime Reflection**: Unlike traditional ORMs, SQLx doesn't rely on runtime reflection.

Let's explore how to integrate SQLx into a Rust web application.

### Setting Up SQLx

First, add SQLx to your `Cargo.toml`:

```toml
[dependencies]
sqlx = { version = "0.7", features = ["runtime-tokio-native-tls", "postgres", "uuid", "time", "json"] }
```

The features you select depend on your specific needs:

- `runtime-tokio-native-tls`: Uses Tokio for async runtime with native TLS.
- `postgres`: Support for PostgreSQL (alternatively, you can choose `mysql`, `sqlite`, or `mssql`).
- Additional features for specific data types like `uuid`, `time`, and `json`.

### Creating a Database Connection Pool

In a web application, it's important to use a connection pool to efficiently manage database connections:

```rust
use sqlx::postgres::{PgPool, PgPoolOptions};
use std::time::Duration;

async fn create_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(database_url)
        .await
}

// In your application startup
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    let pool = create_pool(&database_url)
        .await
        .expect("Failed to create pool");

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            // Configure routes and other middleware
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

### Defining Database Models

With SQLx, you can map your database rows to Rust structs:

```rust
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, FromRow)]
struct User {
    id: Uuid,
    username: String,
    email: String,
    password_hash: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
struct Post {
    id: Uuid,
    title: String,
    content: String,
    user_id: Uuid,
    published: bool,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
```

The `FromRow` trait enables automatic mapping from database rows to Rust structs.

### Executing Queries

SQLx provides several ways to execute queries:

#### Simple Queries

For basic CRUD operations:

```rust
async fn find_user_by_id(pool: &PgPool, id: Uuid) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await
}

async fn create_user(
    pool: &PgPool,
    username: &str,
    email: &str,
    password_hash: &str,
) -> Result<User, sqlx::Error> {
    let now = Utc::now();
    let id = Uuid::new_v4();

    sqlx::query_as::<_, User>(
        "INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *"
    )
    .bind(id)
    .bind(username)
    .bind(email)
    .bind(password_hash)
    .bind(now)
    .bind(now)
    .fetch_one(pool)
    .await
}
```

#### Compile-Time Checked Queries

One of SQLx's standout features is compile-time query checking. Using the `query!` and `query_as!` macros, SQLx can verify your SQL against your actual database schema during compilation:

```rust
async fn find_user_by_id(pool: &PgPool, id: Uuid) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as!(
        User,
        "SELECT * FROM users WHERE id = $1",
        id
    )
    .fetch_optional(pool)
    .await
}
```

For this to work, you need to set up the `DATABASE_URL` environment variable and enable the `offline` feature or run with the `sqlx-cli` prepare command.

#### Transactions

For operations that require multiple queries to be executed atomically:

```rust
async fn create_post_with_tags(
    pool: &PgPool,
    user_id: Uuid,
    title: &str,
    content: &str,
    tags: &[String],
) -> Result<Post, sqlx::Error> {
    let mut tx = pool.begin().await?;

    // Create the post
    let post = sqlx::query_as::<_, Post>(
        "INSERT INTO posts (id, title, content, user_id, published, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *"
    )
    .bind(Uuid::new_v4())
    .bind(title)
    .bind(content)
    .bind(user_id)
    .bind(false) // not published initially
    .bind(Utc::now())
    .bind(Utc::now())
    .fetch_one(&mut *tx)
    .await?;

    // Add tags
    for tag in tags {
        // First, ensure the tag exists
        let tag_id = sqlx::query_scalar::<_, Uuid>(
            "INSERT INTO tags (name) VALUES ($1)
             ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
             RETURNING id"
        )
        .bind(tag)
        .fetch_one(&mut *tx)
        .await?;

        // Then, link the post to the tag
        sqlx::query(
            "INSERT INTO post_tags (post_id, tag_id)
             VALUES ($1, $2)"
        )
        .bind(post.id)
        .bind(tag_id)
        .execute(&mut *tx)
        .await?;
    }

    // Commit the transaction
    tx.commit().await?;

    Ok(post)
}
```

### Implementing the Repository Pattern

The repository pattern provides a clean abstraction over your data access code. Here's how you might implement it with SQLx:

```rust
// Define the repository trait
#[async_trait]
trait UserRepository {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, sqlx::Error>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, sqlx::Error>;
    async fn create(&self, user: NewUser) -> Result<User, sqlx::Error>;
    async fn update(&self, id: Uuid, user: UpdateUser) -> Result<Option<User>, sqlx::Error>;
    async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error>;
}

// PostgreSQL implementation of the repository
struct PgUserRepository {
    pool: PgPool,
}

impl PgUserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl UserRepository for PgUserRepository {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as!(
            User,
            "SELECT * FROM users WHERE id = $1",
            id
        )
        .fetch_optional(&self.pool)
        .await
    }

    async fn find_by_email(&self, email: &str) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as!(
            User,
            "SELECT * FROM users WHERE email = $1",
            email
        )
        .fetch_optional(&self.pool)
        .await
    }

    async fn create(&self, user: NewUser) -> Result<User, sqlx::Error> {
        let now = Utc::now();
        let id = Uuid::new_v4();

        sqlx::query_as!(
            User,
            r#"
            INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            "#,
            id,
            user.username,
            user.email,
            user.password_hash,
            now,
            now
        )
        .fetch_one(&self.pool)
        .await
    }

    // Implement update and delete methods similarly
}
```

Then use the repository in your API handlers:

```rust
async fn get_user(
    path: web::Path<String>,
    repo: web::Data<Arc<dyn UserRepository>>,
) -> impl Responder {
    let user_id = match Uuid::parse_str(&path.into_inner()) {
        Ok(id) => id,
        Err(_) => return HttpResponse::BadRequest().body("Invalid user ID"),
    };

    match repo.find_by_id(user_id).await {
        Ok(Some(user)) => {
            let response = UserResponseDto::from(user);
            HttpResponse::Ok().json(response)
        },
        Ok(None) => HttpResponse::NotFound().body("User not found"),
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

// In your app configuration
let user_repository = Arc::new(PgUserRepository::new(pool.clone())) as Arc<dyn UserRepository>;

App::new()
    .app_data(web::Data::new(user_repository))
    // ...
```

### Migrations with SQLx

SQLx provides a built-in migration system to manage database schema changes:

```rust
use sqlx::migrate::Migrator;
use std::path::Path;

// In your application startup
async fn run_migrations(pool: &PgPool) -> Result<(), sqlx::Error> {
    let migrations = Path::new("./migrations");
    Migrator::new(migrations)
        .await?
        .run(pool)
        .await
}
```

You can create migrations using the SQLx CLI:

```bash
# Install the CLI
cargo install sqlx-cli

# Create a new migration
sqlx migrate add create_users_table

# The above command creates a file like 'migrations/20230101120000_create_users_table.sql'
# Edit this file to add your SQL commands:

-- migrations/20230101120000_create_users_table.sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### Testing Database Code

Testing code that interacts with a database requires special consideration. Here are some approaches:

#### Integration Tests with a Test Database

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use dotenv::dotenv;
    use sqlx::postgres::PgPoolOptions;
    use std::env;

    async fn setup_test_db() -> PgPool {
        dotenv().ok();

        let database_url = env::var("TEST_DATABASE_URL")
            .expect("TEST_DATABASE_URL must be set");

        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(&database_url)
            .await
            .expect("Failed to create pool");

        // Run migrations to ensure schema is up to date
        let migrations = Path::new("./migrations");
        Migrator::new(migrations)
            .await
            .expect("Failed to initialize migrator")
            .run(&pool)
            .await
            .expect("Failed to run migrations");

        pool
    }

    #[actix_rt::test]
    async fn test_create_user() {
        let pool = setup_test_db().await;
        let repo = PgUserRepository::new(pool);

        let new_user = NewUser {
            username: "test_user".to_string(),
            email: "test@example.com".to_string(),
            password_hash: "hashed_password".to_string(),
        };

        let user = repo.create(new_user).await.expect("Failed to create user");

        assert_eq!(user.username, "test_user");
        assert_eq!(user.email, "test@example.com");

        // Clean up
        repo.delete(user.id).await.expect("Failed to delete user");
    }
}
```

#### Using SQLx's Testing Features

SQLx provides features to make testing easier, like the ability to use transactions to automatically roll back changes:

```rust
#[actix_rt::test]
async fn test_with_transaction() {
    let pool = setup_test_db().await;

    // Start a transaction
    let mut tx = pool.begin().await.expect("Failed to start transaction");

    // Create a repository with the transaction
    let repo = PgUserRepository::new(tx.as_mut());

    // Test your code
    let new_user = NewUser { /* ... */ };
    let user = repo.create(new_user).await.expect("Failed to create user");

    assert_eq!(user.username, "test_user");

    // The transaction will be rolled back when tx is dropped,
    // so no cleanup is necessary
}
```

### Best Practices for Database Integration

1. **Use Connection Pooling**: Always use a connection pool to manage database connections efficiently.
2. **Implement the Repository Pattern**: Separate database logic from business logic.
3. **Use Transactions**: Wrap related operations in transactions to ensure data integrity.
4. **Leverage Compile-Time Checking**: Use SQLx's `query!` and `query_as!` macros to catch SQL errors at compile time.
5. **Parameterize Queries**: Always use parameters instead of string concatenation to prevent SQL injection.
6. **Manage Migrations**: Use SQLx's migration system to track and apply schema changes.
7. **Test Database Code**: Write integration tests for your database code.
8. **Handle Errors Gracefully**: Implement proper error handling for database operations.
9. **Monitor Performance**: Use logging and metrics to identify slow queries.
10. **Consider Security**: Be careful with sensitive data and implement proper access controls.

In the next section, we'll explore authentication and security in Rust web applications.

## Authentication and Security

Security is a critical aspect of web application development. In this section, we'll explore how to implement authentication, authorization, and other security measures in Rust web applications.

### Authentication Fundamentals

Authentication is the process of verifying the identity of a user. In web applications, common authentication methods include:

1. **Username/Password Authentication**: The most common method where users provide credentials.
2. **Token-Based Authentication**: After successful login, the server issues a token (often a JWT) that the client includes in subsequent requests.
3. **OAuth 2.0**: A protocol that allows users to grant limited access to their resources on one site to another site, without providing credentials.
4. **Multi-factor Authentication (MFA)**: Requires additional verification beyond just a password.

### Implementing Password-Based Authentication

Let's start with the basics of password-based authentication in Rust:

#### Secure Password Storage

Never store passwords in plain text. Instead, use a cryptographic hashing function designed for passwords:

```rust
use argon2::{self, Config};
use rand::Rng;

fn hash_password(password: &str) -> Result<String, argon2::Error> {
    let salt = rand::thread_rng().gen::<[u8; 32]>();
    let config = Config::default();

    argon2::hash_encoded(password.as_bytes(), &salt, &config)
}

fn verify_password(hash: &str, password: &str) -> Result<bool, argon2::Error> {
    argon2::verify_encoded(hash, password.as_bytes())
}

// Usage in user creation
async fn create_user(
    pool: &PgPool,
    username: &str,
    email: &str,
    password: &str,
) -> Result<User, ApiError> {
    // Hash the password
    let password_hash = hash_password(password)
        .map_err(|_| ApiError::InternalError("Failed to hash password".to_string()))?;

    // Store the user with the hashed password
    // ...
}

// Usage in login
async fn login(
    pool: &PgPool,
    email: &str,
    password: &str,
) -> Result<User, ApiError> {
    // Find the user by email
    let user = sqlx::query_as!(
        User,
        "SELECT * FROM users WHERE email = $1",
        email
    )
    .fetch_optional(pool)
    .await?
    .ok_or(ApiError::InvalidCredentials)?;

    // Verify the password
    let is_valid = verify_password(&user.password_hash, password)
        .map_err(|_| ApiError::InternalError("Failed to verify password".to_string()))?;

    if !is_valid {
        return Err(ApiError::InvalidCredentials);
    }

    Ok(user)
}
```

#### Token-Based Authentication with JWT

JSON Web Tokens (JWT) are a popular mechanism for implementing token-based authentication:

```rust
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use serde::{Serialize, Deserialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,      // Subject (user ID)
    exp: usize,       // Expiration time
    iat: usize,       // Issued at
    role: String,     // User role
}

fn create_jwt(user_id: Uuid, role: &str, secret: &[u8]) -> Result<String, jsonwebtoken::errors::Error> {
    let now = Utc::now();
    let expires_at = now + Duration::hours(24);

    let claims = Claims {
        sub: user_id.to_string(),
        exp: expires_at.timestamp() as usize,
        iat: now.timestamp() as usize,
        role: role.to_string(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret),
    )
}

fn validate_jwt(token: &str, secret: &[u8]) -> Result<Claims, jsonwebtoken::errors::Error> {
    let validation = Validation::default();

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret),
        &validation,
    )?;

    Ok(token_data.claims)
}

// Login handler that issues a JWT
async fn login(
    form: web::Form<LoginForm>,
    data: web::Data<AppState>,
) -> impl Responder {
    // Authenticate the user
    let user = match authenticate_user(&data.pool, &form.email, &form.password).await {
        Ok(user) => user,
        Err(_) => return HttpResponse::Unauthorized().body("Invalid credentials"),
    };

    // Create a JWT
    let token = match create_jwt(user.id, &user.role, data.jwt_secret.as_bytes()) {
        Ok(token) => token,
        Err(_) => return HttpResponse::InternalServerError().body("Could not create token"),
    };

    // Return the token
    HttpResponse::Ok().json(json!({ "token": token }))
}
```

### Implementing Authentication Middleware

To protect routes, implement middleware that validates JWTs:

```rust
use actix_web::{
    dev::ServiceRequest, dev::ServiceResponse, Error, HttpMessage,
    web, error::ErrorUnauthorized,
};
use actix_web_httpauth::extractors::bearer::{BearerAuth, Config};
use actix_web_httpauth::extractors::AuthenticationError;
use futures::future::{ready, Ready};

// Middleware factory
pub async fn auth_middleware(
    req: ServiceRequest,
    credentials: BearerAuth,
) -> Result<ServiceRequest, Error> {
    // Extract the token
    let token = credentials.token();

    // Get the JWT secret from app data
    let app_state = req.app_data::<web::Data<AppState>>().unwrap();

    // Validate the token
    match validate_jwt(token, app_state.jwt_secret.as_bytes()) {
        Ok(claims) => {
            // Store the validated claims in request extensions for handlers to access
            req.extensions_mut().insert(claims);
            Ok(req)
        },
        Err(_) => {
            let config = req.app_data::<Config>().cloned().unwrap_or_default();
            Err(ErrorUnauthorized(AuthenticationError::from(config)))
        }
    }
}

// In your route configuration
App::new()
    .service(
        web::scope("/api")
            .service(
                web::scope("/public")
                    .route("/login", web::post().to(login))
                    // Other public routes
            )
            .service(
                web::scope("/private")
                    .wrap(HttpAuthentication::bearer(auth_middleware))
                    .route("/profile", web::get().to(get_profile))
                    // Other protected routes
            )
    )
```

### Role-Based Authorization

Once a user is authenticated, you often need to check if they have the appropriate permissions:

```rust
// Define roles
#[derive(Debug, PartialEq, Serialize, Deserialize)]
enum Role {
    User,
    Admin,
}

// Authorization middleware
fn check_admin(req: &HttpRequest) -> Result<(), Error> {
    // Get the claims from the request extensions
    if let Some(claims) = req.extensions().get::<Claims>() {
        if claims.role == "admin" {
            return Ok(());
        }
    }

    Err(ErrorForbidden("Insufficient permissions"))
}

// Use in a handler
async fn admin_only(req: HttpRequest) -> impl Responder {
    if let Err(e) = check_admin(&req) {
        return e.into();
    }

    // Admin-only functionality
    HttpResponse::Ok().body("Admin area")
}
```

### CORS Configuration

Cross-Origin Resource Sharing (CORS) is crucial when your API is accessed from different domains:

```rust
use actix_cors::Cors;
use actix_web::http::header;

// In your app configuration
let cors = Cors::default()
    .allowed_origin("https://frontend.example.com")
    .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
    .allowed_headers(vec![header::AUTHORIZATION, header::CONTENT_TYPE])
    .max_age(3600);

App::new()
    .wrap(cors)
    // ...
```

### CSRF Protection

Cross-Site Request Forgery (CSRF) attacks can be mitigated using tokens:

```rust
use actix_csrf::CsrfMiddleware;
use actix_session::Session;
use actix_web::cookie::Key;
use rand::Rng;

// Generate a CSRF key
let csrf_key = Key::generate();

// Create CSRF middleware
let csrf = CsrfMiddleware::new(csrf_key);

// In your app configuration
App::new()
    .wrap(csrf)
    // ...

// In a form handler
async fn render_form(session: Session) -> impl Responder {
    // Get the CSRF token from the session
    let csrf_token = session.get::<String>("csrf-token").unwrap_or_else(|_| None);

    // Render the form with the token
    HttpResponse::Ok().body(format!(
        r#"<form method="post">
            <input type="hidden" name="csrf-token" value="{}">
            <!-- Other form fields -->
            <button type="submit">Submit</button>
        </form>"#,
        csrf_token.unwrap_or_default()
    ))
}
```

### Rate Limiting

Protect your API from abuse by implementing rate limiting:

```rust
use actix_web::dev::{Service, ServiceRequest, ServiceResponse, Transform};
use futures::future::{ok, Ready};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::task::{Context, Poll};

// Simple in-memory rate limiter
struct RateLimiter {
    limits: Arc<Mutex<HashMap<String, (usize, chrono::DateTime<Utc>)>>>,
    max_requests: usize,
    window_secs: i64,
}

impl RateLimiter {
    fn new(max_requests: usize, window_secs: i64) -> Self {
        Self {
            limits: Arc::new(Mutex::new(HashMap::new())),
            max_requests,
            window_secs,
        }
    }
}

impl<S> Transform<S, ServiceRequest> for RateLimiter
where
    S: Service<ServiceRequest, Response = ServiceResponse, Error = Error>,
    S::Future: 'static,
{
    type Response = ServiceResponse;
    type Error = Error;
    type Transform = RateLimiterMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(RateLimiterMiddleware {
            service,
            limits: self.limits.clone(),
            max_requests: self.max_requests,
            window_secs: self.window_secs,
        })
    }
}

// Add to your app
App::new()
    .wrap(RateLimiter::new(100, 60)) // 100 requests per minute
    // ...
```

### Security Headers

Add security headers to your responses to mitigate various attacks:

```rust
use actix_web::middleware::DefaultHeaders;

// In your app configuration
App::new()
    .wrap(
        DefaultHeaders::new()
            .add(("X-Content-Type-Options", "nosniff"))
            .add(("X-Frame-Options", "DENY"))
            .add(("X-XSS-Protection", "1; mode=block"))
            .add(("Strict-Transport-Security", "max-age=31536000; includeSubDomains"))
            .add(("Referrer-Policy", "strict-origin-when-cross-origin"))
            .add(("Content-Security-Policy", "default-src 'self'"))
    )
    // ...
```

### Secure Sessions

For stateful applications, implement secure session management:

```rust
use actix_session::{CookieSession, Session};
use actix_web::cookie::SameSite;

// In your app configuration
App::new()
    .wrap(
        CookieSession::signed(&[0; 32]) // Use a proper key in production
            .secure(true)               // Only send over HTTPS
            .http_only(true)            // Not accessible via JavaScript
            .same_site(SameSite::Strict) // Prevent CSRF
            .max_age(3600)              // 1 hour expiration
    )
    // ...

// Using sessions in a handler
async fn handler(session: Session) -> impl Responder {
    // Get a value from the session
    let user_id: Option<String> = session.get("user_id").unwrap_or(None);

    // Set a value in the session
    session.insert("user_id", "12345").unwrap();

    // Clear the session
    session.purge();

    HttpResponse::Ok().finish()
}
```

### OAuth 2.0 Integration

For more complex authentication needs, integrate with OAuth 2.0 providers:

```rust
use oauth2::{
    AuthUrl, ClientId, ClientSecret, RedirectUrl, Scope, TokenUrl,
    basic::BasicClient, AuthorizationCode, CsrfToken, TokenResponse,
};
use url::Url;

// Set up the OAuth client
fn create_oauth_client() -> BasicClient {
    BasicClient::new(
        ClientId::new("client_id".to_string()),
        Some(ClientSecret::new("client_secret".to_string())),
        AuthUrl::new("https://provider.com/auth".to_string()).unwrap(),
        Some(TokenUrl::new("https://provider.com/token".to_string()).unwrap())
    )
    .set_redirect_uri(RedirectUrl::new("http://localhost:8080/auth/callback".to_string()).unwrap())
}

// Initiate OAuth flow
async fn start_oauth(session: Session) -> impl Responder {
    let client = create_oauth_client();

    // Generate a CSRF token
    let (auth_url, csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new("email".to_string()))
        .add_scope(Scope::new("profile".to_string()))
        .url();

    // Store the CSRF token in the session
    session.insert("oauth_csrf", csrf_token.secret()).unwrap();

    // Redirect to the OAuth provider
    HttpResponse::Found()
        .header(header::LOCATION, auth_url.to_string())
        .finish()
}

// Handle the OAuth callback
async fn oauth_callback(
    query: web::Query<HashMap<String, String>>,
    session: Session,
) -> impl Responder {
    // Get the authorization code
    let code = match query.get("code") {
        Some(code) => AuthorizationCode::new(code.to_string()),
        None => return HttpResponse::BadRequest().body("No code provided"),
    };

    // Get the state (CSRF token)
    let state = match query.get("state") {
        Some(state) => state,
        None => return HttpResponse::BadRequest().body("No state provided"),
    };

    // Verify the CSRF token
    let csrf = match session.get::<String>("oauth_csrf") {
        Ok(Some(csrf)) if csrf == state => csrf,
        _ => return HttpResponse::BadRequest().body("Invalid CSRF token"),
    };

    // Exchange the authorization code for a token
    let client = create_oauth_client();
    let token_result = client
        .exchange_code(code)
        .request(oauth2::reqwest::async_http_client)
        .await;

    match token_result {
        Ok(token) => {
            // Process the token (e.g., fetch user info, create session)
            // ...

            HttpResponse::Found()
                .header(header::LOCATION, "/dashboard")
                .finish()
        },
        Err(e) => HttpResponse::InternalServerError().body(format!("Error: {}", e)),
    }
}
```

### Best Practices for Security

1. **HTTPS Everywhere**: Always use HTTPS in production, and consider redirecting HTTP to HTTPS.
2. **Proper Password Storage**: Use strong hashing algorithms like Argon2 or bcrypt.
3. **Input Validation**: Validate all user input on both client and server sides.
4. **Parameterized Queries**: Use parameterized queries to prevent SQL injection.
5. **CSRF Protection**: Implement CSRF tokens for state-changing operations.
6. **Security Headers**: Add appropriate security headers to your responses.
7. **Rate Limiting**: Protect endpoints from abuse, especially authentication endpoints.
8. **Principle of Least Privilege**: Only grant the minimal permissions necessary.
9. **Regular Updates**: Keep your dependencies up to date to address security vulnerabilities.
10. **Security Scanning**: Use tools like `cargo-audit` to check for known vulnerabilities in your dependencies.

### Handling Sensitive Data

When working with sensitive data, follow these additional guidelines:

1. **Encryption at Rest**: Encrypt sensitive data stored in your database.
2. **Secure Communication**: Use TLS for all network communication.
3. **Minimal Data Retention**: Only store necessary data, and delete what you don't need.
4. **Logging Considerations**: Be careful not to log sensitive information like passwords or tokens.
5. **Environment Variables**: Use environment variables for secrets, not hardcoded values.

In the next section, we'll explore middleware and request handlers in Rust web frameworks.

## Middleware and Request Handlers

Middleware and request handlers are essential components of any web application. They allow you to intercept and process requests and responses, enabling features like logging, authentication, compression, and more. In this section, we'll explore how middleware works in Rust web frameworks and how to implement custom middleware.

### Understanding Middleware in Rust Web Frameworks

Middleware in Rust web frameworks follows a similar pattern to other languages, but with Rust's strong typing and ownership model providing additional safety guarantees. Middleware typically:

1. Intercepts requests before they reach handlers
2. Can modify or process the request
3. Can short-circuit request processing
4. Can modify responses after handlers process them

Let's look at how middleware is implemented in different Rust web frameworks.

### Middleware in Actix Web

Actix Web provides a robust middleware system based on the `Service` and `Transform` traits from the `tower-service` crate. This allows for powerful composition of middleware.

#### Built-in Middleware

Actix Web includes several built-in middleware components:

```rust
use actix_web::{
    middleware::{Logger, Compress, DefaultHeaders},
    App, HttpServer,
};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    std::env::set_var("RUST_LOG", "actix_web=info");
    env_logger::init();

    HttpServer::new(|| {
        App::new()
            // Logger middleware logs requests and responses
            .wrap(Logger::default())
            // Compress responses
            .wrap(Compress::default())
            // Add security headers
            .wrap(
                DefaultHeaders::new()
                    .add(("X-Content-Type-Options", "nosniff"))
            )
            // Configure routes
            .service(/* ... */)
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

#### Creating Custom Middleware

For more complex requirements, you can create custom middleware by implementing the `Service` and `Transform` traits:

```rust
use actix_web::{
    dev::{Service, ServiceRequest, ServiceResponse, Transform},
    Error,
};
use futures::future::{ok, Ready};
use futures::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

// Middleware for timing requests
pub struct RequestTimer;

impl<S, B> Transform<S, ServiceRequest> for RequestTimer
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = RequestTimerMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(RequestTimerMiddleware { service })
    }
}

pub struct RequestTimerMiddleware<S> {
    service: S,
}

impl<S, B> Service<ServiceRequest> for RequestTimerMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>>>>;

    fn poll_ready(&self, ctx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(ctx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let start = std::time::Instant::now();

        let fut = self.service.call(req);

        Box::pin(async move {
            let res = fut.await?;

            let duration = start.elapsed();
            println!("Request took {}ms", duration.as_millis());

            Ok(res)
        })
    }
}

// Add to your app
App::new()
    .wrap(RequestTimer)
    // ...
```

### Middleware in Rocket

Rocket's approach to middleware is different from Actix Web's. Rocket uses "Fairings" for global request and response processing.

#### Using Fairings in Rocket

```rust
use rocket::{Request, Data, Response};
use rocket::fairing::{Fairing, Info, Kind};
use std::time::{Duration, Instant};

struct RequestTimer;

#[rocket::async_trait]
impl Fairing for RequestTimer {
    fn info(&self) -> Info {
        Info {
            name: "Request Timer",
            kind: Kind::Request | Kind::Response,
        }
    }

    async fn on_request(&self, request: &mut Request<'_>, _: &mut Data<'_>) {
        // Store the start time in request-local state
        request.local_cache(|| Instant::now());
    }

    async fn on_response<'r>(&self, request: &'r Request<'_>, response: &mut Response<'r>) {
        let start_time = request.local_cache::<Instant>();
        let duration = start_time.elapsed();

        println!("Request to {} took {}ms", request.uri(), duration.as_millis());

        // Add timing header to response
        response.set_header(
            rocket::http::Header::new(
                "X-Response-Time",
                format!("{}ms", duration.as_millis())
            )
        );
    }
}

// In your Rocket app
#[launch]
fn rocket() -> _ {
    rocket::build()
        .attach(RequestTimer)
        // ...
}
```

### Middleware in Axum

Axum uses `tower::Layer` and `tower::Service` for middleware, making it highly composable:

```rust
use axum::{
    Router,
    routing::get,
    middleware::{self, Next},
    response::IntoResponse,
    http::{Request, StatusCode},
};
use std::time::Instant;

// Simple request timing middleware
async fn track_time<B>(req: Request<B>, next: Next<B>) -> impl IntoResponse {
    let start = Instant::now();

    // Pass the request to the next middleware or handler
    let response = next.run(req).await;

    // Record the time taken
    let duration = start.elapsed();
    println!("Request took {}ms", duration.as_millis());

    // Return the response
    response
}

// In your app
let app = Router::new()
    .route("/", get(|| async { "Hello, World!" }))
    .layer(middleware::from_fn(track_time));
```

### Request Handlers

Request handlers are the functions that process specific routes in your web application. Let's look at how handlers work in different frameworks.

#### Handlers in Actix Web

Actix Web handlers are async functions that take extractors as parameters and return types that implement the `Responder` trait:

```rust
use actix_web::{web, HttpResponse, Responder, get, post};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct CreateUserRequest {
    username: String,
    email: String,
}

#[derive(Serialize)]
struct UserResponse {
    id: String,
    username: String,
}

// Handler with path parameters
#[get("/users/{id}")]
async fn get_user(path: web::Path<String>) -> impl Responder {
    let user_id = path.into_inner();
    // Fetch user from database...
    HttpResponse::Ok().json(UserResponse {
        id: user_id,
        username: "johndoe".to_string(),
    })
}

// Handler with JSON body
#[post("/users")]
async fn create_user(user: web::Json<CreateUserRequest>) -> impl Responder {
    // Create user in database...
    HttpResponse::Created().json(UserResponse {
        id: "new-id".to_string(),
        username: user.username.clone(),
    })
}

// Handler with query parameters
async fn search_users(query: web::Query<HashMap<String, String>>) -> impl Responder {
    let term = query.get("q").unwrap_or(&"".to_string());
    // Search users...
    HttpResponse::Ok().json(vec![
        UserResponse {
            id: "1".to_string(),
            username: format!("Result for {}", term),
        }
    ])
}

// Handler with form data
async fn update_user_form(
    path: web::Path<String>,
    form: web::Form<HashMap<String, String>>,
) -> impl Responder {
    // Update user...
    format!("Updated user {} to {}", path.into_inner(), form.username)
}
```

#### Handlers in Rocket

Rocket's handlers are annotated functions that can use various guards to extract data:

```rust
use rocket::serde::{Deserialize, Serialize, json::Json};
use rocket::form::Form;
use rocket::State;

#[derive(Deserialize)]
struct User {
    username: String,
    email: String,
}

#[derive(Serialize)]
struct UserResponse {
    id: String,
    username: String,
}

// Path parameters
#[get("/users/<id>")]
fn get_user(id: &str) -> Json<UserResponse> {
    // Fetch user from database...
    Json(UserResponse {
        id: id.to_string(),
        username: "johndoe".to_string(),
    })
}

// JSON body
#[post("/users", data = "<user>")]
fn create_user(user: Json<User>) -> Json<UserResponse> {
    // Create user in database...
    Json(UserResponse {
        id: "new-id".to_string(),
        username: user.username.clone(),
    })
}

// Query parameters
#[get("/users?<q>")]
fn search_users(q: Option<&str>) -> Json<Vec<UserResponse>> {
    let term = q.unwrap_or("");
    // Search users...
    Json(vec![
        UserResponse {
            id: "1".to_string(),
            username: format!("Result for {}", term),
        }
    ])
}

// Form data
#[post("/users/<id>", data = "<form>")]
fn update_user_form(id: &str, form: Form<User>) -> String {
    // Update user...
    format!("Updated user {} to {}", id, form.username)
}
```

#### Handlers in Axum

Axum handlers are async functions that use extractors to obtain data from requests:

```rust
use axum::{
    extract::{Path, Query, Json, Form},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Deserialize)]
struct User {
    username: String,
    email: String,
}

#[derive(Serialize)]
struct UserResponse {
    id: String,
    username: String,
}

// Path parameters
async fn get_user(Path(id): Path<String>) -> Json<UserResponse> {
    // Fetch user from database...
    Json(UserResponse {
        id,
        username: "johndoe".to_string(),
    })
}

// JSON body
async fn create_user(Json(user): Json<User>) -> Json<UserResponse> {
    // Create user in database...
    Json(UserResponse {
        id: "new-id".to_string(),
        username: user.username,
    })
}

// Query parameters
async fn search_users(Query(params): Query<HashMap<String, String>>) -> Json<Vec<UserResponse>> {
    let term = params.get("q").unwrap_or(&"".to_string());
    // Search users...
    Json(vec![
        UserResponse {
            id: "1".to_string(),
            username: format!("Result for {}", term),
        }
    ])
}

// Form data
async fn update_user_form(
    Path(id): Path<String>,
    Form(form): Form<User>,
) -> String {
    // Update user...
    format!("Updated user {} to {}", id, form.username)
}

// Routing configuration
let app = Router::new()
    .route("/users/:id", get(get_user))
    .route("/users", post(create_user))
    .route("/users", get(search_users))
    .route("/users/:id", post(update_user_form));
```

### Error Handling in Request Handlers

Proper error handling in request handlers is crucial for a robust API. Here's how you might handle errors in different frameworks:

#### Actix Web Error Handling

```rust
use actix_web::{error, web, HttpResponse, Result};
use derive_more::{Display, Error};

#[derive(Debug, Display, Error)]
enum MyError {
    #[display(fmt = "Internal error: {}", _0)]
    InternalError(String),

    #[display(fmt = "Not found: {}", _0)]
    NotFound(String),

    #[display(fmt = "Bad request: {}", _0)]
    BadRequest(String),
}

impl error::ResponseError for MyError {
    fn error_response(&self) -> HttpResponse {
        match *self {
            MyError::InternalError(_) => HttpResponse::InternalServerError().json("Internal server error"),
            MyError::NotFound(ref message) => HttpResponse::NotFound().json(message),
            MyError::BadRequest(ref message) => HttpResponse::BadRequest().json(message),
        }
    }
}

async fn handler() -> Result<HttpResponse, MyError> {
    // This might fail
    let result = do_something().map_err(|e| {
        MyError::InternalError(format!("Something went wrong: {}", e))
    })?;

    Ok(HttpResponse::Ok().json(result))
}
```

#### Rocket Error Handling

Rocket provides built-in support for common HTTP errors and allows you to implement the `Responder` trait for custom error types:

```rust
use rocket::response::{status, Responder};
use rocket::http::Status;
use rocket::serde::json::Json;
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
enum ApiError {
    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Internal server error: {0}")]
    InternalError(String),
}

#[derive(Serialize)]
struct ErrorResponse {
    message: String,
}

impl<'r> Responder<'r, 'static> for ApiError {
    fn respond_to(self, _: &'r rocket::Request<'_>) -> rocket::response::Result<'static> {
        let error_message = self.to_string();
        let response = Json(ErrorResponse {
            message: error_message,
        });

        match self {
            ApiError::NotFound(_) => status::NotFound(response).respond_to(_),
            ApiError::BadRequest(_) => status::BadRequest(response).respond_to(_),
            ApiError::InternalError(_) => status::Custom(Status::InternalServerError, response).respond_to(_),
        }
    }
}

#[get("/users/<id>")]
fn get_user(id: &str) -> Result<Json<UserResponse>, ApiError> {
    // Fetch user from database
    let user = find_user(id).ok_or_else(|| {
        ApiError::NotFound(format!("User with id {} not found", id))
    })?;

    Ok(Json(user))
}
```

#### Axum Error Handling

Axum provides a flexible error handling system based on the `IntoResponse` trait:

```rust
use axum::{
    response::{IntoResponse, Response},
    http::StatusCode,
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Internal error: {0}")]
    InternalError(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::InternalError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        let body = Json(json!({
            "error": {
                "message": error_message,
                "status": status.as_u16()
            }
        }));

        (status, body).into_response()
    }
}

async fn get_user(Path(id): Path<String>) -> Result<Json<UserResponse>, AppError> {
    // Fetch user from database
    let user = find_user(&id).ok_or_else(|| {
        AppError::NotFound(format!("User with id {} not found", id))
    })?;

    Ok(Json(user))
}
```

### Best Practices for Middleware and Handlers

1. **Keep Middleware Focused**: Each middleware should have a single responsibility.
2. **Use Middleware for Cross-Cutting Concerns**: Logging, authentication, compression, etc.
3. **Separate Business Logic from Handlers**: Keep handlers thin and move complex logic to service layers.
4. **Consistent Error Handling**: Implement a unified error handling strategy.
5. **Use Type-Safe Extractors**: Leverage Rust's type system to validate input data.
6. **Optimize Middleware Order**: Place frequently short-circuiting middleware early in the chain.
7. **Handle Failures Gracefully**: Provide meaningful error responses.
8. **Validate Input Data**: Always validate user inputs before processing.
9. **Test Middleware and Handlers**: Write unit and integration tests.
10. **Document Your API**: Use tools like OpenAPI/Swagger for documentation.

In the next section, we'll explore frontend development with WebAssembly and frameworks like Yew and Leptos.

## Frontend with WebAssembly and Yew/Leptos

While Rust has established itself as a powerful language for backend development, it's also making significant inroads into frontend development through WebAssembly (Wasm). In this section, we'll explore how to build web user interfaces using Rust with frameworks like Yew and Leptos.

### Understanding WebAssembly

WebAssembly is a binary instruction format that runs in web browsers, providing near-native performance for code written in languages like Rust, C++, and others. Key benefits include:

1. **Performance**: Wasm runs at near-native speed, significantly faster than JavaScript for CPU-intensive tasks.
2. **Language Agnostic**: Allows using languages other than JavaScript in the browser.
3. **Security**: Executes in a sandboxed environment with tight memory safety guarantees.
4. **Portability**: Works across all modern browsers and platforms.

For Rust developers, WebAssembly opens up the possibility to build complete web applications with Rust on both the frontend and backend.

### Setting Up a Rust WebAssembly Project

Let's start by setting up a basic Rust WebAssembly project:

```bash
# Install wasm-pack, a tool for building Rust-generated WebAssembly
cargo install wasm-pack

# Create a new library for WebAssembly
cargo new --lib wasm-app
cd wasm-app

# Edit Cargo.toml to add necessary dependencies
```

Update your `Cargo.toml`:

```toml
[package]
name = "wasm-app"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
web-sys = { version = "0.3", features = [
  "console",
  "Document",
  "Element",
  "HtmlElement",
  "Window",
] }

[dev-dependencies]
wasm-bindgen-test = "0.3"
```

Create a simple WebAssembly module in `src/lib.rs`:

```rust
use wasm_bindgen::prelude::*;

// Export a function to JavaScript
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

// Call JavaScript from Rust
#[wasm_bindgen]
pub fn display_alert(message: &str) {
    // Get the window object
    let window = web_sys::window().expect("no global window exists");

    // Call the alert function
    window
        .alert_with_message(message)
        .expect("alert failed");
}

// DOM manipulation
#[wasm_bindgen(start)]
pub fn run() {
    // Log a message to the console
    web_sys::console::log_1(&"WebAssembly module loaded!".into());

    // Get the document
    let document = web_sys::window()
        .expect("no global window exists")
        .document()
        .expect("no document exists");

    // Create a new element
    let p = document
        .create_element("p")
        .expect("failed to create element");

    p.set_inner_html("This paragraph was created from Rust!");

    // Add the element to the document body
    let body = document.body().expect("document should have a body");
    body.append_child(&p).expect("failed to append child");
}
```

Build the WebAssembly module:

```bash
wasm-pack build --target web
```

This creates a `pkg` directory with JavaScript bindings for your Rust code. You can now use this in a web page:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Rust WebAssembly Demo</title>
  </head>
  <body>
    <h1>Rust WebAssembly Demo</h1>
    <button id="greet-button">Greet</button>

    <script type="module">
      import init, { greet, display_alert } from "./pkg/wasm_app.js";

      async function run() {
        // Initialize the WebAssembly module
        await init();

        // Set up event listeners
        document
          .getElementById("greet-button")
          .addEventListener("click", () => {
            const result = greet("WebAssembly");
            display_alert(result);
          });
      }

      run();
    </script>
  </body>
</html>
```

### Introduction to Yew

While the above example shows basic WebAssembly usage, building complex UIs this way would be tedious. This is where frameworks like Yew come in. Yew is a modern Rust framework for creating multi-threaded web applications with WebAssembly.

Yew provides:

- A component-based architecture similar to React
- A virtual DOM implementation for efficient rendering
- State management
- Event handling
- Routing capabilities

Let's create a simple Yew application:

```bash
# Create a new Yew project
cargo new --bin yew-app
cd yew-app
```

Update your `Cargo.toml`:

```toml
[package]
name = "yew-app"
version = "0.1.0"
edition = "2021"

[dependencies]
yew = { version = "0.20", features = ["csr"] }
wasm-bindgen = "0.2"
web-sys = "0.3"
gloo = "0.8"
```

Create a simple Yew component in `src/main.rs`:

```rust
use yew::prelude::*;

#[function_component(App)]
fn app() -> Html {
    let counter = use_state(|| 0);

    let onclick = {
        let counter = counter.clone();
        Callback::from(move |_| {
            let value = *counter + 1;
            counter.set(value);
        })
    };

    html! {
        <div>
            <h1>{ "Yew Counter App" }</h1>
            <p>{ "Current count: " }{ *counter }</p>
            <button {onclick}>{ "Increment" }</button>
        </div>
    }
}

fn main() {
    yew::Renderer::<App>::new().render();
}
```

Build and run the application:

```bash
trunk serve  # You need to install trunk: cargo install trunk
```

### Yew Component Lifecycle and State Management

Yew provides hooks for managing component lifecycle and state, similar to React:

```rust
use yew::prelude::*;
use gloo::console::log;

#[function_component(ComplexApp)]
fn complex_app() -> Html {
    // State hooks
    let counter = use_state(|| 0);
    let text = use_state(|| String::from(""));

    // Ref hook
    let input_ref = use_node_ref();

    // Effect hook - runs on mount and when dependencies change
    use_effect_with_deps(
        move |counter| {
            log!("Counter changed to", *counter);
            // Cleanup function (similar to React useEffect return)
            || log!("Cleaning up effect")
        },
        counter.clone(),
    );

    // Event handlers
    let onclick = {
        let counter = counter.clone();
        Callback::from(move |_| {
            counter.set(*counter + 1);
        })
    };

    let oninput = {
        let text = text.clone();
        Callback::from(move |e: InputEvent| {
            let input: web_sys::HtmlInputElement = e.target_unchecked_into();
            text.set(input.value());
        })
    };

    let onsubmit = Callback::from(move |e: SubmitEvent| {
        e.prevent_default();
        log!("Form submitted");
    });

    html! {
        <div>
            <h1>{ "Complex Yew App" }</h1>

            <div>
                <p>{ "Counter: " }{ *counter }</p>
                <button {onclick}>{ "Increment" }</button>
            </div>

            <form onsubmit={onsubmit}>
                <input
                    type="text"
                    value={(*text).clone()}
                    oninput={oninput}
                    ref={input_ref.clone()}
                    placeholder="Type something..."
                />
                <p>{ "You typed: " }{ (*text).clone() }</p>
                <button type="submit">{ "Submit" }</button>
            </form>
        </div>
    }
}
```

### Building a Todo List App with Yew

Let's create a more practical example - a Todo List application:

```rust
use yew::prelude::*;
use gloo::storage::{LocalStorage, Storage};
use serde::{Deserialize, Serialize};

const STORAGE_KEY: &str = "yew.todo.list";

#[derive(Clone, PartialEq, Serialize, Deserialize)]
struct Todo {
    id: usize,
    text: String,
    completed: bool,
}

#[function_component(TodoApp)]
fn todo_app() -> Html {
    // Load todos from local storage or start with empty list
    let todos = use_state(|| {
        LocalStorage::get(STORAGE_KEY).unwrap_or_else(|_| Vec::<Todo>::new())
    });

    let next_id = use_state(|| {
        todos.iter().map(|todo| todo.id).max().unwrap_or(0) + 1
    });

    let new_todo_text = use_state(|| String::new());

    // Save todos to local storage whenever they change
    use_effect_with_deps(
        move |todos| {
            LocalStorage::set(STORAGE_KEY, todos.deref()).expect("failed to save todos");
            || ()
        },
        todos.clone(),
    );

    // Event handlers
    let oninput = {
        let new_todo_text = new_todo_text.clone();
        Callback::from(move |e: InputEvent| {
            let input: web_sys::HtmlInputElement = e.target_unchecked_into();
            new_todo_text.set(input.value());
        })
    };

    let onsubmit = {
        let todos = todos.clone();
        let new_todo_text = new_todo_text.clone();
        let next_id = next_id.clone();

        Callback::from(move |e: SubmitEvent| {
            e.prevent_default();

            let text = (*new_todo_text).trim();
            if !text.is_empty() {
                // Create new todo
                let mut updated_todos = (*todos).clone();
                updated_todos.push(Todo {
                    id: *next_id,
                    text: text.to_string(),
                    completed: false,
                });

                // Update state
                todos.set(updated_todos);
                next_id.set(*next_id + 1);
                new_todo_text.set(String::new());
            }
        })
    };

    let toggle_todo = {
        let todos = todos.clone();

        Callback::from(move |id: usize| {
            let mut updated_todos = (*todos).clone();
            if let Some(todo) = updated_todos.iter_mut().find(|t| t.id == id) {
                todo.completed = !todo.completed;
                todos.set(updated_todos);
            }
        })
    };

    let delete_todo = {
        let todos = todos.clone();

        Callback::from(move |id: usize| {
            let mut updated_todos = (*todos).clone();
            updated_todos.retain(|t| t.id != id);
            todos.set(updated_todos);
        })
    };

    html! {
        <div class="todo-app">
            <h1>{ "Todo List" }</h1>

            <form onsubmit={onsubmit}>
                <input
                    type="text"
                    value={(*new_todo_text).clone()}
                    oninput={oninput}
                    placeholder="What needs to be done?"
                />
                <button type="submit">{ "Add" }</button>
            </form>

            <ul class="todo-list">
                {
                    (*todos).iter().map(|todo| {
                        let id = todo.id;
                        let onclick_toggle = {
                            let toggle_todo = toggle_todo.clone();
                            Callback::from(move |_| toggle_todo.emit(id))
                        };

                        let onclick_delete = {
                            let delete_todo = delete_todo.clone();
                            Callback::from(move |_| delete_todo.emit(id))
                        };

                        html! {
                            <li key={id} class={if todo.completed { "completed" } else { "" }}>
                                <input
                                    type="checkbox"
                                    checked={todo.completed}
                                    onclick={onclick_toggle}
                                />
                                <span>{ &todo.text }</span>
                                <button onclick={onclick_delete}>{ "Delete" }</button>
                            </li>
                        }
                    }).collect::<Html>()
                }
            </ul>

            <div class="todo-count">
                <span>{ format!("{} item(s) left", todos.iter().filter(|t| !t.completed).count()) }</span>
            </div>
        </div>
    }
}

fn main() {
    yew::Renderer::<TodoApp>::new().render();
}
```

### Making API Calls with Yew

Yew applications often need to communicate with backend APIs. Let's see how to make HTTP requests:

```rust
use yew::prelude::*;
use gloo::net::http::Request;
use serde::{Deserialize, Serialize};
use wasm_bindgen_futures::spawn_local;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
struct User {
    id: i32,
    name: String,
    email: String,
}

#[function_component(UserList)]
fn user_list() -> Html {
    let users = use_state(|| Vec::<User>::new());
    let error = use_state(|| None::<String>);
    let is_loading = use_state(|| false);

    // Fetch users on component mount
    {
        let users = users.clone();
        let error = error.clone();
        let is_loading = is_loading.clone();

        use_effect_with_deps(
            move |_| {
                is_loading.set(true);

                spawn_local(async move {
                    match Request::get("https://api.example.com/users")
                        .send()
                        .await
                    {
                        Ok(response) => {
                            if response.status() == 200 {
                                match response.json::<Vec<User>>().await {
                                    Ok(data) => {
                                        users.set(data);
                                        error.set(None);
                                    }
                                    Err(e) => error.set(Some(format!("Error parsing JSON: {}", e))),
                                }
                            } else {
                                error.set(Some(format!("Error: {}", response.status())));
                            }
                        }
                        Err(e) => error.set(Some(format!("Request error: {}", e))),
                    }

                    is_loading.set(false);
                });

                || ()
            },
            (),
        );
    }

    html! {
        <div>
            <h1>{ "User List" }</h1>

            if *is_loading {
                <p>{ "Loading..." }</p>
            } else if let Some(err) = &*error {
                <p class="error">{ err }</p>
            } else if users.is_empty() {
                <p>{ "No users found." }</p>
            } else {
                <ul>
                    {
                        users.iter().map(|user| {
                            html! {
                                <li key={user.id}>
                                    <strong>{ &user.name }</strong>
                                    <span>{ format!(" ({})", user.email) }</span>
                                </li>
                            }
                        }).collect::<Html>()
                    }
                </ul>
            }
        </div>
    }
}
```

### Introduction to Leptos

Leptos is a newer Rust framework for building web applications with a focus on fine-grained reactivity and minimal DOM updates. It offers a different approach compared to Yew, with inspiration from frameworks like Solid.js.

Key features of Leptos include:

- Fine-grained reactivity system
- Server-side rendering
- Seamless client-server integration
- Small bundle size
- Built-in error boundaries and suspense

Let's create a simple Leptos application:

```bash
# Create a new Leptos project
cargo new --bin leptos-app
cd leptos-app
```

Update your `Cargo.toml`:

```toml
[package]
name = "leptos-app"
version = "0.1.0"
edition = "2021"

[dependencies]
leptos = { version = "0.4", features = ["csr"] }
wasm-bindgen = "0.2"
```

Create a simple Leptos component in `src/main.rs`:

```rust
use leptos::*;

#[component]
fn App() -> impl IntoView {
    let (count, set_count) = create_signal(0);

    let increment = move |_| set_count.update(|n| *n += 1);

    view! {
        <div>
            <h1>"Leptos Counter App"</h1>
            <p>"Current count: " {count}</p>
            <button on:click=increment>"Increment"</button>
        </div>
    }
}

fn main() {
    mount_to_body(App);
}
```

### Reactivity in Leptos

Leptos uses a fine-grained reactivity model where only the parts of the DOM that depend on changed values are updated:

```rust
use leptos::*;

#[component]
fn ReactiveExample() -> impl IntoView {
    // Create signals for reactive state
    let (name, set_name) = create_signal(String::from(""));
    let (count, set_count) = create_signal(0);

    // Derived computations
    let greeting = move || {
        if name().is_empty() {
            "Please enter your name".to_string()
        } else {
            format!("Hello, {}!", name())
        }
    };

    // Only recalculates when count changes
    let count_squared = move || count() * count();

    // Event handlers
    let increment = move |_| set_count.update(|n| *n += 1);

    view! {
        <div>
            <h1>"Reactivity Example"</h1>

            <div>
                <label for="name-input">"Name: "</label>
                <input
                    id="name-input"
                    type="text"
                    on:input=move |ev| {
                        set_name(event_target_value(&ev));
                    }
                    prop:value=name
                />
                <p>{greeting}</p>
            </div>

            <div>
                <p>"Count: " {count}</p>
                <p>"Count squared: " {count_squared}</p>
                <button on:click=increment>"Increment"</button>
            </div>
        </div>
    }
}
```

### Building a Todo List with Leptos

Let's recreate our Todo List application using Leptos:

```rust
use leptos::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
struct Todo {
    id: usize,
    text: String,
    completed: bool,
}

#[component]
fn TodoApp() -> impl IntoView {
    // Load todos from local storage or start with empty list
    let storage_key = "leptos.todo.list";

    let initial_todos: Vec<Todo> = web_sys::window()
        .and_then(|window| window.local_storage().ok())
        .flatten()
        .and_then(|storage| storage.get_item(storage_key).ok())
        .flatten()
        .and_then(|json| serde_json::from_str(&json).ok())
        .unwrap_or_default();

    let (todos, set_todos) = create_signal(initial_todos);

    // Save todos to local storage whenever they change
    create_effect(move |_| {
        if let Ok(Some(storage)) = web_sys::window()
            .and_then(|window| Ok(window.local_storage().ok()?))
        {
            let json = serde_json::to_string(&todos()).unwrap_or_default();
            let _ = storage.set_item(storage_key, &json);
        }
    });

    let (new_todo_text, set_new_todo_text) = create_signal(String::new());

    let add_todo = move |ev: ev::SubmitEvent| {
        ev.prevent_default();

        let text = new_todo_text().trim().to_string();
        if !text.is_empty() {
            // Get the next ID
            let next_id = todos()
                .iter()
                .map(|todo| todo.id)
                .max()
                .unwrap_or(0) + 1;

            // Create new todo and add it to the list
            set_todos.update(|todos| {
                todos.push(Todo {
                    id: next_id,
                    text,
                    completed: false,
                });
            });

            // Clear the input
            set_new_todo_text(String::new());
        }
    };

    let toggle_todo = move |id: usize| {
        set_todos.update(|todos| {
            if let Some(todo) = todos.iter_mut().find(|t| t.id == id) {
                todo.completed = !todo.completed;
            }
        });
    };

    let delete_todo = move |id: usize| {
        set_todos.update(|todos| {
            todos.retain(|t| t.id != id);
        });
    };

    let remaining_count = move || todos().iter().filter(|t| !t.completed).count();

    view! {
        <div class="todo-app">
            <h1>"Todo List"</h1>

            <form on:submit=add_todo>
                <input
                    type="text"
                    prop:value=new_todo_text
                    on:input=move |ev| set_new_todo_text(event_target_value(&ev))
                    placeholder="What needs to be done?"
                />
                <button type="submit">"Add"</button>
            </form>

            <ul class="todo-list">
                <For
                    each=todos
                    key=|todo| todo.id
                    children=move |todo| {
                        let id = todo.id;
                        view! {
                            <li class:completed=move || todo.completed>
                                <input
                                    type="checkbox"
                                    prop:checked=move || todo.completed
                                    on:click=move |_| toggle_todo(id)
                                />
                                <span>{todo.text}</span>
                                <button on:click=move |_| delete_todo(id)>"Delete"</button>
                            </li>
                        }
                    }
                />
            </ul>

            <div class="todo-count">
                <span>{move || format!("{} item(s) left", remaining_count())}</span>
            </div>
        </div>
    }
}

fn main() {
    mount_to_body(TodoApp);
}
```

### Server-Side Rendering with Leptos

One of Leptos' standout features is its seamless server-side rendering (SSR) capabilities:

```rust
use leptos::*;
use leptos_router::*;

#[component]
fn App() -> impl IntoView {
    view! {
        <Router>
            <nav>
                <A href="/">"Home"</A>
                <A href="/about">"About"</A>
                <A href="/users">"Users"</A>
            </nav>

            <main>
                <Routes>
                    <Route path="/" view=HomePage />
                    <Route path="/about" view=AboutPage />
                    <Route path="/users" view=UsersPage />
                    <Route path="/users/:id" view=UserDetail />
                </Routes>
            </main>
        </Router>
    }
}

#[component]
fn HomePage() -> impl IntoView {
    view! { <h1>"Welcome to the Home Page"</h1> }
}

#[component]
fn AboutPage() -> impl IntoView {
    view! { <h1>"About Us"</h1> }
}

#[component]
fn UsersPage() -> impl IntoView {
    // This could be a server function in SSR mode
    let users = create_resource(
        || (),
        |_| async { fetch_users().await }
    );

    view! {
        <div>
            <h1>"Users"</h1>
            <Suspense fallback=move || view! { <p>"Loading..."</p> }>
                {move || {
                    users.get().map(|users| {
                        match users {
                            Ok(list) => {
                                view! {
                                    <ul>
                                        <For
                                            each=move || list.clone()
                                            key=|user| user.id
                                            children=move |user| {
                                                view! {
                                                    <li>
                                                        <A href=format!("/users/{}", user.id)>
                                                            {user.name}
                                                        </A>
                                                    </li>
                                                }
                                            }
                                        />
                                    </ul>
                                }
                            }
                            Err(e) => view! { <p>"Error loading users: " {e.to_string()}</p> }
                        }
                    })
                }}
            </Suspense>
        </div>
    }
}

#[component]
fn UserDetail() -> impl IntoView {
    let params = use_params_map();
    let id = move || params.with(|p| p.get("id").cloned().unwrap_or_default());

    // This could be a server function in SSR mode
    let user = create_resource(
        id,
        |id| async move { fetch_user(id).await }
    );

    view! {
        <div>
            <h1>"User Details"</h1>
            <Suspense fallback=move || view! { <p>"Loading user..."</p> }>
                {move || {
                    user.get().map(|result| {
                        match result {
                            Ok(user) => {
                                view! {
                                    <div>
                                        <h2>{user.name}</h2>
                                        <p>"Email: " {user.email}</p>
                                        <p>"ID: " {user.id}</p>
                                    </div>
                                }
                            }
                            Err(e) => view! { <p>"Error loading user: " {e.to_string()}</p> }
                        }
                    })
                }}
            </Suspense>
            <A href="/users">"Back to Users"</A>
        </div>
    }
}
```

### Comparing Yew and Leptos

Both Yew and Leptos are powerful frameworks for building web applications with Rust, but they have different approaches:

| Feature               | Yew                           | Leptos                                  |
| --------------------- | ----------------------------- | --------------------------------------- |
| Programming Model     | Virtual DOM (like React)      | Fine-grained reactivity (like Solid.js) |
| Rendering Strategy    | Diff and patch                | Precise DOM updates                     |
| Server-Side Rendering | Limited                       | First-class support                     |
| Bundle Size           | Larger                        | Smaller                                 |
| Learning Curve        | Familiar for React developers | New reactivity concepts to learn        |
| Community Size        | Larger, more established      | Growing                                 |
| Performance           | Good                          | Excellent for complex UIs               |
| Hydration             | Component-based               | Fine-grained                            |

The choice between Yew and Leptos often depends on your specific requirements and preferences:

- Choose **Yew** if you're familiar with React and want a more established ecosystem.
- Choose **Leptos** if you value performance, server-side rendering, and are willing to learn a new reactivity model.

### Best Practices for Rust WebAssembly Development

1. **Bundle Size Optimization**: WebAssembly modules can be large, so use tools like `wasm-opt` to optimize size.
2. **Interoperability**: Design your Rust-WebAssembly boundary carefully to minimize serialization overhead.
3. **Memory Management**: Be aware of WebAssembly's linear memory model and how it affects your application.
4. **Performance Profiling**: Use browser developer tools to profile your WebAssembly code.
5. **Progressive Enhancement**: Consider using Rust for performance-critical parts while keeping basic functionality in JavaScript.
6. **Error Handling**: Implement proper error handling across the Rust-JavaScript boundary.
7. **Testing**: Write tests for both Rust code and the JavaScript integration.
8. **Loading States**: Always handle loading states for asynchronous operations.
9. **Accessibility**: Ensure your UI components are accessible.
10. **Browser Compatibility**: Test across different browsers as WebAssembly support may vary.

In the next section, we'll explore GraphQL in Rust with async-graphql.

## GraphQL Implementation with async-graphql

GraphQL has become a popular alternative to REST for building flexible APIs. In this section, we'll explore how to implement GraphQL servers in Rust using the async-graphql library.

### Introduction to GraphQL in Rust

GraphQL is a query language for your API that allows clients to request exactly the data they need. Unlike REST, which exposes a fixed set of endpoints with predetermined data structures, GraphQL provides a more flexible approach where clients can specify the structure of the response.

The `async-graphql` crate is a high-performance GraphQL implementation for Rust that integrates well with async runtimes and web frameworks. It provides:

- Type-safe schema definitions using Rust's type system
- Support for queries, mutations, and subscriptions
- Integration with common web frameworks like Actix Web, Warp, and Axum
- Built-in validation, error handling, and introspection
- Powerful features like dataloaders for efficient data fetching

### Defining a GraphQL Schema

In async-graphql, you define your schema by creating Rust types and implementing resolvers for them. Here's a basic example:

```rust
use async_graphql::{Context, Object, Schema, EmptyMutation, EmptySubscription, Result};

// Define a data structure
struct User {
    id: String,
    name: String,
    email: String,
}

// Define your queries
struct Query;

#[Object]
impl Query {
    async fn user(&self, ctx: &Context<'_>, id: String) -> Result<User> {
        // In a real application, you would fetch this from a database
        Ok(User {
            id,
            name: "John Doe".to_string(),
            email: "john@example.com".to_string(),
        })
    }

    async fn users(&self, ctx: &Context<'_>) -> Result<Vec<User>> {
        // Return a list of users
        Ok(vec![
            User {
                id: "1".to_string(),
                name: "John Doe".to_string(),
                email: "john@example.com".to_string(),
            },
            User {
                id: "2".to_string(),
                name: "Jane Doe".to_string(),
                email: "jane@example.com".to_string(),
            },
        ])
    }
}

// Define your mutations
struct Mutation;

#[Object]
impl Mutation {
    async fn create_user(&self, ctx: &Context<'_>, id: String, name: String, email: String) -> Result<User> {
        // In a real application, you would save this to a database
        // and handle validation, error cases, etc.
        let new_user = User { id, name, email };
        Ok(new_user)
    }
}

// Define your subscriptions
struct Subscription;

#[Subscription]
impl Subscription {
    async fn user_updated(&self, ctx: &Context<'_>, id: String) -> impl Stream<Item = Result<User>> {
        // In a real application, you would subscribe to a message broker
        // or other event source

        let mut interval = tokio::time::interval(Duration::from_secs(5));

        async_stream::stream! {
            loop {
                interval.tick().await;

                let updated_user = User {
                    id: "1".to_string(),
                    name: format!("John Doe {}", chrono::Utc::now()),
                    email: "john@example.com".to_string(),
                };

                yield Ok(updated_user);
            }
        }
    }
}

// Build the schema
let schema = Schema::new(Query, Mutation, Subscription);
```

### Adding Mutations

Mutations allow clients to modify data. Here's how to implement them:

```rust
#[derive(Default)]
struct Mutation;

#[Object]
impl Mutation {
    async fn create_user(&self, ctx: &Context<'_>, id: String, name: String, email: String) -> Result<User> {
        // In a real application, you would save this to a database
        // and handle validation, error cases, etc.
        let new_user = User { id, name, email };
        Ok(new_user)
    }

    async fn update_user(&self, ctx: &Context<'_>, id: String, name: Option<String>, email: Option<String>) -> Result<User> {
        // Fetch existing user, update fields, save to database...

        Ok(User {
            id,
            name: name.unwrap_or_else(|| "John Doe".to_string()),
            email: email.unwrap_or_else(|| "john@example.com".to_string()),
        })
    }

    async fn delete_user(&self, ctx: &Context<'_>, id: String) -> Result<bool> {
        // Delete user from database...

        Ok(true) // Return true if deletion was successful
    }
}

// Create a schema with query and mutation capabilities
let schema = Schema::build(Query::default(), Mutation::default(), Subscription::default())
    .finish();
```

### Implementing Subscriptions

Subscriptions allow clients to receive real-time updates. They're implemented using Rust's async streams:

```rust
use async_graphql::{Context, Subscription, Schema, EmptyMutation, Result};
use async_stream::stream;
use futures_util::Stream;
use std::time::Duration;

#[derive(Default)]
struct Subscription;

#[Subscription]
impl Subscription {
    async fn countdown(&self, from: i32) -> impl Stream<Item = Result<i32>> {
        let mut current = from;
        stream! {
            while current > 0 {
                tokio::time::sleep(Duration::from_secs(1)).await;
                yield Ok(current);
                current -= 1;
            }
        }
    }

    async fn user_updates(&self, ctx: &Context<'_>) -> impl Stream<Item = Result<User>> {
        // In a real application, you would subscribe to a message broker
        // or other event source

        stream! {
            let mut interval = tokio::time::interval(Duration::from_secs(5));

            loop {
                interval.tick().await;

                let updated_user = User {
                    id: "1".to_string(),
                    name: format!("John Doe {}", chrono::Utc::now()),
                    email: "john@example.com".to_string(),
                };

                yield Ok(updated_user);
            }
        }
    }
}

// Create a schema with query, mutation, and subscription capabilities
let schema = Schema::build(Query::default(), Mutation::default(), Subscription::default())
    .finish();
```

### Integrating with Web Frameworks

async-graphql integrates with popular Rust web frameworks. Here's an example with Actix Web:

```rust
use actix_web::{web, App, HttpResponse, HttpServer, Result};
use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql_actix_web::{GraphQLRequest, GraphQLResponse, GraphQLSubscription};

// Handler for GraphQL queries and mutations
async fn graphql_handler(
    schema: web::Data<AppSchema>,
    req: GraphQLRequest,
) -> GraphQLResponse {
    schema.execute(req.into_inner()).await.into()
}

// Handler for GraphQL subscriptions via WebSocket
async fn graphql_subscription(
    schema: web::Data<AppSchema>,
    req: HttpRequest,
    payload: web::Payload,
) -> Result<HttpResponse> {
    GraphQLSubscription::new(Schema::clone(&*schema))
        .start(&req, payload)
}

// Handler for GraphQL Playground (web UI for testing GraphQL)
async fn graphql_playground() -> HttpResponse {
    HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(playground_source(
            GraphQLPlaygroundConfig::new("/graphql")
                .subscription_endpoint("/graphql_ws"),
        ))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Build your schema
    let schema = Schema::build(Query::default(), Mutation::default(), Subscription::default())
        .finish();

    // Start the HTTP server
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(schema.clone()))
            .service(
                web::resource("/graphql")
                    .route(web::post().to(graphql_handler))
                    .route(web::get().to(graphql_playground)),
            )
            .service(web::resource("/graphql_ws").route(web::get().to(graphql_subscription)))
    })
    .bind("127.0.0.1:8000")?
    .run()
    .await
}
```

### Advanced Features

async-graphql provides several advanced features that can enhance your GraphQL implementation:

#### DataLoader for Efficient Data Fetching

DataLoader helps solve the N+1 query problem by batching and caching database queries:

```rust
use async_graphql::dataloader::{DataLoader, Loader};
use async_trait::async_trait;
use std::collections::HashMap;

struct UserLoader;

#[async_trait]
impl Loader<String> for UserLoader {
    type Value = User;
    type Error = async_graphql::Error;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        // In a real app, you would batch-load users from a database
        let mut users = HashMap::new();

        for key in keys {
            users.insert(key.clone(), User {
                id: key.clone(),
                name: format!("User {}", key),
                email: format!("user{}@example.com", key),
            });
        }

        Ok(users)
    }
}

// Use in a resolver
#[Object]
impl Query {
    async fn user(&self, ctx: &Context<'_>, id: String) -> Result<User> {
        let loader = ctx.data_unchecked::<DataLoader<UserLoader>>();
        loader.load_one(id).await?
            .ok_or_else(|| "User not found".into())
    }
}
```

#### Input Validation

You can validate input data using the `validator` crate:

```rust
use async_graphql::{InputObject, SimpleObject};
use validator::Validate;

#[derive(InputObject, Validate)]
struct CreateUserInput {
    #[validate(length(min = 3, max = 50))]
    name: String,

    #[validate(email)]
    email: String,
}

#[derive(SimpleObject)]
struct User {
    id: String,
    name: String,
    email: String,
}

#[Object]
impl Mutation {
    async fn create_user(&self, ctx: &Context<'_>, input: CreateUserInput) -> Result<User> {
        // Validate the input
        if let Err(errors) = input.validate() {
            return Err(errors.to_string().into());
        }

        // Process the validated input...
        Ok(User {
            id: uuid::Uuid::new_v4().to_string(),
            name: input.name,
            email: input.email,
        })
    }
}
```

#### Schema Composition

For larger applications, you can split your schema into multiple parts and compose them:

```rust
// User schema
let user_schema = Schema::build(UserQuery, UserMutation, EmptySubscription)
    .register_type::<User>()
    .finish();

// Product schema
let product_schema = Schema::build(ProductQuery, ProductMutation, EmptySubscription)
    .register_type::<Product>()
    .finish();

// Compose schemas
let schema = Schema::build(Query, Mutation, Subscription)
    .register_types_in(&user_schema)
    .register_types_in(&product_schema)
    .finish();
```

### Security Considerations

When implementing GraphQL APIs, it's important to consider security aspects:

1. **Query Complexity**: GraphQL allows for deeply nested queries that could lead to performance issues or DoS attacks. async-graphql provides complexity analysis to limit query depth and complexity.

2. **Rate Limiting**: Implement rate limiting to prevent abuse.

3. **Authentication and Authorization**: Use context to pass authentication information to resolvers and implement authorization checks.

```rust
// Add authentication info to context
let schema = Schema::build(Query, Mutation, Subscription)
    .data(AuthInfo { /* ... */ })
    .finish();

// Use in resolver
async fn protected_resolver(&self, ctx: &Context<'_>) -> Result<String> {
    let auth_info = ctx.data::<AuthInfo>()?;

    if !auth_info.is_authenticated() {
        return Err("Not authenticated".into());
    }

    if !auth_info.has_permission("admin") {
        return Err("Not authorized".into());
    }

    Ok("Sensitive data".to_string())
}
```

GraphQL with async-graphql provides a powerful and type-safe way to build flexible APIs in Rust. By leveraging Rust's type system and async capabilities, you can create high-performance GraphQL servers that are both robust and maintainable.

## WebSockets and Real-Time Communication

Real-time communication is a crucial component of modern web applications. WebSockets provide a persistent connection between client and server, allowing bidirectional data transfer. In this section, we'll explore how to implement WebSocket functionality in Rust web applications.

### Understanding WebSockets

WebSockets are a protocol that provides full-duplex communication channels over a single TCP connection. Unlike HTTP, which follows a request-response pattern, WebSockets allow both client and server to send messages independently once a connection is established.

Key benefits of WebSockets include:

1. **Reduced Latency**: No need to establish a new connection for each message
2. **Bidirectional Communication**: Both server and client can initiate messages
3. **Efficiency**: Lower overhead compared to repeated HTTP requests
4. **Real-Time Updates**: Ideal for applications requiring immediate updates

### WebSockets in Actix Web

Actix Web provides built-in support for WebSockets through its `actix-web-actors` crate:

```rust
use actix::{Actor, StreamHandler};
use actix_web::{web, App, Error, HttpRequest, HttpResponse, HttpServer};
use actix_web_actors::ws;

// Define a WebSocket actor
struct MyWebSocket;

impl Actor for MyWebSocket {
    type Context = ws::WebsocketContext<Self>;
}

// Handle incoming WebSocket messages
impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for MyWebSocket {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Ping(msg)) => ctx.pong(&msg),
            Ok(ws::Message::Text(text)) => {
                println!("Received text message: {:?}", text);

                // Echo the message back
                ctx.text(text);
            },
            Ok(ws::Message::Binary(bin)) => ctx.binary(bin),
            Ok(ws::Message::Close(reason)) => {
                println!("Connection closed");
                ctx.close(reason);
            }
            _ => (),
        }
    }
}

// WebSocket connection handler
async fn websocket_route(req: HttpRequest, stream: web::Payload) -> Result<HttpResponse, Error> {
    ws::start(MyWebSocket {}, &req, stream)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/ws", web::get().to(websocket_route))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

### Building a Chat Application

Let's build a simple chat application using WebSockets in Actix Web:

```rust
use std::time::{Duration, Instant};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use actix::{Actor, ActorContext, Addr, AsyncContext, Handler, Message, StreamHandler};
use actix_web::{web, App, Error, HttpRequest, HttpResponse, HttpServer};
use actix_web_actors::ws;
use serde::{Deserialize, Serialize};
use serde_json::json;

// How often heartbeat pings are sent
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
// How long before lack of client response causes a timeout
const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

// Chat server state
struct ChatServer {
    sessions: HashMap<String, Addr<ChatSession>>,
}

impl ChatServer {
    fn new() -> Self {
        ChatServer {
            sessions: HashMap::new(),
        }
    }

    fn join(&mut self, id: String, addr: Addr<ChatSession>) {
        self.sessions.insert(id, addr);
    }

    fn leave(&mut self, id: String) {
        self.sessions.remove(&id);
    }

    fn broadcast(&self, message: &str, sender_id: &str) {
        for (id, addr) in self.sessions.iter() {
            if id != sender_id {
                addr.do_send(ChatMessage(message.to_owned()));
            }
        }
    }
}

// Chat session actor
struct ChatSession {
    id: String,
    server: Arc<Mutex<ChatServer>>,
    hb: Instant, // Heartbeat timestamp
}

impl ChatSession {
    fn new(id: String, server: Arc<Mutex<ChatServer>>) -> Self {
        ChatSession {
            id,
            server,
            hb: Instant::now(),
        }
    }

    // Send heartbeat ping to client
    fn heartbeat(&self, ctx: &mut ws::WebsocketContext<Self>) {
        ctx.run_interval(HEARTBEAT_INTERVAL, |act, ctx| {
            // Check client heartbeat
            if Instant::now().duration_since(act.hb) > CLIENT_TIMEOUT {
                println!("Client timed out, disconnecting: {}", act.id);

                // Disconnect session
                let mut server = act.server.lock().unwrap();
                server.leave(act.id.clone());

                // Stop the actor
                ctx.stop();
                return;
            }

            // Send ping
            ctx.ping(b"");
        });
    }
}

impl Actor for ChatSession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        // Start the heartbeat process
        self.heartbeat(ctx);

        // Register session with the server
        let mut server = self.server.lock().unwrap();
        server.join(self.id.clone(), ctx.address());
    }

    fn stopping(&mut self, _: &mut Self::Context) -> actix::Running {
        // Unregister session from server
        let mut server = self.server.lock().unwrap();
        server.leave(self.id.clone());
        actix::Running::Stop
    }
}

// Message sent to chat session
#[derive(Message)]
#[rtype(result = "()")]
struct ChatMessage(String);

impl Handler<ChatMessage> for ChatSession {
    type Result = ();

    fn handle(&mut self, msg: ChatMessage, ctx: &mut Self::Context) {
        // Send message to WebSocket client
        ctx.text(msg.0);
    }
}

// WebSocket message handler
impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for ChatSession {
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
                let msg = text.trim();
                println!("Received message: {} from {}", msg, self.id);

                // Broadcast message to all other sessions
                let server = self.server.lock().unwrap();
                server.broadcast(msg, &self.id);
            }
            Ok(ws::Message::Close(reason)) => {
                ctx.close(reason);
                ctx.stop();
            }
            _ => ctx.stop(),
        }
    }
}

// WebSocket connection handler
async fn chat_route(
    req: HttpRequest,
    stream: web::Payload,
    server: web::Data<Arc<Mutex<ChatServer>>>,
) -> Result<HttpResponse, Error> {
    // Generate unique session ID
    let id = uuid::Uuid::new_v4().to_string();
    println!("New chat connection: {}", id);

    // Create chat session actor
    let session = ChatSession::new(id, server.get_ref().clone());

    // Start WebSocket session
    ws::start(session, &req, stream)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Create chat server
    let chat_server = Arc::new(Mutex::new(ChatServer::new()));

    // Start HTTP server
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(chat_server.clone()))
            .route("/ws/chat", web::get().to(chat_route))
            .service(actix_files::Files::new("/", "./static").index_file("index.html"))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

The HTML client for this chat application might look like:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Rust Chat App</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
      }
      .chat-container {
        max-width: 600px;
        margin: 20px auto;
        border: 1px solid #ccc;
      }
      .chat-messages {
        height: 400px;
        overflow-y: auto;
        padding: 10px;
        background: #f9f9f9;
      }
      .message-input {
        display: flex;
        padding: 10px;
        border-top: 1px solid #ccc;
      }
      .message-input input {
        flex: 1;
        padding: 8px;
      }
      .message-input button {
        padding: 8px 16px;
        background: #4caf50;
        color: white;
        border: none;
      }
    </style>
  </head>
  <body>
    <div class="chat-container">
      <div id="messages" class="chat-messages"></div>
      <div class="message-input">
        <input type="text" id="message" placeholder="Type a message..." />
        <button id="send">Send</button>
      </div>
    </div>

    <script>
      const messagesDiv = document.getElementById("messages");
      const messageInput = document.getElementById("message");
      const sendButton = document.getElementById("send");

      // Connect to WebSocket server
      const socket = new WebSocket("ws://" + window.location.host + "/ws/chat");

      socket.onopen = function (e) {
        addMessage("Connected to chat server");
      };

      socket.onmessage = function (e) {
        addMessage(e.data);
      };

      socket.onclose = function (e) {
        addMessage("Disconnected from chat server");
      };

      socket.onerror = function (e) {
        addMessage("Error: " + e.message);
      };

      function addMessage(message) {
        const messageElement = document.createElement("div");
        messageElement.textContent = message;
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }

      function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
          socket.send(message);
          addMessage("You: " + message);
          messageInput.value = "";
        }
      }

      sendButton.addEventListener("click", sendMessage);
      messageInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
          sendMessage();
        }
      });
    </script>
  </body>
</html>
```

### WebSockets in Axum

Axum also provides support for WebSockets:

```rust
use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::IntoResponse,
    routing::get,
    Router,
};
use futures::{sink::SinkExt, stream::StreamExt};
use std::net::SocketAddr;
use tokio::sync::broadcast;

#[tokio::main]
async fn main() {
    // Create a channel for broadcasting messages
    let (tx, _rx) = broadcast::channel::<String>(100);

    // Build our application with a route
    let app = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(tx);

    // Run it
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("Listening on {}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(tx): State<broadcast::Sender<String>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, tx))
}

async fn handle_socket(socket: WebSocket, tx: broadcast::Sender<String>) {
    // Split the socket into sender and receiver
    let (mut sender, mut receiver) = socket.split();

    // Subscribe to the broadcast channel
    let mut rx = tx.subscribe();

    // Spawn a task to forward messages from the broadcast channel to the WebSocket
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    // Process incoming messages
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    // Broadcast this message to all other connected clients
                    let _ = tx.send(text);
                }
                Message::Close(_) => break,
                _ => {}
            }
        }
    });

    // Wait for either task to finish
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };
}
```

### Server-Sent Events (SSE)

For one-way real-time communication from server to client, Server-Sent Events (SSE) provide a simpler alternative to WebSockets:

```rust
use actix_web::{web, App, Error, HttpRequest, HttpResponse, HttpServer};
use futures::stream::{self, Stream};
use std::time::Duration;
use tokio::time::interval;
use tokio_stream::wrappers::IntervalStream;

// SSE handler
async fn sse_handler() -> HttpResponse {
    // Create an interval stream that emits a message every second
    let interval = interval(Duration::from_secs(1));
    let stream = IntervalStream::new(interval).map(|_| {
        let timestamp = chrono::Utc::now().to_rfc3339();
        Ok::<_, Error>(format!(
            "data: {{\"time\": \"{}\", \"message\": \"Server update\"}}\n\n",
            timestamp
        ))
    });

    // Return a streaming response
    HttpResponse::Ok()
        .content_type("text/event-stream")
        .insert_header(("Cache-Control", "no-cache"))
        .insert_header(("Connection", "keep-alive"))
        .streaming(stream)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/events", web::get().to(sse_handler))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

Client-side JavaScript for SSE is much simpler than WebSockets:

```javascript
const eventSource = new EventSource("/events");

eventSource.onmessage = function (event) {
  const data = JSON.parse(event.data);
  console.log("Received update:", data);

  // Update UI with the data
  document.getElementById(
    "updates"
  ).innerHTML += `<div>Time: ${data.time} - ${data.message}</div>`;
};

eventSource.onerror = function (event) {
  console.error("EventSource error:", event);
  eventSource.close();
};
```

### Best Practices for Real-Time Communication

1. **Connection Management**: Implement heartbeats to detect disconnected clients and clean up resources.
2. **Scalability**: For production applications, consider using a message broker (like Redis, RabbitMQ, or Kafka) to distribute messages across multiple server instances.
3. **Authentication**: Secure WebSocket connections with proper authentication, often using tokens passed during the initial handshake.
4. **Error Handling**: Implement robust error handling and reconnection logic on both client and server.
5. **Rate Limiting**: Protect against abuse by implementing rate limiting for message sending.
6. **Message Validation**: Validate all incoming messages to prevent security vulnerabilities.
7. **Choose the Right Technology**: Use WebSockets for bidirectional communication, SSE for server-to-client updates, and HTTP for request-response patterns.
8. **Batching**: Consider batching small, frequent updates to reduce overhead.
9. **Protocol Design**: Design a clear message protocol with message types and versioning.
10. **Monitoring**: Implement monitoring for connection counts, message rates, and error rates.

## Deployment and Performance Optimization

Modern web applications need to be not only functional but also performant and reliable. In this section, we'll explore how to deploy Rust web applications and optimize their performance.

### Containerization with Docker

Docker provides a convenient way to package and deploy Rust applications:

```Dockerfile
# Build stage
FROM rust:1.68 as builder
WORKDIR /usr/src/app
COPY . .
RUN cargo build --release

# Runtime stage
FROM debian:bullseye-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/src/app/target/release/my-rust-app /usr/local/bin/my-rust-app
EXPOSE 8080
CMD ["my-rust-app"]
```

This multi-stage build creates a smaller final image by only including the compiled binary.

### Deployment Options

There are several options for deploying Rust web applications:

1. **Bare Metal**: Direct deployment to physical servers for maximum performance.
2. **Virtual Machines**: Traditional cloud instances like AWS EC2, Google Compute Engine, or Azure VMs.
3. **Container Orchestration**: Kubernetes or ECS for managing containerized applications.
4. **Serverless**: Platforms like AWS Lambda (via custom runtimes or Rust Lambda).
5. **Platform as a Service**: Services like Heroku or Fly.io that support containerized applications.

### Performance Optimization

Rust already provides excellent performance, but there are additional optimizations you can apply:

#### 1. Database Connection Pooling

Properly configured connection pools are essential:

```rust
let pool = PgPoolOptions::new()
    .max_connections(5)
    .min_connections(1)
    .max_lifetime(Duration::from_secs(30 * 60)) // 30 minutes
    .idle_timeout(Duration::from_secs(10 * 60)) // 10 minutes
    .connect("postgres://user:password@localhost/db")
    .await?;
```

#### 2. Async Worker Pools

For CPU-intensive tasks, use a dedicated thread pool:

```rust
use tokio::task::spawn_blocking;

async fn handle_request() -> Result<HttpResponse, Error> {
    // Offload CPU-intensive work to a blocking thread
    let result = spawn_blocking(|| {
        // Expensive computation here
        compute_something_expensive()
    }).await?;

    Ok(HttpResponse::Ok().json(result))
}
```

#### 3. Response Compression

Enable compression for HTTP responses:

```rust
use actix_web::middleware::Compress;

App::new()
    .wrap(Compress::default())
    // ...
```

#### 4. Caching

Implement caching for expensive operations:

```rust
use moka::future::Cache;
use std::time::Duration;

// Create a time-based cache
let cache: Cache<String, Vec<User>> = Cache::builder()
    .max_capacity(100)
    .time_to_live(Duration::from_secs(60))
    .build();

async fn get_users(cache: web::Data<Cache<String, Vec<User>>>) -> HttpResponse {
    let cache_key = "all_users".to_string();

    // Try to get from cache
    if let Some(users) = cache.get(&cache_key).await {
        return HttpResponse::Ok().json(users);
    }

    // Not in cache, fetch from database
    let users = fetch_users_from_db().await?;

    // Insert into cache
    cache.insert(cache_key, users.clone()).await;

    HttpResponse::Ok().json(users)
}
```

#### 5. Static File Serving

Serve static files efficiently with proper caching headers:

```rust
use actix_files as fs;

App::new()
    .service(fs::Files::new("/static", "./static")
        .prefer_utf8(true)
        .use_last_modified(true)
        .use_etag(true))
    // ...
```

#### 6. Load Testing

Use tools like `wrk`, `hey`, or `k6` to load test your application and identify bottlenecks:

```bash
# Example with wrk
wrk -t12 -c400 -d30s http://localhost:8080/api/users
```

### Monitoring and Observability

Implement proper monitoring for production applications:

```rust
use tracing::{info, error, Level};
use tracing_subscriber::FmtSubscriber;

// Initialize the tracing subscriber
fn init_tracing() {
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)
        .expect("setting default subscriber failed");
}

// Use in your application
async fn handle_request() -> impl Responder {
    info!("Handling request");

    match do_something().await {
        Ok(result) => {
            info!("Request succeeded");
            HttpResponse::Ok().json(result)
        },
        Err(e) => {
            error!("Request failed: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}
```

For more comprehensive monitoring, integrate with services like Prometheus and Grafana:

```rust
use actix_web_prom::{PrometheusMetrics, PrometheusMetricsBuilder};

// Create prometheus metrics middleware
let prometheus = PrometheusMetricsBuilder::new("api")
    .endpoint("/metrics")
    .build()
    .unwrap();

// Add to your app
App::new()
    .wrap(prometheus.clone())
    // ...
```

## WebAssembly for Frontend Development

WebAssembly (Wasm) has revolutionized web development by enabling languages other than JavaScript to run in the browser at near-native speed. Rust has emerged as one of the most compelling languages for WebAssembly development due to its performance, safety guarantees, and excellent tooling support.

### Understanding WebAssembly

WebAssembly is a binary instruction format designed as a portable compilation target for high-level languages. Key characteristics include:

- **Performance**: WebAssembly code executes at near-native speed
- **Safety**: Runs in a sandboxed environment with memory safety guarantees
- **Portability**: Works across all modern browsers and platforms
- **Compatibility**: Interoperates seamlessly with JavaScript and DOM APIs

For Rust developers, WebAssembly offers a way to leverage Rust's strengths in frontend development without sacrificing performance or browser compatibility.

### Rust to WebAssembly Toolchain

The Rust ecosystem provides excellent tools for WebAssembly development:

#### wasm-pack

The primary tool for building and packaging Rust-generated WebAssembly modules is `wasm-pack`. It handles:

- Compiling Rust code to WebAssembly
- Generating appropriate JavaScript bindings
- Creating npm packages for easy integration with JavaScript tooling

To install `wasm-pack`:

```bash
cargo install wasm-pack
```

A basic workflow looks like:

```bash
# Create a new library for WebAssembly
cargo new --lib my-wasm-project

# Build the WebAssembly package
cd my-wasm-project
wasm-pack build --target web
```

#### wasm-bindgen

At the core of Rust's WebAssembly support is the `wasm-bindgen` crate, which facilitates communication between Rust and JavaScript. It allows:

- Exporting Rust functions and types to JavaScript
- Importing JavaScript functions and objects into Rust
- Converting between Rust and JavaScript data types
- Working with DOM elements and browser APIs

Here's a simple example of using `wasm-bindgen`:

```rust
use wasm_bindgen::prelude::*;

// Export a Rust function to JavaScript
#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

// Import a JavaScript function
#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

// Call JavaScript from Rust
#[wasm_bindgen]
pub fn greet(name: &str) {
    alert(&format!("Hello, {}!", name));
}
```

#### web-sys and js-sys

These companion crates provide typed interfaces to:

- `web-sys`: Browser APIs and DOM manipulation
- `js-sys`: JavaScript standard library functionality

Example of DOM manipulation with `web-sys`:

```rust
use wasm_bindgen::prelude::*;
use web_sys::{Document, Element, HtmlElement, Window};

#[wasm_bindgen]
pub fn create_element() -> Result<(), JsValue> {
    // Get the window object
    let window = web_sys::window().expect("no global window exists");

    // Get the document object
    let document = window.document().expect("should have a document on window");

    // Create a div element
    let div = document.create_element("div")?;
    div.set_inner_html("Hello from Rust!");

    // Append to the body
    let body = document.body().expect("document should have a body");
    body.append_child(&div)?;

    Ok(())
}
```

### Optimizing WebAssembly Performance

While WebAssembly is already fast, several optimizations can further improve performance:

#### Size Optimization

```toml
# In Cargo.toml
[profile.release]
# Tell `rustc` to optimize for small code size.
opt-level = "s"
lto = true
codegen-units = 1
```

#### Reducing Wasm Size with wasm-opt

The `wasm-opt` tool from the Binaryen toolkit can further optimize WebAssembly binaries:

```bash
wasm-opt -Oz -o optimized.wasm input.wasm
```

#### Minimizing JavaScript Glue Code

Use appropriate `wasm-bindgen` settings to minimize generated JavaScript:

```rust
// Use raw WebAssembly without JavaScript glue when possible
#[wasm_bindgen(raw_module = "./path/to/module")]
extern "C" {
    // Imports
}
```

### Debugging WebAssembly

Debugging WebAssembly can be challenging, but several tools can help:

1. **Browser DevTools**: Chrome and Firefox now have native WebAssembly debugging support
2. **console_error_panic_hook**: A crate that redirects Rust panics to the browser console
3. **wasm-logger**: Redirects Rust's `log` output to the browser console

Example of configuring panic and logging hooks:

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn main() {
    // This forwards Rust panics to JavaScript console.error
    console_error_panic_hook::set_once();

    // Initialize logger
    wasm_logger::init(wasm_logger::Config::default());

    // Now we can use log macros
    log::info!("WebAssembly module initialized");
}
```

### Integrating with JavaScript Frameworks

WebAssembly modules can be integrated with any JavaScript framework:

#### With React

```javascript
import React, { useEffect, useState } from "react";
import init, { add } from "./pkg/my_wasm_module";

function App() {
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function loadWasm() {
      await init();
      setResult(add(40, 2));
    }
    loadWasm();
  }, []);

  return <div>Result from Wasm: {result !== null ? result : "Loading..."}</div>;
}
```

#### With Vue

```javascript
import { createApp } from "vue";
import init, { add } from "./pkg/my_wasm_module";

const app = createApp({
  data() {
    return {
      result: null,
    };
  },
  async mounted() {
    await init();
    this.result = add(40, 2);
  },
  template: `<div>Result from Wasm: {{ result !== null ? result : 'Loading...' }}</div>`,
});

app.mount("#app");
```

## Modern Rust UI Frameworks

While WebAssembly enables Rust to run in the browser, building complex UIs directly with WebAssembly APIs would be cumbersome. Fortunately, several Rust frameworks provide higher-level abstractions for frontend development.

### Yew: React-inspired Framework

Yew is one of the most mature Rust frontend frameworks, drawing inspiration from React and Elm. It provides a component-based architecture with a virtual DOM implementation.

#### Key Features

- Component-based architecture
- JSX-like syntax with Rust macros
- State management
- Efficient rendering with virtual DOM
- Server-side rendering support
- Strong typing throughout the application

#### Basic Example

```rust
use yew::prelude::*;

#[function_component]
fn App() -> Html {
    let counter = use_state(|| 0);
    let onclick = {
        let counter = counter.clone();
        Callback::from(move |_| {
            counter.set(*counter + 1);
        })
    };

    html! {
        <div>
            <h1>{ "Yew Counter Example" }</h1>
            <button {onclick}>{ "+1" }</button>
            <p>{ *counter }</p>
        </div>
    }
}

fn main() {
    yew::Renderer::<App>::new().render();
}
```

#### Component Lifecycle

Yew components can be implemented using either function components (with hooks) or struct components:

```rust
// Struct component example
struct CounterComponent {
    counter: i32,
}

enum Msg {
    Increment,
    Decrement,
}

impl Component for CounterComponent {
    type Message = Msg;
    type Properties = ();

    fn create(_ctx: &Context<Self>) -> Self {
        Self { counter: 0 }
    }

    fn update(&mut self, _ctx: &Context<Self>, msg: Self::Message) -> bool {
        match msg {
            Msg::Increment => {
                self.counter += 1;
                true
            }
            Msg::Decrement => {
                self.counter -= 1;
                true
            }
        }
    }

    fn view(&self, ctx: &Context<Self>) -> Html {
        let link = ctx.link();
        html! {
            <div>
                <button onclick={link.callback(|_| Msg::Increment)}>{ "+1" }</button>
                <button onclick={link.callback(|_| Msg::Decrement)}>{ "-1" }</button>
                <p>{ self.counter }</p>
            </div>
        }
    }
}
```

### Leptos: Fine-grained Reactive Framework

Leptos is a newer framework that focuses on fine-grained reactivity, inspired by SolidJS. Unlike Yew's virtual DOM approach, Leptos updates only what needs to change, potentially offering better performance.

#### Key Features

- Fine-grained reactivity
- Server-side rendering with hydration
- Islands architecture
- Small bundle sizes
- Signals for state management
- View macros for declarative UI

#### Basic Example

```rust
use leptos::*;

#[component]
fn Counter() -> impl IntoView {
    let (count, set_count) = create_signal(0);

    view! {
        <div>
            <h2>"Counter Example"</h2>
            <button on:click=move |_| set_count.update(|n| *n += 1)>
                "Increment"
            </button>
            <p>"Count: " {count}</p>
        </div>
    }
}

fn main() {
    mount_to_body(|| view! { <Counter/> });
}
```

#### Signals and Derived Values

Leptos uses signals for state management:

```rust
use leptos::*;

#[component]
fn TemperatureConverter() -> impl IntoView {
    let (celsius, set_celsius) = create_signal(0.0);

    // Derived computation that automatically updates
    let fahrenheit = move || celsius() * 9.0 / 5.0 + 32.0;

    view! {
        <div>
            <input
                type="number"
                prop:value=celsius
                on:input=move |ev| {
                    if let Ok(val) = event_target_value(&ev).parse::<f64>() {
                        set_celsius(val);
                    }
                }
            />
            <p>"Celsius: " {celsius}</p>
            <p>"Fahrenheit: " {fahrenheit}</p>
        </div>
    }
}
```

### Dioxus: Cross-platform UI Framework

Dioxus aims to be a cross-platform UI framework, targeting not just WebAssembly but also desktop, mobile, and TUI (terminal UI) applications.

#### Key Features

- Unified API across platforms
- React-like component model
- Hot reloading
- Small runtime
- Efficient rendering
- Hooks-based state management

#### Basic Example

```rust
use dioxus::prelude::*;

fn main() {
    dioxus_web::launch(App);
}

fn App() -> Element {
    let mut count = use_state(|| 0);

    rsx! {
        div {
            h1 { "Counter Example" }
            button {
                onclick: move |_| count += 1,
                "+1"
            }
            p { "Count: {count}" }
        }
    }
}
```

#### Cross-platform Example

The same component can be used across different platforms:

```rust
// For web
fn main() {
    dioxus_web::launch(App);
}

// For desktop
fn main() {
    dioxus_desktop::launch(App);
}

// For mobile
fn main() {
    dioxus_mobile::launch(App);
}
```

## Full-stack Rust: Sharing Code Between Frontend and Backend

One of the most compelling advantages of using Rust for both frontend and backend development is the ability to share code between them. This can reduce duplication, ensure consistency, and improve maintainability.

### Code Sharing Strategies

#### 1. Workspace Structure

A typical full-stack Rust project might use a Cargo workspace structure:

```toml
# Cargo.toml
[workspace]
members = [
    "common",   # Shared code
    "frontend", # WebAssembly frontend
    "backend"   # Server backend
]
```

#### 2. Shared Models and Validation

Data models and validation logic are prime candidates for sharing:

```rust
// common/src/models.rs
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, Validate, Clone)]
pub struct User {
    #[validate(length(min = 3, max = 50))]
    pub username: String,

    #[validate(email)]
    pub email: String,

    #[validate(length(min = 8))]
    pub password: String,
}
```

This model can be used both in frontend forms and backend validation.

#### 3. Shared API Definitions

API endpoints and request/response types can be defined once:

```rust
// common/src/api.rs
use serde::{Deserialize, Serialize};
use crate::models::User;

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: User,
}

pub const LOGIN_ENDPOINT: &str = "/api/login";
```

#### 4. Error Handling

Consistent error types across frontend and backend:

```rust
// common/src/errors.rs
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error, Serialize, Deserialize)]
pub enum AppError {
    #[error("Authentication failed")]
    AuthenticationError,

    #[error("Not authorized to access this resource")]
    AuthorizationError,

    #[error("Resource not found")]
    NotFoundError,

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Server error")]
    ServerError,
}
```

### Practical Example: Full-stack Form Handling

Here's how shared code can be used for form validation in a full-stack application:

#### Shared Validation (common crate)

```rust
// common/src/validation.rs
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct RegistrationForm {
    #[validate(length(min = 3, message = "Username must be at least 3 characters"))]
    pub username: String,

    #[validate(email(message = "Invalid email format"))]
    pub email: String,

    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,
}

pub fn validate_form(form: &RegistrationForm) -> Result<(), Vec<String>> {
    match form.validate() {
        Ok(_) => Ok(()),
        Err(errors) => {
            let error_messages = errors
                .field_errors()
                .iter()
                .flat_map(|(_, errs)| errs.iter().map(|e| e.message.clone().unwrap_or_default().to_string()))
                .collect();
            Err(error_messages)
        }
    }
}
```

#### Frontend Implementation (Yew)

```rust
// frontend/src/pages/register.rs
use common::validation::{RegistrationForm, validate_form};
use yew::prelude::*;

#[function_component]
pub fn RegisterPage() -> Html {
    let form = use_state(|| RegistrationForm {
        username: String::new(),
        email: String::new(),
        password: String::new(),
    });

    let errors = use_state(Vec::new);

    let onsubmit = {
        let form = form.clone();
        let errors = errors.clone();

        Callback::from(move |e: SubmitEvent| {
            e.prevent_default();
            let current_form = (*form).clone();

            match validate_form(&current_form) {
                Ok(_) => {
                    // Form is valid, send to server
                    errors.set(vec![]);
                    // API call here
                },
                Err(validation_errors) => {
                    errors.set(validation_errors);
                }
            }
        })
    };

    // Render form with validation errors
    html! {
        <form onsubmit={onsubmit}>
            // Form fields
            // Display errors
        </form>
    }
}
```

#### Backend Implementation (Axum)

```rust
// backend/src/handlers/auth.rs
use axum::{
    extract::Json,
    http::StatusCode,
    response::IntoResponse,
};
use common::validation::{RegistrationForm, validate_form};

pub async fn register(
    Json(form): Json<RegistrationForm>,
) -> impl IntoResponse {
    // Use the shared validation
    match validate_form(&form) {
        Ok(_) => {
            // Process valid registration
            // Save to database, etc.
            (StatusCode::CREATED, "User registered successfully".to_string())
        }
        Err(errors) => {
            (StatusCode::BAD_REQUEST, format!("Validation errors: {:?}", errors))
        }
    }
}
```

## Server-side Rendering with Rust

Server-side rendering (SSR) improves initial page load performance and SEO by rendering the HTML on the server before sending it to the client. Rust's web frameworks are increasingly supporting SSR capabilities.

### Benefits of SSR

- **Faster Initial Load**: Users see content sooner
- **Improved SEO**: Search engines can more easily index content
- **Better Performance on Low-end Devices**: Less client-side JavaScript execution
- **Progressive Enhancement**: Basic functionality without JavaScript

### SSR with Leptos

Leptos has first-class support for server-side rendering with hydration:

```rust
use leptos::*;

#[component]
fn App() -> impl IntoView {
    let (count, set_count) = create_signal(0);

    view! {
        <div>
            <h1>"Server Rendered Counter"</h1>
            <button on:click=move |_| set_count.update(|n| *n += 1)>
                "Increment"
            </button>
            <p>"Count: " {count}</p>
        </div>
    }
}

// For client-side rendering
#[cfg(feature = "hydrate")]
fn main() {
    leptos::mount_to_body(App);
}

// For server-side rendering
#[cfg(feature = "ssr")]
#[tokio::main]
async fn main() {
    use axum::{
        routing::get,
        Router,
    };
    use leptos_axum::{generate_route_list, LeptosRoutes};

    let conf = get_configuration(None).await.unwrap();
    let leptos_options = conf.leptos_options;
    let routes = generate_route_list(|cx| view! { cx, <App/> });

    let app = Router::new()
        .route("/", get(leptos_axum::render_app_to_stream))
        .leptos_routes(leptos_options.clone(), routes, |cx| view! { cx, <App/> })
        .with_state(leptos_options);

    let addr = std::net::SocketAddr::from(([127, 0, 0, 1], 3000));
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
```

### Islands Architecture

The "islands architecture" is a hybrid approach where most of the page is static HTML, with interactive "islands" hydrated on the client:

```rust
use leptos::*;

// This component will be hydrated and interactive
#[island]
fn Counter() -> impl IntoView {
    let (count, set_count) = create_signal(0);

    view! {
        <div>
            <button on:click=move |_| set_count.update(|n| *n += 1)>
                "Increment"
            </button>
            <p>"Count: " {count}</p>
        </div>
    }
}

// This part remains static HTML
#[component]
fn StaticContent() -> impl IntoView {
    view! {
        <div>
            <h1>"Welcome to Our Site"</h1>
            <p>"This content doesn't need interactivity."</p>
        </div>
    }
}

#[component]
fn App() -> impl IntoView {
    view! {
        <div>
            <StaticContent/>
            <Counter/>
        </div>
    }
}
```

### Progressive Enhancement

A core principle of SSR is progressive enhancement—ensuring basic functionality works without JavaScript:

```rust
use leptos::*;

#[component]
fn SearchForm() -> impl IntoView {
    let (query, set_query) = create_signal(String::new());
    let results = create_resource(
        move || query.get(),
        |q| async move {
            if q.is_empty() {
                vec![]
            } else {
                search_api(q).await
            }
        }
    );

    // Form works without JS via action, but uses JS when available
    view! {
        <form
            action="/search"
            method="GET"
            on:submit=move |ev| {
                ev.prevent_default();
                // Client-side search when JS is available
            }
        >
            <input
                type="text"
                name="q"
                prop:value=query
                on:input=move |ev| set_query(event_target_value(&ev))
            />
            <button type="submit">"Search"</button>
        </form>

        // Show results client-side when available
        <Suspense fallback=move || view! { <p>"Loading..."</p> }>
            {move || results.get().map(|r| view! {
                <ul>
                    {r.into_iter().map(|item| view! {
                        <li>{item}</li>
                    }).collect::<Vec<_>>()}
                </ul>
            })}
        </Suspense>
    }
}
```

### SEO Considerations

For content-heavy sites, proper metadata is crucial:

```rust
use leptos::*;
use leptos_meta::*;

#[component]
fn BlogPost(post: BlogPostData) -> impl IntoView {
    view! {
        <>
            <Title text=post.title.clone()/>
            <Meta name="description" content=post.summary.clone()/>
            <Meta property="og:title" content=post.title.clone()/>
            <Meta property="og:description" content=post.summary.clone()/>

            <article>
                <h1>{post.title}</h1>
                <div class="content">{post.content}</div>
            </article>
        </>
    }
}
```

## Summary

In this chapter, we've explored the rapidly evolving world of web development in Rust. We've seen how Rust's core strengths—performance, memory safety, and concurrency—make it an excellent choice for building robust web applications.

We've covered backend frameworks like Actix Web, Rocket, and Axum, showing how each provides different approaches to building web services. We've learned how to design RESTful APIs, integrate with databases using SQLx, implement authentication and security, and create middleware for cross-cutting concerns.

For frontend development, we've explored how Rust can be compiled to WebAssembly, enabling the creation of high-performance web interfaces with frameworks like Yew and Leptos. We've also looked at GraphQL implementation with async-graphql, WebSockets for real-time communication, and deployment strategies for Rust web applications.

The Rust web ecosystem is still evolving, but it already offers powerful tools for building fast, reliable, and secure web applications. As the ecosystem continues to mature, Rust is becoming an increasingly attractive option for web development, especially for applications where performance, safety, and reliability are critical.

## Exercises

1. **Basic Web Server**: Implement a simple web server using Actix Web that serves static files and handles basic form submissions.

2. **RESTful API**: Create a CRUD API for a resource of your choice (e.g., books, products, tasks) using one of the frameworks discussed in this chapter.

3. **Database Integration**: Extend your API to store and retrieve data from a PostgreSQL database using SQLx.

4. **Authentication**: Add JWT-based authentication to your API, with protected and public routes.

5. **WebAssembly Frontend**: Build a simple frontend application using Yew or Leptos that interacts with your API.

6. **Real-Time Chat**: Implement a real-time chat application using WebSockets, with features like user presence and message history.

7. **GraphQL API**: Convert your REST API to a GraphQL API using async-graphql.

8. **Performance Optimization**: Load test your application and implement at least three performance optimizations.

9. **Deployment**: Package your application in a Docker container and deploy it to a cloud provider.

10. **Full-Stack Project**: Build a complete web application that combines backend APIs, database integration, authentication, and a WebAssembly frontend.
