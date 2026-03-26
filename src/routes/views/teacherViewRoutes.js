const express = require('express');
const { uploadSingle } = require('../../middleware/upload');
const teacherViewController = require('../../controllers/views/teacherViewController');
const { loadUser, requireAuth, requireRole } = require('../../middleware/viewAuth');
const { csrfAfterMultipart } = require('../../middleware/csrf');

const router = express.Router();

router.use(loadUser, requireAuth, requireRole('teacher'));

// Dashboard
router.get('/dashboard', teacherViewController.showDashboard);

// Levels
router.get('/levels',                                           (req, res) => res.redirect('/teacher/dashboard'));
router.get('/levels/new',                                       teacherViewController.showNewCourse);
router.post('/levels/new',                                      teacherViewController.handleNewCourse);
router.get('/levels/:courseId',                                 teacherViewController.showCourse);
router.get('/levels/:courseId/edit',                            teacherViewController.showEditCourse);
router.post('/levels/:courseId/edit',                           teacherViewController.handleEditCourse);
router.post('/levels/:courseId/delete',                         teacherViewController.handleDeleteCourse);

// Backward-compatible aliases
router.get('/courses',                                          (req, res) => res.redirect('/teacher/levels'));
router.get('/courses/new',                                      (req, res) => res.redirect('/teacher/levels/new'));
router.post('/courses/new',                                     teacherViewController.handleNewCourse);
router.get('/courses/:courseId',                                (req, res) => res.redirect(`/teacher/levels/${req.params.courseId}`));
router.get('/courses/:courseId/edit',                           (req, res) => res.redirect(`/teacher/levels/${req.params.courseId}/edit`));
router.post('/courses/:courseId/edit',                          teacherViewController.handleEditCourse);
router.post('/courses/:courseId/delete',                        teacherViewController.handleDeleteCourse);

// Modules
router.get('/levels/:courseId/modules/new',                     teacherViewController.showNewModule);
router.post('/levels/:courseId/modules/new',                    teacherViewController.handleNewModule);
router.get('/levels/:courseId/modules/:moduleId/edit',          teacherViewController.showEditModule);
router.post('/levels/:courseId/modules/:moduleId/edit',         teacherViewController.handleEditModule);
router.post('/levels/:courseId/modules/:moduleId/delete',       teacherViewController.handleDeleteModule);

// Backward-compatible aliases
router.get('/courses/:courseId/modules/new',                    (req, res) => res.redirect(`/teacher/levels/${req.params.courseId}/modules/new`));
router.post('/courses/:courseId/modules/new',                   teacherViewController.handleNewModule);
router.get('/courses/:courseId/modules/:moduleId/edit',         (req, res) => res.redirect(`/teacher/levels/${req.params.courseId}/modules/${req.params.moduleId}/edit`));
router.post('/courses/:courseId/modules/:moduleId/edit',        teacherViewController.handleEditModule);
router.post('/courses/:courseId/modules/:moduleId/delete',      teacherViewController.handleDeleteModule);

// Lessons — multer runs first (parses the multipart body), then CSRF validates req.body._csrf
router.get('/levels/:courseId/modules/:moduleId/lessons/new',             teacherViewController.showNewLesson);
router.post('/levels/:courseId/modules/:moduleId/lessons/new',            uploadSingle, csrfAfterMultipart, teacherViewController.handleNewLesson);
router.get('/levels/:courseId/modules/:moduleId/lessons/:lessonId/edit',  teacherViewController.showEditLesson);
router.post('/levels/:courseId/modules/:moduleId/lessons/:lessonId/edit', uploadSingle, csrfAfterMultipart, teacherViewController.handleEditLesson);
router.post('/levels/:courseId/modules/:moduleId/lessons/:lessonId/delete', teacherViewController.handleDeleteLesson);

// Backward-compatible aliases
router.get('/courses/:courseId/modules/:moduleId/lessons/new',             (req, res) => res.redirect(`/teacher/levels/${req.params.courseId}/modules/${req.params.moduleId}/lessons/new`));
router.post('/courses/:courseId/modules/:moduleId/lessons/new',            uploadSingle, csrfAfterMultipart, teacherViewController.handleNewLesson);
router.get('/courses/:courseId/modules/:moduleId/lessons/:lessonId/edit',  (req, res) => res.redirect(`/teacher/levels/${req.params.courseId}/modules/${req.params.moduleId}/lessons/${req.params.lessonId}/edit`));
router.post('/courses/:courseId/modules/:moduleId/lessons/:lessonId/edit', uploadSingle, csrfAfterMultipart, teacherViewController.handleEditLesson);
router.post('/courses/:courseId/modules/:moduleId/lessons/:lessonId/delete', teacherViewController.handleDeleteLesson);

// Quiz
router.get('/levels/:courseId/modules/:moduleId/lessons/:lessonId/quiz',  teacherViewController.showQuizForm);
router.post('/levels/:courseId/modules/:moduleId/lessons/:lessonId/quiz/new',  teacherViewController.handleQuizForm);
router.post('/levels/:courseId/modules/:moduleId/lessons/:lessonId/quiz/edit', teacherViewController.handleQuizForm);

// Backward-compatible aliases
router.get('/courses/:courseId/modules/:moduleId/lessons/:lessonId/quiz', (req, res) => res.redirect(`/teacher/levels/${req.params.courseId}/modules/${req.params.moduleId}/lessons/${req.params.lessonId}/quiz`));
router.post('/courses/:courseId/modules/:moduleId/lessons/:lessonId/quiz/new', teacherViewController.handleQuizForm);
router.post('/courses/:courseId/modules/:moduleId/lessons/:lessonId/quiz/edit', teacherViewController.handleQuizForm);

module.exports = router;
