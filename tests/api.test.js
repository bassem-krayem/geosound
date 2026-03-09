/**
 * Integration tests for GeoSound API
 *
 * These tests use supertest against the Express app.
 * They mock Mongoose models to avoid a live MongoDB connection.
 */

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

jest.mock('../src/config/db', () => jest.fn().mockResolvedValue(undefined));

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');

// ── Helpers ─────────────────────────────────────────────────────────────────

const makeId = () => new mongoose.Types.ObjectId();

// ── Auth routes ─────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  const User = require('../src/models/User');

  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when body is missing required fields', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid role', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret123',
      role: 'admin',
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 when email already exists', async () => {
    const teacherId = makeId();
    jest.spyOn(User, 'findOne').mockResolvedValue({ _id: teacherId });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret123',
      role: 'teacher',
    });
    expect(res.status).toBe(409);
  });

  it('creates a new teacher and returns a JWT token', async () => {
    const teacherId = makeId();
    jest.spyOn(User, 'findOne').mockResolvedValue(null);
    jest.spyOn(User, 'create').mockResolvedValue({
      _id: teacherId,
      name: 'Alice',
      email: 'alice@example.com',
      role: 'teacher',
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret123',
      role: 'teacher',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.data.user.role).toBe('teacher');
  });
});

describe('POST /api/auth/login', () => {
  const User = require('../src/models/User');

  beforeEach(() => jest.clearAllMocks());

  it('returns 401 for non-existent user', async () => {
    jest.spyOn(User, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for wrong password', async () => {
    jest.spyOn(User, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: makeId(),
        email: 'alice@example.com',
        correctPassword: jest.fn().mockResolvedValue(false),
      }),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('returns token on successful login', async () => {
    const teacherId = makeId();
    jest.spyOn(User, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: teacherId,
        name: 'Alice',
        email: 'alice@example.com',
        role: 'teacher',
        correctPassword: jest.fn().mockResolvedValue(true),
      }),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });
});

// ── Course routes ────────────────────────────────────────────────────────────

describe('GET /api/courses', () => {
  const User = require('../src/models/User');
  const Course = require('../src/models/Course');

  let token;
  const teacherId = makeId();

  beforeAll(async () => {
    jest.spyOn(User, 'findById').mockResolvedValue({
      _id: teacherId,
      name: 'Alice',
      email: 'alice@example.com',
      role: 'teacher',
    });

    const jwt = require('jsonwebtoken');
    token = jwt.sign({ id: teacherId }, process.env.JWT_SECRET);
  });

  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with a list of courses', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue({
      _id: teacherId,
      name: 'Alice',
      email: 'alice@example.com',
      role: 'teacher',
    });

    jest.spyOn(Course, 'find').mockReturnValue({
      populate: jest.fn().mockResolvedValue([
        { _id: makeId(), title: 'World Geography', teacher: { name: 'Alice' } },
      ]),
    });

    const res = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.courses).toHaveLength(1);
  });
});

describe('POST /api/courses', () => {
  const User = require('../src/models/User');
  const Course = require('../src/models/Course');

  const teacherId = makeId();
  const studentId = makeId();
  let teacherToken, studentToken;

  beforeAll(() => {
    const jwt = require('jsonwebtoken');
    teacherToken = jwt.sign({ id: teacherId }, process.env.JWT_SECRET);
    studentToken = jwt.sign({ id: studentId }, process.env.JWT_SECRET);
  });

  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when a student tries to create a course', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue({
      _id: studentId,
      name: 'Bob',
      email: 'bob@example.com',
      role: 'student',
    });

    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'World Geography' });

    expect(res.status).toBe(403);
  });

  it('returns 201 when a teacher creates a course', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue({
      _id: teacherId,
      name: 'Alice',
      email: 'alice@example.com',
      role: 'teacher',
    });

    const courseId = makeId();
    jest.spyOn(Course, 'create').mockResolvedValue({
      _id: courseId,
      title: 'World Geography',
      description: 'Learn world geography',
      teacher: teacherId,
    });

    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'World Geography', description: 'Learn world geography' });

    expect(res.status).toBe(201);
    expect(res.body.data.course.title).toBe('World Geography');
  });
});

// ── Quiz submission ──────────────────────────────────────────────────────────

describe('POST /api/courses/:courseId/modules/:moduleId/lessons/:lessonId/quiz/submit', () => {
  const User = require('../src/models/User');
  const Quiz = require('../src/models/Quiz');
  const Lesson = require('../src/models/Lesson');
  const Module = require('../src/models/Module');
  const Course = require('../src/models/Course');
  const Progress = require('../src/models/Progress');

  const studentId = makeId();
  const teacherId = makeId();
  const courseId = makeId();
  const moduleId = makeId();
  const lessonId = makeId();
  let studentToken;

  const mockQuiz = {
    _id: makeId(),
    lesson: lessonId,
    questions: [
      { text: 'Q1', options: ['A', 'B', 'C', 'D'], correctOption: 0 },
      { text: 'Q2', options: ['A', 'B', 'C', 'D'], correctOption: 1 },
      { text: 'Q3', options: ['A', 'B', 'C', 'D'], correctOption: 2 },
      { text: 'Q4', options: ['A', 'B', 'C', 'D'], correctOption: 3 },
      { text: 'Q5', options: ['A', 'B', 'C', 'D'], correctOption: 0 },
    ],
  };

  beforeAll(() => {
    const jwt = require('jsonwebtoken');
    studentToken = jwt.sign({ id: studentId }, process.env.JWT_SECRET);
  });

  const setupMocks = () => {
    jest.spyOn(User, 'findById').mockResolvedValue({
      _id: studentId,
      name: 'Bob',
      email: 'bob@example.com',
      role: 'student',
    });
    jest.spyOn(Quiz, 'findOne').mockResolvedValue(mockQuiz);
    jest.spyOn(Lesson, 'findById').mockResolvedValue({ _id: lessonId, module: moduleId });
    jest.spyOn(Module, 'findById').mockResolvedValue({ _id: moduleId, course: courseId });
    jest.spyOn(Course, 'findById').mockResolvedValue({ _id: courseId, teacher: teacherId });
  };

  it('passes when 4/5 answers are correct (80%)', async () => {
    setupMocks();

    const mockProgress = {
      _id: makeId(),
      student: studentId,
      course: courseId,
      lessons: [],
      save: jest.fn().mockResolvedValue(true),
      push: jest.fn(),
    };
    jest.spyOn(Progress, 'findOne').mockResolvedValue(mockProgress);

    // Correct answers: 0,1,2,3,0 → answers: 0,1,2,3,1 (4 correct)
    const res = await request(app)
      .post(`/api/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/quiz/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: [0, 1, 2, 3, 1] }); // 4 correct

    expect(res.status).toBe(200);
    expect(res.body.data.passed).toBe(true);
    expect(res.body.data.scorePercent).toBe(80);
  });

  it('fails when fewer than 3.5 answers are correct (40%)', async () => {
    setupMocks();

    const mockProgress = {
      _id: makeId(),
      student: studentId,
      course: courseId,
      lessons: [],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Progress, 'findOne').mockResolvedValue(mockProgress);

    // answers: 0,0,0,0,0 → 2 correct (Q1 and Q5)
    const res = await request(app)
      .post(`/api/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/quiz/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: [0, 0, 0, 0, 0] }); // 2 correct

    expect(res.status).toBe(200);
    expect(res.body.data.passed).toBe(false);
    expect(res.body.data.scorePercent).toBe(40);
  });

  it('creates a new progress record when student has none', async () => {
    setupMocks();

    jest.spyOn(Progress, 'findOne').mockResolvedValue(null);
    jest.spyOn(Progress, 'create').mockResolvedValue({
      _id: makeId(),
      student: studentId,
      course: courseId,
      lessons: [],
      save: jest.fn().mockResolvedValue(true),
    });

    const res = await request(app)
      .post(`/api/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/quiz/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: [0, 1, 2, 3, 0] }); // all correct

    expect(res.status).toBe(200);
    expect(res.body.data.passed).toBe(true);
    expect(res.body.data.scorePercent).toBe(100);
  });

  it('returns 400 when wrong number of answers provided', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue({
      _id: studentId,
      name: 'Bob',
      email: 'bob@example.com',
      role: 'student',
    });

    const res = await request(app)
      .post(`/api/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/quiz/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: [0, 1, 2] }); // only 3 answers

    expect(res.status).toBe(400);
  });
});

// ── 404 handler ──────────────────────────────────────────────────────────────

describe('Unknown routes', () => {
  it('returns 404 for an unmatched route', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});
