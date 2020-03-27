// Beちゃっとぉ クライアント側

/*
GET ?room= xxx の指定により、開くページを指定できます
*/

// ----- Javascript部分 -----

// ----- 定数定義 -----
const XHR_TIMEOUT = 1000 * 5; // サーバリクエストのタイムアウト時間(ms)
const MAINLOOP_TIMER = 1000 * 5; // メイン関数の実行間隔の時間 (ms)
const MAX_SEND_SIZE = 3003; // 最大送信サイズ 0xBBB
const SEND_SERVER = 'chat_v1.5.php';
// const SEND_SERVER = 'https://u2api.azurewebsites.net/chat/chat.php'; // POSTする試験サーバURL
// const SEND_SERVER = 'https://u2net.azurewebsites.net/chat/chat.php'; // POSTする本番サーバURL

// phpへのリクエスト種類
const ADD_MES = 'add'; // メッセージの追加
const GET_MES = 'mes'; // メッセージ取得
const GET_DIR = 'dir'; // メッセージのディレクトリ一覧取得
const SET_DIR = 'set'; // メッセージのディレクトリ(Room)の作成・編集

// IndexedDBのデータベース名
const DB_N = 'BeChat_DB';
// オブジェストア名
const OBJ_STORE_LAST = 'ckb_last';
const OBJ_STORE_MESS = 'ckb_mess';

// ----- 変数宣言 -----
var now_room = 'main'; // 現在アクティブなRoom
var exec_cnt = 0; // main()の重複実行を抑えるために実行数をカウントする変数
var support_indexedDB = 0; // IndexedDBが利用可能:0 , 非サポート:1, サポートされているが、アクセス不可:2
var sub_DB = []; // IndexedDBが使用できない場合、更新状態を配列で保持する. そのため確保しておく


// ----- 初期処理 -----
window.onload = function Begin() {
  console.log('%cＢｅちゃっとぉ%c Ver.0.8.0 20200327', 'color: #fff; font-size: 2em; font-weight: bold;', 'color: #00a0e9;');
  console.log('%cSessionBegin %c> ' + nowD(), 'color: orange;', 'color: #bbb;');
  ck_indexedDB(); // IndexedDBのサポート確認
  c_page(1); // ページ切り替え
  get_room_data(); // アクティブなRoomのメッセージ取得
  main(); // main()に渡す
}

// ----- メイン処理 -----
function main(option) {
  ck_room_data(); // Room更新確認
  if (option === 1) { // Roomのメッセージ取得が必要な時
    get_room_data();
  }

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
    var open_db = indexedDB.open(base_name);

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
      var trans = db_data.transaction(store_name, 'readwrite');
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
        // Room名, 最終更新時, データ種類, ユーザー名, データ
        var put_data = {
          room_key: param1,
          up_date: param2,
          type: param3,
          user: param4,
          contents: param5
        };
        var push = obj.put(put_data);
      } else if (sw === GET_LAST) {
        var get_data = obj.get(param1);
        get_data.onsuccess = function (ev2) {
          update_disp_db(ev2.target.result, param2, param3);
        }
      } else if (sw === GET_MESS) {}

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
function get_room_data() {
  xhr('req=' + GET_MES + '&room=' + now_room, GET_MES);
}

function user_submit() {}

function room_editx() {}

function e_setting() {}

function notice() {}

// ----- メッセージを送信 -----
function b_send() {
  const div_top = document.getElementById('chat_content');
  var v_send = esc(div_top.value);
  var type = 'plain';
  if (v_send.length >= MAX_SEND_SIZE || v_send.length <= 0) {
    console.log('%cPOST_SIZE %c> OVER <', 'color: #fff;', 'color: red;'); // データサイズが大きすぎる場合は拒否
    return 'B';
  } else {
    console.log('%cPOST_DATA %c> ' + v_send, 'color: orange;', 'color: #bbb;');
    div_top.value = '';
    xhr('req=' + ADD_MES + '&room=' + now_room + '&name=' + localStorage.getItem("userName") + '&type=' + type + '&contents=' + v_send);
  }
  ck_room_data(); // アクティブなRoomのメッセージ取得
}

// ----- アクティブなRoomを変更
function change_room(room) {
  now_room = room;
  main(1);
}

// ----- 文字エスケープ -----
function esc(str) {
  return str
    .replace(/&/g, '%26')
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

// ----- Ajaxにより非同期でサーバへリクエスト -----
function xhr(send_data, send_mode) { // POSTする内容, リクエストの種類
  const req = new XMLHttpRequest();
  req.open('POST', SEND_SERVER, true);
  req.setRequestHeader('Pragma', 'no-cache'); // キャッシュを無効にするためのヘッダ指定
  req.setRequestHeader('Cache-Control', 'no-cach');
  req.setRequestHeader('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
  req.timeout = XHR_TIMEOUT; // サーバリクエストのタイムアウト時間の指定
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
            break;
          case GET_DIR:
            update_disp(1, resData);
            break;
          case SET_DIR:
            break;
        }
      } else {
        console.log('ServerERROR STAT: ' + req.status);
      }
    }
  }
}

// ----- データ取得後の処理 -----
function update_disp(sw, str) { // 更新の種類, 更新データ

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
        descr.innerHTML = r_list["descr"]; // Descriptionの更新
        // メッセージ部分更
        var list_put = ''; // 出力用の変数
        if (r_list["object"].length > 0) {
          for (var i = 0; i < r_list["object"].length; i++) {
            var content = r_list["object"][i]["contents"].replace(/\r?\n/g, '<br>'); // 改行を置換
            var out_data = "<li id=list> <span id=user>" + r_list["object"][i]["user"] + "</span> <span id=date>" + r_list["object"][i]["date"] + "</span>" + content;
            list_put = out_data + list_put;
          }
        } else {
          list_put = "<li id=list2><br>メッセージがまだないようだ..<br>　</li>";
        }
        CONTTT.innerHTML = list_put;
      } else {
        descr.innerHTML = '';
        CONTTT.innerHTML = "<li id=list2><br>メッセージがまだないようだ..<br>　</li>";
      }

      break;
  }
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
      if (now_room === r_list[i]["dir_name"]) {
        // RoomがアクティブになったらIndexedDB更新
        db_connect(DB_N, OBJ_STORE_LAST, 'last', r_list[i]["dir_name"], r_list[i]["l_date"], 0, r_list[i]["room_name"], r_list[i]["thread"]);
        get_room_data(); // アクティブなRoomのメッセージ取得
        temp_id.classList.add("on_butt"); // ActiveRoom
        temp_id.classList.remove("new_mes"); // 通知削除
      } else if (up_info["notice_flag"] === 0) {
        // 通知フラグが1以外の時通知, 最終更新時は更新しない
        db_connect(DB_N, OBJ_STORE_LAST, 'last', r_list[i]["dir_name"], up_info["up_date"], 1, r_list[i]["room_name"], r_list[i]["thread"]);
        notice(); // 通知する
        temp_id.classList.remove("on_butt"); // PassiveRoom
        temp_id.classList.add("new_mes"); // 通知追加
      } else { // 通知したが、未読
        temp_id.classList.remove("on_butt"); // PassiveRoom
        temp_id.classList.add("new_mes"); // 通知追加
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
      db_connect(DB_N, OBJ_STORE_LAST, 'last', r_list[i]["dir_name"], r_list[i]["l_date"], 0, r_list[i]["room_name"], r_list[i]["thread"]);
      temp_id.classList.remove("new_mes"); // 通知削除
    }
  } else {
    // 初回読み込み
    if (now_room === r_list[i]["dir_name"]) {
      temp_id.classList.add("on_butt"); // ActiveRoom
    } else {
      temp_id.classList.remove("on_butt"); // PassiveRoom
    }
    db_connect(DB_N, OBJ_STORE_LAST, 'last', r_list[i]["dir_name"], r_list[i]["l_date"], 3, r_list[i]["room_name"], r_list[i]["thread"]);
  }
}

// ----- sub_DB操作&画面更新 -----
function update_disp_arr(i, r_list) {
  // Roomリストのボタンを追加する
  let temp_id = document.getElementById('ro' + r_list[i]["dir_name"]);

  if (sub_DB[r_list[i]["dir_name"]]) {
    if (sub_DB[r_list[i]["dir_name"]]["l_date"] !== r_list[i]["l_date"]) { // 更新日時が古い場合
      if (now_room === r_list[i]["dir_name"]) {
        // Roomがアクティブになったら更新
        sub_DB[r_list[i]["dir_name"]] = { // 配列追加
          l_date: r_list[i]["l_date"],
          notice_flag: 0
        }
        get_room_data(); // アクティブなRoomのメッセージ取得
        temp_id.classList.add("on_butt"); // ActiveRoom
        temp_id.classList.remove("new_mes"); // 通知削除
      } else if (sub_DB[r_list[i]["dir_name"]]["notice_flag"] === 0) {
        // 通知フラグが1以外の時通知、最終更新時は更新しない
        sub_DB[r_list[i]["dir_name"]]["notice_flag"] = 1; // 通知フラグの更新
        notice(); // 通知する
        temp_id.classList.remove("on_butt"); // PassiveRoom
        temp_id.classList.add("new_mes"); // 通知追加
      } else { // 通知したが、未読
        temp_id.classList.remove("on_butt"); // PassiveRoom
        temp_id.classList.add("new_mes"); // 通知追加
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
  }
}

// ----- ページ切り替え -----
function c_page(no) {
  switch (no) {
    case 0: // ユーザー名入力画面
      break;
    case 1: // 通常画面
      setting.style.display = "none";
      first_sc.style.display = "none";
      edit_room.style.display = "none";
      break;
    case 2: // 設定画面
      break;
  }
}

// ----- 自動リンク化する関数 -----
// $strに入れると、リンク部分が<a>で囲われてreturn
function AutoLink(str) {
  var regexp_url = /((h?)(ttps?:\/\/[a-zA-Z0-9.\-_@:/~?%&;=+#',()*!]+))/g; // ']))/;
  var regexp_makeLink = function (all, url, h, href) {
    return '<a href="h' + href + '"  target="_blank" rel="noopener">' + url + '</a>';
  }
  return str.replace(regexp_url, regexp_makeLink);
}