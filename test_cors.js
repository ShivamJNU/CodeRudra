const axios = require('axios');

async function testCors() {
  try {
    console.log('Sending preflight OPTIONS request to /execute...');
    const response = await axios({
      method: 'options',
      url: 'http://localhost:5000/execute',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization'
      }
    });

    console.log('Preflight OPTIONS Response Headers:');
    console.log(response.headers);
    
    console.log('\nAccess-Control-Allow-Origin:', response.headers['access-control-allow-origin']);
    console.log('Access-Control-Allow-Credentials:', response.headers['access-control-allow-credentials']);
  } catch (err) {
    console.error('❌ OPTIONS request failed:', err.message);
  }
}

testCors();
