const express = require('express');
const { body } = require('express-validator');
const courseController = require('../controllers/courseController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(courseController.getAllCourses)
  .post(
    restrictTo('teacher'),
    [
      body('title').trim().notEmpty().withMessage('Course title is required'),
    ],
    courseController.createCourse
  );

router
  .route('/:id')
  .get(courseController.getCourse)
  .patch(restrictTo('teacher'), courseController.updateCourse)
  .delete(restrictTo('teacher'), courseController.deleteCourse);

module.exports = router;
