function getTokenFromCookies(cookieString) {
  if (!cookieString) return null;
  
  const cookies = cookieString.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});
  
  return cookies.token || null;
}

module.exports = {
  getTokenFromCookies
};