/** 企业自动报备 */

const axios = require('axios');
const async = require('async/mapLimit');

const ec = encodeURIComponent;

const checkSuccess = [];
const checkFailds = [];
const reportSuccess = [];
const reportFailds = [];
const submitSuccess = [];
const submitFailds = [];

const createURL = (uri, param) => {
  const query = Object.keys(param).map(x => `${x}=${ec(param[x])}`).join('&');
  if (!query) return uri;
  return `${uri}?${query}`;
};

const getList = async (auth) => {
  const url = 'https://yq-private-api.vchangyi.com/cus/checkin.php';
  const { data: { errcode, errmsg, list } } = await axios.get(url, { auth });
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
const reportRes = async (item, chk, auth) => {
  const url = createURL('https://yq-private-api.vchangyi.com/cus/report.php', {
    id: item.id,
    status: JSON.stringify(chk.data),
  });
  const { data: { errcode, errmsg, result } } = await axios.get(url, { auth });
  if (errcode !== '0' || errmsg !== 'ok') {
    reportFailds.push([item.id, errcode, errmsg, result]);
    throw new Error(`Request ${url} error, code: ${errcode}, msg: ${errmsg}`);
  }
  reportSuccess.push(item.id);
  return result;
};

const check = async (item, auth) => {
  const url = createURL('https://boss.exmailgz.com/cgi-bin/ww_cuschkin', {
    action: 'chkname',
    cus_name: item.cus_name,
    corp_id: item.corp_id,
  });
  const { data: { errcode, errmsg, result: { data, ret } } } = await axios.get(url, { auth });
  if (errcode !== '0' || errmsg !== 'ok') {
    checkFailds.push([item.id, errcode, errmsg, { data, ret }]);
    throw new Error(`Request ${url} error, code: ${errcode}, msg: ${errmsg}`);
  }
  checkSuccess.push(item.id);
  return [data, ret];
};

const submit = auth => (
  async (item) => {
    const [status] = await check(item, auth);
    await reportRes(item, status, auth);
    // 检测结果等于false，则不提交
    if (status.can_check_in === false) return;
    const url = 'https://boss.exmailgz.com/cgi-bin/ww_cuschkin';
    const { data: { errcode, errmsg, result } } = await axios.post(url, item);
    if (errcode !== '0' || errmsg !== 'ok') {
      submitFailds.push([item.id, errcode, errmsg, result]);
      throw new Error(`Request ${url} error, code: ${errcode}, msg: ${errmsg}`);
    }
    submitSuccess.push(item.id);
  }
);

const login = async () => ({
  username: prompt('请输入ichangyi账号'),
  password: prompt('请输入ichangyi密码'),
});

let startedAt;
const main = async (callback) => {
  const auth = await login();
  startedAt = Date.now();
  const list = await getList(auth);
  async.mapLimit(list, 5, submit(auth), callback);
};

const showMessage = alert;

const showError = (error) => {
  console.error(error);
  console.error(error.stack);
  showMessage(error.message);
};

const finished = (error) => {
  if (error) return showError(error);
  const msgs = [
    `用时: ${startedAt - Date.now()}`,
    `检查: ${checkSuccess.length}/${checkFailds.length + checkSuccess.length}`,
    `上报: ${reportSuccess.length}/${reportFailds.length + reportSuccess.length}`,
    `提交: ${submitSuccess.length}/${submitFailds.length + submitSuccess.length}`,
  ];
  if (checkFailds.length || reportFailds.length || submitFailds) {
    console.log('检查', checkSuccess, checkFailds);
    console.log('上报', reportSuccess, reportFailds);
    console.log('提交', submitSuccess, submitFailds);
    msgs.push('更详细的错误报告，请看调试工具控制台');
  }
  return showMessage(msgs.join('\n'));
};

try {
  main(finished);
} catch (error) {
  showError(error);
}
