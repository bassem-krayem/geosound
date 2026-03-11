const express = require('express');
const { body } = require('express-validator');
const moduleController = require('../controllers/moduleController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(protect);

router
  .route('/')
  .get(moduleController.getModules)
  .post(
    restrictTo('teacher'),
    [body('title').trim().notEmpty().withMessage('Module title is required')],
    moduleController.createModule
  );

router
  .route('/:id')
  .get(moduleController.getModule)
  .patch(restrictTo('teacher'), moduleController.updateModule)
  .delete(restrictTo('teacher'), moduleController.deleteModule);

module.exports = router;
