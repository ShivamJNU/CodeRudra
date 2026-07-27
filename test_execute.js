const axios = require('axios');

async function test() {
  try {
    console.log('1. Attempting Developer Bypass Login...');
    const loginRes = await axios.post('http://localhost:5000/auth/google', { token: 'dev-token' });
    const token = loginRes.data.accessToken;
    console.log('Login Success!');

    const languages = ['cpp', 'java', 'python'];
    for (const lang of languages) {
      console.log(`\nTesting POST /execute for language: ${lang}...`);
      const execRes = await axios.post(
        'http://localhost:5000/execute',
        {
          sourceCode: 'mock source code',
          language: lang,
          input: 'mock input'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log(`Status for ${lang}:`, execRes.data.status);
    }
  } catch (err) {
    console.error('\n❌ Execution Failed!');
    if (err.response) {
      console.error('Response Status:', err.response.status);
      console.error('Response Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error Message:', err.message);
    }
  }
}

test();
