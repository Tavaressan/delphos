# Dockerfile for Java Core (Spring Boot)

# Stage 1: Build the application using Gradle
FROM gradle:8.7-jdk21 AS builder
WORKDIR /app

# Copy gradle configuration files
COPY build.gradle.kts settings.gradle.kts ./

# Cache dependencies (this helps speed up subsequent builds)
# We run build with --no-daemon to avoid keeping the gradle daemon alive
RUN gradle build -x test --no-daemon || true

# Copy the source code
COPY src ./src

# Build the executable jar
RUN gradle bootJar -x test --no-daemon

# Stage 2: Runtime image
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Copy the build artifact from the builder stage
# Spring Boot gradle plugin puts the jar in build/libs/
COPY --from=builder /app/build/libs/*.jar app.jar

EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
