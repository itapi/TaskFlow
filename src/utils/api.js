class ApiClient {
  constructor(baseURL = 'https://ikosher.me/TaskFlow') {
    this.baseURL = baseURL;
    this.apiURL = `${baseURL}/api`;
    this.authURL = `${baseURL}`;
    this.token = localStorage.getItem('TaskFlow_authToken');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('TaskFlow_authToken', token);
    } else {
      localStorage.removeItem('TaskFlow_authToken');
    }
  }

  getToken() {
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('TaskFlow_authToken');
  }

  async request(url, options = {}) {
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (this.token) {
      config.headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
          throw new Error('Session expired. Please login again.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return await response.text();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data,
    });
  }

  async delete(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'DELETE' });
  }

  // ========== Authentication ==========
  async login(username, password) {
    const response = await this.post(`${this.authURL}/auth.php`, {
      action: 'login',
      username,
      password,
    });

    if (response.success && response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async logout() {
    try {
      await this.post(`${this.authURL}/auth.php`, { action: 'logout' });
    } finally {
      this.clearToken();
    }
  }

  async getCurrentUser() {
    return this.get(`${this.authURL}/auth.php`, { action: 'profile' });
  }

  isAuthenticated() {
    return !!this.token;
  }

  // ========== Projects API ==========
  async getProjects() {
    return this.get(`${this.apiURL}/projects`);
  }

  async getProject(id) {
    return this.get(`${this.apiURL}/projects`, { id });
  }

  async createProject(projectData) {
    return this.post(`${this.apiURL}/projects`, projectData);
  }

  async updateProject(id, projectData) {
    return this.put(`${this.apiURL}/projects`, { id, ...projectData });
  }

  async deleteProject(id) {
    return this.delete(`${this.apiURL}/projects`, { id });
  }

  // ========== Tasks API ==========
  async getTasks(filters = {}) {
    return this.get(`${this.apiURL}/tasks`, filters);
  }

  async getTask(id) {
    return this.get(`${this.apiURL}/tasks`, { id });
  }

  async getTasksByProject(projectId) {
    return this.get(`${this.apiURL}/tasks`, { project_id: projectId });
  }

  async getTasksByStatus(status) {
    return this.get(`${this.apiURL}/tasks`, { status });
  }

  async getMyTasks() {
    return this.get(`${this.apiURL}/tasks`, { assigned_to: 'me' });
  }

  async createTask(taskData) {
    return this.post(`${this.apiURL}/tasks`, taskData);
  }

  async updateTask(id, taskData) {
    return this.put(`${this.apiURL}/tasks`, { id, ...taskData });
  }

  async deleteTask(id) {
    return this.delete(`${this.apiURL}/tasks`, { id });
  }

  async updateTaskStatus(id, status) {
    return this.put(`${this.apiURL}/tasks`, { id, status });
  }

  async assignTask(id, assignedTo) {
    return this.put(`${this.apiURL}/tasks`, { id, assigned_to: assignedTo });
  }

  // ========== Comments API ==========
  async getComments(taskId) {
    return this.get(`${this.apiURL}/comments`, { task_id: taskId });
  }

  async addComment(taskId, comment) {
    return this.post(`${this.apiURL}/comments`, { task_id: taskId, comment });
  }

  async updateComment(id, comment) {
    return this.put(`${this.apiURL}/comments`, { id, comment });
  }

  async deleteComment(id) {
    return this.delete(`${this.apiURL}/comments`, { id });
  }

  // ========== Activity API ==========
  async getActivity(filters = {}) {
    return this.get(`${this.apiURL}/activity`, filters);
  }

  async getTaskActivity(taskId) {
    return this.get(`${this.apiURL}/activity`, { task_id: taskId });
  }

  async getProjectActivity(projectId) {
    return this.get(`${this.apiURL}/activity`, { project_id: projectId });
  }

  // ========== Users API ==========
  async getUsers() {
    return this.get(`${this.apiURL}/users`);
  }

  async getUser(id) {
    return this.get(`${this.apiURL}/users`, { id });
  }

  async createUser(userData) {
    return this.post(`${this.apiURL}/users`, userData);
  }

  async updateUser(id, userData) {
    return this.put(`${this.apiURL}/users`, { id, ...userData });
  }

  async deleteUser(id) {
    return this.delete(`${this.apiURL}/users`, { id });
  }

  // ========== Stats API ==========
  async getStats() {
    return this.get(`${this.apiURL}/stats`);
  }

  // ========== Email API ==========
  async sendEmail(to, subject, message, replyTo = null) {
    return this.post(`${this.baseURL}/send_mail.php`, {
      to,
      subject,
      message,
      replyTo: replyTo || to
    });
  }
}

// Create a singleton instance
const apiClient = new ApiClient();

export default apiClient;
