const Progress = require('../models/Progress');
const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');

exports.enrollInCourse = async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) {
    return res.status(404).json({ status: 'fail', message: 'Course not found.' });
  }

  const existing = await Progress.findOne({ student: req.user._id, course: req.params.courseId });
  if (existing) {
    return res.status(409).json({ status: 'fail', message: 'Already enrolled in this course.' });
  }

  const progress = await Progress.create({
    student: req.user._id,
    course: req.params.courseId,
    lessons: [],
  });

  res.status(201).json({ status: 'success', data: { progress } });
};

exports.getCourseProgress = async (req, res) => {
  const progress = await Progress.findOne({
    student: req.user._id,
    course: req.params.courseId,
  }).populate('lessons.lesson', 'title order');

  if (!progress) {
    return res.status(404).json({ status: 'fail', message: 'Not enrolled in this course.' });
  }

  res.status(200).json({ status: 'success', data: { progress } });
};

// Check if a lesson is accessible by a student
// First lesson is always accessible; subsequent lessons require the previous to be completed
exports.checkLessonAccess = async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson) {
    return res.status(404).json({ status: 'fail', message: 'Lesson not found.' });
  }

  const module = await Module.findById(lesson.module);
  const course = await Course.findById(module.course);

  // Get all lessons in the module sorted by order
  const moduleLessons = await Lesson.find({ module: lesson.module }).sort('order');
  const lessonIndex = moduleLessons.findIndex((l) => l._id.toString() === req.params.lessonId);

  // First lesson is always unlocked
  if (lessonIndex === 0) {
    return res.status(200).json({ status: 'success', data: { accessible: true, message: 'Lesson is accessible.' } });
  }

  // Check if the previous lesson was completed
  const previousLesson = moduleLessons[lessonIndex - 1];
  const progress = await Progress.findOne({ student: req.user._id, course: course._id });

  if (!progress) {
    return res.status(200).json({ status: 'success', data: { accessible: false, message: 'Please enroll in this course first.' } });
  }

  const prevProgress = progress.lessons.find((l) => l.lesson.toString() === previousLesson._id.toString());
  const accessible = prevProgress && prevProgress.completed;

  res.status(200).json({
    status: 'success',
    data: {
      accessible: !!accessible,
      message: accessible
        ? 'Lesson is accessible.'
        : 'Complete the previous lesson with at least 70% to unlock this lesson.',
    },
  });
};

exports.getMyEnrollments = async (req, res) => {
  const enrollments = await Progress.find({ student: req.user._id }).populate('course', 'title description');
  res.status(200).json({ status: 'success', results: enrollments.length, data: { enrollments } });
};
