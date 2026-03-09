const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
  },
  options: {
    type: [String],
    validate: {
      validator: (arr) => arr.length === 4,
      message: 'Each question must have exactly 4 options',
    },
    required: true,
  },
  correctOption: {
    type: Number,
    min: 0,
    max: 3,
    required: [true, 'Correct option index is required'],
  },
});

const quizSchema = new mongoose.Schema(
  {
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
      unique: true,
    },
    questions: {
      type: [questionSchema],
      validate: {
        validator: (arr) => arr.length === 5,
        message: 'A quiz must have exactly 5 questions',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quiz', quizSchema);
