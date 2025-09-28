// Debug script to test login functionality
const axios = require('axios');

const API_URL = 'http://finance-tracker-alb-996193229.ap-southeast-1.elb.amazonaws.com';

async function testLogin() {
  try {
    console.log('Testing login with your credentials...');
    
    const credentials = {
      email: 'khorzhenwin@gmail.com',
      password: 'Swampfire123_'
    };
    
    // Configure axios like the frontend does
    axios.defaults.baseURL = API_URL;
    
    const response = await axios.post('/api/auth/login/', credentials);
    
    console.log('✅ Login successful!');
    console.log('User:', response.data.user);
    console.log('Access token received:', !!response.data.access);
    console.log('Response keys:', Object.keys(response.data));
    
  } catch (error) {
    console.error('❌ Login failed:');
    console.error('Error message:', error.message);
    console.error('Response data:', error.response?.data);
    console.error('Status:', error.response?.status);
  }
}

testLogin();
