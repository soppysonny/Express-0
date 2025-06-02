const env = {
  isDev: process.env.NODE_ENV !== 'production',
  env: process.env.NODE_ENV || 'development'
};

module.exports = env;

/**
 router.get('/', (req, res) => {
  if (req.app.locals.env.isDev) {
    console.log('Debug mode');
  }
});

if env.isDev
  p Debug Environment
else
  p Production Environment

 */