exports.handler = async function(event, context) {
    console.log('=== 函数被调用 ===');
    console.log('请求方法:', event.httpMethod);
    console.log('请求体:', event.body);
    
    // 处理预检请求 (OPTIONS)
    if (event.httpMethod === 'OPTIONS') {
      console.log('处理 OPTIONS 预检请求');
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: ''
      };
    }
    
    // 只允许 POST
    if (event.httpMethod !== 'POST') {
      console.error('请求方法错误，期望 POST，收到:', event.httpMethod);
      return {
        statusCode: 405,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          success: false,
          error: '请用 POST 方法' 
        })
      };
    }
    
    try {
      // 解析请求
      let datasheetId;
      try {
        const requestBody = JSON.parse(event.body || '{}');
        datasheetId = requestBody.datasheetId;
        console.log('收到 datasheetId:', datasheetId);
      } catch (parseError) {
        console.error('JSON 解析错误:', parseError.message);
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ 
            success: false,
            error: '请求体 JSON 格式错误' 
          })
        };
      }
      
      if (!datasheetId) {
        console.error('缺少 datasheetId');
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ 
            success: false,
            error: '缺少 datasheetId' 
          })
        };
      }
      
      // ==== 维格表配置 ====
      const VIKA_API_TOKEN = 'uskPPXoqNOlip1d5PrqmUQL';  // 你的 Token
      const VIKA_DATASHEET_ID = 'dst7fRjLqPZMByA70N';    // 你的表 ID
      const VIKA_API_URL = `https://api.vika.cn/fusion/v1/datasheets/${VIKA_DATASHEET_ID}/records`;
      
      console.log('开始请求维格表 API:', VIKA_API_URL);
      
      // 请求维格表
      const vikaResponse = await fetch(VIKA_API_URL, {
        headers: {
          'Authorization': `Bearer ${VIKA_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('维格表响应状态:', vikaResponse.status, vikaResponse.statusText);
      
      if (!vikaResponse.ok) {
        let errorText = '';
        try {
          errorText = await vikaResponse.text();
          console.error('维格表 API 错误详情:', errorText);
        } catch (e) {
          errorText = '无法读取错误详情';
        }
        
        return {
          statusCode: vikaResponse.status,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ 
            success: false,
            error: `维格表 API 错误: ${vikaResponse.status} ${vikaResponse.statusText}`,
            details: errorText
          })
        };
      }
      
      const vikaData = await vikaResponse.json();
      console.log('维格表返回数据 success:', vikaData.success);
      console.log('维格表返回记录数:', vikaData.data?.records?.length || 0);
      
      if (!vikaData.success) {
        return {
          statusCode: 500,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ 
            success: false,
            error: vikaData.message || '维格表返回格式错误' 
          })
        };
      }
      
      // 过滤和排序
      const allRecords = vikaData.data?.records || [];
      console.log('原始记录数:', allRecords.length);
      
      const records = allRecords.filter(record => {
        const show = record.fields?.['是否在作品集展示'] === '是';
        if (show) {
          console.log('显示项目:', record.fields?.['项目名称'] || '未命名');
        }
        return show;
      });
      
      console.log('过滤后记录数:', records.length);
      
      records.sort((a, b) => {
        const weightA = a.fields?.['排序权重'] || 0;
        const weightB = b.fields?.['排序权重'] || 0;
        return weightB - weightA; // 从高到低
      });
      
      console.log('最终返回记录数:', records.length);
      
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          count: records.length,
          records: records
        })
      };
      
    } catch (error) {
      console.error('函数执行错误:', error);
      console.error('错误堆栈:', error.stack);
      
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          success: false,
          error: error.message || '服务器内部错误',
          type: error.constructor.name
        })
      };
    }
  };