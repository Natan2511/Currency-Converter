<?php
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['status' => 'PHP работает!', 'timestamp' => date('c')]);
?>
