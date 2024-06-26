const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const usersController = require('../controllers/user/usersController');

router.route('/data-exists').post(authController.dataExists);

router.route('/signup/send-email-otp').post(authController.sendEmailOtp);
router.route('/signup/verify-email-otp').post(authController.verifyEmailOtp);

router.route('/signup').post(authController.recaptcha, authController.signup);

router.route('/login').post(authController.login);
router.route('/forgot-password').post(authController.forgotPassword);
router.route('/reset-password/:token').patch(authController.resetPassword);

router.use(authController.protect);

router.route('/logout').get(authController.logout); // the logout route is protected
router.route('/signup').patch(usersController.setInterests);

router.route('/user/:username').get(usersController.getUser);
router
  .route('/me')
  .get(usersController.getMe)
  .patch(
    usersController.uploadProfileImages,
    usersController.resizeUserPhoto,
    usersController.updateMe
  );

router
  .route('/')
  .get(
    authController.restrictTo('admin', 'senior-admin'),
    usersController.getAllUsers
  );
//-- <> -- //
module.exports = router;
