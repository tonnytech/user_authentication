const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.signup = catchAsync(async (req, res) => {
    const {name, email, password, passwordConfirm} = req.body
  let newUser = await User.create({ name, email, password, passwordConfirm });
  
  newUser.password = undefined;
  newUser.active = undefined;

  const url = `${req.protocol}://${req.get('host')}/me`;

  console.log(url)

  if (newUser) {
    res.status(200).json({
      status: 'success',
      newUser,
    });
  }
});
