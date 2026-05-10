EverCare – Intelligent Alzheimer’s Risk Detection & Healthcare Platform

Developed at Esprit School of Engineering as part of the PIDEV Academic Project (2025–2026).

EverCare is an intelligent distributed healthcare platform designed to support Alzheimer’s patients, elderly individuals, caregivers, and healthcare professionals through real-time monitoring, cognitive assistance, emergency management, and AI-powered risk detection.
The platform combines modern healthcare technologies, microservices architecture, intelligent monitoring systems, and cognitive stimulation modules to create a proactive and connected healthcare ecosystem focused on patient safety, autonomy, and well-being.

# 📖 Overview

Alzheimer’s disease and cognitive disorders often lead to:
- Memory loss
- Disorientation
- Medication neglect
- Dangerous wandering situations
- Reduced autonomy
- Increased caregiver stress

EverCare addresses these challenges through:
- Real-time patient monitoring
- AI-powered risk detection
- Emergency alert systems
- Cognitive stimulation activities
- Medical record management
- Healthcare communication tools
- Wellness and educational content

The platform enables healthcare professionals and caregivers to remotely supervise patients, detect abnormal situations early, and intervene rapidly when necessary.

---

# 🎯 Project Objectives

- Improve patient safety and autonomy
- Assist caregivers in monitoring vulnerable patients
- Detect risky behaviours and emergency situations
- Centralise healthcare information
- Enhance communication between patients and healthcare professionals
- Provide cognitive stimulation and mental wellness support
- Build a scalable distributed healthcare ecosystem

---

# ✨ Core Features

## 📡 Real-Time Patient Monitoring
Track patient activity, movement, location, and wellness indicators in real time through intelligent monitoring services.

## 🚨 AI-Powered Alzheimer’s Risk Detection

The platform analyses:
- Abnormal inactivity
- Wandering behaviour
- Sudden location changes
- Behavioural anomalies
- Emergency situations

Dynamic risk scores are generated automatically to detect dangerous situations early.

## 🚨 Emergency Alerts & SOS System

EverCare includes:
- Automatic alert generation
- Emergency SOS activation
- Real-time notifications
- Caregiver and doctor alerts
- Critical incident monitoring

## 🧠 Cognitive Simulation & Mental Wellness

Interactive cognitive stimulation activities help:
- Improve memory
- Enhance concentration
- Maintain cognitive engagement
- Support Alzheimer’s and dementia patients

The system includes:
- Memory games
- Logical exercises
- Mental challenges
- Personalised activity recommendations

## 📁 Medical Record Management

Secure digital medical folders allow management of:
- Allergies
- Chronic diseases
- Prescriptions
- Lab reports
- Healthcare documents
- Medical history

## 📅 Appointment Scheduling

Patients and doctors can:
- Schedule appointments
- Manage consultations
- Receive reminders
- Organise healthcare follow-ups

## 💊 Medication Adherence Tracking

The platform helps patients follow treatment plans through:
- Smart reminders
- Dosage tracking
- Prescription monitoring
- Medication adherence supervision

## 💬 Doctor–Patient Communication

EverCare facilitates:
- Secure messaging
- Real-time communication
- Medical follow-ups
- Healthcare assistance
- Notifications and recommendations

## 📰 Healthcare Blog & Educational Content

The platform integrates a healthcare blog system allowing:
- Publication of healthcare articles
- Alzheimer’s awareness content
- Wellness recommendations
- Educational medical resources
- Patient guidance and tips

---

# 👥 User Roles

## 👤 Patients

Patients benefit from a complete healthcare monitoring and assistance experience through:
- Health and wellness tracking
- Medication management
- SOS emergency system
- Cognitive exercises and simulations
- Appointment scheduling
- Daily healthcare activities
- Access to medical records
- Real-time notifications

## 👨‍⚕️ Doctors

Doctors can efficiently supervise and manage patient healthcare through:
- Patient dashboards
- Medical record access
- Prescription management
- Real-time alert monitoring
- Cognitive activity recommendations
- Appointment management
- Patient follow-up
- Emergency supervision

## 👨‍👩‍👧 Caregivers

Caregivers are able to remotely monitor patient well-being through:
- Wellness supervision
- Emergency alert reception
- Medication adherence tracking
- Activity monitoring
- Behaviour observation
- Critical situation notifications

## 🛡️ Administrators

Administrators ensure the stability and security of the platform through:
- User and role management
- System configuration
- Platform monitoring
- Infrastructure supervision
- Permission management
- Analytics and reporting
- Security management

---

# 🏗️ Microservices Architecture

EverCare follows a scalable distributed microservices architecture enabling independent development, deployment, monitoring, and scaling of services.

# ⚙️ Backend Microservices

## 👤 user-service

Responsible for:
- Authentication and authorization
- User account management
- Role and permission management
- Patient, doctor, caregiver, and administrator profiles
- Secure access control using Keycloak and JWT

## 🧩 activities-service

Handles:
- Healthcare and wellness activities
- Activity recommendations
- Patient participation tracking
- Activity filtering and management
- Wellness engagement monitoring

## 🚨 alert-service

Responsible for:
- Emergency alert generation
- Alzheimer’s risk detection alerts
- SOS incident management
- Critical event monitoring
- Real-time emergency notifications

## 📅 appointment-service

Manages:
- Appointment scheduling
- Consultation organisation
- Appointment reminders
- Doctor calendar management
- Patient healthcare follow-ups

## 🔔 notification-service

Provides:
- Real-time notifications
- WebSocket communication
- Alert broadcasting
- Instant healthcare updates
- System event notifications

## 🧠 cognitivestimulation-service

Handles:
- Cognitive stimulation exercises
- Memory games
- Mental wellness activities
- Logical thinking challenges
- Cognitive progress tracking
- Alzheimer’s cognitive support programs

## 📁 medical-folder-service

Responsible for:
- Medical records management
- Healthcare document storage
- Prescriptions and medical history
- Laboratory report management
- Patient healthcare information centralisation

## 📍 tracking-service

Handles:
- Real-time patient tracking
- Location monitoring
- Behaviour analysis
- Movement supervision
- Wandering detection
- Risk score calculation
- Geolocation-based monitoring

## 📔 dailyme-service

Responsible for:
- Daily mood tracking
- Wellness journal management
- Emotional state monitoring
- Daily patient reflections
- Behavioural routine tracking
- Personal well-being analytics

## 💬 communication-service
Provides:


Secure doctor–patient communication
Caregiver interactions
Real-time messaging
Healthcare discussions
Medical assistance communication
Notification-based conversations



## 📰 blog-service
Responsible for:


Healthcare article publication
Alzheimer’s awareness content
Wellness recommendations
Educational healthcare resources
Medical blog management
Patient guidance and support articles



## 🏛️ Infrastructure Services
API Gateway
Provides:

Centralized routing
Secure API access
Request filtering
CORS management


Eureka Discovery Server
Responsible for:
Service registration
Dynamic service discovery
Microservice communication management



Config Server
Handles:
Centralized configuration
Environment management
Distributed configuration updates



Keycloak Authentication
Provides:

Identity management
OAuth2 authentication
JWT authorization
Role-based access control



## ⚙️ Technology Stack
Backend

Java 23
Spring Boot 3
Spring Cloud
Eureka
OpenFeign
Spring Security
Hibernate / JPA
MySQL
Maven
WebSocket + STOMP

Frontend

Angular 17
TypeScript
RxJS
Tailwind CSS
Angular Material
DevOps & Infrastructure
Docker
GitHub Actions
CI/CD Pipelines
Keycloak
SonarQube



## 🔐 Security & Authentication
EverCare implements enterprise-level security mechanisms:

OAuth2 authentication
JWT authorization
Keycloak identity management
Role-based access control
Secure API Gateway routing



📊 Real-Time Notifications
The platform uses:

WebSockets
STOMP messaging
Real-time event systems
to instantly notify users about:
Emergency alerts
Appointment changes
Medication reminders
Cognitive activity updates
Doctor recommendations
Healthcare incidents



🧪 Testing & Quality Assurance
Backend Testing

JUnit 5
Integration testing
CI/CD & Quality
GitHub Actions
Automated builds
SonarQube integration
Continuous Integration pipelines



🚀 Getting Started
Prerequisites
Java 23
Node.js 20+
MySQL
Maven
Angular CLI



Clone Repository
git clone https://github.com/eyadabbaghi/Esprit-PI-4SAE2-2025-EverCare.gitcd Esprit-PI-4SAE2-2025-EverCare

Start Eureka Server
cd backend/eureka-servermvn spring-boot:run

Start API Gateway
cd backend/api-gatewaymvn spring-boot:run

Start Backend Services
Run each microservice independently:
mvn spring-boot:run
Services:

user-service
activities-service
alert-service
appointment-service
notification-service
cognitivestimulation-service
medical-folder-service
tracking-service
dailyme-service
communication-service
blog-service



Start Frontend
cd frontendnpm installng serve
Application URL:
http://localhost:4200

🔮 Future Improvements

AI-powered predictive healthcare analytics
Machine learning Alzheimer’s progression prediction
Advanced behavioural analysis
Voice assistant integration
Smart wearable integration
Real-time video consultations
Docker Compose deployment
Kubernetes orchestration
Mobile application support



## 👥 Contributors

Eya Dabbaghi
Islem Belhadj
Mariem Ben Zakour
Achref Jebabli
Badr Klila



🎓 Academic Context
Developed at Esprit School of Engineering
PIDEV – 4SAE2
Academic Year: 2025–2026

🙏 Acknowledgments
Special thanks to:
Esprit School of Engineering
Project supervisors
Open-source contributors
Spring & Angular ecosystems



❤️ EverCare

“Care, everywhere.”
