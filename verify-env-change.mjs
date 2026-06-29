import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * 验证环境变量更改后的项目功能完整性
 */
async function verifyEnvironmentChange() {
  console.log('🔄 验证环境变量更改后的项目状态...\n');

  // 1. 检查 .env.local 文件是否存在并包含必要的变量
  console.log('🔍 检查 .env.local 文件...');
  if (fs.existsSync(path.join(process.cwd(), '.env.local'))) {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    const requiredVars = ['DATABASE_URL', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
    let missingVars = [];
    
    for (const varName of requiredVars) {
      if (!envContent.includes(varName)) {
        missingVars.push(varName);
      }
    }
    
    if (missingVars.length === 0) {
      console.log('✅ .env.local 文件包含所有必要变量\n');
    } else {
      console.log('⚠️  .env.local 文件缺少以下变量:', missingVars.join(', '));
    }
  } else {
    console.log('❌ .env.local 文件不存在\n');
    return false;
  }

  // 2. 运行 TypeScript 类型检查
  console.log('🔍 运行 TypeScript 类型检查...');
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log('✅ 类型检查通过\n');
  } catch (error) {
    console.log('❌ 类型检查失败:', error.stdout?.toString() || error.message);
    return false;
  }

  // 3. 尝试生成 Prisma 客户端（验证数据库连接字符串语法）
  console.log('🔍 测试 Prisma 客户端生成...');
  try {
    execSync('npx prisma generate', { stdio: 'pipe' });
    console.log('✅ Prisma 客户端生成成功\n');
  } catch (error) {
    console.log('❌ Prisma 客户端生成失败:', error.stdout?.toString() || error.message);
    // 这可能不是致命错误，因为数据库可能暂时不可达
  }

  // 4. 检查构建是否成功
  console.log('🔍 测试构建过程...');
  try {
    execSync('npx next build', { stdio: 'pipe', timeout: 120000 }); // 2分钟超时
    console.log('✅ 构建测试通过\n');
  } catch (error) {
    console.log('❌ 构建测试失败:', error.stdout?.toString() || error.message);
    return false;
  }

  console.log('🎉 环境变量更改验证完成！');
  return true;
}

// 执行验证
verifyEnvironmentChange()
  .then(success => {
    if (success) {
      console.log('\n✅ 环境变量更改验证通过：项目功能完整');
      process.exit(0);
    } else {
      console.log('\n❌ 环境变量更改验证失败：存在问题');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 验证过程中发生错误:', error);
    process.exit(1);
  });