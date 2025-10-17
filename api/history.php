<?php
/**
 * API endpoint для управления историей конвертаций
 * GET - получение истории, POST - добавление записи, DELETE - очистка истории
 */

// Отключаем отображение ошибок PHP
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Обработка preflight запросов
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Проверяем метод запроса
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST', 'DELETE'])) {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    $dataFile = __DIR__ . '/data/history.json';
    $maxRecords = 50; // Максимальное количество записей
    
    // Создаем папку для данных если её нет
    if (!file_exists(dirname($dataFile))) {
        mkdir(dirname($dataFile), 0755, true);
    }
    
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            handleGetHistory($dataFile);
            break;
            
        case 'POST':
            handlePostHistory($dataFile, $maxRecords);
            break;
            
        case 'DELETE':
            handleDeleteHistory($dataFile);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * Обработка GET запроса - получение истории
 */
function handleGetHistory($dataFile) {
    $history = [];
    
    if (file_exists($dataFile)) {
        $content = file_get_contents($dataFile);
        if ($content) {
            $history = json_decode($content, true) ?: [];
        }
    }
    
    // Ограничиваем количество записей
    $history = array_slice($history, 0, 10);
    
    echo json_encode([
        'success' => true,
        'history' => $history,
        'count' => count($history),
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * Обработка POST запроса - добавление записи в историю
 */
function handlePostHistory($dataFile, $maxRecords) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Неверный JSON в теле запроса');
    }
    
    // Валидация обязательных полей
    $requiredFields = ['from', 'to', 'amount', 'result', 'rate'];
    foreach ($requiredFields as $field) {
        if (!isset($input[$field])) {
            throw new Exception("Отсутствует обязательное поле: $field");
        }
    }
    
    // Валидация данных
    $from = strtoupper(trim($input['from']));
    $to = strtoupper(trim($input['to']));
    $amount = floatval($input['amount']);
    $result = floatval($input['result']);
    $rate = floatval($input['rate']);
    
    if (empty($from) || empty($to)) {
        throw new Exception('Коды валют не могут быть пустыми');
    }
    
    if ($amount <= 0 || $result <= 0 || $rate <= 0) {
        throw new Exception('Суммы и курс должны быть больше нуля');
    }
    
    // Загружаем существующую историю
    $history = [];
    if (file_exists($dataFile)) {
        $content = file_get_contents($dataFile);
        if ($content) {
            $history = json_decode($content, true) ?: [];
        }
    }
    
    // Создаем новую запись
    $newRecord = [
        'id' => uniqid(),
        'from' => $from,
        'to' => $to,
        'amount' => $amount,
        'result' => $result,
        'rate' => $rate,
        'date' => $input['date'] ?? date('c'),
        'timestamp' => time()
    ];
    
    // Добавляем в начало массива
    array_unshift($history, $newRecord);
    
    // Ограничиваем количество записей
    if (count($history) > $maxRecords) {
        $history = array_slice($history, 0, $maxRecords);
    }
    
    // Сохраняем в файл
    $success = file_put_contents($dataFile, json_encode($history, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    
    if ($success === false) {
        throw new Exception('Не удалось сохранить запись в историю');
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Запись добавлена в историю',
        'record' => $newRecord,
        'total_records' => count($history),
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * Обработка DELETE запроса - очистка истории
 */
function handleDeleteHistory($dataFile) {
    // Удаляем файл истории
    if (file_exists($dataFile)) {
        $success = unlink($dataFile);
        if (!$success) {
            throw new Exception('Не удалось удалить файл истории');
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'История конвертаций очищена',
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE);
}
?>
