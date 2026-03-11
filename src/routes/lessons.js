const express = require('express');
const { body } = require('express-validator');
const lessonController = require('../controllers/lessonController');
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router({ mergeParams: true });

router.use(protect);

router
  .route('/')
  .get(lessonController.getLessons)
  .post(
    restrictTo('teacher'),
    upload.single('audio'),
    [body('title').trim().notEmpty().withMessage('Lesson title is required')],
    lessonController.createLesson
  );

router
  .route('/:id')
  .get(lessonController.getLesson)
  .patch(
    restrictTo('teacher'),
    upload.single('audio'),
    lessonController.updateLesson
  )
  .delete(restrictTo('teacher'), lessonController.deleteLesson);

module.exports = router;
