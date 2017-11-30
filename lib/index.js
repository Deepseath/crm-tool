/** 企业自动报备 */

const axios = require('axios');
const async = require('async');

const success = [];
const failds = [];
const reportSuccess = [];
const reportFailds = [];

const getList = async (user) => {
  const url = 'https://yq-private-api.vchangyi.com/cus/checkin.php';
  const { data: { errcode, errmsg, list } } = await axios.get(url);
  if (errcode !== '0' || errmsg !== 'ok') {
    throw new Error(`Request ${url} error, code: ${errcode}, msg: ${errmsg}`);
  }
  return list;
};

/*
## 请求参数
| 参数   | 必填     | 类型     | 说明                              |
| ------ | ------ | ------ | ------------------------------- |
| type   | 是 | String | 校验帐号   |                                 |
| pwd    | 是 | String | 校验密码                            |
| id     | 是 | String | 企业 id，与 “获取待报备的企业列表”接口的 “id” 对应 |
| status | 是 | String | 报备系统的检查结果                       |
*/
const reportRes = (item) => {
  const url = `https://yq-private-api.vchangyi.com/cus/report.php?type=${}&pwd=${}=&id=${item.id}&status=`;
  const { data: { errcode, errmsg, list } } = await axios.get(url);
  if (errcode !== '0' || errmsg !== 'ok') {
    throw new Error(`Request ${url} error, code: ${errcode}, msg: ${errmsg}`);
  }
  return list;
};

const submit = async (item) => {
  const url = 'https://boss.exmailgz.com/cgi-bin/ww_cuschkin';
  const { data: { errcode, errmsg, list } } = await axios.post(url, item);
  if (errcode !== '0' || errmsg !== 'ok') {
    throw new Error(`Request ${url} error, code: ${errcode}, msg: ${errmsg}`);
  }
  return list;
};

const login = async () => {
};

const async main(callback) {
  const user = await login();
  const list = await getList(user);
  async.mapLimit(list, 5, submit, callback);
};

const showMessage = alert;

const showError = (error) => {
  console.error(error);
  console.error(error.stack);
  showMessage(error.message);
};


const finished = (error, list) => {
  if (error) return showError(error);
  const msgs = [
    `用时: ${startedAt - Date.now()}`,
    `提交成功: ${success.length}`,
    `提交失败: ${failds.length}`,
    `上报成功: ${reportSuccess.length}`,
    `上报失败: ${reportFailds.length}`,
  ];
  if (failds.length || reportFailds.length) msgs.push('更详细的错误报告，请看调试工具控制台');
  showMessage(msgs.join('\n'));
};

try {
  main(finished);
} catch (error) {
  showError(error);
};
