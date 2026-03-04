
import axios from 'axios';

async function testCategories() {
    const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
        email: 'test@example.com',
        password: 'password'
    });
    const token = loginRes.data.data.accessToken;
    console.log('Login successful, token retrieved.');

    const catRes = await axios.get('http://localhost:3000/api/v1/categories', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    console.log('Categories response:', JSON.stringify(catRes.data, null, 2));
}

testCategories().catch(e => console.error(e.response ? e.response.data : e.message));
