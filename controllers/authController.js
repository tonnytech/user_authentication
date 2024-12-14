const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/email');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

//=== === === === Email confirmation === === === === ===

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

const createSendToken = (user, statusCode, res, type) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: 'None',
    secure: true, // Must be true with SameSite: 'None'
  };

  // if (process.env.NODE_ENV.startsWith('prod')) cookieOptions.secure = true;

  if (type === 'signup') {
    res.cookie('jwtAuthenticateWebUserData', token, cookieOptions);
    res.redirect(`${process.env.FRONTEND_URL}/?success=true`);
  } else {
    res.cookie('jwtAuthenticateWebUserData', token, cookieOptions);
    res.status(statusCode).json({
      status: 'Success',
      data: {
        user,
      },
    });
  }
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

  createSendToken(newUser, 201, res, 'signup');
});

//===================user login======================

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('username or password is incorrect', 401));
  }
  createSendToken(user, 200, res, 'login');
});

//==================logout=========================

exports.logout = (req, res, next) => {
  res.cookie('jwtAuthenticateWebUserData', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    sameSite: 'None',
    secure: true,
  });
  res.status(200).json({ status: 'success' });
};

//===================================================

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError('User with this email does not exist', 404));
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later')
    );
  }
});

//=================================================================================

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwtAuthenticateWebUserData) {
    req.cookies && req.cookies.jwtAuthenticateWebUserData
      ? (token = req.cookies.jwtAuthenticateWebUserData)
      : (token = req.userCookie);
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in', 401));
  }
  const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const freshUser = await User.findById(decode.id);

  if (!freshUser) {
    return next(
      new AppError(
        'The user who had been asigned this token nolonger exists!',
        401
      )
    );
  }

  if (freshUser.changedPasswordAfter(decode.iat)) {
    return next(
      new AppError('User recently changed password. Please login again', 401)
    );
  }

  req.user = freshUser;

  next();
});
