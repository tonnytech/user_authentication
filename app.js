const express = require('express');
const AppError = require('./utils/appError');
const globalErrorHandling = require('./controllers/errorController');
const userRouter = require('./routes/userRoutes');

const app = express();
app.use(express.json());

console.log(process.env.NODE_ENV);

app.use('/api/v1/users', userRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandling);
module.exports = app;
