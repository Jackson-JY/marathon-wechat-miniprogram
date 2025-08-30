/**
 * 运动数据导入工具
 * 用于将Garmin等运动设备的数据导入到微信云数据库
 */

class ExerciseDataImporter {
  constructor() {
    this.batchSize = 50; // 每批处理的数据量
    this.delay = 100; // 批次间的延迟(毫秒)
  }

  /**
   * 解析Garmin运动数据
   * @param {string} jsonData - Garmin导出的JSON数据
   * @returns {Array} 解析后的运动记录数组
   */
  parseGarminData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.summarizedActivitiesExport || !Array.isArray(data.summarizedActivitiesExport)) {
        throw new Error('数据格式错误：缺少summarizedActivitiesExport数组');
      }

      return data.summarizedActivitiesExport.map(activity => this.transformGarminActivity(activity));
    } catch (error) {
      console.error('解析Garmin数据失败:', error);
      throw error;
    }
  }

  /**
   * 转换Garmin活动数据为标准格式
   * @param {Object} garminActivity - Garmin原始活动数据
   * @returns {Object} 标准化的运动记录
   */
  transformGarminActivity(garminActivity) {
    return {
      activityId: garminActivity.activityId || garminActivity.uuidMsb,
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
      avgFractionalCadence: garminActivity.avgFractionalCadence || null,
      // 保留原始数据用于调试
      originalData: garminActivity
    };
  }

  /**
   * 标准化活动类型
   * @param {string} activityType - 原始活动类型
   * @returns {string} 标准化的活动类型
   */
  normalizeActivityType(activityType) {
    if (!activityType) return 'unknown';
    
    const type = activityType.toLowerCase();
    
    // 跑步相关
    if (type.includes('run') || type.includes('jog')) return 'running';
    
    // 骑行相关
    if (type.includes('bike') || type.includes('cycle') || type.includes('cycling')) return 'cycling';
    
    // 游泳相关
    if (type.includes('swim')) return 'swimming';
    
    // 步行相关
    if (type.includes('walk') || type.includes('hike')) return 'walking';
    
    // 健身相关
    if (type.includes('gym') || type.includes('workout') || type.includes('strength')) return 'strength_training';
    
    // 瑜伽相关
    if (type.includes('yoga')) return 'yoga';
    
    // 其他
    return type;
  }

  /**
   * 解析时间数据
   * @param {string|number} timeData - 时间数据
   * @returns {string} ISO格式的时间字符串
   */
  parseTime(timeData) {
    if (!timeData) return null;
    
    try {
      // 如果是时间戳
      if (typeof timeData === 'number') {
        return new Date(timeData).toISOString();
      }
      
      // 如果是字符串
      if (typeof timeData === 'string') {
        return new Date(timeData).toISOString();
      }
      
      return null;
    } catch (error) {
      console.warn('时间解析失败:', timeData, error);
      return null;
    }
  }

  /**
   * 分批导入数据到云数据库
   * @param {Array} records - 运动记录数组
   * @param {Function} progressCallback - 进度回调函数
   * @returns {Promise} 导入结果
   */
  async importToCloudDatabase(records, progressCallback = null) {
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('没有可导入的数据');
    }

    const totalRecords = records.length;
    const batches = this.chunkArray(records, this.batchSize);
    const results = {
      total: totalRecords,
      success: 0,
      failed: 0,
      errors: []
    };

    console.log(`开始导入 ${totalRecords} 条记录，分 ${batches.length} 批处理`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNumber = i + 1;
      
      try {
        // 调用云函数批量插入
        const result = await wx.cloud.callFunction({
          name: 'exerciseDataFunctions',
          data: {
            type: 'batchInsertExerciseRecords',
            data: batch
          }
        });

        if (result.result.success) {
          results.success += result.result.data.insertedCount;
          console.log(`批次 ${batchNumber}/${batches.length} 导入成功: ${result.result.data.insertedCount} 条记录`);
        } else {
          throw new Error(result.result.errMsg);
        }

        // 调用进度回调
        if (progressCallback) {
          const progress = {
            current: batchNumber,
            total: batches.length,
            processed: (i + 1) * this.batchSize,
            totalRecords: totalRecords,
            success: results.success,
            failed: results.failed
          };
          progressCallback(progress);
        }

        // 批次间延迟，避免触发云函数频率限制
        if (i < batches.length - 1) {
          await this.delay(this.delay);
        }

      } catch (error) {
        console.error(`批次 ${batchNumber}/${batches.length} 导入失败:`, error);
        results.failed += batch.length;
        results.errors.push({
          batch: batchNumber,
          error: error.message,
          records: batch.length
        });
      }
    }

    console.log(`导入完成: 成功 ${results.success} 条，失败 ${results.failed} 条`);
    return results;
  }

  /**
   * 将数组分块
   * @param {Array} array - 原数组
   * @param {number} size - 块大小
   * @returns {Array} 分块后的数组
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise} Promise对象
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 验证数据完整性
   * @param {Array} records - 运动记录数组
   * @returns {Object} 验证结果
   */
  validateData(records) {
    const validation = {
      total: records.length,
      valid: 0,
      invalid: 0,
      errors: []
    };

    records.forEach((record, index) => {
      try {
        // 检查必要字段
        if (!record.activityId || !record.name || !record.activityType) {
          throw new Error('缺少必要字段');
        }

        // 检查数值字段
        if (record.distance < 0 || record.duration < 0) {
          throw new Error('距离或时长不能为负数');
        }

        // 检查心率范围
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
  }
}

// 导出工具类
module.exports = ExerciseDataImporter;
