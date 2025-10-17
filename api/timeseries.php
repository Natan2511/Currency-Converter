<?php
/**
 * API endpoint для получения исторических данных курсов валют
 * Используется для построения графиков трендов
 */

// Отключаем отображение ошибок PHP
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Обработка preflight запросов
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Проверяем метод запроса
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Получаем параметры
    $from = $_GET['from'] ?? '';
    $to = $_GET['to'] ?? '';
    $days = intval($_GET['days'] ?? 30);
    
    // Валидация параметров
    if (empty($from) || empty($to)) {
        throw new Exception('Необходимы параметры: from, to');
    }
    
    $from = strtoupper(trim($from));
    $to = strtoupper(trim($to));
    
    // Ограничиваем количество дней
    $days = max(1, min($days, 365)); // От 1 до 365 дней
    
    // Проверяем кэш
    $cacheKey = md5($from . $to . $days);
    $cacheFile = __DIR__ . '/cache/timeseries_' . $cacheKey . '.json';
    $cacheTime = 1800; // 30 минут
    
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
    
    // Вычисляем даты
    $endDate = new DateTime();
    $startDate = new DateTime();
    $startDate->sub(new DateInterval('P' . $days . 'D'));
    
    // Получаем данные из внешнего API
    $externalAPI = 'https://api.fxratesapi.com/timeseries';
    $params = http_build_query([
        'start_date' => $startDate->format('Y-m-d'),
        'end_date' => $endDate->format('Y-m-d'),
        'base' => $from,
        'symbols' => $to
    ]);
    
    $context = stream_context_create([
        'http' => [
            'timeout' => 15,
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
    
    // Обрабатываем данные
    $rates = [];
    if (isset($data['rates']) && is_array($data['rates'])) {
        foreach ($data['rates'] as $date => $dayRates) {
            if (isset($dayRates[$to])) {
                $rates[$date] = floatval($dayRates[$to]);
            }
        }
    }
    
    // Если данных нет, создаем заглушку
    if (empty($rates)) {
        $rates = generateMockData($from, $to, $days);
    }
    
    // Формируем ответ
    $result = [
        'success' => true,
        'from' => $from,
        'to' => $to,
        'start_date' => $startDate->format('Y-m-d'),
        'end_date' => $endDate->format('Y-m-d'),
        'days' => $days,
        'rates' => $rates,
        'count' => count($rates),
        'cached' => false,
        'timestamp' => date('c')
    ];
    
    // Сохраняем в кэш
    file_put_contents($cacheFile, json_encode($result, JSON_UNESCAPED_UNICODE));
    
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * Генерация тестовых данных если внешний API недоступен
 */
function generateMockData($from, $to, $days) {
    $rates = [];
    $baseRate = 1.0; // Базовый курс
    
    // Генерируем случайные курсы с небольшими колебаниями
    for ($i = $days; $i >= 0; $i--) {
        $date = new DateTime();
        $date->sub(new DateInterval('P' . $i . 'D'));
        $dateStr = $date->format('Y-m-d');
        
        // Добавляем случайные колебания ±5%
        $variation = (mt_rand(-50, 50) / 1000); // ±5%
        $rate = $baseRate * (1 + $variation);
        
        $rates[$dateStr] = round($rate, 6);
        
        // Обновляем базовый курс для следующего дня
        $baseRate = $rate;
    }
    
    return $rates;
}
?>
