FROM eclipse-temurin:17-jdk-alpine AS build

WORKDIR /app

COPY mvnw ./
COPY mvnw.cmd ./
COPY pom.xml ./
COPY src ./src

RUN apk add --no-cache maven && \
    chmod +x mvnw && \
    ./mvnw clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8082

ENTRYPOINT ["java", "-jar", "app.jar"]