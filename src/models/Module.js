const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Module title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

moduleSchema.virtual('lessons', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'module',
});

module.exports = mongoose.model('Module', moduleSchema);
