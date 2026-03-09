const express = require('express');
const { body } = require('express-validator');
const quizController = require('../controllers/quizController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(protect);

const questionsValidator = [
  body('questions')
    .isArray({ min: 5, max: 5 })
    .withMessage('Quiz must have exactly 5 questions'),
  body('questions.*.text')
    .trim()
    .notEmpty()
    .withMessage('Each question must have text'),
  body('questions.*.options')
    .isArray({ min: 4, max: 4 })
    .withMessage('Each question must have exactly 4 options'),
  body('questions.*.correctOption')
    .isInt({ min: 0, max: 3 })
    .withMessage('correctOption must be an integer between 0 and 3'),
];

router
  .route('/')
  .get(quizController.getQuiz)
  .post(restrictTo('teacher'), questionsValidator, quizController.createQuiz)
  .put(restrictTo('teacher'), questionsValidator, quizController.updateQuiz);

router.post(
  '/submit',
  restrictTo('student'),
  [
    body('answers')
      .isArray({ min: 5, max: 5 })
      .withMessage('You must provide exactly 5 answers'),
    body('answers.*')
      .isInt({ min: 0, max: 3 })
      .withMessage('Each answer must be an integer between 0 and 3'),
  ],
  quizController.submitQuiz
);

module.exports = router;
