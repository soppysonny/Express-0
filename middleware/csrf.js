const csrf = require('csurf');

const csrfProtection = csrf({ 
  cookie: true,
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS']
});

module.exports = csrfProtection;