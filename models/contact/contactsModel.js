const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    users: {
      type: [
        {
          type: mongoose.Schema.ObjectId,
          ref: 'User',
        },
      ],
      validate: {
        validator: function (value) {
          // Custom validator function to check uniqueness
          return (
            new Promise(async (resolve, reject) => {
              const count = await mongoose.models.Contact.countDocuments({
                users: value,
              });
              resolve(count === 0);
            }) && value.length === 2
          );
        },
        message:
          'Duplicate users in the contact schema or Users on the contact are less than 2.',
      },
    },
    lastMessage: {
      type: mongoose.Schema.ObjectId,
      ref: 'Chat',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

contactSchema.index({ users: 1, 'lastMessage.createdAt': 1 });

// Virtuals
contactSchema.virtual('otherUser', {
  ref: 'User',
  localField: 'users',
  foreignField: '_id',
  justOne: false,
});

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
