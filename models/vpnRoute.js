const mongoose = require('mongoose');

const vpnRouteSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true
  },
  port: {
    type: String,
    required: true
  },
  alias: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  encryptionMethod: {
    type: String,
    required: true
  },
  extraInfo: {
    type: String,
    default: '{}'
  }
});

module.exports = mongoose.model('VpnRoute', vpnRouteSchema);