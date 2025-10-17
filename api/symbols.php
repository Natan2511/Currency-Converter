<?php
/**
 * API endpoint для получения списка доступных валют
 * Возвращает JSON с символами валют из внешнего API с кэшированием
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
    // Настройки кэширования
    $cacheFile = __DIR__ . '/cache/symbols.json';
    $cacheTime = 3600; // 1 час
    
    // Создаем папку для кэша если её нет
    if (!file_exists(dirname($cacheFile))) {
        mkdir(dirname($cacheFile), 0755, true);
    }
    
    // Проверяем кэш
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTime) {
        $cachedData = file_get_contents($cacheFile);
        if ($cachedData) {
            echo $cachedData;
            exit();
        }
    }
    
    // Получаем данные из внешнего API
    $externalAPI = 'https://api.fxratesapi.com/symbols';
    $context = stream_context_create([
        'http' => [
            'timeout' => 10,
            'user_agent' => 'Currency Converter App/1.0'
        ]
    ]);
    
    $response = file_get_contents($externalAPI, false, $context);
    
    if ($response === false) {
        throw new Exception('Не удалось получить данные от внешнего API');
    }
    
    $data = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Ошибка парсинга JSON ответа');
    }
    
    if (!isset($data['success']) || !$data['success']) {
        $errorMessage = isset($data['error']) ? (is_array($data['error']) ? json_encode($data['error']) : $data['error']) : 'Неизвестная ошибка';
        throw new Exception('Внешний API вернул ошибку: ' . $errorMessage);
    }
    
    // Формируем ответ
    $result = [
        'success' => true,
        'symbols' => $data['symbols'] ?? [],
        'cached' => false,
        'timestamp' => date('c')
    ];
    
    // Сохраняем в кэш
    file_put_contents($cacheFile, json_encode($result, JSON_UNESCAPED_UNICODE));
    
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    
    } catch (Exception $e) {
        // Fallback на базовые валюты
        $fallbackSymbols = [
            'USD' => ['description' => 'US Dollar', 'symbol' => '$'],
            'EUR' => ['description' => 'Euro', 'symbol' => '€'],
            'GBP' => ['description' => 'British Pound', 'symbol' => '£'],
            'JPY' => ['description' => 'Japanese Yen', 'symbol' => '¥'],
            'CHF' => ['description' => 'Swiss Franc', 'symbol' => 'CHF'],
            'CAD' => ['description' => 'Canadian Dollar', 'symbol' => 'C$'],
            'AUD' => ['description' => 'Australian Dollar', 'symbol' => 'A$'],
            'CNY' => ['description' => 'Chinese Yuan', 'symbol' => '¥'],
            'RUB' => ['description' => 'Russian Ruble', 'symbol' => '₽'],
            'INR' => ['description' => 'Indian Rupee', 'symbol' => '₹'],
            'BRL' => ['description' => 'Brazilian Real', 'symbol' => 'R$'],
            'KRW' => ['description' => 'South Korean Won', 'symbol' => '₩'],
            'MXN' => ['description' => 'Mexican Peso', 'symbol' => '$'],
            'SGD' => ['description' => 'Singapore Dollar', 'symbol' => 'S$'],
            'HKD' => ['description' => 'Hong Kong Dollar', 'symbol' => 'HK$'],
            'NOK' => ['description' => 'Norwegian Krone', 'symbol' => 'kr'],
            'SEK' => ['description' => 'Swedish Krona', 'symbol' => 'kr'],
            'DKK' => ['description' => 'Danish Krone', 'symbol' => 'kr'],
            'PLN' => ['description' => 'Polish Zloty', 'symbol' => 'zł'],
            'CZK' => ['description' => 'Czech Koruna', 'symbol' => 'Kč'],
            'TL' => ['description' => 'Turkish Lira', 'symbol' => '₺'],
            'UA' => ['description' => 'Ukrainian Hryvnia', 'symbol' => '₴']
        ];
        
        $result = [
            'success' => true,
            'symbols' => $fallbackSymbols,
            'cached' => false,
            'timestamp' => date('c'),
            'fallback' => true
        ];
        
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
    }
?>
