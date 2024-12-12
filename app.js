const express = require('express');
const AppError = require('./utils/appError');
const globalErrorHandling = require('./controllers/errorController');
const userRouter = require('./routes/userRoutes');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());

const allowCorsAccess = (app) => {
  const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  app.use(cors(corsOptions));
};

allowCorsAccess(app);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

console.log(process.env.NODE_ENV);

app.use('/api/v1/users', userRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandling);
module.exports = app;
