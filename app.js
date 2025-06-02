var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var registerRouter = require('./routes/register');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/register', registerRouter);


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.post('/user/register', async function(req, res) {
  console.log('/user/register:', req.body, 'from IP:', req.ip);
  
  const { code, phone } = req.body;
  const validCode = await VerificationCode.findOne({ 
    where: { code, phone, expires_at: { [Op.gt]: new Date() } }
  });
  if(validCode) {
    // 创建或更新用户
    res.send({ message: 'Data received successfully,' + req.ip, data: req.body });
  } else {

  }
});

app.post('/api/submit', function(req, res) {
  console.log('Received data:', req.body, 'from IP:', req.ip);
  // res.json({ message: 'Data received successfully', data: req.body });
  res.send({ message: 'Data received successfully,' + req.ip, data: req.body });
});

app.get('/api/submit', function(req, res) {
  console.log('Received data:', req.body, 'from IP:', req.ip);
  // res.send({ message: 'Data received successfully,' + req.ip, data: req.body });
res.json({ message: 'Data received successfully,' + req.ip, data: req.body});
});



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

module.exports = app;
