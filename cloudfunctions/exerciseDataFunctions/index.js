const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 获取用户openid
const getOpenId = async () => {
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

// 创建运动数据集合
const createExerciseCollection = async () => {
  try {
    // 创建集合
    await db.createCollection("exercise_records");
    
    // 创建索引以提高查询性能
    await db.collection("exercise_records").createIndex({
      data: {
        openid: 1,
        startTime: -1,
        activityType: 1
      }
    });
    
    return {
      success: true,
      message: "运动数据集合创建成功"
    };
  } catch (e) {
    return {
      success: true,
      message: "集合已存在或创建成功",
      error: e.message
    };
  }
};

// 插入单条运动记录
const insertExerciseRecord = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const exerciseData = event.data;
    
    // 数据验证
    if (!exerciseData.activityId || !exerciseData.name || !exerciseData.activityType) {
      return {
        success: false,
        errMsg: "缺少必要的运动数据字段"
      };
    }
    
    // 准备插入的数据
    const recordToInsert = {
      openid: wxContext.OPENID,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...exerciseData
    };
    
    // 插入数据
    const result = await db.collection("exercise_records").add({
      data: recordToInsert
    });
    
    return {
      success: true,
      data: {
        _id: result._id,
        ...recordToInsert
      },
      message: "运动记录插入成功"
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message
    };
  }
};

// 批量插入运动记录
const batchInsertExerciseRecords = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const exerciseRecords = event.data;
    
    if (!Array.isArray(exerciseRecords) || exerciseRecords.length === 0) {
      return {
        success: false,
        errMsg: "运动记录数据格式错误或为空"
      };
    }
    
    // 为每条记录添加用户标识和时间戳
    const recordsToInsert = exerciseRecords.map(record => ({
      openid: wxContext.OPENID,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...record
    }));
    
    // 批量插入数据
    const insertPromises = recordsToInsert.map(record => 
      db.collection("exercise_records").add({ data: record })
    );
    
    const results = await Promise.all(insertPromises);
    
    return {
      success: true,
      data: {
        insertedCount: results.length,
        records: results.map((result, index) => ({
          _id: result._id,
          ...recordsToInsert[index]
        }))
      },
      message: `成功插入 ${results.length} 条运动记录`
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message
    };
  }
};

// 查询用户的运动记录
const queryExerciseRecords = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const { 
      page = 1, 
      pageSize = 20, 
      activityType, 
      startDate, 
      endDate,
      sortBy = 'startTime',
      sortOrder = 'desc'
    } = event.data || {};
    
    // 构建查询条件
    let whereCondition = {
      openid: wxContext.OPENID
    };
    
    if (activityType) {
      whereCondition.activityType = activityType;
    }
    
    if (startDate || endDate) {
      whereCondition.startTime = {};
      if (startDate) {
        whereCondition.startTime.$gte = new Date(startDate);
      }
      if (endDate) {
        whereCondition.startTime.$lte = new Date(endDate);
      }
    }
    
    // 计算分页
    const skip = (page - 1) * pageSize;
    
    // 执行查询
    const query = db.collection("exercise_records")
      .where(whereCondition)
      .orderBy(sortBy, sortOrder)
      .skip(skip)
      .limit(pageSize);
    
    const result = await query.get();
    
    // 获取总数
    const countResult = await db.collection("exercise_records")
      .where(whereCondition)
      .count();
    
    return {
      success: true,
      data: {
        records: result.data,
        pagination: {
          current: page,
          pageSize: pageSize,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / pageSize)
        }
      }
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message
    };
  }
};

// 更新运动记录
const updateExerciseRecord = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const { _id, ...updateData } = event.data;
    
    if (!_id) {
      return {
        success: false,
        errMsg: "缺少记录ID"
      };
    }
    
    // 只能更新自己的记录
    const result = await db.collection("exercise_records")
      .where({
        _id: _id,
        openid: wxContext.OPENID
      })
      .update({
        data: {
          ...updateData,
          updatedAt: new Date()
        }
      });
    
    if (result.stats.updated === 0) {
      return {
        success: false,
        errMsg: "记录不存在或无权限更新"
      };
    }
    
    return {
      success: true,
      message: "运动记录更新成功"
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message
    };
  }
};

// 删除运动记录
const deleteExerciseRecord = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const { _id } = event.data;
    
    if (!_id) {
      return {
        success: false,
        errMsg: "缺少记录ID"
      };
    }
    
    // 只能删除自己的记录
    const result = await db.collection("exercise_records")
      .where({
        _id: _id,
        openid: wxContext.OPENID
      })
      .remove();
    
    if (result.stats.removed === 0) {
      return {
        success: false,
        errMsg: "记录不存在或无权限删除"
      };
    }
    
    return {
      success: true,
      message: "运动记录删除成功"
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message
    };
  }
};

// 获取运动统计信息
const getExerciseStats = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const { startDate, endDate } = event.data || {};
    
    let whereCondition = {
      openid: wxContext.OPENID
    };
    
    if (startDate || endDate) {
      whereCondition.startTime = {};
      if (startDate) {
        whereCondition.startTime.$gte = new Date(startDate);
      }
      if (endDate) {
        whereCondition.startTime.$lte = new Date(endDate);
      }
    }
    
    // 获取总运动次数
    const totalActivities = await db.collection("exercise_records")
      .where(whereCondition)
      .count();
    
    // 获取总运动距离
    const distanceResult = await db.collection("exercise_records")
      .where(whereCondition)
      .aggregate()
      .group({
        _id: null,
        totalDistance: db.command.aggregate.sum('$distance'),
        totalDuration: db.command.aggregate.sum('$duration'),
        totalCalories: db.command.aggregate.sum('$calories')
      })
      .end();
    
    // 获取运动类型分布
    const typeDistribution = await db.collection("exercise_records")
      .where(whereCondition)
      .aggregate()
      .group({
        _id: '$activityType',
        count: db.command.aggregate.sum(1)
      })
      .end();
    
    return {
      success: true,
      data: {
        totalActivities: totalActivities.total,
        totalDistance: distanceResult.list[0]?.totalDistance || 0,
        totalDuration: distanceResult.list[0]?.totalDuration || 0,
        totalCalories: distanceResult.list[0]?.totalCalories || 0,
        typeDistribution: typeDistribution.list
      }
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message
    };
  }
};

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case "getOpenId":
      return await getOpenId();
    case "createExerciseCollection":
      return await createExerciseCollection();
    case "insertExerciseRecord":
      return await insertExerciseRecord(event);
    case "batchInsertExerciseRecords":
      return await batchInsertExerciseRecords(event);
    case "queryExerciseRecords":
      return await queryExerciseRecords(event);
    case "updateExerciseRecord":
      return await updateExerciseRecord(event);
    case "deleteExerciseRecord":
      return await deleteExerciseRecord(event);
    case "getExerciseStats":
      return await getExerciseStats(event);
    default:
      return {
        success: false,
        errMsg: "未知的操作类型"
      };
  }
};
