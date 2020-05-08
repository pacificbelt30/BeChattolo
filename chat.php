<?php
/*

ファイル置き場 5
Beちゃっとぉ

2020 Fukuda-B/Dakhuf

chat_v1.6

// ----- メモ -----
chat.php/edit.phpからの引き続ぎ
JSON化、関数化、WebAPI向けに修正


// ----- 予定 -----
ピン固定
スタンプ機能追加
RoomListの並び替え
Roomの種類を増やす(iframe/ NotIncludeRoomList..)
メッセージの編集・削除
リクエストヘッダから更新日時を取得するか、PHPでまとめて全ルームを取得するか悩んでいる
シンタックスハイライト(ソースコードの色付け)を導入
改行キーのオプション設定
Roomの非表示、非通知設定
チャットの設定で、名無しの時の名前の設定
通知は、Localstrageで行う
RoomEditの機能拡張
サーバへのリクエストをmain()/sub()で分けずにまとめて行う
アプリ版を作る
コマンドに対応する
# ハッシュグに対応
パスワード対応
最新のデザイントレンドを採用
・backdrop-filter
・gradf
・DarkMode
・水平スクロール
・scroll-snap
・BoldFont
速度と今後を考えて、PHPからNode.jsに移行する可能性..
Azureサーバのメモリが厳しい


// ----- コマンドなど -----
From: Youtube
太字 *太字*
_斜体_
-取り消し線-
:***: //***部分に文字列で隠し絵文字に自動変換される
From: Markdownチートシート
```ソースコード```
# これはH1タグ
## これはH2タグ

// ----- 更新履歴 -----
Ver.0.8.20?
時間を date('Y-m-d H:i:s') から date('c') ISO8601日付 に変更

Ver.0.8.13
メッセージデータをメモリに保管(キャッシュ)し、2回目以降同じRoomを開くときキャッシュを優先するようにした
メッセージの保存ファイルをbbs/bbbを作っていたのをbbs(メイン)だけにする

Ver.0.8.11
AA対応

Ver.0.8.10頃
Roomの削除,非表示
既読を別のところ見ても残るようにする
通知 (設定できるようにする)

Ver.0.8.0
データ形式をJSONへ
ファイルが分割されるようになります
bbs.json
bbs1.json
bbs2.json ...
LocalStrageからIndexedDBをメインとします
*IndexedDBが使えない場合、一部通知機能が制限されます
積極的なローカルデータの活用
SSE, WebSocketはEdgeユーザを考慮し、使用しないことにした
HTMLでのpreload指定
画像・動画の埋め込み

Ver.0.7
複数のチャットが使えるようにする
\chat
\chat\bbs\main
\chat\bbs\xx
<bbs.txt
<bbb.dat
<data.dat

Ver.0.6
やっぱりサーバの負荷がかかるからAjaxにもどす
改行などを使えるようにする
\n → \\n


Ver.0.5
Cometによって効率化

Ver.0.4
ショートカット送信対応
URL自動リンク化

~Ver.0.3
Ajaxで基本的なチャット
*/

// ----- 定数定義 -----
define("BBS_FOLDER", 'bbs'); // Room/メッセージの親ディレクトリ
define("MAIN_ROOM_DIR", 'main'); // 共通のメッセージを入れるディレクトリ
// define("MDATA_NAME", 'mdata'); // mdata(meta_data Room設定を保存するファイル)のファイル名

define("SAVEFILE_NAME", 'bbs'); // メッセージを保存するファイルの名前
define("SAVEFILE_EXTE", '.json'); // メッセージを保存するファイルの拡張子
define("SAVEFILE2_NAME", 'bbb'); // メッセージのバックアップを保存するファイルの名前
define("SAVEFILE2_EXTE", '.json'); // メッセージのバックアップを保存するファイルの拡張子

define("PROTECTED_ROOM", 'PROTECTED'); // Roomのアクセス判定用のファイル

// define("SPLIT_SIZE", 135673); // メッセージの分割条件のファイルサイズ 0xBBBB -> (OCT) Byte
define("SPLIT_SIZE", 104858); // メッセージの分割条件のファイルサイズ 0.1MiB = 104858Byte
//define("MAX_ROOMS", 21474836); // 最大Room数
define("DEFAULT_PERMISSION", 0770); // アクセス権の制御

define("CK_TIMING", 5); // ファイルの更新頻度(sec)
define("CK_UP", 5); // ファイル確認頻度を下げるタイミング(min)

// ----- 設定 -----
date_default_timezone_set('Asia/Tokyo'); // タイムゾーン設定
// header("Access-Control-Allow-Origin: *"); // CORS
set_time_limit(180); // 通信タイムアウト時間設定

first_roomc(); // MainRoomを作らないと始まらないよ。

// ----- メイン処理 (分岐) -----
if($_SERVER['REQUEST_METHOD'] === 'POST') { // POSTでは全関数実行可能
//  if(isset($_POST['req'])) {
  if (filter_input(INPUT_POST, 'req')) {

    if (isset($_POST['room']) && is_file("./".BBS_FOLDER."/".esc($_POST['room'],1)."/".PROTECTED_ROOM)) { // アクセスしてよいか判定
      if($_POST['req'] === 'add' || $_POST['req'] === 'mes' || $_POST['req'] === 'del') {
        echo 'error';
        exit;
      }
    }

    switch ($_POST['req']) {
      case 'dir': // ディレクトリ一覧&更新日時取得
      header( "Content-Type: application/json; charset=utf-8" ); // JSONデータであることをヘッダ追加する
      header("Content-Encoding: gzip");
      echo gzencode(json_encode(GetDir(), JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) , 1);  // .htaccessを操作できずgzipできないサーバー向け
      // echo json_encode(GetDir(), JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE);
      break;
      case 'mes': // メッセージ取得
        header( "Content-Type: application/json; charset=utf-8" ); // JSONデータであることをヘッダ追加する
        if (isset($_POST['thread'])) { GetMes(esc($_POST['room'],1), esc($_POST['thread'],0)); } else {
          GetMes(esc($_POST['room'],1), -1); }
      break;
      case 'add': // メッセージ追加
        header( "Content-Type: application/json; charset=utf-8" ); // JSONデータであることをヘッダ追加する
        if (isset($_POST['media'])) {
          AddMes(esc($_POST['room'],1), esc($_POST['name'],0), esc($_POST['type'],0), esc($_POST['contents'],0), esc($_POST['media'], 0));
        } else {
          AddMes(esc($_POST['room'],1), esc($_POST['name'],0), esc($_POST['type'],0), esc($_POST['contents'],0), false);
        }
        autoSplit(esc($_POST['room'],1)); // 自動分割
      break;
      case 'edt': // メッセージ編集(削除)
        header( "Content-Type: application/json; charset=utf-8" ); // JSONデータであることをヘッダ追加する
        EdtMes(esc($_POST['room'],1), esc($_POST['thread'],0), esc($_POST['id'],0), esc($_POST['name'],0), esc($_POST['type'],0), esc($_POST['contents'],0));
      break;
      case 'del': // ルーム(削除) // アクセス不可にする
        DelRoom(esc($_POST['room'],1), esc($_POST['name'],0));
      break;
      case 'set': // ルーム(作成/編集)
        SetRoom(esc($_POST['mode'],0), esc($_POST['name'],0), esc($_POST['room'],1), esc($_POST['new_name'],0), esc($_POST['new_descr'],0));
      break;
      default:
        header("HTTP/1.0 400 Bad Request");
        echo 'ERROR: No shuch request type.';
      break;
    }
  }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') { // GETではReadのみ
  if (isset($_GET['sse_dir'])){ // Server-Sent Events で 初回はRoomList一覧、その後は更新があるたびに一覧が送信されます
    header('X-Accel-Buffering: no');
    header('Content-Type: text/event-stream');
    header('Cache-Control: no-cache');
    header('Content-Encoding: none');
    SseDir();
  } elseif (isset($_GET['sse_mes']) && isset($_GET['room'])) {
    header('X-Accel-Buffering: no');
    header('Content-Type: text/event-stream');
    header('Cache-Control: no-cache');
    header('Content-Encoding: none');
    SseMes(esc($_GET['room'],1));
  } elseif(isset($_GET['room'])) {
    if (isset($_GET['thread'])) {
      GetMes(esc($_GET['room'],1), esc($_GET['thread'],0));
    } else {
      GetMes(esc($_GET['room'],1), -1);
    }
  } elseif (isset($_GET['dir'])) {
    header( "Content-Type: application/json; charset=utf-8" ); // JSONデータであることをヘッダ追加する
    echo json_encode(GetDir(), JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE);
  } else {
    header("HTTP/1.0 400 Bad Request");
    echo 'ERROR: No shuch request type.';
  }
}
exit;

// ----- MainRoomの作成 -----
function first_roomc(){
  if (!is_dir("./".BBS_FOLDER)) {
    mkdir("./".BBS_FOLDER, DEFAULT_PERMISSION); 
  };
  if (!is_dir("./".BBS_FOLDER."/".MAIN_ROOM_DIR)) {
    mkdir("./".BBS_FOLDER."/".MAIN_ROOM_DIR, DEFAULT_PERMISSION);
  };
  if (!is_file("./".BBS_FOLDER."/".MAIN_ROOM_DIR."/".SAVEFILE_NAME.'0'.SAVEFILE_EXTE)) {
    touch("./".BBS_FOLDER."/".MAIN_ROOM_DIR."/".SAVEFILE_NAME.'0'.SAVEFILE_EXTE);
    chmod("./".BBS_FOLDER."/".MAIN_ROOM_DIR."/".SAVEFILE_NAME.'0'.SAVEFILE_EXTE ,DEFAULT_PERMISSION);
  };
};

// ----- メッセージを追加 -----
function AddMes($room, $name, $type, $contents, $media) {
  $save_d = "./".BBS_FOLDER."/".$room."/"; // 保存ディレクトリ
  if (!$name) $name = 'Anonym'; // 名無しの方は Anonym
  if (is_dir($save_d)) { // ディレクトリ確認
    $save_f = latestMes($room, false)[0]; // メッセージの保存ファイル
    if (is_file($save_f)) { // 保存ファイルが既存の場合
      $open_json = fopen($save_f, 'r'); // 保存ファイルを開く
      $read_json = fread($open_json, filesize($save_f));
      fclose($open_json);
      $read_json = mb_convert_encoding($read_json, 'UTF8', 'ASCII,JIS,UTF-8,EUC-JP,SJIS-WIN');
      $json_main = json_decode( $read_json, true); // JSONファイルを連想配列でデコード
      // $json_main = json_decode($save_f); // JSONファイルを連想配列でデコード
    } else { // 保存ファイルが存在しない場合
      $save_f = "./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.'0'.SAVEFILE_EXTE;
      $json_main = array(
        'room_name' => $room,
        'l_date' => date('c'),
        'thread' => 0,
        'object' => array(),
        'descr' => ''
      );
    }
    // キーが存在しない場合の処理
    if (!array_key_exists('room_name', $json_main)) $json_main['room_name'] = $room;
    if (!array_key_exists('l_date', $json_main)) $json_main['l_date'] = date('c');
    if (!array_key_exists('thread', $json_main)) $json_main['thread'] = latestMes($room, false)[1];
    if (!array_key_exists('object', $json_main)) $json_main['object'] = array();
    if (!array_key_exists('descr', $json_main)) $json_main['descr'] = '';

      $save_data = array( // 保存ファイルに追加するデータ
        'user' => $name,
        'type' => $type,
        'contents' => $contents,
        'date' => date('c')
      );
      if (isset($media) && $media) {
        $save_data['media'] = $media;
      }
      $save_data['i'] = ip_hex();
      $json_main['l_date'] = date('c'); // データを更新
      $json_main['object'][] = $save_data; // データ追加
      // (array)$json_main["object"][] = $save_data; // データを追加
      // var_dump($json_main["object"]);
      // array_push($json_main["object"], $save_data);
      $open_json = fopen($save_f, 'w');
      $write_stat = fwrite($open_json, json_encode($json_main, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE));
      fclose($open_json);
      if ($write_stat === false) {
        echo 'ERROR: Unwritable';
      } else {
        echo 'ok';
      }
      chmod($save_f, DEFAULT_PERMISSION);
      // file_put_contents($save_f, json_encode($json_main, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE)); // ファイル上書き保存, LOCK_EXだと同時接続不可説

      // echo file_get_contents($save_f); // ファイルを出力

  }
}

// ----- メッセージを取得 -----
function GetMes($room, $thread) { // $threadは分割されたスレッド番号(オプション) -> ない場合は最新のものを取得
  if($thread >= 0) {
    $file_n = "./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.$thread.SAVEFILE_EXTE;
    if(is_file($file_n)) {
      /* while (ob_get_level()) { ob_end_clean(); }
      readfile($file_n); */
      $open_json = fopen($file_n, 'r'); $read_json = fread($open_json, filesize($file_n)); fclose($open_json);   // .htaccessを操作できずgzipできないサーバー向け
      header("Content-Encoding: gzip"); echo gzencode($read_json, 1);
      // echo file_get_contents("./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.$thread.SAVEFILE_EXTE);
    }
  } else {
    // echo file_get_contents("./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.SAVEFILE_EXTE);
    $file_n = latestMes($room, false)[0];
    if(is_file($file_n)) {
      /* while (ob_get_level()) { ob_end_clean(); }
      readfile($file_n); // 最新のメッセージを表示 */
      $open_json = fopen($file_n, 'r'); $read_json = fread($open_json, filesize($file_n)); fclose($open_json);   // .htaccessを操作できずgzipできないサーバー向け
      header("Content-Encoding: gzip"); echo gzencode($read_json, 1);
      // echo file_get_contents(latestMes($room, false)[0]); // 最新のメッセージを表示
    }
  }
  exit;
}

// ------ メッセージの編集/削除 -----
function EdtMes($room, $thread, $no, $name, $type, $contents) { // $no は 配列番
  $save_f = "./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.$thread.SAVEFILE_EXTE;
  if (is_file($save_f)) { // 保存ファイルが既存の場合
    $open_json = fopen($save_f, 'r');
    $read_json = fread($open_json, filesize($save_f));
    fclose($open_json);
    $read_json = mb_convert_encoding($read_json, 'UTF8', 'ASCII,JIS,UTF-8,EUC-JP,SJIS-WIN');
    $json_main = json_decode( $read_json, true); // JSONファイルを連想配列でデコード

    $save_data = array( // 保存ファイルに追加するデータ
      'user' => $name,
      'type' => $type,
      'contents' => $contents,
      'date' => date('c'),
      'edit_log' => array()
    );
    if (isset($json_main['object'][$no]['edit_log'])) {
      $save_data['edit_log'] = $json_main['object'][$no]['edit_log'];
    }
    $save_data['edit_log'][] = array (
        'user' => $json_main['object'][$no]['user'],
        'type' => $json_main['object'][$no]['type'],
        'contents' => $json_main['object'][$no]['contents'],
        'date' => $json_main['object'][$no]['date'],
    );
    // IPv4 > int 変換
    $save_data['i'] = ip_hex();
    $json_main['l_date'] = date('c'); // データを更新
    $json_main['object'][$no] = $save_data; // データ追加

  }
}

// ----- ディレクトリ一覧を取得 -----
function GetDir() {
  $rdir_list = scandir("./".BBS_FOLDER."/");
  $ret_arr=array(); // 戻り値用の変数を初期化
  $count_s = count($rdir_list); // 存在数を変数に代入しておく
  for ($i=2; $i < $count_s; ++$i) { // ,/, ../ を含むので$i=2
    if (is_dir("./".BBS_FOLDER."/".$rdir_list[$i]) && !is_file("./".BBS_FOLDER."/".$rdir_list[$i]."/".PROTECTED_ROOM)) { // ディレクトリ, アクセス可能か
      $latest = latestMes($rdir_list[$i], false);
      if(is_file($latest[0])) { // Room名があればその名前を、他はディレクトリ名
        $l_meth = $latest[0];
      } else {
        $l_meth = "./".BBS_FOLDER."/".$rdir_list[$i];
      }
      $ret_arr[] = array(
        'dir_name' => $rdir_list[$i],
        'room_name' => GetRoomName($rdir_list[$i]),
        'l_date' => date("YmdHis" ,filemtime($l_meth)),
        'thread' => $latest[1]
      );
    }
  }
  return $ret_arr;
}

// ----- RoomNameを取得する -----
function GetRoomName($dir) {
  $l_file = latestMes($dir, false)[0];
  if(is_file($l_file) && filesize($l_file) > 0) {
    $open_json = fopen($l_file, 'r');
    $read_json = fread($open_json, filesize($l_file));
    fclose($open_json);
    $read_json = mb_convert_encoding($read_json, 'UTF8', 'ASCII,JIS,UTF-8,EUC-JP,SJIS-WIN');
    $get_name_json = json_decode( $read_json, true); // JSONファイルを連想配列でデコード
    if (!isset($get_name_json["room_name"])) return $dir;
    return $get_name_json["room_name"];
  } else {
    return $dir;
  }
}

// ----- ルーム(作成/編集) -----
function SetRoom($mode, $name, $room, $new_name, $new_descr) {
  if ($mode === '1') { // 編集モード
    if (is_dir("./".BBS_FOLDER."/".$room) && !is_file("./".BBS_FOLDER."/".$room."/".PROTECTED_ROOM)) { // アクセスしてよいか
      $save_f = latestMes($room, false)[0];
      if ($save_f) {
        // JSONファイル更新
        $open_json = fopen($save_f, 'r');
        $read_json2 = fread($open_json, filesize($save_f));
        fclose($open_json);
        $read_json2 = mb_convert_encoding($read_json2, 'UTF8', 'ASCII,JIS,UTF-8,EUC-JP,SJIS-WIN');
        $json_main2 = json_decode( $read_json2, true); // JSONファイルを連想配列でデコード
        // キーが存在しない場合の処理
        if (!array_key_exists('room_name', $json_main2)) $json_main2['room_name'] = $room;
        if (!array_key_exists('l_date', $json_main2)) $json_main2['l_date'] = date('c');
        if (!array_key_exists('thread', $json_main2)) $json_main2['thread'] = latestMes($room, false)[1];
        if (!array_key_exists('object', $json_main2)) $json_main2['object'] = array();
        if (!array_key_exists('descr', $json_main2)) $json_main2['descr'] = '';
        $up_log = array(
          'user' => $name,
          'type' => 'log',
          'contents' => 'Log: ChangeRoomSetting'."\r\n".'Old:'.$json_main2['room_name']."\t".$json_main2['descr']."\r\n".'New:'.$new_name."\t".$new_descr,
          'date' => date('c'),
          'i' => ip_hex()
        );
        $json_main2['object'][] = $up_log;
        $json_main2['room_name'] = $new_name;
        $json_main2['descr'] = $new_descr;
        $open_json = fopen($save_f, 'w');
        $write_stat = fwrite($open_json, json_encode($json_main2, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE));
        fclose($open_json);
        // file_put_contents($save_f2, json_encode($json_main2, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE)); // ファイル上書き保存, LOCK_EXだと同時接続不可説
        if ($write_stat === false) {
          echo 'ERROR: Unwritable';
        } else {
          echo 'ok';
        }
        exit;
      }
    }
  } elseif ($mode === '2') { // 作成モード
    $new_folder_no = false; // 最大Room数を超えてforを抜けてしまった時、Roomが作成されるのを防止
    $count_s = count(scandir("./".BBS_FOLDER."/"));
    for($i=$count_s; $i>0; --$i) {
      if(is_dir("./".BBS_FOLDER."/".$i)) {
        $new_folder_no = $i+1;
      break;
      }
    }
    if ($new_folder_no) {
      mkdir("./".BBS_FOLDER."/".$new_folder_no, DEFAULT_PERMISSION);
      if (is_dir("./".BBS_FOLDER."/".$new_folder_no)) {
        $json_main = array(
          'room_name' => $new_name,
          'l_date' => date('c'),
          'thread' => 0,
          'object' => array(),
          'descr' => $new_descr
        );
        // データを追加して保存
        $up_log = array(
          'user' => $name,
          'type' => 'log',
          'contents' => 'Log: CreateRoom'."\r\n".'New:'.$new_name."\t".$new_descr,
          'date' => date('c'),
          'i' => ip_hex()
        );
        $json_main['object'][] = $up_log;
        $save_f2 = "./".BBS_FOLDER."/".$new_folder_no."/".SAVEFILE_NAME.'0'.SAVEFILE_EXTE;
        $open_json = fopen($save_f2, 'w');
        $write_stat = fwrite($open_json, json_encode($json_main, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE));
        fclose($open_json);
        // file_put_contents($save_f2, json_encode($json_main, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE)); // ファイル上書き保存
        if ($write_stat === false) {
          echo 'ERROR: Unwritable';
        } else {
          echo 'ok';
        }
        chmod($save_f2, DEFAULT_PERMISSION);
        exit;
      }
    }
  }
  echo 'error';
}

// ----- ルーム削除 PROTECTEDファイル作成 -----
function DelRoom($room, $name) {
  if (is_dir("./".BBS_FOLDER."/".$room."/") && $room != MAIN_ROOM_DIR) { // mainのRoomは不可
    touch("./".BBS_FOLDER."/".$room."/".PROTECTED_ROOM);
    $put_log = 'Room protected';
    AddMes($room, $name, 'log', $put_log, false); // バックアップファイルにログを追加
    chmod("./".BBS_FOLDER."/".$room."/", DEFAULT_PERMISSION);
    echo 'ok';
  } else {
    echo 'error';
  }
}

// ----- 特殊文字エスケープ処理 -----
function esc($text, $mode) { // mode=1 : basename()+htmlspecial~~, else : htmlspecialchats
  if ($mode === 1) {
    return basename(htmlspecialchars($text, ENT_QUOTES, "UTF-8"));
  } else {
    return htmlspecialchars($text, ENT_QUOTES, "UTF-8");
  }
}

// ----- 最新のメッセージファイルを調べる -----
function latestMes($room, $mode_back) { // $mode_back = true の時、バックアップを探す
  if (is_dir("./".BBS_FOLDER."/".$room."/")) {
    $rdir_list2 = scandir("./".BBS_FOLDER."/".$room."/");
    $count_s = count($rdir_list2); // ファイル数を変数に代入しておく
    if ($mode_back === false) {
      for ($i=$count_s; $i !== -1; --$i) {
        if(is_file("./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.$i.SAVEFILE_EXTE)) {
          return ["./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.$i.SAVEFILE_EXTE, $i];
        }
      }
    } else {
      for ($i=$count_s; $i !== -1; --$i) {
        if(is_file("./".BBS_FOLDER."/".$room."/".SAVEFILE2_NAME.$i.SAVEFILE2_EXTE)) {
          return ["./".BBS_FOLDER."/".$room."/".SAVEFILE2_NAME.$i.SAVEFILE2_EXTE, $i];
        }
      }
    }
  }
  // return ["ERROR: File does not exist."];
  return 0;
}

// ----- ファイルを自動分割する -----
function autoSplit($room) {
  $l_file = latestMes($room, false);
  if(filesize($l_file[0]) >= SPLIT_SIZE) {
    $open_json = fopen($l_file[0], 'r');
    $read_json = fread($open_json, filesize($l_file[0]));
    fclose($open_json);
    $read_json = mb_convert_encoding(($read_json), 'UTF8', 'ASCII,JIS,UTF-8,EUC-JP,SJIS-WIN');
    $json_main = json_decode( $read_json, true); // JSONファイルを連想配列でデコード
    $n_format = array ( // 設定などを前のthreadから引き継ぐ
      'room_name' => $json_main["room_name"],
      'l_date' => date('c'),
      'object' => array(),
      'descr' => $json_main["descr"],
      'thread' => $l_file[1]+1
    );
    $open_json = fopen("./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.($l_file[1]+1).SAVEFILE_EXTE, 'w');
    $write_stat = fwrite($open_json, json_encode($n_format, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE));
    fclose($open_json);
    chmod("./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.($l_file[1]+1).SAVEFILE_EXTE, DEFAULT_PERMISSION);
    // file_put_contents("./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.($l_file[1]+1).SAVEFILE_EXTE, json_encode($n_format, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE));
  }
}

// ----- IPの'.'で分解して16進数変換した値を返す
function ip_hex() {
      // IPv4 > '.'で分解し、16進数に変換
      $ip_p = explode('.',$_SERVER["REMOTE_ADDR"]);
      $ip_hex="";
      foreach($ip_p as $val) {
        $ip_hex = $ip_hex.'.'.dechex($val);
      }
      unset($val);
  return $ip_hex;
}

// ----- SSE RoomListの更新を監視します
function SseDir() {
  while (ob_get_level()) { ob_end_clean(); }
  $oldDir = GetDir();
  // echo 'data: '.json_encode($oldDir, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE)."\n\n";
  // ob_flush();
  // flush();
  $counter = 0;
  // while (!connection_aborted()) { // 接続中は継続
  while (true) { // 接続中は継続
      $nowDir = GetDir();
    if ($oldDir !== $nowDir) {
      echo 'data: '.json_encode($nowDir, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE)."\n\n";
      ob_flush();
      flush();
      $oldDir = $nowDir;
      $counter = 0;
    } else {
      ++$counter;
    }
    if ($counter*CK_TIMING < CK_UP*60) {
      if ($counter%5 === 4) {
        echo ':'."\n\n"; // KeepStream
        ob_flush();
        flush();
      }
      sleep(CK_TIMING);
    } else {
      echo ':'."\n\n"; // KeepStream
      ob_flush();
      flush();
      sleep(CK_TIMING*CK_TIMING);
    }
  }
}
// ----- SSE メッセージの更新を監視します (使わない予定の関数)
function SseMes($room) {
    // echo file_get_contents("./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.SAVEFILE_EXTE);
    $file_n = latestMes($room, false)[0];
    if(is_file($file_n) && !is_file("./".BBS_FOLDER."/".$room."/".PROTECTED_ROOM)) {
      while (ob_get_level()) { ob_end_clean(); }
      // $open_json = fopen($file_n, 'r');
      // $read_json = fread($open_json, filesize($file_n));
      // fclose($open_json);
      // echo 'data: '.$read_json."\n\n";
      // ob_flush();
      // flush();
/* $open_json = fopen($file_n, 'r'); $read_json = fread($open_json, filesize($file_n)); fclose($open_json);   // .htaccessを操作できずgzipできないサーバー向け
      header("Content-Encoding: gzip"); echo gzencode($read_json, 1); */
      $oldMes = filemtime($file_n);
      $counter = 0;
      while (!connection_aborted()) {
        $nowMes = filemtime($file_n);
        if ($oldMes !== $nowMes) {
          if(is_file($file_n) && !is_file("./".BBS_FOLDER."/".$room."/".PROTECTED_ROOM)) {
            $open_json = fopen($file_n, 'r');
            $read_json = fread($open_json, filesize($file_n));
            fclose($open_json);
            echo 'data: '.$read_json."\n\n";
            ob_flush();
            flush();
          } else {
            echo ':error'."\n\n";
            exit;
          }
          $oldMes = $nowMes;
          $counter = 0;
        } else {
          ++$counter;
        }
        if ($counter < CK_UP*60) {
          if ($counter%5 === 4) {
            echo ':'."\n\n"; // KeepStream
            ob_flush();
            flush();
          }
          sleep(CK_TIMING);
        } else {
            echo ':'."\n\n"; // KeepStream
            ob_flush();
            flush();
          sleep(CK_TIMING*CK_TIMING);
        }
     }
  }
}
?>