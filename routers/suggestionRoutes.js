const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const suggestionController = require('../controllers/suggestionController');
const interestController = require('../controllers/userInterest/interestController');

router.use(authController.protect);
router.route('/test').get(suggestionController.getSuggestions);

router
  .route('/interests')
  .get(interestController.getAllInterests)
  .post(
    authController.restrictTo('senior-admin'),
    interestController.createInterests
  );

router.route('/creator/:topic?').get(suggestionController.suggestCreator);

//-- <> -- //
module.exports = router;
