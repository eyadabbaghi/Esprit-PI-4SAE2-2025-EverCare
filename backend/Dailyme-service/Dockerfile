FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
LABEL maintainer="EverCare Team"
USER 1000
WORKDIR /app
COPY --from=build /app/target/Dailyme-service-0.0.1-SNAPSHOT.jar app.jar
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8098/actuator/health || exit 1
EXPOSE 8098
ENTRYPOINT ["java", "-jar", "app.jar"]