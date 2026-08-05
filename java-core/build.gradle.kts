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
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    implementation("org.springframework.boot:spring-boot-starter-amqp")
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("io.minio:minio:9.0.3")
    runtimeOnly("org.postgresql:postgresql")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation(platform("org.testcontainers:testcontainers-bom:1.20.4"))
    testImplementation("org.testcontainers:postgresql")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("io.cucumber:cucumber-java:7.34.6")
    testImplementation("io.cucumber:cucumber-spring:7.34.6")
    testImplementation("io.cucumber:cucumber-junit-platform-engine:7.34.6")
    testImplementation("org.junit.platform:junit-platform-suite:6.1.2")
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
