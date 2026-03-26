const express = require('express');
const progressController = require('../controllers/progressController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Pupil enrollment and progress
router.get('/my-enrollments', restrictTo('pupil'), progressController.getMyEnrollments);

router.post('/courses/:courseId/enroll', restrictTo('pupil'), progressController.enrollInCourse);

router.get('/courses/:courseId', restrictTo('pupil'), progressController.getCourseProgress);

router.get('/lessons/:lessonId/access', restrictTo('pupil'), progressController.checkLessonAccess);

module.exports = router;
