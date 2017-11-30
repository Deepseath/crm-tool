const axios = require('axios');
const mapLimit = require('async/mapLimit');

const ec = encodeURIComponent;

const checkSuccess = [];
const checkFailds = [];
const reportSuccess = [];
const reportFailds = [];
const submitSuccess = [];
const submitFailds = [];

const createURL = (uri, param = {}) => {
  const query = Object.keys(param).map(x => `${x}=${ec(param[x])}`).join('&');
  if (!query) return uri;
  return `${uri}?${query}`;
};

const getList = async (auth) => {
  const url = 'https://yq-private-api.vchangyi.com/cus/checkin.php';
  const { data: { errcode, errmsg, result: { list } } } = await axios.get(url, { auth });
  if (errcode !== '0' || errmsg !== 'ok') {
    throw new Error(`Request ${url} error, code: ${errcode}, msg: ${errmsg}`);
  }
  return list;
};

/*
## 请求参数
| 参数   | 必填     | 类型     | 说明                              |
| ------ | ------ | ------ | ------------------------------- |
| id     | 是 | String | 企业 id，与 “获取待报备的企业列表”接口的 “id” 对应 |
| status | 是 | String | 报备系统的检查结果                       |
*/
const report = async (item, chk, auth) => {
  const url = createURL('https://yq-private-api.vchangyi.com/cus/report.php', {
    id: item.id,
    status: JSON.stringify(chk),
  });
  const { data: { errcode, errmsg, result } } = await axios.get(url, { auth });
  if (errcode !== '0' || errmsg !== 'ok') {
    reportFailds.push([item.id, errcode, errmsg, result]);
    throw new Error(`Request ${url} error, code: ${errcode}, msg: ${errmsg}`);
  }
  reportSuccess.push(item.id);
  return result;
};

const check = async (item) => {
  const url = createURL('https://boss.exmailgz.com/cgi-bin/ww_cuschkin', {
    action: 'chkname',
    cus_name: item.cus_name,
    corp_id: item.corp_id,
  });
  const { data: { errcode, errmsg, result } } = await axios.get(url);
  if (errcode !== '0' || errmsg !== 'ok') {
    checkFailds.push([item.id, errcode, errmsg, result]);
    throw new Error(`Request ${url} error, code: ${errcode}, msg: ${errmsg}`);
  }
  checkSuccess.push(item.id);
  return [result.data, result.ret];
};

const submit = auth => (
  async (item) => {
    let status;
    try {
      [status] = await check(item);
    } catch (e) {
      checkFailds.push([item.id, e.message]);
      return;
    }
    try {
      await report(item, status, auth);
    } catch (e) {
      reportFailds.push([item.id, e.message]);
      return;
    }
    // 检测结果等于false，则不提交
    if (status.can_check_in === false) return;
    const url = 'https://boss.exmailgz.com/cgi-bin/ww_cuschkin';
    try {
      const { data: { errcode, errmsg, result } } = await axios.post(url, item);
      if (errcode !== '0' || errmsg !== 'ok') {
        submitFailds.push([item.id, errcode, errmsg, result]);
        throw new Error(`Request ${url} error, code: ${errcode}, msg: ${errmsg}`);
      }
      submitSuccess.push(item.id);
    } catch (e) {
      submitFailds.push([item.id, e.message]);
    }
  }
);

const login = win => ({
  username: win.prompt('请输入ichangyi账号'),
  password: win.prompt('请输入ichangyi密码'),
});

let showMessage;

const main = async (win, callback) => {
  // 计数清空
  checkSuccess.length = 0;
  checkFailds.length = 0;
  reportSuccess.length = 0;
  reportFailds.length = 0;
  submitSuccess.length = 0;
  submitFailds.length = 0;
  showMessage = win.alert;
  const auth = await login(win);
  const startedAt = Date.now();
  const list = await getList(auth);
  mapLimit(list, 5, submit(auth), (error) => {
    if (error) return callback(error);
    return callback(null, {
      submitSuccess,
      submitFailds,
      checkSuccess,
      checkFailds,
      reportSuccess,
      reportFailds,
      consumeMS: Date.now() - startedAt,
    });
  });
};

const showError = (error) => {
  console.error(error);
  console.error(error.stack);
  showMessage(error.message);
};

const finished = (error, s) => {
  if (error) return showError(error);
  const msgs = [
    `用时: ${s.consumeMS} MS`,
    `检查: ${s.checkSuccess.length}/${s.checkFailds.length + s.checkSuccess.length}`,
    `上报: ${s.reportSuccess.length}/${s.reportFailds.length + s.reportSuccess.length}`,
    `提交: ${s.submitSuccess.length}/${s.submitFailds.length + s.submitSuccess.length}`,
  ];
  if (s.checkFailds.length || s.reportFailds.length || s.submitFailds) {
    console.log('检查', s.checkSuccess, s.checkFailds);
    console.log('上报', s.reportSuccess, s.reportFailds);
    console.log('提交', s.submitSuccess, s.submitFailds);
    msgs.push('更详细的错误报告，请看调试工具控制台');
  }
  return showMessage(msgs.join('\n'));
};

module.exports = {
  createURL, getList, check, report, submit, login, finished, main,
};
