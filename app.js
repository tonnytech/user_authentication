const express = require('express');
const AppError = require('./utils/appError');
const globalErrorHandling = require('./controllers/errorController');
const userRouter = require('./routes/userRoutes');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
app.use(cookieParser());
app.use(express.json());

// const allowCorsAccess = (app) => {
//   const corsOptions = {
//     origin: '*',
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//   };

//   app.use(cors(corsOptions));
// };

// allowCorsAccess(app);

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// app.use((req, res, next) => {
//   console.log('cookie from the app.js', req.cookies.jwt);
//   req.userCookie = req.cookies.jwt;
//   next();
// });

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res)=>{
  res.status(200).json({
    message: 'Server is active'
  })
})
app.use('/api/v1/users', userRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandling);
module.exports = app;
