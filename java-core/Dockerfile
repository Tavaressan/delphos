# Dockerfile for Java Core (Spring Boot)

# Stage 1: Build the application using Gradle
FROM gradle:9.6-jdk21 AS builder
WORKDIR /app

# Copy gradle configuration files
COPY build.gradle.kts settings.gradle.kts ./

# Pre-download dependencies for layer caching
RUN gradle dependencies --no-daemon --configuration runtimeClasspath 2>/dev/null; \
    gradle dependencies --no-daemon --configuration testRuntimeClasspath 2>/dev/null; \
    true

# Copy the source code
COPY src ./src

# Build the executable jar
RUN gradle bootJar -x test --no-daemon

# Stage 2: Runtime image
FROM eclipse-temurin:22-jre-jammy
WORKDIR /opt/app

# Copy the build artifact from the builder stage
# Spring Boot gradle plugin puts the jar in build/libs/
COPY --from=builder /app/build/libs/*.jar app.jar

EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
