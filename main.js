// Beちゃっとぉ クライアント側

/*
GET ?room=xxx の指定により、開くページを指定できます
*/

// ----- Javascript部分 -----

// ----- 定数定義 -----
const XHR_TIMEOUT = 1000 * 5; // サーバリクエストのタイムアウト時間(ms)
// const XHR_TIMEOUT_L = 1000 * 3600; // サーバリクエストのタイムアウト時間(ms)(長い)
const XHR_TIMEOUT_L = 0; // サーバリクエストのタイムアウト時間(ms)(長い)
const MAINLOOP_TIMER = 1000 * 5; // メイン関数の実行間隔の時間 (ms)
const SUBLOOP_TIMER = 1000 * 1; // サブ関数の実行間隔の時間 (ms)
const SKIP_COUNT = 6; // タブがパッシブのmain関数を実行しない間隔 回数
const MAX_SEND_SIZE = 3003; // 最大送信サイズ 0xBBB
const READ_AHEAD = 400; // 先読みを行う残りpx条件
const PUSH_TIMER = 3000; // Push通知の表示時間
const SEND_SERVER = 'chat.php';
// const SEND_SERVER = 'https://u2api.azurewebsites.net/chat/chat.php'; // POSTする試験サーバURL
// const SEND_SERVER = 'https://u2net.azurewebsites.net/chat/chat.php'; // POSTする本番サーバURL
// const SEND_SERVER = 'http://fukube.biz.ht/chat/chat.php'; // POSTする本番サーバ2URL
// const SEND_SERVER = 'http://fukube.biz.ht/chat_dev/chat.php';
// const SEND_SERVER = 'https://u2star.azurewebsites.net/chat/chat.php'; // 新しい本番サーバ
// const SEND_SERVER = 'https://u2dev.azurewebsites.net/chat/chat.php'; // 新しい試験サーバ
const M_NOTICE_JS = './res/m_notice.min.js'; // 通知用のjsファイル
// const M_NOTICE_JS = 'https://cdn.discordapp.com/attachments/705099416083890281/705100136950530188/m_notice.min.js';
const STYLE_CSS = 'style.css'; // メインのCSS
// const STYLE_CSS = 'https://cdn.discordapp.com/attachments/705099416083890281/716599609107021864/style.min.css';
// const THEME_DEEPBLACK_CSS = './res/theme_deepblack.css';
const THEME_DEEPBLACK_CSS = './res/theme_deepblack.min.css';
// const THEME_DEEPBLACK_CSS = 'https://cdn.discordapp.com/attachments/705099416083890281/716625749678751744/theme_deepblack.min.css';
// const THEME_WHITE_CSS = './res/theme_white.css';
const THEME_WHITE_CSS = './res/theme_white.min.css';
// const THEME_WHITE_CSS = 'https://cdn.discordapp.com/attachments/705099416083890281/716625740820512788/theme_white.min.css';

// phpへのリクエスト種類
const ADD_MES = 'add'; // メッセージの追加
const GET_MES = 'mes'; // メッセージ取得
const EDT_MES = 'edt'; // メッセージの編集/削除
const GET_DIR = 'dir'; // メッセージのディレクトリ一覧取得
const SET_DIR = 'set'; // メッセージのディレクトリ(Room)の作成・編集
const DEL_DIR = 'del'; // ディレクトリ(Room)へのアクセス不可にする
const SSE_DIR = 'sse_dir'; // メッセージのディレクトリ一覧取得(SSE)
const SSE_MES = 'sse_mes'; // メッセージ取得(SSE)
const MES_DIF = 'mes_dif'; // メッセージ差分取得
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
var exec_cnt = -1; // main()の重複実行を抑えるために実行数をカウントする変数
var sub_DB = []; // IndexedDBが使用できない場合、更新状態を配列で保持する. そのため確保しておく
var onload_flag = {
  "onload": false,
  "mes": false,
  "dir": false
}; // ページが読み込まれたかのフラグ
var cache_m = {};
var disp_emode = 0; // 0 = 通常, 他 = メッセージ編集モード
cache_m["mes"] = {}; // メッセージ保管用の配列 (キャッシュ)
// var out_cache = {}; // 画面更新用の文字列保存用の配列 (画面更新用キャッシュ?) // 廃止されました
var skip_hidden_count = 0; // パッシブ時の負荷を下げる ためにカウントしておく
var close_sse_session = true; // セッションが閉じられているかのフラグ
var old_date; // 時刻更新比較用


var support_indexedDB = 0; // IndexedDBが利用可能:0 , 非サポート:1, サポートされているが、アクセス不可:2
var support_push = 0; // NotificationAPI(Push通知)が利用可能:0, 非サポート:1, 許可されていない:2, 無視:3
var support_eventsource = 0; // EventSource(SSE)が利用可能:0, 非サポート:1 <- サーバの問題でSSEが使えないときは1にすることでAjax動作

// ----- 設定情報用変数 デフォルト値 -----
var notice_set = 0; // 通知の設定
var notice2_set = 0; // 特殊な通知の設定
var theme_set = 1; // Themeの設定
var sendKey_set = 1; // 送信ショートカットの設定
var breakKey_set = 4; // 改行キーの設定
var load_media_set = 1; // 埋め込みメディアの読み込み
var change_font_aa = 0; // アスキーアート向けのフォントに変更
var sp_mode = false; // スマホモード

// ----- 初期処理 -----
console.log('%cＢｅちゃっとぉ%c Ver.0.8.36 20200531', 'font-size: 2em; font-weight: bold;', 'color: #00a0e9;');
ck_setting(); // Localstrage内の設定情報確認
ck_user(); // ユーザー名確認
ck_indexedDB(); // IndexedDBのサポート確認
ck_EventSource(); // EventSourceのサポート確認
change_room((getParam('room') ? getParam('room') : now_room)); // GET_valueでRoom変更 + main()に処理が渡される
window.onload = function Begin() {
  // c_page(1); // 表示更新
  onload_flag["onload"] = true; // 反映待ち
  if (onload_flag["mes"]) {
    update_disp(2, cache_m['mes'][now_room], 1); // メッセージ内容を更新
    get_room_data_plus(now_thread, false, now_room); // 追加読み込み
  }
  if (onload_flag["dir"]) {
    update_disp(1, cache_m['dir'], 1); // Room表示更新
  }
  client_width(true); // リスト表示するか
  change_theme(localStorage.getItem("theme")); // Theme適用
  if (change_font_aa === 1 || change_font_aa === '1') { // AAモード?
    aamode_tgg(true);
  }
  sub_routine(); // サブ(時刻更新など)開始
  console.log('%cSessionBegin %c> ' + nowD(), 'color: orange;', '');
}

// ----- メイン処理 -----
/*
関数: main
  Roomの更新を確認する関数を定期的に実行する関数
引数: option: 値により、更新する内容を変えます
  option === 1 : メッセージとRoomの更新を確認する
  option === 2 : メッセージの更新のみ確認する
  option else  : Roomの更新のみ確認する
補足:
  option !== 2 : 定期的に実行されるようになります。(Ajax用)
戻り値: なし
*/
function main(option) {
  if (document.hidden && skip_hidden_count < SKIP_COUNT) {
    skip_hidden_count++
  } else {
    sp_mode = client_width(false);
    if (option === 1) { // Roomのメッセージ取得が必要な時
      get_room_data(true); // タイムアウト長い
      ck_room_data(true); // Room更新確認
    } else if (option === 2) {
      get_room_data(true); // タイムアウト長い
    } else {
      ck_room_data(); // Room更新確認
    }

    skip_hidden_count = 0;
  }
  if (exec_cnt < 1) {
    exec_cnt++;
    if (option !== 2) {
      setTimeout(main, MAINLOOP_TIMER);
    }
    setTimeout(reserve_cnt, MAINLOOP_TIMER - 100);
  }
}

/*
関数: sub_routine
  Roomの更新確認に関する関数以外の関数を定期的に実行する関数
引数: なし
戻り値: なし
*/
function sub_routine() { // 定期実行する関数
  ck_user(); // ユーザー名確認
  date_update(); // 表示時刻の更新
  setTimeout(sub_routine, SUBLOOP_TIMER);
}


// ----- データ取得の重複実行を抑えるためのカウント関数 -----
/*
関数: reserve_cnt
  main関数から実行され、グローバル変数のexec_cntの値を減らすことで、main関数が連続で実行されることを防ぐ
引数: なし
戻り値: なし
*/
function reserve_cnt() {
  if (exec_cnt > 0) {
    exec_cnt--;
  }
}

// ----- IndexedDB (データベース接続+ObjectStore) -----

/*
関数: db_connect
  IndexedDBのデータベース操作に加え、他関数の実行を行います
引数:
  base_name : データベース名
  store_name: オブジェクトストア名
  sw        : IndexedDBの操作の種類を指定する
  param1    : データベースに保存されるのRoomのサーバー上でのディレクトリ名($room_dir)。値を取り出すときにキーとなります
  param2    : データベースに保存されるRoomの最終更新日時
  param3    : データベースに保存されるRoomを更新したかどうかのフラグ情報
  param4    : データベースに保存されるRoomの名前($room_name)。
  param5    : データベースに保存されるRoomのメッセージのスレッド数
  param6    : データベースに保存されるRoomのDescription(概要説明)情報
戻り値: なし
*/
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
/*
関数: ck_indexedDB
  IndexedDBをサポートしているか確認します
  サポートしていない場合は、グローバル変数のsupport_indexedDBを1にします
引数: なし
戻り値: なし
*/
function ck_indexedDB() {
  if (!window.indexedDB) { // IndexedDBをサポートしているか
    console.log('Does not support IndexedDB');
    support_indexedDB = 1;
  }
}

// ----- Room更新確認 -----
/*
関数: ck_room_data
  Roomの更新を確認するためのサーバーリクエスト内容を決定し、関数xhrを実行します
引数: option : 値により通信のタイムアウト時間の切り替えを行う
戻り値: なし
*/
function ck_room_data(option) { // タイムアウトを長くするオプション
  if (option === true) {
    xhr('req=' + GET_DIR, GET_DIR, false, true, now_room);
  } else {
    xhr('req=' + GET_DIR, GET_DIR, false, false, now_room);
  }
}

// ----- Roomデータ(メッセージ)取得 -----
/*
関数: get_room_data
  現在表示しているRoomのメッセージ内容を取得するためのサーバーリクエスト内容を決定し、関数xhrを実行します
  グローバル変数cache_mの現在のRoomのid情報が利用できる(過去のメッセージがある)場合は、差分のみ取得するため関数get_room_diffを実行します
引数: option : 値により通信のタイムアウト時間の切り替えを行う
戻り値: なし
*/
function get_room_data(option) { // タイムアウトを長くするオプション
  if (!cache_m["mes"][now_room] || !cache_m["mes"][now_room]["id"]) {
    if (option === true) {
      xhr('req=' + GET_MES + '&thread=false&room=' + now_room, GET_MES, false, true, now_room);
    } else {
      xhr('req=' + GET_MES + '&thread=false&room=' + now_room, GET_MES, false, false, now_room);
    }
  } else {
    get_room_diff(option);
  }
}

// ----- Roomデータ(メッセージ)差分取得 -----
function get_room_diff() {
  // cache_m["mes"][now_room].push = {'id' :cache_m["mes"][now_room]["object"].length}; // 実験用
  if (cache_m["mes"][now_room]["id"]) {
    // console.log('req=' + MES_DIF + '&room=' + now_room + '&thread=' + cache_m["mes"][now_room]["thread"] + '&id=' + cache_m["mes"][now_room]["id"]);
    xhr('req=' + MES_DIF + '&room=' + now_room + '&thread=' + cache_m["mes"][now_room]["thread"] + '&id=' + cache_m["mes"][now_room]["id"], MES_DIF, false, true, now_room);
  }
}

// ----- EveentSourceが使用可能か確認 -----
var EventSource = window.EventSource || window.MozEventSource;

function ck_EventSource() {
  if (!EventSource) {
    console.log('Does not support EventSource');
    support_eventsource = 1;
  }
}

// ----- Room更新確認(SSE) -----
function ck_room_datas() {
  if (support_eventsource === 0) {
    // dir_ev.close(); // イベントストリームを閉じる
    var dir_ev = new EventSource(SEND_SERVER + '?' + SSE_DIR + '=b');
    dir_ev.addEventListener('message', function (event) { // RoomListを受け取ったときに更新
      cache_m["dir"] = JSON.parse(event.data); // Room情報を配列に保存しておく
      update_disp(1, cache_m["dir"], 1);
    });
  }
}

// ----- Roomデータ(メッセージ)取得(SSE) ----- (使わない予定の関数)
function get_room_datas(exe_room) {
  if (support_eventsource === 0) {
    // mes_ev.close(); // イベントストリームを閉じる
    var mes_ev = new EventSource(SEND_SERVER + '?' + SSE_MES + '&room=' + exe_room);
    mes_ev.addEventListener('message', function (event) { // メッセージを受け取ったときに更新
      cache_m["mes"][exe_room] = JSON.parse(event.data); // メッセージ内容を配列に保存しておく
      update_disp(2, cache_m["mes"][exe_room], 1);
      get_room_data_plus(now_thread, false, now_room);
      top_stat_col(true); // stat -> good
    });
    mes_ev.onerror = function () { // エラー時
      console.log("EventSource failed.");
      top_stat_col(false); // stat -> bad
    }
  }
}

// ----- 追加読み込み判定 -----
function get_room_data_plus(thr, str, exe_room) {
  const CONTTT = document.getElementById('conttt'); // メッセージ内容の表示部分
  if (str) {
    var r_list = JSON.parse(str);
    if (r_list["object"] && r_list["object"].length > 0) {
      CONTTT.innerHTML += parse_message(r_list); // メッセージを追加します
      var mes_arr = r_list["object"].concat(cache_m["mes"][exe_room]["object"]);
      cache_m["mes"][exe_room]["object"] = mes_arr;
      // cache_m["mes"][exe_room]["id_offset"] += r_list.length;
      // var mes_obj = {...r_list["object"], ...cache_m["mes"][exe_room]["object"]}; // オブジェクト結合
      // cache_m["mes"][exe_room]["object"] = Object.entries(mes_obj).map(([key, value]) => (value)); // オブジェクトから配列にして代入
      // cache_m["mes"][exe_room]["object"].push = r_list;
    }
  }
  // 追加読み込み
  var b_height = from_Bottom(); // ページ下部からのpx
  // console.log(b_height + ' ' + thr);
  if (thr > 0 && b_height < READ_AHEAD || thr > 0 && now_thread === thr) {
    // console.log("Load: Old Thread");
    xhr('req=' + GET_MES + '&room=' + now_room + '&thread=' + (thr - 1), JOINT_MES, thr - 1, true, exe_room);
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
      get_room_data_plus(ready_getDataNo, false, now_room); // 追加読み込み
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
        xhr('req=' + SET_DIR + '&mode=1&name=' + localStorage.getItem("userName") + '&room=' + now_room + '&new_name=' + room_name.value + '&new_descr=' + room_desk_text.value, SET_DIR, false, true, now_room);
      } else if (room_edit_mode === 2) { // 作成
        xhr('req=' + SET_DIR + '&mode=2&name=' + localStorage.getItem("userName") + '&room=' + now_room + '&new_name=' + room_name.value + '&new_descr=' + room_desk_text.value, SET_DIR, false, true, now_room);
      } else if (room_edit_mode === 4) { // 削除
        xhr('req=' + DEL_DIR + '&name=' + localStorage.getItem("userName") + '&room=' + now_room, DEL_DIR, false, true, now_room);
      }
      //main(1);
      change_room(now_room);
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
  const notification_set = document.getElementById('notification_on');
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
  if (special_option.value > 0 && notice2_set == 0) { // 通知する場合はjs追加読み込み
    load_add_js(M_NOTICE_JS);
  }
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
  theme_set = theme.value;
  change_theme(theme.value); // theme更新
}

function sendkey_setting() {
  const send_key_e = document.getElementById('send_key');
  sendKey_set = send_key_e.value;
  localStorage.setItem('sendKey', send_key_e.value);
}

function breakkey_setting() {
  const break_key_e = document.getElementById('break_key');
  breakKey_set = break_key_e.value;
  localStorage.setItem('breakKey', break_key_e.value);
}

function loadem_setting() { // 埋め込みメディアの表示
  const loadmedia = document.getElementById('loadmedia_on');
  if (loadmedia.checked) {
    localStorage.setItem('loadEm', "1");
    load_media_set = '1';
  } else {
    localStorage.setItem('loadEm', "0");
    load_media_set = '0';
  }
  // get_room_data(); // メッセージの再読み込みが必要。
  change_room(now_room);
}

function aamode_setting() { // ASCIIart Modeの設定
  const aamode = document.getElementById('aamode_on');
  aamode_tgg(aamode.checked);
}

function aamode_tgg(sw) { // ASCIIaer Mode を操作します
  const style_lifont = document.getElementById('style_lifont');
  if (sw) {
    localStorage.setItem('aamode', "1");
    style_lifont.innerHTML = "#list, #list:first-child {font-family: 'M+IPAモナ','Mona','mona-gothic-jisx0208.1990-0',IPAMonaPGothic,'IPA モナー Pゴシック','MS PGothic AA','MS PGothic','ＭＳ Ｐゴシック',sans-serif;}";
  } else {
    localStorage.setItem('aamode', "0");
    style_lifont.innerHTML = '';
  }
}

function e_setting() {
  const setting = document.getElementById('setting');
  const user_name2 = document.getElementById('user_name2');
  const notification_set_off = document.getElementById('notification_off');
  const notification_set_on = document.getElementById('notification_on');
  const special_option = document.getElementById('special_option');
  const theme = document.getElementById('theme');
  const send_key = document.getElementById('send_key');
  const break_key = document.getElementById('break_key');
  const L_side = document.getElementById('L_side');
  const create_room = document.getElementById('create_room');
  const loadmedia_off = document.getElementById('loadmedia_off');
  const loadmedia_on = document.getElementById('loadmedia_on');
  const aamode_off = document.getElementById('aamode_off');
  const aamode_on = document.getElementById('aamode_on');

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
      notification_set_off.checked = false;
      notification_set_on.checked = true;
    } else {
      notification_set_off.checked = true;
      notification_set_on.checked = false;
    }
    if (localStorage.getItem("loadEm") === '1') { // メディアの表示
      loadmedia_off.checked = false;
      loadmedia_on.checked = true;
    } else {
      loadmedia_off.checked = true;
      loadmedia_on.checked = false;
    }
    if (localStorage.getItem("aamode") === '1') { // AAモード
      aamode_off.checked = false;
      aamode_on.checked = true;
    } else {
      aamode_off.checked = true;
      aamode_on.checked = false;
    }
    special_option.value = localStorage.getItem("Notice2");
    theme.value = localStorage.getItem("theme");
    send_key.value = localStorage.getItem("sendKey");
    break_key.value = localStorage.getItem("breakKey");
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
  if (document.hidden && notice_set === '1') { // タブがパッシブ && 通知ON
    // if (notice_set === '1') {
    var mes = 'New message received!';
    push_cr(2, mes, PUSH_TIMER); // Push通知 4秒間で消える
  }
}
// ----- Push通知 -----
function push_cr(mode, mes, times) {
  // mode===1: サポート/許可確認, ===2: 通知
  if (mode === 1) {
    // ブラウザが通知をサポートしているか確認
    if (!('Notification' in window)) {
      support_push = 1; // 非サポート
    } else {
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
    // console.log('notice');
    // 通知作成
    var notification = new Notification(mes);
    notification.onClick = function () { // 通知クリック時の動作
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
    top_stat_col(false); // stat -> bad
    console.log('%cPOST_SIZE %c> OVER <', 'color: #fff;', 'color: red;'); // データサイズが大きすぎる場合は拒否
    return 'B';
  } else {
    top_stat_col(true); // stat -> ok
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
      v_send_media = false;
    } else { // 通常のテキスト以外
      console.log(v_send_media);
    }
    xhr('req=' + ADD_MES + '&room=' + now_room + '&name=' + localStorage.getItem("userName") + '&type=' + type + '&contents=' + v_send + '&media=' + v_send_media, ADD_MES, false, true, now_room);
  }
  ex_b_send(0, true); // 送信オプションを閉じる
  // ck_ex_content('', 0); // メッセージ入力欄のサイズ
}

// ----- アクティブなRoomを変更
function change_room(room) {
  if (room !== now_room) edit_cancel(); // メッセージ編集中の場合は終了
  if (room) {
    before_room = now_room;
    now_room = room;
    change_url('?room=' + room); // 表示URLの変更
    if (room === 'main') { // Roomの説明の色
      document.getElementById('descr_tit').style.backgroundColor = "#777";
    } else {
      document.getElementById('descr_tit').style.backgroundColor = "";
    }

    if (!cache_m["mes"][room] || !cache_m["mes"][room]["update_caches"] || !cache_m["mes"][room]["object"]) { // キャッシュの更新が必要
      document.getElementById('conttt').innerHTML = '<h4 id=conttt_loading_ani><span id=conttt_loading_ani0>■</span><span id=conttt_loading_ani1>■</span><span id=conttt_loading_ani2>■</span></h4><p style="font-size: 0.8em; text-align: center; ">NOW LOADING!!!! &ensp; Hold on a second.</p>'; // メッセージ内容の表示部分
      if (!cache_m["mes"][room]) { // 各Room初回読み込み
        cache_m["mes"][room] = {};
        main(2);
      } else {
        get_room_data();
      }
      if (support_eventsource === 0) { // sseサポート
        if (close_sse_session) {
          ck_room_data(true); // 普通にデータを1回取得
          ck_room_datas();
          close_sse_session = false;
        } else {
          update_disp(1, cache_m['dir'], 1); // Room表示更新
        }
      } else {
        main(); // 更新+mainループ
      }
      cache_m["mes"][room]["update_caches"] = true;
    } else { // キャッシュの更新が不要な場合
      update_disp(1, cache_m['dir'], 1); // Room表示更新
      update_disp(2, cache_m['mes'][room], 1); // メッセージ内容を更新
    }
  }
}

// ----- URLを変更する ----- //
// 参考: https://www.google.co.jp/ime/___o/
function change_url(str) {
  history.replaceState('', '', str);
}


// ----- 文字エスケープ -----
function esc(str) {
  return encodeURI(str)
    .replace(/&/g, '%26') // &
    .replace(/\+/g, '%2B') // +
    .replace(/\r?\n/g, '%0D%0A'); // \n
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
  var date = new Date();
  var week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var date_out = date.getFullYear() + '-' + zerosli((date.getMonth() + 1)) + '-' + zerosli(date.getDate()) + ' (' + week[date.getDay()] + ') ' + zerosli(date.getHours()) + '<span id=dot>:</span>' + zerosli(date.getMinutes());
  if (date_out !== old_date) {
    const TIME_B = document.getElementById('time_b'); // 時刻表示用(仮)
    old_date = date_out;
    TIME_B.innerHTML = date_out;
  }
}

// ----- 2桁の0埋め -----
function zerosli(no) {
  return ("00" + no).slice(-2);
}

// ----- Ajaxにより非同期でサーバへリクエスト -----
function xhr(send_data, send_mode, param1, option, exe_room) { // POSTする内容, リクエストの種類, 追加読み込みの引継ぎ, 通信のタイムアウトを長くするか, 実行するRoom名(非同期なのでnew_roomは使えない)
  const req = new XMLHttpRequest();
  req.open('POST', SEND_SERVER, true);
  req.setRequestHeader('Pragma', 'no-cache_m'); // キャッシュを無効にするためのヘッダ指定
  req.setRequestHeader('cache_m-Control', 'no-cach');
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
        top_stat_col(true); // stat -> ok
        switch (send_mode) {
          case EDT_MES:
            // document.getElementById('chat_content').value = '';
            // if (resData) {
            //   var mes_par = JSON.parse(resData);
            //   var edit_id = mes_par["contents"]["id"];
            //   cache_m["mes"][exe_room]["object"][edit_id]["contents"] = mes_par["contents"]["contents"];
            //   cache_m["mes"][exe_room]["object"][edit_id]["id"] = mes_par["contents"]["id"];
            //   cache_m["mes"][exe_room]["object"][edit_id]["type"] = mes_par["contents"]["type"];
            //   update_disp(2, cache_m["mes"][exe_room], 1);
            // }
            edit_cancel();
          case ADD_MES:
            console.log('%cPOST_OK!', 'color: #00a0e9;');
            cache_m["dir"] = JSON.parse(resData); // Room情報を配列に保存しておく
            if (onload_flag["onload"]) { // 初回の読み込み完了(Onload)となったか判定する。 まだだったら、画面更新を先送り
              update_disp(1, cache_m["dir"], 1);
            }

            const div_top = document.getElementById('chat_content');
            const chat_url = document.getElementById('chat_url');
            div_top.value = '';
            chat_url.value = '';
            ck_ex_content(0); // メッセージ入力欄調整

            break;
          case GET_MES:
            cache_m["mes"][exe_room] = JSON.parse(resData); // メッセージ内容を配列に保存しておく
            cache_m["mes"][exe_room]["update_caches"] = true; // 上書きされて['update_caches']が消える。マージすればいいけど、その場しのぎ
            if (onload_flag["onload"]) { // 初回の読み込み完了(Onload)となったか判定する。 まだだったら、画面更新を先送り
              update_disp(2, cache_m["mes"][exe_room], 1);
              get_room_data_plus(now_thread, false, exe_room); // 追加読み込み
            }
            onload_flag["mes"] = true;
            break;
          case GET_DIR:
            cache_m["dir"] = JSON.parse(resData); // Room情報を配列に保存しておく
            if (onload_flag["onload"]) { // 初回の読み込み完了(Onload)となったか判定する。 まだだったら、画面更新を先送り
              update_disp(1, cache_m["dir"], 1);
            }
            onload_flag["dir"] = true;
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
            get_room_data_plus(param1, resData, exe_room); // 追加読み込み
            break;
          case MES_DIF:
            if (resData) {
              var mes_par = JSON.parse(resData);
              cache_m["mes"][exe_room]["thread"] = mes_par["thread"];
              var mes_obj = {
                ...cache_m["mes"][exe_room]["object"],
                ...mes_par["object"]
              }; // オブジェクト結合
              cache_m["mes"][exe_room]["object"] = Object.entries(mes_obj).map(([key, value]) => (value)); // オブジェクトから配列にして代入
            }
            update_disp(2, cache_m["mes"][exe_room], 1);
            break;
        }
      } else {
        top_stat_col(false); // stat -> bad
        if (exe_room && cache_m["mes"][exe_room]) cache_m["mes"][exe_room]["update_caches"] = false; // ダメだったら
        console.log('ServerERROR STAT: ' + req.status);
        if (req.responseText) {
          document.getElementById('conttt').innerHTML = '<p style="font-size: 0.8em; text-align: center; ">' + req.responseText + '</p>'; // メッセージ内容の表示部分
        }
      }
    }
  }
}

// ----- データ取得後の処理 -----
function update_disp(sw, str, option1) { // 更新の種類, 更新データ
  if (!option1) {
    var r_list = JSON.parse(str);
  } else if (option1 === 1) {
    var r_list = str;
  }

  switch (sw) {
    case 1: // Roomリスト更新
      // console.log(r_list);

      // Roomボタン生成
      var list_length = r_list.length;
      let reset_list_flag = false;
      for (let i = 0; i < list_length; i++) {
        if (document.getElementById('ro' + r_list[i]["dir_name"]) === null) {
          reset_list_flag = true;
        }
      }
      if (reset_list_flag) {
        reset_list(r_list);
      }
      update_disp_onbutt(r_list); // Roonリストのボタン色更新

      if (support_indexedDB < 1) { // IndexedDBを使用できるか
        // Class追加 + DB操作
        for (let i = 0; i < list_length; i++) {

          // IndexedDB操作&画面更新
          db_connect(DB_N, OBJ_STORE_LAST, 'g_last', r_list[i]["dir_name"], i, r_list); // IndexedDB操作用関数を実行させる
        }
      } else { // IndexedDB使用不可
        for (let i = 0; i < list_length; i++) {
          update_disp_arr(i, r_list); // 画面更新
        }
      }
      break;

    case 2: // キャッシュ優先でメッセージ表示部分更新
      const CONTTT = document.getElementById('conttt'); // メッセージ内容の表示部分
      const descr = document.getElementById('descr'); // Description部分

      if (str) { // サーバからのレスポンスがあるかどうか
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

        if (r_list["id_offset"] || r_list["id_offset"] === 0 || r_list["id"]) {
          if (r_list["object"][r_list["object"].length - 1]) {
            // cache_m["mes"][now_room]["id"] = r_list["id_offset"] + r_list["object"].length - 1;
            cache_m["mes"][now_room]["id"] = r_list["object"][r_list["object"].length - 1]["id"];
          }
        }
        update_disp_tit(r_list["room_name"], r_list["descr"], r_list["thread"]); // Room名,Titleの更新

        // メッセージ部分更
        var list_put = ''; // 出力用の変数
        if (r_list["object"] && r_list["object"].length > 0) {
          list_put = parse_message(r_list); // list_putに表示用に直したデータを代入します
          if (!list_put) {
            list_put = "<li id=list2>Info: There is no message.</li>";
          }
        } else {
          if (!r_list) {
            list_put = "<li id=list2>Info: There was no response from the server.</li>";
          }
        }
        CONTTT.innerHTML = list_put;
      } else {
        descr.innerHTML = '';
        CONTTT.innerHTML = "<li id=list2>Info: Don't bother with this Info</li>";
      }
      break;
  }
}

function update_disp_tit(title, descr, thread) { // 表示部分更新
  const descr_e = document.getElementById('descr'); // Description部分
  const room_top_name = document.getElementById('room_top_name'); // ページ上部のRoom名表示
  if (thread >= now_thread) { // 追加読み込みの時、古いデータで更新されるのを防ぐ
    room_show = title; // 変数更新
    // room_top_name.innerHTML = ' / ' + title; // 表示更新
    room_top_name.innerHTML = title; // 表示更新
    document.title = title + ' / Beちゃっとぉ'; // title更新
    descrip_text = descr;
    if (descr) {
      descr_e.innerHTML = descr.replace(/\r?\n/g, '<br>'); // 改行を置換 + Descriptionの更新
    }
  }
}

// ----- メッセージの表示部分を取得データから生成する -----
// r_listは配列で渡す必要があります
function parse_message(r_list) {
  r_list = parse_message_filter(r_list); // 編集イベント用の処理
  var list_put = ''; // 出力用の変数
  var list_length = r_list["object"].length - 1;
  var out_data, content, obj_piece, get_link, edit_mark=''; // temporary variable
  var changed_flag = false; // Room名,Titleの更新フラグ
  for (let i = list_length; i !== -1; i--) {
    obj_piece = r_list["object"][i];
    if (obj_piece['type'] === 'log' || obj_piece['type'] === 'update') { // ログの時
      if (changed_flag === false && obj_piece['contents'][0] === 'ChangeRoomSetting') {
        update_disp_tit(obj_piece['contents'][1], obj_piece['contents'][2], r_list["thread"]); // Room名,Titleの更新
        changed_flag = true;
      }
      continue;
    }
    if (obj_piece["edit_log"] && obj_piece["edit_log"].length) edit_mark = ' *';
    content = obj_piece["contents"].replace(/\r?\n/g, '<br>'); // 改行を置換
    content = AutoLink(content); // リンクをAnchorに変換
    if (obj_piece['type'] === 'plain') { // 通常のテキスト
      out_data = '<li class="li li_pla" id="edit_'+ obj_piece['id'] +'"><span id=u_icon>' + obj_piece["user"] + '</span> <span id=user>' + obj_piece["user"] + '</span> <span id=date>' + obj_piece["date"]+edit_mark + '</span><button class="edit_button" onclick="edit_start('+ obj_piece['id'] +')">//</button><span id="edit_val_'+obj_piece['id']+'">' + content +'</span></li>';
      // out_data = '<li class="li li_pla" id="edit_'+ obj_piece['id'] +'"><span id=u_icon>' + obj_piece["user"] + '</span> <span id=user>' + obj_piece["user"] + '</span> <span id=date>' + obj_piece["date"]+edit_mark + '</span><span id="edit_val_'+obj_piece['id']+'">' + content +'</span></li>';
    } else if (getLink(obj_piece["media"])) {
      get_link = getLink(obj_piece["media"]);
      if (load_media_set === '1') { // メディアを表示するか
        if (obj_piece['type'] === 'image') { // 画像
          out_data = '<li class="li li_img li_media" id="edit_'+ obj_piece['id'] +'"><span id=u_icon>' + obj_piece["user"] + '</span> <span id=user>' + obj_piece["user"] + '</span> <span id=date>' + obj_piece["date"] + '</span>' + content + '<br><br><img src="' + get_link + '" alt class="media media_img"></li>';
        } else if (obj_piece['type'] === 'iframe') { // iframe
          out_data = '<li class="li li_ifr li_media" id="edit_'+ obj_piece['id'] +'"><span id=u_icon>' + obj_piece["user"] + '</span> <span id=user>' + obj_piece["user"] + '</span> <span id=date>' + obj_piece["date"] + '</span>' + content + '<br><br><iframe src="' + get_link + '" frameborder=0 class="media media_ifr"></iframe></li>';
        }
      } else { // 埋め込みメディアの非表示
        out_data = '<li class="li li_media" id="edit_'+ obj_piece['id'] +'"><span id=u_icon>' + obj_piece["user"] + '</span> <span id=user>' + obj_piece["user"] + '</span> <span id=date>' + obj_piece["date"] + '</span>' + content + '<br>Media: <a href="' + get_link + '" target="_blank" rel="noopener">' + get_link + '</a></li>';
      }
    }
    list_put += out_data;
  }
  return list_put;
}

// ----- 編集イベントがあった時、対象の配列の要素を編集する -----
function parse_message_filter(r_list) {
  var list_length = r_list["object"].length;
  for (let i = 0; i < list_length; i++) {
    obj_piece = r_list["object"][i];
    if (obj_piece['type'] === 'update') { // 編集, 削除など
      var edit_id = i - (obj_piece['id'] - obj_piece['contents']['id']);
      if (r_list["object"][edit_id] && Date.parse(r_list["object"][edit_id]["date"]) < Date.parse(obj_piece['date'])) {
        r_list["object"][edit_id]['contents'] = obj_piece['contents']['contents'];
        r_list["object"][edit_id]['type'] = obj_piece['contents']['type'];
      }
    }
  }
  return r_list;
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
  var list_length = r_list.length;
  for (let i = 0; i < list_length; i++) {
    putData += "<button id='ro" + r_list[i]["dir_name"] + "' onclick=change_room('" + r_list[i]["dir_name"] + "')>" + r_list[i]["room_name"] + "</button><br>";
  }
  L_side.innerHTML = putData;
}

// ----- アクティブなRoomのボタン色の変更 -----
function update_disp_onbutt(r_list) {
  let temp_id;
  var list_length = r_list.length;
  for (let i = 0; i < list_length; i++) {
    temp_id = document.getElementById('ro' + r_list[i]["dir_name"]).classList;
    if (now_room === r_list[i]["dir_name"]) {
      temp_id.add("on_butt");
    } else {
      temp_id.remove("on_butt");
    }
  }
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
      if (now_room === r_list[i]["dir_name"] && !document.hidden) { // Roomが開かれている
        if (!document.hidden) { // タブがアクティブ
          temp_id.classList.remove("new_mes"); // 通知削除
          favicon(0); // 通知オフ
        } else { // タブがパッシブ
          temp_id.classList.add("new_mes"); // 通知追加
          favicon(1); // 通知オン
        }
        get_room_data(); // アクティブなRoomのメッセージ取得
        // RoomがアクティブになったらIndexedDB更新
        db_connect(DB_N, OBJ_STORE_LAST, 'last', r_list[i]["dir_name"], r_list[i]["l_date"], 0, r_list[i]["room_name"], r_list[i]["thread"]);
      } else if (up_info["notice_flag"] === 0) { // 未通知時
        cache_m["mes"][now_room]["update_caches"] = false; // キャッシュの更新が必要
        // 通知フラグが1以外の時通知, 最終更新時は更新しない
        temp_id.classList.add("new_mes"); // 通知追加
        favicon(1); // 通知オン
        notice(false); // 通知する
        db_connect(DB_N, OBJ_STORE_LAST, 'last', r_list[i]["dir_name"], up_info["up_date"], 1, r_list[i]["room_name"], r_list[i]["thread"]);
      } else { // 通知したが、未読
        cache_m["mes"][now_room]["update_caches"] = false; // キャッシュの更新が必要
        temp_id.classList.add("new_mes"); // 通知追加
        favicon(1); // 通知オン
      }
    } else { // 更新なし
      // console.log(g_info["room_key"]);
      // if (!g_info["room_key"]) { // IndexedDBがない場合はセット
      //   db_connect(DB_N, OBJ_STORE_LAST, 'last', r_list[i]["dir_name"], r_list[i]["l_date"], 1, r_list[i]["room_name"], r_list[i]["thread"]);
      // }
      temp_id.classList.remove("new_mes"); // 通知削除
      db_connect(DB_N, OBJ_STORE_LAST, 'last', r_list[i]["dir_name"], r_list[i]["l_date"], 0, r_list[i]["room_name"], r_list[i]["thread"]);
    }
  } else {
    // 初回読み込み
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
        temp_id.classList.remove("new_mes"); // 通知削除
      } else if (sub_DB[r_list[i]["dir_name"]]["notice_flag"] === 0) {
        cache_m["mes"][now_room]["update_caches"] = false; // キャッシュの更新が必要
        // 通知フラグが1以外の時通知、最終更新時は更新しない
        sub_DB[r_list[i]["dir_name"]]["notice_flag"] = 1; // 通知フラグの更新
        temp_id.classList.add("new_mes"); // 通知追加
        favicon(1); // 通知オン
        notice(false); // 通知する
      } else { // 通知したが、未読
        cache_m["mes"][now_room]["update_caches"] = false; // キャッシュの更新が必要
        temp_id.classList.add("new_mes"); // 通知追加
        favicon(1); // 通知オン
      }
    } else {
      // 更新なし
      sub_DB[r_list[i]["dir_name"]]["notice_flag"] = 0; // 通知フラグの更新
      temp_id.classList.remove("new_mes"); // 通知削除
    }
  } else {
    // sub_DB上に存在しない場合
    sub_DB[r_list[i]["dir_name"]] = { // 配列追加
      l_date: r_list[i]["l_date"],
      notice_flag: 3
    }
    favicon(0); // 通知オフ
  }
}

// ----- ページ切り替え -----
var L_side_toggle = 0;

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
  if (notice2_set > 0) { // 通知する場合はjs追加読み込み
    load_add_js(M_NOTICE_JS);
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

  if (!localStorage.getItem("breakKey")) { // 改行キーの設定
    localStorage.setItem("breakKey", breakKey_set);
  } else {
    breakKey_set = localStorage.getItem("breakKey");
  }

  if (!localStorage.getItem("loadEm")) { // 埋め込みメディアの読み込み
    localStorage.setItem("loadEm", load_media_set);
  } else {
    load_media_set = localStorage.getItem("loadEm");
  }

  if (!localStorage.getItem("aamode")) { // アスキーアート向けのフォントに変更
    localStorage.setItem("aamode", change_font_aa);
  } else {
    change_font_aa = localStorage.getItem("aamode");
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

// ----- キー入力を処理する関数(ショートカットキー) -----
// Alt+Enter(keyCode==13)が入力されたとき、b_send()を実行
// B+ オプションは廃止されました
document.getElementById('chat_content').addEventListener('keydown', function keypress(event) {
  shortcut_1(event);
});
document.getElementById('chat_url').addEventListener('keydown', function keypress(event) {
  shortcut_1(event);
});

function shortcut_1(event) { // 入力欄のみ有効
  let b_value = localStorage.getItem("breakKey");
  let s_value = localStorage.getItem("sendKey");
  if (event.altKey && !event.shiftKey && !event.ctrlKey && b_value === '1' ||
    !event.altKey && event.shiftKey && !event.ctrlKey && b_value === '2' ||
    !event.altKey && !event.shiftKey && event.ctrlKey && b_value === '3' ||
    !event.altKey && !event.shiftKey && !event.ctrlKey && b_value === '4') {
    if (event.key === 'Enter') { // 改行をおこなう
      event.preventDefault(); // 他の動作をしないようにする
      var text_val = chat_content.value;
      var text_len = text_val.length;
      var text_pos = chat_content.selectionStart;
      var text_end = chat_content.selectionEnd;
      var break_t = "\n"; // 改行文字列
      chat_content.value = text_val.substr(0, text_pos) + break_t + text_val.substr(text_pos, text_len);
      chat_content.selectionEnd = text_end + break_t.length;
      ck_ex_content(0); // テキストエリアのサイズ更新
      // console.log('b');
      // document.getElementById("chat_content").dispatchEvent(new KeyboardEvent('keydown', { keyCode: 13 }));
    }
  } else if (event.altKey && !event.shiftKey && !event.ctrlKey && s_value === '1' ||
    !event.altKey && event.shiftKey && !event.ctrlKey && s_value === '2' ||
    !event.altKey && !event.shiftKey && event.ctrlKey && s_value === '3' ||
    !event.altKey && !event.shiftKey && !event.ctrlKey && s_value === '4') {
    if (event.key === 'Enter') { // メッセージの送信
      event.preventDefault(); // 他の動作をしないようにする
      // Function(document.getElementById("bbbutton").getAttribute('onclick'))() // bbbuttonのonclickの動作を実行
      // b_send();
      if (disp_emode === 0) {
        b_send();
      } else {
        edit_message(disp_emode[0], disp_emode[1], disp_emode[2], disp_emode[3]);
      }
    }
  }
}
window.addEventListener('keydown', function keypress2(event) { // 全体で有効
  if (event.altKey && event.key === 'ArrowUp') { // 上のRoomに移動
    let dir_len = cache_m["dir"].length;
    for (var i = 0; i < dir_len; i++) {
      if (now_room === cache_m["dir"][i]["dir_name"]) break;
    }
    if (now_room === 'main') {
      if (cache_m["dir"][dir_len - 1]["dir_name"] !== 'main') {
        change_room(cache_m["dir"][dir_len - 1]["dir_name"]);
      } else if (dir_len > 1) {
        change_room(cache_m["dir"][dir_len - 2]["dir_name"]);
      }
    } else if (i === 0 || i === 1 && cache_m["dir"][0]["dir_name"] === 'main') {
      change_room("main");
    } else {
      if (cache_m["dir"][i - 1]["dir_name"] === 'main' && i > 1) {
        change_room(cache_m["dir"][i - 2]["dir_name"]);
      } else {
        change_room(cache_m["dir"][i - 1]["dir_name"]);
      }
    }
  } else if (event.altKey && event.key === 'ArrowDown') { // 下のRoomに移動
    let dir_len = cache_m["dir"].length;
    for (var i = 0; i < dir_len; i++) {
      if (now_room === cache_m["dir"][i]["dir_name"]) break;
    }
    if (now_room === 'main') {
      if (cache_m["dir"][0]["dir_name"] !== 'main') {
        change_room(cache_m["dir"][0]["dir_name"]);
      } else if (dir_len > 1) {
        change_room(cache_m["dir"][1]["dir_name"]);
      }
    } else if (i === dir_len - 1 || i === dir_len - 2 && cache_m["dir"][dir_len - 1]["dir_name"] === 'main') {
      change_room("main");
    } else {
      if (cache_m["dir"][i + 1]["dir_name"] === 'main' && i < dir_len - 2) {
        change_room(cache_m["dir"][i + 2]["dir_name"]);
      } else {
        change_room(cache_m["dir"][i + 1]["dir_name"]);
      }
    }
  } else if (event.key === 'Tab') { // 入力欄にフォーカス
    document.getElementById('ex_menu').focus();
  } else if (event.key === 'Escape' && disp_emode !== 0) { // Escでメッセージ編集をキャンセル
    edit_cancel();
  }
});

// ----- 下からのスクロール量 -----
function from_Bottom() {
  var body = window.document.body;
  var html = window.document.documentElement;
  var scrollTop = body.scrollTop || html.scrollTop;
  return html.scrollHeight - html.clientHeight - scrollTop;
}

// ----- Theme変更 -----
function change_theme(no) {
  switch (no) {
    case '1':
      load_add_css(STYLE_CSS);
      break;
    case '2':
      load_add_css(THEME_DEEPBLACK_CSS);
      break;
    case '3':
      load_add_css(THEME_WHITE_CSS);
      break;
  }
}

// ----- 追加css読み込み -----
function load_add_css(href) {
  var theme_css = document.createElement('link');
  theme_css.setAttribute('rel', 'stylesheet');
  theme_css.setAttribute('type', 'text/css');
  theme_css.setAttribute('href', href);
  document.getElementsByTagName('head')[0].appendChild(theme_css);
}

// ----- 追加js読み込み -----
function load_add_js(href) {
  var add_js = document.createElement('script');
  add_js.setAttribute('src', href);
  document.getElementsByTagName('head')[0].appendChild(add_js);
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
    fav.href = "./res/fav32_2.png";
    show_roomlist.style.color = '#00a0e9';
  } else { // デフォルト
    fav.href = "./res/fav32.png";
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
  ck_content_length();
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
function ck_content_length() { // 入力上限サイズのチェック
  const chat_content = document.getElementById('chat_content');
  if (chat_content.value.length > MAX_SEND_SIZE) {
    chat_content.style.borderColor = "orange";
  } else {
    chat_content.style.borderColor = "";
  }
}

// ----- メッセージ編集/削除 -----
function edit_message(type, v_send, thread, id) { // id は 編集対象のメッセージID
  if (!v_send) v_send = document.getElementById('chat_content').value;
  console.log(type+' '+v_send+' '+thread+' '+id);
  xhr('req=' + EDT_MES + '&room=' + now_room + '&name=' + localStorage.getItem("userName") + '&type=' + type + '&contents=' + v_send + '&thread=' + thread + '&id=' + id, EDT_MES, false, true, now_room);
  // xhr('req=' + EDT_MES + '&room=' + now_room, EDT_MES, false, true);
}

// ----- メッセージ編集開始 -----
function edit_start(id) {
  disp_emode = Array('plain', '', cache_m['mes'][now_room]['thread'], id); // メッセージ編集モードにする
  const chat_content = document.getElementById('chat_content');
  const edit_contents = document.getElementById('edit_'+id);
  const edit_contents_val = document.getElementById('edit_val_'+id);
  const ex_menu = document.getElementById('ex_menu');
  const bbbutton = document.getElementById('bbbutton');
  clear_class("editing");
  edit_contents.classList.add("editing");
  ex_menu.innerHTML = '<i class="fas fa-times"></i>';
  bbbutton.onclick = new Function("edit_message('plain','',"+cache_m['mes'][now_room]['thread']+","+id+")");
  ex_menu.onclick = new Function('edit_cancel(); document.getElementById("chat_content").value = "";');
  chat_content.value = edit_contents_val.innerHTML;
}

// ----- メッセージ編集キャンセル -----
function edit_cancel() {
  clear_class("editing");
  disp_emode = 0; // メッセージ編集モード終了
  const bbbutton = document.getElementById('bbbutton');
  const ex_menu = document.getElementById('ex_menu');
  bbbutton.onclick = new Function("b_send()");
  ex_menu.innerHTML = '<i class="fas fa-angle-double-down"></i>';
  ex_menu.onclick = new Function('ex_b_send(0)');
}

// ----- 特定のclassを消す -----
function clear_class(str) {
  var targetElements = document.getElementsByClassName(str);
  [].forEach.call(targetElements, function(elem) {
    elem.classList.remove(str);
  })
}

// ----- ステータスによって上部のborderの色を変える
function top_stat_col(stat) {
  const top_stat = document.getElementById("top_stat");
  if (stat) {
    // top_stat.style.borderTopColor = "#00a0e9";
    top_stat.style.borderTopColor = "#BBB";
  } else {
    top_stat.style.borderTopColor = "orange";
  }
}