// index.js
Page({
  data: {
    // 数据概览
    totalActivities: 0,
    totalDistance: 0,
    totalDuration: 0,
    totalCalories: 0,


    

    
    // 心率趋势数据
    hrTrendData: [],
    hrTrendYAxisLabels: [],
    hrTrendLineSegments: [],
    
    // 个人最佳记录
    personalBests: [],
    
    // 筛选器
    timeRanges: ['最近7天', '最近30天', '最近3个月', '最近6个月', '最近1年', '全部'],
    timeRangeIndex: 3,
    filterActivityTypes: ['全部', '跑步', '骑行', '游泳', '徒步', '健身'],
    filterActivityTypeIndex: -1,
    

    
    // 加载状态
    loading: false
  },

  onLoad() {
    this.loadVisualizationData();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadVisualizationData();
  },

  // 加载可视化数据
  async loadVisualizationData() {
    this.setData({ loading: true });
    
    try {
      console.log('开始加载可视化数据...');
      
      // 获取运动统计数据
      console.log('调用getExerciseStats云函数...');
      const statsResult = await wx.cloud.callFunction({
        name: 'exerciseDataFunctions',
        data: { type: 'getExerciseStats' }
      });

      console.log('getExerciseStats结果:', statsResult);

      if (statsResult.result && statsResult.result.success) {
        const stats = statsResult.result.data;
        console.log('统计数据:', stats);
        this.processOverviewData(stats);
        this.processPersonalBests(stats);
      } else {
        console.error('getExerciseStats失败:', statsResult);
      }

      // 获取详细数据用于图表
      console.log('调用queryExerciseRecords云函数...');
      const recordsResult = await wx.cloud.callFunction({
        name: 'exerciseDataFunctions',
        data: { 
          type: 'queryExerciseRecords',
          page: 1,
          pageSize: 1000
        }
      });

      console.log('queryExerciseRecords结果:', recordsResult);

      if (recordsResult.result && recordsResult.result.success) {
        const records = recordsResult.result.data.records; // 修复：正确获取records数组
        
        // 添加调试信息和错误处理
        console.log('获取到的记录数据:', records);
        console.log('数据类型:', typeof records);
        console.log('是否为数组:', Array.isArray(records));
        
        if (Array.isArray(records)) {
          this.processHeartRateTrendData(records);
        } else {
          console.error('记录数据不是数组格式:', records);
          // 心率分析功能已移除，只保留心率趋势图
          this.processHeartRateTrendData([]);
        }
      } else {
        console.error('queryExerciseRecords失败:', recordsResult);
        // 心率分析功能已移除，只保留心率趋势图
        this.processHeartRateTrendData([]);
      }

    } catch (error) {
      console.error('加载可视化数据失败:', error);
      wx.showToast({
        title: '数据加载失败: ' + error.message,
        icon: 'none'
      });
      
      // 发生错误时，设置默认的空数据
      // 心率分析功能已移除，只保留心率趋势图
      this.processHeartRateTrendData([]);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 处理概览数据
  processOverviewData(stats) {
    this.setData({
      totalActivities: stats.totalActivities || 0,
      totalDistance: Math.round((stats.totalDistance || 0) / 1000 * 10) / 10, // 转换为km
      totalDuration: Math.round((stats.totalDuration || 0) / 3600 * 10) / 10, // 转换为小时
      totalCalories: Math.round((stats.totalCalories || 0) / 1000 * 10) / 10 // 转换为k
    });
  },









  // 处理心率趋势数据
  processHeartRateTrendData(records) {
    console.log('处理心率趋势数据，记录数量:', records ? records.length : 'undefined');
    
    if (!records || !Array.isArray(records) || records.length === 0) {
      console.log('心率趋势数据为空或格式错误，设置默认值');
      this.setData({ 
        hrTrendData: [],
        hrTrendYAxisLabels: [],
        hrTrendLineSegments: []
      });
      return;
    }

    // 筛选有心率数据的记录
    const hrRecords = records.filter(record => record.avgHr && record.startTime);
    
    if (hrRecords.length === 0) {
      console.log('没有心率数据记录');
      this.setData({ 
        hrTrendData: [],
        hrTrendYAxisLabels: [],
        hrTrendLineSegments: []
      });
      return;
    }

    // 按日期分组，计算每天的平均心率
    const dailyHrStats = {};
    hrRecords.forEach(record => {
      const date = new Date(record.startTime);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD格式
      
      if (!dailyHrStats[dateKey]) {
        dailyHrStats[dateKey] = {
          totalHr: 0,
          count: 0,
          date: dateKey
        };
      }
      
      dailyHrStats[dateKey].totalHr += record.avgHr;
      dailyHrStats[dateKey].count += 1;
    });

    // 转换为数组并排序
    const dailyData = Object.values(dailyHrStats)
      .map(day => ({
        date: day.date,
        avgHr: Math.round(day.totalHr / day.count)
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // 限制显示最近30天的数据
    const recentData = dailyData.slice(-30);

    // 计算Y轴范围，让Y轴从0开始
    const maxHr = Math.max(...recentData.map(d => d.avgHr));
    const yAxisMin = 0; // Y轴从0开始
    const yAxisMax = Math.max(200, maxHr + 20); // 确保有足够的显示空间

    // 统一坐标系统：确保Y轴标签、网格线、数据点完全一致
    // 坐标系统定义：top: 0% = 最大心率, top: 100% = 0 BPM
    // 这是标准的数学坐标系统：Y轴向上为正方向
    
    // 生成Y轴标签和网格线位置，确保完全对应
    // 关键：Y轴标签应该与网格线位置完全对应，而不是按索引均匀分布
    const yLabels = [];
    const gridLinePositions = [];
    
    // 生成5个均匀分布的网格线位置（0%, 25%, 50%, 75%, 100%）
    for (let i = 0; i <= 4; i++) {
      const topPosition = (i / 4) * 100; // 0%, 25%, 50%, 75%, 100%
      gridLinePositions.push(topPosition);
      
      // 根据网格线位置计算对应的Y轴标签值
      // 反向计算：top: 0% = 最大心率, top: 100% = 0 BPM
      const heartRate = yAxisMax - (topPosition / 100) * yAxisMax;
      yLabels.push(Math.round(heartRate));
    }
    
    // 验证坐标系统一致性
    console.log('=== 坐标系统统一验证 ===');
    console.log('Y轴范围:', { maxHr, yAxisMax });
    console.log('Y轴标签:', yLabels);
    console.log('网格线位置:', gridLinePositions);
    console.log('网格线位置对应关系:');
    for (let i = 0; i < yLabels.length; i++) {
      console.log(`  - top: ${gridLinePositions[i]}% → 心率: ${yLabels[i]} BPM`);
      // 验证网格线位置与Y轴标签的一致性
      const expectedHeartRate = yAxisMax - (gridLinePositions[i] / 100) * yAxisMax;
      console.log(`  - 验证: top: ${gridLinePositions[i]}% 应该对应心率: ${Math.round(expectedHeartRate)} BPM (实际: ${yLabels[i]} BPM)`);
    }
    console.log('========================');

    // 转换为图表数据 - 使用统一的坐标系统
    const trendData = recentData.map((day, index) => {
      // 调整x轴位置计算，确保标签不重叠
      // 使用固定间距而不是百分比，避免标签重叠
      const xPosition = index * 80 + 40; // 每个标签间隔80px，起始位置40px
      
      // 统一坐标系统：确保数据点位置与网格线位置完全一致
      // 网格线位置：top: 0% = 最大心率, top: 100% = 0 BPM
      // 数据点位置：心率值应该映射到对应的网格线位置
      // 使用线性映射：心率从0到yAxisMax，映射到top从100%到0%
      const yPosition = 100 - (day.avgHr / yAxisMax) * 100;
      
      // 验证数据点位置与网格线的一致性
      console.log(`数据点 ${day.date}: 心率=${day.avgHr}, Y位置=${yPosition}%, 网格线对齐验证:`);
      console.log(`  - 心率=${day.avgHr}, yAxisMax=${yAxisMax}`);
      console.log(`  - 计算: 100 - (${day.avgHr} / ${yAxisMax}) * 100 = ${yPosition}%`);
      
      // 基本的数据点信息输出
      console.log(`  - 心率: ${day.avgHr} BPM, Y位置: ${yPosition.toFixed(2)}%`);
      
      return {
        date: this.formatDateForDisplay(day.date),
        avgHr: day.avgHr,
        xPosition: xPosition,
        yPosition: yPosition
      };
    });



    // 统一坐标系统最终验证
    console.log('=== 统一坐标系统最终验证 ===');
    console.log('Y轴范围:', { maxHr, yAxisMax });
    console.log('Y轴标签:', yLabels);
    console.log('网格线位置:', gridLinePositions);
    console.log('网格线位置对应关系:');
    for (let i = 0; i < yLabels.length; i++) {
      console.log(`  - top: ${gridLinePositions[i]}% → 心率: ${yLabels[i]} BPM`);
    }
    

    
    console.log('数据点位置验证:');
    trendData.forEach((point, index) => {
      console.log(`  - 数据点${index}: 心率=${point.avgHr}, Y位置=${point.yPosition}%`);
    });
    
    // 简化的网格线信息输出
    console.log('网格线信息:');
    for (let i = 0; i < yLabels.length; i++) {
      console.log(`  - 网格线${i}: 位置${gridLinePositions[i]}%, 心率${yLabels[i]} BPM`);
    }
    
    console.log('=== 坐标系统信息 ===');
    console.log('✓ 使用统一坐标系统: top: 0% = 最大心率, top: 100% = 0 BPM');
    console.log('========================');
    
    this.setData({
      hrTrendData: trendData,
      hrTrendYAxisLabels: yLabels,
      gridLinePositions: gridLinePositions
    });
  },

  // 格式化日期显示
  formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  },

  // 图表滑动事件处理
  onChartScroll(e) {
    // 可以在这里添加滑动相关的逻辑
    // 例如记录滑动位置、触发其他事件等
    console.log('图表滑动:', e.detail);
  },

  // 处理个人最佳记录
  processPersonalBests(stats) {
    if (!stats.personalBests) {
      this.setData({ personalBests: [] });
      return;
    }

    const personalBests = [
      {
        type: 'distance',
        icon: '🏃‍♂️',
        title: '最长距离',
        value: `${Math.round((stats.personalBests.longestDistance || 0) / 1000 * 10) / 10}km`,
        date: stats.personalBests.longestDistanceDate || '暂无'
      },
      {
        type: 'duration',
        icon: '⏱️',
        title: '最长时间',
        value: `${Math.round((stats.personalBests.longestDuration || 0) / 3600 * 10) / 10}h`,
        date: stats.personalBests.longestDurationDate || '暂无'
      },
      {
        type: 'pace',
        icon: '⚡',
        title: '最快配速',
        value: `${Math.round((stats.personalBests.fastestPace || 0) * 10) / 10}min/km`,
        date: stats.personalBests.fastestPaceDate || '暂无'
      },
      {
        type: 'calories',
        icon: '🔥',
        title: '单次最高卡路里',
        value: `${Math.round((stats.personalBests.highestCalories || 0) / 1000 * 10) / 10}k`,
        date: stats.personalBests.highestCaloriesDate || '暂无'
      }
    ];

    this.setData({ personalBests: personalBests });
  },



  // 时间范围筛选变化
  onTimeRangeChange(e) {
    this.setData({
      timeRangeIndex: e.detail.value
    });
  },

  // 活动类型筛选变化
  onFilterActivityTypeChange(e) {
    this.setData({
      filterActivityTypeIndex: e.detail.value
    });
  },

  // 重置筛选
  resetFilters() {
    this.setData({
      timeRangeIndex: 3,
      filterActivityTypeIndex: -1
    });
  },

  // 应用筛选
  applyFilters() {
    // 重新加载数据并应用筛选
    this.loadVisualizationData();
    wx.showToast({
      title: '筛选已应用',
      icon: 'success'
    });
  },

  // 导出图表图片
  exportChartImage() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 导出数据报告
  exportDataReport() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 分享可视化
  shareVisualization() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  }
});
