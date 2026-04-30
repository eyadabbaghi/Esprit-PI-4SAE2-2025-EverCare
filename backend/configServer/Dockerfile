FROM eclipse-temurin:17-jre-alpine

LABEL maintainer="EverCare Team"

USER 1000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

EXPOSE 8080

ADD target/configServer.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]