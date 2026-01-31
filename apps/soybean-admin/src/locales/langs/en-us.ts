const local: App.I18n.Schema = {
  system: {
    title: 'SoybeanAdmin',
    updateTitle: 'System Version Update Notification',
    updateContent: 'A new version of the system has been detected. Do you want to refresh the page immediately?',
    updateConfirm: 'Refresh immediately',
    updateCancel: 'Later'
  },
  common: {
    action: 'Action',
    add: 'Add',
    addSuccess: 'Add Success',
    backToHome: 'Back to home',
    batchDelete: 'Batch Delete',
    cancel: 'Cancel',
    close: 'Close',
    check: 'Check',
    selectAll: 'Select All',
    expandColumn: 'Expand Column',
    columnSetting: 'Column Setting',
    config: 'Config',
    confirm: 'Confirm',
    delete: 'Delete',
    deleteSuccess: 'Delete Success',
    confirmDelete: 'Are you sure you want to delete?',
    edit: 'Edit',
    warning: 'Warning',
    error: 'Error',
    index: 'Index',
    keywordSearch: 'Please enter keyword',
    logout: 'Logout',
    logoutConfirm: 'Are you sure you want to log out?',
    lookForward: 'Coming soon',
    modify: 'Modify',
    modifySuccess: 'Modify Success',
    noData: 'No Data',
    operate: 'Operate',
    pleaseCheckValue: 'Please check whether the value is valid',
    refresh: 'Refresh',
    reset: 'Reset',
    search: 'Search',
    switch: 'Switch',
    tip: 'Tip',
    trigger: 'Trigger',
    update: 'Update',
    updateSuccess: 'Update Success',
    view: 'View',
    userCenter: 'User Center',
    userProfile: 'User Profile',
    save: 'Save',
    yesOrNo: {
      yes: 'Yes',
      no: 'No'
    }
  },
  request: {
    logout: 'Logout user after request failed',
    logoutMsg: 'User status is invalid, please log in again',
    logoutWithModal: 'Pop up modal after request failed and then log out user',
    logoutWithModalMsg: 'User status is invalid, please log in again',
    refreshToken: 'The requested token has expired, refresh the token',
    tokenExpired: 'The requested token has expired',
    error400: 'Oops! The request was invalid. Please check your input.',
    error401: 'Session expired. Please log in again.',
    error403: 'Access denied. You don\'t have permission for this action.',
    error404: 'Resource not found. It may have been moved or removed.',
    error405: 'Method not allowed. Please check the request method.',
    error408: 'Request timeout. Please try again later.',
    error409: 'Conflict. The request could not be completed due to a conflict with the current state of the resource.',
    error429: 'Too many requests. Please try again later.',
    error500: 'The server is having a little trouble. Please try again later.',
    error413: 'File too large. Please select a file smaller than 50MB.',
    error502: 'Bad gateway. The server received an invalid response from the upstream server.',
    error503: 'Service unavailable. The server is currently unable to handle the request.',
    error504: 'Gateway timeout. The server did not receive a timely response from the upstream server.',
    networkError: 'Network error. Please check your internet connection.',
    defaultError: 'An unknown error occurred. Please try again later.'
  },
  theme: {
    themeDrawerTitle: 'Theme Configuration',
    tabs: {
      appearance: 'Appearance',
      layout: 'Layout',
      general: 'General',
      preset: 'Preset'
    },
    appearance: {
      themeSchema: {
        title: 'Theme Schema',
        light: 'Light',
        dark: 'Dark',
        auto: 'Follow System'
      },
      grayscale: 'Grayscale',
      colourWeakness: 'Colour Weakness',
      themeColor: {
        title: 'Theme Color',
        primary: 'Primary',
        info: 'Info',
        success: 'Success',
        warning: 'Warning',
        error: 'Error',
        followPrimary: 'Follow Primary'
      },
      themeRadius: {
        title: 'Theme Radius'
      },
      recommendColor: 'Apply Recommended Color Algorithm',
      recommendColorDesc: 'The recommended color algorithm refers to',
      preset: {
        title: 'Theme Presets',
        apply: 'Apply',
        applySuccess: 'Preset applied successfully',
        default: {
          name: 'Default Preset',
          desc: 'Default theme preset with balanced settings'
        },
        dark: {
          name: 'Dark Preset',
          desc: 'Dark theme preset for night time usage'
        },
        compact: {
          name: 'Compact Preset',
          desc: 'Compact layout preset for small screens'
        },
        azir: {
          name: "Azir's Preset",
          desc: 'It is a cold and elegant preset that Azir likes'
        }
      }
    },
    layout: {
      layoutMode: {
        title: 'Layout Mode',
        vertical: 'Vertical Mode',
        horizontal: 'Horizontal Mode',
        'vertical-mix': 'Vertical Mix Mode',
        'vertical-hybrid-header-first': 'Left Hybrid Header-First',
        'top-hybrid-sidebar-first': 'Top-Hybrid Sidebar-First',
        'top-hybrid-header-first': 'Top-Hybrid Header-First',
        vertical_detail: 'Vertical menu layout, with the menu on the left and content on the right.',
        'vertical-mix_detail':
          'Vertical mix-menu layout, with the primary menu on the dark left side and the secondary menu on the lighter left side.',
        'vertical-hybrid-header-first_detail':
          'Left hybrid layout, with the primary menu at the top, the secondary menu on the dark left side, and the tertiary menu on the lighter left side.',
        horizontal_detail: 'Horizontal menu layout, with the menu at the top and content below.',
        'top-hybrid-sidebar-first_detail':
          'Top hybrid layout, with the primary menu on the left and the secondary menu at the top.',
        'top-hybrid-header-first_detail':
          'Top hybrid layout, with the primary menu at the top and the secondary menu on the left.'
      },
      tab: {
        title: 'Tab Settings',
        visible: 'Tab Visible',
        cache: 'Tag Bar Info Cache',
        cacheTip: 'One-click to open/close global keepalive',
        height: 'Tab Height',
        mode: {
          title: 'Tab Mode',
          slider: 'Slider',
          chrome: 'Chrome',
          button: 'Button'
        },
        closeByMiddleClick: 'Close Tab by Middle Click',
        closeByMiddleClickTip: 'Enable closing tabs by clicking with the middle mouse button'
      },
      header: {
        title: 'Header Settings',
        height: 'Header Height',
        breadcrumb: {
          visible: 'Breadcrumb Visible',
          showIcon: 'Breadcrumb Icon Visible'
        }
      },
      sider: {
        title: 'Sider Settings',
        inverted: 'Dark Sider',
        width: 'Sider Width',
        collapsedWidth: 'Sider Collapsed Width',
        mixWidth: 'Mix Sider Width',
        mixCollapsedWidth: 'Mix Sider Collapse Width',
        mixChildMenuWidth: 'Mix Child Menu Width',
        autoSelectFirstMenu: 'Auto Select First Submenu',
        autoSelectFirstMenuTip:
          'When a first-level menu is clicked, the first submenu is automatically selected and navigated to the deepest level'
      },
      footer: {
        title: 'Footer Settings',
        visible: 'Footer Visible',
        fixed: 'Fixed Footer',
        height: 'Footer Height',
        right: 'Right Footer'
      },
      content: {
        title: 'Content Area Settings',
        scrollMode: {
          title: 'Scroll Mode',
          tip: 'The theme scroll only scrolls the main part, the outer scroll can carry the header and footer together',
          wrapper: 'Wrapper',
          content: 'Content'
        },
        page: {
          animate: 'Page Animate',
          mode: {
            title: 'Page Animate Mode',
            fade: 'Fade',
            'fade-slide': 'Slide',
            'fade-bottom': 'Fade Zoom',
            'fade-scale': 'Fade Scale',
            'zoom-fade': 'Zoom Fade',
            'zoom-out': 'Zoom Out',
            none: 'None'
          }
        },
        fixedHeaderAndTab: 'Fixed Header And Tab'
      }
    },
    general: {
      title: 'General Settings',
      watermark: {
        title: 'Watermark Settings',
        visible: 'Watermark Full Screen Visible',
        text: 'Custom Watermark Text',
        enableUserName: 'Enable User Name Watermark',
        enableTime: 'Show Current Time',
        timeFormat: 'Time Format'
      },
      multilingual: {
        title: 'Multilingual Settings',
        visible: 'Display multilingual button'
      },
      globalSearch: {
        title: 'Global Search Settings',
        visible: 'Display GlobalSearch button'
      }
    },
    configOperation: {
      copyConfig: 'Copy Config',
      copySuccessMsg: 'Copy Success, Please replace the variable "themeSettings" in "src/theme/settings.ts"',
      resetConfig: 'Reset Config',
      resetSuccessMsg: 'Reset Success'
    }
  },
  route: {
    login: 'Login',
    403: 'No Permission',
    404: 'Page Not Found',
    500: 'Server Error',
    'iframe-page': 'Iframe',
    home: 'Home',
    management: 'System Management',
    management_member: 'Member Management',
    'management_game-instance': 'Game Instances',
    management_role: 'Role',
    management_user: 'User',
    'user-center': 'User Center',
    management_company: 'Company',
    'management_email-settings': 'Email Settings',
    management_permission: 'Permission',

    'management_audit-log': 'Audit Log',
    games: 'Game Center',
    games_list: 'Game List'
  },
  page: {
    manage: {
      game: {
        common: {
          totalProbability: 'Total Probability',
          expectedValue: 'Expected Value / Spin',
          prizeName: 'Prize Name',
          balance: 'Auto Balance',
          prizes: 'Prizes',
          settings: 'Settings',
          gameplay: 'Gameplay',
          rewards: 'Rewards',
          milestones: 'Milestones',
          symbols: 'Symbols & Payouts',
          payouts: 'Payout Table',
          gameSettings: 'Game Settings',
          board: 'Board Settings',
          multipliers: 'Risk Multipliers',
          riskMultipliers: 'Multiplier Grid by Risk',
          scoring: 'Scoring',
          bets: 'Bet Options',
          boxes: 'Box Settings',
          categories: 'Categories',
          scratchPercent: 'Scratch % to Reveal',
          scratchLayer: 'Scratch Layer Color',
          dailyRewards: 'Daily Rewards (Day 1-7)',
          resetOnMiss: 'Reset Streak on Miss',
          streakBonus: 'Streak Milestone Bonuses',
          reelSymbols: 'Reel Symbols',
          payoutTable: 'Payout Table',
          betAmount: 'Bet Amount',
          jackpotAmount: 'Jackpot Amount',
          numberOfRows: 'Number of Rows',
          numberOfBoxes: 'Number of Boxes',
          picksAllowed: 'Picks Allowed',
          quizCategories: 'Quiz Categories',
          timePerQuestion: 'Time per Question',
          basePoints: 'Base Points',
          gridSize: 'Grid Size',
          timeLimit: 'Time Limit',
          baseScore: 'Base Score per Match',
          timeBonus: 'Time Bonus per Second',
          bettingOptions: 'Betting Options & Multipliers',
          defaultBet: 'Default Bet'
        },
        tabs: {
          prizes: 'Prize Config',
          rules: 'Rules Config',
          visuals: 'Visuals & UI',
          effects: 'Effects & Audio',
          ux: 'Probability & UX',
          embed: 'Embedding'
        },
        rules: {
          enableTimeLimit: 'Enable Time Limit',
          activeDays: 'Active Days',
          startTime: 'Start Time',
          endTime: 'End Time',
          enableDynamicProb: 'Enable Dynamic Probability',
          lossStreakLimit: 'Loss Streak Limit',
          lossStreakBonus: 'Loss Streak Bonus',
          enableBudget: 'Enable Budget Control',
          dailyBudget: 'Daily Budget',
          monthlyBudget: 'Monthly Budget',
          dailyLimit: 'Daily Limit',
          cooldown: 'Cooldown (Minutes)',
          minLevel: 'Min Level Requirement',
          accessControl: 'Access Control',
          requireLogin: 'Require Login',
          oneTimeOnly: 'One Time Only',
          vipTiers: 'VIP Tiers (Multiplier & Extra Spins)',
          days: {
            mon: 'Mon',
            tue: 'Tue',
            wed: 'Wed',
            thu: 'Thu',
            fri: 'Fri',
            sat: 'Sat',
            sun: 'Sun'
          }
        },
        visuals: {
          themePreset: 'Theme Preset',
          bgSettings: 'Background Settings',
          bgType: 'Background Type',
          bgGradStart: 'Start Color',
          bgGradEnd: 'End Color',
          bgGradDir: 'Direction',
          bgColor: 'Background Color',
          bgImage: 'Background Image',
          bgFit: 'Image Fit',
          bgBlur: 'Blur',
          bgOpacity: 'Opacity',
          spinDuration: 'Spin Duration (s)',
          spinTurns: 'Spin Turns',
          gameFont: 'Custom Font',
          fontSettings: 'Font Settings',
          fontPreset: 'Font Style',
          customFont: 'Upload Custom Font',
          brandLogo: 'Brand Logo',
          titleImage: 'Logo Image',
          logoWidth: 'Logo Width',
          logoTopMargin: 'Top Margin',
          logoOpacity: 'Logo Opacity',
          logoDropShadow: 'Drop Shadow',
          centerHub: 'Center Hub',
          centerType: 'Center Type',
          centerEmoji: 'Select Icon',
          centerImage: 'Center Image',
          centerSize: 'Center Size',
          centerBorder: 'Border',
          centerShadow: 'Shadow',
          pointer: 'Pointer Settings',
          pointerImage: 'Pointer Image',
          pointerDirection: 'Direction',
          pointerSize: 'Size',
          pointerShadow: 'Shadow',
          wheelBorder: 'Wheel Border',
          wheelBorderImage: 'Border Image',
          wheelBorderSize: 'Border Size',
          wheelBorderOpacity: 'Opacity',
          tokenBar: 'Token Bar',
          tokenBarImage: 'Background Image',
          tokenBarColor: 'Background Color',
          tokenBarTextColor: 'Text Color',
          tokenBarShadow: 'Shadow',
          spinButton: 'Spin Button',
          spinBtnText: 'Button Text',
          spinBtnSubtext: 'Subtext',
          spinBtnColor: 'Button Color',
          spinBtnTextColor: 'Text Color',
          spinBtnShadow: 'Shadow',
          spinBtnImage: 'Button Image',
          divider: 'Divider Settings',
          dividerType: 'Type',
          dividerColor: 'Color',
          dividerStroke: 'Thickness',
          dividerImage: 'Divider Image',
          audio: 'Audio Settings',
          soundEnabled: 'Enable Sound',
          repeatWinSound: 'Repeat Win Sound',
          jackpotSound: 'Jackpot Sound Effect',
          interact: 'Interaction Mode',
          clickToSpin: 'Click to Spin',
          swipeToSpin: 'Swipe to Spin',
          prizeList: 'Prize List',
          verticalOffset: 'Vertical Offset',
          layerPriority: 'Layer Priority',
          behindPrizes: '🔽 Behind Prizes',
          inFrontOfPrizes: '🔼 In Front of Prizes',
          hubSize: 'Hub Size',
          border: 'Border',
          shadow: 'Shadow',
          topPos: 'Top Position',
          logoWidth: 'Logo Width',
          topMargin: 'Top Margin',
          enableDropShadow: 'Enable Drop Shadow',
          backgroundImage: 'Background Image',
          backgroundColor: 'Background Color',
          textColor: 'Text Color',
          buttonText: 'Button Text',
          subtext: 'Subtext',
          buttonColor: 'Button Color',
          width: 'Width',
          height: 'Height',
          customImage: 'Custom Image',
          gameFont: 'Game Font',
          fontPreset: 'Font Preset',
          customFontFile: 'Custom Font File',
          direction: 'Direction',
          type: 'Type',
          contentType: 'Content Type',
          selectIcon: 'Select Icon',
          imageFillMethod: 'Image Fill Method',
          wheelBorderFrame: 'Wheel Border / Frame',
          sliceDividers: 'Slice Dividers',
          centerHubSection: 'Center Hub',
          pointerSection: 'Pointer',
          brandLogoSection: 'Brand Logo',
          tokenBarSection: 'Token Bar',
          spinButtonSection: 'Spin Button'
        },
        prizes: {
          visualTemplate: 'Visual Template',
          quickTemplate: 'Quick Template',
          prizeSegments: 'Prize Segments',
          prizeList: 'Prize List',
          prizeConfiguration: 'Prize Configuration'
        },
        effects: {
          ultraFeatures: 'Premium Features',
          enableBGM: 'Background Music',
          enableLedRing: 'LED Ring Animation',
          enableConfetti: 'Confetti on Win',
          enableStartScreen: 'Start Screen',
          enableHexagons: 'Floating Hexagons',
          enableGridFloor: 'Cyber Grid Floor',
          bgmSettings: 'BGM Settings',
          bgmUrl: 'BGM File (.mp3)',
          bgmVolume: 'BGM Volume',
          bgmLoop: 'Loop BGM',
          ledSettings: 'LED Ring Settings',
          ledCount: 'LED Count',
          ledSpeed: 'Speed (ms)',
          ledColor1: 'Color 1',
          ledColor2: 'Color 2',
          ledColor3: 'Color 3',
          resultSounds: 'Result Sounds',
          winSound: 'Win Sound (.mp3)',
          loseSound: 'Lose Sound (.mp3)',
          jackpotSoundFile: 'Jackpot Sound (.mp3)',
          tickSound: 'Tick Sound',
          tickVolume: 'Tick Volume',
          soundButtonSettings: 'Sound Button Settings',
          showSoundButton: 'Show Sound Button',
          soundButtonOpacity: 'Sound Button Opacity',
          confettiSettings: 'Confetti Settings',
          confettiParticles: 'Particle Count',
          confettiSpread: 'Spread Angle',
          confettiColors: 'Colors (hex)',
          neonColors: 'Neon / Glow Colors',
          neonCyan: 'Cyan',
          neonPink: 'Pink',
          neonPurple: 'Purple',
          neonGold: 'Gold',
          neonGreen: 'Green',
          darkBg: 'Dark Background',
          resultMessages: 'Result Messages',
          jackpotTitle: 'Jackpot Title',
          jackpotSubtitle: 'Jackpot Subtitle',
          winTitle: 'Win Title',
          winSubtitle: 'Win Subtitle',
          loseTitle: 'Lose Title',
          loseSubtitle: 'Lose Subtitle'
        },
        tabEmbed: 'Embed Settings',
        iframeCode: 'HTML Iframe Code'
      }
    },
    login: {
      common: {
        loginOrRegister: 'Login / Register',
        userNamePlaceholder: 'Please enter user name',
        emailPlaceholder: 'Please enter email address',
        phonePlaceholder: 'Please enter phone number',
        codePlaceholder: 'Please enter verification code',
        passwordPlaceholder: 'Please enter password',
        confirmPasswordPlaceholder: 'Please enter password again',
        codeLogin: 'Verification code login',
        confirm: 'Confirm',
        back: 'Back',
        validateSuccess: 'Verification passed',
        loginSuccess: 'Login successfully',
        welcomeBack: 'Welcome back, {userName} !',
        invalidPassword: 'Password incorrect',
        userNotFound: 'Login username/password error'
      },
      pwdLogin: {
        title: 'Password Login',
        rememberMe: 'Remember me',
        forgetPassword: 'Forget password?',
        register: 'Register',
        otherAccountLogin: 'Other Account Login',
        otherLoginMode: 'Other Login Mode',
        superAdmin: 'Super Admin',
        admin: 'Admin',
        user: 'User'
      },
      codeLogin: {
        title: 'Verification Code Login',
        getCode: 'Get verification code',
        reGetCode: 'Reacquire after {time}s',
        sendCodeSuccess: 'Verification code sent successfully',
        imageCodePlaceholder: 'Please enter image verification code'
      },
      register: {
        title: 'Register',
        agreement: 'I have read and agree to',
        protocol: '《User Agreement》',
        policy: '《Privacy Policy》'
      },
      resetPwd: {
        title: 'Reset Password'
      },
      bindWeChat: {
        title: 'Bind WeChat'
      }
    },
    home: {
      branchDesc:
        'For the convenience of everyone in developing and updating the merge, we have streamlined the code of the main branch, only retaining the homepage menu, and the rest of the content has been moved to the example branch for maintenance. The preview address displays the content of the example branch.',
      greeting: 'Good morning, {userName}, today is another day full of vitality!',
      weatherDesc: 'Today is cloudy to clear, 20℃ - 25℃!',
      projectCount: 'Project Count',
      todo: 'Todo',
      message: 'Message',
      downloadCount: 'Download Count',
      registerCount: 'Register Count',
      schedule: 'Work and rest Schedule',
      study: 'Study',
      work: 'Work',
      rest: 'Rest',
      entertainment: 'Entertainment',
      visitCount: 'Visit Count',
      turnover: 'Turnover',
      dealCount: 'Deal Count',
      projectNews: {
        title: 'Project News',
        moreNews: 'More News',
        desc1: 'Soybean created the open source project soybean-admin on May 28, 2021!',
        desc2: 'Yanbowe submitted a bug to soybean-admin, the multi-tab bar will not adapt.',
        desc3: 'Soybean is ready to do sufficient preparation for the release of soybean-admin!',
        desc4: 'Soybean is busy writing project documentation for soybean-admin!',
        desc5: 'Soybean just wrote some of the workbench pages casually, and it was enough to see!'
      },
      creativity: 'Creativity'
    }
  },
  form: {
    required: 'Cannot be empty',
    userName: {
      required: 'Please enter user name',
      invalid: 'User name format is incorrect'
    },
    phone: {
      required: 'Please enter phone number',
      invalid: 'Phone number format is incorrect'
    },
    pwd: {
      required: 'Please enter password',
      invalid: '6-18 characters, including letters, numbers, and underscores'
    },
    confirmPwd: {
      required: 'Please enter password again',
      invalid: 'The two passwords are inconsistent'
    },
    code: {
      required: 'Please enter verification code',
      invalid: 'Verification code format is incorrect'
    },
    email: {
      required: 'Please enter email',
      invalid: 'Email format is incorrect'
    }
  },
  dropdown: {
    closeCurrent: 'Close Current',
    closeOther: 'Close Other',
    closeLeft: 'Close Left',
    closeRight: 'Close Right',
    closeAll: 'Close All',
    pin: 'Pin Tab',
    unpin: 'Unpin Tab'
  },
  icon: {
    themeConfig: 'Theme Configuration',
    themeSchema: 'Theme Schema',
    lang: 'Switch Language',
    fullscreen: 'Fullscreen',
    fullscreenExit: 'Exit Fullscreen',
    reload: 'Reload Page',
    collapse: 'Collapse Menu',
    expand: 'Expand Menu',
    pin: 'Pin',
    unpin: 'Unpin'
  },
  datatable: {
    itemCount: 'Total {total} items',
    fixed: {
      left: 'Left Fixed',
      right: 'Right Fixed',
      unFixed: 'Unfixed'
    }
  }
};

export default local;
