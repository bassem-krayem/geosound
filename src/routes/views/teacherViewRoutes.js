const express = require('express');
const upload = require('../../middleware/upload');
const teacherViewController = require('../../controllers/views/teacherViewController');
const { loadUser, requireAuth, requireRole } = require('../../middleware/viewAuth');
const { csrfAfterMultipart } = require('../../middleware/csrf');

const router = express.Router();

router.use(loadUser, requireAuth, requireRole('teacher'));

// Dashboard
router.get('/dashboard', teacherViewController.showDashboard);

// Courses
router.get('/courses/new',                                       teacherViewController.showNewCourse);
router.post('/courses/new',                                      teacherViewController.handleNewCourse);
router.get('/courses/:courseId',                                 teacherViewController.showCourse);
router.get('/courses/:courseId/edit',                            teacherViewController.showEditCourse);
router.post('/courses/:courseId/edit',                           teacherViewController.handleEditCourse);
router.post('/courses/:courseId/delete',                         teacherViewController.handleDeleteCourse);

// Modules
router.get('/courses/:courseId/modules/new',                     teacherViewController.showNewModule);
router.post('/courses/:courseId/modules/new',                    teacherViewController.handleNewModule);
router.get('/courses/:courseId/modules/:moduleId/edit',          teacherViewController.showEditModule);
router.post('/courses/:courseId/modules/:moduleId/edit',         teacherViewController.handleEditModule);
router.post('/courses/:courseId/modules/:moduleId/delete',       teacherViewController.handleDeleteModule);

// Lessons — multer runs first (parses the multipart body), then CSRF validates req.body._csrf
router.get('/courses/:courseId/modules/:moduleId/lessons/new',             teacherViewController.showNewLesson);
router.post('/courses/:courseId/modules/:moduleId/lessons/new',            upload.single('audio'), csrfAfterMultipart, teacherViewController.handleNewLesson);
router.get('/courses/:courseId/modules/:moduleId/lessons/:lessonId/edit',  teacherViewController.showEditLesson);
router.post('/courses/:courseId/modules/:moduleId/lessons/:lessonId/edit', upload.single('audio'), csrfAfterMultipart, teacherViewController.handleEditLesson);
router.post('/courses/:courseId/modules/:moduleId/lessons/:lessonId/delete', teacherViewController.handleDeleteLesson);

// Quiz
router.get('/courses/:courseId/modules/:moduleId/lessons/:lessonId/quiz',  teacherViewController.showQuizForm);
router.post('/courses/:courseId/modules/:moduleId/lessons/:lessonId/quiz/new',  teacherViewController.handleQuizForm);
router.post('/courses/:courseId/modules/:moduleId/lessons/:lessonId/quiz/edit', teacherViewController.handleQuizForm);

module.exports = router;
