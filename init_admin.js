const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 简单读取 .env.local
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8').split('\n');
  envConfig.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim();
  });
}


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('未找到 Supabase 配置信息，请检查 admin-frontend/.env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function initAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'adminadmin';
  
  console.log(`[1/2] 正在尝试创建管理员账号: ${adminEmail}`);
  
  const { data, error } = await supabase.auth.signUp({
    email: adminEmail,
    password: adminPassword,
  });

  if (error) {
    console.error('\n❌ 创建管理员账号失败:', error.message);
    if (error.message.includes('confirmation email')) {
      console.log('\n================== 需要您进行如下配置 ==================');
      console.log('原因：您的私有化 Supabase 开启了“邮件确认”，但未配置邮件服务(SMTP)。这导致账号创建被自动回滚。');
      console.log('解决办法：');
      console.log('1. 打开您的 Supabase Studio 后台 (例如 http://192.168.3.77:8000 )');
      console.log('2. 导航到 Authentication -> Providers -> Email');
      console.log('3. 将 "Confirm email" 关闭并保存');
      console.log('   (或者修改 docker-compose 环境变量: ENABLE_EMAIL_AUTOCONFIRM=true)');
      console.log('4. 修改后，再次运行此脚本即可成功创建管理员！');
      console.log('=======================================================\n');
    }
  } else {
    console.log('\n✅ 管理员账号初始化成功！');
    console.log('邮箱:', data.user?.email);
    console.log('您可以前往后台登录使用了。');
  }
}

initAdmin();
