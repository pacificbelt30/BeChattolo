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
  if(isset($_POST["last_date"])) {
    // if($_COOKIE["last_date"] === filemtime($save_file)) {
/*    if($_POST["last_date"] == date("ymdHis",filemtime($save_file))) {
        echo 'B';
    } else {*/
      echo date("ymdHis",filemtime($save_file))."\n".file_get_contents($save_file);
/*    } */
  } else {
    echo date("ymdHis",filemtime($save_file))."\n".file_get_contents($save_file);
    // setcookie("last_date",filemtime($save_file),time()+60*60*24*365); //有効期限は1年
    $set_time = date("ymdHis",filemtime($save_file));
    setcookie("last_date",$set_time,time()+60*60*24*7);
  }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['b_req'])) {
  if(isset($_POST["last_date"]) && $_POST['b_req'] != 'bbb') { // 前の更新日時と同じとき、再送しない
    if($_POST["last_date"] == date("ymdHis",filemtime($save_file))) {
      echo 'B';
    } else {
      echo date("ymdHis",filemtime($save_file))."\n".file_get_contents($save_file);
    }
  } else {
    echo date("ymdHis",filemtime($save_file))."\n".file_get_contents($save_file);
    // setcookie("last_date","",time()-60*60*24*365);
    // $set_time = date("ymdHis",filemtime($save_file));
    // setcookie("last_date",$set_time,time()+60*60*24*365); //有効期限は1年
    // setcookie("last_date",$set_time,time()+60*60*24*7);
  }
}
/*
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['req'])) { //  POSTでreqが指定されている場合続行
  if ($_POST['req'] == 'B!' && isset($_POST['call'])){ // データリクエスト時
    echo_data(); // 出力
  } elseif ($_POST['req' == 'Bee' && isset())
}
*/
?>