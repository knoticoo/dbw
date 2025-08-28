/**
 * Kings Choice Alliance Management - Main JavaScript
 * Common functions and utilities
 */

// Global variables
let currentSection = 'players';
let allPlayers = [];
let allAlliances = [];
let allEvents = [];

// Initialize application
$(document).ready(function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Load initial data if on dashboard
    if (window.location.pathname === '/dashboard') {
        showSection('players');
    }
});

// Section Management
function showSection(section) {
    // Hide all sections
    $('.section-content').hide();
    
    // Show selected section
    $(`#${section}-section`).show();
    
    // Update navigation
    $('.btn-group .btn').removeClass('active').addClass('btn-outline-primary');
    $(`.btn-group .btn:contains('${section.charAt(0).toUpperCase() + section.slice(1)}')`).removeClass('btn-outline-primary').addClass('btn-primary active');
    
    currentSection = section;
    
    // Load section data
    switch(section) {
        case 'players':
            loadPlayers();
            break;
        case 'alliances':
            loadAlliances();
            break;
        case 'events':
            loadEvents();
            break;
        case 'mvp':
            loadMVPSection();
            break;
        case 'guides':
            loadGuides();
            break;
    }
}

// Utility Functions
function showToast(message, type = 'success') {
    const toastHtml = `
        <div class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    // Create toast container if it doesn't exist
    if (!$('#toast-container').length) {
        $('body').append('<div id="toast-container" class="toast-container position-fixed top-0 end-0 p-3"></div>');
    }
    
    const $toast = $(toastHtml);
    $('#toast-container').append($toast);
    
    const toast = new bootstrap.Toast($toast[0]);
    toast.show();
    
    // Remove toast element after it's hidden
    $toast.on('hidden.bs.toast', function() {
        $(this).remove();
    });
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function getStatusBadge(status, isBlacklisted = false) {
    if (isBlacklisted) {
        return '<span class="badge status-blacklisted"><i class="fas fa-ban me-1"></i>Blacklisted</span>';
    }
    
    const statusMap = {
        true: '<span class="badge status-active">Active</span>',
        false: '<span class="badge status-inactive">Inactive</span>',
        'upcoming': '<span class="badge status-upcoming">Upcoming</span>',
        'ongoing': '<span class="badge status-ongoing">Ongoing</span>',
        'completed': '<span class="badge status-completed">Completed</span>'
    };
    
    return statusMap[status] || `<span class="badge bg-secondary">${status}</span>`;
}

function getMVPIcon(isMVP = false) {
    return isMVP ? '<i class="fas fa-trophy mvp-icon" title="MVP"></i>' : '';
}

function getWinnerIcon(isWinner = false) {
    return isWinner ? '<i class="fas fa-crown winner-icon" title="Winner"></i>' : '';
}

function getBlacklistIcon(isBlacklisted = false) {
    return isBlacklisted ? '<i class="fas fa-ban blacklist-icon" title="Blacklisted"></i>' : '';
}

// API Helper Functions
function apiCall(method, url, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            method: method,
            url: url,
            contentType: 'application/json',
            success: resolve,
            error: function(xhr, status, error) {
                console.error(`API Error: ${method} ${url}`, error);
                reject({
                    status: xhr.status,
                    message: xhr.responseJSON?.error || error
                });
            }
        };
        
        if (data) {
            options.data = JSON.stringify(data);
        }
        
        $.ajax(options);
    });
}

// Loading State Management
function setLoadingState(elementId, isLoading = true) {
    const $element = $(`#${elementId}`);
    
    if (isLoading) {
        $element.addClass('loading');
        $element.html('<i class="fas fa-spinner fa-spin"></i> Loading...');
    } else {
        $element.removeClass('loading');
    }
}

// Form Validation
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            isValid = false;
        } else {
            input.classList.remove('is-invalid');
        }
    });
    
    return isValid;
}

// Clear Form
function clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
        // Remove validation classes
        $(form).find('.is-invalid').removeClass('is-invalid');
        $(form).find('.is-valid').removeClass('is-valid');
    }
}

// Confirmation Dialog
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Search and Filter Functions
function filterTable(tableId, searchTerm) {
    const $table = $(`#${tableId}`);
    const $rows = $table.find('tbody tr');
    
    if (!searchTerm) {
        $rows.show();
        return;
    }
    
    searchTerm = searchTerm.toLowerCase();
    
    $rows.each(function() {
        const rowText = $(this).text().toLowerCase();
        if (rowText.includes(searchTerm)) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
}

// Export Functions
function exportToCSV(data, filename) {
    if (!data || !data.length) {
        showToast('No data to export', 'warning');
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Local Storage Helpers
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save to localStorage:', e);
    }
}

function loadFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.warn('Failed to load from localStorage:', e);
        return null;
    }
}

// Error Handling
function handleApiError(error, defaultMessage = 'An error occurred') {
    const message = error.message || defaultMessage;
    showToast(message, 'danger');
    console.error('API Error:', error);
}

// Initialize event listeners for common elements
$(document).on('click', '[data-bs-toggle="tooltip"]', function(e) {
    e.preventDefault();
});

// Handle form submissions with Enter key
$(document).on('keypress', 'form input', function(e) {
    if (e.which === 13) { // Enter key
        e.preventDefault();
        const form = $(this).closest('form');
        const submitButton = form.find('button[type="submit"], button:contains("Add"), button:contains("Update"), button:contains("Save")').first();
        if (submitButton.length) {
            submitButton.click();
        }
    }
});

// Auto-focus first input in modals
$(document).on('shown.bs.modal', '.modal', function() {
    $(this).find('input:text, input:password, input:email, textarea, select').filter(':visible:first').focus();
});

// Clear forms when modals are hidden
$(document).on('hidden.bs.modal', '.modal', function() {
    const forms = $(this).find('form');
    forms.each(function() {
        clearForm(this.id);
    });
});