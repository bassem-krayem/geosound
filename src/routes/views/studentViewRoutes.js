const express = require('express');
const studentViewController = require('../../controllers/views/studentViewController');
const { loadUser, requireAuth, requireRole } = require('../../middleware/viewAuth');

const router = express.Router();

router.use(loadUser);

// Public course listing
router.get('/courses', studentViewController.showCourses);
router.get('/courses/:courseId', studentViewController.showCourse);

// Requires student auth
router.post('/courses/:courseId/enroll', requireAuth, requireRole('student'), studentViewController.enrollInCourse);
router.get('/courses/:courseId/modules/:moduleId/lessons/:lessonId', requireAuth, requireRole('student'), studentViewController.showLesson);
router.get('/dashboard', requireAuth, requireRole('student'), studentViewController.showDashboard);

module.exports = router;
