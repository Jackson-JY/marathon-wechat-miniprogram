// index.js
Page({
  data: {
    showTip: false,
    title: "",
    content: "",
    // 马拉松主题数据
    totalRuns: 0,
    totalDistance: 0,
    bestTime: '--',
    recentActivities: [],
    showDevFeatures: false, // 控制是否显示开发者功能
    powerList: [
      {
        title: '云托管',
        tip: '不限语言的全托管容器服务',
        showItem: false,
        item: [
          {
            type: 'cloudbaserun',
            title: '云托管调用',
          },
        ],
      },
      {
        title: '云函数',
        tip: '安全、免鉴权运行业务代码',
        showItem: false,
        item: [
          {
            type: 'getOpenId',
            title: '获取OpenId',
          },
          {
            type: 'getMiniProgramCode',
            title: '生成小程序码',
          },
        ],
      },
      {
        title: '数据库',
        tip: '安全稳定的文档型数据库',
        showItem: false,
        item: [
          {
            type: 'createCollection',
            title: '创建集合',
          },
          {
            type: 'selectRecord',
            title: '增删改查记录',
          },
        ],
      },
      {
        title: '云存储',
        tip: '自带CDN加速文件存储',
        showItem: false,
        item: [
          {
            type: 'uploadFile',
            title: '上传文件',
          },
        ],
      },
      {
        title: '拓展能力-AI',
        tip: '云开发 AI 拓展能力',
        showItem: false,
        item: [
          {
            type: 'model-guide',
            title: '大模型对话指引'
          },
        ],
      },
    ],
    haveCreateCollection: false,
  },

  onLoad() {
    this.loadUserData();
    this.loadRecentActivities();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadUserData();
  },

  // 加载用户数据
  loadUserData() {
    // 这里应该从云数据库或本地存储加载用户数据
    // 暂时使用模拟数据
    this.setData({
      totalRuns: 12,
      totalDistance: 156.8,
      bestTime: '3:45:20'
    });
    
    // 加载运动记录数量
    this.loadExerciseRecordsCount();
  },

  // 加载运动记录数量
  async loadExerciseRecordsCount() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'exerciseDataFunctions',
        data: {
          type: 'getExerciseStats'
        }
      });

      if (result.result.success) {
        this.setData({
          exerciseRecords: result.result.data.totalActivities
        });
      }
    } catch (error) {
      console.log('加载运动记录数量失败:', error);
      // 如果云函数未部署，使用默认值
      this.setData({
        exerciseRecords: 0
      });
    }
  },

  // 加载最近活动
  loadRecentActivities() {
    // 模拟活动数据
    const activities = [
      {
        id: 1,
        icon: '🏃‍♂️',
        title: '完成10公里训练',
        time: '昨天 18:30',
        status: 'completed',
        statusText: '已完成'
      },
      {
        id: 2,
        icon: '🏁',
        title: '报名2024北京马拉松',
        time: '3天前',
        status: 'upcoming',
        statusText: '报名成功'
      },
      {
        id: 3,
        icon: '📊',
        title: '更新个人最佳成绩',
        time: '1周前',
        status: 'completed',
        statusText: '已更新'
      }
    ];

    this.setData({
      recentActivities: activities
    });
  },

  // 导航到训练计划页面
  navigateToTraining() {
    wx.showToast({
      title: '训练计划功能开发中',
      icon: 'none'
    });
    // TODO: 实现页面跳转
    // wx.navigateTo({
    //   url: '/pages/training/index'
    // });
  },

  // 导航到赛事管理页面
  navigateToRaces() {
    wx.showToast({
      title: '赛事管理功能开发中',
      icon: 'none'
    });
    // TODO: 实现页面跳转
    // wx.navigateTo({
    //   url: '/pages/races/index'
    // });
  },

  // 导航到成绩记录页面
  navigateToRecords() {
    wx.showToast({
      title: '成绩记录功能开发中',
      icon: 'none'
    });
    // TODO: 实现页面跳转
    // wx.navigateTo({
    //   url: '/pages/records/index'
    // });
  },

  // 导航到跑友社区页面
  navigateToCommunity() {
    wx.showToast({
      title: '跑友社区功能开发中',
      icon: 'none'
    });
    // TODO: 实现页面跳转
    // wx.navigateTo({
    //   url: '/pages/community/index'
    // });
  },

  // 导航到运动数据页面
  navigateToExerciseData() {
    wx.navigateTo({
      url: '/pages/exerciseData/index'
    });
  },

  // 开始跑步
  startRunning() {
    wx.showToast({
      title: '开始跑步功能开发中',
      icon: 'none'
    });
    // TODO: 实现跑步功能
    // wx.navigateTo({
    //   url: '/pages/running/index'
    // });
  },

  // 报名赛事
  joinRace() {
    wx.showToast({
      title: '赛事报名功能开发中',
      icon: 'none'
    });
    // TODO: 实现赛事报名
    // wx.navigateTo({
    //   url: '/pages/race-registration/index'
    // });
  },

  // 显示/隐藏开发者功能
  toggleDevFeatures() {
    this.setData({
      showDevFeatures: !this.data.showDevFeatures
    });
  },

  // 原有的云开发功能方法
  onClickPowerInfo(e) {
    const app = getApp()
    if(!app.globalData.env) {
      wx.showModal({
        title: '提示',
        content: '请在 `miniprogram/app.js` 中正确配置 `env` 参数'
      })
      return 
    }
    console.log("click e", e)
    const index = e.currentTarget.dataset.index;
    const powerList = this.data.powerList;
    powerList[index].showItem = !powerList[index].showItem;
    if (powerList[index].title === '数据库' && !powerList[index].showItem) {
      this.setData({
        haveCreateCollection: false
      });
    }
    this.setData({
      powerList
    });
  },

  jumpPage(e) {
    const type = e.currentTarget.dataset.type;
    const page = e.currentTarget.dataset.page;
    if (type === 'cloudbaserun') {
      this.callCloudBaseRun();
    } else if (type === 'getOpenId') {
      this.getOpenId();
    } else if (type === 'getMiniProgramCode') {
      this.getMiniProgramCode();
    } else if (type === 'createCollection') {
      this.createCollection();
    } else if (type === 'selectRecord') {
      this.selectRecord();
    } else if (type === 'uploadFile') {
      this.uploadFile();
    } else if (type === 'model-guide') {
      this.modelGuide();
    }
  },

  callCloudBaseRun() {
    wx.showLoading({
      title: '调用中...',
    });
    wx.cloud.callContainer({
      config: {
        env: 'test-0g0g0g0g0g0g0g0g',
      },
      path: '/api/hello',
      header: {
        'X-WX-SERVICE': 'golang-xxxxx',
      },
      method: 'POST',
      data: {
        name: 'CloudBase Run',
        data: {
          message: 'Hello from CloudBase Run!'
        }
      },
      success: (res) => {
        console.log('callContainer success: ', res);
        this.setData({
          showTip: true,
          title: '调用成功',
          content: JSON.stringify(res.data)
        });
      },
      fail: (err) => {
        console.error('callContainer fail: ', err);
        this.setData({
          showTip: true,
          title: '调用失败',
          content: JSON.stringify(err)
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  getOpenId() {
    wx.showLoading({
      title: '获取中...',
    });
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getOpenId',
      },
      success: (res) => {
        console.log('云函数调用成功: ', res);
        this.setData({
          showTip: true,
          title: '获取成功',
          content: JSON.stringify(res.result)
        });
      },
      fail: (err) => {
        console.error('云函数调用失败: ', err);
        this.setData({
          showTip: true,
          title: '获取失败',
          content: JSON.stringify(err)
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  getMiniProgramCode() {
    wx.showLoading({
      title: '生成中...',
    });
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getMiniProgramCode',
      },
      success: (res) => {
        console.log('云函数调用成功: ', res);
        this.setData({
          showTip: true,
          title: '生成成功',
          content: JSON.stringify(res.result)
        });
      },
      fail: (err) => {
        console.error('云函数调用失败: ', err);
        this.setData({
          showTip: true,
          title: '生成失败',
          content: JSON.stringify(err)
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  createCollection() {
    const db = wx.cloud.database();
    db.createCollection('todos').then((res) => {
      this.setData({
        haveCreateCollection: true
      });
      this.setData({
        showTip: true,
        title: '创建成功',
        content: 'todos 集合创建成功'
      });
    }).catch((err) => {
      console.error('创建失败: ', err);
      this.setData({
        showTip: true,
        title: '创建失败',
        content: JSON.stringify(err)
      });
    });
  },

  selectRecord() {
    const db = wx.cloud.database();
    db.collection('todos').add({
      data: {
        description: '学习云开发数据库操作',
        due: new Date('2020-09-01'),
        done: false,
        progress: 0,
        tags: ['cloud', 'database'],
        location: 'Guangzhou',
        addTime: new Date()
      }
    }).then((res) => {
      this.setData({
        showTip: true,
        title: '添加成功',
        content: JSON.stringify(res)
      });
    }).catch((err) => {
      console.error('添加失败: ', err);
      this.setData({
        showTip: true,
        title: '添加失败',
        content: JSON.stringify(err)
      });
    });
  },

  uploadFile() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    }).then((res) => {
      const tempFilePaths = res.tempFilePaths;
      const uploadTask = wx.cloud.uploadFile({
        cloudPath: `example_${Date.now()}.png`,
        filePath: tempFilePaths[0],
        success: (res) => {
          console.log('上传成功: ', res);
          this.setData({
            showTip: true,
            title: '上传成功',
            content: JSON.stringify(res)
          });
        },
        fail: (err) => {
          console.error('上传失败: ', err);
          this.setData({
            showTip: true,
            title: '上传失败',
            content: JSON.stringify(err)
          });
        }
      });
    }).catch((err) => {
      console.error('选择图片失败: ', err);
    });
  },

  modelGuide() {
    wx.showModal({
      title: 'AI 拓展能力',
      content: '云开发 AI 拓展能力，支持大模型对话、图像识别等功能。详细使用请参考官方文档。',
      showCancel: false
    });
  }
});
