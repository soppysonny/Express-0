var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const env = require('./config/env');
const connectDB = require('./Config/database');
const session = require('express-session');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var registerRouter = require('./routes/register');
const adminRouter = require('./routes/admin');
const musicRouter = require('./routes/music');

var app = express();
app.locals.env = env;

// Connect to MongoDB before starting the server
const startServer = async () => {
  try {
    await connectDB();
    
    const port = process.env.PORT || 3001;
    const server = app.listen(port);
    
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying ${port + 1}`);
        server.listen(port + 1);
      } else {
        console.error('Server error:', error);
      }
    });

    server.on('listening', () => {
      const addr = server.address();
      console.log(`Server running on port ${addr.port}`);
    });

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Add session middleware BEFORE route handlers
app.use(session({
  secret: 'your-secret-key',
  resave: true,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 1000 // 1 hour
  }
}));

// Trust specific proxies
app.set('trust proxy', ['127.0.0.1', '::1']);

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/register', registerRouter);
app.use('/admin', adminRouter);
app.use('/music', musicRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
