FROM eclipse-temurin:17-jre-alpine

LABEL maintainer="EverCare Team"

USER 1000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8096/actuator/health || exit 1

EXPOSE 8096

ADD target/User-0.0.1-SNAPSHOT.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]