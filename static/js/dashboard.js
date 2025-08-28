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
});

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
                    </td>
                    <td>${formatDate(player.last_mvp_date)}</td>
                    <td>${getStatusBadge(player.is_active)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="editPlayer(${player.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deletePlayer(${player.id}, '${player.name}')" title="Delete">
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
    
    const playerData = {
        name: $('#playerName').val().trim(),
        alliance_id: $('#playerAlliance').val() || null,
        is_active: $('#playerActive').is(':checked')
    };
    
    apiCall('POST', '/api/players/', playerData)
        .then(response => {
            showToast('Player added successfully', 'success');
            $('#addPlayerModal').modal('hide');
            loadPlayers();
        })
        .catch(error => {
            handleApiError(error, 'Failed to add player');
        });
}

function editPlayer(playerId) {
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return;
    
    $('#editPlayerId').val(player.id);
    $('#editPlayerName').val(player.name);
    $('#editPlayerAlliance').val(player.alliance?.id || '');
    $('#editPlayerActive').prop('checked', player.is_active);
    
    loadAllianceOptions('editPlayerAlliance');
    $('#editPlayerModal').modal('show');
}

function updatePlayer() {
    if (!validateForm('editPlayerForm')) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    const playerId = $('#editPlayerId').val();
    const playerData = {
        name: $('#editPlayerName').val().trim(),
        alliance_id: $('#editPlayerAlliance').val() || null,
        is_active: $('#editPlayerActive').is(':checked')
    };
    
    apiCall('PUT', `/api/players/${playerId}`, playerData)
        .then(response => {
            showToast('Player updated successfully', 'success');
            $('#editPlayerModal').modal('hide');
            loadPlayers();
        })
        .catch(error => {
            handleApiError(error, 'Failed to update player');
        });
}

function deletePlayer(playerId, playerName) {
    confirmAction(
        `Are you sure you want to deactivate player "${playerName}"? This will set them as inactive.`,
        () => {
            apiCall('DELETE', `/api/players/${playerId}`)
                .then(response => {
                    showToast('Player deactivated successfully', 'success');
                    loadPlayers();
                })
                .catch(error => {
                    handleApiError(error, 'Failed to deactivate player');
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
                            `<button class="btn btn-sm btn-outline-success" onclick="whitelistAlliance(${alliance.id}, '${alliance.name}')" title="Remove from Blacklist">
                                <i class="fas fa-check"></i>
                            </button>` :
                            `<button class="btn btn-sm btn-outline-warning" onclick="blacklistAlliance(${alliance.id}, '${alliance.name}')" title="Add to Blacklist">
                                <i class="fas fa-ban"></i>
                            </button>`
                        }
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteAlliance(${alliance.id}, '${alliance.name}')" title="Delete">
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
    
    apiCall('PUT', `/api/alliances/${allianceId}`, allianceData)
        .then(response => {
            showToast('Alliance updated successfully', 'success');
            $('#editAllianceModal').modal('hide');
            loadAlliances();
        })
        .catch(error => {
            handleApiError(error, 'Failed to update alliance');
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
                `${event.mvp.name} ${getMVPIcon(true)}` : 
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
                        <button class="btn btn-sm btn-outline-warning" onclick="assignMVP(${event.id}, '${event.name}')" title="Assign MVP">
                            <i class="fas fa-trophy"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="assignWinner(${event.id}, '${event.name}')" title="Assign Winner">
                            <i class="fas fa-crown"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteEvent(${event.id}, '${event.name}')" title="Delete">
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
    
    const eventData = {
        name: $('#eventName').val().trim(),
        event_date: $('#eventDate').val(),
        description: $('#eventDescription').val().trim(),
        status: $('#eventStatus').val()
    };
    
    apiCall('POST', '/api/events/', eventData)
        .then(response => {
            showToast('Event added successfully', 'success');
            $('#addEventModal').modal('hide');
            loadEvents();
        })
        .catch(error => {
            handleApiError(error, 'Failed to add event');
        });
}

function editEvent(eventId) {
    const event = allEvents.find(e => e.id === eventId);
    if (!event) return;
    
    $('#editEventId').val(event.id);
    $('#editEventName').val(event.name);
    $('#editEventDate').val(event.event_date);
    $('#editEventDescription').val(event.description || '');
    $('#editEventStatus').val(event.status);
    
    $('#editEventModal').modal('show');
}

function updateEvent() {
    if (!validateForm('editEventForm')) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    const eventId = $('#editEventId').val();
    const eventData = {
        name: $('#editEventName').val().trim(),
        event_date: $('#editEventDate').val(),
        description: $('#editEventDescription').val().trim(),
        status: $('#editEventStatus').val()
    };
    
    apiCall('PUT', `/api/events/${eventId}`, eventData)
        .then(response => {
            showToast('Event updated successfully', 'success');
            $('#editEventModal').modal('hide');
            loadEvents();
        })
        .catch(error => {
            handleApiError(error, 'Failed to update event');
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
                const priority = candidate.priority === 'high' ? ' (Recommended)' : '';
                const allianceInfo = candidate.alliance ? ` - ${candidate.alliance.name}` : '';
                html += `<option value="${candidate.id}">${candidate.name}${allianceInfo}${priority}</option>`;
            });
            $('#mvpPlayer').html(html);
        })
        .catch(error => {
            handleApiError(error, 'Failed to load MVP candidates');
        });
    
    $('#assignMVPModal').modal('show');
}

function assignEventMVP() {
    if (!validateForm('assignMVPForm')) {
        showToast('Please select a player', 'warning');
        return;
    }
    
    const eventId = $('#mvpEventId').val();
    const playerId = $('#mvpPlayer').val();
    
    apiCall('POST', `/api/mvp/assign/${eventId}`, { player_id: parseInt(playerId) })
        .then(response => {
            showToast('MVP assigned successfully', 'success');
            $('#assignMVPModal').modal('hide');
            loadEvents();
            loadMVPSection();
        })
        .catch(error => {
            handleApiError(error, 'Failed to assign MVP');
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
                    const priorityClass = candidate.priority === 'high' ? 'priority-high' : 'priority-low';
                    const allianceInfo = candidate.alliance ? 
                        `<small class="text-muted">${candidate.alliance.name}${candidate.alliance.tag ? ` ${candidate.alliance.tag}` : ''}</small>` : 
                        '<small class="text-muted">No Alliance</small>';
                    
                    html += `
                        <div class="card mb-2 ${priorityClass}">
                            <div class="card-body py-2">
                                <div class="row align-items-center">
                                    <div class="col-md-4">
                                        <strong>${candidate.name}</strong>
                                        ${getMVPIcon(candidate.mvp_count > 0)}
                                        <br>
                                        ${allianceInfo}
                                    </div>
                                    <div class="col-md-2">
                                        <small class="text-muted">MVP Count:</small><br>
                                        <span class="badge bg-primary">${candidate.mvp_count}</span>
                                    </div>
                                    <div class="col-md-3">
                                        <small class="text-muted">Last MVP:</small><br>
                                        ${formatDate(candidate.last_mvp_date)}
                                    </div>
                                    <div class="col-md-3">
                                        <small class="text-muted">Priority:</small><br>
                                        <span class="badge ${candidate.priority === 'high' ? 'bg-success' : 'bg-warning'}">${candidate.priority}</span>
                                        ${candidate.has_been_mvp_this_cycle ? '<i class="fas fa-check text-success ms-1" title="Been MVP this cycle"></i>' : ''}
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

// Helper Functions
function loadAllianceOptions(selectId = 'playerAlliance') {
    const eligibleAlliances = allAlliances.filter(a => !a.is_blacklisted);
    let html = '<option value="">Select Alliance (Optional)</option>';
    eligibleAlliances.forEach(alliance => {
        const tag = alliance.tag ? ` ${alliance.tag}` : '';
        html += `<option value="${alliance.id}">${alliance.name}${tag}</option>`;
    });
    $(`#${selectId}`).html(html);
}