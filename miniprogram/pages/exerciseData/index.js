const app = getApp();

Page({
  data: {
    singleRecord: {
      name: '',
      activityType: 'running',
      distance: '',
      duration: '',
      avgHr: '',
      calories: ''
    },
    activityTypes: ['running', 'cycling', 'swimming', 'walking', 'hiking'],
    activityTypeIndex: 0,
    queryActivityTypeIndex: -1,
    batchCount: 5,
    queryPage: 1,
    queryPageSize: 10,
    queryResult: [],
    stats: null,
    logs: [],
    
    // 文本数据插入相关
    textData: '',
    dataFormats: ['Garmin JSON', '标准JSON', 'CSV格式', '自定义格式'],
    dataFormatIndex: 0,
    parsedRecords: [],
    validateData: true,
    overwriteData: false,
    
    // 文件上传相关
    selectedFile: null,
    fileContent: '',
    uploadProgress: 0,
    autoParse: true,
    showProgressBar: false
  },

  onLoad() {
    this.addLog('页面加载完成');
  },

  // 活动类型选择器变化
  onActivityTypeChange(e) {
    const index = e.detail.value;
    this.setData({
      activityTypeIndex: index,
      'singleRecord.activityType': this.data.activityTypes[index]
    });
  },

  // 查询活动类型选择器变化
  onQueryActivityTypeChange(e) {
    const index = e.detail.value;
    this.setData({
      queryActivityTypeIndex: index
    });
  },

  // 插入单条记录
  async insertSingleRecord() {
    const record = this.data.singleRecord;
    
    // 数据验证
    if (!record.name || !record.distance || !record.duration) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '插入中...' });

    try {
      const result = await wx.cloud.callFunction({
        name: 'exerciseDataFunctions',
        data: {
          type: 'insertExerciseRecord',
          data: {
            activityId: Date.now(), // 临时ID
            name: record.name,
            activityType: record.activityType,
            distance: Number(record.distance),
            duration: Number(record.duration),
            avgHr: record.avgHr ? Number(record.avgHr) : null,
            calories: record.calories ? Number(record.calories) : null,
            startTime: new Date().toISOString()
          }
        }
      });

      if (result.result.success) {
        wx.showToast({
          title: '插入成功',
          icon: 'success'
        });
        this.addLog(`成功插入运动记录: ${record.name}`);
        this.clearSingleRecordForm();
      } else {
        throw new Error(result.result.errMsg);
      }
    } catch (error) {
      wx.showToast({
        title: '插入失败: ' + error.message,
        icon: 'none'
      });
      this.addLog(`插入失败: ${error.message}`);
    } finally {
      wx.hideLoading();
    }
  },

  // 批量插入记录
  async insertBatchRecords() {
    const count = this.data.batchCount;
    if (!count || count <= 0) {
      wx.showToast({
        title: '请输入有效的记录数量',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '批量插入中...' });

    try {
      // 生成测试数据
      const testRecords = [];
      for (let i = 0; i < count; i++) {
        testRecords.push({
          activityId: Date.now() + i,
          name: `测试运动${i + 1}`,
          activityType: this.data.activityTypes[Math.floor(Math.random() * this.data.activityTypes.length)],
          distance: Math.floor(Math.random() * 10000) + 1000,
          duration: Math.floor(Math.random() * 3600) + 600,
          avgHr: Math.floor(Math.random() * 50) + 120,
          calories: Math.floor(Math.random() * 500) + 100,
          startTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      const result = await wx.cloud.callFunction({
        name: 'exerciseDataFunctions',
        data: {
          type: 'batchInsertExerciseRecords',
          data: testRecords
        }
      });

      if (result.result.success) {
        wx.showToast({
          title: `成功插入${count}条记录`,
          icon: 'success'
        });
        this.addLog(`成功批量插入${count}条运动记录`);
      } else {
        throw new Error(result.result.errMsg);
      }
    } catch (error) {
      wx.showToast({
        title: '批量插入失败: ' + error.message,
        icon: 'none'
      });
      this.addLog(`批量插入失败: ${error.message}`);
    } finally {
      wx.hideLoading();
    }
  },

  // 查询记录
  async queryRecords() {
    wx.showLoading({ title: '查询中...' });

    try {
      const queryData = {
        page: this.data.queryPage,
        pageSize: this.data.queryPageSize
      };

      if (this.data.queryActivityTypeIndex >= 0) {
        queryData.activityType = this.data.activityTypes[this.data.queryActivityTypeIndex];
      }

      const result = await wx.cloud.callFunction({
        name: 'exerciseDataFunctions',
        data: {
          type: 'queryExerciseRecords',
          data: queryData
        }
      });

      if (result.result.success) {
        this.setData({
          queryResult: result.result.data.records
        });
        this.addLog(`查询成功，返回${result.result.data.records.length}条记录`);
      } else {
        throw new Error(result.result.errMsg);
      }
    } catch (error) {
      wx.showToast({
        title: '查询失败: ' + error.message,
        icon: 'none'
      });
      this.addLog(`查询失败: ${error.message}`);
    } finally {
      wx.hideLoading();
    }
  },

  // 获取统计信息
  async getStats() {
    wx.showLoading({ title: '获取统计中...' });

    try {
      const result = await wx.cloud.callFunction({
        name: 'exerciseDataFunctions',
        data: {
          type: 'getExerciseStats'
        }
      });

      if (result.result.success) {
        this.setData({
          stats: result.result.data
        });
        this.addLog('成功获取运动统计信息');
      } else {
        throw new Error(result.result.errMsg);
      }
    } catch (error) {
      wx.showToast({
        title: '获取统计失败: ' + error.message,
        icon: 'none'
      });
      this.addLog(`获取统计失败: ${error.message}`);
    } finally {
      wx.hideLoading();
    }
  },

  // 清空单条记录表单
  clearSingleRecordForm() {
    this.setData({
      singleRecord: {
        name: '',
        activityType: 'running',
        distance: '',
        duration: '',
        avgHr: '',
        calories: ''
      },
      activityTypeIndex: 0
    });
  },

  // 添加日志
  addLog(message) {
    const logs = this.data.logs;
    logs.unshift({
      time: new Date().toLocaleTimeString(),
      message: message
    });
    
    // 只保留最近20条日志
    if (logs.length > 20) {
      logs.splice(20);
    }
    
    this.setData({ logs });
  },

  // 数据格式选择器变化
  onDataFormatChange(e) {
    const index = e.detail.value;
    this.setData({
      dataFormatIndex: index
    });
    this.addLog(`选择数据格式: ${this.data.dataFormats[index]}`);
  },

  // 数据验证选项变化
  onValidateChange(e) {
    this.setData({
      validateData: e.detail.value.includes('validate')
    });
  },

  // 覆盖数据选项变化
  onOverwriteChange(e) {
    this.setData({
      overwriteData: e.detail.value.includes('overwrite')
    });
  },

  // 解析文本数据
  parseTextData() {
    const { textData, dataFormatIndex, validateData } = this.data;
    
    if (!textData.trim()) {
      wx.showToast({
        title: '请输入运动数据',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '解析数据中...' });

    try {
      let records = [];
      
      switch (dataFormatIndex) {
        case 0: // Garmin JSON
          records = this.parseGarminData(textData);
          break;
        case 1: // 标准JSON
          records = this.parseStandardJson(textData);
          break;
        case 2: // CSV格式
          records = this.parseCsvData(textData);
          break;
        case 3: // 自定义格式
          records = this.parseCustomData(textData);
          break;
        default:
          records = this.parseStandardJson(textData);
      }

      // 数据验证
      if (validateData) {
        const validation = this.validateExerciseRecords(records);
        if (validation.invalid > 0) {
          wx.showModal({
            title: '数据验证警告',
            content: `发现${validation.invalid}条无效数据，是否继续？`,
            success: (res) => {
              if (res.confirm) {
                this.setData({ parsedRecords: records });
                this.addLog(`解析成功: ${records.length}条记录，${validation.invalid}条无效`);
              }
            }
          });
          wx.hideLoading();
          return;
        }
      }

      this.setData({ parsedRecords: records });
      this.addLog(`解析成功: ${records.length}条记录`);
      
      wx.showToast({
        title: `解析成功: ${records.length}条记录`,
        icon: 'success'
      });

    } catch (error) {
      console.error('解析数据失败:', error);
      wx.showToast({
        title: '解析失败: ' + error.message,
        icon: 'none'
      });
      this.addLog(`解析失败: ${error.message}`);
    } finally {
      wx.hideLoading();
    }
  },

  // 解析Garmin数据
  parseGarminData(textData) {
    try {
      const data = JSON.parse(textData);
      
      if (!data.summarizedActivitiesExport || !Array.isArray(data.summarizedActivitiesExport)) {
        throw new Error('数据格式错误：缺少summarizedActivitiesExport数组');
      }

      return data.summarizedActivitiesExport.map(activity => this.transformGarminActivity(activity));
    } catch (error) {
      throw new Error('Garmin数据格式错误: ' + error.message);
    }
  },

  // 解析标准JSON数据
  parseStandardJson(textData) {
    try {
      const data = JSON.parse(textData);
      
      if (Array.isArray(data)) {
        return data;
      } else if (data.records && Array.isArray(data.records)) {
        return data.records;
      } else if (data.activities && Array.isArray(data.activities)) {
        return data.activities;
      } else {
        throw new Error('未找到有效的记录数组');
      }
    } catch (error) {
      throw new Error('JSON格式错误: ' + error.message);
    }
  },

  // 解析CSV数据
  parseCsvData(textData) {
    try {
      const lines = textData.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV数据至少需要标题行和一行数据');
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const records = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length === headers.length) {
          const record = {};
          headers.forEach((header, index) => {
            record[header] = values[index];
          });
          records.push(record);
        }
      }

      return records;
    } catch (error) {
      throw new Error('CSV格式错误: ' + error.message);
    }
  },

  // 解析自定义数据
  parseCustomData(textData) {
    try {
      // 尝试多种格式
      if (textData.trim().startsWith('{') || textData.trim().startsWith('[')) {
        return this.parseStandardJson(textData);
      } else if (textData.includes(',')) {
        return this.parseCsvData(textData);
      } else {
        throw new Error('无法识别的数据格式');
      }
    } catch (error) {
      throw new Error('自定义格式解析失败: ' + error.message);
    }
  },

  // 转换Garmin活动数据
  transformGarminActivity(garminActivity) {
    return {
      activityId: garminActivity.activityId || garminActivity.uuidMsb || Date.now(),
      name: garminActivity.name || '未命名运动',
      activityType: this.normalizeActivityType(garminActivity.activityType || garminActivity.sportType),
      distance: garminActivity.distance || 0,
      duration: garminActivity.duration || 0,
      avgSpeed: garminActivity.avgSpeed || 0,
      maxSpeed: garminActivity.maxSpeed || 0,
      avgHr: garminActivity.avgHr || null,
      maxHr: garminActivity.maxHr || null,
      minHr: garminActivity.minHr || null,
      avgPower: garminActivity.avgPower || garminActivity.normPower || null,
      maxPower: garminActivity.maxPower || null,
      avgRunCadence: garminActivity.avgRunCadence || null,
      maxRunCadence: garminActivity.maxRunCadence || null,
      steps: garminActivity.steps || null,
      calories: garminActivity.calories || 0,
      bmrCalories: garminActivity.bmrCalories || 0,
      startTime: this.parseTime(garminActivity.startTime || garminActivity.startTimeGmt || garminActivity.beginTimestamp),
      startTimeLocal: this.parseTime(garminActivity.startTimeLocal),
      startLatitude: garminActivity.startLatitude || null,
      startLongitude: garminActivity.startLongitude || null,
      endLatitude: garminActivity.endLatitude || null,
      endLongitude: garminActivity.endLongitude || null,
      elevationGain: garminActivity.elevationGain || 0,
      elevationLoss: garminActivity.elevationLoss || 0,
      aerobicTrainingEffect: garminActivity.aerobicTrainingEffect || null,
      avgVerticalOscillation: garminActivity.avgVerticalOscillation || null,
      avgGroundContactTime: garminActivity.avgGroundContactTime || null,
      avgStrideLength: garminActivity.avgStrideLength || null,
      avgFractionalCadence: garminActivity.avgFractionalCadence || null
    };
  },

  // 标准化活动类型
  normalizeActivityType(activityType) {
    if (!activityType) return 'unknown';
    
    const type = activityType.toLowerCase();
    
    if (type.includes('run') || type.includes('jog')) return 'running';
    if (type.includes('bike') || type.includes('cycle') || type.includes('cycling')) return 'cycling';
    if (type.includes('swim')) return 'swimming';
    if (type.includes('walk') || type.includes('hike')) return 'walking';
    if (type.includes('gym') || type.includes('workout') || type.includes('strength')) return 'strength_training';
    if (type.includes('yoga')) return 'yoga';
    
    return type;
  },

  // 解析时间数据
  parseTime(timeData) {
    if (!timeData) return null;
    
    try {
      if (typeof timeData === 'number') {
        return new Date(timeData).toISOString();
      }
      if (typeof timeData === 'string') {
        return new Date(timeData).toISOString();
      }
      return null;
    } catch (error) {
      console.warn('时间解析失败:', timeData, error);
      return null;
    }
  },

  // 验证运动记录
  validateExerciseRecords(records) {
    const validation = {
      total: records.length,
      valid: 0,
      invalid: 0,
      errors: []
    };

    records.forEach((record, index) => {
      try {
        if (!record.activityId || !record.name || !record.activityType) {
          throw new Error('缺少必要字段');
        }
        if (record.distance < 0 || record.duration < 0) {
          throw new Error('距离或时长不能为负数');
        }
        if (record.avgHr && (record.avgHr < 30 || record.avgHr > 220)) {
          throw new Error('心率值异常');
        }
        validation.valid++;
      } catch (error) {
        validation.invalid++;
        validation.errors.push({
          index,
          record: record.name || `记录${index}`,
          error: error.message
        });
      }
    });

    return validation;
  },

  // 插入文本数据
  async insertTextData() {
    const { parsedRecords, overwriteData } = this.data;
    
    if (parsedRecords.length === 0) {
      wx.showToast({
        title: '没有可插入的数据',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '插入数据中...' });

    try {
      const result = await wx.cloud.callFunction({
        name: 'exerciseDataFunctions',
        data: {
          type: 'batchInsertExerciseRecords',
          data: parsedRecords
        }
      });

      if (result.result.success) {
        wx.showToast({
          title: `成功插入${result.result.data.insertedCount}条记录`,
          icon: 'success'
        });
        this.addLog(`成功插入${result.result.data.insertedCount}条运动记录`);
        
        // 清空已插入的数据
        this.setData({
          textData: '',
          parsedRecords: []
        });
      } else {
        throw new Error(result.result.errMsg);
      }
    } catch (error) {
      wx.showToast({
        title: '插入失败: ' + error.message,
        icon: 'none'
      });
      this.addLog(`插入失败: ${error.message}`);
    } finally {
      wx.hideLoading();
    }
  },

  // 自动解析选项变化
  onAutoParseChange(e) {
    this.setData({
      autoParse: e.detail.value.includes('autoParse')
    });
  },

  // 选择文件
  chooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json', 'csv', 'txt'],
      success: (res) => {
        const file = res.tempFiles[0];
        this.setData({
          selectedFile: {
            name: file.name,
            size: Math.round(file.size / 1024), // 转换为KB
            type: this.getFileType(file.name),
            path: file.path
          }
        });
        
        this.addLog(`选择文件: ${file.name} (${Math.round(file.size / 1024)}KB)`);
        
        // 如果启用了自动解析，自动读取文件内容
        if (this.data.autoParse) {
          this.readFileContent(file.path);
        }
      },
      fail: (error) => {
        console.error('选择文件失败:', error);
        wx.showToast({
          title: '选择文件失败',
          icon: 'none'
        });
      }
    });
  },

  // 获取文件类型
  getFileType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'json':
        return 'JSON文件';
      case 'csv':
        return 'CSV文件';
      case 'txt':
        return '文本文件';
      default:
        return '未知文件';
    }
  },

  // 读取文件内容
  readFileContent(filePath) {
    wx.showLoading({ title: '读取文件中...' });
    
    // 显示进度条
    this.updateProgressBar(25);
    
    // 使用微信小程序的fs API读取文件
    const fs = wx.getFileSystemManager();
    
    fs.readFile({
      filePath: filePath,
      encoding: 'utf8',
      success: (res) => {
        const content = res.data;
        
        // 检查文件大小限制
        if (content.length > 1024 * 1024 * 10) { // 10MB
          wx.showToast({
            title: '文件过大，请选择小于10MB的文件',
            icon: 'none'
          });
          this.updateProgressBar(0);
          return;
        }
        
        // 更新进度到75%
        this.updateProgressBar(75);
        
        // 模拟处理时间
        setTimeout(() => {
          this.setData({
            fileContent: content
          });
          
          // 完成进度
          this.updateProgressBar(100);
          
          this.addLog(`文件读取成功: ${content.length}字符`);
          
          // 如果启用了自动解析，自动解析数据
          if (this.data.autoParse) {
            setTimeout(() => {
              this.parseFileData();
            }, 500);
          }
          
          wx.hideLoading();
        }, 300);
      },
      fail: (error) => {
        console.error('读取文件失败:', error);
        this.updateProgressBar(0);
        wx.hideLoading();
        wx.showToast({
          title: '读取文件失败: ' + error.errMsg,
          icon: 'none'
        });
      }
    });
  },

  // 解析文件数据
  parseFileData() {
    const { fileContent, validateData } = this.data;
    
    if (!fileContent) {
      wx.showToast({
        title: '没有文件内容可解析',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '解析文件中...' });

    try {
      let records = [];
      const fileName = this.data.selectedFile.name.toLowerCase();
      
      // 根据文件扩展名自动判断格式
      if (fileName.endsWith('.json')) {
        if (fileContent.includes('summarizedActivitiesExport')) {
          records = this.parseGarminData(fileContent);
        } else {
          records = this.parseStandardJson(fileContent);
        }
      } else if (fileName.endsWith('.csv')) {
        records = this.parseCsvData(fileContent);
      } else if (fileName.endsWith('.txt')) {
        // 尝试自动识别格式
        if (fileContent.trim().startsWith('{') || fileContent.trim().startsWith('[')) {
          records = this.parseStandardJson(fileContent);
        } else if (fileContent.includes(',')) {
          records = this.parseCsvData(fileContent);
        } else {
          throw new Error('无法识别的文本格式');
        }
      } else {
        // 尝试自动识别格式
        records = this.parseCustomData(fileContent);
      }

      // 数据验证
      if (validateData) {
        const validation = this.validateExerciseRecords(records);
        if (validation.invalid > 0) {
          wx.showModal({
            title: '数据验证警告',
            content: `发现${validation.invalid}条无效数据，是否继续？`,
            success: (res) => {
              if (res.confirm) {
                this.setData({ parsedRecords: records });
                this.addLog(`文件解析成功: ${records.length}条记录，${validation.invalid}条无效`);
              }
            }
          });
          wx.hideLoading();
          return;
        }
      }

      this.setData({ parsedRecords: records });
      this.addLog(`文件解析成功: ${records.length}条记录`);
      
      wx.showToast({
        title: `解析成功: ${records.length}条记录`,
        icon: 'success'
      });

    } catch (error) {
      console.error('解析文件失败:', error);
      wx.showToast({
        title: '解析失败: ' + error.message,
        icon: 'none'
      });
      this.addLog(`文件解析失败: ${error.message}`);
    } finally {
      wx.hideLoading();
    }
  },

  // 插入文件数据
  async insertFileData() {
    const { parsedRecords, overwriteData } = this.data;
    
    if (parsedRecords.length === 0) {
      wx.showToast({
        title: '没有可插入的数据',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '插入数据中...' });

    try {
      const result = await wx.cloud.callFunction({
        name: 'exerciseDataFunctions',
        data: {
          type: 'batchInsertExerciseRecords',
          data: parsedRecords
        }
      });

      if (result.result.success) {
        wx.showToast({
          title: `成功插入${result.result.data.insertedCount}条记录`,
          icon: 'success'
        });
        this.addLog(`成功插入文件数据: ${result.result.data.insertedCount}条记录`);
        
        // 清空已插入的数据
        this.setData({
          parsedRecords: []
        });
      } else {
        throw new Error(result.result.errMsg);
      }
    } catch (error) {
      wx.showToast({
        title: '插入失败: ' + error.message,
        icon: 'none'
      });
      this.addLog(`文件数据插入失败: ${error.message}`);
    } finally {
      wx.hideLoading();
    }
  },

  // 清空文件数据
  clearFileData() {
    this.setData({
      selectedFile: null,
      fileContent: '',
      uploadProgress: 0,
      parsedRecords: [],
      showProgressBar: false
    });
    this.addLog('文件数据已清空');
  },

  // 插入测试数据
  async insertTestData() {
    wx.showLoading({ title: '插入测试数据中...' });
    
    try {
      // 生成测试数据
      const testRecords = this.generateTestData();
      
      const result = await wx.cloud.callFunction({
        name: 'exerciseDataFunctions',
        data: {
          type: 'batchInsertExerciseRecords',
          data: testRecords
        }
      });

      if (result.result.success) {
        wx.showToast({
          title: `成功插入${result.result.data.insertedCount}条测试数据`,
          icon: 'success'
        });
        this.addLog(`成功插入测试数据: ${result.result.data.insertedCount}条记录`);
      } else {
        throw new Error(result.result.errMsg);
      }
    } catch (error) {
      console.error('插入测试数据失败:', error);
      wx.showToast({
        title: '插入失败: ' + error.message,
        icon: 'none'
      });
      this.addLog(`测试数据插入失败: ${error.message}`);
    } finally {
      wx.hideLoading();
    }
  },

  // 生成测试数据
  generateTestData() {
    const testRecords = [];
    const now = new Date();
    
    // 生成最近6个月的数据
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const activityTypes = ['running', 'cycling', 'swimming', 'hiking', 'fitness'];
      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      
      let distance, duration, calories, avgHr;
      
      switch (activityType) {
        case 'running':
          distance = Math.floor(Math.random() * 20000) + 5000; // 5-25km
          duration = Math.floor(Math.random() * 7200) + 1800; // 30-150分钟
          calories = Math.floor(distance / 1000 * 60) + Math.floor(Math.random() * 200);
          avgHr = Math.floor(Math.random() * 60) + 140; // 140-200 BPM
          break;
        case 'cycling':
          distance = Math.floor(Math.random() * 50000) + 10000; // 10-60km
          duration = Math.floor(Math.random() * 10800) + 3600; // 60-240分钟
          calories = Math.floor(distance / 1000 * 30) + Math.floor(Math.random() * 150);
          avgHr = Math.floor(Math.random() * 50) + 120; // 120-170 BPM
          break;
        case 'swimming':
          distance = Math.floor(Math.random() * 5000) + 1000; // 1-6km
          duration = Math.floor(Math.random() * 3600) + 1200; // 20-80分钟
          calories = Math.floor(distance / 1000 * 400) + Math.floor(Math.random() * 100);
          avgHr = Math.floor(Math.random() * 40) + 130; // 130-170 BPM
          break;
        case 'hiking':
          distance = Math.floor(Math.random() * 15000) + 3000; // 3-18km
          duration = Math.floor(Math.random() * 7200) + 1800; // 30-150分钟
          calories = Math.floor(distance / 1000 * 80) + Math.floor(Math.random() * 100);
          avgHr = Math.floor(Math.random() * 30) + 110; // 110-140 BPM
          break;
        case 'fitness':
          distance = 0;
          duration = Math.floor(Math.random() * 3600) + 1800; // 30-90分钟
          calories = Math.floor(duration / 60 * 8) + Math.floor(Math.random() * 100);
          avgHr = Math.floor(Math.random() * 40) + 120; // 120-160 BPM
          break;
      }
      
      testRecords.push({
        name: `${this.getActivityTypeDisplayName(activityType)}训练${i + 1}`,
        activityType: activityType,
        distance: distance,
        duration: duration,
        calories: calories,
        avgHr: avgHr,
        startTime: date.toISOString(),
        description: `这是第${i + 1}次${this.getActivityTypeDisplayName(activityType)}训练`
      });
    }
    
    return testRecords;
  },

  // 计算是否显示进度条
  updateProgressBar(progress) {
    const showProgressBar = progress > 0 && progress < 100;
    this.setData({
      uploadProgress: progress,
      showProgressBar: showProgressBar
    });
  }
});
