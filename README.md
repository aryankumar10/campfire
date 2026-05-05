# Campfire - Secure Collaboration Platform

Campfire is a secure, role-based project management system built with Java (Spring Boot) and React (TypeScript) specifically for student group projects.

## Features
- **Global Chat Rooms:** Secure, real-time messaging using STOMP WebSockets.
- **Projects & Admin Panel:** Create projects, add/kick users via search, and manage roles (`Leader`, `Manager`, `Member`).
- **Hierarchical Todo Lists:** Assign tasks based on role hierarchy.
- **End-to-End Encryption:** Messages are server-side AES-256-CBC encrypted in the MongoDB database.
- **Sidebar Chat Popup:** Quick navigation for your joined rooms when the sidebar is minimized.
- **JWT Authentication:** Secure API access via bearer tokens.

---

## Tech Stack
- **Backend:** Java 11, Spring Boot 2.7.x, Spring Security, Spring WebSockets (STOMP), MongoDB (Spring Data).
- **Frontend:** React, TypeScript, Tailwind CSS, Framer Motion, @stomp/stompjs.

---

## Installation & Setup

### Prerequisites
- **Java 11** or newer.
- **Node.js 16+** and **npm**.
- **MongoDB** account/URI.

### 1. Backend (Spring Boot) Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend-java
   ```
2. Configure your Environment Variables:
   Set the following variables in your terminal, or rely on the defaults configured in `application.properties`:
   - `MONGO_URI`: Your MongoDB connection string.
   - `ENCRYPTION_KEY`: A 64-character hex string (32 bytes) used for message encryption.
   - `JWT_SECRET`: A string used for signing JWTs.
3. Build and Run:
   ```bash
   ./mvnw clean compile
   ./mvnw spring-boot:run
   ```
   The backend API and WebSocket broker will start on `http://localhost:5001`.

### 2. Frontend (React/TypeScript) Setup
1. Open a second terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Start the Vite/CRA development server:
   ```bash
   npm start
   ```
   The application will run on `http://localhost:3000`.

---

## Running Tests

### Backend Unit Tests
Run the JUnit and Mockito test suite for the Spring Boot application using Maven:
```bash
cd backend-java
./mvnw test
```

### Frontend Unit Tests
Run the Jest and React Testing Library tests for the React application:
```bash
cd frontend
npm test
```
