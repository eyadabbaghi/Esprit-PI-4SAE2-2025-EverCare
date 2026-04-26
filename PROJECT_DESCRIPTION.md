# EverCare Project - Comprehensive Description

## Project Overview

**EverCare** is a comprehensive, full-stack healthcare management platform developed by **Brainiacs** organization. It is designed to facilitate seamless communication, appointment scheduling, medical record management, and health tracking for patients, doctors, and caregivers. The project follows a **microservices architecture** with a modern, scalable tech stack suitable for enterprise-level healthcare applications.

---

## Project Structure

The project is organized into two main components:

### 1. **Backend** - Microservices Architecture (Java/Spring Boot)
### 2. **Frontend** - Single Page Application (Angular 18)

---

## Backend Architecture

### Technology Stack
- **Language:** Java 17
- **Framework:** Spring Boot 3.2.2
- **Build Tool:** Maven
- **Cloud Framework:** Spring Cloud 2023.0.0
- **Database:** MySQL
- **Architecture Pattern:** Microservices with API Gateway & Service Discovery (Eureka)
- **Communication:** REST APIs, WebSocket, OpenFeign (Service-to-Service Communication)
- **Project Management:** Lombok (reducing boilerplate code)

### Core Services

#### 1. **ApiGateway Service**
- **Purpose:** Central entry point for all client requests
- **Responsibility:** Request routing, load balancing, authentication, and rate limiting
- **Status:** Built and deployed (JAR available in target directory)

#### 2. **Eureka Service** (Service Discovery)
- **Purpose:** Service registry and discovery
- **Responsibility:** Maintains a registry of all microservices, enabling dynamic service discovery
- **Role:** Critical for microservices coordination and fault tolerance

#### 3. **User Service** (Authentication & User Management)
- **Purpose:** User authentication, registration, and profile management
- **Features:**
  - User registration and login
  - Profile management with photo uploads
  - User role management (Patient, Doctor, Caregiver, Admin)
  - User data storage in MySQL

#### 4. **Appointment Service**
- **Purpose:** Comprehensive appointment management system
- **Features:**
  - Create, read, update, and delete appointments
  - Schedule appointments between patients and doctors
  - Confirmation workflow (by patient and/or caregiver)
  - Reschedule and cancel appointments
  - Doctor availability checking
  - Recurring appointments support
  - Doctor notes and appointment summaries
  - Video call link integration
  - Date range filtering and status tracking
  - Caregiver presence tracking

#### 5. **Medical Record Service**
- **Purpose:** Centralized medical records management
- **Features:**
  - Create and manage medical records for patients
  - Medical history tracking
  - Medical document management (uploads, storage, retrieval)
  - Patient history aggregation
  - Medical document archival

#### 6. **Notification Service**
- **Purpose:** Multi-channel notification delivery
- **Features:**
  - Email notifications
  - SMS notifications
  - In-app notifications
  - Event-driven notification triggers

#### 7. **Communication Service**
- **Purpose:** Patient-Doctor-Caregiver communication
- **Features:**
  - Messaging system
  - Real-time communication (WebSocket support)
  - Secure message storage

#### 8. **Activities Service**
- **Purpose:** Track and log user activities
- **Features:**
  - Activity logging
  - Audit trails
  - User action tracking

#### 9. **Alerts Service**
- **Purpose:** Health and appointment alert management
- **Features:**
  - Create and manage alerts
  - Alert notifications to relevant users
  - Alert history tracking

#### 10. **Dailyme Service** (Daily Health Tracking)
- **Purpose:** Daily health metrics and wellness tracking
- **Features:**
  - Daily health check-ins
  - Wellness metrics recording
  - Daily activity logging
  - Trend analysis support

#### 11. **Tracking Service**
- **Purpose:** Health and appointment tracking
- **Features:**
  - Track patient health metrics
  - Monitor appointment attendance
  - Health data visualization support

#### 12. **Blog Service** (Healthcare Blog/Articles)
- **Purpose:** Educational content management
- **Features:**
  - Blog post creation and publishing
  - Health tips and articles
  - Content management

### Database
- **Type:** MySQL Relational Database
- **Purpose:** Persistent data storage for all microservices
- **Features:** User data, appointment records, medical records, alerts, activities, etc.

### API Communication
- **Service-to-Service:** OpenFeign (declarative HTTP clients)
- **Real-time Communication:** WebSocket for live updates
- **REST APIs:** Standard HTTP REST endpoints for client-server communication

---

## Frontend Architecture

### Technology Stack
- **Framework:** Angular 18.2.x
- **Language:** TypeScript
- **Styling:** CSS, Tailwind CSS
- **Build Tool:** Angular CLI 18.2.21
- **HTTP Client:** Angular HttpClient
- **Routing:** Angular Router
- **State Management:** RxJS Observables
- **UI Components:** Angular Material 18.2.14
- **CSS Framework:** Tailwind CSS with PostCSS
- **Real-time Communication:** STOMP (Simple Text Oriented Messaging Protocol) with SockJS
- **Charts & Analytics:** Chart.js 4.5.1
- **Image Processing:** Face-API.js (face recognition), ngx-image-cropper (image cropping)
- **Notifications:** ngx-toastr (toast notifications)
- **Server-Side Rendering:** Angular SSR support
- **Icons:** Lucide Angular

### Project Structure

#### Core Modules
- **app-routing.module.ts** - Main routing configuration
- **app.module.ts** - Root application module
- **app.module.server.ts** - Server-side rendering module
- **app.component.ts** - Root component

#### Feature Modules
1. **Appointments Module** (`/features/appointments/`)
   - Components for appointment scheduling
   - Appointment list view
   - Appointment details and management
   - Status tracking (SCHEDULED, CONFIRMED, CANCELLED, RESCHEDULED)
   - Doctor availability integration
   - Video call functionality
   - Appointment confirmation workflow

2. **Back-Office Module** (`/features/back-office/`)
   - Administrator dashboard
   - System management features
   - User management
   - Analytics and reporting

3. **Front-Office Module** (`/features/front-office/`)
   - Patient-facing interface
   - Appointment booking
   - Medical record access
   - Health tracking dashboard

4. **Communication Module** (`/features/communication/`)
   - Real-time messaging
   - WebSocket integration for live updates
   - Chat interface
   - Message history

5. **Daily-Me Module** (`/features/daily-me/`)
   - Daily health tracking dashboard
   - Wellness metrics input
   - Health check-ins
   - Daily reminders

6. **Journal Module** (`/features/journal/`)
   - Health journal entries
   - Personal health notes
   - Entry management

7. **Medical Folder Module** (`/features/medical-folder/`)
   - Medical records browsing
   - Document viewing
   - Medical history review
   - Document upload and download

8. **Tracking Module** (`/features/tracking/`)
   - Health metrics tracking
   - Appointment tracking
   - Activity history
   - Analytics and charts

9. **Alerts Module** (`/add-alert-dialog/`)
   - Alert creation interface
   - Alert management
   - Alert notifications

10. **Incident Management** (`/add-incident-dialog/`)
    - Incident reporting
    - Incident tracking

#### Core Services (`/services/`)
- **HTTP Services** - REST API communication
- **Appointment Service** - Appointment management
- **User Service** - User authentication and profile
- **Medical Record Service** - Medical records operations
- **Notification Service** - In-app notifications
- **WebSocket Service** - Real-time communication
- **Authentication Service** - Token management and auth logic

#### Shared Components (`/shared/`)
- Reusable UI components
- Common dialogs
- Shared utilities

#### Models (`/models/`)
- TypeScript interfaces and classes
- Data models for Appointments, Users, Medical Records, etc.

#### Layouts (`/layouts/`)
- Main layout container
- Navigation layout
- Dashboard layout

---

## Key Features of EverCare

### 1. **Appointment Management**
   - Schedule appointments with doctors
   - Multi-role confirmation (patient, caregiver, doctor)
   - Recurring appointment support
   - Doctor availability checking
   - Reschedule and cancel functionality
   - Video consultation links
   - Doctor notes and summaries

### 2. **Medical Records Management**
   - Comprehensive patient medical records
   - Medical history tracking
   - Document management and archival
   - Secure document storage
   - Access control and permissions

### 3. **Real-Time Communication**
   - WebSocket-based messaging
   - Patient-Doctor-Caregiver communication
   - Real-time notifications
   - Message history

### 4. **Health Tracking**
   - Daily health metrics logging
   - Wellness tracking
   - Activity monitoring
   - Health data visualization
   - Trend analysis

### 5. **Alert System**
   - Custom health alerts
   - Appointment reminders
   - Critical event notifications
   - Multi-channel delivery (in-app, email, SMS)

### 6. **User Roles & Permissions**
   - **Patient:** Schedule appointments, view medical records, track health
   - **Doctor:** Manage appointments, update medical records, add notes
   - **Caregiver:** Support patient care, confirm appointments, monitor health
   - **Admin:** System administration, user management, content moderation

### 7. **Face Recognition & Image Processing**
   - Profile picture uploads and cropping
   - Face recognition capabilities
   - Patient identification features

### 8. **Educational Content**
   - Healthcare blog and articles
   - Health tips and resources
   - Patient education materials

---

## Technology Integration Points

### Frontend-Backend Communication
- **HTTP REST APIs** for standard CRUD operations
- **WebSocket** for real-time features (messaging, notifications, live updates)
- **OpenFeign** for inter-service communication on backend
- **Token-based Authentication** (likely JWT)

### Data Flow
1. User interacts with Angular frontend
2. Frontend sends requests to API Gateway
3. API Gateway routes requests to appropriate microservices
4. Services communicate with each other via OpenFeign
5. Services persist data to MySQL database
6. WebSocket connections handle real-time updates
7. Services send notifications via Notification Service

---

## Build & Deployment

### Backend
- **Build Tool:** Maven
- **Build Command:** `mvn clean install` (from backend directory)
- **Deployment:** Docker containers (Jenkinsfile for CI/CD)
- **Artifact:** Each service produces a JAR file

### Frontend
- **Build Tool:** Angular CLI
- **Development:** `npm start` or `ng serve`
- **Production Build:** `ng build`
- **SSR Support:** Server-side rendering with Express.js
- **Deployment:** Docker containers (Jenkinsfile for CI/CD)

### CI/CD Pipeline
- **Tool:** Jenkins
- **Jenkinsfile:** Available for both backend and frontend
- **Automated:** Build, test, and deployment processes

---

## Data Storage

### File Uploads
- **Profile Pictures:** `/backend/User/uploads/profile-pictures/`
- **Activities Files:** `/backend/uploads/activities/`
- **Journal Entries:** `/backend/uploads/journal/`
- **Medical Documents:** Stored in medical-record-service
- **UUID-based Storage:** Unique identifiers prevent filename conflicts

---

## Project Dependencies

### Key Backend Dependencies
- Spring Boot Web, Data JPA, Security
- Spring Cloud (Service Discovery, API Gateway, OpenFeign)
- MySQL Connector
- Lombok (code generation)
- WebSocket support

### Key Frontend Dependencies
- Angular Core & Modules
- Angular Material (UI components)
- RxJS (reactive programming)
- Chart.js (data visualization)
- STOMP/SockJS (WebSocket)
- Tailwind CSS (styling)
- TypeScript (type safety)

---

## Development Team & Organization

- **Organization:** Brainiacs
- **Group ID:** com.Brainiacs
- **Architecture:** Microservices
- **Project Version:** 1.0.0-SNAPSHOT

---

## Current Status

- **Backend:** Multiple services implemented and deployed
- **Frontend:** Angular 18 application with comprehensive features
- **Database:** MySQL with multiple services integration
- **CI/CD:** Jenkins pipelines configured
- **Development:** Active development with modern technologies

---

## Scalability & Architecture Considerations

1. **Microservices Decoupling:** Each service can be scaled independently
2. **Service Discovery:** Eureka enables dynamic service registration and discovery
3. **API Gateway:** Single entry point for simplified client integration
4. **Database:** MySQL for relational data with potential for database-per-service pattern
5. **Real-time Communication:** WebSocket support for scalable messaging
6. **Deployment:** Docker containerization for consistent deployment across environments

---

## Security Features

- **Authentication & Authorization:** User authentication service with role-based access
- **API Gateway:** Centralized security policies
- **Secure Communication:** HTTPS (in production)
- **Token-based Authentication:** Secure session management
- **Access Control:** Role-based permissions (Patient, Doctor, Caregiver, Admin)

---

## Future Enhancement Possibilities

1. **Telemedicine Integration:** Video consultation features with Call.js or Twilio
2. **AI/ML Integration:** Health predictions, symptom analysis, doctor recommendations
3. **Mobile Applications:** Native iOS/Android apps using React Native or Flutter
4. **Analytics Dashboard:** Advanced analytics and reporting
5. **Integration with External Systems:** EHR/EMR systems, health devices, wearables
6. **Blockchain:** For medical record immutability and sharing
7. **Multi-language Support:** Internationalization (i18n)
8. **Payment Gateway Integration:** Online appointment payment processing

---

## Summary

**EverCare** is a comprehensive, enterprise-ready healthcare management platform built with modern technologies. It demonstrates best practices in microservices architecture, RESTful API design, real-time communication, and responsive web development. The platform serves as a complete healthcare ecosystem connecting patients, doctors, and caregivers through intuitive interfaces and robust backend services, suitable for hospitals, clinics, telemedicine providers, and healthcare organizations.

