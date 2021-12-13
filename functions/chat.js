const axios = require('axios');
const WSC = require('w-websocket-client');
const { configInfo: conf, writeConfig } = require('./config');
const { getSaohua, getResponse, EmptyCall } = require('./strings');
const { getCDNLinks, formatTime } = require('./utils');
const {
    getChatData,
    getXiaohuaAndTianqi,
    chatWithXiaoBingByBing,
} = require('./other_apis');
let firstMsg = null;
let secondMsg = null;
let xioaIceMsg = null;
let isSend = false;
/**
 * 发送消息
 * @param {string} msg 需要发送的消息
 */
function sendMsg(msg) {
    xioaIceMsg = msg;
    if (isSend) return;
    isSend = true;
    try {
        axios({
            method: 'post',
            url: 'https://pwl.icu/chat-room/send',
            data: {
                apiKey: conf.PWL.apiKey,
                content: msg,
            },
        }).then(() => {
            isSend = false
        })
    } catch (error) {
        isSend = false
    }
}

const opt = {
    url: `wss://pwl.icu/chat-room-channel?apiKey=${conf.PWL.apiKey}`,
    open() {
        console.log('嘀~你的小冰已上线!');
    },
    close() {
        console.log('嘀~你的小冰已掉线!');
    },
    message(data) {
        const dataInfo = JSON.parse(data.toString('utf8'));
        if (dataInfo.type !== 'msg' || !dataInfo.md) return;
        //非聊天消息
        const msg = dataInfo.md.trim();
        const user = dataInfo.userName;
        if (!['i', 'xiaoIce'].includes(user)) {
            console.log(`收到${user}的消息:${msg}`);
            CallBackMsg(user, msg);

        }
    },
    error() {
        console.log('嘀~你的小冰尝试连接失败!');
    },
};
/**
 * 接收到的消息判断分发
 * @param {string} user 用户名
 * @param {string} msg 接收到用户的消息
 */
async function CallBackMsg(user, msg) {
    updateLastTime(); //有人说话就更新时间
    const { getXJJ, GetLSPRanking, getSetu, sendXJJVideo } = require('./lsp');
    const {
        changeSaoHua,
        changeWorkState,
        changeFangChenNi,
        changeR18,
        changeFangChenNiWait,
        setAdmin,
    } = require('./settings');
    if (/^(来|滚)吧小冰$/.test(msg)) {
        changeWorkState(user, msg);
        return;
    }
    if (conf.rob.offWorking) {
        Math.random() > 0.5 &&
            sendMsg(`@${user} 我罢工了，别叫我!!!\n喊我我也不理你`);
        return;
    }
    if (!conf.rob.working) {
        console.log('机器人唤醒，但是没有完全唤醒，配置已关闭');
        return;
    }
    if (/^点歌/.test(msg)) {
        updateLastTime();
        const { wyydiange } = require('./other_apis');
        wyydiange(user, msg);
        return;
    }
    if (/^(添加管理|删除管理)/.test(msg)) {
        setAdmin(user, msg);
        return;
    }
    if (/^TTS|^朗读/i.test(msg)) {
        updateLastTime();
        const link =
            Buffer.from(
                'aHR0cHM6Ly9kaWN0LnlvdWRhby5jb20vZGljdHZvaWNlP2xlPXpoJmF1ZGlvPQ==',
                'base64'
            ) + encodeURIComponent(msg.replace(/^TTS|^朗读/i, '')),
            u = await getCDNLinks(link);
        sendMsg(
                `@${user} :那你可就听好了<br>${
                u === link
                    ? ''
                    : `<br>音频有效期【${formatTime(
                          conf.api.max_age * 60
                    )}】<br>`
            }<audio src='${u}' controls/>`
        );
        return;
    }
    // 先把茅坑占着 过几天再拉屎
    if(/^~\s{1}[\u4e00-\u9fa5]{4,}$/.test(msg)){
        sendMsg(`@${user} 非内测用户，无法使用该指令~`)
        return;
    }
    //==================================以是全局指令==================================

    if (!/^(小冰|小爱(同学)?|嘿?[，, ]?siri)/i.test(msg)){
        secondMsg = firstMsg;
		firstMsg = msg;
        if(firstMsg == secondMsg && xioaIceMsg != firstMsg){
            sendMsg(msg)
        }
        return;
    };

    console.log('叮~你的小冰被唤醒了');
    // 更新上次讲话时间
    let message = msg.replace(/^(小冰|小爱(同学)?|嘿?[，, ]?siri)/i, '');
    if (/并说/.test(message)) {
        message = message.split(':');
        message = message[message.length - 1];
    }
    message = message.trim();
    const xiaojiejie = /看妞|小姐姐|照片|来个妞/;
    const setu = /[涩色]图/;
    const r18 = /^((打开|关闭)r18)$/;
    const caidan = /^(菜单|功能)(列表)?$/;
    const watchVideo = /小姐姐视频/;
    const fangChenNi = /^防沉[溺迷]时长\s+\d+$/;
    const fangChenNiWait = /^防沉[溺迷]等待\s+\d+$/;
    const lspranking = /^lsp排行$/;
    const saohua = /^(别逼逼?了|闭嘴|人呢|在哪儿?呢?)$/;
    const tianqi = /\w*天气$/;
    const huoyue = /(当前|现在|今日|水多)(吗|少了)?(活跃)?值?$/;
    const qiangjie = /(去打劫|发工资)了?吗?$/;
    const hongbao = /(发个|来个)红包$/;
    if (/^\s*$/.test(message)) {
        if (Math.random() > 0.2) sendMsg(EmptyCall(user));
    } else if (saohua.test(message)) {
        changeSaoHua(user);
    } else if (watchVideo.test(message)) {
        sendXJJVideo(user);
    } else if (fangChenNiWait.test(message)) {
        changeFangChenNiWait(user, message);
    } else if (fangChenNi.test(message)) {
        changeFangChenNi(user, message);
    } else if (xiaojiejie.test(message)) {
        getXJJ(user);
    } else if (setu.test(message)) {
        getSetu(user, message);
    } else if (r18.test(message)) {
        changeR18(user, message);
    } else if (caidan.test(message)) {
        sendMsg(`@${user} \n 功能列表:\n
        1. 回复[看妞][小姐姐][来个妞]等查看妹子图片 [接口维护中]❌\n
        2. 回复[涩图]可查看涩图(可在涩图后跟标签查找对应的标签图片 如: 涩图 原神) [接口维护中]❌\n
        (当前插图模式:${
            conf.rob.is18 ? 'lsp模式' : '绅士模式'
        } 可输入[打开/关闭r18]切换)\n
        3. 回复[小姐姐视频]可查看国外小姐姐的视频 [接口维护中]❌\n
        4. 全局发送[TTS+文本]或[朗读+文本]即可朗读(无需关键词)\n
        5. 直接发短语即可聊天。\n
        6. 回复[xxx天气]可以查询天气\n
        7. 回复[笑话]可以随机讲个笑话\n
        8. 输入[lsp排行]可查看聊天室的lsp排行\n
        9. [来吧/滚吧小冰]可以设置打开/关闭小冰，当前状态...${getResponse()}\n
        TIP:为了您的健康和安全，所有的图片视频都已接入“防沉溺系统”，
        链接仅保存【${formatTime(
            conf.api.max_age * 60
        )}】,管理员可通过[防沉溺时长 时间(单位:分钟)]更改
        每次查看后须等待【${formatTime(
            conf.rob.lspWaitingTime * 60
        )}】,管理员可通过[防沉溺等待 时间(单位:分钟)]更改`);
    } else if (lspranking.test(message)) {
        GetLSPRanking(user);
    } else if(tianqi.test(message)){
        getXiaohuaAndTianqi(user,message)
    }else if(huoyue.test(message)){
        let msg = await liveness()
        sendMsg(`@${user} :小冰当前活跃值为：${msg}`);
    }else if(qiangjie.test(message)){
        if(conf.admin.includes(user)){
            let msg = await salary()
            let isDajie = !message.match('工资');
            sendMsg(`@${user} :小冰${isDajie ? '打劫回来' : '发工资'}啦！一共获得了${msg >= 0 ? msg+'点积分~' : '0点积分，不要太贪心哦~'}`);
        }else{
            sendMsg(`@${user} :本是要去的，但是转念一想，尚有这么多事情要做，便也就放弃了罢`)
        }
    }else if(hongbao.test(message)){
        if(conf.admin.includes(user)){
            // 概率暂时设置成5%吧，以后在改成次数限制
            if (Math.random() > 0.95){
                let data = { msg: "最！后！一！个！别再剥削我了！！！！", money: 32, count: 5}; 
                sendMsg(`[redpacket]${JSON.stringify(data)}[/redpacket]`);
            }else{
                sendMsg(`@${user} :不给了！不给了！光找我要红包，你倒是给我一个啊！本来工资就不高，还天天剥削我！！！`)
            }
        }else{
            sendMsg(`@${user} :这件事已不必再提，皆因钱财不够`)
        }
    }else{
       let msg = await chatWithXiaoBingByBing(message); //getChatData(message);
        sendMsg(`@${user} :${msg}`);
    }
}
let lastTime = new Date(); //最后一次说话时间
let lastTimes = 0; //持续次数
let lastTimeout = 5; //等待时间（单位：分钟）
let saohuaInterval = 0;
/**
 * 自动骚话，聊天室活跃砖家
 */
function autoSaohua() {
    if (conf.rob.enableSaohua) {
        let nowTime = new Date();
        if (nowTime - lastTime > lastTimeout * 60 * 1000) {
            if (nowTime.getHours() <= 22 && nowTime.getHours() >= 7) {
                if (lastTimes <= 10) {
                    //连续说10次就不说了
                    lastTimes++;
                    sendMsg(getSaohua());
                    lastTimeout += lastTimes * 5; //每次多等5分钟
                }
            } else lastTimes = 0; //重置连续次数
        }
    }
}
/**
 * 更新最后一次发消息的时间戳
 */
function updateLastTime() {
    lastTime = new Date();
    lastTimes = 0;
}

/**
 * 骚话系统设置
 * @param {boolean} isenable 是否启用骚话系统
 */
function ChangeSaohuaState(isenable = true) {
    // if (conf.rob.enableSaohua !== isenable) {
    //     conf.rob.enableSaohua = isenable;
    //     if (!isenable) {

    //     }
    // }
    if (isenable) {
        saohuaInterval = setInterval(() => {
            autoSaohua();
        }, 1 * 6 * 1000);
    } else {
        clearInterval(saohuaInterval);
        saohuaInterval = 0;
    }
}

/**
 * 更新获取摸鱼派(https://pwl.icu/)的apiKey
 */
async function updateKey() {
    try {
        const res = await axios({
            method: 'POST',
            url: 'https://pwl.icu/api/getKey',
            data: {
                nameOrEmail: conf.PWL.nameOrEmail,
                userPassword: conf.PWL.userPassword
            },
        });
        console.log('updateKey response', res.data);
        if (res.data.Key) {
            conf.PWL.apiKey = res.data.Key;
            writeConfig(conf, err => {
                if (err) throw err;
                console.log('配置更新完成');
            });
        } else throw 'apiKey错误，请检查用户名和密码（md5）';
    } catch (e) {
        console.log(e);
        throw 'apiKey未知错误';
    }
}

/**
 * 检测apiKey是否有效
 * @returns {boolean} 摸鱼派(https://pwl.icu/)的apiKey是否有效
 */
async function checkKey() {
    if (conf.PWL.apiKey === '') return false;
    try {
        const resp = await axios({
            method: 'get',
            url: `https://pwl.icu/api/user?apiKey=${conf.PWL.apiKey}`,
        });
        return resp.data.code === 0;
    } catch (e) {
        console.log('PWLapiKey更新错误，错误内容:', e);
        return false;
    }
}

/**
 * 获取小冰实时活跃度
 * @returns {boolean} 摸鱼派(https://pwl.icu/)的小冰实时活跃度
 */
async function liveness() {
    if (conf.PWL.apiKey === '') return false;
    try {
        const resp = await axios({
            method: 'get',
            url: `https://pwl.icu/user/liveness?apiKey=${conf.PWL.apiKey}`,
        });
        return resp.data.liveness;
    } catch (e) {
        console.log('PWL活跃债获取错误，错误内容:', e);
        return false;
    }
}

/**
 * 领取小冰昨日活跃奖励
 * @returns {boolean} 领取小冰昨日摸鱼派(https://pwl.icu/)的活跃奖励
 */
async function salary() {
    if (conf.PWL.apiKey === '') return false;
    try {
        const resp = await axios({
            method: 'get',
            url: `https://pwl.icu/activity/yesterday-liveness-reward-api?apiKey=${conf.PWL.apiKey}`,
        });
        return resp.data.sum;
    } catch (e) {
        console.log('PWL昨日活跃领取错误，错误内容:', e);
        return false;
    }
}
async function init() {
    axios.default.timeout = 5000;
    //全局5秒超时
    if (!(await checkKey())) {
        console.log('CK已过期');
        await updateKey();
    }
    new WSC(opt);
    ChangeSaohuaState();
}
module.exports = {
    sendMsg,
    init,
    liveness,
    salary
};