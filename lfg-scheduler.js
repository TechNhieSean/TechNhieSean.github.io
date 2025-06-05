// Local D&D/TTRPG LFG Scheduler MVP with Firebase Firestore backend
// All profile data is stored in Firestore (cloud) so all users see the same list

// Firestore reference (initialized in firebase-app.js)
const PROFILES_COLLECTION = 'lfg_profiles_v1';

async function getProfiles() {
    try {
        const snapshot = await db.collection(PROFILES_COLLECTION).get();
        return snapshot.docs.map(doc => doc.data());
    } catch (err) {
        showError('Failed to load profiles. Please check your connection.');
        return [];
    }
}

async function addProfile(profile) {
    try {
        await db.collection(PROFILES_COLLECTION).add(profile);
    } catch (err) {
        showError('Failed to submit profile. Try again.');
        throw err;
    }
}

function clearForm(form) {
    form.reset();
    form.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
}

function showLoading(targetId, message = 'Loading...') {
    const el = document.getElementById(targetId);
    el.innerHTML = `<div class="loading">${message}</div>`;
}

function showError(message) {
    alert(message);
}

function escapeHtml(text) {
    return text.replace(/[&<>"']/g, function(m) {
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m];
    });
}

function getOverlapping(arr1, arr2) {
    return arr1.filter(x => arr2.includes(x));
}

function renderProfilesList(profiles, filterPlayPref = '') {
    const list = document.getElementById('profiles-list');
    list.innerHTML = '';
    let filtered = profiles;
    if (filterPlayPref) filtered = filtered.filter(p => p.playPref === filterPlayPref);
    console.debug('[renderProfilesList] filterPlayPref:', filterPlayPref, 'Filtered profiles:', filtered);
    if (!filtered.length) {
        list.innerHTML = '<p>No profiles found.</p>';
        return;
    }
    filtered.forEach(p => {
        const el = document.createElement('div');
        el.className = 'profile-card';
        el.innerHTML = `
            <strong>${escapeHtml(p.name)}</strong> <span class="role">(${p.role})</span><br>
            <span class="city">City: Winnipeg</span><br>
            <span class="system">System: Dungeons & Dragons</span><br>
            <span class="playpref">Play: ${escapeHtml(p.playPref)}</span><br>
            <span class="days">Days: ${p.days.join(', ')}</span> <span class="times">Times: ${p.times.join(', ')}</span><br>
            <span class="contact">Contact: ${escapeHtml(p.contact)}</span>
        `;
        list.appendChild(el);
    });
}

function groupCompatibilityRank(subgroup, userPref) {
    const prefs = subgroup.map(p => p.playPref);
    const unique = new Set(prefs.filter(p => p !== 'No Preference'));
    // Best match: all match userPref
    if (unique.size === 1 && [...unique][0] === userPref) return 1;
    // Next: all match a similar preference
    if (unique.size === 1) {
        switch ([...unique][0]) {
            case 'In-person only': return userPref === 'Online only' ? 3 : 2;
            case 'Online only': return userPref === 'In-person only' ? 3 : 2;
            case 'In-person preferred': return 4;
            case 'Online preferred': return 5;
        }
    }
    if (prefs.includes('In-person only') && prefs.includes('Online only')) return 8;
    if (prefs.includes(userPref)) return 6;
    if (prefs.includes('In-person only')) return 7;
    if (prefs.includes('Online only')) return 7;
    return 9; // mixed/other
}

function isCompatibleGroup(subgroup) {
    const prefs = subgroup.map(p => p.playPref);
    // Exclude group if both 'In-person only' and 'Online only' are present
    if (prefs.includes('In-person only') && prefs.includes('Online only')) return false;
    return true;
}

function suggestMatches(profiles) {
    const matches = [];
    // Determine user's current play preference from the form or filter (default to 'In-person only')
    let userPref = 'In-person only';
    const playPrefInput = document.getElementById('play-pref');
    if (playPrefInput && playPrefInput.value) {
        userPref = playPrefInput.value;
    }
    console.debug('[suggestMatches] userPref:', userPref);
    // Try all possible groups of 4-6
    for (let i = 0; i < profiles.length; i++) {
        const base = profiles[i];
        const candidates = profiles.filter((p, j) => j !== i && getOverlapping(base.days, p.days).length && getOverlapping(base.times, p.times).length);
        // Try to build groups of 4-6
        for (let j = 0; j < candidates.length; j++) {
            for (let k = j + 1; k < candidates.length; k++) {
                for (let l = k + 1; l < candidates.length; l++) {
                    // Group of 4
                    const subgroup = [base, candidates[j], candidates[k], candidates[l]];
                    if (isCompatibleGroup(subgroup)) {
                        matches.push(subgroup);
                    }
                    // Try group of 5
                    for (let m = l + 1; m < candidates.length; m++) {
                        const subgroup5 = [base, candidates[j], candidates[k], candidates[l], candidates[m]];
                        if (isCompatibleGroup(subgroup5)) {
                            matches.push(subgroup5);
                        }
                        // Try group of 6
                        for (let n = m + 1; n < candidates.length; n++) {
                            const subgroup6 = [base, candidates[j], candidates[k], candidates[l], candidates[m], candidates[n]];
                            if (isCompatibleGroup(subgroup6)) {
                                matches.push(subgroup6);
                            }
                        }
                    }
                }
            }
        }
    }
    // Remove duplicate groups (same members)
    const seen = new Set();
    const uniqueMatches = matches.filter(group => {
        const key = group.map(p => p.name + p.contact).sort().join('|');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    // Rank groups by compatibility for the current user
    uniqueMatches.sort((a, b) => groupCompatibilityRank(a, userPref) - groupCompatibilityRank(b, userPref));
    renderMatches(uniqueMatches, userPref);
} 

function renderMatches(matches, userPref) {
    const list = document.getElementById('matches-list');
    list.innerHTML = '';
    if (!matches.length) {
        list.innerHTML = '<p>No suggested groups found yet. Encourage friends to submit profiles!</p>';
        return;
    }
    const rankLabels = {
        'In-person only': 'Best match: All In-person only',
        'Online only': 'Best match: All Online only',
        'In-person preferred': 'Best match: All In-person preferred',
        'Online preferred': 'Best match: All Online preferred',
        'No Preference': 'Best match: All No Preference',
        'default': 'Best match: All In-person only'
    };
    matches.forEach((group, idx) => {
        const rank = groupCompatibilityRank(group, userPref);
        let rankDesc = '';
        if (rank === 1) {
            rankDesc = rankLabels[userPref] || rankLabels['default'];
        } else if (rank === 2) {
            rankDesc = userPref === 'Online only' ? 'Good: All In-person only' : 'Good: All Online only';
        } else if (rank === 3) {
            rankDesc = 'Good: All with opposite strict preference';
        } else if (rank === 4) {
            rankDesc = 'Good: All In-person preferred';
        } else if (rank === 5) {
            rankDesc = 'Good: All Online preferred';
        } else if (rank === 6) {
            rankDesc = 'Mixed: Some match your preference';
        } else if (rank === 7) {
            rankDesc = 'Mixed: Some strict preferences';
        } else if (rank === 8) {
            rankDesc = 'Not recommended: In-person only + Online only';
        } else {
            rankDesc = 'Mixed/Other';
        }
        console.debug(`[renderMatches] Group #${idx+1} rank:`, rank, 'desc:', rankDesc, group);
        const el = document.createElement('div');
        el.className = 'match-card';
        el.innerHTML = `<strong>Group #${idx+1}</strong> <span style=\"font-size:0.95em;color:#888;\">(${rankDesc})</span><ul>` +
            group.map(p => `<li>${escapeHtml(p.name)} (${p.role}) - Play: ${escapeHtml(p.playPref)} - Days: ${p.days.join(', ')} Times: ${p.times.join(', ')} Contact: ${escapeHtml(p.contact)}</li>`).join('') +
            '</ul>';
        list.appendChild(el);
    });
}

// Global profiles cache
let allProfiles = [];

async function refreshProfilesAndMatches() {
    showLoading('profiles-list', 'Loading profiles...');
    showLoading('matches-list', 'Loading matches...');
    allProfiles = await getProfiles();
    // Only filter by play preference (city/system filters were removed)
    const playPrefEl = document.getElementById('filter-playpref');
    const playPref = playPrefEl ? playPrefEl.value.trim() : '';
    renderProfilesList(allProfiles, playPref);
    suggestMatches(allProfiles);
}

document.addEventListener('DOMContentLoaded', () => {
    // Profile form submission
    const form = document.getElementById('profile-form');
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const name = document.getElementById('name').value.trim();
        const role = document.getElementById('role').value;
        const playPref = document.getElementById('play-pref').value;
        const days = Array.from(document.querySelectorAll('#days-group input:checked')).map(cb => cb.value);
        const times = Array.from(document.querySelectorAll('#times-group input:checked')).map(cb => cb.value);
        const contact = document.getElementById('contact').value.trim();
        if (!name || !role || !playPref || !days.length || !times.length || !contact) {
            alert('Please fill in all fields and select at least one day and time.');
            return;
        }
        showLoading('profiles-list', 'Submitting profile...');
        try {
            await addProfile({ name, role, playPref, days, times, contact });
            clearForm(form);
            await refreshProfilesAndMatches();
            alert('Profile submitted!');
        } catch (err) {
            // Error already shown
        }
    });

    // Filtering (only by play preference)
    const playPrefSelect = document.getElementById('filter-playpref');
    if (playPrefSelect) {
        playPrefSelect.addEventListener('change', filterChanged);
    }
    document.getElementById('clear-filters').addEventListener('click', e => {
        if (playPrefSelect) playPrefSelect.value = '';
        renderProfilesList(allProfiles);
    });

    function filterChanged() {
        const playPref = playPrefSelect ? playPrefSelect.value : '';
        renderProfilesList(allProfiles, playPref);
    }

    // Initial load
    refreshProfilesAndMatches();
});
