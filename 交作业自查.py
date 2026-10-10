#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""《Vibe Coding》收工自查（学生端 · 零依赖 · 放仓库根目录跑）
用法（在仓库根目录的终端里）:
  python3 交作业自查.py --day 3 --name 张三    # 本地自查：检查今天的作业四件套
  python3 交作业自查.py --ci --name 李智       # CI 模式：给 Gitee Go 流水线用的合规闸门
缺哪样它告诉你补哪样，全绿再下班。
老师用同一套硬指标巡查：这里全绿 = 今天不会被记缺交。
--name 可以不传，默认取 git config user.name（所以署名必须是真名）。

CI 模式（宽松口径，人定）——每次 push 自动校验"反思件+署名 commit"，漏交直接红灯：
  ① 本次 push 有你名下署名 commit（HEAD 作者 = 本人；合并提交等场景回看最近 10 条）
  ② 反思件存在且非空（docs/反思录/<name>/dayN.md，N 取目录中最大编号 = 最新反思日）
  ③ 反思件已入库（HEAD 提交树里能查到该文件，git cat-file 验证，浅克隆也能查）
  ④ 封卷 tag dayN 已推到 origin（优先 ls-remote 查远程，异常时回退本地 tag）
"""
import argparse, datetime, pathlib, re, subprocess, sys

def sh(cmd):
    # Windows 默认用 GBK 解码子进程输出，遇到中文路径/emoji 会抛 UnicodeDecodeError
    # 导致 stdout 变成 None。这里改用 bytes + utf-8(replace) 解码，永不抛异常。
    r = subprocess.run(cmd, shell=True, capture_output=True)
    return r.stdout.decode("utf-8", errors="replace") if r.stdout else ""

def sh_ok(cmd):
    # 只关心退出码的命令（如 git cat-file -e 成功时 stdout 是空的）
    return subprocess.run(cmd, shell=True, capture_output=True).returncode == 0

def print_checks(checks):
    bad = 0
    for ok, title, hint in checks:
        print(("✅ " if ok else "❌ ") + title)
        if not ok:
            print(hint); bad += 1
    return bad

def latest_reflection_day(name):
    """反思录目录里 dayN.md 的最大 N（= 最新反思日）；一个都没有则返回 0。"""
    ref_dir = pathlib.Path("docs") / "反思录" / name
    days = []
    if ref_dir.is_dir():
        for p in ref_dir.glob("day*.md"):
            m = re.fullmatch(r"day(\d+)\.md", p.name)
            if m:
                days.append(int(m.group(1)))
    return (max(days) if days else 0), ref_dir

def run_local(day, name):
    today = datetime.date.today().isoformat()
    since = f'--since="{today}T00:00:00"'
    my_commits = [x for x in sh(f'git -c core.quotePath=false log {since} --author="{name}" --pretty=format:%h').split() if x]
    f = pathlib.Path("docs") / "反思录" / name / f"day{day}.md"
    today_files = sh(f'git -c core.quotePath=false log {since} --name-only --pretty=format:').splitlines()
    filed_in = f.as_posix() in [p.strip() for p in today_files if p.strip()]
    tag_pushed = f"refs/tags/day{day}" in sh("git ls-remote --tags origin")
    checks = [
        (bool(my_commits), f"① 今日你名下 commit ≥1（{name}）",
         '   现在 0 个。今天干的活要署名提交：git add -A && git commit -m "写人话" && git push'),
        (f.exists(), f"② 反思件存在 docs/反思录/{name}/day{day}.md",
         "   把今天的反思区 + 至少 1 组对话档案写进这个文件（目录名一字不差）"),
        (filed_in, "③ 反思件已随今日 commit 入库",
         "   文件在但没提交或没推：git add 它 → commit → push"),
        (tag_pushed, f"④ 封卷 tag day{day} 已推到你自己的仓库",
         f"   你的远程还没这个 tag：git tag day{day} && git push origin --tags"),
    ]
    bad = print_checks(checks)
    print("ℹ️ ⑤ 「第 %d 天完工报告」issue 要在你自己的 Gitee 仓库发，本地查不到——没收工前先发掉（组长查本组时就看这条）" % day)
    print("\n" + ("全绿，可以下班。老师那边你今天的作业判'已交'。" if not bad else f"还差 {bad} 样，补完再跑一次。"))
    return bad

def run_ci(name):
    day, ref_dir = latest_reflection_day(name)
    print(f"CI 合规闸门 · 宽松口径（最新反思日 = day{day}，取 {ref_dir.as_posix()}/ 中最大编号）")
    if day == 0:
        print(f"❌ ② 反思件缺失：{ref_dir.as_posix()}/ 里一个 dayN.md 都没有——先补反思再 push")
        return 1

    # ① 署名 commit：HEAD 作者就是本次 push 的顶端提交；回看最近 10 条兜底合并提交
    head_author = sh("git log -1 --pretty=format:%an").strip()
    recent_authors = [x.strip() for x in sh("git log -10 --pretty=format:%an").splitlines()]
    signed = name in recent_authors

    # ② 反思件存在且非空
    f = ref_dir / f"day{day}.md"
    try:
        nonempty = bool(f.read_text(encoding="utf-8", errors="replace").strip())
    except OSError:
        nonempty = False

    # ③ 已入库：HEAD 提交树里能查到该文件（浅克隆也可用，不依赖完整历史）
    rel = f.as_posix()
    committed = sh_ok(f'git cat-file -e "HEAD:{rel}"')

    # ④ 封卷 tag 已推：优先查远程；ls-remote 因网络/权限失败时回退本地 tag（克隆默认带 tag）
    remote_tags = sh("git ls-remote --tags origin")
    local_tags = sh("git tag -l").split()
    tag_pushed = (f"refs/tags/day{day}" in remote_tags) or (f"day{day}" in local_tags)

    checks = [
        (signed, f"① 本次 push 有你名下署名 commit（{name}）",
         f"   HEAD 作者 = {head_author or '(空)'}。提交请用你本人的 git 身份：git config user.name 真名"),
        (nonempty, f"② 反思件存在且非空 docs/反思录/{name}/day{day}.md",
         "   把今天的反思写进这个文件（目录名一字不差，内容不能是空的）"),
        (committed, f"③ 反思件已入库（HEAD 提交树里能查到 {rel}）",
         "   文件在但没提交：git add 它 → commit → push"),
        (tag_pushed, f"④ 封卷 tag day{day} 已推到 origin",
         f"   推 tag：git tag day{day} && git push origin day{day}"),
    ]
    bad = print_checks(checks)
    print("ℹ️ ⑤ 「完工报告」issue 在 Gitee 网页端发，CI 查不到。")
    print("\n" + ("合规闸门全绿，本次 push 放行。" if not bad else f"合规闸门红灯：还差 {bad} 样，作业想糊弄先过 CI。"))
    return bad

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--day", type=int, default=None)
    ap.add_argument("--name", default="")
    ap.add_argument("--ci", action="store_true", help="CI 模式：自动定位最新反思日，宽松口径四查")
    a = ap.parse_args()
    if not pathlib.Path(".git").exists(): sys.exit("请在仓库根目录运行（找不到 .git）")
    if not a.ci and a.day is None:
        ap.error("--day 必填（本地自查），或用 --ci 进入 CI 模式")
    name = a.name or sh("git config user.name").strip()
    if not name: sys.exit("没查到你的名字：先配 git config user.name 真名，或用 --name 传入")
    bad = run_ci(name) if a.ci else run_local(a.day, name)
    sys.exit(0 if not bad else 1)

if __name__ == "__main__": main()
