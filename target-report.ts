const request = require("request");
const config = require("./config");
const dayjs = require("dayjs");
const day = dayjs().format("YYYY-MM-DD");
const schedule = require("node-schedule");

const Q = {
  Q1: [0, 1, 2],
  Q2: [3, 4, 5],
  Q3: [6, 7, 8],
  Q4: [9, 10, 11],
};

// 指标工具
interface Target {
  timeProcess: number; // 时间进度
  start: number; // 目标开始值
  end: number; //目标期望值
  current: number; // 目标当前值
  percentage: number; //进度
  status: string;
}
const TargetName = {
  timeProcess: "时间进度",
  start: "开始值",
  end: "目标值",
  current: "当前值",
  percentage: "进度", //进度
  status: "进展状态", // 状态
};

function getSentryData(url) {
  const p = new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      url: url,
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

async function getPerformanceRate() {
  const performanceData: any = await getSentryData(
    "https://ios-sentry.mm.taou.com/api/0/organizations/sentry/events-vitals/?environment=profile_prod&environment=network_prod&environment=jobs_prod&project=11&query=transaction.duration%3A%3C15m%20p75%28transaction.duration%29%3A%3E2.5%20event.type%3Atransaction%20has%3Ameasurements.lcp&statsPeriod=7d&vital=measurements.lcp"
  );
  const lcpData = performanceData["measurements.lcp"];
  return lcpData.poor / lcpData.total;
}

async function getErrorRate() {
  const errorData: any = await getSentryData(
    "https://ios-sentry.mm.taou.com/api/0/organizations/sentry/eventsv2/?environment=jobs_prod&field=count%28%29&field=failure_count%28%29&field=failure_rate%28%29&per_page=50&project=11&query=transaction.duration%3A%3C10m&referrer=api.discover.query-table&statsPeriod=7d"
  );
  const { failure_rate = 0 } = errorData["data"]?.[0] || {};
  return failure_rate;
}

const getCurrentQTimeSchedule = async () => {
  const nowTime = new Date();
  const month = nowTime.getMonth();
  let processRate: number = 0;
  Object.keys(Q).forEach((m, index) => {
    if (Q[m].includes(month)) {
      let totalDay = 0;
      let processDay = 0;
      Q[m].forEach((mi) => {
        totalDay += dayjs(nowTime).date(mi).daysInMonth();
      });

      const Qindex = Q[m].includes(month);
      if (Qindex > 1) {
        processDay =
          dayjs(nowTime).date(Q[m][0]).daysInMonth() +
          dayjs().date(Q[m][1]).daysInMonth();
      } else if (Qindex > 0) {
        processDay = dayjs(nowTime).date(Q[m][0]).daysInMonth();
      }
      processDay += dayjs(nowTime).date();

      console.log("totalDay:", totalDay);
      console.log("processDay", processDay);
      processRate = processDay / totalDay;
    }
  });
  return processRate;
};

/*
 *id:机器人id
 */
const sendMsg = (id, msgArray, title) => {
  const msg = {
    msg_type: "post",
    content: {
      post: {
        zh_cn: {
          title: day + title,
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

async function report() {
  // const errorTarget: Target = {
  //   timeSchedule:
  //     start: number; // 目标开始值
  //   current: number; // 目标当前值
  //   percentage: number; //进度
  // }
}

function getMsg(MsgObj) {
  const msgs: any = [],
    msg: any = [];
  Object.keys(MsgObj).forEach((key) => {
    msg.push({
      tag: "text",
      un_escape: true,
      text: `${TargetName[key]}:${
        MsgObj[key] + (key === "status" ? "" : "%")
      } \n`,
    });
  });
  msg.push({
    tag: "text",
    un_escape: true,
    text: `数据来源:https://ios-sentry.mm.taou.com/organizations/sentry/issues/ 有问题请@范新旗`,
  });

  msgs.push(msg);
  return msgs;
}

(async function () {
  const scheduleTask = async () => {
    let rule = new schedule.RecurrenceRule();
    //每周一、周三、周五的 10:0:0分
    rule.dayOfWeek = [1, 2, 3, 4, 5];
    rule.hour = [10];
    rule.minute = 30;
    rule.second = 0;
    schedule.scheduleJob(rule, async () => {
      const timeProcess = await getCurrentQTimeSchedule();
      const errorTarget: Target = {
        timeProcess: timeProcess * 100,
        start: 0.62,
        end: 0.5,
        current: (await getErrorRate()) * 100, // 单位百分比 =>小数
        percentage: 0,
        status: "正常",
      };
      errorTarget.percentage =
        ((errorTarget.current - errorTarget.start) /
          (errorTarget.end - errorTarget.start)) *
        100;
      errorTarget.status =
        errorTarget.percentage > errorTarget.timeProcess ? "正常" : "风险";

      const performancTarget: Target = {
        timeProcess: timeProcess * 100,
        start: 1,
        end: 0.5,
        current: (await getPerformanceRate()) * 100, // 单位百分比 =>小数
        percentage: 0,
        status: "正常",
      };

      performancTarget.percentage =
        ((performancTarget.current - performancTarget.start) /
          (performancTarget.end - performancTarget.start)) *
        100;
      performancTarget.status =
        performancTarget.percentage > performancTarget.timeProcess
          ? "正常"
          : "风险";
      sendMsg(
        "7820d037-9e5a-427c-a9be-27adb3a2dc79",
        getMsg(performancTarget),
        "前端性能指标(7日内LCP>2.5s的页面访问占比<0.5)"
      );
      sendMsg(
        "7820d037-9e5a-427c-a9be-27adb3a2dc79",
        getMsg(errorTarget),
        "前端稳定指标(7日内报错率占比<0.5%)"
      );
    });
  };
  await scheduleTask();
})();
