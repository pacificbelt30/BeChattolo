// Beちゃっとぉ クライアント側

// ----- Javascript部分 -----

//----- 定数定義 -----
const CONTTT = document.getElementById('conttt'); // メッセージ内容の表示部分
const TIME_B = document.getElementById('time_b'); // 時刻表示用(仮)
const XHR_TIMEOUT = 1000 * 4; // サーバリクエストのタイムアウト時間(ms)
const MAINLOOP_TIMER = 1000 * 4; // メイン関数の実行間隔の時間 (ms)
const SEND_SERVER = 'chat.php';
// const SEND_SERVER = 'https://u2net.azurewebsites.net/chat/chat.php'; // POSTする本番サーバURL
// const SEND_SERVER = 'https://u2api.azurewebsites.net/chat/chat.php'; // POSTする試験サーバURL

// ----- 変数定義 -----
var s_cnt = 0; // 処理カウント用
var last_date = 0; // 前回更新日時
var dis_update = 0; // 更新するかしないかのフラグ
// var push_timer = 1500; // 通知の表示時間(ms)
var push_timer = 3000; // 通知の表示時間(ms)
var dsp_active = 1; // タブの状態を代入する変数
var notice_set = 1; // 通知の設定
var notice2_set = 0; // 特殊な通知の設定
var room_n = 'Main'; // 表示Room
var exec_cnt=0; // main()の重複実行の抑えるために実行数をカウントする変数

function nowD() {
  const DATE = new Date();
  var now_year = DATE.getFullYear();
  var now_month = DATE.getMonth() + 1;
  var now_date = DATE.getDate();
  var now_hours = DATE.getHours();
  var now_minute = DATE.getMinutes();
  var now_sec = DATE.getSeconds();
  return '' + now_year + now_month + now_date + now_hours + now_hours + now_minute + now_sec;
}


// ----- 初期処理 -----
console.log('%cＢｅちゃっとぉ%c Ver.0.7.0 20200307', 'color: #fff; font-size: 2em; font-weight: bold;', 'color: #00a0e9;');
console.log('%cSessionBegin %c> ' + nowD(), 'color: orange;', 'color: #bbb;');

if (!localStorage.getItem("Notice")) { // 通知の設定の確認
  localStorage.setItem("Notice", notice_set);
} else {
  notice_set = localStorage.getItem("Notice");
}

if (!localStorage.getItem("Notice2")) { // 特殊な通知の設定の確認
  localStorage.setItem("Notice2", notice2_set);
} else {
  notice2_set = localStorage.getItem("Notice2");
}
get_room_list();
main(); // メイン処理を実行

// ----- メイン処理 -----
function main() { // ロード時開始

  cuser_name(); // ユーザー確認
  date_update(); // 時刻更新

  // console.log('%cSessionBegin %c> ' + nowD(), 'color: orange;', 'color: #bbb;');
  const b_req = new XMLHttpRequest();
  b_req.open('POST', SEND_SERVER, true);
  b_req.setRequestHeader('Pragma', 'no-cache'); // キャッシュを無効にするためのヘッダ指定
  b_req.setRequestHeader('Cache-Control', 'no-cach');
  b_req.setRequestHeader('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
  b_req.timeout = XHR_TIMEOUT; // サーバリクエストのタイムアウト時間の指定
  if (s_cnt == 0) {
    b_req.send('b_req=bbb&user=' + localStorage.getItem("userName") + '&dir=' + room_n); // b_req=bbbを指定することで更新日時の判定なしで、即レスポンスを行い、データを取得します
  } else {
    b_req.send('b_req=BBBBB&last_date=' + last_date + '&dir=' + room_n); // b_req≠bbbの時は、ファイルの更新日時による判定で、更新がある場合のみ取得します
  }
  b_req.onreadystatechange = function () { // 通信ステータスが変わったとき実行
    if (b_req.readyState === 4) {
      if (b_req.status === 200) {
        // b_data = b_post.responseText.parse(json);
        var out_data = AppAdjust(b_req.responseText);
        if (dis_update == 0 && out_data) { // dis_update == 0 の時にメッセージ内容の表示の更新を行います
          CONTTT.innerHTML = AutoLink(out_data);
          if (s_cnt !== 0) { // 初回読み込み時以外で、更新があった場合はPush通知を行う
            notice('', push_timer); // 通知を行う
          }
        }
        s_cnt++;
        // console.log(s_cnt);
        // main();
        if (exec_cnt < 1) {
          exec_cnt++;
          setTimeout(main, MAINLOOP_TIMER);
          setTimeout(reserve_cnt, XHR_TIMEOUT);
        }
        // console.log(b_data);
      } else {
        if (exec_cnt < 1) {
          exec_cnt++;
          setTimeout(main, XHR_TIMEOUT);
          setTimeout(reserve_cnt, XHR_TIMEOUT);
        }
      }
    }
  }
  // console.log('>');
  // TIME_B.innerHTML = nowD();
  // setTimeout(main, MAINLOOP_TIMER);
}

// ----- データ取得の重複実行を抑える
function reserve_cnt() {
  exec_cnt--;
}

// ----- サーバにメッセージ内容を送信する関数 -----
const div_top = document.getElementById('chat_content');

function b_send() { // データをサーバに送信する関数
  var send_data = esc(div_top.value, 0); // inputに入っている値を$send_dataに代入します
  if (send_data.length >= 1011 || send_data.length <= 0) { // データサイズのチェックです
    console.log('%cPOST_SIZE %c> OVER <', 'color: #fff;', 'color: red;'); // データサイズが大きすぎる場合は拒否
    return B;
  } else { // 以下main関数とほぼ同様
    console.log('%cPOST_DATA %c> ' + send_data, 'color: orange;', 'color: #bbb;');
    // console.log(send_data);
    div_top.value = '';
    var b_post = new XMLHttpRequest();
    b_post.open('POST', SEND_SERVER, true);
    b_post.setRequestHeader('Pragma', 'no-cache');
    b_post.setRequestHeader('Cache-Control', 'no-cach');
    b_post.setRequestHeader('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
    b_post.timeout = XHR_TIMEOUT; // サーバリクエストのタイムアウト時間の指定
    b_post.send('b_send=' + send_data + "&user=" + localStorage.getItem("userName") + '&dir=' + room_n);
    b_post.onreadystatechange = function () {
      if (b_post.readyState === 4) {
        if (b_post.status === 200) {
          CONTTT.innerHTML = AutoLink(AppAdjust(b_post.responseText));
          console.log('%cPOST_OK!', 'color: #00a0e9;');
        }
      }
    }
  }
}

// ----- メッセージ内容表示用にHTMLタグ付けする関数 -----
/*
// データ形式について (Ver.0.6現在)
・基本パターン
メッセージ \t 名前 \t 時間 \n
メッセージ \t 名前 \t 時間 \n
メッセージ \t 名前 \t 時間 \n

・改行拡張パターン
メッセージ \t 名前 \t 時間 \n
メッセージ \n メッセージ メッセージ \t 名前 \t 時間 \n
メッセージ \t 名前 \t 時間 \n

\t > \t > \n の組み合わせ順で1つのメッセージと判断
\nでsplitした時点で\tがないものは後ろの配列と結合し、slice > spliceする
*/
const descr = document.getElementById('descr');
function AppAdjust(OriginalText) {
  if (OriginalText == 'B') { // 'B'が渡された場合は、ファイルの更新はありません
    // OriginalText = sessionStorage.getItem('receive_data'); // 更新がない場合、SessionStorageからデータを取得します
    dis_update = 1; // dip_update = 1 の時は、メッセージ内容の更新を行いません
    return false;
    // console.log('session');
  } else {
    // sessionStorage.setItem('receive_data', OriginalText);
    dis_update = 0;
  }
  // ----- mdataの分割 -----
  var con_b_data = OriginalText.split(/\r?\n/g); // 改行で区切り、配列にします
  // last_date = con_b_data[0]; // 配列の最初はファイルの更新日時が入っています
  // Ver.0.7~ データの1行目に \t区切りで roomの説明と更新日時が入ります
  for (var i = 0; i< con_b_data.length; i++) {
    if(con_b_data[i].indexOf("\t") < 0) {
      con_b_data[i + 1] = con_b_data[i] + "<br>" + con_b_data[i + 1];
      con_b_data.splice(i,1);
      i--;
    } else {
      var mdata_split = con_b_data[i].split("\t");
      descr.innerHTML = mdata_split[0];
      last_date = mdata_split[1];
      break;
    }
  }
  // ----- メッセージの分割 -----
  for (var i = 1; i < con_b_data.length; i++) { // Tab区切りで配列にし、HTMLタグを加えます
    var arr_b_data = con_b_data[i].split(/\t/);
    if (arr_b_data[1]) { // 基本パターン
      if (arr_b_data[2]) { // Ver,0,6,1以降のデータ形式の場合
        con_b_data[i] = "<span id=user>" + arr_b_data[1] + "</span>" + " <span id=date>" + arr_b_data[2] + "</span> " + arr_b_data[0];
      } else { // Ver.0.6以前のデータ形式の場合
        con_b_data[i] = arr_b_data[0] + "<span id=date>" + arr_b_data[1] + "</span>";
      }
    } else if (i < con_b_data.length - 1) { // 改行拡張パターン
      con_b_data[i + 1] = con_b_data[i] + '<br>' + con_b_data[i + 1];
      con_b_data.splice(i, 1);
      i--;
    }
  }
  var out_data = '';
  for (var i = 1; i < con_b_data.length - 1; i++) { // メッセージ内容の表示部分に出力するために順番を入れ替え、HTMLタグを加えます
    if (i == con_b_data.length - 2) {
      out_data = "<li id=list2>" + con_b_data[i] + "</li>" + out_data;
    } else {
      out_data = "<li id=list>" + con_b_data[i] + "</li>" + out_data;
    }
  }
  return out_data;
}

// ----- サーバにリクエストを送る関数 -----
// functoin req(get_mode, )

// ----- キー入力を処理する関数 -----
// Alt+Enter(keyCode==13)が入力されたとき、b_send()を実行
document.onkeydown = keydown;

function keydown() {
  if (event.altKey == true && event.keyCode == 13) { // Alt + Enter で送信
    b_send();
  }
}

// ----- 通知を行う関数 -----
function notice(message, timer) {
  if (notice2_set == 1) {
    m1_notice();
  }
  if (document.hidden && notice_set == 1) {
    if (!message) {
      message = 'New message received!';
    }
    Push.create(message, {
      timeout: timer,
      onClick: function () {
        window.focus();
        this.close();
      }
    });
    document.title = '🟧Beちゃっとぉ';
  }
}

// ----- タブの状態を取得 -----
document.addEventListener('visibilitychange', function () {
  if (document.Hidden) {
    dsp_active = 0;
  } else {
    dsp_active = 1;
    document.title = 'Beちゃっとぉ';
  }
}, false);

// ----- 自動リンク化する関数 -----
// $strに入れると、リンク部分が<a>で囲われてreturn
function AutoLink(str) {
  var regexp_url = /((h?)(ttps?:\/\/[a-zA-Z0-9.\-_@:/~?%&;=+#',()*!]+))/g; // ']))/;
  var regexp_makeLink = function (all, url, h, href) {
    return '<a href="h' + href + '"  target="_blank">' + url + '</a>';
  }
  return str.replace(regexp_url, regexp_makeLink);
}

// ----- 文字のエスケープ/アンエスケープ処理 -----
function esc(str, mode) { // mode = 0の時エスケープ、それ以外はアンエスケープ(アンエスケープは未使用)
  if (mode === 0) {
    return str
      // .replace(/&/g, '&amp;')
      .replace(/&/g, '%26')
      // .replace(/ /g, '%20')
      // .replace(/\+/g, '&#43;');
      .replace(/\r?\n/g, '%0D%0A')
      .replace(/\t/g, '%20')
      .replace(/\+/g, '%2B');
  } else {
    return str
      // .replace(/(&#43;)/g, '+')
      .replace(/(&ensp;)/g, ' ')
      // .replace(/(&amp;)/g, '&');
      .replace(/(%26;)/g, '&');
  }
}

// ----- 最初のユーザー名の設定 -----
first_sc = document.getElementById('first_sc');

function cuser_name() {
  if (!localStorage.getItem("userName")) {
    first_sc.style.display = "block";
  } else {
    first_sc.style.display = "none";
  }
}

// ----- ユーザー名をSessioinStrageに保存 -----
user_name = document.getElementById('user_name');

function user_submit() {
  if (user_name.value) {
    localStorage.setItem('userName', user_name.value);
    cuser_name();
  }
}

// ----- 動作設定 -----
const L_side = document.getElementById('L_side');
const R_side = document.getElementById('R_side');
const setting = document.getElementById('setting');
const user_name2 = document.getElementById('user_name2');
const notification_set = document.getElementById('notification');
const notification2_set = document.getElementById('notification2');
setting_toggle = 0;

function e_setting() { // 設定関係
  if (setting_toggle === 0) { // 設定を開いたとき
    user_name2.value = localStorage.getItem("userName");
    setting.style.display = "block";
    CONTTT.style.display = "none";
    L_side.style.display = "none";
    R_side.style.display = "none";
    setting_toggle = 1;
    if (localStorage.getItem("Notice") === '1') { // 通知のチェックボックス更新
      notification_set.checked = true;
    } else {
      notification_set.checked = false;
    }
    if (localStorage.getItem("Notice2") === '1') {
      notification2_set.checked = true;
    } else {
      notification2_set.checked = false;
    }
  } else { // 設定を閉じたとき (設定更新)
    setting.style.display = "none";
    CONTTT.style.display = "block";
    L_side.style.display = "block";
    R_side.style.display = "block";
    setting_toggle = 0;
    // 設定更新
    localStorage.setItem('userName', user_name2.value);
    cuser_name();
    if (notification2_set.checked) {
      localStorage.setItem("Notice2", "1");
      notice2_set = 1;
    } else {
      localStorage.setItem("Notice2", "0");
      notice2_set = 0;
    }
    if (notification_set.checked) {
      localStorage.setItem("Notice", "1");
      notice_set = 1;
      // Push.Permission.request(onGranted, onDenied); // 通知の許可リクエスト
      // notice('通知が有効になりました', push_timer);
    } else {
      localStorage.setItem("Notice", "0");
      notice_set = 0;
    }
  }
}

// ----- 時間の更新 -----
function date_update() {
  var week = ["日", "月", "火", "水", "木", "金", "土"];
  var date = new Date();
  if (date.getHours() < 10) {
    date_hours = '0' + date.getHours();
  } else {
    date_hours = date.getHours();
  }
  if (date.getMinutes() < 10) {
    date_minutes = '0' + date.getMinutes();
  } else {
    date_minutes = date.getMinutes();
  }
  TIME_B.innerHTML = date.getMonth() + 1 + '月' + date.getDate() + '日(' + week[date.getDay()] + ') ' + date_hours + '<span id=dot>:</span>' + date_minutes;
}

// ----- GET GET_Value -----
// 参考> https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
/*
GETでRoom遷移をしようとしたが、やはりページがリロードされて遅いのでやめた
そのため、この関数は利用されていない。
今後利用する可能性があるので残してある。
*/
function getParam(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return false;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

// ----- 表示Room変更 -----
function change_room(room) {
  room_n = room;
  main();
}

// ----- RoomListを取得+ボタン生成 -----
var get_list = ''; // RoomList
function get_room_list() { // データをサーバに送信する関数
  console.log('%cGET_LIST %c> ', 'color: orange;', 'color: #bbb;');
  var b_list = new XMLHttpRequest();
  b_list.open('POST', SEND_SERVER, true);
  b_list.setRequestHeader('Pragma', 'no-cache');
  b_list.setRequestHeader('Cache-Control', 'no-cach');
  b_list.setRequestHeader('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
  b_list.timeout = XHR_TIMEOUT; // サーバリクエストのタイムアウト時間の指定
  b_list.send('b_req=βββ');
  b_list.onreadystatechange = function () {
    if (b_list.readyState === 4) {
      if (b_list.status === 200) {
        var putData="<button onclick=change_room('main')>MainRoom</button><br><br>";
        get_list = b_list.responseText.split("\n");
        for(i=0; i<get_list.length-2; i++) {
          if(get_list[i]) {
            var get_list_t = get_list[i].split("\t");
            putData += "<button onclick=change_room('"+get_list_t[0]+"')>"+get_list_t[1]+"</button><br>";
          }
        }
        L_side.innerHTML = putData;
      }
    }
  }
  // return get_list;
}