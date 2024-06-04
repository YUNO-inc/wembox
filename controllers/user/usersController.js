const multer = require('multer');
const User = require('../../models/user/userModel');
const {
  multerStorage,
  multerFilter,
  updateChosenAtSignup,
} = require('./helpers');
const factory = require('../handlerFactory');
const ImageFile = require('../../utilities/imageFileManager');
const AppError = require('../../utilities/AppError');
const catchAsync = require('../../utilities/catchAsync');
const UserAggregations = require('../../models/user/aggregation');
const { PROFILE_IMAGE_PREFIX, PROFILE_COVER_IMAGE_PREFIX } = process.env;

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadProfileImages = upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'profileCoverImage', maxCount: 1 },
]);

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  let { profileImage, profileCoverImage } = req.files;
  console.log('req.files: ', req.files);
  console.log('req.body: ', req.body);
  if (!profileImage && !profileCoverImage) return next();

  const userID = req.user._id;
  profileImage = new ImageFile({
    image: profileImage[0],
    uniqueID: userID,
    prefix: PROFILE_IMAGE_PREFIX,
  });
  profileCoverImage = new ImageFile({
    image: profileCoverImage[0],
    uniqueID: userID,
    prefix: PROFILE_COVER_IMAGE_PREFIX,
    resize: [2000, 650],
  });

  await Promise.all([
    profileImage.uploadToAWS(),
    profileCoverImage.uploadToAWS(),
  ]);

  req.body.profileImage = profileImage.imageName;
  req.body.profileCoverImage = profileCoverImage.imageName;
  next();
});

exports.getAllUsers = factory.findAll(User);

exports.getUser = catchAsync(async (req, res, next) => {
  const username = req.params.username.toLowerCase();

  const USER_AGG = new UserAggregations(req.user._id);
  const user = await User.aggregate([
    {
      $match: {
        username,
      },
    },
    {
      $lookup: USER_AGG.getIsFollowing(),
    },
    {
      $addFields: USER_AGG.setIsFollowed(),
    },
    {
      $lookup: USER_AGG.getIsInContact(),
    },
    {
      $addFields: USER_AGG.setIsInContact(),
    },
    {
      $project: {
        ...USER_AGG.defaultProject,
        numberOfFollowers: 1,
        numberOfFollowing: 1,
        profileCoverImage: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    user: user[0],
  });
});

exports.getMe = catchAsync(async (req, res, next) => {
  const currentUser = req.user;
  res.status(200).json({
    status: 'success',
    currentUser,
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  const userID = req.user._id;
  let { profileImage, profileCoverImage, username, name, note } = req.body;

  if (!(profileImage || profileCoverImage || username || name || note))
    return next(new AppError('No data to update was specified.', 401));

  const updateArray = [
    { name: 'profileImage', value: profileImage },
    { name: 'profileCoverImage', value: profileCoverImage },
    { name: 'username', value: username },
    { name: 'name', value: name },
    { name: 'note', value: note },
  ];
  const updates = updateArray.reduce((acc, update) => {
    const { name, value } = update;
    if (value) acc[name] = value;
    return acc;
  }, {});

  const newUser = await User.findByIdAndUpdate({ _id: userID }, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    user: newUser,
  });
});

// IMG Handling with AWS or its like would be done before initial organic Advertising.
exports.setInterests = catchAsync(async (req, res, next) => {
  const userID = req.user._id;
  let { interests } = req.body;
  const contentType = interests;

  if (!interests?.length)
    return next(new AppError('No interests was specified.', 401));

  const update = { interests, contentType };
  await User.findByIdAndUpdate({ _id: userID }, update);
  await updateChosenAtSignup(interests.map((interest) => interest.topic));

  res.status(200).json({
    status: 'success',
    update,
  });
});
