# Data Pipeline Project

This project demonstrates a simple data pipeline using Node.js, Express, MinIO, RabbitMQ, and MongoDB. It consists of three main services:

*   **API Service**:  An Express API that receives user activity events, stores them in MinIO (AWS S3), and publishes a message to RabbitMQ.
*   **Processing Service**: Consumes messages from RabbitMQ, retrieves data from MinIO, transforms it, stores the transformed data back in MinIO, and publishes a new message to RabbitMQ.
*   **Warehouse Loader**: Consumes messages from RabbitMQ, retrieves transformed data from MinIO, and loads it into a data warehouse/data lake (simulated with a separate MinIO bucket).

## Prerequisites

*   Docker and Docker Compose

## Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/MikeTeddyOmondi/data-pipelines
    cd data-pipelines
    ```

2.  **Configure environment variables**:

    Create a `.env` file in the root directory based on the `.env.example` file, adjusting the values as needed for your local setup.

3.  **Start the services:**

    ```bash
    docker-compose up --build
    ```
4.  **Stop the services:**

    ```bash
    docker-compose down
    ```

## Usage

1.  **Send events to the API service:**

    ```bash
    curl -X POST \
    -H "Content-Type: application/json" \
    -d '{"user_id": "EFdiSfbdnHRKMGKnLVRreTc58D29FvE2I+xJC5dQYs4", "activity": "page_view", "page": "/home"}' \ 
    http://localhost:3333/events
    ```

2.  **Monitor the logs:**

    Check the logs of each service to ensure they are running correctly and processing data.

## Architecture

```
[Client] --> [API Service] --> [MinIO (Raw Data)] --> [RabbitMQ]
 |
 v
 [Processing Service] --> [MinIO (Processed Data)] --> [RabbitMQ]
 |
 v
 [Warehouse Loader] --> [MinIO (Data Warehouse)]

```

## Notes 
* This is a simplified example and can be extended with more complex transformations, error handling, monitoring, and integration with different data sources and data warehouse solutions.
* For production environments, consider using more robust infrastructure like Kubernetes, cloud-managed services, and proper monitoring and alerting.