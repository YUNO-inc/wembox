const Notification = require('../../models/notification/notificationModel');
const AppError = require('../../utilities/AppError');
const catchAsync = require('../../utilities/catchAsync');

exports.getNotifications = catchAsync(async (req, res, next) => {
  const userId = req.user?._id;
  if (!userId) return next(new AppError('User not found', 404));
  const notifications = await Notification.find({ for: userId })
    .populate('sender', 'name profileImage username')
    .populate('message', 'message status contactRequest.status createdAt');

  res.status(200).json({
    status: 'success',
    notifications,
  });
});
