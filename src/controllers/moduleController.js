const { validationResult } = require('express-validator');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');

exports.createModule = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'fail', errors: errors.array() });
  }

  const course = await Course.findById(req.params.courseId);
  if (!course) {
    return res.status(404).json({ status: 'fail', message: 'Course not found.' });
  }

  if (course.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({ status: 'fail', message: 'You can only add modules to your own courses.' });
  }

  const module = await Module.create({
    title: req.body.title,
    description: req.body.description,
    order: req.body.order,
    course: req.params.courseId,
  });

  res.status(201).json({ status: 'success', data: { module } });
};

exports.getModules = async (req, res) => {
  const modules = await Module.find({ course: req.params.courseId }).sort('order');
  res.status(200).json({ status: 'success', results: modules.length, data: { modules } });
};

exports.getModule = async (req, res) => {
  const module = await Module.findOne({
    _id: req.params.id,
    course: req.params.courseId,
  }).populate({ path: 'lessons', options: { sort: { order: 1 } } });

  if (!module) {
    return res.status(404).json({ status: 'fail', message: 'Module not found.' });
  }

  res.status(200).json({ status: 'success', data: { module } });
};

exports.updateModule = async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) {
    return res.status(404).json({ status: 'fail', message: 'Course not found.' });
  }

  if (course.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({ status: 'fail', message: 'You can only update modules in your own courses.' });
  }

  const module = await Module.findOneAndUpdate(
    { _id: req.params.id, course: req.params.courseId },
    req.body,
    { new: true, runValidators: true }
  );

  if (!module) {
    return res.status(404).json({ status: 'fail', message: 'Module not found.' });
  }

  res.status(200).json({ status: 'success', data: { module } });
};

exports.deleteModule = async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) {
    return res.status(404).json({ status: 'fail', message: 'Course not found.' });
  }

  if (course.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({ status: 'fail', message: 'You can only delete modules in your own courses.' });
  }

  const module = await Module.findOneAndDelete({ _id: req.params.id, course: req.params.courseId });
  if (!module) {
    return res.status(404).json({ status: 'fail', message: 'Module not found.' });
  }

  await Lesson.deleteMany({ module: module._id });

  res.status(204).json({ status: 'success', data: null });
};
