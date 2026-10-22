export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/library/index',
    'pages/plans/index',
    'pages/log/index',
    'pages/me/index',
  ],
  subPackages: [
    {
      root: 'pkg',
      pages: [
        'pages/detail/index',
        'pages/plan-detail/index',
        'pages/picker/index',
        'pages/workout/index',
        'pages/tools/index',
        'pages/body/index',
        'pages/diet/index',
      ],
    },
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '铁馆伴侣',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#FF5722',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        iconPath: 'assets/tabbar/home.svg',
        selectedIconPath: 'assets/tabbar/home-selected.svg',
      },
      {
        pagePath: 'pages/library/index',
        text: '动作库',
        iconPath: 'assets/tabbar/library.svg',
        selectedIconPath: 'assets/tabbar/library-selected.svg',
      },
      {
        pagePath: 'pages/plans/index',
        text: '计划',
        iconPath: 'assets/tabbar/plans.svg',
        selectedIconPath: 'assets/tabbar/plans-selected.svg',
      },
      {
        pagePath: 'pages/log/index',
        text: '记录',
        iconPath: 'assets/tabbar/log.svg',
        selectedIconPath: 'assets/tabbar/log-selected.svg',
      },
      {
        pagePath: 'pages/me/index',
        text: '我的',
        iconPath: 'assets/tabbar/me.svg',
        selectedIconPath: 'assets/tabbar/me-selected.svg',
      },
    ],
  },
});
