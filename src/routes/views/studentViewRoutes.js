const express = require('express');
const studentViewController = require('../../controllers/views/studentViewController');
const { loadUser, requireAuth, requireRole } = require('../../middleware/viewAuth');

const router = express.Router();

router.use(loadUser);

// Public course listing
router.get('/levels', studentViewController.showCourses);
router.get('/levels/:courseId', studentViewController.showCourse);

// Backward-compatible aliases
router.get('/courses', (_req, res) => res.redirect('/levels'));
router.get('/courses/:courseId', (req, res) => res.redirect(`/levels/${req.params.courseId}`));

// Requires pupil auth
router.post('/levels/:courseId/enroll', requireAuth, requireRole('pupil'), studentViewController.enrollInCourse);
router.get('/levels/:courseId/modules/:moduleId/lessons/:lessonId', requireAuth, requireRole('pupil'), studentViewController.showLesson);

// Backward-compatible aliases
router.post('/courses/:courseId/enroll', requireAuth, requireRole('pupil'), studentViewController.enrollInCourse);
router.get('/courses/:courseId/modules/:moduleId/lessons/:lessonId', requireAuth, requireRole('pupil'), studentViewController.showLesson);
router.get('/dashboard', requireAuth, requireRole('pupil'), studentViewController.showDashboard);

module.exports = router;
