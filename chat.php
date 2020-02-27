<?php
$save_file = 'bbs.txt';
$save2_file = 'bbb.dat';

// タイムゾーン指定 (Asia/Tokyo)
date_default_timezone_set('Asia/Tokyo');
header("Access-Control-Allow-Origin: *"); // CORS対策


if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['b_send'])) {
  $put_data = htmlspecialchars($_POST['b_send'], ENT_QUOTES, "UTF-8");
/*  $push_data = array("data" => array(
  )) */
  $push_data = $put_data."\t".date('Y-m-d H:i:s')."\n";
  $push_data2 = $put_data."\t".date('Y-m-d H:i:s')."\t".$_SERVER["REMOTE_ADDR"]."\n";
  file_put_contents($save_file, $push_data, FILE_APPEND | LOCK_EX);
  file_put_contents($save2_file, $push_data2, FILE_APPEND | LOCK_EX);
  echo file_get_contents($save_file);
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['b_req'])) {
  echo file_get_contents($save_file);
}
/*
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['req'])) { //  POSTでreqが指定されている場合続行
  if ($_POST['req'] == 'B!' && isset($_POST['call'])){ // データリクエスト時
    echo_data(); // 出力
  } elseif ($_POST['req' == 'Bee' && isset())
}
*/
?>