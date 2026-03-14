const { validationResult } = require('express-validator');
const Lesson = require('../models/Lesson');
const Module = require('../models/Module');
const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const { deleteAudio, getAudioUrl } = require('../utils/deleteAudio');

const getTeacherFromModule = async (moduleId) => {
  const module = await Module.findById(moduleId);
  if (!module) return null;
  const course = await Course.findById(module.course);
  if (!course) return null;
  return { module, course };
};

exports.createLesson = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file) await deleteAudio(getAudioUrl(req.file));
    return res.status(400).json({ status: 'fail', errors: errors.array() });
  }

  const result = await getTeacherFromModule(req.params.moduleId);
  if (!result) {
    if (req.file) await deleteAudio(getAudioUrl(req.file));
    return res.status(404).json({ status: 'fail', message: 'Module or course not found.' });
  }

  if (result.course.teacher.toString() !== req.user._id.toString()) {
    if (req.file) await deleteAudio(getAudioUrl(req.file));
    return res.status(403).json({ status: 'fail', message: 'You can only add lessons to your own modules.' });
  }

  const audioUrl = getAudioUrl(req.file);

  const lesson = await Lesson.create({
    title: req.body.title,
    description: req.body.description,
    order: req.body.order,
    audioUrl,
    module: req.params.moduleId,
  });

  res.status(201).json({ status: 'success', data: { lesson } });
};

exports.getLessons = async (req, res) => {
  const lessons = await Lesson.find({ module: req.params.moduleId }).sort('order');
  res.status(200).json({ status: 'success', results: lessons.length, data: { lessons } });
};

exports.getLesson = async (req, res) => {
  const lesson = await Lesson.findOne({ _id: req.params.id, module: req.params.moduleId });
  if (!lesson) {
    return res.status(404).json({ status: 'fail', message: 'Lesson not found.' });
  }

  const quiz = await Quiz.findOne({ lesson: lesson._id }).select('-questions.correctOption');

  res.status(200).json({ status: 'success', data: { lesson, quiz: quiz || null } });
};

exports.updateLesson = async (req, res) => {
  const result = await getTeacherFromModule(req.params.moduleId);
  if (!result) {
    if (req.file) await deleteAudio(getAudioUrl(req.file));
    return res.status(404).json({ status: 'fail', message: 'Module or course not found.' });
  }

  if (result.course.teacher.toString() !== req.user._id.toString()) {
    if (req.file) await deleteAudio(getAudioUrl(req.file));
    return res.status(403).json({ status: 'fail', message: 'You can only update lessons in your own modules.' });
  }

  const lesson = await Lesson.findOne({ _id: req.params.id, module: req.params.moduleId });
  if (!lesson) {
    if (req.file) await deleteAudio(getAudioUrl(req.file));
    return res.status(404).json({ status: 'fail', message: 'Lesson not found.' });
  }

  const updateData = { ...req.body };
  if (req.file) {
    // Remove old audio file
    if (lesson.audioUrl) await deleteAudio(lesson.audioUrl);
    updateData.audioUrl = getAudioUrl(req.file);
  }

  const updated = await Lesson.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ status: 'success', data: { lesson: updated } });
};

exports.deleteLesson = async (req, res) => {
  const result = await getTeacherFromModule(req.params.moduleId);
  if (!result) {
    return res.status(404).json({ status: 'fail', message: 'Module or course not found.' });
  }

  if (result.course.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({ status: 'fail', message: 'You can only delete lessons in your own modules.' });
  }

  const lesson = await Lesson.findOneAndDelete({ _id: req.params.id, module: req.params.moduleId });
  if (!lesson) {
    return res.status(404).json({ status: 'fail', message: 'Lesson not found.' });
  }

  if (lesson.audioUrl) await deleteAudio(lesson.audioUrl);

  await Quiz.findOneAndDelete({ lesson: lesson._id });

  res.status(204).json({ status: 'success', data: null });
};
