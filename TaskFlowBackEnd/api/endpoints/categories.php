<?php
require_once __DIR__ . '/../core/BaseAPI.php';
require_once __DIR__ . '/../core/APIResponse.php';

class CategoriesAPI extends BaseAPI {
    public function __construct() {
        parent::__construct('apps_categories', 'category_id');
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'with_counts':
                $this->getCategoriesWithCounts();
                break;
            case 'reorder':
                $this->reorderCategories();
                break;
            default:
                parent::handleRequest();
        }
    }
    
    private function getCategoriesWithCounts() {
        try {
            $sql = "
                SELECT 
                    c.category_id,
                    c.category_name,
                    c.category_icon,
                    c.category_description,
                    c.display_order,
                    c.is_active,
                    c.created_at,
                    c.updated_at,
                    COUNT(a.app_id) as app_count
                FROM apps_categories c
                LEFT JOIN app_store_apps a ON c.category_id = a.category_id
                WHERE c.is_active = 1
                GROUP BY c.category_id
                ORDER BY c.display_order, c.category_name
            ";
            
            $result = $this->conn->query($sql);
            $categories = $result->fetch_all(MYSQLI_ASSOC);
            
            APIResponse::success($categories, 'Categories with app counts fetched successfully');
        } catch (Exception $e) {
            APIResponse::error('Failed to fetch categories: ' . $e->getMessage(), 500);
        }
    }
    
    private function reorderCategories() {
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
            APIResponse::error('Method not allowed', 405);
        }
        
        $input = $this->getJsonInput();
        $categories = $input['categories'] ?? [];
        
        if (empty($categories)) {
            APIResponse::error('Categories array is required', 400);
        }
        
        try {
            $this->conn->autocommit(false);
            
            foreach ($categories as $index => $categoryData) {
                $categoryId = $categoryData['category_id'];
                $displayOrder = $index + 1;
                
                $sql = "UPDATE apps_categories SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE category_id = ?";
                $stmt = $this->conn->prepare($sql);
                $stmt->bind_param("ii", $displayOrder, $categoryId);
                
                if (!$stmt->execute()) {
                    throw new Exception("Failed to update category $categoryId");
                }
            }
            
            $this->conn->commit();
            $this->conn->autocommit(true);
            
            APIResponse::success([], 'Categories reordered successfully');
        } catch (Exception $e) {
            $this->conn->rollback();
            $this->conn->autocommit(true);
            APIResponse::error('Failed to reorder categories: ' . $e->getMessage(), 500);
        }
    }
    
    protected function getAll($conditions = '', $params = []) {
        try {
            $sql = "SELECT * FROM {$this->table} WHERE is_active = 1 ORDER BY display_order, category_name";
            $result = $this->conn->query($sql);
            $categories = $result->fetch_all(MYSQLI_ASSOC);
            
            $this->sendSuccess(['data' => $categories, 'count' => count($categories)]);
        } catch (Exception $e) {
            $this->sendError('Failed to fetch categories: ' . $e->getMessage(), 500);
        }
    }
}

$api = new CategoriesAPI();
$api->handleRequest();
?>