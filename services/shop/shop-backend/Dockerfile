# Build stage
FROM amazoncorretto:21-alpine AS builder
WORKDIR /app

COPY gradlew .
COPY gradle gradle
COPY gradle.properties .
RUN printf 'dependencyResolutionManagement {\n    @Suppress("UnstableApiUsage")\n    repositories { mavenCentral() }\n}\nrootProject.name = "miravelo"\ninclude("services:shop:shop-backend")\n' > settings.gradle.kts

COPY services/shop/shop-backend/build.gradle.kts services/shop/shop-backend/

RUN ./gradlew :services:shop:shop-backend:dependencies --no-daemon -q 2>/dev/null || true

COPY services/shop/shop-backend/src services/shop/shop-backend/src

RUN ./gradlew :services:shop:shop-backend:bootJar --no-daemon -x test

# Runtime stage
FROM amazoncorretto:21-alpine
WORKDIR /app

COPY --from=builder /app/services/shop/shop-backend/build/libs/*.jar app.jar

EXPOSE 8080
USER 1000:1000

ENTRYPOINT ["java","-jar","/app/app.jar"]