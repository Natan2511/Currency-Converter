<?php
/**
 * API endpoint для конвертации валют
 * Принимает параметры from, to, amount и возвращает результат конвертации
 */

// Отключаем отображение ошибок PHP
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Обработка preflight запросов
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Проверяем метод запроса
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST'])) {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Получаем параметры
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $from = $input['from'] ?? '';
        $to = $input['to'] ?? '';
        $amount = $input['amount'] ?? '';
    } else {
        $from = $_GET['from'] ?? '';
        $to = $_GET['to'] ?? '';
        $amount = $_GET['amount'] ?? '';
    }
    
    // Валидация параметров
    if (empty($from) || empty($to) || empty($amount)) {
        throw new Exception('Необходимы параметры: from, to, amount');
    }
    
    $from = strtoupper(trim($from));
    $to = strtoupper(trim($to));
    $amount = floatval($amount);
    
    if ($amount <= 0) {
        throw new Exception('Сумма должна быть больше нуля');
    }
    
    if ($from === $to) {
        throw new Exception('Исходная и целевая валюты не могут быть одинаковыми');
    }
    
    // Проверяем кэш для этой конвертации
    $cacheKey = md5($from . $to . $amount);
    $cacheFile = __DIR__ . '/cache/convert_' . $cacheKey . '.json';
    $cacheTime = 300; // 5 минут
    
    // Создаем папку для кэша если её нет
    if (!file_exists(dirname($cacheFile))) {
        mkdir(dirname($cacheFile), 0755, true);
    }
    
    // Проверяем кэш
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTime) {
        $cachedData = file_get_contents($cacheFile);
        if ($cachedData) {
            $cached = json_decode($cachedData, true);
            $cached['cached'] = true;
            echo json_encode($cached, JSON_UNESCAPED_UNICODE);
            exit();
        }
    }
    
    // Получаем данные из внешнего API
    $externalAPI = 'https://api.fxratesapi.com/convert';
    $params = http_build_query([
        'from' => $from,
        'to' => $to,
        'amount' => $amount
    ]);
    
    $context = stream_context_create([
        'http' => [
            'timeout' => 10,
            'user_agent' => 'Currency Converter App/1.0'
        ]
    ]);
    
    $response = file_get_contents($externalAPI . '?' . $params, false, $context);
    
    if ($response === false) {
        throw new Exception('Не удалось получить данные от внешнего API');
    }
    
    $data = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Ошибка парсинга JSON ответа');
    }
    
    if (!isset($data['success']) || !$data['success']) {
        throw new Exception('Внешний API вернул ошибку: ' . ($data['error'] ?? 'Неизвестная ошибка'));
    }
    
    // Формируем ответ
    $result = [
        'success' => true,
        'from' => $data['query']['from'],
        'to' => $data['query']['to'],
        'amount' => $data['query']['amount'],
        'result' => $data['result'],
        'rate' => $data['info']['rate'],
        'date' => date('c'),
        'cached' => false
    ];
    
    // Сохраняем в кэш
    file_put_contents($cacheFile, json_encode($result, JSON_UNESCAPED_UNICODE));
    
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    
    } catch (Exception $e) {
        // Fallback на фиксированные курсы
        $rates = [
            'USD' => 1.0,
            'EUR' => 0.85,
            'GBP' => 0.73,
            'JPY' => 110.0,
            'CHF' => 0.92,
            'CAD' => 1.25,
            'AUD' => 1.35,
            'CNY' => 6.45,
            'RUB' => 75.0,
            'INR' => 74.0,
            'BRL' => 5.2,
            'KRW' => 1180.0,
            'MXN' => 20.0,
            'SGD' => 1.35,
            'HKD' => 7.8,
            'NOK' => 8.5,
            'SEK' => 8.7,
            'DKK' => 6.3,
            'PLN' => 3.9,
            'CZK' => 21.5
        ];
        
        if (!isset($rates[$from]) || !isset($rates[$to])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Валюта не поддерживается в демо режиме',
                'timestamp' => date('c')
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }
        
        $rate = $rates[$to] / $rates[$from];
        $result = $amount * $rate;
        
        $response = [
            'success' => true,
            'from' => $from,
            'to' => $to,
            'amount' => $amount,
            'result' => round($result, 2),
            'rate' => round($rate, 6),
            'date' => date('c'),
            'cached' => false,
            'fallback' => true
        ];
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
    }
?>
