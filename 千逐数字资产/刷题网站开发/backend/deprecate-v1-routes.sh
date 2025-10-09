#!/bin/bash

# 为v1路由添加弃用标记的脚本

echo "🔄 为v1路由添加弃用标记..."

# 需要处理的v1路由文件
V1_ROUTES=(
  "quizRoutes.ts"
  "uploadRoutes.ts" 
  "practiceRoutes.ts"
  "jobRoutes.ts"
)

for route_file in "${V1_ROUTES[@]}"; do
  echo "处理 $route_file..."
  
  # 检查文件是否存在
  if [ -f "src/routes/$route_file" ]; then
    # 在文件开头添加弃用注释和导入
    sed -i '' '1i\
/**\
 * v1 API Routes (DEPRECATED)\
 * \
 * ⚠️ 这些路由已被弃用，将在 2025-12-31 移除\
 * 请迁移到 v2 API\
 */\
' "src/routes/$route_file"
    
    # 添加弃用中间件导入
    sed -i '' '/import.*express/a\
import { deprecateV1Api } from '\''../middleware/deprecation'\'';
' "src/routes/$route_file"
    
    # 在router定义后添加弃用中间件
    sed -i '' '/const router = express.Router();/a\
\
// ⚠️ v1 API 已弃用 - 请迁移到 v2\
router.use(deprecateV1Api);
' "src/routes/$route_file"
    
    echo "✅ $route_file 已添加弃用标记"
  else
    echo "⚠️ $route_file 不存在，跳过"
  fi
done

echo "🎉 v1路由弃用标记添加完成！"
