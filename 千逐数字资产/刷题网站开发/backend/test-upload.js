const fs = require('fs');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testFileUpload() {
  try {
    console.log('🧪 测试文件上传功能...');
    
    // 创建测试文件
    const testContent = `
# 测试题库

## 选择题

1. JavaScript是什么类型的语言？
A. 编译型语言
B. 解释型语言
C. 汇编语言
D. 机器语言

答案：B

2. 以下哪个不是JavaScript的数据类型？
A. string
B. number
C. char
D. boolean

答案：C

## 填空题

1. JavaScript中声明变量使用关键字 _____ 或 _____。
答案：var, let

2. 函数的关键字是 _____。
答案：function
`;

    fs.writeFileSync('./test-quiz.txt', testContent);
    
    // 先注册用户
    console.log('📝 注册测试用户...');
    const registerResponse = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'testuser@example.com',
        password: 'password123',
        name: 'Test User'
      })
    });

    let token;
    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      token = registerData.data.token;
      console.log('✅ 用户注册成功');
    } else {
      // 如果注册失败，尝试登录
      console.log('🔄 尝试登录现有用户...');
      const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'testuser@example.com',
          password: 'password123'
        })
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        token = loginData.data.token;
        console.log('✅ 用户登录成功');
      } else {
        throw new Error('无法注册或登录用户');
      }
    }

    // 测试文件上传
    console.log('📤 测试文件上传...');
    const form = new FormData();
    form.append('file', fs.createReadStream('./test-quiz.txt'));
    form.append('title', '测试题库');
    form.append('description', '这是一个测试题库');

    const uploadResponse = await fetch('http://localhost:3001/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (uploadResponse.ok) {
      const uploadData = await uploadResponse.json();
      console.log('✅ 文件上传成功:', uploadData);
      
      // 检查任务状态
      const jobId = uploadData.data.jobId;
      console.log(`📋 检查任务状态 (ID: ${jobId})...`);
      
      const jobResponse = await fetch(`http://localhost:3001/api/job/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        console.log('✅ 任务状态查询成功:', jobData);
      } else {
        console.log('❌ 任务状态查询失败');
      }
    } else {
      const errorData = await uploadResponse.text();
      console.log('❌ 文件上传失败:', errorData);
    }

    // 清理测试文件
    fs.unlinkSync('./test-quiz.txt');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 等待服务器启动
setTimeout(testFileUpload, 2000);
