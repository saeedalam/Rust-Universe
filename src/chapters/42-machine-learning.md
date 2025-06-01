# Chapter 42: Machine Learning and Data Science

## Introduction

Machine learning (ML) and data science have revolutionized how we extract insights from data and build intelligent systems. Traditionally, languages like Python have dominated these fields due to their rich ecosystem of libraries and tools. However, Rust is making significant inroads into the world of ML and data science, offering performance, safety, and reliability that can be crucial for production systems.

Rust's strengths—memory safety without garbage collection, concurrency without data races, and performance comparable to C and C++—make it an excellent candidate for computationally intensive and mission-critical ML applications. While Rust's ML ecosystem is still maturing compared to Python's, it offers unique advantages for specific use cases, particularly where performance, reliability, and deployment simplicity matter.

In this chapter, we'll explore how to leverage Rust for machine learning and data science tasks. We'll cover:

- Fundamentals of machine learning in Rust
- Building efficient data processing pipelines
- Interfacing with established ML frameworks
- Implementing performance-critical ML algorithms
- Developing and deploying ML models
- Utilizing GPU acceleration for ML workloads
- Integrating with the Python ML ecosystem

By the end of this chapter, you'll have a solid understanding of how to use Rust effectively in ML and data science projects, and you'll appreciate the unique advantages Rust brings to this domain.

## Machine Learning and Data Science Fundamentals

Before diving into Rust-specific implementations, let's briefly review some key machine learning and data science concepts.

### Core ML Concepts

Machine learning is a subset of artificial intelligence focused on building systems that can learn from and make decisions based on data. The main categories of machine learning include:

1. **Supervised Learning**: Training models on labeled data to make predictions or classifications
2. **Unsupervised Learning**: Finding patterns or structures in unlabeled data
3. **Reinforcement Learning**: Training agents to make decisions by rewarding desired behaviors

Key components of ML systems include:

- **Features**: The input variables used for prediction
- **Labels**: The output variables the model predicts (in supervised learning)
- **Training**: The process of optimizing model parameters using data
- **Inference**: Using a trained model to make predictions on new data
- **Evaluation**: Assessing model performance using metrics like accuracy, precision, recall, etc.

### The ML Workflow in Rust

A typical machine learning workflow in Rust includes:

1. **Data Loading and Preprocessing**: Loading data from various sources and preparing it for modeling
2. **Feature Engineering**: Creating and transforming features to improve model performance
3. **Model Training**: Building and optimizing ML models
4. **Model Evaluation**: Assessing model performance
5. **Model Deployment**: Serving model predictions in production

Let's explore how to implement these steps in Rust.

## Data Processing in Rust

Efficient data processing is the foundation of ML and data science. Let's look at Rust's capabilities for working with data.

### Data Structures for ML

Rust offers several crates for handling the data structures commonly used in ML:

#### ndarray

The `ndarray` crate provides an n-dimensional array type for Rust, similar to NumPy in Python:

```rust
use ndarray::{arr1, arr2, Array, Array1, Array2};

fn ndarray_example() {
    // Create a 1D array
    let a = arr1(&[1.0, 2.0, 3.0, 4.0, 5.0]);

    // Create a 2D array
    let b = arr2(&[[1.0, 2.0, 3.0],
                   [4.0, 5.0, 6.0]]);

    // Basic operations
    let c = &a + 1.0;  // Add 1.0 to each element
    let d = &b * 2.0;  // Multiply each element by 2.0

    // Matrix operations
    let e = b.dot(&arr2(&[[1.0], [2.0], [3.0]])); // Matrix multiplication

    println!("a: {}", a);
    println!("b: {}", b);
    println!("c: {}", c);
    println!("d: {}", d);
    println!("e: {}", e);
}
```

#### polars

The `polars` crate provides a fast DataFrames library in Rust:

```rust
use polars::prelude::*;

fn polars_example() -> Result<(), PolarsError> {
    // Create a DataFrame
    let df = df! [
        "A" => [1, 2, 3, 4, 5],
        "B" => [6, 7, 8, 9, 10],
        "C" => [11, 12, 13, 14, 15]
    ]?;

    println!("{}", df);

    // Basic operations
    let filtered = df.filter(&df["A"].lt(3))?;
    println!("Filtered:\n{}", filtered);

    // Group by and aggregate
    let grouped = df.groupby(["A"])?.agg(&[("B", &["sum", "mean"])])?;
    println!("Grouped:\n{}", grouped);

    Ok(())
}
```

### Data Loading and Preprocessing

#### Reading from Various Data Sources

Rust provides crates for reading data from various sources:

```rust
use std::fs::File;
use std::io::BufReader;
use csv::Reader;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct Record {
    id: u32,
    feature1: f64,
    feature2: f64,
    label: String,
}

fn load_csv_data() -> Result<Vec<Record>, Box<dyn std::error::Error>> {
    let file = File::open("data.csv")?;
    let reader = BufReader::new(file);
    let mut csv_reader = Reader::from_reader(reader);

    let records: Result<Vec<Record>, _> = csv_reader.deserialize().collect();
    Ok(records?)
}
```

For larger datasets, you might want to use the `polars` crate for efficient loading:

```rust
use polars::prelude::*;

fn load_large_csv() -> Result<DataFrame, PolarsError> {
    CsvReader::from_path("large_data.csv")?
        .has_header(true)
        .finish()
}
```

#### Data Cleaning and Transformation

Data preprocessing is a critical step in ML workflows. Here's an example using `polars`:

```rust
use polars::prelude::*;

fn preprocess_data(df: &mut DataFrame) -> Result<DataFrame, PolarsError> {
    // Handle missing values
    let df = df.fill_null(FillNullStrategy::Mean)?;

    // Normalize numerical features
    let numeric_cols = vec!["feature1", "feature2", "feature3"];

    let mut processed_df = df.clone();

    for col in numeric_cols {
        let series = df.column(col)?;
        let mean = series.mean().unwrap();
        let std = series.std(1).unwrap();

        let normalized = (series - mean) / std;
        processed_df.replace(col, normalized)?;
    }

    // One-hot encode categorical features
    let dummies = processed_df.columns(["category"])?
        .to_dummies()?;

    // Join the processed data
    processed_df.hstack(&dummies.get_columns())?
}
```

### Feature Engineering

Feature engineering is the process of creating new features or transforming existing ones to improve model performance. Here's a simple example:

```rust
use ndarray::{Array1, Array2};

fn polynomial_features(x: &Array1<f64>, degree: usize) -> Array2<f64> {
    let n = x.len();
    let mut result = Array2::zeros((n, degree));

    for i in 0..n {
        for j in 0..degree {
            result[[i, j]] = x[i].powi((j + 1) as i32);
        }
    }

    result
}

fn interaction_features(x1: &Array1<f64>, x2: &Array1<f64>) -> Array1<f64> {
    x1 * x2
}
```

## Building ML Models in Rust

Now that we understand how to process data in Rust, let's look at building ML models.

### Linear Models

Linear models are the simplest ML algorithms. Here's an implementation of linear regression:

```rust
use ndarray::{Array1, Array2};
use ndarray_linalg::Solve;

struct LinearRegression {
    coefficients: Array1<f64>,
    intercept: f64,
}

impl LinearRegression {
    fn new() -> Self {
        Self {
            coefficients: Array1::zeros(0),
            intercept: 0.0,
        }
    }

    fn fit(&mut self, x: &Array2<f64>, y: &Array1<f64>) -> Result<(), ndarray_linalg::error::LinalgError> {
        let n_samples = x.nrows();
        let n_features = x.ncols();

        // Add a column of ones for the intercept
        let mut x_with_intercept = Array2::ones((n_samples, n_features + 1));
        x_with_intercept.slice_mut(s![.., 1..]).assign(x);

        // Solve the normal equation: coefficients = (X^T X)^(-1) X^T y
        let xt_x = x_with_intercept.t().dot(&x_with_intercept);
        let xt_y = x_with_intercept.t().dot(y);

        let coefficients = xt_x.solve(&xt_y)?;

        self.intercept = coefficients[0];
        self.coefficients = coefficients.slice(s![1..]).to_owned();

        Ok(())
    }

    fn predict(&self, x: &Array2<f64>) -> Array1<f64> {
        let mut predictions = Array1::from_elem(x.nrows(), self.intercept);
        predictions = predictions + x.dot(&self.coefficients);
        predictions
    }
}
```

### Tree-Based Models

Decision trees are popular ML algorithms for both classification and regression. Here's a simplified implementation:

```rust
use std::collections::HashMap;
use ndarray::{Array1, ArrayView1};

enum SplitRule {
    Continuous { feature_idx: usize, threshold: f64 },
    Categorical { feature_idx: usize, categories: Vec<String> },
}

struct DecisionNode {
    rule: Option<SplitRule>,
    prediction: Option<f64>,
    left: Option<Box<DecisionNode>>,
    right: Option<Box<DecisionNode>>,
}

impl DecisionNode {
    fn new_leaf(prediction: f64) -> Self {
        Self {
            rule: None,
            prediction: Some(prediction),
            left: None,
            right: None,
        }
    }

    fn new_internal(rule: SplitRule, left: DecisionNode, right: DecisionNode) -> Self {
        Self {
            rule: Some(rule),
            prediction: None,
            left: Some(Box::new(left)),
            right: Some(Box::new(right)),
        }
    }

    fn predict(&self, features: &[f64]) -> f64 {
        if let Some(prediction) = self.prediction {
            return prediction;
        }

        match &self.rule {
            Some(SplitRule::Continuous { feature_idx, threshold }) => {
                let feature_value = features[*feature_idx];
                if feature_value <= *threshold {
                    self.left.as_ref().unwrap().predict(features)
                } else {
                    self.right.as_ref().unwrap().predict(features)
                }
            }
            Some(SplitRule::Categorical { feature_idx, categories }) => {
                // For simplicity, we assume categorical features are encoded as integers
                let feature_value = features[*feature_idx] as usize;
                if categories.contains(&feature_value.to_string()) {
                    self.left.as_ref().unwrap().predict(features)
                } else {
                    self.right.as_ref().unwrap().predict(features)
                }
            }
            None => panic!("Decision node without rule or prediction"),
        }
    }
}

struct DecisionTree {
    root: Option<DecisionNode>,
    max_depth: usize,
}

impl DecisionTree {
    fn new(max_depth: usize) -> Self {
        Self {
            root: None,
            max_depth,
        }
    }

    fn fit(&mut self, x: &Array2<f64>, y: &Array1<f64>) {
        let indices: Vec<usize> = (0..x.nrows()).collect();
        self.root = Some(self.build_tree(x, y, &indices, 0));
    }

    fn build_tree(&self, x: &Array2<f64>, y: &Array1<f64>, indices: &[usize], depth: usize) -> DecisionNode {
        // If we reached max depth or only have one sample, create a leaf node
        if depth >= self.max_depth || indices.len() <= 1 {
            let prediction = self.calculate_prediction(y, indices);
            return DecisionNode::new_leaf(prediction);
        }

        // Find the best split
        if let Some((feature_idx, threshold, left_indices, right_indices)) = self.find_best_split(x, y, indices) {
            // If we couldn't split the data further, create a leaf node
            if left_indices.is_empty() || right_indices.is_empty() {
                let prediction = self.calculate_prediction(y, indices);
                return DecisionNode::new_leaf(prediction);
            }

            // Create child nodes recursively
            let left_node = self.build_tree(x, y, &left_indices, depth + 1);
            let right_node = self.build_tree(x, y, &right_indices, depth + 1);

            return DecisionNode::new_internal(
                SplitRule::Continuous { feature_idx, threshold },
                left_node,
                right_node,
            );
        } else {
            // If no good split was found, create a leaf node
            let prediction = self.calculate_prediction(y, indices);
            return DecisionNode::new_leaf(prediction);
        }
    }

    fn find_best_split(&self, x: &Array2<f64>, y: &Array1<f64>, indices: &[usize]) -> Option<(usize, f64, Vec<usize>, Vec<usize>)> {
        let n_features = x.ncols();
        let n_samples = indices.len();

        let mut best_gain = f64::NEG_INFINITY;
        let mut best_feature = 0;
        let mut best_threshold = 0.0;
        let mut best_left_indices = Vec::new();
        let mut best_right_indices = Vec::new();

        // Calculate current impurity
        let current_impurity = self.calculate_impurity(y, indices);

        // Try each feature
        for feature_idx in 0..n_features {
            // Get unique values for this feature
            let mut feature_values = Vec::with_capacity(n_samples);
            for &idx in indices {
                feature_values.push(x[[idx, feature_idx]]);
            }
            feature_values.sort_by(|a, b| a.partial_cmp(b).unwrap());

            // Try each threshold
            for i in 0..feature_values.len() - 1 {
                let threshold = (feature_values[i] + feature_values[i + 1]) / 2.0;

                let mut left_indices = Vec::new();
                let mut right_indices = Vec::new();

                // Split data based on threshold
                for &idx in indices {
                    if x[[idx, feature_idx]] <= threshold {
                        left_indices.push(idx);
                    } else {
                        right_indices.push(idx);
                    }
                }

                // Skip if split is degenerate
                if left_indices.is_empty() || right_indices.is_empty() {
                    continue;
                }

                // Calculate impurity for children
                let left_impurity = self.calculate_impurity(y, &left_indices);
                let right_impurity = self.calculate_impurity(y, &right_indices);

                // Calculate information gain
                let left_weight = left_indices.len() as f64 / n_samples as f64;
                let right_weight = right_indices.len() as f64 / n_samples as f64;
                let gain = current_impurity - (left_weight * left_impurity + right_weight * right_impurity);

                // Update best split if this one is better
                if gain > best_gain {
                    best_gain = gain;
                    best_feature = feature_idx;
                    best_threshold = threshold;
                    best_left_indices = left_indices;
                    best_right_indices = right_indices;
                }
            }
        }

        if best_gain > 0.0 {
            Some((best_feature, best_threshold, best_left_indices, best_right_indices))
        } else {
            None
        }
    }

    fn calculate_impurity(&self, y: &Array1<f64>, indices: &[usize]) -> f64 {
        // For regression, we use variance as impurity
        if indices.is_empty() {
            return 0.0;
        }

        let mean = indices.iter().map(|&i| y[i]).sum::<f64>() / indices.len() as f64;
        let variance = indices.iter().map(|&i| (y[i] - mean).powi(2)).sum::<f64>() / indices.len() as f64;

        variance
    }

    fn calculate_prediction(&self, y: &Array1<f64>, indices: &[usize]) -> f64 {
        // For regression, prediction is the mean of target values
        if indices.is_empty() {
            return 0.0;
        }

        indices.iter().map(|&i| y[i]).sum::<f64>() / indices.len() as f64
    }

    fn predict(&self, x: &Array2<f64>) -> Array1<f64> {
        let n_samples = x.nrows();
        let mut predictions = Array1::zeros(n_samples);

        for i in 0..n_samples {
            let features = x.row(i).to_vec();
            predictions[i] = self.root.as_ref().unwrap().predict(&features);
        }

        predictions
    }
}
```

### Using Existing ML Crates

While implementing ML algorithms from scratch is educational, in practice, you'll often use existing libraries. Let's look at some Rust ML crates:

#### linfa

The `linfa` crate is a collection of ML algorithms written in Rust:

```rust
use linfa::prelude::*;
use linfa_linear::LinearRegression;
use ndarray::Array2;

fn linfa_example() -> Result<(), Box<dyn std::error::Error>> {
    // Load or create your dataset
    let (train_features, train_labels) = load_dataset()?;

    // Create a dataset
    let dataset = Dataset::new(train_features, train_labels);

    // Train a linear regression model
    let model = LinearRegression::default()
        .fit(&dataset)?;

    // Make predictions
    let test_features = Array2::ones((10, 3));
    let predictions = model.predict(&test_features);

    println!("Predictions: {:?}", predictions);
    println!("Model coefficients: {:?}", model.params());

    Ok(())
}

fn load_dataset() -> Result<(Array2<f64>, Array1<f64>), Box<dyn std::error::Error>> {
    // In a real application, load and preprocess your data here
    let features = Array2::ones((100, 3));
    let labels = Array1::ones(100);

    Ok((features, labels))
}
```

#### smartcore

The `smartcore` crate is another ML library for Rust:

```rust
use smartcore::linalg::basic::matrix::DenseMatrix;
use smartcore::linear::linear_regression::LinearRegression;

fn smartcore_example() {
    // Create a dataset
    let x = DenseMatrix::from_2d_array(&[
        &[1.0, 2.0],
        &[3.0, 4.0],
        &[5.0, 6.0],
        &[7.0, 8.0],
        &[9.0, 10.0],
    ]);
    let y = vec![2.0, 4.0, 6.0, 8.0, 10.0];

    // Fit a linear regression model
    let model = LinearRegression::fit(&x, &y, Default::default()).unwrap();

    // Make predictions
    let x_test = DenseMatrix::from_2d_array(&[
        &[11.0, 12.0],
        &[13.0, 14.0],
    ]);
    let predictions = model.predict(&x_test).unwrap();

    println!("Predictions: {:?}", predictions);
}
```

By using these libraries, you can implement ML models more efficiently while still leveraging Rust's performance and safety benefits.

## Interfacing with ML Frameworks

While Rust's native ML ecosystem is growing, you might need to interface with established ML frameworks written in other languages. Let's explore how to do this effectively.

### Rust and Python Integration

Python has a rich ecosystem of ML libraries like TensorFlow, PyTorch, and scikit-learn. You can interface with these libraries from Rust using crates like `pyo3`:

```rust
use pyo3::prelude::*;
use pyo3::types::{PyList, PyDict};
use ndarray::Array2;

fn use_sklearn_from_rust() -> PyResult<()> {
    Python::with_gil(|py| {
        // Import Python modules
        let sklearn = py.import("sklearn.ensemble")?;
        let np = py.import("numpy")?;

        // Create NumPy arrays for data
        let x_data = np.call_method1("array", (vec![
            vec![1.0, 2.0, 3.0],
            vec![4.0, 5.0, 6.0],
            vec![7.0, 8.0, 9.0],
        ],))?;

        let y_data = np.call_method1("array", (vec![0, 1, 1],))?;

        // Create and train a random forest classifier
        let rf = sklearn.call_method1("RandomForestClassifier", (10,))?;
        rf.call_method1("fit", (x_data, y_data))?;

        // Make predictions
        let x_test = np.call_method1("array", (vec![
            vec![3.0, 5.0, 7.0],
        ],))?;

        let predictions = rf.call_method1("predict", (x_test,))?;
        println!("Predictions: {:?}", predictions);

        // Get feature importances
        let importances = rf.getattr("feature_importances_")?;
        println!("Feature importances: {:?}", importances);

        Ok(())
    })
}
```

### TensorFlow and Rust

You can use TensorFlow models in Rust using the `tensorflow` crate:

```rust
use tensorflow::{Graph, ImportGraphDefOptions, Session, SessionOptions, SessionRunArgs, Tensor};
use std::fs::File;
use std::io::Read;

fn use_tensorflow_model() -> Result<(), Box<dyn std::error::Error>> {
    // Load a pre-trained model
    let mut model_data = Vec::new();
    File::open("model.pb")?.read_to_end(&mut model_data)?;

    // Create TensorFlow graph and session
    let mut graph = Graph::new();
    graph.import_graph_def(&model_data, &ImportGraphDefOptions::new())?;
    let session = Session::new(&SessionOptions::new(), &graph)?;

    // Prepare input data
    let input_data: Vec<f32> = vec![1.0, 2.0, 3.0, 4.0];
    let input_tensor = Tensor::new(&[1, 4]).with_values(&input_data)?;

    // Run inference
    let mut args = SessionRunArgs::new();
    let input_op = graph.operation_by_name_required("input_op")?;
    let output_op = graph.operation_by_name_required("output_op")?;

    args.add_feed(&input_op, 0, &input_tensor);
    let output_fetch = args.request_fetch(&output_op, 0);

    session.run(&mut args)?;

    // Get results
    let output_tensor = args.fetch::<f32>(output_fetch)?;
    let output_data = output_tensor.to_vec();
    println!("Model output: {:?}", output_data);

    Ok(())
}
```

### ONNX and Rust

ONNX (Open Neural Network Exchange) is a format for representing ML models that allows for interoperability between different frameworks. The `tract` crate provides ONNX support in Rust:

```rust
use tract_onnx::prelude::*;

fn use_onnx_model() -> TractResult<()> {
    // Load the ONNX model
    let model = tract_onnx::onnx()
        .model_for_path("model.onnx")?
        .with_input_fact(0, InferenceFact::dt_shape(f32::datum_type(), tvec!(1, 3, 224, 224)))?
        .into_optimized()?
        .into_runnable()?;

    // Prepare input data (example: random tensor for a 224x224 RGB image)
    let input_data = tract_ndarray::Array4::from_shape_fn((1, 3, 224, 224), |_| -> f32 { rand::random() });

    // Run inference
    let result = model.run(tvec!(input_data.into()))?;

    // Process the output
    let output_tensor = result[0].to_array_view::<f32>()?;
    let best_class_idx = output_tensor
        .iter()
        .enumerate()
        .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
        .map(|(idx, _)| idx)
        .unwrap();

    println!("Predicted class: {}", best_class_idx);

    Ok(())
}
```

## Performance-Critical ML Algorithms

One of Rust's strengths is its performance, making it ideal for implementing performance-critical ML algorithms. Let's explore some examples.

### K-Means Clustering

K-means is a popular unsupervised learning algorithm for clustering:

```rust
use ndarray::{Array1, Array2, Axis};
use rand::seq::SliceRandom;
use rand::thread_rng;
use std::f64;

struct KMeans {
    k: usize,
    max_iterations: usize,
    centroids: Option<Array2<f64>>,
}

impl KMeans {
    fn new(k: usize, max_iterations: usize) -> Self {
        Self {
            k,
            max_iterations,
            centroids: None,
        }
    }

    fn fit(&mut self, x: &Array2<f64>) -> Array1<usize> {
        let n_samples = x.nrows();
        let n_features = x.ncols();

        // Initialize centroids using k-means++
        let mut centroids = Array2::zeros((self.k, n_features));
        let mut rng = thread_rng();

        // Choose first centroid randomly
        let first_centroid_idx = (0..n_samples).choose(&mut rng).unwrap();
        centroids.row_mut(0).assign(&x.row(first_centroid_idx));

        // Choose remaining centroids with probability proportional to distance
        for i in 1..self.k {
            let mut distances = Array1::zeros(n_samples);

            for j in 0..n_samples {
                let mut min_dist = f64::INFINITY;

                for c in 0..i {
                    let dist = euclidean_distance(&x.row(j), &centroids.row(c));
                    min_dist = min_dist.min(dist);
                }

                distances[j] = min_dist;
            }

            // Normalize distances to create a probability distribution
            let sum_distances = distances.sum();
            let probs = &distances / sum_distances;

            // Choose next centroid based on probability
            let mut cumsum = 0.0;
            let rand_val = rand::random::<f64>();
            let mut next_centroid_idx = 0;

            for j in 0..n_samples {
                cumsum += probs[j];
                if cumsum >= rand_val {
                    next_centroid_idx = j;
                    break;
                }
            }

            centroids.row_mut(i).assign(&x.row(next_centroid_idx));
        }

        // Iterative k-means algorithm
        let mut labels = Array1::zeros(n_samples);
        let mut prev_centroids = Array2::zeros((self.k, n_features));

        for _ in 0..self.max_iterations {
            // Assign points to nearest centroid
            for i in 0..n_samples {
                let mut min_dist = f64::INFINITY;
                let mut closest_centroid = 0;

                for j in 0..self.k {
                    let dist = euclidean_distance(&x.row(i), &centroids.row(j));
                    if dist < min_dist {
                        min_dist = dist;
                        closest_centroid = j;
                    }
                }

                labels[i] = closest_centroid;
            }

            // Save previous centroids to check for convergence
            prev_centroids.assign(&centroids);

            // Update centroids based on assigned points
            for j in 0..self.k {
                let mut sum = Array1::zeros(n_features);
                let mut count = 0;

                for i in 0..n_samples {
                    if labels[i] == j {
                        sum = &sum + &x.row(i);
                        count += 1;
                    }
                }

                if count > 0 {
                    centroids.row_mut(j).assign(&(&sum / count as f64));
                }
            }

            // Check for convergence
            if has_converged(&prev_centroids, &centroids) {
                break;
            }
        }

        self.centroids = Some(centroids);
        labels
    }

    fn predict(&self, x: &Array2<f64>) -> Array1<usize> {
        let centroids = self.centroids.as_ref().expect("Model not fitted yet");
        let n_samples = x.nrows();
        let mut labels = Array1::zeros(n_samples);

        for i in 0..n_samples {
            let mut min_dist = f64::INFINITY;
            let mut closest_centroid = 0;

            for j in 0..self.k {
                let dist = euclidean_distance(&x.row(i), &centroids.row(j));
                if dist < min_dist {
                    min_dist = dist;
                    closest_centroid = j;
                }
            }

            labels[i] = closest_centroid;
        }

        labels
    }
}

fn euclidean_distance(a: &ndarray::ArrayView1<f64>, b: &ndarray::ArrayView1<f64>) -> f64 {
    a.iter()
        .zip(b.iter())
        .map(|(&x, &y)| (x - y).powi(2))
        .sum::<f64>()
        .sqrt()
}

fn has_converged(prev_centroids: &Array2<f64>, centroids: &Array2<f64>) -> bool {
    let tolerance = 1e-4;
    let max_diff = prev_centroids
        .iter()
        .zip(centroids.iter())
        .map(|(&x, &y)| (x - y).abs())
        .fold(0.0, |acc, x| acc.max(x));

    max_diff < tolerance
}
```

### Gradient Boosting

Gradient boosting is a powerful ML technique that builds an ensemble of weak prediction models:

```rust
use ndarray::{Array1, Array2};

struct GradientBoostingRegressor {
    n_estimators: usize,
    learning_rate: f64,
    max_depth: usize,
    trees: Vec<DecisionTree>,
    initial_prediction: f64,
}

impl GradientBoostingRegressor {
    fn new(n_estimators: usize, learning_rate: f64, max_depth: usize) -> Self {
        Self {
            n_estimators,
            learning_rate,
            max_depth,
            trees: Vec::with_capacity(n_estimators),
            initial_prediction: 0.0,
        }
    }

    fn fit(&mut self, x: &Array2<f64>, y: &Array1<f64>) {
        // Initialize with mean prediction
        self.initial_prediction = y.mean().unwrap_or(0.0);
        let mut current_predictions = Array1::from_elem(x.nrows(), self.initial_prediction);

        // Iteratively build trees
        for _ in 0..self.n_estimators {
            // Calculate pseudo-residuals
            let residuals = y - &current_predictions;

            // Train a tree on the residuals
            let mut tree = DecisionTree::new(self.max_depth);
            tree.fit(x, &residuals);

            // Update predictions
            let tree_predictions = tree.predict(x);
            current_predictions = &current_predictions + &(&tree_predictions * self.learning_rate);

            // Store the tree
            self.trees.push(tree);
        }
    }

    fn predict(&self, x: &Array2<f64>) -> Array1<f64> {
        // Start with initial prediction
        let mut predictions = Array1::from_elem(x.nrows(), self.initial_prediction);

        // Add contributions from each tree
        for tree in &self.trees {
            predictions = &predictions + &(&tree.predict(x) * self.learning_rate);
        }

        predictions
    }
}
```

## GPU Acceleration for ML Workloads

Leveraging GPU acceleration is essential for many ML workloads, especially deep learning. Rust provides several crates for GPU programming:

### CUDA Integration

The `rust-cuda` ecosystem allows you to write CUDA kernels directly in Rust:

```rust
use rustacuda::prelude::*;
use rustacuda::memory::DeviceBox;

fn cuda_example() -> Result<(), rustacuda::error::CudaError> {
    // Initialize CUDA
    rustacuda::init(CudaFlags::empty())?;

    // Get the first device
    let device = Device::get_device(0)?;

    // Create a context
    let _context = Context::create_and_push(
        ContextFlags::MAP_HOST | ContextFlags::SCHED_AUTO, device)?;

    // Create data
    let mut host_data = [1.0f32, 2.0, 3.0, 4.0, 5.0];
    let mut device_data = DeviceBox::new(&host_data)?;

    // Load and compile the kernel
    let module = Module::load_from_string(&include_str!("kernel.ptx"))?;

    // Launch the kernel
    let stream = Stream::new(StreamFlags::NON_BLOCKING, None)?;
    unsafe {
        launch!(module.multiply_by_2 <<<1, host_data.len() as u32, 0, stream>>>(
            device_data.as_device_ptr(),
            host_data.len()
        ))?;
    }

    // Copy the result back
    device_data.copy_to(&mut host_data)?;

    println!("Result: {:?}", host_data);

    Ok(())
}
```

### GPU Computing with OpenCL

For more portable GPU computing, you can use OpenCL via the `ocl` crate:

```rust
use ocl::{ProQue, Buffer, MemFlags};

fn opencl_example() -> ocl::Result<()> {
    // OpenCL kernel as a string
    let src = r#"
        __kernel void multiply_by_2(__global float* data) {
            size_t idx = get_global_id(0);
            data[idx] *= 2.0f;
        }
    "#;

    // Initialize OpenCL
    let pro_que = ProQue::builder()
        .src(src)
        .dims(5) // 5 work items
        .build()?;

    // Create a buffer
    let mut data = vec![1.0f32, 2.0, 3.0, 4.0, 5.0];
    let buffer = Buffer::builder()
        .queue(pro_que.queue().clone())
        .flags(MemFlags::READ_WRITE)
        .len(5)
        .copy_host_slice(&data)
        .build()?;

    // Create and enqueue the kernel
    let kernel = pro_que.kernel_builder("multiply_by_2")
        .arg(&buffer)
        .build()?;

    unsafe { kernel.enq()? }

    // Read the results
    buffer.read(&mut data).enq()?;

    println!("Result: {:?}", data);

    Ok(())
}
```

### GPU-Accelerated Neural Networks

For neural networks, you can use crates like `tch-rs` (PyTorch bindings for Rust):

```rust
use tch::{nn, Device, Tensor};

fn neural_network_example() -> Result<(), Box<dyn std::error::Error>> {
    // Check if CUDA is available
    let device = if tch::Cuda::is_available() {
        Device::Cuda(0)
    } else {
        Device::Cpu
    };

    // Create a simple neural network
    let vs = nn::VarStore::new(device);
    let net = nn::seq()
        .add(nn::linear(&vs.root(), 784, 128, Default::default()))
        .add_fn(|x| x.relu())
        .add(nn::linear(&vs.root(), 128, 10, Default::default()));

    // Create some random input
    let x = Tensor::rand(&[64, 784], (tch::Kind::Float, device));

    // Forward pass
    let y = net.forward(&x);

    println!("Input shape: {:?}", x.size());
    println!("Output shape: {:?}", y.size());

    Ok(())
}
```

## Modern Rust ML Frameworks

Rust's ML ecosystem has grown significantly in recent years, with several promising frameworks emerging. Let's explore some of the most notable ones.

### Burn: A Modern Deep Learning Framework

Burn is a modern deep learning framework written in Rust that offers strong GPU acceleration, automatic differentiation, and high-performance neural network implementations.

Key features of Burn include:

1. **Type-safety**: Burn leverages Rust's type system to catch errors at compile time
2. **Backend Agnostic**: Supports CPU, CUDA, and other backends
3. **Dynamic Computation Graph**: Allows for flexible model architectures
4. **High Performance**: Optimized for both training and inference

Here's a simple example of using Burn to create and train a neural network:

```rust
use burn::{
    config::Config,
    module::{Module, ModuleT},
    nn::{
        conv::{Conv2d, Conv2dConfig},
        linear::{Linear, LinearConfig},
        pool::{AdaptiveAvgPool2d, AdaptiveAvgPool2dConfig},
    },
    tensor::{backend::Backend, Tensor},
};

// Define the model architecture
#[derive(Module, Debug)]
struct SimpleCNN<B: Backend> {
    conv1: Conv2d<B>,
    conv2: Conv2d<B>,
    pool: AdaptiveAvgPool2d,
    fc1: Linear<B>,
    fc2: Linear<B>,
}

// Configuration for the model
#[derive(Config, Debug)]
struct SimpleCNNConfig {
    conv1: Conv2dConfig,
    conv2: Conv2dConfig,
    pool: AdaptiveAvgPool2dConfig,
    fc1: LinearConfig,
    fc2: LinearConfig,
}

impl<B: Backend> ModuleT<B> for SimpleCNN<B> {
    type Config = SimpleCNNConfig;

    fn new(config: &Self::Config, device: &B::Device) -> Self {
        Self {
            conv1: Conv2d::new(config.conv1.clone(), device),
            conv2: Conv2d::new(config.conv2.clone(), device),
            pool: AdaptiveAvgPool2d::new(config.pool.clone()),
            fc1: Linear::new(config.fc1.clone(), device),
            fc2: Linear::new(config.fc2.clone(), device),
        }
    }

    fn forward(&self, x: Tensor<B, 4>) -> Tensor<B, 2> {
        // Forward pass through convolutional layers
        let x = self.conv1.forward(x).relu();
        let x = self.conv2.forward(x).relu();

        // Apply pooling
        let x = self.pool.forward(x);

        // Flatten and pass through fully connected layers
        let batch_size = x.dims()[0];
        let x = x.reshape([batch_size, -1]);
        let x = self.fc1.forward(x).relu();
        self.fc2.forward(x)
    }
}

// Create a model configuration
fn create_model_config() -> SimpleCNNConfig {
    SimpleCNNConfig {
        conv1: Conv2dConfig::new([3, 16], [3, 3]),
        conv2: Conv2dConfig::new([16, 32], [3, 3]),
        pool: AdaptiveAvgPool2dConfig::new([1, 1]),
        fc1: LinearConfig::new(32, 64),
        fc2: LinearConfig::new(64, 10),
    }
}

// Example of training the model (simplified)
fn train_example<B: Backend>() {
    // Create the model
    let config = create_model_config();
    let device = B::Device::default();
    let model = SimpleCNN::new(&config, &device);

    // Define optimizer, loss function, dataset, etc.
    // ...

    // Training loop would go here
    // ...
}
```

### Candle: For Foundation Models

Candle is a minimalist ML framework focused on running foundation models (like LLMs) efficiently. It's designed for inference rather than training and is optimized for production deployments.

Key features of Candle include:

1. **Minimal Dependencies**: Self-contained with few external dependencies
2. **CUDA and Metal Support**: Efficient GPU acceleration on multiple platforms
3. **Quantization Support**: 4-bit and 8-bit quantization for efficient inference
4. **Model Compatibility**: Easy loading of models from Hugging Face and other sources

Here's how to load and run an LLM with Candle:

```rust
use candle::{DType, Device, Tensor};
use candle_nn::{ops, VarBuilder};
use candle_transformers::models::llama::{Config, Llama};

// Load a pre-trained LLaMA model
fn load_llama_model() -> Result<(), Box<dyn std::error::Error>> {
    // Select device (CUDA if available, otherwise CPU)
    let device = if candle::cuda_is_available() {
        Device::Cuda(0)
    } else {
        Device::Cpu
    };

    // Load model configuration
    let config = Config::default();

    // Load weights from disk
    let vb = VarBuilder::from_saved("path/to/model/weights", DType::F16, &device)?;

    // Initialize the model
    let model = Llama::new(&config, vb)?;

    // Tokenize input
    let tokens = vec![1, 2, 3, 4]; // Example token IDs
    let input = Tensor::new(tokens, &device)?;

    // Run inference
    let logits = model.forward(&input)?;

    // Process outputs
    let next_token = ops::argmax(&logits.i([(tokens.len() - 1)..])?, -1)?;
    println!("Next token: {:?}", next_token);

    Ok(())
}
```

### Linfa: For Traditional ML Algorithms

Linfa is Rust's answer to scikit-learn, providing implementations of traditional machine learning algorithms:

```rust
use linfa::prelude::*;
use linfa_clustering::KMeans;
use ndarray::{array, Array2};

fn kmeans_example() -> Result<(), Box<dyn std::error::Error>> {
    // Create some sample data
    let data = array![
        [1.0, 2.0],
        [1.1, 2.1],
        [1.2, 2.2],
        [5.0, 6.0],
        [5.1, 6.1],
        [5.2, 6.2],
    ];

    // Convert to a dataset
    let dataset = Dataset::from(data.clone())
        .with_feature_names(vec!["x".to_string(), "y".to_string()]);

    // Run K-means clustering with k=2
    let model = KMeans::params(2)
        .max_n_iterations(100)
        .tolerance(1e-5)
        .fit(&dataset)?;

    // Get cluster assignments
    let labels = model.predict(&dataset);

    // Get cluster centers
    let centroids = model.centroids();

    println!("Labels: {:?}", labels);
    println!("Centroids: {:?}", centroids);

    Ok(())
}
```

## Integration with Python ML Ecosystem

While Rust's ML ecosystem is growing, Python remains the dominant language for ML due to its extensive libraries like TensorFlow, PyTorch, scikit-learn, and more. Fortunately, Rust provides excellent tools for integrating with Python's ML ecosystem.

### PyO3 for Seamless Interoperability

PyO3 allows you to create Python bindings for Rust code and call Python functions from Rust:

```rust
use pyo3::prelude::*;
use pyo3::types::{PyList, PyDict};

// Function to call Python's scikit-learn from Rust
fn scikit_learn_from_rust() -> PyResult<()> {
    Python::with_gil(|py| {
        // Import Python modules
        let sklearn = py.import("sklearn.ensemble")?;
        let np = py.import("numpy")?;

        // Create sample data
        let x = np.call_method1("array", ([
            [1.0, 2.0],
            [2.0, 3.0],
            [3.0, 4.0],
            [4.0, 5.0],
        ],))?;

        let y = np.call_method1("array", ([0, 0, 1, 1],))?;

        // Create a random forest classifier
        let rf = sklearn.call_method1("RandomForestClassifier", ())?;

        // Train the model
        rf.call_method1("fit", (x, y))?;

        // Make predictions
        let x_test = np.call_method1("array", ([[2.5, 3.5], [3.5, 4.5]],))?;
        let predictions = rf.call_method1("predict", (x_test,))?;

        println!("Predictions: {:?}", predictions);

        Ok(())
    })
}

// Function to expose Rust code to Python
#[pyfunction]
fn process_data(data: &PyList) -> PyResult<PyObject> {
    let gil = Python::acquire_gil();
    let py = gil.python();

    // Convert Python list to Rust Vec
    let mut rust_data: Vec<f64> = data.extract()?;

    // Process data in Rust (e.g., normalize)
    let sum: f64 = rust_data.iter().sum();
    let mean = sum / rust_data.len() as f64;

    for val in &mut rust_data {
        *val = *val / mean;
    }

    // Convert back to Python
    let result = PyList::new(py, &rust_data);
    Ok(result.into())
}

// Module definition for Python bindings
#[pymodule]
fn rust_ml_helpers(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(process_data, m)?)?;
    Ok(())
}
```

### Calling TensorFlow and PyTorch from Rust

For deep learning with TensorFlow or PyTorch, you can use their respective Rust bindings:

#### TensorFlow with tensorflow-rust:

```rust
use tensorflow::{Graph, ImportGraphDefOptions, Session, SessionOptions, Status, Tensor};

fn tensorflow_inference() -> Result<(), Status> {
    // Load a pre-trained model
    let mut graph = Graph::new();
    let model_data = std::fs::read("model.pb")?;
    graph.import_graph_def(&model_data, &ImportGraphDefOptions::new())?;

    // Create a session
    let session = Session::new(&SessionOptions::new(), &graph)?;

    // Prepare input
    let input_data: Vec<f32> = vec![1.0, 2.0, 3.0, 4.0];
    let input_tensor = Tensor::new(&[1, 4]).with_values(&input_data)?;

    // Run inference
    let mut input_tensors = vec![input_tensor];
    let output_tensors = session.run(
        &[],
        &[("input", &input_tensors[0])],
        &["output"],
        None,
    )?;

    // Process results
    let output: &Tensor<f32> = &output_tensors[0];
    println!("Output shape: {:?}", output.dims());

    Ok(())
}
```

#### PyTorch with tch-rs:

```rust
use tch::{nn, Device, Tensor};
use std::path::Path;

fn pytorch_model_inference() -> Result<(), Box<dyn std::error::Error>> {
    // Load a TorchScript model
    let model_path = Path::new("model.pt");
    let model = CModule::load(model_path)?;

    // Prepare input tensor
    let input = Tensor::of_slice(&[1.0f32, 2.0, 3.0, 4.0])
        .view((1, 4)); // Reshape to batch_size=1, features=4

    // Run inference
    let output = model.forward_ts(&[input])?;

    println!("Output: {:?}", output);

    Ok(())
}
```

### Building Hybrid Rust-Python ML Pipelines

For production ML systems, a common pattern is to use Python for training and Rust for deployment:

1. **Train in Python**: Leverage Python's rich ecosystem for data exploration, model development, and training
2. **Export the Model**: Save the trained model in a format that can be loaded in Rust
3. **Deploy with Rust**: Build a high-performance, memory-safe inference service in Rust

This approach combines the best of both worlds:

```rust
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};
use tch::{CModule, Tensor};

// Load the PyTorch model (trained in Python)
static MODEL: once_cell::sync::Lazy<CModule> = once_cell::sync::Lazy::new(|| {
    CModule::load("model.pt").expect("Failed to load model")
});

// Request and response types
#[derive(Deserialize)]
struct PredictionRequest {
    features: Vec<f32>,
}

#[derive(Serialize)]
struct PredictionResponse {
    prediction: f32,
    confidence: f32,
}

// API endpoint for predictions
async fn predict(request: web::Json<PredictionRequest>) -> impl Responder {
    // Convert input to tensor
    let input = Tensor::of_slice(&request.features)
        .view((1, request.features.len() as i64));

    // Run inference
    let output = MODEL.forward_ts(&[input])
        .expect("Model inference failed");

    // Extract prediction and confidence
    let values = output.to_kind(tch::Kind::Float).try_into::<Vec<f32>>()
        .expect("Failed to convert output to Vec");

    let prediction = values[0];
    let confidence = values[1];

    // Return JSON response
    HttpResponse::Ok().json(PredictionResponse {
        prediction,
        confidence,
    })
}

// Main function to run the server
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/predict", web::post().to(predict))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

### Deploying Python Models with Rust Services

For more complex scenarios where you need to keep Python in the deployment stack, you can use PyO3 to embed a Python interpreter within your Rust application:

```rust
use pyo3::prelude::*;
use pyo3::types::IntoPyDict;
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};

// Shared Python interpreter state
struct PythonModel {
    model: PyObject,
}

impl PythonModel {
    fn new() -> PyResult<Self> {
        Python::with_gil(|py| {
            // Import the Python model
            let pickle = py.import("pickle")?;
            let io = py.import("io")?;
            let torch = py.import("torch")?;

            // Load the model from disk
            let model_file = std::fs::read("model.pkl")?;
            let bytes_io = io.call_method1("BytesIO", (model_file,))?;
            let model = pickle.call_method1("load", (bytes_io,))?;

            // Set model to evaluation mode
            model.call_method0("eval")?;

            Ok(Self { model })
        })
    }

    fn predict(&self, features: Vec<f32>) -> PyResult<Vec<f32>> {
        Python::with_gil(|py| {
            // Convert input to PyTorch tensor
            let torch = py.import("torch")?;
            let input = torch.call_method1(
                "tensor",
                (features,),
                Some([("dtype", torch.getattr("float32")?)]
                    .into_py_dict(py)),
            )?;

            // Add batch dimension
            let input = input.call_method0("unsqueeze", (0,))?;

            // Run inference
            let locals = [("model", &self.model), ("input", input)]
                .into_py_dict(py);

            let result = py.eval(
                "model(input).detach().numpy().tolist()[0]",
                None,
                Some(&locals),
            )?;

            // Convert result back to Rust
            let output: Vec<f32> = result.extract()?;
            Ok(output)
        })
    }
}

// Request and response types
#[derive(Deserialize)]
struct PredictionRequest {
    features: Vec<f32>,
}

#[derive(Serialize)]
struct PredictionResponse {
    predictions: Vec<f32>,
}

// Web server with Python model
async fn predict(
    model: web::Data<PythonModel>,
    request: web::Json<PredictionRequest>,
) -> impl Responder {
    match model.predict(request.features.clone()) {
        Ok(predictions) => HttpResponse::Ok().json(PredictionResponse { predictions }),
        Err(e) => {
            eprintln!("Prediction error: {}", e);
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize the Python model
    let model = match PythonModel::new() {
        Ok(model) => model,
        Err(e) => {
            eprintln!("Failed to initialize model: {}", e);
            return Ok(());
        }
    };

    let model_data = web::Data::new(model);

    // Start the web server
    HttpServer::new(move || {
        App::new()
            .app_data(model_data.clone())
            .route("/predict", web::post().to(predict))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

## Conclusion

Rust's ML ecosystem has grown considerably, offering new frameworks like Burn and Candle that provide high-performance alternatives for specific ML use cases. While Python remains the dominant language for ML and data science, Rust offers compelling advantages for performance-critical components and production deployments.

By combining Rust's safety and performance with Python's rich ecosystem, you can build ML systems that have the best of both worlds: the flexibility and ecosystem of Python for research and development, and the reliability and efficiency of Rust for production.

As the Rust ML ecosystem continues to mature, we can expect more powerful tools and frameworks to emerge, further strengthening Rust's position in the ML and data science landscape.

🔨 **Project: ML Prediction Service**

For this chapter's project, we'll build a complete ML prediction service that:

1. Loads a model trained in Python
2. Provides a high-performance API for predictions
3. Handles data preprocessing and postprocessing
4. Includes monitoring and error handling

This project will demonstrate how to combine Rust's performance and safety with Python's rich ML ecosystem to create a production-ready ML service.
