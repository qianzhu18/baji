const { FileParserService } = require('./dist/services/fileParserService');
const fs = require('fs');

async function testParser() {
  try {
    console.log('测试文件解析器...');
    
    // 创建测试CSV文件
    const csvContent = 'Name,Age,City\nJohn,25,New York\nJane,30,London\nBob,35,Paris';
    fs.writeFileSync('./test.csv', csvContent);
    
    const parser = new FileParserService();
    const buffer = fs.readFileSync('./test.csv');
    
    console.log('解析CSV文件...');
    const result = await parser.parseFile(buffer, 'test.csv', 'text/csv');
    
    console.log('解析结果:', result);
    
    // 清理测试文件
    fs.unlinkSync('./test.csv');
    
    console.log('✅ 文件解析器测试成功');
  } catch (error) {
    console.error('❌ 文件解析器测试失败:', error.message);
  }
}

testParser();
