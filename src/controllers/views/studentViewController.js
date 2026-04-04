const Course = require('../../models/Course');
const Module = require('../../models/Module');
const Lesson = require('../../models/Lesson');
const Quiz = require('../../models/Quiz');
const Progress = require('../../models/Progress');
const { generateSignedUrl } = require('../../utils/deleteAudio');
const { isLearnerRole } = require('../../utils/roles');

// ── All levels (public) ───────────────────────────────────────────────────────

exports.showCourses = async (req, res) => {
  const courses = await Course.find().populate('teacher', 'name');

  let enrolledIds = [];
  if (req.user && isLearnerRole(req.user.role)) {
    const progresses = await Progress.find({ student: req.user._id }).select('course');
    enrolledIds = progresses.map((p) => p.course.toString());
  }

  res.render('student/courses', {
    title: 'المستويات',
    activePage: 'levels',
    user: req.user || null,
    courses,
    enrolledIds,
  });
};

// ── Enroll in level ───────────────────────────────────────────────────────────

exports.enrollInCourse = async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.redirect('/levels');

  const existing = await Progress.findOne({ student: req.user._id, course: course._id });
  if (!existing) {
    await Progress.create({ student: req.user._id, course: course._id, lessons: [] });
  }

  res.redirect(`/levels/${course._id}`);
};

// ── Level detail ──────────────────────────────────────────────────────────────

exports.showCourse = async (req, res) => {
  const course = await Course.findById(req.params.courseId).populate('teacher', 'name');
  if (!course) return res.status(404).render('error', { title: 'غير موجود', statusCode: 404, message: 'المستوى غير موجود.', user: req.user || null });

  const modules = await Module.find({ course: course._id })
    .sort('order')
    .lean();

  // Attach lessons to each module
  for (const mod of modules) {
    mod.lessons = await Lesson.find({ module: mod._id }).sort('order').lean();
  }

  // Total lesson count
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);

  let enrolled = false;
  let progressData = null;

  if (req.user && isLearnerRole(req.user.role)) {
    const progress = await Progress.findOne({ student: req.user._id, course: course._id })
      .populate('lessons.lesson', 'title order')
      .lean();

    if (progress) {
      enrolled = true;
      const completed = progress.lessons.filter((l) => l.completed).length;
      progressData = {
        lessons: progress.lessons,
        completed,
        total: totalLessons,
        percent: totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0,
      };
    }
  }

  res.render('student/course', {
    title: course.title,
    user: req.user || null,
    course,
    modules,
    enrolled,
    progressData,
  });
};

// ── Student dashboard ─────────────────────────────────────────────────────────

exports.showDashboard = async (req, res) => {
  const enrollments = await Progress.find({ student: req.user._id })
    .populate('course', 'title description')
    .lean();

  // Attach total lesson counts per course
  for (const enr of enrollments) {
    if (!enr.course) { enr._totalLessons = 0; continue; }
    const mods = await Module.find({ course: enr.course._id });
    let total = 0;
    for (const m of mods) total += await Lesson.countDocuments({ module: m._id });
    enr._totalLessons = total;
  }

  const totalCompleted = enrollments.reduce((sum, e) => sum + e.lessons.filter((l) => l.completed).length, 0);

  res.render('student/dashboard', {
    title: 'رحلتي التعليمية',
    activePage: 'dashboard',
    user: req.user,
    enrollments,
    totalCompleted,
  });
};

// ── Lesson view ───────────────────────────────────────────────────────────────

exports.showLesson = async (req, res) => {
  const { courseId, moduleId, lessonId } = req.params;

  const [course, lesson] = await Promise.all([
    Course.findById(courseId).lean(),
    Lesson.findOne({ _id: lessonId, module: moduleId }).lean(),
  ]);

  if (!course || !lesson) {
    return res.status(404).render('error', { title: 'غير موجود', statusCode: 404, message: 'الدرس غير موجود.', user: req.user || null });
  }

  // Fetch quiz (hide correctOption)
  const quiz = await Quiz.findOne({ lesson: lessonId }).select('-questions.correctOption').lean();

  // Check existing progress
  let alreadyPassed = false;
  let bestScore = null;

  if (req.user) {
    const progress = await Progress.findOne({ student: req.user._id, course: courseId });
    if (progress) {
      const lp = progress.lessons.find((l) => l.lesson.toString() === lessonId);
      if (lp) {
        alreadyPassed = lp.completed;
        bestScore = lp.score;
      }
    }
  }

  // Resolve next lesson across the whole course (module order, then lesson order)
  let nextLessonUrl = null;
  const courseModules = await Module.find({ course: courseId }).sort('order').lean();
  if (courseModules.length) {
    const orderedLessons = [];
    for (const mod of courseModules) {
      const modLessons = await Lesson.find({ module: mod._id }).sort('order').select('_id').lean();
      modLessons.forEach((l) => {
        orderedLessons.push({ moduleId: mod._id.toString(), lessonId: l._id.toString() });
      });
    }

    const currentIdx = orderedLessons.findIndex((l) => l.lessonId === lessonId);
    const nextLesson = currentIdx >= 0 ? orderedLessons[currentIdx + 1] : null;
    if (nextLesson) {
      nextLessonUrl = `/levels/${courseId}/modules/${nextLesson.moduleId}/lessons/${nextLesson.lessonId}`;
    }
  }

  res.render('student/lesson', {
    title: lesson.title,
    user: req.user || null,
    lesson: { ...lesson, audioUrl: await generateSignedUrl(lesson.audioUrl) },
    quiz,
    courseId,
    courseTitle: course.title,
    moduleId,
    alreadyPassed,
    bestScore,
    nextLessonUrl,
  });
};
