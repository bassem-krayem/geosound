const Course = require('../../models/Course');
const Module = require('../../models/Module');
const Lesson = require('../../models/Lesson');
const Quiz = require('../../models/Quiz');
const path = require('path');
const fs = require('fs');

// ── Teacher dashboard ─────────────────────────────────────────────────────────

exports.showDashboard = async (req, res) => {
  const courses = await Course.find({ teacher: req.user._id }).lean();
  const courseIds = courses.map((c) => c._id);

  const modules = await Module.find({ course: { $in: courseIds } }).lean();
  const moduleIds = modules.map((m) => m._id);

  const lessons = await Lesson.find({ module: { $in: moduleIds } }).lean();
  const lessonIds = lessons.map((l) => l._id);

  const quizCount = await Quiz.countDocuments({ lesson: { $in: lessonIds } });

  res.render('teacher/dashboard', {
    title: 'Teacher Dashboard',
    activePage: 'dashboard',
    user: req.user,
    courses,
    stats: {
      courses: courses.length,
      modules: modules.length,
      lessons: lessons.length,
      quizzes: quizCount,
    },
  });
};

// ── Course management ─────────────────────────────────────────────────────────

exports.showNewCourse = (req, res) => {
  res.render('teacher/course-form', { title: 'New Course', user: req.user, isEdit: false });
};

exports.handleNewCourse = async (req, res) => {
  const { title, description } = req.body;
  if (!title || !title.trim()) {
    return res.render('teacher/course-form', {
      title: 'New Course', user: req.user, isEdit: false,
      flash: { error: 'Course title is required.' }, course: req.body,
    });
  }
  const course = await Course.create({ title: title.trim(), description, teacher: req.user._id });
  res.redirect(`/teacher/courses/${course._id}`);
};

exports.showCourse = async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, teacher: req.user._id });
  if (!course) return res.redirect('/teacher/dashboard');

  const modules = await Module.find({ course: course._id }).sort('order').lean();
  for (const mod of modules) {
    mod.lessons = await Lesson.find({ module: mod._id }).sort('order').lean();
  }

  res.render('teacher/course', { title: course.title, user: req.user, course, modules });
};

exports.showEditCourse = async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, teacher: req.user._id });
  if (!course) return res.redirect('/teacher/dashboard');
  res.render('teacher/course-form', { title: 'Edit Course', user: req.user, isEdit: true, course });
};

exports.handleEditCourse = async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, teacher: req.user._id });
  if (!course) return res.redirect('/teacher/dashboard');

  const { title, description } = req.body;
  if (!title || !title.trim()) {
    return res.render('teacher/course-form', {
      title: 'Edit Course', user: req.user, isEdit: true, course: { ...course.toObject(), ...req.body },
      flash: { error: 'Course title is required.' },
    });
  }

  await Course.findByIdAndUpdate(course._id, { title: title.trim(), description });
  res.redirect(`/teacher/courses/${course._id}`);
};

exports.handleDeleteCourse = async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, teacher: req.user._id });
  if (!course) return res.redirect('/teacher/dashboard');

  const modules = await Module.find({ course: course._id });
  const moduleIds = modules.map((m) => m._id);

  // Clean up audio files
  const lessons = await Lesson.find({ module: { $in: moduleIds } });
  for (const lesson of lessons) {
    if (lesson.audioUrl) {
      const p = path.join(process.cwd(), lesson.audioUrl);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }

  await Lesson.deleteMany({ module: { $in: moduleIds } });
  await Module.deleteMany({ course: course._id });
  await Course.findByIdAndDelete(course._id);

  res.redirect('/teacher/dashboard');
};

// ── Module management ─────────────────────────────────────────────────────────

exports.showNewModule = async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, teacher: req.user._id });
  if (!course) return res.redirect('/teacher/dashboard');
  res.render('teacher/module-form', {
    title: 'New Module', user: req.user, isEdit: false,
    courseId: course._id, courseTitle: course.title,
  });
};

exports.handleNewModule = async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, teacher: req.user._id });
  if (!course) return res.redirect('/teacher/dashboard');

  const { title, description, order } = req.body;
  if (!title || !title.trim()) {
    return res.render('teacher/module-form', {
      title: 'New Module', user: req.user, isEdit: false,
      courseId: course._id, courseTitle: course.title,
      flash: { error: 'Module title is required.' }, module: req.body,
    });
  }

  await Module.create({ title: title.trim(), description, order: parseInt(order, 10) || 0, course: course._id });
  res.redirect(`/teacher/courses/${course._id}`);
};

exports.showEditModule = async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, teacher: req.user._id });
  if (!course) return res.redirect('/teacher/dashboard');
  const module = await Module.findOne({ _id: req.params.moduleId, course: course._id });
  if (!module) return res.redirect(`/teacher/courses/${course._id}`);

  res.render('teacher/module-form', {
    title: 'Edit Module', user: req.user, isEdit: true,
    courseId: course._id, courseTitle: course.title, module,
  });
};

exports.handleEditModule = async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, teacher: req.user._id });
  if (!course) return res.redirect('/teacher/dashboard');
  const module = await Module.findOne({ _id: req.params.moduleId, course: course._id });
  if (!module) return res.redirect(`/teacher/courses/${course._id}`);

  const { title, description, order } = req.body;
  await Module.findByIdAndUpdate(module._id, { title: title.trim(), description, order: parseInt(order, 10) || 0 });
  res.redirect(`/teacher/courses/${course._id}`);
};

exports.handleDeleteModule = async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, teacher: req.user._id });
  if (!course) return res.redirect('/teacher/dashboard');
  const module = await Module.findOneAndDelete({ _id: req.params.moduleId, course: course._id });
  if (module) {
    const lessons = await Lesson.find({ module: module._id });
    for (const lesson of lessons) {
      if (lesson.audioUrl) {
        const p = path.join(process.cwd(), lesson.audioUrl);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    }
    await Lesson.deleteMany({ module: module._id });
  }
  res.redirect(`/teacher/courses/${course._id}`);
};

// ── Lesson management ─────────────────────────────────────────────────────────

exports.showNewLesson = async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, teacher: req.user._id });
  if (!course) return res.redirect('/teacher/dashboard');
  const module = await Module.findOne({ _id: req.params.moduleId, course: course._id });
  if (!module) return res.redirect(`/teacher/courses/${course._id}`);

  res.render('teacher/lesson-form', {
    title: 'New Lesson', user: req.user, isEdit: false,
    courseId: course._id, courseTitle: course.title, moduleId: module._id,
  });
};

exports.handleNewLesson = async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, teacher: req.user._id });
  if (!course) { if (req.file) fs.unlinkSync(req.file.path); return res.redirect('/teacher/dashboard'); }
  const module = await Module.findOne({ _id: req.params.moduleId, course: course._id });
  if (!module) { if (req.file) fs.unlinkSync(req.file.path); return res.redirect(`/teacher/courses/${course._id}`); }

  const { title, description, order } = req.body;
  if (!title || !title.trim()) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.render('teacher/lesson-form', {
      title: 'New Lesson', user: req.user, isEdit: false,
      courseId: course._id, courseTitle: course.title, moduleId: module._id,
      flash: { error: 'Lesson title is required.' }, lesson: req.body,
    });
  }

  const audioUrl = req.file ? `/uploads/audio/${req.file.filename}` : null;
  await Lesson.create({ title: title.trim(), description, order: parseInt(order, 10) || 0, audioUrl, module: module._id });
  res.redirect(`/teacher/courses/${course._id}`);
};

exports.showEditLesson = async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, teacher: req.user._id });
  if (!course) return res.redirect('/teacher/dashboard');
  const lesson = await Lesson.findOne({ _id: req.params.lessonId, module: req.params.moduleId });
  if (!lesson) return res.redirect(`/teacher/courses/${course._id}`);

  res.render('teacher/lesson-form', {
    title: 'Edit Lesson', user: req.user, isEdit: true,
    courseId: course._id, courseTitle: course.title, moduleId: req.params.moduleId, lesson,
  });
};

exports.handleEditLesson = async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, teacher: req.user._id });
  if (!course) { if (req.file) fs.unlinkSync(req.file.path); return res.redirect('/teacher/dashboard'); }

  const lesson = await Lesson.findOne({ _id: req.params.lessonId, module: req.params.moduleId });
  if (!lesson) { if (req.file) fs.unlinkSync(req.file.path); return res.redirect(`/teacher/courses/${course._id}`); }

  const { title, description, order } = req.body;
  const updateData = { title: (title || '').trim(), description, order: parseInt(order, 10) || 0 };

  if (req.file) {
    if (lesson.audioUrl) {
      const oldPath = path.join(process.cwd(), lesson.audioUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    updateData.audioUrl = `/uploads/audio/${req.file.filename}`;
  }

  await Lesson.findByIdAndUpdate(lesson._id, updateData);
  res.redirect(`/teacher/courses/${course._id}`);
};

exports.handleDeleteLesson = async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, teacher: req.user._id });
  if (!course) return res.redirect('/teacher/dashboard');

  const lesson = await Lesson.findOneAndDelete({ _id: req.params.lessonId, module: req.params.moduleId });
  if (lesson && lesson.audioUrl) {
    const p = path.join(process.cwd(), lesson.audioUrl);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  if (lesson) await Quiz.findOneAndDelete({ lesson: lesson._id });

  res.redirect(`/teacher/courses/${course._id}`);
};

// ── Quiz management ───────────────────────────────────────────────────────────

exports.showQuizForm = async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, teacher: req.user._id });
  if (!course) return res.redirect('/teacher/dashboard');
  const lesson = await Lesson.findOne({ _id: req.params.lessonId, module: req.params.moduleId });
  if (!lesson) return res.redirect(`/teacher/courses/${course._id}`);

  const quiz = await Quiz.findOne({ lesson: lesson._id }).lean();

  res.render('teacher/quiz-form', {
    title: quiz ? 'Edit Quiz' : 'Create Quiz',
    user: req.user,
    courseId: course._id,
    courseTitle: course.title,
    moduleId: req.params.moduleId,
    lessonId: lesson._id,
    lessonTitle: lesson.title,
    quiz,
  });
};

exports.handleQuizForm = async (req, res) => {
  const course = await Course.findOne({ _id: req.params.courseId, teacher: req.user._id });
  if (!course) return res.redirect('/teacher/dashboard');
  const lesson = await Lesson.findOne({ _id: req.params.lessonId, module: req.params.moduleId });
  if (!lesson) return res.redirect(`/teacher/courses/${course._id}`);

  // Parse questions from form body (questions[0][text], questions[0][options][0], etc.)
  const rawQuestions = req.body.questions;
  if (!rawQuestions || !Array.isArray(rawQuestions) || rawQuestions.length !== 5) {
    return res.render('teacher/quiz-form', {
      title: 'Quiz', user: req.user,
      courseId: course._id, courseTitle: course.title,
      moduleId: req.params.moduleId, lessonId: lesson._id, lessonTitle: lesson.title,
      quiz: req.body,
      flash: { error: 'All 5 questions must be filled in.' },
    });
  }

  const questions = rawQuestions.map((q) => ({
    text: (q.text || '').trim(),
    options: Array.isArray(q.options) ? q.options.map((o) => (o || '').trim()) : [],
    correctOption: parseInt(q.correctOption, 10),
  }));

  const isValid = questions.every(
    (q) => q.text && q.options.length === 4 && q.options.every(Boolean) && q.correctOption >= 0 && q.correctOption <= 3
  );

  if (!isValid) {
    return res.render('teacher/quiz-form', {
      title: 'Quiz', user: req.user,
      courseId: course._id, courseTitle: course.title,
      moduleId: req.params.moduleId, lessonId: lesson._id, lessonTitle: lesson.title,
      quiz: { questions },
      flash: { error: 'Please fill in all question texts and options.' },
    });
  }

  const existing = await Quiz.findOne({ lesson: lesson._id });
  if (existing) {
    await Quiz.findByIdAndUpdate(existing._id, { questions }, { runValidators: true });
  } else {
    await Quiz.create({ lesson: lesson._id, questions });
  }

  res.redirect(`/teacher/courses/${course._id}`);
};
