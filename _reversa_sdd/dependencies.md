
--- ./frontend/.next/types/package.json ---

{"type": "module"}
--- ./frontend/.next/package.json ---

{"type": "commonjs"}
--- ./frontend/package.json ---

{
  "name": "enterprise-rag-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "deno test -A tests/",
    "test:viewport": "playwright test"
  },
  "dependencies": {
    "@tailwindcss/cli": "^4.3.3",
    "@tailwindcss/postcss": "^4.3.3",
    "clsx": "^2.1.1",
    "framer-motion": "^12.41.0",
    "lucide-react": "^0.378.0",
    "next": "^14.2.35",
    "react": "^18",
    "react-dom": "^18",
    "react-markdown": "^10.1.0",
    "remark-gfm": "^4.0.1",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.61.1",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.5.0",
    "eslint": "^8.57.1",
    "eslint-config-next": "^14.2.35",
    "postcss": "^8.5.15",
    "tailwindcss": "^4.3.3",
    "typescript": "^5"
  },
  "overrides": {
    "eslint": "^8.57.1"
  }
}

--- ./python-services/crew-worker/requirements.txt ---

crewai>=1.0.0
pysqlite3-binary; sys_platform == "linux"
litellm
google-cloud-aiplatform>=1.60.0
pika==1.3.2
SQLAlchemy==2.0.29
psycopg2-binary==2.9.9
PyYAML==6.0.1
pydantic>=2.7.1

--- ./python-services/crew-worker/package.json ---

{
  "name": "crew-worker",
  "private": true
}

--- ./rust-services/Cargo.toml ---

[workspace]
members = [
    "shared",
    "document-processing",
    "embedding-service",
    "ingestion-worker",
    "rag-worker",
    "workflow-worker",
]
resolver = "2"

[workspace.dependencies]
reqwest = { version = "0.11", default-features = false, features = ["json", "rustls-tls"] }
serde_json = "1.0"
tokio = { version = "1.0", features = ["full"] }
gcp-auth = { package = "gcp_auth", version = "0.12" } # Gerencia a geração de tokens OAuth automaticamente

--- ./rust-services/rag-worker/Cargo.toml ---

[package]
name = "rag-worker"
version = "0.1.0"
edition = "2021"
publish = false

[dependencies]
shared = { path = "../shared" }
tokio = { version = "1", features = ["full"] }
lapin = "2.5"
sqlx = { version = "0.8.1", features = ["runtime-tokio-rustls", "postgres", "uuid", "chrono", "json"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
uuid = { version = "1.6", features = ["serde", "v4"] }
chrono = { version = "0.4", features = ["serde"] }
reqwest = { version = "0.11", default-features = false, features = ["json", "multipart", "rustls-tls"] }
anyhow = "1.0"
futures-lite = "1.13"
axum = "0.7"
regex = "1.10"

[dev-dependencies]
wiremock = "0.6"

--- ./rust-services/ingestion-worker/Cargo.toml ---

[package]
name = "ingestion-worker"
version = "0.1.0"
edition = "2021"
publish = false

[dependencies]
shared = { path = "../shared" }
tokio = { version = "1", features = ["full"] }
lapin = "2.5"
sqlx = { version = "0.8.1", features = ["runtime-tokio-rustls", "postgres", "uuid", "chrono"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
uuid = { version = "1.6", features = ["serde", "v4"] }
chrono = { version = "0.4", features = ["serde"] }
reqwest = { version = "0.11", default-features = false, features = ["json", "multipart", "rustls-tls"] }
futures-lite = "1.13"
lopdf = "0.42"
docx-rs = "0.4"
anyhow = "1.0"
# Download autenticado do MinIO via API S3 (issue #183). O bucket é privado, então
# um GET anônimo retorna 403 — estas crates assinam a requisição com SigV4.
aws-sdk-s3 = { version = "1", default-features = false, features = ["rt-tokio", "rustls"] }
aws-credential-types = "1"
aws-config = { version = "1", default-features = false, features = ["rt-tokio", "rustls"] }

--- ./rust-services/workflow-worker/Cargo.toml ---

[package]
name = "workflow-worker"
version = "0.1.0"
edition = "2021"
publish = false

[dependencies]
shared = { path = "../shared" }
tokio = { version = "1", features = ["full"] }
lapin = "2.5"
sqlx = { version = "0.8.1", features = ["runtime-tokio-rustls", "postgres", "uuid", "chrono", "macros"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
uuid = { version = "1.6", features = ["serde", "v4"] }
chrono = { version = "0.4", features = ["serde"] }
futures-lite = "1.13"
anyhow = "1.0"
axum = "0.7"
gcp-auth = { workspace = true }
--- ./rust-services/shared/Cargo.toml ---

[package]
name = "shared"
version = "0.1.0"
edition = "2021"
publish = false

[dependencies]
serde = { version = "1.0", features = ["derive"] }
gcp-auth = { workspace = true }

[dev-dependencies]
tokio = { workspace = true, features = ["macros", "rt-multi-thread"] }


--- ./rust-services/document-processing/Cargo.toml ---

[package]
name = "document-processing"
version = "0.1.0"
edition = "2021"
publish = false

[dependencies]
shared = { path = "../shared" }
tokio = { workspace = true, features = ["full"] }
axum = { version = "0.7", features = ["multipart"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = { workspace = true }
lopdf = "0.42"
anyhow = "1.0"
uuid = { version = "1.6", features = ["v4", "serde"] }
gcp-auth = { workspace = true }

[dev-dependencies]
tower = { version = "0.5", features = ["util"] }
http-body-util = "0.1"
mime = "0.3"


--- ./rust-services/package.json ---

{
  "name": "rust-services",
  "private": true
}

--- ./rust-services/embedding-service/Cargo.toml ---

[package]
name = "embedding-service"
version = "0.1.0"
edition = "2021"
publish = false

[dependencies]
shared = { path = "../shared" }
tokio = { workspace = true, features = ["full"] }
axum = "0.7"
serde = { version = "1.0", features = ["derive"] }
serde_json = { workspace = true }
reqwest = { workspace = true, features = ["json", "rustls-tls"] }
gcp-auth = { workspace = true }

[dev-dependencies]
tower = { version = "0.5", features = ["util"] }
http-body-util = "0.1"
wiremock = "0.6"

--- ./.opencode/package.json ---

{
  "dependencies": {
    "@opencode-ai/plugin": "1.18.4"
  }
}

--- ./package.json ---

{
  "name": "alfabra-vector-root",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "packageManager": "npm@11.13.0",
  "workspaces": [
    "frontend",
    "rust-services",
    "java-core",
    "python-services/crew-worker"
  ],
  "scripts": {
    "test:e2e": "deno test -A --node-modules-dir=none tests/e2e/",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "eslint": "^9.00.0",
    "eslint-config-next": "^16.2.9",
    "typescript": "^5.9.3",
    "turbo": "^2.10.8"
  },
  "dependencies": {
    "reversa": "^1.2.43"
  }
}

--- ./java-core/package.json ---

{
  "name": "java-core",
  "private": true
}

--- ./java-core/build.gradle.kts ---

plugins {
    java
    id("org.springframework.boot") version "4.1.0"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.company"
version = "0.0.1-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_21
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-amqp")
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("io.minio:minio:9.0.3")
    implementation("org.apache.tika:tika-core:3.3.2")
    runtimeOnly("org.postgresql:postgresql")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation(platform("org.testcontainers:testcontainers-bom:2.0.5"))
    testImplementation("org.testcontainers:testcontainers-postgresql")
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("io.cucumber:cucumber-java:7.34.6")
    testImplementation("io.cucumber:cucumber-spring:7.34.6")
    testImplementation("io.cucumber:cucumber-junit-platform-engine:7.34.6")
    testImplementation("org.junit.platform:junit-platform-suite:6.1.3")
}

tasks.named<Test>("test") {
    useJUnitPlatform {
        excludeTags("integration")
    }
    // Cucumber engine auto-descobre cenários independentemente do @Suite;
    // sem essa propriedade ele rodaria todos os cenários (que precisam de infra).
    // @__unit__ não existe nos feature files → 0 cenários selecionados.
    systemProperty("cucumber.filter.tags", "@__unit__")
}

tasks.register<Test>("integrationTest") {
    testClassesDirs = sourceSets["test"].output.classesDirs
    classpath = sourceSets["test"].runtimeClasspath
    description = "Executa cenários BDD Cucumber com Testcontainers (pgvector/pgvector:pg16)"
    group = "verification"
    useJUnitPlatform()
    filter {
        includeTestsMatching("com.company.core.CucumberTestSuite")
    }
    // Filtra cenários Cucumber: apenas @integration, excluindo @pending
    systemProperty("cucumber.filter.tags", "@integration and not @pending")
    shouldRunAfter("test")
}
