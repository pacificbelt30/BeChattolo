<?php
/*
Beちゃっとぉ
2020 Fukuda-B/Dakhuf

// ----- 予定 -----
アプリ版を作る
コマンドに対応する
通知 (設定できるようにする)
# ハッシュグに対応

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
Ver.0.7
複数のチャットが使えるようにする
\chat
\chat\bbs\main
\chat\bbs\xx
<bbs.txt
<bbb.dat
<data.dat
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

// ----- PHP設定 -----
// ini_set("max_execution_time",240); // 最大タイムアウト時間の指定

// ----- 定数定義 -----
define("HOLDING_TIMER", "1"); // リクエストの保持ループ回数
define("TIMER_DENOMINATOR", "0"); // 更新チェック実行間隔(s)
//>> (HOLDING_TIMER×TIMER_DENOMINATOR≠保持時間(s))

// ----- 変数 -----
// メッセージデータ全体を入れる親ディレクトリ
$bbs_folder = 'bbs';
// 共通用のメッセージを入れるディレクトリ
$main_folder = 'main';
// 保存用のファイルの名前のつけ方と拡張子の形式
$save_file_n = 'bbs';
$save_file_k = '.txt';
$save2_file_n = 'bbb';
$save2_file_k = '.dat';
// 個別メッセージの名前とパスを入れる (直接アクセスできてしまうので今後データベース処理/ハッシュ値にするかも)
$save_mdata = 'mdata';
// サーバで処理を持つループ処理のBreakフラグ
$break_flag = 0;

// タイムゾーン指定 (Asia/Tokyo)
date_default_timezone_set('Asia/Tokyo');
// header("Access-Control-Allow-Origin: *"); // CORS対策

// ----- メイン処理 -----
// ----- メッセージがPOSTされたとき -----
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  if (isset($_POST['dir']) && file_exists("./".$bbs_folder.
      "/".basename($_POST['dir']).
      "/".$save_mdata) && file_exists("./".$bbs_folder.
      "/".basename($_POST['dir']).
      "/".$save_file_n.$save_file_k)&& file_exists("./".$bbs_folder.
      "/".basename($_POST['dir']).
      "/".$save2_file_n.$save2_file_k) || isset($_POST['dir']) && file_exists("./".$bbs_folder.
      "/".basename($_POST['dir']).
      "/".$save_mdata) && isset($_POST['b_send']))  { // dir(SEND先が設定されているか)
    $dir_name = basename(htmlspecialchars($_POST['dir'], ENT_QUOTES, "UTF-8"));
    if (isset($_POST['b_send'])) {
      if (isset($_POST['user'])) { // ユーザー名が設定されているか
        $userN = htmlspecialchars($_POST['user'], ENT_QUOTES, "UTF-8");
      } else {
        $userN = 'Anonym';
      }
      $put_data = htmlspecialchars($_POST['b_send'], ENT_QUOTES, "UTF-8");
      $push_data = $put_data.
      "\t".$userN.
      "\t".date('Y-m-d H:i:s').
      "\n";
      $push_data2 = $put_data.
      "\t".$userN.
      "\t".date('Y-m-d H:i:s').
      "\t".$_SERVER["REMOTE_ADDR"].
      "\n";
      $file_dir_n = "./".$bbs_folder.
      "/".$dir_name. // メインのファイル
      "/".$save_file_n.$save_file_k;
      $file2_dir_n = "./".$bbs_folder.
      "/".$dir_name. // バックアップ
      "/".$save2_file_n.$save2_file_k;
      // FilePush
      file_put_contents($file_dir_n, $push_data, FILE_APPEND | LOCK_EX);
      file_put_contents($file2_dir_n, $push_data2, FILE_APPEND | LOCK_EX);
      if (file_exists("./".$bbs_folder.
          "/".$dir_name.
          "/".$save_mdata)) {
        $mdata_data = explode("\t", file_get_contents("./".$bbs_folder.
          "/".$dir_name.
          "/".$save_mdata)); // \tで区切ってmdataを代入
        echo $mdata_data[1].
        "\t";
      } else {
        echo $dir_name.
        "\t";
      }
      echo date("YmdHis", filemtime($file_dir_n)).
      "\n".file_get_contents($file_dir_n);

      // ----- メッセージがREQUESTされたとき -----
    }
    elseif(isset($_POST['b_req'])) {
      $file_dir_n = "./".$bbs_folder.
      "/".basename($_POST['dir']). // メインのファイル
      "/".$save_file_n.$save_file_k;
      if (isset($_POST["last_date"]) && $_POST['b_req'] !== 'bbb' && file_exists($file_dir_n)) { // 前の更新日時と同じとき、再送しない
        // サーバでリクエストの保持
        $rec_date = $_POST["last_date"];
        for ($i = 0; $i < HOLDING_TIMER; $i++) { // REQUESTの保持ループ
          clearstatcache(false, $file_dir_n);
          $file_date = date("YmdHis", filemtime($file_dir_n));
          if ($rec_date != $file_date) { // 更新があったら内容出力
            $break_flag = 1;
            break;
          }
          sleep(TIMER_DENOMINATOR);
        }
        if ($break_flag === 0) {
          echo 'B';
          exit;
        } else {
          if (file_exists("./".$bbs_folder.
              "/".$dir_name.
              "/".$save_mdata)) {
            $mdata_data = explode("\t", file_get_contents("./".$bbs_folder.
              "/".$dir_name.
              "/".$save_mdata)); // \tで区切ってmdataを代入
            echo $mdata_data[1].
            "\t";
          } else {
            echo $dir_name.
            "\t";
          }
          echo date("YmdHis", filemtime($file_dir_n)).
          "\n".file_get_contents($file_dir_n);
          exit;
        }
      } else {
        // 初回ロード時など、即レスポンスする
        if (file_exists("./".$bbs_folder.
            "/".$dir_name.
            "/".$save_mdata)) {
          $mdata_data = explode("\t", file_get_contents("./".$bbs_folder.
            "/".$dir_name.
            "/".$save_mdata)); // \tで区切ってmdataを代入
          echo $mdata_data[1].
          "\t";
        } else {
          echo $dir_name.
          "\t";
        }
        echo date("YmdHis", filemtime($file_dir_n)).
        "\n".file_get_contents($file_dir_n);
        exit;
      }
    }
  }
  elseif(null !== $_POST['b_req']) {
    if ($_POST['b_req'] == 'βββ') { // ディレクトリリストがリクエストされたとき、存在するフォルダ一覧を返す
      $rdir_list = scandir("./".$bbs_folder.
        "/");
      for ($i = 2; $i < count($rdir_list); $i++) {
        if (is_dir("./".$bbs_folder.
            "/".$rdir_list[$i])) {
          echo basename("./".$bbs_folder.
            "/".$rdir_list[$i]).
          "\t";
          if (file_exists("./".$bbs_folder.
              "/".$rdir_list[$i].
              "/".$save_mdata)) {
            $mdata_data = explode("\t", file_get_contents("./".$bbs_folder.
              "/".$rdir_list[$i].
              "/".$save_mdata)); // \tで区切ってmdataを代入
            echo $mdata_data[0].
            "\n";
          } else {
            echo basename("./".$bbs_folder.
              "/".$rdir_list[$i]).
            "\n";
          }
        }
      }
    } else { // そもそもメッセージが存在しない場合 β+RoomDescriptionを返す
      if(file_exists("./".$bbs_folder.
      "/".basename(htmlspecialchars($_POST['dir'], ENT_QUOTES, "UTF-8")).
      "/".$save_mdata)) {
        $mdata_data = explode("\t", file_get_contents("./".$bbs_folder.
        "/".basename(htmlspecialchars($_POST['dir'], ENT_QUOTES, "UTF-8")).
        "/".$save_mdata)); // \tで区切ってmdataを代入
        echo 'β'."\t".$mdata_data[1];
      } else {
        echo 'β';
      }
      exit;
    }
  } else {
    echo 'ERROR';
    exit;
  }
}

?>