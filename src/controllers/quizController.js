const { validationResult } = require('express-validator');
const Quiz = require('../models/Quiz');
const Lesson = require('../models/Lesson');
const Module = require('../models/Module');
const Course = require('../models/Course');
const Progress = require('../models/Progress');

const PASS_THRESHOLD = 0.7; // 70%

const getTeacherFromLesson = async (lessonId) => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) return null;
  const module = await Module.findById(lesson.module);
  if (!module) return null;
  const course = await Course.findById(module.course);
  if (!course) return null;
  return { lesson, module, course };
};

exports.createQuiz = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'fail', errors: errors.array() });
  }

  const result = await getTeacherFromLesson(req.params.lessonId);
  if (!result) {
    return res.status(404).json({ status: 'fail', message: 'Lesson not found.' });
  }

  if (result.course.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({ status: 'fail', message: 'You can only add quizzes to your own lessons.' });
  }

  const existing = await Quiz.findOne({ lesson: req.params.lessonId });
  if (existing) {
    return res.status(409).json({ status: 'fail', message: 'Quiz already exists for this lesson. Use PUT to update.' });
  }

  const quiz = await Quiz.create({
    lesson: req.params.lessonId,
    questions: req.body.questions,
  });

  res.status(201).json({ status: 'success', data: { quiz } });
};

exports.getQuiz = async (req, res) => {
  const quiz = await Quiz.findOne({ lesson: req.params.lessonId }).select('-questions.correctOption');
  if (!quiz) {
    return res.status(404).json({ status: 'fail', message: 'Quiz not found for this lesson.' });
  }

  res.status(200).json({ status: 'success', data: { quiz } });
};

exports.updateQuiz = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'fail', errors: errors.array() });
  }

  const result = await getTeacherFromLesson(req.params.lessonId);
  if (!result) {
    return res.status(404).json({ status: 'fail', message: 'Lesson not found.' });
  }

  if (result.course.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({ status: 'fail', message: 'You can only update quizzes in your own lessons.' });
  }

  const quiz = await Quiz.findOneAndUpdate(
    { lesson: req.params.lessonId },
    { questions: req.body.questions },
    { new: true, runValidators: true }
  );

  if (!quiz) {
    return res.status(404).json({ status: 'fail', message: 'Quiz not found.' });
  }

  res.status(200).json({ status: 'success', data: { quiz } });
};

exports.submitQuiz = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'fail', errors: errors.array() });
  }

  const quiz = await Quiz.findOne({ lesson: req.params.lessonId });
  if (!quiz) {
    return res.status(404).json({ status: 'fail', message: 'Quiz not found for this lesson.' });
  }

  const { answers } = req.body; // array of 5 integers (0-3)
  if (!Array.isArray(answers) || answers.length !== 5) {
    return res.status(400).json({ status: 'fail', message: 'You must provide exactly 5 answers.' });
  }

  // Calculate score
  let correct = 0;
  quiz.questions.forEach((q, i) => {
    if (answers[i] === q.correctOption) correct++;
  });

  const score = correct / quiz.questions.length; // 0.0 – 1.0
  const passed = score >= PASS_THRESHOLD;
  const scorePercent = Math.round(score * 100);

  // Update or create progress record
  const result = await getTeacherFromLesson(req.params.lessonId);
  if (!result) {
    return res.status(404).json({ status: 'fail', message: 'Lesson not found.' });
  }

  const courseId = result.course._id;
  let progress = await Progress.findOne({ student: req.user._id, course: courseId });

  if (!progress) {
    progress = await Progress.create({
      student: req.user._id,
      course: courseId,
      lessons: [],
    });
  }

  const lessonId = req.params.lessonId;
  const idx = progress.lessons.findIndex((l) => l.lesson.toString() === lessonId);

  if (idx === -1) {
    progress.lessons.push({
      lesson: lessonId,
      completed: passed,
      score: scorePercent,
      attempts: 1,
      completedAt: passed ? new Date() : null,
    });
  } else {
    progress.lessons[idx].attempts += 1;
    if (scorePercent > progress.lessons[idx].score) {
      progress.lessons[idx].score = scorePercent;
    }
    if (passed && !progress.lessons[idx].completed) {
      progress.lessons[idx].completed = true;
      progress.lessons[idx].completedAt = new Date();
    }
  }

  await progress.save();

  res.status(200).json({
    status: 'success',
    data: {
      correct,
      total: quiz.questions.length,
      scorePercent,
      passed,
      message: passed
        ? 'Congratulations! You passed. The next lesson is now unlocked.'
        : `You scored ${scorePercent}%. You need at least 70% to unlock the next lesson. Please try again.`,
    },
  });
};
