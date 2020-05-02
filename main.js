// Beちゃっとぉ クライアント側

/*
GET ?room=xxx の指定により、開くページを指定できます
*/

// ----- Javascript部分 -----

// ----- 定数定義 -----
const XHR_TIMEOUT = 1000 * 5; // サーバリクエストのタイムアウト時間(ms)
const XHR_TIMEOUT_L = 1000 * 3600; // サーバリクエストのタイムアウト時間(ms)(長い)
const MAINLOOP_TIMER = 1000 * 5; // メイン関数の実行間隔の時間 (ms)
const MAX_SEND_SIZE = 3003; // 最大送信サイズ 0xBBB
const READ_AHEAD = 400; // 先読みを行う残りpx条件
const PUSH_TIMER = 3000; // Push通知の表示時間
const SEND_SERVER = 'chat.php';
// const SEND_SERVER = 'https://u2api.azurewebsites.net/chat/chat.php'; // POSTする試験サーバURL
// const SEND_SERVER = 'https://u2net.azurewebsites.net/chat/chat.php'; // POSTする本番サーバURL
// const SEND_SERVER = 'http://fukube.biz.ht/chat.php'; // POSTする本番サーバ2URL

// phpへのリクエスト種類
const ADD_MES = 'add'; // メッセージの追加
const GET_MES = 'mes'; // メッセージ取得
const EDT_MES = 'edt'; // メッセージの編集/削除
const GET_DIR = 'dir'; // メッセージのディレクトリ一覧取得
const SET_DIR = 'set'; // メッセージのディレクトリ(Room)の作成・編集
const DEL_DIR = 'del'; // ディレクトリ(Room)へのアクセス不可にする
// メッセージは分割され、スクロールされたときに随時読み込むため結合が必要
const JOINT_MES = 'joint' // メッセージの結合

// メッセージの種類
const MES_TYPE_PLA = 'plain'; // 通常のテキスト
const MES_TYPE_IMG = 'image'; // 画像リンク
const MES_TYPE_IFR = 'iframe'; // 埋め込みリンク

// IndexedDBのデータベース名
const DB_N = 'BeChat_DB';
const DB_N2 = 'BeChat_DB2';
// オブジェストア名
const OBJ_STORE_LAST = 'ckb_last';
const OBJ_STORE_MESS = 'ckb_mess';

// スタイル変更の幅の閾値 (px)
MIN_WINDOW = 768;



// ----- 変数宣言 -----
var now_room = 'main'; // 現在アクティブなRoomのdir_name
var room_show = 'Main_room'; // 現在アクティブなRoomの表示名
var descrip_text = ''; // 現在アクティブなRoomのDescription
var now_thread = 0; // 現在アクティブなRoomのthread
var exec_cnt = 0; // main()の重複実行を抑えるために実行数をカウントする変数
var sub_DB = []; // IndexedDBが使用できない場合、更新状態を配列で保持する. そのため確保しておく

var support_indexedDB = 0; // IndexedDBが利用可能:0 , 非サポート:1, サポートされているが、アクセス不可:2
var support_push = 0; // NotificationAPI(Push通知)が利用可能:0, 非サポート:1, 許可されていない:2, 無視:3

// ----- 設定情報用変数 デフォルト値 -----
var notice_set = 0; // 通知の設定
var notice2_set = 0; // 特殊な通知の設定
var theme_set = 1; // Themeの設定
var sendKey_set = 1; // 送信ショートカットの設定
var load_media_set = 1; // 埋め込みメディアの読み込み
var change_font_aa = 0; // アスキーアート向けのフォントに変更
var sp_mode = false; // スマホモード

// ----- 初期処理 -----
console.log('%cＢｅちゃっとぉ%c Ver.0.8.11 20200430', 'color: #BBB; font-size: 2em; font-weight: bold;', 'color: #00a0e9;');
ck_setting(); // Localstrage内の設定情報確認
ck_user(); // ユーザー名確認
window.onload = function Begin() {
  c_page(1); // 表示更新
  client_width(true); // リスト表示するか
  change_theme(localStorage.getItem("theme")); // Theme適用
  change_room(getParam('room')); // GET_valueでRoom変更
  ck_indexedDB(); // IndexedDBのサポート確認
  main(1); // main()に処理を渡す
  console.log('%cSessionBegin %c> ' + nowD(), 'color: orange;', 'color: #bbb;');
}

// ----- メイン処理 -----
function main(option) {
  ck_user(); // ユーザー名確認
  ck_room_data(); // Room更新確認
  sp_mode = client_width(false);
  if (option === 1) { // Roomのメッセージ取得が必要な時
    get_room_data(true); // タイムアウト長い
  }
  date_update(); // 表示時刻の更新

  if (exec_cnt < 1) {
    exec_cnt++;
    setTimeout(main, MAINLOOP_TIMER);
    setTimeout(reserve_cnt, MAINLOOP_TIMER - 100);
  }
}

// ----- データ取得の重複実行を抑えるためのカウント関数 -----
function reserve_cnt() {
  if (exec_cnt > 0) {
    exec_cnt--;
  }
}

// ----- IndexedDB (データベース接続+ObjectStore) -----

/*
// IndexedDB使えたら使う
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || {READ_WRITE: "readwrite"}; // この行は、古いブラウザー向けにオブジェクトの定数が必要である場合に限り、必要になります。
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
*/

function db_connect(base_name, store_name, sw, param1, param2, param3, param4, param5, param6) {
  const UPDATE_LAST = 'last'; // コントロール分岐
  const UPDATE_MESS = 'mess';
  const GET_LAST = 'g_last';
  const GET_MESS = 'g_mess';
  if (support_indexedDB < 1) { // IndexedDBのサポート状態
    let base_var = 1;
    var open_db = indexedDB.open(base_name, base_var);

    open_db.onupgradeneeded = function (event) {
      var store = event.target.result;
      store.createObjectStore(store_name, {
        keyPath: 'room_key'
      });
      // console.log('DB Upgrade');
    }
    open_db.onsuccess = function (event) {
      // console.log('DB Connect: ' + base_name);
      var db_data = event.target.result;
      var trans = db_data.transaction(store_name, "readwrite");
      var obj = trans.objectStore(store_name);
      if (sw === UPDATE_LAST) {
        // Room名, 最終更新時, 通知フラグ, 表示名, スレッド数, 概要
        var put_data = {
          room_key: param1,
          up_date: param2,
          notice_flag: param3,
          room_name: param4,
          thread: param5,
          descrpt: param6
        };
        // console.log('push.');
        var push = obj.put(put_data);
        push.onsuccess = function (event) {
          // console.log('Push: ' + event.target.result);
        }
      } else if (sw === UPDATE_MESS) {
        // Room名, 最終更新時, thread, descr, データ
        var put_data = {
          room_key: param1,
          up_date: param2,
          thread: param3,
          descr: param4,
          object: param5
        };
        var push = obj.put(put_data);
      } else if (sw === GET_LAST) {
        var get_data = obj.get(param1);
        get_data.onsuccess = function (ev2) {
          update_disp_db(ev2.target.result, param2, param3);
        }
      } else if (sw === GET_MESS) { // アクティブなRoomの更新
      }

      trans.oncomplete = function () {
        // console.log('Trasaction comp');
      }
      db_data.close(); // 接続解除 <- 重要
    }
    open_db.onerror = function () {
      console.log('DB Open ERROR: ' + base_name);
      support_indexedDB = 2;
      if (sw === GET_LAST) { // 取得した日時をそのまま返す // その場しのぎだが、仕方ない
        var ret = [];
        ret["up_date"] = param3[param2]["l_date"];
        update_disp_db(ret, param2, param3);
      }
    }
  }
}

// ----- IndexedDBが使用可能か確認 -----
function ck_indexedDB() {
  if (!window.indexedDB) { // IndexedDBをサポートしているか
    console.log('Does not support IndexedDB');
    support_indexedDB = 1;
  }
}

// ----- Room更新確認 -----
function ck_room_data() {
  xhr('req=' + GET_DIR, GET_DIR);
}

// ----- Roomデータ取得 -----
function get_room_data(option) { // タイムアウトを長くするオプション
  if (option === true) {
    xhr('req=' + GET_MES + '&room=' + now_room, GET_MES, false, true);
  } else {
    xhr('req=' + GET_MES + '&room=' + now_room, GET_MES, false, false);
  }
}

// ----- 追加読み込み判定 -----
function get_room_data_plus(thr, str) {
  const CONTTT = document.getElementById('conttt'); // メッセージ内容の表示部分
  if (str) {
    var r_list = JSON.parse(str);
    if (r_list["object"] && r_list["object"].length > 0) {
      CONTTT.innerHTML = CONTTT.innerHTML + parse_message(r_list); // メッセージを追加します
    }
  }
  // 追加読み込み
  var b_height = from_Bottom(); // ページ下部からのpx
  // console.log(b_height + ' ' + thr);
  if (thr > 0 && b_height < READ_AHEAD || thr > 0 && now_thread === thr) {
    // console.log("Load: Old Thread");
    xhr('req=' + GET_MES + '&room=' + now_room + '&thread=' + (thr - 1), JOINT_MES, thr - 1);
  } else if (thr > 0) {
    ready_getDataNo = thr;
    ready_getDataPlus = true; // 追加読み込みの実行OK
  } else {
    ready_getDataPlus = false; // 追加読み込みの実行ブロック
  }
}

// ----- スクロールイベント+次の再描画でアニメーションを更新するときに実行 -----
document.addEventListener('scroll', getRoomData_exec, {
  passive: true
}); // スクロールイベント取得
var ready_animFrame = false;
var ready_getDataPlus = true; // 追加読み込み
var ready_getDataNo = 0; // 既に読み込んだthread数
function getRoomData_exec() {
  if (!ready_animFrame && ready_getDataPlus && ready_getDataNo > 0) {
    requestAnimationFrame(function () {
      ready_animFrame = false;
      ready_getDataPlus = false; // 追加読み込みの実行ブロック
      get_room_data_plus(ready_getDataNo); // 追加読み込み
    });
    ready_animFrame = true;
  }
}


function user_submit() { // ユーザー名入力画面
  var user_name = document.getElementById('user_name');
  if (user_name.value) {
    localStorage.setItem('userName', user_name.value);
    ck_user();
  }
}

// ----- Room編集・作成 -----
function room_editx(mode) { // 0:Cancel 1:Edit 2:Create 3:exec
  const edit_room = document.getElementById('edit_room');
  const room_name = document.getElementById('room_name');
  const room_desk_text = document.getElementById('room_desk_text');
  const create = document.getElementById('create');
  const apply = document.getElementById('apply');
  const delete_b = document.getElementById('delete');
  const cancel = document.getElementById('cancel');

  switch (mode) {
    case 1: // 編集
      if (now_room == 'main') {
        cancel.style.display = "block";
        delete_b.style.display = "none";
        create.style.display = "none";
        apply.style.display = "none";
      } else {
        cancel.style.display = "block";
        delete_b.style.display = "block";
        create.style.display = "none";
        apply.style.display = "block";
      }
      edit_room.style.display = "block";
      room_name.value = room_show;
      room_desk_text.value = descrip_text.replace(/<br>/g, "\n");
      room_edit_mode = 1;
      break;
    case 2: // 作成
      cancel.style.display = "block";
      delete_b.style.display = "none";
      create.style.display = "block";
      apply.style.display = "none";
      edit_room.style.display = "block";
      room_name.value = '';
      room_desk_text.value = '';
      room_edit_mode = 2;
      break;
    case 3: // サーバーへリクエスト
      // ServerReq
      console.log('%cREQ_SERVER %c>>> ' + room_name.value, 'color: red;', 'color: #bbb;');
      if (room_edit_mode === 1) { // 編集
        xhr('req=' + SET_DIR + '&mode=1&name=' + localStorage.getItem("userName") + '&room=' + now_room + '&new_name=' + room_name.value + '&new_descr=' + room_desk_text.value, SET_DIR);
      } else if (room_edit_mode === 2) { // 作成
        xhr('req=' + SET_DIR + '&mode=2&name=' + localStorage.getItem("userName") + '&room=' + now_room + '&new_name=' + room_name.value + '&new_descr=' + room_desk_text.value, SET_DIR);
      } else if (room_edit_mode === 4) { // 削除
        xhr('req=' + DEL_DIR + '&name=' + localStorage.getItem("userName") + '&room=' + now_room, DEL_DIR);
      }
      main(1);
      room_edit_mode = 0;
      edit_room.style.display = "none";
      break;
    case 4: // 削除
      if (window.confirm("DeleteRoom: " + room_show + "\nAre you really sure?")) {
        room_edit_mode = 4;
        room_editx(3);
      }
      break;
    default:
      edit_room.style.display = "none";
  }
}

// ----- 動作設定 -----
function noti_setting() { // 通知設定更新
  const notification_set = document.getElementById('notification');
  if (notification_set.checked) {
    localStorage.setItem("Notice", "1");
    notice_set = 1;
    push_cr(1); // 通知の許可確認
  } else {
    localStorage.setItem("Notice", "0");
    notice_set = 0;
  }
}

function noti2_setting() { // 通知設定2更新
  const special_option = document.getElementById('special_option');
  notice2_set = special_option.value;
  localStorage.setItem("Notice2", notice2_set);
}

function name_setting() {
  const user_name2 = document.getElementById('user_name2');
  localStorage.setItem('userName', user_name2.value);
}

function theme_setting() {
  const theme = document.getElementById('theme');
  localStorage.setItem('theme', theme.value);
  change_theme(theme.value); // theme更新
}

function sendkey_setting() {
  const send_key = document.getElementById('send_key');
  localStorage.setItem('sendKey', send_key.value);
}

function loadem_setting() { // 埋め込みメディアの表示
  const loadmedia = document.getElementById('loadmedia');
  if (loadmedia.checked) {
    localStorage.setItem('loadEm', "1");
  } else {
    localStorage.setItem('loadEm', "0");
  }
  get_room_data(); // メッセージの再読み込みが必要。
}

function aamode_setting() { // ASCIIart Modeの設定
  const aamode = document.getElementById('aamode');
  const style_lifont = document.getElementById('style_lifont');
  if (aamode.checked) {
    localStorage.setItem('aamode', "1");
    style_lifont.innerHTML = "#list, #list2 {font-family: 'M+IPAモナ','Mona','mona-gothic-jisx0208.1990-0',IPAMonaPGothic,'IPA モナー Pゴシック','MS PGothic AA','MS PGothic','ＭＳ Ｐゴシック',sans-serif;}";
  } else {
    localStorage.setItem('aamode', "0");
    style_lifont.innerHTML = '';
  }
}

function e_setting() {
  const setting = document.getElementById('setting');
  const user_name2 = document.getElementById('user_name2');
  const notification_set = document.getElementById('notification');
  const special_option = document.getElementById('special_option');
  const theme = document.getElementById('theme');
  const send_key = document.getElementById('send_key');
  const L_side = document.getElementById('L_side');
  const create_room = document.getElementById('create_room');
  const loadmedia = document.getElementById('loadmedia');

  if (setting.style.display === "none") {
    if (sp_mode) {
      create_room.style.display = "none";
      L_side.style.display = "none";
    } else {
      create_room.style.display = "block";
      L_side.style.display = "block";
    }
    user_name2.value = localStorage.getItem("userName");
    setting.style.display = "block";
    if (localStorage.getItem("Notice") === '1') { // 通知のチェックボックス更新
      notification_set.checked = true;
    } else {
      notification_set.checked = false;
    }
    if (localStorage.getItem("loadEm") === '1') { // メディアの表示
      loadmedia.checked = true;
    } else {
      loadmedia.checked = false;
    }
    special_option.value = localStorage.getItem("Notice2");
    theme.value = localStorage.getItem("theme");
    send_key.value = localStorage.getItem("sendKey");
  } else {
    setting.style.display = "none";
  }
}

// ----- 通知の作成 -----
function notice() {
  notice_set = localStorage.getItem('Notice'); // Localstrageから設定値取得
  notice2_set = localStorage.getItem('Notice2');
  if (notice2_set == 1) {
    m1_notice();
  } else if (notice2_set == 2) {
    m2_notice();
  } else if (notice2_set == 3) {
    m3_notice();
  }
  if (document.hidden && notice_set === '1') {
  // if (notice_set === '1') {
      var mes = 'New message received!';
    push_cr(2, mes, PUSH_TIMER); // Push通知 4秒間で消える
  }
}
// ----- Push通知 -----
function push_cr(mode, mes, times) {
// mode===1: サポート/許可確認, ===2: 通知
  if (mode===1) {
    // ブラウザが通知をサポートしているか確認
    if (!('Notification' in window)) {
      support_push = 1; // 非サポート
    }
    else {
      // 許可を求める
      Notification.requestPermission()
        .then((permission) => {
          if (permission === 'granted') { // 許可
            support_push = 0;
          } else if (permission === 'denied') { // だめです
            support_push = 2;
          } else if (permission === 'default') { // 無視
            support_push = 3;
          }
      });
    }
  } else if (mode === 2 && support_push === 0) {
    console.log('notice');
    // 通知作成
    var notification = new Notification(mes);
    notification.onClick = function() { // 通知クリック時の動作
      window.focus();
      this.close();
    }
    setTimeout(notification.close.bind(notification), times); // 通知を閉じる
  }

}

// ----- メッセージを送信 -----
function b_send() {
  const div_top = document.getElementById('chat_content');
  const chat_url = document.getElementById('chat_url');
  var v_send = esc(div_top.value);
  var v_send_media = esc(chat_url.value);
  if (v_send.length >= MAX_SEND_SIZE || v_send.length <= 0) {
    console.log('%cPOST_SIZE %c> OVER <', 'color: #fff;', 'color: red;'); // データサイズが大きすぎる場合は拒否
    return 'B';
  } else {
    var type = MES_TYPE_PLA; // デフォルトは通常テキスト
    if (chat_url.value) { // 送信オプションがついている場合
      if (ex_menu_checked === 1) { // imageオプション
        type = MES_TYPE_IMG;
      } else if (ex_menu_checked === 2) { // iframeオプション
        type = MES_TYPE_IFR;
      }
    }
    console.log('%cPOST_DATA %c> ' + v_send, 'color: orange;', 'color: #bbb;');
    if (type === MES_TYPE_PLA) { // 通常のテキストデータ
      xhr('req=' + ADD_MES + '&room=' + now_room + '&name=' + localStorage.getItem("userName") + '&type=' + type + '&contents=' + v_send);
    } else { // 通常のテキスト以外
      console.log(v_send_media);
      xhr('req=' + ADD_MES + '&room=' + now_room + '&name=' + localStorage.getItem("userName") + '&type=' + type + '&contents=' + v_send + '&media=' + v_send_media);
    }
    div_top.value = '';
    chat_url.value = '';
  }
  ex_b_send(0, true); // 送信オプションを閉じる
  ck_ex_content('', 0); // メッセージ入力欄のサイズ
  ck_room_data(); // アクティブなRoomのメッセージ取得
}

// ----- アクティブなRoomを変更
function change_room(room) {
  if (room) {
    now_room = room;
    main(1); // 更新
  }
}

// ----- 文字エスケープ -----
function esc(str) {
  return encodeURI(str)
    .replace(/&/g, '%26')
    .replace(/\+/g, '%2B')
    .replace(/\r?\n/g, '%0D%0A');
}

// ----- 時刻 -----
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

// ----- 時刻表示の更新 -----
function date_update() {
  const TIME_B = document.getElementById('time_b'); // 時刻表示用(仮)
  var week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var date = new Date();
  TIME_B.innerHTML = date.getFullYear() + '-' + zerosli((date.getMonth() + 1)) + '-' + zerosli(date.getDate()) + ' (' + week[date.getDay()] + ') ' + zerosli(date.getHours()) + '<span id=dot>:</span>' + zerosli(date.getMinutes());
}

// ----- 2桁の0埋め -----
function zerosli(no) {
  return ("00" + no).slice(-2);
}

// ----- Ajaxにより非同期でサーバへリクエスト -----
function xhr(send_data, send_mode, param1, option) { // POSTする内容, リクエストの種類, 追加読み込みの引継ぎ, 通信のタイムアウトを長くするか
  const req = new XMLHttpRequest();
  req.open('POST', SEND_SERVER, true);
  req.setRequestHeader('Pragma', 'no-cache'); // キャッシュを無効にするためのヘッダ指定
  req.setRequestHeader('Cache-Control', 'no-cach');
  req.setRequestHeader('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
  if (option === true) {
    req.timeout = XHR_TIMEOUT_L; // サーバリクエストのタイムアウト時間(長い)の指定
  } else {
    req.timeout = XHR_TIMEOUT; // サーバリクエストのタイムアウト時間の指定
  }
  req.send(send_data);
  req.onreadystatechange = function () { // 通信ステータスが変わったとき実行
    if (req.readyState === 4) {
      if (req.status === 200) {
        resData = req.responseText;
        switch (send_mode) {
          case ADD_MES:
            console.log('%cPOST_OK!', 'color: #00a0e9;');
            break;
          case GET_MES:
            update_disp(2, resData);
            get_room_data_plus(now_thread); // 追加読み込み
            break;
          case GET_DIR:
            update_disp(1, resData);
            break;
          case SET_DIR:
          case DEL_DIR:
            if (resData === 'ok') {
              console.log('%cREQ_COMP!', 'color: #00a0e9;');
            } else {
              console.log('%cREQ_ERROR', 'color: red;');
            }
            break;
          case JOINT_MES:
            get_room_data_plus(param1, resData); // 追加読み込み
            break;
        }
      } else {
        console.log('ServerERROR STAT: ' + req.status);
      }
    }
  }
}

// ----- データ取得後の処理 -----
function update_disp(sw, str, option1) { // 更新の種類, 更新データ

  switch (sw) {
    case 1: // Roomリスト更新
      var r_list = JSON.parse(str);
      // console.log(r_list);

      // Roomボタン生成
      for (var i = 0; i < Object.keys(r_list).length; i++) {
        if (document.getElementById('ro' + r_list[i]["dir_name"]) === null) {
          reset_list(r_list);
        }
      }

      if (support_indexedDB < 1) { // IndexedDBを使用できるか
        // Class追加 + DB操作
        for (var i = 0; i < Object.keys(r_list).length; i++) {

          // IndexedDB操作&画面更新
          db_connect(DB_N, OBJ_STORE_LAST, 'g_last', r_list[i]["dir_name"], i, r_list); // IndexedDB操作用関数を実行させる
        }
      } else { // IndexedDB使用不可
        for (var i = 0; i < Object.keys(r_list).length; i++) {
          update_disp_arr(i, r_list); // 画面更新
        }
      }
      break;

    case 2: // メッセージ表示部分更新
      const CONTTT = document.getElementById('conttt'); // メッセージ内容の表示部分
      const descr = document.getElementById('descr'); // Description部分
      const room_top_name = document.getElementById('room_top_name'); // ページ上部のRoom名表示

      if (str) { // サーバからのレスポンスがあるかどうか
        var r_list = JSON.parse(str);
        // console.log(r_list);

        /*
                // IndexedDB操作
                db_connect(DB_N, OBJ_STORE_LAST, 'g_last', now_room);
                // Description部分
                if (up_info) {
                  db_connect(DB_N, OBJ_STORE_LAST, 'last', up_info["room_key"], up_info["up_date"], up_info["notice_flag"], up_info["room_name"], up_info["thread"], r_list["descr"]);
                }
        */
        // 現在のthreadを変数に代入
        now_thread = r_list["thread"];

        // 表示部分更新
        room_show = r_list["room_name"]; // 変数更新
        room_top_name.innerHTML = ' / ' + r_list["room_name"]; // 表示更新
        document.title = r_list["room_name"] + ' / Beちゃっとぉ'; // title更新

        descrip_text = r_list["descr"];
        if (r_list["descr"]) {
          descr.innerHTML = r_list["descr"].replace(/\r?\n/g, '<br>'); // 改行を置換 + Descriptionの更新
        }
        // メッセージ部分更
        var list_put = ''; // 出力用の変数
        if (r_list["object"] && r_list["object"].length > 0) {
          list_put = parse_message(r_list); // list_putに表示用に直したデータを代入します
        } else {
          list_put = "<li id=list2>Info: Don't bother with this Info</li>";
        }
        CONTTT.innerHTML = list_put;
      } else {
        descr.innerHTML = '';
        CONTTT.innerHTML = "<li id=list2>Info: Don't bother with this Info</li>";
      }

      break;
  }
}

// ----- メッセージの表示部分を取得データから生成する -----
// r_listは配列で渡す必要があります
function parse_message(r_list) {
  var list_put = ''; // 出力用の変数
  for (var i = 0; i < r_list["object"].length; i++) {
    var content = r_list["object"][i]["contents"].replace(/\r?\n/g, '<br>'); // 改行を置換
    content = AutoLink(content); // リンクをAnchorに変換
    if (r_list["object"][i]['type'] === 'log') continue;
    if (r_list["object"][i]['type'] !== 'plain' && getLink(r_list["object"][i]["media"])) {
      if (localStorage.getItem("loadEm") === '1') { // メディアを表示するか
        if (r_list["object"][i]['type'] === 'image') { // 画像
          var out_data = "<li id=list class='li li_img li_media'><span id=u_icon>" + r_list["object"][i]["user"] + "</span> <span id=user>" + r_list["object"][i]["user"] + "</span> <span id=date>" + r_list["object"][i]["date"] + "</span>" + content + "<br><br><img src='" + getLink(r_list["object"][i]['media']) + "' alt class='media media_img'>";
        } else if (r_list["object"][i]['type'] === 'iframe') { // iframe
          var out_data = "<li id=list class='li li_ifr li_media'><span id=u_icon>" + r_list["object"][i]["user"] + "</span> <span id=user>" + r_list["object"][i]["user"] + "</span> <span id=date>" + r_list["object"][i]["date"] + "</span>" + content + "<br><br><iframe src='" + getLink(r_list["object"][i]['media']) + "' frameborder=0 class='media media_ifr'></iframe>";
        }
      } else {
        var out_data = "<li id=list class='li li_media'><span id=u_icon>" + r_list["object"][i]["user"] + "</span> <span id=user>" + r_list["object"][i]["user"] + "</span> <span id=date>" + r_list["object"][i]["date"] + "</span>" + content + "<br>Media: <a href='" + getLink(r_list["object"][i]['media']) + "' target='_blank' rel='noopener'>" + getLink(r_list["object"][i]['media']) + "</a>";
      }
    } else {
      var out_data = "<li id=list class='li li_pla'><span id=u_icon>" + r_list["object"][i]["user"] + "</span> <span id=user>" + r_list["object"][i]["user"] + "</span> <span id=date>" + r_list["object"][i]["date"] + "</span>" + content;
    }
    list_put = out_data + list_put;
  }

  return list_put;
}

// ----- 文字列からURLを取り出す関数 -----
function getLink(str) {
  var result = str.match(/((https?|ftp):\/\/[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#]+)/);
  if (result) {
    result = result[0];
    result = result.replace('&quot;', ''); // 文字エスケープ時に「"」が残ってしまうのを取り除く
  } else {
    result = false;
  }
  return result;
}

// ----- RoomListのボタン再生成 -----
function reset_list(r_list) {
  var putData = ''; // RoomList
  const L_side = document.getElementById('L_side');
  for (var i = 0; i < Object.keys(r_list).length; i++) {
    putData += "<button id='ro" + r_list[i]["dir_name"] + "' onclick=change_room('" + r_list[i]["dir_name"] + "')>" + r_list[i]["room_name"] + "</button><br>";
  }
  L_side.innerHTML = putData;
}

// ----- IndexedDB操作&画面更新 -----
function update_disp_db(up_info, i, r_list) {
  // Roomリストのボタンを追加する
  let temp_id = document.getElementById('ro' + r_list[i]["dir_name"]);

  /*
  notice_flagについて
  0 = 未通知
  1 = 既通知, 未読
  2 = 既通知, 既読 <- 0に統合されました
  3 = 初回ロード時 (通知なし)
  */
  if (up_info) { // DB上に値が存在するか
    // console.log(up_info["up_date"]+' '+r_list[i]["l_date"]);
    if (up_info["up_date"] !== r_list[i]["l_date"]) {
      // 最終更新時が古い場合
      if (now_room === r_list[i]["dir_name"] && !document.hidden) { // Roomが開かれ、タブがアクティブ
        temp_id.classList.add("on_butt"); // ActiveRoom
        temp_id.classList.remove("new_mes"); // 通知削除
        favicon(0); // 通知オフ
        get_room_data(); // アクティブなRoomのメッセージ取得
        // RoomがアクティブになったらIndexedDB更新
        db_connect(DB_N, OBJ_STORE_LAST, 'last', r_list[i]["dir_name"], r_list[i]["l_date"], 0, r_list[i]["room_name"], r_list[i]["thread"]);
      } else if (up_info["notice_flag"] === 0) {
        // 通知フラグが1以外の時通知, 最終更新時は更新しない
        temp_id.classList.remove("on_butt"); // PassiveRoom
        temp_id.classList.add("new_mes"); // 通知追加
        favicon(1); // 通知オン
        notice(false); // 通知する
        db_connect(DB_N, OBJ_STORE_LAST, 'last', r_list[i]["dir_name"], up_info["up_date"], 1, r_list[i]["room_name"], r_list[i]["thread"]);
      } else { // 通知したが、未読
        temp_id.classList.remove("on_butt"); // PassiveRoom
        temp_id.classList.add("new_mes"); // 通知追加
        favicon(1); // 通知オン
      }
    } else { // 更新なし
      // console.log(g_info["room_key"]);
      // if (!g_info["room_key"]) { // IndexedDBがない場合はセット
      //   db_connect(DB_N, OBJ_STORE_LAST, 'last', r_list[i]["dir_name"], r_list[i]["l_date"], 1, r_list[i]["room_name"], r_list[i]["thread"]);
      // }
      if (now_room === r_list[i]["dir_name"]) {
        temp_id.classList.add("on_butt"); // ActiveRoom
      } else {
        temp_id.classList.remove("on_butt"); // PassiveRoom
      }
      temp_id.classList.remove("new_mes"); // 通知削除
      db_connect(DB_N, OBJ_STORE_LAST, 'last', r_list[i]["dir_name"], r_list[i]["l_date"], 0, r_list[i]["room_name"], r_list[i]["thread"]);
    }
  } else {
    // 初回読み込み
    if (now_room === r_list[i]["dir_name"]) {
      temp_id.classList.add("on_butt"); // ActiveRoom
    } else {
      temp_id.classList.remove("on_butt"); // PassiveRoom
    }
    favicon(0); // 通知オフ
    db_connect(DB_N, OBJ_STORE_LAST, 'last', r_list[i]["dir_name"], r_list[i]["l_date"], 3, r_list[i]["room_name"], r_list[i]["thread"]);
  }
}

// ----- sub_DB操作&画面更新 -----
function update_disp_arr(i, r_list) {
  // Roomリストのボタンを追加する
  let temp_id = document.getElementById('ro' + r_list[i]["dir_name"]);

  if (sub_DB[r_list[i]["dir_name"]]) {
    if (sub_DB[r_list[i]["dir_name"]]["l_date"] !== r_list[i]["l_date"]) { // 更新日時が古い場合
      if (now_room === r_list[i]["dir_name"] && !document.hidden) { // Roomが開かれ、タブがアクティブ
        // Roomがアクティブになったら更新
        sub_DB[r_list[i]["dir_name"]] = { // 配列追加
          l_date: r_list[i]["l_date"],
          notice_flag: 0
        }
        favicon(0); // 通知オフ
        get_room_data(); // アクティブなRoomのメッセージ取得
        temp_id.classList.add("on_butt"); // ActiveRoom
        temp_id.classList.remove("new_mes"); // 通知削除
      } else if (sub_DB[r_list[i]["dir_name"]]["notice_flag"] === 0) {
        // 通知フラグが1以外の時通知、最終更新時は更新しない
        sub_DB[r_list[i]["dir_name"]]["notice_flag"] = 1; // 通知フラグの更新
        temp_id.classList.remove("on_butt"); // PassiveRoom
        temp_id.classList.add("new_mes"); // 通知追加
        favicon(1); // 通知オン
        notice(false); // 通知する
      } else { // 通知したが、未読
        temp_id.classList.remove("on_butt"); // PassiveRoom
        temp_id.classList.add("new_mes"); // 通知追加
        favicon(1); // 通知オン
      }
    } else {
      // 更新なし
      sub_DB[r_list[i]["dir_name"]]["notice_flag"] = 0; // 通知フラグの更新
      if (now_room === r_list[i]["dir_name"]) {
        temp_id.classList.add("on_butt"); // ActiveRoom
      } else {
        temp_id.classList.remove("on_butt"); // PassiveRoom
      }
      temp_id.classList.remove("new_mes"); // 通知削除
    }
  } else {
    // sub_DB上に存在しない場合
    sub_DB[r_list[i]["dir_name"]] = { // 配列追加
      l_date: r_list[i]["l_date"],
      notice_flag: 3
    }
    if (now_room === r_list[i]["dir_name"]) {
      temp_id.classList.add("on_butt"); // ActiveRoom
    } else {
      temp_id.classList.remove("on_butt"); // PassiveRoom
    }
    favicon(0); // 通知オフ
  }
}

// ----- ページ切り替え -----
L_side_toggle = 0;

function c_page(no) {
  const setting = document.getElementById('setting');
  const edit_room = document.getElementById('edit_room');
  const load_sc = document.getElementById('load');
  const first_sc = document.getElementById('first_sc');
  const L_side = document.getElementById('L_side');
  const create_room = document.getElementById('create_room');

  switch (no) {
    case 0: // ユーザー名入力画面
      setting.style.display = "block";
      first_sc.style.display = "none";
      edit_room.style.display = "none";
      // load_sc.style.display = "none";
      break;
    case 1: // 通常画面
      setting.style.display = "none";
      first_sc.style.display = "none";
      edit_room.style.display = "none";
      // load_sc.style.display = "none";
      break;
    case 2: // 設定画面
      setting.style.display = "none";
      first_sc.style.display = "none";
      edit_room.style.display = "block";
      // load_sc.style.display = "none";
      break;
    case 3: // ロード画面
      setting.style.display = "none";
      first_sc.style.display = "none";
      edit_room.style.display = "none";
      load_sc.style.display = "block";
      break;
    case 4: // Roomリスト表示/非表示
      if (sp_mode && L_side_toggle !== 1) {
        setting.style.display = "none";
        L_side.style.display = "block";
        create_room.style.display = "block";
        L_side_toggle = 1;
      } else {
        L_side.style.display = "none";
        create_room.style.display = "none";
        L_side_toggle = 0;
      }
      break;
  }
}

// ----- 自動リンク化する関数 -----
// $strに入れると、リンク部分が<a>で囲われてreturn
function AutoLink(str) {
  // var regexp_url = /((h?)(ttps?:\/\/[a-zA-Z0-9.\-_@:/~?%&;=+#',()*!]+))/g;
  var regexp_url = /((h?)(ttps?:\/\/[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#]+))/g;
  var regexp_makeLink = function (all, url, h, href) {
    return '<a href="h' + href + '"  target="_blank" rel="noopener">' + url + '</a>';
  }
  return str.replace(regexp_url, regexp_makeLink);
}

// ----- Localstrage内の設定情報確認 -----
function ck_setting() {
  if (!localStorage.getItem("Notice")) { // 通知の設定の確認
    localStorage.setItem("Notice", notice_set);
  } else {
    notice_set = localStorage.getItem("Notice");
    if (notice_set === 1) {
      push_cr(1); // 通知許可確認
    }
  }

  if (!localStorage.getItem("Notice2")) { // 特殊な通知の設定の確認
    localStorage.setItem("Notice2", notice2_set);
  } else {
    notice2_set = localStorage.getItem("Notice2");
  }

  if (!localStorage.getItem("theme")) { // Themeの設定
    localStorage.setItem("theme", theme_set);
  } else {
    theme_set = localStorage.getItem("theme");
  }

  if (!localStorage.getItem("sendKey")) { // 送信キーの設定
    localStorage.setItem("sendKey", sendKey_set);
  } else {
    sendKey_set = localStorage.getItem("sendKey");
  }

  if (!localStorage.getItem("loadEm")) { // 埋め込みメディアの読み込み
    localStorage.setItem("loadEm", load_media_set);
  }

  if (!localStorage.getItem("aamode")) { // アスキーアート向けのフォントに変更
    localStorage.setItem("aamode", change_font_aa);
  }
}

// ----- ユーザー名確認 -----
function ck_user() {
  const first_sc = document.getElementById('first_sc');
  const L_side = document.getElementById('L_side');
  const create_room = document.getElementById('create_room');
  if (!localStorage.getItem("userName")) {
    first_sc.style.display = "block";
    L_side.style.display = "none";
    create_room.style.display = "none";
  } else {
    first_sc.style.display = "none";
    if (!sp_mode) {
      L_side.style.display = "block";
      create_room.style.display = "block";
    }
  }
}

// ----- キー入力を処理する関数 -----
// Alt+Enter(keyCode==13)が入力されたとき、b_send()を実行
// B+ オプションは廃止されました
document.onkeydown = keydown;

function keydown() {
  s_value = localStorage.getItem("sendKey");
  if (s_value === '1' && event.altKey === true && event.keyCode === 13) { // Alt + Enter で送信
    b_send();
  } else if (s_value === '2' && event.shiftKey === true && event.keyCode === 13) { // Shift + Enter で送信
    b_send();
  } else if (s_value === '3' && event.ctrlKey === true && event.keyCode === 13) { // Ctrl + Enter で送信
    b_send();
  } else if (s_value === '4' && event.keyCode === 13) { // Enter で送信
    b_send();
  }
}

// ----- 下からのスクロール量 -----
function from_Bottom() {
  var body = window.document.body;
  var html = window.document.documentElement;
  var scrollTop = body.scrollTop || html.scrollTop;
  return html.scrollHeight - html.clientHeight - scrollTop;
}

// ----- Theme変更 -----
function change_theme(no) {
  const style_c = document.getElementById('style_c');
  switch (no) {
    case '1':
      style_c.innerHTML = "";
      break;
    case '2':
      style_c.innerHTML = "#list, #list2, #list:first-child {background: #000; color: #fff;} #body{background: #111;} #R_side{color: #BBB;} #R_side,#L_side{background: rgba(0,0,0,0.97);}";
      break;
    case '3':
      style_c.innerHTML = "#list, #list2 {background: #fff!important; color: #111!important; border-top: none;} #body{background: #BBB;} #R_side{color: #111;} #R_side,#L_side{background: rgba(238,238,238,0.97);} #descr_tit{background: #BBB!important; color: #222;} #u_icon{background: #fff; color: #666; box-shadow: 0 0 5px #BBB;}";
      break;
  }
}

// ----- GET GET_Value -----
function getParam(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return false;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

// ----- ファビコンの変更 -----
// ----- スマホの時はshow_roomlistの色
function favicon(type) {
  const fav = document.getElementById('favicon');
  const show_roomlist = document.getElementById('show_roomlist');
  if (type === 1) { // 通知
    fav.href = "fav32_2.png";
    show_roomlist.style.color = '#00a0e9';
  } else { // デフォルト
    fav.href = "fav32.png";
    show_roomlist.style.color = '#ddd';
  }
}

// ----- クライアントの画面幅が狭いか判定 -----
function client_width() {
  const L_side = document.getElementById('L_side');
  const create_room = document.getElementById('create_room');
  if (window.innerWidth < MIN_WINDOW) {
    if (L_side_toggle !== 1) {
      L_side.style.display = "none";
      create_room.style.display = "none";
    }
    return true;
  } else {
    return false;
  }
}

// ----- リンク付きメッセージの送信 -----
var ex_menu_disp = false; // 送信メニューの開閉
var ex_menu_checked = 1; // 選択されてるオプション

function ex_b_send(option1, option2) { // 動作種類, 特定の動作をする
  const chat_url = document.getElementById('chat_url');
  const ex_menu = document.getElementById('ex_menu');
  const ex_menu1 = document.getElementById('ex_menu1');
  const ex_menu2 = document.getElementById('ex_menu2');
  const ex_menu3 = document.getElementById('ex_menu3');
  if (option1 === 0) { // メニューの展開
    if (!ex_menu_disp && option2 !== true) {
      ex_menu1.style.display = "block";
      ex_menu2.style.display = "block";
      ex_menu3.style.display = "block";
      chat_url.style.display = "block";
      ex_menu.style.transform = "rotate(180deg)";
      ex_menu_disp = true;
    } else {
      ex_menu1.style.display = "none";
      ex_menu2.style.display = "none";
      ex_menu3.style.display = "none";
      chat_url.style.display = "none";
      ex_menu.style.transform = "rotate(0)";
      ex_menu_disp = false;
    }
  } else if (option1 === 1) { // image
    ex_menu_checked = 1;
  } else if (option1 === 2) { // iframe
    ex_menu_checked = 2;
  } else if (option1 === 3) { // delete
    chat_url.value = '';
    ex_b_send(0, true);
  }
  // ボタン色の更新
  if (ex_menu_checked === 1) {
    ex_menu1.style.color = "orange";
    ex_menu2.style.color = "#ccc";
    chat_url.placeholder = "Image URL";
  } else if (ex_menu_checked === 2) {
    ex_menu1.style.color = "#ccc";
    ex_menu2.style.color = "orange";
    chat_url.placeholder = "Embed URL/Link";
  }
  ck_ex_content2(); // メインコンテンツの位置変更
}

// ----- ウィンドウサイズ変更+次の再描画でアニメーションを更新するときに実行 -----
window.addEventListener("resize", function () { // スクロールイベント取得
  const L_side = document.getElementById('L_side');
  const create_room = document.getElementById('create_room');
  if (window.outerWidth <= MIN_WINDOW && L_side_toggle !== 1) {
    L_side.style.display = "none";
    create_room.style.display = "none";
  } else {
    L_side.style.display = "block";
    create_room.style.display = "block";
  }

}, true);

// ----- メッセージの量によってテキストエリアのサイズ変更 -----
// うまくいかないb
var chat_content_offset = chat_content.scrollHeight;
var chat_content2;
var chat_content_tgg = 0;
chat_content.addEventListener("input", function con_ex_content() {
  ck_ex_content(0);
}, true);

function ck_ex_content(op) {
  const chat_content = document.getElementById('chat_content');
  const ex_menu_gr = document.getElementById('ex_menu_gr');
  // console.log(chat_content.scrollHeight+' '+chat_content.offsetHeight+' '+chat_content_offset+' '+chat_content2);
  if (op === 1 || chat_content.scrollHeight > chat_content_offset && chat_content_tgg === 0) {
    chat_content.style.height = "54px";
    ex_menu_gr.style.top = "32px";
    chat_content2 = chat_content.offsetHeight;
    chat_content_tgg = 1;
    ck_ex_content2(); // メインコンテンツの位置変更
  } else if (chat_content.scrollHeight < chat_content2) {
    chat_content.style.height = "22px";
    ex_menu_gr.style.top = "0";
    chat_content_tgg = 0;
    if (chat_content.scrollHeight > chat_content_offset) {
      chat_content.style.height = "54px";
      ex_menu_gr.style.top = "32px";
      chat_content2 = chat_content.offsetHeight;
      chat_content_tgg = 1;
    }
    ck_ex_content2(); // メインコンテンツの位置変更
  }
}

function ck_ex_content2() { // メインコンテンツの位置変更
  const main_contents = document.getElementById('main_contents');
  var top_default = 100;
  if (ex_menu_disp) {
    top_default += 32;
  }
  if (chat_content_tgg) {
    top_default += 32;
  }
  main_contents.style.top = top_default + "px";
}

// ----- メッセージ編集/削除 -----
function edit_message(thread, id) {
  xhr('req=' + EDT_MES + '&room=' + now_room + '&name=' + localStorage.getItem("userName") + '&type=' + type + '&contents=' + v_send +'&thread='+thread+'&id='+id, EDT_MES, false, true);
  // xhr('req=' + EDT_MES + '&room=' + now_room, EDT_MES, false, true);
}