const nodeMailer = require('nodemailer');
require('dotenv').config();

function makeMailHtml( data ) {
  const mailContent = data.map(item => {
    return `<li><a href="${item.href}">${item.title}</a></li>`;
  });

  return `<ul>${mailContent.join('')}</ul>`;
}

function SendMail( data ) {
  const mailContent = makeMailHtml(data);

  let transporter = nodeMailer.createTransport({
    host: 'smtp.mxhichina.com',
    // service: 'qq', // 使用了内置传输发送邮件 查看支持列表：https://nodemailer.com/smtp/well-known/
    port: 25, // SMTP 端口
    secureConnection: false, // 使用了 SSL
    auth: {
      user: process.env.EMAIL_USER,
      // 这里密码不是qq密码，是你设置的smtp授权码
      pass: process.env.EMAIL_PASS,
    },
  });

  let mailOptions = {
    from: '"系统通知" <notification@dmgapp.com>', // sender address
    to: process.env.EMAIL_ADDRESS_1, // list of receivers
    cc: process.env.EMAIL_ADDRESS_2,
    subject: '招标信息', // Subject line
    // 发送text或者html格式
    // text: 'Hello world?', // plain text body
    html: mailContent, // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, ( error, info ) => {
    if (error) {
      return console.log(error);
    }
    console.log('邮件( %s )已发送', info.messageId);
    // Message sent: <04ec7731-cc68-1ef6-303c-61b0f796b78f@qq.com>
  });
}

module.exports = SendMail;
