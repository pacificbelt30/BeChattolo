<?php
/*

ファイル置き場 5
Beちゃっとぉ

2020 Fukuda-B/Dakhuf

chat_v1.5

// ----- メモ -----
chat.php/edit.phpからの引き続ぎ
JSON化、関数化、WebAPI向けに修正


// ----- 予定 -----
画像
Roomの削除,非表示
メッセージの編集・削除
リクエストヘッダから更新日時を取得するか、PHPでまとめて全ルームを取得するか悩んでいる
シンタティックスハイライト(ソースコードの色付け)を導入
改行キーのオプション設定
Roomの非表示、非通知設定
既読を別のところ見ても残るようにする
チャットの設定で、名無しの時の名前の設定
通知は、Localstrageで行う
RoomEditの機能拡張
サーバへのリクエストをmain()/sub()で分けずにまとめて行う
アプリ版を作る
コマンドに対応する
通知 (設定できるようにする)
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

define("SPLIT_SIZE", 135673); // メッセージの分割条件のファイルサイズ 0xBBBB -> (OCT) Byte

// ----- 設定 -----
date_default_timezone_set('Asia/Tokyo');
// header("Access-Control-Allow-Origin: *"); // CORS

// ----- メイン処理 (分岐) -----
if($_SERVER['REQUEST_METHOD'] === 'POST') { // POSTでは全関数実行可能
  if(isset($_POST['req'])) {
    switch ($_POST['req']) {
      case 'add': // メッセージ追加
        header( "Content-Type: application/json; charset=utf-8" ); // JSONデータであることをヘッダ追加する
        AddMes(esc($_POST['room'],1), esc($_POST['name'],0), esc($_POST['type'],0), esc($_POST['contents'],0), false);
        AddMes(esc($_POST['room'],1), esc($_POST['name'],0), esc($_POST['type'],0), esc($_POST['contents'],0), true);
      break;
      case 'mes': // メッセージ取得
        header( "Content-Type: application/json; charset=utf-8" ); // JSONデータであることをヘッダ追加する
        if (isset($_POST['thread'])) { GetMes(esc($_POST['room'],1), esc($_POST['thread'],0)); } else {
          GetMes(esc($_POST['room'],1), false); }
      break;
      case 'dir': // ディレクトリ一覧&更新日時取得
        header( "Content-Type: application/json; charset=utf-8" ); // JSONデータであることをヘッダ追加する
        echo json_encode(GetDir(), JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE);
      break;
      case 'set': // ルーム(作成/編集)
        SetRoom(esc($_POST['mode'],0), esc($_POST['name'],0), esc($_POST['room'],1), esc($_POST['new_name'],0), esc($_POST['new_descr'],0));
      break;
      default:
        echo 'ERROR: No shuch request type.';
      break;
    }
  }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') { // GETではReadのみ
  if(isset($_GET['room'])) {
    if (isset($_GET['thread'])) {
      header( "Content-Type: application/json; charset=utf-8" ); // JSONデータであることをヘッダ追加する
      GetMes(esc($_GET['room'],1), esc($_GET['thread'],0));
    } else {
      header( "Content-Type: application/json; charset=utf-8" ); // JSONデータであることをヘッダ追加する
      GetMes(esc($_GET['room'],1), 0);
    }
  } elseif (isset($_GET['dir'])) {
    header( "Content-Type: application/json; charset=utf-8" ); // JSONデータであることをヘッダ追加する
    echo json_encode(GetDir(), JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE);
  }
}
exit;

// ----- メッセージを追加 -----
function AddMes($room, $name, $type, $contents, $mode_back) { // $mode_back=trueのとき、バックアップとして保存
  $save_d = "./".BBS_FOLDER."/".$room."/"; // 保存ディレクトリ
  if (!$name) $name = 'Anonym'; // 名無しの方は Anonym
  if (file_exists($save_d)) { // ディレクトリ確認
    if ($mode_back === true) {
      $save_f = latestMes($room, true)[0]; // メッセージのバックアップ保存ファイル
    } else {
      $save_f = latestMes($room, false)[0]; // メッセージ保存ファイル
    }
    if (file_exists($save_f)) { // 保存ファイルが既存の場合
      $read_json = mb_convert_encoding(file_get_contents($save_f), 'UTF8', 'ASCII,JIS,UTF-8,EUC-JP,SJIS-WIN');
      $json_main = json_decode( $read_json, true); // JSONファイルを連想配列でデコード
      // $json_main = json_decode($save_f); // JSONファイルを連想配列でデコード
    } else { // 保存ファイルが存在しない場合
      $save_f = "./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.'0'.SAVEFILE_EXTE;
      $json_main = array(
        'room_name' => $room,
        'l_date' => date('Y-m-d H:i:s'),
        'thread' => 0,
        'object' => array(),
        'descr' => ''
      );
    }
      $save_data = array( // 保存ファイルに追加するデータ
        'user' => $name,
        'type' => $type,
        'contents' => $contents,
        'date' => date('Y-m-d H:i:s')
      );
      if ($mode_back) {
        $save_data['ip'] = $_SERVER["REMOTE_ADDR"];
      }
      $json_main['l_date'] = date('Y-m-d H:i:s'); // データを更新
      $json_main['object'][] = $save_data; // データ追加
      // (array)$json_main["object"][] = $save_data; // データを追加
      // var_dump($json_main["object"]);
      // array_push($json_main["object"], $save_data);
      // file_put_contents($save_f, json_encode($json_main, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE), LOCK_EX); // ファイル上書き保存
      file_put_contents($save_f, json_encode($json_main, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE)); // ファイル上書き保存, LOCK_EXだと同時接続不可説

      echo file_get_contents($save_f); // ファイルを出力

  }
}

// ----- メッセージを取得 -----
function GetMes($room, $thread) { // $threadは分割されたスレッド番号(オプション) -> ない場合は最新のものを取得
  if($thread && is_int($thread)) {
    if(file_exists("./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.$thread.SAVEFILE_EXTE)) {
      echo file_get_contents("./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.$thread.SAVEFILE_EXTE);
    }
  } else {
    // echo file_get_contents("./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.SAVEFILE_EXTE);
    if(file_exists("./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.latestMes($room, false)[1].SAVEFILE_EXTE)) {
      echo file_get_contents(latestMes($room, false)[0]); // 最新のメッセージを表示
    }
  }
}

// ----- ディレクトリ一覧を取得 -----
function GetDir() {
  $rdir_list = scandir("./".BBS_FOLDER."/");
  $ret_arr=array(); // 戻り値用の変数を初期化
  for ($i=2; $i < count($rdir_list); $i++) { // ,/, ../ を含むので$i=2
    if (is_dir("./".BBS_FOLDER."/".$rdir_list[$i])) {
      if(file_exists("./".BBS_FOLDER."/".$rdir_list[$i]."/".SAVEFILE_NAME.latestMes($rdir_list[$i], false)[1].SAVEFILE_EXTE)) {
        $l_meth = "./".BBS_FOLDER."/".$rdir_list[$i]."/".SAVEFILE_NAME.latestMes($rdir_list[$i], false)[1].SAVEFILE_EXTE;
      } else {
        $l_meth = "./".BBS_FOLDER."/".$rdir_list[$i];
      }
      $ret_arr[] = array(
        'dir_name' => $rdir_list[$i],
        'room_name' => GetRoomName($rdir_list[$i]),
        'l_date' => date("YmdHis" ,filemtime($l_meth)),
        'thread' => latestMes($rdir_list[$i], false)[1]
      );
    }
  }
  return $ret_arr;
}

// ----- RoomNameを取得する -----
function GetRoomName($dir) {
  $l_file = latestMes($dir, false)[0];
  if(file_exists($l_file)) {
    $read_json = mb_convert_encoding(file_get_contents($l_file), 'UTF8', 'ASCII,JIS,UTF-8,EUC-JP,SJIS-WIN');
    $get_name_json = json_decode( $read_json, true); // JSONファイルを連想配列でデコード
    if (!isset($get_name_json["room_name"])) return $dir;
    return $get_name_json["room_name"];
  } else {
    return $dir;
  }
}

// ----- ルーム(作成/編集) -----
function SetRoom($mode, $name, $room, $new_name, $new_descr) {

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
  $rdir_list2 = scandir("./".BBS_FOLDER."/".$room."/");
  if ($mode_back === true) {
    for ($i=0; $i < count($rdir_list2); $i++) {
      if(!file_exists("./".BBS_FOLDER."/".$room."/".SAVEFILE2_NAME.$i.SAVEFILE2_EXTE) && $i !== 0) {
        return ["./".BBS_FOLDER."/".$room."/".SAVEFILE2_NAME.($i-1).SAVEFILE2_EXTE, ($i-1)];
      }
    }
  } else {
    for ($i=0; $i < count($rdir_list2); $i++) {
      if(!file_exists("./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.$i.SAVEFILE_EXTE) && $i !== 0) {
        return ["./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.($i-1).SAVEFILE_EXTE, ($i-1)];
      }
    }
  }
  return ["ERROR: File does not exist."];
}

// ----- ファイルを自動分割する -----
function autoSplit($room) {
  $l_file = latestMes($room, false);
  if(filesize($l_file[0]) >= SPLIT_SIZE) {
    $read_json = mb_convert_encoding($l_file[0], 'UTF8', 'ASCII,JIS,UTF-8,EUC-JP,SJIS-WIN');
    $json_main = json_decode($read_json , true);
    $n_format = array ( // 設定などを前のthreadから引き継ぐ
      'room_name' => $json_main["room_name"],
      'l_date' => date('Y-m-d H:i:s'),
      'acc' => $json_main["acc"],
      'onject' => ''
    );
    file_put_contents("./".BBS_FOLDER."/".$room."/".SAVEFILE_NAME.($l_file[1]+1).SAVEFILE_EXTE, $n_format);
    file_put_contents("./".BBS_FOLDER."/".$room."/".SAVEFILE2_NAME.($l_file[1]+1).SAVEFILE2_EXTE, $n_format);
  }
}
?>