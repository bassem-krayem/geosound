# GeoSound

A geography teaching platform for blind people using audio-based lessons. Built with Node.js, Express, Mongoose, and MongoDB.

## Features

- **Two roles:** Teacher and Student
- **Course structure:** Courses → Modules → Lessons (with audio) → Quiz (5 questions)
- **Lesson unlocking:** Students must score ≥ 70% on a lesson's quiz to unlock the next lesson
- **Audio upload:** Teachers upload MP3/WAV/OGG/AAC audio files for each lesson
- **JWT authentication**

## Getting Started

### Prerequisites

- Node.js ≥ 18
- MongoDB (local or Atlas)

### Installation

```bash
npm install
cp .env.example .env   # fill in your values
npm start
```

For development with auto-reload:

```bash
npm run dev
```

### Running Tests

```bash
npm test
```

---

## Environment Variables

| Variable        | Description                         | Default   |
|-----------------|-------------------------------------|-----------|
| `PORT`          | HTTP port                           | `3000`    |
| `MONGO_URI`     | MongoDB connection string           | —         |
| `JWT_SECRET`    | Secret key for signing JWTs         | —         |
| `JWT_EXPIRES_IN`| JWT expiry (e.g. `7d`)              | `7d`      |

---

## API Reference

All routes (except `/api/auth/register` and `/api/auth/login`) require a `Bearer` token in the `Authorization` header.

### Authentication

| Method | Endpoint              | Role  | Description              |
|--------|-----------------------|-------|--------------------------|
| POST   | `/api/auth/register`  | Any   | Register teacher/student |
| POST   | `/api/auth/login`     | Any   | Login and get JWT        |
| GET    | `/api/auth/me`        | Any   | Get current user info    |

#### Register / Login body

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "secret123",
  "role": "teacher"
}
```

---

### Courses

| Method | Endpoint           | Role    | Description          |
|--------|--------------------|---------|----------------------|
| GET    | `/api/courses`     | Any     | List all courses     |
| POST   | `/api/courses`     | Teacher | Create a course      |
| GET    | `/api/courses/:id` | Any     | Get course details   |
| PATCH  | `/api/courses/:id` | Teacher | Update a course      |
| DELETE | `/api/courses/:id` | Teacher | Delete a course      |

---

### Modules

Base path: `/api/courses/:courseId/modules`

| Method | Endpoint  | Role    | Description         |
|--------|-----------|---------|---------------------|
| GET    | `/`       | Any     | List modules        |
| POST   | `/`       | Teacher | Create a module     |
| GET    | `/:id`    | Any     | Get module details  |
| PATCH  | `/:id`    | Teacher | Update a module     |
| DELETE | `/:id`    | Teacher | Delete a module     |

---

### Lessons

Base path: `/api/courses/:courseId/modules/:moduleId/lessons`

Audio is uploaded as `multipart/form-data` with field name `audio`.

| Method | Endpoint  | Role    | Description                 |
|--------|-----------|---------|-----------------------------|
| GET    | `/`       | Any     | List lessons                |
| POST   | `/`       | Teacher | Create lesson + upload audio|
| GET    | `/:id`    | Any     | Get lesson + quiz (no answers)|
| PATCH  | `/:id`    | Teacher | Update lesson / replace audio|
| DELETE | `/:id`    | Teacher | Delete lesson + audio file  |

---

### Quiz

Base path: `/api/courses/:courseId/modules/:moduleId/lessons/:lessonId/quiz`

Each quiz has **exactly 5 questions**, each with **4 options** and a `correctOption` index (0–3).

| Method | Endpoint   | Role    | Description                       |
|--------|------------|---------|-----------------------------------|
| GET    | `/`        | Any     | Get quiz (answers hidden)         |
| POST   | `/`        | Teacher | Create quiz for a lesson          |
| PUT    | `/`        | Teacher | Replace quiz questions            |
| POST   | `/submit`  | Student | Submit answers and get score      |

#### Create/Update quiz body

```json
{
  "questions": [
    {
      "text": "Which is the largest ocean?",
      "options": ["Atlantic", "Pacific", "Indian", "Arctic"],
      "correctOption": 1
    }
  ]
}
```

#### Submit quiz body

```json
{
  "answers": [1, 2, 0, 3, 1]
}
```

#### Submit quiz response

```json
{
  "status": "success",
  "data": {
    "correct": 4,
    "total": 5,
    "scorePercent": 80,
    "passed": true,
    "message": "Congratulations! You passed. The next lesson is now unlocked."
  }
}
```

---

### Student Progress

| Method | Endpoint                              | Role    | Description                             |
|--------|---------------------------------------|---------|-----------------------------------------|
| GET    | `/api/progress/my-enrollments`        | Student | List all enrolled courses               |
| POST   | `/api/progress/courses/:courseId/enroll` | Student | Enroll in a course                  |
| GET    | `/api/progress/courses/:courseId`     | Student | Get progress in a course                |
| GET    | `/api/progress/lessons/:lessonId/access` | Student | Check if a lesson is unlocked       |

---

## Project Structure

```
geosound/
├── server.js               # Entry point
├── app.js                  # Express app setup
├── uploads/
│   └── audio/              # Uploaded audio files
├── src/
│   ├── config/
│   │   └── db.js           # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js         # JWT protect & restrictTo
│   │   └── upload.js       # Multer audio upload
│   ├── models/
│   │   ├── User.js         # teacher / student
│   │   ├── Course.js
│   │   ├── Module.js
│   │   ├── Lesson.js
│   │   ├── Quiz.js         # 5-question quiz per lesson
│   │   └── Progress.js     # per-student lesson progress
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── courseController.js
│   │   ├── moduleController.js
│   │   ├── lessonController.js
│   │   ├── quizController.js
│   │   └── progressController.js
│   └── routes/
│       ├── auth.js
│       ├── courses.js
│       ├── modules.js
│       ├── lessons.js
│       ├── quizzes.js
│       └── progress.js
└── tests/
    └── api.test.js
```