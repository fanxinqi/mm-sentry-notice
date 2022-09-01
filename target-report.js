var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var request = require("request");
var config = require("./config");
var dayjs = require("dayjs");
var schedule = require("node-schedule");
var Q = {
    Q1: [0, 1, 2],
    Q2: [3, 4, 5],
    Q3: [6, 7, 8],
    Q4: [9, 10, 11]
};
var TargetName = {
    timeProcess: "时间进度",
    start: "开始值",
    end: "目标值",
    current: "当前值",
    percentage: "进度",
    status: "进展状态"
};
function getSentryData(url) {
    var p = new Promise(function (resolve, reject) {
        var options = {
            method: "GET",
            url: url,
            headers: {
                Authorization: config.authorization
            }
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
function getPerformanceRate() {
    return __awaiter(this, void 0, void 0, function () {
        var performanceData, lcpData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getSentryData("https://ios-sentry.mm.taou.com/api/0/organizations/sentry/events-vitals/?environment=profile_prod&environment=network_prod&environment=jobs_prod&project=11&query=transaction.duration%3A%3C15m%20p75%28transaction.duration%29%3A%3E2.5%20event.type%3Atransaction%20has%3Ameasurements.lcp&statsPeriod=7d&vital=measurements.lcp")];
                case 1:
                    performanceData = _a.sent();
                    lcpData = performanceData["measurements.lcp"];
                    return [2 /*return*/, lcpData.poor / lcpData.total];
            }
        });
    });
}
function getErrorRate() {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var errorData, _b, failure_rate;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, getSentryData("https://ios-sentry.mm.taou.com/api/0/organizations/sentry/eventsv2/?environment=jobs_prod&field=count%28%29&field=failure_count%28%29&field=failure_rate%28%29&per_page=50&project=11&query=transaction.duration%3A%3C10m&referrer=api.discover.query-table&statsPeriod=7d")];
                case 1:
                    errorData = _c.sent();
                    _b = (((_a = errorData["data"]) === null || _a === void 0 ? void 0 : _a[0]) || {}).failure_rate, failure_rate = _b === void 0 ? 0 : _b;
                    return [2 /*return*/, failure_rate];
            }
        });
    });
}
var getCurrentQTimeSchedule = function () { return __awaiter(_this, void 0, void 0, function () {
    var nowTime, month, processRate;
    return __generator(this, function (_a) {
        nowTime = new Date();
        month = nowTime.getMonth();
        processRate = 0;
        Object.keys(Q).forEach(function (m, index) {
            if (Q[m].includes(month)) {
                var totalDay_1 = 0;
                var processDay = 0;
                Q[m].forEach(function (mi) {
                    totalDay_1 += dayjs(nowTime).date(mi).daysInMonth();
                });
                var Qindex = Q[m].includes(month);
                if (Qindex > 1) {
                    processDay =
                        dayjs(nowTime).date(Q[m][0]).daysInMonth() +
                            dayjs().date(Q[m][1]).daysInMonth();
                }
                else if (Qindex > 0) {
                    processDay = dayjs(nowTime).date(Q[m][0]).daysInMonth();
                }
                processDay += dayjs(nowTime).date();
                console.log("totalDay:", totalDay_1);
                console.log("processDay", processDay);
                processRate = processDay / totalDay_1;
            }
        });
        return [2 /*return*/, processRate];
    });
}); };
/*
 *id:机器人id
 */
var sendMsg = function (id, msgArray, title) {
    var day = dayjs().format("YYYY-MM-DD");
    var msg = {
        msg_type: "post",
        content: {
            post: {
                zh_cn: {
                    title: day + title,
                    content: msgArray
                }
            }
        }
    };
    function httprequest(url, data) {
        request({
            url: url,
            method: "POST",
            json: true,
            headers: {
                "content-type": "application/json"
            },
            body: data
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                // console.log(body); // 请求成功的处理逻辑
            }
        });
    }
    httprequest("https://open.feishu.cn/open-apis/bot/v2/hook/".concat(id), msg);
};
function report() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/];
        });
    });
}
function getMsg(MsgObj) {
    var msgs = [], msg = [];
    Object.keys(MsgObj).forEach(function (key) {
        msg.push({
            tag: "text",
            un_escape: true,
            text: "".concat(TargetName[key], ":").concat(MsgObj[key] + (key === "status" ? "" : "%"), " \n")
        });
    });
    msg.push({
        tag: "text",
        un_escape: true,
        text: "\u6570\u636E\u6765\u6E90:https://ios-sentry.mm.taou.com/organizations/sentry/issues/ \u6709\u95EE\u9898\u8BF7@\u8303\u65B0\u65D7"
    });
    msgs.push(msg);
    return msgs;
}
(function () {
    return __awaiter(this, void 0, void 0, function () {
        var scheduleTask;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    scheduleTask = function () { return __awaiter(_this, void 0, void 0, function () {
                        var rule;
                        var _this = this;
                        return __generator(this, function (_a) {
                            rule = new schedule.RecurrenceRule();
                            //每周一、周三、周五的 10:0:0分
                            rule.dayOfWeek = [1, 2, 3, 4, 5];
                            rule.hour = [10];
                            rule.minute = 30;
                            rule.second = 0;
                            schedule.scheduleJob(rule, function () { return __awaiter(_this, void 0, void 0, function () {
                                var timeProcess, errorTarget, performancTarget;
                                var _a, _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0: return [4 /*yield*/, getCurrentQTimeSchedule()];
                                        case 1:
                                            timeProcess = _c.sent();
                                            _a = {
                                                timeProcess: timeProcess * 100,
                                                start: 0.62,
                                                end: 0.5
                                            };
                                            return [4 /*yield*/, getErrorRate()];
                                        case 2:
                                            errorTarget = (_a.current = (_c.sent()) * 100,
                                                _a.percentage = 0,
                                                _a.status = "正常",
                                                _a);
                                            errorTarget.percentage =
                                                ((errorTarget.current - errorTarget.start) /
                                                    (errorTarget.end - errorTarget.start)) *
                                                    100;
                                            // 保留两位小数
                                            errorTarget.percentage = parseFloat(errorTarget.percentage.toFixed(2));
                                            errorTarget.timeProcess = parseFloat(errorTarget.timeProcess.toFixed(2));
                                            errorTarget.current = parseFloat(errorTarget.current.toFixed(2));
                                            errorTarget.status =
                                                errorTarget.percentage > errorTarget.timeProcess ? "正常" : "风险";
                                            _b = {
                                                timeProcess: timeProcess * 100,
                                                start: 1,
                                                end: 0.5
                                            };
                                            return [4 /*yield*/, getPerformanceRate()];
                                        case 3:
                                            performancTarget = (_b.current = (_c.sent()) * 100,
                                                _b.percentage = 0,
                                                _b.status = "正常",
                                                _b);
                                            performancTarget.percentage =
                                                ((performancTarget.current - performancTarget.start) /
                                                    (performancTarget.end - performancTarget.start)) *
                                                    100;
                                            // 保留两位小数
                                            performancTarget.percentage = parseFloat(performancTarget.percentage.toFixed(2));
                                            performancTarget.timeProcess = parseFloat(performancTarget.timeProcess.toFixed(2));
                                            performancTarget.current = parseFloat(performancTarget.current.toFixed(2));
                                            performancTarget.status =
                                                performancTarget.percentage > performancTarget.timeProcess
                                                    ? "正常"
                                                    : "风险";
                                            sendMsg("7820d037-9e5a-427c-a9be-27adb3a2dc79", getMsg(performancTarget), "前端性能指标(7日内LCP>2.5s的页面访问占比<0.5)");
                                            sendMsg("7820d037-9e5a-427c-a9be-27adb3a2dc79", getMsg(errorTarget), "前端稳定指标(7日内报错率占比<0.5%)");
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            return [2 /*return*/];
                        });
                    }); };
                    return [4 /*yield*/, scheduleTask()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
})();
