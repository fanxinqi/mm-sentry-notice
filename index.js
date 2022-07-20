const request = require("request");
const config = require("./config");
const dayjs = require("dayjs");
const day = dayjs().format("YYYY-MM-DD");

function getErrorList() {
  const p = new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      url: "https://ios-sentry.mm.taou.com/api/0/organizations/sentry/issues/?collapse=stats&expand=owners&expand=inbox&limit=10&project=11&query=is%3Aunresolved&shortIdLookup=1&sort=freq&statsPeriod=14d",
      headers: {
        Authorization: config.authorization,
      },
    };

    request(options, function (error, response) {
      if (error) {
        reject(error);
        throw new Error(error);
      }
      resolve(JSON.parse(response.body));
    });
  });
  return p;
}

function getQueryEmail(emails) {}

function unique(arr) {
  return Array.from(new Set(arr));
}

function getMsg(sentryData, email_users) {
  let msgs = [];
  sentryData.forEach((item, index) => {
    if (item && item.assignedTo && item.assignedTo) {
      const feishuinfo = email_users[item.assignedTo.email][0];
      let msg = [];
      msg.push({
        tag: "text",
        text: index,
      });
      msg.push({
        tag: "a",
        href: `${item.permalink}`,
        text: `${item.metadata.value}`,
      });
      msg.push({
        tag: "at",
        user_id: feishuinfo.open_id,
      });
      msgs.push(msg);
    }
  });
  msgs.push([
    {
      tag: "text",
      text: "烦请及时登录sentry分配对应负责的同学，如果可以忽略的错误，经部门负责人审核过了可以@范新旗，+入忽略列表 ",
    },
  ]);
  return msgs;
}

//open.feishu.cn/open-apis/bot/v2/hook/c32de9ee-12ee-4dc1-8409-5bcad248db85
async function main() {
  // 获取sentry 错误列表
  const data = await getErrorList();

  // 获取邮箱列表
  const emails = unique(data.map((item) => (item.assignedTo || {}).email));

  //可以@到人
  const openids = await getFeishuUserId(emails);
  // console.log(JSON.parse(openids).data.email_users);
  const msg = await getMsg(data, openids.data.email_users);

  //发送飞送消息
  sendMsg("226472c9-80bd-4c7d-a96a-311f7336e79b", msg);
}

function getToken() {
  const data = {
    app_id: "cli_a0b5edbfbab8500c",
    app_secret: "LDTdHuTglWQ1llbTsVhTfbgR60cfxXUM",
  };

  const options = {
    url: "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/",
    method: "post",
    json: true,
    body: data,
  };

  const p = new Promise((resolve, reject) => {
    request(options, function (error, response) {
      if (error) {
        reject(error);
        throw new Error(error);
      }
      resolve(response.body);
    });
  });
  return p;
}

async function getFeishuUserId(emails) {
  let query = "";

  emails.forEach((email) => {
    if (email) {
      query += `emails=${email}&`;
    }
  });
  const token = await getToken();
  const url = "https://open.feishu.cn/open-apis/user/v1/batch_get_id";

  const p = new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      url: `${url}?${query}`,
      headers: {
        Authorization: `Bearer ${token.tenant_access_token}`,
      },
    };

    request(options, function (error, response) {
      if (error) {
        reject(error);
        throw new Error(error);
      }
      resolve(JSON.parse(response.body));
    });
  });
  return p;
}
// ret_str = utility.request_http(url=url, query_dict=qdict, headers={'Authorization': 'Bearer %s' % token},
//                                post=False, timeout=3, logger=manager.logger, tryn=1,
//                                retry_sleep=2)
// ret = jsonutil.try_parse_json(ret_str, {})
// data = ret.get('data', {}).get('email_users', {}).get(email, [])
// return data[0].get('user_id') if data else ''
// }

// send msg

/*
 *id:机器人id
 */
const sendMsg = (id, msgArray) => {
  const msg = {
    // msg_type: "text",
    // // "receive_id": "oc_xxx",
    // content: {
    //   text: msgText,
    // },
    msg_type: "post",
    content: {
      post: {
        zh_cn: {
          title: day + "报错pvtop10排行，请大家及时修复",
          content: msgArray,
        },
      },
    },
  };
  function httprequest(url, data) {
    request(
      {
        url: url,
        method: "POST",
        json: true,
        headers: {
          "content-type": "application/json",
        },
        body: data,
      },
      function (error, response, body) {
        if (!error && response.statusCode == 200) {
          // console.log(body); // 请求成功的处理逻辑
        }
      }
    );
  }
  httprequest(`https://open.feishu.cn/open-apis/bot/v2/hook/${id}`, msg);
};
main();
