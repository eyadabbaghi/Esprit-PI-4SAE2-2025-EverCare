

EverCare – Integrated Healthcare Platform
EverCare is a comprehensive healthcare platform that connects patients, doctors, and caregivers through a unified digital ecosystem. It enables remote monitoring, communication, medical data management, and proactive alerts to improve patient well-being and streamline clinical workflows.

✨ Key Features
For Patients
	• Daily Me Tracking
Log daily mood and receive location-based context (e.g., “You are at home”). Helps caregivers and doctors understand the patient’s routine and emotional state.
	• Medical Folder
Store and manage personal medical information (allergies, chronic conditions, blood type) and upload important documents (prescriptions, lab results). Doctors have read-only access for better-informed care.
	• Appointments
Schedule, reschedule, and cancel appointments with your primary doctor directly through the app. Receive reminders and confirmations.
	• Medication Management
View prescribed medications, dosages, and schedules. Mark doses as taken, and get reminders.
	• Alerts & SOS
Automatic alerts are triggered when predefined thresholds are exceeded (e.g., prolonged inactivity, abnormal vitals). A manual SOS button sends an emergency notification to all connected caregivers and emergency contacts.
	• Activities
Access a library of personalised activities recommended by your doctor. Filter by type, difficulty, and track completion. Activities include detailed instructions, benefits, and precautions.
	• Real-time Notifications
Receive instant updates when an activity is created, updated, or recommended by your doctor (WebSocket).

For Doctors
	• Patient Dashboard
View a list of your assigned patients with key metrics (last activity, mood, upcoming appointments, alerts).
	• Medical Folder Access
Securely view patient medical information and uploaded documents.
	• Prescribe Medications
Create and manage medication plans for each patient (drug name, dosage, frequency, duration).
	• Activity Recommendations
Browse the activity library and recommend specific activities to individual patients. Recommendations appear instantly in the patient’s feed.
	• Appointment Management
Accept, reschedule, or cancel appointment requests. View your daily schedule.
	• Alerts Overview
Monitor all alerts from your patients and acknowledge or resolve them. Critical alerts are highlighted.
	• Communication
Built-in text messaging and video call integration (planned) to discuss care plans in real time.

For Caregivers
	• Patient Monitoring
View the well-being status, mood trends, and recent activities of the patients you are connected to.
	• Alert Notifications
Receive alerts when a patient triggers an SOS or a system-generated incident.
	• Medication Adherence
Track whether patients have taken their prescribed medications.

🏗️ Architecture
EverCare follows a microservices architecture, enabling independent development, deployment, and scaling.
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Angular SPA   │ ─── │   API Gateway   │ ─── │   Eureka Server │
│ (localhost:4200)│      │ (localhost:8089)│      │ (localhost:8761)│
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│  User Service │          │Activity Service│          │  Alert Service │
│  (port 8096)  │          │  (port 8092)  │          │  (port 8093)  │
└───────────────┘          └───────────────┘          └───────────────┘
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│Notification   │          │Appointment    │          │ Medical Folder│
│Service (8095) │          │Service (8094) │          │ Service       │
└───────────────┘          └───────────────┘          └───────────────┘
	• API Gateway (Spring Cloud Gateway) – routes requests, handles CORS, and provides a single entry point.
	• Eureka Discovery – all services register themselves for dynamic discovery.
	• Each service has its own database (MySQL) and can be developed independently.
	• Frontend – Angular 17+ application with role-based views.

🛠️ Technology Stack
Backend
	• Java 23 + Spring Boot 3.2
	• Spring Cloud (Gateway, Netflix Eureka, OpenFeign)
	• Spring Security + Keycloak for authentication / OAuth2 resource server
	• Spring Data JPA + Hibernate
	• MySQL (per-service database)
	• WebSocket + STOMP for real-time notifications
	• Feign Clients for inter-service communication
	• Maven – build tool
Frontend
	• Angular 17 (standalone components, new control flow)
	• Angular Material (planned)
	• RxJS – reactive programming
	• NgRx (optional, for state management)
	• Tailwind CSS – utility-first styling
	• TypeScript
Infrastructure
	• Docker (containerisation planned)
	• Keycloak – identity and access management
	• GitHub Actions – CI/CD pipeline

🚀 Getting Started
Prerequisites
	• Java 23
	• Node.js 20+ and npm
	• MySQL (local or Docker)
	• Keycloak (optional for development – can be disabled)
	• Eureka Server (start first)

1️⃣ Clone the repository
git clone https://github.com/eyadabbaghi/Esprit-PI-4SAE2-2025-EverCare.git
cd Esprit-PI-4SAE2-2025-EverCare
2️⃣ Start Eureka Server
cd backend/eureka-server
mvn spring-boot:run
3️⃣ Start the Gateway
cd ../api-gateway
mvn spring-boot:run
4️⃣ Start the microservices
In separate terminals:
cd ../user-service
mvn spring-boot:run
Repeat for:
	• activities-service
	• alert-service
	• appointment-service
	• notification-service
	• medical-folder-service

5️⃣ Start the frontend
cd frontend
npm install
ng serve
Open:
http://localhost:4200

📚 API Documentation
API endpoints are documented via Swagger/OpenAPI.
Examples:
	• http://localhost:8092/swagger-ui.html (activities-service)
	• http://localhost:8096/swagger-ui.html (user-service)
The gateway does not expose Swagger UI directly; use service-specific ports during development.

🧪 Testing
	• Backend unit tests – JUnit 5, Mockito (mvn test)
	• Integration tests – @SpringBootTest
	• Frontend unit tests – Jasmine / Karma (ng test)
	• E2E tests – Cypress (planned)

🔮 Future Improvements
	• Implement AI-powered insights for mood trends and alert predictions
	• Expand role-based dashboards for administrators
	• Full Docker Compose setup for one-click deployment

👥 Contributors
	Islem Belhadj
	Eya Dabbaghi
	Badr klila
	Mariem ben zakour
	Achref Jebabli.

EverCare – care, everywhere.
