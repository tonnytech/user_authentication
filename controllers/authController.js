const User = require('../models/userModel')
const AppError = require('../utils/appError')

exports.signup = async(req, res) => {
let newUser = await User.create({
    name: req.body.name,
})

if (newUser) {
res.status(200).json({
    status: 'success',
    newUser,
})
} else {
 res.status(404).json({
    status: 'fail'
 })
}
}