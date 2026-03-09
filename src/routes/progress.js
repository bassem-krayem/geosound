const express = require('express');
const progressController = require('../controllers/progressController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Student enrollment and progress
router.get('/my-enrollments', restrictTo('student'), progressController.getMyEnrollments);

router.post('/courses/:courseId/enroll', restrictTo('student'), progressController.enrollInCourse);

router.get('/courses/:courseId', restrictTo('student'), progressController.getCourseProgress);

router.get('/lessons/:lessonId/access', restrictTo('student'), progressController.checkLessonAccess);

module.exports = router;
