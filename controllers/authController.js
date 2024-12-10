const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/email');
const jwt = require('jsonwebtoken');

//===============Email confirmation =========================

const unverifiedUsers = {};

exports.signup = catchAsync(async (req, res) => {
  const { name, email, password, passwordConfirm } = req.body;

  if (!name || !email || !password || !passwordConfirm) {
    return new AppError('Please fill up all the fields');
  }

  if (password !== passwordConfirm) {
    return new AppError('Your password and passwordconfirm are not the same');
  }

  try {
    // Check if the user already exists (verified or not)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'fail',
        message: 'User with this email already exists!',
      });
    } else {
      const token = jwt.sign(
        { name, email, password },
        process.env.JWT_SECRET,
        {
          expiresIn: '1h',
        }
      );

      unverifiedUsers[email] = { name, email, password };

      // verification URL
      const url = `${req.protocol}://${req.get(
        'host'
      )}/api/v1/users/verifyEmail/${token}`;

      const newUser = {
        name,
        email,
        password,
      };

      await new Email(newUser, url).sendWelcome();

      res.status(200).json({
        status: 'success',
        message:
          'Signup successful! Please check your email to confirm your account.',
      });
    }
  } catch (error) {
    return new AppError('Something went wrong!!!');
  }
});

//============create sign token=========================
const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_PERIOD,
  });
};

//================create send token ======================

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV.startsWith('prod')) cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'Success',
    token,
    data: {
      user,
    },
  });
};

//==================User signup=============================

exports.verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.params;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Retrieve user data from the temporary store
  const userData = unverifiedUsers[decoded.email];
  if (!userData) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid or expired token!',
    });
  }

  let newUser = await User.create(userData);

  // Remove user from the temporary store
  delete unverifiedUsers[decoded.email];

  newUser.password = undefined;
  newUser.active = undefined;

  createSendToken(newUser, 201, res);
});
