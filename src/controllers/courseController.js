const { validationResult } = require('express-validator');
const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');

exports.createCourse = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'fail', errors: errors.array() });
  }

  const course = await Course.create({
    title: req.body.title,
    description: req.body.description,
    teacher: req.user._id,
  });

  res.status(201).json({ status: 'success', data: { course } });
};

exports.getAllCourses = async (_req, res) => {
  const courses = await Course.find().populate('teacher', 'name email');
  res.status(200).json({ status: 'success', results: courses.length, data: { courses } });
};

exports.getCourse = async (req, res) => {
  const course = await Course.findById(req.params.id)
    .populate('teacher', 'name email')
    .populate({
      path: 'modules',
      options: { sort: { order: 1 } },
      populate: { path: 'lessons', options: { sort: { order: 1 } } },
    });

  if (!course) {
    return res.status(404).json({ status: 'fail', message: 'Course not found.' });
  }

  res.status(200).json({ status: 'success', data: { course } });
};

exports.updateCourse = async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    return res.status(404).json({ status: 'fail', message: 'Course not found.' });
  }

  if (course.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({ status: 'fail', message: 'You can only update your own courses.' });
  }

  const updated = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ status: 'success', data: { course: updated } });
};

exports.deleteCourse = async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    return res.status(404).json({ status: 'fail', message: 'Course not found.' });
  }

  if (course.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({ status: 'fail', message: 'You can only delete your own courses.' });
  }

  // Cascade delete modules and lessons
  const modules = await Module.find({ course: course._id });
  const moduleIds = modules.map((m) => m._id);
  await Lesson.deleteMany({ module: { $in: moduleIds } });
  await Module.deleteMany({ course: course._id });
  await Course.findByIdAndDelete(req.params.id);

  res.status(204).json({ status: 'success', data: null });
};
