import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import FileParserService from './services/fileParserService';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// 文件解析服务实例
const fileParserService = new FileParserService();

// 配置multer用于文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FileParserService.getMaxFileSize(), // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (FileParserService.isSupportedFileType(file.originalname, file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式'));
    }
  }
});

// 基础中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 任务状态存储（生产环境应使用Redis等）
const taskStatus = new Map<string, any>();

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Key验证端点（演示模式）
app.post('/api/ai/validate-key', (req, res) => {
  const { apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({
      success: false,
      message: 'API密钥不能为空'
    });
  }

  // 演示模式：接受任何非空密钥
  return res.json({
    success: true,
    message: 'API密钥验证成功',
    isDemo: true
  });
});

// 文件解析端点（支持文件上传和文本内容）
app.post('/api/ai/parse-quiz', upload.single('file'), async (req, res) => {
  try {
    const { fileContent, fileName, order } = req.body;
    const uploadedFile = req.file;
    
    let parsedContent = '';
    let actualFileName = fileName || 'unknown.txt';
    
    if (uploadedFile) {
      // 处理上传的文件
      console.log(`处理上传文件: ${uploadedFile.originalname}, 大小: ${FileParserService.formatFileSize(uploadedFile.size)}`);
      
      const parseResult = await fileParserService.parseFile(
        uploadedFile.buffer,
        uploadedFile.originalname,
        uploadedFile.mimetype
      );
      
      parsedContent = parseResult.text;
      actualFileName = uploadedFile.originalname;
      
      console.log(`文件解析完成: ${parseResult.metadata?.wordCount} 个单词`);
    } else if (fileContent) {
      // 处理文本内容
      parsedContent = fileContent;
      console.log(`处理文本内容: ${parsedContent.length} 个字符`);
    } else {
      return res.status(400).json({
        success: false,
        message: '请提供文件或文本内容'
      });
    }

    if (!parsedContent.trim()) {
      return res.status(400).json({
        success: false,
        message: '文件内容为空或无法解析'
      });
    }

    // 生成任务ID
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 存储任务状态
    taskStatus.set(taskId, {
      status: 'processing',
      progress: 0,
      fileName: actualFileName,
      order,
      content: parsedContent,
      startTime: new Date().toISOString()
    });
    
    // 模拟异步处理
    setTimeout(async () => {
      try {
        // 更新进度
        const task = taskStatus.get(taskId);
        if (task) {
          task.progress = 50;
          task.status = 'generating';
          taskStatus.set(taskId, task);
        }
        
        // 模拟生成HTML（这里会在实际实现中调用Gemini API）
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const demoHtml = generateDemoQuizHtml(actualFileName, parsedContent, order);
        
        // 完成任务
        const finalTask = taskStatus.get(taskId);
        if (finalTask) {
          finalTask.status = 'completed';
          finalTask.progress = 100;
          finalTask.result = {
            html: demoHtml,
            questionCount: 3, // 演示数据
            generatedAt: new Date().toISOString()
          };
          taskStatus.set(taskId, finalTask);
        }
        
        console.log(`任务完成: ${taskId}`);
      } catch (error) {
        console.error(`任务失败: ${taskId}`, error);
        const failedTask = taskStatus.get(taskId);
        if (failedTask) {
          failedTask.status = 'failed';
          failedTask.error = error instanceof Error ? error.message : '处理失败';
          taskStatus.set(taskId, failedTask);
        }
      }
    }, 1000);

    return res.json({
      success: true,
      taskId,
      message: '文件解析任务已创建',
      estimatedTime: '2-5秒'
    });
  } catch (error) {
    console.error('文件解析错误:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '文件解析失败'
    });
  }
});

// 查询解析状态端点
app.get('/api/ai/parse-status/:taskId', (req, res) => {
  const { taskId } = req.params;
  
  const task = taskStatus.get(taskId);
  
  if (!task) {
    return res.status(404).json({
      success: false,
      message: '任务不存在'
    });
  }

  return res.json({
    success: true,
    status: task.status,
    progress: task.progress,
    result: task.result,
    error: task.error
  });
});

// 生成演示HTML的函数
function generateDemoQuizHtml(fileName: string, content: string, order: string): string {
  const title = fileName.replace(/\.[^/.]+$/, ""); // 移除文件扩展名
  const wordCount = content.trim().split(/\s+/).length;
  const estimatedQuestions = Math.min(Math.max(Math.floor(wordCount / 20), 3), 10); // 根据内容估算题目数量

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - 智能题库系统</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Microsoft YaHei', 'PingFang SC', 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            line-height: 1.6;
        }
        .container { max-width: 900px; margin: 0 auto; padding: 20px; }
        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .header p { font-size: 1.1rem; opacity: 0.9; }
        .quiz-card {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.1), 0 5px 15px rgba(0,0,0,0.07);
            margin-bottom: 20px;
            backdrop-filter: blur(10px);
        }
        .question {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 25px;
            color: #2c3e50;
            line-height: 1.5;
        }
        .options { list-style: none; margin: 0; padding: 0; }
        .option {
            margin: 12px 0;
            padding: 18px 24px;
            background: linear-gradient(145deg, #f8f9fa, #e9ecef);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 2px solid transparent;
            font-size: 16px;
            position: relative;
            overflow: hidden;
        }
        .option::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            transition: left 0.5s;
        }
        .option:hover::before { left: 100%; }
        .option:hover {
            background: linear-gradient(145deg, #e3f2fd, #bbdefb);
            transform: translateX(8px) translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            border-color: #2196f3;
        }
        .option.selected {
            background: linear-gradient(145deg, #2196f3, #1976d2);
            color: white;
            transform: translateX(8px) translateY(-2px);
            box-shadow: 0 8px 25px rgba(33, 150, 243, 0.4);
        }
        .option.correct {
            background: linear-gradient(145deg, #4caf50, #388e3c);
            color: white;
            animation: correctPulse 0.6s ease-in-out;
        }
        .option.wrong {
            background: linear-gradient(145deg, #f44336, #d32f2f);
            color: white;
            animation: wrongShake 0.6s ease-in-out;
        }
        @keyframes correctPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        @keyframes wrongShake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        .controls { text-align: center; margin-top: 40px; }
        .btn {
            padding: 15px 35px;
            margin: 0 15px;
            border: none;
            border-radius: 30px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-transform: uppercase;
            letter-spacing: 1px;
            position: relative;
            overflow: hidden;
        }
        .btn::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            background: rgba(255,255,255,0.3);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: width 0.3s, height 0.3s;
        }
        .btn:hover::before {
            width: 300px;
            height: 300px;
        }
        .btn-primary {
            background: linear-gradient(145deg, #2196f3, #1976d2);
            color: white;
            box-shadow: 0 4px 15px rgba(33, 150, 243, 0.4);
        }
        .btn-primary:hover {
            background: linear-gradient(145deg, #1976d2, #1565c0);
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(33, 150, 243, 0.6);
        }
        .btn-success {
            background: linear-gradient(145deg, #4caf50, #388e3c);
            color: white;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
        }
        .btn-success:hover {
            background: linear-gradient(145deg, #388e3c, #2e7d32);
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(76, 175, 80, 0.6);
        }
        .progress {
            background: rgba(255,255,255,0.2);
            border-radius: 15px;
            height: 8px;
            margin: 25px 0;
            overflow: hidden;
            backdrop-filter: blur(10px);
        }
        .progress-bar {
            background: linear-gradient(90deg, #4caf50, #8bc34a);
            height: 100%;
            transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 15px;
            box-shadow: 0 2px 10px rgba(76, 175, 80, 0.4);
        }
        .score {
            text-align: center;
            font-size: 28px;
            font-weight: 700;
            color: #2c3e50;
            margin: 30px 0;
            animation: scoreAppear 0.8s ease-out;
        }
        @keyframes scoreAppear {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .info {
            background: rgba(255,255,255,0.15);
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 25px;
            color: white;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }
        .info p { margin: 5px 0; font-size: 14px; }
        .info strong { color: #fff; }

        /* 响应式设计 */
        @media (max-width: 768px) {
            .container { padding: 15px; }
            .quiz-card { padding: 25px; border-radius: 15px; }
            .header h1 { font-size: 2rem; }
            .question { font-size: 18px; }
            .option { padding: 15px 20px; font-size: 15px; }
            .btn { padding: 12px 25px; font-size: 14px; margin: 0 8px; }
        }

        /* 深色模式支持 */
        @media (prefers-color-scheme: dark) {
            .quiz-card { background: rgba(255,255,255,0.95); }
        }

        /* 动画定义 */
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }

        /* 打印样式 */
        @media print {
            body { background: white !important; }
            .container { max-width: none !important; }
            .header { color: black !important; }
            .btn { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 ${title}</h1>
            <p>基于AI解析生成的专业题库</p>
        </div>
        
        <div class="info">
            <p><strong>📄 文件名:</strong> ${fileName}</p>
            <p><strong>🔀 出题顺序:</strong> ${order}</p>
            <p><strong>📊 内容统计:</strong> ${wordCount} 个单词，预估 ${estimatedQuestions} 道题目</p>
            <p><strong>🕒 生成时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
            <p><strong>🤖 技术支持:</strong> 智能题库系统 AI 解析引擎</p>
        </div>
        
        <div class="progress">
            <div class="progress-bar" id="progressBar"></div>
        </div>
        
        <div class="quiz-card" id="quizCard">
            <div class="question" id="question">正在加载题目...</div>
            <ul class="options" id="options"></ul>
            <div class="controls">
                <button class="btn btn-primary" id="nextBtn" onclick="nextQuestion()">下一题</button>
                <button class="btn btn-success" id="finishBtn" onclick="finishQuiz()" style="display:none;">完成练习</button>
            </div>
        </div>
        
        <div class="score" id="scoreDisplay" style="display:none;"></div>
    </div>

    <script>
        // 基于文件内容生成的示例题目（实际应用中会通过AI解析生成）
        const questions = generateSampleQuestions("${title}", ${estimatedQuestions});

        function generateSampleQuestions(title, count) {
            const sampleQuestions = [
                {
                    question: \`关于"\${title}"的核心概念，以下哪个描述最准确？\`,
                    options: ["这是一个基础概念", "这是一个高级概念", "这是一个实践概念", "这是一个理论概念"],
                    correct: 0,
                    explanation: "基于文件内容分析得出的答案解释"
                },
                {
                    question: \`在"\${title}"的学习过程中，最重要的是什么？\`,
                    options: ["理论基础", "实践应用", "逻辑思维", "综合运用"],
                    correct: 3,
                    explanation: "综合运用能力是学习的最终目标"
                },
                {
                    question: \`"\${title}"的主要特点包括哪些方面？\`,
                    options: ["结构化特征", "功能性特征", "应用性特征", "以上都是"],
                    correct: 3,
                    explanation: "通常包含多个方面的特征"
                },
                {
                    question: \`如何更好地掌握"\${title}"相关知识？\`,
                    options: ["多读多记", "多练多用", "多思多问", "以上都对"],
                    correct: 3,
                    explanation: "学习需要多方面结合"
                },
                {
                    question: \`"\${title}"在实际应用中的价值体现在？\`,
                    options: ["提高效率", "解决问题", "创新发展", "以上都是"],
                    correct: 3,
                    explanation: "实际应用价值是多方面的"
                }
            ];

            return sampleQuestions.slice(0, Math.max(count, 3));
        }
        
        let currentQuestion = 0;
        let score = 0;
        let selectedAnswer = -1;
        
        function loadQuestion() {
            const q = questions[currentQuestion];
            const questionEl = document.getElementById('question');
            questionEl.innerHTML = \`
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <span style="font-size: 14px; color: #666; font-weight: normal;">第 \${currentQuestion + 1} 题 / 共 \${questions.length} 题</span>
                    <span style="font-size: 14px; color: #666; font-weight: normal;">⏱️ 不限时</span>
                </div>
                <div style="font-size: 20px; font-weight: 600; color: #2c3e50; line-height: 1.5;">
                    \${q.question}
                </div>
            \`;

            const optionsEl = document.getElementById('options');
            optionsEl.innerHTML = '';

            q.options.forEach((option, index) => {
                const li = document.createElement('li');
                li.className = 'option';
                li.innerHTML = \`
                    <span style="font-weight: 600; margin-right: 12px; color: #666;">\${String.fromCharCode(65 + index)}</span>
                    <span>\${option}</span>
                \`;
                li.onclick = () => selectOption(index);
                optionsEl.appendChild(li);
            });

            updateProgress();
            selectedAnswer = -1;

            // 添加淡入动画
            questionEl.style.opacity = '0';
            optionsEl.style.opacity = '0';
            setTimeout(() => {
                questionEl.style.transition = 'opacity 0.5s ease-in-out';
                optionsEl.style.transition = 'opacity 0.5s ease-in-out';
                questionEl.style.opacity = '1';
                optionsEl.style.opacity = '1';
            }, 100);
        }
        
        function selectOption(index) {
            const options = document.querySelectorAll('.option');
            options.forEach(opt => opt.classList.remove('selected'));
            options[index].classList.add('selected');
            selectedAnswer = index;
        }
        
        function nextQuestion() {
            if (selectedAnswer === -1) {
                showNotification('请选择一个答案！', 'warning');
                return;
            }

            const q = questions[currentQuestion];
            const options = document.querySelectorAll('.option');
            const nextBtn = document.getElementById('nextBtn');

            // 禁用按钮防止重复点击
            nextBtn.disabled = true;
            nextBtn.textContent = '正在检查...';

            options.forEach((opt, index) => {
                opt.style.pointerEvents = 'none'; // 禁用选项点击
                if (index === q.correct) {
                    opt.classList.add('correct');
                } else if (index === selectedAnswer && index !== q.correct) {
                    opt.classList.add('wrong');
                }
            });

            const isCorrect = selectedAnswer === q.correct;
            if (isCorrect) {
                score++;
                showNotification('回答正确！', 'success');
            } else {
                showNotification(\`回答错误！正确答案是 \${String.fromCharCode(65 + q.correct)}\`, 'error');
            }

            // 显示解释（如果有）
            if (q.explanation) {
                setTimeout(() => {
                    showNotification(\`💡 解释：\${q.explanation}\`, 'info');
                }, 1000);
            }

            setTimeout(() => {
                currentQuestion++;
                if (currentQuestion < questions.length) {
                    loadQuestion();
                    nextBtn.disabled = false;
                    nextBtn.textContent = '下一题';
                } else {
                    showResults();
                }
            }, 2500);
        }

        function showNotification(message, type) {
            const notification = document.createElement('div');
            notification.style.cssText = \`
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                z-index: 1000;
                animation: slideIn 0.3s ease-out;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            \`;

            const colors = {
                success: '#4caf50',
                error: '#f44336',
                warning: '#ff9800',
                info: '#2196f3'
            };

            notification.style.background = colors[type] || colors.info;
            notification.textContent = message;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 3000);
        }
        
        function updateProgress() {
            const progress = ((currentQuestion) / questions.length) * 100;
            document.getElementById('progressBar').style.width = progress + '%';
        }
        
        function showResults() {
            document.getElementById('quizCard').style.display = 'none';
            const scoreEl = document.getElementById('scoreDisplay');
            const percentage = Math.round((score/questions.length)*100);

            let emoji = '🎉';
            let message = '恭喜完成！';
            let level = '优秀';

            if (percentage >= 90) {
                emoji = '🏆';
                message = '完美表现！';
                level = '优秀';
            } else if (percentage >= 80) {
                emoji = '🎯';
                message = '表现良好！';
                level = '良好';
            } else if (percentage >= 60) {
                emoji = '📚';
                message = '继续努力！';
                level = '及格';
            } else {
                emoji = '💪';
                message = '加油练习！';
                level = '需要提高';
            }

            scoreEl.style.display = 'block';
            scoreEl.innerHTML = \`
                <div style="background: white; border-radius: 20px; padding: 40px; box-shadow: 0 15px 35px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="font-size: 4rem; margin-bottom: 15px;">\${emoji}</div>
                        <h2 style="color: #2c3e50; margin-bottom: 10px; font-size: 2rem;">\${message}</h2>
                        <p style="color: #666; font-size: 1.1rem;">练习完成情况统计</p>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                        <div style="text-align: center; padding: 20px; background: linear-gradient(145deg, #e3f2fd, #bbdefb); border-radius: 15px;">
                            <div style="font-size: 2rem; font-weight: bold; color: #1976d2;">\${score}</div>
                            <div style="color: #666; margin-top: 5px;">正确题数</div>
                        </div>
                        <div style="text-align: center; padding: 20px; background: linear-gradient(145deg, #f3e5f5, #ce93d8); border-radius: 15px;">
                            <div style="font-size: 2rem; font-weight: bold; color: #7b1fa2;">\${questions.length}</div>
                            <div style="color: #666; margin-top: 5px;">总题数</div>
                        </div>
                        <div style="text-align: center; padding: 20px; background: linear-gradient(145deg, #e8f5e8, #a5d6a7); border-radius: 15px;">
                            <div style="font-size: 2rem; font-weight: bold; color: #388e3c;">\${percentage}%</div>
                            <div style="color: #666; margin-top: 5px;">正确率</div>
                        </div>
                        <div style="text-align: center; padding: 20px; background: linear-gradient(145deg, #fff3e0, #ffcc02); border-radius: 15px;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #f57c00;">\${level}</div>
                            <div style="color: #666; margin-top: 5px;">评价等级</div>
                        </div>
                    </div>

                    <div style="text-align: center;">
                        <button class="btn btn-primary" onclick="location.reload()" style="margin-right: 15px;">
                            🔄 重新练习
                        </button>
                        <button class="btn btn-success" onclick="window.print()">
                            🖨️ 打印结果
                        </button>
                    </div>

                    <div style="margin-top: 25px; padding: 20px; background: #f8f9fa; border-radius: 10px; text-align: center;">
                        <p style="color: #666; margin: 0; font-size: 14px;">
                            📊 本次练习基于 <strong>"${fileName}"</strong> 生成 |
                            🤖 由智能题库系统提供技术支持
                        </p>
                    </div>
                </div>
            \`;
        }
        
        loadQuestion();
    </script>
</body>
</html>`;
}

// 错误处理
app.use((err: any, req: any, res: any, next: any) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: err.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    path: req.path
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 增强后端服务启动成功`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n📋 可用的API端点:`);
  console.log(`  GET    http://localhost:${PORT}/health`);
  console.log(`  POST   http://localhost:${PORT}/api/ai/validate-key`);
  console.log(`  POST   http://localhost:${PORT}/api/ai/parse-quiz (支持文件上传)`);
  console.log(`  GET    http://localhost:${PORT}/api/ai/parse-status/:taskId`);
  console.log(`\n📁 支持的文件格式: Word, Excel, PDF, TXT, Markdown`);
  console.log(`📏 文件大小限制: ${FileParserService.formatFileSize(FileParserService.getMaxFileSize())}`);
});
