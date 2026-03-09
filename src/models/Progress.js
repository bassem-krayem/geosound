const mongoose = require('mongoose');

const lessonProgressSchema = new mongoose.Schema({
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  score: {
    type: Number,
    default: null,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  completedAt: {
    type: Date,
    default: null,
  },
});

const progressSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    lessons: [lessonProgressSchema],
  },
  { timestamps: true }
);

progressSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema);
