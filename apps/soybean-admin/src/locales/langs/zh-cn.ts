const local: App.I18n.Schema = {
  system: {
    title: 'Soybean 管理系统',
    updateTitle: '系统版本更新通知',
    updateContent: '检测到系统有新版本发布，是否立即刷新页面？',
    updateConfirm: '立即刷新',
    updateCancel: '稍后再说'
  },
  common: {
    action: '操作',
    add: '新增',
    addSuccess: '添加成功',
    backToHome: '返回首页',
    batchDelete: '批量删除',
    cancel: '取消',
    close: '关闭',
    check: '勾选',
    selectAll: '全选',
    expandColumn: '展开列',
    columnSetting: '列设置',
    config: '配置',
    confirm: '确认',
    delete: '删除',
    deleteSuccess: '删除成功',
    confirmDelete: '确认删除吗？',
    edit: '编辑',
    warning: '警告',
    error: '错误',
    index: '序号',
    keywordSearch: '请输入关键词搜索',
    logout: '退出登录',
    logoutConfirm: '确认退出登录吗？',
    lookForward: '敬请期待',
    modify: '修改',
    modifySuccess: '修改成功',
    noData: '无数据',
    operate: '操作',
    pleaseCheckValue: '请检查输入的值是否合法',
    refresh: '刷新',
    reset: '重置',
    search: '搜索',
    switch: '切换',
    tip: '提示',
    trigger: '触发',
    update: '更新',
    updateSuccess: '更新成功',
    view: '查看',
    userCenter: '个人中心',
    userProfile: '用户资料',
    save: '保存',
    yesOrNo: {
      yes: '是',
      no: '否'
    }
  },
  request: {
    logout: '请求失败后登出用户',
    logoutMsg: '用户状态失效，请重新登录',
    logoutWithModal: '请求失败后弹出模态框再登出用户',
    logoutWithModalMsg: '用户状态失效，请重新登录',
    refreshToken: '请求的token已过期，刷新token',
    tokenExpired: 'token已过期',
    error400: '哎呀！请求无效，请检查您的输入。',
    error401: '会话已过期，请重新登录。',
    error403: '访问被拒绝，您没有执行此操作的权限。',
    error404: '找不到资源，它可能已被移动或移除。',
    error405: '方法不允许，请检查请求方法。',
    error408: '请求超时，请稍后重试。',
    error409: '请求冲突，资源当前状态不可用。',
    error429: '请求过于频繁，请稍后重试。',
    error500: '服务器繁忙，请稍后再试。',
    error413: '文件太大，请选择小于50MB的文件。',
    error502: '网关错误。',
    error503: '服务不可用。',
    error504: '网关超时。',
    networkError: '网络错误，请检查您的网络连接。',
    defaultError: '发生未知错误，请稍后重试。'
  },
  theme: {
    themeDrawerTitle: '主题配置',
    tabs: {
      appearance: '外观',
      layout: '布局',
      general: '通用',
      preset: '预设'
    },
    appearance: {
      themeSchema: {
        title: '主题模式',
        light: '亮色模式',
        dark: '暗黑模式',
        auto: '跟随系统'
      },
      grayscale: '灰色模式',
      colourWeakness: '色弱模式',
      themeColor: {
        title: '主题颜色',
        primary: '主色',
        info: '信息色',
        success: '成功色',
        warning: '警告色',
        error: '错误色',
        followPrimary: '跟随主色'
      },
      themeRadius: {
        title: '主题圆角'
      },
      recommendColor: '应用推荐算法的颜色',
      recommendColorDesc: '推荐颜色的算法参照',
      preset: {
        title: '主题预设',
        apply: '应用',
        applySuccess: '预设应用成功',
        default: {
          name: '默认预设',
          desc: 'Soybean 默认主题预设'
        },
        dark: {
          name: '暗色预设',
          desc: '适用于夜间使用的暗色主题预设'
        },
        compact: {
          name: '紧凑型',
          desc: '适用于小屏幕的紧凑布局预设'
        },
        azir: {
          name: 'Azir的预设',
          desc: '是 Azir 比较喜欢的莫兰迪色系冷淡风'
        }
      }
    },
    layout: {
      layoutMode: {
        title: '布局模式',
        vertical: '左侧菜单模式',
        'vertical-mix': '左侧菜单混合模式',
        'vertical-hybrid-header-first': '左侧混合-顶部优先',
        horizontal: '顶部菜单模式',
        'top-hybrid-sidebar-first': '顶部混合-侧边优先',
        'top-hybrid-header-first': '顶部混合-顶部优先',
        vertical_detail: '左侧菜单布局，菜单在左，内容在右。',
        'vertical-mix_detail': '左侧双菜单布局，一级菜单在左侧深色区域，二级菜单在左侧浅色区域。',
        'vertical-hybrid-header-first_detail':
          '左侧混合布局，一级菜单在顶部，二级菜单在左侧深色区域，三级菜单在左侧浅色区域。',
        horizontal_detail: '顶部菜单布局，菜单在顶部，内容在下方。',
        'top-hybrid-sidebar-first_detail': '顶部混合布局，一级菜单在左侧，二级菜单在顶部。',
        'top-hybrid-header-first_detail': '顶部混合布局，一级菜单在顶部，二级菜单在左侧。'
      },
      tab: {
        title: '标签栏设置',
        visible: '显示标签栏',
        cache: '标签栏信息缓存',
        cacheTip: '一键开启/关闭全局 keepalive',
        height: '标签栏高度',
        mode: {
          title: '标签栏风格',
          slider: '滑块风格',
          chrome: '谷歌风格',
          button: '按钮风格'
        },
        closeByMiddleClick: '鼠标中键关闭标签页',
        closeByMiddleClickTip: '启用后可以使用鼠标中键点击标签页进行关闭'
      },
      header: {
        title: '头部设置',
        height: '头部高度',
        breadcrumb: {
          visible: '显示面包屑',
          showIcon: '显示面包屑图标'
        }
      },
      sider: {
        title: '侧边栏设置',
        inverted: '深色侧边栏',
        width: '侧边栏宽度',
        collapsedWidth: '侧边栏折叠宽度',
        mixWidth: '混合布局侧边栏宽度',
        mixCollapsedWidth: '混合布局侧边栏折叠宽度',
        mixChildMenuWidth: '混合布局子菜单宽度',
        autoSelectFirstMenu: '自动选择第一个子菜单',
        autoSelectFirstMenuTip: '点击一级菜单时，自动选择并导航到第一个子菜单的最深层级'
      },
      footer: {
        title: '底部设置',
        visible: '显示底部',
        fixed: '固定底部',
        height: '底部高度',
        right: '底部居右'
      },
      content: {
        title: '内容区域设置',
        scrollMode: {
          title: '滚动模式',
          tip: '主题滚动仅 main 部分滚动，外层滚动可携带头部底部一起滚动',
          wrapper: '外层滚动',
          content: '主体滚动'
        },
        page: {
          animate: '页面切换动画',
          mode: {
            title: '页面切换动画类型',
            'fade-slide': '滑动',
            fade: '淡入淡出',
            'fade-bottom': '底部消退',
            'fade-scale': '缩放消退',
            'zoom-fade': '渐变',
            'zoom-out': '闪现',
            none: '无'
          }
        },
        fixedHeaderAndTab: '固定头部和标签栏'
      }
    },
    general: {
      title: '通用设置',
      watermark: {
        title: '水印设置',
        visible: '显示全屏水印',
        text: '自定义水印文本',
        enableUserName: '启用用户名水印',
        enableTime: '显示当前时间',
        timeFormat: '时间格式'
      },
      multilingual: {
        title: '多语言设置',
        visible: '显示多语言按钮'
      },
      globalSearch: {
        title: '全局搜索设置',
        visible: '显示全局搜索按钮'
      }
    },
    configOperation: {
      copyConfig: '复制配置',
      copySuccessMsg: '复制成功，请替换 src/theme/settings.ts 中的变量 themeSettings',
      resetConfig: '重置配置',
      resetSuccessMsg: '重置成功'
    }
  },
  route: {
    login: '登录',
    403: '无权限',
    404: '页面不存在',
    500: '服务器错误',
    'iframe-page': '外链页面',
    home: '首页',
    management: '系统管理',
    management_role: '角色管理',
    management_user: '用户管理',
    'user-center': '个人中心',
    management_company: '公司管理',
    'management_email-settings': '邮件设置',
    management_permission: '权限管理',

    'management_audit-log': '审计日志',
    management_member: '会员管理',
    'management_game-instance': '游戏实例',
    games: '游戏中心',
    games_list: '游戏列表'
  },
  page: {
    manage: {
      game: {
        common: {
          totalProbability: '总概率',
          expectedValue: '期望价值 / 次',
          prizeName: '奖品名称',
          balance: '自动平衡'
        },
        tabs: {
          prizes: '奖品配置',
          rules: '规则配置',
          visuals: '外观与交互',
          effects: '特效与音频',
          ux: '概率与预算',
          embed: '嵌入代码'
        },
        rules: {
          enableTimeLimit: '启用时间限制',
          activeDays: '开放日期',
          startTime: '开始时间',
          endTime: '结束时间',
          enableDynamicProb: '启用动态概率调整',
          lossStreakLimit: '连输上限 (之后降低概率)',
          lossStreakBonus: '连输奖励 (概率提升 %)',
          enableBudget: '启用预算控制',
          dailyBudget: '每日预算',
          monthlyBudget: '每月预算',
          dailyLimit: '每日游戏次数上限',
          cooldown: '冷却时间 (分钟)',
          minLevel: '最低等级要求',
          accessControl: '访问控制',
          requireLogin: '需要登录',
          oneTimeOnly: '仅限一次',
          vipTiers: 'VIP 特权 (奖励倍率 & 额外次数)',
          days: {
            mon: '周一',
            tue: '周二',
            wed: '周三',
            thu: '周四',
            fri: '周五',
            sat: '周六',
            sun: '周日'
          }
        },
        visuals: {
          themePreset: '主题预设',
          bgSettings: '背景设置',
          bgType: '背景类型',
          bgGradStart: '起始色',
          bgGradEnd: '结束色',
          bgGradDir: '渐变方向',
          bgColor: '背景颜色',
          bgImage: '背景图片',
          bgFit: '填充方式',
          bgBlur: '模糊度',
          bgOpacity: '透明度',
          spinDuration: '旋转时间 (秒)',
          spinTurns: '旋转圈数',
          gameFont: '自定义字体',
          fontSettings: '字体设置',
          fontPreset: '字体风格',
          customFont: '上传自定义字体',
          brandLogo: '品牌Logo',
          titleImage: 'Logo图片',
          logoWidth: 'Logo宽度',
          logoTopMargin: '顶部边距',
          logoOpacity: 'Logo透明度',
          logoDropShadow: '启用阴影',
          centerHub: '中心设置',
          centerType: '中心类型',
          centerEmoji: '选择图标',
          centerImage: '中心图片',
          centerSize: '中心大小',
          centerBorder: '启用边框',
          centerShadow: '启用阴影',
          pointer: '指针设置',
          pointerImage: '指针图片',
          pointerDirection: '指针方向',
          pointerSize: '指针大小',
          pointerShadow: '指针阴影',
          wheelBorder: '转盘边框',
          wheelBorderImage: '边框图片',
          wheelBorderSize: '边框大小',
          wheelBorderOpacity: '边框透明度',
          tokenBar: 'Token显示栏',
          tokenBarImage: '背景图片',
          tokenBarColor: '背景颜色',
          tokenBarTextColor: '文字颜色',
          tokenBarShadow: '启用阴影',
          spinButton: '旋转按钮',
          spinBtnText: '按钮文字',
          spinBtnSubtext: '副标题',
          spinBtnColor: '按钮颜色',
          spinBtnTextColor: '文字颜色',
          spinBtnShadow: '按钮阴影',
          spinBtnImage: '按钮图片',
          divider: '分隔线',
          dividerType: '类型',
          dividerColor: '颜色',
          dividerStroke: '线宽',
          dividerImage: '分隔图片',
          audio: '音频设置',
          soundEnabled: '启用音效',
          repeatWinSound: '重复胜利音效',
          jackpotSound: 'Jackpot 特效音',
          interact: '交互方式',
          clickToSpin: '点击旋转',
          swipeToSpin: '滑动旋转',
          prizeList: '奖品列表'
        },
        prizes: {
          visualTemplate: '视觉模板',
          quickTemplate: '快速模板'
        },
        effects: {
          ultraFeatures: '高级特效开关',
          enableBGM: '背景音乐',
          enableLedRing: 'LED灯环动画',
          enableConfetti: '彩纸特效',
          enableStartScreen: '开始画面',
          enableHexagons: '浮动六角形',
          enableGridFloor: '赛博地板',
          bgmSettings: '背景音乐设置',
          bgmUrl: 'BGM文件 (.mp3)',
          bgmVolume: 'BGM音量',
          bgmLoop: '循环播放',
          ledSettings: 'LED灯环设置',
          ledCount: 'LED数量',
          ledSpeed: '速度 (ms)',
          ledColor1: '颜色1',
          ledColor2: '颜色2',
          ledColor3: '颜色3',
          resultSounds: '结果音效',
          winSound: '中奖音效 (.mp3)',
          loseSound: '未中音效 (.mp3)',
          jackpotSoundFile: '大奖音效 (.mp3)',
          tickSound: '滴答声',
          tickVolume: '滴答音量',
          showSoundButton: '显示音效按钮',
          soundButtonOpacity: '音效按钮透明度',
          confettiSettings: '彩纸设置',
          confettiParticles: '粒子数量',
          confettiSpread: '扩散角度',
          confettiColors: '颜色 (hex)',
          neonColors: '霓虹色设置',
          neonCyan: '青色',
          neonPink: '粉色',
          neonPurple: '紫色',
          neonGold: '金色',
          neonGreen: '绿色',
          darkBg: '深色背景',
          resultMessages: '结果消息',
          jackpotTitle: '大奖标题',
          jackpotSubtitle: '大奖副标题',
          winTitle: '中奖标题',
          winSubtitle: '中奖副标题',
          loseTitle: '未中标题',
          loseSubtitle: '未中副标题'
        },
        tabEmbed: '嵌入设置',
        iframeCode: 'HTML Iframe 代码'
      }
    },
    login: {
      common: {
        loginOrRegister: '登录 / 注册',
        userNamePlaceholder: '请输入用户名',
        emailPlaceholder: '请输入邮箱地址',
        phonePlaceholder: '请输入手机号',
        codePlaceholder: '请输入验证码',
        passwordPlaceholder: '请输入密码',
        confirmPasswordPlaceholder: '请再次输入密码',
        codeLogin: '验证码登录',
        confirm: '确定',
        back: '返回',
        validateSuccess: '验证成功',
        loginSuccess: '登录成功',
        welcomeBack: '欢迎回来，{userName} ！',
        invalidPassword: '密码不正确',
        userNotFound: '登录用户名/密码错误'
      },
      pwdLogin: {
        title: '密码登录',
        rememberMe: '记住我',
        forgetPassword: '忘记密码？',
        register: '注册账号',
        otherAccountLogin: '其他账号登录',
        otherLoginMode: '其他登录方式',
        superAdmin: '超级管理员',
        admin: '管理员',
        user: '普通用户'
      },
      codeLogin: {
        title: '验证码登录',
        getCode: '获取验证码',
        reGetCode: '{time}秒后重新获取',
        sendCodeSuccess: '验证码发送成功',
        imageCodePlaceholder: '请输入图片验证码'
      },
      register: {
        title: '注册账号',
        agreement: '我已经仔细阅读并接受',
        protocol: '《用户协议》',
        policy: '《隐私权政策》'
      },
      resetPwd: {
        title: '重置密码'
      },
      bindWeChat: {
        title: '绑定微信'
      }
    },
    home: {
      branchDesc:
        '为了方便大家开发和更新合并，我们对main分支的代码进行了精简，只保留了首页菜单，其余内容已移至example分支进行维护。预览地址显示的内容即为example分支的内容。',
      greeting: '早安，{userName}, 今天又是充满活力的一天!',
      weatherDesc: '今日多云转晴，20℃ - 25℃!',
      projectCount: '项目数',
      todo: '待办',
      message: '消息',
      downloadCount: '下载量',
      registerCount: '注册量',
      schedule: '作息安排',
      study: '学习',
      work: '工作',
      rest: '休息',
      entertainment: '娱乐',
      visitCount: '访问量',
      turnover: '成交额',
      dealCount: '成交量',
      projectNews: {
        title: '项目动态',
        moreNews: '更多动态',
        desc1: 'Soybean 在2021年5月28日创建了开源项目 soybean-admin!',
        desc2: 'Yanbowe 向 soybean-admin 提交了一个bug，多标签栏不会自适应。',
        desc3: 'Soybean 准备为 soybean-admin 的发布做充分的准备工作!',
        desc4: 'Soybean 正在忙于为soybean-admin写项目说明文档！',
        desc5: 'Soybean 刚才把工作台页面随便写了一些，凑合能看了！'
      },
      creativity: '创意'
    }
  },
  form: {
    required: '不能为空',
    userName: {
      required: '请输入用户名',
      invalid: '用户名格式不正确'
    },
    phone: {
      required: '请输入手机号',
      invalid: '手机号格式不正确'
    },
    pwd: {
      required: '请输入密码',
      invalid: '至少9位，包含大写、小写、数字、特殊字符'
    },
    confirmPwd: {
      required: '请输入确认密码',
      invalid: '两次输入密码不一致'
    },
    code: {
      required: '请输入验证码',
      invalid: '验证码格式不正确'
    },
    email: {
      required: '请输入邮箱',
      invalid: '邮箱格式不正确'
    }
  },
  dropdown: {
    closeCurrent: '关闭',
    closeOther: '关闭其它',
    closeLeft: '关闭左侧',
    closeRight: '关闭右侧',
    closeAll: '关闭所有',
    pin: '固定标签',
    unpin: '取消固定'
  },
  icon: {
    themeConfig: '主题配置',
    themeSchema: '主题模式',
    lang: '切换语言',
    fullscreen: '全屏',
    fullscreenExit: '退出全屏',
    reload: '刷新页面',
    collapse: '折叠菜单',
    expand: '展开菜单',
    pin: '固定',
    unpin: '取消固定'
  },
  datatable: {
    itemCount: '共 {total} 条',
    fixed: {
      left: '左固定',
      right: '右固定',
      unFixed: '取消固定'
    }
  }
};

export default local;
