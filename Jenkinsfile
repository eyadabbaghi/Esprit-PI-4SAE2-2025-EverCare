pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'badrftw/evercare-appointment'
        DOCKER_TAG = 'latest'
        APP_DIR = 'backend/appointment-service'
        BRANCH_NAME = 'Badr-branch'
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code from GitHub...'
                git branch: env.BRANCH_NAME,
                    url: 'https://github.com/eyadabbaghi/Esprit-PI-4SAE2-2025-EverCare.git',
                    credentialsId: 'github-evercare'
            }
        }

        stage('Build') {
            steps {
                echo 'Building appointment-service with Maven...'
                dir(env.APP_DIR) {
                    sh 'mvn clean compile -DskipTests'
                }
            }
        }

        stage('Test') {
            steps {
                echo 'Running unit tests...'
                dir(env.APP_DIR) {
                    sh 'mvn test'
                }
            }
        }

        stage('Package') {
            steps {
                echo 'Packaging application as JAR...'
                dir(env.APP_DIR) {
                    sh 'mvn package -DskipTests'
                }
            }
        }

        stage('Docker Build') {
            steps {
                echo 'Building Docker image using existing Dockerfile...'
                dir(env.APP_DIR) {
                    script {
                        sh 'docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} -f Dockerfile .'
                    }
                }
            }
        }

        stage('Docker Push') {
            steps {
                echo 'Pushing Docker image to Docker Hub...'
                script {
                    docker.withRegistry('', 'dockerhub-evercare') {
                        docker.image("${DOCKER_IMAGE}:${DOCKER_TAG}").push()
                    }
                }
            }
        }
    }

    post {
        success {
            echo '✅ Appointment Service build success! Image pushed to Docker Hub.'
        }
        failure {
            echo '❌ Appointment Service build failed! Check logs for details.'
        }
    }
}