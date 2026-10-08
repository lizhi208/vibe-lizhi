今天做了什么：
完成 Git 完整安装（版本 git version 2.56.0.windows.2），逐个理解安装向导的每个选项含义：换行符配置（Checkout as-is / Commit Unix-style，避免跨平台 CRLF/LF 混乱）、凭证管理器（GCM，免每次 push 输密码）、默认编辑器、PATH 环境策略等。配置好后用 git clone 把远程仓库 https://gitee.com/lz208/vibe-lizhi.git 克隆到本地，并和 AI 协作逐项确认每个配置对后续协作的影响——理解了换行符策略会直接影响提交 diff 是否干净、凭证管理器决定了 push 是否要反复登录。
提交记录（可验证）：fd08b3f Initial commit、4e598ce day1 提交今日反思录；封卷轻量 tag day1 指向 4e598ce。

卡过什么坑：
各个安装选项含义容易混淆，记不住每个配置对应作用——比如「换行符 Checkout as-is / Commit Unix-style」和「Checkout CRLF / Commit CRLF」两种策略的区别、「Use Git from the command line and also from 3rd-party software」和「Use Git from Git Bash only」对 PATH 的影响。通过和 AI 逐项对比 + 实际 git config 查看生效值才理清。

明天打算：
练习 git clone、add/commit/push 完整实操，熟悉仓库日常操作。
