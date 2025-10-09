"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});
app.post('/api/ai/validate-key', (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) {
        return res.status(400).json({
            success: false,
            message: 'API密钥不能为空'
        });
    }
    return res.json({
        success: true,
        message: 'API密钥验证成功',
        isDemo: true
    });
});
app.post('/api/ai/parse-quiz', (req, res) => {
    const { fileContent, fileName, order } = req.body;
    if (!fileContent || !fileName) {
        return res.status(400).json({
            success: false,
            message: '文件内容和文件名不能为空'
        });
    }
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setTimeout(() => {
        console.log(`处理文件: ${fileName}, 顺序: ${order}`);
    }, 1000);
    return res.json({
        success: true,
        taskId,
        message: '文件解析任务已创建',
        estimatedTime: '2-5秒'
    });
});
app.get('/api/ai/parse-status/:taskId', (req, res) => {
    const { taskId } = req.params;
    const demoHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>智能题库系统 - 刷题练习</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Microsoft YaHei', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; color: white; margin-bottom: 30px; }
        .quiz-card { background: white; border-radius: 15px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); margin-bottom: 20px; }
        .question { font-size: 18px; font-weight: bold; margin-bottom: 20px; color: #333; }
        .options { list-style: none; }
        .option { margin: 10px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; cursor: pointer; transition: all 0.3s; }
        .option:hover { background: #e9ecef; transform: translateX(5px); }
        .option.selected { background: #007bff; color: white; }
        .option.correct { background: #28a745; color: white; }
        .option.wrong { background: #dc3545; color: white; }
        .controls { text-align: center; margin-top: 30px; }
        .btn { padding: 12px 30px; margin: 0 10px; border: none; border-radius: 25px; cursor: pointer; font-size: 16px; transition: all 0.3s; }
        .btn-primary { background: #007bff; color: white; }
        .btn-primary:hover { background: #0056b3; transform: translateY(-2px); }
        .btn-success { background: #28a745; color: white; }
        .progress { background: #e9ecef; border-radius: 10px; height: 20px; margin: 20px 0; overflow: hidden; }
        .progress-bar { background: #007bff; height: 100%; transition: width 0.3s; }
        .score { text-align: center; font-size: 24px; font-weight: bold; color: #333; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 智能题库练习</h1>
            <p>基于AI解析生成的专业题库</p>
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
        const questions = [
            {
                question: "以下哪个是JavaScript的数据类型？",
                options: ["String", "Integer", "Float", "Character"],
                correct: 0
            },
            {
                question: "CSS中用于设置文字颜色的属性是？",
                options: ["font-color", "text-color", "color", "font-style"],
                correct: 2
            },
            {
                question: "HTML中创建超链接的标签是？",
                options: ["<link>", "<a>", "<href>", "<url>"],
                correct: 1
            }
        ];
        
        let currentQuestion = 0;
        let score = 0;
        let selectedAnswer = -1;
        
        function loadQuestion() {
            const q = questions[currentQuestion];
            document.getElementById('question').textContent = \`第\${currentQuestion + 1}题：\${q.question}\`;
            
            const optionsEl = document.getElementById('options');
            optionsEl.innerHTML = '';
            
            q.options.forEach((option, index) => {
                const li = document.createElement('li');
                li.className = 'option';
                li.textContent = \`\${String.fromCharCode(65 + index)}. \${option}\`;
                li.onclick = () => selectOption(index);
                optionsEl.appendChild(li);
            });
            
            updateProgress();
            selectedAnswer = -1;
        }
        
        function selectOption(index) {
            const options = document.querySelectorAll('.option');
            options.forEach(opt => opt.classList.remove('selected'));
            options[index].classList.add('selected');
            selectedAnswer = index;
        }
        
        function nextQuestion() {
            if (selectedAnswer === -1) {
                alert('请选择一个答案！');
                return;
            }
            
            const q = questions[currentQuestion];
            const options = document.querySelectorAll('.option');
            
            // 显示正确答案
            options.forEach((opt, index) => {
                if (index === q.correct) {
                    opt.classList.add('correct');
                } else if (index === selectedAnswer && index !== q.correct) {
                    opt.classList.add('wrong');
                }
            });
            
            if (selectedAnswer === q.correct) {
                score++;
            }
            
            setTimeout(() => {
                currentQuestion++;
                if (currentQuestion < questions.length) {
                    loadQuestion();
                } else {
                    showResults();
                }
            }, 1500);
        }
        
        function updateProgress() {
            const progress = ((currentQuestion) / questions.length) * 100;
            document.getElementById('progressBar').style.width = progress + '%';
        }
        
        function showResults() {
            document.getElementById('quizCard').style.display = 'none';
            const scoreEl = document.getElementById('scoreDisplay');
            scoreEl.style.display = 'block';
            scoreEl.innerHTML = \`
                <h2>🎉 练习完成！</h2>
                <p>您的得分：\${score}/\${questions.length}</p>
                <p>正确率：\${Math.round((score/questions.length)*100)}%</p>
                <button class="btn btn-primary" onclick="location.reload()">重新练习</button>
            \`;
        }
        
        // 初始化
        loadQuestion();
    </script>
</body>
</html>`;
    res.json({
        success: true,
        status: 'completed',
        result: {
            html: demoHtml,
            questionCount: 3,
            generatedAt: new Date().toISOString()
        }
    });
});
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: '接口不存在',
        path: req.path
    });
});
app.listen(PORT, () => {
    console.log(`🚀 简化后端服务启动成功`);
    console.log(`📍 地址: http://localhost:${PORT}`);
    console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`\n📋 可用的API端点:`);
    console.log(`  GET    http://localhost:${PORT}/health`);
    console.log(`  POST   http://localhost:${PORT}/api/ai/validate-key`);
    console.log(`  POST   http://localhost:${PORT}/api/ai/parse-quiz`);
    console.log(`  GET    http://localhost:${PORT}/api/ai/parse-status/:taskId`);
});
//# sourceMappingURL=simple-server.js.map