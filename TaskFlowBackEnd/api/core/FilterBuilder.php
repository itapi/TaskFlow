<?php

/**
 * FilterBuilder - A robust, reusable filtering system for SQL queries
 * 
 * This class provides a flexible way to build WHERE clauses for SQL queries
 * with support for various operators, data types, and complex filtering scenarios.
 */
class FilterBuilder {
    private $filters = [];
    private $searchableFields = [];
    private $joins = [];
    private $havingConditions = [];
    private $sortOptions = [];
    private $defaultSort = [];
    
    // Supported filter operators
    const OPERATORS = [
        'eq' => '=',           // equal
        'ne' => '!=',          // not equal
        'gt' => '>',           // greater than
        'gte' => '>=',         // greater than or equal
        'lt' => '<',           // less than
        'lte' => '<=',         // less than or equal
        'like' => 'LIKE',      // pattern matching
        'not_like' => 'NOT LIKE', // negative pattern matching
        'in' => 'IN',          // in array
        'not_in' => 'NOT IN',  // not in array
        'is_null' => 'IS NULL',     // is null
        'is_not_null' => 'IS NOT NULL', // is not null
        'between' => 'BETWEEN',     // between values
        'starts_with' => 'LIKE',    // starts with pattern
        'ends_with' => 'LIKE',      // ends with pattern
        'contains' => 'LIKE'        // contains pattern
    ];
    
    /**
     * Set searchable fields for text-based searches
     */
    public function setSearchableFields($fields) {
        $this->searchableFields = is_array($fields) ? $fields : [$fields];
        return $this;
    }
    
    /**
     * Add a JOIN to the query
     */
    public function addJoin($type, $table, $condition) {
        $this->joins[] = [
            'type' => strtoupper($type),
            'table' => $table,
            'condition' => $condition
        ];
        return $this;
    }
    
    /**
     * Set default sorting options
     */
    public function setDefaultSort($field, $direction = 'DESC') {
        $this->defaultSort = [$field, $direction];
        return $this;
    }
    
    /**
     * Add allowed sort fields
     */
    public function addSortOption($field, $alias = null) {
        $this->sortOptions[$alias ?: $field] = $field;
        return $this;
    }
    
    /**
     * Parse and apply filters from request parameters
     */
    public function parseFilters($params) {
        // Handle search parameter
        if (isset($params['search']) && !empty($params['search']) && !empty($this->searchableFields)) {
            $this->addSearchFilter($params['search']);
        }
        
        // Handle status filter
        if (isset($params['status']) && !empty($params['status'])) {
            if ($params['status'] === 'unassigned') {
                // Special case: unassigned tickets
                $this->addFilter('status', 'open');
                $this->addFilter('assigned_to', null, 'is_null');
            } else {
                $this->addFilter('status', $params['status']);
            }
        }
        
        // Handle unassigned flag
        if (isset($params['unassigned']) && $params['unassigned'] == '1') {
            $this->addFilter('assigned_to', null, 'is_null');
        }
        
        // Handle date filters
        if (isset($params['date_from'])) {
            $this->addFilter('created_at', $params['date_from'], 'gte');
        }
        
        if (isset($params['date_to'])) {
            $this->addFilter('created_at', $params['date_to'], 'lte');
        }
        
        // Handle priority filter
        if (isset($params['priority']) && !empty($params['priority'])) {
            if (is_array($params['priority'])) {
                $this->addFilter('priority', $params['priority'], 'in');
            } else {
                $this->addFilter('priority', $params['priority']);
            }
        }
        
        // Handle assigned_to filter
        if (isset($params['assigned_to']) && !empty($params['assigned_to'])) {
            if (is_array($params['assigned_to'])) {
                $this->addFilter('assigned_to', $params['assigned_to'], 'in');
            } else {
                $this->addFilter('assigned_to', $params['assigned_to']);
            }
        }
        
        // Handle category_id filter
        if (isset($params['category_id']) && !empty($params['category_id'])) {
            if (is_array($params['category_id'])) {
                $this->addFilter('category_id', $params['category_id'], 'in');
            } else {
                $this->addFilter('category_id', $params['category_id']);
            }
        }
        
        // Handle custom field filters (field_<name>)
        foreach ($params as $key => $value) {
            if (strpos($key, 'field_') === 0 && !empty($value)) {
                $fieldName = substr($key, 6); // Remove 'field_' prefix
                $this->addFilter($fieldName, $value);
            }
        }
        
        return $this;
    }
    
    /**
     * Add a search filter across multiple fields
     */
    public function addSearchFilter($searchTerm) {
        if (empty($this->searchableFields) || empty($searchTerm)) {
            return $this;
        }
        
        $searchConditions = [];
        $searchTerm = '%' . $searchTerm . '%';
        
        foreach ($this->searchableFields as $field) {
            $searchConditions[] = "$field LIKE ?";
        }
        
        $this->filters[] = [
            'condition' => '(' . implode(' OR ', $searchConditions) . ')',
            'params' => array_fill(0, count($this->searchableFields), $searchTerm),
            'types' => str_repeat('s', count($this->searchableFields))
        ];
        
        return $this;
    }
    
    /**
     * Add a filter condition
     */
    public function addFilter($field, $value, $operator = 'eq') {
        if (!isset(self::OPERATORS[$operator])) {
            throw new InvalidArgumentException("Unsupported operator: $operator");
        }
        
        $condition = $this->buildCondition($field, $value, $operator);
        if ($condition) {
            $this->filters[] = $condition;
        }
        
        return $this;
    }
    
    /**
     * Add a HAVING condition (for aggregate queries)
     */
    public function addHavingFilter($field, $value, $operator = 'eq') {
        if (!isset(self::OPERATORS[$operator])) {
            throw new InvalidArgumentException("Unsupported operator: $operator");
        }
        
        $condition = $this->buildCondition($field, $value, $operator);
        if ($condition) {
            $this->havingConditions[] = $condition;
        }
        
        return $this;
    }
    
    /**
     * Build WHERE clause
     */
    public function buildWhereClause($hasExistingWhere = false) {
        if (empty($this->filters)) {
            return ['clause' => '', 'params' => [], 'types' => ''];
        }
        
        $conditions = [];
        $allParams = [];
        $allTypes = '';
        
        foreach ($this->filters as $filter) {
            $conditions[] = $filter['condition'];
            if (isset($filter['params'])) {
                $allParams = array_merge($allParams, $filter['params']);
                $allTypes .= $filter['types'];
            }
        }
        
        $prefix = $hasExistingWhere ? 'AND' : 'WHERE';
        
        return [
            'clause' => $prefix . ' ' . implode(' AND ', $conditions),
            'params' => $allParams,
            'types' => $allTypes
        ];
    }
    
    /**
     * Build HAVING clause
     */
    public function buildHavingClause() {
        if (empty($this->havingConditions)) {
            return ['clause' => '', 'params' => [], 'types' => ''];
        }
        
        $conditions = [];
        $allParams = [];
        $allTypes = '';
        
        foreach ($this->havingConditions as $filter) {
            $conditions[] = $filter['condition'];
            if (isset($filter['params'])) {
                $allParams = array_merge($allParams, $filter['params']);
                $allTypes .= $filter['types'];
            }
        }
        
        return [
            'clause' => 'HAVING ' . implode(' AND ', $conditions),
            'params' => $allParams,
            'types' => $allTypes
        ];
    }
    
    /**
     * Build JOIN clauses
     */
    public function buildJoinClause() {
        if (empty($this->joins)) {
            return '';
        }
        
        $joinClauses = [];
        foreach ($this->joins as $join) {
            $joinClauses[] = "{$join['type']} JOIN {$join['table']} ON {$join['condition']}";
        }
        
        return implode(' ', $joinClauses);
    }
    
    /**
     * Build ORDER BY clause from parameters
     */
    public function buildOrderClause($params) {
        $orderBy = [];
        
        // Handle sort parameter
        if (isset($params['sort']) && isset($this->sortOptions[$params['sort']])) {
            $field = $this->sortOptions[$params['sort']];
            $direction = isset($params['order']) && strtoupper($params['order']) === 'ASC' ? 'ASC' : 'DESC';
            $orderBy[] = "$field $direction";
        }
        
        // Add default sort if no sort specified or as secondary sort
        if (!empty($this->defaultSort)) {
            $defaultField = $this->defaultSort[0];
            $defaultDirection = $this->defaultSort[1];
            
            // Only add default if not already sorting by this field
            $alreadySorting = false;
            foreach ($orderBy as $order) {
                if (strpos($order, $defaultField) === 0) {
                    $alreadySorting = true;
                    break;
                }
            }
            
            if (!$alreadySorting) {
                $orderBy[] = "$defaultField $defaultDirection";
            }
        }
        
        return !empty($orderBy) ? 'ORDER BY ' . implode(', ', $orderBy) : '';
    }
    
    /**
     * Build pagination clause
     */
    public function buildPaginationClause($params) {
        $page = isset($params['page']) ? max(1, intval($params['page'])) : 1;
        $limit = isset($params['limit']) ? min(100, max(1, intval($params['limit']))) : 25;
        $offset = ($page - 1) * $limit;
        
        return [
            'clause' => "LIMIT $limit OFFSET $offset",
            'page' => $page,
            'limit' => $limit,
            'offset' => $offset
        ];
    }
    
    /**
     * Build complete query parts
     */
    public function buildQuery($baseQuery, $params = [], $groupBy = '') {
        // Check if base query already has WHERE clause
        $hasExistingWhere = stripos($baseQuery, 'WHERE') !== false;
        
        $whereClause = $this->buildWhereClause($hasExistingWhere);
        $havingClause = $this->buildHavingClause();
        $joinClause = $this->buildJoinClause();
        $orderClause = $this->buildOrderClause($params);
        $paginationClause = $this->buildPaginationClause($params);
        
        // Combine all parts
        $query = $baseQuery;
        
        if ($joinClause) {
            $query .= " $joinClause";
        }
        
        if ($whereClause['clause']) {
            $query .= " {$whereClause['clause']}";
        }
        
        // Add GROUP BY if specified
        if ($groupBy) {
            $query .= " GROUP BY $groupBy";
        }
        
        // Add HAVING clause if exists
        if ($havingClause['clause']) {
            $query .= " {$havingClause['clause']}";
        }
        
        if ($orderClause) {
            $query .= " $orderClause";
        }
        
        if ($paginationClause['clause']) {
            $query .= " {$paginationClause['clause']}";
        }
        
        // Combine all parameters
        $allParams = array_merge($whereClause['params'], $havingClause['params']);
        $allTypes = $whereClause['types'] . $havingClause['types'];
        
        return [
            'query' => $query,
            'params' => $allParams,
            'types' => $allTypes,
            'pagination' => $paginationClause
        ];
    }
    
    /**
     * Build count query for pagination
     */
    public function buildCountQuery($baseCountQuery) {
        // Check if base query already has WHERE clause
        $hasExistingWhere = stripos($baseCountQuery, 'WHERE') !== false;
        
        $whereClause = $this->buildWhereClause($hasExistingWhere);
        $joinClause = $this->buildJoinClause();
        
        $query = $baseCountQuery;
        
        if ($joinClause) {
            $query .= " $joinClause";
        }
        
        if ($whereClause['clause']) {
            $query .= " {$whereClause['clause']}";
        }
        
        return [
            'query' => $query,
            'params' => $whereClause['params'],
            'types' => $whereClause['types']
        ];
    }
    
    /**
     * Build a filter condition
     */
    private function buildCondition($field, $value, $operator) {
        if ($value === null && !in_array($operator, ['is_null', 'is_not_null'])) {
            return null;
        }
        
        $sqlOperator = self::OPERATORS[$operator];
        
        switch ($operator) {
            case 'is_null':
            case 'is_not_null':
                return [
                    'condition' => "$field $sqlOperator",
                    'params' => [],
                    'types' => ''
                ];
                
            case 'in':
            case 'not_in':
                if (!is_array($value) || empty($value)) {
                    return null;
                }
                $placeholders = str_repeat('?,', count($value) - 1) . '?';
                return [
                    'condition' => "$field $sqlOperator ($placeholders)",
                    'params' => array_values($value),
                    'types' => str_repeat('s', count($value))
                ];
                
            case 'between':
                if (!is_array($value) || count($value) !== 2) {
                    return null;
                }
                return [
                    'condition' => "$field BETWEEN ? AND ?",
                    'params' => [$value[0], $value[1]],
                    'types' => 'ss'
                ];
                
            case 'starts_with':
                return [
                    'condition' => "$field LIKE ?",
                    'params' => [$value . '%'],
                    'types' => 's'
                ];
                
            case 'ends_with':
                return [
                    'condition' => "$field LIKE ?",
                    'params' => ['%' . $value],
                    'types' => 's'
                ];
                
            case 'contains':
                return [
                    'condition' => "$field LIKE ?",
                    'params' => ['%' . $value . '%'],
                    'types' => 's'
                ];
                
            default:
                return [
                    'condition' => "$field $sqlOperator ?",
                    'params' => [$value],
                    'types' => is_numeric($value) ? 'i' : 's'
                ];
        }
    }
    
    /**
     * Reset all filters
     */
    public function reset() {
        $this->filters = [];
        $this->searchableFields = [];
        $this->joins = [];
        $this->havingConditions = [];
        $this->sortOptions = [];
        $this->defaultSort = [];
        return $this;
    }
    
    /**
     * Get current filters (for debugging)
     */
    public function getFilters() {
        return $this->filters;
    }
}

?>