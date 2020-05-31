<?php
date_default_timezone_set('Asia/Tokyo');

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


if($_SERVER['REQUEST_METHOD'] === 'POST') {
  if(isset($_POST['mode'])&&isset($_POST['user'])&&isset($_POST['room_n'])&&isset($_POST['new_name'])&&isset($_POST['new_descr'])) {
    if ($_POST['new_name'] != 'main' && strpos($_POST['new_name'],'$')===false &&strpos($_POST['new_name'],'%')===false &&strpos($_POST['new_name'],'&')===false) {
      $mode = $_POST['mode'];
      $user = $_POST['user'];
      $room_n = basename($_POST['room_n']);
      $new_name = htmlspecialchars($_POST['new_name'], ENT_QUOTES, "UTF-8");
      $new_descr = htmlspecialchars($_POST['new_descr'], ENT_QUOTES, "UTF-8");

      if($mode == 1) { // 編集モード
        if (file_exists("./".$bbs_folder."/".$room_n)) {
          if (file_exists("./".$bbs_folder."/".$room_n."/mdata")) {
            $put_data = $new_name."\t".$new_descr;
            $put_data2 = $mode."\t".$user."\t".$room_n."\t".$new_name."\t".$new_descr;
            file_put_contents("./".$bbs_folder."/".$room_n."/mdata", $put_data);
            file_put_contents("./".$bbs_folder."/".$room_n."/log",$put_data2);
            echo 'ok';
            exit;
          }
        }
      } elseif ($mode == 2) { // 作成モード
        $new_folder_no = false;
        for($i=1; $i<21474836; $i++) {
          if(!file_exists("./".$bbs_folder."/".$i)) {
            $new_folder_no = $i;
          break;
          }
        }
        if ($new_folder_no) {
          mkdir("./".$bbs_folder."/".$new_folder_no, 0777);
          if (file_exists("./".$bbs_folder."/".$new_folder_no)) {
            $put_data = $new_name."\t".$new_descr;
            $put_data2 = $mode."\t".$user."\t".$room_n."\t".$new_name."\t".$new_descr;
            file_put_contents("./".$bbs_folder."/".$new_folder_no."/mdata", $put_data);
            file_put_contents("./".$bbs_folder."/".$room_n."/log",$put_data2);
            echo 'ok';
            exit;
          }
        }
      }
    }
  }
}
echo 'error';
?>