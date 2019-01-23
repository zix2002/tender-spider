const http = require('http');
const cheerio = require('cheerio');
const SendMail = require('./lib/SendMail');
const redis = require('redis');

const URL_BASE = 'http://www.koubei101.com/';
const URL = 'forum.php?mod=forumdisplay&fid=117';
const KEYWORDS = ['X线', '多普勒', '彩超', '超声', 'DR'];
const CACHE_KEY = 'TENDER-SPIDER';
// redis 客户端
const redisClient = new redis.createClient();

// 用来保存 接收到的html;
let html = '';

// 发起请求
function fetchPageAndSendMail() {
  http.get(URL_BASE + URL, res => {
    //防止中文乱码
    res.setEncoding('utf-8');
    //监听data事件，每次取一块数据
    res.on('data', chunk => html += chunk);
    // 页面接收完成后，处理内容
    res.on('end', function() {
      const data = [];
      //采用cheerio模块解析html
      const $ = cheerio.load(html);

      // 查询对应的链接
      $('a.xst').each(function() {
        const title = $(this).text();
        // console.log('title', title, $(this).attr('href'));
        // 查询匹配的 title
        if (matchTitle(title)) {
          data.push({
            title,
            href: URL_BASE + $(this).attr('href'),
          });
        }
      });
      // 如果有查询到的 数据就发送邮件
      console.log(`匹配到${data.length}条记录.`);
      if (data.length > 0) {
        sendMailWithData(data);
      }

      // redisClient.quit();
    });
  });
}

// 匹配的标题
function matchTitle( title ) {
  const found = KEYWORDS.filter(function( keyword ) {
    const re = new RegExp(keyword, 'g');
    return re.test(title);
  });
  return found.length > 0;
}

// 发送邮件
function sendMailWithData( data ) {
  // 查询 redis 是否有已经发过的数据
  redisClient.get(CACHE_KEY, ( err, cacheData ) => {
    if (err) {
      redisClient.quit();
      throw err;
    }
    if (!cacheData) {
      console.log('没有已发送的邮件.');
      // 没有已经发过的邮件，保存并发送
      redisClient.set(CACHE_KEY, JSON.stringify(data), function() {
        redisClient.expire(CACHE_KEY, 86400 * 7, () => {
          redisClient.quit();
        });
      });
      SendMail(data);
    } else {
      // 如果有已经发送过的邮件，则进行比较
      let sentData = JSON.parse(cacheData);
      const unsentData = data.filter(item => {
        const found = sentData.filter(sd => {
          return sd.href === item.href;
        });
        return found.length <= 0;
      });

      // 如果有还没有发送过的记录 则直接发送，并保存到 redis
      if (unsentData.length > 0) {
        sentData = sentData.concat(unsentData);
        redisClient.set(CACHE_KEY, JSON.stringify(sentData), function() {
          redisClient.expire(CACHE_KEY, 86400 * 7, () => {
            redisClient.quit();
          });
        });
        console.log(`需要发送${unsentData.length}条记录.`);
        SendMail(unsentData);
      } else {
        console.log('已经发送过邮件了.');
        redisClient.quit();
      }
    }
  });
}

// fetchPageAndSendMail();

require('dotenv').config();

console.log('test', process.env.EMAIL_USER);

