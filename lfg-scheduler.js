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

function renderProfilesList(profiles, filterCity = '', filterSystem = '') {
    const list = document.getElementById('profiles-list');
    list.innerHTML = '';
    let filtered = profiles;
    if (filterCity) filtered = filtered.filter(p => p.city.toLowerCase().includes(filterCity.toLowerCase()));
    if (filterSystem) filtered = filtered.filter(p => p.system.toLowerCase().includes(filterSystem.toLowerCase()));
    if (!filtered.length) {
        list.innerHTML = '<p>No profiles found.</p>';
        return;
    }
    filtered.forEach(p => {
        const el = document.createElement('div');
        el.className = 'profile-card';
        el.innerHTML = `
            <strong>${escapeHtml(p.name)}</strong> <span class="role">(${p.role})</span><br>
            <span class="city">${escapeHtml(p.city)}</span> | <span class="system">${escapeHtml(p.system)}</span><br>
            <span class="days">${p.days.join(', ')}</span> <span class="times">${p.times.join(', ')}</span><br>
            <span class="contact">Contact: ${escapeHtml(p.contact)}</span>
        `;
        list.appendChild(el);
    });
}

function suggestMatches(profiles) {
    const matches = [];
    // Group by city + system
    const grouped = {};
    profiles.forEach(p => {
        const key = p.city.toLowerCase() + '|' + p.system.toLowerCase();
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(p);
    });
    for (const group of Object.values(grouped)) {
        if (group.length < 4) continue; // only suggest groups of 4+
        // Try to find subgroups with overlapping days/times
        for (let i = 0; i < group.length; i++) {
            const base = group[i];
            const subgroup = [base];
            for (let j = 0; j < group.length && subgroup.length < 6; j++) {
                if (i === j) continue;
                const candidate = group[j];
                if (getOverlapping(base.days, candidate.days).length && getOverlapping(base.times, candidate.times).length) {
                    subgroup.push(candidate);
                }
            }
            if (subgroup.length >= 4 && !matches.some(m => m.includes(subgroup[0]))) {
                matches.push(subgroup);
            }
        }
    }
    renderMatches(matches);
}

function renderMatches(matches) {
    const list = document.getElementById('matches-list');
    list.innerHTML = '';
    if (!matches.length) {
        list.innerHTML = '<p>No suggested groups found yet. Encourage friends to submit profiles!</p>';
        return;
    }
    matches.forEach((group, idx) => {
        const el = document.createElement('div');
        el.className = 'match-card';
        el.innerHTML = `<strong>Group #${idx+1}</strong> (${escapeHtml(group[0].city)}, ${escapeHtml(group[0].system)})<ul>` +
            group.map(p => `<li>${escapeHtml(p.name)} (${p.role}) - Days: ${p.days.join(', ')} Times: ${p.times.join(', ')} Contact: ${escapeHtml(p.contact)}</li>`).join('') +
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
    // Get filters
    const city = document.getElementById('filter-city').value.trim();
    const system = document.getElementById('filter-system').value.trim();
    renderProfilesList(allProfiles, city, system);
    suggestMatches(allProfiles);
}

document.addEventListener('DOMContentLoaded', () => {
    // Profile form submission
    const form = document.getElementById('profile-form');
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const name = document.getElementById('name').value.trim();
        const city = document.getElementById('city').value.trim();
        const role = document.getElementById('role').value;
        const system = document.getElementById('system').value.trim();
        const days = Array.from(document.querySelectorAll('#days-group input:checked')).map(cb => cb.value);
        const times = Array.from(document.querySelectorAll('#times-group input:checked')).map(cb => cb.value);
        const contact = document.getElementById('contact').value.trim();
        if (!name || !city || !role || !system || !days.length || !times.length || !contact) {
            alert('Please fill in all fields and select at least one day and time.');
            return;
        }
        showLoading('profiles-list', 'Submitting profile...');
        try {
            await addProfile({ name, city, role, system, days, times, contact });
            clearForm(form);
            await refreshProfilesAndMatches();
            alert('Profile submitted!');
        } catch (err) {
            // Error already shown
        }
    });

    // Filtering
    document.getElementById('filter-city').addEventListener('input', filterChanged);
    document.getElementById('filter-system').addEventListener('input', filterChanged);
    document.getElementById('clear-filters').addEventListener('click', e => {
        document.getElementById('filter-city').value = '';
        document.getElementById('filter-system').value = '';
        renderProfilesList(allProfiles);
    });

    function filterChanged() {
        const city = document.getElementById('filter-city').value.trim();
        const system = document.getElementById('filter-system').value.trim();
        renderProfilesList(allProfiles, city, system);
    }

    // Initial load
    refreshProfilesAndMatches();
});
