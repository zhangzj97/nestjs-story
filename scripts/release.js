import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const cwd = process.cwd();
const pkgFile = path.join(cwd, "package.json");

function exec(cmd) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { stdio: "inherit" });
}

try {
  // 1. 检测是否存在未提交文件
  const dirty = execSync("git status --porcelain", { encoding: "utf8" }).trim();
  if (dirty) {
    console.error("❌ Git 存在未提交变更，请先提交代码再发布");
    process.exit(1);
  }
  console.log("✅ Git 工作区干净");

  // 2. 读取版本，自动 patch +1
  const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
  const [ma, mi, pa] = pkg.version.split(".").map(Number);
  const nextVer = `${ma}.${mi}.${pa + 1}`;
  pkg.version = nextVer;
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`📌 版本升级: ${pkg.version} → ${nextVer}`);

  // 3. 提交版本变更
  exec("git add package.json");
  exec(`git commit -m "chore: release v${nextVer}"`);

  // 4. 创建tag，推送代码与tag
  const tagName = `v${nextVer}`;
  exec(`git tag ${tagName}`);
  exec("git push");
  exec(`git push origin ${tagName}`);

  console.log(`\n🎉 完成发布 ${tagName}`);
} catch (err) {
  console.error("\n❌ 发布失败:", err.message);
  process.exit(1);
}
