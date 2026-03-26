'use strict';

const LEGACY_TO_CURRENT = {
  student: 'pupil',
};

const LEARNER_ROLES = new Set(['student', 'pupil']);

const normalizeRole = (role) => LEGACY_TO_CURRENT[role] || role;

const isLearnerRole = (role) => LEARNER_ROLES.has(role);

const expandRole = (role) => {
  if (role === 'pupil' || role === 'student') return ['pupil', 'student'];
  return [role];
};

module.exports = {
  normalizeRole,
  isLearnerRole,
  expandRole,
};
