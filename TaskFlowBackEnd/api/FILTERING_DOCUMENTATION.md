# iFilter Dashboard - Advanced Filtering System

## Overview

The iFilter Dashboard now includes a robust, reusable filtering system that provides comprehensive search, filter, and sorting capabilities across all endpoints. This system is designed to be:

- **Reusable**: One FilterBuilder class handles all filtering scenarios
- **Secure**: Uses prepared statements and parameter binding
- **Flexible**: Supports multiple operators, data types, and complex conditions
- **Efficient**: Optimized queries with proper indexing recommendations
- **Extensible**: Easy to add new filter types and operators

## FilterBuilder Class

### Core Features

- **Multiple Operators**: eq, ne, gt, gte, lt, lte, like, in, between, etc.
- **Search Functionality**: Multi-field text search with OR conditions
- **Sorting**: Configurable sort options with aliases
- **Pagination**: Built-in pagination with configurable limits
- **Joins**: Support for complex table relationships
- **Having Conditions**: For aggregate queries

### Usage Example

```php
// Initialize filter builder
$filterBuilder = new FilterBuilder();

// Set searchable fields
$filterBuilder->setSearchableFields([
    'table.field1',
    'table.field2', 
    'joined_table.field3'
]);

// Set sort options
$filterBuilder->addSortOption('name', 'table.name')
             ->addSortOption('date', 'table.created_at')
             ->setDefaultSort('table.created_at', 'DESC');

// Parse filters from request
$filterBuilder->parseFilters($_GET);

// Build query
$queryData = $filterBuilder->buildQuery($baseQuery, $_GET);
```

## Supported Filter Parameters

### Common Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `search` | string | Multi-field text search | `?search=urgent` |
| `page` | integer | Page number (1-based) | `?page=2` |
| `limit` | integer | Items per page (1-100) | `?limit=50` |
| `sort` | string | Sort field alias | `?sort=name` |
| `order` | string | Sort direction (ASC/DESC) | `?order=DESC` |

### Tickets Endpoint Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `status` | string | Filter by status | `?status=open` |
| `unassigned` | boolean | Show unassigned tickets | `?unassigned=1` |
| `assigned_to` | integer/array | Filter by assigned user | `?assigned_to=123` |
| `priority` | string/array | Filter by priority | `?priority=high` |
| `date_from` | date | Created after date | `?date_from=2024-01-01` |
| `date_to` | date | Created before date | `?date_to=2024-12-31` |

### Apps Endpoint Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `category_id` | integer/array | Filter by category | `?category_id=5` |
| `score_min` | float | Minimum app score | `?score_min=4.0` |
| `score_max` | float | Maximum app score | `?score_max=5.0` |
| `size_min` | integer | Minimum app size | `?size_min=1048576` |
| `size_max` | integer | Maximum app size | `?size_max=104857600` |

## API Endpoints with Filtering

### 1. Tickets Endpoint

**URL**: `/api/tickets?action=with_details`

**Supported Filters**:
- Status filtering (all, open, closed, unassigned)
- Text search across subject, description, client name
- Date range filtering
- Assignment filtering
- Priority filtering (if available)

**Example Requests**:
```
GET /api/tickets?action=with_details&status=open&search=bug&page=1&limit=25
GET /api/tickets?action=with_details&unassigned=1&sort=created_at&order=DESC
GET /api/tickets?action=with_details&assigned_to=123&date_from=2024-01-01
```

### 2. Apps Endpoint

**URL**: `/api/apps?action=filtered` or `/api/apps?action=with_categories`

**Supported Filters**:
- Category filtering
- Text search across app name, package name, description
- Score range filtering
- Size range filtering
- Update date filtering

**Example Requests**:
```
GET /api/apps?action=filtered&category_id=5&search=game&sort=score&order=DESC
GET /api/apps?action=with_categories&score_min=4.0&limit=50
```

### 3. Filter Statistics Endpoint

**URL**: `/api/filter_stats?action={tickets|apps|users}`

Provides filter metadata and counts for building dynamic filter UIs.

**Example Response** (tickets):
```json
{
  "success": true,
  "data": {
    "status": {
      "open": 45,
      "closed": 123,
      "pending": 8
    },
    "assignment": {
      "assigned": 32,
      "unassigned": 13
    },
    "assigned_users": [
      {"id": 1, "username": "admin", "ticket_count": 5},
      {"id": 2, "username": "support", "ticket_count": 3}
    ]
  }
}
```

## Frontend Integration

### React Hook Example

```javascript
// Custom hook for filtered data
const useFilteredData = (endpoint, initialFilters = {}) => {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const response = await apiClient.get(`${endpoint}?${params}`);
      if (response.success) {
        setData(response.data);
        setPagination(response.pagination || {});
      }
    } catch (error) {
      console.error('Filter load error:', error);
    } finally {
      setLoading(false);
    }
  }, [endpoint, filters]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, filters, updateFilter, loading, pagination };
};
```

### Toggle Component Integration

```javascript
const TicketsTable = () => {
  const { data, filters, updateFilter, loading } = useFilteredData(
    'tickets?action=with_details',
    { status: 'all', page: 1, limit: 25 }
  );

  return (
    <div>
      <Toggle
        options={[
          { id: 'all', label: 'All Tickets', count: filterCounts.all },
          { id: 'open', label: 'Open', count: filterCounts.open },
          { id: 'closed', label: 'Closed', count: filterCounts.closed }
        ]}
        value={filters.status}
        onChange={(status) => updateFilter('status', status)}
      />
      <Table data={data} loading={loading} />
    </div>
  );
};
```

## Performance Optimization

### Database Indexes

Recommended indexes for optimal performance:

```sql
-- Tickets table
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_tickets_status_assigned ON tickets(status, assigned_to);

-- Apps table  
CREATE INDEX idx_apps_category_id ON app_store_apps(category_id);
CREATE INDEX idx_apps_score ON app_store_apps(score);
CREATE INDEX idx_apps_size ON app_store_apps(size);
CREATE INDEX idx_apps_name ON app_store_apps(app_name);

-- Full-text search indexes
ALTER TABLE tickets ADD FULLTEXT(subject, description);
ALTER TABLE app_store_apps ADD FULLTEXT(app_name, description);
```

### Query Optimization

- Use `LIMIT` and `OFFSET` for pagination
- Implement proper `WHERE` clause ordering (most selective first)
- Use `EXISTS` instead of `IN` for subqueries when appropriate
- Cache filter statistics for better performance

## Security Features

- **SQL Injection Protection**: All queries use prepared statements
- **Parameter Validation**: Input validation and sanitization
- **Type Safety**: Proper parameter binding with types
- **Access Control**: Easy integration with authentication systems

## Extension Points

### Adding New Operators

```php
// Add to FilterBuilder::OPERATORS array
const OPERATORS = [
    // ... existing operators
    'regex' => 'REGEXP',
    'sounds_like' => 'SOUNDS LIKE'
];

// Add handling in buildCondition method
case 'regex':
    return [
        'condition' => "$field REGEXP ?",
        'params' => [$value],
        'types' => 's'
    ];
```

### Adding Custom Filters

```php
// In parseFilters method
if (isset($params['custom_field']) && !empty($params['custom_field'])) {
    $this->addFilter('custom_field', $params['custom_field'], 'custom_operator');
}
```

### Adding New Endpoints

1. Create new endpoint class extending BaseAPI
2. Include FilterBuilder.php
3. Use FilterBuilder in your methods
4. Define searchable fields and sort options
5. Build and execute filtered queries

## Error Handling

The system includes comprehensive error handling:

- **Invalid operators**: Throws InvalidArgumentException
- **Database errors**: Returns appropriate HTTP status codes
- **Parameter validation**: Client-friendly error messages
- **Debug information**: Available in development mode

## Testing

### Unit Tests

```php
// Test filter building
$filter = new FilterBuilder();
$filter->addFilter('status', 'open');
$where = $filter->buildWhereClause();
// Assert: $where['clause'] === 'WHERE status = ?'
```

### Integration Tests

```bash
# Test endpoints
curl "http://localhost/api/tickets?action=with_details&status=open&search=bug"
curl "http://localhost/api/apps?action=filtered&category_id=5&sort=score"
```

## Best Practices

1. **Always use pagination** for large datasets
2. **Implement caching** for frequently accessed filter statistics  
3. **Validate user inputs** before passing to FilterBuilder
4. **Use appropriate indexes** on filtered columns
5. **Monitor query performance** and optimize as needed
6. **Document custom filters** for your specific use cases

This filtering system provides a solid foundation for building sophisticated data exploration interfaces while maintaining security, performance, and code reusability.