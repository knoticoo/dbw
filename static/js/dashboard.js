/**
 * Kings Choice Alliance Management - Dashboard JavaScript
 * Handles all dashboard functionality
 */

// Load dashboard data on page ready
$(document).ready(function() {
    loadAlliances();
    loadPlayers();
    loadEvents();
    loadMVPSection();
    
    // Setup image preview handlers
    setupImagePreviews();
});

function setupImagePreviews() {
    // Handle image preview for add guide modal
    $('#guideImages').on('change', function() {
        previewImages(this, '#imagePreview');
    });
    
    // Handle image preview for edit guide modal
    $('#editGuideImages').on('change', function() {
        previewImages(this, '#editImagePreview');
    });
}

function previewImages(input, previewContainer) {
    const container = $(previewContainer);
    container.empty();
    
    if (input.files && input.files.length > 0) {
        container.append('<h6>Image Preview:</h6>');
        const imageRow = $('<div class="row"></div>');
        
        Array.from(input.files).forEach((file, index) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imageCol = $(`
                        <div class="col-md-3 mb-2">
                            <div class="card">
                                <img src="${e.target.result}" class="card-img-top" style="height: 100px; object-fit: cover;">
                                <div class="card-body p-2">
                                    <small class="text-muted">${file.name}</small>
                                </div>
                            </div>
                        </div>
                    `);
                    imageRow.append(imageCol);
                };
                reader.readAsDataURL(file);
            }
        });
        
        container.append(imageRow);
    }
}

// Players Management
function loadPlayers() {
    setLoadingState('players-table-body');
    
    apiCall('GET', '/api/players/')
        .then(data => {
            allPlayers = data;
            displayPlayers(data);
            loadAllianceOptions();
        })
        .catch(error => {
            handleApiError(error, 'Failed to load players');
            $('#players-table-body').html('<tr><td colspan="6" class="text-center text-danger">Failed to load players</td></tr>');
        })
        .finally(() => {
            // Always clear loading state
            setLoadingState('players-table-body', false);
        });
}

function displayPlayers(players) {
    let html = '';
    
    if (players.length === 0) {
        html = '<tr><td colspan="6" class="text-center text-muted">No players found</td></tr>';
    } else {
        players.forEach(player => {
            const allianceInfo = player.alliance ? 
                `${player.alliance.name}${player.alliance.tag ? ` ${player.alliance.tag}` : ''}` : 
                '<span class="text-muted">No Alliance</span>';
            
            html += `
                <tr>
                    <td>
                        <strong>${player.name}</strong>
                        ${getMVPIcon(player.mvp_count > 0)}
                    </td>
                    <td>${allianceInfo}</td>
                    <td>
                        <span class="badge bg-primary">${player.mvp_count}</span>
                        <small class="text-muted d-block">${player.mvp_points || 0} pts</small>
                    </td>
                    <td>
                        ${formatDate(player.last_mvp_date)}
                        ${player.last_mvp_type ? `<small class="text-muted d-block">${player.last_mvp_type}</small>` : ''}
                    </td>
                    <td>${getStatusBadge(player.is_active)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="editPlayer(${player.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deletePlayer(${player.id}, '${escapeJsString(player.name)}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }
    
    $('#players-table-body').html(html);
}

function addPlayer() {
    if (!validateForm('addPlayerForm')) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    // Show loading state on button
    const addButton = '#addPlayerModal .btn-success';
    setButtonLoading(addButton, true);
    
    const playerData = {
        name: $('#playerName').val().trim(),
        alliance_id: $('#playerAlliance').val() || null
    };
    
    apiCall('POST', '/api/players/', playerData)
        .then(response => {
            showToast('Player added successfully', 'success');
            $('#addPlayerModal').modal('hide');
            loadPlayers();
        })
        .catch(error => {
            handleApiError(error, 'Failed to add player');
        })
        .finally(() => {
            // Always restore button state
            setButtonLoading(addButton, false);
        });
}

function editPlayer(playerId) {
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return;
    
    $('#editPlayerId').val(player.id);
    $('#editPlayerName').val(player.name);
    $('#editPlayerAlliance').val(player.alliance?.id || '');
    
    loadAllianceOptions('editPlayerAlliance');
    $('#editPlayerModal').modal('show');
}

function updatePlayer() {
    if (!validateForm('editPlayerForm')) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    // Show loading state on button
    const updateButton = '#editPlayerModal .btn-primary';
    setButtonLoading(updateButton, true);
    
    const playerId = $('#editPlayerId').val();
    const playerData = {
        name: $('#editPlayerName').val().trim(),
        alliance_id: $('#editPlayerAlliance').val() || null
    };
    
    apiCall('PUT', `/api/players/${playerId}`, playerData)
        .then(response => {
            showToast('Player updated successfully', 'success');
            $('#editPlayerModal').modal('hide');
            loadPlayers();
        })
        .catch(error => {
            handleApiError(error, 'Failed to update player');
        })
        .finally(() => {
            // Always restore button state
            setButtonLoading(updateButton, false);
        });
}

function deletePlayer(playerId, playerName) {
    // Show options for soft delete (deactivate) or hard delete
    const modalHtml = `
        <div class="modal fade" id="deletePlayerModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title text-danger">
                            <i class="fas fa-exclamation-triangle me-2"></i>Delete Player: ${playerName}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Choose how to handle this player:</p>
                        <div class="d-grid gap-2">
                            <button class="btn btn-warning" onclick="deactivatePlayer(${playerId}, '${playerName}')">
                                <i class="fas fa-user-slash me-2"></i>Deactivate Player
                                <small class="d-block text-muted">Sets player as inactive (recommended)</small>
                            </button>
                            <button class="btn btn-danger" onclick="hardDeletePlayer(${playerId}, '${playerName}')">
                                <i class="fas fa-trash me-2"></i>Permanently Delete
                                <small class="d-block text-muted">Completely removes player from database</small>
                            </button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if present
    $('#deletePlayerModal').remove();
    
    // Add modal to body and show
    $('body').append(modalHtml);
    $('#deletePlayerModal').modal('show');
}

function deactivatePlayer(playerId, playerName) {
    $('#deletePlayerModal').modal('hide');
    
    apiCall('DELETE', `/api/players/${playerId}`)
        .then(response => {
            showToast('Player deactivated successfully', 'success');
            loadPlayers();
        })
        .catch(error => {
            handleApiError(error, 'Failed to deactivate player');
        });
}

function hardDeletePlayer(playerId, playerName) {
    $('#deletePlayerModal').modal('hide');
    
    confirmAction(
        `Are you absolutely sure you want to PERMANENTLY DELETE "${playerName}"? This action cannot be undone and will remove all associated data.`,
        () => {
            apiCall('DELETE', `/api/players/${playerId}?hard=true`)
                .then(response => {
                    showToast('Player permanently deleted', 'success');
                    loadPlayers();
                })
                .catch(error => {
                    handleApiError(error, 'Failed to delete player permanently');
                });
        }
    );
}

// Alliances Management
function loadAlliances() {
    setLoadingState('alliances-table-body');
    
    const includeBlacklisted = $('#showBlacklisted').is(':checked');
    
    apiCall('GET', `/api/alliances/?include_blacklisted=${includeBlacklisted}`)
        .then(data => {
            allAlliances = data;
            displayAlliances(data);
        })
        .catch(error => {
            handleApiError(error, 'Failed to load alliances');
            $('#alliances-table-body').html('<tr><td colspan="6" class="text-center text-danger">Failed to load alliances</td></tr>');
        });
}

function displayAlliances(alliances) {
    let html = '';
    
    if (alliances.length === 0) {
        html = '<tr><td colspan="6" class="text-center text-muted">No alliances found</td></tr>';
    } else {
        alliances.forEach(alliance => {
            html += `
                <tr>
                    <td>
                        <strong>${alliance.name}</strong>
                        ${getBlacklistIcon(alliance.is_blacklisted)}
                        ${getWinnerIcon(alliance.wins_count > 0)}
                    </td>
                    <td>${alliance.tag || '<span class="text-muted">No Tag</span>'}</td>
                    <td>
                        <span class="badge bg-info">${alliance.member_count}</span>
                    </td>
                    <td>
                        <span class="badge bg-success">${alliance.wins_count}</span>
                    </td>
                    <td>${getStatusBadge(null, alliance.is_blacklisted)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="editAlliance(${alliance.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${alliance.is_blacklisted ? 
                            `<button class="btn btn-sm btn-outline-success" onclick="whitelistAlliance(${alliance.id}, '${escapeJsString(alliance.name)}')" title="Remove from Blacklist">
                                <i class="fas fa-check"></i>
                            </button>` :
                            `<button class="btn btn-sm btn-outline-warning" onclick="blacklistAlliance(${alliance.id}, '${escapeJsString(alliance.name)}')" title="Add to Blacklist">
                                <i class="fas fa-ban"></i>
                            </button>`
                        }
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteAlliance(${alliance.id}, '${escapeJsString(alliance.name)}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }
    
    $('#alliances-table-body').html(html);
}

function addAlliance() {
    if (!validateForm('addAllianceForm')) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    // Show loading state on button
    const addButton = '#addAllianceModal .btn-success';
    setButtonLoading(addButton, true);
    
    const allianceData = {
        name: $('#allianceName').val().trim(),
        tag: $('#allianceTag').val().trim(),
        description: $('#allianceDescription').val().trim(),
        is_blacklisted: $('#allianceBlacklisted').is(':checked')
    };
    
    apiCall('POST', '/api/alliances/', allianceData)
        .then(response => {
            showToast('Alliance added successfully', 'success');
            $('#addAllianceModal').modal('hide');
            loadAlliances();
        })
        .catch(error => {
            handleApiError(error, 'Failed to add alliance');
        })
        .finally(() => {
            // Always restore button state
            setButtonLoading(addButton, false);
        });
}

function editAlliance(allianceId) {
    const alliance = allAlliances.find(a => a.id === allianceId);
    if (!alliance) return;
    
    $('#editAllianceId').val(alliance.id);
    $('#editAllianceName').val(alliance.name);
    $('#editAllianceTag').val(alliance.tag || '');
    $('#editAllianceDescription').val(alliance.description || '');
    $('#editAllianceBlacklisted').prop('checked', alliance.is_blacklisted);
    
    $('#editAllianceModal').modal('show');
}

function updateAlliance() {
    if (!validateForm('editAllianceForm')) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    const allianceId = $('#editAllianceId').val();
    const allianceData = {
        name: $('#editAllianceName').val().trim(),
        tag: $('#editAllianceTag').val().trim(),
        description: $('#editAllianceDescription').val().trim(),
        is_blacklisted: $('#editAllianceBlacklisted').is(':checked')
    };
    
    // Show loading state on button
    const updateButton = '#editAllianceModal .btn-primary';
    setButtonLoading(updateButton, true);
    
    apiCall('PUT', `/api/alliances/${allianceId}`, allianceData)
        .then(response => {
            showToast('Alliance updated successfully', 'success');
            $('#editAllianceModal').modal('hide');
            loadAlliances();
        })
        .catch(error => {
            handleApiError(error, 'Failed to update alliance');
        })
        .finally(() => {
            // Always restore button state
            setButtonLoading(updateButton, false);
        });
}

function blacklistAlliance(allianceId, allianceName) {
    confirmAction(
        `Are you sure you want to blacklist alliance "${allianceName}"?`,
        () => {
            apiCall('POST', `/api/alliances/${allianceId}/blacklist`)
                .then(response => {
                    showToast('Alliance blacklisted successfully', 'success');
                    loadAlliances();
                })
                .catch(error => {
                    handleApiError(error, 'Failed to blacklist alliance');
                });
        }
    );
}

function whitelistAlliance(allianceId, allianceName) {
    confirmAction(
        `Are you sure you want to remove alliance "${allianceName}" from the blacklist?`,
        () => {
            apiCall('POST', `/api/alliances/${allianceId}/whitelist`)
                .then(response => {
                    showToast('Alliance removed from blacklist successfully', 'success');
                    loadAlliances();
                })
                .catch(error => {
                    handleApiError(error, 'Failed to remove alliance from blacklist');
                });
        }
    );
}

function deleteAlliance(allianceId, allianceName) {
    confirmAction(
        `Are you sure you want to delete alliance "${allianceName}"? This action cannot be undone.`,
        () => {
            apiCall('DELETE', `/api/alliances/${allianceId}`)
                .then(response => {
                    showToast('Alliance deleted successfully', 'success');
                    loadAlliances();
                })
                .catch(error => {
                    handleApiError(error, 'Failed to delete alliance');
                });
        }
    );
}

// Events Management
function loadEvents() {
    setLoadingState('events-table-body');
    
    apiCall('GET', '/api/events/')
        .then(data => {
            allEvents = data;
            displayEvents(data);
        })
        .catch(error => {
            handleApiError(error, 'Failed to load events');
            $('#events-table-body').html('<tr><td colspan="6" class="text-center text-danger">Failed to load events</td></tr>');
        });
}

function displayEvents(events) {
    let html = '';
    
    if (events.length === 0) {
        html = '<tr><td colspan="6" class="text-center text-muted">No events found</td></tr>';
    } else {
        events.forEach(event => {
            const mvpInfo = event.mvp ? 
                `${event.mvp.name} <span class="${event.mvp.color}"><i class="${event.mvp.icon}"></i> ${event.mvp.type}</span>` : 
                '<span class="text-muted">Not Assigned</span>';
            
            const winnerInfo = event.winner_alliance ? 
                `${event.winner_alliance.name} ${getWinnerIcon(true)}` : 
                '<span class="text-muted">Not Assigned</span>';
            
            html += `
                <tr>
                    <td><strong>${event.name}</strong></td>
                    <td>${formatDate(event.event_date)}</td>
                    <td>${getStatusBadge(event.status)}</td>
                    <td>${mvpInfo}</td>
                    <td>${winnerInfo}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="editEvent(${event.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning" onclick="assignMVP(${event.id}, '${escapeJsString(event.name)}')" title="Assign MVP">
                            <i class="fas fa-trophy"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="assignWinner(${event.id}, '${escapeJsString(event.name)}')" title="Assign Winner">
                            <i class="fas fa-crown"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteEvent(${event.id}, '${escapeJsString(event.name)}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }
    
    $('#events-table-body').html(html);
}

function addEvent() {
    if (!validateForm('addEventForm')) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    // Show loading state on button
    const addButton = '#addEventModal .btn-success';
    setButtonLoading(addButton, true);
    
    const eventData = {
        name: $('#eventName').val().trim(),
        event_date: $('#eventDate').val()
    };
    
    apiCall('POST', '/api/events/', eventData)
        .then(response => {
            showToast('Event added successfully', 'success');
            $('#addEventModal').modal('hide');
            loadEvents();
        })
        .catch(error => {
            handleApiError(error, 'Failed to add event');
        })
        .finally(() => {
            // Always restore button state
            setButtonLoading(addButton, false);
        });
}

function editEvent(eventId) {
    const event = allEvents.find(e => e.id === eventId);
    if (!event) return;
    
    $('#editEventId').val(event.id);
    $('#editEventName').val(event.name);
    $('#editEventDate').val(event.event_date);
    
    $('#editEventModal').modal('show');
}

function updateEvent() {
    if (!validateForm('editEventForm')) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    // Show loading state on button
    const updateButton = '#editEventModal .btn-primary';
    setButtonLoading(updateButton, true);
    
    const eventId = $('#editEventId').val();
    const eventData = {
        name: $('#editEventName').val().trim(),
        event_date: $('#editEventDate').val()
    };
    
    apiCall('PUT', `/api/events/${eventId}`, eventData)
        .then(response => {
            showToast('Event updated successfully', 'success');
            $('#editEventModal').modal('hide');
            loadEvents();
        })
        .catch(error => {
            handleApiError(error, 'Failed to update event');
        })
        .finally(() => {
            // Always restore button state
            setButtonLoading(updateButton, false);
        });
}

function deleteEvent(eventId, eventName) {
    confirmAction(
        `Are you sure you want to delete event "${eventName}"? This action cannot be undone.`,
        () => {
            apiCall('DELETE', `/api/events/${eventId}`)
                .then(response => {
                    showToast('Event deleted successfully', 'success');
                    loadEvents();
                })
                .catch(error => {
                    handleApiError(error, 'Failed to delete event');
                });
        }
    );
}

// MVP Assignment
function assignMVP(eventId, eventName) {
    $('#mvpEventId').val(eventId);
    $('#mvpEventName').val(eventName);
    
    // Load MVP candidates
    apiCall('GET', '/api/mvp/next_candidates')
        .then(candidates => {
            let html = '<option value="">Choose player...</option>';
            candidates.forEach(candidate => {
                html += `<option value="${candidate.id}">${candidate.name}</option>`;
            });
            $('#mvpPlayer').html(html);
        })
        .catch(error => {
            handleApiError(error, 'Failed to load MVP candidates');
        });
    
    // Load MVP types
    apiCall('GET', '/api/mvp/types')
        .then(types => {
            let html = '<option value="">Choose MVP type...</option>';
            types.forEach(type => {
                html += `<option value="${type.name}">
                    ${type.name} (${type.points} points) - ${type.description}
                </option>`;
            });
            $('#mvpType').html(html);
        })
        .catch(error => {
            handleApiError(error, 'Failed to load MVP types');
        });
    
    $('#assignMVPModal').modal('show');
}

function assignEventMVP() {
    if (!validateForm('assignMVPForm')) {
        showToast('Please select a player and MVP type', 'warning');
        return;
    }
    
    // Show loading state on button
    const assignButton = '#assignMVPModal .btn-warning';
    setButtonLoading(assignButton, true);
    
    const eventId = $('#mvpEventId').val();
    const playerId = $('#mvpPlayer').val();
    const mvpType = $('#mvpType').val();
    
    apiCall('POST', `/api/mvp/assign/${eventId}`, { 
        player_id: parseInt(playerId),
        mvp_type: mvpType
    })
        .then(response => {
            showToast('MVP assigned successfully', 'success');
            $('#assignMVPModal').modal('hide');
            loadEvents();
            loadMVPSection();
            loadPlayers(); // Refresh to show updated points
        })
        .catch(error => {
            handleApiError(error, 'Failed to assign MVP');
        })
        .finally(() => {
            // Always restore button state
            setButtonLoading(assignButton, false);
        });
}

function assignWinner(eventId, eventName) {
    $('#winnerEventId').val(eventId);
    $('#winnerEventName').val(eventName);
    
    // Load non-blacklisted alliances
    const eligibleAlliances = allAlliances.filter(a => !a.is_blacklisted);
    let html = '<option value="">Choose alliance...</option>';
    eligibleAlliances.forEach(alliance => {
        const tag = alliance.tag ? ` ${alliance.tag}` : '';
        html += `<option value="${alliance.id}">${alliance.name}${tag}</option>`;
    });
    $('#winnerAlliance').html(html);
    
    $('#assignWinnerModal').modal('show');
}

function assignEventWinner() {
    if (!validateForm('assignWinnerForm')) {
        showToast('Please select an alliance', 'warning');
        return;
    }
    
    // Show loading state on button
    const assignButton = '#assignWinnerModal .btn-success';
    setButtonLoading(assignButton, true);
    
    const eventId = $('#winnerEventId').val();
    const allianceId = $('#winnerAlliance').val();
    
    apiCall('POST', `/api/events/${eventId}/assign_winner`, { alliance_id: parseInt(allianceId) })
        .then(response => {
            showToast('Winner assigned successfully', 'success');
            $('#assignWinnerModal').modal('hide');
            loadEvents();
            loadAlliances();
        })
        .catch(error => {
            handleApiError(error, 'Failed to assign winner');
        })
        .finally(() => {
            // Always restore button state
            setButtonLoading(assignButton, false);
        });
}

// MVP System
function loadMVPSection() {
    loadMVPStatus();
    loadMVPCandidates();
}

function loadMVPStatus() {
    apiCall('GET', '/api/mvp/rotation_status')
        .then(status => {
            const html = `
                <div class="row">
                    <div class="col-md-3">
                        <strong>Current Cycle:</strong> ${status.current_cycle}
                    </div>
                    <div class="col-md-3">
                        <strong>Total Players:</strong> ${status.total_active_players}
                    </div>
                    <div class="col-md-3">
                        <strong>Been MVP:</strong> ${status.players_been_mvp}
                    </div>
                    <div class="col-md-3">
                        <strong>Pending MVP:</strong> ${status.players_pending_mvp}
                    </div>
                </div>
                <div class="mt-3">
                    ${status.rotation_complete ? 
                        '<div class="alert alert-success"><i class="fas fa-check-circle me-2"></i>Rotation cycle complete! Ready to reset.</div>' :
                        `<div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>Next recommended MVP: <strong>${status.next_player?.name || 'N/A'}</strong></div>`
                    }
                </div>
            `;
            $('#mvp-status').html(html);
        })
        .catch(error => {
            handleApiError(error, 'Failed to load MVP status');
        });
}

function loadMVPCandidates() {
    apiCall('GET', '/api/mvp/next_candidates')
        .then(candidates => {
            let html = '';
            
            if (candidates.length === 0) {
                html = '<p class="text-muted text-center">No active players found</p>';
            } else {
                candidates.forEach(candidate => {
                    html += `
                        <div class="card mb-2">
                            <div class="card-body py-2">
                                <div class="row align-items-center">
                                    <div class="col-md-4">
                                        <strong>${candidate.name}</strong>
                                        ${getMVPIcon(candidate.mvp_count > 0)}
                                    </div>
                                    <div class="col-md-4">
                                        <small class="text-muted">MVP Count:</small><br>
                                        <span class="badge bg-primary">${candidate.mvp_count}</span>
                                    </div>
                                    <div class="col-md-4">
                                        <small class="text-muted">Last MVP:</small><br>
                                        ${formatDate(candidate.last_mvp_date)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
            
            $('#mvp-candidates').html(html);
        })
        .catch(error => {
            handleApiError(error, 'Failed to load MVP candidates');
        });
}

function resetMVPRotation() {
    confirmAction(
        'Are you sure you want to reset the MVP rotation? This will start a new cycle for all players.',
        () => {
            apiCall('POST', '/api/mvp/reset_rotation')
                .then(response => {
                    showToast('MVP rotation reset successfully', 'success');
                    loadMVPSection();
                })
                .catch(error => {
                    handleApiError(error, 'Failed to reset MVP rotation');
                });
        }
    );
}

// Guides Management
let allGuides = [];

function loadGuides() {
    setLoadingState('guides-table-body');
    
    const category = $('#guideCategoryFilter').val();
    const url = category ? `/guides/api?category=${category}` : '/guides/api';
    
    apiCall('GET', url)
        .then(data => {
            allGuides = data;
            displayGuides(data);
        })
        .catch(error => {
            handleApiError(error, 'Failed to load guides');
            $('#guides-table-body').html('<tr><td colspan="5" class="text-center text-danger">Failed to load guides</td></tr>');
        });
}

function displayGuides(guides) {
    let html = '';
    
    if (guides.length === 0) {
        html = '<tr><td colspan="5" class="text-center text-muted">No guides found</td></tr>';
    } else {
        guides.forEach(guide => {
            html += `
                <tr>
                    <td><strong>${guide.title}</strong></td>
                    <td><span class="badge bg-secondary">${guide.category}</span></td>
                    <td>${guide.order_index}</td>
                    <td><span class="badge bg-success">Published</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="editGuide(${guide.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteGuide(${guide.id}, '${escapeJsString(guide.title)}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }
    
    $('#guides-table-body').html(html);
}

function addGuide() {
    if (!validateForm('addGuideForm')) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    const formData = new FormData();
    formData.append('title', $('#guideTitle').val().trim());
    formData.append('content', $('#guideContent').val().trim());
    formData.append('category', $('#guideCategory').val());
    formData.append('order_index', parseInt($('#guideOrder').val()) || 0);
    formData.append('is_published', $('#guidePublished').is(':checked'));
    
    // Add image files
    const imageFiles = $('#guideImages')[0].files;
    for (let i = 0; i < imageFiles.length; i++) {
        formData.append('images', imageFiles[i]);
    }
    
    // Show loading state on button
    const addButton = '#addGuideModal .btn-success';
    setButtonLoading(addButton, true);
    
    // Use fetch instead of apiCall for file uploads
    fetch('/guides/api', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        showToast('Guide added successfully', 'success');
        $('#addGuideModal').modal('hide');
        loadGuides();
        clearGuideForm('add');
    })
    .catch(error => {
        handleApiError(error, 'Failed to add guide');
    })
    .finally(() => {
        // Always restore button state
        setButtonLoading(addButton, false);
    });
}

function editGuide(guideId) {
    const guide = allGuides.find(g => g.id === guideId);
    if (!guide) return;
    
    $('#editGuideId').val(guide.id);
    $('#editGuideTitle').val(guide.title);
    $('#editGuideContent').val(guide.content);
    $('#editGuideCategory').val(guide.category);
    $('#editGuideOrder').val(guide.order_index);
    $('#editGuidePublished').prop('checked', true); // Assume published since we only load published guides
    
    // Display existing images
    displayExistingImages(guide.images || []);
    
    $('#editGuideModal').modal('show');
}

function displayExistingImages(images) {
    const container = $('#existingImages');
    container.empty();
    
    if (images.length === 0) {
        container.html('<p class="text-muted">No existing images</p>');
        return;
    }
    
    container.append('<h6>Existing Images:</h6>');
    const imageRow = $('<div class="row"></div>');
    
    images.forEach((image, index) => {
        const imageCol = $(`
            <div class="col-md-3 mb-2">
                <div class="card">
                    <img src="/static/uploads/guides/${image}" class="card-img-top" style="height: 100px; object-fit: cover;">
                    <div class="card-body p-2">
                        <button class="btn btn-sm btn-danger w-100" onclick="removeExistingImage(${index}, '${image}')">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </div>
                </div>
            </div>
        `);
        imageRow.append(imageCol);
    });
    
    container.append(imageRow);
}

function removeExistingImage(index, imageName) {
    // Store removed images to handle on update
    if (!window.removedImages) {
        window.removedImages = [];
    }
    window.removedImages.push(imageName);
    
    // Remove from display
    $(`#existingImages .col-md-3:eq(${index})`).remove();
}

function updateGuide() {
    if (!validateForm('editGuideForm')) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    // Show loading state on button
    const updateButton = '#editGuideModal .btn-primary';
    setButtonLoading(updateButton, true);
    
    const guideId = $('#editGuideId').val();
    const guide = allGuides.find(g => g.id == guideId);
    
    // Handle existing images (remove deleted ones)
    let existingImages = guide.images || [];
    if (window.removedImages) {
        existingImages = existingImages.filter(img => !window.removedImages.includes(img));
        window.removedImages = []; // Clear for next time
    }
    
    // If new images are uploaded, upload them first
    const newImageFiles = $('#editGuideImages')[0].files;
    
    if (newImageFiles.length > 0) {
        // Upload new images first
        const imageFormData = new FormData();
        for (let i = 0; i < newImageFiles.length; i++) {
            imageFormData.append('images', newImageFiles[i]);
        }
        
        fetch('/guides/api/upload-images', {
            method: 'POST',
            body: imageFormData
        })
        .then(response => response.json())
        .then(uploadData => {
            if (uploadData.error) {
                throw new Error(uploadData.error);
            }
            
            // Combine existing and new images
            const allImages = [...existingImages, ...uploadData.images];
            updateGuideWithImages(guideId, allImages);
        })
        .catch(error => {
            handleApiError(error, 'Failed to upload images');
            // Restore button state on error
            const updateButton = '#editGuideModal .btn-primary';
            setButtonLoading(updateButton, false);
        });
    } else {
        // No new images, just update with existing ones
        updateGuideWithImages(guideId, existingImages);
    }
}

function updateGuideWithImages(guideId, images) {
    const guideData = {
        title: $('#editGuideTitle').val().trim(),
        content: $('#editGuideContent').val().trim(),
        category: $('#editGuideCategory').val(),
        order_index: parseInt($('#editGuideOrder').val()) || 0,
        is_published: $('#editGuidePublished').is(':checked'),
        images: images
    };
    
    apiCall('PUT', `/guides/api/${guideId}`, guideData)
        .then(response => {
            showToast('Guide updated successfully', 'success');
            $('#editGuideModal').modal('hide');
            loadGuides();
        })
        .catch(error => {
            handleApiError(error, 'Failed to update guide');
        })
        .finally(() => {
            // Always restore button state
            const updateButton = '#editGuideModal .btn-primary';
            setButtonLoading(updateButton, false);
        });
}

function deleteGuide(guideId, guideTitle) {
    confirmAction(
        `Are you sure you want to delete the guide "${guideTitle}"? This action cannot be undone.`,
        () => {
            apiCall('DELETE', `/guides/api/${guideId}`)
                .then(response => {
                    showToast('Guide deleted successfully', 'success');
                    loadGuides();
                })
                .catch(error => {
                    handleApiError(error, 'Failed to delete guide');
                });
        }
    );
}

function clearGuideForm(type) {
    const prefix = type === 'add' ? '' : 'edit';
    $(`#${prefix}GuideTitle`).val('');
    $(`#${prefix}GuideContent`).val('');
    $(`#${prefix}GuideCategory`).val('');
    $(`#${prefix}GuideOrder`).val('0');
    $(`#${prefix}GuidePublished`).prop('checked', true);
    $(`#${prefix}GuideImages`).val('');
    $(`#${prefix === 'edit' ? 'editImagePreview' : 'imagePreview'}`).empty();
    if (type === 'edit') {
        $('#existingImages').empty();
        window.removedImages = [];
    }
}

// Helper Functions
function escapeJsString(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

function loadAllianceOptions(selectId = 'playerAlliance') {
    const eligibleAlliances = allAlliances.filter(a => !a.is_blacklisted);
    let html = '<option value="">Select Alliance (Optional)</option>';
    eligibleAlliances.forEach(alliance => {
        const tag = alliance.tag ? ` ${alliance.tag}` : '';
        html += `<option value="${alliance.id}">${alliance.name}${tag}</option>`;
    });
    $(`#${selectId}`).html(html);
}