const assert = require('assert');
const axios = require('axios');
const listData = require('./data/list.json');
const checkData = require('./data/check.json');
const submitData = require('./data/submit.json');
const reportData = require('./data/report.json');

const {
  createURL, getList, check, report, login, submit, main,
} = require('../lib/lib');

const { get, post } = axios;

describe('lib/lib', function testIkUnit() {
  this.timeout(20 * 1000);
  const auth = {
    username: 'Redstone',
    password: '1234567',
  };

  describe('test function', () => {
    it('createURL', (done) => {
      assert.equal(createURL('http://baidu.com/'), 'http://baidu.com/');
      assert.equal(createURL('http://baidu.com/', { w: 'hello' }), 'http://baidu.com/?w=hello');
      assert.equal(createURL('http://baidu.com/', { w: 'he llo' }), 'http://baidu.com/?w=he%20llo');

      done();
    });

    it('getList', async () => {
      axios.get = (url, config) => {
        assert.equal('https://yq-private-api.vchangyi.com/cus/checkin.php', url);
        assert.deepEqual(config.auth, auth);
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: listData });
          }, 200);
        });
      };
      const list = await getList(auth);
      assert.deepEqual(list, listData.result.list);
      axios.get = get;
    });

    it('check', async () => {
      const item = listData.result.list[0];
      axios.get = (url) => {
        assert.equal(createURL('https://boss.exmailgz.com/cgi-bin/ww_cuschkin', {
          action: 'chkname',
          cus_name: item.cus_name,
          corp_id: item.corp_id,
        }, url));
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: checkData });
          }, 200);
        });
      };
      const [status, ret] = await check(item);
      assert.deepEqual(status, checkData.result.data);
      assert.equal(ret, checkData.result.ret);
      axios.get = get;
    });

    it('report', async () => {
      const item = listData.result.list[0];
      axios.get = (url, config) => {
        assert.equal(createURL('https://yq-private-api.vchangyi.com/cus/report.php', {
          id: item.id,
          status: JSON.stringify(checkData.result.data),
        }, url));
        assert.deepEqual(config.auth, auth);
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: reportData });
          }, 200);
        });
      };
      const result = await report(item, auth);
      assert.deepEqual(result, reportData.result);
      axios.get = get;
    });

    it('login', async () => {
      let count = 0;
      const win = {
        prompt: () => {
          if (count === 0) {
            count += 1;
            return 'Hello';
          }
          return 'World';
        },
      };

      const result = login(win);
      assert.deepEqual(result, { username: 'Hello', password: 'World' });
    });

    it('submit', async () => {
      const item = listData.result.list[0];
      axios.post = (url, body) => {
        assert.equal('https://boss.exmailgz.com/cgi-bin/ww_cuschkin', url);
        assert.deepEqual(item, body);
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: submitData });
          }, 200);
        });
      };
      await submit(auth)(item);
      axios.post = post;
    });
  });

  describe('集成测试/main', () => {
    it('case1 noraml', async () => {
      let count = 0;
      const win = {
        prompt: () => {
          if (count === 0) {
            count += 1;
            return auth.username;
          }
          return auth.password;
        },
      };

      axios.get = (url, config) => {
        // mock getList
        if (url === 'https://yq-private-api.vchangyi.com/cus/checkin.php') {
          assert.deepEqual(config.auth, auth);
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ data: listData });
            }, 200);
          });
        }
        // mock check
        if (url.indexOf('https://boss.exmailgz.com/cgi-bin/ww_cuschkin') === 0) {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ data: checkData });
            }, 200);
          });
        }
        // mock report
        if (url.indexOf('https://yq-private-api.vchangyi.com/cus/report.php') === 0) {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ data: reportData });
            }, 200);
          });
        }
        throw new Error('出错了，不应该到这里');
      };

      axios.post = (url) => {
        assert.equal('https://boss.exmailgz.com/cgi-bin/ww_cuschkin', url);
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: submitData });
          }, 200);
        });
      };
      await new Promise((resolve) => {
        main(win, (error, stats) => {
          console.log(stats);
          resolve();
        });
      });
    });
  });
});
