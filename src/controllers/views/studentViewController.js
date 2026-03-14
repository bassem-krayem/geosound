const Course = require('../../models/Course');
const Module = require('../../models/Module');
const Lesson = require('../../models/Lesson');
const Quiz = require('../../models/Quiz');
const Progress = require('../../models/Progress');
const { generateSignedUrl } = require('../../utils/deleteAudio');

// ── All courses (public) ──────────────────────────────────────────────────────

exports.showCourses = async (req, res) => {
  const courses = await Course.find().populate('teacher', 'name');

  let enrolledIds = [];
  if (req.user && req.user.role === 'student') {
    const progresses = await Progress.find({ student: req.user._id }).select('course');
    enrolledIds = progresses.map((p) => p.course.toString());
  }

  res.render('student/courses', {
    title: 'Courses',
    activePage: 'courses',
    user: req.user || null,
    courses,
    enrolledIds,
  });
};

// ── Enroll in course ──────────────────────────────────────────────────────────

exports.enrollInCourse = async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.redirect('/courses');

  const existing = await Progress.findOne({ student: req.user._id, course: course._id });
  if (!existing) {
    await Progress.create({ student: req.user._id, course: course._id, lessons: [] });
  }

  res.redirect(`/courses/${course._id}`);
};

// ── Course detail ─────────────────────────────────────────────────────────────

exports.showCourse = async (req, res) => {
  const course = await Course.findById(req.params.courseId).populate('teacher', 'name');
  if (!course) return res.status(404).render('error', { title: 'Not Found', statusCode: 404, message: 'Course not found.', user: req.user || null });

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

  if (req.user && req.user.role === 'student') {
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
    title: 'My Learning',
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
    return res.status(404).render('error', { title: 'Not Found', statusCode: 404, message: 'Lesson not found.', user: req.user || null });
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
  });
};
