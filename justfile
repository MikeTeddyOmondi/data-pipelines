default:
    just --list

compose:
    docker-compose up --build

test:
    curl -X POST -H "Content-Type: application/json" -d '{"user_id": "123", "activity": "page_view", "page": "/home"}' http://localhost:3333/events

launch-bucket:
    docker-compose up -d minio

launch-queue:
    docker-compose up -d rabbitmq

launch-mongo:
    docker-compose up -d mongo

launch-services:
    docker-compose up -d api
    docker-compose up -d processor
    docker-compose up -d loader
    

